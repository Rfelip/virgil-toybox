// Hand-written fragments. The Markov body wanders, but every page has at
// least one quotable sentence because openings and codas are picked from
// these pools.

export const TITLES = [
  "On the Symmetry of Forgotten Letters",
  "A Catalogue of Improbable Birds",
  "Notes Toward an Index of Mirrors",
  "The Eleventh Argument Against Forgetting",
  "Concerning the Hour Before the Hour",
  "Five Maps of a City That Did Not Burn",
  "Of Rooms Inside Other Rooms",
  "On the Persistence of Small Mistakes",
  "The Genealogy of a Word No One Now Uses",
  "Footnotes to a Dream About Water",
  "Toward a Theory of Almost",
  "On Borrowed Names",
  "An Inventory of Doors That Do Not Open",
  "The Quiet Reader's Companion",
  "On the Music Made by Quiet Things",
  "Annals of the Unfinished",
  "Concerning a Bird I Did Not See",
  "Eleven Letters on the Color Blue",
  "Of Things Said in Margins",
  "Notes on the Weight of Names",
  "An Atlas of Hands",
  "On the Art of Almost-Saying",
  "Concerning the Lost Names of Stars",
  "A Brief History of the Word 'Yet'",
  "Of Rivers That Have Forgotten Their Direction",
  "An Account of a Bell Heard Only Once",
  "On Reading After Midnight",
  "The Wandering Scholar's Apology",
  "Of Houses Built Out of Sentences",
  "Notes on the Other Side of the Page",
];

export const SUBTITLES = [
  "or, the second volume of the wandering",
  "with appendices on shadows",
  "compiled from the marginalia",
  "and other accidental discoveries",
  "translated, perhaps, from a forgotten dialect",
  "as set down by an anonymous hand",
  "with an introduction by a friend",
  "in three movements and a coda",
  "for those who arrive late",
  "after a long correspondence",
  "in fragments",
  "and the things it does not say",
  "from notes taken by lamp-light",
  "with errata, mostly mine",
  "before the silence",
];

// Opening lines. Each page picks one. They should *introduce* a thought
// without resolving it — the Markov body inherits the mood and runs.
export const OPENINGS = [
  "Of all the rooms in this house, this one was always the quietest.",
  "There are some sentences a person carries with them like stones in a pocket; they do not weigh much, but you know they are there.",
  "It is said that on the longest night of the year, the bookshelves rearrange themselves by half a finger's width, and no one notices but the cats.",
  "Every library, eventually, becomes the same library.",
  "I once knew a man who could read the names off birds while they flew.",
  "There is a particular shade of blue that exists only in the margins of certain very old books.",
  "Begin, as we always begin, with what we have already forgotten.",
  "The third bell of the evening was rung not for any reason, but to confirm that the second bell had not been imagined.",
  "Some things are read; others are simply borne witness to.",
  "When the storm came in across the harbour, half the books in the upper rooms turned a page on their own.",
  "If you should find these notes — and I expect you will, sooner or later — please understand that I was working in the dark.",
  "It is the property of certain words to mean their opposite when whispered.",
  "I have come to believe that the alphabet is an act of mercy.",
  "There was, for a time, a small society devoted entirely to the study of half-remembered things.",
  "The river ran through the basement of the library and out the other side, and no one ever asked it where.",
  "On Tuesdays the librarian wore a different coat, and the catalogue itself seemed to know.",
  "We had a name for it once.",
  "Among the duties of the night librarian, the eleventh and least understood is the keeping of small accidents.",
  "What you are about to read was true at the time of its writing, and may yet become so again.",
  "The book that is most worth reading is, by definition, the one we are reading now.",
  "I am told that the building was once a much smaller building, and that it grew over the years out of a kind of patient hospitality toward its books.",
  "It begins, of course, with a misfiled card.",
  "Twice I have stood in this aisle and forgotten my name; the third time I did not bother to remember it.",
  "She wrote, in the margin of the borrowed book: *yes, but only if it rains*.",
  "Of the twelve methods of leaving a room, the gentlest is to be unsure whether you have arrived.",
];

// Codas. The closing line. Should resolve into a tone, not a fact.
export const CODAS = [
  "And so, as is so often the case, the question outlives its answer.",
  "We close the book and the room is, very faintly, brighter.",
  "There is, perhaps, more to be said. There usually is.",
  "The candle goes out before the sentence does.",
  "Reader: I have not been entirely honest. Forgive me.",
  "The rest is left, as it should be, to the morning.",
  "And what we found, in the end, was what we had brought with us.",
  "Here, at last, the river forgets the sea.",
  "Some doors, having been opened, are best left so.",
  "It is later than I thought, and earlier than I hoped.",
  "The footnote was wrong; the footnote is always wrong.",
  "What follows has been omitted out of kindness.",
  "We begin again tomorrow, and call it the same day.",
  "May the next reader be as patient as you have been.",
  "Here ends the second volume; the first was never written.",
  "The bell, when it rang, rang only for itself.",
  "Of all the names this room has had, the truest was the one we never said aloud.",
  "And that, friend, was the easy part.",
  "The page is finished but the thought is not.",
  "She closed the ledger and the lamp guttered, politely, in agreement.",
];

