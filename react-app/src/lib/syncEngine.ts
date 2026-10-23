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
  /** Hardware id of the station that published this event. */
  originStation?: string;
  timestamp: number;
}

/**
 * This station's hardware id.
 *
 * Read straight from storage instead of importing store: store already depends on this module,
 * so importing back would make the two mutually dependent. The key is the same one the rest of
 * the app uses, so a station has exactly one identity everywhere.
 */
export function syncStationId(): string {
  try {
    let devId = localStorage.getItem('sb_device_id');
    if (!devId) {
      devId = 'DEV-SILICON-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('sb_device_id', devId);
    }
    return devId;
  } catch {
    return 'DEV-SILICON-EDGE';
  }
}

function stationAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': syncStationId()
  };
  try {
    const token = localStorage.getItem('sb_auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const saved = localStorage.getItem('sb_auth_user');
    headers['X-Station-Role'] = saved ? (JSON.parse(saved)?.role || 'RECEIVER') : 'RECEIVER';
  } catch {
    headers['X-Station-Role'] = 'RECEIVER';
  }
  return headers;
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

// ntfy.sh turns any body above 4,096 bytes into a file attachment and replaces the message
// text with "You received a file: ...", which is not JSON. A publisher that overflows the
// limit therefore looks healthy while every remote station throws the event away, so the
// cloud copy is budgeted to stay inline and the subscriber can still read an attachment.
const BUS_INLINE_LIMIT = 4096;
const BUS_BODY_BUDGET = BUS_INLINE_LIMIT - 96;

function fitsInline(cloudPayload: SyncPayload): boolean {
  return JSON.stringify(cloudPayload).length <= BUS_BODY_BUDGET;
}

export function cleanStudentForSync(student?: Student, payloadForSizing?: SyncPayload): Student | undefined {
  if (!student) return undefined;
  const clean = { ...student } as any;
  delete clean.capturedPhoto;
  delete clean.photoBase64;

  // Keep the transmitted thumbnail instead of replacing it with the storage path: a path
  // alone renders as a gray avatar for any portrait whose object has not reached the bucket,
  // which is exactly the window between a send and its background HD upload.
  const thumbnail = [clean.previewPath, clean.thumbnailPath]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .find(v => v.startsWith('data:')) || '';

  // One copy of the bytes only. The station stores the same thumbnail in two fields, and
  // carrying both doubled the payload and pushed every send into attachment mode.
  clean.previewPath = thumbnail || clean.photoPath || '';
  clean.thumbnailPath = clean.photoPath || '';

  const sizeWith = () => fitsInline({ ...(payloadForSizing || ({} as SyncPayload)), student: clean as Student });

  if (!sizeWith()) {
    for (const key of Object.keys(clean)) {
      if (clean[key] === '' || clean[key] === null || clean[key] === undefined) delete clean[key];
    }
  }
  if (!sizeWith() && Array.isArray(clean.recordHistory)) clean.recordHistory = clean.recordHistory.slice(-1);
  if (!sizeWith()) delete clean.recordHistory;
  // Last resort: ship the storage path so the record still arrives even without its preview.
  if (!sizeWith() && thumbnail) clean.previewPath = clean.photoPath || '';

  return clean as Student;
}

/**
 * Publishes an upsert or deletion event to both local cross-tab bus and global cloud sync bus.
 */
let lastCloudPublish: { key: string; at: number } = { key: '', at: 0 };

export async function publishStudentSync(
  action: 'UPSERT' | 'DELETE',
  studentOrId: Student | string
): Promise<boolean> {
  try {
    const rawStudent = typeof studentOrId !== 'string' ? studentOrId : undefined;
    const studentId = typeof studentOrId === 'string' ? studentOrId : studentOrId.studentId;
    if (action === 'UPSERT') rememberLocalSend(studentId);

    // 1. Full-fidelity payload for Local Short-Range (BroadcastChannel & DOM Event, 0ms)
    // Retains full biometric photo (capturedPhoto, photoBase64, previewPath) for instant cross-tab receipt
    const localPayload: SyncPayload = {
      action,
      student: rawStudent,
      studentId,
      originStation: syncStationId(),
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
    const cloudEnvelope: SyncPayload = { action, studentId, originStation: syncStationId(), timestamp: Date.now() };
    const cloudStudent = cleanStudentForSync(rawStudent, cloudEnvelope);
    const cloudPayload: SyncPayload = { ...cloudEnvelope, student: cloudStudent };
    const cloudBody = JSON.stringify(cloudPayload);

    // A station writes a record several times per send (stage 1 result, then the photo
    // update). Re-posting an identical body inside the same second only floods remote
    // stations, which are the ones that have to parse it.
    const publishKey = `${action}:${studentId}:${(cloudStudent as any)?.updatedAt || cloudBody.length}`;
    if (publishKey === lastCloudPublish.key && Date.now() - lastCloudPublish.at < 1500) {
      return true;
    }
    lastCloudPublish = { key: publishKey, at: Date.now() };

    fetch(SYNC_BASE_URL, {
      method: 'POST',
      headers: {
        Title: action === 'UPSERT' ? `STUDENT_ENROLLED_${studentId}` : `STUDENT_DELETED_${studentId}`,
        Priority: 'urgent',
        Tags: 'student,sync,encoded'
      },
      body: cloudBody,
      cache: 'no-store'
    })
      .then(res => res.json().catch(() => null))
      .then(ack => {
        if (ack?.attachment) {
          console.warn(`Cloud sync published as a ${cloudBody.length}-byte attachment; remote stations read it from ${ack.attachment.url}`);
        }
      })
      .catch(err => {
        console.warn('Cloud sync publish notice:', err);
      });

    return true;
  } catch (err) {
    console.warn('publishStudentSync error:', err);
    return false;
  }
}

// A station's own sends are listed here so that reading them back out of the cloud - which every
// delta poll does - is never mistaken for another station confirming a delivery. The stored record
// identifies the operator account in senderId, not this device, so two stations of one account
// cannot be told apart from the row alone; this list is what makes "self" knowable after a reload.
const LOCAL_SEND_KEY = 'sb_local_send_ids';
const LOCAL_SEND_KEEP = 200;
let localSendIds: Set<string> | null = null;

function getLocalSendIds(): Set<string> {
  if (localSendIds) return localSendIds;
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_SEND_KEY) || '[]');
    localSendIds = new Set(Array.isArray(parsed) ? parsed.map((v: unknown) => String(v).toUpperCase()) : []);
  } catch {
    localSendIds = new Set();
  }
  return localSendIds;
}

