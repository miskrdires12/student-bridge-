// ============================================================================
// STUDENTBRIDGE — REAL-TIME CLOUD & CROSS-TAB SYNC ENGINE
// Silicon Labs • Dual-Channel Real-Time Bridge
// 1. BroadcastChannel: 0ms real-time sync across local browser tabs & windows
// 2. ntfy.sh Global Bus: Real-time SSE sync across mobile phones & remote receiver terminals
// ============================================================================

import { Student } from '@/types';

export const SYNC_TOPIC = 'sb_prod_sync_cloudflare_r2_v1';
export const SYNC_BASE_URL = `https://ntfy.sh/${SYNC_TOPIC}`;
export const R2_PUBLIC_BASE_URL = 'https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev';

export interface SyncPayload {
  action: 'UPSERT' | 'DELETE' | 'DELETE_PERMANENT' | 'TEMPORARY_DELETE' | 'RESTORE' | 'PING';
  student?: Student;
  studentId?: string;
  timestamp: number;
}

/**
 * Universal photo URL resolver.
 * Resolves every stored photo reference straight to the public R2 CDN. The bucket is
 * already world-readable and most records carry its absolute URL, so going direct keeps
 * images loading even when the edge API is unavailable, and removes one Worker hop per
 * thumbnail from the directory.
 */
export function getPhotoUrl(pathOrUrl?: any | null): string | null {
  if (!pathOrUrl) return null;
  if (typeof pathOrUrl === 'object') {
    const s = pathOrUrl;
    return getPhotoUrl(s.capturedPhoto || s.photoBase64 || s.previewPath || s.photoPath || s.thumbnailPath || s.originalPhotoPath);
  }
  if (typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // Base64 data URI (direct display)
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  let cleanKey = trimmed;
  // Stored as the edge-API proxy path: use the bucket object it points at instead.
  if (cleanKey.startsWith('/api/photos/')) {
    cleanKey = cleanKey.slice('/api/photos/'.length);
  } else if (cleanKey.includes('r2.dev/')) {
    // Already a public CDN URL.
    return cleanKey;
  } else if (cleanKey.includes('/api/photos/')) {
    cleanKey = cleanKey.split('/api/photos/')[1] || cleanKey;
  } else if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
    // If it's an R2 storage URL, extract the bucket key
    if (cleanKey.includes('r2.cloudflarestorage.com')) {
      try {
        const u = new URL(cleanKey);
        cleanKey = u.pathname.replace(/^\/+/, '');
        if (cleanKey.startsWith('siliconlabs/')) {
          cleanKey = cleanKey.replace(/^siliconlabs\//, '');
        }
      } catch (e) {}
    } else {
      // External non-R2 image URL
      return cleanKey;
    }
  }

  cleanKey = cleanKey.replace(/^\/+/, '');
  if (!cleanKey) return null;

  return `${R2_PUBLIC_BASE_URL}/${encodeURI(cleanKey)}`;
}

/**
 * Ordered, de-duplicated photo sources for one record.
 *
 * The bucket original comes first, then the light previews the station carries, so the
 * portrait renders from storage whenever it is there and from the transmitted thumbnail
 * when it is not (photo still queued on the sender, or the edge API not executing). Callers
 * walk the list through an onError handler, which is what gives the "thumbnail first, then
 * the original" behaviour without waiting for a refresh.
 */
export function getPhotoCandidates(student?: any | null): string[] {
  if (!student) return [];
  const urls: string[] = [];
  for (const raw of [student.photoPath, student.originalPhotoPath, student.previewPath, student.thumbnailPath, student.capturedPhoto, student.photoBase64]) {
    const url = getPhotoUrl(raw);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/**
 * onError walker for a photo <img>: step through getPhotoCandidates() for one record so the
 * bucket original, then the previews the station transmitted, each get a turn before the
 * avatar (or hiding the frame) is used. React cannot re-issue a failed image load, so the
 * swap happens on the element and callers key the <img> on the resolved source — when the HD
 * portrait later lands in storage the row remounts and the original takes over from the
 * thumbnail without a refresh. That is the "thumbnail first, then the original" contract.
 */
export function photoSourceError(candidates: string[], fallbackUrl?: string) {
  return (event: { currentTarget: EventTarget | null }) => {
    const el = event.currentTarget as HTMLImageElement | null;
    if (!el) return;
    const next = Number(el.dataset.sourceIndex || 0) + 1;
    if (next < candidates.length) {
      el.dataset.sourceIndex = String(next);
      el.src = candidates[next];
    } else if (fallbackUrl) {
      el.src = fallbackUrl;
    } else {
      el.style.display = 'none';
    }
  };
}

/**
 * Encoded / Unencoded classifier.
 * Students with verified biometric photos are "Encoded" (ready for ID encoding & printing).
 */
export function getPhotoEncodeClass(student: Student): 'Encoded' | 'Unencoded' {
  if (student.photoIntegrityStatus === 'PHOTO_VERIFIED') return 'Encoded';
  if ((student as any).capturedPhoto && (student as any).capturedPhoto.trim().length > 0) return 'Encoded';
  if ((student as any).photoBase64 && (student as any).photoBase64.trim().length > 0) return 'Encoded';
  if (student.photoPath && student.photoPath.trim().length > 0) return 'Encoded';
  if (student.previewPath && student.previewPath.trim().length > 0) return 'Encoded';
  if (student.thumbnailPath && student.thumbnailPath.trim().length > 0) return 'Encoded';
  return 'Unencoded';
}

// Local BroadcastChannel instance for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('studentbridge_sync_channel');
  } catch (e) {
    console.warn('BroadcastChannel initialization skipped:', e);
  }
}

// ntfy.sh caps a message body, and the station's Telegram-protocol thumbnail is only a few
// KB, so the small preview is worth carrying while the full-resolution capture is not.
const BUS_PREVIEW_LIMIT = 96 * 1024;

function keepBusPreview(value: any): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s.startsWith('data:') && s.length > BUS_PREVIEW_LIMIT) return '';
  return s;
}

