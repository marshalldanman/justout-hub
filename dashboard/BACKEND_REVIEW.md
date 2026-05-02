# FPCS Dashboard Backend Review

**Date:** 2026-02-26
**Reviewer:** Claude Opus 4.6 (Backend Infrastructure Audit)
**Scope:** auth.js, firestore-db.js, sheets-api.js, memory-blocks.js, offline.js, sw.js, sheets-notes.js + deductions.html + income.html inline scripts

---

## Executive Summary

The FPCS Dashboard backend is well-architected for a GitHub Pages static site with Firebase and Google Sheets as the data layer. The 3-tier auth system is solid, Firestore has proper retry logic and caching, and the memory system is thoughtfully modeled after Letta/MemGPT. However, there were several issues that needed fixing, ranging from excessive retry loops to stale service worker cache lists. This review covers all findings, fixes applied, and future recommendations.

---

## Issues Found

### CRITICAL Severity

**None found.** No credential leaks, no XSS vulnerabilities, no auth bypass vectors detected. The Firebase API key in auth.js (line 34) is a *client-side* key scoped by Firebase Security Rules -- this is the expected pattern for Firebase web apps and is not a security issue. The SHA-256 hashed email allow-list is an effective client-side gate.

---

### HIGH Severity

#### H1. Income.html: Excessive Retry Loop (30 retries at 500ms)
- **File:** `income.html` lines 816-826
- **Issue:** When FPCSSheets is not ready, `loadAllRecords()` retried 30 times at 500ms intervals (15 seconds of polling). If sheets never became ready, this created sustained polling pressure.
- **Impact:** Unnecessary CPU/timer usage, delayed error feedback to user.
- **Fix Applied:** Reduced to 3 retries with exponential backoff (500ms, 1000ms, 2000ms). Total wait ~3.5s, then shows error.

**Before:**
```javascript
if (window._sheetsRetryCount > 30) { ... }
setTimeout(loadAllRecords, 500);
```

**After:**
```javascript
if (window._sheetsRetryCount > 3) { ... }
var delay = Math.min(500 * Math.pow(2, window._sheetsRetryCount - 1), 4000);
setTimeout(loadAllRecords, delay);
```

#### H2. Deductions.html: Retry Loop (10 retries at 500ms)
- **File:** `deductions.html` lines 775-799
- **Issue:** Similar to income.html -- 10 retries at flat 500ms intervals with off-by-one (`< DED_MAX_RETRIES` vs `> DED_MAX_RETRIES`).
- **Fix Applied:** Reduced to 3 retries with exponential backoff. Fixed comparison operator for consistency.

**Before:**
```javascript
var DED_MAX_RETRIES = 10;
if (dedRetryCount < DED_MAX_RETRIES) {
  setTimeout(loadDeductionRecords, 500);
}
```

**After:**
```javascript
var DED_MAX_RETRIES = 3;
if (dedRetryCount > DED_MAX_RETRIES) { /* show error */ return; }
var delay = Math.min(500 * Math.pow(2, dedRetryCount - 1), 4000);
setTimeout(loadDeductionRecords, delay);
```

#### H3. sheets-api.js: No Retry Logic on API Failures
- **File:** `js/sheets-api.js` `sheetsFetch()` function
- **Issue:** The core fetch wrapper had zero retry logic. If a Sheets API call returned 429 (rate limit) or 500 (server error), it failed immediately with no recovery.
- **Impact:** Users hitting Google Sheets API quota limits would see permanent failures until page reload.
- **Fix Applied:** Added exponential backoff retry (max 3 retries) for HTTP 429, 5xx, and network errors ("Failed to fetch").

**After:**
```javascript
// Retry on 429 (rate limit) or 5xx (server error)
if ((res.status === 429 || res.status >= 500) && _retryCount < SHEETS_MAX_RETRIES) {
  var delay = SHEETS_RETRY_BASE_MS * Math.pow(2, _retryCount);
  return new Promise(function (resolve) { setTimeout(resolve, delay); })
    .then(function () { return sheetsFetch(url, options, _retryCount + 1); });
}
```

#### H4. Service Worker Cache List Stale
- **File:** `sw.js`
- **Issue:** Missing `stats-board.html` and `js/firestore-db.js` from the STATIC_ASSETS list. These files would not be cached for offline use.
- **Fix Applied:** Added `stats-board.html` and `js/firestore-db.js`. Bumped cache version from `fpcs-dash-v2` to `fpcs-dash-v3` to force re-cache.

