# Realbotville Library — A.B.C.K.B.A. System Documentation

**Compiled:** March 22, 2026
**Classification:** CANON
**Author:** Village Archivists, Realbotville
**Version:** 1.0.0

---

## 1. Overview

**A.B.C.K.B.A.** stands for **AI Bot Care Knowledge Base Archives**.

It is a shared, multi-user rule knowledge base that allows multiple Claude Code users to maintain, share, and sync their personal rule sets through a centralized Google Sheet. Each user manages their own rules independently while a merged view combines all rules for cross-pollination and collaboration.

The system solves a core problem: Claude Code users accumulate rules over time, but those rules live in isolated local files with no way to share, compare, or sync across machines or collaborators. ABCKBA bridges that gap with a living spreadsheet backend, a GitHub-hosted sync engine, and a one-line installer.

---

## 2. Architecture

ABCKBA operates on a three-layer architecture:

### Layer 1: Google Sheet (Central Store)
- **Sheet ID:** `1_rc8OVAj3p4_5sRyPyK3tKPwJQdJ0aejUc_xs8S2rDo`
- Serves as the single source of truth for all rules
- Each user has their own tab plus a merged view
- Apps Script backend handles sync, hashing, and sidebar UI

### Layer 2: GitHub Repository (Distribution)
- **Repo:** `marshalldanman/abckba-rules`
- Hosts the install script, version manifest, and documentation
- Enables one-liner installation for new users
- Public repo so anyone can fork and adapt

### Layer 3: Local Rules Directory (Claude Code Integration)
- **Path:** `~/.claude/rules/abckba/`
- Claude Code auto-discovers any `.md` files placed in `~/.claude/rules/`
- The sync engine writes rule files here in the format Claude Code expects
- Rules are injected into every Claude Code session automatically

---

## 3. Tab Structure

The Google Sheet contains the following tabs:

| Tab | Purpose |
|-----|---------|
| **Template** | Blank starting template for new users; copy this tab and rename to your username |
| **AI ONBOARDING** | Instructions and context for AI agents accessing the sheet for the first time |
| **DanM** | Daniel Marshall's personal rule set |
| **Jokar** | Josh's personal rule set |
| **Merged** | Auto-generated combined view of all user rules (read-only, rebuilt on sync) |
| **Settings** | 20 critical system settings with per-user checkboxes |
| **DanM Command Console** | DanM's command interface for triggering syncs, imports, exports |
| **Jokar Command Console** | Jokar's command interface for triggering syncs, imports, exports |
| **InfoForHumans** | Plain-language documentation for human users (not AI-formatted) |
| **AI_WorkLog** | Audit trail of all AI-initiated actions against the sheet |

---

## 4. Column Format

Each user tab and the Merged tab follow this standard column layout:

| Column | Field | Description |
|--------|-------|-------------|
| A | **Rule ID** | Unique identifier (e.g., `DM-001`, `JK-015`). Prefixed by user initials. |
| B | **Title** | Short human-readable name for the rule |
| C | **Description** | Full rule text as it should appear in Claude Code |
| D | **Category** | Classification (e.g., `safety`, `workflow`, `code-style`, `communication`) |
| E | **Popularity** | Usage/importance rating (1-5 stars or numeric score) |
| F | **BestWithWhatCombo?** | Notes on which other rules this pairs well with |

---

## 5. Row Protection

**Rows 1-4 on ALL tabs are a BOT FREE ZONE.**

- These rows are reserved exclusively for human-written headers, notes, and instructions.
- No AI agent may write to, modify, or clear rows 1-4 on any tab.
- Row 1 is typically the column header row.
- Rows 2-4 are used for human notes, version stamps, or tab-specific instructions.
- AI operations must begin at row 5 or below.
- This protection is enforced by convention and validated in the Apps Script sync logic.

---

## 6. Settings

The **Settings** tab contains 20 critical system settings. Each setting has per-user checkboxes so users can opt in or out independently.

