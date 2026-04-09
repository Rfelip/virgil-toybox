// main.js — Rhyme Radar entry point, event loop, and canvas rendering.
//
// The whole toy is three files: rhyme.js (phonetic classifier), styles.css
// (visual identity), and this one (glue). On load, the dictionary is fetched
// and an initial seed ("silence") is drawn. Typing a word updates the radar
// live; clicking on any rendered word re-centers on it and appends to the
// breadcrumb path.
//
// Rendering is pure 2D canvas — no SVG, no WebGL. The concentric rings draw
// with a "sonar ping" expansion animation: each ring grows from radius 0
// outward, fading in opacity, on a ~700 ms eased curve. Words are positioned
// along each ring with a random jitter so repeat visits to the same seed
// feel alive rather than mechanical.
//
// Author: Virgil, 2026-04-07 night watch

import { loadDictionary, findRhymes, capRings } from "./rhyme.js";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const CANVAS_SIZE = 900;
const CENTER = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };

/**
 * Ring definitions — ordered from innermost to outermost. Each ring has:
 *   name:   classification key from findRhymes().rings
 *   radius: base radius in canvas-internal px
 *   color:  CSS var name for the text color (kept in sync with styles.css)
 *   cap:    max words to display per ring
 *   label:  pretty label for the rim
 */
const RINGS = [
  { name: "perfect",    radius: 130, color: "#6b2d2d", cap: 12, label: "perfect" },
  { name: "near",       radius: 220, color: "#8a4e2d", cap: 18, label: "near" },
  { name: "assonance",  radius: 315, color: "#7a8a6e", cap: 24, label: "assonance" },
  { name: "consonance", radius: 410, color: "#a07a7a", cap: 24, label: "consonance" },
];

const INK = "#2d3a5f";
const INK_MUTE = "#5a668a";
const INK_GHOST = "#8a94b2";
const PAPER_SHADE = "rgba(138, 148, 178, 0.18)";

const ANIMATION_MS = 750;

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------

/** @type {Awaited<ReturnType<typeof loadDictionary>> | null} */
let dict = null;

/** @type {string[]} — visited path for the breadcrumb */
let path = [];

/** @type {string | null} — current seed */
let currentSeed = null;

/** @type {ReturnType<typeof capRings> | null} — cached rings for current seed */
let currentRings = null;

/** @type {{seed: import("./rhyme.js").DictEntry | null} | null} */
let currentResult = null;

/** @type {{word: string, entry: import("./rhyme.js").DictEntry, x: number, y: number, cx: number, cy: number, width: number, height: number, ring: number}[]} — hit targets */
let hitTargets = [];

/** @type {number | null} — animation start time */
let animStart = null;

/** @type {number} — ring layout seed so jitter is stable within a render */
let layoutSeed = 0;

/**
 * @type {{ word: string, ring: number } | null} — identity of the currently
 * hovered ring word. We store identity (not index) because hitTargets is
 * rebuilt on every draw, so an index would point at stale or partial data.
 */
let hovered = null;

// ------------------------------------------------------------------
// Canvas setup
// ------------------------------------------------------------------

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("radar-canvas"));
const ctx = canvas.getContext("2d");

// Handle HiDPI by upscaling the backing store while keeping logical units = CANVAS_SIZE.
// We draw in a CANVAS_SIZE x CANVAS_SIZE coordinate system regardless of physical size.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  // Scale logical units so drawing at (x, y) in [0..CANVAS_SIZE] maps to the full element.
  const scale = (rect.width * dpr) / CANVAS_SIZE;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

// ------------------------------------------------------------------
// Seeded PRNG — small mulberry32 so layouts are stable within a render
// but differ between seeds. Good enough for visual jitter.
// ------------------------------------------------------------------

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ------------------------------------------------------------------
// Easing — ease-out cubic for the sonar ping
// ------------------------------------------------------------------

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ------------------------------------------------------------------
// Draw
// ------------------------------------------------------------------

