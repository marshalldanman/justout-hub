/* ============================================================
   JustOut — Lightweight Auth Gate for Sub-Pages
   Drop-in script: hides <body> until Firebase auth confirms
   an admin or member. Uses redirect flow (no popup blockers).

   Usage: add before </body> on any sub-page:
     <script src="/js/auth-gate.js"></script>

   The page content is hidden via opacity until auth succeeds.
   ============================================================ */
(function () {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBgYAPO_0cEvhPzfU6GZykJVUnF55LEzXQ',
    authDomain: 'fpcs-dashboard-63b25.firebaseapp.com',
    projectId: 'fpcs-dashboard-63b25',
    storageBucket: 'fpcs-dashboard-63b25.firebasestorage.app',
    messagingSenderId: '377879797743',
    appId: '1:377879797743:web:61a56f9bf69f2df9eba01a'
  };

  var AUTH_HASHES = [
    '2cf3a7d6f68c22e431d35aec11129074f9bb677598de0fe85df3ba3c0f513365',
    'e12a8bb46e8823a5fd6e6c997c573b4088ff4dbe09ec3ee3da994d33a810a674',
    'e48e3b564e4c384c6215fcf3215abac1c95df04e5e7f862d5d1d8c91ff977cba'
  ];

  // Hide page immediately
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'opacity 0.3s';

  function hashEmail(email) {
    if (!crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
      .then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
  }

  function showPage() {
    document.documentElement.style.opacity = '1';
  }

  function showDenied(msg) {
    document.body.innerHTML = [
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#050a18;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:40px">',
      '  <div style="font-size:56px;margin-bottom:16px">&#x1F512;</div>',
      '  <h1 style="font-size:24px;margin-bottom:8px">' + msg + '</h1>',
      '  <p style="color:#94a3b8;margin-bottom:24px">This page requires JustOut authentication.</p>',
      '  <a href="/" style="color:#38bdf8;text-decoration:none;border:1px solid #1e293b;padding:10px 24px;border-radius:8px;font-size:14px">Sign in at Hub</a>',
      '</div>'
    ].join('');
    showPage();
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { showDenied('Authentication Unavailable'); };
    document.head.appendChild(s);
  }

  function initGate() {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    var auth = firebase.auth();

    auth.onAuthStateChanged(function (user) {
      if (user) {
        hashEmail(user.email.toLowerCase()).then(function (hash) {
          var allowed = AUTH_HASHES.indexOf(hash) !== -1;
          if (allowed) {
            showPage();
          } else {
            showDenied('Access Denied');
          }
        });
      } else {
        showDenied('Sign In Required');
      }
    });
  }

  loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', function () {
    loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js', initGate);
  });
})();
