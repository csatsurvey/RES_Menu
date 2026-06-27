// ── Ресторан Систем — Service Worker ──
// Firebase real-time sync + offline shell caching
const CACHE = 'res-app-v1';
const SHELL = [
  '/',
  '/index.html',
];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for Firebase & API, cache-first for app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase Realtime Database & Auth — always network (real-time sync)
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Static assets & app shell — stale-while-revalidate
  if (
    e.request.method === 'GET' &&
    (url.hostname === self.location.hostname || url.protocol === 'https:')
  ) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const networkFetch = fetch(e.request).then(resp => {
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            cache.put(e.request, resp.clone());
          }
          return resp;
        }).catch(() => null);

        // Return cached immediately, update in background
        return cached || networkFetch || new Response('App offline', { status: 503 });
      })
    );
    return;
  }

  // Default: network
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Background sync (for when network comes back)
self.addEventListener('sync', e => {
  if (e.tag === 'firebase-sync') {
    // Firebase handles reconnection automatically
    // This is just a placeholder for future background sync features
    console.log('[SW] Firebase auto-sync on reconnect');
  }
});

// Push notifications (future feature placeholder)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Ресторан Систем', {
      body: data.body || 'Шинэ мэдэгдэл',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || '/'));
});
