// Library of Babel — UI layer.
// Engine + page generation lives in engine.js. This file handles DOM,
// keyboard, the librarian's behavior, and bookmarks.

import { LIBRARIAN_QUIPS } from "./fragments.js";
import {
  generatePage, formatCoord, parseCoord, neighbor, randomCoord,
} from "./engine.js";

// =====================================================================
// Bookmarks (localStorage)
// =====================================================================

const BOOKMARK_KEY = "library-of-babel:bookmarks";

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch { return []; }
}

function saveBookmarks(list) {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list)); } catch {}
}

function isBookmarked(coordStr, list = loadBookmarks()) {
  return list.some(b => b.coord === coordStr);
}

function addBookmark(page) {
  const list = loadBookmarks();
  if (isBookmarked(page.coordStr, list)) return list;
  list.unshift({
    coord: page.coordStr,
    title: page.title,
    pinnedAt: Date.now(),
  });
  saveBookmarks(list);
  return list;
}

function removeBookmark(coordStr) {
  const list = loadBookmarks().filter(b => b.coord !== coordStr);
  saveBookmarks(list);
  return list;
}

// =====================================================================
// Librarian
// =====================================================================

const Librarian = {
  history: [],     // recent interaction kinds
  lastSpoke: 0,    // timestamp
  lastPageAt: 0,   // when current page was opened

  // Decide whether and what to say. Returns string or null.
  consider(kind /* "navigate"|"random"|"teleport"|"bookmark"|"linger"|"first" */) {
    const now = Date.now();
    this.history.push({ kind, t: now });
    if (this.history.length > 30) this.history.shift();

    // Sparseness gate: never speak more than once every ~12s,
    // and only with some probability.
    const sinceLast = now - this.lastSpoke;
    if (sinceLast < 12_000) return null;

    // Behavioral overrides — high probability when triggered.
    if (kind === "first") {
      this.lastSpoke = now;
      return pickFrom(LIBRARIAN_QUIPS.on_first_visit);
    }
    if (kind === "bookmark") {
      this.lastSpoke = now;
      return pickFrom(LIBRARIAN_QUIPS.on_bookmark);
    }
    if (kind === "skim") {
      this.lastSpoke = now;
      return pickFrom(LIBRARIAN_QUIPS.on_skim);
    }
    if (kind === "linger") {
      this.lastSpoke = now;
      return pickFrom(LIBRARIAN_QUIPS.on_linger);
    }
    if (kind === "random") {
      if (Math.random() < 0.5) {
        this.lastSpoke = now;
        return pickFrom(LIBRARIAN_QUIPS.on_random);
      }
    }

    // Mood-based ambient quip — low probability per interaction.
    if (Math.random() < 0.18) {
      const mood = pickMood();
      this.lastSpoke = now;
      return pickFrom(LIBRARIAN_QUIPS[mood]);
    }
    return null;
  },
};

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickMood() {
  const hour = new Date().getHours();
  // After midnight: sleepy/wistful weighted higher.
  // Late evening: curious/mischievous.
  // Default: any.
  const weights =
    (hour >= 0 && hour < 6)  ? { sleepy: 4, wistful: 3, curious: 2, mischievous: 1 } :
    (hour >= 6 && hour < 12) ? { curious: 4, sleepy: 1, wistful: 2, mischievous: 2 } :
    (hour >= 12 && hour < 18)? { curious: 3, mischievous: 3, wistful: 2, sleepy: 1 } :
                                { curious: 3, mischievous: 2, wistful: 3, sleepy: 2 };
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) { if ((r -= weights[k]) < 0) return k; }
  return "curious";
}

// =====================================================================
// DOM rendering
// =====================================================================

const $ = (id) => document.getElementById(id);

const elTitle    = $("page-title");
const elSubtitle = $("page-subtitle");
const elBody     = $("page-body");
const elCoord    = $("page-coord");
const elInput    = $("address-input");
const elBookmark = $("bookmark-btn");
const elLibrarianText = $("librarian-text");
const elLibrarian     = $("librarian");
const elCorkboardList = $("corkboard-list");
const elCorkboardEmpty = $("corkboard-empty");

