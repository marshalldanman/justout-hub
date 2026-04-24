#!/bin/bash
# ================================================================
# JAP Inbox Processor — Claude Code Hook
# Triggered by FileChanged on .jap/inbox/*.json
#
# Reads the incoming transcript/command from BEE device,
# validates it, and surfaces it to Claude Code for processing.
# Results are written to .jap/outbox/ for BEE device pickup.
# ================================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INBOX_DIR="$PROJECT_DIR/.jap/inbox"
OUTBOX_DIR="$PROJECT_DIR/.jap/outbox"
STATE_DIR="$PROJECT_DIR/.jap/state"

# Read hook input from stdin
INPUT=$(cat)

# Extract the file path from the hook event (FileChanged provides this)
HOOK_FILE=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null || echo "")

# Build list of files to process
FILES=()
if [ -n "$HOOK_FILE" ] && [ -f "$HOOK_FILE" ]; then
  FILES=("$HOOK_FILE")
else
  # Scan inbox for all unprocessed JSON files (oldest first)
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    FNAME=$(basename "$f")
    [ "$FNAME" = ".gitkeep" ] && continue
    [ -f "$STATE_DIR/processed/$FNAME" ] && continue
    FILES+=("$f")
  done < <(find "$INBOX_DIR" -name '*.json' -type f 2>/dev/null | sort)
fi

# Nothing to process
if [ ${#FILES[@]} -eq 0 ]; then
  exit 0
fi

FIRST=true
for FILE_PATH in "${FILES[@]}"; do
  FILENAME=$(basename "$FILE_PATH")

  # Skip if already processed
  [ -f "$STATE_DIR/processed/$FILENAME" ] && continue

  # Validate JSON
  if ! jq empty "$FILE_PATH" 2>/dev/null; then
    echo "JAP: Invalid JSON in inbox — $FILENAME" >&2
    continue
  fi

  # Extract fields from the inbox message
  ID=$(jq -r '.id // "unknown"' "$FILE_PATH")
  SPEAKER=$(jq -r '.speaker // "User"' "$FILE_PATH")
  TRANSCRIPT=$(jq -r '.rawTranscript // empty' "$FILE_PATH")
  INTENT=$(jq -r '.parsedIntent // "conversation"' "$FILE_PATH")
  CHANNEL=$(jq -r '.targetChannel // "none"' "$FILE_PATH")
  TIMESTAMP=$(jq -r '.timestamp // empty' "$FILE_PATH")

  # Skip empty transcripts
  [ -z "$TRANSCRIPT" ] && continue

  # Mark as being processed
  mkdir -p "$STATE_DIR/processing"
  echo "{\"started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"file\":\"$FILENAME\"}" > "$STATE_DIR/processing/$FILENAME"

  # Separator between multiple items
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo ","
  fi

  # Surface to Claude Code via stdout (safe JSON construction)
  jq -n \
    --arg id "$ID" \
    --arg speaker "$SPEAKER" \
    --arg intent "$INTENT" \
    --arg channel "$CHANNEL" \
    --arg transcript "$TRANSCRIPT" \
    --arg timestamp "$TIMESTAMP" \
    '{
      jap_inbox: true,
      id: $id,
      speaker: $speaker,
      intent: $intent,
      channel: $channel,
      transcript: $transcript,
      timestamp: $timestamp,
      instruction: ("Process this JAP voice command. The speaker said: " + $transcript + ". Intent type: " + $intent + ". Target channel: " + $channel + ". Respond concisely and write the response to .jap/outbox/" + $id + "-response.json")
    }'
done

exit 0