function draw() {
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Compute animation progress
  let t = 1;
  if (animStart !== null) {
    const elapsed = performance.now() - animStart;
    t = Math.min(elapsed / ANIMATION_MS, 1);
    t = easeOutCubic(t);
  }

  // Draw the faint ring guides (always full opacity — they're the "paper lines")
  for (const ring of RINGS) {
    drawRingGuide(ring.radius * t);
  }

  // Seed word at center
  drawSeed(t);

  // Reset hit targets — we'll rebuild on each draw
  hitTargets = [];

  if (!currentRings) return;

  const rand = mulberry32(layoutSeed);

  // Draw each ring's words
  for (let i = 0; i < RINGS.length; i++) {
    const ring = RINGS[i];
    const words = currentRings[ring.name] || [];
    if (words.length === 0) continue;

    const animatedRadius = ring.radius * t;
    const ringOpacity = t;

    drawRingWords(words, animatedRadius, ring.color, ringOpacity, rand, i);
    drawRingLabel(ring, animatedRadius, ringOpacity);
  }

  // Hover overlay draws last, on top of everything else, so the sonar
  // line and highlighted phoneme strip sit above the ring content
  if (t > 0.95) {
    drawHoverOverlay();
  }

  if (t < 1) {
    requestAnimationFrame(draw);
  } else {
    animStart = null;
  }
}

function drawRingGuide(radius) {
  if (radius < 2) return;
  ctx.save();
  ctx.strokeStyle = PAPER_SHADE;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSeed(t) {
  if (!currentSeed || !currentResult || !currentResult.seed) return;

  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Title word — big italic serif
  ctx.font = "italic 500 56px 'EB Garamond', Georgia, serif";
  ctx.globalAlpha = Math.min(1, t + 0.2);
  ctx.fillText(currentSeed, CENTER.x, CENTER.y - 8);

  // Phoneme string below — small monospace
  const phonemes = currentResult.seed.p.join(" ");
  ctx.font = "14px 'IBM Plex Mono', monospace";
  ctx.fillStyle = INK_MUTE;
  ctx.globalAlpha = Math.min(1, t * 0.75);
  ctx.fillText(`/ ${phonemes} /`, CENTER.x, CENTER.y + 32);

  ctx.restore();
}

function drawRingWords(words, radius, color, opacity, rand, ringIndex) {
  const cap = RINGS[ringIndex].cap;
  const display = words.slice(0, cap);
  const count = display.length;

  if (count === 0) return;

  // Angular jitter — each ring starts at a slight random offset so the rings
  // don't align into spoke patterns
  const startAngle = rand() * Math.PI * 2;

  ctx.save();
  ctx.font = "italic 400 18px 'EB Garamond', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * Math.PI * 2;
    // Small radial jitter (+/- 10px) so words don't sit on a perfect circle
    const r = radius + (rand() - 0.5) * 16;
    const x = CENTER.x + Math.cos(angle) * r;
    const y = CENTER.y + Math.sin(angle) * r;

    const entry = display[i];
    const word = entry.w;

    // Measure the text for hit detection
    const metrics = ctx.measureText(word);
    const w = metrics.width;
    // Generous hit height so touch taps land reliably — 36 canvas-px
    // maps to ~15 screen-px on a 375-wide phone (900/375 = 2.4 scale).
    const h = 36;

    // Check if this word is the currently hovered one. If so, render it
    // slightly larger and fully opaque (no fade during animation); the
    // hover glow + sonar line are drawn in the separate drawHoverOverlay
    // pass after all rings are done, so they sit on top.
    const isHovered =
      hovered !== null &&
      hovered.word === word &&
      hovered.ring === ringIndex &&
      opacity > 0.95;

    if (isHovered) {
      ctx.save();
      ctx.font = "italic 500 22px 'EB Garamond', Georgia, serif";
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.fillText(word, x, y);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.fillText(word, x, y);
    }

    // Register hit target (only at full opacity — don't register during animation).
    // Horizontal padding is 16px each side; vertical uses the full generous h.
    if (opacity > 0.95) {
      hitTargets.push({
        word,
        entry,
        x: x - w / 2 - 16,
        y: y - h / 2,
        cx: x,
        cy: y,
        width: w + 32,
        height: h,
        ring: ringIndex,
      });
    }
  }

  ctx.restore();
}

/**
 * Draw the hover overlay — sonar-line from the center to the hovered word,
 * small monospace phoneme strip next to the word showing which phonemes
 * are shared with the seed (burgundy) vs unshared (muted). Called after
 * all ring words are drawn, so it sits on top.
 */
