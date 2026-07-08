// Global search over places and dishes — pure logic, no DOM. The home
// screen already loads every restaurant record (menus and all), so this
// searches entirely in memory: offline-safe, zero-dependency. Deep-links
// use the shared slug (slug.js) so a dish result anchors to the exact row
// menu.js/recipe.js render.
//
// Pure, so it's unit-tested directly (tests/search.test.js).

import { slug } from "./slug.js";

const norm = (s) => (s || "").toLowerCase();

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
    places.push({
      id: r.id,
      name: r.name,
      area: r.area || "",
      cuisine: r.cuisine || [],
      kind: r.kind,
      hay: norm([r.name, r.area, ...(r.cuisine || [])].join(" ")),
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
            ? `recipe.html?id=${r.id}&dish=${slug(item.name)}`
            : `restaurant.html?id=${r.id}#dish-${slug(item.name)}`,
          // The venue's order-number (e.g. "14") joins the haystack so a
          // guest reading "two number 14s" off the board can find it.
          hay: norm([item.name, item.desc, ingredients, item.code].join(" ")),
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

function rank(entries, q, limit) {
  const scored = [];
  for (const e of entries) {
    const s = score(e.name, e.hay, q);
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
  return {
    places: rank(index.places, q, placeLimit),
    dishes: rank(index.dishes, q, dishLimit),
  };
}
