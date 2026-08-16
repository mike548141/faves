// Ticking off a recipe as you cook it (ROADMAP 17e). The model half; the boxes
// themselves are `checklist-ui.js`, and both surfaces that render a recipe —
// the recipe page and cook mode — draw from this one store.
//
// WHY IT PERSISTS AT ALL, when ADR 0034 deliberately refused to persist the
// step index. Those are two different facts. "Where I am" is a position, and a
// recipe reopened a week later that resumes at step 7 is a bug wearing a
// feature's clothes — ADR 0034 was right to drop it. "What I have already put
// in the bowl" is a fact about the food in front of you, and losing it to a
// phone call is exactly the failure the roadmap bullet names. So this survives
// a reload, a phone call and closing cook mode.
//
// …AND WHY IT STILL EXPIRES. A recipe cooked twice must not start half-ticked,
// so the tension ADR 0034 identified is answered by a clock rather than by
// forgetting immediately: a record untouched for STALE_MS is dropped when the
// store is next read from disk. Twelve hours is one cooking session either side
// of a nap; it is long enough that nothing you are cooking now can expire under
// you, and short enough that Saturday's ticks are gone by Sunday. Expiry is
// evaluated ON READ FROM DISK only (construction and reload()), never on a
// timer — a session that has been open all day must not have its ticks vanish
// mid-stir.
//
// IDENTITY: THE RECIPE BY ID, THE LINE BY ITS TEXT. Two different rules, and
// both matter.
//   • The recipe is keyed on `venueId + dishId` (ADR 0051), never on its name
//     and never on its position in the collection — the same identity hearts
//     and ratings use, for the same reason.
//   • A LINE inside the recipe has no id to key on: `ingredients` and `steps`
//     are flat lists of free text and nothing in the data names one. The index
//     is the obvious handle and the wrong one — insert a line at the top and
//     every tick below it slides onto the wrong ingredient, which in a kitchen
//     means "I already added the salt" pointing at the sugar. So a line is
//     keyed on a short hash of ITS OWN TEXT: a line that moves keeps its tick,
//     a line that is edited quietly loses only its own, and a line that is
//     deleted takes its tick with it. Two lines with identical text share one
//     tick, which is the same answer a reader would give.
//
// HASH THE DATA, NEVER THE RENDER. Steps and ingredients are rendered through
// `convertTemperatures` (ADR 0029), so the words on screen change when the
// reader flips to imperial. Hashing what is displayed would drop every tick on
// a units change; every caller therefore passes the RAW line from the data.
//
// STORAGE follows the house convention exactly (profiles.js): one JSON blob
// under one key, read through `profileScopedStorage()` so it is namespaced by
// whoever is active. Cooking progress belongs to the person cooking.

import { dishId } from "./dish-id.js";
import { profiles, profileScopedStorage } from "./profiles.js";

export const CHECKLIST_KEY = "faves.checklist.v1";

/** A record untouched for this long is dropped the next time the store loads. */
export const STALE_MS = 12 * 60 * 60 * 1000;

/**
 * FNV-1a, 32-bit, base-36. Not a security primitive and never used as one — it
 * exists to turn one line of recipe text into a short stable key. A recipe has
 * tens of lines, so a collision would need two different lines to land on the
 * same 32-bit value within one recipe; the cost if it ever happened is one tick
 * shared by two lines, not corruption.
 */
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * The key for one tickable line. `kind` is "i" (ingredient) or "s" (step), so a
 * step and an ingredient that happen to read identically stay two ticks.
 * Whitespace is normalised because a reflowed data file is not an edit.
 */
export function lineId(kind, text) {
  return `${kind}:${fnv1a(String(text ?? "").replace(/\s+/g, " ").trim())}`;
}

/** The key for a whole recipe: venue + dish id (ADR 0051), never the name. */
export function recipeId(venueId, item) {
  return `${venueId ?? ""} ${dishId(item ?? {})}`;
}

/** Coerce anything read out of storage into `{ recipeId: { at, t: [...] } }`. */
export function sanitiseTicks(raw, { now = Date.now(), staleMs = STALE_MS } = {}) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, rec] of Object.entries(raw)) {
    if (!key || !rec || typeof rec !== "object") continue;
    const at = Number(rec.at);
    // No timestamp is treated as expired rather than as immortal: a record we
    // cannot age is exactly the record that would still be here next month.
    if (!Number.isFinite(at) || now - at > staleMs) continue;
    const t = Array.isArray(rec.t) ? [...new Set(rec.t.filter((x) => typeof x === "string" && x))] : [];
    if (!t.length) continue;
    out[key] = { at, t };
  }
  return out;
}

/**
 * The store. `storage` and `now` are injected so the whole lifecycle — expiry
 * included — is provable under `node --test` without a browser or a clock.
 */
export function createChecklist(storage, now = () => Date.now()) {
  const subs = new Set();

  function read() {
    try {
      return sanitiseTicks(JSON.parse(storage.getItem(CHECKLIST_KEY) || "null"), { now: now() });
    } catch {
      return {};
    }
  }

  let ticks = read();

  function commit() {
    try {
      storage.setItem(CHECKLIST_KEY, JSON.stringify(ticks));
    } catch {
      /* blocked/over quota — in-memory ticks still drive this session's boxes */
    }
    for (const fn of subs) fn(ticks);
  }

  return {
    /** Every line ticked for this recipe, as a Set. Never null. */
    ticked: (rid) => new Set(ticks[rid]?.t || []),
    has: (rid, id) => !!ticks[rid]?.t.includes(id),
    count: (rid) => ticks[rid]?.t.length || 0,

    /**
     * Tick or untick one line. Takes the state to WRITE rather than flipping
     * what is stored: the checkbox the reader just clicked is the truth, and a
     * blind flip would fight it if two copies of a line are on screen at once
     * (cook mode sits over the recipe page showing the same ingredients).
     */
    set(rid, id, on) {
      const current = ticks[rid]?.t || [];
      const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id);
      // A record with nothing ticked is deleted rather than kept empty, so the
      // store holds only recipes with something in them.
      ticks = next.length
        ? { ...ticks, [rid]: { at: now(), t: next } }
        : Object.fromEntries(Object.entries(ticks).filter(([k]) => k !== rid));
      commit();
      return on;
    },

    /** Start again — the "cooked twice" reset. Silent no-op if nothing is ticked. */
    clear(rid) {
      if (!ticks[rid]) return false;
      ticks = Object.fromEntries(Object.entries(ticks).filter(([k]) => k !== rid));
      commit();
      return true;
    },

    /** Re-read from storage — after a profile switch, or a cross-tab write. */
    reload() {
      ticks = read();
      for (const fn of subs) fn(ticks);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per-profile: what you have already put in the bowl is yours, not the next
// person's. Same wrapper favourites/ratings/settings use, so a profile switch
// plus reload() re-points it with them.
export const checklist = createChecklist(profileScopedStorage());

// A profile switch must not leave the previous person's ticks on screen. The
// other per-profile stores are re-pointed by `reloadProfileStores()` because
// their reload ORDER is load-bearing (profiles.js: settings must go last, since
// its subscribers drive the allergen re-render). A tick has no such constraint
// — nothing safety-critical repaints from one — so this store follows the
// registry itself, which makes it correct on every screen rather than only on
// the ones that remembered to pass it along.
profiles.subscribe(() => checklist.reload());
