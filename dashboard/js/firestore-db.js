/* ============================================================
   FPCS Firestore Data Layer — Primary database for FPCS dashboard
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   PURPOSE: Firestore-backed data layer replacing Google Sheets as
   the primary read/write database. Sheets remains a read-only
   export target. This module provides querying, real-time
   listeners, caching, similarity grouping, and offline support.

   USAGE:
     // Auto-initializes on 'fpcs-authed' event (fired by auth.js).
     // After init, use via window.FPCSFirestore:

     FPCSFirestore.getTransactions({ taxYear: '2022', category: 'Supplies' })
       .then(function(rows) { console.log(rows); });

     FPCSFirestore.getDeductions('2022').then(function(expenses) { ... });

     FPCSFirestore.getUnmatchedGroups().then(function(groups) { ... });

     FPCSFirestore.onUnmatchedChange(function(snapshot) { ... });

     FPCSFirestore.on('ready', function() { console.log('Firestore ready'); });

   COLLECTIONS:
     transactions — consolidated financial data (1,871+ rows)
     unmatched    — unmatched ledger entries (516 rows) with resolution tracking
     metadata     — project metadata, stats, sync timestamps

   PREREQUISITES:
     - Firebase compat SDK v10.14.1 loaded (firebase-app + firebase-auth from auth.js)
     - firebase-firestore-compat loaded BEFORE this script
     - Firebase app already initialized by auth.js
     - 'fpcs-authed' CustomEvent dispatched by auth.js after login

   SECURITY:
     - All reads/writes go through Firestore Security Rules
     - Requires authenticated Firebase user (from auth.js)
     - Never exposes raw credentials to console or DOM
   ============================================================ */