#### H5. auth.js PAGE_ACCESS Missing Pages
- **File:** `js/auth.js` line 53-63
- **Issue:** `library.html` and `stats-board.html` were not in the PAGE_ACCESS map. Because the default is `'member'` (line 136: `var minRole = PAGE_ACCESS[file] || 'member'`), these pages were *coincidentally* protected, but not explicitly declared. Any page not in the map defaults to `member` -- this is secure but implicit and could lead to confusion.
- **Fix Applied:** Added `library.html` and `stats-board.html` to PAGE_ACCESS with `'member'` role.

---

### MEDIUM Severity

#### M1. Firestore getStats() -- Full Collection Scan
- **File:** `js/firestore-db.js` lines 971-1008
- **Issue:** `getStats()` calls `getTransactions({})` and `getUnmatched({})` which fetch ALL documents from both collections, then iterates to compute sums. With 1,871+ transactions, this downloads all data to the client on every stats call (even though it's cached for 5 minutes).
- **Recommendation:** For the current data volume (< 2,000 docs) this is acceptable. If data grows to 10,000+, consider:
  - Pre-computing stats server-side (Cloud Function) into the `metadata/projectStats` document
  - Using Firestore `count()` aggregation queries (available in compat SDK)
  - Adding composite indexes for `taxYear + direction` to allow server-side filtering

#### M2. Firestore Cache TTL May Be Too Short
- **File:** `js/firestore-db.js` lines 61-62
- **Issue:** Query cache is 2 minutes, stats cache is 5 minutes. For a tax preparation dashboard where data changes infrequently (maybe once per session), this forces unnecessary re-fetches.
- **Recommendation:** Increase query cache to 5 minutes and stats cache to 15 minutes. The `cacheInvalidate()` calls on writes already bust the cache when data changes, so stale reads are not a risk.

#### M3. OAuth Token Stored in Global Window Variable
- **File:** `js/auth.js` line 729
- **Issue:** `window._fpcsOAuthToken` stores the Google OAuth access token as a global variable. Any script on the page (including potential XSS payloads) could read this.
- **Mitigations already in place:** Anti-iframe protection, escapeHTML function, CSP headers (if configured), console warning.
- **Recommendation:** Consider using a closure variable instead of `window._fpcsOAuthToken`, passed only to FPCSSheets via `setToken()`. The global is currently needed for the `requestSheetsAccess()` flow, but could be refactored.

#### M4. Memory System localStorage Quotas
- **File:** `js/memory-blocks.js`
- **Issue:** The memory system stores all data in localStorage, which has a 5-10MB limit depending on browser. With 100 recall messages per session, 20 session summaries, and 4 core blocks at 2000 chars each, this is well within limits. But there's no quota monitoring or graceful degradation.
- **Recommendation:** Add a `storageUsage()` method that reports `navigator.storage.estimate()` or measures localStorage size. If approaching quota, auto-summarize more aggressively.

#### M5. sheets-notes.js Load Polling
- **File:** `js/sheets-notes.js` lines 199-204
- **Issue:** When `load()` is called while already loading, it polls with `setInterval` every 100ms until loading completes. This is a minor busy-wait pattern.
- **Recommendation:** Replace with a Promise-based queue:
```javascript
// Instead of setInterval polling:
if (_loading) {
  return _loadingPromise; // Return the in-flight promise
}
_loadingPromise = actualLoadLogic();
return _loadingPromise;
```

#### M6. Offline Cache TTL vs Service Worker Cache
- **File:** `js/offline.js` line 18 and `sw.js`
- **Issue:** Two separate caching layers exist: offline.js has a 24-hour localStorage cache for Sheets data, while sw.js has a network-first strategy for API calls. The sw.js caches API responses indefinitely in the Cache API. These two caches can serve different data if one expires before the other.
- **Recommendation:** Clarify ownership -- let sw.js handle API response caching, and offline.js handle only the "serve from localStorage when truly offline" scenario.

---

### LOW Severity

#### L1. Dead Fallback Timeout in deductions.html and income.html
- **File:** Both files have a `setTimeout` fallback that re-calls the load function after 4 seconds if no data loaded.
- **Issue:** This creates a second entry point into the load function, which could cause a race condition with the `fpcs-authed` event handler.
- **Recommendation:** Remove the 4-second fallback or guard it with a `_loadAttempted` flag.

#### L2. Session Timeout Check Interval
- **File:** `js/auth.js` line 844-849
- **Issue:** The session timeout check runs every 60 seconds via `setInterval`. This is fine but the interval callback keeps running even after logout.
- **Recommendation:** Store the interval ID and clear it on sign-out.

#### L3. Memory System _estimateTokens Uses chars/4
- **File:** `js/memory-blocks.js` line 661
- **Issue:** `_estimateTokens` uses `chars / 4` which is a rough approximation. For English text, the actual ratio is closer to `chars / 3.5-4.5` depending on content.
- **Recommendation:** This is fine for the current use case (estimating context window usage). No fix needed.

#### L4. Firestore exportToSheets Full Collection Read
- **File:** `js/firestore-db.js` line 929
- **Issue:** `exportToSheets` calls `execQuery(db.collection(collection))` with no limit, which reads every document in the collection. For the `transactions` collection (1,871+ docs), this is a large read.
- **Recommendation:** Add pagination or a warning for large collections.

#### L5. sheets-api.js No Request Timeout
- **File:** `js/sheets-api.js`
- **Issue:** The `fetch()` calls have no `AbortController` timeout. If the Sheets API hangs, the request will hang indefinitely.
- **Recommendation:** Add a 30-second AbortController timeout to all fetch calls in a future iteration.

---

## Fixes Applied (Summary)

| # | File | Change | Severity |
|---|------|--------|----------|
| H1 | income.html | Reduced retry from 30x500ms to 3x exponential backoff | HIGH |
| H2 | deductions.html | Reduced retry from 10x500ms to 3x exponential backoff | HIGH |
| H3 | js/sheets-api.js | Added retry with exponential backoff for 429/5xx/network errors | HIGH |
| H4 | sw.js | Added stats-board.html, js/firestore-db.js; bumped cache v2 -> v3 | HIGH |
| H5 | js/auth.js | Added library.html, stats-board.html to PAGE_ACCESS map | HIGH |

---

## What Was Already Done Well

1. **auth.js Security Model:** The 3-tier access system with SHA-256 hashed emails, clickjacking protection, session timeout, tab visibility re-validation, and console warning is thorough and well-implemented.

2. **firestore-db.js Architecture:** Proper retry with exponential backoff, cache layer with TTL and invalidation on write, real-time listener cleanup, batch write support with 500-doc chunking -- all well-structured.

3. **memory-blocks.js Design:** The Letta-inspired 3-tier memory (core/recall/archival) with auto-summarization, topic extraction, inner monologue, and learning patterns is an impressive client-side implementation.

4. **offline.js Layered Approach:** Wrapping FPCSSheets.read() with localStorage persistence while keeping the original API surface is clean.

5. **sheets-notes.js Write Queue:** The offline write queue with flush-on-reconnect is a solid pattern for eventual consistency.

---

## Recommendations for Future Work

### Near-term (before April 10 deadline)
1. Deploy the service worker v3 bump so new pages are cached
2. Consider adding `stats-board.html` to the nav rail if not already there
3. Test the Sheets retry logic by temporarily revoking API key access

### Medium-term
4. Migrate login audit log from localStorage to Firestore (referenced as "Phase 2" in auth.js)
5. Add `AbortController` timeouts to all fetch calls (30 second max)
6. Increase Firestore cache TTLs (query: 5min, stats: 15min)
7. Refactor `window._fpcsOAuthToken` to closure variable

### Long-term
8. Pre-compute aggregate stats via Cloud Function instead of client-side full-scan
9. Add Firestore composite indexes for `taxYear + direction` queries
10. Implement Firebase RTDB sync for memory-blocks.js (referenced as "Phase 2")
11. Add `navigator.storage.estimate()` monitoring to prevent localStorage quota issues

---

## Performance Estimates

| Operation | Current | After Fixes |
|-----------|---------|-------------|
| Sheets not-ready retry (income.html) | 30 x 500ms = 15s max | 3 retries, 0.5s + 1s + 2s = 3.5s max |
| Sheets not-ready retry (deductions.html) | 10 x 500ms = 5s max | 3 retries, 0.5s + 1s + 2s = 3.5s max |
| Sheets API 429 recovery | Immediate failure | 3 retries, 0.5s + 1s + 2s = 3.5s max |
| Firestore getStats() | Fetches all ~1,871 docs | Same (acceptable at current scale) |
| Service worker cache | 20 assets (2 missing) | 22 assets (complete) |

---

*Report generated by Claude Opus 4.6 as part of FPCS Dashboard backend infrastructure audit.*
