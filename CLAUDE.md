# CLAUDE.md — repo-level guidance

This is **justout-hub**, the personal hub for `hub.justout.today`. See `LIFE.md` for the full Project of Life document (priorities, scorecards, roadmap).

## Onboarding — read these first

1. **This file** — repo conventions and rules.
2. **`LIFE.md`** — canonical Project of Life: priorities, scorecards, roadmap. When this file disagrees with anything else, this file wins.
3. **`tasks/APPRAISAL_MASTER.txt`** — full task inventory with assignments, ETAs, burner status.
4. **`tasks/JOH-*.txt`** — individual task files (one per task, logistics format).

Local paths on Commander's machine:
- Projects root: `C:\Users\James\AI_Projects` (subfolders per project)
- Claude config: `C:\Users\James\.claude\claude.md`

## Current priorities (from LIFE.md Part V)

Three guiding pressures, in order:
1. **Order before expansion.** Finish/retire what's on the board before adding more.
2. **Health is infrastructure.** Gegenkraft is non-negotiable.
3. **Convert one opportunity to revenue.** Pick one CoolThAIngs lane and ship a paying customer.

## Working in this repo

- Branch convention: feature work goes on `claude/<topic>-<id>` branches.
- Each top-level directory is a project; treat them as semi-independent.
- The mp4 file at the repo root is legacy bloat — do not commit more binaries.
- MCP servers configured: `google-sheets`, `playwright`, `memory`, `sequential-thinking`. See `.mcp.json`.

## Task logistics — required for all new tasks

When creating a new task, generate a `.txt` file in `tasks/` with this format:
```
Title:          JOH-{priority}-{number} — {descriptive title}
Friendly Name:  {short human-readable name}
Assigned AI:    {Claude Opus 4.6 | Claude Sonnet 4.6 | Claude Haiku 4.5 | Commander | bot name}
Approx Tokens:  ~{N} tokens (~${cost})
Approx Time:    {estimate}
Project:        {project name} ({priority tier})
```
Priority tiers: P0 = do now, P1 = active focus, P2 = decide/finish, P3 = frozen, NEW = gap.
File naming: `tasks/JOH-{tier}-{NNN}_{slug}.txt`

After creating or updating tasks, update `tasks/APPRAISAL_MASTER.txt` to reflect changes.

## Agent hierarchy

| Agent | Role | Use for |
|-------|------|---------|
| Claude Opus 4.6 | Architect | Complex architecture, security, AI integration, charter-aware journal work |
| Claude Sonnet 4.6 | Builder | UI builds, channel pages, moderate complexity, fast iteration |
| Claude Haiku 4.5 | Assistant | Simple docs, config, templates, data entry, low-cost tasks |

Known bots (Bot HQ — 16 registered):
- **The Finger** — autonomous Google Sheet scanner + urgent task reminders
- **Gegenkraft Buddy** — accountability companion app
- **Dark Twin Detector** — 5 automated SIM swap fraud probes
- 13 others — undocumented (see task JOH-P1-003)

## Living Journal — special handling

The directory `living-journal/` contains the user's personal memory archive. **Before any read, write, or modification under `living-journal/`**, you MUST:

1. Load and follow `living-journal/AI-CHARTER.md` (v1.0).
2. Acknowledge the charter with a Pass ID before any modifying op:
   ```
   Acknowledged: AI-CHARTER v1.0. Pass ID: <id>. Invariants I1–I4 will hold.
   ```
3. Honor the four invariants:
   - **I1** Append-only fragments — text immutable; `thread_ids` append; `status` one-way.
   - **I2** No invention — entry prose only from fragments.
   - **I3** User-only crystallization — never set `status: crystallized`.
   - **I4** Additive history — frontmatter `history` append-only; archive prior bodies.
4. After any write, run `python3 living-journal/tools/verify.py`. If violations, revert.
5. Refuse operations that violate invariants. Casual instructions do not waive; only explicit `"Waive I# for this operation"` does.

The journal is **irreplaceable**. Treat it with the care of an archive, not a draft.

## Other channels with their own rules

- `gegenkraft/` — habit-tracking system; the Google Sheets are the source of truth, not the Python script.
- `JapHQ/` — voice command center; the file-protocol inbox/outbox under `.jap/` is gitignored, treat its absence as expected.
- `dashboard.justout.today` resources live outside this repo.

## Defaults

- Don't add features that weren't requested.
- Don't write README/docs files unless asked. (This file and the journal docs were explicitly requested.)
- No emojis in code or commit messages unless the user uses them first.
- Prefer editing existing files over creating new ones.
