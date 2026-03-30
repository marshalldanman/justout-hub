#!/bin/bash
# ================================================================
# BEE → Firebase Push
#
# Pushes a transcript entry to Firebase Realtime Database
# so it appears on the JAP Live feed page in real-time.
#
# Usage:
#   ./bee-push.sh "check my bot fleet status"
#   ./bee-push.sh "open tax hq" voice
#   ./bee-push.sh "remember to review designs" note
#
# Requires: curl, a Firebase ID token
#
# To get a Firebase ID token, the BEE device authenticates
# with Firebase Auth (Google OAuth) and passes the token.
# For testing, you can use the Firebase Auth REST API.
#
# Set environment variable JAP_FIREBASE_TOKEN before running,
# or pass it as the 3rd argument.
# ================================================================

set -euo pipefail

# Firebase project config
PROJECT_URL="https://fpcs-dashboard-63b25-default-rtdb.firebaseio.com"
DB_PATH="jap/feed"

# Args
TEXT="${1:?Usage: bee-push.sh \"your text\" [voice|note] [token]}"
TYPE="${2:-voice}"
TOKEN="${3:-${JAP_FIREBASE_TOKEN:-}}"

SPEAKER="Commander"
TIMESTAMP=$(date +%s000)  # milliseconds

# Build JSON payload
PAYLOAD=$(cat <<EOJSON
{
  "type": "$TYPE",
  "speaker": "$SPEAKER",
  "text": "$TEXT",
  "ts": $TIMESTAMP
}
EOJSON
)

if [ -n "$TOKEN" ]; then
  # Authenticated push (production mode)
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${PROJECT_URL}/${DB_PATH}.json?auth=${TOKEN}")
else
  # Unauthenticated push (only works if rules allow, for testing)
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${PROJECT_URL}/${DB_PATH}.json")
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  KEY=$(echo "$BODY" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  echo "BEE > Firebase: pushed to $DB_PATH/$KEY"
  echo "  Type:    $TYPE"
  echo "  Text:    $TEXT"
  echo "  Speaker: $SPEAKER"
else
  echo "BEE > Firebase: FAILED (HTTP $HTTP_CODE)"
  echo "  Response: $BODY"
  echo ""
  echo "  If you see 'Permission denied', you need to either:"
  echo "    1. Set JAP_FIREBASE_TOKEN with a valid Firebase ID token"
  echo "    2. Or temporarily set Firebase rules to allow writes for testing"
  echo ""
  echo "  To enable Realtime Database:"
  echo "    1. Go to https://console.firebase.google.com/project/fpcs-dashboard-63b25/database"
  echo "    2. Click 'Create Database' if not yet enabled"
  echo "    3. Import rules from JapHQ/firebase-rules.json"
  exit 1
fi
