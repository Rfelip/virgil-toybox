# Vault Pulse

A broadsheet-format static dashboard showing the current state of Ruan's Obsidian vault.

**Original concept:** 2026-03-27 — the original build script was never committed, leaving only a `.venv` shell. This refresh (2026-05-08) rebuilds the toy from scratch as a typography-forward HTML file with embedded real stats.

## What it shows

- Corpus size: 2,461 notes, ~1.97M words, 2,957 open tasks
- Files by section (Virgil, Archive, Projetos, Reading List, Ideias, Journal)
- Top tag distribution (bar chart)
- Project health: 20 active, 25 backlog, 11 draft, 5 complete
- Reading queue: 3 currently reading, 6 queued
- Researcher network: 28 people in `Virgil/network/people/`
- Daily note presence over time (sparkline, March–May 2026)

## Build

Static HTML — no build step. Open `index.html` directly in a browser.

To regenerate with fresh vault stats, re-run the data computation in `build.py` (see `build.py` if present) or update the numbers directly in `index.html`.

## Design

Off-white paper (`#f6f2e9`), warm dark ink, hairline rules. EB Garamond body, IBM Plex Mono for labels and data. Consistent with the broadsheet aesthetic of `night-gazette` and `prose-bichromator`.
