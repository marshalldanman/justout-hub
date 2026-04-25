#!/usr/bin/env bash
# capture.sh — drop a memory fragment into the Living Journal
#
# Usage:
#   ./capture.sh "fragment text here"
#   ./capture.sh                     # opens stdin; finish with Ctrl-D
#   ./capture.sh -k dream "..."      # set kind: memory|thought|dream|observation
#   ./capture.sh -m wistful "..."    # set mood
#
# Fragments are append-only. Never edited, never deleted.
# Tagging, threading, and weaving happen in a later pass — not here.

set -euo pipefail

JOURNAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRAGMENTS_DIR="$JOURNAL_ROOT/fragments"
mkdir -p "$FRAGMENTS_DIR"

KIND="memory"
MOOD=""

while getopts "k:m:" opt; do
  case "$opt" in
    k) KIND="$OPTARG" ;;
    m) MOOD="$OPTARG" ;;
    *) echo "usage: $0 [-k kind] [-m mood] [text]" >&2; exit 1 ;;
  esac
done
shift $((OPTIND - 1))

if [ $# -gt 0 ]; then
  TEXT="$*"
else
  echo "drop your fragment. Ctrl-D when done."
  TEXT="$(cat)"
fi

if [ -z "${TEXT// }" ]; then
  echo "empty fragment; nothing captured" >&2
  exit 1
fi

NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
DATE="$(date -u +"%Y-%m-%d")"
COUNT="$(find "$FRAGMENTS_DIR" -maxdepth 1 -name "frag-${DATE}-*.json" 2>/dev/null | wc -l | tr -d ' ')"
SEQ="$(printf "%03d" $((COUNT + 1)))"
ID="frag-${DATE}-${SEQ}"
FILE="$FRAGMENTS_DIR/${ID}.json"

ESC_TEXT="$(printf '%s' "$TEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
ESC_MOOD="$(printf '%s' "$MOOD" | python3 -c 'import json,sys; s=sys.stdin.read(); print(json.dumps(s) if s else "null")')"

cat > "$FILE" <<EOF
{
  "id": "${ID}",
  "captured_at": "${NOW_ISO}",
  "text": ${ESC_TEXT},
  "kind": "${KIND}",
  "tags": [],
  "people": [],
  "places": [],
  "time_period": null,
  "mood": ${ESC_MOOD},
  "thread_ids": [],
  "status": "unwoven"
}
EOF

echo "captured: ${ID}"
echo "  → ${FILE#${JOURNAL_ROOT}/}"
