# The Living Journal

> *Memories are like travelers — you never know when they will show up. But you must always be ready anyway.*

This is a journal that writes itself slowly, the way memory actually works.

You don't sit down to write. You drop fragments — a sentence, a smell, a face, a half-thing — into the journal whenever they arrive. Some are travelers passing through. Some return. The ones that return start to gather, and an entry begins to form.

You don't finish entries. The journal does — gradually, as more fragments arrive and the shape becomes clear. An entry might be a single line for weeks, then grow a paragraph the night three related fragments land together. The next morning it's a chapter. None of it forced.

---

## How it lives

```
fragments/   →  raw memory pieces, append-only, never edited
threads.json →  clusters: which fragments belong together
entries/     →  woven entries, growing through stages
tools/       →  capture + weave instructions
```

### The stages of an entry

| Stage          | Meaning                                                      |
|----------------|--------------------------------------------------------------|
| **seedling**   | One fragment. Alone. Waiting for kin.                        |
| **sprouting**  | 2–3 fragments. A rough draft, a few sentences. Listening.    |
| **blooming**   | 4+ fragments. Full paragraphs. Coherent. Still open.         |
| **crystallized** | Closed by you, by hand. The memory has fully arrived.      |

A crystallized entry can re-open if a new fragment lands that contradicts or deepens it. **Memory is allowed to revise itself.**

Nothing is ever deleted.

---

## The cycle

1. **CAPTURE.** Drop a fragment whenever one arrives.
   ```
   ./tools/capture.sh "the smell of my grandmother's kitchen, even now, twenty years later"
   ```
   That's it. No tagging required. No commitment. Just leave it.

2. **WEAVE.** Periodically — daily, weekly, whenever — an AI agent reads new fragments and:
   - Files each fragment into an existing thread, or starts a new one.
   - Drafts or updates the entry for that thread.
   - Promotes entries between stages as fragments accumulate.
   - Never rewrites your words. Where fragments are silent, leaves silence.

   See `tools/weave.md` for the full weaving protocol.

3. **READ.** Open `entries/` any time. You'll see partial entries today; you may see completed ones tomorrow because new fragments connected overnight.

---

## Promises this journal makes to you

- **It will not make things up.** Where fragments don't speak, the entry stays quiet.
- **It will not delete.** Fragments and entry history are append-only.
- **It will not rush.** A seedling can stay a seedling for years. A thread can dissolve and re-form.
- **It will use your voice.** Drafts pull directly from your fragment text wherever possible.
- **You always own the close.** Only you crystallize an entry. AI never does.

These promises are enforced by the **AI Charter** (`AI-CHARTER.md`, v1.0), which binds every AI you work with on this journal. See `PREFLIGHT.md` for the copy-paste briefing to use with any new AI session, and `charter.json` for the machine-readable spec. After every write, `tools/verify.py` checks the structural invariants.

---

## Where to start

You already started. The first fragment is in `fragments/`. The first thread is open. The first entry is a seedling.

Drop the next one when it arrives.
