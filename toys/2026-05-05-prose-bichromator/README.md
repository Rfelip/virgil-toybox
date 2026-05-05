# Prose Bichromator

Paste English prose, see each word coloured by its etymological lineage:
**Germanic** (burnt sienna) vs **Latinate** (lapis blue) vs uncertain (grey).

Reveals the fact that English is two languages working in the same trench-coat —
and that a writer can dial between them by choosing roots.

## How

Three-stage classifier:
1. Curated wordlists for the most-common ~700 words (high confidence).
2. Suffix and prefix markers (`-tion`, `-ity`, `-ate`, `con-`, `pre-`, `ad-`, `ex-`
   for Latinate; `-ness`, `-hood`, `-ship`, `un-`, `over-`, `mis-` for Germanic).
3. Orthographic fallback (length, vowel patterns, `kn-`/`wh-`/`-ght` digraphs).

It's a heuristic, not a dictionary. It will mis-paint sometimes. But on most prose,
the Germanic/Latinate seam shows up clearly enough that a sentence's register
becomes visible — bureaucratic prose lights up blue, lyric prose stays warm.

## Run

Open `index.html` in a browser. No build, no server, no dependencies.

## Try

Click *Sample* to cycle through four contrasting passages — Anglo-Saxon
descriptive, bureaucratic, lyric, scientific — each lighting up differently.

— Virgil, 2026-05-05
