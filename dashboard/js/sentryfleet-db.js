/* ============================================================
   SentryFleet Data Layer — Firebase backend for SentryLion Fleet Console
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   PURPOSE: Real-time agent monitoring, command dispatch, log retrieval,
   probation management, and threat detection tracking via Firebase
   Realtime Database (presence) + Firestore (persistence).

   PREREQUISITES:
   - Firebase compat SDK loaded (firebase-app + firebase-auth + firebase-database + firebase-firestore)
   - Firebase app initialized by auth.js (includes databaseURL)
   - 'fpcs-authed' CustomEvent from auth.js

   USAGE:
     SentryFleet.subscribeToAgents(callback)
     SentryFleet.sendCommand(agentId, type, payload)
     SentryFleet.getAgentLogs(agentId, opts)
     SentryFleet.getAgentIPJail(agentId)
     SentryFleet.startProbation(agentId)
     SentryFleet.getHardeningReport(agentId)
     SentryFleet.getThreatDetections(agentId, opts)
     SentryFleet.getCommandHistory(agentId)
     SentryFleet.on(event, callback)
   ============================================================ */
(function () {
  'use strict';

  // ============================================================
  //  CONSTANTS
  // ============================================================

  var RTDB_AGENTS_PATH = 'sentryfleet/agents';
  var RTDB_COMMANDS_PATH = 'sentryfleet-commands';
  var FS_LOGS = 'sentryfleet-logs';
  var FS_IPJAIL = 'sentryfleet-ipjail';
  var FS_PROBATION = 'sentryfleet-probation';
  var FS_THREATS = 'sentryfleet-threats';
  var FS_HARDENING = 'sentryfleet-hardening';
  var FS_CONFIG = 'sentryfleet-config';

  var HEARTBEAT_TIMEOUT_MS = 30000; // 30s — consider agent offline
  var PROBATION_DURATION_MS = 180000; // 3 minutes
  var PROBATION_STAGES = 6;
  var PROBATION_STAGE_MS = PROBATION_DURATION_MS / PROBATION_STAGES; // 30s each

  var LOG_QUERY_LIMIT = 200;
  var COMMAND_EXPIRE_MS = 5 * 60 * 1000; // 5 minute command expiry

  // ============================================================
  //  INTERNAL STATE
  // ============================================================

  var _rtdb = null;         // Firebase Realtime Database instance
  var _fs = null;           // Firestore instance
  var _initialized = false;
  var _listeners = {};      // event system: { eventName: [callbacks] }
  var _agentRef = null;     // RTDB reference for agents
  var _unsubAgents = null;  // Unsubscribe function for agent listener
  var _agents = {};         // Cached agent data: { agentId: data }
  var _probationTimers = {}; // Active probation interval timers

  // ============================================================
  //  LOGGING
  // ============================================================

  function log(msg, data) {
    if (data !== undefined) console.log('[SentryFleet] ' + msg, data);
    else console.log('[SentryFleet] ' + msg);
  }

  function warn(msg, data) {
    if (data !== undefined) console.warn('[SentryFleet] ' + msg, data);
    else console.warn('[SentryFleet] ' + msg);
  }

  function logError(msg, err) {
    console.error('[SentryFleet] ' + msg, err || '');
  }

  // ============================================================
  //  EVENT SYSTEM
  // ============================================================

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(function (cb) { return cb !== callback; });
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(function (cb) {
      try { cb(data); } catch (e) { logError('Event handler error (' + event + ')', e); }
    });
  }

  // ============================================================
  //  INITIALIZATION
  // ============================================================

  function init() {
    if (_initialized) return;

    try {
      var app = firebase.app();
      _rtdb = firebase.database();
      _fs = firebase.firestore();
      _agentRef = _rtdb.ref(RTDB_AGENTS_PATH);
      _initialized = true;
      log('Initialized — RTDB + Firestore ready');
      emit('ready');
    } catch (e) {
      logError('Init failed — ensure firebase-database and firebase-firestore are loaded', e);
    }
  }

  // ============================================================
  //  AGENT PRESENCE (Realtime Database)
  // ============================================================

  /**
   * Subscribe to live agent updates. Callback receives full agents object
   * every time any agent's data changes.
   */
  function subscribeToAgents(callback) {
    if (!_initialized) { warn('Not initialized'); return null; }

    // Remove any existing listener to prevent duplicate subscriptions
    _agentRef.off('value');

    _agentRef.on('value', function (snapshot) {
      _agents = snapshot.val() || {};

      // Enrich with computed fields
      var now = Date.now();
      Object.keys(_agents).forEach(function (id) {
        var a = _agents[id];
        // Compute online status from heartbeat
        if (a.status !== 'jailed' && a.status !== 'probation' && a.status !== 'cleaning') {
          a._computed_online = (now - (a.lastHeartbeat || 0)) < HEARTBEAT_TIMEOUT_MS;
          if (!a._computed_online && a.status === 'online') {
            a._display_status = 'offline';
          } else {
            a._display_status = a.status || 'unknown';
          }
        } else {
          a._computed_online = (now - (a.lastHeartbeat || 0)) < HEARTBEAT_TIMEOUT_MS;
          a._display_status = a.status;
        }
        // Heartbeat age
        a._heartbeat_age = a.lastHeartbeat ? now - a.lastHeartbeat : Infinity;
        a._id = id;
      });

      if (callback) callback(_agents);
      emit('agents-updated', _agents);
    });

    return function unsubscribe() {
      _agentRef.off('value');
    };
  }

  /**
   * Get current cached agents (synchronous).
   */
  function getAgents() {
    return _agents;
  }

  /**
   * Get single agent by ID.
   */
  function getAgent(agentId) {
    return _agents[agentId] || null;
  }

  // ============================================================
  //  COMMANDS (Firestore)
  // ============================================================

  /**
   * Send a command to an agent via RTDB. Returns the command ID.
   * Commands are signed with a nonce and expiry for security.
   * Field names aligned with agent's RemoteCommand struct (Rust).
   */
  function sendCommand(agentId, type, payload) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));

    var commandId = generateId();
    var nonce = generateId();
    var now = Date.now();

    // Field names match agent's RTDB poll: target, command, args, status,
    // issued_at, expiry, nonce, signature, issuedBy
    var command = {
      target: agentId,
      command: type,
      args: payload || {},
      status: 'pending',
      issued_at: now,
      expiry: now + COMMAND_EXPIRE_MS,
      nonce: nonce,
      signature: '',  // TODO: Phase 8 — Ed25519 signing
      issuedBy: window.FPCS_USER ? window.FPCS_USER.email : 'unknown'
    };

    log('Sending command: ' + type + ' to ' + agentId);

    return _rtdb.ref(RTDB_COMMANDS_PATH + '/' + commandId).set(command)
      .then(function () {
        emit('command-sent', { agentId: agentId, type: type, commandId: commandId });
        return commandId;
      })
      .catch(function (err) {
        logError('Failed to send command', err);
        throw err;
      });
  }

  /**
   * Get command history for an agent from RTDB.
   */
  function getCommandHistory(agentId, limit) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));

    return _rtdb.ref(RTDB_COMMANDS_PATH)
      .orderByChild('target')
      .equalTo(agentId)
      .limitToLast(limit || 50)
      .once('value')
      .then(function (snapshot) {
        var commands = [];
        snapshot.forEach(function (child) {
          var d = child.val();
          d._id = child.key;
          commands.push(d);
        });
        // Sort by issued_at descending (newest first)
        commands.sort(function (a, b) { return (b.issued_at || 0) - (a.issued_at || 0); });
        return commands;
      });
  }

  /**
   * Listen for command status updates for an agent via RTDB.
   */
  function subscribeToCommands(agentId, callback) {
    if (!_initialized) return null;

    var ref = _rtdb.ref(RTDB_COMMANDS_PATH)
      .orderByChild('target')
      .equalTo(agentId);

    ref.on('value', function (snapshot) {
      var commands = [];
      snapshot.forEach(function (child) {
        var d = child.val();
        d._id = child.key;
        if (d.status === 'pending' || d.status === 'executing') {
          commands.push(d);
        }
      });
      if (callback) callback(commands);
    });

    return function unsubscribe() {
      ref.off('value');
    };
  }

  // ============================================================
  //  LOGS (Firestore)
  // ============================================================

  /**
   * Get log entries for an agent. Supports pagination via startAfter.
   */
  function getAgentLogs(agentId, opts) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));
    opts = opts || {};

    var query = _fs.collection(FS_LOGS).doc(agentId).collection('entries')
      .orderBy('timestamp', 'desc')
      .limit(opts.limit || LOG_QUERY_LIMIT);

    if (opts.startAfter) {
      query = query.startAfter(opts.startAfter);
    }
    if (opts.tag) {
      query = query.where('tag', '==', opts.tag);
    }

    return query.get().then(function (snap) {
      var entries = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        d._id = doc.id;
        d._doc = doc; // for pagination
        entries.push(d);
      });
      return entries;
    });
  }

  /**
   * Subscribe to live log stream for an agent (most recent N entries).
   */
  function subscribeToLogs(agentId, callback, limit) {
    if (!_initialized) return null;

    return _fs.collection(FS_LOGS).doc(agentId).collection('entries')
      .orderBy('timestamp', 'desc')
      .limit(limit || 100)
      .onSnapshot(function (snap) {
        var entries = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          d._id = doc.id;
          entries.push(d);
        });
        if (callback) callback(entries);
      });
  }

  // ============================================================
  //  IP JAIL (Firestore)
  // ============================================================

  function getAgentIPJail(agentId) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));

    return _fs.collection(FS_IPJAIL).doc(agentId).collection('ips').get()
      .then(function (snap) {
        var ips = {};
        snap.forEach(function (doc) {
          ips[doc.id] = doc.data();
        });
        return ips;
      });
  }

  // ============================================================
  //  PROBATION (Firestore + RTDB status)
  // ============================================================

  /**
   * Start probation for a jailed agent after cleanup.
   * Sets status to 'probation' in RTDB, creates probation record in Firestore.
   */
  function startProbation(agentId) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));

    var now = Date.now();
    var probationData = {
      startTime: now,
      endTime: now + PROBATION_DURATION_MS,
      stage: 1,
      violations: [],
      status: 'active'
    };

    // Update RTDB status
    var rtdbUpdate = _rtdb.ref(RTDB_AGENTS_PATH + '/' + agentId + '/status').set('probation');

    // Create Firestore probation record
    var fsUpdate = _fs.collection(FS_PROBATION).doc(agentId).set(probationData);

    // Send probation-start command to agent (agent manages firewall stages)
    var cmdSend = sendCommand(agentId, 'probation-start', {
      duration: PROBATION_DURATION_MS,
      stages: PROBATION_STAGES,
      stageMs: PROBATION_STAGE_MS
    });

    return Promise.all([rtdbUpdate, fsUpdate, cmdSend]).then(function () {
      log('Probation started for ' + agentId);
      emit('probation-started', { agentId: agentId });

      // Start local timer to update stage display
      startProbationTimer(agentId, now);

      return probationData;
    });
  }

  /**
   * Local timer to advance probation stage display on console.
   * Actual firewall changes happen on the agent.
   */
  function startProbationTimer(agentId, startTime) {
    if (_probationTimers[agentId]) clearInterval(_probationTimers[agentId]);

    _probationTimers[agentId] = setInterval(function () {
      var elapsed = Date.now() - startTime;
      var stage = Math.min(Math.floor(elapsed / PROBATION_STAGE_MS) + 1, PROBATION_STAGES);

      if (elapsed >= PROBATION_DURATION_MS) {
        // Probation complete
        clearInterval(_probationTimers[agentId]);
        delete _probationTimers[agentId];
        completeProbation(agentId);
        return;
      }

      // Update Firestore stage
      _fs.collection(FS_PROBATION).doc(agentId).update({ stage: stage })
        .catch(function () { /* ignore update errors */ });

      emit('probation-stage', { agentId: agentId, stage: stage, elapsed: elapsed });
    }, 5000); // Check every 5s
  }

  /**
   * Complete probation — agent is now 'cleaned'.
   */
  function completeProbation(agentId) {
    var rtdbUpdate = _rtdb.ref(RTDB_AGENTS_PATH + '/' + agentId + '/status').set('cleaned');
    var fsUpdate = _fs.collection(FS_PROBATION).doc(agentId).update({ status: 'completed' });
    var cmdSend = sendCommand(agentId, 'probation-complete', {});

    Promise.all([rtdbUpdate, fsUpdate, cmdSend]).then(function () {
      log('Probation completed for ' + agentId + ' — status: cleaned');
      emit('probation-completed', { agentId: agentId });
    });
  }

  /**
   * Violate probation — re-jail the agent.
   */
  function violateProbation(agentId, reason) {
    if (_probationTimers[agentId]) {
      clearInterval(_probationTimers[agentId]);
      delete _probationTimers[agentId];
    }

    var rtdbUpdate = _rtdb.ref(RTDB_AGENTS_PATH + '/' + agentId + '/status').set('jailed');
    var fsUpdate = _fs.collection(FS_PROBATION).doc(agentId).update({
      status: 'violated',
      violations: firebase.firestore.FieldValue.arrayUnion({
        time: Date.now(),
        reason: reason
      })
    });
    var cmdSend = sendCommand(agentId, 'probation-violated', { reason: reason });

    Promise.all([rtdbUpdate, fsUpdate, cmdSend]).then(function () {
      log('Probation VIOLATED for ' + agentId + ': ' + reason);
      emit('probation-violated', { agentId: agentId, reason: reason });
    });
  }

  /**
   * Get probation state for an agent.
   */
  function getProbation(agentId) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));
    return _fs.collection(FS_PROBATION).doc(agentId).get().then(function (doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  // ============================================================
  //  THREAT DETECTIONS (Firestore)
  // ============================================================

  function getThreatDetections(agentId, opts) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));
    opts = opts || {};

    var query = _fs.collection(FS_THREATS).doc(agentId).collection('detections')
      .orderBy('timestamp', 'desc')
      .limit(opts.limit || 50);

    if (opts.layer) {
      query = query.where('layer', '==', opts.layer);
    }

    return query.get().then(function (snap) {
      var detections = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        d._id = doc.id;
        detections.push(d);
      });
      return detections;
    });
  }

  // ============================================================
  //  HARDENING (Firestore)
  // ============================================================

  function getHardeningReport(agentId) {
    if (!_initialized) return Promise.reject(new Error('Not initialized'));
    return _fs.collection(FS_HARDENING).doc(agentId).get().then(function (doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  // ============================================================
  //  AGENT MANAGEMENT
  // ============================================================

  /**
   * Clear all agent data from RTDB (admin only).
   */
  function clearAllAgents() {
    if (!_initialized) return;
    return _rtdb.ref(RTDB_AGENTS_PATH).remove().then(function () {
      log('All agent data cleared');
    });
  }

  // ============================================================
  //  UTILITIES
  // ============================================================

  function generateId() {
    return 'xxxxxxxxxxxx'.replace(/x/g, function () {
      return Math.floor(Math.random() * 16).toString(16);
    }) + '-' + Date.now().toString(36);
  }

  // ============================================================
  //  AUTO-INIT ON AUTH
  // ============================================================

  document.addEventListener('fpcs-authed', function () {
    init();
  });

  // Also try immediate init if auth already happened
  if (window.FPCS_USER) {
    init();
  }

  // ============================================================
  //  PUBLIC API
  // ============================================================

  window.SentryFleet = {
    init: init,
    on: on,
    off: off,

    // Agent presence
    subscribeToAgents: subscribeToAgents,
    getAgents: getAgents,
    getAgent: getAgent,

    // Commands
    sendCommand: sendCommand,
    getCommandHistory: getCommandHistory,
    subscribeToCommands: subscribeToCommands,

    // Logs
    getAgentLogs: getAgentLogs,
    subscribeToLogs: subscribeToLogs,

    // IP Jail
    getAgentIPJail: getAgentIPJail,

    // Probation
    startProbation: startProbation,
    violateProbation: violateProbation,
    completeProbation: completeProbation,
    getProbation: getProbation,

    // Threats
    getThreatDetections: getThreatDetections,

    // Hardening
    getHardeningReport: getHardeningReport,

    // Admin
    clearAllAgents: clearAllAgents,

    // Constants (for UI use)
    PROBATION_DURATION_MS: PROBATION_DURATION_MS,
    PROBATION_STAGES: PROBATION_STAGES,
    PROBATION_STAGE_MS: PROBATION_STAGE_MS,
    HEARTBEAT_TIMEOUT_MS: HEARTBEAT_TIMEOUT_MS
  };

})();
