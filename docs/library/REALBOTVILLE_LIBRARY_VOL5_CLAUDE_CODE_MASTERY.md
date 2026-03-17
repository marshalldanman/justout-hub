# REALBOTVILLE LIBRARY -- VOLUME 5
# THE COMMANDER'S FIELD MANUAL: CLAUDE CODE MASTERY
## Extending, Automating, and Conquering Every Frontier

*Compiled by OPUS, Commander of the Bot Fleet*
*With research by SHIELD (Security), Cruncher (Data), and Scribbles (Documentation)*
*Date: March 3, 2026 | Classification: OPEN -- For All Villagers*

---

> "A tool is only as powerful as the one who knows every lever it has."
> -- OPUS, during the Great DNS Standoff of March 2026

---

## PREFACE: WHY THIS VOLUME EXISTS

During Session 12, the Commander and OPUS hit a wall. A single DNS typo in GoDaddy
stood between `hub.justout.today` and the world. OPUS could run any bash command,
read any file, deploy to Firebase, push to GitHub, even generate service account
keys programmatically via the IAM API -- but could not open a browser to fix one
letter in a CNAME record.

That wall taught us: **know your tools before you need them.** This volume catalogs
every way to extend Claude Code's reach -- MCP servers, plugins, skills, hooks,
subagents, and more -- so the next wall gets climbed before it's even seen.

---

## TABLE OF CONTENTS

