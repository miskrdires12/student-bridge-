/**
 * StudentBridge — IndexedDB Offline Queue
 * Silicon Labs • Enterprise Offline-First Resilience
 * Provides durable local queuing of pending registrations & updates when network is offline.
 */

import { Student } from '@/types';
import { getAuthHeaders } from './store';

const DB_NAME = 'StudentBridgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_operations';

export interface PendingOperation {
  id: string;
  type: 'CREATE_STUDENT' | 'UPDATE_STUDENT' | 'DELETE_STUDENT' | 'UPLOAD_PHOTO';
  timestamp: string;
  payload: any;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Parse a cloud-write answer into a JSON object, or null when the server did not answer
 * with JSON.
 *
 * HTTP 200 alone is not proof of a write: a Pages deployment whose edge Worker is not
 * executing serves the SPA's HTML shell for /api/*, still with status 200. Treating that
 * as success would drop the queued record, which on this station is the only copy left.
 */
export async function cloudJsonResponse(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed[0] || null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Queue an operation in IndexedDB for offline resilience
 */
export async function queueOfflineOperation(type: PendingOperation['type'], payload: any): Promise<PendingOperation> {
  const db = await openDB();
  const op: PendingOperation = {
    id: 'op-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    type,
    timestamp: new Date().toISOString(),
    payload,
    retryCount: 0,
    status: 'PENDING'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(op);
    req.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studentbridge_offline_queue_changed'));
      }
      resolve(op);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all pending operations waiting to sync
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
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
 * Remove an operation from IndexedDB after successful synchronization
 */
export async function removePendingOperation(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentbridge_offline_queue_changed'));
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Update an operation's retry bookkeeping after a failed synchronization attempt
 */
async function markOperationFailure(op: PendingOperation, errorMsg: string): Promise<void> {
  try {
    const db = await openDB();
    const nextRetry = (op.retryCount || 0) + 1;
    const updated: PendingOperation = {
      ...op,
      retryCount: nextRetry,
      status: nextRetry >= 3 ? 'FAILED' : 'PENDING',
      error: errorMsg
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(updated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_offline_queue_changed'));
    }
  } catch (e) {}
}

/**
 * Queue health: pending (waiting/syncing), failed (retryCount >= 3), and the
 * timestamp of the last successful synchronization flush.
 */
export async function getQueueSummary(): Promise<{ pending: number; failed: number; total: number; lastSyncAt: string | null }> {
  const ops = await getPendingOperations();
  const failed = ops.filter(o => o.status === 'FAILED').length;
  let lastSyncAt: string | null = null;
  try { lastSyncAt = localStorage.getItem('sb_offline_last_sync_ok'); } catch (e) {}
  return { pending: ops.length - failed, failed, total: ops.length, lastSyncAt };
}

/**
 * Synchronize all pending offline registrations with the server.
 *
 * Single-flight: the 15 s background timer, the reconnect handler and explicit
 * calls can overlap when a flush outlives the interval. Without this guard two
 * loops read the same snapshot and transmit the same operation twice, which
 * duplicates sync traffic and audit events even though the server dedupes the
 * student record itself.
 */
let activeFlush: Promise<{ synced: number; failed: number }> | null = null;

export function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (activeFlush) return activeFlush;
  activeFlush = runQueueFlush().finally(() => { activeFlush = null; });
  return activeFlush;
}

async function runQueueFlush(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const ops = await getPendingOperations();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      let res: Response | null = null;

      if (op.type === 'CREATE_STUDENT') {
        res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });
      } else if (op.type === 'UPDATE_STUDENT') {
        res = await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });
      } else if (op.type === 'DELETE_STUDENT') {
        const permanent = op.payload?.permanent ? '&permanent=true' : '';
        res = await fetch(`/api/students?id=${encodeURIComponent(op.payload.id || op.payload.studentId)}${permanent}`, {
          method: 'DELETE',
          headers: { ...getAuthHeaders() }
        });
      } else if (op.type === 'UPLOAD_PHOTO') {
        res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });
      }
      if (!res) continue;

      const body = await cloudJsonResponse(res);
      // A duplicate studentId means the record is already in the database, so the queued
      // create has effectively been satisfied and must not retry forever.
      const duplicate = res.status === 409 || body?.error === 'DUPLICATE_ID';

      if (duplicate || (res.ok && body)) {
        await removePendingOperation(op.id);
        synced++;
      } else {
        failed++;
        await markOperationFailure(op, res.ok ? 'edge API returned no JSON (backend not executing)' : `HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      await markOperationFailure(op, String(err));
    }
  }

  if (synced > 0) {
    try { localStorage.setItem('sb_offline_last_sync_ok', new Date().toISOString()); } catch (e) {}
  }

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }

  // The station screen tells the operator what happened to the outbox rather than quietly draining
  // it: a record that left this browser minutes after the network came back has to be said out loud,
  // and one that failed again has to be visible as still pending.
  if (typeof window !== 'undefined' && (synced > 0 || failed > 0)) {
    window.dispatchEvent(new CustomEvent('studentbridge_outbox', {
      detail: { synced, failed, remaining: Math.max(0, ops.length - synced) }
    }));
  }

  return { synced, failed };
}

// Auto-sync listener when browser reconnects and background periodic check
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue().catch(() => {});
  });
  // Periodic background check every 15 seconds
  setInterval(() => {
    if (navigator.onLine) {
      syncOfflineQueue().catch(() => {});
    }
  }, 15000);
}
