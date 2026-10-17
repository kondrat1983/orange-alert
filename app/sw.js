/* Orange Alert service worker: offline app shell, network-first for ./data/.
 * Bump VERSION when shell files change so old caches are dropped. */
const VERSION = 'oa-v1';
const SHELL = ['./', './index.html', './app.js', './style.css', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = 'https://cdn.jsdelivr.net/npm/'; // pinned versions only, so cache-first is safe

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.href.startsWith(CDN)) { e.respondWith(cacheFirst(req)); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/data/')) { e.respondWith(networkFirst(req)); return; }
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Shell files: network-first too, so a deploy is picked up on the next load.
  e.respondWith(networkFirst(req));
});
