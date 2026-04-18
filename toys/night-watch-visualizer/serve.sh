#!/bin/bash
# Start a simple local HTTP server for this toy.
# Many toy features (fetch, modules, CORS) do not work under file://.
cd "$(dirname "$0")"
echo "Serving on http://localhost:8000/"
echo "  index.html · scaffold (tick 2 of build)"
echo "Ctrl-C to stop."
exec python3 -m http.server 8000
