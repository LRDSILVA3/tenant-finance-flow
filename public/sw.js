const CACHE_NAME = 'previna-cache-v4';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/favicon-symbol.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando cache antigo/corrompido:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e chamadas externas (Supabase, APIs, etc.)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigation / HTML: NETWORK-FIRST
  // Sempre busca o index.html fresco da rede para garantir os hashes de JS/CSS atuais
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // 2. Recursos de build (/assets/): Proteção estrita contra cache de HTML disfarçado de CSS/JS
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Valida se o item em cache é válido (não é HTML servido por fallback de erro 404)
        if (cached) {
          const cachedType = cached.headers.get('content-type') || '';
          if (url.pathname.endsWith('.css') && !cachedType.includes('text/css')) {
            // Cache corrompido (HTML em vez de CSS), ignora e busca na rede
            caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
          } else if (url.pathname.endsWith('.js') && !cachedType.includes('javascript')) {
            caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
          } else {
            return cached;
          }
        }

        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const contentType = response.headers.get('content-type') || '';
            // Blindagem: NUNCA armazena em cache se o Apache/cPanel retornar fallback text/html para assets
            const isCss = url.pathname.endsWith('.css');
            const isJs = url.pathname.endsWith('.js');
            if (isCss && !contentType.includes('text/css')) {
              return response;
            }
            if (isJs && !contentType.includes('javascript')) {
              return response;
            }

            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Demais recursos estáticos (ícones, manifest, imagens)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      );
    })
  );
});
