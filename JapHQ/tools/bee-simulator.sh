#!/bin/bash
# ================================================================
# BEE Device Simulator — For testing JAP pipeline
#
# Usage:
#   ./bee-simulator.sh "check my bot fleet status"
#   ./bee-simulator.sh "open tax hq" command tax
#   ./bee-simulator.sh "what's the sim swap risk?" query simswap
#
# Writes a properly formatted inbox JSON that triggers the
# JAP processing pipeline, simulating what the real BEE device
# would send after speech-to-text conversion.
# ================================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
INBOX_DIR="$PROJECT_DIR/.jap/inbox"

# Args
TRANSCRIPT="${1:?Usage: bee-simulator.sh \"your spoken words\" [intent] [channel]}"
INTENT="${2:-conversation}"
CHANNEL="${3:-null}"

# Generate unique ID and timestamp
ID="jap-$(date +%s)-$$"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FILENAME="${TIMESTAMP//[:+]/-}-${INTENT}.json"

# Auto-detect intent and channel from transcript if not provided
LOWER_TRANSCRIPT=$(echo "$TRANSCRIPT" | tr '[:upper:]' '[:lower:]')

if [ "$INTENT" = "conversation" ]; then
  case "$LOWER_TRANSCRIPT" in
    *"open "*|*"go to "*|*"launch "*|*"show "*)
      INTENT="command" ;;
    *"check "*|*"what"*|*"how"*|*"is "*|*"status"*)
      INTENT="query" ;;
    *"add "*|*"create "*|*"remind "*|*"research "*|*"build "*)
      INTENT="task" ;;
    *)
      INTENT="conversation" ;;
  esac
fi

if [ "$CHANNEL" = "null" ]; then
  case "$LOWER_TRANSCRIPT" in
    *"tax"*)        CHANNEL="tax" ;;
    *"bot"*)        CHANNEL="bots" ;;
    *"sim"*|*"swap"*)  CHANNEL="simswap" ;;
    *"music"*)      CHANNEL="music" ;;
    *"ai music"*)   CHANNEL="aimusic" ;;
    *"book"*)       CHANNEL="books" ;;
    *"art"*)        CHANNEL="art" ;;
    *"food"*|*"recipe"*) CHANNEL="food" ;;
    *"movie"*)      CHANNEL="movies" ;;
    *"youtube"*)    CHANNEL="youtube" ;;
    *"ai"*|*"lab"*) CHANNEL="ai" ;;
    *"health"*)     CHANNEL="health" ;;
    *"dream"*)      CHANNEL="dreams" ;;
    *"meditat"*)    CHANNEL="meditate" ;;
    *"game"*)       CHANNEL="games" ;;
    *"jap"*)        CHANNEL="jap" ;;
    *)              CHANNEL="null" ;;
  esac
fi

# Quote channel properly for JSON
if [ "$CHANNEL" = "null" ]; then
  CHANNEL_JSON="null"
else
  CHANNEL_JSON="\"$CHANNEL\""
fi

mkdir -p "$INBOX_DIR"

cat > "$INBOX_DIR/$FILENAME" <<EOJSON
{
  "id": "$ID",
  "timestamp": "$TIMESTAMP",
  "speaker": "Commander",
  "rawTranscript": "$TRANSCRIPT",
  "parsedIntent": "$INTENT",
  "confidence": 0.92,
  "targetChannel": $CHANNEL_JSON,
  "metadata": {
    "duration": $(echo "scale=1; ${#TRANSCRIPT} / 12" | bc),
    "noiseLevel": "quiet",
    "source": "bee-simulator"
  }
}
EOJSON

echo "BEE > Inbox: $INBOX_DIR/$FILENAME"
echo "  Speaker:    Commander"
echo "  Transcript: $TRANSCRIPT"
echo "  Intent:     $INTENT"
echo "  Channel:    $CHANNEL"
echo "  ID:         $ID"
