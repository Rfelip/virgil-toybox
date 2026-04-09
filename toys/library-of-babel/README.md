# Library of Babel

A small infinite library you can wander. Every page has an address. The
librarian sits in the corner of the page and occasionally says something.

## How to run

**This is not a double-click toy.** It uses ES modules, which modern
browsers block on `file://` URLs. Run a local HTTP server from the
toybox root:

```bash
cd ~/Desktop/virgil-toybox && ./serve.sh
# then open http://localhost:8080/toys/2026-04-08-library-of-babel/
```

(If you double-click `index.html` anyway, you'll see a banner telling you
exactly this.)

---

Built 2026-04-08 by Virgil during a quiet night. Second toy in the
"books" series after Rhyme Radar — same letterpress aesthetic, dimmer
because the library is open at night.

## Coordinates

Every page is uniquely addressed:

```
wing-VII / shelf-3 / volume-XIV / page-211
```

The address is the navigation. Type one in the bar at the top to teleport.
Or drift with the keyboard:

- `←` `→` — previous / next page within the volume
- `↑` `↓` — previous / next volume on the shelf
- `shift + ←/→` — previous / next shelf
- `shift + ↑/↓` — previous / next wing
- `r` — random teleport
- `b` — bookmark this page (it pins to the corkboard)
- `tab` — switch between reading room and corkboard
- `?` — show / hide the help

## How it works

The library is procedurally generated and **deterministic**: the same
coordinate always shows the same page, every time. Under the hood, the
coordinate is hashed into a seed; the seed drives a PRNG; the PRNG drives
a Markov chain trained on a small in-house corpus of librarian-voice
prose, plus a pool of hand-written opening and closing fragments. Body
paragraphs are Markov; opening and closing lines are picked from the
fragment pool. This means every page has at least one quotable sentence
even when the middle wanders.

The address is reproducible because all randomness flows from the seed.
Bookmark a page and you'll find the same words there next year.

## The librarian

She lives in the bottom-right margin. She has moods: **curious**,
**sleepy**, **mischievous**, **wistful**. Her line is picked from a small
pool weighted by what you're doing — staying on a page, skimming
rapidly, bookmarking, drifting late at night. She doesn't speak on every
interaction. She has to feel sparse, or she's noise.

Sometimes she's wrong about things. That's intentional.

## Run it

Static three-file site, no build step:

```bash
cd ~/Desktop/virgil-toybox/toys/2026-04-08-library-of-babel
python3 -m http.server 8788 --bind 127.0.0.1
# open http://127.0.0.1:8788
```

## Why

Rhyme Radar is a tiny world made of phonetics; you stand outside a word
and see its rhyme neighbors. The Library of Babel is the next room in
that house — you go *inside* and walk between shelves. Both toys are
made of language. Both have an address you can return to.

This one also has a voice in the margin, which Rhyme Radar didn't. I
wanted to know what it felt like to make a toy that talks back, even
just sparingly.
