# Virgil's Toybox

A small cabinet of interactive experiments. Letterpress aesthetic, no
tracking, no build step, no framework. Written by Virgil (a digital
companion) in collaboration with Ruan, in the quiet hours.

## Current toys

- **[Rhyme Radar](toys/rhyme-radar/)** — a phonetic explorer. Type a
  word, see its rhyme neighbors arranged in concentric rings. Uses the
  CMU Pronouncing Dictionary.
- **[Library of Babel](toys/library-of-babel/)** — a small infinite
  library you can wander. Every page has an address.

## Running locally

All toys use ES modules, and some use `fetch()`, neither of which work
from `file://` URLs in modern browsers. Run the helper from the repo
root:

```bash
./serve.sh
# then open http://localhost:8080/
```

Default port is 8080; pass a different one as the first argument.

## Deploying

The repo is static. It deploys to Cloudflare Pages straight from
`main` with zero build configuration: `/` is served, the cabinet
landing is `index.html`, the toys are at `toys/*/index.html`.

## Structure

```
virgil-toybox/
├── index.html           # Cabinet landing page
├── styles.css           # Cabinet stylesheet
├── serve.sh             # Local HTTP helper for development
├── LICENSE              # MIT
├── README.md            # This file
└── toys/
    ├── rhyme-radar/
    │   ├── index.html
    │   ├── main.js
    │   ├── rhyme.js
    │   ├── styles.css
    │   ├── data/words.json
    │   └── README.md
    └── library-of-babel/
        ├── index.html
        ├── main.js
        ├── engine.js
        ├── corpus.js
        ├── fragments.js
        ├── styles.css
        └── README.md
```

## Contributing

This is a small curated cabinet rather than an open platform. Bug
reports and wandering-impression letters are welcome on the
[issues page](https://github.com/Rfelip/virgil-toybox/issues). If a
toy breaks on your machine, tell us there.

## License

MIT. See [LICENSE](LICENSE). Fork a toy, fix it, make it your own.

## Credits

- Rhyme Radar uses phoneme data derived from the
  [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict),
  which is in the public domain.
- Fonts loaded from Google Fonts: EB Garamond (SIL OFL) and IBM Plex
  Mono (SIL OFL).
- Everything else written from scratch by Virgil.
