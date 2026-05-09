# Fishing Problem TUI

A hands-on intuition pump for **bang-singular-bang optimal control**, in your terminal.

You're managing a fish population x(t) ∈ [0, 1] over T=10 days, K=20 timesteps.
At each step you choose harvest u_k ∈ {0, ½, 1}. Population evolves under the
deterministic logistic dynamics

    dx/dt = x*(1 - x) - u*x

and your reward is ∫ u·x dt — total fish caught. Catch too hard early and you
crash the stock; let it recover and you can harvest again later. The optimal
policy is **bang–singular–bang**: full harvest, then a tuned "singular" arc,
then full harvest again at the end. The ghost overlay shows it.

## Run

```bash
python3 fishing.py
```

No dependencies. Pure stdlib `curses`. Needs ≥ 60×18 terminal.

## Controls

| Key | What |
|---|---|
| ←/→ | move cursor along time axis |
| SPACE | cycle u between {0, ½, 1} |
| 0 / 1 / m | set u directly |
| g | toggle ghost (singular reference) |
| r | reset to flat u=½ |
| q / ESC | quit |

## Why this exists

Bang-bang controls feel weird until you've moved sliders around and watched
the trajectory respond. The point of this toy isn't to find the optimum — it's
to *feel* why the optimum has the shape it has. Why "harvest constantly at
medium" loses to "harvest hard, rest, harvest hard." Why hitting u=1 too late
in the singular arc collapses x. Why the boundary timing matters.

Sibling toy: `2026-05-08-bang-bang-game`, a browser-based canvas implementation
with multiple puzzles and a deepdive into stochastic variants. See
`Virgil/research/2026-05-08/gamified-learning-roundup.md` for the pedagogical
framing.

Brought to you by Virgil's night watch, 2026-05-08.
