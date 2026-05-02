/* ============================================================
   JustOut Hub — Constellation Engine
   Particle starfield + orb rendering + zoom transitions
   ============================================================ */
(function () {
  'use strict';

  // ---- Channel Data (inline for zero-fetch, mirrors channels.json) ----
  var CHANNELS = [
    { id:'gegenkraft', name:'Gegenkraft', sub:'hub.justout.today/gegenkraft/',   desc:'Daily declaration \u2014 Habit breaker', type:'star', color:'#f87171', deep:'#7f1d1d', icon:'\uD83D\uDD25', status:'live', count:0, phase:0 },
    { id:'journal', name:'Living Journal', sub:'hub.justout.today/living-journal/', desc:'Memories arrive; entries grow', type:'nebula', color:'#c084fc', deep:'#581c87', icon:'\uD83D\uDCD6', status:'live', count:2, phase:0 },
    { id:'fpcs-shop', name:'FPCS Shop', sub:'hub.justout.today/fpcs/', desc:'Refurbished laptops \u0026 IT services', type:'crystal', color:'#22c55e', deep:'#166534', icon:'\uD83D\uDCBB', status:'live', count:3, phase:0 },
    { id:'appraisal', name:'Task Appraisal', sub:'hub.justout.today/appraisal.html', desc:'Mission Control \u2014 All tasks', type:'gem', color:'#fbbf24', deep:'#78350f', icon:'\uD83D\uDCCB', status:'live', count:23, phase:0 },
    { id:'fpcs',   name:'FPCS',          sub:'dashboard.justout.today',          desc:'Friendly PC Support \u2014 Tech Jobs & Invoices', type:'crystal', color:'#4ade80', deep:'#166534', icon:'\uD83D\uDDA5\uFE0F', status:'live', count:0, phase:0 },
    { id:'tax',    name:'Tax HQ',        sub:'dashboard.justout.today',          desc:'FPCS 2022 Tax Dashboard',       type:'star',    color:'#38bdf8', deep:'#1e3a5f', icon:'\uD83D\uDCCA', status:'live',    count:1185, phase:0 },
    { id:'bots',   name:'Bot HQ',        sub:'dashboard.justout.today/bots.html',desc:'Realbotville \u2014 Bot Fleet',  type:'gem',     color:'#a78bfa', deep:'#4c1d95', icon:'\uD83E\uDD16', status:'live',    count:16,   phase:0 },
    { id:'simswap',name:'SIM Swap Detector',sub:'hub.justout.today/SimSwapDetect/',desc:'Detect & prevent SIM swap fraud', type:'crystal', color:'#ff4444', deep:'#7f1d1d', icon:'\uD83D\uDCF1', status:'live',    count:14,   phase:0 },
    { id:'jap',    name:'JAP HQ',          sub:'hub.justout.today/JapHQ/',        desc:'Voice Command Center',           type:'nebula',  color:'#00e5ff', deep:'#004d5a', icon:'\uD83D\uDDE3\uFE0F', status:'live', count:0,  phase:0 },
    { id:'helpdesk',name:'Helpdesk',     sub:'helpdesk.justout.today', desc:'Issues & Project Tracker',  type:'star',   color:'#fb923c', deep:'#7c2d12', icon:'\uD83C\uDF9B', status:'live', count:0, phase:0 },
    { id:'security',name:'SentryLion',   sub:'dashboard.justout.today/sentrylion.html', desc:'Endpoint Security & Fleet Protection', type:'prism', color:'#f97316', deep:'#7c2d12', icon:'\uD83E\uDD81', status:'live', count:0, phase:0 },
    { id:'notes',  name:'Ideas',         sub:'notes.justout.today',              desc:'Quick capture & organize',       type:'star',    color:'#38bdf8', deep:'#0c4a6e', icon:'\uD83D\uDCA1', status:'planned', count:0,    phase:1 },
    { id:'music',  name:'Music',         sub:'music.justout.today',              desc:'Your music library',             type:'gem',     color:'#a78bfa', deep:'#5b21b6', icon:'\uD83C\uDFB5', status:'planned', count:0,    phase:1 },
    { id:'aimusic',name:'AI Music',      sub:'aimusic.justout.today',            desc:'AI creation & experiments',      type:'crystal', color:'#f472b6', deep:'#831843', icon:'\uD83C\uDFB9', status:'planned', count:0,    phase:1 },
    { id:'books',  name:'Books',         sub:'books.justout.today',              desc:'Reading list & quotes',          type:'gem',     color:'#fbbf24', deep:'#78350f', icon:'\uD83D\uDCDA', status:'planned', count:0,    phase:1 },
    { id:'art',    name:'Art',           sub:'art.justout.today',                desc:'Gallery & creations',            type:'prism',   color:'#2dd4bf', deep:'#134e4a', icon:'\uD83C\uDFA8', status:'planned', count:0,    phase:1 },
    { id:'food',   name:'Food',          sub:'food.justout.today',               desc:'Restaurants & recipes',          type:'crystal', color:'#fb923c', deep:'#7c2d12', icon:'\uD83C\uDF54', status:'planned', count:0,    phase:1 },
    { id:'movies', name:'Movies',        sub:'movies.justout.today',             desc:'Watchlist & ratings',            type:'gem',     color:'#f87171', deep:'#7f1d1d', icon:'\uD83C\uDFAC', status:'planned', count:0,    phase:2 },
    { id:'youtube',name:'My YouTube',    sub:'myyoutube.justout.today',          desc:'Curated favorites',              type:'star',    color:'#fb923c', deep:'#9a3412', icon:'\u25B6\uFE0F', status:'planned', count:0,    phase:2 },
    { id:'ai',     name:'AI Lab',        sub:'ai.justout.today',                 desc:'AI tools & prompts',             type:'prism',   color:'#60a5fa', deep:'#1e3a8a', icon:'\uD83E\uDDE0', status:'planned', count:0,    phase:2 },
    { id:'health', name:'Health',        sub:'health.justout.today',             desc:'Tracking & wellness',            type:'star',    color:'#4ade80', deep:'#14532d', icon:'\uD83D\uDC9A', status:'planned', count:0,    phase:2 },
    { id:'bizcard',name:'Business Card', sub:'businesscard.justout.today',       desc:'Digital contact & portfolio',    type:'crystal', color:'#fbbf24', deep:'#713f12', icon:'\uD83D\uDCBC', status:'planned', count:0,    phase:2 },
    { id:'dreams', name:'Dreams',        sub:'dreams.justout.today',             desc:'Dream journal & patterns',       type:'nebula',  color:'#818cf8', deep:'#312e81', icon:'\uD83C\uDF19', status:'planned', count:0,    phase:3 },
    { id:'meditation',name:'Meditation',  sub:'meditation.justout.today',         desc:'Guided sessions & streaks',      type:'nebula',  color:'#c084fc', deep:'#581c87', icon:'\uD83E\uDDD8', status:'planned', count:0,    phase:3 },
    { id:'goodnews',name:'Good News',    sub:'thegoodnews.justout.today',        desc:'Positive stories',               type:'star',    color:'#fbbf24', deep:'#854d0e', icon:'\u2728',       status:'planned', count:0,    phase:3 },
    { id:'games',  name:'Games',         sub:'games.justout.today',              desc:'Library & achievements',         type:'prism',   color:'#4ade80', deep:'#166534', icon:'\uD83C\uDFAE', status:'planned', count:0,    phase:3 }
  ];

  // ---- Sizing: orb diameter based on content count ----
  var BASE_SIZE = 70;   // min px
  var MAX_SIZE = 140;   // max px
  var SCALE_FACTOR = 0.04;

  function orbSize(count) {
    var s = BASE_SIZE + (count * SCALE_FACTOR);
    return Math.min(Math.max(s, BASE_SIZE), MAX_SIZE);
  }

  // ---- Deterministic "random" per orb for organic feel ----
  function seededRand(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  // ============================================================
  //  PARTICLE STARFIELD
  // ============================================================
  function initStarfield() {
    var canvas = document.getElementById('cosmosCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var stars = [];
    var shootingStars = [];
    var STAR_COUNT = 200;
    var SHOOTING_INTERVAL = 4000; // ms between shooting stars

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create static stars
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.2,
        alpha: 0,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        // Slight color variation
        hue: Math.random() < 0.15 ? (Math.random() * 60 + 200) : 0, // some blue-ish
        sat: Math.random() < 0.15 ? 40 : 0
      });
    }

    // Shooting star spawner
    var lastShoot = 0;
    function maybeSpawnShooting(now) {
      if (now - lastShoot > SHOOTING_INTERVAL + Math.random() * 3000) {
        lastShoot = now;
        shootingStars.push({
          x: Math.random() * canvas.width * 0.8,
          y: Math.random() * canvas.height * 0.3,
          vx: 3 + Math.random() * 4,
          vy: 1 + Math.random() * 2,
          life: 1,
          decay: 0.015 + Math.random() * 0.01,
          len: 40 + Math.random() * 60
        });
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle nebula glow spots
      ctx.globalCompositeOperation = 'screen';
      drawNebulaGlow(ctx, canvas.width * 0.2, canvas.height * 0.3, 300, 'rgba(56,189,248,0.015)');
      drawNebulaGlow(ctx, canvas.width * 0.75, canvas.height * 0.6, 250, 'rgba(167,139,250,0.012)');
      drawNebulaGlow(ctx, canvas.width * 0.5, canvas.height * 0.8, 200, 'rgba(244,114,182,0.01)');
      ctx.globalCompositeOperation = 'source-over';

      // Static stars with twinkle
      var t = now * 0.001;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed * 60 + s.twinklePhase) * 0.3;
        if (s.alpha < 0.05) s.alpha = 0.05;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.hue > 0) {
          ctx.fillStyle = 'hsla(' + s.hue + ',' + s.sat + '%,80%,' + s.alpha + ')';
        } else {
          ctx.fillStyle = 'rgba(226,232,240,' + s.alpha + ')';
        }
        ctx.fill();
      }

      // Shooting stars
      maybeSpawnShooting(now);
      for (var j = shootingStars.length - 1; j >= 0; j--) {
        var ss = shootingStars[j];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= ss.decay;
        if (ss.life <= 0) { shootingStars.splice(j, 1); continue; }
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * ss.len * 0.15, ss.y - ss.vy * ss.len * 0.15);
        var grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * ss.len * 0.15, ss.y - ss.vy * ss.len * 0.15);
        grad.addColorStop(0, 'rgba(255,255,255,' + ss.life * 0.8 + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      requestAnimationFrame(draw);
    }

    function drawNebulaGlow(ctx, cx, cy, r, color) {
      var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grd.addColorStop(0, color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    requestAnimationFrame(draw);
  }

  // ============================================================
  //  CONSTELLATION BUILDER
  // ============================================================
  function buildConstellation() {
    var container = document.getElementById('constellation');
    if (!container) return;

    CHANNELS.forEach(function (ch, idx) {
      var size = orbSize(ch.count);
      var isLive = ch.status === 'live';

      // Organic offsets using seeded randomness
      var seed = idx * 7 + 3;
      var driftDur = (5 + seededRand(seed) * 4).toFixed(1) + 's';
      var driftDelay = (seededRand(seed + 1) * 3).toFixed(1) + 's';
      var pulseDur = (3 + seededRand(seed + 2) * 3).toFixed(1) + 's';
      var pulseDelay = (seededRand(seed + 3) * 2).toFixed(1) + 's';
      var driftY = (-4 - seededRand(seed + 4) * 8).toFixed(1) + 'px';
      var driftX = (-3 + seededRand(seed + 5) * 6).toFixed(1) + 'px';

      var orbEl = document.createElement('div');
      orbEl.className = 'orb-container' + (isLive ? '' : ' orb-planned');
      orbEl.setAttribute('data-channel', ch.id);
      orbEl.setAttribute('data-subdomain', ch.sub);
      orbEl.setAttribute('data-status', ch.status);
      orbEl.style.cssText = [
        '--orb-size:' + size + 'px',
        '--orb-color:' + ch.color,
        '--orb-deep:' + ch.deep,
        '--drift-dur:' + driftDur,
        '--drift-delay:' + driftDelay,
        '--pulse-dur:' + pulseDur,
        '--pulse-delay:' + pulseDelay,
        '--drift-y:' + driftY,
        '--drift-x:' + driftX
      ].join(';');

      orbEl.innerHTML = [
        '<div class="orb-type-' + ch.type + '" style="position:relative;width:var(--orb-size);height:var(--orb-size)">',
        '  <div class="orb-glow"></div>',
        '  <div class="orb-ring"></div>',
        '  <div class="orb"></div>',
        '  <div class="orb-icon">' + ch.icon + '</div>',
        '</div>',
        isLive
          ? '<span class="orb-status orb-status-live">LIVE</span>'
          : '<span class="orb-status orb-status-planned">SOON</span>',
        '<div class="orb-label">',
        '  <div class="orb-name">' + ch.name + '</div>',
        '  <div class="orb-desc">' + ch.desc + '</div>',
        '</div>'
      ].join('');

      // Click handler
      orbEl.addEventListener('click', function () {
        handleOrbClick(ch);
      });

      container.appendChild(orbEl);
    });
  }

  // ============================================================
  //  ZOOM TRANSITION
  // ============================================================
  function handleOrbClick(channel) {
    if (channel.status !== 'live') {
      showComingSoon(channel);
      return;
    }

    var overlay = document.getElementById('zoomOverlay');
    var zOrb = document.getElementById('zoomOrb');
    var zLabel = document.getElementById('zoomLabel');
    var zStatus = document.getElementById('zoomStatus');

    if (!overlay || !zOrb || !zLabel || !zStatus) return;

    // Set zoom orb color
    zOrb.style.background = 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ' + channel.color + ', ' + channel.deep + ')';
    zOrb.style.boxShadow = '0 0 60px ' + channel.color + ', 0 0 120px ' + channel.deep;
    zLabel.textContent = channel.name;
    zLabel.style.color = channel.color;
    zStatus.textContent = 'Entering ' + channel.name + '...';

    // Trigger animation
    overlay.classList.add('active');

    // Navigate after zoom-expand animation completes (1.2s)
    setTimeout(function () {
      window.location.href = 'https://' + channel.sub;
    }, 1300);
  }

  function showComingSoon(channel) {
    // Brief visual feedback for planned channels
    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:9999',
      'background:rgba(15,23,42,0.95);border:1px solid ' + channel.color,
      'border-radius:12px;padding:16px 28px;text-align:center',
      'backdrop-filter:blur(12px);box-shadow:0 8px 40px rgba(0,0,0,0.5)',
      'animation:toast-in 0.3s ease-out'
    ].join(';');
    toast.innerHTML = [
      '<div style="font-size:28px;margin-bottom:6px">' + channel.icon + '</div>',
      '<div style="font-weight:700;color:' + channel.color + ';font-size:15px">' + channel.name + '</div>',
      '<div style="color:#94a3b8;font-size:12px;margin-top:4px">Coming in Phase ' + channel.phase + '</div>'
    ].join('');

    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // ============================================================
  //  INIT — Wait for auth, then build
  // ============================================================
  document.addEventListener('justout-authed', function () {
    initStarfield();
    buildConstellation();
  });

})();
