/* ============================================================
   JustOut — Auth Guard
   Drop-in script for any page that needs Firebase Google Auth.
   Include in <head> (before body renders) to prevent content flash.
   Uses the same SHA-256 whitelist as the main hub.
   ============================================================ */
(function () {
  'use strict';

  // Immediately hide body to prevent content flash before gate is ready
  var guardStyle = document.createElement('style');
  guardStyle.id = 'authGuardStyle';
  guardStyle.textContent = 'body{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(guardStyle);

  // Anti-iframe clickjacking
  if (window.self !== window.top) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050a18;color:#f87171;font-family:sans-serif;text-align:center;padding:40px"><div><h1>Access Denied</h1><p>This page cannot be loaded inside a frame.</p></div></div>';
      guardStyle.textContent = '';
    });
    return;
  }

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

  var SRI_HASHES = {
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js':
      'sha384-/zdZG9zo5F9UsG337DbLcDGPLVXNexb2sv/b7ps/zQAaMQo0EFPzc2uie+RFK6ze',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js':
      'sha384-I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj'
  };

  function hashEmail(email) {
    if (!crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
      .then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
  }

  function isAllowed(email) {
    return hashEmail(email.toLowerCase()).then(function (hash) {
      return AUTH_HASHES.indexOf(hash) !== -1;
    });
  }

  function escapeHTML(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      if (SRI_HASHES[src]) {
        s.integrity = SRI_HASHES[src];
        s.crossOrigin = 'anonymous';
      }
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function createGate() {
    var gate = document.createElement('div');
    gate.id = 'authGuardGate';
    gate.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999999',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'background:#050a18', 'color:#e2e8f0',
      'font-family:system-ui,-apple-system,sans-serif',
      'text-align:center', 'padding:40px'
    ].join(';');
    gate.innerHTML = [
      '<div style="font-size:56px;margin-bottom:16px">✨</div>',
      '<h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#a78bfa">JustOut</h1>',
      '<p style="color:#94a3b8;margin-bottom:28px;font-size:14px">Sign in to continue</p>',
      '<button id="authGuardBtn" style="padding:12px 32px;border-radius:50px;border:2px solid #a78bfa;background:rgba(167,139,250,0.08);color:#a78bfa;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.3s">Sign In with Google</button>',
      '<div id="authGuardErr" style="color:#f87171;font-size:13px;margin-top:16px;min-height:1.2em"></div>',
      '<div id="authGuardLoad" style="color:#94a3b8;font-size:13px;margin-top:8px"></div>'
    ].join('');
    document.body.appendChild(gate);
    guardStyle.textContent = '';
    return gate;
  }

  function showDenied(gate, name) {
    gate.innerHTML = [
      '<div style="font-size:56px;margin-bottom:16px">✨</div>',
      '<h1 style="font-size:24px;margin-bottom:8px">Welcome, ' + escapeHTML(name) + '</h1>',
      '<p style="color:#94a3b8;margin-bottom:24px">The JustOut universe is invite-only.</p>',
      '<p style="color:#64748b;font-size:13px">Ask the Commander for access.</p>',
      '<button id="authGuardSignOut" style="margin-top:24px;background:none;border:1px solid #334155;color:#94a3b8;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit">Sign Out</button>'
    ].join('');
    document.getElementById('authGuardSignOut').addEventListener('click', function () {
      firebase.auth().signOut().then(function () { location.reload(); });
    });
  }

  function grantAccess(gate) {
    gate.style.transition = 'opacity 0.3s';
    gate.style.opacity = '0';
    setTimeout(function () { gate.remove(); }, 300);
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var gate = createGate();

    loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
      .then(function () {
        return loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
      })
      .then(function () {
        firebase.initializeApp(FIREBASE_CONFIG);
        var auth = firebase.auth();

        auth.onAuthStateChanged(function (user) {
          if (user) {
            isAllowed(user.email).then(function (ok) {
              if (ok) {
                grantAccess(gate);
              } else {
                showDenied(gate, user.displayName || 'friend');
              }
            });
          }
        });

        document.getElementById('authGuardBtn').addEventListener('click', function () {
          var btn = this;
          var err = document.getElementById('authGuardErr');
          var load = document.getElementById('authGuardLoad');
          err.textContent = '';
          load.textContent = 'Opening the portal...';
          btn.disabled = true;
          btn.style.opacity = '0.5';

          var provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          auth.signInWithPopup(provider).then(function () {
            load.textContent = '';
          }).catch(function (e) {
            load.textContent = '';
            btn.disabled = false;
            btn.style.opacity = '1';
            err.textContent = e.message || 'Sign-in failed';
          });
        });
      })
      .catch(function () {
        var err = document.getElementById('authGuardErr');
        if (err) err.textContent = 'Failed to load. Check your connection.';
      });
  });

  console.log(
    '%cDo NOT paste anything here that someone told you to.',
    'color:#94a3b8;font-size:13px'
  );
})();