export function rememberLocalSend(studentId: string): void {
  const sid = (studentId || '').trim().toUpperCase();
  if (!sid) return;
  const ids = getLocalSendIds();
  if (ids.has(sid)) return;
  ids.add(sid);
  try {
    const capped = Array.from(ids).slice(-LOCAL_SEND_KEEP);
    localSendIds = new Set(capped);
    localStorage.setItem(LOCAL_SEND_KEY, JSON.stringify(capped));
  } catch {
    // Out of storage the in-memory list still guards this tab, which is where the send happened.
  }
}

export interface DeliveryReceipt {
  studentId: string;
  station: string;
  stationName: string;
  role?: string;
  at: string;
}

// A bus record that this station has applied into its own directory is a receipt, and it is the
// only evidence a sending station can show that a receiver actually holds the data.
const reportedReceipts = new Set<string>();

function postDeliveryReceipt(studentId: string, station: string): void {
  fetch('/api/students/received', {
    method: 'POST',
    headers: stationAuthHeaders(),
    body: JSON.stringify({ studentId, station, stationName: station }),
    cache: 'no-store'
  }).catch(err => console.warn('Delivery receipt notice failed:', err));
}

/**
 * Acknowledge a record this station applied from somewhere other than itself.
 *
 * The origin guard is what makes the confirmation mean anything: the bus echoes a station's own
 * send back to it, and the cloud delta read returns it too, so without excluding self-originated
 * records the operator would get a "receiver confirmed" that is really just themselves.
 */
function currentAccountId(): string {
  try {
    const raw = localStorage.getItem('sb_auth_user');
    return raw ? String(JSON.parse(raw).id || '').trim() : '';
  } catch {
    return '';
  }
}

