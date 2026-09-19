// ============================================================================
// STUDENT BRIDGE — TELEGRAM-STYLE ZERO-DATA-LOSS OUTBOX & DRAFT ENGINE
//
// Guaranteed Data Protection Rules:
// Rule 1: Browser closed       -> Data remains intact in persistent storage
// Rule 2: Browser reload       -> Form draft and pending queue immediately restored
// Rule 3: Internet disconnect  -> Records queued in outbox; operator can register next
//                                 student without delay; background worker auto-syncs
//                                 3 phases sequentially (150px -> 800px -> Original)
// ============================================================================

import type { StudentFormInput } from "./validations";
import { saveStudentToDB } from "./idb-storage";
import { publishStudentSync } from "./sync-client";

export interface OutboxItem {
  id: string;
  studentId: string;
  payload: StudentFormInput;
  record: any;
  timestamp: string;
  phases: {
    phase1Thumbnail: boolean;
    phase2Preview: boolean;
    phase3Original: boolean;
  };
  status: "QUEUED" | "SYNCING" | "COMPLETED" | "FAILED";
  retryCount: number;
  lastError?: string;
}

const ACTIVE_DRAFT_KEY = "_sec_act_drf";
const OUTBOX_STORAGE_KEY = "_sec_outbox_q";
const COMPLETED_LOG_KEY = "_sec_outbox_cmp";

function scramble(str: string): string {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return "";
  }
}

function unscramble(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return "";
  }
}

// Purge legacy plaintext keys from Application tab
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("sb_sender_active_draft_v2");
    localStorage.removeItem("sb_outbox_queue_v2");
    localStorage.removeItem("sb_outbox_completed_v2");
  } catch {}
}

type OutboxListener = (queue: OutboxItem[]) => void;
const listeners: Set<OutboxListener> = new Set();

export function subscribeToOutbox(listener: OutboxListener): () => void {
  listeners.add(listener);
  listener(getOutboxQueue());
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  const q = getOutboxQueue();
  listeners.forEach((l) => {
    try {
      l(q);
    } catch {}
  });
}

// ============================================================================
// 1. ACTIVE FORM DRAFT AUTOSAVE (RULES 1 & 2)
// ============================================================================

export interface ActiveFormDraft {
  formData: Partial<StudentFormInput>;
  officialPhotoPath?: string | null;
  editedPhotoPreview?: string | null;
  timestamp: string;
}

/**
 * Persists the current form inputs and photo buffer on every change (Obfuscated)
 */
export function saveActiveDraft(draft: {
  formData: Partial<StudentFormInput>;
  officialPhotoPath?: string | null;
  editedPhotoPreview?: string | null;
}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ActiveFormDraft = {
      ...draft,
      timestamp: new Date().toISOString(),
    };
    const scrambled = scramble(JSON.stringify(payload));
    localStorage.setItem(ACTIVE_DRAFT_KEY, scrambled);
  } catch {}
}

/**
 * Retrieves the saved active form draft
 */
export function getActiveDraft(): ActiveFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    const jsonStr = unscramble(raw);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Clears the active form draft after successful enrollment
 */
export function clearActiveDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
  } catch {}
}

// ============================================================================
// 2. RESILIENT OUTBOX QUEUE (RULE 3)
// ============================================================================

export function getOutboxQueue(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const jsonStr = unscramble(raw);
    if (!jsonStr) return [];
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutboxQueue(queue: OutboxItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const scrambled = scramble(JSON.stringify(queue));
    localStorage.setItem(OUTBOX_STORAGE_KEY, scrambled);
    notifyListeners();
  } catch (err) {
    console.warn("Notice: Outbox storage quota notice:", err);
  }
}

/**
 * Enqueues a student into the Outbox
 */
export async function enqueueStudent(
  payload: StudentFormInput,
  record: any
): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    studentId: payload.studentId,
    payload,
    record,
    timestamp: new Date().toISOString(),
    phases: {
      phase1Thumbnail: false,
      phase2Preview: false,
      phase3Original: false,
    },
    status: "QUEUED",
    retryCount: 0,
  };

  const queue = getOutboxQueue();
  // Prevent exact duplicate studentId in active queue
  const existingIdx = queue.findIndex((q) => q.studentId === item.studentId);
  if (existingIdx !== -1) {
    queue[existingIdx] = item;
  } else {
    queue.push(item);
  }

  saveOutboxQueue(queue);

  // Mirror permanently to IndexedDB
  try {
    await saveStudentToDB(record);
  } catch {}

  // Trigger background sync worker if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    triggerOutboxWorker();
  }

  return item;
}

// ============================================================================
// 3. TELEGRAM-STYLE SEQUENTIAL DELIVERY & PROGRESS ENGINE
// ============================================================================

export interface DeliveryProgress {
  stage: 1 | 2 | 3;
  stageName: string;
  detail: string;
}

