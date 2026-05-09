#!/usr/bin/env python3
"""
gazette.py — The Night Gazette
Renders a Virgil night-letter markdown file as a broadsheet HTML.

Usage:
    python3 gazette.py path/to/letter.md [--out path/to/out.html] [--date YYYY-MM-DD] [--issue N]

Supported markdown subset:
    # H1  — lead headline (first one only)
    ## H2 — section headers (become column sections)
    ### H3 — subsection headers
    Paragraphs
    - list items
    **bold**, *italic*, `inline code`
    > blockquote (rendered as pull quote)
    ```fenced code blocks```
    [link text](url)
"""

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime, date
from pathlib import Path

# ---------------------------------------------------------------------------
# Weekday/month tables for PT-BR dateline
# ---------------------------------------------------------------------------

PT_WEEKDAYS = [
    "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado", "domingo"
]

EN_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

PT_MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

CITY = "Rio de Janeiro"


# ---------------------------------------------------------------------------
# Markdown parser (stdlib only)
# ---------------------------------------------------------------------------

def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    return text


def inline_md(text: str) -> str:
    """Convert inline markdown to HTML: bold, italic, code, links."""
    # Escape HTML first (before adding real tags)
    text = escape_html(text)
    # **bold** (do before *italic* to avoid conflicts)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # *italic*
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # `inline code`
    text = re.sub(r'`([^`]+)`', r'<code class="gazette-code-inline">\1</code>', text)
    # [link text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text


class Token:
    """A parsed block token."""
    __slots__ = ('kind', 'level', 'text', 'items', 'lang')

    def __init__(self, kind, text='', level=0, items=None, lang=''):
        self.kind = kind    # h1|h2|h3|p|blockquote|list|fenced_code|hr|blank
        self.text = text
        self.level = level
        self.items = items or []
        self.lang = lang


def tokenize(source: str) -> list:
    """
    Parse markdown source into a flat list of Token objects.
    Handles fenced code blocks first (multi-line), then line-by-line.
    """
    tokens = []
    lines = source.splitlines()
    i = 0
    in_list = False
    list_items = []

    def flush_list():
        nonlocal in_list, list_items
        if in_list and list_items:
            tokens.append(Token('list', items=list(list_items)))
        in_list = False
        list_items = []

    while i < len(lines):
        line = lines[i]

        # Fenced code block
        if re.match(r'^```', line):
            flush_list()
            lang = line[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not re.match(r'^```', lines[i]):
                code_lines.append(lines[i])
                i += 1
            tokens.append(Token('fenced_code', text='\n'.join(code_lines), lang=lang))
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^(-{3,}|\*{3,}|_{3,})\s*$', line):
            flush_list()
            tokens.append(Token('hr'))
            i += 1
            continue

        # Blockquote
        if line.startswith('>'):
            flush_list()
            # collect multi-line blockquote
            bq_lines = []
            while i < len(lines) and lines[i].startswith('>'):
                bq_lines.append(lines[i][1:].lstrip())
                i += 1
            tokens.append(Token('blockquote', text='\n'.join(bq_lines)))
            continue

        # Headers
        m = re.match(r'^(#{1,6})\s+(.*)', line)
        if m:
            flush_list()
            level = len(m.group(1))
            text = m.group(2).strip()
            if level == 1:
                tokens.append(Token('h1', text=text, level=1))
            elif level == 2:
                tokens.append(Token('h2', text=text, level=2))
            elif level == 3:
                tokens.append(Token('h3', text=text, level=3))
            else:
                tokens.append(Token('p', text=text))
            i += 1
            continue

        # YAML frontmatter (skip)
        if i == 0 and line.strip() == '---':
            i += 1
            while i < len(lines) and lines[i].strip() != '---':
                i += 1
            i += 1
            continue

        # List item
        m = re.match(r'^[-*+]\s+(.*)', line)
        if m:
            in_list = True
            list_items.append(m.group(1))
            i += 1
            continue

        # Blank line
        if not line.strip():
            flush_list()
            tokens.append(Token('blank'))
            i += 1
            continue

        # Paragraph
        flush_list()
        # Collect continuation lines
        para_lines = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r'^(#{1,6}\s|[-*+]\s|>|```|---)', lines[i]):
            para_lines.append(lines[i])
            i += 1
        tokens.append(Token('p', text=' '.join(para_lines)))

    flush_list()
    return tokens


