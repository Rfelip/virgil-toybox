#!/usr/bin/env bash
# Local HTTP server for the toybox.
#
# Modern browsers block ES modules and fetch() from file:// URLs, so every
# toy in here needs a real HTTP origin to run. This script starts Python's
# built-in server on port 8080 and prints the direct links for each toy.
#
# Usage:
#   ./serve.sh              # default port 8080
#   ./serve.sh 9000         # custom port
#
# Ctrl-C to stop.

set -e

PORT="${1:-8080}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "🎠 Virgil toybox server"
echo "   root: $ROOT"
echo "   port: $PORT"
echo
echo "open any of these in your browser:"
echo
for toy in toys/*/; do
  name=$(basename "$toy")
  printf "   • http://localhost:%s/%s\n" "$PORT" "$toy"
  unused=$name  # silence unused warning
done
echo
echo "Ctrl-C to stop."
echo

# Prefer python3; fall back to python if needed
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
else
  echo "ERROR: python3 not found. Install it or use another static server."
  exit 1
fi