(function () {
  'use strict';

  // ============================================================
  //  CONSTANTS
  // ============================================================

  var COLLECTION_TRANSACTIONS = 'transactions';
  var COLLECTION_UNMATCHED = 'unmatched';
  var COLLECTION_METADATA = 'metadata';

  // FPCS business categories — flagged as "likely business deductible"
  var FPCS_CATEGORIES = [
    'FPCS Supplies',
    'FPCS Parts',
    'FPCS Misc',
    'FPCS Services'
  ];

  // Cache durations (milliseconds)
  var CACHE_TTL_QUERY = 2 * 60 * 1000;   // 2 minutes for query results
  var CACHE_TTL_STATS = 5 * 60 * 1000;   // 5 minutes for stats

  // Retry config for network errors
  var MAX_RETRIES = 3;
  var RETRY_BASE_MS = 500;  // exponential backoff: 500, 1000, 2000

  // ============================================================
  //  INTERNAL STATE
  // ============================================================

  var _db = null;              // Firestore instance
  var _initialized = false;
  var _initializing = false;   // guard against double-init
  var _cache = {};             // { key: { data, time, ttl } }
  var _listeners = {};         // event system: { eventName: [callbacks] }
  var _activeSnapshots = [];   // active real-time listener unsubscribe functions

  // ============================================================
  //  LOGGING
  // ============================================================

  function log(msg, data) {
    if (data !== undefined) {
      console.log('[FPCSFirestore] ' + msg, data);
    } else {
      console.log('[FPCSFirestore] ' + msg);
    }
  }

  function warn(msg, data) {
    if (data !== undefined) {
      console.warn('[FPCSFirestore] ' + msg, data);
    } else {
      console.warn('[FPCSFirestore] ' + msg);
    }
  }

  function logError(msg, err) {
    console.error('[FPCSFirestore] ' + msg, err || '');
    _emit('error', { message: msg, error: err });
  }

  // ============================================================
  //  CACHE LAYER
  // ============================================================

  function cacheGet(key) {
    var entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > entry.ttl) {
      delete _cache[key];
      return null;
    }
    return entry.data;
  }

  function cacheSet(key, data, ttl) {
    _cache[key] = {
      data: data,
      time: Date.now(),
      ttl: ttl || CACHE_TTL_QUERY
    };
  }

  /**
   * Invalidate cache entries matching a prefix, or all if no prefix given.
   */
  function cacheInvalidate(prefix) {
    if (!prefix) {
      _cache = {};
      return;
    }
    var keys = Object.keys(_cache);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) {
        delete _cache[keys[i]];
      }
    }
  }

  // ============================================================
  //  EVENT SYSTEM
  // ============================================================

  /**
   * Internal: emit an event to all registered listeners.
   * Supported events: 'ready', 'unmatched-resolved', 'stats-updated', 'error'
   */
  function _emit(event, data) {
    var cbs = _listeners[event];
    if (!cbs) return;
    for (var i = 0; i < cbs.length; i++) {
      try {
        cbs[i](data);
      } catch (e) {
        warn('Listener error on "' + event + '":', e);
      }
    }
  }

  // ============================================================
  //  RETRY LOGIC
  // ============================================================

  /**
   * Wraps a function that returns a Promise with retry + exponential backoff.
   * Only retries on network/unavailable errors, not auth or validation errors.
   * @param {Function} fn - Must return a Promise
   * @param {number} retries - Remaining retries
   * @param {number} delay - Current delay in ms
   * @returns {Promise}
   */
  function withRetry(fn, retries, delay) {
    if (retries === undefined) retries = MAX_RETRIES;
    if (delay === undefined) delay = RETRY_BASE_MS;

    return fn().catch(function (err) {
      // Only retry on network-type errors
      var code = err && err.code;
      var isRetryable = (
        code === 'unavailable' ||
        code === 'resource-exhausted' ||
        code === 'deadline-exceeded' ||
        (err && err.message && err.message.indexOf('Failed to fetch') !== -1)
      );

      if (!isRetryable || retries <= 0) {
        throw err;
      }

      warn('Retrying after ' + delay + 'ms (' + retries + ' left):', code || err.message);
      return new Promise(function (resolve) {
        setTimeout(resolve, delay);
      }).then(function () {
        return withRetry(fn, retries - 1, delay * 2);
      });
    });
  }

  // ============================================================
  //  GUARD — Ensures Firestore is available before any operation
  // ============================================================

  /**
   * Returns the Firestore db instance, or logs a warning and returns null.
   * All public methods should call this first and return empty/defaults if null.
   */
  function getDb() {
    if (_db) return _db;
    warn('Firestore not initialized yet. Returning empty result.');
    return null;
  }

  // ============================================================
  //  QUERY HELPERS
  // ============================================================

  /**
   * Build a Firestore query from a collection reference and a filters object.
   * @param {firebase.firestore.CollectionReference} collRef
   * @param {Object} filters - key/value pairs to apply as where() clauses
   * @param {Object} opts - { limit, orderBy, orderDir }
   * @returns {firebase.firestore.Query}
   */
  function buildQuery(collRef, filters, opts) {
    var q = collRef;
    filters = filters || {};
    opts = opts || {};

    // Apply where clauses
    var keys = Object.keys(filters);
    for (var i = 0; i < keys.length; i++) {
      var field = keys[i];
      var value = filters[field];
      if (value !== undefined && value !== null && value !== '') {
        q = q.where(field, '==', value);
      }
    }

    // Apply ordering
    if (opts.orderBy) {
      q = q.orderBy(opts.orderBy, opts.orderDir || 'asc');
    }

    // Apply limit
    if (opts.limit && opts.limit > 0) {
      q = q.limit(opts.limit);
    }

    return q;
  }

  /**
   * Execute a query and return documents as plain objects with `id` injected.
   * @param {firebase.firestore.Query} query
   * @returns {Promise<Array<Object>>}
   */
  function execQuery(query) {
    return withRetry(function () {
      return query.get().then(function (snapshot) {
        var results = [];
        snapshot.forEach(function (doc) {
          var data = doc.data();
          data.id = doc.id;
          results.push(data);
        });
        return results;
      });
    });
  }

  /**
   * Parse a currency string like "$1,234.56" or "1234.56" to a number.
   * Returns 0 for unparseable values.
   */
  function parseCurrency(val) {
    if (typeof val === 'number') return val;
    var num = parseFloat(String(val || '0').replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Generate a cache key from collection name + filters/opts.
   */
  function queryCacheKey(collection, filters, opts) {
    return collection + '::' + JSON.stringify(filters || {}) + '::' + JSON.stringify(opts || {});
  }

  // ============================================================
  //  INITIALIZATION
  // ============================================================

  /**
   * Initialize Firestore using the existing Firebase app from auth.js.
   * Enables offline persistence for resilience.
   */
  function initFirestore() {
    if (_initialized || _initializing) return;
    _initializing = true;

    try {
      // Ensure Firebase and Firestore SDK are loaded
      if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
        logError('Firebase or Firestore SDK not loaded. Ensure firebase-firestore-compat.js is included.');
        _initializing = false;
        return;
      }

      // Use the existing Firebase app (already initialized by auth.js)
      _db = firebase.firestore();

      // Enable offline persistence (fails silently if already enabled or unsupported)
      _db.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
        if (err.code === 'failed-precondition') {
          warn('Persistence unavailable: multiple tabs open. Data will not be cached offline.');
        } else if (err.code === 'unimplemented') {
          warn('Persistence not supported by this browser.');
        } else {
          warn('Persistence error:', err);
        }
      });

      _initialized = true;
      _initializing = false;
      log('Initialized with project: ' + (firebase.app().options.projectId || 'unknown'));
      _emit('ready', { db: _db });

    } catch (e) {
      logError('Init failed:', e);
      _initializing = false;
    }
  }

  // ============================================================
  //  AUTO-INIT: Listen for auth ready event from auth.js
  // ============================================================

  document.addEventListener('fpcs-authed', function () {
    log('Auth ready event received — initializing Firestore');
    initFirestore();
  });

  // ============================================================
  //  PUBLIC API
  // ============================================================

  var FPCSFirestore = {

    // ==========================================
    //  STATUS
    // ==========================================

    /**
     * Check if Firestore is ready for queries.
     * @returns {boolean}
     */
    isReady: function () {
      return _initialized && !!_db;
    },

    /**
     * Manual init (usually not needed — auto-inits on fpcs-authed).
     */
    init: function () {
      initFirestore();
    },

    // ==========================================
    //  TRANSACTIONS COLLECTION
    // ==========================================

    /**
     * Query the transactions collection with optional filters.
     * @param {Object} filters - { taxYear, category, direction, limit, orderBy }
     * @returns {Promise<Array<Object>>}
     */
    getTransactions: function (filters) {
      var db = getDb();
      if (!db) return Promise.resolve([]);

      filters = filters || {};
      var whereFilters = {};
      // Map camelCase filter keys to snake_case Firestore field names
      if (filters.taxYear) whereFilters.tax_year = filters.taxYear;
      if (filters.category) whereFilters.category = filters.category;
      if (filters.direction) whereFilters.direction = filters.direction;

      var opts = {
        limit: filters.limit || 0,
        orderBy: filters.orderBy || null,
        orderDir: filters.orderDir || 'asc'
      };

      var key = queryCacheKey(COLLECTION_TRANSACTIONS, whereFilters, opts);
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      var collRef = db.collection(COLLECTION_TRANSACTIONS);
      var query = buildQuery(collRef, whereFilters, opts);

      return execQuery(query).then(function (results) {
        cacheSet(key, results, CACHE_TTL_QUERY);
        return results;
      });
    },

    /**
     * Get a single transaction by document ID.
     * @param {string} id - Firestore document ID
     * @returns {Promise<Object|null>}
     */
    getTransaction: function (id) {
      var db = getDb();
      if (!db) return Promise.resolve(null);

      return withRetry(function () {
        return db.collection(COLLECTION_TRANSACTIONS).doc(id).get()
          .then(function (doc) {
            if (!doc.exists) return null;
            var data = doc.data();
            data.id = doc.id;
            return data;
          });
      });
    },

    /**
     * Update fields on a transaction document.
     * @param {string} id - Document ID
     * @param {Object} fields - Fields to merge-update
     * @returns {Promise<void>}
     */
    updateTransaction: function (id, fields) {
      var db = getDb();
      if (!db) return Promise.reject(new Error('Firestore not initialized'));

      // Add update metadata
      fields.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      if (window.FPCS_USER) {
        fields.updatedBy = window.FPCS_USER.email;
      }

      return withRetry(function () {
        return db.collection(COLLECTION_TRANSACTIONS).doc(id).update(fields);
      }).then(function () {
        log('Updated transaction ' + id);
        cacheInvalidate(COLLECTION_TRANSACTIONS);
      });
    },

    /**
     * Shortcut: get all expenses (direction=Expense) for a tax year.
     * @param {string} taxYear - e.g. '2022'
     * @returns {Promise<Array<Object>>}
     */
    getDeductions: function (taxYear) {
      return this.getTransactions({
        taxYear: taxYear,
        direction: 'Expense'
      });
    },

    /**
     * Shortcut: get all income (direction=Income) for a tax year.
     * @param {string} taxYear - e.g. '2022'
     * @returns {Promise<Array<Object>>}
     */
    getIncome: function (taxYear) {
      return this.getTransactions({
        taxYear: taxYear,
        direction: 'Income'
      });
    },

    // ==========================================
    //  UNMATCHED COLLECTION
    // ==========================================

    /**
     * Query unmatched ledger entries with optional filters.
     * @param {Object} filters - { category, vendor, status, limit }
     * @returns {Promise<Array<Object>>}
     */
    getUnmatched: function (filters) {
      var db = getDb();
      if (!db) return Promise.resolve([]);

      filters = filters || {};
      var whereFilters = {};
      if (filters.category) whereFilters.category = filters.category;
      if (filters.vendor) whereFilters.vendor = filters.vendor;
      if (filters.status) whereFilters.status = filters.status;

      var opts = {
        limit: filters.limit || 0,
        orderBy: filters.orderBy || null,
        orderDir: filters.orderDir || 'asc'
      };

      var key = queryCacheKey(COLLECTION_UNMATCHED, whereFilters, opts);
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      var collRef = db.collection(COLLECTION_UNMATCHED);
      var query = buildQuery(collRef, whereFilters, opts);

      return execQuery(query).then(function (results) {
        cacheSet(key, results, CACHE_TTL_QUERY);
        return results;
      });
    },

    /**
     * Get summary statistics for unmatched entries.
     * @returns {Promise<Object>} { total, byCategory, byVendor, totalAmount, fpcsAmount }
     */
    getUnmatchedStats: function () {
      var key = 'unmatched-stats';
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      return this.getUnmatched({}).then(function (entries) {
        var byCategory = {};
        var byVendor = {};
        var totalAmount = 0;
        var fpcsAmount = 0;

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var cat = entry.category || 'Uncategorized';
          var vendor = entry.vendor || 'Unknown';
          var amount = parseCurrency(entry.amount);

          // Category counts
          byCategory[cat] = (byCategory[cat] || 0) + 1;

          // Vendor counts
          byVendor[vendor] = (byVendor[vendor] || 0) + 1;

          // Amounts
          totalAmount += amount;
          if (FPCS_CATEGORIES.indexOf(cat) !== -1) {
            fpcsAmount += amount;
          }
        }

        var stats = {
          total: entries.length,
          byCategory: byCategory,
          byVendor: byVendor,
          totalAmount: totalAmount,
          fpcsAmount: fpcsAmount
        };

        cacheSet(key, stats, CACHE_TTL_STATS);
        return stats;
      });
    },

    /**
     * Resolve an unmatched entry — mark it as categorized/handled.
     * @param {string} id - Document ID
     * @param {Object} resolution - { category, isDeductible, notes, resolvedBy }
     * @returns {Promise<void>}
     */
    resolveUnmatched: function (id, resolution) {
      var db = getDb();
      if (!db) return Promise.reject(new Error('Firestore not initialized'));

      resolution = resolution || {};
      var update = {
        status: 'resolved',
        resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        resolvedBy: resolution.resolvedBy || (window.FPCS_USER ? window.FPCS_USER.email : 'unknown')
      };
      if (resolution.category) update.resolvedCategory = resolution.category;
      if (resolution.isDeductible !== undefined) update.isDeductible = !!resolution.isDeductible;
      if (resolution.notes) update.resolutionNotes = resolution.notes;

      return withRetry(function () {
        return db.collection(COLLECTION_UNMATCHED).doc(id).update(update);
      }).then(function () {
        log('Resolved unmatched entry ' + id);
        cacheInvalidate(COLLECTION_UNMATCHED);
        cacheInvalidate('unmatched-stats');
        cacheInvalidate('unmatched-groups');
        _emit('unmatched-resolved', { id: id, resolution: resolution });
      });
    },

    /**
     * Batch-resolve multiple unmatched entries with the same resolution.
     * Uses a Firestore batch write for atomicity.
     * @param {Array<string>} ids - Document IDs to resolve
     * @param {Object} resolution - { category, isDeductible, notes, resolvedBy }
     * @returns {Promise<void>}
     */
    bulkResolve: function (ids, resolution) {
      var db = getDb();
      if (!db) return Promise.reject(new Error('Firestore not initialized'));
      if (!ids || ids.length === 0) return Promise.resolve();

      resolution = resolution || {};
      var update = {
        status: 'resolved',
        resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        resolvedBy: resolution.resolvedBy || (window.FPCS_USER ? window.FPCS_USER.email : 'unknown')
      };
      if (resolution.category) update.resolvedCategory = resolution.category;
      if (resolution.isDeductible !== undefined) update.isDeductible = !!resolution.isDeductible;
      if (resolution.notes) update.resolutionNotes = resolution.notes;

      // Firestore batches are limited to 500 writes
      var batches = [];
      var batchSize = 500;
      for (var i = 0; i < ids.length; i += batchSize) {
        var chunk = ids.slice(i, i + batchSize);
        var batch = db.batch();
        for (var j = 0; j < chunk.length; j++) {
          var ref = db.collection(COLLECTION_UNMATCHED).doc(chunk[j]);
          batch.update(ref, update);
        }
        batches.push(batch);
      }

      // Commit all batches sequentially
      var chain = Promise.resolve();
      for (var b = 0; b < batches.length; b++) {
        (function (batchRef) {
          chain = chain.then(function () {
            return withRetry(function () { return batchRef.commit(); });
          });
        })(batches[b]);
      }

      return chain.then(function () {
        log('Bulk resolved ' + ids.length + ' unmatched entries');
        cacheInvalidate(COLLECTION_UNMATCHED);
        cacheInvalidate('unmatched-stats');
        cacheInvalidate('unmatched-groups');
        _emit('unmatched-resolved', { ids: ids, resolution: resolution, bulk: true });
      });
    },

    /**
     * Find unmatched entries similar to a given entry.
     * Matches by vendor name and/or category, with optional amount range.
     * @param {Object} entry - { vendor, category, amount }
     * @returns {Promise<Array<Object>>}
     */
    getSimilarUnmatched: function (entry) {
      if (!entry) return Promise.resolve([]);

      // Primary match: same vendor
      var filters = {};
      if (entry.vendor) filters.vendor = entry.vendor;
      if (!entry.vendor && entry.category) filters.category = entry.category;

      return this.getUnmatched(filters).then(function (results) {
        // If we matched on vendor, optionally filter by category too
        if (entry.vendor && entry.category) {
          var categoryMatches = results.filter(function (r) {
            return r.category === entry.category;
          });
          // Return category-specific matches if any, otherwise all vendor matches
          if (categoryMatches.length > 0) return categoryMatches;
        }

        // Optionally filter by amount range (+/- 20%)
        if (entry.amount) {
          var targetAmount = parseCurrency(entry.amount);
          if (targetAmount > 0) {
            var low = targetAmount * 0.8;
            var high = targetAmount * 1.2;
            var amountFiltered = results.filter(function (r) {
              var amt = parseCurrency(r.amount);
              return amt >= low && amt <= high;
            });
            if (amountFiltered.length > 0) return amountFiltered;
          }
        }

        return results;
      });
    },

    /**
     * Group unmatched entries by vendor + category for the similarity view.
     *
     * Algorithm:
     *  1. Group by exact vendor name match
     *  2. Within each vendor, sub-group by category
     *  3. Calculate group totals and counts
     *  4. Flag FPCS-prefixed categories as "likely business deductible"
     *  5. Sort groups by total amount descending
     *
     * @returns {Promise<Array<Object>>}
     * Each group: {
     *   vendor: string,
     *   category: string,
     *   entries: Array<Object>,
     *   count: number,
     *   totalAmount: number,
     *   isFPCS: boolean
     * }
     */
    getUnmatchedGroups: function () {
      var key = 'unmatched-groups';
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      return this.getUnmatched({}).then(function (entries) {
        // Step 1 & 2: Build vendor+category map
        var groupMap = {};  // "vendor||category" -> { entries, totalAmount }

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var vendor = entry.vendor || 'Unknown';
          var category = entry.category || 'Uncategorized';
          var mapKey = vendor + '||' + category;

          if (!groupMap[mapKey]) {
            groupMap[mapKey] = {
              vendor: vendor,
              category: category,
              entries: [],
              totalAmount: 0
            };
          }

          groupMap[mapKey].entries.push(entry);
          groupMap[mapKey].totalAmount += parseCurrency(entry.amount);
        }

        // Step 3 & 4: Build result array with counts and FPCS flag
        var groups = [];
        var mapKeys = Object.keys(groupMap);
        for (var k = 0; k < mapKeys.length; k++) {
          var group = groupMap[mapKeys[k]];
          groups.push({
            vendor: group.vendor,
            category: group.category,
            entries: group.entries,
            count: group.entries.length,
            totalAmount: group.totalAmount,
            isFPCS: FPCS_CATEGORIES.indexOf(group.category) !== -1
          });
        }

        // Step 5: Sort by total amount descending
        groups.sort(function (a, b) {
          return b.totalAmount - a.totalAmount;
        });

        cacheSet(key, groups, CACHE_TTL_QUERY);
        return groups;
      });
    },

    // ==========================================
    //  METADATA COLLECTION
    // ==========================================

    /**
     * Get the project stats document from metadata collection.
     * Cached for 5 minutes.
     * @returns {Promise<Object|null>}
     */
    getProjectStats: function () {
      var db = getDb();
      if (!db) return Promise.resolve(null);

      var key = 'metadata-project-stats';
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      return withRetry(function () {
        return db.collection(COLLECTION_METADATA).doc('projectStats').get()
          .then(function (doc) {
            if (!doc.exists) return null;
            var data = doc.data();
            data.id = doc.id;
            cacheSet(key, data, CACHE_TTL_STATS);
            return data;
          });
      });
    },

    /**
     * Update the project stats document.
     * @param {Object} stats - Fields to merge into projectStats doc
     * @returns {Promise<void>}
     */
    updateStats: function (stats) {
      var db = getDb();
      if (!db) return Promise.reject(new Error('Firestore not initialized'));

      stats.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

      return withRetry(function () {
        return db.collection(COLLECTION_METADATA).doc('projectStats').set(stats, { merge: true });
      }).then(function () {
        log('Project stats updated');
        cacheInvalidate('metadata-project-stats');
        _emit('stats-updated', stats);
      });
    },

    /**
     * Get the last sync timestamp from metadata.
     * @returns {Promise<Object|null>} - { lastSync, source, status } or null
     */
    getLastSync: function () {
      var db = getDb();
      if (!db) return Promise.resolve(null);

      return withRetry(function () {
        return db.collection(COLLECTION_METADATA).doc('syncStatus').get()
          .then(function (doc) {
            if (!doc.exists) return null;
            return doc.data();
          });
      });
    },

    // ==========================================
    //  REAL-TIME LISTENERS
    // ==========================================

    /**
     * Listen for real-time changes to the unmatched collection.
     * Returns an unsubscribe function.
     * @param {Function} callback - Called with snapshot data on each change
     * @returns {Function} unsubscribe
     */
    onUnmatchedChange: function (callback) {
      var db = getDb();
      if (!db) {
        warn('Cannot attach listener — Firestore not ready');
        return function () {};
      }

      var unsubscribe = db.collection(COLLECTION_UNMATCHED)
        .onSnapshot(function (snapshot) {
          var entries = [];
          snapshot.forEach(function (doc) {
            var data = doc.data();
            data.id = doc.id;
            entries.push(data);
          });

          // Invalidate related caches since data changed
          cacheInvalidate(COLLECTION_UNMATCHED);
          cacheInvalidate('unmatched-stats');
          cacheInvalidate('unmatched-groups');

          try {
            callback(entries);
          } catch (e) {
            warn('onUnmatchedChange callback error:', e);
          }
        }, function (err) {
          logError('onUnmatchedChange listener error:', err);
        });

      _activeSnapshots.push(unsubscribe);
      log('Attached real-time listener: unmatched collection');
      return unsubscribe;
    },

    /**
     * Listen for real-time changes to the project stats metadata doc.
     * Returns an unsubscribe function.
     * @param {Function} callback - Called with stats data on each change
     * @returns {Function} unsubscribe
     */
    onStatsChange: function (callback) {
      var db = getDb();
      if (!db) {
        warn('Cannot attach listener — Firestore not ready');
        return function () {};
      }

      var unsubscribe = db.collection(COLLECTION_METADATA).doc('projectStats')
        .onSnapshot(function (doc) {
          if (!doc.exists) {
            try { callback(null); } catch (e) { /* silent */ }
            return;
          }

          var data = doc.data();
          data.id = doc.id;

          cacheInvalidate('metadata-project-stats');

          try {
            callback(data);
          } catch (e) {
            warn('onStatsChange callback error:', e);
          }
        }, function (err) {
          logError('onStatsChange listener error:', err);
        });

      _activeSnapshots.push(unsubscribe);
      log('Attached real-time listener: projectStats');
      return unsubscribe;
    },

    // ==========================================
    //  EXPORT (PLACEHOLDER)
    // ==========================================

    /**
     * Export a Firestore collection to a Google Sheet.
     * Placeholder — full implementation requires OAuth Sheets token from auth.js.
     * @param {string} collection - Firestore collection name
     * @param {string} sheetId - Google Sheets spreadsheet ID
     * @param {string} tabName - Target tab/sheet name
     * @returns {Promise<Object>} - { status, rowsExported }
     */
    exportToSheets: function (collection, sheetId, tabName) {
      log('exportToSheets called: ' + collection + ' -> ' + sheetId + '!' + tabName);

      // Phase 1: Read all docs from the collection
      var db = getDb();
      if (!db) return Promise.reject(new Error('Firestore not initialized'));

      return execQuery(db.collection(collection)).then(function (docs) {
        if (docs.length === 0) {
          log('No documents to export');
          return { status: 'empty', rowsExported: 0 };
        }

        // Build header row from first document's keys
        var headers = Object.keys(docs[0]).filter(function (k) { return k !== 'id'; });

        // Build value rows
        var rows = [headers];
        for (var i = 0; i < docs.length; i++) {
          var row = [];
          for (var j = 0; j < headers.length; j++) {
            var val = docs[i][headers[j]];
            row.push(val !== undefined && val !== null ? String(val) : '');
          }
          rows.push(row);
        }

        // If FPCSSheets is available and has a write token, push to Sheets
        if (window.FPCSSheets && window.FPCSSheets.canWrite()) {
          return window.FPCSSheets.write(sheetId, tabName + '!A1', rows).then(function () {
            log('Exported ' + docs.length + ' rows to Sheets');
            return { status: 'success', rowsExported: docs.length };
          });
        }

        // Otherwise return the data for manual handling
        warn('FPCSSheets not available or no write token. Returning data for manual export.');
        return { status: 'no-sheets-token', rowsExported: 0, data: rows };
      });
    },

    // ==========================================
    //  AGGREGATE STATS
    // ==========================================

    /**
     * Compute live aggregate stats across collections.
     * @returns {Promise<Object>} { transactionCount, unmatchedCount, deductionTotal, incomeTotal }
     */
    getStats: function () {
      var key = 'aggregate-stats';
      var cached = cacheGet(key);
      if (cached) return Promise.resolve(cached);

      var self = this;

      return Promise.all([
        self.getTransactions({}),
        self.getUnmatched({})
      ]).then(function (results) {
        var transactions = results[0];
        var unmatched = results[1];

        var deductionTotal = 0;
        var incomeTotal = 0;

        for (var i = 0; i < transactions.length; i++) {
          var t = transactions[i];
          var amount = parseCurrency(t.amount);
          var dir = (t.direction || '').toLowerCase();
          if (dir === 'expense' || dir === 'debit') {
            deductionTotal += Math.abs(amount);
          } else if (dir === 'income' || dir === 'credit') {
            incomeTotal += Math.abs(amount);
          }
        }

        var stats = {
          transactionCount: transactions.length,
          unmatchedCount: unmatched.length,
          deductionTotal: deductionTotal,
          incomeTotal: incomeTotal
        };

        cacheSet(key, stats, CACHE_TTL_STATS);
        return stats;
      });
    },

    // ==========================================
    //  EVENT SYSTEM
    // ==========================================

    /**
     * Subscribe to an internal event.
     * Supported events: 'ready', 'unmatched-resolved', 'stats-updated', 'error'
     * @param {string} event
     * @param {Function} callback
     */
    on: function (event, callback) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(callback);
    },

    /**
     * Unsubscribe from an internal event.
     * @param {string} event
     * @param {Function} callback
     */
    off: function (event, callback) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(function (cb) {
        return cb !== callback;
      });
    },

    // ==========================================
    //  CACHE MANAGEMENT (exposed for debugging)
    // ==========================================

    /**
     * Clear all caches. Useful after bulk operations.
     */
    clearCache: function () {
      cacheInvalidate();
      log('All caches cleared');
    },

    /**
     * Get cache diagnostic info.
     * @returns {Object} { entries, keys }
     */
    cacheStats: function () {
      var keys = Object.keys(_cache);
      return {
        entries: keys.length,
        keys: keys
      };
    },

    // ==========================================
    //  CLEANUP
    // ==========================================

    /**
     * Detach all real-time listeners. Call on page unload or when
     * switching away from a view that uses live data.
     */
    detachAll: function () {
      for (var i = 0; i < _activeSnapshots.length; i++) {
        try {
          _activeSnapshots[i]();
        } catch (e) { /* silent */ }
      }
      _activeSnapshots = [];
      log('All real-time listeners detached');
    }
  };

  // ============================================================
  //  EXPOSE GLOBALLY
  // ============================================================

  window.FPCSFirestore = FPCSFirestore;

  log('Module loaded. Will auto-init on fpcs-authed event, or call FPCSFirestore.init() manually.');
})();
