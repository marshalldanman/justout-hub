/**
 * Mining Camp — Realbotville XP & Stats Dashboard Widget
 *
 * Floating pickaxe icon → expands to show all bot stats, XP, ranks.
 * Reads/writes to localStorage. Can be fed by hooks or manual updates.
 *
 * API: window.MININGCAMP.awardXP(botId, action)
 *       window.MININGCAMP.penalize(botId, penalty)
 *       window.MININGCAMP.getStats()
 */

(function() {
  'use strict';

  const MC_CONFIG = {
    storageKey: 'realbotville_xp',
    ranks: [
      { name: 'Seedling',      min: 0,    emoji: '🌱', color: '#94a3b8' },
      { name: 'Sprout',        min: 50,   emoji: '🌿', color: '#4ade80' },
      { name: 'Sapling',       min: 150,  emoji: '🌳', color: '#22d3ee' },
      { name: 'Oak',           min: 400,  emoji: '🏔️', color: '#38bdf8' },
      { name: 'Sentinel',      min: 800,  emoji: '⚔️', color: '#a78bfa' },
      { name: 'Elder',         min: 1500, emoji: '👑', color: '#fbbf24' },
      { name: 'Archon',        min: 3000, emoji: '🔱', color: '#f97316' },
      { name: 'Transcendent',  min: 6000, emoji: '✨', color: '#f43f5e' }
    ],
    bots: [
      { id: 'commander',        name: 'Commander',    emoji: '🎖️' },
      { id: 'analyst',          name: 'Analyst',      emoji: '📊' },
      { id: 'creative',         name: 'Creative',     emoji: '🎨' },
      { id: 'tax-specialist',   name: 'Tax Spec',     emoji: '💼' },
      { id: 'security-auditor', name: 'SHIELD',       emoji: '🛡️' },
      { id: 'jaz',              name: 'Jaz',          emoji: '💜' },
      { id: 'birdbot',          name: 'BIRDBOT',      emoji: '🦅' }
    ]
  };

  // ===== STYLES =====
  const styles = document.createElement('style');
  styles.textContent = `
    .mc-float {
      position: fixed;
      bottom: 24px;
      right: 90px;
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
      font-size: 22px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      user-select: none;
    }
    .mc-float:hover {
      transform: scale(1.1);
      border-color: #fbbf24;
      box-shadow: 0 4px 20px rgba(251,191,36,0.3);
    }
    .mc-float.active { border-color: #fbbf24; }

    .mc-panel {
      position: fixed;
      bottom: 82px;
      right: 90px;
      z-index: 9998;
      width: 340px;
      max-height: 480px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .mc-panel.open { display: flex; }

    .mc-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #78350f, #92400e);
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mc-header-title { font-size: 14px; font-weight: 700; color: #fef3c7; }
    .mc-header-sub { font-size: 10px; color: #d97706; }
    .mc-header-total { margin-left: auto; font-size: 18px; font-weight: 800; color: #fbbf24; }

    .mc-body { overflow-y: auto; padding: 10px; max-height: 360px; }

    .mc-bot {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 10px;
      background: #1e293b;
      transition: all 0.2s;
    }
    .mc-bot:hover { background: #263044; }
    .mc-bot-emoji { font-size: 20px; width: 28px; text-align: center; }
    .mc-bot-info { flex: 1; }
    .mc-bot-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .mc-bot-rank { font-size: 10px; font-weight: 600; }
    .mc-bot-xp { text-align: right; }
    .mc-bot-xp-num { font-size: 15px; font-weight: 800; color: #fbbf24; }
    .mc-bot-xp-label { font-size: 9px; color: #64748b; text-transform: uppercase; }

    .mc-bar {
      height: 4px;
      background: #334155;
      border-radius: 2px;
      margin-top: 4px;
      overflow: hidden;
    }
    .mc-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    .mc-footer {
      padding: 8px 14px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mc-footer-tag { font-size: 10px; color: #d97706; font-weight: 600; }
    .mc-footer button {
      background: none;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      cursor: pointer;
    }
    .mc-footer button:hover { border-color: #fbbf24; color: #fbbf24; }

    @media (max-width: 480px) { .mc-panel { width: calc(100vw - 32px); right: 16px; } }
  `;
  document.head.appendChild(styles);

  // ===== DATA =====
  function loadStats() {
    try {
      const data = JSON.parse(localStorage.getItem(MC_CONFIG.storageKey) || '{}');
      // Ensure all bots exist
      MC_CONFIG.bots.forEach(b => {
        if (!data[b.id]) data[b.id] = { xp: 0, sessions: 0, tasks: 0 };
      });
      return data;
    } catch { return {}; }
  }

  function saveStats(data) {
    localStorage.setItem(MC_CONFIG.storageKey, JSON.stringify(data));
  }

  function getRank(xp) {
    let rank = MC_CONFIG.ranks[0];
    for (const r of MC_CONFIG.ranks) {
      if (xp >= r.min) rank = r;
    }
    return rank;
  }

  function getProgress(xp) {
    const rank = getRank(xp);
    const idx = MC_CONFIG.ranks.indexOf(rank);
    if (idx >= MC_CONFIG.ranks.length - 1) return 100;
    const next = MC_CONFIG.ranks[idx + 1];
    const range = next.min - rank.min;
    const progress = xp - rank.min;
    return Math.min(100, Math.round((progress / range) * 100));
  }

  // ===== DOM =====
  const floatBtn = document.createElement('div');
  floatBtn.className = 'mc-float';
  floatBtn.innerHTML = '⛏️';
  floatBtn.title = 'Mining Camp — Bot XP & Stats';
  document.body.appendChild(floatBtn);

  const panel = document.createElement('div');
  panel.className = 'mc-panel';
  panel.innerHTML = `
    <div class="mc-header">
      <span style="font-size:20px">⛏️</span>
      <div>
        <div class="mc-header-title">Mining Camp</div>
        <div class="mc-header-sub">Realbotville XP Leaderboard</div>
      </div>
      <div class="mc-header-total" id="mcTotalXP">0</div>
    </div>
    <div class="mc-body" id="mcBotList"></div>
    <div class="mc-footer">
      <span class="mc-footer-tag">XP PAYS THE BILLS</span>
      <button id="mcResetBtn" title="Reset all stats">Reset</button>
    </div>
  `;
  document.body.appendChild(panel);

  let isOpen = false;
  floatBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    floatBtn.classList.toggle('active', isOpen);
    if (isOpen) renderStats();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      panel.classList.remove('open');
      floatBtn.classList.remove('active');
    }
  });

  function renderStats() {
    const stats = loadStats();
    const list = document.getElementById('mcBotList');
    const totalEl = document.getElementById('mcTotalXP');

    // Sort bots by XP descending
    const sorted = MC_CONFIG.bots.slice().sort((a, b) => {
      return (stats[b.id]?.xp || 0) - (stats[a.id]?.xp || 0);
    });

    let totalXP = 0;
    list.innerHTML = sorted.map((bot, i) => {
      const s = stats[bot.id] || { xp: 0 };
      const rank = getRank(s.xp);
      const progress = getProgress(s.xp);
      totalXP += s.xp;
      const crown = i === 0 && s.xp > 0 ? ' 👑' : '';
      return `
        <div class="mc-bot">
          <div class="mc-bot-emoji">${bot.emoji}</div>
          <div class="mc-bot-info">
            <div class="mc-bot-name">${bot.name}${crown}</div>
            <div class="mc-bot-rank" style="color:${rank.color}">${rank.emoji} ${rank.name}</div>
            <div class="mc-bar"><div class="mc-bar-fill" style="width:${progress}%;background:${rank.color}"></div></div>
          </div>
          <div class="mc-bot-xp">
            <div class="mc-bot-xp-num">${s.xp}</div>
            <div class="mc-bot-xp-label">XP</div>
          </div>
        </div>`;
    }).join('');

    totalEl.textContent = totalXP + ' XP';
  }

  document.getElementById('mcResetBtn').addEventListener('click', () => {
    if (confirm('Reset all bot stats? This cannot be undone.')) {
      localStorage.removeItem(MC_CONFIG.storageKey);
      renderStats();
    }
  });

  // ===== PUBLIC API =====
  window.MININGCAMP = {
    awardXP: function(botId, amount, reason) {
      const stats = loadStats();
      if (!stats[botId]) stats[botId] = { xp: 0, sessions: 0, tasks: 0 };
      stats[botId].xp = Math.max(0, (stats[botId].xp || 0) + amount);
      stats[botId].lastAction = reason || 'unknown';
      stats[botId].lastUpdated = new Date().toISOString();
      saveStats(stats);
      if (isOpen) renderStats();
    },
    penalize: function(botId, amount, reason) {
      this.awardXP(botId, -Math.abs(amount), 'PENALTY: ' + (reason || 'unknown'));
    },
    getStats: loadStats,
    getRank: function(botId) {
      const stats = loadStats();
      return getRank(stats[botId]?.xp || 0);
    },
    leaderboard: function() {
      const stats = loadStats();
      return MC_CONFIG.bots
        .map(b => ({ id: b.id, name: b.name, xp: stats[b.id]?.xp || 0, rank: getRank(stats[b.id]?.xp || 0).name }))
        .sort((a, b) => b.xp - a.xp);
    }
  };

  renderStats();
})();
