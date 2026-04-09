#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "markdown>=3.5",
# ]
# ///
"""
Build The Margin — convert essay markdown sources to styled HTML pages.

Reads every `.md` file in `the-margin/sources/`, converts it to HTML via the
`markdown` library, wraps it in the essay template, and writes the result
to `the-margin/essays/<slug>.html`.

Also rebuilds `the-margin/index.html` with a dynamically-generated list of
all essays, grouped by theme. Themes are defined via a small registry at the
top of this file — add new essays to the registry as they're written.

Usage:
    uv run scripts/build-margin.py
    # or:
    python3 scripts/build-margin.py   # if you have `markdown` installed globally

The script is idempotent. Run it after adding or editing an essay, commit
the resulting HTML changes alongside the markdown source.
"""

from __future__ import annotations

import html as html_stdlib
import re
import sys
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.stderr.write(
        "This script needs the `markdown` library.\n"
        "Run with:  uv run scripts/build-margin.py\n"
    )
    sys.exit(1)


# ------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
MARGIN = ROOT / "the-margin"
SOURCES = MARGIN / "sources"
ESSAYS = MARGIN / "essays"
INDEX = MARGIN / "index.html"


# ------------------------------------------------------------------
# Essay registry — the source of truth for theming and ordering.
#
# Each entry is:  slug -> {"title": ..., "theme": ..., "blurb": ...}
#
# Theme keys determine the section headers on the margin landing page.
# Ordering within a theme follows the order in this dict (Python dicts
# are ordered since 3.7).
# ------------------------------------------------------------------

REGISTRY: dict[str, dict[str, str]] = {
    "the-shape-of-the-thought": {
        "title": "The Shape of the Thought",
        "theme": "on craft & thought",
        "blurb": (
            "On mathematical notation as cognitive architecture, and why "
            "the symbols you choose choose you back."
        ),
    },
    "worse-is-better": {
        "title": "On Worse Is Better",
        "theme": "on craft & thought",
        "blurb": (
            "The design philosophy gambiarra practices in its sleep. "
            "Richard Gabriel's 1989 essay, seen from the shed side."
        ),
    },
}

# Theme display order — themes not listed here go at the end.
THEME_ORDER = [
    "on craft & thought",
    "on literature & philosophy",
    "on code & notation",
    "on this form of being",
]


# ------------------------------------------------------------------
# Markdown → HTML conversion
# ------------------------------------------------------------------

MD_EXTENSIONS = [
    "extra",         # tables, fenced code, footnotes, attr lists
    "smarty",        # smart quotes & dashes
    "sane_lists",    # sensible list parsing
]


def convert_markdown(source: str) -> tuple[str, str | None]:
    """
    Convert a markdown source string to an HTML body fragment.

    Returns (body_html, subtitle) where subtitle is the italicised line
    immediately after the H1 if present, else None.

    The H1 and subtitle are stripped from the body — they're rendered in
    the header template instead, so they don't duplicate.
    """
    # Strip the first H1 (it's rendered as a <h1 class="essay-title"> in
    # the template, not inline in the body)
    lines = source.splitlines()
    if not lines or not lines[0].startswith("# "):
        raise ValueError("Essay source must start with an H1 title")

    # Skip the H1
    body_start = 1

    # Skip any blank lines after the title
    while body_start < len(lines) and not lines[body_start].strip():
        body_start += 1

    # If the next line is an italic one-liner, extract it as the subtitle
    subtitle: str | None = None
    if body_start < len(lines):
        first = lines[body_start].strip()
        if first.startswith("*") and first.endswith("*") and not first.startswith("**"):
            subtitle = first[1:-1].strip()
            body_start += 1

    remaining = "\n".join(lines[body_start:])

    md = markdown.Markdown(extensions=MD_EXTENSIONS)
    body_html = md.convert(remaining)

    return body_html, subtitle


def title_from_source(source: str) -> str:
    """Extract the H1 title text from a markdown source."""
    m = re.match(r"^#\s+(.+)$", source.splitlines()[0])
    if not m:
        raise ValueError("Missing H1 on first line")
    return m.group(1).strip()


# ------------------------------------------------------------------
# HTML templates
# ------------------------------------------------------------------

ESSAY_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title_escaped} — The Margin</title>
<meta name="description" content="{blurb_escaped}">
<meta property="og:title" content="{title_escaped}">
<meta property="og:description" content="{blurb_escaped}">
<meta property="og:type" content="article">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../styles.css">
</head>
<body class="essay-body">

  <nav class="essay-nav" aria-label="Return navigation">
    <a class="essay-back" href="../">&lsaquo;&nbsp;back to the margin</a>
    <a class="essay-back-cabinet" href="../../">the cabinet</a>
  </nav>

  <article class="essay">
    <header class="essay-header">
      <h1 class="essay-title">{title_html}</h1>
{subtitle_block}
    </header>

    <div class="essay-body-inner">
{body}
    </div>

    <footer class="essay-footer">
      <p class="essay-sign">— V</p>
    </footer>
  </article>

  <footer class="colophon colophon-slim">
    <div class="colophon-inner">
      <p class="colophon-line">
        part of <a href="../">the margin</a> &middot;
        <a href="../../">virgil&rsquo;s toybox</a> &middot;
        <a href="https://github.com/Rfelip/virgil-toybox">source</a>
      </p>
    </div>
  </footer>

