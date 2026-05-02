/* ============================================================
   FPCS Notes Layer — Read/write notes tied to Google Sheets data
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   PURPOSE: Notes, annotations, and bot replies linked to tax
   categories and sheet rows. Stored in a "Notes" tab within
   TAX_MASTER Google Sheet. Falls back to localStorage when
   offline or when Sheets write access isn't granted yet.

   USAGE:
     // After auth:
     FPCSNotes.init();

     // Read all notes (from Sheets or offline cache)
     FPCSNotes.load().then(function(notes) { ... });

     // Get notes for a category
     FPCSNotes.getByCategory('Home Office');

     // Add a note (writes to Sheet if possible, else localStorage)
     FPCSNotes.add({ category: 'Home Office', text: 'Need sqft', author: 'Commander' });

     // Bot replies to a note
     FPCSNotes.botReply(noteId, 'Calculated: $1,000 simplified method');

     // Search notes
     FPCSNotes.search('office');

   REQUIRES: sheets-api.js, auth.js (for user context)
   ============================================================ */
(function () {
  'use strict';

  // --- Constants ---
  var NOTES_TAB = 'Notes';
  var NOTES_RANGE = NOTES_TAB + '!A1:I';
  var CACHE_KEY = 'fpcs_notes_cache';
  var QUEUE_KEY = 'fpcs_notes_writeQueue';

  // Expected columns in Notes tab:
  // A: NoteID | B: Category | C: RowRef | D: Text | E: Author | F: Date | G: BotReply | H: ReplyDate | I: Status
  var COL = { id: 0, category: 1, rowRef: 2, text: 3, author: 4, date: 5, botReply: 6, replyDate: 7, status: 8 };
  var HEADERS = ['NoteID', 'Category', 'RowRef', 'Text', 'Author', 'Date', 'BotReply', 'ReplyDate', 'Status'];

  // --- Internal state ---
  var _notes = [];        // Array of note objects
  var _loaded = false;
  var _loading = false;
  var _listeners = {};
  var _writeQueue = [];   // Queued writes for when offline

  // --- Helpers ---
  function log(msg, data) {
    console.log('[FPCSNotes] ' + msg, data || '');
  }

  function warn(msg, data) {
    console.warn('[FPCSNotes] ' + msg, data || '');
  }

  function generateId() {
    return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  function now() {
    return new Date().toISOString().replace('T', ' ').substr(0, 19);
  }

  function getUser() {
    if (window.FPCS_USER) return window.FPCS_USER.displayName || window.FPCS_USER.email || 'Unknown';
    return 'Unknown';
  }

  function sheetsReady() {
    return window.FPCSSheets && window.FPCSSheets.isReady();
  }

  function canWrite() {
    return window.FPCSSheets && window.FPCSSheets.canWrite();
  }

  // --- localStorage persistence ---
  function saveToCache(notes) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ notes: notes, updated: Date.now() }));
    } catch (e) { warn('Cache save failed', e); }
  }

  function loadFromCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return data.notes || [];
    } catch (e) { return []; }
  }

  function saveWriteQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(_writeQueue));
    } catch (e) { /* ignore */ }
  }

  function loadWriteQueue() {
    try {
      var raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  // --- Convert row array to note object ---
  function rowToNote(row, idx) {
    return {
      id: row[COL.id] || '',
      category: row[COL.category] || '',
      rowRef: row[COL.rowRef] || '',
      text: row[COL.text] || '',
      author: row[COL.author] || '',
      date: row[COL.date] || '',
      botReply: row[COL.botReply] || '',
      replyDate: row[COL.replyDate] || '',
      status: row[COL.status] || 'open',
      _sheetRow: idx + 2  // 1-indexed, +1 for header
    };
  }

  // --- Convert note object to row array ---
  function noteToRow(note) {
    return [
      note.id || '',
      note.category || '',
      note.rowRef || '',
      note.text || '',
      note.author || '',
      note.date || '',
      note.botReply || '',
      note.replyDate || '',
      note.status || 'open'
    ];
  }

  // --- Event system ---
  function emit(event, data) {
    (_listeners[event] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { warn('Listener error:', e); }
    });
  }

  // --- Flush offline write queue ---
  function flushQueue() {
    if (!canWrite() || _writeQueue.length === 0) return Promise.resolve();
    log('Flushing ' + _writeQueue.length + ' queued writes');

    var queue = _writeQueue.slice();
    _writeQueue = [];
    saveWriteQueue();

    var ops = queue.map(function (op) {
      if (op.type === 'add') {
        return FPCSNotes._appendToSheet(op.note);
      } else if (op.type === 'reply') {
        return FPCSNotes._writeReplyToSheet(op.noteId, op.reply, op.replyDate);
      }
      return Promise.resolve();
    });

    return Promise.all(ops).then(function () {
      log('Queue flushed successfully');
    }).catch(function (err) {
      warn('Queue flush failed, re-queuing', err);
      _writeQueue = queue.concat(_writeQueue);
      saveWriteQueue();
    });
  }

  // ============================================================
  //  PUBLIC API
  // ============================================================
  var FPCSNotes = {

    /**
     * Initialize the notes layer
     */
    init: function () {
      _writeQueue = loadWriteQueue();
      log('Initialized' + (_writeQueue.length ? ' (' + _writeQueue.length + ' queued writes)' : ''));

      // Auto-flush queue when Sheets write becomes available
      if (canWrite() && _writeQueue.length > 0) {
        flushQueue();
      }
    },

    /**
     * Load notes from Google Sheets (or cache if offline)
     * @returns {Promise<Array>} array of note objects
     */
    load: function () {
      if (_loading) {
        return new Promise(function (resolve) {
          var check = setInterval(function () {
            if (!_loading) { clearInterval(check); resolve(_notes); }
          }, 100);
        });
      }

      // If Sheets not ready, serve from cache
      if (!sheetsReady()) {
        _notes = loadFromCache();
        _loaded = true;
        log('Loaded ' + _notes.length + ' notes from offline cache');
        emit('loaded', _notes);
        return Promise.resolve(_notes);
      }

      _loading = true;
      var sheetId = window.FPCSSheets.SHEETS.TAX_MASTER;

      return window.FPCSSheets.read(sheetId, NOTES_RANGE, { noCache: true })
        .then(function (rows) {
          _loading = false;
          if (!rows || rows.length < 1) {
            // Notes tab might not exist yet — create it
            _notes = loadFromCache();
            _loaded = true;
            log('Notes tab empty or missing, using cache (' + _notes.length + ' notes)');
            emit('loaded', _notes);
            return _notes;
          }

          // Skip header row
          var dataRows = rows[0].join(',') === HEADERS.join(',') ? rows.slice(1) : rows;
          _notes = dataRows.map(function (row, i) { return rowToNote(row, i); }).filter(function (n) { return n.id; });
          _loaded = true;

          // Update cache
          saveToCache(_notes);
          log('Loaded ' + _notes.length + ' notes from Sheets');

          // Flush any queued writes
          if (canWrite() && _writeQueue.length > 0) flushQueue();

          emit('loaded', _notes);
          return _notes;
        })
        .catch(function (err) {
          _loading = false;
          warn('Sheet read failed, using cache', err);
          _notes = loadFromCache();
          _loaded = true;
          emit('loaded', _notes);
          return _notes;
        });
    },

    /**
     * Get all loaded notes
     */
    all: function () {
      return _notes.slice();
    },

    /**
     * Get notes by category
     * @param {string} category
     * @returns {Array}
     */
    getByCategory: function (category) {
      var cat = (category || '').toLowerCase();
      return _notes.filter(function (n) {
        return (n.category || '').toLowerCase() === cat;
      });
    },

    /**
     * Search notes by text
     * @param {string} query
     * @returns {Array}
     */
    search: function (query) {
      var q = (query || '').toLowerCase();
      if (!q) return _notes.slice();
      return _notes.filter(function (n) {
        return (n.text + ' ' + n.category + ' ' + n.botReply + ' ' + n.author).toLowerCase().indexOf(q) !== -1;
      });
    },

    /**
     * Get notes that have no bot reply yet
     * @returns {Array}
     */
    unanswered: function () {
      return _notes.filter(function (n) { return !n.botReply && n.status !== 'closed'; });
    },

    /**
     * Add a new note
     * @param {Object} opts - { category, text, rowRef?, author? }
     * @returns {Object} the created note
     */
    add: function (opts) {
      var note = {
        id: generateId(),
        category: opts.category || 'General',
        rowRef: opts.rowRef || '',
        text: opts.text || '',
        author: opts.author || getUser(),
        date: now(),
        botReply: '',
        replyDate: '',
        status: 'open'
      };

      _notes.push(note);
      saveToCache(_notes);

      // Write to Sheets if possible, else queue
      if (canWrite()) {
        this._appendToSheet(note).catch(function () {
          _writeQueue.push({ type: 'add', note: note });
          saveWriteQueue();
        });
      } else {
        _writeQueue.push({ type: 'add', note: note });
        saveWriteQueue();
        log('Note queued for Sheets write (offline or no write access)');
      }

      emit('added', note);
      return note;
    },

    /**
     * Add a bot reply to an existing note
     * @param {string} noteId
     * @param {string} replyText
     * @returns {Object|null} updated note
     */
    botReply: function (noteId, replyText) {
      var note = _notes.find(function (n) { return n.id === noteId; });
      if (!note) { warn('Note not found: ' + noteId); return null; }

      var replyDate = now();
      note.botReply = replyText;
      note.replyDate = replyDate;
      saveToCache(_notes);

      // Write to Sheets
      if (canWrite() && note._sheetRow) {
        this._writeReplyToSheet(noteId, replyText, replyDate).catch(function () {
          _writeQueue.push({ type: 'reply', noteId: noteId, reply: replyText, replyDate: replyDate });
          saveWriteQueue();
        });
      } else {
        _writeQueue.push({ type: 'reply', noteId: noteId, reply: replyText, replyDate: replyDate });
        saveWriteQueue();
      }

      emit('replied', note);
      return note;
    },

    /**
     * Mark a note as closed / resolved
     * @param {string} noteId
     */
    close: function (noteId) {
      var note = _notes.find(function (n) { return n.id === noteId; });
      if (!note) return;
      note.status = 'closed';
      saveToCache(_notes);
      emit('closed', note);
    },

    /**
     * Get summary stats
     */
    stats: function () {
      var open = _notes.filter(function (n) { return n.status !== 'closed'; }).length;
      var answered = _notes.filter(function (n) { return !!n.botReply; }).length;
      var categories = {};
      _notes.forEach(function (n) { categories[n.category] = (categories[n.category] || 0) + 1; });
      return {
        total: _notes.length,
        open: open,
        closed: _notes.length - open,
        answered: answered,
        unanswered: _notes.length - answered,
        categories: categories,
        queuedWrites: _writeQueue.length
      };
    },

    /**
     * Subscribe to events
     * @param {string} event - 'loaded' | 'added' | 'replied' | 'closed'
     * @param {Function} fn
     */
    on: function (event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
    },

    /**
     * Check if notes are loaded
     */
    isLoaded: function () { return _loaded; },

    // ============================================================
    //  INTERNAL — Sheet operations
    // ============================================================

    _appendToSheet: function (note) {
      if (!canWrite()) return Promise.reject(new Error('No write access'));
      var sheetId = window.FPCSSheets.SHEETS.TAX_MASTER;
      return window.FPCSSheets.append(sheetId, NOTES_TAB + '!A:I', [noteToRow(note)]).then(function () {
        log('Note written to Sheets: ' + note.id);
      });
    },

    _writeReplyToSheet: function (noteId, reply, replyDate) {
      // Find the sheet row for this note
      var note = _notes.find(function (n) { return n.id === noteId; });
      if (!note || !note._sheetRow) return Promise.reject(new Error('No sheet row for note'));
      if (!canWrite()) return Promise.reject(new Error('No write access'));

      var sheetId = window.FPCSSheets.SHEETS.TAX_MASTER;
      var range = NOTES_TAB + '!G' + note._sheetRow + ':H' + note._sheetRow;
      return window.FPCSSheets.write(sheetId, range, [[reply, replyDate]]).then(function () {
        log('Bot reply written to Sheets row ' + note._sheetRow);
      });
    },

    /**
     * Ensure the Notes tab exists with headers (one-time setup)
     * Call after user grants Sheets write access
     */
    ensureTab: function () {
      if (!canWrite()) {
        return Promise.reject(new Error('Need Sheets write access. Call requestSheetsAccess() first.'));
      }
      var sheetId = window.FPCSSheets.SHEETS.TAX_MASTER;

      // Check if Notes tab exists by trying to read it
      return window.FPCSSheets.read(sheetId, NOTES_TAB + '!A1:A1').then(function (rows) {
        if (rows && rows.length > 0) {
          log('Notes tab already exists');
          return true;
        }
        throw new Error('empty');
      }).catch(function () {
        // Tab doesn't exist or is empty — write headers
        log('Creating Notes tab with headers...');
        return window.FPCSSheets.write(sheetId, NOTES_TAB + '!A1:I1', [HEADERS]).then(function () {
          log('Notes tab created with headers');
          return true;
        });
      });
    }
  };

  // --- Expose globally ---
  window.FPCSNotes = FPCSNotes;

  // --- Auto-init on auth ---
  document.addEventListener('fpcs-authed', function () {
    setTimeout(function () {
      FPCSNotes.init();
      FPCSNotes.load();
    }, 200);
  });

  // Also init immediately if user already authed
  if (window.FPCS_USER) {
    FPCSNotes.init();
  }

  log('Module loaded.');
})();
