/* ============================================================
   Task Appraisal Dashboard — JustOut Universe
   Reads APPRAISAL_MASTER data and renders visual dashboard
   ============================================================ */
(function () {
  'use strict';

  // Task data (mirrors APPRAISAL_MASTER.txt)
  var TASKS = [
    { id:'JOH-P0-001', tier:'P0', name:'Gegenkraft Daily Declaration', project:'Gegenkraft / Health', summary:'Generate fresh 30-day sheet. Run morning declaration. Set accountability ping.', assigned:'Claude Opus 4.6', branch:'claude/gagenkraft-gambling-moves-Ykkih', transpired:'~3 hrs', eta:'1-2 hrs', burner:'front', human:false },
    { id:'JOH-P0-002', tier:'P0', name:'Tax Pipeline Audit (2022-2025)', project:'FPCS / Tax HQ', summary:'Open Tax HQ, mark each year 2022-2025 as filed/in-prep/not-started.', assigned:'Commander', branch:null, transpired:'0 hrs', eta:'1-2 hrs', burner:'front', human:true },
    { id:'JOH-P0-003', tier:'P0', name:'Twitch Recorder Verdict', project:'Twitch Recorder', summary:'Write one sentence of purpose, or git rm -r twitch-recorder/.', assigned:'Commander', branch:null, transpired:'~5 hrs', eta:'10 min', burner:'front', human:true },
    { id:'JOH-P0-004', tier:'P0', name:'Repo Cleanup (mp4 + key)', project:'Infrastructure', summary:'Remove ~74MB mp4 from working tree. Verify service-account-key.json gitignored.', assigned:'Claude Sonnet 4.6', branch:null, transpired:'0 hrs', eta:'1-2 hrs', burner:'front', human:false },
    { id:'JOH-P0-005', tier:'P0', name:'SIM Swap Self-Audit', project:'SIM Swap / Security', summary:'Apply 7-step SIM swap prevention protocol to own carrier accounts.', assigned:'Commander', branch:'claude/detect-sim-swap-fraud-zsMQC', transpired:'~3 hrs', eta:'1-2 hrs', burner:'front', human:true },
    { id:'JOH-P1-001', tier:'P1', name:'JAP Phase 1 Scope Freeze', project:'JAP HQ / Voice', summary:'Define Phase 1 done-criteria in 5 bullets. Stop redesigning. Build to that scope.', assigned:'Claude Opus 4.6', branch:'claude/jap-integration-research-vMknA', transpired:'~8 hrs', eta:'2-3 hrs + 15-25 hrs build', burner:'front', human:false },
    { id:'JOH-P1-002', tier:'P1', name:'CoolThAIngs - Pick Lane', project:'CoolThAIngs / AI', summary:'Pick one of 5 leads (recommended: Booking Bots). Target: one paying client by June.', assigned:'Commander + Opus', branch:null, transpired:'~3 hrs', eta:'20-40 hrs', burner:'front', human:true },
    { id:'JOH-P1-003', tier:'P1', name:'Bot HQ P&L Pass', project:'Bot HQ / Realbotville', summary:'For each of 16 bots: document purpose, earning/costing/strategic, monthly $.', assigned:'Commander + Haiku', branch:null, transpired:'0 hrs', eta:'3-5 hrs', burner:'mid', human:true },
    { id:'JOH-P1-004', tier:'P1', name:'Helpdesk vs SentryLion', project:'Helpdesk + SentryLion', summary:'Adopt one as canonical tracker; retire or repurpose the other.', assigned:'Commander', branch:null, transpired:'~1 hr', eta:'30 min + 3-5 hrs', burner:'mid', human:true },
    { id:'JOH-P1-005', tier:'P1', name:'Gegenkraft 30-Day Streak', project:'Gegenkraft / Health', summary:'Maintain unbroken 30-day morning declaration streak. Track via Sheets.', assigned:'Commander + The Finger', branch:'claude/urgent-task-reminder-email-ELFB0', transpired:'~6 hrs', eta:'30 days (ongoing)', burner:'front', human:true },
    { id:'JOH-P1-006', tier:'P1', name:'Security Hardening Merge', project:'Infrastructure / Security', summary:'CSP headers, SRI hashes, Firebase auth gate on all public pages.', assigned:'Claude Opus 4.6', branch:'claude/read-onboarding-L0PiX', transpired:'~5 hrs', eta:'1-2 hrs', burner:'front', done:true },
    { id:'JOH-P1-007', tier:'P1', name:'Journal Auth Merge', project:'Living Journal / Security', summary:'Private-by-default directive and Firebase auth gate on Living Journal.', assigned:'Claude Opus 4.6', branch:'claude/private-by-default-and-journal-auth', transpired:'~2 hrs', eta:'1 hr', burner:'front', done:true },
    { id:'JOH-P1-008', tier:'P1', name:'Claude Visit', project:'FPCS / Business Tools', summary:'Hyper-V VM provisioner for testing Claude Visit installer.', assigned:'Claude Opus 4.6', branch:'claude/remote-code-execution-EK3mb', transpired:'~5 hrs', eta:'2-3 hrs', burner:'mid', human:false },
    { id:'JOH-P2-001', tier:'P2', name:'Living Journal Weaving', project:'Living Journal', summary:'1 thread, 2 fragments, 1 sprouting entry. Capture + weave cycle needs to begin.', assigned:'Claude Opus 4.6', branch:'claude/organize-life-projects-ZcxLG', transpired:'~6 hrs', eta:'Ongoing', burner:'front', human:false },
    { id:'JOH-P2-002', tier:'P2', name:'channels.json Reconcile', project:'JustOut Hub', summary:'Reconcile channels.json with LIFE.md roadmap. Planned = actual priority.', assigned:'Claude Sonnet 4.6', branch:null, transpired:'0 hrs', eta:'1-2 hrs', burner:'mid', human:false },
    { id:'JOH-P3-001', tier:'P3', name:'Phase 1 Channels (6)', project:'Channels', summary:'Ideas, Music, AI Music, Books, Art, Food. Blocked on JAP P1 + Gegenkraft streak.', assigned:'Frozen', branch:null, transpired:'0 hrs', eta:'Blocked', burner:'back', human:false },
    { id:'JOH-P3-002', tier:'P3', name:'Phase 2 Channels (5)', project:'Channels', summary:'Movies, YouTube, AI Lab, Health, Business Card. Only after Phase 1 in use.', assigned:'Frozen', branch:null, transpired:'0 hrs', eta:'Blocked', burner:'back', human:false },
    { id:'JOH-P3-003', tier:'P3', name:'Phase 3 Channels (4)', project:'Channels', summary:'Dreams, Meditation, Good News, Games. Horizon: late 2026/2027.', assigned:'Frozen', branch:null, transpired:'0 hrs', eta:'Horizon', burner:'back', human:false },
    { id:'JOH-NEW-001', tier:'NEW', name:'Merge Backlog Flush', project:'Infrastructure', summary:'6 branches have completed work sitting unmerged. Review and merge or close.', assigned:'Claude Opus 4.6', branch:null, transpired:'0 hrs', eta:'3-5 hrs', burner:'front', immediate:true, human:false },
    { id:'JOH-NEW-002', tier:'NEW', name:'Bot Fleet Inventory', project:'Bot HQ', summary:'13 of 16 bots undocumented. Audit what each does before P&L pass.', assigned:'Commander + Haiku', branch:null, transpired:'0 hrs', eta:'2-3 hrs', burner:'mid', human:true },
    { id:'JOH-NEW-003', tier:'NEW', name:'Weekly Scorecard Update', project:'LIFE.md', summary:'Part VII cadence: weekly Sun 20-min scorecard update. First one overdue.', assigned:'Commander + Sonnet', branch:null, transpired:'0 hrs', eta:'20 min/week', burner:'mid', human:true },
    { id:'JOH-NEW-004', tier:'NEW', name:'Session-Start Hook', project:'Infrastructure', summary:'Current hook only installs deps. Should also print NOW items from LIFE.md.', assigned:'Claude Sonnet 4.6', branch:null, transpired:'0 hrs', eta:'30 min', burner:'mid', done:true, human:false },
    { id:'JOH-NEW-005', tier:'NEW', name:'Gegenkraft Sheet Gen', project:'Gegenkraft', summary:'LIFE.md says generate 30-day sheet starting 2026-04-25. Overdue.', assigned:'Claude Opus 4.6', branch:null, transpired:'0 hrs', eta:'30 min', burner:'front', immediate:true, human:false }
  ];

  var BRANCHES = [
    { name:'claude/read-onboarding-L0PiX', commits:3, desc:'Security hardening (CSP, SRI, auth gates)', merged:false },
    { name:'claude/private-by-default-and-journal-auth', commits:1, desc:'Journal auth gate', merged:false },
    { name:'claude/remote-code-execution-EK3mb', commits:3, desc:'Claude Visit installer + VM provisioner', merged:false },
    { name:'claude/gagenkraft-gambling-moves-Ykkih', commits:1, desc:'Gegenkraft Buddy app', merged:false },
    { name:'claude/detect-sim-swap-fraud-zsMQC', commits:1, desc:'Dark Twin Detector', merged:false },
    { name:'claude/urgent-task-reminder-email-ELFB0', commits:3, desc:'The Finger (Sheet scanner + reminders)', merged:false },
    { name:'claude/organize-life-projects-ZcxLG', commits:3, desc:'Living Journal + LIFE.md', merged:true },
    { name:'claude/jap-integration-research-vMknA', commits:4, desc:'JAP HQ Phase 0 architecture', merged:false }
  ];

  var AGENTS = [
    { name:'Claude Opus 4.6', role:'Architect', color:'#a78bfa', tasks:['P0-001','P1-001','P1-006','P1-007','P1-008','P2-001','NEW-001','NEW-005'] },
    { name:'Claude Sonnet 4.6', role:'Builder', color:'#38bdf8', tasks:['P0-004','P2-002','NEW-004'] },
    { name:'Claude Haiku 4.5', role:'Assistant', color:'#4ade80', tasks:['P1-003'] },
    { name:'Commander', role:'Human Lead', color:'#fb923c', tasks:['P0-002','P0-003','P0-005','P1-002','P1-003','P1-004','P1-005','NEW-002','NEW-003'] },
    { name:'The Finger', role:'Bot (Sheet Scanner)', color:'#f472b6', tasks:['P1-005'] },
    { name:'Gegenkraft Buddy', role:'Bot (Accountability)', color:'#fbbf24', tasks:['P0-001'] }
  ];

  var TIER_META = {
    'P0': { label:'DO NOW', badge:'tier-badge-p0', stripe:'task-card-stripe-p0' },
    'P1': { label:'ACTIVE FOCUS', badge:'tier-badge-p1', stripe:'task-card-stripe-p1' },
    'P2': { label:'DECIDE/FINISH', badge:'tier-badge-p2', stripe:'task-card-stripe-p2' },
    'P3': { label:'FROZEN', badge:'tier-badge-p3', stripe:'task-card-stripe-p3' },
    'NEW': { label:'GAP (NEW)', badge:'tier-badge-new', stripe:'task-card-stripe-new' }
  };

  function escapeHTML(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // ============================================================
  //  SUMMARY STRIP
  // ============================================================
  function buildSummary() {
    var el = document.getElementById('summaryStrip');
    if (!el) return;

    var total = TASKS.length;
    var p0 = TASKS.filter(function(t){ return t.tier === 'P0'; }).length;
    var active = TASKS.filter(function(t){ return t.tier === 'P0' || t.tier === 'P1'; }).length;
    var done = TASKS.filter(function(t){ return t.done; }).length;
    var unmerged = BRANCHES.filter(function(b){ return !b.merged; }).length;
    var humanBlocked = TASKS.filter(function(t){ return t.human && !t.done; }).length;

    var cards = [
      { value: total, label: 'Total Tasks', color: 'var(--text)' },
      { value: p0, label: 'P0 - Do Now', color: 'var(--red)' },
      { value: active, label: 'Active (P0+P1)', color: 'var(--yellow)' },
      { value: done, label: 'Work Done', color: 'var(--green)' },
      { value: unmerged, label: 'Unmerged Branches', color: 'var(--accent)' },
      { value: humanBlocked, label: 'Waiting on Human', color: 'var(--orange)' }
    ];

    el.innerHTML = cards.map(function(c) {
      return [
        '<div class="summary-card">',
        '  <div class="summary-value" style="color:' + c.color + '">' + c.value + '</div>',
        '  <div class="summary-label">' + escapeHTML(c.label) + '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  // ============================================================
  //  BURNER GAUGE
  // ============================================================
  function buildBurners() {
    var el = document.getElementById('burnerSection');
    if (!el) return;

    var lanes = [
      { key:'front', label:'Front Burner', dot:'burner-dot-front', color:'var(--red)' },
      { key:'mid', label:'Mid Burner', dot:'burner-dot-mid', color:'var(--yellow)' },
      { key:'back', label:'Deep Back', dot:'burner-dot-back', color:'var(--muted)' }
    ];

    var html = '<div class="section-title">Burner Status</div>';
    html += '<div class="burner-lanes">';

    lanes.forEach(function(lane) {
      var tasks = TASKS.filter(function(t) { return t.burner === lane.key; });
      html += '<div class="burner-lane">';
      html += '<div class="burner-label"><span class="burner-dot ' + lane.dot + '"></span> ' + lane.label + ' (' + tasks.length + ')</div>';
      tasks.forEach(function(t) {
        var nameColor = t.done ? 'var(--green)' : (t.immediate ? 'var(--red)' : 'var(--text)');
        var suffix = t.done ? ' [DONE]' : (t.immediate ? ' [IMMEDIATE]' : '');
        html += '<div class="burner-task">';
        html += '  <span class="burner-task-id">' + escapeHTML(t.id) + '</span>';
        html += '  <span class="burner-task-name" style="color:' + nameColor + '">' + escapeHTML(t.name) + suffix + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  }

  // ============================================================
  //  TIER SECTION
  // ============================================================
  function buildTiers() {
    var el = document.getElementById('tierSection');
    if (!el) return;

    var tiers = ['P0','P1','P2','P3','NEW'];
    var html = '<div class="section-title">Tasks by Priority</div>';

    tiers.forEach(function(tier) {
      var tasks = TASKS.filter(function(t) { return t.tier === tier; });
      if (tasks.length === 0) return;
      var meta = TIER_META[tier];

      html += '<div class="tier-group">';
      html += '<div class="tier-header">';
      html += '  <span class="tier-badge ' + meta.badge + '">' + tier + '</span>';
      html += '  <span class="tier-subtitle">' + meta.label + ' (' + tasks.length + ' tasks)</span>';
      html += '</div>';
      html += '<div class="task-grid">';

      tasks.forEach(function(t) {
        html += '<div class="task-card">';
        html += '<div class="task-card-stripe ' + meta.stripe + '"></div>';
        html += '<div class="task-card-head">';
        html += '  <span class="task-card-id">' + escapeHTML(t.id) + '</span>';
        if (t.done) html += '  <span class="task-meta-tag task-meta-tag-done">DONE</span>';
        if (t.immediate) html += '  <span class="task-meta-tag task-meta-tag-immediate">IMMEDIATE</span>';
        html += '</div>';
        html += '<div class="task-card-title">' + escapeHTML(t.name) + '</div>';
        html += '<div class="task-card-summary">' + escapeHTML(t.summary) + '</div>';
        html += '<div class="task-card-meta">';
        if (t.human) {
          html += '<span class="task-meta-tag task-meta-tag-human">Human: ' + escapeHTML(t.assigned) + '</span>';
        } else {
          html += '<span class="task-meta-tag task-meta-tag-agent">' + escapeHTML(t.assigned) + '</span>';
        }
        html += '<span class="task-meta-tag task-meta-tag-eta">ETA: ' + escapeHTML(t.eta) + '</span>';
        if (t.branch) {
          var shortBranch = t.branch.replace('claude/', '');
          html += '<span class="task-meta-tag task-meta-tag-branch">' + escapeHTML(shortBranch) + '</span>';
        }
        html += '</div>';
        html += '</div>';
      });

      html += '</div></div>';
    });

    el.innerHTML = html;
  }

  // ============================================================
  //  AGENT WORKLOAD
  // ============================================================
  function buildAgents() {
    var el = document.getElementById('agentSection');
    if (!el) return;

    var maxTasks = 0;
    AGENTS.forEach(function(a) { if (a.tasks.length > maxTasks) maxTasks = a.tasks.length; });

    var html = '<div class="section-title">Agent Workload</div>';
    html += '<div class="agent-grid">';

    AGENTS.forEach(function(a) {
      var pct = maxTasks > 0 ? Math.round((a.tasks.length / maxTasks) * 100) : 0;
      html += '<div class="agent-card">';
      html += '  <div class="agent-name" style="color:' + a.color + '">' + escapeHTML(a.name) + '</div>';
      html += '  <div class="agent-role">' + escapeHTML(a.role) + '</div>';
      html += '  <div class="agent-bar-track"><div class="agent-bar-fill" style="width:' + pct + '%;background:' + a.color + '"></div></div>';
      html += '  <div class="agent-tasks"><span class="agent-task-count">' + a.tasks.length + '</span> tasks assigned</div>';
      html += '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  }

  // ============================================================
  //  BRANCH STATUS
  // ============================================================
  function buildBranches() {
    var el = document.getElementById('branchSection');
    if (!el) return;

    var unmerged = BRANCHES.filter(function(b) { return !b.merged; });
    var merged = BRANCHES.filter(function(b) { return b.merged; });

    var html = '<div class="section-title">Branch Status (' + unmerged.length + ' unmerged)</div>';
    html += '<div class="branch-list">';

    unmerged.concat(merged).forEach(function(b) {
      var dotClass = b.merged ? 'branch-dot-merged' : 'branch-dot-unmerged';
      var shortName = b.name.replace('claude/', '');
      html += '<div class="branch-item">';
      html += '  <span class="branch-dot ' + dotClass + '"></span>';
      html += '  <span class="branch-name">' + escapeHTML(shortName) + '</span>';
      html += '  <span class="branch-commits">' + b.commits + ' commit' + (b.commits !== 1 ? 's' : '') + '</span>';
      html += '  <span class="branch-desc">' + escapeHTML(b.desc) + '</span>';
      html += '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  }

  // ============================================================
  //  STARFIELD (reused from hub.js, simplified)
  // ============================================================
  function initStarfield() {
    var canvas = document.getElementById('cosmosCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var stars = [];
    var STAR_COUNT = 150;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.2,
        baseAlpha: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 0.012 + 0.004,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var t = now * 0.001;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed * 60 + s.twinklePhase) * 0.2;
        if (alpha < 0.05) alpha = 0.05;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226,232,240,' + alpha + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ============================================================
  //  INIT
  // ============================================================
  document.addEventListener('justout-authed', function () {
    initStarfield();
    buildSummary();
    buildBurners();
    buildTiers();
    buildAgents();
    buildBranches();
  });

})();
