// User preferences for the home-screen ranking and menu-page branch display —
// device-local, like the order tally and favourites. Two distance dials the
// owner asked to expose:
//
//  - favBoostKm: originally a home-ranking "treat a favourite as this much
//    nearer" pull; that ranking use went inert once ordering became pure
//    distance (see ranking.js — owner ruling 2026-07-23). Repurposed as the
//    branch-proximity cutoff for multi-location venues: on a chain's menu
//    page, a branch further than this is not offered (locations.js
//    branchCard). The storage key keeps its old name so existing
//    viewers' saved values aren't reset by a label change.
//    #!## The name is now a lie in both directions: it is not a favourites
//    boost and it is not a boost. It is the branch distance limit, and that is
//    what the UI calls it. Renaming the key needs a migration in store.js.
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
import { FAR_KM, FAV_BOOST_KM } from "./defaults.js";
import { UNITS, DEFAULT_UNITS } from "./units.js";
import { localLanguage, localUnits } from "./locale.js";

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

// The three localisation settings — language, units, currency — each accept
// this in place of a concrete value: "show me what people here use" (ADR 0045).
// It is STORED as "local" and resolved on every read, so a phone that flies to
// London starts answering differently without anyone touching a setting.
export const LOCAL = "local";

// Show prices the way the place charges them — no conversion at all. Kept
// distinct from a concrete currency because it is not a preference for NZD or
// anything else: it is a preference for the shop's own number.
export const AS_CHARGED = "as-charged";

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
  // All three localisation settings default to LOCAL. For a reader at home
  // that resolves to exactly what they had before — English, metric, NZD — so
  // the default costs nobody a change; for a reader abroad it is the answer
  // they would have had to go and set by hand.
  lang: LOCAL,
  mapsApp: "auto",
  units: LOCAL,
  currency: LOCAL,
  // Whether the recipe page's ingredient list starts folded away (37c, owner
  // ruling 2026-08-16: remember it for ALL recipes, not one flag per recipe).
  // It rides the settings store rather than a store of its own because a brand
  // new `faves.` key is swept into the backup export by personal-data.js's
  // catch-all and then never restored — exported but not restorable is the
  // defect the "ticks must leave the backup export" item exists to fix, and one
  // instance of it is enough. Deliberately NOT on the settings screen: it is
  // set by folding the panel, which is where anyone would look for it.
  ingredientsFolded: false,
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

// A currency preference is LOCAL, AS_CHARGED, or an ISO 4217 code. The code is
// shape-checked only: which codes are actually offered depends on the rate
// table the app loaded (fx.js), and a store must not fail closed because a rate
// file was slow — it would silently reset a viewer's choice.
const CURRENCY_RE = /^[A-Z]{3}$/;
const validCurrency = (v) => v === LOCAL || v === AS_CHARGED || (typeof v === "string" && CURRENCY_RE.test(v));

function sanitise(obj) {
  return {
    favBoostKm: clampField(obj?.favBoostKm, "favBoostKm"),
    farKm: clampField(obj?.farKm, "farKm"),
    diet: sanitiseDiet(obj?.diet),
    lang: obj?.lang === LOCAL || LANGS.includes(obj?.lang) ? obj.lang : DEFAULTS.lang,
    mapsApp: MAPS_APP_KEYS.has(obj?.mapsApp) ? obj.mapsApp : DEFAULTS.mapsApp,
    units: obj?.units === LOCAL || UNITS.includes(obj?.units) ? obj.units : DEFAULTS.units,
    currency: validCurrency(obj?.currency) ? obj.currency : DEFAULTS.currency,
    ingredientsFolded: obj?.ingredientsFolded === true,
  };
}

/**
 * The stored settings with every LOCAL resolved to a concrete value.
 *
 * This is what `get()` returns, so no consumer anywhere has to know that
 * "local" exists — `settings.get().units` is always "metric" or "imperial",
 * exactly as it has always been. The settings SCREEN wants the unresolved
 * value (to show which option is ticked), and calls `raw()` for it.
 *
 * Currency is deliberately NOT resolved here. It cannot be: the answer depends
 * on the venue whose price is being rendered and on which rates loaded, neither
 * of which the store knows about. `place.js` resolves it per price.
 */
function resolveLocals(state) {
  if (state.lang !== LOCAL && state.units !== LOCAL) return state;
  return {
    ...state,
    lang: state.lang === LOCAL ? localLanguage(LANGS) : state.lang,
    units: state.units === LOCAL ? localUnits() : state.units,
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
  // Resolution is recomputed on every read rather than cached: a device that
  // changes timezone mid-session (a phone landing, or a laptop waking in a new
  // country) must start answering differently without a reload.

  function commit() {
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* blocked — in-memory state still drives ranking this session */
    }
    for (const fn of subs) fn(state);
  }

  return {
    get: () => resolveLocals(state),
    /** The stored preference, LOCALs unresolved — for the settings screen. */
    raw: () => state,
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
