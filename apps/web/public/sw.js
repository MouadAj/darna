const SHELL_CACHE = 'housefamily-shell-v2';
const OFFLINE_URL = '/offline.html';
const BRAND_URL = '/brand/housefamily-mark.png';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL, BRAND_URL])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (url.origin === self.location.origin && url.pathname === BRAND_URL) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});

self.addEventListener('push', (event) => {
  const message = event.data?.json() ?? {title: 'HouseFamily', body: 'There is an update in your family home.'};
  event.waitUntil(self.registration.showNotification(message.title, {body: message.body, icon: '/brand/icon-192.png', data: {url: message.url ?? '/en/activity'}}));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/en/activity'));
});