export function cleanStudentForSync(student?: Student): Student | undefined {
  if (!student) return undefined;
  const clean = { ...student } as any;
  delete clean.capturedPhoto;
  delete clean.photoBase64;
  // Keep the transmitted thumbnail instead of replacing it with the storage path: a path
  // alone renders as a gray avatar for any portrait whose object has not reached the bucket,
  // which is exactly the window between a send and its background HD upload. Oversized
  // captures still fall back to the storage path so ntfy never rejects the message.
  clean.previewPath = keepBusPreview(clean.previewPath) || clean.photoPath || '';
  clean.thumbnailPath = keepBusPreview(clean.thumbnailPath) || clean.photoPath || '';
  return clean as Student;
}

/**
 * Publishes an upsert or deletion event to both local cross-tab bus and global cloud sync bus.
 */
export async function publishStudentSync(
  action: 'UPSERT' | 'DELETE',
  studentOrId: Student | string
): Promise<boolean> {
  try {
    const rawStudent = typeof studentOrId !== 'string' ? studentOrId : undefined;
    const studentId = typeof studentOrId === 'string' ? studentOrId : studentOrId.studentId;

    // 1. Full-fidelity payload for Local Short-Range (BroadcastChannel & DOM Event, 0ms)
    // Retains full biometric photo (capturedPhoto, photoBase64, previewPath) for instant cross-tab receipt
    const localPayload: SyncPayload = {
      action,
      student: rawStudent,
      studentId,
      timestamp: Date.now()
    };

    // Broadcast locally across browser tabs (Short Range: 0ms)
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(localPayload);
      } catch (bcErr) {
        console.warn('BroadcastChannel post warning:', bcErr);
      }
    }

    // Dispatch local DOM event for same-window reactive listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange', { detail: localPayload }));
    }

    // 2. Lightweight payload for Long-Range (Global Cloud SSE via ntfy.sh)
    // Strips large base64 strings so ntfy.sh does not reject payload exceeding header/body limits
    const cloudStudent = cleanStudentForSync(rawStudent);
    const cloudPayload: SyncPayload = {
      action,
      student: cloudStudent,
      studentId,
      timestamp: Date.now()
    };

    fetch(SYNC_BASE_URL, {
      method: 'POST',
      headers: {
        Title: action === 'UPSERT' ? `STUDENT_ENROLLED_${studentId}` : `STUDENT_DELETED_${studentId}`,
        Priority: 'urgent',
        Tags: 'student,sync,encoded'
      },
      body: JSON.stringify(cloudPayload),
      cache: 'no-store'
    }).catch(err => {
      console.warn('Cloud sync publish notice:', err);
    });

    return true;
  } catch (err) {
    console.warn('publishStudentSync error:', err);
    return false;
  }
}

