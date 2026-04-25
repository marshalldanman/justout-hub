# Project of Life — Marshall Danman

**Canonical organizing document for the JustOut universe.**
Last assembled: 2026-04-25 · Branch: `claude/organize-life-projects-ZcxLG`

This file is the single source of truth: what exists, what state it is in, what it is for, what comes next. Read top-to-bottom on a slow day; use the Roadmap (Part V) on a fast one.

---

## North Star

A voice-first personal universe (`hub.justout.today`) where every domain of life — work, money, health, ideas, media, security, reflection — has its own channel, all reachable hands-free through JAP, all anchored to a small set of disciplined daily practices.

Three guiding pressures, in priority order:

1. **Order before expansion.** Finish/retire what's already on the board before adding more.
2. **Health is infrastructure.** Gegenkraft is non-negotiable; without it the rest decays.
3. **Convert one opportunity to revenue.** Pick one CoolThAIngs lane and ship a paying customer.

---

## Part I — The Constellation (Life Domains Map)

| Tier | Domain | Channel(s) | State |
|------|--------|------------|-------|
| Core | Work / Money | FPCS, Tax HQ, Helpdesk | LIVE |
| Core | Automation | Bot HQ (Realbotville) | LIVE |
| Core | Security | SIM Swap Detector, SentryLion | LIVE |
| Core | Voice / AI Interface | JAP HQ, JAP Live | LIVE (Phase 0) |
| Core | Health / Habits | Gegenkraft | MVP, in active use |
| Scout | Opportunity Scanning | CoolThAIngs | Active, 5 leads |
| Scout | Media Capture | Twitch Recorder | MVP, purpose unsettled |
| Phase 1 | Ideas, Music, AI Music, Books, Art, Food | 6 channels | Planned |
| Phase 2 | Movies, My YouTube, AI Lab, Health, Business Card | 5 channels | Planned |
| Phase 3 | Dreams, Meditation, Good News, Games | 4 channels | Planned |

22 channels in the design, 7 live, 15 still to land.

---

## Part II — Inventory & Appraisal

Every project gets a scorecard: **Purpose · State · Value · Risk · Next Action**.

### A. Core Infrastructure

#### JustOut Hub (landing page)
- **Purpose:** Auth-gated constellation entry to the universe.
- **State:** LIVE. Firebase OAuth + SHA-256 email whitelist (3 users), CSP headers, audit log.
- **Value:** High — front door for everything.
- **Risk:** Firebase config embedded in HTML (acceptable for web auth, but rotate if leaked).
- **Next:** None. Hands off; works.

#### Channels Registry (`channels.json`)
- **Purpose:** Manifest of all 22 channels, drives the constellation UI.
- **State:** LIVE, last updated Mar 28.
- **Next:** Reconcile with Part V roadmap so planned channels reflect actual priority order, not aspirational order.

### B. Live Businesses

#### FPCS — Friendly PC Support
- **Purpose:** Tech-support business; primary income stream.
- **State:** Operational. Invoicing + jobs tracked via dashboard.
- **Risk:** Tax HQ shows 2022 prep — confirm 2023, 2024, 2025 are filed or in progress.
- **Next:** Audit which tax years are closed, which are open. Add a single line to Tax HQ noting current year status.

#### Tax HQ
- **Purpose:** Tax preparation dashboard for FPCS.
- **State:** 1,185 line items for 2022. Mature.
- **Risk:** Stale if newer years aren't being captured.
- **Next:** Confirm the rolling-year pipeline. If broken, this is a top-3 priority.

#### Bot HQ — Realbotville
- **Purpose:** Fleet command for 16 bots.
- **State:** LIVE. Business model unclear from repo.
- **Next:** Document — for each bot: what does it do, who pays (or who benefits), is it earning or costing.

#### Helpdesk
- **Purpose:** Issues / project tracker.
- **State:** LIVE since Mar 31, content count 0.
- **Next:** Either start using it as the canonical tracker for everything in this document, or retire it. Empty trackers rot.

#### SentryLion
- **Purpose:** Endpoint / fleet security.
- **State:** LIVE since Feb 28, content count 0.
- **Next:** Same as Helpdesk — populate or retire.

### C. Active Personal Projects

#### Gegenkraft — Gambling habit-breaking system
- **Purpose:** Quantified daily opposition to gambling habit. The most important project in this repo.
- **State:** MVP. Python sheet generator works; integrates with BEE for accountability.
- **Value:** Highest possible — health is infrastructure.
- **Risk:** A tracker is only as good as adherence. Single biggest failure mode: stopping the daily declaration.
- **Next (this week):** Generate a fresh 30-day sheet starting today (2026-04-25). Run morning declaration today. Set the accountability ping.

