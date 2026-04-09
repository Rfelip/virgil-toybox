// test-classifier.js — Quick Node-side sanity check of rhyme.js
//
// Run with: node scripts/test-classifier.js
//
// Loads data/words.json from disk (Node has a native fetch but it doesn't
// like file:// URLs for security; we pre-parse the JSON and stub the
// loadDictionary helper with an in-memory version).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { findRhymes, capRings } from "../rhyme.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "..", "data", "words.json");

const data = JSON.parse(readFileSync(dataPath, "utf-8"));

// Build the same { entries, byWord } shape that loadDictionary returns
const dict = { entries: data.entries, byWord: new Map() };
for (const entry of data.entries) {
  dict.byWord.set(entry.w, entry);
}

const seeds = ["cat", "moon", "night", "fire", "storm", "heart", "dream", "silence"];

console.log(`dict: ${data.count} entries (${data.source})\n`);

for (const seed of seeds) {
  const result = findRhymes(seed, dict);
  if (!result.seed) {
    console.log(`[${seed}] NOT IN DICTIONARY`);
    continue;
  }
  const capped = capRings(result.rings, 8);
  const total = Object.values(result.rings).reduce((s, r) => s + r.length, 0);

  console.log(`[${seed}] /${result.seed.p.join(" ")}/  suffix=/${result.seed.s.join(" ")}/  vowel=${result.seed.v}  total=${total}`);
  for (const [type, list] of Object.entries(capped)) {
    const fullCount = result.rings[type].length;
    const sample = list.map((e) => e.w).join(", ");
    console.log(`  ${type.padEnd(11)}(${fullCount.toString().padStart(4)}):  ${sample}${fullCount > 8 ? " …" : ""}`);
  }
  console.log();
}
