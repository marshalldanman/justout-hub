#!/bin/bash
# ============================================================
# Gegenkraft MCP Server Installer
# Installs 6 MCP servers for Claude Code that enable:
#   1. Google Sheets   - create/edit sheets directly
#   2. Playwright      - browser automation
#   3. Memory          - persistent GK progress across sessions
#   4. Google Calendar - schedule GK reminders
#   5. Sequential Thinking - structured GK strategy reasoning
#   6. Brave Search    - live web research
#
# Usage: bash setup-mcp-servers.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SA_KEY_PATH="$SCRIPT_DIR/service-account-key.json"
DRIVE_FOLDER_ID="1yi4qVotXKBys3so3DuQaG5TginlMrCeo"

echo ""
echo "========================================"
echo "  GEGENKRAFT MCP SERVER INSTALLER"
echo "========================================"
echo ""

# ── 1. Google Sheets MCP ──────────────────────────────────────
echo "[1/6] Installing Google Sheets MCP..."
claude mcp add-json "google-sheets" "{
  \"command\": \"uvx\",
  \"args\": [\"mcp-google-sheets@latest\"],
  \"env\": {
    \"SERVICE_ACCOUNT_PATH\": \"$SA_KEY_PATH\",
    \"DRIVE_FOLDER_ID\": \"$DRIVE_FOLDER_ID\"
  }
}" --scope user
echo "  Done."

# ── 2. Playwright MCP ────────────────────────────────────────
echo "[2/6] Installing Playwright MCP..."
claude mcp add-json "playwright" "{
  \"command\": \"npx\",
  \"args\": [\"-y\", \"@anthropic-ai/mcp-playwright@latest\"]
}" --scope user
echo "  Done."

# ── 3. Memory MCP ────────────────────────────────────────────
echo "[3/6] Installing Memory MCP..."
claude mcp add-json "memory" "{
  \"command\": \"npx\",
  \"args\": [\"-y\", \"@anthropic-ai/mcp-memory@latest\"]
}" --scope user
echo "  Done."

# ── 4. Google Calendar MCP ────────────────────────────────────
echo "[4/6] Installing Google Calendar MCP..."
claude mcp add-json "google-calendar" "{
  \"command\": \"uvx\",
  \"args\": [\"mcp-google-calendar@latest\"],
  \"env\": {
    \"SERVICE_ACCOUNT_PATH\": \"$SA_KEY_PATH\"
  }
}" --scope user
echo "  Done."

# ── 5. Sequential Thinking MCP ────────────────────────────────
echo "[5/6] Installing Sequential Thinking MCP..."
claude mcp add-json "sequential-thinking" "{
  \"command\": \"npx\",
  \"args\": [\"-y\", \"@anthropic-ai/mcp-sequential-thinking@latest\"]
}" --scope user
echo "  Done."

# ── 6. Brave Search MCP ──────────────────────────────────────
echo "[6/6] Installing Brave Search MCP..."
echo ""
echo "  NOTE: Brave Search requires a free API key."
echo "  Get one at: https://brave.com/search/api/"
echo ""
read -p "  Enter your Brave Search API key (or press Enter to skip): " BRAVE_KEY

if [ -n "$BRAVE_KEY" ]; then
  claude mcp add-json "brave-search" "{
    \"command\": \"npx\",
    \"args\": [\"-y\", \"@anthropic-ai/mcp-brave-search@latest\"],
    \"env\": {
      \"BRAVE_API_KEY\": \"$BRAVE_KEY\"
    }
  }" --scope user
  echo "  Done."
else
  echo "  Skipped. Run this script again when you have the key."
fi

echo ""
echo "========================================"
echo "  ALL MCP SERVERS INSTALLED"
echo "========================================"
echo ""
echo "  Verify with: claude mcp list"
echo "  Restart Claude Code to activate."
echo ""
echo "  Your 6 skills:"
echo "    1. google-sheets   - Create/edit Google Sheets"
echo "    2. playwright      - Browser automation"
echo "    3. memory          - Persistent memory across sessions"
echo "    4. google-calendar - Schedule reminders"
echo "    5. sequential-thinking - Structured reasoning"
echo "    6. brave-search    - Live web research"
echo ""
echo "========================================"
