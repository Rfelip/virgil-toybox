#!/usr/bin/env bash
# serve.sh — start a local server for Lantern Keeper
# Required because fetch() for lanterns.json is blocked on file://

set -euo pipefail

PORT="${PORT:-7094}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Lantern Keeper — http://localhost:${PORT}/"
echo "Press Ctrl-C to stop."

if command -v python3 &>/dev/null; then
  python3 -m http.server "$PORT" --directory "$DIR"
elif command -v python &>/dev/null; then
  cd "$DIR" && python -m SimpleHTTPServer "$PORT"
elif command -v npx &>/dev/null; then
  npx --yes serve "$DIR" -p "$PORT"
else
  echo "Error: no Python or npx found. Install Python 3 to run this server." >&2
  exit 1
fi