#### JAP — Just Ask Please (HQ + Live)
- **Purpose:** Voice command center bridging BEE → Claude Code → all channels.
- **State:** Phase 0 architecture done. Phase 1–3 planned. Recent iteration churn (BEE → mic → BEE).
- **Value:** High strategic — the interface that ties the universe together.
- **Risk:** Easy to keep redesigning instead of shipping. Pick a Phase 1 scope and freeze it.
- **Next:** Define Phase 1 done-criteria in 5 bullet points and stop redesigning until they're met.

#### CoolThAIngs — AI opportunity scanner
- **Purpose:** Surface monetizable AI frontier moves.
- **State:** 5 active leads (Claude Code Security, MCP Servers, Cline 2.0, Booking Bots, Agent SDK Teams).
- **Risk:** Discovery without conversion is a hobby. Five leads is enough — no more scanning until one converts.
- **Next:** See Part III — pick one lane, sign one paying customer.

#### SIM Swap Detector
- **Purpose:** Defensive education tool.
- **State:** LIVE, complete content.
- **Next:** Self-audit — apply the 7-step prevention protocol to your own carrier accounts this week. Document done/not-done.

#### Twitch Recorder
- **Purpose:** Stream capture + maroon-shirt dancer detection on `subeyvideography`.
- **State:** Working scripts, recent .ts capture, dancer-detection JSON output.
- **Risk:** No declared end-product. Effort without definition.
- **Next:** Decide in one sentence what this is for (clip extraction? archival? content study?). If no answer in one week → archive the directory.

### D. Planned Channels (15)

These exist in `channels.json` but have no backends. Treat them as "not real until shipped."
Phase 1: Ideas, Music, AI Music, Books, Art, Food.
Phase 2: Movies, My YouTube, AI Lab, Health, Business Card.
Phase 3: Dreams, Meditation, Good News, Games.

**Decision rule:** Do not start any Phase 1 channel until JAP Phase 1 ships and Gegenkraft is at 30-day streak.

### E. Domains, Identity, Access

- **Primary domain:** `hub.justout.today` (CNAME present).
- **Subdomains in flight:** 22 (some live, most reserved).
- **Auth:** Firebase project `fpcs-dashboard-63b25`, Google OAuth, SHA-256 whitelist of 3 emails.
- **Authorized users:** Commander (admin, you), Judith Marshall, Friendly Sales.
- **MCP servers configured:** `google-sheets`, `playwright`, `memory`, `sequential-thinking`.

### F. Media & Files

- `subeyvideography_20260411_720p.mp4` (~74 MB, repo root) — committed video file. **Should not live in git.** Move to external storage (Drive / S3) and remove from repo history if not already.
- `twitch-recorder/recordings/` — gitignored (correct).
- Gegenkraft-generated sheets — Drive folder `1yi4qVotXKBys3so3DuQaG5TginlMrCeo`.

---

## Part III — Aspirations, Goals, Directives

### Personal (highest priority)
- **G1 — Gegenkraft Master.** Reach 751+ points. Estimated 40–50 days of consistent practice from start.
- **G2 — Daily morning declaration.** Streak target: 30 days unbroken, then 90.
- **G3 — Carrier hardening.** Apply your own SIM Swap 7-step protocol to all phone lines.

### Business
- **G4 — One paying AI customer.** Pick one of the five CoolThAIngs lanes and close one client.
   - Recommended lane: **Local AI Booking Bot** — lowest difficulty, fastest cash, $300–$500/mo per client, validates a sales motion you can repeat.
   - Stretch lane: **MCP Server** — passive once shipped, but slower to revenue.
- **G5 — FPCS tax current.** All open tax years moved to "filed" or "in active prep" status.
- **G6 — Bot HQ P&L.** Each of the 16 bots labeled earning / costing / strategic, with monthly $ figure.

### Product
- **G7 — JAP Phase 1 shipped.** Frozen scope, 5 bullets, no redesign mid-flight.
- **G8 — Constellation pruned.** Channels in `channels.json` reflect actual roadmap, not wishlist.

### Standing Directives (rules you've already written for yourself)
- Daily morning declaration (Gegenkraft).
- Daily accountability ping.
- Cash the urge → divert to savings.
- Carrier: SIM lock + port-out lock + eSIM where possible + hardware-key 2FA.
- Scan opportunities 5×/day → **paused** until one lane converts (override of the existing CoolThAIngs cadence).

---

## Part IV — Rehabilitation: What Needs Repair

Honest list of what's drifting.

