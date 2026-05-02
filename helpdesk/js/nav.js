/* ============================================================
   FPCS Top Nav — Shared horizontal navigation bar injection
   Realbotville Village Command Center

   USAGE: Each page sets nav config before this script loads:

   <script>
     window.FPCS_NAV = {
       active: 'home',   // Which page is active (matches key below)
     };
   </script>
   <script src="js/nav.js"></script>
   ============================================================ */
(function () {
  'use strict';

  // --- Page Registry — absolute URLs for cross-subdomain navigation ---
  // Helpdesk lives at helpdesk.justout.today; all others at dashboard.justout.today
  var DASH = 'https://dashboard.justout.today/';
  var PAGES = [
    { key: 'home',     icon: '\u{1F3E0}', label: 'Home',       href: DASH + 'index.html' },
    { key: 'bots',     icon: '\u{1F916}', label: 'Bots',       href: DASH + 'bots.html' },
    { key: 'library',  icon: '\u{1F4DA}', label: 'Library',    href: DASH + 'library.html' },
    { key: 'helpdesk', icon: '\u{1F39B}', label: 'Helpdesk',   href: 'https://helpdesk.justout.today/' },
    { key: 'stats',    icon: '\u{1F3C6}', label: 'Stats',      href: DASH + 'stats-board.html' },
    { key: 'sentry',   icon: '\u{1F981}', label: 'SentryLion', href: DASH + 'sentrylion.html' },
    { key: 'japster',  icon: '\u{1F4BC}', label: 'Japster',    href: DASH + 'japster.html' }
  ];

  // --- Read page config ---
  var navConfig = window.FPCS_NAV || {};
  var activeKey = navConfig.active || '';

  // --- Create a nav link element ---
  function createLink(page) {
    var a = document.createElement('a');
    a.className = 'nav-link' + (page.key === activeKey ? ' active' : '');
    a.href = page.href;

    var iconSpan = document.createElement('span');
    iconSpan.className = 'nav-icon';
    iconSpan.textContent = page.icon;

    var labelSpan = document.createElement('span');
    labelSpan.className = 'nav-label';
    labelSpan.textContent = page.label;

    a.appendChild(iconSpan);
    a.appendChild(labelSpan);
    return a;
  }

  // --- Build top nav bar using DOM methods ---
  function buildTopNav() {
    var frag = document.createDocumentFragment();

    // Brand
    var brand = document.createElement('a');
    brand.className = 'nav-brand';
    brand.href = DASH + 'index.html';
    var brandIcon = document.createElement('span');
    brandIcon.className = 'nav-brand-icon';
    brandIcon.textContent = '\u{1F3D9}';
    brand.appendChild(brandIcon);
    brand.appendChild(document.createTextNode('Realbotville'));
    frag.appendChild(brand);

    // Page links
    PAGES.forEach(function (page) {
      frag.appendChild(createLink(page));
    });

    // Right side container
    var right = document.createElement('div');
    right.className = 'nav-right';

    // Radio indicator
    var radio = document.createElement('div');
    radio.className = 'nav-radio-indicator';
    radio.id = 'navRadioIndicator';
    radio.style.display = 'none';
    radio.title = 'Radio is playing';
    radio.onclick = function () { if (window.toggleRadio) window.toggleRadio(); };
    var radioNote = document.createElement('span');
    radioNote.textContent = '\u266B';
    radio.appendChild(radioNote);
    var radioLabel = document.createElement('span');
    radioLabel.textContent = 'Radio';
    radio.appendChild(radioLabel);
    right.appendChild(radio);

    // EP meter
    var epMeter = document.createElement('div');
    epMeter.className = 'nav-ep-meter';
    epMeter.id = 'navEpMeter';
    var epBolt = document.createElement('span');
    epBolt.textContent = '\u26A1';
    epMeter.appendChild(epBolt);
    var epBar = document.createElement('div');
    epBar.className = 'nav-ep-bar';
    var epFill = document.createElement('div');
    epFill.className = 'nav-ep-fill';
    epFill.id = 'navEpFill';
    epFill.style.width = '100%';
    epBar.appendChild(epFill);
    epMeter.appendChild(epBar);
    var epLabel = document.createElement('span');
    epLabel.id = 'navEpLabel';
    epLabel.textContent = '100%';
    epMeter.appendChild(epLabel);
    right.appendChild(epMeter);

    // Identity badge
    var identity = document.createElement('div');
    identity.className = 'nav-identity';
    identity.id = 'navIdentity';
    identity.textContent = 'Guest';
    right.appendChild(identity);

    frag.appendChild(right);

    // Hamburger for mobile
    var hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.id = 'navHamburger';
    hamburger.textContent = '\u2630';
    hamburger.onclick = function () {
      var menu = document.getElementById('navMobileMenu');
      if (menu) menu.classList.toggle('open');
    };
    frag.appendChild(hamburger);

    return frag;
  }

  // --- Inject top nav bar ---
  function injectNav() {
    var nav = document.createElement('nav');
    nav.className = 'nav-topbar';
    nav.appendChild(buildTopNav());
    document.body.insertBefore(nav, document.body.firstChild);

    // Mobile menu
    var mobileMenu = document.createElement('div');
    mobileMenu.className = 'nav-mobile-menu';
    mobileMenu.id = 'navMobileMenu';
    PAGES.forEach(function (page) {
      mobileMenu.appendChild(createLink(page));
    });
    document.body.insertBefore(mobileMenu, nav.nextSibling);
  }

  // --- Radio indicator events ---
  function setupRadioIndicator() {
    document.addEventListener('fpcs-radio-playing', function () {
      var el = document.getElementById('navRadioIndicator');
      if (el) el.style.display = 'flex';
    });
    document.addEventListener('fpcs-radio-stopped', function () {
      var el = document.getElementById('navRadioIndicator');
      if (el) el.style.display = 'none';
    });
  }

  // --- Public: Update EP meter ---
  window.updateNavEP = function (pct) {
    var fill = document.getElementById('navEpFill');
    var label = document.getElementById('navEpLabel');
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (label) label.textContent = Math.round(pct) + '%';
    if (fill) {
      if (pct > 60) fill.style.background = 'var(--green)';
      else if (pct > 30) fill.style.background = 'var(--yellow)';
      else fill.style.background = 'var(--red)';
    }
  };

  // --- Public: Update identity badge ---
  window.updateNavIdentity = function (name) {
    var el = document.getElementById('navIdentity');
    if (el) el.textContent = name || 'Guest';
  };

  // --- Inject pulse animation ---
  function injectNavStyles() {
    var style = document.createElement('style');
    style.textContent = '@keyframes navPulse{0%,100%{opacity:.5}50%{opacity:1}}';
    document.head.appendChild(style);
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectNav();
      injectNavStyles();
      setupRadioIndicator();
    });
  } else {
    injectNav();
    injectNavStyles();
    setupRadioIndicator();
  }
})();
