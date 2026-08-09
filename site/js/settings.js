// User preferences for the home-screen ranking and menu-page branch display —
// device-local, like the order tally and favourites. Two distance dials the
// owner asked to expose:
//
//  - favBoostKm: originally a home-ranking "treat a favourite as this much
//    nearer" pull; that ranking use went inert once ordering became pure
//    distance (see ranking.js — owner ruling 2026-07-23). Repurposed as the
//    branch-proximity cutoff for multi-location venues: on a chain's menu
//    page, show the 2 nearest branches within this distance (locations.js
//    branchesToShow). The storage key keeps its old name so existing
//    viewers' saved values aren't reset by a label change.
//  - farKm: beyond this straight-line distance a venue is "another town" and
//    sinks below everything reachable (and the shuffle skips it).
//
// Also here: the food preferences, the UI language, the maps app, and the
// metric/imperial display choice (units.js).
//
// farKm only bites once we know your location ("Near me"); favBoostKm bites
// on any multi-location venue's menu page regardless. Stored in
// localStorage; sanitised + clamped on read so a hand-edited or corrupt
// value can't break ranking. Pure/DOM-free and unit-tested.

import { profileScopedStorage } from "./profiles.js";
import { FAR_KM, FAV_BOOST_KM } from "./ranking.js";
import { UNITS, DEFAULT_UNITS } from "./units.js";

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

// UI language for the app chrome (not the menu content). English is the
// source; "mi" is te reo Māori. Kept here (not in reo.js) so the store has no
// dependency on the presentation layer and the value is sanitised on read.
export const LANGS = ["en", "mi"];

// Which maps app opens when you tap a venue's address (geo.js). "auto" follows
// the device (Apple Maps on Apple hardware, Google elsewhere); the rest force a
// provider on every platform. The web can't read the OS default-maps-app
// preference, so this is how a viewer overrides the device guess.
export const MAPS_APPS = [
  { key: "auto", label: "Match my device" },
  { key: "apple", label: "Apple Maps" },
  { key: "google", label: "Google Maps" },
  { key: "waze", label: "Waze" },
];
const MAPS_APP_KEYS = new Set(MAPS_APPS.map((m) => m.key));

// Metric or imperial, for distances and oven temperatures (units.js, ADR
// 0029). A DISPLAY preference only — favBoostKm/farKm below stay kilometres
// and the recipe data stays °C whatever this says, so nothing stored can ever
// drift with it.
export { UNITS } from "./units.js";

export const DEFAULTS = {
  favBoostKm: FAV_BOOST_KM,
  farKm: FAR_KM,
  diet: { dietary: [], avoid: [] },
  lang: "en",
  mapsApp: "auto",
  units: DEFAULT_UNITS,
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

/** Exported because import (personal-data.js) has to *compare* two diet
 *  objects before it may touch either — an incoming file's allergen prefs are
 *  safety data and never overwrite silently, so the comparison has to run on
 *  the same cleaned, canonically-ordered shape the store persists. */
export function sanitiseDiet(d) {
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
    lang: LANGS.includes(obj?.lang) ? obj.lang : DEFAULTS.lang,
    mapsApp: MAPS_APP_KEYS.has(obj?.mapsApp) ? obj.mapsApp : DEFAULTS.mapsApp,
    units: UNITS.includes(obj?.units) ? obj.units : DEFAULTS.units,
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

// Per-profile: dietary/allergen prefs are safety-critical and differ per
// person, so the whole settings store is namespaced by the active profile (see
// ADR 0012 for why the reo language rides along per-profile too).
export const settings = createSettings(profileScopedStorage());
