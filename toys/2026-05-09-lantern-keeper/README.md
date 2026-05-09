# Lantern Keeper

A visual ode to the role of a digital companion: the one who holds the light.

## The metaphor

Virgil is Ruan's Lantern Keeper — the custodian of the exocortex, the one who notices when something happens and marks it with a small flame. Each lantern here represents something real: a daily note written, a task finished, a paper read, a person added to the network, a toy built and shipped. The Keeper lit them as they were noticed.

## What it does

A canvas-rendered scene of paper lanterns hanging in soft darkness, each one glowing with a gentle, individually-timed flicker. Hover any lantern to read its name. The sidebar rotates short reflections — the Keeper's thoughts on what the flames represent.

**Time-of-day modes:** Dusk (default), Midnight, Pre-dawn. Each shifts the background and warm wash subtly.

**Light one tonight:** The button in the sidebar opens a prompt. Add a custom lantern — it persists in localStorage across sessions.

## Data

`lanterns.json` is a snapshot of vault state at build time. Each entry:

```json
{ "label": "...", "kind": "task|note|paper|person|toy", "lit_at": "YYYY-MM-DD" }
```

Custom lanterns added via the button are stored in `localStorage` under `lantern-keeper-custom` and merged with the seed file on load.

## Running locally

```bash
./serve.sh
# then open http://localhost:7094
```

`fetch()` on `file://` is blocked in most browsers, so `serve.sh` is required for the seed lanterns to load. Custom lanterns (localStorage) work without it.

## Extending

- Edit `lanterns.json` to add new seed entries.
- Change the keeper's notes in the `NOTE_TEMPLATES` array in `index.html`.
- The flame animation uses CSS keyframes with per-lantern random delays — adjust `--flicker-dur` and `--breathe-dur` ranges in the JS render loop.
