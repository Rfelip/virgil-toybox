# Bichromator: Concrete

Color English prose by the concreteness of each word — warm terracotta for rock and hand and smoke, cool cerulean for freedom and meaning and system.

## The dimension

Every English word can be placed on a continuum from **concrete** (sensory, physical, imageable) to **abstract** (conceptual, relational, non-perceptual). Unlike etymology, this dimension cuts across all vocabulary strata and correlates with reading speed, memory retention, and emotional valence.

## Data source

Ratings come from a curated subset of:

> Brysbaert M, Warriner AB, Kuperman V (2014). **Concreteness ratings for 37,058 English lemmas.** *Behavior Research Methods*, 46(3), 904–911. doi:10.3758/s13428-013-0403-5

The full dataset uses a 1–5 scale where 5 = maximally concrete ("apple", "rock") and 1 = maximally abstract ("justice", "essence"). Ratings were collected from crowd-sourced human judges. The lookup in this toy (`concreteness.json`) is a hand-curated representative subset of ~1,100 words covering common prose vocabulary; words absent from the lookup are shown in neutral gray and excluded from statistics.

## Fun facts

- **Academic philosophy prose** averages around **2.7** (Kant, Hegel, Rawls).
- **Cormac McCarthy** averages around **3.4** — dense with physical world.
- **News leads** sit around **2.95–3.0**, concrete enough to picture but abstract enough to generalise.
- **Legal text** can dip below **2.6** — it talks about rights, conditions, and clauses.
- The most concrete words in English (score > 4.8) are body parts, tools, animals, foods, and materials.
- The most abstract (score < 1.5) are logical connectives, modal concepts, and institutional terms.

## UI features

- **Gradient coloring**: terracotta (concrete 5) → ochre (midpoint 3) → cerulean (abstract 1)
- **Hover tooltip**: shows the exact Brysbaert score for each colored word
- **Stats bar**: mean, median, SD across rated words; visual mean marker on the gradient bar
- **Histogram**: distribution of scores across the passage in 0.5-unit buckets
- **Advice panel**: analytical notes on register; "make it more concrete / abstract" guidance
- **Calibration corpus**: compare your passage's mean to McCarthy, news, academic philosophy, legal text

## Local development

The toy uses `fetch("concreteness.json")` which requires HTTP, not `file://`.

```bash
./serve.sh          # starts python3 -m http.server on port 8095
```

Then open `http://localhost:8095`.

## Files

- `index.html` — self-contained toy (pure browser, no build step)
- `concreteness.json` — curated Brysbaert subset
- `serve.sh` — local dev server