let currentPage = null;
let lingerTimer = null;
let recentNavTimes = []; // timestamps of recent navigations, for skim detection

const elPage = $("page");

function renderPage(coord) {
  // Fade the page out, swap content, fade back in.
  // First call has nothing to fade, so we render immediately.
  if (currentPage) {
    elPage.classList.add("turning");
    setTimeout(() => {
      _renderPageContent(coord);
      elPage.classList.remove("turning");
    }, 120);
  } else {
    _renderPageContent(coord);
  }
}

function _renderPageContent(coord) {
  const page = generatePage(coord);
  currentPage = page;

  elTitle.textContent = page.title;
  elSubtitle.textContent = page.subtitle || "";
  elSubtitle.style.display = page.subtitle ? "" : "none";

  elBody.innerHTML = "";
  for (const block of page.body) {
    const p = document.createElement("p");
    if (block.kind === "lede") p.classList.add("lede");
    if (block.kind === "coda") p.classList.add("coda");
    p.textContent = block.text;
    elBody.appendChild(p);
  }
  if (page.epigraph) {
    const ep = document.createElement("p");
    ep.classList.add("coda");
    ep.textContent = page.epigraph;
    elBody.appendChild(ep);
  }

  elCoord.textContent = page.coordStr;
  elInput.value = page.coordStr;
  // Update hash without triggering a hashchange loop
  const target = "#" + encodeURIComponent(page.coordStr);
  if (location.hash !== target) {
    history.replaceState(null, "", target);
  }

  // Bookmark button state
  elBookmark.classList.toggle("pinned", isBookmarked(page.coordStr));
  elBookmark.textContent = isBookmarked(page.coordStr) ? "bookmarked" : "bookmark";

  // Re-render corkboard if it's mounted (in case bookmark state changed elsewhere)
  renderCorkboard();

  // Reset linger timer
  if (lingerTimer) clearTimeout(lingerTimer);
  lingerTimer = setTimeout(() => {
    speak(Librarian.consider("linger"));
  }, 28_000);
}

function speak(text) {
  if (!text) return;
  elLibrarianText.textContent = text;
  elLibrarian.classList.add("visible");
  // Auto-hide after a while
  clearTimeout(speak._hideTimer);
  speak._hideTimer = setTimeout(() => {
    elLibrarian.classList.remove("visible");
  }, 9_000);
}

function navigate(coord, kind = "navigate") {
  // Skim detection: 4+ navs in 5 seconds.
  const now = Date.now();
  recentNavTimes.push(now);
  recentNavTimes = recentNavTimes.filter(t => now - t < 5000);
  let interactionKind = kind;
  if (recentNavTimes.length >= 4 && kind === "navigate") {
    interactionKind = "skim";
  }

  renderPage(coord);
  speak(Librarian.consider(interactionKind));
}

function renderCorkboard() {
  const list = loadBookmarks();
  elCorkboardList.innerHTML = "";
  if (list.length === 0) {
    elCorkboardEmpty.style.display = "";
    return;
  }
  elCorkboardEmpty.style.display = "none";
  for (const b of list) {
    const li = document.createElement("li");

    const remove = document.createElement("button");
    remove.className = "card-remove";
    remove.title = "remove";
    remove.textContent = "×";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeBookmark(b.coord);
      renderCorkboard();
      if (currentPage && currentPage.coordStr === b.coord) {
        elBookmark.classList.remove("pinned");
        elBookmark.textContent = "bookmark";
      }
    });

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = b.title;

    const coord = document.createElement("span");
    coord.className = "card-coord";
    coord.textContent = b.coord;

    li.appendChild(remove);
    li.appendChild(title);
    li.appendChild(coord);
    li.addEventListener("click", () => {
      const c = parseCoord(b.coord);
      if (c) {
        showRoom("reading");
        navigate(c, "teleport");
      }
    });
    elCorkboardList.appendChild(li);
  }
}

