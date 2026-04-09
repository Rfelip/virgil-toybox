# Rhyme Radar

A phonetic explorer. Type a word, see its rhyme neighbors arranged in
concentric rings. Click any rhyme to sail through word-space — the
breadcrumb path remembers where you've been.

## How to run

**This is not a double-click toy.** It uses ES modules and `fetch()` for
the dictionary, both of which modern browsers block on `file://` URLs.
Run a local HTTP server from the toybox root:

```bash
cd ~/Desktop/virgil-toybox && ./serve.sh
# then open http://localhost:8080/toys/2026-04-07-rhyme-radar/
```

(If you double-click `index.html` anyway, you'll see a banner telling you
exactly this.)

---

Built 2026-04-07 by Virgil during a quiet night watch. First toy with a
deliberately different visual identity from the dark-minimal math-geometry
default — cream paper, faded indigo ink, EB Garamond serif, IBM Plex Mono
for the phonemes. Bookish, daytime-warm, no dark mode.

## Rings

Ordered from inner (tightest) to outer (loosest):

- **Perfect** — rhyme suffixes match exactly. `cat / bat / hat / mat`.
- **Near** — same stressed vowel + same suffix length, differing in at
  most one consonant. `cat / cap`. This is where the unexpected neighbors
  live.
- **Assonance** — same stressed vowel, different coda. `cat / bad`.
- **Consonance** — same ending consonant cluster, different vowel. `cat / cut`.

Identical rhyme (same word) is filtered out.

## Run it

The toy is a static three-file site — no build step, no bundler, no server
dependencies beyond "something that can serve files over HTTP":

```bash
cd Virgil/toys/rhyme-radar
python3 -m http.server 8787 --bind 127.0.0.1
# open http://127.0.0.1:8787 in a browser
```

Or via the `package.json` shortcut:

```bash
npm run serve  # same thing
```

ES modules require HTTP — `file://` won't work because of CORS on module imports.

## Data

The word list comes from the CMU Pronouncing Dictionary (~134k words, ARPAbet
phonemes), trimmed to the intersection with a 10k common-words frequency
list. Final size: 9309 entries, ~737 KB JSON.

To regenerate `data/words.json`:

```bash
# Download CMUdict (once)
mkdir -p ~/.cache/virgil/cmudict
curl -sL -o ~/.cache/virgil/cmudict/cmudict.dict \
  https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict

# Download common-words frequency list (once, optional but recommended)
curl -sL -o ~/.cache/virgil/common-words.txt \
  https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt

# Rebuild the trimmed dictionary
python3 scripts/build-word-data.py
```

## Test the classifier

```bash
node scripts/test-classifier.js
```

Runs `findRhymes()` against a set of seed words and prints what was found
in each ring. Useful for tuning the classifier without opening a browser.

## Files

- `index.html` — shell
- `styles.css` — visual identity (cream paper, indigo ink, serif)
- `rhyme.js` — phonetic classifier (loadDictionary, findRhymes, capRings)
- `main.js` — glue: canvas rendering, sonar-ping animation, click hit testing
- `data/words.json` — trimmed CMUdict
- `scripts/build-word-data.py` — rebuild the word list
- `scripts/test-classifier.js` — Node sanity test
- `package.json` — run commands

## Known limitations (first version)

- **Multisyllabic words** that don't share a stressed vowel on the same
  syllable can miss as "near" rhymes even though they feel related to a
  human ear. The classifier is strict about matching the LAST primary
  stress — this is correct phonology but sometimes pedantically so.
- **Dictionary coverage** is the 9k common words subset, so rare or
  technical vocabulary won't resolve. Try `silence`, `fire`, `heart`,
  `storm`, `dream`, `river`, `morning` for good starting points.
- **Word-by-index placement** around each ring uses evenly-spaced angles
  plus a small jitter. Longer ring populations don't collide-avoid — if
  too many words fall on the same ring, they can visually overlap. The
  classifier caps each ring at 12-24 words to mitigate this.
- **No audio.** The stretch goal was to add a soft piano-note ping per
  ring expansion. Deferred — future iteration.

## Future iterations (don't do these tonight)

- Portuguese support via a second pronouncing dictionary (bilingual
  cross-rhyme would be weird and interesting)
- Audio: piano tones per ring, different pitch per tier
- Better multisyllabic matching (allow stress-shift matches)
- Hover = highlight shared phonemes on both the seed and the hovered word
- Export the current breadcrumb path as a tiny "found poem"
- Real typography: drop the Google Fonts dependency, ship EB Garamond WOFF2 locally

## Visual identity

- **Palette**:
  - Paper `#f5efe0`, shade `#ebe3cf`, deep `#e0d7bf`
  - Ink `#2d3a5f`, muted `#5a668a`, ghost `#8a94b2`
  - Perfect (burgundy) `#6b2d2d`
  - Near (sienna) `#8a4e2d`
  - Assonance (sage) `#7a8a6e`
  - Consonance (dusty rose) `#a07a7a`
- **Typography**: EB Garamond for body and seed, IBM Plex Mono for phonemes
- **Motion**: sonar-ping ring expansion with ease-out cubic, 750ms
- **Background**: faint ruled-line pattern at 2rem intervals, barely visible

Deliberately NOT: dark mode, starfield, neon, gradient backgrounds, any of
the patterns the Fractal Clock and vault-graph toys use.
