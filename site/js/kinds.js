// What a `kind` of record can do, declared once instead of asked forty times.
//
// ADR 0003 chose one shape for everything the app holds, discriminated by
// `kind` ("venue", the default, or "recipes"), and said the venue-only fields
// *relax* for a recipe collection: no address, no hours, no contact card, no
// price. That relaxation was never written down anywhere the code could read —
// it lived as ~40 scattered `kind === "recipes"` conditionals across eight
// modules, so every screen started from "restaurant" and reasoned its way to
// "not that". This module IMPLEMENTS ADR 0003 rather than superseding it: the
// prose becomes a table, and a screen asks "does this have hours?" instead of
// "is this a recipe?".
//
// Two consequences worth stating, because they are the reason to prefer this
// over the conditionals:
//
//   1. A missing capability becomes NAMEABLE. "Cook at Home has no location"
//      is now a fact the code states, so a ranking that sorts by distance can
//      be asked whether it respects it. Under the old conditionals the same
//      fact existed only as the *absence* of a branch, which is unaskable.
//   2. The next `kind` costs one row here plus nothing at the call sites.
//
// Rules for editing this table:
//   • Add a capability only when a call site reads it. A flag nothing asks is
//     the same dead weight ADR 0047 keeps out of `site/data/`.
//   • A capability answers "what can this do / what does it have", never "what
//     is this". Identity survives in exactly one exported place below
//     (`isRecipeKind`) and its comment says why it has to.
//   • Pure: no DOM, no storage, no clock. Unit-tested in tests/kinds.test.js.

export const VENUE = "venue";
export const RECIPES = "recipes";

// Words a kind supplies for itself. These are NOT capabilities — they are what
// the kind is called — but they live here so that naming a kind is a lookup
// rather than a `kind === "recipes"` ternary at each of the dozen places that
// needs a noun. `null` means "this kind has nothing of its own to say here",
// and the call site keeps whatever it did before.
const VENUE_LABELS = {
  icon: "🍽️",
  chip: null, // a venue's card chips are its price band and cuisines
  cardModifier: null,
  itemModifier: null,
  itemNoun: null, // a venue's card never counts its dishes
  browseLabel: null, // the suburb and services say where and how instead
  tagline: null, // the menu header uses the cuisine/area facet links
  stubChip: "Menu coming soon",
  // null, not a string: an empty venue menu says something different when we
  // hold a phone number ("call ahead"), so menu.js keeps that choice.
  emptyMenuNote: null,
  searchPlaceholder: { text: "Search this menu…", key: "menu.search.ph" },
};

const RECIPES_LABELS = {
  icon: "🏠",
  chip: { text: "🏠 Recipes", className: "chip-recipes" },
  cardModifier: "card-recipes",
  itemModifier: "recipe",
  itemNoun: "recipe",
  browseLabel: "Cook at home",
  tagline: "Recipes for the nights you'd rather stay in",
  stubChip: "Recipes coming soon",
  emptyMenuNote: { key: "recipe.stub", text: "Recipes coming soon." },
  searchPlaceholder: { text: "Search recipes…", key: "menu.search.recipes.ph" },
};

const KINDS = {
  [VENUE]: {
    id: VENUE,
    // —— capabilities ——
    hasLocation: true, // an address and coordinates: distance, detour, maps, a route destination
    hasHours: true, // a weekly timetable: the open/closed badge and the availability tier
    hasPrices: true, // money on the menu: the price band, the price chip, the dish price
    canOrder: true, // a tally you read down the phone: the stepper and add-ons
    canReport: true, // a ⚑ on a dish — there is a shop whose facts we could have wrong
    hasFreshness: true, // a `verified` reading to age: the ⓘ "needs a refresh" caveat
    inFacets: true, // belongs in the area/cuisine dropdowns, and links them from its heading
    pinnedFirst: false, // takes its place in the ranking on its merits
    hasContactCard: true, // the phone/address/order aside beside the menu
    itemsHaveRecipeFields: false, // no serves/time/ingredients/steps on a dish
    itemPage: null, // a dish's detail is already inline on the menu
    // —— words ——
    labels: VENUE_LABELS,
  },
  [RECIPES]: {
    id: RECIPES,
    // —— capabilities ——
    hasLocation: false, // you are already there; nothing to travel to or map
    hasHours: false, // your own kitchen has no opening hours
    hasPrices: false, // cooking, not spending. (`currency` is held anyway —
    // owner ruling 2026-08-16: a recipe may one day carry the cost to make it,
    // and that cost needs a currency to be in. Anticipatory, not spurious —
    // which is exactly why prices and ordering are two capabilities, not one.)
    canOrder: false, // Cook at Home is for cooking, not an order down the phone
    canReport: false, // no shop to correct; feedback goes via the ⋯ menu (ADR 0028)
    hasFreshness: false, // ours, so there is nobody to have checked with
    inFacets: false, // "Home cooking" is not a cuisine you drive to (ADR 0003)
    pinnedFirst: true, // staying in is always an option, so it anchors the top
    hasContactCard: false,
    itemsHaveRecipeFields: true, // serves, time, ingredients, steps
    itemPage: "recipe.html", // a recipe is a destination of its own
    // —— words ——
    labels: RECIPES_LABELS,
  },
};

/**
 * The kind id for a record, normalised. 54 of our 55 records omit `kind`
 * entirely, so absent means VENUE; an unrecognised value also falls back to
 * VENUE rather than throwing, because the failure mode of a typo in the data
 * should be a venue rendered as a venue, not a blank screen.
 */
export function kindId(record) {
  const k = record?.kind;
  return typeof k === "string" && Object.hasOwn(KINDS, k) ? k : VENUE;
}

/**
 * The capability set for a record. Accepts anything carrying a `kind` — a
 * restaurant record, or a search-index entry, which copies the field across for
 * exactly this reason. Never returns undefined.
 */
export function kindOf(record) {
  return KINDS[kindId(record)];
}

/** The words this kind supplies for itself (see VENUE_LABELS above). */
export function labelsOf(record) {
  return kindOf(record).labels;
}

/** Every kind id, for tests and for anything enumerating the table. */
export function kindIds() {
  return Object.keys(KINDS);
}

/**
 * IDENTITY, not capability — the one place `"recipes"` is still a question
 * about *what a record is*, and it exists because that answer is **persisted**.
 * A favourite, a rating and a shared shortlist each store an `isRecipe` flag
 * (share-codec encodes it as `r: 0|1` inside a URL that is already in people's
 * messages), and it is read back to pick 🏠 over 🍽️ on a row whose record may
 * no longer be loaded — or may no longer exist. It cannot be re-derived at read
 * time, so it cannot become a capability lookup.
 *
 * New code must not reach for this to answer a capability question: if you are
 * about to write `if (isRecipeKind(r))` to decide whether to render something,
 * the thing you actually mean is a capability, and it belongs in the table.
 */
export function isRecipeKind(record) {
  return kindId(record) === RECIPES;
}
