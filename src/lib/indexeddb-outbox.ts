// ============================================================================
// STUDENT BRIDGE — DURABLE CLIENT-SIDE SENDER OUTBOX (INDEXEDDB)
// Resilient offline-first queue surviving browser crashes, tab closures,
// and network interruptions with exponential backoff auto-recovery.
// ============================================================================

import type { StudentFormInput } from "@/lib/validations";

export type OutboxItemState =
  | "LOCAL_DRAFT"
  | "OUTBOX_QUEUED"
  | "UPLOADING"
  | "PHOTO_VERIFIED"
  | "METADATA_COMMITTED"
  | "SYNCHRONIZED"
  | "FAILED";

export interface OutboxQueueItem {
  id: string; // unique client GUID
  studentId: string;
  fullName: string;
  data: StudentFormInput;
  photoBlob?: Blob | null;
  state: OutboxItemState;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "StudentBridgeOutboxDB";
const DB_VERSION = 1;
const STORE_NAME = "outbox_queue";

function openOutboxDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("state", "state", { unique: false });
        store.createIndex("studentId", "studentId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueues a student enrollment into the durable IndexedDB Outbox.
 */
export async function enqueueOutboxItem(
  data: StudentFormInput,
  photoBlob?: Blob | null
): Promise<string> {
  const db = await openOutboxDB();
  const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const item: OutboxQueueItem = {
    id,
    studentId: data.studentId,
    fullName: data.fullName,
    data,
    photoBlob: photoBlob || null,
    state: "OUTBOX_QUEUED",
    retryCount: 0,
    maxRetries: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);

    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all items in the durable outbox.
 */
export async function getOutboxItems(): Promise<OutboxQueueItem[]> {
  try {
    const db = await openOutboxDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Updates an item's state in the outbox.
 */
export async function updateOutboxItemState(
  id: string,
  state: OutboxItemState,
  lastError?: string
): Promise<void> {
  const db = await openOutboxDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item: OutboxQueueItem = getReq.result;
      if (!item) return resolve();

      item.state = state;
      item.updatedAt = Date.now();
      if (lastError) {
        item.lastError = lastError;
        item.retryCount += 1;
      }

      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Removes a synchronized item from the outbox.
 */
export async function removeOutboxItem(id: string): Promise<void> {
  const db = await openOutboxDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Gets outbox queue health summary for operational alerts.
 */
export async function getOutboxHealthSummary() {
  const items = await getOutboxItems();
  const summary = {
    total: items.length,
    queued: items.filter((i) => i.state === "OUTBOX_QUEUED").length,
    uploading: items.filter((i) => i.state === "UPLOADING").length,
    failed: items.filter((i) => i.state === "FAILED").length,
    synchronized: items.filter((i) => i.state === "SYNCHRONIZED").length,
    hasAlert: false,
    alertMessage: "",
  };

  if (summary.failed > 0) {
    summary.hasAlert = true;
    summary.alertMessage = `${summary.failed} record(s) failed outbox transmission. Retry required.`;
  }

  return summary;
}
