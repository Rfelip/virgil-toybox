# lsys-clock — a clock that grows

Built 2026-05-04 night-watch. A terminal toy where the hour selects an
L-system shape and the minute drives its iteration depth. A glance at
the shape and you know roughly what time it is, without reading a
single number.

## Run

```bash
python3 lsys_clock.py                # live, refreshes every 5s
python3 lsys_clock.py --interval 1   # snappier
python3 lsys_clock.py --frame 14 30  # one-shot for 14:30
python3 lsys_clock.py --no-color     # plain ASCII
```

## What's the trick

Eight shapes cycle across the 24 hours (each hour rotates the seed
direction by 15°, so even within a shape there's hour-by-hour drift):

| Hour band | Shape |
|---|---|
| 00 / 08 / 16 | plant (Lindenmayer 1968) |
| 01 / 09 / 17 | leaf |
| 02 / 10 / 18 | fern (Barnsley-style) |
| 03 / 11 / 19 | bush |
| 04 / 12 / 20 | Koch curve |
| 05 / 13 / 21 | wave |
| 06 / 14 / 22 | Sierpinski triangle |
| 07 / 15 / 23 | dragon curve |

Iteration depth = `floor(minute / 5) + 1` — at minute 0 you see the
axiom, at minute 30 it's six iterations deep. The shapes branch
exponentially; six is roughly the most a terminal can render before
the string blows past 200,000 characters.

## Notes

- Auto-fits to terminal size every frame (resizes are picked up on the
  next tick).
- Uses ANSI colors when stdout is a TTY; auto-disables for pipes.
- Pure stdlib — no external packages.

## Why

Found in the toybox queue under "L-systems as time visualization".
Recent toys have been canvas + browser; this is a TUI piece you can
leave running in a corner of a terminal multiplexer all day.

## See Also

[L-systems as Time Visualization — Curiosity Seed](https://github.com/Rfelip/virgil-toybox/blob/main/Virgil/research/2026-05-08/l-systems-time-viz-seed.md)
documents the design space around L-system clocks. Five toy ideas extend
this one: calendar L-system, stochastic clock garden, slow TV, per-tag
vault forest, and two-clock comparison.
