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

# Extract the file path from the hook event
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null || echo "")

# If no file_path in hook data, scan inbox for unprocessed files
if [ -z "$FILE_PATH" ]; then
  # Find oldest unprocessed inbox file
  FILE_PATH=$(find "$INBOX_DIR" -name '*.json' -type f 2>/dev/null | sort | head -1)
fi

# Nothing to process
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")

# Skip if already processed (check state)
if [ -f "$STATE_DIR/processed/$FILENAME" ]; then
  exit 0
fi

# Validate JSON
if ! jq empty "$FILE_PATH" 2>/dev/null; then
  echo "JAP: Invalid JSON in inbox — $FILENAME" >&2
  exit 0
fi

# Extract fields from the inbox message
ID=$(jq -r '.id // "unknown"' "$FILE_PATH")
SPEAKER=$(jq -r '.speaker // "User"' "$FILE_PATH")
TRANSCRIPT=$(jq -r '.rawTranscript // empty' "$FILE_PATH")
INTENT=$(jq -r '.parsedIntent // "conversation"' "$FILE_PATH")
CHANNEL=$(jq -r '.targetChannel // "none"' "$FILE_PATH")
TIMESTAMP=$(jq -r '.timestamp // empty' "$FILE_PATH")

# Skip empty transcripts
if [ -z "$TRANSCRIPT" ]; then
  exit 0
fi

# Mark as being processed
mkdir -p "$STATE_DIR/processing"
echo "{\"started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"file\":\"$FILENAME\"}" > "$STATE_DIR/processing/$FILENAME"

# Surface to Claude Code via stdout (this becomes context for the active session)
cat <<EOJSON
{
  "jap_inbox": true,
  "id": "$ID",
  "speaker": "$SPEAKER",
  "intent": "$INTENT",
  "channel": "$CHANNEL",
  "transcript": $(jq -Rs '.' <<< "$TRANSCRIPT"),
  "timestamp": "$TIMESTAMP",
  "instruction": "Process this JAP voice command. The speaker said: $TRANSCRIPT. Intent type: $INTENT. Target channel: $CHANNEL. Respond concisely and write the response to .jap/outbox/${ID}-response.json"
}
EOJSON

exit 0