function reportAppliedReceipt(studentId: string, origin: string): void {
  const sid = (studentId || '').trim();
  const station = syncStationId();
  if (!sid) return;
  // The bus echoes a station's own send straight back to it, and the delta read returns it as a
  // stored row, so both paths have to exclude self. Origin is the device id when the cloud copy
  // carries one and the operator account otherwise, which a second station of the same sender
  // cannot be told apart from - hence the station's own send list as well.
  if (getLocalSendIds().has(sid.toUpperCase())) return;
  if (!origin || origin === station || origin.includes(station)) return;
  // A record written by the account signed in here is this station's own send even when it arrived
  // through a path that never registered it locally, such as the APK or a direct API write. One
  // account is locked to one terminal, so there is no second station to credit it to.
  const account = currentAccountId();
  if (account && origin === account) return;
  const dedupeKey = `${origin}|${sid.toUpperCase()}`;
  if (reportedReceipts.has(dedupeKey)) return;
  reportedReceipts.add(dedupeKey);
  postDeliveryReceipt(sid, station);
}

function reportRemoteReceipt(payload: SyncPayload): void {
  reportAppliedReceipt(
    (payload.student?.studentId || payload.studentId || '').trim(),
    (payload.originStation || '').trim()
  );
}

/**
 * The receipts the cloud holds for one student: which stations applied it and when.
 * An empty list means no station has confirmed, which the caller must be able to tell apart from
 * a delivery, so a failed read reports as no receipts rather than inventing any.
 */
