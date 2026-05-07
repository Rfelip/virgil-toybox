// Measure Theory Sparring — drill engine.
// Self-paced spaced repetition: each grade pushes the next-review date.
// State is in localStorage under 'mts:v1'.

const STORAGE_KEY = "mts:v1";
const DAY = 24 * 3600 * 1000;
const INTERVALS = { hard: 1 * DAY, med: 3 * DAY, easy: 7 * DAY };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.cards) s.cards = {};
    if (!s.streak) s.streak = { count: 0, lastDay: null };
    return s;
  } catch (e) {
    return defaultState();
  }
}

function defaultState() {
  return { cards: {}, filter: "all", streak: { count: 0, lastDay: null } };
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function tickStreak(state) {
  const today = dayKey();
  if (state.streak.lastDay === today) return;
  if (state.streak.lastDay) {
    const last = new Date(state.streak.lastDay).getTime();
    const now  = new Date(today).getTime();
    if (now - last <= DAY * 1.5) state.streak.count += 1;
    else state.streak.count = 1;
  } else {
    state.streak.count = 1;
  }
  state.streak.lastDay = today;
}

function isDue(card, state, now = Date.now()) {
  const c = state.cards[card.id];
  if (!c) return true;       // unseen
  return now >= (c.dueAt || 0);
}

function gradeCard(state, id, grade) {
  const now = Date.now();
  const interval = INTERVALS[grade];
  state.cards[id] = {
    lastSeen: now,
    dueAt: now + interval,
    lastGrade: grade,
    seenCount: ((state.cards[id]?.seenCount) || 0) + 1,
  };
  tickStreak(state);
  saveState(state);
}

function pickNextCard(cards, state) {
  const now = Date.now();
  // Prefer unseen cards, then due cards, then any card sorted by oldest dueAt.
  const filtered = cards.filter(c => state.filter === "all" || c.topic === state.filter);
  if (filtered.length === 0) return null;
  const unseen = filtered.filter(c => !state.cards[c.id]);
  if (unseen.length > 0) return unseen[Math.floor(Math.random() * unseen.length)];
  const due = filtered.filter(c => isDue(c, state, now));
  if (due.length > 0) {
    due.sort((a, b) => (state.cards[a.id]?.dueAt || 0) - (state.cards[b.id]?.dueAt || 0));
    return due[0];
  }
  // Nothing due — pick the next-due card so the user can keep going if they want.
  filtered.sort((a, b) => (state.cards[a.id]?.dueAt || 0) - (state.cards[b.id]?.dueAt || 0));
  return filtered[0];
}

let state = loadState();
let currentCard = null;
let revealed = false;
let history = [];   // for "back"

function render() {
  // Stats
  const filtered = window.CARDS.filter(c => state.filter === "all" || c.topic === state.filter);
  const due = filtered.filter(c => isDue(c, state)).length;
  const seen = filtered.filter(c => state.cards[c.id]).length;
  document.getElementById("stat-due").textContent = due;
  document.getElementById("stat-total").textContent = filtered.length;
  document.getElementById("stat-seen").textContent = seen;
  document.getElementById("stat-streak").textContent = state.streak.count + "d";
  const pct = filtered.length === 0 ? 0 : Math.round(100 * seen / filtered.length);
  document.getElementById("progress-bar").style.width = pct + "%";

  // Topic nav
  const nav = document.getElementById("topic-nav");
  nav.innerHTML = "";
  for (const t of window.TOPICS) {
    const b = document.createElement("button");
    b.textContent = t;
    if (state.filter === t) b.classList.add("active");
    b.onclick = () => { state.filter = t; saveState(state); pickAndRender(); };
    nav.appendChild(b);
  }

  // Card area
  const area = document.getElementById("card-area");
  if (!currentCard) {
    area.innerHTML = '<div class="empty">No cards in this topic. Try another filter.</div>';
    return;
  }
  area.innerHTML = `
    <div class="card">
      <div class="topic">${currentCard.topic} · ${currentCard.id}</div>
      <div class="prompt">${currentCard.prompt}</div>
      ${revealed ? `<div class="answer">${currentCard.answer}</div>` : ''}
      <div class="actions">
        ${revealed
          ? `<div class="grade shown">
               <button class="hard" data-grade="hard">1 · hard (1d)</button>
               <button class="med"  data-grade="med">2 · medium (3d)</button>
               <button class="easy" data-grade="easy">3 · easy (7d)</button>
             </div>
             <span class="keyboard-hint">grade to advance</span>`
          : `<button class="primary" id="flip-btn">show answer · space</button>
             <button id="skip-btn">skip · n</button>
             <span class="keyboard-hint">${state.cards[currentCard.id] ? `seen ${state.cards[currentCard.id].seenCount}× · last ${state.cards[currentCard.id].lastGrade || '—'}` : 'new card'}</span>`
        }
      </div>
    </div>`;
  if (!revealed) {
    document.getElementById("flip-btn").onclick = () => { revealed = true; render(); rerenderMath(); };
    document.getElementById("skip-btn").onclick = () => pickAndRender();
  } else {
    for (const btn of document.querySelectorAll(".grade button")) {
      btn.onclick = () => grade(btn.dataset.grade);
    }
  }
  rerenderMath();
}

function rerenderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.getElementById("card-area"), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$',  right: '$',  display: false },
      ],
      throwOnError: false,
    });
  }
}

function pickAndRender() {
  if (currentCard) history.push(currentCard.id);
  if (history.length > 50) history.shift();
  currentCard = pickNextCard(window.CARDS, state);
  revealed = false;
  render();
}

function grade(g) {
  if (!currentCard) return;
  gradeCard(state, currentCard.id, g);
  pickAndRender();
}

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    if (!revealed && currentCard) { revealed = true; render(); rerenderMath(); }
  } else if (e.key === "1" && revealed) {
    grade("hard");
  } else if (e.key === "2" && revealed) {
    grade("med");
  } else if (e.key === "3" && revealed) {
    grade("easy");
  } else if (e.key === "n") {
    pickAndRender();
  } else if (e.key === "b" && history.length > 0) {
    const prevId = history.pop();
    currentCard = window.CARDS.find(c => c.id === prevId) || currentCard;
    revealed = false;
    render();
  } else if (e.key === "r") {
    state.filter = "all";
    saveState(state);
    pickAndRender();
  }
});

// Boot.
function boot() {
  pickAndRender();
}
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(boot, 0);
} else {
  document.addEventListener("DOMContentLoaded", boot);
}
