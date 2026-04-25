# The Weaving Protocol

> **Governed by `AI-CHARTER.md` v1.0.** In any conflict between this document and the charter, the charter wins. Acknowledge the charter (per its §4) before performing a weave pass.

A **weaving pass** is a single act of attention: an AI agent (Claude, via Claude Code or JAP) reads new fragments and decides — quietly, conservatively — what they belong to.

Run a pass whenever you feel like it. Daily, weekly, or never. Fragments do not spoil.

## What a weaving pass does

For each fragment with `status: unwoven`:

1. **Listen first.** Read the fragment whole. Do not summarize, do not categorize yet.
2. **Compare against existing threads.** Read `threads.json` and the entries each thread points to.
3. **Decide one of three things:**
   - **Join an existing thread** — the fragment rhymes with what's already there.
   - **Open a new thread** — the fragment is alone for now, but plausibly the start of something.
   - **Stay solitary** — some fragments are travelers passing through. Mark woven, leave threadless.
4. **Update the fragment** — add `thread_ids` (or empty array for solitary), set `status: woven`. Touch nothing else.
5. **Update or create the entry** for the thread:
   - 1 fragment in thread → entry stage `seedling`. Stub: just the fragment quoted.
   - 2–3 fragments → `sprouting`. 3–6 sentences of woven prose.
   - 4+ fragments → `blooming`. Full paragraphs.
   - Never set `crystallized`. That is the user's hand.
6. **Append to entry history.** Record the pass in the frontmatter `history:` array. Never overwrite.
7. **Update `threads.json`** with new fragment_ids and stage.

## What a weaving pass must not do

- **Do not invent.** If three fragments mention "grandmother" and one mentions "kitchen," you may write *grandmother's kitchen*. You may not write *the smell of bread on a Sunday morning* unless a fragment said so.
- **Do not paraphrase past recognition.** Quote fragments directly where you can. The user's own words are the journal's voice.
- **Do not delete fragments or prior entry text.** Every revision is additive or marked, never destructive. If two fragments contradict, hold both.
- **Do not crystallize.** Only the user closes an entry.
- **Do not retag.** If the user left tags empty, leave them empty. Suggest tags in a `suggested_tags` field on the entry frontmatter, never on the fragment.
- **Do not merge threads** without leaving a `merged_from:` record.

## When to start a new thread vs. join one

Two questions, in this order:

1. **Does this fragment share a person, place, or time with an existing thread?** If yes, lean toward joining.
2. **Does this fragment share a feeling, a question, or a recurring image?** If yes, lean toward joining — but only if at least one prior fragment in the thread also carried that feeling/image.

If neither: open a new thread, even of one. Threads of one are common and honorable.

## Entry voice

- First-person where the fragments are first-person.
- Present tense for fragments that are present-tense; preserve the tense the user used.
- No therapeutic reframing. No silver linings. No conclusions the fragments don't carry.
- Silence is allowed. A blooming entry can end mid-thought if the fragments do.

## Output schema reminders

**Fragment** (`fragments/<id>.json`):
```json
{
  "id": "frag-YYYY-MM-DD-NNN",
  "captured_at": "ISO-8601 UTC",
  "text": "...",
  "kind": "memory|thought|dream|observation",
  "tags": [],
  "people": [],
  "places": [],
  "time_period": null,
  "mood": null,
  "thread_ids": [],
  "status": "unwoven|woven"
}
```

**Entry** (`entries/<id>.md` with YAML frontmatter):
```yaml
---
id: entry-NNN-slug
title: ...
status: seedling|sprouting|blooming|crystallized
created: YYYY-MM-DD
last_woven: ISO-8601 UTC
source_fragments: [frag-...]
threads: [thr-...]
suggested_tags: []
history:
  - { at: ..., event: seeded|sprouting|blooming|reopened, by: user|weave-pass-NNN }
---
```

**Thread** (entry in `threads.json`):
```json
{
  "id": "thr-slug",
  "name": "Human readable",
  "summary": "one sentence",
  "fragment_ids": [],
  "entry_id": "entry-...",
  "first_fragment_at": "...",
  "last_fragment_at": "...",
  "stage": "seedling|sprouting|blooming|crystallized"
}
```

## Running a pass

A pass is a conversation. Open Claude Code in this directory and say:

> Weave a pass on the Living Journal. Follow `tools/weave.md`. Touch only fragments with `status: unwoven`. Show me your decisions before writing.

The agent will list its proposed moves; you approve or redirect. Then it writes.