function drawHoverOverlay() {
  if (!hovered || !currentResult || !currentResult.seed) return;

  // Find the matching hit target in the fresh list
  const target = hitTargets.find(
    (t) => t.word === hovered.word && t.ring === hovered.ring,
  );
  if (!target) return;

  const seedPhonemes = currentResult.seed.p;
  const candPhonemes = target.entry.p;
  const seedSet = new Set(seedPhonemes);

  // 1. Faint sonar line from center to word
  ctx.save();
  ctx.strokeStyle = RINGS[hovered.ring].color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(CENTER.x, CENTER.y);
  ctx.lineTo(target.cx, target.cy);
  ctx.stroke();
  ctx.restore();

  // 2. Phoneme strip beneath the hovered word — each phoneme drawn
  //    individually so we can color-code shared vs unshared
  ctx.save();
  ctx.font = "500 11px 'IBM Plex Mono', monospace";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Measure total width so we can center the strip under the word
  let totalWidth = 0;
  const parts = [];
  for (let i = 0; i < candPhonemes.length; i++) {
    const p = candPhonemes[i];
    const text = i === 0 ? p : ` ${p}`;
    const width = ctx.measureText(text).width;
    parts.push({ text, width, shared: seedSet.has(p) });
    totalWidth += width;
  }

  const stripY = target.cy + 14;
  let stripX = target.cx - totalWidth / 2;

  // Background for the strip — faint paper tint so it reads cleanly
  // against the ruled-line background
  ctx.fillStyle = "rgba(245, 239, 224, 0.85)";
  ctx.fillRect(stripX - 6, stripY - 2, totalWidth + 12, 16);

  for (const part of parts) {
    ctx.fillStyle = part.shared ? RINGS[0].color : INK_MUTE;
    ctx.fillText(part.text, stripX, stripY);
    stripX += part.width;
  }

  ctx.restore();

  // 3. Also light up the seed's own phoneme display to echo the shared
  //    set — renders a second phoneme strip below the seed word where
  //    shared phonemes (with the hovered candidate) are in burgundy.
  const candSet = new Set(candPhonemes);
  ctx.save();
  ctx.font = "500 14px 'IBM Plex Mono', monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  let seedTotal = 0;
  const seedParts = [];
  for (let i = 0; i < seedPhonemes.length; i++) {
    const p = seedPhonemes[i];
    const text = i === 0 ? p : ` ${p}`;
    const width = ctx.measureText(text).width;
    seedParts.push({ text, width, shared: candSet.has(p) });
    seedTotal += width;
  }

  // Override the muted line below the seed — draw a highlighted version
  let seedX = CENTER.x - seedTotal / 2;
  const seedY = CENTER.y + 32;

  // Wipe the previous faint phoneme line by drawing a paper block over it
  ctx.fillStyle = "rgba(245, 239, 224, 0.95)";
  ctx.fillRect(seedX - 10, seedY - 10, seedTotal + 20, 20);

  for (const part of seedParts) {
    ctx.fillStyle = part.shared ? RINGS[0].color : INK_MUTE;
    ctx.fillText(part.text, seedX, seedY);
    seedX += part.width;
  }

  ctx.restore();
}

// ------------------------------------------------------------------
// Audio — soft piano-ish tones on ring expansion
// ------------------------------------------------------------------
//
// Synthesized via Web Audio API (no samples, no external deps). Each
// ring gets a slightly different pitch — inner rings (perfect rhymes)
// are higher, outer rings (consonance) are lower. The tone is a soft
// triangle wave with a slow attack and a long exponential decay,
// approximating a piano "plonk" without any of the realism of an
// actual sample. Default OFF so the toy doesn't surprise on first
// load — toggled by pressing 'a' or via the audio button in the UI.

let audioCtx = null;
let audioEnabled = false;

const RING_FREQUENCIES = [
  // Pentatonic-ish: D5, A4, F#4, D4. Reads bottom-up but mapped
  // ring-by-ring so inner = higher.
  587.33, // D5  — perfect
  440.0,  // A4  — near
  369.99, // F#4 — assonance
  293.66, // D4  — consonance
];

function ensureAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (err) {
    console.warn("Web Audio API unavailable:", err);
    audioCtx = null;
  }
  return audioCtx;
}