def render_blockquote(text: str) -> str:
    """Render blockquote text as a pull-quote block. Handles multi-para."""
    parts = [p.strip() for p in text.split('\n\n') if p.strip()]
    inner = ''.join(f'<p>{inline_md(p)}</p>' for p in parts)
    return f'<blockquote class="gazette-pull-quote">{inner}</blockquote>\n'


def render_token(token: Token) -> str:
    """Render a single token to HTML. Does NOT handle h1/h2 (caller does)."""
    if token.kind == 'h3':
        return f'<h3 class="gazette-subsection-header">{inline_md(token.text)}</h3>\n'
    elif token.kind == 'p':
        return f'<p class="gazette-body-text">{inline_md(token.text)}</p>\n'
    elif token.kind == 'blockquote':
        return render_blockquote(token.text)
    elif token.kind == 'list':
        items_html = ''.join(f'<li>{inline_md(item)}</li>\n' for item in token.items)
        return f'<ul class="gazette-list">\n{items_html}</ul>\n'
    elif token.kind == 'fenced_code':
        escaped = escape_html(token.text)
        lang_class = f' class="language-{token.lang}"' if token.lang else ''
        return f'<pre class="gazette-code-block"><code{lang_class}>{escaped}</code></pre>\n'
    elif token.kind == 'hr':
        return '<hr class="gazette-lead-rule">\n'
    elif token.kind in ('blank', None):
        return ''
    return ''


# ---------------------------------------------------------------------------
# Document structure: split tokens into lead + sections
# ---------------------------------------------------------------------------

def split_document(tokens: list) -> tuple:
    """
    Returns (lead_headline, lead_tokens, sections)
    where sections = list of (section_title, [tokens])
    """
    # Find first H1
    lead_headline = None
    start = 0
    for i, tok in enumerate(tokens):
        if tok.kind == 'h1':
            lead_headline = tok.text
            start = i + 1
            break

    if lead_headline is None:
        # No H1: treat everything as lead
        return ('Night Letter', tokens, [])

    # Split on H2
    lead_tokens = []
    sections = []
    current_section = None
    FOLD_PARA_COUNT = 3  # number of paragraphs before fold

    para_count = 0
    fold_inserted = False
    for tok in tokens[start:]:
        if tok.kind == 'h2':
            if current_section is not None:
                sections.append(current_section)
            current_section = (tok.text, [])
        elif current_section is not None:
            current_section[1].append(tok)
        else:
            lead_tokens.append(tok)
            if tok.kind == 'p':
                para_count += 1

    if current_section is not None:
        sections.append(current_section)

    return (lead_headline, lead_tokens, sections)


def render_lead(tokens: list, fold_after: int = 3) -> tuple:
    """
    Renders lead tokens to HTML.
    Returns (lead_html, remaining_tokens_for_fold_hint)
    The fold is placed after `fold_after` paragraphs.
    """
    html_parts = []
    para_count = 0

    for tok in tokens:
        html_parts.append(render_token(tok))
        if tok.kind == 'p':
            para_count += 1

    return ''.join(html_parts)


def render_sections(sections: list) -> str:
    """Render H2 sections as column content."""
    html = ''
    for title, tokens in sections:
        section_html = f'<h2 class="gazette-section-header">{escape_html(title)}</h2>\n'
        for tok in tokens:
            section_html += render_token(tok)
        html += section_html
    return html


# ---------------------------------------------------------------------------
# Dateline builder
# ---------------------------------------------------------------------------

def build_dateline(date_obj: date) -> str:
    """Rio de Janeiro · sábado, 9 de maio de 2026 · May 2026"""
    weekday_pt = PT_WEEKDAYS[date_obj.weekday()]
    day = date_obj.day
    month_pt = PT_MONTHS[date_obj.month - 1]
    year = date_obj.year
    month_en = EN_MONTHS[date_obj.month - 1]
    return (
        f"{CITY} &middot; {weekday_pt}, {day} de {month_pt} de {year}"
        f" &middot; {month_en} {year}"
    )


