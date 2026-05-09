#!/usr/bin/env bash
# Bichromator Concrete — local dev server
# Required because index.html uses fetch("concreteness.json") which fails on file://
set -e
PORT=${1:-8095}
cd "$(dirname "$0")"
echo "Serving Bichromator Concrete at http://localhost:${PORT}"
python3 -m http.server "$PORT"