export async function fetchDeliveryReceipts(studentId: string): Promise<DeliveryReceipt[]> {
  try {
    const res = await fetch(`/api/students/delivery?studentId=${encodeURIComponent(studentId)}`, {
      headers: stationAuthHeaders(),
      cache: 'no-store'
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !Array.isArray(data.received)) return [];
    return data.received as DeliveryReceipt[];
  } catch {
    return [];
  }
}

/**
 * The delivery path that does not depend on a third party.
 *
 * ntfy.sh gives every anonymous browser its own subscription and caps a topic at 512 of them, so a
 * full shift of stations can be refused before a record is ever pushed - the live bus then answers
 * "429 too many active subscriptions" and nothing moves. The Cloudflare copy holds the same rows and
 * has no such ceiling, so the bus works here as an accelerator while this read is what a station
 * actually relies on to receive another station's send.
 *
 * Ten seconds is the gap between a send and its confirmation being visible to the operator, and it is
 * already well inside the two minutes the sender keeps watching for receipts. Every open station reads
 * this feed, so the interval also has to stay affordable next to the paginated reconcile in the store.
 */
const CLOUD_DELTA_POLL_MS = 10000;
const CLOUD_DELTA_PAGE = 50;
// Only a record this recent counts as a live send. Without the bound a tab backgrounded for hours
// would come back and acknowledge a whole day of registrations as though each one had just arrived.
const CLOUD_DELTA_ACK_WINDOW_MS = 15 * 60 * 1000;

type CloudDeltaListener = (student: Student) => void;

const cloudDeltaListeners = new Set<CloudDeltaListener>();
let cloudDeltaRunning = false;
let cloudDeltaTimer: ReturnType<typeof setTimeout> | undefined;
// Start a minute behind the present so a send that landed while this station was still booting is
// picked up, then walk the cursor to the newest row actually seen instead of to "now": a throttled
// tab catches up on what it missed rather than skipping past it.
let cloudDeltaCursor = 0;
// Everything the first sweep returns is backlog this station simply had not loaded yet, not a
// send it watched arrive, so it is applied without confirming anything. Without that rule a
// station whose clock runs behind the cloud would acknowledge old registrations as deliveries.
let cloudDeltaBootSweep = true;

/**
 * One poller per station, shared by every subscriber. The store subscribes at module load and a
 * receiver page subscribes on top of it, so without sharing each station would read the same feed
 * twice per tick. The loop is never torn down when a page unmounts: restarting it would rewind the
 * cursor and run the boot sweep again, and the boot sweep deliberately confirms nothing.
 */
export function startCloudDeltaSync(onUpsert: CloudDeltaListener): () => void {
  if (typeof window === 'undefined') return () => {};
  cloudDeltaListeners.add(onUpsert);
  if (!cloudDeltaRunning) {
    cloudDeltaRunning = true;
    cloudDeltaCursor = Date.now() - 60_000;
    cloudDeltaBootSweep = true;
    document.addEventListener('visibilitychange', () => scheduleCloudDelta(0));
    scheduleCloudDelta(1500);
  }
  return () => {
    cloudDeltaListeners.delete(onUpsert);
  };
}

function scheduleCloudDelta(delay: number) {
  if (cloudDeltaTimer) clearTimeout(cloudDeltaTimer);
  cloudDeltaTimer = setTimeout(pollCloudDelta, delay);
}

async function pollCloudDelta() {
  let advanced = false;
  try {
    const res = await fetch(
      `/api/students?since=${encodeURIComponent(new Date(cloudDeltaCursor).toISOString())}&limit=${CLOUD_DELTA_PAGE}`,
      { headers: stationAuthHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const rows: Student[] = Array.isArray(data?.students) ? data.students : [];
      const now = Date.now();
      rows.forEach(row => {
        if (!row || !row.studentId) return;
        cloudDeltaListeners.forEach(listener => {
          try {
            listener(row);
          } catch (listenerErr) {
            // One page's handler must not stall the feed for the rest of the station.
            console.warn('Cloud delta subscriber notice:', listenerErr);
          }
        });
        const stampedAt = Date.parse((row as any).updatedAt || row.createdAt || '');
        if (!Number.isFinite(stampedAt)) return;
        if (stampedAt > cloudDeltaCursor) {
          cloudDeltaCursor = stampedAt;
          advanced = true;
        }
        if (now - stampedAt <= CLOUD_DELTA_ACK_WINDOW_MS && !cloudDeltaBootSweep) {
          reportAppliedReceipt(row.studentId, (row as any).originStation || (row as any).senderId || '');
        }
      });
      cloudDeltaBootSweep = false;
    }
  } catch (err) {
    // A cloud that cannot be reached this tick is retried on the next one; the station's own
    // offline queue is what keeps unsent records, not this read.
  }
  // A station that is merely in the background syncs more slowly; it does not stop receiving, and
  // the browser throttling a hidden tab is no reason to leave its directory stale.
  const interval = document.visibilityState === 'hidden' ? CLOUD_DELTA_POLL_MS * 5 : CLOUD_DELTA_POLL_MS;
  // A full page means more of one send batch is waiting behind the cap, but only keep going when
  // the cursor actually moved, so rows sharing a timestamp cannot loop forever.
  scheduleCloudDelta(advanced ? 0 : interval);
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

    const applyPayload = (payload: SyncPayload) => {
      if (payload.action === 'UPSERT' && payload.student) {
        onUpsert(payload.student);
        // Only the cloud path can be a remote station's send, so only it earns a receipt.
        reportRemoteReceipt(payload);
      } else if ((payload.action === 'DELETE' || payload.action === 'DELETE_PERMANENT') && payload.studentId && onDelete) {
        onDelete(payload.studentId);
      } else if ((payload.action === 'TEMPORARY_DELETE' || payload.action === 'RESTORE') && payload.studentId) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentbridge_softdelete', { detail: payload.studentId }));
        }
      }
    };

    eventSource.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const raw = JSON.parse(event.data);
        // ntfy message envelope wraps user body inside .message
        if (typeof raw.message === 'string' && raw.attachment?.url) {
          // The body was too large for a message, so ntfy stored it as a file and put a
          // placeholder in its place. Fetching the file is the only way to recover the record.
          fetch(raw.attachment.url, { cache: 'no-store' })
            .then(res => (res.ok ? res.text() : ''))
            .then(text => {
              if (!text) return;
              const payload: SyncPayload = JSON.parse(text);
              if (isSubscribed) applyPayload(payload);
            })
            .catch(() => {});
          return;
        }
        applyPayload(typeof raw.message === 'string' ? JSON.parse(raw.message) : raw);
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

  // 4. Read the Cloudflare delta feed, which delivers what the bus was refused permission to carry
  const stopCloudDelta = startCloudDeltaSync((student) => {
    if (isSubscribed) onUpsert(student);
  });

  // Return unsubscribe cleanup function
  return () => {
    isSubscribed = false;
    stopCloudDelta();
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('studentbridge_datachange', handleDomEvent);
    if (eventSource) {
      eventSource.close();
    }
  };
}