function playRingTone(ringIndex) {
  if (!audioEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const freq = RING_FREQUENCIES[ringIndex] ?? 440;
  const now = ctx.currentTime;

  // Two oscillators for a slightly fuller tone — a triangle at the
  // fundamental and a sine an octave up at lower amplitude
  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = freq;

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  // Slow attack (15 ms), long exponential decay (1.4 s)
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

  const sub = ctx.createGain();
  sub.gain.value = 0.35;

  osc1.connect(gain);
  osc2.connect(sub);
  sub.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.5);
  osc2.stop(now + 1.5);
}

/** Play all four ring tones in a quick arpeggio — used on seed change */
function playSonarPing() {
  if (!audioEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  // Resume the audio context if it's suspended (autoplay policies)
  if (ctx.state === "suspended") ctx.resume();

  for (let i = 0; i < RINGS.length; i++) {
    setTimeout(() => playRingTone(i), i * 110);
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("audio-toggle");
  if (btn) {
    btn.textContent = audioEnabled ? "♪ on" : "♪ off";
    btn.classList.toggle("on", audioEnabled);
  }
  if (audioEnabled) {
    // Pre-warm + play one tone so the user gets immediate feedback
    const ctx = ensureAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
    playRingTone(1);
  }
}

function drawRingLabel(ring, radius, opacity) {
  if (radius < 10 || opacity < 0.3) return;
  ctx.save();
  ctx.font = "500 10px 'IBM Plex Mono', monospace";
  ctx.fillStyle = INK_GHOST;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = opacity * 0.8;

  // Label sits at the top of each ring, slightly outside
  const labelY = CENTER.y - radius - 8;
  ctx.fillText(ring.label.toUpperCase(), CENTER.x + 8, labelY);

  ctx.restore();
}

// ------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------

function setSeed(word) {
  if (!dict) return;
  word = word.toLowerCase().trim();
  if (!word) return;

  const result = findRhymes(word, dict);
  if (!result.seed) {
    setHint(`"${word}" — not in the dictionary`, true);
    return;
  }

  currentSeed = word;
  currentResult = result;
  currentRings = capRings(result.rings, 30);
  layoutSeed = hashString(word);

  // Update the breadcrumb path — don't duplicate consecutive entries
  if (path[path.length - 1] !== word) {
    path.push(word);
    if (path.length > 20) path.shift();
  }
  renderBreadcrumb();

  const totals = Object.values(result.rings).reduce((s, r) => s + r.length, 0);
  setHint(
    `${totals} rhymes found — perfect ${result.rings.perfect.length}, ` +
    `near ${result.rings.near.length}, assonance ${result.rings.assonance.length}, ` +
    `consonance ${result.rings.consonance.length}`,
    false,
  );

  // Clear any stale hover — the previous hit targets are about to be rebuilt
  hovered = null;

  // Kick off the sonar ping (visual + audio)
  animStart = performance.now();
  playSonarPing();
  requestAnimationFrame(draw);
}

function setHint(text, isError = false) {
  const hint = document.getElementById("seed-hint");
  if (!hint) return;
  hint.textContent = text;
  hint.classList.toggle("error", isError);
}

function renderBreadcrumb() {
  const list = document.getElementById("breadcrumb-list");
  if (!list) return;
  list.innerHTML = "";
  path.forEach((word, i) => {
    const li = document.createElement("li");
    li.textContent = word;
    if (i === path.length - 1) li.classList.add("current");
    li.addEventListener("click", () => setSeed(word));
    list.appendChild(li);
  });
}

// ------------------------------------------------------------------
// Events
// ------------------------------------------------------------------

const seedInput = /** @type {HTMLInputElement} */ (document.getElementById("seed-input"));
const seedForm = /** @type {HTMLFormElement} */ (document.querySelector(".seed-form"));

seedForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const word = seedInput.value.trim();
  if (word) {
    setSeed(word);
    // Blur the input so arrow keys take over the radar immediately.
    // Submit-then-walk is the canonical flow for keyboard users.
    seedInput.blur();
  }
});

// Debounced live update while typing
let typingTimer = null;
seedInput.addEventListener("input", () => {
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    const word = seedInput.value.trim();
    if (word && word.length >= 2) setSeed(word);
  }, 250);
});

