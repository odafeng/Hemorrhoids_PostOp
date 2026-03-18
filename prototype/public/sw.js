const CACHE_NAME = 'postop-tracker-v3';
const STATIC_ASSETS = [
  '/icon.svg',
  '/favicon.svg',
  '/manifest.json',
];

// Install — pre-cache only truly static assets (NOT index.html)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first for HTML/JS/CSS, cache-first for icons
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for navigation (HTML) and hashed assets (JS/CSS)
  if (request.mode === 'navigate' || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for truly static assets (icons, manifest)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      });
    })
  );
});

// =====================================================
// Push Notification — receive server push (future use)
// =====================================================
self.addEventListener('push', (event) => {
  const defaults = {
    title: '術後追蹤提醒 🏥',
    body: '您今日尚未填寫症狀回報，請花 30 秒完成填寫。',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'daily-reminder',
    data: { action: 'open-report' },
  };

  let payload = defaults;
  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...defaults, ...data };
    } catch {
      payload.body = event.data.text() || defaults.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      data: payload.data,
      actions: [
        { action: 'report', title: '立即填寫' },
        { action: 'dismiss', title: '稍後' },
      ],
    })
  );
});

// =====================================================
// Notification Click — navigate to symptom report
// =====================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Dismiss action — do nothing
  if (event.action === 'dismiss') return;

  // Open or focus the app, navigate to report page
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', tab: 'report' });
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/?tab=report');
    })
  );
});
