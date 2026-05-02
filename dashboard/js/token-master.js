/* ============================================================
   TokenMaster JS — Token Usage Command Center
   Reads current_state.json from Firestore, renders player cards,
   handles budget controls and filtering.

   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   NOTE: All dynamic HTML is built from trusted internal data
   (local scout JSON + Firestore). No user-supplied or external
   content is rendered. The dashboard is behind Firebase Auth.
   ============================================================ */
(function () {
  'use strict';

  // --- Constants ---
  var FIRESTORE_COLLECTION = 'tokenmaster';
  var CONFIG_COLLECTION = 'tokenmaster_config';
  var REFRESH_INTERVAL = 60000; // 60 seconds
  var LOCAL_BUDGETS_KEY = 'tokenmaster_budgets';

  // --- State ---
  var currentState = null;
  var currentFilter = 'all';
  var currentSort = 'usage_desc';
  var currentView = 'grid';
  var localBudgets = {};

  // --- Load saved budgets from localStorage ---
  try {
    localBudgets = JSON.parse(localStorage.getItem(LOCAL_BUDGETS_KEY) || '{}');
  } catch (e) { localBudgets = {}; }

  // --- Format token numbers ---
  function fmtTokens(n) {
    if (n == null || isNaN(n)) return '--';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function fmtPct(n) {
    if (n == null || isNaN(n)) return '0';
    return Math.round(n) + '%';
  }

  // --- Zone class helper ---
  function zoneClass(zone) {
    return 'zone-' + (zone || 'grey');
  }

  // --- Safe DOM creation helpers ---
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      if (typeof children === 'string') node.textContent = children;
      else if (Array.isArray(children)) children.forEach(function(c) { if (c) node.appendChild(c); });
      else node.appendChild(children);
    }
    return node;
  }

  function txt(str) { return document.createTextNode(str || ''); }

  // --- Render Budget Strip ---
  function renderBudgetStrip(data) {
    if (!data || !data.plan_budget) return;
    var pb = data.plan_budget;

    var dailyCell = document.getElementById('budgetDaily');
    if (dailyCell) {
      dailyCell.className = 'tm-budget-cell ' + zoneClass(pb.zone);
      var valEl = dailyCell.querySelector('.b-val');
      var subEl = dailyCell.querySelector('.b-sub');
      var bar = dailyCell.querySelector('.tm-budget-bar-fill');
      if (valEl) valEl.textContent = fmtTokens(pb.used_today);
      if (subEl) subEl.textContent = 'of ' + fmtTokens(pb.daily_budget) + ' budget';
      if (bar) bar.style.width = Math.min(pb.pct_today || 0, 100) + '%';
    }

    setText('weeklyUsage', fmtTokens(pb.used_this_week));
    setText('monthlyUsage', fmtTokens(pb.used_this_month));
    setText('sessionsToday', String(pb.sessions_today || 0));
    setText('toolCallsToday', (pb.tool_calls_today || 0) + ' tool calls');
    setText('agentSpawns', String(pb.agent_spawns_today || 0));

    var sh = data.scout_health || {};
    var allOk = sh.stats_scout === 'ok' && sh.sessions_scout === 'ok' && sh.village_state === 'ok';
    setText('scoutStatus', allOk ? '\u2705 All OK' : '\u26A0\uFE0F Issues');
    if (sh.last_run) {
      setText('scoutLastRun', 'Updated ' + timeAgo(sh.last_run));
    }
  }

  // --- Render Alert Feed (safe DOM) ---
  function renderAlerts(data) {
    var feed = document.getElementById('alertFeed');
    if (!feed) return;
    var alerts = data.alerts || [];
    if (alerts.length === 0) { feed.style.display = 'none'; return; }

    feed.style.display = 'block';
    feed.textContent = '';

    var title = el('div', { className: 'tm-section-title' }, '\u26A0\uFE0F Alerts (' + alerts.length + ')');
    feed.appendChild(title);

    alerts.forEach(function (a) {
      var isWarn = a.type !== 'plan_limit_warning';
      var item = el('div', { className: 'tm-alert-item' + (isWarn ? ' warning' : '') });

      item.appendChild(el('div', { className: 'tm-alert-icon' }, isWarn ? '\uD83D\uDFE1' : '\uD83D\uDD34'));

      var textEl = el('div', { className: 'tm-alert-text' });
      textEl.appendChild(el('strong', {}, a.entity || ''));
      textEl.appendChild(txt(' '));
      textEl.appendChild(txt(
        a.type === 'plan_limit_warning'
          ? 'Plan daily budget exceeded!'
          : 'Over budget at ' + fmtPct(a.pct)
      ));
      textEl.appendChild(txt(' (' + fmtTokens(a.actual) + ' / ' + fmtTokens(a.budget) + ')'));
      item.appendChild(textEl);

      item.appendChild(el('div', { className: 'tm-alert-time' }, timeAgo(a.timestamp)));
      feed.appendChild(item);
    });
  }

  // --- Build a token bar row (DOM) ---
  function buildBarRow(label, cls, pct, val) {
    var row = el('div', { className: 'tm-bar-row' });
    row.appendChild(el('div', { className: 'tm-bar-label' }, label));

    var track = el('div', { className: 'tm-bar-track' });
    var fill = el('div', { className: 'tm-bar-fill ' + cls });
    fill.style.width = pct + '%';
    track.appendChild(fill);
    row.appendChild(track);

    row.appendChild(el('div', { className: 'tm-bar-val' }, val));
    return row;
  }

  // --- Render Player Cards (safe DOM) ---
  function renderCards(data) {
    var grid = document.getElementById('cardGrid');
    if (!grid || !data || !data.entities) return;

    var entities = Object.entries(data.entities);

    // Filter
    if (currentFilter === 'bot') {
      entities = entities.filter(function (e) { return e[1].type === 'bot'; });
    } else if (currentFilter === 'project') {
      entities = entities.filter(function (e) { return e[1].type === 'project'; });
    } else if (currentFilter === 'red') {
      entities = entities.filter(function (e) { return e[1].zone === 'red'; });
    }

    // Sort
    entities.sort(function (a, b) {
      var av = a[1], bv = b[1];
      switch (currentSort) {
        case 'usage_desc': return (bv.tokens_daily || 0) - (av.tokens_daily || 0);
        case 'usage_asc': return (av.tokens_daily || 0) - (bv.tokens_daily || 0);
        case 'name_asc': return (a[0] || '').localeCompare(b[0] || '');
        case 'budget_pct': return (bv.budget_pct || 0) - (av.budget_pct || 0);
        default: return 0;
      }
    });

    grid.textContent = '';

    if (entities.length === 0) {
      grid.appendChild(el('div', { style: 'color:var(--muted);padding:40px;text-align:center;' }, 'No data yet. Run the scouts first.'));
      return;
    }

    entities.forEach(function (pair) {
      var id = pair[0];
      var e = pair[1];
      var displayName = e.name || id.replace('proj_', '');
      var icon = e.icon || '\uD83D\uDCE6';
      var zone = e.zone || 'grey';
      var typeBadge = e.type === 'bot' ? 'type-bot' : e.type === 'project' ? 'type-project' : 'type-task';
      var typeLabel = e.type === 'bot' ? 'BOT' : e.type === 'project' ? 'PROJECT' : 'TASK';

      var budgetKey = id + '_daily';
      var budget = localBudgets[budgetKey] || e.budget_daily || 50000;
      var pct = budget > 0 ? Math.round((e.tokens_daily || 0) / budget * 100) : 0;

      if (localBudgets[budgetKey]) {
        var ratio = (e.tokens_daily || 0) / budget;
        zone = ratio <= 0.60 ? 'green' : ratio <= 0.85 ? 'yellow' : 'red';
      }

      var weekPct = budget > 0 ? Math.min(Math.round((e.tokens_weekly || 0) / (budget * 7) * 100), 100) : 0;
      var monthPct = budget > 0 ? Math.min(Math.round((e.tokens_monthly || 0) / (budget * 30) * 100), 100) : 0;

      var card = el('div', { className: 'tm-card zone-' + zone, 'data-id': id, 'data-type': e.type });

      // Header
      var header = el('div', { className: 'tm-card-header' });
      header.appendChild(el('div', { className: 'tm-avatar' }, icon));

      var nameBlock = el('div', { className: 'tm-name-block' });
      nameBlock.appendChild(el('div', { className: 'tm-name' }, displayName));
      var rankBadge = el('div', { className: 'tm-rank-badge' });
      rankBadge.appendChild(el('span', { className: 'tm-type-badge ' + typeBadge }, typeLabel));
      if (e.rank) rankBadge.appendChild(txt(' ' + (e.rank_emoji || '') + ' ' + e.rank));
      nameBlock.appendChild(rankBadge);
      header.appendChild(nameBlock);
      header.appendChild(el('div', { className: 'tm-zone-dot ' + zone }));
      card.appendChild(header);

      // Token bars
      var bars = el('div', { className: 'tm-bars' });
      bars.appendChild(buildBarRow('Daily', 'bar-daily', Math.min(pct, 100), fmtTokens(e.tokens_daily)));
      bars.appendChild(buildBarRow('Week', 'bar-weekly', weekPct, fmtTokens(e.tokens_weekly)));
      bars.appendChild(buildBarRow('Month', 'bar-monthly', monthPct, fmtTokens(e.tokens_monthly)));
      card.appendChild(bars);

      // Activity
      var actDiv = el('div', { className: 'tm-activity' });
      if (e.type === 'bot') {
        var isActive = e.activity && e.activity !== 'idle' && e.activity !== 'unknown';
        actDiv.appendChild(el('div', { className: 'tm-activity-dot' + (isActive ? '' : ' idle') }));
        actDiv.appendChild(txt((e.activity || 'idle') + ' @ ' + (e.location || '?')));
        if (e.mood) actDiv.appendChild(txt(' \u00B7 ' + e.mood));
      } else {
        actDiv.appendChild(el('div', { className: 'tm-activity-dot idle' }));
        actDiv.appendChild(txt((e.tool_calls_today || 0) + ' calls, ' + (e.sessions_today || 0) + ' sessions'));
      }
      card.appendChild(actDiv);

      // Budget controls
      var controls = el('div', { className: 'tm-budget-controls' });
      controls.appendChild(el('label', {}, 'Budget'));

      var slider = el('input', {
        type: 'range', className: 'tm-budget-slider',
        min: '1000', max: '200000', step: '1000',
        value: String(budget), 'data-budget-id': id
      });
      var numInput = el('input', {
        type: 'number', className: 'tm-budget-input',
        value: String(budget), 'data-budget-input': id
      });

      // Use closure for event handlers
      (function(eid, sl, ni) {
        sl.addEventListener('input', function() {
          ni.value = sl.value;
          window.updateBudget(eid, sl.value);
        });
        ni.addEventListener('change', function() {
          sl.value = ni.value;
          window.updateBudget(eid, ni.value);
        });
      })(id, slider, numInput);

      controls.appendChild(slider);
      controls.appendChild(numInput);
      card.appendChild(controls);

      grid.appendChild(card);
    });
  }

  // --- Render Sessions Table (safe DOM) ---
  function renderSessions(data) {
    var tbody = document.getElementById('sessionsBody');
    if (!tbody) return;
    var sessions = (data && data.active_sessions) || [];
    tbody.textContent = '';

    if (sessions.length === 0) {
      var row = el('tr');
      row.appendChild(el('td', { colspan: '7', style: 'color:var(--muted);text-align:center;padding:20px;' }, 'No sessions today'));
      tbody.appendChild(row);
      return;
    }

    sessions.forEach(function (s) {
      var row = el('tr');
      row.appendChild(el('td', { style: 'font-family:monospace;font-size:11px;' }, s.session_id || '--'));
      row.appendChild(el('td', {}, s.project || '--'));
      row.appendChild(el('td', { style: 'font-size:11px;' }, s.entrypoint || '--'));
      row.appendChild(el('td', { style: 'font-weight:800;' }, String(s.tool_calls || 0)));
      row.appendChild(el('td', {}, String(s.agent_spawns || 0)));
      row.appendChild(el('td', {}, (s.duration_min || 0) + 'm'));

      var toolsCell = el('td', { style: 'font-size:10px;' });
      if (s.top_tools) {
        Object.entries(s.top_tools).slice(0, 3).forEach(function (t) {
          toolsCell.appendChild(el('span', {
            style: 'background:var(--card);padding:1px 5px;border-radius:3px;margin-right:3px;'
          }, t[0] + ':' + t[1]));
        });
      }
      row.appendChild(toolsCell);
      tbody.appendChild(row);
    });
  }

  // --- Render Model Usage (safe DOM) ---
  function renderModelUsage(data) {
    var grid = document.getElementById('modelUsageGrid');
    if (!grid || !data || !data.stats_cache) return;
    var models = data.stats_cache.model_usage || {};
    var stale = data.stats_cache.source === 'stale';

    grid.textContent = '';

    var modelEntries = Object.entries(models);
    if (modelEntries.length === 0) {
      grid.appendChild(el('div', { style: 'color:var(--muted);padding:20px;' }, 'No model usage data available'));
      return;
    }

    modelEntries.forEach(function (pair) {
      var model = pair[0];
      var u = pair[1];
      var shortName = model.replace('claude-', '').replace(/-20\d{6}/, '');

      var card = el('div', { className: 'tm-card', style: 'cursor:default;' });

      var header = el('div', { className: 'tm-card-header' });
      header.appendChild(el('div', { className: 'tm-avatar', style: 'font-size:14px;' }, '\uD83E\uDDE0'));
      var nameBlock = el('div', { className: 'tm-name-block' });
      nameBlock.appendChild(el('div', { className: 'tm-name' }, shortName));
      nameBlock.appendChild(el('div', { className: 'tm-rank-badge' }, stale ? '\u26A0\uFE0F Stale data' : '\u2705 Live'));
      header.appendChild(nameBlock);
      card.appendChild(header);

      var bars = el('div', { className: 'tm-bars' });
      bars.appendChild(buildBarRow('In', 'bar-daily', 0, fmtTokens(u.input)));
      bars.appendChild(buildBarRow('Out', 'bar-weekly', 0, fmtTokens(u.output)));
      bars.appendChild(buildBarRow('Cache', 'bar-monthly', 0, fmtTokens(u.cache_read)));
      card.appendChild(bars);

      card.appendChild(el('div', { className: 'tm-activity' }, 'Billable est: ' + fmtTokens(u.billable_estimate)));
      grid.appendChild(card);
    });
  }

  // --- Budget Update ---
  window.updateBudget = function (entityId, value) {
    var v = parseInt(value, 10);
    if (isNaN(v) || v < 0) return;
    localBudgets[entityId + '_daily'] = v;
    localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(localBudgets));
    saveBudgetToFirestore(entityId, v);
    if (currentState) renderCards(currentState);
  };

  function saveBudgetToFirestore(entityId, value) {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    try {
      var db = firebase.firestore();
      var update = {};
      update[entityId + '_daily'] = value;
      db.collection(CONFIG_COLLECTION).doc('budgets').set(update, { merge: true })
        .catch(function () { /* silent */ });
    } catch (e) { /* silent */ }
  }

  // --- View Toggle ---
  window.setView = function (view) {
    currentView = view;
    document.querySelectorAll('.tm-view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.getElementById('cardGrid').style.display = view === 'grid' ? '' : 'none';
    document.getElementById('filterBar').style.display = view === 'grid' ? '' : 'none';
    document.getElementById('sessionsPanel').style.display = view === 'sessions' ? '' : 'none';
  };

  // --- Filter ---
  window.setFilter = function (filter) {
    currentFilter = filter;
    document.querySelectorAll('.tm-filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    if (currentState) renderCards(currentState);
  };

  // --- Sort ---
  window.sortCards = function (sort) {
    currentSort = sort;
    if (currentState) renderCards(currentState);
  };

  // --- Load Data ---
  function loadData() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      loadFromFirestore();
    } else {
      loadDemoState();
    }
  }

  function loadFromFirestore() {
    try {
      var db = firebase.firestore();
      db.collection(FIRESTORE_COLLECTION).doc('current_state').get()
        .then(function (doc) {
          if (doc.exists) {
            currentState = doc.data();
            renderAll(currentState);
          } else {
            loadDemoState();
          }
        })
        .catch(function () { loadDemoState(); });

      db.collection(CONFIG_COLLECTION).doc('budgets').get()
        .then(function (doc) {
          if (doc.exists) {
            var fb = doc.data();
            Object.keys(fb).forEach(function (k) {
              if (!localBudgets[k]) localBudgets[k] = fb[k];
            });
            localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(localBudgets));
          }
        })
        .catch(function () { /* silent */ });
    } catch (e) {
      loadDemoState();
    }
  }

  function loadDemoState() {
    currentState = {
      timestamp: new Date().toISOString(),
      version: 1,
      plan_budget: {
        daily_budget: 500000, used_today: 0, used_this_week: 0, used_this_month: 0,
        pct_today: 0, zone: 'green', sessions_today: 0, tool_calls_today: 0, agent_spawns_today: 0
      },
      entities: {
        'commander': { type:'bot', icon:'\u2694\uFE0F', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'town_square', activity:'idle', mood:'ready', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'active' },
        'tax-specialist': { type:'bot', icon:'\uD83D\uDCCA', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'shop', activity:'idle', mood:'diligent', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'active' },
        'security-auditor': { type:'bot', icon:'\uD83D\uDEE1\uFE0F', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'gate', activity:'guarding', mood:'vigilant', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'active' },
        'jaz': { type:'bot', icon:'\uD83D\uDC9C', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'clinic', activity:'idle', mood:'warm', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'villager' },
        'birdbot': { type:'bot', icon:'\uD83D\uDC26', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'shoulder', activity:'watching', mood:'alert', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'augment' },
        'creative': { type:'bot', icon:'\uD83C\uDFA8', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'workshop', activity:'idle', mood:'inspired', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'villager' },
        'analyst': { type:'bot', icon:'\uD83D\uDD2C', tokens_daily:0, tokens_weekly:0, tokens_monthly:0, budget_daily:50000, budget_pct:0, zone:'grey', tool_calls_today:0, location:'library', activity:'idle', mood:'curious', rank:'Seedling', rank_emoji:'\uD83C\uDF31', xp:0, status:'villager' }
      },
      alerts: [],
      stats_cache: { source: 'demo', model_usage: {} },
      active_sessions: [],
      scout_health: { stats_scout:'pending', sessions_scout:'pending', village_state:'pending', last_run:null }
    };
    renderAll(currentState);
  }

  // --- Render All ---
  function renderAll(data) {
    renderBudgetStrip(data);
    renderAlerts(data);
    renderCards(data);
    renderSessions(data);
    renderModelUsage(data);
  }

  // --- Helpers ---
  function setText(id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function timeAgo(ts) {
    if (!ts) return '--';
    try {
      var diff = Date.now() - new Date(ts).getTime();
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
      return Math.round(diff / 86400000) + 'd ago';
    } catch (e) { return '--'; }
  }

  // --- Init on auth ---
  document.addEventListener('fpcs-authed', function () {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-content').style.display = '';
    loadData();
    setInterval(loadData, REFRESH_INTERVAL);
  });

  // Fallback: if no auth system, show content after 2s
  setTimeout(function () {
    if (document.getElementById('main-content').style.display === 'none') {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('main-content').style.display = '';
      loadData();
      setInterval(loadData, REFRESH_INTERVAL);
    }
  }, 2000);

})();
