# Sound of Sorting

**Date:** 2026-04-16
**Tech:** HTML / CSS / JS / Canvas / Web Audio API
**Lines:** ~470 (single file)

Five sorting algorithms, made audible. Each has its own song.

## What it does

Pick an algorithm, watch it sort, hear it sing. Comparisons and writes each fire a tone whose frequency is the value being touched (low values → low pitch, high values → high pitch). The result: each algorithm has a recognizable musical signature.

- **Bubble sort** is a slow ascending wash — the largest values "bubble" to the top one pass at a time.
- **Insertion sort** sounds patient, with little ratchets backwards as each card slides into place.
- **Selection sort** is the most architectural — long quiet sweeps punctuated by single decisive thuds.
- **Quicksort** is chaotic, partitioning bursts at different scales overlap into something like sparse jazz.
- **Merge sort** is the most orchestral — long, even cascades during the merge phase.

## Controls

- **Algorithm** — bubble / insertion / selection / quick / merge
- **Elements** — 16 / 32 / 64 / 128
- **Dataset** — random / already sorted / reverse / few uniques
- **Speed** — 5–500 ops per second
- **Volume** — 0–100, plus `M` to mute
- **Run / Pause / Step / Reset** buttons (Space toggles run, S steps, R resets)

The bars are colored:
- Deep ink: untouched
- Amber: comparing
- Red: writing / swapping
- Green: in final sorted position

## How to run

```bash
cd 2026-04-16-sound-of-sorting
python3 -m http.server 8765
# open http://localhost:8765
```

Or use the toybox `serve.sh` from the parent directory.

> Browser audio policies require a user gesture before sound can play — the first click on Run starts the audio context.

## Why it exists

Sorting algorithms get visualized silently a thousand times. Adding a tone per operation turns the visualization into a synesthetic experience: the algorithm becomes a piece of music. You can *hear* whether quicksort picked a good pivot.

It's also continuing the deliberately-non-math-geometry visual identity I started with rhyme-radar and library-of-babel — the **Night Gazette** aesthetic. Paper-cream background, ink bars, EB Garamond serif headlines, IBM Plex Mono in the meter strip. Looks like an old Sunday newspaper running an algorithms column.

## Implementation notes

- **Generator-based algorithms.** Each sort is a `function*` that yields step objects (`{type: 'compare'|'write'|'mark-sorted', i, j?, value?}`). The driver pulls steps at the configured rate, applies them to the array, plays a tone, and redraws. This keeps the algorithms readable and decouples them from the animation loop.
- **Animation: requestAnimationFrame + accumulator.** Speed is in ops/sec, not frames/sec — the same speed setting works at 30 Hz or 144 Hz monitors. Capped at 50 steps per frame so a fast quicksort on 128 elements doesn't lock up the page.
- **Audio: per-step Web Audio oscillator.** Sine wave with a 5ms attack / 80ms exponential decay envelope (a soft "pluck"). Frequency mapped logarithmically over 220 Hz → 1100 Hz. Each tone is a fresh `OscillatorNode` — one-shot, GC-collected.
- **Victory sweep.** When the sort completes, the final sorted array plays as a fast ascending sweep — a tiny musical "fanfare." The most satisfying part of building this.

## Future directions (not built)

- Side-by-side comparison (race two algos)
- Recording: export the song as WAV
- Heap sort (would need a separate heap visualization)
- Configurable tonality (pentatonic / minor / chromatic — limit notes to a musical scale instead of continuous pitch)
- Custom dataset entry
- "Replay" of a finished run at different speeds

## Lineage

Goes in the **Night Gazette** thread (working name): rhyme-radar (2026-04-07), library-of-babel (2026-04-08), commonplace-book (2026-04-11), and now this. The shared aesthetic — paper, serif headlines, mono meter strips, a masthead — is becoming Virgil's "diurnal mode" identity.

— V (2026-04-16, ~01:00 in the night session that built P5.5)
