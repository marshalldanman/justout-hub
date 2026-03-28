#!/bin/bash
# ================================================================
# JAP Response Writer — Post-processing hook
# Called after Claude Code processes a JAP inbox item.
# Moves processed files and updates state.
# ================================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJECT_DIR/.jap/state"

# Clean up processing state for completed items
mkdir -p "$STATE_DIR/processed"

if [ -d "$STATE_DIR/processing" ]; then
  for f in "$STATE_DIR/processing"/*.json; do
    [ -f "$f" ] || continue
    BASENAME=$(basename "$f")
    mv "$f" "$STATE_DIR/processed/$BASENAME"
  done
fi

exit 0
