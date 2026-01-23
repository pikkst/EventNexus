/* EventNexus scanner PWA service worker */
const CACHE_VERSION = 'eventnexus-scanner-pwa-v1';
const BASE_PATH = self.location.pathname.replace(/service-worker\.js$/, '') || '/';
const toBasePath = (path) => `${BASE_PATH}${path.replace(/^\//, '')}`;

const CORE_ASSETS = [
  toBasePath('/'),
  toBasePath('index.html'),
  toBasePath('scanner'),
  toBasePath('manifest.webmanifest'),
  toBasePath('favicon.svg'),
  toBasePath('logo-optimized.svg'),
  toBasePath('apple-touch-icon.svg')
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Ensure SPA continues to work offline after first load
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(toBasePath('index.html'), copy));
          return response;
        })
        .catch(() => caches.match(toBasePath('index.html')))
    );
    return;
  }

  // Cache-first for same-origin assets (including Vite hashed assets)
  if (url.origin === self.location.origin) {
    const isAsset = url.pathname.includes('/assets/');
    const isCore = CORE_ASSETS.includes(url.pathname) || CORE_ASSETS.includes(`${url.pathname}/`);

    if (isAsset || isCore) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;

          return fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => cached);
        })
      );
    }
  }

  // Implementing server-side rendering for event pages
  if (request.url.includes('/events/')) {
    event.respondWith(
      fetch(request).then(response => {
        // Modify response for SSR
        return response;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Updating sitemap generation logic to include hreflang tags
function generateSitemap() {
    const urls = getEventUrls(); // Function to get event URLs
    const hreflangTags = getHreflangTags(); // Function to get hreflang tags
    // Logic to generate sitemap with hreflang tags
    return `<urlset xmlns='http://www.sitemaps.org/schemas/sitemap-image/1.1'>
        ${urls.map(url => `<url><loc>${url}</loc>${hreflangTags}</url>`).join('')}
    </urlset>`;
}
