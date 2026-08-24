const CACHE_NAME = 'onestop-veggies-v1';
const CACHE_FILES = [
  '/',
  '/Onestop_Veggies/index.html',
  '/Onestop_Veggies/styles.min.css',
  '/Onestop_Veggies/script.min.js',
  '/Onestop_Veggies/config.js',
  '/Onestop_Veggies/sw-register.js',
  '/Onestop_Veggies/offline.html',
  '/Onestop_Veggies/404.html',
  '/Onestop_Veggies/500.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/Onestop_Veggies/offline.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
