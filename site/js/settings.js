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

// Personal food preferences (device-local). `dietary` pre-selects the menu's
// dietary chips; `avoid` foregrounds matching allergen warnings. Both are
// subsets of the closed tag vocabulary (docs/ARCHITECTURE.md). Load-bearing
// safety framing: this *surfaces* our tags, it never asserts safety — "no tag
// = not stated", never "allergen-free". A filter/highlight, not a guarantee.
export const DIETARY_PREFS = [
  { key: "v", label: "Vegetarian" },
  { key: "vg", label: "Vegan" },
  { key: "gf", label: "Gluten free" },
  { key: "df", label: "Dairy free" },
];
export const ALLERGEN_PREFS = [
  { key: "contains-nuts", label: "Nuts" },
  { key: "contains-peanuts", label: "Peanuts" },
  { key: "contains-shellfish", label: "Shellfish" },
  { key: "contains-egg", label: "Egg" },
  { key: "contains-dairy", label: "Dairy" },
  { key: "contains-gluten", label: "Gluten" },
  { key: "contains-soy", label: "Soy" },
  { key: "contains-sesame", label: "Sesame" },
];
const DIETARY_KEYS = new Set(DIETARY_PREFS.map((p) => p.key));
const ALLERGEN_KEYS = new Set(ALLERGEN_PREFS.map((p) => p.key));

export const DEFAULTS = {
  favBoostKm: FAV_BOOST_KM,
  farKm: FAR_KM,
  diet: { dietary: [], avoid: [] },
};

// [min, max] accepted for each; values outside are clamped in, non-numbers
// fall back to the default.
export const BOUNDS = { favBoostKm: [0, 50], farKm: [1, 500] };

function clampField(value, key) {
  const [lo, hi] = BOUNDS[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULTS[key];
  return Math.min(hi, Math.max(lo, value));
}

// Keep only known keys, in vocabulary order, deduped — a hand-edited or stale
// value can't smuggle in a bogus tag that would never match a dish.
function cleanKeys(arr, allowed) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (allowed.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function sanitiseDiet(d) {
  return {
    dietary: cleanKeys(d?.dietary, DIETARY_KEYS),
    avoid: cleanKeys(d?.avoid, ALLERGEN_KEYS),
  };
}

function sanitise(obj) {
  return {
    favBoostKm: clampField(obj?.favBoostKm, "favBoostKm"),
    farKm: clampField(obj?.farKm, "farKm"),
    diet: sanitiseDiet(obj?.diet),
  };
}

export function createSettings(storage) {
  const subs = new Set();

  function read() {
    try {
      return sanitise(JSON.parse(storage.getItem(KEY) || "{}"));
    } catch {
      return sanitise({}); // fresh defaults (never alias DEFAULTS' arrays)
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
      state = sanitise({}); // fresh defaults (never alias DEFAULTS' arrays)
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