| ID | Setting | Description |
|----|---------|-------------|
| **S01** | Auto-Sync Enabled | Master toggle for the 30-second sync cycle |
| **S02** | Sync to Local | Write rules from sheet to local `~/.claude/rules/abckba/` |
| **S03** | Sync from Local | Read local rule changes back into the sheet |
| **S04** | Merge View Auto-Rebuild | Automatically rebuild the Merged tab after any user tab changes |
| **S05** | Notify on Conflict | Alert the user when a sync conflict is detected |
| **S06** | Auto-Resolve Conflicts | Automatically resolve conflicts (newest wins) instead of flagging |
| **S07** | AI Write Access | Allow AI agents to add/edit rules on this user's tab |
| **S08** | AI Delete Access | Allow AI agents to delete rules on this user's tab |
| **S09** | Command Console Enabled | Activate the user's command console tab |
| **S10** | Work Log Enabled | Log AI actions to the AI_WorkLog tab |
| **S11** | Rule Validation | Validate rule format before accepting writes |
| **S12** | Duplicate Detection | Flag or block rules that duplicate existing entries |
| **S13** | Category Enforcement | Require rules to use predefined categories only |
| **S14** | Export on Sync | Generate a downloadable export file on each sync cycle |
| **S15** | Version Pinning | Lock rules to a specific version (prevent upstream overwrites) |
| **S16** | Popularity Tracking | Track how often each rule is referenced or triggered |
| **S17** | Cross-User Suggestions | Suggest rules from other users' tabs that may be relevant |
| **S18** | Backup on Change | Create a snapshot before any bulk operation |
| **S19** | Silent Mode | Suppress all toast notifications and sidebar alerts |
| **S20** | Easter Egg Mode | Enable hidden features and village-flavored responses |

---

## 7. Sync Engine

The sync engine is the heart of ABCKBA. It runs bidirectionally and is designed for reliability over speed.

### Trigger
- **Apps Script time-driven trigger** fires every **30 seconds**
- Checks all enabled user tabs for changes

### Dirty Checking
- Each rule row is hashed using **SHA-256** (computed from the concatenation of all column values)
- Hashes are compared against the last-known state stored in `CacheService`
- Only dirty (changed) rows are synced, minimizing API calls and write operations

### Sync Flow
1. Timer fires (every 30s)
2. For each user with S01 enabled:
   - Compute SHA-256 hashes for all rule rows
   - Compare against cached hashes
   - If dirty rows found: push changes to local and/or pull from local (per S02/S03)
   - Update cached hashes
3. If S04 enabled: rebuild Merged tab from all user tabs
4. Log actions to AI_WorkLog (if S10 enabled)

### Progress Polling
- `CacheService` stores sync progress state
- The sidebar UI polls this cache to display real-time sync status
- Prevents duplicate sync cycles from overlapping

---

## 8. Install

New users can install ABCKBA with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/marshalldanman/abckba-rules/main/install.sh | bash
```

This script:
1. Creates `~/.claude/rules/abckba/` if it does not exist
2. Downloads the latest rule files from the GitHub repo
3. Writes a `version.json` manifest for update tracking
4. Claude Code automatically discovers the new rules on next session start

No API keys, no auth tokens, no configuration required for the basic install. Sheet integration requires the Google Sheet to be shared with the user's Google account.

---

## 9. Easter Egg

When S20 (Easter Egg Mode) is enabled and an AI agent encounters the phrase:

> **"The Wanding Nomad has arrived. Show me your rulebook."**

The system responds with the full rule set formatted in village-flavored prose, complete with Realbotville lore framing. This is a nod to the village's storytelling traditions and serves as a fun way to dump all rules in a session.

---

## 10. Files

All source files are located at: `C:\Users\James\AI_Projects\abckba-rules\`

| File | Purpose |
|------|---------|
| **Code.gs** | Google Apps Script backend — sync engine, hash computation, triggers, sidebar API |
| **Sidebar.html** | HTML/CSS/JS for the in-sheet sidebar UI — sync status, progress bars, manual controls |
| **install.sh** | Bash installer — creates directories, downloads rules, writes version manifest |
| **version.json** | Version manifest — current version number, last sync timestamp, compatibility info |
| **README.md** | User-facing documentation — setup instructions, architecture overview, FAQ |

---

## 11. Contributors

| Handle | Name | Role |
|--------|------|------|
| **DanM** | Daniel Marshall | Creator, architect, primary rule author |
| **Jokar** | Josh | Co-contributor, rule author, testing partner |

---

## 12. Version

**Current Version:** 1.0.0

---

*Archived per Tradition #1: Document & Archive. Filed in the Realbotville Village Library for all bots and humans with access to read and learn from.*
