// Library of Babel — pure engine.
// Deterministic page generator with no DOM dependencies.
// Imported by main.js (in the browser) and by tests (in node).

import {
  TITLES, SUBTITLES, OPENINGS, CODAS, EPIGRAPHS,
  ROMAN, FROM_ROMAN,
} from "./fragments.js";
import { CORPUS } from "./corpus.js";

// =====================================================================
// PRNG — deterministic from a coordinate string.
// =====================================================================

export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function seededRng(coord) {
  const seed = cyrb53(coord) >>> 0;
  const rng = mulberry32(seed);
  return {
    next: rng,
    int: (n) => Math.floor(rng() * n),
    pick: (arr) => arr[Math.floor(rng() * arr.length)],
    chance: (p) => rng() < p,
  };
}

// =====================================================================
// Coordinates
// =====================================================================

export const BOUNDS = {
  wing:   { min: 1, max: 1000 },
  shelf:  { min: 1, max: 40 },
  volume: { min: 1, max: 100 },
  page:   { min: 1, max: 512 },
};

function clamp(v, { min, max }) {
  if (v < min) return max;
  if (v > max) return min;
  return v;
}

export function formatCoord(c) {
  return `wing-${ROMAN(c.wing)} / shelf-${c.shelf} / volume-${ROMAN(c.volume)} / page-${c.page}`;
}

const COORD_RE = /wing[-\s]*([IVXLCDM]+|\d+)\s*[/.\\]\s*shelf[-\s]*(\d+)\s*[/.\\]\s*volume[-\s]*([IVXLCDM]+|\d+)\s*[/.\\]\s*page[-\s]*(\d+)/i;

export function parseCoord(s) {
  const m = COORD_RE.exec(s.trim());
  if (!m) return null;
  const num = (x) => /^\d+$/.test(x) ? parseInt(x, 10) : FROM_ROMAN(x);
  const c = {
    wing:   num(m[1]),
    shelf:  parseInt(m[2], 10),
    volume: num(m[3]),
    page:   parseInt(m[4], 10),
  };
  for (const k of ["wing", "shelf", "volume", "page"]) {
    if (!Number.isFinite(c[k])) return null;
    if (c[k] < BOUNDS[k].min || c[k] > BOUNDS[k].max) return null;
  }
  return c;
}

export function neighbor(c, axis, delta) {
  const out = { ...c };
  out[axis] = clamp(out[axis] + delta, BOUNDS[axis]);
  return out;
}

export function randomCoord(rng = Math.random) {
  return {
    wing:   1 + Math.floor(rng() * BOUNDS.wing.max),
    shelf:  1 + Math.floor(rng() * BOUNDS.shelf.max),
    volume: 1 + Math.floor(rng() * BOUNDS.volume.max),
    page:   1 + Math.floor(rng() * BOUNDS.page.max),
  };
}

// =====================================================================
// Markov chain (order 2)
// =====================================================================

const SENT_END = /[.!?]$/;

function tokenize(text) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

export function buildChain(corpus) {
  const tokens = tokenize(corpus);
  const chain = new Map();
  const starts = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2];
    const key = a + "\u0001" + b;
    let bag = chain.get(key);
    if (!bag) { bag = []; chain.set(key, bag); }
    bag.push(c);
    if (i === 0 || SENT_END.test(tokens[i - 1])) {
      if (/^[A-Z]/.test(a)) starts.push([a, b]);
    }
  }
  return { chain, starts, tokens };
}

function generateSentence(chainObj, rng, maxTokens = 60) {
  const start = chainObj.starts[rng.int(chainObj.starts.length)];
  const out = [start[0], start[1]];
  let a = start[0], b = start[1];
  for (let i = 0; i < maxTokens; i++) {
    const bag = chainObj.chain.get(a + "\u0001" + b);
    if (!bag) break;
    const next = bag[rng.int(bag.length)];
    out.push(next);
    if (SENT_END.test(next)) break;
    a = b; b = next;
  }
  if (!SENT_END.test(out[out.length - 1])) {
    out[out.length - 1] = out[out.length - 1] + ".";
  }
  return out.join(" ");
}

function generateParagraph(chainObj, rng, sentenceCount) {
  const out = [];
  for (let i = 0; i < sentenceCount; i++) {
    out.push(generateSentence(chainObj, rng));
  }
  return out.join(" ");
}

// =====================================================================
// Page generator
// =====================================================================

export const CHAIN = buildChain(CORPUS);

export function generatePage(coord) {
  const coordStr = formatCoord(coord);
  const rng = seededRng(coordStr);

  const title    = rng.pick(TITLES);
  const subtitle = rng.chance(0.7) ? rng.pick(SUBTITLES) : null;
  const opening  = rng.pick(OPENINGS);
  const coda     = rng.pick(CODAS);
  const epigraph = rng.chance(0.18) ? rng.pick(EPIGRAPHS) : null;

  const paragraphCount = 2 + rng.int(3); // 2..4 markov paragraphs
  const body = [];
  body.push({ kind: "lede", text: opening });
  for (let i = 0; i < paragraphCount; i++) {
    const sentenceCount = 2 + rng.int(3); // 2..4 sentences
    body.push({ kind: "p", text: generateParagraph(CHAIN, rng, sentenceCount) });
  }
  body.push({ kind: "coda", text: coda });

  return { coord, coordStr, title, subtitle, body, epigraph };
}
