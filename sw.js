const CACHE = 'ma3jiza-v52-web-push';
const ASSETS = ['./', './index.html', './duas.html', './duas.js?v=20261015-duas-page-1', './duas-page.css?v=20261015-duas-page-1', './tasbih.html', './quran-reader.html', './quran-reader.css?v=20261016-quran-v1.0.1', './quran-reader.js?v=20261016-quran-v1.0.1', './styles.css', './tasbih-page.css', './app.js', './web-push.js', './web-push-config.js', './tasbih.js', './data/adhkar.json', './data/quran/pages.json?v=20261016-quran-v1.0.1', './data/quran/SOURCE.txt', './favicon.svg', './favicon.ico', './favicon-16.png', './favicon-32.png', './apple-touch-icon.png', './logo-wordmark.png', './app-icon-192.png', './app-icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => { if (new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match('./index.html')))); });
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || 'حان وقت وردك في معجزة' }; }
  const title = data.title || 'معجزة | تذكير لطيف';
  const options = { body: data.body || 'حان وقت وردك في معجزة', icon: data.icon || './app-icon-192.png', badge: data.badge || './favicon-32.png', tag: data.tag || 'ma3jiza-web-push', dir: 'rtl', lang: 'ar', data: { url: data.url || './' }, actions: data.actions || [] };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || './';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(client => 'focus' in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
