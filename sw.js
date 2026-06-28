// ── Ресторан Систем PWA Service Worker v4 ──
const CACHE_NAME = 'res-app-v4';

// Install
self.addEventListener('install', event => {
  // Шууд хуучин SW-г солино — хүлээхгүй
  self.skipWaiting();
});

// Activate — хуучин cache устга, шинэ SW тэр дороо ажилла
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // Нээлттэй бүх tab-д тэр дороо хяналт авна
  );
});

// Message handler — index.html-ийн SKIP_WAITING дуудлага
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — Firebase real-time ALWAYS network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase, Google API → заавал network (real-time sync)
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com')
  ) {
    return; // SW-г bypass — browser шууд ажиллуулна
  }

  // HTML файл → network first (шинэ deploy тэр дороо)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('/'))
    );
    return;
  }

  // JS/CSS/зураг → network first (шинэ bundle тэр дороо)
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
