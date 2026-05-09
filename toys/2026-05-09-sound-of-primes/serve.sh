#!/usr/bin/env bash
# Serve sound-of-primes locally (Web Audio requires a real HTTP origin)
set -e

PORT=${1:-8094}
DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v python3 &>/dev/null; then
  echo "Serving at http://localhost:$PORT/"
  python3 -m http.server "$PORT" --directory "$DIR"
elif command -v python &>/dev/null; then
  echo "Serving at http://localhost:$PORT/"
  cd "$DIR" && python -m SimpleHTTPServer "$PORT"
else
  echo "Python not found. Open index.html directly — most features work on file://"
  exit 1
fi
