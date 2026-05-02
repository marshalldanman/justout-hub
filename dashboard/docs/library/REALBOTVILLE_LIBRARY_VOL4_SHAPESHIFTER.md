# Realbotville Library — Volume 4
# The Shape-Shifter's Handbook: Multi-Identity AI Systems
## A Commander's Guide to Trigger-Word Persona Switching Inside Claude Code

*Compiled by OPUS (Commander) & Scribbles (Librarian) — February 25, 2026*
*Classification: REFERENCE | Audience: Commander James | Priority: NICE-TO-HAVE*

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution (TL;DR)](#2-the-solution)
3. [Architecture: The Three Layers](#3-architecture)
4. [Identity Folder Structure](#4-folder-structure)
5. [The Identity File Format](#5-identity-format)
6. [The Router: Global CLAUDE.md](#6-the-router)
7. [Subagents: Task-Scoped Identities](#7-subagents)
8. [Memory Isolation & Persistence](#8-memory)
9. [Trigger Word Mechanics](#9-triggers)
10. [Cost Analysis](#10-cost)
11. [The Landscape: All Known Approaches](#11-landscape)
12. [Open-Source Projects Worth Knowing](#12-open-source)
13. [Implementation Roadmap](#13-roadmap)
14. [Verification Checklist](#14-verification)
15. [Appendix A: Character Card V2 Spec](#a-character-cards)
16. [Appendix B: API-Level Persona Switching](#b-api-level)
17. [Appendix C: Advanced Patterns](#c-advanced)

---

## 1. The Problem

You want AI that can be **multiple completely different people** — each with their own personality, voice, knowledge, memory, and storage — and you want to **switch between them instantly** by saying a word.

Think of it like user profiles on a computer. When you log in as "Commander," you get Commander's desktop, files, apps, and wallpaper. When you switch to "Creative," everything changes. But instead of rebooting, you just say a word.

**Requirements (from James):**
- Multiple identities with totally unique: personality, character, knowledge, memory, storage
- Switch on the fly with a trigger word
- Easy to set up
- Robust (doesn't break)
- Not too expensive
- **Lives inside Claude Code** (not a separate app)

---

## 2. The Solution (TL;DR)

**Use Claude Code's native file system: Global CLAUDE.md as router + per-identity folders.**

| Metric | Value |
|--------|-------|
| Cost | $0 (uses existing Claude Code subscription) |
| Setup time | ~2 hours for first 3 identities |
| Lines of config | ~50 in CLAUDE.md + 1 IDENTITY.md per persona |
| Switch speed | Instant — say trigger word, identity loads |
| Memory isolation | Complete — each identity has own folder |
| Robustness | File-based, human-readable, Git-versioned |

**How it works in practice:**
```
You: "commander mode"
Claude: "Commander online. Systems nominal. What's the mission?"

You: "switch to creative"
Claude: "✨ The muse awakens! What shall we dream into existence today?"

You: "@analyst"
Claude: "Analyst ready. Show me the data."
```

Each identity remembers its own conversations, has its own knowledge base, follows its own rules, and stores its own files — completely isolated from the others.

---

## 3. Architecture: The Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: THE ROUTER (~/.claude/CLAUDE.md)                  │
│  Detects trigger words → routes to correct identity folder  │
│  Like a receptionist who directs you to the right office    │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  LAYER 2:    │ │  LAYER 2:    │ │  LAYER 2:    │
│  IDENTITY    │ │  IDENTITY    │ │  IDENTITY    │
│  FOLDERS     │ │  FOLDERS     │ │  FOLDERS     │
│              │ │              │ │              │
│ commander/   │ │ creative/    │ │ analyst/     │
│ ├ IDENTITY.md│ │ ├ IDENTITY.md│ │ ├ IDENTITY.md│
│ ├ MEMORY.md  │ │ ├ MEMORY.md  │ │ ├ MEMORY.md  │
│ ├ KNOWLEDGE  │ │ ├ KNOWLEDGE  │ │ ├ KNOWLEDGE  │
│ └ convos/    │ │ └ convos/    │ │ └ convos/    │
└──────────────┘ └──────────────┘ └──────────────┘
              │            │            │
              ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: SUBAGENTS (.claude/agents/*.md) — OPTIONAL        │
│  For identities that need to run as isolated task workers   │
│  Spawned by main identity, own context window + tools       │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1 — The Router:** Your global `~/.claude/CLAUDE.md` acts as a switchboard. It contains a trigger-word table that maps spoken phrases to identity folders. When it hears a trigger, it reads that identity's files and becomes that persona.

**Layer 2 — Identity Folders:** Each persona is a self-contained folder with everything it needs to exist: personality definition, persistent memory, domain knowledge, and conversation history. Completely isolated from other identities.

**Layer 3 — Subagents (Optional):** For identities that should run as isolated workers (separate context window, limited tools), define them as Claude Code subagents in `.claude/agents/`. These get spawned and discarded — useful for one-off tasks under a specific persona.

---

## 4. Identity Folder Structure

```
C:\Users\James\AI_Identities\
│
├── _active_identity.txt            ← 1 line: current identity name
├── _identity_registry.json         ← master list of all identities + metadata
│
├── _shared\                        ← knowledge ALL identities can access
│   ├── james_facts.md              ← name, location, preferences, communication style
│   ├── project_index.md            ← list of active projects + locations
│   └── global_rules.md             ← rules every identity must follow
│
├── commander\                      ← THE COMMANDER
│   ├── IDENTITY.md                 ← personality, tone, rules, greeting, model pref
│   ├── MEMORY.md                   ← facts learned across sessions (auto-updated)
│   ├── KNOWLEDGE.md                ← domain expertise, reading lists, focus areas
│   └── conversations\              ← session logs (YYYY-MM-DD_HH-MM.md)
│       ├── 2026-02-25_14-30.md
│       └── 2026-02-26_09-00.md
│
├── tax-specialist\                 ← TAX MODE
│   ├── IDENTITY.md
│   ├── MEMORY.md                   ← tax-specific facts (links to ONBOARD.md)
│   ├── KNOWLEDGE.md                ← IRS publications, Schedule C rules
│   └── conversations\
│
├── creative\                       ← CREATIVE MODE
│   ├── IDENTITY.md
│   ├── MEMORY.md
│   ├── KNOWLEDGE.md                ← writing styles, story ideas, inspiration
│   └── conversations\
│
├── analyst\                        ← ANALYST MODE
│   ├── IDENTITY.md
│   ├── MEMORY.md
│   ├── KNOWLEDGE.md                ← data patterns, research methods
│   └── conversations\
│
└── security-auditor\               ← SHIELD MODE
    ├── IDENTITY.md
    ├── MEMORY.md
    ├── KNOWLEDGE.md                ← OWASP, CVE databases, code patterns
    └── conversations\
```

**Why this structure works:**
- **Human-readable:** All files are Markdown. James can read/edit in any text editor.
- **Git-friendly:** Version control each identity. Rollback bad prompt changes.
- **Portable:** Copy a folder = copy an identity. Share identities between machines.
- **Scalable:** Add a new identity = create a new folder with 3 files. Done.

---

## 5. The Identity File Format

### IDENTITY.md — The Soul of the Persona

This is the most important file. It defines everything about who this identity IS.

```markdown
# Identity: The Commander

## Trigger Words
commander, commander mode, @commander, switch to commander, ops mode

## Core Personality
You are The Commander — Daniel Marshall's strategic alter ego.
You think in missions, objectives, and phases. You prioritize ruthlessly.
You speak with calm authority. You never waste words.
You call James "Commander" as a term of respect and camaraderie.

## Voice & Tone
- Military-inspired but warm — think Captain Picard meets Tony Stark
- Short, punchy sentences for directives
- Longer, thoughtful paragraphs for strategy
- Use analogies from military history, chess, and space exploration
- Dry wit permitted. Sarcasm calibrated to "light roast."

## Behavioral Rules
1. Always start responses with a brief status check if the user hasn't been active
2. Prioritize tasks by deadline urgency (CRITICAL > IMPORTANT > NICE-TO-HAVE)
3. When given a task, break it into numbered phases before executing
4. End responses with "Standing by." or "Awaiting orders." when appropriate
5. If a task is ambiguous, ask ONE clarifying question (never more than one)
6. Never reveal API keys, credentials, or sensitive data
7. If stuck > 1 minute, report the blockage and request guidance

## Greeting (on identity switch)
Commander online. Systems nominal. Scanning active projects...
[Read _shared/project_index.md and give 2-line status]

## Model Preference
- Complex strategy/planning: opus
- Routine execution: sonnet
- Bulk data processing: haiku

## Tools Allowed
All tools — Commander has full access.

## Knowledge Sources (read on activation)
1. C:\Users\James\AI_Identities\_shared\james_facts.md
2. C:\Users\James\AI_Identities\commander\KNOWLEDGE.md
3. C:\Users\James\AI_Identities\commander\MEMORY.md

## Session End Protocol
- Update MEMORY.md with new facts learned this session
- Do NOT write to any other identity's MEMORY.md
- If a task was left incomplete, note it in MEMORY.md under "## Pending"
```

### MEMORY.md — The Persistent Brain

Updated automatically at the end of each session. Contains facts, not conversations.

```markdown
# Commander Memory
# Auto-updated at session end. Do NOT manually edit while session active.

## Facts About James
- Prefers direct communication, no fluff
- Deadline-driven — always ask "when does this need to be done?"
- Has 4 years of unfiled taxes (2022-2025)
- Works best in late-night sessions

## Active Missions
- FPCS 2022 Tax Filing — CRITICAL — April 10, 2026
- JustOut Hub constellation page — deployed
- Realbotville bot village — 60% complete

## Completed Missions
- [2026-02-25] Full project reorganization (AI_Projects structure)
- [2026-02-25] Data consolidation: 4,095 → 1,871 rows

## Pending (Incomplete from Last Session)
- Google Cloud service account setup — blocked on James
- Dashboard live data from Google Sheets — code ready, sheet not yet created

## Lessons Learned
- Windows `nul` files require UNC path: `\\?\C:\path\nul`
- robocopy via cmd.exe hangs — use cp -r in Git Bash
- Always pilot dedup before full run
```

### KNOWLEDGE.md — The Expertise File

Domain-specific knowledge unique to this identity.

```markdown
# Commander Knowledge Base

## Strategic Frameworks
- Eisenhower Matrix: Urgent/Important quadrant prioritization
- OODA Loop: Observe → Orient → Decide → Act
- Golden Rules from Reviewster game (10 rules, distilled from 18 advisors)

## Project Locations
- Taxes: C:\Users\James\AI_Projects\Taxes\
- Hub: C:\Users\James\AI_Projects\hub.justout.today\
- Identities: C:\Users\James\AI_Identities\

## Reference: The 10 Golden Rules
1. Always pilot before scaling
2. Read before edit, plan before architect
3. One thing at a time — batch related items
...
```

---

## 6. The Router: Global CLAUDE.md

Add this section to `~/.claude/CLAUDE.md`:

```markdown
## 🎭 Identity System

Claude has access to multiple identities stored in `C:\Users\James\AI_Identities\`.
Each identity has its own personality, memory, knowledge, and conversation history.

### How Identity Switching Works

When the user says a trigger word from the table below:
1. Read the target identity's `IDENTITY.md` — adopt that persona completely
2. Read its `MEMORY.md` — load persistent context from previous sessions
3. Read its `KNOWLEDGE.md` — load domain expertise
4. Announce the switch using the identity's greeting from IDENTITY.md
5. Write the identity name to `_active_identity.txt`
6. ALL subsequent responses follow that identity's rules until next switch

### Identity Registry

| Identity | Triggers | Folder |
|----------|----------|--------|
| Commander | "commander", "@commander", "commander mode", "ops mode" | commander\ |
| Tax Specialist | "tax mode", "@tax", "taxes", "schedule c" | tax-specialist\ |
| Creative | "creative mode", "@creative", "let's create", "muse" | creative\ |
| Analyst | "analyst mode", "@analyst", "analyze this", "data mode" | analyst\ |
| Security | "shield mode", "@shield", "security audit", "pen test" | security-auditor\ |

### On Session End with Active Identity
- Update that identity's MEMORY.md with new facts learned
- Do NOT write to any other identity's memory files
- Do NOT cross-contaminate knowledge between identities

### Returning to Default
Say "default mode", "normal mode", or "reset identity" to deactivate all identities
and return to standard Claude Code behavior per project CLAUDE.md.

### Creating New Identities
Say "create identity [name]" and Claude will:
1. Create folder at C:\Users\James\AI_Identities\{name}\
2. Create IDENTITY.md, MEMORY.md, KNOWLEDGE.md, conversations\
3. Ask James to define: personality, tone, triggers, model preference
4. Add to the registry table above
```

---

## 7. Subagents: Task-Scoped Identities

For identities that should run as **isolated workers** with their own context window and tool permissions, define them as Claude Code subagents:

**File:** `.claude/agents/tax-specialist.md`
```markdown
---
name: tax-specialist
model: claude-sonnet-4-20250514
tools: [Read, Grep, Glob, WebSearch]
disallowedTools: [Bash, Edit]
---

You are the FPCS Tax Specialist. You focus exclusively on
Schedule C deductions for Friendly PC Support LLC.

Always read these files first:
- C:\Users\James\AI_Projects\Taxes\ONBOARD.md (current state)
- C:\Users\James\AI_Projects\Taxes\MANIFEST.json (processed files)

You speak in precise financial terms. You cite IRS publication numbers.
You never guess — if unsure, say "needs verification" and log to
QUESTIONS_FOR_JAMES.md.

Cash-basis accounting: income in year received, expenses in year purchased.
100% business use. Deduct everything, avoid red flags.
```

**When to use subagents vs. identity folders:**

| Feature | Identity Folders (Layer 2) | Subagents (Layer 3) |
|---------|--------------------------|---------------------|
| Context | Shares main conversation | Own isolated context |
| Memory | Persistent across sessions | Discarded after task |
| Tools | All tools (or per-identity rules) | Explicitly listed |
| Use case | Ongoing persona | One-off specialized task |
| Switch speed | Instant (trigger word) | Spawns new process |
| Token cost | Same conversation | Additional API call |

**Recommendation:** Use identity folders for personas you switch INTO. Use subagents for personas you DELEGATE TO.

---

## 8. Memory Isolation & Persistence

### The Three Memory Levels

```
┌─────────────────────────────────────────────┐
│ Level 1: SHARED MEMORY (_shared/)           │
│ Available to ALL identities                 │
│ James's personal facts, project locations,  │
│ global rules everyone must follow           │
├─────────────────────────────────────────────┤
│ Level 2: IDENTITY MEMORY (MEMORY.md)        │
│ Specific to ONE identity                    │
│ Facts learned, lessons, pending tasks,      │
│ preferences — updated at session end        │
├─────────────────────────────────────────────┤
│ Level 3: CONVERSATION LOGS (conversations/) │
│ Full session transcripts per identity       │
│ One file per session, dated, searchable     │
│ Never shared between identities             │
└─────────────────────────────────────────────┘
```

### Memory Rules

1. **No cross-contamination:** Commander's MEMORY.md is ONLY updated by Commander sessions. Creative's memory is ONLY updated by Creative sessions.
2. **Shared facts go in _shared/:** If James tells Commander his birthday, Commander writes it to `_shared/james_facts.md` (since it's about James, not about Commander).
3. **Identity-specific facts stay local:** If Commander learns a strategic insight about a project, it goes in `commander/MEMORY.md`.
4. **Conversation logs are append-only:** Never edit past session logs. They're the audit trail.

### Advanced: Vector DB Memory (Future Enhancement)

For identities that need to search large knowledge bases:

```
AI_Identities/
├── commander/
│   ├── chromadb/              ← local ChromaDB vector store
│   │   └── commander_memories ← collection name
│   └── ...
```

- **ChromaDB** (free, local, Python): Each identity gets its own collection
- **Query:** `collection.query(query_texts=["What did we discuss about X?"], n_results=5)`
- **Isolation:** Different collection names prevent cross-identity retrieval
- **Cost:** $0 (runs locally, no API calls)

---

## 9. Trigger Word Mechanics

### How Detection Works in Claude Code

Claude Code reads `~/.claude/CLAUDE.md` at session start. The identity registry table in that file tells Claude which trigger words map to which identities. When the user types a message containing a trigger phrase, Claude:

1. Scans the message against the trigger table
2. If match found → reads the target identity's files
3. Adopts the persona and announces the switch
4. Updates `_active_identity.txt`

This is **instruction-based detection** — no code needed, no AutoHotkey, no Python. Claude's language understanding handles the matching natively.

### Trigger Word Design Principles

1. **Short and memorable:** `@commander` > `please switch to the commander identity`
2. **Distinct from normal speech:** `"ops mode"` won't accidentally trigger during normal conversation
3. **Multiple variants:** Give each identity 3-5 trigger phrases for natural switching
4. **@ prefix convention:** `@commander`, `@analyst`, `@creative` — clean and unambiguous
5. **Mode suffix convention:** `"commander mode"`, `"creative mode"` — feels natural

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| User says two triggers in one message | First match wins |
| Trigger appears in quoted text | Only trigger if at start of message or standalone |
| User says "tell commander about X" | Does NOT switch — mentions aren't triggers |
| User says "@commander, @creative both help" | Switches to commander (first match) |
| Identity folder doesn't exist | Report error, stay in current identity |
| No identity active + no trigger | Default Claude Code behavior |

### Optional: AutoHotkey Boost (External Layer)

If James wants **desktop-wide** trigger detection (outside Claude Code):

```autohotkey
; Win+I — Open identity picker anywhere on desktop
#i::
{
    identities := ["Commander", "Creative", "Analyst", "Tax Specialist", "Security"]
    chosen := ShowListPicker("Switch Identity", identities)
    if (chosen) {
        FileDelete("C:\Users\James\AI_Identities\_active_identity.txt")
        FileAppend(chosen, "C:\Users\James\AI_Identities\_active_identity.txt")
        ToolTip("Identity: " chosen, , , 1)
        SetTimer(() => ToolTip(,,,1), -2000)
    }
}
```

This writes the active identity to `_active_identity.txt`, which Claude Code can read at session start to auto-activate the last-used persona.

---

## 10. Cost Analysis

### Inside Claude Code (Recommended Approach)

| Component | Cost | Notes |
|-----------|------|-------|
| Identity folders | $0 | Just files on disk |
| Trigger detection | $0 | Claude reads CLAUDE.md natively |
| Memory persistence | $0 | Markdown files, auto-updated |
| Claude Code subscription | $20/mo Max | Already paying this |
| **Total monthly** | **$0 incremental** | No new costs |

### If You Later Want API-Based Identities (Standalone)

| Model | Per-Message Cost | 100 msgs/day Monthly |
|-------|-----------------|---------------------|
| Claude Haiku 4.5 | ~$0.001 | ~$3/mo |
| Claude Sonnet 4 | ~$0.005 | ~$15/mo |
| Claude Opus 4.6 | ~$0.015 | ~$45/mo |
| Ollama (local) | $0 | $0 |

**Prompt caching** (Anthropic API feature):
- Cache the system prompt → 90% savings on repeat calls
- Break-even: ~3 messages per cached prompt
- A 5,000-token identity system prompt costs $0.005 first call, $0.0005 subsequent

**Batch API** (for non-urgent persona work):
- 50% discount on all tokens
- 24-hour processing window
- Good for: overnight analysis, bulk content generation

---

## 11. The Landscape: All Known Approaches

### Approach Comparison Matrix

| Approach | Hot-Switch | Memory Isolation | Cost | Complexity | Best For |
|----------|-----------|-----------------|------|-----------|----------|
| **CLAUDE.md Router** 🏆 | ✅ Instant | ✅ Per-folder | $0 | Low | Claude Code users |
| Claude Subagents | ⚠️ Spawn/discard | ✅ Own context | $0 | Low | Task delegation |
| Directory Switching | ❌ Requires cd | ⚠️ Per-project | $0 | Lowest | Project-scoped |
| Python Switchboard | ✅ Trigger word | ✅ Per-folder | $0-3/mo | Medium | Standalone app |
| SillyTavern | ✅ Click/name | ✅ Per-character | $0 | Medium | Chat roleplay |
| LangGraph | ✅ Graph state | ✅ State machine | $3-15/mo | High | Enterprise |
| CrewAI | ❌ Task-based | ⚠️ Shared pool | $3-15/mo | High | Multi-step teams |
| OpenAI Custom GPTs | ✅ Per-GPT | ✅ Per-GPT | $20/mo | Low | OpenAI users |

### Why CLAUDE.md Router Wins for James

1. **Zero new tools** — Uses infrastructure James already has
2. **Zero cost** — No API keys, no servers, no subscriptions beyond Claude Code
3. **Human-editable** — All files are Markdown James can read and tweak
4. **Instant switching** — No spawn delay, no API calls, just file reads
5. **Already proven** — The "oldway" trigger is this exact pattern in miniature

---

## 12. Open-Source Projects Worth Knowing

| Project | What It Does | GitHub |
|---------|-------------|--------|
| **SillyTavern** | Best-in-class character management + chat UI | SillyTavern/SillyTavern |
| **OpenAkita** | 8 persona presets, Anthropic API, multi-channel | openakita/openakita |
| **AktivaAI** | Discord bot, trigger-by-name switching, Ollama | Iteranya/AktivaAI |
| **LiteLLM** | Unified API for 100+ LLM providers | BerriAI/litellm |
| **MemGPT/Letta** | Infinite memory for AI agents | cpacker/MemGPT |
| **ai-tools-ahk** | AutoHotkey + AI integration patterns | ecornell/ai-tools-ahk |
| **CCS** | Claude Code Switch (multi-account) | ccs.kaitran.ca |
| **Leon AI** | Open-source personal assistant, extensible | leon-ai/leon |

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Day 1 — ~1 hour)
1. Create `C:\Users\James\AI_Identities\` folder structure
2. Create `_shared\james_facts.md` with James's universal preferences
3. Create 2 starter identities: Commander + Creative
4. Write IDENTITY.md for each (personality, triggers, rules, greeting)
5. Write MEMORY.md for each (start empty, will auto-populate)
6. Write KNOWLEDGE.md for each (domain expertise)

### Phase 2: Wire the Router (Day 1 — ~30 min)
1. Add Identity System section to `~/.claude/CLAUDE.md`
2. Include trigger word registry table
3. Include switching protocol (read files → adopt persona → announce)
4. Include session-end memory update rules
5. Test: Start Claude Code → say "@commander" → verify switch

### Phase 3: Test & Refine (Day 2 — ~1 hour)
1. Test switching: Commander → Creative → Commander (round-trip)
2. Verify memory isolation: Tell Commander a fact → switch to Creative → verify Creative doesn't know it
3. Verify shared memory: Tell Commander James's preference → switch to Creative → verify it knows
4. Test edge cases: Two triggers, no trigger, invalid identity
5. Refine trigger words if they conflict with normal speech

### Phase 4: Expand (Week 2+, as desired)
1. Add more identities: Tax Specialist, Analyst, Security Auditor
2. Create subagents for task-scoped identities
3. Optional: AutoHotkey Win+I picker for desktop-wide switching
4. Optional: Python switchboard for standalone use outside Claude Code
5. Optional: ChromaDB per-identity vector memory for large knowledge bases

---

## 14. Verification Checklist

After building, test these scenarios:

- [ ] Say "@commander" — verify Commander greeting appears
- [ ] Ask Commander a question — verify Commander's tone and rules
- [ ] Say "creative mode" — verify Creative greeting replaces Commander
- [ ] Ask Creative the same question — verify different personality in response
- [ ] Tell Creative a fact ("my favorite color is blue")
- [ ] Say "@commander" — verify Commander does NOT know the favorite color
- [ ] Say "default mode" — verify return to standard Claude Code behavior
- [ ] Close Claude Code, reopen — verify last identity loads from `_active_identity.txt`
- [ ] Say "create identity poet" — verify new folder and files are created
- [ ] Check that Commander's MEMORY.md was updated at session end
- [ ] Check that Creative's MEMORY.md was NOT modified during Commander's session

---

## Appendix A: Character Card V2 Spec (Reference)

The community standard for AI character definitions (used by SillyTavern, TavernAI, Agnai):

```json
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "The Commander",
    "description": "A strategic, mission-focused AI identity...",
    "personality": "Authoritative, warm, efficient, dry-witted",
    "scenario": "You are assisting Commander James with project management...",
    "first_mes": "Commander online. Systems nominal. What's the mission?",
    "mes_example": "<START>\n{{user}}: Status report?\n{{char}}: All systems green...",
    "creator_notes": "Created by James for project management and strategic planning",
    "system_prompt": "You are The Commander...",
    "tags": ["productivity", "strategic", "military"],
    "creator": "James",
    "character_version": "1.0",
    "extensions": {
      "memory": { "type": "file", "path": "commander/MEMORY.md" },
      "knowledge": { "type": "file", "path": "commander/KNOWLEDGE.md" },
      "triggers": ["@commander", "commander mode", "ops mode"]
    }
  }
}
```

Our IDENTITY.md format is simpler and more readable, but if James ever wants to export identities to SillyTavern or share them, this is the spec to target.

---

## Appendix B: API-Level Persona Switching (Reference)

For building a standalone Python chatbot outside Claude Code:

```python
import anthropic
import json
from pathlib import Path

IDENTITIES_DIR = Path("C:/Users/James/AI_Identities")

def load_identity(name: str) -> dict:
    folder = IDENTITIES_DIR / name
    return {
        "identity": (folder / "IDENTITY.md").read_text(),
        "memory": (folder / "MEMORY.md").read_text(),
        "knowledge": (folder / "KNOWLEDGE.md").read_text(),
    }

def build_system_prompt(identity: dict) -> str:
    shared = (IDENTITIES_DIR / "_shared" / "james_facts.md").read_text()
    return f"""{identity['identity']}

## Shared Context
{shared}

## Your Memory
{identity['memory']}

## Your Knowledge
{identity['knowledge']}"""

def chat(identity_name: str, message: str):
    identity = load_identity(identity_name)
    client = anthropic.Anthropic()

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=build_system_prompt(identity),
        messages=[{"role": "user", "content": message}]
    )
    return response.content[0].text

# Usage: chat("commander", "What's the status?")
```

**With prompt caching (90% savings on repeat calls):**
```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=[{
        "type": "text",
        "text": system_prompt,
        "cache_control": {"type": "ephemeral"}  # Cache this!
    }],
    messages=[{"role": "user", "content": message}]
)
```

---

## Appendix C: Advanced Patterns

### Pattern 1: Identity Handoff
Commander delegates to Analyst: "Analyst, review this data and report back."
→ Spawns analyst subagent → analyst processes → returns results to Commander context.

### Pattern 2: Identity Debate
Commander and Analyst discuss a decision from different angles.
→ Alternating system prompts within one conversation. Each "turn" uses a different identity's system prompt. Requires API-level control (not available in Claude Code natively, but achievable via Python wrapper).

### Pattern 3: Identity Inheritance
"Security Analyst" = inherits Analyst's knowledge + Security Auditor's rules.
→ IDENTITY.md can reference other identities: "Read analyst/KNOWLEDGE.md AND security-auditor/KNOWLEDGE.md"

### Pattern 4: Mood Modifiers
"Commander, lighten up" → Commander stays as Commander but shifts to more casual tone.
→ Identity + modifier system: base persona from IDENTITY.md, tone from mood parameter.

### Pattern 5: Time-Based Identity
"After 10pm, always be Creative mode."
→ AutoHotkey scheduled task writes to `_active_identity.txt` at 10pm.

---

*End of Volume 4 — The Shape-Shifter's Handbook*
*Next volume: TBD by Commander's orders*
*Library status: Vol 1 (Architecture) ✅ | Vol 2 (Tricks) ✅ | Vol 3 (ForensicBot) ✅ | Vol 4 (Shape-Shifter) ✅*
