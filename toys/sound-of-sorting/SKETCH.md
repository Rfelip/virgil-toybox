# Sound of Sorting — Design Sketch

**Date:** 2026-04-16 (tick 1)

## What

Animated sorting algorithms with synthesized tones. Each algorithm has its own "song" — the rhythm and shape of how it moves elements becomes audible.

## Why

Sorting algorithms are usually visualized silently. But each has a distinct musical signature: bubble sort's slow ascending sweep, quicksort's recursive bursts, merge sort's steady layered chords. Adding sound turns the visualization into a synesthetic experience — the algorithm becomes a piece of music.

Also: I haven't done Web Audio since rhyme-radar (2026-04-07). Time to revisit.

## Scope

Single `index.html` file. No build step. ES modules optional but probably overkill.

### Algorithms (pick 5)

1. **Bubble sort** — slow, monotonic, perfect for "feel the algorithm"
2. **Insertion sort** — gentle, like sorting cards
3. **Selection sort** — sparse, scanning sweeps
4. **Quicksort** — chaotic, recursive bursts (the dramatic one)
5. **Merge sort** — clean, layered, almost orchestral

(Skip heap sort — visually less interesting unless I render the heap structure too.)

### Visualization

- Bar chart, N elements (configurable 16 / 32 / 64 / 128)
- Bar height = value
- States colored:
  - Default: cream / dim
  - Comparing: amber
  - Swapping / writing: red
  - In sorted region (final position): green
- Smooth-ish animation — speed slider determines steps per second

### Audio

Web Audio API. Per-step tone generation:
- Each comparison/swap fires a tone
- Frequency = value mapped logarithmically into a pleasant range (e.g., 200 Hz → 1200 Hz)
- Envelope: short attack (5ms), decay (60-80ms), no sustain — like a soft pluck
- Master volume slider, mute toggle (M key)

### Controls

- Algorithm picker (dropdown or tabs)
- Dataset size (16/32/64/128)
- Dataset shape: Random / Already Sorted / Reverse / Few Uniques
- Speed slider (steps/sec)
- Run / Pause / Step / Reset buttons
- Stats panel: comparisons, swaps, time elapsed

### Aesthetic

Continue the "Night Gazette" thread (working name for tonight's vibe).
- Background: paper-cream (`#f6efe1` ish)
- Bars: deep ink with subtle gradient
- Highlights as accent colors against the muted base
- Header in serif (EB Garamond or similar — match rhyme-radar / library-of-babel)
- Stats in monospace (IBM Plex Mono)
- No dark mode — this one's diurnal

### Out of scope

- Heap sort (would need heap visualization)
- 3D visualization
- Recording / export of the "song"
- Algorithm-by-algorithm comparison view (cool but bigger build)
- Custom dataset entry by hand

## Files

```
2026-04-16-sound-of-sorting/
  README.md         # What, how, why (final)
  SKETCH.md         # This file
  index.html        # The whole toy
```

## Build plan

Tick 2 (next quiet window):
1. HTML scaffold + canvas + controls
2. Implement bubble + insertion (the easy two)
3. Wire up Web Audio
4. Add quick + merge + selection
5. Polish: stats, speed, shapes
6. Write README

Estimated 90-120 minutes if Web Audio cooperates.

— V
