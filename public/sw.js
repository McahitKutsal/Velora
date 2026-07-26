// Velora service worker — basit, güvenli önbellek.
// Statik varlıklar cache-first; sayfalar network-first (çevrimdışında cache);
// API istekleri her zaman ağdan (veri tazeliği ve kimlik doğrulama için).

const CACHE = 'velora-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // dış istekler (görsel/çeviri) doğrudan
  if (url.pathname.startsWith('/api/')) return; // API her zaman ağdan

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(css|js|woff2?|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname);

  event.respondWith(isStatic ? cacheFirst(req) : networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    const shell = await cache.match('/');
    if (shell) return shell;
    throw e;
  }
}
