// User preferences for the home-screen ranking — device-local, like the
// order tally and favourites. Two distance dials the owner asked to expose:
//
//  - favBoostKm: how much nearer a favourite is *treated* as being, so a
//    favourite gets pull without simply always beating distance. A
//    favourite 30 km away (boost 10 → "effective" 20 km) can still sit below
//    a non-favourite 2 km away, while a favourite 8 km away (→ −2) beats it.
//  - farKm: beyond this straight-line distance a venue is "another town" and
//    sinks below everything reachable (and the shuffle skips it).
//
// Both only bite once we know your location ("Near me"). Stored in
// localStorage; sanitised + clamped on read so a hand-edited or corrupt
// value can't break ranking. Pure/DOM-free and unit-tested.

import { safeStorage } from "./store.js";
import { FAR_KM, FAV_BOOST_KM } from "./ranking.js";

const KEY = "faves.settings.v1";

export const DEFAULTS = { favBoostKm: FAV_BOOST_KM, farKm: FAR_KM };

// [min, max] accepted for each; values outside are clamped in, non-numbers
// fall back to the default.
export const BOUNDS = { favBoostKm: [0, 50], farKm: [1, 500] };

function clampField(value, key) {
  const [lo, hi] = BOUNDS[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULTS[key];
  return Math.min(hi, Math.max(lo, value));
}

function sanitise(obj) {
  return {
    favBoostKm: clampField(obj?.favBoostKm, "favBoostKm"),
    farKm: clampField(obj?.farKm, "farKm"),
  };
}

export function createSettings(storage) {
  const subs = new Set();

  function read() {
    try {
      return sanitise(JSON.parse(storage.getItem(KEY) || "{}"));
    } catch {
      return { ...DEFAULTS };
    }
  }

  let state = read();

  function commit() {
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* blocked — in-memory state still drives ranking this session */
    }
    for (const fn of subs) fn(state);
  }

  return {
    get: () => state,
    /** Merge a partial change ({favBoostKm} and/or {farKm}); values clamped. */
    set(patch) {
      state = sanitise({ ...state, ...patch });
      commit();
    },
    reset() {
      state = { ...DEFAULTS };
      commit();
    },
    reload() {
      state = read();
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const settings = createSettings(safeStorage());
