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
 * Synchronize all pending offline registrations with the server
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const ops = await getPendingOperations();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      if (op.type === 'CREATE_STUDENT') {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });

        if (res.ok) {
          await removePendingOperation(op.id);
          synced++;
        } else {
          failed++;
        }
      } else if (op.type === 'UPDATE_STUDENT') {
        const res = await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });
        if (res.ok) {
          await removePendingOperation(op.id);
          synced++;
        } else {
          failed++;
        }
      } else if (op.type === 'DELETE_STUDENT') {
        const permanent = op.payload?.permanent ? '&permanent=true' : '';
        const res = await fetch(`/api/students?id=${encodeURIComponent(op.payload.id || op.payload.studentId)}${permanent}`, {
          method: 'DELETE',
          headers: { ...getAuthHeaders() }
        });
        if (res.ok) {
          await removePendingOperation(op.id);
          synced++;
        } else {
          failed++;
        }
      } else if (op.type === 'UPLOAD_PHOTO') {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(op.payload)
        });
        if (res.ok) {
          await removePendingOperation(op.id);
          synced++;
        } else {
          failed++;
        }
      }
    } catch (err) {
      failed++;
    }
  }

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
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
