/* ============================================================
   FPCS Offline Support — Service Worker + persistent data cache
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   PURPOSE: Makes the FPCS Dashboard work offline in Chrome.
   1. Registers a service worker for static asset caching
   2. Adds persistent localStorage cache to FPCSSheets reads
   3. Shows online/offline indicator in the UI
   4. Queues writes for when connection is restored

   USAGE: Include on every page after sheets-api.js:
     <script src="js/offline.js"></script>
   ============================================================ */
(function () {
  'use strict';

  var OFFLINE_CACHE_PREFIX = 'fpcs_offline_';
  var OFFLINE_TTL = 24 * 60 * 60 * 1000; // 24 hours max cache age

  function log(msg, data) {
    console.log('[FPCS Offline] ' + msg, data || '');
  }

  // ============================================================
  //  1. SERVICE WORKER REGISTRATION
  // ============================================================
  function registerSW() {
    if (!('serviceWorker' in navigator)) {
      log('Service workers not supported');
      return;
    }

    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then(function (reg) {
        log('Service worker registered (scope: ' + reg.scope + ')');

        // Check for updates periodically
        setInterval(function () {
          reg.update();
        }, 60 * 60 * 1000); // hourly
      })
      .catch(function (err) {
        console.warn('[FPCS Offline] SW registration failed:', err);
      });
  }

  // ============================================================
  //  2. PERSISTENT SHEETS CACHE (enhances FPCSSheets)
  // ============================================================
  function enhanceSheetsCache() {
    if (!window.FPCSSheets) {
      log('FPCSSheets not found, skipping cache enhancement');
      return;
    }

    var originalRead = window.FPCSSheets.read;

    // Wrap .read() with localStorage persistence
    window.FPCSSheets.read = function (spreadsheetId, range, opts) {
      opts = opts || {};
      var cacheKey = OFFLINE_CACHE_PREFIX + spreadsheetId + '::' + range;

      // If online, do normal read + update cache
      if (navigator.onLine) {
        return originalRead.call(window.FPCSSheets, spreadsheetId, range, opts)
          .then(function (rows) {
            // Persist to localStorage
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                rows: rows,
                time: Date.now()
              }));
            } catch (e) { /* storage full, ignore */ }
            return rows;
          })
          .catch(function (err) {
            // Online but request failed — try cache
            log('Read failed, checking offline cache for ' + range);
            var cached = _getOfflineCache(cacheKey);
            if (cached) return cached;
            throw err;
          });
      }

      // Offline — serve from localStorage
      var cached = _getOfflineCache(cacheKey);
      if (cached) {
        log('Serving offline cache for ' + range);
        return Promise.resolve(cached);
      }
      return Promise.reject(new Error('Offline and no cached data for ' + range));
    };

    // Also wrap readAsObjects
    var originalReadAsObjects = window.FPCSSheets.readAsObjects;
    window.FPCSSheets.readAsObjects = function (spreadsheetId, range, opts) {
      // readAsObjects calls read internally, which is now wrapped
      return originalReadAsObjects.call(window.FPCSSheets, spreadsheetId, range, opts);
    };

    log('Sheets persistent cache enabled');
  }

  function _getOfflineCache(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var data = JSON.parse(raw);
      // Check TTL
      if (Date.now() - data.time > OFFLINE_TTL) {
        localStorage.removeItem(key);
        return null;
      }
      return data.rows;
    } catch (e) {
      return null;
    }
  }

  // ============================================================
  //  3. ONLINE / OFFLINE INDICATOR
  // ============================================================
  function setupIndicator() {
    var indicator = document.createElement('div');
    indicator.id = 'offlineIndicator';
    indicator.style.cssText = 'position:fixed;top:8px;right:8px;z-index:10000;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;pointer-events:none;transition:all .3s;opacity:0';
    document.body.appendChild(indicator);

    function updateStatus() {
      if (navigator.onLine) {
        indicator.textContent = '● Online';
        indicator.style.background = 'rgba(74,222,128,.15)';
        indicator.style.color = '#4ade80';
        indicator.style.opacity = '1';
        // Fade out after 2 seconds when online
        setTimeout(function () { indicator.style.opacity = '0'; }, 2000);
      } else {
        indicator.textContent = '● Offline Mode';
        indicator.style.background = 'rgba(251,191,36,.15)';
        indicator.style.color = '#fbbf24';
        indicator.style.opacity = '1';
      }
    }

    window.addEventListener('online', function () {
      updateStatus();
      log('Back online — flushing queues');
      // Flush any queued writes
      if (window.FPCSNotes && window.FPCSNotes.isLoaded()) {
        window.FPCSNotes.load();
      }
    });

    window.addEventListener('offline', function () {
      updateStatus();
      log('Gone offline — serving from cache');
    });

    // Initial check
    updateStatus();
  }

  // ============================================================
  //  4. GRANT SHEETS ACCESS BUTTON (global utility)
  // ============================================================
  window.fpcsGrantSheetsAccess = function () {
    if (!window.requestSheetsAccess) {
      alert('Auth module not loaded. Please refresh and try again.');
      return Promise.reject(new Error('requestSheetsAccess not available'));
    }

    return window.requestSheetsAccess().then(function (result) {
      log('Sheets write access granted');
      // Now ensure Notes tab exists
      if (window.FPCSNotes) {
        return window.FPCSNotes.ensureTab().then(function () {
          alert('Sheets access granted! Notes tab is ready.');
        });
      }
      alert('Sheets access granted!');
    }).catch(function (err) {
      console.error('[FPCS Offline] Sheets access request failed:', err);
      alert('Could not grant Sheets access. Error: ' + (err.message || err));
    });
  };

  // ============================================================
  //  INIT
  // ============================================================
  function init() {
    registerSW();
    enhanceSheetsCache();
    setupIndicator();
    log('Offline support active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
