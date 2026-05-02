/* ============================================================
   FPCS Google Sheets Data Service — Live database backbone
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   PURPOSE: Reusable read/write module for connecting ALL dashboard
   pages to Google Sheets as the single source of truth.
   "No hardcoded numbers" — everything comes from here.

   USAGE:
     // 1. Init (once, after auth)
     FPCSSheets.init({ apiKey: 'your-key' });

     // 2. Read data
     FPCSSheets.read('SHEET_ID', 'Sheet1!A1:Z').then(function(rows) { ... });

     // 3. Write data (requires OAuth token from Google Sign-in)
     FPCSSheets.write('SHEET_ID', 'Sheet1!A2:D2', [['val1','val2','val3','val4']]);

     // 4. Append row
     FPCSSheets.append('SHEET_ID', 'Sheet1!A:D', [['new','row','data','here']]);

     // 5. Batch read multiple ranges
     FPCSSheets.batchRead('SHEET_ID', ['Sheet1!A1:Z', 'Sheet2!A1:Z']).then(...);

     // 6. Get all sheet/tab names
     FPCSSheets.getSheetNames('SHEET_ID').then(function(names) { ... });

   KNOWN SHEET IDS:
     Tax Master:     163vEMLpch2KXvQevBcwKiOp5YjS4DicDRX0r01dALDE
     Japster Sheet:  1gQke6Tzfbln0zVqMPjLnzXaUPZDr4oPzx2lX2rsRtmI

   SECURITY:
     - API key used for read-only (sheet must have "anyone with link" view access)
     - OAuth token used for writes (from Firebase Google Sign-in with sheets scope)
     - Never exposes tokens to console or DOM
   ============================================================ */