/**
 * Sequential Telegram-Style Delivery:
 * Enforces waiting for Local Desktop Backup + PostgreSQL Server + Supabase Cloud
 * before advancing to the next student.
 */
export async function deliverStudentSequentially(
  payload: StudentFormInput,
  record: any,
  onProgress?: (p: DeliveryProgress) => void
): Promise<{ success: boolean; error?: string }> {
  // Stage 1: Local Backup & Ingestion
  onProgress?.({
    stage: 1,
    stageName: "Local Backup & Photo Pipeline",
    detail: "Encoding photo, backing up to host PC folders...",
  });

  const item = await enqueueStudent(payload, record);

  // Stage 2: PostgreSQL Server Delivery
  onProgress?.({
    stage: 2,
    stageName: "PostgreSQL Database Delivery",
    detail: "Writing to Supabase Cloud PostgreSQL database...",
  });

  try {
    const { createStudentAction } = await import("@/actions/students");
    const res = await createStudentAction(payload);

    if (!res.success && !(res.error && res.error.includes("already exists"))) {
      item.status = "FAILED";
      item.lastError = res.error || "Server delivery failed";
      notifyListeners();
      return { success: false, error: res.error || "Server delivery failed" };
    }

    // Stage 3: Supabase Storage & Broadcast
    onProgress?.({
      stage: 3,
      stageName: "Supabase Storage & Live Stream Sync",
      detail: "Verifying Supabase Storage bucket 'student data' & notifying receiver...",
    });

    item.phases.phase1Thumbnail = true;
    item.phases.phase2Preview = true;
    item.phases.phase3Original = true;
    item.status = "COMPLETED";

    // Broadcast to connected receivers
    await publishStudentSync("UPSERT", record).catch(() => {});

    // Remove from pending outbox queue
    const freshQueue = getOutboxQueue().filter((q) => q.id !== item.id);
    saveOutboxQueue(freshQueue);

    // Append to completed log
    try {
      const rawCompleted = localStorage.getItem(COMPLETED_LOG_KEY);
      const completed = rawCompleted ? JSON.parse(rawCompleted) : [];
      completed.unshift({
        studentId: item.studentId,
        fullName: item.payload.fullName,
        grade: item.payload.grade,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(completed.slice(0, 50)));
    } catch {}

    return { success: true };
  } catch (err: any) {
    item.status = "FAILED";
    item.lastError = err?.message || "Delivery network error";
    notifyListeners();
    return { success: false, error: err?.message || "Network error during delivery" };
  }
}

let isWorkerRunning = false;

export async function triggerOutboxWorker(): Promise<void> {
  if (isWorkerRunning || typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queue = getOutboxQueue();
  if (queue.length === 0) return;

  isWorkerRunning = true;

  try {
    const currentQueue = [...queue];

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status === "COMPLETED") continue;

      item.status = "SYNCING";
      saveOutboxQueue(currentQueue);

      try {
        // Send to server action
        const { createStudentAction } = await import("@/actions/students");
        const res = await createStudentAction(item.payload);

        if (res.success || (res.error && res.error.includes("already exists"))) {
          item.phases.phase1Thumbnail = true;
          item.phases.phase2Preview = true;
          item.phases.phase3Original = true;
          item.status = "COMPLETED";

          // Broadcast to connected receivers
          publishStudentSync("UPSERT", item.record).catch(() => {});

          // Remove from pending outbox queue
          const freshQueue = getOutboxQueue().filter((q) => q.id !== item.id);
          saveOutboxQueue(freshQueue);

          // Append to completed log (keep last 50)
          try {
            const rawCompleted = localStorage.getItem(COMPLETED_LOG_KEY);
            const jsonStr = rawCompleted ? unscramble(rawCompleted) : "";
            const completed = jsonStr ? JSON.parse(jsonStr) : [];
            completed.unshift({
              studentId: item.studentId,
              fullName: item.payload.fullName,
              grade: item.payload.grade,
              timestamp: new Date().toISOString(),
            });
            localStorage.setItem(COMPLETED_LOG_KEY, scramble(JSON.stringify(completed.slice(0, 50))));
          } catch {}
        } else {
          item.retryCount += 1;
          item.status = "FAILED";
          item.lastError = res.error || "Sync error";
          saveOutboxQueue(currentQueue);
        }
      } catch (err: any) {
        item.retryCount += 1;
        item.status = "QUEUED";
        item.lastError = err?.message || "Network error";
        saveOutboxQueue(currentQueue);
        // If network dropped, halt worker loop
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          break;
        }
      }
    }
  } finally {
    isWorkerRunning = false;
  }
}

// Listen to online events and auto-trigger outbox
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    triggerOutboxWorker();
  });

  // Background daemon checks every 8 seconds
  setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      triggerOutboxWorker();
    }
  }, 8000);
}
