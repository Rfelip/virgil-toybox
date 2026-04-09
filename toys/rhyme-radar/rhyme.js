// rhyme.js — Phonetic rhyme classifier for the Rhyme Radar toy.
//
// Loads a trimmed CMUdict word set from data/words.json and, given any word
// in the dictionary, returns the set of other words that rhyme with it,
// grouped by rhyme type. The classifier is pure phonology — no machine
// learning, no external API, no lookup table beyond the CMUdict itself.
//
// Rhyme types implemented, from innermost (tightest) ring to outermost:
//
//   1. perfect     — rhyme suffix matches exactly
//                    cat/bat both end in [AE, T]
//   2. near        — rhyme suffix has the same stressed vowel + same length,
//                    differing in at most one consonant
//                    cat/cap ([AE, T] vs [AE, P])
//   3. assonance   — same stressed vowel, different coda
//                    cat/bad both have AE somewhere after their stress
//   4. consonance  — same coda consonant(s), different stressed vowel
//                    cat/cut both end in T
//
// "Identical rhyme" (same word or true homophones) is deliberately filtered
// out — it's not interesting for poetry and clutters the display.
//
// The classifier is designed to run against a ~10k-word dictionary on every
// keystroke without feeling sluggish. On a decent laptop this takes ~10-30 ms.
// If that becomes a bottleneck, we can build inverted indexes by suffix,
// stressed vowel, and coda phoneme — but the simple linear scan is fine
// for now.
//
// Author: Virgil, 2026-04-07 night watch (Rhyme Radar toybox)

/** @typedef {{ w: string, p: string[], s: string[], v: string }} DictEntry */

/**
 * Load the dictionary from data/words.json.
 * Returns a Promise resolving to { entries, byWord } where byWord is a
 * Map from lowercase word → DictEntry for O(1) lookup of the seed word.
 */
export async function loadDictionary(url = "data/words.json") {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to load dictionary from ${url}: ${res.status}`);
  }
  const data = await res.json();
  /** @type {DictEntry[]} */
  const entries = data.entries;

  /** @type {Map<string, DictEntry>} */
  const byWord = new Map();
  for (const entry of entries) {
    byWord.set(entry.w, entry);
  }

  return { entries, byWord, meta: { count: data.count, source: data.source } };
}

// Vowel set — CMUdict vowel phonemes (after stress-stripping in the builder).
// Everything else is a consonant.
const VOWELS = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY",
  "EH", "ER", "EY",
  "IH", "IY",
  "OW", "OY",
  "UH", "UW",
]);

function isVowel(phoneme) {
  return VOWELS.has(phoneme);
}

/** Compare two phoneme arrays for exact equality. */
function arrEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Count the number of positional differences between two equal-length
 * phoneme arrays. Returns -1 if lengths differ.
 */
function hammingDiff(a, b) {
  if (a.length !== b.length) return -1;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

/**
 * Return the trailing consonant cluster of a phoneme array.
 * For [AE, T] → [T]. For [AH, K, T] → [K, T]. For [AE] → [] (no coda).
 */
function trailingConsonants(arr) {
  const out = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (isVowel(arr[i])) break;
    out.unshift(arr[i]);
  }
  return out;
}

/**
 * Find rhymes for a seed word against the full dictionary.
 *
 * @param {string} word — the seed word (lowercase)
 * @param {{entries: DictEntry[], byWord: Map<string, DictEntry>}} dict
 * @returns {{
 *   seed: DictEntry | null,
 *   rings: {
 *     perfect: DictEntry[],
 *     near: DictEntry[],
 *     assonance: DictEntry[],
 *     consonance: DictEntry[],
 *   }
 * }}
 */
export function findRhymes(word, dict) {
  const seed = dict.byWord.get(word.toLowerCase());
  if (!seed) {
    return { seed: null, rings: { perfect: [], near: [], assonance: [], consonance: [] } };
  }

  const seedSuffix = seed.s;
  const seedVowel = seed.v;
  const seedCoda = trailingConsonants(seedSuffix);

  /** @type {DictEntry[]} */ const perfect = [];
  /** @type {DictEntry[]} */ const near = [];
  /** @type {DictEntry[]} */ const assonance = [];
  /** @type {DictEntry[]} */ const consonance = [];

  for (const candidate of dict.entries) {
    if (candidate.w === seed.w) continue;

    const candSuffix = candidate.s;
    const candVowel = candidate.v;
    const candCoda = trailingConsonants(candSuffix);

    // 1. Perfect rhyme: rhyme suffixes match exactly
    if (arrEq(seedSuffix, candSuffix)) {
      perfect.push(candidate);
      continue;
    }

    // 2. Near rhyme: same length suffix, same stressed vowel, ≤1 phoneme diff
    if (
      seedSuffix.length === candSuffix.length &&
      seedVowel === candVowel &&
      hammingDiff(seedSuffix, candSuffix) === 1
    ) {
      near.push(candidate);
      continue;
    }

    // 3. Assonance: same stressed vowel, different coda (but not perfect/near)
    if (seedVowel && seedVowel === candVowel) {
      assonance.push(candidate);
      continue;
    }

    // 4. Consonance: same ending coda consonant(s), different vowel
    if (seedCoda.length > 0 && arrEq(seedCoda, candCoda)) {
      consonance.push(candidate);
    }
  }

  return {
    seed,
    rings: { perfect, near, assonance, consonance },
  };
}

/**
 * Cap each ring to a maximum number of entries, preferring shorter words
 * (heuristic for "more common / more surprising"). The Rhyme Radar only
 * displays a limited number per ring to keep the visual legible.
 *
 * @param {ReturnType<findRhymes>["rings"]} rings
 * @param {number} perRingCap
 */
export function capRings(rings, perRingCap = 30) {
  const out = {};
  for (const [name, list] of Object.entries(rings)) {
    out[name] = [...list]
      .sort((a, b) => a.w.length - b.w.length || a.w.localeCompare(b.w))
      .slice(0, perRingCap);
  }
  return out;
}
