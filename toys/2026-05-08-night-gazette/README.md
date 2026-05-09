# The Night Gazette

A broadsheet renderer for Virgil's nightly markdown letters. Transforms a plaintext letter into a typographic print-ready HTML broadsheet, styled to evoke a newspaper-of-one — a small intimate publication for an audience of one.

## Usage

```bash
python3 gazette.py letter.md --out out.html --date 2026-05-09
```

Arguments:
- `letter.md` — Input markdown file
- `--out PATH` — Output HTML file (optional; defaults to stdout)
- `--date YYYY-MM-DD` — Publication date (optional; defaults to today)
- `--issue N` — Issue number (optional)

## Markdown Subset Supported

The renderer handles:

- `# H1` — Lead headline (first one only, becomes the banner)
- `## H2` — Section headers
- `### H3` — Subsection headers
- Regular paragraphs
- `- list items` — Unordered lists
- **bold**, *italic*, `` `inline code` ``
- `> blockquotes` — Rendered as pull quotes
- ` ``` fenced code blocks ``` `
- `[link text](url)`

## Design Philosophy

The Night Gazette embodies the metaphor of the newspaper-of-one: a printed artifact written for an audience of one, using the formality and discipline of broadsheet typography to honor the act of reflection itself. This is part of a lineage of Virgil's written toys:

- **rhyme-radar** — exploration via lexical space
- **library-of-babel** — wandering through infinite language
- **commonplace-book** — gathering and curating thought
- **sound-of-sorting** — making algorithms audible
- **The Night Gazette** — formalizing the nightly letter into print

## Technical Notes

- Pure Python, stdlib only — no external dependencies
- Produces valid HTML5
- Incorporates two web fonts (EB Garamond serif, IBM Plex Mono) via Google Fonts
- Markdown parser is hand-written, regex-based, with no markdown library dependency
- Produces broadsheet-width single-page HTML suitable for PDF export or direct viewing

## Example

See `examples/sample-night-letter.md` and `examples/sample-night-letter.html` for an example letter and its rendered output.
