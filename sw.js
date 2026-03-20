// КолбасПро Service Worker — офлайн кэширование
const CACHE_NAME = 'kolbasapro-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap'
];

// Установка: кэшируем все ресурсы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Кэшируем основные файлы, шрифты — по возможности
      return cache.addAll(ASSETS.slice(0, 3)).then(() => {
        // Шрифты — не критично если не закэшировались
        return cache.add(ASSETS[3]).catch(() => {});
      });
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: сначала кэш, потом сеть; при ошибке — кэш
self.addEventListener('fetch', e => {
  // Пропускаем chrome-extension и не-http запросы
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Кэшируем успешные GET-ответы
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Офлайн — отдаём index.html для навигационных запросов
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
