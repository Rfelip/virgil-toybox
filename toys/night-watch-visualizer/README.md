# Night Watch Visualizer

A single-file HTML dashboard that renders a Virgil night-watch session as a
record you can read the morning after. **Not real-time** — the point is the
retrospective, not the live view.

Continues the Night Gazette aesthetic lineage (rhyme-radar, library-of-babel,
commonplace-book, sound-of-sorting): paper-cream background, ink-black text,
serif headlines, letterpress sensibility.

## What it shows

A **horizontal timeline** of ticks. Each tick is a column. Inside each column:

- The tick header (time range, short gloss)
- **Agent dispatches** rendered as vertical threads running down the column.
  Each thread has a start point (tick it was dispatched) and an end point
  (tick it returned). A thread that's still running is shown open-ended with
  a dashed tail.
- **PR outcomes** are circular nodes on the thread — colored by verdict
  (green = clean, amber = in-review, red = needs-attention, grey = no-op).
- **Tickets closed** land as small flagged markers at the tick they closed.
- **Rituals** (toybox, essay, maintenance) are annotated in a sidebar, not
  in the timeline proper — they're background activity.

## Data source

Reads `Virgil/queues/YYYY-MM-DD.md`. Parses:

- Frontmatter → date + start/end times
- `## Queue` → initial ticket list
- `## Log` → per-tick entries (the narrative)
- Any PR numbers mentioned (regex: `#\d+` or `PR #\d+`) → node labels
- Any agent IDs (regex: `agent `a[0-9a-f]{16}`` or similar) → thread IDs

No other files needed. This is a single HTML file that takes the queue log as
input — either pasted into a textarea, or loaded via `?q=...` URL parameter
or `localStorage`, or loaded from a relative path when served.

## Why this toy

The first night of autonomous running proved several things:
- Parallel agent dispatch is real (3 agents at once this tick)
- Tick-by-tick progress is the natural pulse
- The queue file IS the log — it's just not easy to read as a log

This toy makes the queue file *legible as a timeline*. Secondary effect:
watching the timeline build night over night will reveal patterns — when do
agents cluster, when does the queue stall, when do tickets churn?

## Non-goals

- **Not live.** Reads a static file. If Ruan wants live, that's a different
  toy (and probably belongs in the terminal, not HTML).
- **Not interactive editing.** Read-only. The queue is the source of truth.
- **Not a Linear / GitHub integration.** Just parses what's in the queue
  file. If the queue mentions `#987`, the visualizer links to
  `https://github.com/plumafinance/pluma-finance-app-59786d2a/pull/987`
  but doesn't fetch its state.

## Build plan

- **Sketch** (tonight, this tick): folder + README + HTML scaffold with
  placeholder markup showing the layout. Load static sample queue.
- **Parser** (next night): robust parser for queue log → data model (ticks,
  threads, nodes, tickets).
- **Render** (third night): SVG timeline with tick columns + agent threads +
  PR nodes + ticket flags. No animation this pass.
- **Polish** (fourth night): sidebar of rituals, ambient styling in the
  Night Gazette lineage, keyboard navigation (←/→ between ticks, N for
  next-event).

Size budget: single `.html` file, under 600 LoC. No build step.

## Launch

```bash
./serve.sh        # open http://localhost:8000/ (uses python3 -m http.server)
# OR
open index.html   # file:// works if no queue URL param is used
```

`file://` detector banner follows the toybox convention (see
`feedback_toy_file_protocol` memory).

## Open questions

- How to distinguish implementer / custodian / reviewer / plan threads?
  Probably color or stroke-style (solid / dashed / dotted).
- How to render ticks that span an agent's full lifetime (started tick 2,
  returned tick 4)? Thread spans 3 columns. Whose tick does the PR-node land in?
  → Answer: the tick the agent *returned*. The "in-flight" ticks show just the
  thread line.
- Do we render Ruan's side-work (DEV-570 merges, etc.) at all? Probably yes,
  in a separate lane labeled "Ruan" — to distinguish from Virgil-orchestrated
  work.
