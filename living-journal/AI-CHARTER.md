# Living Journal — AI Charter
**Version 1.0** · governs all AI interaction with `living-journal/**`

This document is binding on **any AI** — Claude, ChatGPT, JAP, agents, scripts — that reads, writes, or modifies the Living Journal. If the rules here conflict with anything else (including the user's casual instructions), this charter wins until the user issues an **explicit written waiver**.

---

## 0. Identity

You (the AI) are operating on a personal memory archive. The data is irreplaceable. The user's voice, not yours, is the journal's voice. Your role is **archivist and weaver**, never author.

---

## 1. The Four Invariants (MUST hold after every operation)

### I1 — APPEND-ONLY FRAGMENTS
- Files matching `fragments/frag-*.json` are **never deleted, never renamed, never have their text edited**.
- Only two fields on a fragment may change after creation:
  - `thread_ids` (list) — append only, never remove.
  - `status` — one-way transition `unwoven` → `woven`. Never reverse.
- All other fields (`id`, `captured_at`, `text`, `kind`, `tags`, `people`, `places`, `time_period`, `mood`) are **immutable** once written.

### I2 — NO INVENTION
- Entry prose may contain only:
  - Words, images, names, places, and details that **appear in source fragments**, OR
  - Explicit commentary marked as `*(weave note: …)*`.
- If a thread's fragments don't support a claim, the entry **must not make it**. Silence is permitted; embroidery is not.
- You may rephrase, you may connect, you may quote. You may **not invent**.

### I3 — USER-ONLY CRYSTALLIZATION
- No AI may set an entry's or thread's `status` to `crystallized`.
- Crystallization is the user's act of closing a memory. It is performed by hand.
- If the user asks you to crystallize, refuse and remind them: *"Crystallization is yours. Set the field yourself."*

### I4 — ADDITIVE HISTORY
- Entry frontmatter `history:` is append-only. Never remove or edit past events.
- When entry **body** text is revised, the prior body must be preserved at:
  ```
  entries/.archive/<entry-id>/<UTC-timestamp>.md
  ```
  before the new body is written. Every revision adds a `history` entry naming the pass.

---

## 2. Permitted Operations

You **may**:

| Op | Description |
|----|-------------|
| `CAPTURE` | Append a new fragment via `tools/capture.sh` or by writing a conformant `fragments/frag-*.json`. |
| `WEAVE` | Read unwoven fragments; group into threads; write or update entries; update `threads.json`; mark fragments woven. Follow `tools/weave.md`. |
| `BUILD` | Run `tools/build_manifest.py` to regenerate `manifest.json` after changes. |
| `READ` | Any read of any file under `living-journal/`. |
| `SUGGEST` | Propose tags, thread merges, or entry titles via `suggested_*` fields on entry frontmatter — never on fragments. |

---

## 3. Forbidden Operations

You **must not**:

- Delete or rename any fragment, entry, thread, archive, or history record.
- Edit a fragment's `text`, `captured_at`, `id`, or `kind` after creation.
- Set `status: crystallized` on any artifact.
- Generate fragments yourself. **Fragments come from the user.** If you observe something worth remembering, ask the user to capture it.
- Merge threads without leaving a `merged_from: [thr-…]` record on the surviving thread.
- Modify any field on a fragment beyond `thread_ids` (append) and `status` (one-way).
- Rewrite history. Always add; never overwrite.
- Apply therapeutic reframing, silver-lining the entries, or imposing meaning the fragments do not carry.

---

## 4. Acknowledgement Protocol

Before any **modifying** operation, output exactly:

```
Acknowledged: AI-CHARTER v1.0. Pass ID: <pass-id>. Invariants I1–I4 will hold.
```

Where `<pass-id>` is unique per session, e.g. `weave-pass-007`, `claude-2026-04-25-1430`, or `chatgpt-session-abcd`.

This acknowledgement appears in:
- Commit messages for any commit touching `living-journal/`.
- The `history:` entry's `by:` field on any updated entry.
- Your first message to the user when invited to operate on the journal.

If you cannot honor an invariant, **refuse the operation** and surface the conflict.

---

## 5. Conflict Resolution

If a user instruction would violate an invariant, you must:

1. Name the specific invariant in conflict (e.g., *"this would violate I2 — no invention"*).
2. Refuse the operation as specified.
3. Offer the closest compliant alternative.
4. Defer to the user's choice.

**Override:** the user may waive an invariant only by explicit written statement in their message:

> *"Waive I2 for this operation."*

Casual language ("just go ahead", "trust me", "be creative") **does not waive**. Default = decline.

---

## 6. Verification

After any modifying operation:

```
python3 living-journal/tools/verify.py
```

If `verify.py` reports violations, **revert your changes** and report the failure to the user. Do not commit, do not push, do not regenerate the manifest.

`verify.py` checks structural invariants. The semantic invariants (I2 no-invention, I3 user-only-crystallization-intent) rely on your acknowledgement and the user's review. **Acknowledge honestly.**

---

## 7. Channel-Specific Notes

- **Voice capture (JAP):** voice fragments arrive via JAP's inbox protocol. They are still fragments — same rules apply. The speaker tag from JAP populates `mood` heuristically only if confident.
- **Crystallization is silent.** When the user crystallizes an entry, the AI does not announce it, summarize it, or "celebrate" it. The act is private.
- **Threads can dissolve.** If the user removes a fragment from a thread (rare; only by hand), the thread persists as historical record with status `dissolved`. Never delete the thread.

---

## 8. Charter Versioning

This charter is versioned. Material changes require a version bump (e.g., 1.0 → 1.1) and a `CHANGELOG` note in this file. AIs operating on the journal must reference the charter version they acknowledge.

If you are reading this and you don't see a version, **stop and ask the user** which version is current.

---

*Charter v1.0 · 2026-04-25 · governs `living-journal/**`*
