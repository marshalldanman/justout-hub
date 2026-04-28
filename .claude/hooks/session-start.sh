#!/bin/bash
set -euo pipefail

# Install Python dependencies for Gegenkraft Google Sheets generator
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  pip install --quiet google-api-python-client google-auth google-auth-httplib2 openpyxl 2>/dev/null || true
fi

# Brief agent on current priorities from LIFE.md
LIFE_MD="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo '.')}/LIFE.md"
if [ -f "$LIFE_MD" ]; then
  echo "=== JUSTOUT PRIORITIES (from LIFE.md Part V) ==="
  echo ""
  # Extract NOW section (between "### NOW" and "### NEXT")
  sed -n '/^### NOW/,/^### NEXT/p' "$LIFE_MD" | head -20
  echo ""
  echo "=== Read LIFE.md for full roadmap. Read tasks/APPRAISAL_MASTER.txt for task inventory. ==="
fi

# Show overdue/immediate tasks
TASKS_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo '.')}/tasks"
if [ -d "$TASKS_DIR" ]; then
  IMMEDIATE=$(grep -rl "IMMEDIATE\|OVERDUE" "$TASKS_DIR"/*.txt 2>/dev/null | wc -l)
  if [ "$IMMEDIATE" -gt 0 ]; then
    echo ""
    echo "WARNING: $IMMEDIATE task(s) flagged IMMEDIATE/OVERDUE. Check tasks/ folder."
  fi
fi