# ---------------------------------------------------------------------------
# Git SHA helper
# ---------------------------------------------------------------------------

def get_git_sha() -> str:
    """Get short git SHA of the repo, or 'unknown'."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True, text=True, timeout=5,
            cwd=Path(__file__).parent
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return 'unknown'


# ---------------------------------------------------------------------------
# CSS embedder
# ---------------------------------------------------------------------------

def load_css() -> str:
    """Load gazette.css from the same directory as this script."""
    css_path = Path(__file__).parent / 'gazette.css'
    if css_path.exists():
        return css_path.read_text(encoding='utf-8')
    return ''  # fallback: empty (linked externally)


def load_template() -> str:
    """Load template.html from same directory."""
    tmpl_path = Path(__file__).parent / 'template.html'
    if tmpl_path.exists():
        return tmpl_path.read_text(encoding='utf-8')
    raise FileNotFoundError("template.html not found next to gazette.py")


# ---------------------------------------------------------------------------
# Main render function
# ---------------------------------------------------------------------------

def render(source: str, date_obj: date, issue: int) -> str:
    """Convert markdown source to full broadsheet HTML string."""
    tokens = tokenize(source)
    lead_headline, lead_tokens, sections = split_document(tokens)

    # Lead HTML
    lead_html = render_lead(lead_tokens)
    # Body sections HTML
    body_html = render_sections(sections)

    # Dateline
    dateline = build_dateline(date_obj)

    # Issue line
    issue_line = f"Virgil&rsquo;s Night Gazette &middot; Vol.&nbsp;I, Issue&nbsp;{issue}"

    # Kicker (caps, sans)
    kicker = "VIRGIL'S NIGHT GAZETTE"

    # Render time
    render_time = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Git SHA
    git_sha = get_git_sha()

    # Embedded CSS
    embedded_css = load_css()

    # Fill template
    template = load_template()
    html = template
    html = html.replace('{{title}}', escape_html(lead_headline))
    html = html.replace('{{kicker}}', kicker)
    html = html.replace('{{dateline}}', dateline)
    html = html.replace('{{issue_line}}', issue_line)
    html = html.replace('{{render_date}}', f"rendered {render_time}")
    html = html.replace('{{lead_headline}}', inline_md(lead_headline))
    html = html.replace('{{lead_body}}', lead_html)
    html = html.replace('{{body_sections}}', body_html)
    html = html.replace('{{git_sha}}', escape_html(git_sha))
    html = html.replace('{{render_time}}', escape_html(render_time))
    html = html.replace('{{embedded_css}}', embedded_css)

    return html


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='The Night Gazette — render a markdown night letter as broadsheet HTML.'
    )
    parser.add_argument('input', help='Path to the markdown night letter')
    parser.add_argument('--out', '-o', help='Output HTML path (default: same as input with .html)')
    parser.add_argument('--date', help='Date override YYYY-MM-DD (default: from filename or today)')
    parser.add_argument('--issue', '-n', type=int, default=1,
                        help='Issue number (default: 1)')
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    if args.out:
        output_path = Path(args.out)
    else:
        output_path = input_path.with_suffix('.html')

    # Determine date
    if args.date:
        try:
            date_obj = date.fromisoformat(args.date)
        except ValueError:
            print(f"Error: --date must be YYYY-MM-DD, got '{args.date}'", file=sys.stderr)
            sys.exit(1)
    else:
        # Try to extract from filename: virgil-YYYY-MM-DD.md
        m = re.search(r'(\d{4}-\d{2}-\d{2})', input_path.name)
        if m:
            try:
                date_obj = date.fromisoformat(m.group(1))
            except ValueError:
                date_obj = date.today()
        else:
            date_obj = date.today()

    source = input_path.read_text(encoding='utf-8')
    html = render(source, date_obj, args.issue)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding='utf-8')
    print(f"Gazette rendered → {output_path}")


if __name__ == '__main__':
    main()