1. **Tax pipeline currency** — 2022 is mature; 2023+ unclear. Highest financial risk.
2. **Empty trackers** — Helpdesk and SentryLion are LIVE with 0 content. Either adopt or retire.
3. **JAP redesign loop** — multiple rewrites of Live (Firebase → mic → BEE). Freeze scope.
4. **Twitch Recorder drift** — no declared end-product. Decide or archive.
5. **15 planned channels with no backends** — `channels.json` is currently a wishlist masquerading as a roadmap.
6. **Large mp4 in git** — ~74 MB binary at repo root. Bloats clones, doesn't belong.
7. **No README / public architecture doc** — only code comments. This `LIFE.md` is the start of the fix.
8. **Service-account-key.json reference in `gegenkraft/`** — confirm it's gitignored and not present in history.
9. **Bot HQ ownership** — 16 bots, no documented purpose-per-bot or P&L.
10. **CoolThAIngs leads with no owner / no deadline** — five tagged opportunities, none assigned to a sprint.

---

## Part V — Order Restoration Roadmap

Hard-prioritized. Do them in order. Don't pull from later columns until earlier ones are done.

### NOW — This week (2026-04-25 → 2026-05-02)
1. **Run today's Gegenkraft declaration.** Generate a 30-day sheet starting today.
2. **Tax pipeline audit.** Open Tax HQ; for each year 2022–2025, mark filed / in-prep / not-started. One-line summary back here.
3. **Twitch Recorder verdict.** Write one sentence of purpose, or `git rm -r twitch-recorder/`.
4. **Repo cleanup.** Remove the ~74 MB mp4 from the working tree (move to Drive). Verify `service-account-key.json` is gitignored and absent from history.
5. **Apply SIM Swap protocol to your own lines.** Mark each of the 7 steps done/not.

### NEXT — This month (May 2026)
6. **Define JAP Phase 1 scope (5 bullets), freeze, build to that scope only.**
7. **Pick one CoolThAIngs lane** (default: Booking Bots). Set a target: one paying client by end of June.
8. **Bot HQ P&L pass.** For each of 16 bots: purpose + earning/costing/strategic + $.
9. **Helpdesk vs. SentryLion decision.** Adopt one as the canonical tracker for items in this file; retire or repurpose the other.
10. **Gegenkraft 30-day streak.**

### LATER — Q2/Q3 2026
11. **Ship JAP Phase 1.** Live feed, history, jap.justout.today.
12. **Close first paying AI customer.**
13. **Launch 2 Phase 1 channels** — recommend Ideas (capture) and Health (reinforces Gegenkraft). Defer the rest.
14. **Gegenkraft Master (751+ points).**

### HORIZON — Late 2026 / 2027
15. JAP Phase 2 (MCP integration, wake-word).
16. Second AI revenue lane (MCP server productization).
17. Phase 2 channels selectively, only if Phase 1 channels are actually used.
18. JAP Phase 3 (multi-agent orchestration, SaaS).

---

## Part VI — Project Scorecards (one-glance)

| Project | State | Priority | Health | Next Action |
|---|---|---|---|---|
| Gegenkraft | MVP, in use | P0 | Critical | Today's declaration + 30-day sheet |
| FPCS / Tax HQ | LIVE | P0 | Unknown post-2022 | Audit open years |
| JustOut Hub | LIVE | P1 | Healthy | Hands off |
| JAP HQ / Live | Phase 0 | P1 | Redesign loop | Freeze Phase 1 scope |
| CoolThAIngs | Active | P1 | Lead, no conversion | Pick Booking Bots lane |
| Bot HQ | LIVE | P2 | Opaque | Per-bot P&L |
| Helpdesk | LIVE empty | P2 | Drifting | Adopt or retire |
| SentryLion | LIVE empty | P2 | Drifting | Adopt or retire |
| SIM Swap Detector | LIVE | P2 | Healthy | Self-apply protocol |
| Twitch Recorder | MVP | P3 | Aimless | Define or archive |
| 15 planned channels | Wishlist | P3 | Frozen | Do not start |

P0 = do now. P1 = active focus. P2 = decide/finish. P3 = frozen until P0/P1 clear.

---

## Part VII — Cadence & Review

- **Daily:** Morning declaration · accountability ping · Gegenkraft entry.
- **Weekly (Sun 20 min):** Update Part VI scorecards. One sentence per row: what moved.
- **Monthly:** Re-walk Part IV (rehabilitation list) — items resolved get crossed; new drift gets added.
- **Quarterly:** Re-walk Part V. Reorder. Promote NEXT → NOW; demote nothing without a written reason.

This file is the canonical record. When it disagrees with `channels.json` or any dashboard, **this file wins** until it's reconciled.
