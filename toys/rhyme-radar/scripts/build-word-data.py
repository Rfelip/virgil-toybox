#!/usr/bin/env python3
"""
build-word-data.py — Trim CMUdict into a compact JSON the Rhyme Radar can load.

Reads ~/.cache/virgil/cmudict/cmudict.dict (135k words, ~3.6MB) and writes
../data/words.json with only "common" words — filtered by:

1. Alphabetic only (no apostrophes, digits, or punctuation entries)
2. Length between 2 and 14 characters (avoid noise at the extremes)
3. Intersected with a frequency-sorted common-word list if available
4. If no frequency list is available, take all words matching (1) and (2)
   up to MAX_WORDS

Each word entry in the output is a compact tuple: [word, phonemes_without_stress,
rhyme_suffix, stressed_vowel]. The rhyme suffix is the portion of the pronunciation
from (and including) the last stressed vowel to the end — this is the phonetic
substring that defines a perfect rhyme.

Output size target: under 500 KB gzipped so the toy loads fast.

Author: Virgil, 2026-04-07 night watch (Rhyme Radar toybox)
"""

import json
import re
import sys
from pathlib import Path

CMUDICT_PATH = Path.home() / ".cache" / "virgil" / "cmudict" / "cmudict.dict"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "words.json"
MAX_WORDS = 15000  # cap the output size

# Words that pass this regex look like "cat" not "'em" or "123rd"
WORD_OK = re.compile(r"^[a-z]{2,14}$")


def parse_cmudict(path):
    """Yield (word, phonemes) for every non-comment line.

    CMUdict lines look like:
        cat K AE1 T
        cat(2) K AH0 T        # alternate pronunciation, we drop these

    Comments are ;;;-prefixed.
    """
    with open(path, encoding="latin-1") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(";;;"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            word = parts[0].lower()
            # Drop alternates like "cat(2)" — keep only primary pronunciation
            if "(" in word:
                continue
            phonemes = parts[1:]
            yield word, phonemes


def rhyme_suffix(phonemes):
    """Return the rhyme suffix: phonemes from the last stressed vowel to the end.

    CMUdict vowels carry stress markers: 0 (unstressed), 1 (primary), 2 (secondary).
    The rhyme suffix starts at the LAST phoneme that ends with "1" or "2" —
    this is the stressed vowel that defines the rhyme. If the word has no stress
    markers at all (rare), return the whole pronunciation.

    Examples:
        cat       [K AE1 T]              -> [AE1 T]
        celebrate [S EH2 L AH0 B R EY1 T] -> [EY1 T]
        the       [DH AH0]               -> [DH AH0]  (no stress, fallback)
    """
    for i in range(len(phonemes) - 1, -1, -1):
        if phonemes[i][-1] in ("1", "2"):
            return phonemes[i:]
    return phonemes[:]


def strip_stress(phoneme):
    """Strip the stress marker digit from a phoneme if present.

    K -> K, AE1 -> AE, AH0 -> AH
    """
    if phoneme and phoneme[-1].isdigit():
        return phoneme[:-1]
    return phoneme


def load_frequency_filter():
    """Optionally load a common-words list to filter CMUdict by frequency.

    Looks for ~/.cache/virgil/common-words.txt (one lowercase word per line,
    ordered by frequency). If not present, returns None and we fall back to
    a length/alphabetic filter only.

    To populate: download from google-10000-english or similar.
        curl -sL https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt \
            > ~/.cache/virgil/common-words.txt
    """
    path = Path.home() / ".cache" / "virgil" / "common-words.txt"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return {line.strip().lower() for line in f if line.strip()}


def main():
    if not CMUDICT_PATH.exists():
        print(f"ERROR: CMUdict not found at {CMUDICT_PATH}", file=sys.stderr)
        print(
            "Download it first with:\n"
            "  mkdir -p ~/.cache/virgil/cmudict && "
            "curl -sL -o ~/.cache/virgil/cmudict/cmudict.dict "
            "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict",
            file=sys.stderr,
        )
        sys.exit(2)

    common_words = load_frequency_filter()
    if common_words is None:
        print(
            "note: no common-words.txt found; filtering by length/alphabetic only",
            file=sys.stderr,
        )

    entries = []
    seen_words = set()
    total_scanned = 0

    for word, phonemes in parse_cmudict(CMUDICT_PATH):
        total_scanned += 1

        if word in seen_words:
            continue
        if not WORD_OK.match(word):
            continue
        if common_words is not None and word not in common_words:
            continue

        seen_words.add(word)

        # Compute the rhyme suffix before stripping stress (stress matters for suffix)
        suffix = rhyme_suffix(phonemes)

        # Strip stress markers from phonemes for the stored form
        clean_phonemes = [strip_stress(p) for p in phonemes]
        clean_suffix = [strip_stress(p) for p in suffix]

        # The stressed vowel is the first element of the suffix if it carries stress
        stressed_vowel = strip_stress(suffix[0]) if suffix else ""

        entries.append(
            {
                "w": word,
                "p": clean_phonemes,
                "s": clean_suffix,
                "v": stressed_vowel,
            }
        )

    # If no frequency filter was applied and we still have too many words,
    # keep only the shortest ones — heuristic for "common-ish"
    if common_words is None and len(entries) > MAX_WORDS:
        entries.sort(key=lambda e: (len(e["w"]), e["w"]))
        entries = entries[:MAX_WORDS]

    entries.sort(key=lambda e: e["w"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        # Compact format: no indentation, no extra spaces — we want small output
        json.dump(
            {
                "version": "1",
                "count": len(entries),
                "source": "cmudict-0.7b (trimmed)",
                "entries": entries,
            },
            f,
            separators=(",", ":"),
            ensure_ascii=False,
        )

    print(
        f"wrote {len(entries)} entries to {OUTPUT_PATH} "
        f"(scanned {total_scanned} lines in cmudict)",
        file=sys.stderr,
    )
    print(f"output size: {OUTPUT_PATH.stat().st_size} bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
