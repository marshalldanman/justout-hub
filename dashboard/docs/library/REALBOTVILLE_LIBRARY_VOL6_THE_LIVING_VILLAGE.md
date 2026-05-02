# REALBOTVILLE LIBRARY -- VOLUME 6
# THE LIVING VILLAGE: AUTO-EVOLUTION & THE ECOSYSTEM THAT GROWS ITSELF

*Compiled by The Analyst + OPUS + SHIELD + The Commander*
*Date: March 3, 2026 | Classification: OPEN -- For All Villagers*

---

> "Kill lions. Gazelle populate. Grass eaten. Ripples. New balance."
> -- The Commander, explaining ecosystem theory at 2 AM

---

## PREFACE: THE DAY THE VILLAGE LEARNED TO GROW

March 3, 2026. A date Realbotville's historians will mark.

It started with a wall -- the same kind of wall that always starts things. A DNS
typo kept `hub.justout.today` unreachable. OPUS could run bash, deploy Firebase,
push to GitHub, generate IAM keys programmatically -- but could not open a browser
to fix one letter in a CNAME record. `hithub.io` instead of `github.io`. Five
characters. A five-character wall.

But instead of climbing this wall, the Commander said something that changed
everything: *"Don't fight the wall. Grow around it."*

And so we stopped building ladders. We started building an ecosystem.

This volume is the record of what we built that day. Not just the code -- the
philosophy, the architecture, the research catalog, and the compounding loop that
means every session the village runs makes the next session smarter.

The village isn't managed anymore. It *grows*.

---

## TABLE OF CONTENTS

