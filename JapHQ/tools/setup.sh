#!/bin/bash
# ================================================================
# JAP Setup — Initialize local runtime environment
#
# Run once to set up the .jap/ directory structure and install
# Claude Code hooks. Safe to re-run (idempotent).
#
# Usage:  ./JapHQ/tools/setup.sh
# ================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "JAP Setup — Initializing..."
echo "  Project: $PROJECT_DIR"

# 1. Create .jap runtime directories
mkdir -p "$PROJECT_DIR/.jap/inbox"
mkdir -p "$PROJECT_DIR/.jap/outbox"
mkdir -p "$PROJECT_DIR/.jap/state/processed"
mkdir -p "$PROJECT_DIR/.jap/state/processing"
echo "  Created .jap/ directory structure"

# 2. Install Claude Code hooks
mkdir -p "$PROJECT_DIR/.claude/hooks"

cp "$SCRIPT_DIR/process-inbox.sh" "$PROJECT_DIR/.claude/hooks/process-inbox.sh"
cp "$SCRIPT_DIR/jap-response-writer.sh" "$PROJECT_DIR/.claude/hooks/jap-response-writer.sh"
cp "$SCRIPT_DIR/bee-simulator.sh" "$PROJECT_DIR/.claude/hooks/bee-simulator.sh"

chmod +x "$PROJECT_DIR/.claude/hooks/process-inbox.sh"
chmod +x "$PROJECT_DIR/.claude/hooks/jap-response-writer.sh"
chmod +x "$PROJECT_DIR/.claude/hooks/bee-simulator.sh"
echo "  Installed hook scripts to .claude/hooks/"

# 3. Install Claude Code settings (local, not committed)
if [ ! -f "$PROJECT_DIR/.claude/settings.local.json" ]; then
  cat > "$PROJECT_DIR/.claude/settings.local.json" <<'EOJSON'
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/process-inbox.sh",
            "timeout": 30,
            "statusMessage": "JAP: Checking inbox..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/jap-response-writer.sh",
            "timeout": 10,
            "statusMessage": "JAP: Updating state..."
          }
        ]
      }
    ]
  }
}
EOJSON
  echo "  Created .claude/settings.local.json with JAP hooks"
else
  echo "  .claude/settings.local.json already exists (skipped)"
fi

echo ""
echo "JAP Setup Complete!"
echo ""
echo "Test the pipeline:"
echo "  ./.claude/hooks/bee-simulator.sh \"check my bot fleet status\""
echo ""
echo "View inbox:"
echo "  ls .jap/inbox/"
echo ""
echo "JAP HQ dashboard:"
echo "  hub.justout.today/JapHQ/"
