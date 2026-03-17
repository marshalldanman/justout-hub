/**
 * Exertion Engine — Realbotville Energy & Fatigue System
 *
 * Tracks EP (Exertion Points) per bot. Enforces pacing, rest, zones.
 * Makes bots behave like humans — natural timing, fatigue, recovery.
 *
 * API:
 *   window.EXERTION.exert(botId, action, complexity)
 *   window.EXERTION.rest(botId, minutes)
 *   window.EXERTION.getStatus(botId)
 *   window.EXERTION.getZone(botId)
 *   window.EXERTION.canDo(botId, action, complexity)
 *   window.EXERTION.getDelay(botId)         — human-like delay for current zone
 *   window.EXERTION.forecast(botId, tasks)  — can these tasks fit in remaining EP?
 *   window.EXERTION.report()                — full fleet status
 */

(function() {
  'use strict';

  const EX_CONFIG = {
    storageKey: 'realbotville_exertion',
    baseEP: 100,
    recoveryPerMin: 2,
    deepRestMultiplier: 3,
    deepRestThresholdMin: 10,

    rankMultipliers: {
      'Seedling': 1.0, 'Sprout': 1.1, 'Sapling': 1.25, 'Oak': 1.4,
      'Sentinel': 1.6, 'Elder': 1.8, 'Archon': 2.0, 'Transcendent': 2.5
    },

    complexityMultipliers: {
      'trivial': 0.5, 'simple': 0.75, 'moderate': 1.0, 'complex': 1.5, 'extreme': 2.5
    },

    actionCosts: {
      // Browsing
      'page_load': 2, 'click': 1, 'form_fill': 3, 'scroll': 0.5,
      'screenshot_read': 2, 'captcha_solve': 15, 'login_flow': 8,
      'checkout_flow': 12, 'file_upload': 5, 'multi_tab': 4,
      // Coding
      'read_file': 1, 'edit_small': 3, 'edit_large': 8, 'write_new_file': 10,
      'debug_session': 15, 'refactor': 12, 'test_run': 5, 'git_commit': 2, 'deploy': 8,
      // Research
      'web_search': 3, 'deep_read': 5, 'cross_reference': 8,
      'summarize': 4, 'verify_claim': 6, 'knowledge_graph': 10,
      // Communication
      'short_response': 1, 'detailed_response': 4, 'write_document': 8,
      'write_volume': 25, 'identity_switch': 3, 'swack': 2,
      // System
      'hook': 0.5, 'skill': 2, 'subagent_launch': 5, 'subagent_monitor': 1, 'evolve': 10,
      // General
      'light': 2, 'medium': 6, 'heavy': 12, 'extreme': 20
    },

    zones: [
      { name: 'fresh',     maxPct: 30,  speed: 1.0,  errorMod: 0,    delayRange: [1, 3],   color: '#4ade80', emoji: '💪' },
      { name: 'active',    maxPct: 60,  speed: 0.85, errorMod: 0.05, delayRange: [2, 5],   color: '#22d3ee', emoji: '⚡' },
      { name: 'fatigued',  maxPct: 85,  speed: 0.6,  errorMod: 0.15, delayRange: [4, 10],  color: '#fbbf24', emoji: '😓' },
      { name: 'exhausted', maxPct: 100, speed: 0.3,  errorMod: 0.30, delayRange: [8, 20],  color: '#f87171', emoji: '🛑' }
    ],

    bots: [
      { id: 'commander',        name: 'Commander',  emoji: '🎖️' },
      { id: 'analyst',          name: 'Analyst',    emoji: '📊' },
      { id: 'creative',         name: 'Creative',   emoji: '🎨' },
      { id: 'tax-specialist',   name: 'Tax Spec',   emoji: '💼' },
      { id: 'security-auditor', name: 'SHIELD',     emoji: '🛡️' },
      { id: 'jaz',              name: 'Jaz',        emoji: '💜' },
      { id: 'birdbot',          name: 'BIRDBOT',    emoji: '🦅' }
    ]
  };

  // ===== DATA =====
  function loadState() {
    try {
      const d = JSON.parse(localStorage.getItem(EX_CONFIG.storageKey) || '{}');
      EX_CONFIG.bots.forEach(b => {
        if (!d[b.id]) d[b.id] = {
          ep_spent: 0,
          ep_max: EX_CONFIG.baseEP,
          rank: 'Seedling',
          last_action_time: null,
          last_rest_start: null,
          session_actions: [],
          total_actions: 0,
          total_ep_spent: 0,
          overrides: 0
        };
      });
      return d;
    } catch { return {}; }
  }

  function saveState(state) {
    localStorage.setItem(EX_CONFIG.storageKey, JSON.stringify(state));
  }

  function getBotMaxEP(rank) {
    const mult = EX_CONFIG.rankMultipliers[rank] || 1.0;
    return Math.round(EX_CONFIG.baseEP * mult);
  }

  function getZone(epSpent, epMax) {
    const pct = (epSpent / epMax) * 100;
    for (const z of EX_CONFIG.zones) {
      if (pct <= z.maxPct) return z;
    }
    return EX_CONFIG.zones[EX_CONFIG.zones.length - 1];
  }

  function getActionCost(action, complexity) {
    const base = EX_CONFIG.actionCosts[action] || 5;
    const mult = EX_CONFIG.complexityMultipliers[complexity] || 1.0;
    return Math.round(base * mult * 10) / 10;
  }

  // Gaussian-ish random (Box-Muller, clamped to range)
  function gaussianDelay(min, max) {
    const mean = (min + max) / 2;
    const stddev = (max - min) / 4;
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const val = mean + z * stddev;
    return Math.max(min, Math.min(max, Math.round(val * 100) / 100));
  }

  function applyRecovery(botState) {
    if (!botState.last_action_time) return;
    const elapsed = (Date.now() - botState.last_action_time) / 60000; // minutes
    if (elapsed <= 0) return;

    const isDeepRest = elapsed >= EX_CONFIG.deepRestThresholdMin;
    const rate = isDeepRest
      ? EX_CONFIG.recoveryPerMin * EX_CONFIG.deepRestMultiplier
      : EX_CONFIG.recoveryPerMin;
    const recovered = rate * elapsed;
    botState.ep_spent = Math.max(0, botState.ep_spent - recovered);
  }

  // ===== STYLES =====
  const styles = document.createElement('style');
  styles.textContent = `
    .ex-float {
      position: fixed;
      bottom: 24px;
      right: 222px;
      z-index: 9999;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #334155);
      border: 2px solid #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      user-select: none;
    }
    .ex-float:hover {
      transform: scale(1.1);
      border-color: #4ade80;
      box-shadow: 0 4px 20px rgba(74,222,128,0.3);
    }
    .ex-float.active { border-color: #4ade80; }

    .ex-panel {
      position: fixed;
      bottom: 82px;
      right: 222px;
      z-index: 9998;
      width: 360px;
      max-height: 500px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .ex-panel.open { display: flex; }

    .ex-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #064e3b, #065f46);
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ex-header-title { font-size: 14px; font-weight: 700; color: #d1fae5; }
    .ex-header-sub { font-size: 10px; color: #34d399; }

    .ex-body { overflow-y: auto; padding: 10px; max-height: 370px; }

    .ex-bot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      margin-bottom: 5px;
      border-radius: 8px;
      background: #1e293b;
      transition: all 0.2s;
    }
    .ex-bot:hover { background: #263044; }
    .ex-bot-emoji { font-size: 18px; width: 24px; text-align: center; }
    .ex-bot-info { flex: 1; }
    .ex-bot-name { font-size: 12px; font-weight: 600; color: #e2e8f0; }
    .ex-bot-zone { font-size: 10px; font-weight: 700; }

    .ex-bar {
      height: 6px;
      background: #334155;
      border-radius: 3px;
      margin-top: 3px;
      overflow: hidden;
      position: relative;
    }
    .ex-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }
    .ex-bar-zones {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
    }
    .ex-bar-zone {
      height: 100%;
      opacity: 0.15;
    }

    .ex-bot-stats {
      text-align: right;
      min-width: 55px;
    }
    .ex-bot-ep { font-size: 14px; font-weight: 800; }
    .ex-bot-label { font-size: 8px; color: #64748b; text-transform: uppercase; }

    .ex-footer {
      padding: 8px 14px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ex-footer-tag { font-size: 10px; color: #34d399; font-weight: 600; }
    .ex-footer button {
      background: none;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      cursor: pointer;
    }
    .ex-footer button:hover { border-color: #4ade80; color: #4ade80; }

    @media (max-width: 480px) { .ex-panel { width: calc(100vw - 32px); right: 16px; } }
  `;
  document.head.appendChild(styles);

  // ===== DOM =====
  const floatBtn = document.createElement('div');
  floatBtn.className = 'ex-float';
  floatBtn.innerHTML = '🔋';
  floatBtn.title = 'Exertion Monitor — Bot Energy & Fatigue';
  document.body.appendChild(floatBtn);

  const panel = document.createElement('div');
  panel.className = 'ex-panel';
  panel.innerHTML = `
    <div class="ex-header">
      <span style="font-size:20px">🔋</span>
      <div>
        <div class="ex-header-title">Exertion Monitor</div>
        <div class="ex-header-sub">Bot Energy & Fatigue Tracking</div>
      </div>
    </div>
    <div class="ex-body" id="exBotList"></div>
    <div class="ex-footer">
      <span class="ex-footer-tag">PACE LIKE A HUMAN</span>
      <div style="display:flex;gap:6px">
        <button id="exRestAllBtn" title="Rest all bots">😴 Rest All</button>
        <button id="exResetBtn" title="Full reset">⟳ Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  let isOpen = false;
  floatBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    floatBtn.classList.toggle('active', isOpen);
    if (isOpen) render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      panel.classList.remove('open');
      floatBtn.classList.remove('active');
    }
  });

  // ===== RENDER =====
  function render() {
    const state = loadState();
    const list = document.getElementById('exBotList');

    list.innerHTML = EX_CONFIG.bots.map(bot => {
      const s = state[bot.id];
      if (!s) return '';

      // Apply passive recovery since last action
      applyRecovery(s);
      const maxEP = getBotMaxEP(s.rank);
      s.ep_max = maxEP;
      const remaining = Math.max(0, maxEP - s.ep_spent);
      const zone = getZone(s.ep_spent, maxEP);
      const pct = Math.round((s.ep_spent / maxEP) * 100);
      const remainPct = 100 - pct;

      return `
        <div class="ex-bot">
          <div class="ex-bot-emoji">${bot.emoji}</div>
          <div class="ex-bot-info">
            <div class="ex-bot-name">${bot.name}</div>
            <div class="ex-bot-zone" style="color:${zone.color}">${zone.emoji} ${zone.name.toUpperCase()}</div>
            <div class="ex-bar">
              <div class="ex-bar-fill" style="width:${remainPct}%;background:${zone.color}"></div>
            </div>
          </div>
          <div class="ex-bot-stats">
            <div class="ex-bot-ep" style="color:${zone.color}">${Math.round(remaining)}</div>
            <div class="ex-bot-label">/ ${maxEP} EP</div>
          </div>
        </div>`;
    }).join('');

    saveState(state);
  }

  // ===== BUTTONS =====
  document.getElementById('exRestAllBtn').addEventListener('click', () => {
    const state = loadState();
    EX_CONFIG.bots.forEach(b => {
      if (state[b.id]) {
        state[b.id].ep_spent = 0;
        state[b.id].last_rest_start = Date.now();
      }
    });
    saveState(state);
    render();
  });

  document.getElementById('exResetBtn').addEventListener('click', () => {
    if (confirm('Reset all exertion data?')) {
      localStorage.removeItem(EX_CONFIG.storageKey);
      render();
    }
  });

  // ===== PUBLIC API =====
  window.EXERTION = {
    /**
     * Record exertion for a bot action
     * @param {string} botId - Bot identifier
     * @param {string} action - Action type from actionCosts
     * @param {string} complexity - trivial|simple|moderate|complex|extreme
     * @returns {object} { cost, remaining, zone, blocked }
     */
    exert: function(botId, action, complexity) {
      const state = loadState();
      if (!state[botId]) return { blocked: true, reason: 'unknown_bot' };

      applyRecovery(state[botId]);
      const maxEP = getBotMaxEP(state[botId].rank);
      state[botId].ep_max = maxEP;

      const cost = getActionCost(action || 'medium', complexity || 'moderate');
      const wouldExceed = (state[botId].ep_spent + cost) > maxEP;

      if (wouldExceed) {
        return {
          blocked: true,
          reason: 'exhausted',
          cost: cost,
          remaining: Math.max(0, maxEP - state[botId].ep_spent),
          zone: getZone(state[botId].ep_spent, maxEP).name,
          suggestion: 'Rest or hand off to another bot.'
        };
      }

      state[botId].ep_spent += cost;
      state[botId].last_action_time = Date.now();
      state[botId].total_actions = (state[botId].total_actions || 0) + 1;
      state[botId].total_ep_spent = (state[botId].total_ep_spent || 0) + cost;
      state[botId].session_actions.push({
        action: action,
        complexity: complexity,
        cost: cost,
        time: Date.now()
      });

      saveState(state);
      if (isOpen) render();

      const zone = getZone(state[botId].ep_spent, maxEP);
      return {
        blocked: false,
        cost: cost,
        remaining: Math.round((maxEP - state[botId].ep_spent) * 10) / 10,
        zone: zone.name,
        speed: zone.speed,
        delay: gaussianDelay(zone.delayRange[0], zone.delayRange[1])
      };
    },

    /**
     * Rest a bot (reduce EP spent)
     * @param {string} botId
     * @param {number} minutes - Rest duration
     */
    rest: function(botId, minutes) {
      const state = loadState();
      if (!state[botId]) return;

      const isDeep = minutes >= EX_CONFIG.deepRestThresholdMin;
      const rate = isDeep
        ? EX_CONFIG.recoveryPerMin * EX_CONFIG.deepRestMultiplier
        : EX_CONFIG.recoveryPerMin;
      const recovered = rate * minutes;
      state[botId].ep_spent = Math.max(0, state[botId].ep_spent - recovered);
      state[botId].last_rest_start = Date.now();

      saveState(state);
      if (isOpen) render();

      return {
        recovered: Math.round(recovered),
        remaining: Math.round(getBotMaxEP(state[botId].rank) - state[botId].ep_spent),
        zone: getZone(state[botId].ep_spent, getBotMaxEP(state[botId].rank)).name,
        deep: isDeep
      };
    },

    /**
     * Get full status for a bot
     */
    getStatus: function(botId) {
      const state = loadState();
      if (!state[botId]) return null;

      applyRecovery(state[botId]);
      const maxEP = getBotMaxEP(state[botId].rank);
      const zone = getZone(state[botId].ep_spent, maxEP);
      const remaining = maxEP - state[botId].ep_spent;

      return {
        ep_remaining: Math.round(remaining * 10) / 10,
        ep_max: maxEP,
        ep_spent: Math.round(state[botId].ep_spent * 10) / 10,
        zone: zone.name,
        zone_emoji: zone.emoji,
        zone_color: zone.color,
        speed_multiplier: zone.speed,
        error_modifier: zone.errorMod,
        recommended_delay: gaussianDelay(zone.delayRange[0], zone.delayRange[1]),
        total_actions: state[botId].total_actions || 0,
        overrides: state[botId].overrides || 0
      };
    },

    /**
     * Get current zone name for a bot
     */
    getZone: function(botId) {
      const status = this.getStatus(botId);
      return status ? status.zone : 'unknown';
    },

    /**
     * Check if bot can perform an action without exceeding EP
     */
    canDo: function(botId, action, complexity) {
      const state = loadState();
      if (!state[botId]) return false;

      applyRecovery(state[botId]);
      const maxEP = getBotMaxEP(state[botId].rank);
      const cost = getActionCost(action || 'medium', complexity || 'moderate');
      return (state[botId].ep_spent + cost) <= maxEP;
    },

    /**
     * Get a human-like delay for current zone (in seconds)
     */
    getDelay: function(botId) {
      const state = loadState();
      if (!state[botId]) return 2;

      applyRecovery(state[botId]);
      const maxEP = getBotMaxEP(state[botId].rank);
      const zone = getZone(state[botId].ep_spent, maxEP);
      return gaussianDelay(zone.delayRange[0], zone.delayRange[1]);
    },

    /**
     * Forecast: can a list of tasks fit in remaining EP?
     * @param {string} botId
     * @param {Array} tasks - [{action, complexity}]
     * @returns {object} { fits, total_cost, remaining_after, tasks_possible }
     */
    forecast: function(botId, tasks) {
      const state = loadState();
      if (!state[botId]) return { fits: false };

      applyRecovery(state[botId]);
      const maxEP = getBotMaxEP(state[botId].rank);
      const available = maxEP - state[botId].ep_spent;

      let totalCost = 0;
      let possible = 0;
      for (const t of tasks) {
        const cost = getActionCost(t.action || 'medium', t.complexity || 'moderate');
        if (totalCost + cost <= available) {
          totalCost += cost;
          possible++;
        } else break;
      }

      return {
        fits: possible === tasks.length,
        total_cost: Math.round(totalCost * 10) / 10,
        remaining_after: Math.round((available - totalCost) * 10) / 10,
        tasks_possible: possible,
        tasks_total: tasks.length
      };
    },

    /**
     * Full fleet report
     */
    report: function() {
      return EX_CONFIG.bots.map(b => {
        const s = this.getStatus(b.id);
        return {
          id: b.id,
          name: b.name,
          ...s
        };
      });
    },

    /**
     * Emergency override — doubles EP cost, logged
     */
    override: function(botId, action, complexity) {
      const state = loadState();
      if (!state[botId]) return { blocked: true };

      const cost = getActionCost(action || 'medium', complexity || 'moderate') * 2;
      state[botId].ep_spent += cost;
      state[botId].overrides = (state[botId].overrides || 0) + 1;
      state[botId].last_action_time = Date.now();
      saveState(state);

      if (window.BIRDBOT) {
        window.BIRDBOT.swack('Overconfident',
          'Override used. Double EP burned. The adrenaline tax is real — use it wisely or burn out fast. 🔋');
      }

      if (isOpen) render();
      const maxEP = getBotMaxEP(state[botId].rank);
      return {
        blocked: false,
        cost: cost,
        override: true,
        remaining: Math.max(0, maxEP - state[botId].ep_spent),
        zone: getZone(state[botId].ep_spent, maxEP).name
      };
    },

    /**
     * Sync rank from Mining Camp (call after XP changes)
     */
    syncRank: function(botId, rank) {
      const state = loadState();
      if (state[botId]) {
        state[botId].rank = rank;
        state[botId].ep_max = getBotMaxEP(rank);
        saveState(state);
      }
    }
  };

  // Auto-update every 30 seconds if panel is open
  setInterval(() => { if (isOpen) render(); }, 30000);

  // Initial render
  render();

})();
