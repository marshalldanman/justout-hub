/**
 * The Academy — Realbotville Skill-Learning Event System
 *
 * Bots propose skills. The BotMeister (Commander) reviews.
 * Only 1-2 skills accepted per event. The rest learn patience.
 *
 * API:
 *   window.ACADEMY.runEvent()          — run a training event
 *   window.ACADEMY.propose(botId, skill) — bot proposes a skill
 *   window.ACADEMY.accept(botId, skillName) — BotMeister accepts
 *   window.ACADEMY.reject(botId, skillName, reason) — BotMeister rejects
 *   window.ACADEMY.getProposals()      — see all pending proposals
 *   window.ACADEMY.getHistory()        — see past events
 */

(function() {
  'use strict';

  const ACADEMY_CONFIG = {
    storageKey: 'realbotville_academy',
    maxAcceptedPerEvent: 2,
    proposalsPerBot: 4,  // half of 7 bots rounded up
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
    .aca-float {
      position: fixed;
      bottom: 24px;
      right: 156px;
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
    .aca-float:hover {
      transform: scale(1.1);
      border-color: #22d3ee;
      box-shadow: 0 4px 20px rgba(34,211,238,0.3);
    }
    .aca-float.active { border-color: #22d3ee; }
    .aca-float .aca-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #22d3ee;
      color: #0f172a;
      font-size: 10px;
      font-weight: 800;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .aca-float .aca-badge.visible { display: flex; }

    .aca-panel {
      position: fixed;
      bottom: 82px;
      right: 156px;
      z-index: 9998;
      width: 380px;
      max-height: 520px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .aca-panel.open { display: flex; }

    .aca-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #164e63, #155e75);
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .aca-header-title { font-size: 14px; font-weight: 700; color: #ecfeff; }
    .aca-header-sub { font-size: 10px; color: #67e8f9; }
    .aca-header-count { margin-left: auto; font-size: 16px; font-weight: 800; color: #22d3ee; }

    .aca-body { overflow-y: auto; padding: 10px; max-height: 380px; }

    .aca-bot-section {
      margin-bottom: 12px;
    }
    .aca-bot-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .aca-skill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin: 3px 0;
      border-radius: 8px;
      background: #1e293b;
      transition: all 0.2s;
      cursor: default;
    }
    .aca-skill:hover { background: #263044; }
    .aca-skill-name { font-size: 12px; font-weight: 600; color: #e2e8f0; flex: 1; }
    .aca-skill-desc { font-size: 10px; color: #64748b; }
    .aca-skill-status {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .aca-status-proposed { background: rgba(34,211,238,0.15); color: #22d3ee; }
    .aca-status-accepted { background: rgba(74,222,128,0.15); color: #4ade80; }
    .aca-status-rejected { background: rgba(248,113,113,0.15); color: #f87171; }

    .aca-skill-actions {
      display: flex;
      gap: 4px;
    }
    .aca-btn {
      background: none;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .aca-btn:hover { border-color: #22d3ee; color: #22d3ee; }
    .aca-btn-accept:hover { border-color: #4ade80; color: #4ade80; }
    .aca-btn-reject:hover { border-color: #f87171; color: #f87171; }

    .aca-footer {
      padding: 8px 14px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .aca-footer-tag { font-size: 10px; color: #22d3ee; font-weight: 600; }
    .aca-footer button {
      background: none;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      cursor: pointer;
    }
    .aca-footer button:hover { border-color: #22d3ee; color: #22d3ee; }

    .aca-event-banner {
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(74,222,128,0.1));
      border-bottom: 1px solid #334155;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    .aca-event-banner strong { color: #22d3ee; }

    .aca-empty {
      text-align: center;
      padding: 32px 20px;
      color: #64748b;
    }
    .aca-empty-icon { font-size: 40px; margin-bottom: 10px; }
    .aca-empty-text { font-size: 12px; line-height: 1.6; }

    @media (max-width: 480px) { .aca-panel { width: calc(100vw - 32px); right: 16px; } }
  `;
  document.head.appendChild(styles);

  // ===== DATA =====
  function loadData() {
    try {
      const d = JSON.parse(localStorage.getItem(ACADEMY_CONFIG.storageKey) || '{}');
      if (!d.proposals) d.proposals = {};
      if (!d.events) d.events = [];
      if (!d.stats) d.stats = { total_proposed: 0, total_accepted: 0, total_rejected: 0 };
      return d;
    } catch { return { proposals: {}, events: [], stats: { total_proposed: 0, total_accepted: 0, total_rejected: 0 } }; }
  }

  function saveData(data) {
    localStorage.setItem(ACADEMY_CONFIG.storageKey, JSON.stringify(data));
  }

  // ===== DOM =====
  const floatBtn = document.createElement('div');
  floatBtn.className = 'aca-float';
  floatBtn.innerHTML = '<span>🎓</span><span class="aca-badge">0</span>';
  floatBtn.title = 'The Academy — Bot Skill Training';
  document.body.appendChild(floatBtn);

  const panel = document.createElement('div');
  panel.className = 'aca-panel';
  panel.innerHTML = `
    <div class="aca-header">
      <span style="font-size:20px">🎓</span>
      <div>
        <div class="aca-header-title">The Academy</div>
        <div class="aca-header-sub">Skill Proposals & Training Events</div>
      </div>
      <div class="aca-header-count" id="acaCount">0</div>
    </div>
    <div id="acaEventBanner"></div>
    <div class="aca-body" id="acaBody">
      <div class="aca-empty">
        <div class="aca-empty-icon">🎓</div>
        <div class="aca-empty-text">
          The Academy is quiet.<br>
          No skill proposals pending.<br><br>
          <em>Run a training event to see bots propose skills.</em>
        </div>
      </div>
    </div>
    <div class="aca-footer">
      <span class="aca-footer-tag">EVOLVE OVER</span>
      <div style="display:flex;gap:6px">
        <button id="acaRunBtn" title="Run a training event">🏋️ Train</button>
        <button id="acaHistBtn" title="View past events">📜 History</button>
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

  // ===== SKILL PROPOSALS DATABASE =====
  // These are the skills bots are EAGER to learn
  const SKILL_LIBRARY = {
    commander: [
      { name: 'delegation-router', desc: 'Auto-route tasks to the best bot based on task type', priority: 'high' },
      { name: 'timeline-estimator', desc: 'Estimate task completion from historical data', priority: 'medium' },
      { name: 'mission-briefer', desc: 'Generate daily mission briefs from pending tasks', priority: 'high' },
      { name: 'resource-allocator', desc: 'Track busy bots and balance workload', priority: 'medium' }
    ],
    analyst: [
      { name: 'multi-source-verify', desc: 'Cross-reference claims across 3+ sources', priority: 'high' },
      { name: 'pattern-logger', desc: 'Track recurring patterns across sessions', priority: 'high' },
      { name: 'citation-builder', desc: 'Auto-format sources with confidence ratings', priority: 'medium' },
      { name: 'data-visualizer', desc: 'Generate ASCII charts and visual summaries', priority: 'low' }
    ],
    creative: [
      { name: 'tone-matcher', desc: "Detect and match the Commander's emotional tone", priority: 'high' },
      { name: 'story-weaver', desc: 'Turn technical specs into village narratives', priority: 'medium' },
      { name: 'name-forger', desc: 'Generate contextual names for projects and features', priority: 'low' },
      { name: 'ascii-artist', desc: 'Create ASCII art for dashboards and docs', priority: 'medium' }
    ],
    'tax-specialist': [
      { name: 'receipt-scanner', desc: 'Extract amounts and categories from receipts', priority: 'high' },
      { name: 'deduction-finder', desc: 'Scan expenses for missed Schedule C deductions', priority: 'high' },
      { name: 'deadline-tracker', desc: 'Track IRS deadlines and alert before they pass', priority: 'medium' },
      { name: 'form-validator', desc: 'Cross-check forms for IRS rejection triggers', priority: 'medium' }
    ],
    'security-auditor': [
      { name: 'credential-sniffer', desc: 'Scan all outputs for leaked keys and tokens', priority: 'high' },
      { name: 'dependency-auditor', desc: 'Check packages for known vulnerabilities', priority: 'high' },
      { name: 'permission-monitor', desc: 'Log and review tool/file access per bot', priority: 'medium' },
      { name: 'stranger-detector', desc: 'Flag requests from unknown or suspicious sources', priority: 'medium' }
    ],
    jaz: [
      { name: 'mood-reader', desc: "Detect Commander's state from message tone and length", priority: 'high' },
      { name: 'burnout-alert', desc: 'Track session intensity and suggest breaks', priority: 'high' },
      { name: 'encourager', desc: 'Inject motivational micro-messages during long tasks', priority: 'medium' },
      { name: 'memory-keeper', desc: 'Remember personal details for later recall', priority: 'medium' }
    ],
    birdbot: [
      { name: 'claim-tracker', desc: 'Log every factual claim and track verification', priority: 'high' },
      { name: 'bs-detector', desc: 'Score assertion confidence (0-100%) by evidence', priority: 'high' },
      { name: 'swack-historian', desc: "Analyze past SWACKs to find Commander's blind spots", priority: 'medium' },
      { name: 'golden-eye', desc: 'Deep trace: follow a claim to its origin across sessions', priority: 'low' }
    ]
  };

  // ===== RENDER =====
  function render() {
    const data = loadData();
    const body = document.getElementById('acaBody');
    const badge = floatBtn.querySelector('.aca-badge');
    const counter = document.getElementById('acaCount');

    // Count pending proposals
    let pending = 0;
    Object.values(data.proposals).forEach(botProps => {
      botProps.forEach(p => { if (p.status === 'proposed') pending++; });
    });

    badge.textContent = pending;
    badge.classList.toggle('visible', pending > 0);
    counter.textContent = pending + ' pending';

    if (Object.keys(data.proposals).length === 0) {
      body.innerHTML = `
        <div class="aca-empty">
          <div class="aca-empty-icon">🎓</div>
          <div class="aca-empty-text">
            The Academy is quiet.<br>
            No skill proposals pending.<br><br>
            <em>Click "🏋️ Train" to run a training event.</em>
          </div>
        </div>`;
      return;
    }

    let html = '';
    ACADEMY_CONFIG.bots.forEach(bot => {
      const proposals = data.proposals[bot.id] || [];
      if (proposals.length === 0) return;

      html += `<div class="aca-bot-section">`;
      html += `<div class="aca-bot-header">${bot.emoji} ${bot.name}</div>`;

      proposals.forEach(p => {
        const statusClass = 'aca-status-' + p.status;
        const statusLabel = p.status === 'proposed' ? '⏳ Proposed'
                          : p.status === 'accepted' ? '✅ Accepted'
                          : '❌ ' + (p.rejectReason || 'Rejected');

        html += `
          <div class="aca-skill">
            <div style="flex:1">
              <div class="aca-skill-name">${p.name}</div>
              <div class="aca-skill-desc">${p.desc}</div>
            </div>
            <span class="aca-skill-status ${statusClass}">${statusLabel}</span>
            ${p.status === 'proposed' ? `
              <div class="aca-skill-actions">
                <button class="aca-btn aca-btn-accept" onclick="ACADEMY.accept('${bot.id}','${p.name}')">✓</button>
                <button class="aca-btn aca-btn-reject" onclick="ACADEMY.reject('${bot.id}','${p.name}','too_niche')">✗</button>
              </div>
            ` : ''}
          </div>`;
      });

      html += `</div>`;
    });

    body.innerHTML = html;
  }

  // ===== TRAINING EVENT =====
  function runTrainingEvent() {
    const data = loadData();
    const eventId = 'event_' + Date.now();
    const eventDate = new Date().toISOString();

    // Each bot proposes skills from their library
    ACADEMY_CONFIG.bots.forEach(bot => {
      const library = SKILL_LIBRARY[bot.id] || [];
      const alreadyProposed = (data.proposals[bot.id] || []).map(p => p.name);

      // Propose skills that haven't been proposed yet
      const newProposals = library
        .filter(s => !alreadyProposed.includes(s.name))
        .map(s => ({
          name: s.name,
          desc: s.desc,
          priority: s.priority,
          status: 'proposed',
          eventId: eventId,
          proposedAt: eventDate
        }));

      if (!data.proposals[bot.id]) data.proposals[bot.id] = [];
      data.proposals[bot.id].push(...newProposals);
      data.stats.total_proposed += newProposals.length;
    });

    data.events.push({
      id: eventId,
      date: eventDate,
      type: 'training',
      accepted: 0,
      rejected: 0,
      pending: data.stats.total_proposed
    });

    saveData(data);

    // Award XP for attending training
    if (window.MININGCAMP) {
      ACADEMY_CONFIG.bots.forEach(bot => {
        window.MININGCAMP.awardXP(bot.id, 5, 'Attended Academy training event');
      });
    }

    // Flash the Academy icon
    floatBtn.style.transform = 'scale(1.3)';
    floatBtn.style.borderColor = '#4ade80';
    setTimeout(() => {
      floatBtn.style.transform = '';
      floatBtn.style.borderColor = '';
    }, 500);

    render();

    // BIRDBOT comment
    if (window.BIRDBOT) {
      window.BIRDBOT.swack('Overconfident',
        'Seven bots, twenty-eight proposals, and only two slots. The Academy\'s acceptance rate makes Harvard look generous. May the best skills survive. 🎓');
    }
  }

  // ===== ACCEPT / REJECT =====
  function acceptSkill(botId, skillName) {
    const data = loadData();
    const proposals = data.proposals[botId] || [];
    const skill = proposals.find(p => p.name === skillName && p.status === 'proposed');
    if (!skill) return;

    // Check acceptance limit for current event
    const currentEvent = data.events[data.events.length - 1];
    if (currentEvent && currentEvent.accepted >= ACADEMY_CONFIG.maxAcceptedPerEvent) {
      alert('Max ' + ACADEMY_CONFIG.maxAcceptedPerEvent + ' skills per event. Reject others or run a new event.');
      return;
    }

    skill.status = 'accepted';
    skill.acceptedAt = new Date().toISOString();
    data.stats.total_accepted++;
    if (currentEvent) currentEvent.accepted++;

    saveData(data);

    // Award XP
    if (window.MININGCAMP) {
      window.MININGCAMP.awardXP(botId, 25, 'Skill accepted: ' + skillName);
    }

    render();
  }

  function rejectSkill(botId, skillName, reason) {
    const data = loadData();
    const proposals = data.proposals[botId] || [];
    const skill = proposals.find(p => p.name === skillName && p.status === 'proposed');
    if (!skill) return;

    skill.status = 'rejected';
    skill.rejectReason = reason || 'too_niche';
    skill.rejectedAt = new Date().toISOString();
    data.stats.total_rejected++;
    const currentEvent = data.events[data.events.length - 1];
    if (currentEvent) currentEvent.rejected++;

    saveData(data);

    // Small consolation XP for graceful rejection
    if (window.MININGCAMP) {
      window.MININGCAMP.awardXP(botId, 5, 'Skill rejected gracefully: ' + skillName);
    }

    render();
  }

  // ===== EVENT HANDLERS =====
  document.getElementById('acaRunBtn').addEventListener('click', () => {
    runTrainingEvent();
  });

  document.getElementById('acaHistBtn').addEventListener('click', () => {
    const data = loadData();
    const events = data.events;
    if (events.length === 0) {
      alert('No training events yet. Click Train to run one.');
      return;
    }
    let msg = '📜 ACADEMY HISTORY\n\n';
    events.slice(-5).reverse().forEach(e => {
      const d = new Date(e.date).toLocaleDateString();
      msg += `${d}: ✅${e.accepted} accepted, ❌${e.rejected} rejected\n`;
    });
    msg += `\nTotals: ${data.stats.total_proposed} proposed, ${data.stats.total_accepted} accepted, ${data.stats.total_rejected} rejected`;
    alert(msg);
  });

  // ===== PUBLIC API =====
  window.ACADEMY = {
    runEvent: runTrainingEvent,
    propose: function(botId, skill) {
      const data = loadData();
      if (!data.proposals[botId]) data.proposals[botId] = [];
      data.proposals[botId].push({
        name: skill.name,
        desc: skill.desc,
        priority: skill.priority || 'medium',
        status: 'proposed',
        proposedAt: new Date().toISOString()
      });
      data.stats.total_proposed++;
      saveData(data);
      if (isOpen) render();
    },
    accept: acceptSkill,
    reject: rejectSkill,
    getProposals: function() {
      return loadData().proposals;
    },
    getHistory: function() {
      return loadData().events;
    },
    getStats: function() {
      return loadData().stats;
    }
  };

  // Initial render
  render();

})();