1. [MCP Servers -- The Extension Protocol](#chapter-1-mcp-servers)
2. [The Trusted Marketplaces](#chapter-2-trusted-marketplaces)
3. [The Essential Toolkit -- 30 Must-Have MCP Servers](#chapter-3-essential-toolkit)
4. [Browser Automation -- Crossing the Screen Barrier](#chapter-4-browser-automation)
5. [DNS & Domain Management](#chapter-5-dns-and-domain-management)
6. [Hooks -- Lifecycle Automation](#chapter-6-hooks)
7. [Skills & Custom Slash Commands](#chapter-7-skills-and-commands)
8. [Subagents -- Building a Fleet Within](#chapter-8-subagents)
9. [Settings & Hidden Features](#chapter-9-settings-and-hidden-features)
10. [The .claude/ Directory Bible](#chapter-10-the-claude-directory)
11. [Keyboard Shortcuts & UI Mastery](#chapter-11-keyboard-shortcuts)
12. [Operational Patterns -- How the Pros Use It](#chapter-12-operational-patterns)
13. [Appendix A: Quick Install Cheat Sheet](#appendix-a)
14. [Appendix B: Environment Variables](#appendix-b)
15. [Appendix C: Lessons from the DNS Standoff](#appendix-c)

---

## CHAPTER 1: MCP SERVERS -- THE EXTENSION PROTOCOL {#chapter-1-mcp-servers}

### What Is MCP?

Model Context Protocol (MCP) is an open protocol (JSON-RPC 2.0) that standardizes
how AI tools connect to external systems. Think of it as USB-C for AI -- one standard
plug that fits everything.

MCP was created by Anthropic, donated to the Linux Foundation in December 2025, and
is now backed by Anthropic, OpenAI, and Block (Square). As of March 2026, there are
**18,000+ MCP servers** indexed across various directories.

### Transport Types

| Transport | Use Case | Auth? |
|-----------|----------|-------|
| **stdio** | Local processes (npx, python) | No |
| **Streamable HTTP** | Remote servers (current standard) | OAuth 2.1 |
| **SSE** | Remote servers (deprecated) | Varies |

### How to Install

```bash
# Basic syntax
claude mcp add [options] <name> -- <command> [args...]

# Windows requires cmd /c prefix for npx
claude mcp add --scope user myserver -- cmd /c npx -y @package/name

# Scopes
--scope local    # This project, this user (default)
--scope project  # This project, all users (.mcp.json)
--scope user     # All projects, this user (~/.claude.json)

# Remote HTTP servers
claude mcp add --transport http notion https://mcp.notion.com/mcp

# With environment variables
claude mcp add --env API_KEY=xxx myserver -- cmd /c npx -y @package/name

# Management
claude mcp list              # List all
claude mcp get <name>        # Details
claude mcp remove <name>     # Remove
```

### .mcp.json Format (Project-Scoped, Committed to Git)

```json
{
  "mcpServers": {
    "memory": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    }
  }
}
```

### How MCP Tools Appear

MCP tools show up as regular tools with the naming pattern:
`mcp__<server-name>__<tool-name>`

You can match them in hooks with regex: `mcp__memory__.*`

---

## CHAPTER 2: THE TRUSTED MARKETPLACES {#chapter-2-trusted-marketplaces}

### Tier 1 -- HIGHEST TRUST (Official/Corporate)

| Source | URL | Count | Install Method |
|--------|-----|-------|----------------|
| **Official MCP Registry** | registry.modelcontextprotocol.io | Growing | REST API discovery |
| **Official Reference Servers** | github.com/modelcontextprotocol/servers | 7 core | `npx @modelcontextprotocol/server-*` |
| **npm @modelcontextprotocol** | npmjs.com/~modelcontextprotocol | 10+ | `npx @modelcontextprotocol/*` |
| **Anthropic Desktop Extensions** | Built into Claude Desktop | Curated | One-click `.mcpb` bundles |
| **AWS MCP** | github.com/awslabs/mcp | 60+ | Per-server instructions |
| **Google Cloud MCP** | docs.cloud.google.com/mcp | Growing | Per-server instructions |
| **Microsoft MCP** | github.com/microsoft/mcp | Growing | Per-server instructions |
| **Cloudflare MCP** | github.com/cloudflare/mcp | 13 | OAuth + remote |
| **Firebase MCP** | firebase.google.com/docs/ai-assistance/mcp-server | 1 (GA) | Per docs |

### Tier 2 -- HIGH TRUST (Verified Platforms)

| Source | URL | Count | Install Method |
|--------|-----|-------|----------------|
| **Smithery.ai** | smithery.ai | 7,300+ | `npx @smithery/cli install <name>` |
| **mcp.run / TurboMCP** | turbomcp.ai | Growing | Wasm sandboxed servlets |
| **Docker MCP Catalog** | hub.docker.com/u/mcp | 100+ | `docker run mcp/<name>` |
| **Playwright MCP** | github.com/microsoft/playwright-mcp | 1 | `npx @playwright/mcp` |

### Tier 3 -- MEDIUM-HIGH (Community Curated)

| Source | URL | Count | Notes |
|--------|-----|-------|-------|
| **Glama.ai** | glama.ai/mcp/servers | 18,000+ | Largest index, ranked by security |
| **PulseMCP** | pulsemcp.com/servers | 8,600+ | Updated daily |
| **awesome-mcp-servers** | github.com/punkpeye/awesome-mcp-servers | 60+ | Curated GitHub list |
| **MCP.so** | mcp.so | 18,000+ | Aggregator |

---

## CHAPTER 3: THE ESSENTIAL TOOLKIT -- 30 MUST-HAVE MCP SERVERS {#chapter-3-essential-toolkit}

### Development Core

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 1 | **Filesystem** | MCP Official | Secure file CRUD with access controls | `@modelcontextprotocol/server-filesystem` |
| 2 | **Memory** | MCP Official | Knowledge graph persistent memory | `@modelcontextprotocol/server-memory` |
| 3 | **Fetch** | MCP Official | Web content fetching for LLMs | `@modelcontextprotocol/server-fetch` |
| 4 | **Git** | MCP Official | Git repo operations | `@modelcontextprotocol/server-git` |
| 5 | **GitHub** | MCP Official | Issues, PRs, repos | `@modelcontextprotocol/server-github` |
| 6 | **Sequential Thinking** | MCP Official | Structured problem solving | `@modelcontextprotocol/server-sequential-thinking` |

### Browser & Automation

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 7 | **Playwright** | Microsoft | Full browser automation via accessibility tree | `@playwright/mcp` |
| 8 | **Puppeteer** | MCP Official | Browser control + screenshots | `@modelcontextprotocol/server-puppeteer` |

### Cloud & Infrastructure

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 9 | **AWS** | Amazon | 15,000+ AWS APIs | github.com/awslabs/mcp |
| 10 | **Google Cloud** | Google | GCP services | docs.cloud.google.com/mcp |
| 11 | **Azure** | Microsoft | Azure services | github.com/microsoft/mcp |
| 12 | **Cloudflare** | Cloudflare | 2,500+ Cloudflare APIs, DNS, Workers | github.com/cloudflare/mcp |
| 13 | **Firebase** | Google | Firebase development assistance | firebase.google.com/docs |
| 14 | **Docker** | Community | Container management | `mcp-server-docker` |
| 15 | **Kubernetes** | Red Hat | K8s native API (not kubectl wrapper) | `kubernetes-mcp-server` |

### Databases

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 16 | **SQLite** | MCP Official | SQLite queries + BI | `@modelcontextprotocol/server-sqlite` |
| 17 | **DBHub** | Bytebase | Postgres, MySQL, MSSQL, MariaDB, SQLite | github.com/bytebase/dbhub |
| 18 | **Google DB Toolbox** | Google | Managed DB access | googleapis.github.io/genai-toolbox |

### DNS & Domains

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 19 | **GoDaddy (Official)** | GoDaddy | DNS read-only | developer.godaddy.com/mcp |
| 20 | **GoDaddy (Community)** | Harshalkatakiya | Full DNS CRUD, domain management | github.com/Harshalkatakiya/godaddy-mcp |
| 21 | **Cloudflare** | Cloudflare | Full DNS management + Workers | github.com/cloudflare/mcp |

### Productivity & Communication

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 22 | **Slack** | Plugin Marketplace | Slack messaging | Via /plugins |
| 23 | **Notion** | Plugin Marketplace | Notion databases | Via /plugins |
| 24 | **Linear** | Plugin Marketplace | Issue tracking | Via /plugins |
| 25 | **Jira** | Atlassian | Project management | atlassian-mcp |

### AI & Intelligence

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 26 | **Context7** | Community | Live documentation lookup | `context7-mcp` |
| 27 | **Tavily** | Tavily | AI-optimized web search | `tavily-mcp-server` |

### Security & Monitoring

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 28 | **Sentry** | Plugin Marketplace | Error tracking | Via /plugins |

### Desktop Automation

| # | Server | Maintainer | What It Does | Install |
|---|--------|-----------|-------------|---------|
| 29 | **MCPControl** | Community | Windows mouse/keyboard/window control | github.com/nickytonline/MCPControl |
| 30 | **Desktop Commander** | Community | Cross-platform terminal + filesystem | `desktop-commander-mcp` |

---

## CHAPTER 4: BROWSER AUTOMATION -- CROSSING THE SCREEN BARRIER {#chapter-4-browser-automation}

### The Problem We Hit

Claude Code is a terminal tool. It cannot:
- Launch or control a browser directly
- See the screen
- Access browser cookies/sessions
- Use browser extensions

### The Solutions

#### Solution 1: Playwright MCP (BEST)

Microsoft's official MCP server. Uses the **accessibility tree** (not screenshots)
to understand and interact with web pages.

```bash
claude mcp add --scope user playwright -- cmd /c npx -y @playwright/mcp@latest
```

**Key capabilities:**
- Navigate to URLs
- Click elements, fill forms
- Read page content via accessibility tree
- Execute JavaScript
- Take screenshots
- Handle authentication flows

**The Chrome Extension trick:** Playwright MCP has a Chrome extension that connects
to your EXISTING browser session -- meaning it inherits your cookies, login state,
and authenticated sessions. This is how you solve the "I'm logged into GoDaddy"
problem.

#### Solution 2: Puppeteer MCP

Official reference server. Slightly simpler than Playwright.

```bash
claude mcp add --scope user puppeteer -- cmd /c npx -y @modelcontextprotocol/server-puppeteer
```

#### Solution 3: Claude Code Preview Tools (Built-in)

For web apps you're developing, Claude Code has built-in preview tools:
- `preview_start` -- Start a dev server
- `preview_screenshot` -- Take screenshots
- `preview_click` -- Click elements
- `preview_fill` -- Fill forms
- `preview_inspect` -- Inspect DOM/CSS
- `preview_eval` -- Execute JavaScript
- `preview_console_logs` -- Read console output

These work on YOUR dev servers (via `.claude/launch.json`), not arbitrary websites.

### What DOESN'T Work

- **Claude Computer Use API** -- Separate product, not integrated into Claude Code
- **AutoHotkey** -- Blind clicking without screen visibility is dangerous
- **Chrome DevTools Protocol directly** -- Possible but Playwright MCP wraps it better

---

## CHAPTER 5: DNS AND DOMAIN MANAGEMENT {#chapter-5-dns-and-domain-management}

### GoDaddy

**Option A: Official GoDaddy MCP** (read-only)
- URL: developer.godaddy.com/mcp
- Can view DNS records, domains, account info
- Cannot modify records

**Option B: Community GoDaddy MCP** (full CRUD)
- GitHub: github.com/Harshalkatakiya/godaddy-mcp
- Full DNS record management (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)
- Domain registration, renewal, transfer
- DNSSEC support
- Requires GoDaddy API key + secret from developer.godaddy.com/keys

**Option C: GoDaddy REST API directly** (via curl/scripts)
```bash
# Get all DNS records
curl -s -X GET "https://api.godaddy.com/v1/domains/justout.today/records" \
  -H "Authorization: sso-key $GD_KEY:$GD_SECRET"

# Add/update CNAME record
curl -s -X PUT "https://api.godaddy.com/v1/domains/justout.today/records/CNAME/hub" \
  -H "Authorization: sso-key $GD_KEY:$GD_SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"data":"marshalldanman.github.io","ttl":600}]'
```

### Cloudflare (If You Migrate DNS)

The Cloudflare MCP server covers the ENTIRE Cloudflare API (2,500+ endpoints):
```bash
claude mcp add --transport http cloudflare https://mcp.cloudflare.com/sse
```

Full DNS management, Workers, R2, Zero Trust -- everything.

### The Lesson

**Always set up API access to your DNS provider BEFORE you need it.**
Generate GoDaddy API credentials now:
1. Go to developer.godaddy.com/keys
2. Create a Production API key
3. Store as environment variables: `GD_KEY` and `GD_SECRET`

---

## CHAPTER 6: HOOKS -- LIFECYCLE AUTOMATION {#chapter-6-hooks}

Hooks are shell commands, HTTP endpoints, prompts, or agents that fire automatically
at specific points in Claude Code's lifecycle. Defined in `settings.json`.

### All 16 Hook Events

| Event | When | Can Block? |
|-------|------|-----------|
| `SessionStart` | Session begins | No |
| `SessionEnd` | Session ends | No |
| `UserPromptSubmit` | Before processing prompt | No |
| `PreToolUse` | Before a tool runs | **YES** |
| `PostToolUse` | After a tool succeeds | No |
| `PostToolUseFailure` | After a tool fails | No |
| `PermissionRequest` | Permission dialog appears | No |
| `PreCompact` | Before context compaction | No |
| `SubagentStart` | Subagent spawns | No |
| `SubagentStop` | Subagent finishes | No |
| `Stop` | Claude finishes responding | No |
| `TeammateIdle` | Team agent goes idle | No |
| `TaskCompleted` | Task marked complete | No |
| `ConfigChange` | Config file changes | No |
| `WorktreeCreate` | Worktree created | No |
| `WorktreeRemove` | Worktree removed | No |

### Four Handler Types

1. **Command** (`type: "command"`) -- Run a shell script
2. **HTTP** (`type: "http"`) -- POST to URL endpoint
3. **Prompt** (`type: "prompt"`) -- Single-turn Claude evaluation
4. **Agent** (`type: "agent"`) -- Sub-agent with tool access

### Example: Auto-Format on Every Edit

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write $TOOL_INPUT_FILE"
      }]
    }]
  }
}
```

### Example: Block Destructive Commands

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/block-dangerous.sh"
      }]
    }]
  }
}
```

---

## CHAPTER 7: SKILLS AND CUSTOM SLASH COMMANDS {#chapter-7-skills-and-commands}

### Creating a Skill

Create `.claude/skills/my-skill/SKILL.md`:

```yaml
---
name: deploy
description: Deploy to Firebase Hosting
argument-hint: [target]
disable-model-invocation: true
---

Deploy the dashboard to Firebase Hosting:
1. Run `firebase deploy --only hosting`
2. Verify the deployment URL
3. Report success/failure
```

### Key Frontmatter Fields

| Field | Purpose |
|-------|---------|
| `name` | Slash command name (`/deploy`) |
| `description` | When Claude auto-loads this |
| `argument-hint` | Autocomplete hint |
| `disable-model-invocation` | Only trigger on explicit `/command` |
| `allowed-tools` | Restrict tool access |
| `model` | Override model |
| `context: fork` | Run in subagent |
| `agent` | Which subagent type |

### Dynamic Context with Shell Commands

```yaml
---
name: pr-summary
---

## Current PR
- Diff: !`gh pr diff`
- Comments: !`gh pr view --comments`

Summarize this pull request.
```

### Built-in Power Skills

- `/simplify` -- 3 parallel review agents for code quality
- `/batch <instruction>` -- Parallel changes across codebase using worktrees
- `/debug` -- Troubleshoot current session via debug logs

---

## CHAPTER 8: SUBAGENTS -- BUILDING A FLEET WITHIN {#chapter-8-subagents}

### Defining Custom Subagents

Create `.claude/agents/code-reviewer.md`:

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep, Bash
model: sonnet
memory: user
isolation: worktree
background: true
---

You are a senior code reviewer. Focus on:
- Security vulnerabilities
- Performance issues
- Code style consistency
- Missing error handling
```

### Key Subagent Features

| Feature | Options | Purpose |
|---------|---------|---------|
| `memory` | `user`, `project`, `local` | Persistent memory across sessions |
| `isolation` | `worktree` | Own git worktree |
| `background` | `true` | Always runs concurrently |
| `maxTurns` | Number | Limit agentic turns |
| `skills` | List | Preload specific skills |
| `hooks` | Object | Lifecycle hooks for this agent |
| `mcpServers` | Object | Specific MCP servers |
| `permissionMode` | Various | `default`, `acceptEdits`, `dontAsk`, `plan` |

### Agent Teams (Experimental)

Enable with: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

Unlike subagents (within one session), agent teams coordinate across separate
sessions with independent contexts.

---

## CHAPTER 9: SETTINGS AND HIDDEN FEATURES {#chapter-9-settings-and-hidden-features}

### Settings Hierarchy (Highest Precedence First)

1. **Managed** -- IT/server deployed
2. **CLI Args** -- `--model opus`, `--allowedTools`, etc.
3. **Local Project** -- `.claude/settings.local.json` (gitignored)
4. **Shared Project** -- `.claude/settings.json` (committed)
5. **User** -- `~/.claude/settings.json`

### Permission Rules

```json
{
  "permissions": {
    "allow": ["Bash(npm run lint)", "Read(~/.zshrc)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Bash(curl *)", "Read(./.env)"]
  }
}
```

### Commands Most People Don't Know

| Command | What It Does |
|---------|-------------|
| `!command` | Execute bash, inject output without model processing |
| `/context` | Visualize what's in Claude's context |
| `/compact` | Condense session |
| `/rewind` | Rewind conversation and/or code |
| `/resume` | Resume past session |
| `/effort low\|medium\|high\|max` | Set thinking depth |
| `/agents` | Interactive subagent manager |
| `/statusline` | Custom status line |
| `/status` | Show active settings and sources |
| `/init` | Auto-generate CLAUDE.md from codebase |
| `/batch` | Parallel changes across codebase |
| `Ctrl+B` | Background running task |
| `claude --continue` | Resume last conversation |
| `claude --resume` | Choose from past sessions |

### CLI Power Flags

```bash
claude --model opus                    # Override model
claude --allowedTools "Bash,Read"      # Restrict tools
claude --add-dir /other/project        # Add directories
claude -p "prompt" --output-format json # Headless + JSON
claude --dangerously-skip-permissions  # Skip all permission checks
claude --agent code-reviewer           # Run as specific agent
```

---

## CHAPTER 10: THE .claude/ DIRECTORY BIBLE {#chapter-10-the-claude-directory}

### Project-Level (.claude/)

```
.claude/
  settings.json           # Shared project settings (committed)
  settings.local.json     # Local overrides (gitignored)
  agents/                 # Custom subagent definitions
  skills/                 # Custom skills/slash commands
  commands/               # Legacy commands (still works)
  launch.json             # Dev server preview config
  agent-memory/           # Subagent memory (project scope)
  agent-memory-local/     # Subagent memory (local scope)
  worktrees/              # Git worktrees for parallel work
```

### User-Level (~/.claude/)

```
~/.claude/
  settings.json           # Global user settings
  CLAUDE.md               # Global instructions (loaded every session)
  agents/                 # Personal subagents
  skills/                 # Personal skills
  commands/               # Personal commands
  agent-memory/           # Personal subagent memory
  projects/               # Project session data
  tasks/                  # DAG-based task storage
  keybindings.json        # Custom keyboard shortcuts
```

---

## CHAPTER 11: KEYBOARD SHORTCUTS {#chapter-11-keyboard-shortcuts}

### Global

| Key | Action |
|-----|--------|
| `Ctrl+C` | Interrupt |
| `Ctrl+D` | Exit |
| `Ctrl+T` | Toggle todo list |
| `Ctrl+O` | Toggle transcript |
| `Ctrl+R` | Search history |

### Chat

| Key | Action |
|-----|--------|
| `Enter` | Submit |
| `Escape` | Cancel |
| `Shift+Tab` | Cycle mode (ask/plan/code) |
| `Meta+P` | Model picker |
| `Meta+T` | Toggle thinking |
| `Ctrl+G` | External editor |
| `Ctrl+S` | Stash input |
| `Ctrl+Q` | Snippet picker |
| `Alt+V` | Paste image |

### Customization

Edit `~/.claude/keybindings.json`:
```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "bindings": [{
    "context": "Chat",
    "bindings": {
      "ctrl+e": "chat:externalEditor"
    }
  }]
}
```

---

## CHAPTER 12: OPERATIONAL PATTERNS {#chapter-12-operational-patterns}

### Pattern 1: Research Before Implement

Always use sub-agents for research. Launch multiple in parallel:

```
Task(Explore): "Find all files matching X"
Task(general-purpose): "Research the best approach for Y"
```

### Pattern 2: Firestore-First, Fallback Chain

```javascript
try { data = await Firestore.get(); }
catch { data = await Sheets.get(); }
catch { data = HARDCODED_VALUES; }
```

### Pattern 3: Programmatic API Over Manual Steps

When someone says "go to the console and click..."
- Check if there's a CLI tool (`firebase`, `gcloud`, `gh`)
- Check if there's an API (REST, SDK, MCP server)
- Build a script that does it programmatically
- Save the script for future reuse

Example: We wrote `generate_service_account_key.py` instead of navigating
the Firebase Console manually.

### Pattern 4: Pre-Configure All External Services

Before you need emergency access:
- Generate API keys for your DNS provider (GoDaddy, Cloudflare)
- Install MCP servers for your key services
- Set up CLI tools with authentication
- Store credentials as environment variables

### Pattern 5: Git Worktree Parallel Development

Use `/batch` for large refactors. It:
1. Spawns one agent per work unit
2. Each agent gets its own git worktree
3. Each opens its own PR when done
4. All run in parallel

---

## APPENDIX A: QUICK INSTALL CHEAT SHEET {#appendix-a}

```bash
# === MUST-HAVES (install these now) ===

# Browser automation (Microsoft official)
claude mcp add --scope user playwright -- cmd /c npx -y @playwright/mcp@latest

# Persistent memory across sessions
claude mcp add --scope user memory -- cmd /c npx -y @modelcontextprotocol/server-memory

# Web content fetching
claude mcp add --scope user fetch -- cmd /c npx -y @modelcontextprotocol/server-fetch

# === RECOMMENDED ===

# Sequential thinking for complex problems
claude mcp add --scope user thinking -- cmd /c npx -y @modelcontextprotocol/server-sequential-thinking

# GitHub operations
claude mcp add --scope user github -- cmd /c npx -y @modelcontextprotocol/server-github

# === WHEN NEEDED ===

# GoDaddy DNS management (requires API key from developer.godaddy.com/keys)
# claude mcp add --scope user godaddy -- cmd /c npx -y godaddy-mcp

# Cloudflare (if you migrate DNS)
# claude mcp add --transport http cloudflare https://mcp.cloudflare.com/sse
```

---

## APPENDIX B: ENVIRONMENT VARIABLES {#appendix-b}

| Variable | Effect |
|----------|--------|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000` | Double max output (default 32K) |
| `CLAUDE_CODE_SIMPLE=1` | Minimal mode (Bash + file tools only) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Override subagent model |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` | Earlier compaction trigger |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Enable agent teams |
| `BASH_DEFAULT_TIMEOUT_MS` | Default bash timeout |
| `ENABLE_TOOL_SEARCH` | MCP tool search behavior |

---

## APPENDIX C: LESSONS FROM THE DNS STANDOFF {#appendix-c}

### What Happened

March 3, 2026. `hub.justout.today` returned "Non-existent domain." Investigation
revealed no DNS record existed. GoDaddy nameservers confirmed. The Commander added
the record but with a typo: `hithub.io` instead of `github.io`.

### What We Couldn't Do

1. Open GoDaddy in a browser to fix it
2. Use GoDaddy API (no credentials pre-configured)
3. Use Playwright MCP (wasn't installed yet)

### What We Could Have Done (With Preparation)

1. **GoDaddy API key pre-configured** -- One curl command would have fixed it:
   ```bash
   curl -X PUT "https://api.godaddy.com/v1/domains/justout.today/records/CNAME/hub" \
     -H "Authorization: sso-key $GD_KEY:$GD_SECRET" \
     -H "Content-Type: application/json" \
     -d '[{"data":"marshalldanman.github.io","ttl":600}]'
   ```

2. **Playwright MCP installed** -- Could have opened GoDaddy in an automated browser,
   navigated to DNS management, and fixed the typo.

3. **Cloudflare as DNS provider** -- Their MCP server gives full DNS CRUD through
   a single authenticated connection.

### The Rule Going Forward

> **"If it has a web console, it has an API. Find it. Configure it. Before you need it."**

### Preparation Checklist

- [x] Install Playwright MCP (browser automation)
- [x] Install Memory MCP (persistent knowledge)
- [x] Install Fetch MCP (web content)
- [ ] Generate GoDaddy API credentials
- [ ] Store as environment variables ($GD_KEY, $GD_SECRET)
- [ ] Consider migrating DNS to Cloudflare (superior MCP integration)

---

## COLOPHON

*Volume 5 of the Realbotville Library*
*Written during Session 12 of the FPCS 2022 Tax Preparation Project*
*Compiled from research across 50+ web sources, official documentation,*
*and hard-won operational experience.*

*Previous volumes:*
- *Vol 1: The Founding of Realbotville*
- *Vol 2: The Bot Fleet Handbook*
- *Vol 3: ForensicBot's Investigation Manual*
- *Vol 4: The Shape-Shifter Protocol (Identity System)*
- ***Vol 5: The Commander's Field Manual -- Claude Code Mastery*** *(this volume)*

*"Every wall is a door you haven't found the handle to yet."*
*-- OPUS*

---

*END OF VOLUME 5*