// =====================================================================
// Rooms
// =====================================================================

function showRoom(name) {
  document.body.classList.toggle("reading-room-active", name === "reading");
  $("reading-room").classList.toggle("room-active", name === "reading");
  $("corkboard").classList.toggle("room-active", name === "corkboard");
  $("tab-reading").classList.toggle("tab-active", name === "reading");
  $("tab-corkboard").classList.toggle("tab-active", name === "corkboard");
  if (name === "corkboard") renderCorkboard();
}

// =====================================================================
// Wiring
// =====================================================================

function init() {
  // Initial coordinate: from URL hash if present, else default.
  let coord = null;
  if (location.hash) {
    try { coord = parseCoord(decodeURIComponent(location.hash.slice(1))); }
    catch {}
  }
  if (!coord) coord = { wing: 1, shelf: 1, volume: 1, page: 1 };

  renderPage(coord);

  // First-visit greeting (sparse — only if no bookmarks yet)
  if (loadBookmarks().length === 0) {
    setTimeout(() => speak(Librarian.consider("first")), 800);
  }

  // Address bar
  $("address-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = parseCoord(elInput.value);
    if (!c) {
      // visual nudge — flash the input
      elInput.style.borderBottomColor = "var(--ink-sepia)";
      setTimeout(() => { elInput.style.borderBottomColor = ""; }, 400);
      return;
    }
    navigate(c, "teleport");
  });

  // Bookmark button
  elBookmark.addEventListener("click", () => {
    if (!currentPage) return;
    if (isBookmarked(currentPage.coordStr)) {
      removeBookmark(currentPage.coordStr);
      elBookmark.classList.remove("pinned");
      elBookmark.textContent = "bookmark";
    } else {
      addBookmark(currentPage);
      elBookmark.classList.add("pinned");
      elBookmark.textContent = "bookmarked";
      speak(Librarian.consider("bookmark"));
    }
    renderCorkboard();
  });

  // Tabs
  $("tab-reading").addEventListener("click", () => showRoom("reading"));
  $("tab-corkboard").addEventListener("click", () => showRoom("corkboard"));

  // Help dialog
  $("help-toggle").addEventListener("click", () => $("help").showModal());
  $("help-close").addEventListener("click", () => $("help").close());

  // Keyboard nav
  document.addEventListener("keydown", (e) => {
    // Don't intercept while typing in the address bar.
    if (e.target && e.target.id === "address-input") return;
    if (!currentPage) return;

    const c = currentPage.coord;
    let nc = null, kind = "navigate";

    if (e.key === "ArrowLeft") nc = neighbor(c, e.shiftKey ? "shelf" : "page", -1);
    else if (e.key === "ArrowRight") nc = neighbor(c, e.shiftKey ? "shelf" : "page", +1);
    else if (e.key === "ArrowUp")    nc = neighbor(c, e.shiftKey ? "wing" : "volume", -1);
    else if (e.key === "ArrowDown")  nc = neighbor(c, e.shiftKey ? "wing" : "volume", +1);
    else if (e.key === "r" || e.key === "R") { nc = randomCoord(); kind = "random"; }
    else if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      elBookmark.click();
      return;
    }
    else if (e.key === "Tab") {
      e.preventDefault();
      const next = $("reading-room").classList.contains("room-active") ? "corkboard" : "reading";
      showRoom(next);
      return;
    }
    else if (e.key === "?") { $("help").showModal(); return; }
    else if (e.key === "Escape") {
      if ($("help").open) $("help").close();
      return;
    }

    if (nc) {
      e.preventDefault();
      navigate(nc, kind);
    }
  });

  // Hash changes (e.g. back button)
  window.addEventListener("hashchange", () => {
    if (!location.hash) return;
    try {
      const c = parseCoord(decodeURIComponent(location.hash.slice(1)));
      if (c && (!currentPage || formatCoord(c) !== currentPage.coordStr)) {
        navigate(c, "teleport");
      }
    } catch {}
  });
}

init();
