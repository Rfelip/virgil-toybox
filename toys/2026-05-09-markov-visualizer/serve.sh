#!/usr/bin/env bash
# Serve the Markov visualizer locally.
# The toy uses ES5-compatible inline JS and no fetch() calls,
# so file:// works. This server is provided for convenience.
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Serving Markov Chain Visualizer at http://localhost:${PORT}/"
python3 -m http.server "$PORT"
