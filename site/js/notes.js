// Personal notes on a recipe (ROADMAP 17e) — "used half the sugar, better".
// Profile-scoped free text, one note per recipe, stored in localStorage only:
// this is the fourth personal-layer store after favourites, ratings and the
// cook-mode ticks, and the third of those four that TRAVELS (see profiles.js
// SCOPED_BASE_KEYS) — a note is a judgement the reader composed about a
// recipe, exactly like a rating, and belongs in the export (Theme 12) and in
// sync (Theme 9 v2) for the same reason.
//
// SUBSTITUTIONS ARE OUT. 17e names two bullets; this file is only the first.
// A substitution ("no buttermilk → milk + lemon") is content the OWNER has to
// curate — a wrong one ruins a dinner — and nothing here reads, writes or
// renders one. A personal note is the opposite case on purpose: it is the
// reader's own text about their own cooking, never checked against anything,
// and never mistaken for a curated fact.
//
// IDENTITY: THE RECIPE, KEYED THE SAME WAY CHECKLIST TICKS ARE. `recipeId`
// (checklist.js) is `venueId + " " + dishId(item)` — the dish id, not the
// name, so a recipe renamed on the page (ADR 0051: `dishId` is a stored fact,
// never derived from the name) keeps the same key and the same note. There is
// no line-level id here, unlike a checklist tick: a note is about the WHOLE
// recipe, not about one ingredient or step.
//
// ONE NOTE PER RECIPE, A PLAIN STRING. Unlike a checklist record (which is a
// list of ticked line-hashes plus a timestamp) the stored value is just the
// note's own text — the same shape `ratings.js` uses for its `{key: value}`
// map, and deliberately so: it lets this store go through `mergeMap`
// (sync-merge.js) unchanged, the same three-way merge ratings already use.
// See sync-merge.js's own header for why nothing in this layer carries a
// clock and so cannot do true last-write-wins; the merge here settles on the
// same DETERMINISTIC tie-break ratings do, not a chronological one.
//
// FREE TEXT, RENDERED AS CHARACTERS, NEVER PARSED. Same rule as the order
// line's note (Theme 14c, cart.js `normaliseNote` / tools/note_check.mjs):
// whitespace runs collapsed, ends trimmed, length capped, and every renderer
// (notes-ui.js, cook-ui.js) writes it through `textContent` only.
//
// NO EXPIRY, UNLIKE THE CHECKLIST. A tick expires because "what I already put
// in the bowl" stops meaning anything after the meal; "I used half the sugar
// and it was better" is exactly as useful next month as it is today, so this
// store keeps a note until the reader clears it or deletes the recipe's
// profile.

import { profileScopedStorage } from "./profiles.js";
import { rawOf } from "./store.js";
import { recipeId } from "./checklist.js";

export const NOTES_KEY = "faves.notes.v1";

// Bounded so a note stays a note and not a second recipe pasted in. Long
// enough for "used half the sugar, better — also good with brown butter",
// short of anything that would want its own field. Enforced here (the single
// gate every write passes through) and mirrored by the UI's own maxlength
// (notes-ui.js) and by personal-data.js's import sanitiser, which imports this
// constant rather than hard-coding a second number.
export const MAX_NOTE = 240;

/** Collapse whitespace, trim, cap length. `""` for anything that isn't a
 *  string — the single gate every write and every import passes through, so a
 *  bogus value (or an over-length one smuggled in from a shared/imported
 *  payload) can never persist or render. */
export function normaliseNoteText(v) {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE);
}

// Re-exported so a caller needs one import for both halves of a note's key —
// mirrors shopping.js's re-export of the same function for the same reason.
export { recipeId };

function sanitise(obj) {
  const out = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k !== "string" || !k) continue;
      const text = normaliseNoteText(v);
      if (text) out[k] = text; // drop empty/invalid entries entirely
    }
  }
  return out;
}

export function createNotes(storage) {
  const subs = new Set();

  // The raw string this page last read or wrote: a change made in another
  // tab or page is caught up with before this one writes the whole map back
  // over it (roadmap 510/320; the reasoning is favourites.js's, same shape).
  let seen = null;

  function read() {
    seen = rawOf(storage, NOTES_KEY);
    try {
      return sanitise(JSON.parse(seen || "{}"));
    } catch {
      return {};
    }
  }

  let map = read();

  function notify() {
    for (const fn of subs) fn(map);
  }

  /** Catch up with a write made elsewhere; tells the page when it did. */
  function fresh() {
    if (rawOf(storage, NOTES_KEY) === seen) return;
    map = read();
    notify();
  }

  function commit() {
    try {
      const next = JSON.stringify(map);
      storage.setItem(NOTES_KEY, next);
      seen = next;
    } catch {
      /* blocked/over quota — in-memory state still drives the UI this session */
    }
    notify();
  }

  return {
    /** The note text for `rid` (checklist.js `recipeId`), or `""` when none. */
    get: (rid) => map[rid] || "",
    has: (rid) => !!map[rid],
    count: () => Object.keys(map).length,

    /**
     * Set the note for `rid`. Text that normalises to `""` clears it — the
     * same "empty means gone" rule the order-line note uses. Returns the
     * stored (normalised) text. Idempotent: re-saving the same text is a
     * no-op, so tapping Save without changing anything never churns a
     * subscriber or schedules a sync push for nothing.
     */
    set(rid, text) {
      const next = normaliseNoteText(text);
      fresh();
      if ((map[rid] || "") === next) return next;
      map = { ...map };
      if (next) map[rid] = next;
      else delete map[rid];
      commit();
      return next;
    },

    /** Remove any note for `rid`. Returns whether one was present. */
    clear(rid) {
      fresh();
      if (!map[rid]) return false;
      map = { ...map };
      delete map[rid];
      commit();
      return true;
    },

    reload() {
      map = read();
      notify();
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per-profile: a note is the writer's own, like a rating — the same scoping
// as favourites/ratings (ADR 0012). Its base key is registered in profiles.js
// SCOPED_BASE_KEYS so migration copies it forward, export/sync carry it, and
// deleting a profile purges it.
export const notes = createNotes(profileScopedStorage());