/**
 * Subscribes Receiver Station to real-time sync events from both local tabs and remote devices.
 */
export function subscribeToStudentSync(
  onUpsert: (student: Student) => void,
  onDelete?: (studentId: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isSubscribed = true;

  // 1. Listen to Local BroadcastChannel (cross-tab)
  const handleBcMessage = (event: MessageEvent<SyncPayload>) => {
    if (!isSubscribed || !event.data) return;
    const payload = event.data;
    if (payload.action === 'UPSERT' && payload.student) {
      onUpsert(payload.student);
    } else if ((payload.action === 'DELETE' || payload.action === 'DELETE_PERMANENT') && payload.studentId && onDelete) {
      onDelete(payload.studentId);
    } else if (payload.action === 'TEMPORARY_DELETE' && payload.studentId) {
      // Trigger data refresh on soft delete
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studentbridge_softdelete', { detail: payload.studentId }));
      }
    } else if (payload.action === 'RESTORE' && payload.studentId) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studentbridge_softdelete', { detail: payload.studentId }));
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }

  // 2. Listen to Window DOM event (same window)
  const handleDomEvent = (event: Event) => {
    if (!isSubscribed) return;
    const custom = event as CustomEvent<SyncPayload>;
    if (custom.detail) {
      if (custom.detail.action === 'UPSERT' && custom.detail.student) {
        onUpsert(custom.detail.student);
      } else if ((custom.detail.action === 'DELETE' || custom.detail.action === 'DELETE_PERMANENT') && custom.detail.studentId && onDelete) {
        onDelete(custom.detail.studentId);
      }
    }
  };
  window.addEventListener('studentbridge_datachange', handleDomEvent);

  // 3. Connect to Global Cloud Sync Bus via Server-Sent Events (SSE)
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`${SYNC_BASE_URL}/sse`);
    eventSource.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const raw = JSON.parse(event.data);
        // ntfy message envelope wraps user body inside .message
        const payload: SyncPayload = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw;
        if (payload.action === 'UPSERT' && payload.student) {
          onUpsert(payload.student);
        } else if ((payload.action === 'DELETE' || payload.action === 'DELETE_PERMANENT') && payload.studentId && onDelete) {
          onDelete(payload.studentId);
        } else if ((payload.action === 'TEMPORARY_DELETE' || payload.action === 'RESTORE') && payload.studentId) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('studentbridge_softdelete', { detail: payload.studentId }));
          }
        }
      } catch (parseErr) {
        // Ping or non-JSON message, safely ignore
      }
    };
    eventSource.onerror = () => {
      // Automatic browser reconnect handled by EventSource
    };
  } catch (sseErr) {
    console.warn('Cloud EventSource setup skipped:', sseErr);
  }

  // Return unsubscribe cleanup function
  return () => {
    isSubscribed = false;
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('studentbridge_datachange', handleDomEvent);
    if (eventSource) {
      eventSource.close();
    }
  };
}
