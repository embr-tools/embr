const CACHE = 'vault-v1.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.1/ethers.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Jost:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => console.log('Cache miss:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for local assets, network-first for external
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  if (isLocal) {
    // Cache first
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        }).catch(() => new Response('Offline', { status: 503 }));
      })
    );
  } else {
    // Network first, fallback to cache
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
  }
});

// Background sync for cache updates
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
