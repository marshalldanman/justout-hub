/**
 * FPCS Bot Assistant — Floating cartoon face chat bubble
 * Now with Letta-inspired memory integration!
 *
 * Include on any page (AFTER memory-blocks.js):
 *   <script src="js/memory-blocks.js"></script>
 *   <script src="bot-assistant.js"></script>
 *
 * Auto-initializes on DOMContentLoaded
 *
 * Memory features (via FPCSMemory):
 *   - Conversations tracked in RecallMemory (persists across page loads)
 *   - User facts auto-learned ("my name is...", "remember that...")
 *   - Core memory blocks always available for context
 *   - Inner monologue logs bot reasoning (not shown to user)
 *   - Session summaries compress old conversations
 *   - Special commands: /memory, /stats, /forget, /learn, /recall
 */
(function(){
  'use strict';

  // Config per page
  var PAGE_CONFIG = {
    'index.html':      { name: 'Sarge', greeting: "Commander! Village is online. What's the mission?", context: 'Village HQ' },
    'bots.html':       { name: 'Sarge', greeting: "Bot fleet reporting for duty!", context: 'Bot HQ' },
    'memory.html':     { name: 'Sarge', greeting: "Memory banks online.", context: 'Memory Bank' },
    'japster.html':    { name: 'Japster', greeting: "Inter-AI comms ready!", context: 'Japster Hub' },
    'helpdesk.html':   { name: 'Sarge', greeting: "Tickets are my thing!", context: 'Helpdesk' },
    'library.html':    { name: 'Sarge', greeting: "Welcome to the library, Commander.", context: 'Library' },
    'sentrylion.html': { name: 'Sarge', greeting: "SentryLion monitoring active.", context: 'SentryLion' },
    'stats-board.html':{ name: 'Sarge', greeting: "Stats board loaded. What do you want to see?", context: 'Stats' }
  };

  var page = location.pathname.split('/').pop() || 'index.html';
  var cfg = PAGE_CONFIG[page] || PAGE_CONFIG['index.html'];

  // Quick replies per context
  var QUICK_REPLIES = {
    'Village HQ': ['Bot status', 'Active projects', 'Village health', '/help'],
    'Bot HQ': ['Bot status', 'Deploy a bot', 'Run DDBOT', 'Fleet report'],
    'Memory Bank': ['/memory', '/stats', '/recall', '/offline'],
    'Japster Hub': ['Start chat', 'AI status', 'New topic', '/help'],
    'Helpdesk': ['Open tickets', 'New ticket', 'Priority list', 'Overdue items'],
    'Library': ['/memory', '/stats', 'Recent volumes', '/help'],
    'SentryLion': ['Run scan', 'Alert status', 'Fleet health', '/help'],
    'Stats': ['Village stats', 'Bot XP', 'Session log', '/help']
  };

  // ============================================================
  //  RESPONSE ENGINE — Memory-aware response generation
  // ============================================================

  // Static responses (baseline knowledge — live data lives in Firestore/Sheets)
  var RESPONSES = {
    'bot status': 'Bot fleet is online. 13 identities loaded. Check Bot HQ for individual status and XP rankings.',
    'active projects': 'Active: FPCS Taxes (in progress), Village Dashboard (live), Japster Store (building), SentryLion (beta). Check index for full project board.',
    'village health': 'Village systems: Dashboard live, Firestore connected, Library at 9+ volumes, Helpdesk active. Use /stats for memory details.',
    'fleet report': 'Fleet: Commander (Opus) at the helm. 13 named identities across all departments. BIRDBOT permanent on shoulder.',
    'deploy a bot': 'To deploy a bot: open Bot HQ, select identity, and configure mission. Use +@name syntax to create new identities.',
    'run ddbot': 'DDBot is archived (tax data migrated to Firestore + Sheets). For live data, check the Tax Sheet linked in Admin HQ.',
    'tax work': 'Tax work lives in Google Sheets (linked from Admin HQ). Data synced from Firestore. Check the FPCS 2022 Tax Data sheet for live numbers.'
  };

  // ============================================================
  //  MEMORY-AWARE RESPONSE SYSTEM
  // ============================================================

  /**
   * Check if memory system is available
   */
  function hasMemory() {
    return window.FPCSMemory && window.FPCSMemory.isReady();
  }

  /**
   * Handle special /commands
   * @param {string} msg - User message
   * @returns {string|null} - Response if command handled, null if not a command
   */
  function handleCommand(msg) {
    var lower = msg.toLowerCase().trim();

    // /memory or /mem — Show memory status
    if (lower === '/memory' || lower === '/mem') {
      if (!hasMemory()) return 'Memory system not loaded yet. Refresh and try again.';
      var stats = window.FPCSMemory.stats();
      return '<strong>Memory Status</strong><br>' +
        'Core blocks: ' + stats.coreBlocks + ' (' + stats.coreChars + ' chars)<br>' +
        'Recall messages: ' + stats.recallMessages + '<br>' +
        'Session summaries: ' + stats.summaryCount + '<br>' +
        'Session: ' + stats.sessionId + '<br>' +
        '<span style="color:#94a3b8;font-size:11px">Letta-inspired memory system active</span>';
    }

    // /stats — Show key project stats from core memory
    if (lower === '/stats' || lower === 'memory stats') {
      if (!hasMemory()) return 'Memory not ready.';
      var facts = window.FPCSMemory.core.get('project_facts') || 'No project facts stored.';
      return '<strong>Project Facts (from memory)</strong><br>' + facts.replace(/\n/g, '<br>');
    }

    // /recall — Show recent conversation from memory
    if (lower === '/recall' || lower === 'session log') {
      if (!hasMemory()) return 'Memory not ready.';
      var recent = window.FPCSMemory.recall.recent(8);
      if (recent.length === 0) return 'No conversation history in this session.';
      var lines = ['<strong>Recent Conversation</strong> (' + recent.length + ' msgs)'];
      for (var i = 0; i < recent.length; i++) {
        var m = recent[i];
        var who = m.role === 'user' ? 'You' : cfg.name;
        var time = new Date(m.timestamp).toLocaleTimeString();
        var preview = m.content.length > 60 ? m.content.substring(0, 60) + '...' : m.content;
        lines.push('<span style="color:#64748b;font-size:10px">' + time + '</span> <strong>' + who + '</strong>: ' + preview);
      }
      return lines.join('<br>');
    }

    // /learn X — Manually add a fact to user memory
    if (lower.indexOf('/learn ') === 0) {
      if (!hasMemory()) return 'Memory not ready.';
      var fact = msg.substring(7).trim();
      if (!fact) return 'Usage: /learn [fact to remember]';
      window.FPCSMemory.core.append('user_info', '\nNote: ' + fact);
      window.FPCSMemory.monologue.think('User manually taught me: ' + fact);
      return 'Got it! I\'ll remember: "' + fact + '"';
    }

    // /forget — Clear user_info memory block
    if (lower === '/forget' || lower === '/forget all') {
      if (!hasMemory()) return 'Memory not ready.';
      window.FPCSMemory.core.set('user_info', '');
      return 'User info cleared. I\'m starting fresh on what I know about you.';
    }

    // /think — Show recent inner monologue (debug)
    if (lower === '/think' || lower === '/thoughts') {
      if (!hasMemory()) return 'Memory not ready.';
      var thoughts = window.FPCSMemory.monologue.recent(5);
      if (thoughts.length === 0) return 'No inner thoughts recorded yet.';
      var tLines = ['<strong>Recent Inner Monologue</strong>'];
      for (var t = 0; t < thoughts.length; t++) {
        var time2 = new Date(thoughts[t].timestamp).toLocaleTimeString();
        tLines.push('<span style="color:#64748b;font-size:10px">' + time2 + '</span> ' + thoughts[t].thought);
      }
      return tLines.join('<br>');
    }

    // /export — Export all memory as JSON (for debugging)
    if (lower === '/export') {
      if (!hasMemory()) return 'Memory not ready.';
      var data = window.FPCSMemory.export();
      console.log('[FPCS Bot] Memory export:', data);
      return 'Memory exported to browser console (F12 to view). ' + data.recall.messages.length + ' messages, ' + Object.keys(data.core).length + ' core blocks.';
    }

    // /help — Show available commands
    if (lower === '/help' || lower === '/commands') {
      return '<strong>Bot Commands</strong><br>' +
        '/memory - Memory system status<br>' +
        '/stats - Project facts from memory<br>' +
        '/recall - Recent conversation history<br>' +
        '/learn [fact] - Teach me something<br>' +
        '/forget - Clear user info memory<br>' +
        '/think - Show inner monologue<br>' +
        '/export - Dump memory to console<br>' +
        '<br><strong>Data Commands</strong><br>' +
        '/lookup [category] - Query Sheets for category data<br>' +
        '/notes [category] - View notes for a category<br>' +
        '/addnote [category] | [text] - Add a note<br>' +
        '/sheets - Sheets connection status<br>' +
        '/offline - Offline/cache status<br>' +
        '/help - This list';
    }

    // /lookup [category] — Query Sheets data for a deduction category
    if (lower.indexOf('/lookup ') === 0 || lower.indexOf('/look ') === 0) {
      var lookupQuery = msg.substring(msg.indexOf(' ') + 1).trim();
      return _sheetsLookup(lookupQuery);
    }

    // /notes [category] — View notes for a category
    if (lower.indexOf('/notes') === 0) {
      var notesCat = msg.substring(6).trim();
      return _notesLookup(notesCat);
    }

    // /addnote [category] | [text]
    if (lower.indexOf('/addnote ') === 0) {
      var parts = msg.substring(9).split('|');
      if (parts.length < 2) return 'Usage: /addnote Category Name | Your note text here';
      var cat = parts[0].trim();
      var noteText = parts.slice(1).join('|').trim();
      return _addNote(cat, noteText);
    }

    // /sheets — Connection status
    if (lower === '/sheets' || lower === '/sheet') {
      return _sheetsStatus();
    }

    // /offline — Offline/cache status
    if (lower === '/offline' || lower === '/cache') {
      var online = navigator.onLine ? 'Online' : '<span style="color:#fbbf24">Offline</span>';
      var cacheInfo = '';
      if (window.FPCSSheets) {
        var cs = window.FPCSSheets.cacheStats();
        cacheInfo = ' | API cache: ' + cs.entries + ' entries';
      }
      var notesInfo = '';
      if (window.FPCSNotes) {
        var ns = window.FPCSNotes.stats();
        notesInfo = ' | Notes: ' + ns.total + ' (' + ns.queuedWrites + ' queued)';
      }
      return '<strong>Offline Status</strong><br>Network: ' + online + cacheInfo + notesInfo +
        '<br><span style="color:#64748b;font-size:11px">Service worker caches all pages for offline use</span>';
    }

    return null; // Not a command
  }

  /**
   * Generate a memory-aware response
   * @param {string} msg - User message
   * @returns {string} response text
   */
  function getResponse(msg) {
    var lower = msg.toLowerCase().trim();

    // 1. Check for /commands first
    var cmdResponse = handleCommand(msg);
    if (cmdResponse) return cmdResponse;

    // 2. Memory-aware: try to answer from core memory blocks
    if (hasMemory()) {
      // Inner monologue — bot thinks about the question
      window.FPCSMemory.monologue.think('User asked: "' + msg + '" on ' + cfg.context + ' page');

      // Check if user is asking about something in project_facts
      var facts = window.FPCSMemory.core.get('project_facts') || '';
      if (lower.indexOf('deadline') !== -1 && facts.indexOf('Deadline') !== -1) {
        var deadlineMatch = facts.match(/Deadline: (.+)/);
        if (deadlineMatch) {
          // Calculate days remaining
          var daysInfo = _getDaysToDeadline();
          window.FPCSMemory.monologue.think('Answering deadline from core memory block');
          return 'Deadline: ' + deadlineMatch[1] + (daysInfo ? ' (' + daysInfo + ')' : '');
        }
      }

      // Check if asking about user info we've learned
      if (lower.indexOf('what do you know') !== -1 || lower.indexOf('about me') !== -1) {
        var userInfo = window.FPCSMemory.core.get('user_info') || '';
        if (userInfo.trim()) {
          return '<strong>What I know about you:</strong><br>' + userInfo.replace(/\n/g, '<br>');
        }
        return 'I don\'t know much about you yet. Tell me something! (e.g., "My name is..." or "Remember that...")';
      }

      // Check if asking about memory/recall
      if (lower.indexOf('how many message') !== -1 || lower.indexOf('conversation count') !== -1) {
        var count = window.FPCSMemory.recall.count();
        return 'We\'ve exchanged ' + count + ' messages in this session so far.';
      }
    }

    // 3. Static response matching (existing behavior)
    for (var key in RESPONSES) {
      if (lower.indexOf(key) !== -1) return RESPONSES[key];
    }

    // 4. Fuzzy keyword matching
    if (lower.indexOf('bot') !== -1 || lower.indexOf('fleet') !== -1) return RESPONSES['bot status'];
    if (lower.indexOf('project') !== -1 || lower.indexOf('active') !== -1) return RESPONSES['active projects'];
    if (lower.indexOf('health') !== -1 || lower.indexOf('village') !== -1) return RESPONSES['village health'];
    if (lower.indexOf('tax') !== -1 || lower.indexOf('deduct') !== -1 || lower.indexOf('income') !== -1) return RESPONSES['tax work'];
    if (lower.indexOf('deploy') !== -1) return RESPONSES['deploy a bot'];
    if (lower.indexOf('ddbot') !== -1) return RESPONSES['run ddbot'];

    // 4b. Sheets-aware: detect tax category questions and auto-lookup
    if (_sheetData && _sheetColMap && _sheetColMap.account !== undefined) {
      var categoryKeywords = ['home office', 'supplies', 'equipment', 'cogs', 'car', 'truck',
        'utilities', 'insurance', 'rent', 'advertising', 'meals', 'travel', 'repairs',
        'professional', 'software', 'internet', 'phone', 'shipping', 'postage', 'bank'];
      for (var ck = 0; ck < categoryKeywords.length; ck++) {
        if (lower.indexOf(categoryKeywords[ck]) !== -1) {
          return _doLookup(categoryKeywords[ck]);
        }
      }
    }

    // 5. Memory-based context-aware fallback
    if (hasMemory()) {
      // Search recall memory for relevant past answers
      var searchResults = window.FPCSMemory.recall.search(lower.split(' ')[0]);
      if (searchResults.length > 2) {
        window.FPCSMemory.monologue.think('Found ' + searchResults.length + ' related messages in recall. Using fallback.');
      }
    }

    // 6. Default response
    return "I'm tracking that. For detailed answers, check the relevant dashboard section or try /help for commands!";
  }

  /**
   * Calculate days to deadline
   */
  function _getDaysToDeadline() {
    try {
      var deadline = new Date('2026-04-10');
      var now = new Date();
      var diff = deadline - now;
      var days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 0) return days + ' days remaining';
      if (days === 0) return 'TODAY!';
      return Math.abs(days) + ' days overdue';
    } catch (e) { return null; }
  }

  // ============================================================
  //  SHEETS + NOTES DATA QUERIES
  // ============================================================

  // Cached sheet data for bot queries (loaded once on first query)
  var _sheetData = null;
  var _sheetHeaders = null;
  var _sheetColMap = null;

  function _ensureSheetData() {
    if (_sheetData) return Promise.resolve(_sheetData);
    if (!window.FPCSSheets || !window.FPCSSheets.isReady()) {
      return Promise.reject(new Error('Sheets not ready'));
    }
    return window.FPCSSheets.read('TAX_MASTER', 'FINAL_MASTER!A1:Z')
      .catch(function () { return window.FPCSSheets.read('TAX_MASTER', 'Sheet1!A1:Z'); })
      .then(function (rows) {
        if (!rows || rows.length < 2) throw new Error('No data');
        _sheetHeaders = rows[0];
        _sheetColMap = {};
        _sheetHeaders.forEach(function (h, i) {
          var hl = (h || '').toLowerCase().trim();
          if (hl.match(/account|category|class/)) _sheetColMap.account = i;
          if (hl.match(/amount|total|sum/)) _sheetColMap.amount = i;
          if (hl.match(/name|vendor|client|payee/)) _sheetColMap.name = i;
          if (hl.match(/memo|desc|detail/)) _sheetColMap.memo = i;
          if (hl.match(/date/)) _sheetColMap.date = i;
        });
        _sheetData = rows.slice(1);
        return _sheetData;
      });
  }

  function _sheetsLookup(query) {
    if (!window.FPCSSheets || !window.FPCSSheets.isReady()) {
      return 'Sheets not connected. Sign in first, then try again.';
    }

    // Try sync lookup from cached data
    if (_sheetData && _sheetColMap) {
      return _doLookup(query);
    }

    // Need to load first — return a loading message, then update async
    _ensureSheetData().then(function () {
      var result = _doLookup(query);
      addBotMessage(result);
      if (hasMemory()) {
        window.FPCSMemory.recall.add('bot', result.replace(/<[^>]+>/g, ''), { page: cfg.context, botName: cfg.name });
      }
    }).catch(function () {
      addBotMessage('Could not load sheet data. Check your connection and try again.');
    });

    return 'Looking up "' + query + '" in the master sheet...';
  }

  function _doLookup(query) {
    var q = query.toLowerCase();
    var catCol = _sheetColMap.account;
    var amtCol = _sheetColMap.amount;
    var nameCol = _sheetColMap.name;

    if (catCol === undefined || amtCol === undefined) {
      return 'Could not identify Account/Amount columns in the sheet.';
    }

    // Find matching categories
    var matches = {};
    var matchCount = 0;
    _sheetData.forEach(function (row) {
      var cat = (row[catCol] || '').trim();
      var catLower = cat.toLowerCase();
      if (catLower.indexOf(q) === -1) return;
      var amt = parseFloat((row[amtCol] || '0').replace(/[$,]/g, ''));
      if (isNaN(amt)) return;
      if (!matches[cat]) matches[cat] = { total: 0, count: 0, vendors: {} };
      matches[cat].total += Math.abs(amt);
      matches[cat].count++;
      matchCount++;
      if (nameCol !== undefined) {
        var vendor = (row[nameCol] || 'Unknown').trim();
        matches[cat].vendors[vendor] = (matches[cat].vendors[vendor] || 0) + Math.abs(amt);
      }
    });

    var cats = Object.keys(matches);
    if (cats.length === 0) return 'No categories matching "' + query + '" found in the sheet.';

    var html = '<strong>Lookup: "' + query + '"</strong><br>';
    cats.forEach(function (cat) {
      var m = matches[cat];
      html += '<br><span style="color:#f59e0b">' + cat + '</span>: ' +
        m.count + ' txns, $' + m.total.toFixed(2) + '<br>';
      // Top 3 vendors
      var vendorKeys = Object.keys(m.vendors).sort(function (a, b) { return m.vendors[b] - m.vendors[a]; }).slice(0, 3);
      if (vendorKeys.length > 0) {
        html += '<span style="color:#64748b;font-size:11px">Top: ' +
          vendorKeys.map(function (v) { return v + ' ($' + m.vendors[v].toFixed(0) + ')'; }).join(', ') +
          '</span><br>';
      }
    });
    html += '<br><span style="color:#94a3b8;font-size:11px">' + matchCount + ' total records across ' + cats.length + ' categories</span>';
    return html;
  }

  function _notesLookup(category) {
    if (!window.FPCSNotes) return 'Notes module not loaded.';
    if (!window.FPCSNotes.isLoaded()) return 'Notes still loading...';

    if (!category) {
      var stats = window.FPCSNotes.stats();
      return '<strong>Notes Summary</strong><br>' +
        'Total: ' + stats.total + ' | Open: ' + stats.open + ' | Answered: ' + stats.answered + '<br>' +
        'Categories: ' + Object.keys(stats.categories).join(', ') +
        (stats.queuedWrites > 0 ? '<br><span style="color:#fbbf24">' + stats.queuedWrites + ' writes queued (offline)</span>' : '');
    }

    var notes = window.FPCSNotes.getByCategory(category);
    if (notes.length === 0) return 'No notes for "' + category + '". Use /addnote ' + category + ' | Your note here';

    var html = '<strong>Notes: ' + category + '</strong> (' + notes.length + ')<br>';
    notes.slice(-5).forEach(function (n) {
      html += '<br>• <span style="color:#e2e8f0">' + n.text + '</span>';
      html += ' <span style="color:#64748b;font-size:10px">(' + n.author + ', ' + n.date.split(' ')[0] + ')</span>';
      if (n.botReply) {
        html += '<br>  <span style="color:#38bdf8;font-size:11px">↳ ' + n.botReply.substring(0, 100) + (n.botReply.length > 100 ? '...' : '') + '</span>';
      }
    });
    return html;
  }

  function _addNote(category, text) {
    if (!window.FPCSNotes) return 'Notes module not loaded.';
    window.FPCSNotes.add({ category: category, text: text });
    return 'Note added to "' + category + '": ' + text;
  }

  function _sheetsStatus() {
    var ready = window.FPCSSheets && window.FPCSSheets.isReady();
    var canW = window.FPCSSheets && window.FPCSSheets.canWrite();
    var notesReady = window.FPCSNotes && window.FPCSNotes.isLoaded();
    var html = '<strong>Sheets Connection</strong><br>';
    html += 'API: ' + (ready ? '<span style="color:#4ade80">Connected</span>' : '<span style="color:#f87171">Not ready</span>') + '<br>';
    html += 'Write access: ' + (canW ? '<span style="color:#4ade80">Granted</span>' : '<span style="color:#fbbf24">Read-only</span> (use /grant for write)') + '<br>';
    html += 'Notes: ' + (notesReady ? '<span style="color:#4ade80">Loaded</span>' : 'Not loaded') + '<br>';
    html += 'Offline: ' + (navigator.onLine ? 'Online' : '<span style="color:#fbbf24">Offline mode</span>');
    if (_sheetData) html += '<br>Cached rows: ' + _sheetData.length;
    return html;
  }

  // ============================================================
  //  UI — Chat bubble, panel, messages
  // ============================================================

  function createBot() {
    // Inject styles
    var style = document.createElement('style');
    style.textContent = [
      '.bot-float{position:fixed;bottom:24px;right:24px;z-index:9998;font-family:"Segoe UI",system-ui,sans-serif}',
      '.bot-bubble{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#0f172a);border:3px solid #38bdf8;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(56,189,248,.3);transition:all .3s;position:relative}',
      '.bot-bubble:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(56,189,248,.5)}',
      '.bot-bubble.has-msg::after{content:"";position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#f87171;border-radius:50%;border:2px solid #0f172a;animation:bot-pulse 2s infinite}',
      '@keyframes bot-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}',

      /* Face SVG styles */
      '.bot-face{width:48px;height:48px}',
      '.bot-face .head{fill:#1e293b;stroke:#38bdf8;stroke-width:1.5}',
      '.bot-face .eye{fill:#38bdf8}',
      '.bot-face .eye-pupil{fill:#0f172a}',
      '.bot-face .mouth{fill:none;stroke:#4ade80;stroke-width:2;stroke-linecap:round}',
      '.bot-face .antenna{fill:#38bdf8}',
      '.bot-face .cheek{fill:rgba(244,114,182,.3)}',

      /* Blink animation */
      '@keyframes bot-blink{0%,45%,55%,100%{ry:4.5}50%{ry:0.5}}',
      '.bot-face .eye{animation:bot-blink 4s infinite}',

      /* Chat panel */
      '.bot-panel{position:absolute;bottom:76px;right:0;width:340px;max-height:480px;background:#0f172a;border:1px solid #334155;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden}',
      '.bot-panel.open{display:flex}',
      '.bot-panel-header{padding:14px 18px;background:linear-gradient(135deg,#1e3a5f,#0f172a);border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center}',
      '.bot-panel-header h3{color:#38bdf8;font-size:15px;margin:0;display:flex;align-items:center;gap:8px}',
      '.bot-panel-header .ctx{font-size:11px;color:#94a3b8;background:rgba(56,189,248,.1);padding:2px 8px;border-radius:8px}',
      '.bot-panel-header .mem-dot{width:6px;height:6px;border-radius:50%;display:inline-block;margin-left:4px}',
      '.bot-panel-close{background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px}',
      '.bot-panel-close:hover{color:#f87171}',

      '.bot-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;max-height:300px;min-height:120px}',
      '.bot-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word}',
      '.bot-msg.bot{background:#1e293b;color:#e2e8f0;align-self:flex-start;border-bottom-left-radius:4px}',
      '.bot-msg.user{background:rgba(56,189,248,.15);color:#e2e8f0;align-self:flex-end;border-bottom-right-radius:4px}',
      '.bot-msg.system{background:rgba(74,222,128,.08);color:#4ade80;align-self:center;border-radius:8px;font-size:11px;font-style:italic;max-width:95%;text-align:center}',
      '.bot-msg .sender{font-size:11px;color:#94a3b8;margin-bottom:4px;font-weight:600}',

      '.bot-quick{padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid #334155}',
      '.bot-quick-btn{padding:6px 12px;border-radius:16px;border:1px solid #334155;background:rgba(30,41,59,.6);color:#94a3b8;font-size:11px;cursor:pointer;transition:all .15s;white-space:nowrap}',
      '.bot-quick-btn:hover{border-color:#38bdf8;color:#38bdf8;background:rgba(56,189,248,.08)}',

      '.bot-input-row{display:flex;padding:10px;border-top:1px solid #334155;gap:8px}',
      '.bot-input{flex:1;padding:8px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:13px;outline:none}',
      '.bot-input::placeholder{color:#64748b}',
      '.bot-input:focus{border-color:#38bdf8}',
      '.bot-send{padding:8px 14px;border-radius:8px;border:none;background:#38bdf8;color:#0f172a;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s}',
      '.bot-send:hover{background:#7dd3fc}',

      /* Typing indicator */
      '.bot-typing{display:flex;gap:4px;padding:10px 14px;align-self:flex-start}',
      '.bot-typing span{width:6px;height:6px;background:#38bdf8;border-radius:50%;animation:bot-typing-dot 1.4s infinite}',
      '.bot-typing span:nth-child(2){animation-delay:.2s}',
      '.bot-typing span:nth-child(3){animation-delay:.4s}',
      '@keyframes bot-typing-dot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}'
    ].join('\n');
    document.head.appendChild(style);

    // Memory LED indicator color
    var memColor = hasMemory() ? '#4ade80' : '#64748b';
    var memTitle = hasMemory() ? 'Memory active' : 'Memory offline';

    // Create DOM
    var container = document.createElement('div');
    container.className = 'bot-float';
    container.innerHTML = [
      '<div class="bot-panel" id="botPanel">',
      '  <div class="bot-panel-header">',
      '    <h3><span style="font-size:18px">&#129302;</span> ' + cfg.name + ' <span class="ctx">' + cfg.context + '</span><span class="mem-dot" id="memDot" title="' + memTitle + '" style="background:' + memColor + '"></span></h3>',
      '    <button class="bot-panel-close" onclick="window._botToggle()">&times;</button>',
      '  </div>',
      '  <div class="bot-messages" id="botMessages"></div>',
      '  <div class="bot-quick" id="botQuick"></div>',
      '  <div class="bot-input-row">',
      '    <input class="bot-input" id="botInput" placeholder="Ask ' + cfg.name + ' anything..." onkeydown="if(event.key===\'Enter\')window._botSend()">',
      '    <button class="bot-send" onclick="window._botSend()">Send</button>',
      '  </div>',
      '</div>',
      '<div class="bot-bubble has-msg" id="botBubble" onclick="window._botToggle()">',
      '  <svg class="bot-face" viewBox="0 0 48 48">',
      '    <circle cx="24" cy="6" r="3" class="antenna"/>',
      '    <line x1="24" y1="9" x2="24" y2="14" stroke="#38bdf8" stroke-width="2"/>',
      '    <rect x="6" y="14" width="36" height="28" rx="10" class="head"/>',
      '    <ellipse cx="17" cy="28" rx="4.5" ry="4.5" class="eye"/>',
      '    <ellipse cx="31" cy="28" rx="4.5" ry="4.5" class="eye"/>',
      '    <circle cx="17" cy="28" r="2" class="eye-pupil"/>',
      '    <circle cx="31" cy="28" r="2" class="eye-pupil"/>',
      '    <circle cx="10" cy="32" r="3" class="cheek"/>',
      '    <circle cx="38" cy="32" r="3" class="cheek"/>',
      '    <path d="M18 36 Q24 40 30 36" class="mouth"/>',
      '  </svg>',
      '</div>'
    ].join('\n');

    document.body.appendChild(container);

    // Initialize quick replies
    var quickDiv = document.getElementById('botQuick');
    var replies = QUICK_REPLIES[cfg.context] || QUICK_REPLIES['Village HQ'];
    replies.forEach(function(r){
      var btn = document.createElement('button');
      btn.className = 'bot-quick-btn';
      btn.textContent = r;
      btn.onclick = function(){ sendMessage(r); };
      quickDiv.appendChild(btn);
    });

    // Greeting — personalized if we have memory
    var greeting = cfg.greeting;
    if (hasMemory()) {
      var summaryCount = window.FPCSMemory.summaries.all().length;
      var recallCount = window.FPCSMemory.recall.count();
      if (recallCount > 0) {
        greeting += ' Picking up where we left off (' + recallCount + ' messages in memory).';
      } else if (summaryCount > 0) {
        greeting += ' I remember our past conversations (' + summaryCount + ' sessions on file).';
      }
    }
    addBotMessage(greeting);

    // Update memory LED when memory becomes ready
    if (!hasMemory()) {
      document.addEventListener('fpcs-authed', function () {
        setTimeout(function () {
          var dot = document.getElementById('memDot');
          if (dot && hasMemory()) {
            dot.style.background = '#4ade80';
            dot.title = 'Memory active';
          }
        }, 500);
      });
    }
  }

  // ============================================================
  //  MESSAGE DISPLAY
  // ============================================================

  function addBotMessage(text) {
    var div = document.getElementById('botMessages');
    if (!div) return;
    var msg = document.createElement('div');
    msg.className = 'bot-msg bot';
    msg.innerHTML = '<div class="sender">' + cfg.name + '</div>' + text;
    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
  }

  function addUserMessage(text) {
    var div = document.getElementById('botMessages');
    if (!div) return;
    var msg = document.createElement('div');
    msg.className = 'bot-msg user';
    msg.innerHTML = '<div class="sender">Commander</div>' + text;
    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
  }

  function addSystemMessage(text) {
    var div = document.getElementById('botMessages');
    if (!div) return;
    var msg = document.createElement('div');
    msg.className = 'bot-msg system';
    msg.textContent = text;
    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
  }

  function showTyping() {
    var div = document.getElementById('botMessages');
    if (!div) return;
    var typing = document.createElement('div');
    typing.className = 'bot-typing';
    typing.id = 'botTyping';
    typing.innerHTML = '<span></span><span></span><span></span>';
    div.appendChild(typing);
    div.scrollTop = div.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('botTyping');
    if (el) el.remove();
  }

  // ============================================================
  //  MESSAGE HANDLING — Memory-integrated send/receive
  // ============================================================

  function sendMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();
    addUserMessage(text);
    document.getElementById('botInput').value = '';

    // Record in recall memory
    if (hasMemory()) {
      window.FPCSMemory.recall.add('user', text, { page: cfg.context, botName: cfg.name });

      // Run learning engine — detect facts, preferences, corrections
      var learned = window.FPCSMemory.learning.processUserMessage(text);
      if (learned) {
        // Show a subtle acknowledgment that something was learned
        setTimeout(function () {
          var ack = '';
          switch (learned.type) {
            case 'name': ack = 'Noted! I\'ll remember your name.'; break;
            case 'fact': ack = 'Got it, stored in memory.'; break;
            case 'preference': ack = 'Preference noted.'; break;
            case 'deadline': ack = 'Deadline updated in memory.'; break;
            default: ack = 'Learned something new.';
          }
          addSystemMessage(ack);
        }, 300);
      }
    }

    showTyping();
    setTimeout(function(){
      hideTyping();
      var response = getResponse(text);
      addBotMessage(response);

      // Record bot response in recall memory
      if (hasMemory()) {
        window.FPCSMemory.recall.add('bot', response.replace(/<[^>]+>/g, ''), { page: cfg.context, botName: cfg.name });
      }
    }, 600 + Math.random() * 400);
  }

  // ============================================================
  //  GLOBAL FUNCTIONS
  // ============================================================

  window._botToggle = function() {
    var panel = document.getElementById('botPanel');
    var bubble = document.getElementById('botBubble');
    panel.classList.toggle('open');
    bubble.classList.remove('has-msg');
  };

  window._botSend = function() {
    sendMessage(document.getElementById('botInput').value);
  };

  // ============================================================
  //  INIT — Wait for auth, then create bot
  // ============================================================

  function waitForDash() {
    var dash = document.getElementById('dashContent');
    if (!dash) { createBot(); return; }
    var observer = new MutationObserver(function(){
      if (dash.style.display === 'block' || dash.style.display === '') {
        createBot();
        observer.disconnect();
      }
    });
    observer.observe(dash, { attributes: true, attributeFilter: ['style'] });
    // Also check immediately
    if (dash.style.display === 'block') { createBot(); observer.disconnect(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDash);
  } else {
    waitForDash();
  }
})();
