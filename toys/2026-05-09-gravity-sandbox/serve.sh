#!/usr/bin/env bash
# Serve the Gravity Sandbox locally.
# ES modules + fetch() require an HTTP server — file:// won't work.

PORT="${1:-8099}"
cd "$(dirname "$0")"

if command -v python3 &>/dev/null; then
  echo "Serving on http://localhost:${PORT}/"
  python3 -m http.server "$PORT"
elif command -v npx &>/dev/null; then
  echo "Serving on http://localhost:${PORT}/"
  npx serve -p "$PORT" .
else
  echo "Error: python3 or npx required" >&2
  exit 1
fi
