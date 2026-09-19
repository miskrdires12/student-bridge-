// ============================================================================
// STUDENT BRIDGE — CLIENT-SIDE REALTIME CLOUD SYNC
// Zero-dependency, browser-safe, and edge-compatible.
// Publishes and listens to the Global Cloud Sync Bus via fetch and SSE.
// ============================================================================

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
 * Safe to call from any client component or browser.
 */
export async function publishStudentSync(
  action: "UPSERT" | "DELETE" | "CLEAR" | "PHOTO_RETAKE_REQUIRED" | "RESEND_PHOTO_REQUEST" | "RESEND_PHOTO",
  studentOrId?: any
): Promise<boolean> {
  try {
    const payload: SyncPayload = {
      action,
      student: action === "UPSERT" ? studentOrId : undefined,
      studentId:
        action === "DELETE" || action === "PHOTO_RETAKE_REQUIRED" || action === "RESEND_PHOTO_REQUEST"
          ? typeof studentOrId === "string"
            ? studentOrId
            : studentOrId?.studentId
          : studentOrId?.studentId,
      fullName: studentOrId?.fullName,
      photoPath: studentOrId?.photoPath,
      message: studentOrId?.message,
      timestamp: Date.now(),
    };

    // 1. Broadcast locally across LAN immediately (0ms, zero-internet dependency)
    if (typeof window !== "undefined") {
      fetch("/api/sync/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // 2. Broadcast to global cloud sync bus for remote/cloud devices
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
    console.warn("Notice: Client cloud sync publish skipped or offline:", err);
    return false;
  }
}

/**
 * Client-Side Hook: Subscribes to real-time push events from both Local LAN and Cloud Sync Bus.
 * Instantly triggers when any student is enrolled from any PC or mobile device.
 */
export function subscribeToCloudSync(
  onStudentUpsert: (student: any) => void,
  onStudentDelete?: (studentId: string) => void,
  onClearAll?: () => void,
  onRawEvent?: (payload: SyncPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let cloudEventSource: EventSource | null = null;
  let localEventSource: EventSource | null = null;
  let isClosed = false;

  const handlePayload = (payload: SyncPayload | null) => {
    if (!payload || !payload.action) return;

    if (onRawEvent) {
      try {
        onRawEvent(payload);
      } catch {}
    }

    if (payload.action === "UPSERT" && payload.student) {
      onStudentUpsert(payload.student);
    } else if (payload.action === "DELETE" && payload.studentId && onStudentDelete) {
      onStudentDelete(payload.studentId);
    } else if (payload.action === "CLEAR" && onClearAll) {
      onClearAll();
    } else if (payload.action === "PHOTO_RETAKE_REQUIRED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("siliconlabs_notification", {
            detail: {
              title: "Photo Sync Notice",
              desc:
                payload.message ||
                `Photo preserved in student directory for ${payload.fullName || payload.studentId}. You can attach or re-sync photo anytime.`,
              type: "info",
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent("siliconlabs_photo_retake_required", {
            detail: payload,
          })
        );
      }
    }
  };

  // 1. Connect to Local LAN SSE Bus (works with 0 internet)
  try {
    localEventSource = new EventSource("/api/sync/events");
    localEventSource.onmessage = (e) => {
      if (isClosed || !e.data || e.data.startsWith(":")) return;
      try {
        const payload: SyncPayload = JSON.parse(e.data);
        handlePayload(payload);
      } catch {}
    };
  } catch {}

  // 2. Connect to Cloud Sync Bus
  try {
    cloudEventSource = new EventSource(`${SYNC_BASE_URL}/sse`);

    cloudEventSource.onmessage = async (e) => {
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

        handlePayload(payload);
      } catch {}
    };

    cloudEventSource.onerror = () => {
      // EventSource automatically retries on network disconnect
    };
  } catch {}

  return () => {
    isClosed = true;
    if (localEventSource) localEventSource.close();
    if (cloudEventSource) cloudEventSource.close();
  };
}