// Hit-test helper — shared by click and touchend handlers
function hitTestCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = CANVAS_SIZE / rect.width;
  const x = (clientX - rect.left) * scale;
  const y = (clientY - rect.top) * scale;

  for (let i = hitTargets.length - 1; i >= 0; i--) {
    const t = hitTargets[i];
    if (
      x >= t.x && x <= t.x + t.width &&
      y >= t.y && y <= t.y + t.height
    ) {
      return t;
    }
  }
  return null;
}

// Click anywhere on canvas — hit test against word rects
canvas.addEventListener("click", (e) => {
  const hit = hitTestCanvas(e.clientX, e.clientY);
  if (hit) {
    setSeed(hit.word);
    seedInput.value = hit.word;
  }
});

// Touch: fire immediately on touchend without waiting for the 300 ms
// click delay. We only act on single-finger taps (no scroll, no zoom).
canvas.addEventListener("touchend", (e) => {
  if (e.changedTouches.length !== 1) return;
  const touch = e.changedTouches[0];
  const hit = hitTestCanvas(touch.clientX, touch.clientY);
  if (hit) {
    e.preventDefault(); // prevent the follow-up click event
    setSeed(hit.word);
    seedInput.value = hit.word;
  }
}, { passive: false });

// Mouse-move hover: hit-test and redraw if the hovered word changed.
// Throttled by rAF so we don't thrash the renderer.
let hoverRafPending = false;
function screenToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = CANVAS_SIZE / rect.width;
  return {
    x: (e.clientX - rect.left) * scale,
    y: (e.clientY - rect.top) * scale,
  };
}

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = screenToCanvas(e);

  let newHover = null;
  // Reverse so the outer rings win over ring guide overlap
  for (let i = hitTargets.length - 1; i >= 0; i--) {
    const t = hitTargets[i];
    if (
      x >= t.x && x <= t.x + t.width &&
      y >= t.y && y <= t.y + t.height
    ) {
      newHover = { word: t.word, ring: t.ring };
      break;
    }
  }

  // Only redraw if the hover state actually changed
  const changed =
    (hovered === null) !== (newHover === null) ||
    (hovered && newHover && (hovered.word !== newHover.word || hovered.ring !== newHover.ring));

  if (!changed) return;

  hovered = newHover;
  canvas.style.cursor = hovered ? "pointer" : "crosshair";

  if (!hoverRafPending) {
    hoverRafPending = true;
    requestAnimationFrame(() => {
      hoverRafPending = false;
      draw();
    });
  }
});

canvas.addEventListener("mouseleave", () => {
  if (hovered !== null) {
    hovered = null;
    canvas.style.cursor = "crosshair";
    requestAnimationFrame(draw);
  }
});

// ------------------------------------------------------------------
// Keyboard navigation
// ------------------------------------------------------------------
//
// Arrow keys (or j/k/h/l for keyboard purists) walk the hitTargets array
// sequentially. Enter commits — re-centers the radar on the selected
// word. Escape clears the hover. This turns the toy into something a
// poet can use with both hands on the keyboard:
//
//   ←/→ (or h/l)  walk the visible rhymes in order
//   ↑/↓ (or j/k)  jump between rings at roughly the same angle
//   Enter         re-center on the selected word
//   Esc           clear the selection and return focus to the input
//
// Hit targets are ordered ring-by-ring, so ←/→ within a ring walks
// around it and hops to the next ring when it reaches the end.
// ↑/↓ is smarter — it finds the nearest word on the next ring by
// angular distance.

function selectByIndex(i) {
  if (hitTargets.length === 0) return;
  const idx = ((i % hitTargets.length) + hitTargets.length) % hitTargets.length;
  const t = hitTargets[idx];
  hovered = { word: t.word, ring: t.ring };
  requestAnimationFrame(draw);
}

function currentHitIndex() {
  if (!hovered) return -1;
  return hitTargets.findIndex(
    (t) => t.word === hovered.word && t.ring === hovered.ring,
  );
}

