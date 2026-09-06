// Autocomplete for the two search boxes — pure ranking, no DOM.
// (suggest-ui.js owns the combobox; tests/suggest.test.js owns this.)
//
// THE SHAPE OF THE ANSWER, and it is the whole design.
//
// The owner's first instinct was to make a typed word a COMMAND: type
// "favourites", get your favourites. That is one word of chrome and it reads
// beautifully — but it silently steals a text query. This corpus has, today,
// seven dishes with "Vegetarian" in their printed name (R & S Satay Noodle
// House has three, KK Malaysian four). Under a command reading, typing
// "vegetarian" stops being able to find "Vegetarian Laksa" by name, and there
// is no way for the reader to ask for the other meaning.
//
// So a typed word never switches a mode by itself. It OFFERS the filter as a
// suggestion, alongside the text results it would have given anyway, and the
// reader picks. Choosing the suggestion turns the real chip on, which is where
// the state then lives and stays visible (ADR 0052 — "a filter that is on is
// never invisible"). Search teaches the control rather than shadowing it.
//
// That also settles the tension between the two governing ADRs. ADR 0050 says
// a property question must be answered by a filter, not by free text; 22a says
// search should be able to offer a setting or an action as a RESULT KIND. A
// suggestion that routes to the filter satisfies both — it is a result whose
// effect is to filter.
//
// INHERITED HONESTY RULE (search-hints.js states it for the placeholder, and
// it binds harder here because a suggestion is a promise about this exact
// menu): never offer a suggestion that cannot do anything. Filter candidates
// are built from the filters this venue actually offers; name candidates come
// from rows that exist. A suggestion the reader taps into an empty list is
// worse than no suggestion at all.

import { foldSearchText } from "./search.js";

/** Nothing shorter than this opens the list. One character matches most of the
 *  menu, so the panel would cover the results it is supposed to be helping
 *  with — the same threshold `search()` uses to decide a query is real. */
export const MIN_QUERY = 2;

// Words a person types for a filter whose label they would not guess, mapped
// onto filter keys. Bounded exactly as search.js's SYNONYMS map is: only
// phrases a person would actually type, only onto a filter that exists.
//
// 🛑 NOTHING HERE MAY EVER ASSERT AN ALLERGEN IS ABSENT. "gluten free" and
// "dairy free" are positive claims a venue made about a dish (the `gf`/`df`
// tags), which is why they are here and why search.js already folds "coeliac"
// onto one of them. "nut free" and its kin are NOT filters, are not tags, and
// must never become either — this repo does not assert the absence of an
// allergen, and a suggestion that appeared to would be a safety claim we have
// no basis for (ADR 0025). tests/suggest.test.js holds that line.
const FILTER_ALIASES = {
  fav: ["favourites", "favorites", "faves", "favourite", "favorite", "hearts", "hearted", "loved"],
  v: ["vegetarian", "veggie", "veg"],
  vg: ["vegan", "plant based", "plantbased", "plant-based"],
  gf: ["gluten free", "glutenfree", "gluten-free", "coeliac", "celiac", "no gluten"],
  df: ["dairy free", "dairyfree", "dairy-free", "no dairy", "lactose free"],
};

/**
 * Turn the filters a screen can actually offer into suggestion candidates.
 *
 * `terms` carries the label plus its aliases, so "veg" and "coeliac" both find
 * their chip while the row still READS as the label — a suggestion that
 * displayed the word you typed rather than the control you are about to press
 * would leave you unable to predict what the chip says afterwards.
 *
 * @param {{key: string, label: string, icon?: string}[]} filters
 * @param {(f) => string} [describe]  optional sub-line, e.g. "6 dishes"
 */
export function filterCandidates(filters, describe) {
  return (filters || []).map((f) => ({
    id: `filter:${f.key}`,
    kind: "filter",
    key: f.key,
    label: f.label,
    icon: f.icon || "",
    sub: describe ? describe(f) : "",
    terms: [f.label, ...(FILTER_ALIASES[f.key] || [])],
  }));
}

/**
 * Candidates for plain text — a dish name, a place, a cuisine. `terms`
 * defaults to the label, which is the honest default: a row that matched on
 * something the reader cannot see is a completion they cannot explain.
 */
export function textCandidate({ id, kind, label, sub = "", icon = "", terms, value }) {
  return { id, kind, label, icon, sub, value: value ?? label, terms: terms || [label] };
}

// How well `q` (already folded) matches one candidate term. The tiers mirror
// search.js's `score()` on purpose: two boxes that rank the same words
// differently is a bug nobody ever reports and everybody feels.
//   5 the term IS the query            ("veg" → "Vegetarian")
//   4 the term starts with the query   ("vega" → "Vegan")
//   3 a later word starts with it      ("free" → "Gluten free")
//   2 it appears mid-word              ("lut" → "Gluten free")
//   0 no match — dropped
//
// Tier 5 exists because of a real disagreement the tests caught. "veg" is an
// EXACT alias of Vegetarian and merely a PREFIX of Vegan, so on prefix-scoring
// alone the tie broke alphabetically and "veg" suggested Vegan. search.js's
// synonym map has already answered this question — `"veg": ["vegetarian"]` —
// and the two boxes giving one word two meanings is precisely the drift the
// comment above warns about. An exact hit on a term someone actually typed is
// a stronger signal than a prefix, so it gets its own tier rather than a
// special case for this pair.
function termScore(term, q) {
  const t = foldSearchText(term);
  if (t === q) return 5;
  if (t.startsWith(q)) return 4;
  if (t.includes(" " + q)) return 3;
  if (t.includes(q)) return 2;
  return 0;
}

/**
 * Rank `candidates` for `query`. Returns at most `limit`, best first.
 *
 * A filter outranks a text completion at equal score, and that ordering is
 * deliberate: the reader who types "veg" and means the chip gets it in one
 * keystroke-and-a-tap, while the reader who means the dish still sees
 * "Vegetarian Laksa" directly underneath. The costly mistake is the other way
 * round — burying the filter under twenty dish names is the same as not having
 * built it, because nobody scrolls an autocomplete.
 *
 * Ties below that break on label, so the list is stable between keystrokes;
 * a suggestion list that reshuffles under a moving finger causes mis-taps.
 */
export function rankSuggestions(query, candidates, { limit = 6 } = {}) {
  const q = foldSearchText(String(query || "").trim());
  if (q.length < MIN_QUERY) return [];
  const scored = [];
  for (const c of candidates || []) {
    let best = 0;
    for (const term of c.terms || []) best = Math.max(best, termScore(term, q));
    if (best > 0) scored.push({ c, s: best });
  }
  const kindRank = (c) => (c.kind === "filter" ? 0 : 1);
  scored.sort(
    (a, b) =>
      b.s - a.s ||
      kindRank(a.c) - kindRank(b.c) ||
      a.c.label.localeCompare(b.c.label)
  );
  return scored.slice(0, limit).map((x) => x.c);
}
