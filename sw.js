// ── Ресторан Систем PWA Service Worker v3 ──
const CACHE_NAME = 'res-app-v3';
const STATIC_ASSETS = ['/'];

// Install — кэш үүсгэх
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — хуучин кэш устгах
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — Firebase real-time болон API-г bypass хийнэ
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase, Google API — always network (real-time sync)
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML файл — network first (шинэ deploy тэр дороо харагдана)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/Image — stale-while-revalidate
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);
        return cached || await networkFetch || new Response('', { status: 408 });
      })
    );
  }
});
