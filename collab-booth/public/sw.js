// Keeps the kiosk shell, MediaPipe model and frame available if venue wifi drops.
const CACHE = 'collab-booth-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req, fallbackUrl) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(fallbackUrl || req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(fallbackUrl || req);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/assets/') || p.startsWith('/mediapipe/') || /^\/(icon-|frame-default)/.test(p)) {
    e.respondWith(cacheFirst(req));
  } else if (p === '/api/frame.png' || p === '/api/config') {
    e.respondWith(networkFirst(req, p));
  } else if (req.mode === 'navigate' && !p.startsWith('/p/')) {
    e.respondWith(networkFirst(req, '/'));
  }
});
