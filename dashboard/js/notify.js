/* ============================================================
   FPCS Notification System — Discord & Telegram Alerts
   Part of TRAILS: Technology · Robotics · AI · Language · Skills

   Sends notifications to Commander's channels from the dashboard.
   Credentials stored in localStorage (set via Admin page).
   NEVER hardcode API keys or tokens.
   ============================================================ */

(function() {
  'use strict';

  // --- Config keys (stored in localStorage, set from Admin page) ---
  var KEYS = {
    DISCORD_WEBHOOK_OPENJAW: 'fpcs_discord_webhook_openjaw',
    DISCORD_WEBHOOK_SUPPORT: 'fpcs_discord_webhook_support',
    TELEGRAM_BOT_TOKEN: 'fpcs_telegram_bot_token',
    TELEGRAM_CHAT_ID: 'fpcs_telegram_chat_id'
  };

  // --- Public API ---
  window.FPCSNotify = {
    /** Send a Discord message to a channel via webhook
     * @param {string} channel - 'openjaw' or 'support'
     * @param {string} message - Message text (supports markdown)
     * @param {object} [opts] - Optional: { embed: {title, description, color, fields} }
     */
    discord: function(channel, message, opts) {
      var key = channel === 'support' ? KEYS.DISCORD_WEBHOOK_SUPPORT : KEYS.DISCORD_WEBHOOK_OPENJAW;
      var webhookUrl = localStorage.getItem(key);
      if (!webhookUrl) {
        console.warn('[Notify] Discord webhook not configured for channel:', channel);
        return Promise.reject(new Error('Discord webhook not configured. Set it in Admin > Notifications.'));
      }

      var payload = { content: message };

      // Optional embed
      if (opts && opts.embed) {
        payload.embeds = [{
          title: opts.embed.title || '',
          description: opts.embed.description || '',
          color: opts.embed.color || 0x38bdf8, // accent blue
          fields: opts.embed.fields || [],
          timestamp: new Date().toISOString(),
          footer: { text: 'FPCS Dashboard' }
        }];
        if (!message) payload.content = null;
      }

      return fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r) {
        if (!r.ok) throw new Error('Discord webhook failed: ' + r.status);
        console.log('[Notify] Discord message sent to #' + channel);
        return true;
      });
    },

    /** Send a Telegram message
     * @param {string} message - Message text (supports HTML formatting)
     */
    telegram: function(message) {
      var botToken = localStorage.getItem(KEYS.TELEGRAM_BOT_TOKEN);
      var chatId = localStorage.getItem(KEYS.TELEGRAM_CHAT_ID);
      if (!botToken || !chatId) {
        console.warn('[Notify] Telegram not configured');
        return Promise.reject(new Error('Telegram not configured. Set bot token and chat ID in Admin > Notifications.'));
      }

      var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }).then(function(r) {
        if (!r.ok) throw new Error('Telegram send failed: ' + r.status);
        return r.json();
      }).then(function(data) {
        if (!data.ok) throw new Error('Telegram error: ' + (data.description || 'unknown'));
        console.log('[Notify] Telegram message sent');
        return true;
      });
    },

    /** Send to ALL configured channels
     * @param {string} message - Message text
     * @param {object} [opts] - Optional Discord embed options
     */
    broadcast: function(message, opts) {
      var promises = [];

      // Try Discord
      if (localStorage.getItem(KEYS.DISCORD_WEBHOOK_OPENJAW)) {
        promises.push(
          window.FPCSNotify.discord('openjaw', message, opts).catch(function(e) { console.warn(e); })
        );
      }

      // Try Telegram
      if (localStorage.getItem(KEYS.TELEGRAM_BOT_TOKEN)) {
        // Strip markdown for Telegram (use HTML instead)
        var telegramMsg = message.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
        promises.push(
          window.FPCSNotify.telegram(telegramMsg).catch(function(e) { console.warn(e); })
        );
      }

      if (promises.length === 0) {
        console.warn('[Notify] No notification channels configured');
        return Promise.resolve(false);
      }

      return Promise.all(promises).then(function() { return true; });
    },

    /** Check which channels are configured
     * @returns {object} { discord: boolean, telegram: boolean }
     */
    status: function() {
      return {
        discord_openjaw: !!localStorage.getItem(KEYS.DISCORD_WEBHOOK_OPENJAW),
        discord_support: !!localStorage.getItem(KEYS.DISCORD_WEBHOOK_SUPPORT),
        telegram: !!(localStorage.getItem(KEYS.TELEGRAM_BOT_TOKEN) && localStorage.getItem(KEYS.TELEGRAM_CHAT_ID))
      };
    },

    /** Configure a notification channel (called from Admin page)
     * @param {string} key - One of: 'discord_openjaw', 'discord_support', 'telegram_token', 'telegram_chat'
     * @param {string} value - The webhook URL or token
     */
    configure: function(key, value) {
      var map = {
        'discord_openjaw': KEYS.DISCORD_WEBHOOK_OPENJAW,
        'discord_support': KEYS.DISCORD_WEBHOOK_SUPPORT,
        'telegram_token': KEYS.TELEGRAM_BOT_TOKEN,
        'telegram_chat': KEYS.TELEGRAM_CHAT_ID
      };
      var storageKey = map[key];
      if (!storageKey) {
        console.error('[Notify] Unknown key:', key);
        return;
      }
      if (value) {
        localStorage.setItem(storageKey, value);
        console.log('[Notify] Configured:', key);
      } else {
        localStorage.removeItem(storageKey);
        console.log('[Notify] Removed:', key);
      }
    },

    /** Send a test notification to verify configuration */
    test: function(channel) {
      var msg = '**FPCS Dashboard** — Test notification sent at ' + new Date().toLocaleString();
      if (channel === 'telegram') {
        return window.FPCSNotify.telegram('<b>FPCS Dashboard</b> — Test notification sent at ' + new Date().toLocaleString());
      }
      return window.FPCSNotify.discord(channel || 'openjaw', msg, {
        embed: {
          title: 'Test Notification',
          description: 'If you see this, Discord integration is working!',
          color: 0x4ade80,
          fields: [{ name: 'Status', value: 'Connected', inline: true }]
        }
      });
    }
  };

  console.log('[Notify] FPCS Notification system loaded');
})();
