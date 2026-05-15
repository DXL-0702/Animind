const CACHE_NAME = 'animind-v2';
const PRECACHE_URLS = ['/', '/manifest.json'];

// Install: precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages/assets, skip API and non-GET requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests — POST etc. go straight to network
  if (event.request.method !== 'GET') return;

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) return;

  // Network-first: prefer fresh content, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If not in cache either, return a graceful fallback or re-throw
          // In dev mode, it's better to just let the browser handle the error
          return new Response('Offline — content not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      )
  );
});
