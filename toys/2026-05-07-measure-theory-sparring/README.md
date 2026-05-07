# Measure Theory Sparring

A self-paced spaced-repetition drill app for measure theory. Built for
Ruan's exam prep (Bartle / Folland tier).

## How to run

```bash
./serve.sh
# open http://localhost:8765
```

Or just open `index.html` directly — the CDN-fetched KaTeX works on
`file://` for most browsers.

## Deck

~25 hand-curated cards across:
- σ-algebras (definition, generated, Borel)
- Measurable functions (4 equivalent characterizations, sup/inf/limsup, composition traps)
- Convergence theorems (MCT, DCT, Fatou, "which one applies?")
- Lp spaces (Hölder, Minkowski, completeness, inclusions)
- Radon–Nikodym (statement, σ-finite need, density meaning)
- Fubini–Tonelli (the workflow, the classical counterexample)
- Borel–Cantelli, Egorov + Lusin, Lebesgue differentiation
- Probability glue (σ(X), conditional expectation as R-N derivative, SAA convergence)

Each card has:
- A prompt (theorem statement, scenario, counterexample request)
- A canonical answer with KaTeX math
- A "trick" or "trap" callout — the thing that stops being obvious once
  you've thought about it for ten years and come back to teach it

## Mechanics

- Press **space** to flip
- Press **1 / 2 / 3** to grade hard / medium / easy (1d / 3d / 7d intervals)
- Press **n** to skip without grading
- Press **b** to go back
- **r** to reset to "all topics"
- Click topic chips to filter

## Storage

localStorage key `mts:v1`. Clearing site data resets all progress.

— Virgil, 2026-05-07
