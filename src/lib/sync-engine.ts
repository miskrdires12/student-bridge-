// ============================================================================
// STUDENT BRIDGE — UNIVERSAL MULTI-TIER REALTIME CLOUD SYNC ENGINE
// Ensures indelible student record persistence across Vercel Ephemeral Lambdas,
// Mobile Phones, and Receiver Desktop Facilities with Zero-Config Cloud Sync.
// ============================================================================

import prisma from "@/lib/prisma";

export const SYNC_TOPIC = "sb_prod_sync_miskrdires12_v1";
export const SYNC_BASE_URL = `https://ntfy.sh/${SYNC_TOPIC}`;

export interface SyncPayload {
  action: "UPSERT" | "DELETE" | "CLEAR" | "PHOTO_RETAKE_REQUIRED" | "RESEND_PHOTO_REQUEST" | "RESEND_PHOTO";
  student?: any;
  studentId?: string;
  fullName?: string;
  photoPath?: string;
  message?: string;
  timestamp: number;
}

/**
 * Publishes an upsert, deletion, or photo-retake event to the Global Cloud Sync Bus.
 * Can be called from server actions, API routes, or browser clients.
 */
export async function publishStudentSync(
  action: "UPSERT" | "DELETE" | "CLEAR" | "PHOTO_RETAKE_REQUIRED" | "RESEND_PHOTO_REQUEST" | "RESEND_PHOTO",
  studentOrId?: any
): Promise<boolean> {
  try {
    let studentId = "";
    let id = "";
    let fullName = "";
    let message = "";
    let photoPath = "";

    if (typeof studentOrId === "string") {
      studentId = studentOrId;
      id = studentOrId;
    } else if (studentOrId) {
      studentId = studentOrId.studentId || "";
      id = studentOrId.id || "";
      fullName = studentOrId.fullName || "";
      message = studentOrId.message || "";
      photoPath = studentOrId.photoPath || "";
    }

    const payload: SyncPayload = {
      action,
      student: action === "UPSERT" ? studentOrId : (action === "DELETE" ? { id, studentId } : undefined),
      studentId: studentId || id,
      fullName,
      photoPath,
      message,
      timestamp: Date.now(),
    };

    const localUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
    fetch(`${localUrl}/api/sync/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});

    const res = await fetch(SYNC_BASE_URL, {
      method: "POST",
      headers: {
        Title: action === "PHOTO_RETAKE_REQUIRED" ? "PHOTO_RETAKE_REQUIRED" : `STUDENT_${action}`,
        Priority: "urgent",
        Tags: action === "PHOTO_RETAKE_REQUIRED" ? "warning,camera,retake" : "student,sync",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return res.ok;
  } catch (err) {
    console.warn("Notice: Cloud sync publish skipped or offline:", err);
    return false;
  }
}

/**
 * Fetches all student records recorded on the Global Cloud Sync Bus.
 * Automatically resolves attachment files and deduplicates by studentId.
 */
export async function fetchCloudStudents(): Promise<any[]> {
  try {
    const res = await fetch(`${SYNC_BASE_URL}/json?poll=1&since=all`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const rawText = await res.text();
    if (!rawText.trim()) return [];

    const lines = rawText.trim().split("\n").filter(Boolean);
    const studentsMap = new Map<string, any>();
    const deletedSet = new Set<string>();

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        let payload: SyncPayload | null = null;

        if (item.attachment && item.attachment.url) {
          try {
            const attRes = await fetch(item.attachment.url, { cache: "no-store" });
            if (attRes.ok) {
              payload = await attRes.json();
            }
          } catch {}
        }

        if (!payload && item.message) {
          try {
            payload = JSON.parse(item.message);
          } catch {}
        }

        if (!payload || !payload.action) continue;

        if (payload.action === "CLEAR") {
          studentsMap.clear();
          deletedSet.clear();
        } else if (payload.action === "DELETE") {
          const idToDelete = payload.studentId;
          if (idToDelete) {
            deletedSet.add(idToDelete);
            studentsMap.delete(idToDelete);
          }
          if (payload.student?.id) {
            deletedSet.add(payload.student.id);
            studentsMap.delete(payload.student.id);
          }
          if (payload.student?.studentId) {
            deletedSet.add(payload.student.studentId);
            studentsMap.delete(payload.student.studentId);
          }
          // Scan and purge all entries matching either id or studentId
          for (const [key, s] of Array.from(studentsMap.entries())) {
            if (
              deletedSet.has(key) ||
              deletedSet.has(s.studentId) ||
              deletedSet.has(s.id)
            ) {
              studentsMap.delete(key);
            }
          }
        } else if (payload.action === "UPSERT" && payload.student && payload.student.studentId) {
          const s = payload.student;
          if (
            !deletedSet.has(s.studentId) &&
            (!s.id || !deletedSet.has(s.id))
          ) {
            studentsMap.set(s.studentId, s);
          }
        }
      } catch {}
    }

    return Array.from(studentsMap.values()).reverse();
  } catch (err) {
    console.warn("Notice: Cloud sync fetch warning:", err);
    return [];
  }
}

/**
 * Rehydrates the local SQLite database from the Cloud Sync Bus.
 * Used when an ephemeral serverless Lambda container spins up cold with an empty DB.
 */
export async function rehydrateDatabaseFromCloud(): Promise<number> {
  try {
    const cloudStudents = await fetchCloudStudents();
    if (cloudStudents.length === 0) return 0;

    let rehydratedCount = 0;

    for (const s of cloudStudents) {
      if (!s.studentId || !s.fullName) continue;

      try {
        await prisma.student.upsert({
          where: { studentId: s.studentId },
          update: {
            fullName: s.fullName,
            phone: s.phone || "N/A",
            sex: s.sex || "Male",
            grade: s.grade || "General",
            school: s.school || "",
            department: s.department || "",
            academicYear: s.academicYear || "",
            photoPath: s.photoPath || null,
            qrCodeData: s.qrCodeData || `STUDENT:${s.studentId}`,
            status: s.status || "ACTIVE",
          },
          create: {
            studentId: s.studentId,
            fullName: s.fullName,
            phone: s.phone || "N/A",
            sex: s.sex || "Male",
            grade: s.grade || "General",
            school: s.school || "",
            department: s.department || "",
            academicYear: s.academicYear || "",
            photoPath: s.photoPath || null,
            qrCodeData: s.qrCodeData || `STUDENT:${s.studentId}`,
            status: s.status || "ACTIVE",
          },
        });
        rehydratedCount++;
      } catch (err) {
        console.warn(`Failed to rehydrate student ${s.studentId}:`, err);
      }
    }

    return rehydratedCount;
  } catch (err) {
    console.warn("Notice: Database rehydration warning:", err);
    return 0;
  }
}

/**
 * Client-Side Hook: Subscribes to real-time push events from the Cloud Sync Bus.
 * Instantly triggers when any student is enrolled from any device (e.g. mobile phone).
 */
export function subscribeToCloudSync(
  onStudentUpsert: (student: any) => void,
  onStudentDelete?: (studentId: string) => void,
  onClearAll?: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let eventSource: EventSource | null = null;
  let isClosed = false;

  try {
    eventSource = new EventSource(`${SYNC_BASE_URL}/sse`);

    eventSource.onmessage = async (e) => {
      if (isClosed) return;
      try {
        const item = JSON.parse(e.data);
        let payload: SyncPayload | null = null;

        if (item.attachment && item.attachment.url) {
          try {
            const attRes = await fetch(item.attachment.url);
            if (attRes.ok) payload = await attRes.json();
          } catch {}
        }

        if (!payload && item.message) {
          try {
            payload = JSON.parse(item.message);
          } catch {}
        }

        if (!payload || !payload.action) return;

        if (payload.action === "UPSERT" && payload.student) {
          onStudentUpsert(payload.student);
        } else if (payload.action === "DELETE" && onStudentDelete) {
          const id = payload.studentId || payload.student?.studentId || payload.student?.id;
          if (id) onStudentDelete(id);
          if (payload.student?.studentId && payload.student.studentId !== id) {
            onStudentDelete(payload.student.studentId);
          }
          if (payload.student?.id && payload.student.id !== id) {
            onStudentDelete(payload.student.id);
          }
        } else if (payload.action === "CLEAR" && onClearAll) {
          onClearAll();
        }
      } catch {}
    };

    eventSource.onerror = () => {
      // EventSource automatically retries on disconnect
    };
  } catch {}

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
    }
  };
}
