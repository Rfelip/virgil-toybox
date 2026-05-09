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

`cards.js` is **auto-generated** from the canonical markdown decks in
the vault. To regenerate:

```bash
cd ~/Desktop/personal_obsidian
python3 Virgil/scripts/sparring-deck-to-toy.py \
  --src "med:02 - Projetos/Personal/PER10 - Teoria da Medida (FGV)/sparring-deck-medida.md" \
  --src "otim:02 - Projetos/Personal/PER11 - Otimização (FGV)/sparring-deck-otimizacao.md" \
  -o ~/Desktop/Virgil/virgil-toybox/toys/2026-05-07-measure-theory-sparring/cards.js
```

Current deck: **137 cards** across two source files
- `med-NN` — 72 cards on measure theory (Bartle Cap 2–10)
- `otim-NN` — 65 cards on convex analysis & optimization (Vincent Guigues notes)

Card schema:
```
{ id, topic, title, prompt, answer, ref, byRuan, hard }
```

Cards marked `byRuan: true` were originally hand-written by Ruan in
the first iteration of this toy and re-imported through the vault deck.

## Companion Tools

- **TUI sparring runner** — `Virgil/scripts/sparring medida` / `sparring otim` — offline terminal UI for drilling with SRS-lite state. Same source decks.
- **Canonical vault decks**:
  - `02 - Projetos/Personal/PER10 - Teoria da Medida (FGV)/sparring-deck-medida.md`
  - `02 - Projetos/Personal/PER11 - Otimização (FGV)/sparring-deck-otimizacao.md`

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
