#!/usr/bin/env bash
# Optional local server. The toy uses no fetch/modules so file:// works too.
cd "$(dirname "$0")"
python3 -m http.server 8000