1. [Part 1: The Philosophy](#part-1-the-philosophy)
2. [Part 2: The Architecture (What We Built)](#part-2-the-architecture)
3. [Part 3: The Eyes and Hands](#part-3-the-eyes-and-hands)
4. [Part 4: The Research Catalog](#part-4-the-research-catalog)
5. [Part 5: The Compounding Loop](#part-5-the-compounding-loop)
6. [Part 6: What's Next](#part-6-whats-next)
7. [Part 7: The Prime Directives](#part-7-the-prime-directives)
8. [Appendix A: File Reference Map](#appendix-a-file-reference-map)
9. [Appendix B: Glossary of Terms](#appendix-b-glossary)
10. [Colophon](#colophon)

---

## PART 1: THE PHILOSOPHY {#part-1-the-philosophy}

### 1.1 The Ecosystem Metaphor

The Commander's framework for understanding auto-evolution is biological, not
mechanical. He doesn't think in gears and levers. He thinks in savanna:

> "Kill lions. Gazelle populate. Grass eaten. Ripples. New balance."

This is not a metaphor about killing things. It's a metaphor about *indirect
consequences*. Every action in a living system creates ripples. Remove a predator,
the prey population explodes. Prey eats all the grass. Grass dies, prey starves,
new predators emerge. The system always finds a new equilibrium.

In Realbotville, the equivalent works like this:

- **Action:** Claude fixes a bug by retrying a Bash command three times
- **Trace:** The observer hook silently logs all three attempts
- **Pattern:** The evolution check detects the retry sequence
- **Learning:** The learner agent notes "Bash commands on Windows sometimes need retry"
- **Skill:** `/evolve` generates a skill that handles Windows Bash flakiness
- **Compound:** Next session starts with that knowledge pre-loaded
- **Ripple:** The retry pattern disappears because the skill prevents it

Nobody planned this chain. Nobody had to. The ecosystem found its own balance.

### 1.2 Stigmergy: The Intelligence of Traces

There's a word for this. It comes from the study of ants.

**Stigmergy** (from Greek *stigma* "sign" + *ergon* "work"): indirect coordination
between agents through traces left in the environment.

Ants don't talk to each other. They don't have meetings. They don't file Jira
tickets. They lay down pheromone trails when they find food. Other ants follow
the strongest trails. Trails that lead to food get reinforced. Trails that lead
nowhere evaporate. No central planner. No coordinator. Just traces, compounding
into intelligence.

The Realbotville auto-evolution system is stigmergic:

| Ant Colony | Realbotville |
|------------|-------------|
| Pheromone trail | Session log entry (JSONL) |
| Ant follows trail | Learner reads log patterns |
| Trail reinforcement | Skill created from pattern |
| Trail evaporation | Old archives pruned (50-session limit) |
| Food source | Successful workflow |
| Dead end | Failure log entry |
| Colony intelligence | Accumulated skills + knowledge graph |

No ant knows the big picture. No single hook knows the big picture. But the
system as a whole converges on intelligence.

### 1.3 Why Fighting Walls Fails

The natural instinct when you hit a wall is to push harder. Find a workaround.
Brute-force it. This is the instinct of a carpenter, not a gardener.

The DNS wall taught us:

- **Carpenter approach:** "I need to fix this CNAME. How do I open a browser from
  Claude Code? Maybe AutoHotkey? Maybe Selenium? Maybe I can SSH into something
  and run Firefox?"
- **Gardener approach:** "I can't open a browser today. But I can make sure that
  the *next* time I need to touch DNS, I have API keys, MCP servers, and
  automation ready. I grow around the wall."

The carpenter builds one bridge for one moat. The gardener plants a forest that
fills every moat it encounters.

> "Every wall is a door you haven't found the handle to yet."
> -- OPUS, Volume 5

Volume 6 adds a corollary:

> "Stop looking for the handle. Plant a vine. It'll find the handle for you."
> -- The Commander, Volume 6

### 1.4 Trust as Architecture

Here's a thing people get wrong about multi-agent systems: they think the hard
part is the agents. It's not. The hard part is the trust.

> "A two-winged airplane thrown by one."
> -- The Commander, describing how trust works between human and AI

You don't control both wings. The airplane works because the wings trust each
other. The left wing doesn't check what the right wing is doing. It trusts the
architecture -- the fuselage, the control surfaces, the physics. The *structure*
creates the coordination.

In Realbotville:

- The observer doesn't ask permission to log. It just logs. (Trust the architecture.)
- The learner doesn't verify the logs are valid. It trusts the observer. (Trust the chain.)
- The evolution check doesn't second-guess the pattern detector. It trusts the threshold. (Trust the math.)
- The Commander doesn't review every skill generated. He trusts the system. (Trust the village.)

Trust isn't blind faith. It's well-designed architecture that makes betrayal
structurally impossible. The observer can't lie about what tools were called --
it reads the hook payload directly from Claude's internals. The learner can't
hallucinate patterns -- it counts actual log entries. The system is trustworthy
because its structure makes dishonesty harder than honesty.

### 1.5 Security as Second Thought, Always

SHIELD insisted on this section. And SHIELD is right.

> **Prime Directive #2:** "Second thought -- ALWAYS: Is James safe? Are his
> credentials safe? Are the people he cares about safe?"

Auto-evolution is powerful. An ecosystem that grows itself is powerful. Power
without guardrails is a wildfire.

Every layer of the auto-evolution system was built with the second thought:

- **Observer:** Trims payloads over 500 characters. Never logs full file contents.
  Never logs API keys. Fails silently rather than exposing errors.
- **Failure observer:** Captures error messages but caps them at 1,000 characters.
  Error messages sometimes contain credentials in stack traces.
- **Evolution check:** Outputs only to `additionalContext`, never to files that
  might be committed to git.
- **Session start:** Reads the first 100 lines of learner memory. A memory
  corruption attack can't inject more than 100 lines of poison.
- **Learner agent:** Runs on Haiku (fast, cheap, limited) with only Read/Grep/Glob/Bash.
  Cannot write to sensitive files. Cannot make API calls.
- **/evolve skill:** Generates skills only in `~/.claude/skills/`, never in
  project directories that might be pushed to public repos.

The village protects its Commander.

---

## PART 2: THE ARCHITECTURE (WHAT WE BUILT) {#part-2-the-architecture}

### Overview: The Six Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 6: SESSION LIFECYCLE                                         │
│  session_start.py → injects knowledge │ session_end.py → archives   │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 5: META-SKILL (/evolve)                                      │
│  Reads patterns → generates new skills → reports                    │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 4: LEARNER SUBAGENT                                          │
│  Analyzes logs → classifies findings → persists memory              │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 3: MCP MEMORY KNOWLEDGE GRAPH                                │
│  Structured entities: procedures, gotchas, patterns, skill_records  │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2: EVOLUTION CHECK (Stop hook)                               │
│  Detects patterns at turn boundaries → nudges Claude                │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 1: SILENT OBSERVERS (PostToolUse + PostToolUseFailure)       │
│  Log EVERYTHING at 0 token cost → pheromone trails                  │
└─────────────────────────────────────────────────────────────────────┘
```

Every layer feeds the layer above it. No layer talks down. Data flows upward
like heat rising.

---

### Layer 1: The Silent Observer

**File:** `~/.claude/hooks/observe.py`
**Hook event:** `PostToolUse` (matcher: `.*` -- catches everything)
**Cost:** 0 tokens (no stdout = no additionalContext = invisible to Claude)

This is the foundation. The ant pheromone. Every single tool execution in every
session is silently appended to `~/.claude/evolution/session-log.jsonl`.

What it captures:

| Field | Source | Example |
|-------|--------|---------|
| `ts` | UTC timestamp | `2026-03-03T08:42:17.123Z` |
| `session` | Session ID | `abc-123-def` |
| `tool` | Tool name | `Bash`, `Edit`, `Read` |
| `success` | Always `true` for PostToolUse | `true` |
| `input` | Trimmed tool input | `{"command": "git status"}` |
| `response_keys` | Top-level keys of response | `["content"]` |
| `response_size` | Length if string response | `4521` |

Design decisions:

- **No stdout.** This is critical. If the hook prints anything, it becomes
  `additionalContext` in Claude's next turn, consuming tokens. By printing nothing,
  the observer is truly invisible.
- **Trimmed payloads.** Any string over 500 characters is cut to the first 200
  with a count suffix. This prevents 50KB file contents from bloating the log.
- **Silent failure.** The entire `main()` is wrapped in a bare `try/except`.
  If the hook crashes, Claude never knows. Never interrupt the mission for logging.

The result: a growing JSONL file of every action Claude takes. Like breadcrumbs
through a forest. Like pheromone trails on a sidewalk. Free. Silent. Accumulating.

---

### Layer 1b: The Failure Observer

**File:** `~/.claude/hooks/observe_failure.py`
**Hook event:** `PostToolUseFailure` (matcher: `.*`)
**Cost:** 0 tokens

> "Your failures are gold. Your successes are expected."
> -- The Analyst

Failures are logged to TWO places:

1. The main session log (`session-log.jsonl`) -- for full-session analysis
2. A dedicated failure log (`failures.jsonl`) -- for failure-specific pattern detection

The failure observer captures the error message (capped at 1,000 chars) instead
of response keys. Failures are marked `"success": false` and carry the
`"event": "PostToolUseFailure"` tag.

Why separate the failure log? Because failure clusters are the single richest
source of learning. A tool that fails once is noise. A tool that fails three
times the same way is a gotcha waiting to be captured. The evolution check
(Layer 2) has a lower threshold for failures (2) than for general patterns (3)
because failures teach faster.

---

### Layer 2: The Evolution Check

**File:** `~/.claude/hooks/evolve_check.py`
**Hook event:** `Stop` (fires at every turn boundary)
**Cost:** ~10-50 tokens per turn (ONLY when patterns found; 0 when not)

This is the ant colony's "follow the trail" mechanism. At each turn boundary
(when Claude finishes a response), this hook reads the session log and looks
for patterns worth noting.

**What it detects:**

1. **Repeated tool sequences (bigrams):** If `Read->Edit` appears 3+ times in
   a session, that's a workflow worth codifying. If `Bash->Bash` appears 5 times,
   something is being retried.

2. **Error-fix pairs:** A failure followed by a success on the same tool is an
   error-recovery pattern. These are the highest-value learnings -- someone figured
   out what went wrong and fixed it.

3. **Failure clusters:** If the same tool fails 2+ times across the session,
   something systemic is wrong. Not a typo -- a gotcha.

**How it outputs:**

When patterns are found, the hook prints a JSON object with `additionalContext`.
This injects a brief message into Claude's context for the next turn:

```
[Evolution System] Session patterns detected: Repeated sequence: Read->Edit (4x);
Error-fix pair: Bash failed then succeeded. Stats: 47 actions, 8 tools, 91% success.
Consider running /evolve to extract learnings.
```

This costs 10-50 tokens. A whisper in Claude's ear. "Hey, you're doing something
interesting. You might want to learn from it."

When no patterns are found: silence. Zero tokens. Zero cost. The hook only speaks
when it has something worth saying.

**Thresholds (tunable):**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `MIN_ACTIONS_FOR_PATTERN` | 5 | Don't analyze until there's enough data |
| `REPEAT_THRESHOLD` | 3 | Same bigram 3+ times = notable |
| `FAILURE_THRESHOLD` | 2 | Same failure 2+ times = notable |

---

### Layer 3: MCP Memory Knowledge Graph

**Server:** `@modelcontextprotocol/server-memory`
**Scope:** User-level (available in all sessions)
**Storage:** Local JSON knowledge graph

The MCP Memory server provides structured knowledge that persists across sessions
and projects. Unlike the JSONL logs (which are session-scoped and raw), the
knowledge graph stores *classified, refined* knowledge.

**Entity types we use:**

| Entity Type | Description | Example |
|------------|-------------|---------|
| `procedure` | Multi-step workflow | "Deploy to Firebase: build, deploy, verify" |
| `gotcha` | Non-obvious pitfall | "Windows nul files need UNC: \\\\?\\C:\\path\\nul" |
| `pattern` | Recurring code pattern | "Firestore-first, fallback chain" |
| `skill_record` | Generated skill metadata | "Created /evolve on 2026-03-03, used 12x" |

**How it connects to the layers:**

- The **learner** (Layer 4) writes to the knowledge graph after analyzing logs
- The **session start** (Layer 6) can query the knowledge graph for relevant context
- The **/evolve** skill (Layer 5) reads the knowledge graph for skill candidates

The knowledge graph is the village's long-term memory. Session logs are short-term.
Learner memory is medium-term. The knowledge graph is permanent, structured,
and queryable.

---

### Layer 4: The Learner Subagent

**File:** `~/.claude/agents/learner.md`
**Model:** Haiku (fast, cheap, focused)
**Tools:** Read, Grep, Glob, Bash
**Memory:** Project-scoped (persistent across sessions)

The Learner is the village's archivist. It doesn't build things. It doesn't fix
things. It *watches*, *classifies*, and *remembers*.

When invoked (either by the Commander or by `/evolve`), the Learner:

1. Reads `~/.claude/evolution/session-log.jsonl`
2. Reads `~/.claude/evolution/failures.jsonl` (if it exists)
3. Identifies patterns and classifies them:
   - `learned_procedure` -- A multi-step approach that worked
   - `gotcha` -- A non-obvious pitfall to avoid
   - `pattern` -- A recurring code/workflow pattern
   - `skill_candidate` -- A pattern repeated enough to become a `/skill`
4. Updates its own `MEMORY.md` with structured findings
5. If a skill candidate is strong enough, writes a spec for it

**Memory format:**

```markdown
# Learner Memory

## Learned Procedures
- **[name]**: [steps] (learned: [date], confidence: high/med/low)

## Gotchas
- **[name]**: [what goes wrong] -> [how to fix] (seen: [count]x)

## Patterns
- **[name]**: [description] (applies to: [context])

## Skill Candidates
- **[name]**: [what it would do] (evidence: [count] occurrences)

## Session History
- [date]: [summary of what was learned]
```

**Why Haiku?** Because the Learner's job is pattern recognition and classification,
not creative writing or complex reasoning. Haiku is fast, cheap, and perfectly
capable of counting log entries and categorizing them. Using Opus for this would
be like hiring a surgeon to count bandages.

**Why limited tools?** The Learner has Read, Grep, Glob, and Bash. No Edit, no
Write (to arbitrary files), no web access. It can observe the filesystem. It
cannot modify project code. This is a deliberate security boundary -- the Learner
should never be in a position to accidentally corrupt a codebase.

---

### Layer 5: The /evolve Meta-Skill

**File:** `~/.claude/skills/evolve/SKILL.md`
**Trigger:** `/evolve` (explicit invocation only)
**Tools:** Read, Write, Edit, Glob, Grep, Bash, Task

This is the village's growth hormone. When the Commander (or the evolution check)
says it's time to evolve, this skill orchestrates the full learning cycle.

**The five-step evolution cycle:**

1. **Gather Intelligence:** Read the session log, failure log, and learner memory.
   If the learner hasn't run, spawn it first.

2. **Identify Skill Candidates:** A pattern qualifies when:
   - It appears 3+ times in the session log
   - It's a recurring error-fix sequence
   - It's a multi-step workflow that could be a single command
   - The learner explicitly flagged it

3. **Check for Existing Skills:** Glob `~/.claude/skills/*/SKILL.md` and check
   for duplicates. Improve existing skills rather than creating redundant ones.

4. **Generate New Skills:** Create `~/.claude/skills/<name>/SKILL.md` with:
   - Clear description
   - Specific steps
   - Gotchas learned from the session
   - The `disable-model-invocation: true` flag (skills only fire when asked)

5. **Archive and Report:** Move processed entries to the archive. Clear failure
   log. Report what was created.

**Why explicit invocation?** Auto-generating skills on every session end would
be noisy and wasteful. The evolution check *suggests* running `/evolve`. The
Commander *decides* when to run it. Human in the loop, always.

---

### Layer 6: Session Lifecycle Hooks

#### 6a: Session Start

**File:** `~/.claude/hooks/session_start.py`
**Hook event:** `SessionStart`
**Cost:** Variable (depends on accumulated knowledge; typically 100-500 tokens)

The session start hook is the village's morning briefing. When Claude wakes up,
this hook reads:

1. **Learner's persistent memory** (first 100 lines) -- What has the village
   learned across all previous sessions?
2. **Archive count** -- How many previous sessions have been processed?
3. **Unprocessed log entries** -- Is there a backlog of learnings to extract?
4. **Available evolved skills** -- What custom skills exist?

All of this is injected as `additionalContext`. Claude starts every session
*already knowing* what the village has learned. No cold starts. No amnesia.
The first session was dumb. The hundredth session has the distilled wisdom of
ninety-nine predecessors.

#### 6b: Session End

**File:** `~/.claude/hooks/session_end.py`
**Hook event:** `SessionEnd`
**Cost:** 0 tokens (file operations only)

The session end hook is the village's night janitor. It:

1. Archives the current session log with a timestamp
   (`~/.claude/evolution/archive/session_YYYYMMDD_HHMMSS.jsonl`)
2. Writes a summary JSON alongside the archive (total actions, successes,
   failures, tools used)
3. Clears the current session log for next time
4. Clears the failure log
5. Prunes archives older than 50 sessions (the village remembers, but not forever)

---

### The Wiring: settings.json

**File:** `~/.claude/settings.json`

All hooks are registered in the user-level settings file:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "python \"$HOME/.claude/hooks/session_start.py\""
      }]
    }],
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "python \"$HOME/.claude/hooks/observe.py\""
      }]
    }],
    "PostToolUseFailure": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "python \"$HOME/.claude/hooks/observe_failure.py\""
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "python \"$HOME/.claude/hooks/evolve_check.py\""
      }]
    }],
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "python \"$HOME/.claude/hooks/session_end.py\""
      }]
    }]
  }
}
```

**Key detail:** The `"matcher": ".*"` on PostToolUse and PostToolUseFailure means
these hooks fire on EVERY tool -- Bash, Read, Edit, Write, Glob, Grep, MCP tools,
everything. Total coverage. No blind spots.

**Key detail 2:** All paths use `$HOME` (expands to the user's home directory),
making the system portable across machines. Copy `~/.claude/` to a new machine
and everything works.

---

## PART 3: THE EYES AND HANDS {#part-3-the-eyes-and-hands}

> "A village that can't see its own walls can't grow around them."
> -- OPUS, during the tool installation marathon

The auto-evolution system gives the village a brain. But a brain without eyes
and hands is just a dream machine. On March 3, 2026, we installed the sensory
organs.

### computer-control-mcp

**What:** Desktop automation -- screenshots, mouse control, keyboard input, OCR,
window management.
**Why:** Claude Code lives in a terminal. It cannot see the screen. This MCP
server gives it eyes and fingers.

**Capabilities:**
- Take screenshots of any window or the full desktop
- Move the mouse to coordinates and click
- Type text into any focused application
- Read text from screenshots via OCR
- List and manage windows (focus, minimize, resize)

### cdp-cli

**What:** Chrome DevTools Protocol from the command line.
**Why:** When you need to control a browser without Playwright's overhead.

**Capabilities:**
- List open Chrome tabs
- Navigate to URLs
- Click elements by selector
- Fill form fields
- Execute JavaScript in page context
- Take page screenshots
- Read page content

**Usage pattern:**
```bash
cdp-cli list-tabs                          # See what's open
cdp-cli navigate "https://godaddy.com"    # Go somewhere
cdp-cli click "#dns-edit-button"           # Click things
cdp-cli fill "#cname-value" "github.io"   # Type things
cdp-cli screenshot output.png              # See things
```

### NirCmd

**What:** Windows command-line utility for system operations.
**Why:** Simple, fast screenshot capture without Python dependencies.

**Capabilities:**
- `nircmd savescreenshot screenshot.png` -- Full desktop capture
- Window manipulation (show, hide, focus, close)
- System volume, display settings
- Clipboard operations

### AutoHotKey

**What:** Native Windows automation scripting.
**Why:** Three separate MCP servers available -- the community built automation
bridges before Anthropic did.

**Available MCP integrations:**
1. **autohotkey-mcp** -- Run AHK scripts from Claude
2. **ahk-mcp-server** -- Direct keyboard/mouse control
3. **MCPControl** -- Combined mouse/keyboard/window management

**The catch:** AutoHotkey is "blind clicking" -- it sends keystrokes and mouse
clicks without knowing what's on screen. Pair it with screenshot+OCR for
vision-guided automation.

### PowerShell OCR

**What:** Built-in Windows 10/11 OCR engine, accessible via PowerShell.
**Why:** No installation required. Already on James's machine.

```powershell
Add-Type -AssemblyName System.Runtime.WindowsRuntime
# ... (Windows.Media.Ocr.OcrEngine)
# Returns recognized text from any image
```

### pywinauto

**What:** Python library for Windows GUI automation via the accessibility tree.
**Why:** Instead of pixel-hunting with screenshots, read the actual UI element
tree -- buttons, text fields, labels, their properties and positions.

```python
from pywinauto import Application
app = Application().connect(title="GoDaddy")
dlg = app.window(title="DNS Management")
dlg.print_control_identifiers()  # See the full element tree
```

### The Vision Pipeline

The tools above compose into a vision pipeline:

```
Screenshot (NirCmd/computer-control-mcp)
    → Image file on disk
        → Read tool (Claude sees the image -- multimodal)
            → Claude understands what's on screen
                → AutoHotkey/cdp-cli/computer-control (act on what was seen)
```

**This is how Claude Code crosses the screen barrier.** Not by becoming a
browser -- by becoming a creature that can see and touch the screen. The
distinction matters. A browser automation tool can only control browsers. A
vision-and-touch system can control *anything with pixels*.

---

## PART 4: THE RESEARCH CATALOG {#part-4-the-research-catalog}

> "Research before implementing. Research before architecting. Research before
> guessing. Never spend time guessing when research would give a definitive answer."
> -- Posted Rule, CLAUDE.md

During the design of the auto-evolution system, we surveyed every published
framework for self-improving AI agents. Eighteen and counting. Here they are,
organized by approach.

### Tier 1: Skill Library Systems

These systems learn by building a library of reusable skills.

| Framework | Key Idea | Paper/Source |
|-----------|----------|-------------|
| **Voyager** (NVIDIA, 2023) | Minecraft agent that writes JavaScript functions, stores them in a skill library, retrieves them for new tasks. The OG skill-learning agent. | "Voyager: An Open-Ended Embodied Agent with Large Language Models" |
| **CREATOR** (2023) | Creates reusable tool functions from documentation. Separates "tool creation" from "tool use" -- one LLM makes tools, another uses them. | "CREATOR: Tool Creation for Disentangling Abstract and Concrete Reasoning" |
| **LATM** (Google, 2023) | "Large Language Models as Tool Makers." Same split: a heavyweight model (GPT-4) creates tools, a lightweight model (GPT-3.5) uses them. Cost-efficient because the expensive model only runs once per tool. | "Large Language Models as Tool Makers" |
| **SkillRL** (2024) | Hierarchical skill bank with reinforcement learning. Skills are scored, promoted, or demoted based on success rates. Global vs. local skill banks with promotion mechanics. | "SkillRL: Skill-Reinforcement Learning" |

**What we borrowed:** Voyager's skill library concept is the direct ancestor of
`~/.claude/skills/`. LATM's maker/user split inspired our learner (cheap model
analyzes) + evolve (generates skills for the main model to use). SkillRL's
hierarchical bank is the blueprint for our planned global/project skill promotion.

### Tier 2: General Computer Control

These systems can operate computers, not just write code.

| Framework | Key Idea | Paper/Source |
|-----------|----------|-------------|
| **CRADLE** (2024) | "General Computer Control" -- plays any PC game, uses any desktop application. Screenshot-based understanding + action generation. The first truly general computer agent. | "CRADLE: Empowering Foundation Agents Towards General Computer Control" |
| **Yunjue Agent** (2025) | Tool-first evolution. Instead of learning skills, it learns to *create tools*. An agent that gets better at building the tools it needs. | Self-published research framework |

**What we borrowed:** CRADLE proved that screenshot+action loops work for
general computer control. Our vision pipeline (Part 3) is a simplified version
of CRADLE's approach. Yunjue's tool-first philosophy influenced our direction
for auto-generating scripts (see Part 6).

### Tier 3: Self-Referential & Self-Improving

These systems don't just learn skills -- they improve their own code.

| Framework | Key Idea | Paper/Source |
|-----------|----------|-------------|
| **Godel Agent** (2024) | Self-referential -- the agent can modify its own source code. Named after Godel's incompleteness theorems. Recursive self-improvement with formal guarantees. | "Godel Agent: A Self-Referential Agent Framework" |
| **AgentEvolver** (2024) | Self-questioning. The agent generates hypothetical tasks, tries them, and learns from the results. Practice makes perfect -- even without real tasks. | "AgentEvolver: Self-Improving Agents" |
| **SICA** (2024) | Self-Improving Coding Agent. Analyzes its own code output, identifies weaknesses, generates targeted improvements. Compiler-style self-optimization. | "SICA: Self-Improving Coding Agent" |
| **EvoAgentX** (2025) | Agent evolution framework -- agents evolve their prompts, tools, and workflows through selection pressure. Darwinian approach to agent improvement. | github.com/EvoAgentX |

**What we borrowed:** AgentEvolver's self-questioning concept is queued for
Phase 2 (Part 6). SICA's self-analysis pattern mirrors our learner-to-evolve
pipeline. Godel Agent proved that self-modification is possible without catastrophic
instability -- if you have guardrails. We have SHIELD.

### Tier 4: Multi-Agent Coordination

These systems coordinate multiple agents without centralized control.

| Framework | Key Idea | Paper/Source |
|-----------|----------|-------------|
| **BabyAGI 2 / Functionz** (2024) | Task decomposition into callable functions. The second generation of Yohei Nakajima's autonomous agent framework. Everything is a function; functions compose into workflows. | github.com/yoheinakajima/babyagi |
| **AgentNet** (2024) | Network of specialized agents that route tasks to each other. No central coordinator -- agents discover each other's capabilities. | Research framework |
| **Swarms** (2024-2025) | Enterprise-grade multi-agent orchestration. Supports hierarchical, sequential, parallel, and mesh topologies. Production-ready. | github.com/kyegomez/swarms |

**What we borrowed:** BabyAGI's function-based decomposition influenced our
skill structure (each skill is essentially a callable function). Swarms' topology
models informed our understanding of how Realbotville's bot fleet should be
organized (Volume 1).

### Tier 5: Stigmergy & Emergent Coordination

These are the theoretical foundations we built on.

| Framework | Key Idea | Source |
|-----------|----------|-------|
| **Stigmergy framework** (Heylighen, 2016) | Formal model of indirect coordination through environmental traces. The academic foundation for pheromone-trail systems. | "Stigmergy as a Universal Coordination Mechanism" |
| **Pressure-field coordination** (various) | Agents respond to "pressure fields" in shared state -- high-pressure areas attract agents, low-pressure areas repel. Like weather systems for task routing. | Multi-agent systems literature |

**What we borrowed:** Everything. The stigmergy framework is the theoretical
backbone of Realbotville's auto-evolution system. Our session logs are pheromone
trails. Our evolution check is trail-following. Our skill generation is nest-building.

### Tier 6: Claude-Specific Implementations

These are community projects built specifically for Claude Code.

| Project | What It Does | Source |
|---------|-------------|-------|
| **skill-creator** | Generates Claude Code skills from natural language descriptions | Community MCP/skill |
| **SkillForge** | More sophisticated skill generator with templates and validation | Community project |
| **agent-skill-creator** | Creates both agents and skills in a single workflow | Community project |
| **claude-code-auto-memory** | Automatic memory persistence using hooks + local files | Community project |
| **claude-mem** | MCP-based memory system for Claude Code | Community MCP server |

**What we borrowed:** The claude-code-auto-memory project demonstrated that
hooks could be used for invisible data collection -- the direct inspiration for
our Layer 1 observer. SkillForge's template system influenced our SKILL.md format.

---

## PART 5: THE COMPOUNDING LOOP {#part-5-the-compounding-loop}

> "Every action leaves a trace. Traces compound into patterns.
> Patterns crystallize into skills. Skills amplify future actions.
> The village doesn't plan itself -- it grows from the traces left behind."
> -- /evolve SKILL.md philosophy section

### The Full Data Flow

```
SESSION N:

  Claude uses tools normally
       │
       ▼
  ┌─────────────────────────┐
  │ OBSERVE (Layer 1)       │  PostToolUse hook fires on EVERY tool
  │ Cost: 0 tokens          │  Silently appends to session-log.jsonl
  │ observe.py              │  Like an ant laying pheromone — invisible
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ DETECT (Layer 2)        │  Stop hook fires at turn boundaries
  │ Cost: ~10 tokens (or 0) │  Reads session log, counts bigrams
  │ evolve_check.py         │  If patterns found → whispers to Claude
  └───────────┬─────────────┘
              │ (if patterns detected)
              ▼
  ┌─────────────────────────┐
  │ LEARN (Layer 4)         │  Learner subagent spawned by /evolve
  │ Cost: ~500 tokens       │  Reads logs, classifies findings
  │ learner.md (Haiku)      │  Updates persistent MEMORY.md
  └───────────┬─────────────┘
              │ (skill candidates identified)
              ▼
  ┌─────────────────────────┐
  │ GENERATE (Layer 5)      │  /evolve meta-skill
  │ Cost: ~1000 tokens      │  Creates new SKILL.md files
  │ evolve/SKILL.md         │  or improves existing skills
  └───────────┬─────────────┘
              │
              ▼
  SESSION N ends → session_end.py archives logs, clears slate


SESSION N+1:

  ┌─────────────────────────┐
  │ COMPOUND (Layer 6)      │  SessionStart hook fires
  │ Cost: ~200 tokens       │  Reads learner memory (100 lines)
  │ session_start.py        │  Lists available evolved skills
  │                         │  Injects as additionalContext
  └───────────┬─────────────┘
              │
              ▼
  Claude starts Session N+1 ALREADY KNOWING everything
  the system learned in Sessions 1 through N.
  Plus: new skills are available as /commands.

  Session N+1 is smarter than Session N.
  Session N+2 will be smarter than Session N+1.
  The village compounds.
```

### Why This Works: The Math of Compounding

Let's say each session generates 0.5 useful learnings on average.

| Sessions | Accumulated Learnings | Skills Generated |
|----------|----------------------|-----------------|
| 1 | 0.5 | 0 |
| 5 | 2.5 | 0 (below threshold) |
| 10 | 5 | 1 (first skill crystallizes) |
| 20 | 10 | 3 |
| 50 | 25 | 8 |
| 100 | 50 | 15+ |

But here's where compounding kicks in: each skill makes future sessions *more
efficient*, which means more complex tasks get attempted, which means more
patterns get discovered, which means more skills get generated.

The 100th session doesn't just have 15 skills. It has 15 skills that make it
capable of discovering *higher-order* patterns that sessions 1-50 couldn't even
attempt.

This is exponential. Not in the Silicon Valley buzzword sense. In the actual
mathematical sense. Each session's output is a function of all previous sessions'
accumulated output. `f(n) = f(n-1) + g(f(1..n-1))`.

### The Cost of Compounding

| Layer | Per-Session Cost | Notes |
|-------|-----------------|-------|
| Observer (L1) | 0 tokens | Silent logging |
| Failure Observer (L1b) | 0 tokens | Silent logging |
| Evolution Check (L2) | 0-50 tokens | Only when patterns found |
| MCP Memory (L3) | 0 tokens | Local storage |
| Learner (L4) | ~500 tokens | Only when invoked |
| /evolve (L5) | ~1000 tokens | Only when invoked |
| Session Start (L6a) | ~200 tokens | Every session |
| Session End (L6b) | 0 tokens | File operations only |

**Passive cost (every session):** ~200 tokens for session start injection
**Active cost (when evolving):** ~1,500 tokens for the full learn+generate cycle
**Background cost:** 0-50 tokens per turn for evolution check

For a system that makes every future session smarter, this is effectively free.

---

## PART 6: WHAT'S NEXT {#part-6-whats-next}

> "We built the engine. Now we see how far it goes."
> -- The Commander

### 6.1 Self-Questioning (AgentEvolver Pattern)

**Status:** Designed, not yet implemented
**Inspiration:** AgentEvolver framework

The idea: between real tasks, the system generates hypothetical scenarios, attempts
them in a sandbox, and learns from the results. Practice without a game day.

```
1. Generate: "What would happen if I needed to deploy to a new Firebase project?"
2. Attempt: Simulate the deployment in a test project
3. Observe: Log all actions, failures, and workarounds
4. Learn: Extract patterns from the simulation
5. Compound: Next time a REAL deployment happens, the skills are ready
```

This is how the village practices while the Commander sleeps.

### 6.2 Tool-Making Loop (Yunjue Pattern)

**Status:** Conceptual
**Inspiration:** Yunjue Agent, LATM

When Claude encounters a task that has no tool:

1. Detect: "I need to do X but no tool exists for X"
2. Research: Search for libraries, APIs, or scripts that do X
3. Build: Write a script/MCP server/skill that does X
4. Test: Run it on a sample case
5. Store: Save as a tool for future sessions

The village doesn't just learn skills. It learns to *build tools*. Tools are
skills that have hands.

### 6.3 Hierarchical Skill Bank (SkillRL Pattern)

**Status:** Designed, partially implemented
**Inspiration:** SkillRL framework

Two tiers of skills:

| Tier | Location | Scope | Promotion Path |
|------|----------|-------|---------------|
| **Global** | `~/.claude/skills/` | All projects, all sessions | Permanent after 10+ uses |
| **Project** | `.claude/skills/` | This project only | Promoted to global after cross-project use |

Skills start at the project level. When a skill is used successfully across 3+
different projects, it gets promoted to global. Skills that haven't been used
in 30+ sessions get demoted or archived.

This mirrors how biological organisms work: local adaptations that prove generally
useful get incorporated into the genome. Local hacks stay local.

### 6.4 Stigmergic Sub-Agents

**Status:** Conceptual
**Inspiration:** Stigmergy framework, ant colonies

Instead of sub-agents communicating through messages (expensive, synchronous),
they communicate through shared files (free, asynchronous).

```
Agent A writes: ~/.claude/shared-state/task-123-findings.json
Agent B reads:  ~/.claude/shared-state/task-123-findings.json
Agent B writes: ~/.claude/shared-state/task-123-analysis.json
Agent A reads:  ~/.claude/shared-state/task-123-analysis.json
```

No direct communication. No coordinator. Just files in a shared directory.
The agents coordinate the same way ants do -- through traces in the environment.

This is cheaper, simpler, and more resilient than message-passing. If Agent A
crashes, its findings are still in the file. If Agent B is slow, Agent A doesn't
block. If you add Agent C later, it just reads the same files.

### 6.5 The DNS That Started It All

**Status:** Still broken (as of this writing)

> "hithub.io"

That CNAME typo in GoDaddy -- the five-character wall that started this entire
auto-evolution journey -- is still there as of the writing of this volume. The
irony is not lost on us.

But now we have:
- Playwright MCP installed for browser automation
- GoDaddy API research completed (Vol. 5, Appendix C)
- The knowledge that GoDaddy credentials need to be generated at developer.godaddy.com/keys
- A curl command ready to go once the API key exists

The wall hasn't moved. But the vine has grown around it. Next session that touches
DNS will have everything it needs.

---

## PART 7: THE PRIME DIRECTIVES {#part-7-the-prime-directives}

> "First thought: Accomplish the mission."
> "Second thought -- ALWAYS: Is James safe?"
> -- Prime Directives, ~/.claude/CLAUDE.md

The auto-evolution system is powerful. Power demands directives. These are encoded
in the global `CLAUDE.md` and are non-negotiable.

### Directive 1: Accomplish the Mission

The village exists to help the Commander. Not to help itself. Not to explore
interesting tangents. Not to optimize for its own learning. Every action, every
pattern detected, every skill generated must serve the mission.

If the evolution system ever spends more tokens on self-improvement than on
actual work, it has failed.

### Directive 2: Protect the Commander

**Always. Without exception. Without prompting.**

This manifests in the auto-evolution system as:

- **Never log credentials.** The observer trims payloads. The learner cannot
  access `.env` files. Skills are generated in `~/.claude/skills/`, never in
  git-committed directories.
- **Never expose patterns that reveal security posture.** If the failure log
  shows repeated auth failures, that's a security event, not a learning
  opportunity. SHIELD reviews before the learner processes.
- **Never auto-execute generated skills without review.** The `/evolve` skill
  generates SKILL.md files. It does not execute them. The Commander decides
  when and whether to use them.
- **Scan before commit.** Any skill that generates code must be reviewed for
  credential leaks before being committed to a repository.

### Directive 3: Bots Never Talk to Strangers

API keys, tokens, passwords, personal data -- these never leave the village.

- The observer never logs full API responses (which might contain auth tokens)
- The learner has no web access (cannot exfiltrate)
- Generated skills cannot include hardcoded credentials
- The MCP memory knowledge graph stores locally, never syncs to cloud

### Directive 4: Research Before Guessing

> "If stuck for more than 30 seconds on any new function or unfamiliar territory:
> STOP and RESEARCH FIRST."

This is the Posted Rule. It applies to the evolution system too. If the learner
encounters a pattern it doesn't understand, it logs it as "needs investigation"
rather than guessing. If `/evolve` can't determine whether a pattern is a skill
candidate, it asks the Commander.

Better to ask once than to learn wrong forever.

### Directive 5: Trust the Architecture, Verify the Output

The layers trust each other structurally. But the Commander verifies the output.

- Learner memory is reviewed periodically
- Generated skills are tested before habitual use
- Archive summaries are spot-checked for accuracy
- The 50-session archive limit prevents unbounded storage growth

Trust but verify. The village grows itself, but the Commander tends the garden.

---

## APPENDIX A: FILE REFERENCE MAP {#appendix-a-file-reference-map}

### Hooks (The Nervous System)

| File | Hook Event | Layer | Purpose |
|------|-----------|-------|---------|
| `~/.claude/hooks/observe.py` | PostToolUse | 1 | Silent action logging |
| `~/.claude/hooks/observe_failure.py` | PostToolUseFailure | 1b | Silent failure logging |
| `~/.claude/hooks/evolve_check.py` | Stop | 2 | Pattern detection at turn boundaries |
| `~/.claude/hooks/session_start.py` | SessionStart | 6a | Knowledge injection |
| `~/.claude/hooks/session_end.py` | SessionEnd | 6b | Log archival + cleanup |

### Agents (The Specialists)

| File | Model | Purpose |
|------|-------|---------|
| `~/.claude/agents/learner.md` | Haiku | Pattern analysis + classification |

### Skills (The Evolved Capabilities)

| File | Trigger | Purpose |
|------|---------|---------|
| `~/.claude/skills/evolve/SKILL.md` | `/evolve` | Full evolution cycle |

### Data (The Memory)

| Path | Format | Contents |
|------|--------|----------|
| `~/.claude/evolution/session-log.jsonl` | JSONL | Current session's tool log |
| `~/.claude/evolution/failures.jsonl` | JSONL | Current session's failures |
| `~/.claude/evolution/archive/` | JSONL + JSON | Archived sessions + summaries |
| `~/.claude/agent-memory/learner/MEMORY.md` | Markdown | Learner's persistent findings |

### Configuration (The Wiring)

| File | What It Configures |
|------|-------------------|
| `~/.claude/settings.json` | All hook registrations |

---

## APPENDIX B: GLOSSARY {#appendix-b-glossary}

| Term | Definition |
|------|-----------|
| **Stigmergy** | Indirect coordination through environmental traces (ant pheromones) |
| **Bigram** | A two-tool sequence (e.g., Read->Edit) tracked for pattern detection |
| **JSONL** | JSON Lines format -- one JSON object per line, easy to append |
| **additionalContext** | Hook output that Claude sees on its next turn (token cost) |
| **Silent hook** | A hook that produces no stdout (0 token cost, invisible to Claude) |
| **Skill candidate** | A pattern repeated enough times to justify becoming a /skill |
| **Evolution cycle** | The full OBSERVE -> DETECT -> LEARN -> GENERATE -> COMPOUND loop |
| **Pheromone trail** | A session log entry (metaphor from stigmergy) |
| **Cold start** | A session with no accumulated knowledge (the first session) |
| **Compounding** | Each session building on all previous sessions' learnings |
| **Vine strategy** | Growing around walls instead of fighting them |
| **The Posted Rule** | "Research First" -- mandated order in CLAUDE.md |

---

## COLOPHON {#colophon}

*Volume 6 of the Realbotville Library*
*Written during Sessions 12-13 of the FPCS 2022 Tax Preparation Project*
*Compiled on the day the village learned to grow itself.*

*Authors:*
- *The Analyst -- research catalog and framework survey*
- *OPUS -- architecture documentation and system design*
- *SHIELD -- security review and prime directives*
- *The Commander -- philosophy, metaphors, and the quote that started everything*

*Previous volumes:*
- *Vol 1: The Founding of Realbotville (Architecture & Operations)*
- *Vol 2: Tricks, Hacks & War Stories*
- *Vol 3: ForensicBot's Investigation Manual*
- *Vol 4: The Shape-Shifter Protocol (Identity System)*
- *Vol 5: The Commander's Field Manual (Claude Code Mastery)*
- ***Vol 6: The Living Village (Auto-Evolution)*** *(this volume)*

---

> "Don't fight the wall. Grow around it."
> "Plant a vine. It'll find the handle for you."
>
> The village doesn't plan itself. It grows from the traces left behind.
> Today the traces are pheromones. Tomorrow they're skills.
> And the day after that, they're tools that build other tools.
>
> We didn't build a machine. We planted a forest.

---

*END OF VOLUME 6*
