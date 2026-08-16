// Personal ratings — the third device-local personal feature (after the order
// tally and favourites). A rating is a 1–5 score the *viewer* gives a venue or
// a dish, stored in localStorage only: per-profile, never in the repo, never
// sent anywhere. NO averaging across profiles, NO sharing, NO public/crowd
// ratings — those need a backend + moderation + accounts and break three
// non-goals (STRATEGY). See ADR 0013, and ADR 0019 for the move to a 1–5 star
// scale + slider control. This is the local-only half only.
//
// The 1–5 scale matches the curated household scale (the optional static
// `rating` in the data), so personal and curated marks share one vocabulary —
// but they stay visually and structurally distinct: this is the user's own,
// *unverified* mark (ratings-ui.js styles it apart), the same principle as the
// recorded personal-tags design note.
//
// REFERENCE INTEGRITY (ADR 0020) is inherited whole from favourites, because
// `ratingKey` and `favKey` are byte-identical: a rating whose dish has gone is
// the same stale-vs-removed question, resolved by the same `recheckReferences`
// (data.js) and worded from the same copy table. The one thing this store does
// NOT get is a screen of its own — there is no "your ratings" view, so an
// unresolved rating is only ever reachable through the Favourites row that
// shares its key. That is why removing such a row clears the rating with it
// (app.js `forget`), saying so before and after: leaving it would strand a mark
// with nothing on any screen that could reach it again. A rated dish that was
// never hearted still has nowhere to surface — noted, not solved.
//
// Identity mirrors favourites (favourites.js): a venue by id, a dish by
// venueId + dish id (ADR 0051) — so the same `{ type, venueId, name, dishId? }`
// entry shape works for hearts and ratings alike. Stored as a flat
// `{ key: 1..5 }` map, sanitised on read so a hand-edited or corrupt value
// can't smuggle in an out-of-range mark. Old 1..3 SCORES stay valid (they're
// within 1..5), so no value ever migrates; the KEYS do (see read()).

import { profileScopedStorage } from "./profiles.js";
import { migrateRatingKeys } from "./renames.js";
import { dishId, migrateDishKeys } from "./dish-id.js";

const KEY = "faves.ratings.v1";

export const MIN = 1;
export const MAX = 5;

/** Stable identity of a rated thing — byte-identical to favourites' favKey, and
 *  deliberately so: one vocabulary for hearts and marks means a change to one
 *  that forgot the other would show up immediately rather than as drift. */
export const ratingKey = (e) =>
  e.type === "venue" ? `v:${e.venueId}` : `d:${e.venueId} ${dishId(e)}`;

/**
 * Coerce any incoming value to an integer score in [MIN, MAX], or 0 for
 * "unset". A non-finite or below-MIN value clears (0); anything at or above MAX
 * clamps down to MAX; fractions round to the nearest step. This is the single
 * gate every write and every read passes through, so a bogus value can never
 * persist or render.
 */
export function clampRating(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < MIN) return 0;
  return Math.min(MAX, n);
}

function sanitise(obj) {
  const out = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const r = clampRating(v);
      if (r) out[k] = r; // drop unset/invalid entries entirely
    }
  }
  return out;
}

export function createRatings(storage) {
  const subs = new Set();

  function read() {
    // Two key migrations, venue half then dish half (see dish-id.js on the
    // order). A rating is stored as a KEY STRING holding the dish's name, so
    // unlike a favourite — stored as an entry object and re-keyed on read — it
    // genuinely has to be rewritten. Both are non-destructive and idempotent,
    // so this runs on every read forever with no "have I migrated" flag.
    try {
      const raw = JSON.parse(storage.getItem(KEY) || "{}");
      return sanitise(migrateDishKeys(migrateRatingKeys(raw)));
    } catch {
      return {};
    }
  }

  let map = read();

  function commit() {
    try {
      storage.setItem(KEY, JSON.stringify(map));
    } catch {
      /* blocked/over quota — in-memory state still drives the UI this session */
    }
    for (const fn of subs) fn(map);
  }

  return {
    /** The 1..5 score for `entry`, or 0 when unrated. */
    get: (entry) => map[ratingKey(entry)] || 0,
    has: (entry) => !!map[ratingKey(entry)],
    count: () => Object.keys(map).length,

    /**
     * Set a 1..5 rating for `entry`; a value that clamps to 0 clears it.
     * Returns the stored score (0 = now cleared). Idempotent — re-setting the
     * same value is a no-op (no commit, no subscriber churn), so a stray
     * re-tap of the current star never fires a spurious change.
     */
    set(entry, value) {
      const k = ratingKey(entry);
      const r = clampRating(value);
      if (r === (map[k] || 0)) return r;
      map = { ...map };
      if (r) map[k] = r;
      else delete map[k];
      commit();
      return r;
    },

    /** Remove any rating for `entry`. Returns whether one was present. */
    clear(entry) {
      const k = ratingKey(entry);
      if (!map[k]) return false;
      map = { ...map };
      delete map[k];
      commit();
      return true;
    },

    reload() {
      map = read();
      for (const fn of subs) fn(map);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per-profile: a rating is the viewer's own, so it belongs to whoever is
// browsing — the same scoping as favourites (ADR 0012). profileScopedStorage
// namespaces the key by the active profile, so a switch + reload() re-points it.
// Its base key is registered in profiles.js SCOPED_BASE_KEYS so migration copies
// it forward and deleting a profile purges it.
export const ratings = createRatings(profileScopedStorage());