(function () {
  'use strict';

  // --- Known Spreadsheet Registry ---
  var SHEETS = {
    TAX_MASTER:       '163vEMLpch2KXvQevBcwKiOp5YjS4DicDRX0r01dALDE',
    CONSOLIDATED:     '',  // TODO: Set after James creates Google Sheet via consolidate_to_sheets.py --push-to-sheets
    FINANCIAL_ACCTS:  '',  // TODO: Set after Financial Accounts sheet is created
    JAPSTER:          '1gQke6Tzfbln0zVqMPjLnzXaUPZDr4oPzx2lX2rsRtmI'
  };

  // --- Internal state ---
  var _apiKey = '';
  var _oauthToken = '';
  var _cache = {};
  var _cacheTTL = 60000; // 1 minute cache for reads
  var _listeners = {};
  var _initialized = false;

  var BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

  // --- Helpers ---
  function log(msg, data) {
    console.log('[FPCSSheets] ' + msg, data || '');
  }

  function warn(msg, data) {
    console.warn('[FPCSSheets] ' + msg, data || '');
  }

  function cacheKey(sheetId, range) {
    return sheetId + '::' + range;
  }

  function getCached(key) {
    var entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > _cacheTTL) {
      delete _cache[key];
      return null;
    }
    return entry.data;
  }

  function setCache(key, data) {
    _cache[key] = { data: data, time: Date.now() };
  }

  function clearCache(sheetId) {
    if (!sheetId) { _cache = {}; return; }
    Object.keys(_cache).forEach(function (k) {
      if (k.indexOf(sheetId) === 0) delete _cache[k];
    });
  }

  // --- Resolve sheet ID (registry key OR actual ID) ---
  function resolveSheetId(idOrKey) {
    // If it matches a known registry key, return the actual ID
    if (SHEETS[idOrKey]) return SHEETS[idOrKey];
    // Otherwise treat as actual spreadsheet ID
    return idOrKey;
  }

  // --- Retry config ---
  var SHEETS_MAX_RETRIES = 3;
  var SHEETS_RETRY_BASE_MS = 500;

  // --- Core fetch wrapper with exponential backoff ---
  function sheetsFetch(url, options, _retryCount) {
    options = options || {};
    _retryCount = _retryCount || 0;
    var headers = options.headers || {};

    // Add auth: prefer OAuth token for writes, API key for reads
    if (options.method && options.method !== 'GET') {
      if (!_oauthToken) {
        return Promise.reject(new Error('OAuth token required for write operations. User must be signed in with Google.'));
      }
      headers['Authorization'] = 'Bearer ' + _oauthToken;
      headers['Content-Type'] = 'application/json';
    } else {
      // Read: use API key
      var sep = url.indexOf('?') === -1 ? '?' : '&';
      url += sep + 'key=' + encodeURIComponent(_apiKey);
    }

    options.headers = headers;

    return fetch(url, options)
      .then(function (res) {
        // Retry on 429 (rate limit) or 5xx (server error)
        if ((res.status === 429 || res.status >= 500) && _retryCount < SHEETS_MAX_RETRIES) {
          var delay = SHEETS_RETRY_BASE_MS * Math.pow(2, _retryCount);
          warn('Sheets API ' + res.status + ' — retrying in ' + delay + 'ms (' + (SHEETS_MAX_RETRIES - _retryCount) + ' left)');
          return new Promise(function (resolve) { setTimeout(resolve, delay); })
            .then(function () { return sheetsFetch(url, options, _retryCount + 1); });
        }
        if (!res.ok) {
          return res.json().then(function (err) {
            var msg = (err.error && err.error.message) || res.statusText;
            throw new Error('Sheets API ' + res.status + ': ' + msg);
          });
        }
        return res.json();
      })
      .catch(function (err) {
        // Retry on network errors (Failed to fetch)
        if (err.message && err.message.indexOf('Failed to fetch') !== -1 && _retryCount < SHEETS_MAX_RETRIES) {
          var delay = SHEETS_RETRY_BASE_MS * Math.pow(2, _retryCount);
          warn('Network error — retrying in ' + delay + 'ms (' + (SHEETS_MAX_RETRIES - _retryCount) + ' left)');
          return new Promise(function (resolve) { setTimeout(resolve, delay); })
            .then(function () { return sheetsFetch(url, options, _retryCount + 1); });
        }
        throw err;
      });
  }

  // --- Public API ---
  var FPCSSheets = {

    // Registry of known sheet IDs
    SHEETS: SHEETS,

    /**
     * Initialize the data service
     * @param {Object} config - { apiKey: string }
     */
    init: function (config) {
      config = config || {};
      _apiKey = config.apiKey || '';
      if (!_apiKey) {
        warn('No API key provided. Read operations will fail.');
      }
      _initialized = true;
      log('Initialized' + (_apiKey ? ' with API key' : ' (no API key)'));
    },

    /**
     * Set OAuth token for write operations (from Google Sign-in)
     * @param {string} token
     */
    setToken: function (token) {
      _oauthToken = token || '';
      if (_oauthToken) {
        log('OAuth token set — write operations enabled');
      }
    },

    /**
     * Check if service is ready
     */
    isReady: function () {
      return _initialized && !!_apiKey;
    },

    /**
     * Check if write operations are available
     */
    canWrite: function () {
      return !!_oauthToken;
    },

    // ==========================================
    //  READ OPERATIONS
    // ==========================================

    /**
     * Read a range from a spreadsheet
     * @param {string} spreadsheetId
     * @param {string} range - e.g., 'Sheet1!A1:Z' or 'Sheet1'
     * @param {Object} opts - { noCache: bool, valueRenderOption: string }
     * @returns {Promise<Array<Array>>} 2D array of cell values
     */
    read: function (spreadsheetId, range, opts) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      opts = opts || {};
      var key = cacheKey(spreadsheetId, range);

      // Check cache first
      if (!opts.noCache) {
        var cached = getCached(key);
        if (cached) return Promise.resolve(cached);
      }

      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '/values/' + encodeURIComponent(range);

      var params = [];
      if (opts.valueRenderOption) {
        params.push('valueRenderOption=' + opts.valueRenderOption);
      }
      if (params.length) url += '?' + params.join('&');

      return sheetsFetch(url).then(function (data) {
        var rows = data.values || [];
        setCache(key, rows);
        return rows;
      });
    },

    /**
     * Read and parse into array of objects (first row = headers)
     * @param {string} spreadsheetId
     * @param {string} range
     * @param {Object} opts
     * @returns {Promise<Array<Object>>}
     */
    readAsObjects: function (spreadsheetId, range, opts) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      return this.read(spreadsheetId, range, opts).then(function (rows) {
        if (rows.length < 2) return [];
        var headers = rows[0];
        var result = [];
        for (var i = 1; i < rows.length; i++) {
          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = (rows[i] && rows[i][j]) || '';
          }
          obj._rowIndex = i + 1; // 1-indexed row number in sheet (accounting for header)
          result.push(obj);
        }
        return result;
      });
    },

    /**
     * Batch read multiple ranges
     * @param {string} spreadsheetId
     * @param {Array<string>} ranges
     * @returns {Promise<Object>} Map of range -> rows
     */
    batchRead: function (spreadsheetId, ranges) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var params = ranges.map(function (r) {
        return 'ranges=' + encodeURIComponent(r);
      }).join('&');

      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '/values:batchGet?' + params;

      return sheetsFetch(url).then(function (data) {
        var result = {};
        (data.valueRanges || []).forEach(function (vr) {
          result[vr.range] = vr.values || [];
        });
        return result;
      });
    },

    /**
     * Get spreadsheet metadata including sheet/tab names
     * @param {string} spreadsheetId
     * @returns {Promise<Object>} { title, sheets: [{ id, title, rowCount, colCount }] }
     */
    getMetadata: function (spreadsheetId) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '?fields=properties.title,sheets.properties';

      return sheetsFetch(url).then(function (data) {
        return {
          title: data.properties.title,
          sheets: (data.sheets || []).map(function (s) {
            return {
              id: s.properties.sheetId,
              title: s.properties.title,
              rowCount: s.properties.gridProperties.rowCount,
              colCount: s.properties.gridProperties.columnCount
            };
          })
        };
      });
    },

    /**
     * Get just the sheet/tab names
     * @param {string} spreadsheetId
     * @returns {Promise<Array<string>>}
     */
    getSheetNames: function (spreadsheetId) {
      return this.getMetadata(spreadsheetId).then(function (meta) {
        return meta.sheets.map(function (s) { return s.title; });
      });
    },

    // ==========================================
    //  WRITE OPERATIONS (require OAuth token)
    // ==========================================

    /**
     * Write values to a range (overwrites existing)
     * @param {string} spreadsheetId
     * @param {string} range
     * @param {Array<Array>} values - 2D array
     * @returns {Promise<Object>}
     */
    write: function (spreadsheetId, range, values) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '/values/' + encodeURIComponent(range) +
        '?valueInputOption=USER_ENTERED';

      clearCache(spreadsheetId);

      return sheetsFetch(url, {
        method: 'PUT',
        body: JSON.stringify({
          range: range,
          majorDimension: 'ROWS',
          values: values
        })
      }).then(function (data) {
        log('Wrote ' + (data.updatedCells || 0) + ' cells to ' + range);
        FPCSSheets._notify(spreadsheetId, 'write', { range: range, values: values });
        return data;
      });
    },

    /**
     * Append rows to a sheet (adds after last row with data)
     * @param {string} spreadsheetId
     * @param {string} range - e.g., 'Sheet1!A:Z'
     * @param {Array<Array>} values - rows to append
     * @returns {Promise<Object>}
     */
    append: function (spreadsheetId, range, values) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '/values/' + encodeURIComponent(range) + ':append' +
        '?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS';

      clearCache(spreadsheetId);

      return sheetsFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          range: range,
          majorDimension: 'ROWS',
          values: values
        })
      }).then(function (data) {
        log('Appended ' + values.length + ' rows to ' + range);
        FPCSSheets._notify(spreadsheetId, 'append', { range: range, values: values });
        return data;
      });
    },

    /**
     * Update a single cell
     * @param {string} spreadsheetId
     * @param {string} cell - e.g., 'Sheet1!B5'
     * @param {*} value
     * @returns {Promise<Object>}
     */
    updateCell: function (spreadsheetId, cell, value) {
      return this.write(spreadsheetId, cell, [[value]]);
    },

    /**
     * Batch write to multiple ranges
     * @param {string} spreadsheetId
     * @param {Array<Object>} updates - [{ range, values }]
     * @returns {Promise<Object>}
     */
    batchWrite: function (spreadsheetId, updates) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '/values:batchUpdate';

      clearCache(spreadsheetId);

      return sheetsFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updates.map(function (u) {
            return {
              range: u.range,
              majorDimension: 'ROWS',
              values: u.values
            };
          })
        })
      }).then(function (data) {
        log('Batch wrote ' + (data.totalUpdatedCells || 0) + ' cells across ' + updates.length + ' ranges');
        FPCSSheets._notify(spreadsheetId, 'batchWrite', { updates: updates });
        return data;
      });
    },

    // ==========================================
    //  REACTIVE SUBSCRIPTIONS
    // ==========================================

    /**
     * Subscribe to data changes for a spreadsheet
     * @param {string} spreadsheetId
     * @param {string} event - 'write' | 'append' | 'batchWrite' | '*'
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    on: function (spreadsheetId, event, callback) {
      var key = spreadsheetId + '::' + event;
      if (!_listeners[key]) _listeners[key] = [];
      _listeners[key].push(callback);
      return function () {
        _listeners[key] = _listeners[key].filter(function (cb) { return cb !== callback; });
      };
    },

    /**
     * Internal: notify subscribers
     */
    _notify: function (spreadsheetId, event, data) {
      var keys = [spreadsheetId + '::' + event, spreadsheetId + '::*'];
      keys.forEach(function (key) {
        (_listeners[key] || []).forEach(function (cb) {
          try { cb(data); } catch (e) { warn('Listener error:', e); }
        });
      });
    },

    // ==========================================
    //  DATA UTILITIES
    // ==========================================

    /**
     * Search rows for matching values
     * @param {Array<Object>} data - from readAsObjects()
     * @param {string} field - column name
     * @param {string} query - search text (case-insensitive)
     * @returns {Array<Object>}
     */
    search: function (data, field, query) {
      var q = (query || '').toLowerCase();
      if (!q) return data;
      return data.filter(function (row) {
        return String(row[field] || '').toLowerCase().indexOf(q) !== -1;
      });
    },

    /**
     * Filter rows by exact field value
     * @param {Array<Object>} data
     * @param {string} field
     * @param {string} value
     * @returns {Array<Object>}
     */
    filter: function (data, field, value) {
      return data.filter(function (row) {
        return String(row[field] || '') === String(value);
      });
    },

    /**
     * Sum a numeric column
     * @param {Array<Object>} data
     * @param {string} field
     * @returns {number}
     */
    sum: function (data, field) {
      return data.reduce(function (total, row) {
        var val = parseFloat(String(row[field] || '0').replace(/[$,]/g, ''));
        return total + (isNaN(val) ? 0 : val);
      }, 0);
    },

    /**
     * Count unique values in a column
     * @param {Array<Object>} data
     * @param {string} field
     * @returns {Object} { value: count }
     */
    countBy: function (data, field) {
      var counts = {};
      data.forEach(function (row) {
        var val = String(row[field] || 'Unknown');
        counts[val] = (counts[val] || 0) + 1;
      });
      return counts;
    },

    /**
     * Group rows by a field value
     * @param {Array<Object>} data
     * @param {string} field
     * @returns {Object} { value: [rows] }
     */
    groupBy: function (data, field) {
      var groups = {};
      data.forEach(function (row) {
        var val = String(row[field] || 'Unknown');
        if (!groups[val]) groups[val] = [];
        groups[val].push(row);
      });
      return groups;
    },

    /**
     * Format a number as USD currency
     * @param {number|string} val
     * @returns {string}
     */
    formatCurrency: function (val) {
      var num = parseFloat(String(val || '0').replace(/[$,]/g, ''));
      if (isNaN(num)) return '$0.00';
      return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Clear all cached data
     */
    clearCache: clearCache,

    /**
     * Get cache stats for debugging
     */
    cacheStats: function () {
      var keys = Object.keys(_cache);
      return {
        entries: keys.length,
        keys: keys,
        totalAge: keys.reduce(function (sum, k) { return sum + (Date.now() - _cache[k].time); }, 0)
      };
    },

    // ==========================================
    //  BATCH UPDATE (for filter views, formatting, etc.)
    // ==========================================

    /**
     * Execute a batch update request (requires OAuth token)
     * @param {string} spreadsheetId
     * @param {Array<Object>} requests - array of Sheets API request objects
     * @returns {Promise<Object>}
     */
    batchUpdate: function (spreadsheetId, requests) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) + ':batchUpdate';

      return sheetsFetch(url, {
        method: 'POST',
        body: JSON.stringify({ requests: requests })
      }).then(function (data) {
        log('batchUpdate: ' + requests.length + ' request(s) applied');
        return data;
      });
    },

    // ==========================================
    //  FILTER VIEW MANAGER — Open Sheets filtered to a category
    // ==========================================

    /**
     * Internal cache for filter view IDs: { "sheetId::catName": filterViewId }
     */
    _filterViewCache: {},

    /**
     * Load all existing filter views from a spreadsheet and cache them.
     * Call once on page load or first drill-down.
     * @param {string} spreadsheetId
     * @returns {Promise<Object>} - map of title → filterViewId
     */
    loadFilterViews: function (spreadsheetId) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var self = this;
      var url = BASE_URL + '/' + encodeURIComponent(spreadsheetId) +
        '?fields=sheets.filterViews';

      return sheetsFetch(url).then(function (data) {
        var map = {};
        (data.sheets || []).forEach(function (s) {
          (s.filterViews || []).forEach(function (fv) {
            var key = spreadsheetId + '::' + fv.title;
            self._filterViewCache[key] = fv.filterViewId;
            map[fv.title] = fv.filterViewId;
          });
        });
        log('Loaded ' + Object.keys(map).length + ' filter views');
        return map;
      });
    },

    /**
     * Create a filter view for a category column.
     * @param {string} spreadsheetId
     * @param {string} category - value to filter on
     * @param {number} columnIndex - 0-based column index for the category
     * @param {number} sheetGid - the sheet/tab gid (default 0)
     * @param {number} endCol - end column index for the range
     * @returns {Promise<number>} - the new filterViewId
     */
    createFilterView: function (spreadsheetId, category, columnIndex, sheetGid, endCol) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      var self = this;
      sheetGid = sheetGid || 0;
      endCol = endCol || 26;

      var body = [{
        addFilterView: {
          filter: {
            title: 'Drill: ' + category,
            range: {
              sheetId: sheetGid,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: endCol
            },
            criteria: {}
          }
        }
      }];
      body[0].addFilterView.filter.criteria[String(columnIndex)] = {
        condition: {
          type: 'TEXT_EQ',
          values: [{ userEnteredValue: category }]
        }
      };

      return this.batchUpdate(spreadsheetId, body).then(function (data) {
        var fvid = data.replies[0].addFilterView.filter.filterViewId;
        self._filterViewCache[spreadsheetId + '::' + category] = fvid;
        log('Created filter view for "' + category + '" → fvid=' + fvid);
        return fvid;
      });
    },

    /**
     * Open Google Sheets filtered to a specific category.
     * Uses cached filter view if available, creates one if not.
     * @param {string} spreadsheetId
     * @param {string} category - category name to filter
     * @param {number} columnIndex - 0-based column index
     * @param {number} sheetGid - tab gid (default 0)
     * @param {number} endCol - total columns (default 26)
     */
    openFiltered: function (spreadsheetId, category, columnIndex, sheetGid, endCol) {
      spreadsheetId = resolveSheetId(spreadsheetId);
      sheetGid = sheetGid || 0;
      var cacheKey = spreadsheetId + '::' + category;
      var self = this;

      // Check if we need the write token
      if (!_oauthToken) {
        // Fall back to opening the full sheet (no filter)
        var fallbackUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit#gid=' + sheetGid;
        window.open(fallbackUrl, '_blank');
        warn('No OAuth token — opened sheet without filter. Grant Sheets access for filtered views.');
        return Promise.resolve();
      }

      var cached = self._filterViewCache[cacheKey];
      if (cached) {
        var url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit#gid=' + sheetGid + '&fvid=' + cached;
        window.open(url, '_blank');
        return Promise.resolve(cached);
      }

      // Create on demand, then open
      return self.createFilterView(spreadsheetId, category, columnIndex, sheetGid, endCol)
        .then(function (fvid) {
          var url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit#gid=' + sheetGid + '&fvid=' + fvid;
          window.open(url, '_blank');
          return fvid;
        })
        .catch(function (err) {
          // If filter view creation fails (e.g., already exists with same name), open unfiltered
          warn('Filter view creation failed, opening unfiltered:', err.message);
          var fallbackUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit#gid=' + sheetGid;
          window.open(fallbackUrl, '_blank');
        });
    }
  };

  // --- Expose globally ---
  window.FPCSSheets = FPCSSheets;

  log('Module loaded. Call FPCSSheets.init({ apiKey: "..." }) to activate.');
})();
