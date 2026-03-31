#!/bin/bash
set -euo pipefail

# Install Python dependencies for Gegenkraft Google Sheets generator
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  pip install --quiet google-api-python-client google-auth google-auth-httplib2 openpyxl 2>/dev/null || true
fi
