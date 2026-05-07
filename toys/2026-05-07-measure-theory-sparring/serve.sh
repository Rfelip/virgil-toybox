#!/usr/bin/env bash
# Serve the toy on a local port. KaTeX from CDN works on file://, but
# better to be safe.
cd "$(dirname "$0")"
PORT="${1:-8765}"
echo "serving on http://localhost:$PORT"
python3 -m http.server "$PORT"