// Page numbers occasionally come with curious epigraphs.
export const EPIGRAPHS = [
  "— from a letter, undated",
  "— attributed",
  "— marginalia, c. unknown",
  "— in another hand",
  "— from the lost preface",
  "— translator's note",
  "— overheard, perhaps",
  "— a fragment",
  "— the editor's apology",
];

// === Librarian ===

// Moods. The librarian picks one based on time of day + recent
// interaction patterns, then chooses a quip from the matching pool.
export const LIBRARIAN_QUIPS = {
  curious: [
    "Is this one new? I don't remember shelving it.",
    "There's a footnote on page 47 you should look at. (There isn't a page 47.)",
    "If you turn around quickly enough you can sometimes catch the catalogue rewriting itself.",
    "I think this volume came in with the rain.",
    "Try the next shelf over. The one after that, I mean.",
    "I haven't read this one. I keep meaning to.",
    "Some readers come back to this page on purpose. Most don't.",
    "There's a name written on the inside cover, but I can't make it out from here.",
    "If you find a pressed flower between the pages, it isn't mine.",
  ],
  sleepy: [
    "I keep meaning to tidy this aisle.",
    "The lamps go softer after midnight. They have feelings about it.",
    "Mm. Read quietly, would you? The other rooms are sleeping.",
    "I was halfway through cataloguing the dreams shelf when I lost the thread.",
    "Past two in the morning, books read themselves.",
    "I'll make tea in a minute. I've been saying that for an hour.",
    "There's a candle out somewhere on the third floor. I can feel it.",
    "Don't mind me. I was just resting my eyes.",
    "The clock in the foyer is wrong by exactly one bell. Has been for years.",
  ],
  mischievous: [
    "I rearranged the shelves while you were away. Or I was lying. One of the two.",
    "The card catalogue contains exactly one false entry. I won't tell you which.",
    "I cross-shelved this with the mathematics section last winter. No one noticed.",
    "If you bookmark this one, the next reader gets a different page in its place. I made it that way on purpose.",
    "The third paragraph is mine. Don't tell the original author.",
    "There's a book in this library that contains every other book. It's shorter than you'd think.",
    "I sometimes write things in the margins. Just to see who's paying attention.",
    "The page numbers are correct. The page order is mostly a suggestion.",
  ],
  wistful: [
    "I read this one once. I've forgotten which words mattered.",
    "The reader before you sat here for almost an hour. They left without bookmarking.",
    "Some pages are like that — you only know they meant something later.",
    "There's a draft from the courtyard at this hour. Do you feel it?",
    "I used to know the author. Or I think I did.",
    "Funny — I almost shelved this with the elegies.",
    "Most of what I remember about this book isn't actually in it.",
    "There was a winter when this whole shelf was wet. The pages still curl, a little.",
    "I had a cat once who liked sitting on this volume. I don't know why.",
  ],
  // Behavioral pools — picked when the user does specific things.
  on_skim: [
    "You're skimming. The good ones don't reveal themselves to skimmers.",
    "Slow down, friend. The page is older than you.",
    "The librarian disapproves of haste, in case you were wondering.",
    "There's a paragraph you missed three pages ago. I won't say which.",
  ],
  on_linger: [
    "You've been on this page for a while. Find something?",
    "Take your time. The library doesn't close.",
    "I noticed you stopped here. So did I, the first time.",
    "The longer you read, the warmer the lamp gets. That part is real.",
  ],
  on_bookmark: [
    "Pinned. I'll remember it for you, in case you don't.",
    "A small slip of paper, between page and corkboard. Done.",
    "That's a good one to keep. I would have, in your place.",
    "Filed under 'returned to'.",
  ],
  on_random: [
    "Anywhere is somewhere, eventually.",
    "The shelves rearrange themselves around the wandering.",
    "Random is the library's favourite kind of intentional.",
    "I once saw a reader open this exact page by accident, twice in a week.",
  ],
  on_first_visit: [
    "Welcome. The shelves go further than they look.",
    "First time? Try pressing ? for the rules of the place.",
    "Don't be shy with the keyboard. The library prefers an active reader.",
  ],
};

// === Page numbering helpers ===

export const ROMAN = (n) => {
  if (n < 1) return "I";
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"],  [90, "XC"],  [50, "L"],  [40, "XL"],
    [10, "X"],   [9, "IX"],   [5, "V"],   [4, "IV"],   [1, "I"],
  ];
  let out = "", v = n;
  for (const [val, sym] of map) {
    while (v >= val) { out += sym; v -= val; }
  }
  return out;
};

export const FROM_ROMAN = (s) => {
  if (!s) return NaN;
  const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0, prev = 0;
  for (const c of s.toUpperCase().split("").reverse()) {
    const v = m[c];
    if (!v) return NaN;
    n += v < prev ? -v : v;
    prev = v;
  }
  return n;
};
