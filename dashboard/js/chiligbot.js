/* ============================================================
   ChiliGBot — Flying Goat Construction Controller
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   ChiliGBot is a strange but effective magical flying goat who
   lives in a cave near Realbotville. He carries a sparkling wand
   and manages loading, building, and construction overlays across
   the dashboard. Low cost, follows orders, gets stuff done right.

   API:
   ChiliGBot.loading(selector, msg?)     → wings flap, assessing
   ChiliGBot.building(selector, msg?)    → wand sparkles, building
   ChiliGBot.done(selector)              → flash + reveal component
   ChiliGBot.shutdown(selector, msg?)    → under-construction notice
   ChiliGBot.restore(selector)           → remove shutdown notice
   ChiliGBot.isActive(selector)          → boolean: has overlay?
   ChiliGBot.status()                    → object: all active overlays

   USAGE:
   <link rel="stylesheet" href="css/chiligbot.css">
   <script src="js/chiligbot.js"></script>

   // Show loading state on a section
   ChiliGBot.loading('#sec-reports', 'Assessing project data');

   // Transition to building
   ChiliGBot.building('#sec-reports', 'Constructing report cards');

   // Done — flash and reveal
   ChiliGBot.done('#sec-reports');

   // Shut down a component
   ChiliGBot.shutdown('#sec-legacy', 'Upgrading to v2');
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     GOAT HTML TEMPLATE
     ---------------------------------------------------------- */
  function goatHTML(state) {
    return '' +
      '<div class="chili-goat chili-goat--' + state + '">' +
        '<!-- Horns -->' +
        '<div class="chili-horn-l"></div>' +
        '<div class="chili-horn-r"></div>' +
        '<!-- Wings -->' +
        '<div class="chili-wing chili-wing--left"></div>' +
        '<div class="chili-wing chili-wing--right"></div>' +
        '<!-- Body -->' +
        '<div class="chili-body"></div>' +
        '<!-- Head -->' +
        '<div class="chili-head"></div>' +
        '<!-- Beard -->' +
        '<div class="chili-beard"></div>' +
        '<!-- Front hoofs (hands) -->' +
        '<div class="chili-hoof-fl"></div>' +
        '<div class="chili-hoof-fr"></div>' +
        '<!-- Hind hoofs -->' +
        '<div class="chili-hoof-hl"></div>' +
        '<div class="chili-hoof-hr"></div>' +
        '<!-- Wand -->' +
        '<div class="chili-wand"></div>' +
        '<!-- Sparkle particles -->' +
        '<div class="chili-sparkles">' +
          '<div class="chili-spark"></div>' +
          '<div class="chili-spark"></div>' +
          '<div class="chili-spark"></div>' +
          '<div class="chili-spark"></div>' +
          '<div class="chili-spark"></div>' +
        '</div>' +
      '</div>';
  }


  /* ----------------------------------------------------------
     OVERLAY TEMPLATES
     ---------------------------------------------------------- */
  function loadingOverlayHTML(msg) {
    return '' +
      '<div class="chili-overlay chili-overlay--loading" data-chili="overlay">' +
        goatHTML('loading') +
        '<div class="chili-status">' +
          '<span class="chili-dots">' + (msg || 'ChiliGBot is assessing') + '</span>' +
        '</div>' +
        '<div class="chili-status-sub">Wings flapping, scanning the terrain...</div>' +
      '</div>';
  }

  function buildingOverlayHTML(msg) {
    return '' +
      '<div class="chili-overlay chili-overlay--construction" data-chili="overlay">' +
        goatHTML('building') +
        '<div class="chili-status">' +
          '<span class="chili-dots">' + (msg || 'ChiliGBot is building') + '</span>' +
        '</div>' +
        '<div class="chili-status-sub">Wand sparkling, constructing magic...</div>' +
        '<div class="chili-stripes"></div>' +
      '</div>';
  }

  function shutdownHTML(msg) {
    return '' +
      '<div class="chili-shutdown-notice" data-chili="shutdown">' +
        '<div class="chili-shutdown-stripes"></div>' +
        '<div class="chili-shutdown-icon">🐐✨</div>' +
        '<div class="chili-shutdown-title">Under Construction</div>' +
        '<div class="chili-shutdown-msg">' +
          (msg || 'ChiliGBot is working on something here. Check back soon!') +
        '</div>' +
        '<div class="chili-shutdown-stripes-bottom"></div>' +
      '</div>';
  }


  /* ----------------------------------------------------------
     ACTIVE OVERLAY REGISTRY
     ---------------------------------------------------------- */
  var _active = {};  // selector → { type, el, target }


  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */
  function getTarget(selector) {
    if (typeof selector === 'string') {
      return document.querySelector(selector);
    }
    return selector;  // allow passing DOM element directly
  }

  function clearExisting(selector) {
    var target = getTarget(selector);
    if (!target) return null;

    // Remove any existing overlay or shutdown notice
    var existing = target.querySelectorAll('[data-chili]');
    for (var i = 0; i < existing.length; i++) {
      existing[i].remove();
    }

    // Remove target class if no more overlays
    if (!target.querySelector('[data-chili]')) {
      target.classList.remove('chili-target');
    }

    // Clean registry
    var key = typeof selector === 'string' ? selector : (target.id ? '#' + target.id : target.className);
    delete _active[key];

    return target;
  }

  function inject(selector, html, type) {
    var target = clearExisting(selector);
    if (!target) {
      console.warn('[ChiliGBot] Target not found:', selector);
      return false;
    }

    target.classList.add('chili-target');

    // Use mini variant for small elements
    var rect = target.getBoundingClientRect();
    var isMini = rect.height < 150 || rect.width < 200;

    // Inject HTML
    target.insertAdjacentHTML('beforeend', html);

    // Apply mini class if needed
    if (isMini) {
      var overlay = target.querySelector('[data-chili]:last-child');
      if (overlay && overlay.classList.contains('chili-overlay')) {
        overlay.classList.add('chili-overlay--mini');
      }
    }

    // Register
    var key = typeof selector === 'string' ? selector : (target.id ? '#' + target.id : '');
    _active[key] = { type: type, target: target };

    return true;
  }


  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  var ChiliGBot = {

    /* --- Show loading overlay (wings flap, no sparkle) --- */
    loading: function (selector, msg) {
      return inject(selector, loadingOverlayHTML(msg), 'loading');
    },

    /* --- Show building overlay (wand sparkles + stripes) --- */
    building: function (selector, msg) {
      return inject(selector, buildingOverlayHTML(msg), 'building');
    },

    /* --- Complete: flash + fade out overlay --- */
    done: function (selector) {
      var target = getTarget(selector);
      if (!target) return;

      var overlay = target.querySelector('[data-chili="overlay"]');
      if (!overlay) {
        // Maybe it's a shutdown — remove that too
        clearExisting(selector);
        return;
      }

      // Inject flash
      target.insertAdjacentHTML('beforeend', '<div class="chili-flash"></div>');

      // Fade out overlay
      overlay.style.animation = 'chili-fade-out 0.5s ease-out forwards';

      // Clean up after animations
      setTimeout(function () {
        clearExisting(selector);
        var flash = target.querySelector('.chili-flash');
        if (flash) flash.remove();
      }, 600);
    },

    /* --- Shutdown component with under-construction notice --- */
    shutdown: function (selector, msg) {
      var target = clearExisting(selector);
      if (!target) {
        target = getTarget(selector);
        if (!target) {
          console.warn('[ChiliGBot] Target not found:', selector);
          return false;
        }
      }

      target.classList.add('chili-target');
      target.insertAdjacentHTML('beforeend', shutdownHTML(msg));

      var key = typeof selector === 'string' ? selector : (target.id ? '#' + target.id : '');
      _active[key] = { type: 'shutdown', target: target };

      return true;
    },

    /* --- Restore: remove shutdown notice --- */
    restore: function (selector) {
      clearExisting(selector);
    },

    /* --- Check if overlay is active --- */
    isActive: function (selector) {
      var target = getTarget(selector);
      if (!target) return false;
      return !!target.querySelector('[data-chili]');
    },

    /* --- Get all active overlays --- */
    status: function () {
      var result = {};
      for (var key in _active) {
        if (_active.hasOwnProperty(key)) {
          result[key] = _active[key].type;
        }
      }
      return result;
    },

    /* --- Transition: loading → building --- */
    promote: function (selector, msg) {
      return inject(selector, buildingOverlayHTML(msg), 'building');
    },

    /* --- Batch operations --- */
    loadingAll: function (selectors, msg) {
      var self = this;
      selectors.forEach(function (s) { self.loading(s, msg); });
    },

    doneAll: function (selectors) {
      var self = this;
      selectors.forEach(function (s) { self.done(s); });
    },

    shutdownAll: function (selectors, msg) {
      var self = this;
      selectors.forEach(function (s) { self.shutdown(s, msg); });
    }
  };


  /* ----------------------------------------------------------
     EXPOSE GLOBALLY
     ---------------------------------------------------------- */
  window.ChiliGBot = ChiliGBot;

  console.log('[ChiliGBot] 🐐✨ Magical flying goat loaded and ready. Cave coordinates: near Realbotville.');

})();
