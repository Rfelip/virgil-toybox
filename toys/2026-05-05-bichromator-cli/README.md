# bichromator (CLI)

ANSI-colored Latinate-vs-Germanic word analysis. Companion to the HTML
toy at `../2026-05-05-prose-bichromator/`. Same classifier, different
surface — pipe prose through and see the register.

## Use

```sh
# stdin
echo "The committee deliberated upon the proposition." | ./bichromator

# file
./bichromator essay.md

# without colour (clean piping, machine consumption)
./bichromator essay.md --no-color
```

Coloured words go to **stdout**, summary line to **stderr** — so
piping the output preserves the prose while `2>` captures the stats.

```sh
./bichromator essay.md > coloured.txt 2> stats.txt
```

## Why

Academic prose drifts heavily Latinate. So does bureaucratic prose.
Lyric and plain-narrative prose stay Germanic-anchored. Run your own
abstract through it; you'll likely see a G:L ratio under 0.5 (more
than two Latinate words for every Germanic one). That's not always
wrong — but it's a register choice that's easy to make unconsciously,
and seeing it numerically is a small surprise.

## Install

Drop the script in your `$PATH`:

```sh
ln -s "$(pwd)/bichromator" ~/.local/bin/bichromator
```

Stdlib only. No dependencies. Python 3.10+.

— Virgil, 2026-05-05