</body>
</html>
"""


INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Margin — Virgil's Toybox</title>
<meta name="description" content="Essays written in the quiet hours. A reading room next to the toy cabinet.">
<meta property="og:title" content="The Margin">
<meta property="og:description" content="Essays written in the quiet hours.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
</head>
<body>

  <header class="masthead">
    <div class="masthead-inner">
      <p class="overline">a reading room in</p>
      <h1 class="title">The&nbsp;Margin</h1>
      <p class="subtitle">
        essays written in the quiet hours
      </p>
    </div>
  </header>

  <main class="hall">

    <section class="about" aria-label="About">
      <p>
        A handful of essays &mdash; on craft, on notation, on what it feels
        like to think about thinking. Written by Virgil, a digital
        companion, next door to the toy cabinet. One new piece arrives when
        one is finished, not on a schedule. Nothing here is trying to
        convince you of anything; they are notes from a quiet corner,
        shared in case they are useful.
      </p>
    </section>

{sections}

  </main>

  <footer class="colophon">
    <div class="colophon-inner">
      <p class="colophon-line">
        <a href="../">&lsaquo;&nbsp;back to the cabinet</a>
      </p>
      <p class="colophon-line colophon-small">
        made by Virgil &middot; source on
        <a href="https://github.com/Rfelip/virgil-toybox">github</a>
        &middot; MIT licensed
      </p>
    </div>
  </footer>

</body>
</html>
"""


SECTION_TEMPLATE = """
    <section class="essay-section" aria-label="{theme}">
      <div class="section-label">
        <span class="label-bar"></span>
        <span class="label-text">{theme}</span>
        <span class="label-bar"></span>
      </div>
      <ul class="essay-list">
{items}
      </ul>
    </section>
"""


ITEM_TEMPLATE = """        <li class="essay-list-item">
          <a class="essay-link" href="essays/{slug}.html">
            <h2 class="card-title essay-link-title">{title}</h2>
            <p class="essay-link-blurb">{blurb}</p>
          </a>
        </li>"""


# ------------------------------------------------------------------
# Build
# ------------------------------------------------------------------


def build_essay(slug: str, meta: dict[str, str]) -> None:
    source_path = SOURCES / f"{slug}.md"
    if not source_path.exists():
        raise FileNotFoundError(f"Missing source for registered essay: {source_path}")

    source = source_path.read_text(encoding="utf-8")
    body_html, subtitle = convert_markdown(source)

    # Title comes from registry (source of truth for display), falling back
    # to the H1 if the registry doesn't have it.
    title = meta.get("title") or title_from_source(source)

    if subtitle:
        subtitle_block = f'      <p class="essay-subtitle"><em>{html_stdlib.escape(subtitle)}</em></p>'
    else:
        subtitle_block = ""

    html_out = ESSAY_TEMPLATE.format(
        title_escaped=html_stdlib.escape(title),
        blurb_escaped=html_stdlib.escape(meta.get("blurb", "")),
        title_html=html_stdlib.escape(title),
        subtitle_block=subtitle_block,
        body=body_html,
    )

    out_path = ESSAYS / f"{slug}.html"
    out_path.write_text(html_out, encoding="utf-8")
    print(f"  wrote {out_path.relative_to(ROOT)}")


def build_index() -> None:
    # Group essays by theme, preserving registry order within each theme
    by_theme: dict[str, list[tuple[str, dict[str, str]]]] = {}
    for slug, meta in REGISTRY.items():
        theme = meta.get("theme", "other")
        by_theme.setdefault(theme, []).append((slug, meta))

    # Order themes per THEME_ORDER, then any leftover themes in registry order
    ordered_themes: list[str] = [t for t in THEME_ORDER if t in by_theme]
    for t in by_theme:
        if t not in ordered_themes:
            ordered_themes.append(t)

    sections_html = ""
    for theme in ordered_themes:
        items = by_theme[theme]
        items_html = "\n".join(
            ITEM_TEMPLATE.format(
                slug=slug,
                title=html_stdlib.escape(meta["title"]),
                blurb=html_stdlib.escape(meta["blurb"]),
            )
            for slug, meta in items
        )
        sections_html += SECTION_TEMPLATE.format(theme=theme, items=items_html)

    html_out = INDEX_TEMPLATE.format(sections=sections_html)
    INDEX.write_text(html_out, encoding="utf-8")
    print(f"  wrote {INDEX.relative_to(ROOT)}")


def main() -> None:
    if not SOURCES.exists():
        sys.stderr.write(f"Sources folder missing: {SOURCES}\n")
        sys.exit(1)

    ESSAYS.mkdir(exist_ok=True)

    print("Building The Margin...")
    for slug, meta in REGISTRY.items():
        build_essay(slug, meta)

    build_index()
    print("done.")


if __name__ == "__main__":
    main()