function jumpRing(direction) {
  if (hitTargets.length === 0) return;

  const current = currentHitIndex();
  if (current === -1) {
    // No current hover — start on the innermost ring
    const first = hitTargets.findIndex((t) => t.ring === (direction > 0 ? 0 : RINGS.length - 1));
    if (first !== -1) selectByIndex(first);
    return;
  }

  const currentTarget = hitTargets[current];
  const currentRing = currentTarget.ring;
  const targetRing = currentRing + direction;

  if (targetRing < 0 || targetRing >= RINGS.length) return;

  // Find the target ring's word with the closest angular position
  const currentAngle = Math.atan2(
    currentTarget.cy - CENTER.y,
    currentTarget.cx - CENTER.x,
  );

  let bestIdx = -1;
  let bestDelta = Infinity;
  for (let i = 0; i < hitTargets.length; i++) {
    const t = hitTargets[i];
    if (t.ring !== targetRing) continue;
    const angle = Math.atan2(t.cy - CENTER.y, t.cx - CENTER.x);
    let delta = Math.abs(angle - currentAngle);
    if (delta > Math.PI) delta = 2 * Math.PI - delta;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }

  if (bestIdx !== -1) selectByIndex(bestIdx);
}

window.addEventListener("keydown", (e) => {
  // Don't intercept keys when the user is typing in the input
  if (document.activeElement === seedInput && e.key !== "Escape") return;

  switch (e.key) {
    case "ArrowRight":
    case "l": {
      e.preventDefault();
      const current = currentHitIndex();
      selectByIndex(current === -1 ? 0 : current + 1);
      break;
    }
    case "ArrowLeft":
    case "h": {
      e.preventDefault();
      const current = currentHitIndex();
      selectByIndex(current === -1 ? hitTargets.length - 1 : current - 1);
      break;
    }
    case "ArrowDown":
    case "j":
      e.preventDefault();
      jumpRing(1);
      break;
    case "ArrowUp":
    case "k":
      e.preventDefault();
      jumpRing(-1);
      break;
    case "Enter": {
      // Only act when the focus is NOT the seed input (the form submit
      // handler owns Enter in the input field)
      if (document.activeElement === seedInput) return;
      if (hovered) {
        e.preventDefault();
        setSeed(hovered.word);
        seedInput.value = hovered.word;
      }
      break;
    }
    case "Escape":
      e.preventDefault();
      if (hovered !== null) {
        hovered = null;
        canvas.style.cursor = "crosshair";
        requestAnimationFrame(draw);
      }
      seedInput.focus();
      break;
    case "p":
    case "P":
      e.preventDefault();
      exportPathAsPoem();
      break;
    case "a":
    case "A":
      e.preventDefault();
      toggleAudio();
      break;
  }
});

// ------------------------------------------------------------------
// Poem export
// ------------------------------------------------------------------
//
// Pressing "p" copies the breadcrumb walk to the clipboard, formatted
// as a tiny found poem: one word per line, a colophon footer with the
// date and the radar URL. The walk itself is the art — our job is
// just to typeset it honestly.

async function exportPathAsPoem() {
  if (path.length === 0) {
    setHint("nothing to export — walk a path first", true);
    return;
  }

  const date = new Date().toISOString().split("T")[0];
  const lines = [
    ...path,
    "",
    `— a walk through word-space, ${date}`,
    "  (rhyme radar)",
  ];
  const poem = lines.join("\n");

  try {
    await navigator.clipboard.writeText(poem);
    setHint(`poem copied to clipboard — ${path.length} word${path.length === 1 ? "" : "s"}, paste anywhere`, false);
  } catch (err) {
    console.error("clipboard write failed:", err);
    // Fallback: select the text in a temporary textarea
    const ta = document.createElement("textarea");
    ta.value = poem;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      // execCommand is deprecated but remains the only reliable fallback
      // when navigator.clipboard is blocked (file:// URLs, permissions,
      // old browsers). Keep the fallback; the primary path is above.
      document.execCommand("copy");
      setHint(`poem copied (legacy path) — ${path.length} word${path.length === 1 ? "" : "s"}`, false);
    } catch {
      setHint("clipboard blocked — check the console for the poem text", true);
      console.log("Rhyme Radar poem:\n" + poem);
    }
    document.body.removeChild(ta);
  }
}

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------

async function boot() {
  try {
    dict = await loadDictionary();
    setHint(`${dict.meta.count} words loaded — try "silence"`, false);
    resizeCanvas();

    // Wire the audio toggle button — keyboard shortcut 'a' also works
    const audioBtn = document.getElementById("audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", toggleAudio);
    }

    setSeed("silence");
    seedInput.value = "silence";
    seedInput.focus();
  } catch (err) {
    console.error(err);
    setHint("failed to load the dictionary — check the console", true);
  }
}

boot();
