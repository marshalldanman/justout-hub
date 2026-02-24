/* ============================================================
   JustOut Hub — Auth Gate
   Firebase Google Auth with SHA-256 whitelist
   Same security model as FPCS Dashboard (3-tier access)
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

  var AUTH_USERS = [
    { hash: '2cf3a7d6f68c22e431d35aec11129074f9bb677598de0fe85df3ba3c0f513365', role: 'admin',  label: 'Commander' },
    { hash: 'e12a8bb46e8823a5fd6e6c997c573b4088ff4dbe09ec3ee3da994d33a810a674', role: 'member', label: 'Judith Marshall' },
    { hash: 'e48e3b564e4c384c6215fcf3215abac1c95df04e5e7f862d5d1d8c91ff977cba', role: 'member', label: 'Friendly Sales' }
  ];

  // Anti-iframe clickjacking protection
  if (window.self !== window.top) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050a18;color:#f87171;font-family:sans-serif;text-align:center;padding:40px"><div><h1>Access Denied</h1><p>This page cannot be loaded inside a frame.</p></div></div>';
    throw new Error('[JustOut] Iframe blocked');
  }

  function hashEmail(email) {
    if (!crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
      .then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
  }

  function findUser(email) {
    return hashEmail(email.toLowerCase()).then(function (hash) {
      var match = null;
      AUTH_USERS.forEach(function (u) {
        if (u.hash === hash) match = u;
      });
      return match;
    });
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.error('[JustOut Auth] Failed to load:', src); };
    document.head.appendChild(s);
  }

  // Login audit
  function logLogin(user, role) {
    try {
      var log = JSON.parse(localStorage.getItem('justout_login_log') || '[]');
      log.push({
        email: user.email,
        name: user.displayName,
        uid: user.uid,
        role: role,
        ts: Date.now(),
        page: 'hub'
      });
      if (log.length > 50) log = log.slice(-50);
      localStorage.setItem('justout_login_log', JSON.stringify(log));
    } catch (e) { /* silent */ }
  }

  function initAuth() {
    firebase.initializeApp(FIREBASE_CONFIG);
    var auth = firebase.auth();
    var gate = document.getElementById('authGate');
    var hub = document.getElementById('hubContent');
    var errEl = document.getElementById('authErr');
    var loadEl = document.getElementById('authLoading');

    if (!gate || !hub) {
      console.error('[JustOut Auth] Missing #authGate or #hubContent');
      return;
    }

    auth.onAuthStateChanged(function (user) {
      if (user) {
        findUser(user.email).then(function (rec) {
          var role = rec ? rec.role : 'guest';
          var label = rec ? rec.label : 'Guest';

          logLogin(user, role);
          console.log('[JustOut Auth] ' + role.toUpperCase() + ': ' + user.email);

          window.JUSTOUT_USER = Object.freeze({
            email: user.email,
            name: user.displayName,
            uid: user.uid,
            photo: user.photoURL,
            role: role,
            label: label
          });

          // Admin + Member: show hub. Guest: show restricted message.
          if (role === 'admin' || role === 'member') {
            gate.style.display = 'none';
            hub.style.display = 'block';
            // Populate user info in header
            var userEl = document.getElementById('hubUser');
            if (userEl) {
              userEl.innerHTML = [
                user.photoURL ? '<img src="' + escapeHTML(user.photoURL) + '" alt="avatar">' : '',
                '<span class="hub-user-name">' + escapeHTML(label) + '</span>',
                '<button class="hub-logout" id="hubLogout">Switch</button>'
              ].join('');
              document.getElementById('hubLogout').addEventListener('click', function () {
                if (confirm('Sign out and switch accounts?')) {
                  auth.signOut().then(function () { window.location.reload(); });
                }
              });
            }
            // Dispatch ready event for hub.js
            document.dispatchEvent(new CustomEvent('justout-authed', {
              detail: { user: window.JUSTOUT_USER }
            }));
          } else {
            // Guest: no access to hub (for now)
            gate.style.display = 'none';
            hub.style.display = 'none';
            document.body.innerHTML = [
              '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#050a18;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:40px">',
              '  <div style="font-size:56px;margin-bottom:16px">✨</div>',
              '  <h1 style="font-size:24px;margin-bottom:8px">Welcome, ' + escapeHTML(user.displayName || 'friend') + '</h1>',
              '  <p style="color:#94a3b8;margin-bottom:24px">The JustOut universe is invite-only for now.</p>',
              '  <p style="color:#64748b;font-size:13px">Ask the Commander for access.</p>',
              '  <button onclick="firebase.auth().signOut().then(function(){location.reload()})" style="margin-top:24px;background:none;border:1px solid #334155;color:#94a3b8;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px">Sign Out</button>',
              '</div>'
            ].join('');
          }
        });
      } else {
        gate.style.display = 'flex';
        hub.style.display = 'none';
        window.JUSTOUT_USER = null;
      }
    });

    // Sign-in handler
    var signInBtn = document.getElementById('googleSignIn');
    if (signInBtn) {
      signInBtn.addEventListener('click', function () {
        errEl.textContent = '';
        loadEl.textContent = 'Opening the portal...';
        signInBtn.disabled = true;

        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        auth.signInWithPopup(provider).then(function () {
          loadEl.textContent = '';
        }).catch(function (error) {
          loadEl.textContent = '';
          signInBtn.disabled = false;
          errEl.textContent = error.message || 'Sign-in failed';
        });
      });
    }

    // Console security warning
    console.log(
      '%c✨ JustOut Hub',
      'color:#a78bfa;font-size:24px;font-weight:900'
    );
    console.log(
      '%cDo NOT paste anything here that someone told you to.',
      'color:#94a3b8;font-size:13px'
    );
  }

  // Auth particles for the sign-in screen
  function initAuthParticles() {
    var canvas = document.getElementById('authParticles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var stars = [];
    var count = 120;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.01
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.da;
        if (s.a > 1 || s.a < 0.1) s.da = -s.da;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, ' + s.a + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // Boot
  initAuthParticles();
  loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', function () {
    loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js', initAuth);
  });
})();
