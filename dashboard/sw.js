/* ============================================================
   FPCS Service Worker — Offline-first caching for dashboard
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   STRATEGY: Cache-first for static assets (HTML, JS, CSS, images),
   network-first for API calls (Google Sheets). Enables full offline
   use in Chrome browser.
   ============================================================ */

var CACHE_NAME = 'fpcs-dash-v21';
var STATIC_ASSETS = [
  './',
  'index.html',
  'bots.html',
  'memory.html',
  'japster.html',
  'helpdesk.html',
  'admin.html',
  'realbotville.html',
  'library.html',
  'stats-board.html',
  'sentrylion.html',
  'sentrylion-console.html',
  'js/auth.js',
  'js/nav.js',
  'js/sheets-api.js',
  'js/sheets-notes.js',
  'js/memory-blocks.js',
  'js/offline.js',
  'js/chiligbot.js',
  'js/firestore-db.js',
  'js/sentryfleet-db.js',
  'js/notify.js',
  'js/suno-radio.js',
  'css/suno-radio.css',
  'bot-assistant.js'
];

// --- INSTALL: Cache static assets ---
self.addEventListener('install', function (event) {
  console.log('[SW] Install — caching static assets');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn('[SW] Some assets failed to cache:', err);
        // Cache what we can, don't fail the install
        return Promise.all(
          STATIC_ASSETS.map(function (url) {
            return cache.add(url).catch(function () {
              console.warn('[SW] Failed to cache: ' + url);
            });
          })
        );
      });
    })
  );
  // Activate immediately (don't wait for old tabs to close)
  self.skipWaiting();
});

// --- ACTIVATE: Clean old caches ---
self.addEventListener('activate', function (event) {
  console.log('[SW] Activate — cleaning old caches');
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          console.log('[SW] Deleting old cache: ' + name);
          return caches.delete(name);
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// --- FETCH: Smart routing ---
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Google Sheets API = network-first
  if (url.hostname === 'sheets.googleapis.com') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Firebase Auth + RTDB = network-only (never cache auth or realtime data)
  if (url.hostname.indexOf('googleapis.com') !== -1 ||
      url.hostname.indexOf('firebaseapp.com') !== -1 ||
      url.hostname.indexOf('firebase.google.com') !== -1 ||
      url.hostname.indexOf('firebaseio.com') !== -1 ||
      url.hostname.indexOf('firebasedatabase.app') !== -1 ||
      url.hostname.indexOf('gstatic.com') !== -1) {
    event.respondWith(fetch(event.request).catch(function () {
      return new Response('', { status: 503, statusText: 'Offline' });
    }));
    return;
  }

  // Static assets = cache-first
  if (event.request.method === 'GET') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else = network
  event.respondWith(fetch(event.request));
});

// --- Cache-first strategy ---
function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      // Cache successful GET requests
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function () {
      // Offline fallback
      if (request.headers.get('Accept').indexOf('text/html') !== -1) {
        return caches.match('index.html');
      }
      return new Response('Offline', { status: 503 });
    });
  });
}

// --- Network-first strategy (for API calls) ---
function networkFirst(request) {
  return fetch(request).then(function (response) {
    // Cache successful API responses
    if (response.ok) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, clone);
      });
    }
    return response;
  }).catch(function () {
    // Offline: try cache
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
}
