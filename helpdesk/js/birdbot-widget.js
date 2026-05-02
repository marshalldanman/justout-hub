/**
 * SwackerBirdBot — Dashboard Mini-Widget
 * A floating royal bird that displays SWACKs (wisdom interjections)
 *
 * Usage: Include this script in any dashboard page.
 * It creates a floating bird icon in the bottom-right corner.
 * Click to expand the SWACK panel showing recent wisdom.
 *
 * The widget reads from Firestore collection 'birdbot_swacks'
 * or falls back to localStorage for offline operation.
 */

(function() {
  'use strict';

  // ===== CONFIG =====
  const BIRDBOT_CONFIG = {
    maxSwacks: 20,           // Max swacks to display
    storageKey: 'birdbot_swacks',
    categories: {
      'Missing':       { color: '#38bdf8', icon: '🔍' },
      'Half-Truth':    { color: '#fbbf24', icon: '⚖️' },
      'Questionable':  { color: '#fb923c', icon: '❓' },
      'Exaggerated':   { color: '#f87171', icon: '📢' },
      'Manipulative':  { color: '#ef4444', icon: '🎭' },
      'Fallacy':       { color: '#c084fc', icon: '🧠' },
      'Overconfident':  { color: '#34d399', icon: '⚡' },
      'Security':      { color: '#f43f5e', icon: '🛡️' },
      'Golden':        { color: '#fbbf24', icon: '✨' }
    }
  };

  // ===== STYLES =====
  const styles = document.createElement('style');
  styles.textContent = `
    /* BIRDBOT Floating Button */
    .bb-float {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #334155);
      border: 2px solid #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
      user-select: none;
    }
    .bb-float:hover {
      transform: scale(1.1);
      border-color: #a78bfa;
      box-shadow: 0 4px 24px rgba(167,139,250,0.3);
    }
    .bb-float.active {
      border-color: #a78bfa;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
    }
    .bb-float .bb-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      display: none;
    }
    .bb-float .bb-badge.visible { display: flex; }

    /* BIRDBOT Panel */
    .bb-panel {
      position: fixed;
      bottom: 90px;
      right: 24px;
      z-index: 9998;
      width: 380px;
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
    .bb-panel.open { display: flex; }

    .bb-panel-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bb-panel-header .bb-title {
      font-size: 15px;
      font-weight: 700;
      color: #e2e8f0;
    }
    .bb-panel-header .bb-subtitle {
      font-size: 11px;
      color: #94a3b8;
    }
    .bb-panel-header .bb-stats {
      margin-left: auto;
      font-size: 11px;
      color: #a78bfa;
      font-weight: 600;
    }

    .bb-panel-body {
      overflow-y: auto;
      flex: 1;
      padding: 12px;
      max-height: 380px;
    }

    /* Individual SWACK card */
    .bb-swack {
      padding: 12px 14px;
      margin-bottom: 10px;
      border-radius: 10px;
      background: #1e293b;
      border-left: 3px solid #475569;
      transition: all 0.2s;
    }
    .bb-swack:hover {
      background: #263044;
    }
    .bb-swack-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .bb-swack-cat {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(100,116,139,0.2);
    }
    .bb-swack-time {
      font-size: 10px;
      color: #64748b;
      margin-left: auto;
    }
    .bb-swack-text {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Empty state */
    .bb-empty {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }
    .bb-empty .bb-empty-bird { font-size: 48px; margin-bottom: 12px; }
    .bb-empty .bb-empty-text { font-size: 13px; line-height: 1.6; }

    /* Panel footer */
    .bb-panel-footer {
      padding: 10px 16px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bb-panel-footer button {
      background: none;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .bb-panel-footer button:hover {
      border-color: #a78bfa;
      color: #a78bfa;
    }
    .bb-evolve-tag {
      font-size: 10px;
      color: #34d399;
      font-weight: 600;
    }

    @media (max-width: 480px) {
      .bb-panel { width: calc(100vw - 32px); right: 16px; }
    }
  `;
  document.head.appendChild(styles);

  // ===== BUILD DOM =====
  // Floating bird button
  const floatBtn = document.createElement('div');
  floatBtn.className = 'bb-float';
  floatBtn.innerHTML = '<span>🦅</span><span class="bb-badge">0</span>';
  floatBtn.title = 'SwackerBirdBot — Royal Truth Bird';
  document.body.appendChild(floatBtn);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'bb-panel';
  panel.innerHTML = `
    <div class="bb-panel-header">
      <span style="font-size:24px">🦅</span>
      <div>
        <div class="bb-title">SwackerBirdBot</div>
        <div class="bb-subtitle">Royal Truth Bird — The Commander's Shoulder</div>
      </div>
      <div class="bb-stats">v1.0</div>
    </div>
    <div class="bb-panel-body" id="bbSwackList">
      <div class="bb-empty">
        <div class="bb-empty-bird">🦅</div>
        <div class="bb-empty-text">
          The Bird is silent.<br>
          Silence means approval.<br><br>
          <em>SWACKs appear here when truth needs defending.</em>
        </div>
      </div>
    </div>
    <div class="bb-panel-footer">
      <span class="bb-evolve-tag">EVOLVING</span>
      <button id="bbClearBtn">Clear SWACKs</button>
    </div>
  `;
  document.body.appendChild(panel);

  // ===== LOGIC =====
  let isOpen = false;

  floatBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    floatBtn.classList.toggle('active', isOpen);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      panel.classList.remove('open');
      floatBtn.classList.remove('active');
    }
  });

  // Load swacks from localStorage
  function loadSwacks() {
    try {
      return JSON.parse(localStorage.getItem(BIRDBOT_CONFIG.storageKey) || '[]');
    } catch { return []; }
  }

  // Save swacks to localStorage
  function saveSwacks(swacks) {
    localStorage.setItem(BIRDBOT_CONFIG.storageKey, JSON.stringify(swacks.slice(-BIRDBOT_CONFIG.maxSwacks)));
  }

  // Render swack list
  function renderSwacks() {
    const swacks = loadSwacks();
    const list = document.getElementById('bbSwackList');
    const badge = floatBtn.querySelector('.bb-badge');

    if (swacks.length === 0) {
      list.innerHTML = `
        <div class="bb-empty">
          <div class="bb-empty-bird">🦅</div>
          <div class="bb-empty-text">
            The Bird is silent.<br>
            Silence means approval.<br><br>
            <em>SWACKs appear here when truth needs defending.</em>
          </div>
        </div>`;
      badge.classList.remove('visible');
      return;
    }

    const unread = swacks.filter(s => !s.read).length;
    badge.textContent = unread;
    badge.classList.toggle('visible', unread > 0);

    list.innerHTML = swacks.slice().reverse().map(s => {
      const cat = BIRDBOT_CONFIG.categories[s.category] || { color: '#94a3b8', icon: '🦅' };
      const time = s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="bb-swack" style="border-left-color: ${cat.color}">
          <div class="bb-swack-header">
            <span>${cat.icon}</span>
            <span class="bb-swack-cat" style="color: ${cat.color}">${s.category}</span>
            <span class="bb-swack-time">${time}</span>
          </div>
          <div class="bb-swack-text">${s.text}</div>
        </div>`;
    }).join('');

    // Mark all as read
    swacks.forEach(s => s.read = true);
    saveSwacks(swacks);
  }

  // Clear button
  document.getElementById('bbClearBtn').addEventListener('click', () => {
    localStorage.removeItem(BIRDBOT_CONFIG.storageKey);
    renderSwacks();
  });

  // ===== PUBLIC API =====
  // Other scripts can add swacks via: window.BIRDBOT.swack(category, text)
  window.BIRDBOT = {
    swack: function(category, text) {
      const swacks = loadSwacks();
      swacks.push({
        category: category,
        text: text,
        timestamp: new Date().toISOString(),
        read: false
      });
      saveSwacks(swacks);
      renderSwacks();

      // Flash the bird
      floatBtn.style.transform = 'scale(1.3)';
      setTimeout(() => { floatBtn.style.transform = ''; }, 300);
    },
    getSwacks: loadSwacks,
    clear: function() {
      localStorage.removeItem(BIRDBOT_CONFIG.storageKey);
      renderSwacks();
    }
  };

  // Initial render
  renderSwacks();

  // Demo: if URL has ?birdbot-demo, show a sample SWACK
  if (window.location.search.includes('birdbot-demo')) {
    setTimeout(() => {
      window.BIRDBOT.swack('Overconfident',
        'You said "this will definitely work" but you haven\'t tested it. From up here I can see three edge cases you missed. Confidence is good. Untested confidence is a nest built on a branch that hasn\'t been weight-checked.');
    }, 2000);
  }

})();
