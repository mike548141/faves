// Global search over places and dishes — pure logic, no DOM. The home
// screen already loads every restaurant record (menus and all), so this
// searches entirely in memory: offline-safe, zero-dependency. Deep-links
// carry the dish's id (dish-id.js) so a result anchors to the exact row
// menu.js/recipe.js render — including the second and third dish of the same
// name, which a slugged name could never reach.
//
// Pure, so it's unit-tested directly (tests/search.test.js).

import { dishId } from "./dish-id.js";
import { searchableText, venueLanguage } from "./lang.js";
import { DIET_FILTERS } from "./dietary.js";

const norm = (s) => (s || "").toLowerCase();

// Digits only, so a number written with spaces, with hyphens, or run together
// is one thing to search. Phone numbers are the one field people retype from
// memory in a different shape every time.
const digits = (s) => (s || "").replace(/\D+/g, "");

// What people type versus what the data calls it. Kept deliberately small and
// one-directional: each entry maps a phrase a person would actually type onto
// words already in the haystack. It is NOT a general thesaurus — a wrong
// expansion here silently changes what a search means.
//
// Two rules bound it. First, only *positive* claims a venue itself makes: the
// data has `gf` because a shop said gluten free, so "coeliac" may find it,
// while "nut free" is not here at all — this repo does not assert an absence
// of an allergen, and a search that appears to would be a safety claim we have
// no basis for (see the allergen doctrine in ADR 0025). Second, no cuisine
// synonyms: cuisine is already free text in the haystack, and "Italian"
// matching "pizza" is the kind of guess that makes results feel arbitrary.
// Each value is a list of ALTERNATIVE forms, not a phrase: the haystack's
// word order is an accident of how dietary.js lists its filters, so
// "plant based" must try "vegan" and "vegetarian" separately rather than
// hunting for the two adjacent.
const SYNONYMS = {
  "plant based": ["vegan", "vegetarian"],
  "plantbased": ["vegan", "vegetarian"],
  "plant-based": ["vegan", "vegetarian"],
  "veggie": ["vegetarian"],
  "veg": ["vegetarian"],
  "coeliac": ["gluten free"],
  "celiac": ["gluten free"],
  "no gluten": ["gluten free"],
  "no dairy": ["dairy free"],
  "take away": ["takeaway"],
  "takeout": ["takeaway"],
  "take out": ["takeaway"],
  "eat in": ["dine-in"],
  "dine in": ["dine-in"],
  "sit down": ["dine-in"],
  "sit-down": ["dine-in"],
  "eat here": ["dine-in"],
};

/**
 * Every form of a query worth matching: the query itself, its digits-only
 * form when it looks like a phone number, and any synonym expansion.
 * Exported for the unit tests, which assert the map does not grow teeth.
 */
export function expand(q) {
  const out = [q];
  const syn = SYNONYMS[q];
  if (syn) out.push(...syn);
  const d = digits(q);
  // Three digits is the shortest fragment worth treating as a number; below
  // that it is a false-positive machine against prices and order codes.
  if (d.length >= 3 && d !== q) out.push(d);
  return out;
}

// The label a person would type for a dietary tag ("vegan"), not the code the
// data stores ("vg"). dietary.js already owns that mapping for the filter
// chips, so this reads it rather than restating it — one closed set, one
// place to extend.
function dietLabels(tags) {
  if (!tags || !tags.length) return "";
  const has = new Set(tags);
  return DIET_FILTERS.filter((f) => f.satisfies.some((t) => has.has(t)))
    .map((f) => f.label)
    .join(" ");
}

/**
 * Build the search index once from the loaded restaurants. Returns
 * { places, dishes }; each entry carries a lowercased `hay` (haystack) and,
 * for dishes, a ready-to-use deep-link `href`.
 *   place: { id, name, area, cuisine[], kind, hay }
 *   dish:  { name, venueId, venueName, isRecipe, section, href, hay }
 * Stubs (no menu) contribute a place but no dishes — which is correct: you
 * can still find the venue by name, there just aren't dishes to match yet.
 */
export function buildIndex(restaurants) {
  const places = [];
  const dishes = [];
  for (const r of restaurants) {
    const isRecipe = r.kind === "recipes";
    const venueLang = venueLanguage(r);
    places.push({
      id: r.id,
      name: r.name,
      area: r.area || "",
      cuisine: r.cuisine || [],
      kind: r.kind,
      // Address, city, service and phone join name/area/cuisine: people look
      // for a place by the street they remember it on, by "takeaway", or by
      // the number in their call history, not only by its name.
      hay: norm(
        [
          r.name,
          r.area,
          ...(r.cuisine || []),
          r.address,
          r.city,
          ...(r.services || []),
          r.phone,
          digits(r.phone),
        ].join(" ")
      ),
    });
    for (const section of r.menu || []) {
      for (const item of section.items || []) {
        // Ingredients join the haystack so "lemon" finds the pasta — mirrors
        // the menu screen's own dish search.
        const ingredients = (item.ingredients || []).join(" ");
        dishes.push({
          name: item.name,
          venueId: r.id,
          venueName: r.name,
          isRecipe,
          section: section.section || "",
          href: isRecipe
            ? `recipe.html?id=${r.id}&dish=${dishId(item)}`
            : `restaurant.html?id=${r.id}#dish-${dishId(item)}`,
          // The venue's order-number (e.g. "14") joins the haystack so a
          // guest reading "two number 14s" off the board can find it.
          // Every rendering, not just the canonical one: someone hunting
          // "ต้มยำ" and someone hunting "tom yam" want the same dish, and only
          // one of them can type the other (ADR 0044).
          hay: norm(
            [
              ...searchableText(item, "name", venueLang),
              ...searchableText(item, "desc", venueLang),
              ingredients,
              item.code,
              // "vegan" finds the dish the data tags `vg`.
              dietLabels(item.tags),
            ].join(" ")
          ),
        });
      }
    }
  }
  return { places, dishes };
}

// Relevance score for a query `q` (already normalised) against a display
// `name` and its wider `hay`. Higher = better; 0 = no match (dropped).
// Ranks a name hit above a description/ingredient-only hit, and the start
// of the name above a mid-word hit, so "mee" surfaces "Mee Goreng" first.
function score(name, hay, q) {
  const n = norm(name);
  if (n.startsWith(q)) return 4;
  if (n.includes(" " + q)) return 3; // start of a later word
  if (n.includes(q)) return 2;
  if (hay.includes(q)) return 1;
  return 0;
}

function rank(entries, forms, limit) {
  const scored = [];
  for (const e of entries) {
    // Best form wins, so a synonym never *lowers* a direct hit's rank: typing
    // "veg" still puts a dish actually called "Veg Samosa" above one merely
    // tagged vegetarian.
    let s = 0;
    for (const f of forms) s = Math.max(s, score(e.name, e.hay, f));
    if (s > 0) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name));
  return {
    total: scored.length,
    items: scored.slice(0, limit).map((x) => x.e),
  };
}

/**
 * Search the index. Returns { places, dishes }, where each is
 * { total, items } — `items` capped to the limit, `total` the full count so
 * the UI can say "showing 12 of 30". A query under 2 chars matches nothing
 * (a single letter would match almost everything — noise, not help).
 */
export function search(index, query, { placeLimit = 6, dishLimit = 20 } = {}) {
  const q = norm(query).trim();
  if (q.length < 2) {
    return { places: { total: 0, items: [] }, dishes: { total: 0, items: [] } };
  }
  const forms = expand(q);
  return {
    places: rank(index.places, forms, placeLimit),
    dishes: rank(index.dishes, forms, dishLimit),
  };
}
