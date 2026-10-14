// Offline queue: posts that couldn't reach the server are kept in IndexedDB
// and retried automatically. The server dedupes by id, so retries are safe.
const DB = 'collab-booth';
const STORE = 'outbox';

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

const listeners = new Set();
export function onOutboxChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
async function notify() {
  const n = await count().catch(() => 0);
  listeners.forEach((fn) => fn(n));
}

export const count = () => tx('readonly', (s) => s.count());
const all = () => tx('readonly', (s) => s.getAll());
const put = (item) => tx('readwrite', (s) => s.put(item));
const del = (id) => tx('readwrite', (s) => s.delete(id));

async function send(payload) {
  const res = await fetch('/api/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Post now; on network failure or 5xx, park it in the outbox.
 * Returns the server result, or { status: 'offline' }. Throws on 4xx (bad input).
 */
export async function postOrQueue(payload) {
  try {
    const { res, data } = await send(payload);
    if (res.ok) return data;
    if (res.status >= 400 && res.status < 500) {
      const err = new Error(data.error || 'Could not post');
      err.status = res.status;
      throw err;
    }
  } catch (err) {
    if (err.status) throw err;
  }
  await put({ id: payload.id, payload, savedAt: Date.now() });
  notify();
  return { id: payload.id, status: 'offline' };
}

let flushing = false;
export async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    for (const item of await all()) {
      try {
        const { res } = await send(item.payload);
        if (res.ok || (res.status >= 400 && res.status < 500)) await del(item.id);
      } catch {
        break; // still offline; try again later
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}

export function startOutboxSync() {
  flushOutbox();
  const timer = setInterval(flushOutbox, 15000);
  window.addEventListener('online', flushOutbox);
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', flushOutbox);
  };
}
