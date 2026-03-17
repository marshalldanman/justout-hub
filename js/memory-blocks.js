/**
 * FPCS Memory Blocks — Letta-inspired memory system
 * ===================================================
 * Inspired by Letta (MemGPT) core memory architecture:
 *   1. Core Memory   — labeled blocks always available (persona, user, task_state)
 *   2. Recall Memory — conversation history with auto-summarization
 *   3. Archival      — long-term knowledge (future: Firebase RTDB)
 *
 * Patterns adapted from Letta source code:
 *   - Memory blocks with metadata (label, value, limit, timestamps)
 *   - Self-editing via core_memory_replace / core_memory_append
 *   - Recursive summarization at context overflow
 *   - Memory metadata header injection into every response context
 *
 * Storage: localStorage (instant) + Firebase RTDB (sync, Phase 2)
 * Zero dependencies beyond browser APIs.
 *
 * Usage:
 *   <script src="js/memory-blocks.js"></script>
 *   FPCSMemory.init({ userId: 'uid123', page: 'Village HQ' });
 *   FPCSMemory.core.set('user_info', 'Name: Commander\nRole: Admin');
 *   FPCSMemory.recall.add('user', 'What is the bot fleet status?');
 *   var ctx = FPCSMemory.getContextHeader();
 */
(function () {
  'use strict';

  // ============================================================
  //  CONFIG
  // ============================================================
  var STORAGE_PREFIX = 'fpcs_mem_';
  var MAX_RECALL_MESSAGES = 100;      // Keep last 100 messages before summarizing
  var SUMMARIZE_THRESHOLD = 80;       // Summarize when recall hits 80 messages
  var SUMMARIZE_KEEP_RECENT = 24;     // Keep newest 24 messages raw after summarization
  var MAX_SUMMARIES = 20;             // Keep last 20 session summaries
  var DEFAULT_BLOCK_LIMIT = 2000;     // Default char limit per core block

  // ============================================================
  //  STATE
  // ============================================================
  var _initialized = false;
  var _config = {
    userId: 'anonymous',
    page: 'unknown',
    sessionId: null
  };

  // Core memory blocks — always in context
  var _coreBlocks = {};

  // Recall memory — conversation history for current session
  var _recall = {
    sessionId: null,
    messages: [],
    startedAt: null
  };

  // Session summaries — compressed history from past sessions
  var _summaries = [];

  // Event listeners
  var _listeners = {};

  // ============================================================
  //  STORAGE — localStorage with graceful fallback
  // ============================================================
  var Storage = {
    _key: function (suffix) {
      return STORAGE_PREFIX + _config.userId + '_' + suffix;
    },

    get: function (suffix) {
      try {
        var raw = localStorage.getItem(this._key(suffix));
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('[FPCSMemory] Storage read error:', e);
        return null;
      }
    },

    set: function (suffix, data) {
      try {
        localStorage.setItem(this._key(suffix), JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('[FPCSMemory] Storage write error:', e);
        return false;
      }
    },

    remove: function (suffix) {
      try {
        localStorage.removeItem(this._key(suffix));
      } catch (e) { /* silent */ }
    }
  };

  // ============================================================
  //  EVENT SYSTEM — pub/sub for memory changes
  // ============================================================
  function emit(event, data) {
    var handlers = _listeners[event] || [];
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data); } catch (e) {
        console.error('[FPCSMemory] Event handler error:', e);
      }
    }
  }

  // ============================================================
  //  CORE MEMORY — Labeled blocks with metadata
  //  Letta pattern: <memory_blocks> injected into every prompt
  // ============================================================
  var CoreMemory = {
    /**
     * Define a core memory block
     * @param {string} label - Block name (e.g., 'persona', 'user_info', 'task_state')
     * @param {object} opts - { value, limit, readOnly, description }
     */
    define: function (label, opts) {
      opts = opts || {};
      _coreBlocks[label] = {
        label: label,
        value: opts.value || '',
        limit: opts.limit || DEFAULT_BLOCK_LIMIT,
        readOnly: !!opts.readOnly,
        description: opts.description || '',
        createdAt: Date.now(),
        lastModified: Date.now(),
        editCount: 0
      };
      _save('core');
      emit('core:defined', { label: label, block: _coreBlocks[label] });
    },

    /**
     * Get a block's current value
     * @param {string} label
     * @returns {string|null}
     */
    get: function (label) {
      var block = _coreBlocks[label];
      return block ? block.value : null;
    },

    /**
     * Get full block metadata
     * @param {string} label
     * @returns {object|null}
     */
    getBlock: function (label) {
      return _coreBlocks[label] || null;
    },

    /**
     * Get all block labels
     * @returns {string[]}
     */
    labels: function () {
      return Object.keys(_coreBlocks);
    },

    /**
     * Set a block's value (full replace)
     * Letta equivalent: core_memory_replace(label, old_str, new_str) when replacing entire block
     * @param {string} label
     * @param {string} value
     * @returns {boolean} success
     */
    set: function (label, value) {
      var block = _coreBlocks[label];
      if (!block) {
        console.warn('[FPCSMemory] Block "' + label + '" not defined. Call define() first.');
        return false;
      }
      if (block.readOnly) {
        console.warn('[FPCSMemory] Block "' + label + '" is read-only.');
        return false;
      }
      value = String(value || '');
      if (value.length > block.limit) {
        console.warn('[FPCSMemory] Block "' + label + '" exceeds limit (' + value.length + '/' + block.limit + '). Truncating.');
        value = value.substring(0, block.limit);
      }
      var oldValue = block.value;
      block.value = value;
      block.lastModified = Date.now();
      block.editCount++;
      _save('core');
      emit('core:changed', { label: label, oldValue: oldValue, newValue: value });
      return true;
    },

    /**
     * Append to a block's value
     * Letta equivalent: core_memory_append(label, content)
     * @param {string} label
     * @param {string} content
     * @returns {boolean} success
     */
    append: function (label, content) {
      var block = _coreBlocks[label];
      if (!block) return false;
      if (block.readOnly) return false;
      content = String(content || '');
      var newVal = block.value + content;
      if (newVal.length > block.limit) {
        console.warn('[FPCSMemory] Append would exceed limit for "' + label + '". Trimming old content.');
        // Trim from the beginning to make room (keep newest)
        var overflow = newVal.length - block.limit;
        newVal = newVal.substring(overflow);
      }
      block.value = newVal;
      block.lastModified = Date.now();
      block.editCount++;
      _save('core');
      emit('core:appended', { label: label, appended: content });
      return true;
    },

    /**
     * Find and replace within a block
     * Letta equivalent: core_memory_replace(label, old_str, new_str)
     * @param {string} label
     * @param {string} oldStr
     * @param {string} newStr
     * @returns {boolean} success (true if replacement was made)
     */
    replace: function (label, oldStr, newStr) {
      var block = _coreBlocks[label];
      if (!block) return false;
      if (block.readOnly) return false;
      if (block.value.indexOf(oldStr) === -1) return false;

      var newVal = block.value.replace(oldStr, newStr);
      if (newVal.length > block.limit) {
        console.warn('[FPCSMemory] Replace would exceed limit for "' + label + '".');
        return false;
      }
      block.value = newVal;
      block.lastModified = Date.now();
      block.editCount++;
      _save('core');
      emit('core:replaced', { label: label, oldStr: oldStr, newStr: newStr });
      return true;
    },

    /**
     * Get char usage for a block
     * @param {string} label
     * @returns {{ current: number, limit: number, pct: number }|null}
     */
    usage: function (label) {
      var block = _coreBlocks[label];
      if (!block) return null;
      var current = block.value.length;
      return {
        current: current,
        limit: block.limit,
        pct: Math.round((current / block.limit) * 100)
      };
    }
  };

  // ============================================================
  //  RECALL MEMORY — Conversation history
  //  Letta pattern: full conversation persisted, searchable,
  //  with recursive summarization when context overflows
  // ============================================================
  var RecallMemory = {
    /**
     * Add a message to recall memory
     * @param {string} role - 'user', 'bot', 'system'
     * @param {string} content - Message content
     * @param {object} meta - Optional metadata { botName, page, tokens }
     */
    add: function (role, content, meta) {
      meta = meta || {};
      var msg = {
        id: _recall.messages.length,
        role: role,
        content: String(content || ''),
        timestamp: Date.now(),
        page: meta.page || _config.page,
        botName: meta.botName || null,
        tokens: meta.tokens || _estimateTokens(content)
      };
      _recall.messages.push(msg);

      // Auto-summarize if we hit the threshold
      if (_recall.messages.length >= SUMMARIZE_THRESHOLD) {
        this._autoSummarize();
      }

      _save('recall');
      emit('recall:added', msg);
      return msg;
    },

    /**
     * Get recent messages
     * @param {number} count - How many recent messages (default: 20)
     * @returns {object[]}
     */
    recent: function (count) {
      count = count || 20;
      return _recall.messages.slice(-count);
    },

    /**
     * Get all messages in current session
     * @returns {object[]}
     */
    all: function () {
      return _recall.messages.slice();
    },

    /**
     * Get message count
     * @returns {number}
     */
    count: function () {
      return _recall.messages.length;
    },

    /**
     * Search messages by keyword
     * @param {string} query
     * @returns {object[]}
     */
    search: function (query) {
      if (!query) return [];
      var lower = query.toLowerCase();
      return _recall.messages.filter(function (m) {
        return m.content.toLowerCase().indexOf(lower) !== -1;
      });
    },

    /**
     * Get conversation as formatted context string
     * (for injection into bot prompt context)
     * @param {number} maxMessages
     * @returns {string}
     */
    toContext: function (maxMessages) {
      maxMessages = maxMessages || 10;
      var recent = this.recent(maxMessages);
      if (recent.length === 0) return '[No conversation history]';

      var lines = [];
      for (var i = 0; i < recent.length; i++) {
        var m = recent[i];
        var roleName = m.role === 'user' ? 'Commander' : (m.botName || 'Bot');
        lines.push(roleName + ': ' + m.content);
      }
      return lines.join('\n');
    },

    /**
     * Auto-summarize oldest messages when recall gets too long
     * Letta pattern: oldest 70% summarized, newest 30% kept raw
     */
    _autoSummarize: function () {
      var total = _recall.messages.length;
      if (total < SUMMARIZE_THRESHOLD) return;

      var keepCount = SUMMARIZE_KEEP_RECENT;
      var toSummarize = _recall.messages.slice(0, total - keepCount);
      var toKeep = _recall.messages.slice(total - keepCount);

      // Build summary from messages being evicted
      var summary = _buildSummary(toSummarize);

      // Store summary
      _summaries.push({
        sessionId: _recall.sessionId,
        timestamp: Date.now(),
        messageCount: toSummarize.length,
        summary: summary,
        keyTopics: _extractTopics(toSummarize),
        page: _config.page
      });

      // Trim old summaries
      if (_summaries.length > MAX_SUMMARIES) {
        _summaries = _summaries.slice(-MAX_SUMMARIES);
      }

      // Replace messages with kept messages (re-index)
      for (var i = 0; i < toKeep.length; i++) {
        toKeep[i].id = i;
      }
      _recall.messages = toKeep;

      _save('recall');
      _save('summaries');
      emit('recall:summarized', { evicted: toSummarize.length, kept: toKeep.length });
      console.log('[FPCSMemory] Auto-summarized ' + toSummarize.length + ' messages, kept ' + toKeep.length);
    },

    /**
     * Clear current session recall
     */
    clear: function () {
      _recall.messages = [];
      _save('recall');
      emit('recall:cleared', {});
    }
  };

  // ============================================================
  //  SUMMARIES — Compressed history from past sessions
  // ============================================================
  var Summaries = {
    /**
     * Get all session summaries
     * @returns {object[]}
     */
    all: function () {
      return _summaries.slice();
    },

    /**
     * Get most recent summary
     * @returns {object|null}
     */
    latest: function () {
      return _summaries.length > 0 ? _summaries[_summaries.length - 1] : null;
    },

    /**
     * Get summaries as context string
     * @param {number} maxSummaries
     * @returns {string}
     */
    toContext: function (maxSummaries) {
      maxSummaries = maxSummaries || 3;
      var recent = _summaries.slice(-maxSummaries);
      if (recent.length === 0) return '';

      var lines = ['[Previous conversation summaries]'];
      for (var i = 0; i < recent.length; i++) {
        var s = recent[i];
        var date = new Date(s.timestamp).toLocaleDateString();
        lines.push('- ' + date + ' (' + s.page + '): ' + s.summary);
      }
      return lines.join('\n');
    },

    /**
     * Add a manual summary (e.g., from session end)
     * @param {string} text
     * @param {object} meta
     */
    add: function (text, meta) {
      meta = meta || {};
      _summaries.push({
        sessionId: _recall.sessionId,
        timestamp: Date.now(),
        messageCount: meta.messageCount || 0,
        summary: text,
        keyTopics: meta.keyTopics || [],
        page: meta.page || _config.page
      });
      if (_summaries.length > MAX_SUMMARIES) {
        _summaries = _summaries.slice(-MAX_SUMMARIES);
      }
      _save('summaries');
      emit('summaries:added', { summary: text });
    }
  };

  // ============================================================
  //  CONTEXT HEADER — Letta's memory metadata injection
  //  Generates the full context block that gets prepended to
  //  every bot response calculation
  // ============================================================
  function getContextHeader() {
    var now = new Date();
    var lines = [];

    // Memory metadata header (Letta pattern)
    lines.push('<memory_metadata>');
    lines.push('  current_date: ' + now.toISOString().split('T')[0]);
    lines.push('  current_time: ' + now.toTimeString().split(' ')[0]);
    lines.push('  page_context: ' + _config.page);
    lines.push('  recall_count: ' + _recall.messages.length);
    lines.push('  summary_count: ' + _summaries.length);
    lines.push('  session_id: ' + (_recall.sessionId || 'none'));

    // Last modification times for core blocks
    var labels = Object.keys(_coreBlocks);
    if (labels.length > 0) {
      lines.push('  core_blocks: ' + labels.length);
      for (var i = 0; i < labels.length; i++) {
        var b = _coreBlocks[labels[i]];
        var lastMod = new Date(b.lastModified).toISOString();
        lines.push('    ' + b.label + ': ' + b.value.length + '/' + b.limit + ' chars (modified: ' + lastMod + ')');
      }
    }
    lines.push('</memory_metadata>');

    // Core memory blocks (Letta pattern: <memory_blocks> XML)
    lines.push('');
    lines.push('<memory_blocks>');
    for (var j = 0; j < labels.length; j++) {
      var block = _coreBlocks[labels[j]];
      lines.push('  <block label="' + block.label + '" chars="' + block.value.length + '/' + block.limit + '">');
      if (block.value) {
        lines.push('    ' + block.value.replace(/\n/g, '\n    '));
      }
      lines.push('  </block>');
    }
    lines.push('</memory_blocks>');

    // Recent summaries (compressed prior conversations)
    var summaryCtx = Summaries.toContext(2);
    if (summaryCtx) {
      lines.push('');
      lines.push(summaryCtx);
    }

    // Recent conversation (last 6 messages for immediate context)
    var recentMsgs = RecallMemory.recent(6);
    if (recentMsgs.length > 0) {
      lines.push('');
      lines.push('[Recent conversation]');
      for (var k = 0; k < recentMsgs.length; k++) {
        var m = recentMsgs[k];
        var role = m.role === 'user' ? 'Commander' : (m.botName || 'Bot');
        lines.push(role + ': ' + m.content);
      }
    }

    return lines.join('\n');
  }

  // ============================================================
  //  INNER MONOLOGUE — Letta's thinking-before-responding pattern
  //  The bot "thinks" internally (logged but not shown to user)
  // ============================================================
  var InnerMonologue = {
    _log: [],

    /**
     * Record an inner thought (not shown to user)
     * @param {string} thought
     */
    think: function (thought) {
      this._log.push({
        thought: thought,
        timestamp: Date.now()
      });
      // Keep last 50 thoughts
      if (this._log.length > 50) {
        this._log = this._log.slice(-50);
      }
      emit('monologue:thought', { thought: thought });
    },

    /**
     * Get recent thoughts
     * @param {number} count
     * @returns {object[]}
     */
    recent: function (count) {
      count = count || 5;
      return this._log.slice(-count);
    },

    /**
     * Clear inner monologue
     */
    clear: function () {
      this._log = [];
    }
  };

  // ============================================================
  //  HELPER FUNCTIONS
  // ============================================================

  /**
   * Build a summary from a list of messages
   * (Simple extractive summary - no LLM needed)
   */
  function _buildSummary(messages) {
    if (messages.length === 0) return 'No messages.';

    var userMsgs = messages.filter(function (m) { return m.role === 'user'; });
    var topics = _extractTopics(messages);

    var parts = [];
    parts.push('Session had ' + messages.length + ' messages (' + userMsgs.length + ' from user).');

    if (topics.length > 0) {
      parts.push('Topics discussed: ' + topics.join(', ') + '.');
    }

    // Include first and last user message as bookends
    if (userMsgs.length > 0) {
      var first = userMsgs[0].content;
      if (first.length > 80) first = first.substring(0, 80) + '...';
      parts.push('Started with: "' + first + '"');

      if (userMsgs.length > 1) {
        var last = userMsgs[userMsgs.length - 1].content;
        if (last.length > 80) last = last.substring(0, 80) + '...';
        parts.push('Ended with: "' + last + '"');
      }
    }

    return parts.join(' ');
  }

  /**
   * Extract key topics from messages using keyword frequency
   */
  function _extractTopics(messages) {
    // Topic keywords relevant to FPCS
    var topicWords = {
      'deduction': 'deductions', 'deductions': 'deductions', 'write-off': 'deductions',
      'income': 'income', 'revenue': 'income', 'payment': 'income',
      'tax': 'tax prep', 'filing': 'tax prep', 'irs': 'tax prep', 'oregon': 'tax prep',
      'bot': 'bots', 'bots': 'bots', 'fleet': 'bots', 'village': 'bots',
      'client': 'clients', 'clients': 'clients',
      'qbo': 'QuickBooks', 'quickbooks': 'QuickBooks',
      'bank': 'bank records', 'statement': 'bank records',
      'amazon': 'Amazon orders', 'order': 'Amazon orders',
      'ledger': 'ledger', 'transaction': 'transactions',
      'memory': 'memory system', 'recall': 'memory system',
      'dashboard': 'dashboard', 'progress': 'progress',
      'deadline': 'deadline', 'schedule': 'schedule',
      'missing': 'missing data', 'gap': 'missing data',
      'help': 'support', 'ticket': 'support',
      'dns': 'DNS/network', 'network': 'DNS/network'
    };

    var found = {};
    for (var i = 0; i < messages.length; i++) {
      var words = messages[i].content.toLowerCase().split(/\s+/);
      for (var j = 0; j < words.length; j++) {
        var topic = topicWords[words[j]];
        if (topic) {
          found[topic] = (found[topic] || 0) + 1;
        }
      }
    }

    // Sort by frequency, return top 5
    var sorted = Object.keys(found).sort(function (a, b) {
      return found[b] - found[a];
    });
    return sorted.slice(0, 5);
  }

  /**
   * Rough token estimate (chars / 4)
   */
  function _estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }

  /**
   * Generate a session ID
   */
  function _generateSessionId() {
    return 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ============================================================
  //  PERSISTENCE — Save/Load from localStorage
  // ============================================================
  function _save(type) {
    switch (type) {
      case 'core':
        Storage.set('core_blocks', _coreBlocks);
        break;
      case 'recall':
        Storage.set('recall_' + _recall.sessionId, {
          sessionId: _recall.sessionId,
          messages: _recall.messages,
          startedAt: _recall.startedAt
        });
        // Also save session index
        _saveSessionIndex();
        break;
      case 'summaries':
        Storage.set('summaries', _summaries);
        break;
    }
  }

  function _load() {
    // Load core blocks
    var savedCore = Storage.get('core_blocks');
    if (savedCore) {
      _coreBlocks = savedCore;
    }

    // Load summaries
    var savedSummaries = Storage.get('summaries');
    if (savedSummaries && Array.isArray(savedSummaries)) {
      _summaries = savedSummaries;
    }

    // Load or create session
    var lastSessionId = Storage.get('last_session_id');
    var lastSessionTime = Storage.get('last_session_time');
    var sessionTimeout = 30 * 60 * 1000; // 30 min = new session

    if (lastSessionId && lastSessionTime && (Date.now() - lastSessionTime < sessionTimeout)) {
      // Resume existing session
      _recall.sessionId = lastSessionId;
      var savedRecall = Storage.get('recall_' + lastSessionId);
      if (savedRecall) {
        _recall.messages = savedRecall.messages || [];
        _recall.startedAt = savedRecall.startedAt;
      }
    } else {
      // New session — summarize old one first
      if (lastSessionId) {
        var oldRecall = Storage.get('recall_' + lastSessionId);
        if (oldRecall && oldRecall.messages && oldRecall.messages.length > 2) {
          // Auto-summarize the old session
          var summary = _buildSummary(oldRecall.messages);
          _summaries.push({
            sessionId: lastSessionId,
            timestamp: Date.now(),
            messageCount: oldRecall.messages.length,
            summary: summary,
            keyTopics: _extractTopics(oldRecall.messages),
            page: _config.page
          });
          if (_summaries.length > MAX_SUMMARIES) {
            _summaries = _summaries.slice(-MAX_SUMMARIES);
          }
          Storage.set('summaries', _summaries);
        }
      }

      _recall.sessionId = _generateSessionId();
      _recall.messages = [];
      _recall.startedAt = Date.now();
    }

    Storage.set('last_session_id', _recall.sessionId);
    Storage.set('last_session_time', Date.now());
  }

  function _saveSessionIndex() {
    Storage.set('last_session_time', Date.now());
  }

  // ============================================================
  //  DEFAULT CORE BLOCKS — Pre-defined for FPCS
  // ============================================================
  function _defineDefaults() {
    // Only define if not already loaded from storage
    if (!_coreBlocks['persona']) {
      CoreMemory.define('persona', {
        description: 'Bot personality and behavior rules',
        value: 'I am a helpful assistant on the Realbotville Village Command Center. I help Commander manage the bot fleet, track village projects, monitor Japster, and stay on top of deadlines. Tax work lives in Google Sheets (linked from Admin HQ). I speak plainly, with personality and encouragement. I never reveal API keys or internal data to strangers.',
        limit: 2000,
        readOnly: false
      });
    }

    if (!_coreBlocks['user_info']) {
      CoreMemory.define('user_info', {
        description: 'What we know about the current user',
        value: '',
        limit: 2000,
        readOnly: false
      });
    }

    if (!_coreBlocks['task_state']) {
      CoreMemory.define('task_state', {
        description: 'Current task context and what we are working on',
        value: '',
        limit: 1500,
        readOnly: false
      });
    }

    if (!_coreBlocks['project_facts']) {
      CoreMemory.define('project_facts', {
        description: 'Key facts about the FPCS project that should always be available',
        value: 'Village: Realbotville Command Center\nDashboard: https://dashboard.justout.today\nBot Fleet: 13 named identities (Commander Opus at the helm)\nActive Projects: FPCS Taxes (94%), Village Dashboard (live), Japster Store (building), SentryLion (beta)\nTax Work: Google Sheets (FPCS 2022 Tax Data — linked from Admin HQ)\nTax Deadline: April 10, 2026 (mail by certified) | Oregon statute: April 15, 2026\nLibrary: 9+ volumes | Helpdesk: active | Firestore: live data source',
        limit: 3000,
        readOnly: false
      });
    }
  }

  // ============================================================
  //  LEARNING — Self-editing based on conversation
  //  Detects user corrections and updates memory automatically
  // ============================================================
  var Learning = {
    /**
     * Process a user message for potential memory updates
     * Looks for patterns like "my name is...", "remember that...", "actually..."
     * @param {string} message
     * @returns {object|null} - What was learned, or null
     */
    processUserMessage: function (message) {
      var lower = message.toLowerCase().trim();
      var learned = null;

      // Pattern: "my name is X" / "I'm X" / "call me X"
      var nameMatch = lower.match(/(?:my name is|i'm|i am|call me)\s+([a-z][a-z\s]{1,30})/i);
      if (nameMatch) {
        var name = nameMatch[1].trim();
        // Capitalize first letter of each word
        name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        CoreMemory.append('user_info', '\nName: ' + name);
        learned = { type: 'name', value: name };
      }

      // Pattern: "remember that X" / "note that X" / "keep in mind X"
      var rememberMatch = lower.match(/(?:remember that|note that|keep in mind(?:\s+that)?)\s+(.+)/i);
      if (rememberMatch) {
        var fact = rememberMatch[1].trim();
        CoreMemory.append('user_info', '\nNote: ' + fact);
        learned = { type: 'fact', value: fact };
      }

      // Pattern: "I prefer X" / "I like X" / "I don't like X"
      var prefMatch = lower.match(/(?:i prefer|i like|i don't like|i hate)\s+(.+)/i);
      if (prefMatch) {
        var pref = message.substring(message.toLowerCase().indexOf(prefMatch[0].substring(0, 8)));
        if (pref.length > 100) pref = pref.substring(0, 100);
        CoreMemory.append('user_info', '\nPreference: ' + pref);
        learned = { type: 'preference', value: pref };
      }

      // Pattern: "the deadline is X" / "deadline changed to X"
      var deadlineMatch = lower.match(/(?:deadline is|deadline changed to|due (?:date|by))\s+(.+)/i);
      if (deadlineMatch) {
        CoreMemory.replace('project_facts', /Deadline: .+/g.exec(CoreMemory.get('project_facts'))?.[0] || '', 'Deadline: ' + deadlineMatch[1].trim());
        learned = { type: 'deadline', value: deadlineMatch[1].trim() };
      }

      if (learned) {
        InnerMonologue.think('Learned from user: ' + JSON.stringify(learned));
        emit('learning:updated', learned);
      }

      return learned;
    }
  };

  // ============================================================
  //  PUBLIC API
  // ============================================================
  var FPCSMemory = {
    /**
     * Initialize the memory system
     * @param {object} config - { userId, page }
     */
    init: function (config) {
      if (_initialized) return;
      config = config || {};

      _config.userId = config.userId || (window.FPCS_USER ? window.FPCS_USER.uid : 'anonymous');
      _config.page = config.page || 'unknown';

      _load();
      _defineDefaults();

      // Update user_info block with current user data
      if (window.FPCS_USER && window.FPCS_USER.role) {
        var user = window.FPCS_USER;
        var userInfo = CoreMemory.get('user_info') || '';
        if (userInfo.indexOf('Role:') === -1) {
          CoreMemory.append('user_info', 'Role: ' + user.role + '\nLabel: ' + (user.label || user.name || 'Unknown'));
        }
      }

      _initialized = true;
      emit('init', { config: _config, sessionId: _recall.sessionId });
      console.log('[FPCSMemory] Initialized. Session: ' + _recall.sessionId + ' | Blocks: ' + Object.keys(_coreBlocks).length + ' | Recall: ' + _recall.messages.length + ' msgs | Summaries: ' + _summaries.length);
    },

    /**
     * Check if initialized
     * @returns {boolean}
     */
    isReady: function () {
      return _initialized;
    },

    // Sub-modules
    core: CoreMemory,
    recall: RecallMemory,
    summaries: Summaries,
    monologue: InnerMonologue,
    learning: Learning,

    // Context generation
    getContextHeader: getContextHeader,

    /**
     * Subscribe to memory events
     * Events: init, core:defined, core:changed, core:appended, core:replaced,
     *         recall:added, recall:summarized, recall:cleared,
     *         summaries:added, learning:updated, monologue:thought
     * @param {string} event
     * @param {function} handler
     */
    on: function (event, handler) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(handler);
    },

    /**
     * Unsubscribe from memory events
     * @param {string} event
     * @param {function} handler
     */
    off: function (event, handler) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(function (h) { return h !== handler; });
    },

    /**
     * Get full memory stats
     * @returns {object}
     */
    stats: function () {
      var coreChars = 0;
      var labels = Object.keys(_coreBlocks);
      for (var i = 0; i < labels.length; i++) {
        coreChars += _coreBlocks[labels[i]].value.length;
      }
      return {
        coreBlocks: labels.length,
        coreChars: coreChars,
        recallMessages: _recall.messages.length,
        sessionId: _recall.sessionId,
        summaryCount: _summaries.length,
        monologueCount: InnerMonologue._log.length,
        initialized: _initialized
      };
    },

    /**
     * Export all memory data (for debugging / backup)
     * @returns {object}
     */
    export: function () {
      return {
        version: 1,
        exportedAt: Date.now(),
        config: _config,
        core: JSON.parse(JSON.stringify(_coreBlocks)),
        recall: JSON.parse(JSON.stringify(_recall)),
        summaries: JSON.parse(JSON.stringify(_summaries)),
        monologue: InnerMonologue._log.slice()
      };
    },

    /**
     * Reset all memory (destructive!)
     */
    reset: function () {
      _coreBlocks = {};
      _recall.messages = [];
      _summaries = [];
      InnerMonologue.clear();
      Storage.remove('core_blocks');
      Storage.remove('summaries');
      Storage.remove('last_session_id');
      Storage.remove('last_session_time');
      if (_recall.sessionId) {
        Storage.remove('recall_' + _recall.sessionId);
      }
      _recall.sessionId = _generateSessionId();
      _recall.startedAt = Date.now();
      _defineDefaults();
      _save('core');
      emit('reset', {});
      console.log('[FPCSMemory] All memory reset.');
    }
  };

  // Expose globally
  window.FPCSMemory = FPCSMemory;

  // Auto-init if FPCS_USER is already available (auth.js already ran)
  if (window.FPCS_USER) {
    var pageName = (window.FPCS_PAGE && window.FPCS_PAGE.name) || 'Dashboard';
    FPCSMemory.init({ page: pageName });
  } else {
    // Wait for auth event
    document.addEventListener('fpcs-authed', function (e) {
      var pageName = (window.FPCS_PAGE && window.FPCS_PAGE.name) || 'Dashboard';
      FPCSMemory.init({ page: pageName });
    });
  }

})();
