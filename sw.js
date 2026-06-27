// ── Ресторан Систем Service Worker v2 ──
const CACHE = 'res-app-v2';  // ← v1 → v2 болгосон, хуучин cache устана

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase — always network (real-time)
  if (url.hostname.includes('firebasedatabase.app') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // HTML — network first (ensures new deployments show immediately)
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => { caches.open(CACHE).then(c => c.put(e.request, resp.clone())); return resp; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/CSS/images — cache first (fast loading)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      });
      return cached || network;
    })
  );
});
