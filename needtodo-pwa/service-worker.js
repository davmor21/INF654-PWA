// service-worker.js
const CACHE = 'needtodo-v4';

// Use ONLY local, relative files here (no CDNs, no leading "/")
const PRECACHE = [
  './index.html',
  './css/app.css',
  './js/db.js',
  './js/state.js',
  './js/ui.js',
  './js/app.js',
  './js/sw-register.js',
  './manifest.webmanifest',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of PRECACHE) {
      try {
        await cache.add(url); // add one by one so a single 404 doesn't kill install
      } catch (err) {
        // Log and keep going — check your console to see which file failed
        console.warn('[SW] failed to precache:', url, err);
      }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // delete old caches if you changed the name
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) && caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  // Cache-first for same-origin requests
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req))
    );
  }
});