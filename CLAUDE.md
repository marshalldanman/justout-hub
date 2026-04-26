# CLAUDE.md — repo-level guidance

This is **justout-hub**, the personal hub for `hub.justout.today`. The canonical Project of Life document is `PRIVATE-LIFE.md` (gitignored, local-only). `LIFE.md` is the public skeleton; if you need priorities, scorecards, or the roadmap, read `PRIVATE-LIFE.md` from the working tree. If it's missing on this device, surface that to the user — don't reconstruct from memory.

## Working in this repo

- Branch convention: feature work goes on `claude/<topic>-<id>` branches.
- Each top-level directory is a project; treat them as semi-independent.
- The mp4 file at the repo root is legacy bloat — do not commit more binaries.
- MCP servers configured: `google-sheets`, `playwright`, `memory`, `sequential-thinking`. See `.mcp.json`.

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

## Standing directive: PRIVATE BY DEFAULT

**Any new project, repository, deployment, dataset, document, or hosted artifact is private by default. Never publicize without an explicit ask.**

This applies to:
- New GitHub repositories — create as `private`. Never `public`.
- New deployments / Pages sites / hosted resources — visibility off by default; gated behind auth.
- New shared documents, sheets, drives — link sharing off; explicit invites only.
- New domains and subdomains — DNS public is fine, but the resource it points to must be auth-gated unless the user says otherwise.
- New code that exposes data — assume the data is sensitive until told otherwise.

If a task requires public visibility (e.g., a marketing landing page, an open-source library), **confirm with the user first** and proceed only after explicit approval. Casual phrases like "just put it up" or "ship it" do **not** authorize public exposure.

When unsure: pick private. Reversing public → private is harder than the opposite.
