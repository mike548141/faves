// Global search over places and dishes — pure logic, no DOM. The home
// screen already loads every restaurant record (menus and all), so this
// searches entirely in memory: offline-safe, zero-dependency. Deep-links
// carry the dish's id (dish-id.js) so a result anchors to the exact row
// menu.js/recipe.js render — including the second and third dish of the same
// name, which a slugged name could never reach.
//
// Pure, so it's unit-tested directly (tests/search.test.js).

import { dishId } from "./dish-id.js";
import { ingredientKeys } from "./ingredients.js";
import { isRecipeKind, kindOf } from "./kinds.js";
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
 *   place: { id, name, area, cuisine[], kind, address, city, services[],
 *            phone, hay }
 *   dish:  { name, venueId, venueName, isRecipe, section, href, hay }
 * Stubs (no menu) contribute a place but no dishes — which is correct: you
 * can still find the venue by name, there just aren't dishes to match yet.
 */
export function buildIndex(restaurants) {
  const places = [];
  const dishes = [];
  for (const r of restaurants) {
    // `isRecipe` rides along on each dish as the persisted identity marker the
    // favourites/share formats already use; where the deep link *goes* is a
    // capability — whether this kind's items have a page of their own.
    const isRecipe = isRecipeKind(r);
    const itemPage = kindOf(r).itemPage;
    const venueLang = venueLanguage(r);
    places.push({
      id: r.id,
      name: r.name,
      area: r.area || "",
      cuisine: r.cuisine || [],
      kind: r.kind,
      // Kept as their own fields (not just folded into `hay` below) so a
      // result can later be asked "which of these did the query actually
      // land on?" (Theme 27b — matchField()/matchText() do that asking).
      address: r.address || "",
      city: r.city || "",
      services: r.services || [],
      phone: r.phone || "",
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
        const ingredients = ingredientKeys(item.ingredients).join(" ");
        dishes.push({
          name: item.name,
          venueId: r.id,
          venueName: r.name,
          isRecipe,
          section: section.section || "",
          href: itemPage
            ? `${itemPage}?id=${r.id}&dish=${dishId(item)}`
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

// Theme 27b — "say which field matched". The haystack is deliberately wide
// (name, area, cuisine, address, city, service, phone for a place; name,
// description, ingredients, code, diet label for a dish) because a narrow
// one would lose real finds ("Charley Noble" is a fair answer to "Noble").
// But a wide haystack means a result can carry a property it doesn't
// actually have — "Pub" finds five places merely NAMED "…Pub", not places
// tagged as pubs — and the row showing area/cuisine next to every hit lets a
// reader silently assume a match they never got. The fix here is not to
// narrow the haystack; it's to say, per result, exactly which field
// answered the query, so the reader can judge relevance themselves instead
// of the UI implying a property match that isn't there.
//
// `text.toLowerCase()` is length-preserving for every script this corpus
// uses (English + macronised Māori vowels + the languages under ADR 0044),
// so an index found in the normalised text is the same index in the
// original — findForm() can slice the ORIGINAL string and hand back the
// literal substring a reader would recognise, never the lower-cased form.
function findForm(text, forms) {
  if (!text) return null;
  const t = norm(text);
  for (const f of forms) {
    const i = t.indexOf(f);
    if (i >= 0) return text.slice(i, i + f.length);
  }
  return null;
}

// Where a place hit lives, checked in the order the result row could show
// it: name (the row's own title), then area/cuisine (the row's "Te Aro ·
// Malaysian" sub). Only those three are ever visible in the row, so only
// those three come back with a literal `text` to highlight — a hit that
// lands in address/city/phone/service is just as real but invisible on
// screen, so it comes back as a field name with no text, for a caller to
// turn into a plain-language note instead of a highlight nothing shows.
// The final "details" is a fallback, not a fourth real field: it exists so a
// multi-word query that only matches by spanning the space between two
// adjacent haystack fields (e.g. a query "a b" where field one ends "…a" and
// field two starts "b…") still reports something rather than nothing —
// every scored result gets a field, asserted in tests/search.test.js.
function placeMatchField(p, forms) {
  const name = findForm(p.name, forms);
  if (name) return { field: "name", text: name };
  const area = findForm(p.area, forms);
  if (area) return { field: "area", text: area };
  for (const c of p.cuisine || []) {
    const hit = findForm(c, forms);
    if (hit) return { field: "cuisine", text: hit };
  }
  const address = findForm(p.address, forms);
  if (address) return { field: "address", text: null };
  const city = findForm(p.city, forms);
  if (city) return { field: "city", text: null };
  if (findForm(p.phone, forms) || findForm(digits(p.phone), forms)) {
    return { field: "phone", text: null };
  }
  for (const s of p.services || []) {
    if (findForm(s, forms)) return { field: "service", text: null };
  }
  return { field: "details", text: null };
}

// Same idea for a dish: a hit inside the canonical, DISPLAYED name (what the
// result row actually shows) gets a highlight; a hit in a translation,
// description, ingredient list, order code or diet label is real (menu.js
// searches all of them) but the row never shows any of them, so it comes
// back as the single "details" bucket rather than a false name highlight.
function dishMatchField(d, forms) {
  const name = findForm(d.name, forms);
  if (name) return { field: "name", text: name };
  return { field: "details", text: null };
}

function rank(entries, forms, limit, matchField) {
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
    // matchField/matchText are additive to every entry already returned
    // here — existing callers that ignore them see exactly what they saw
    // before.
    items: scored.slice(0, limit).map((x) => {
      const { field, text } = matchField(x.e, forms);
      return { ...x.e, matchField: field, matchText: text };
    }),
  };
}

/**
 * Search the index. Returns { places, dishes }, where each is
 * { total, items } — `items` capped to the limit, `total` the full count so
 * the UI can say "showing 12 of 30". A query under 2 chars matches nothing
 * (a single letter would match almost everything — noise, not help).
 *
 * Every item also carries `matchField` (Theme 27b) — "name"/"area"/"cuisine"
 * for a place, "name" for a dish, else "details" for a hit that's real but
 * lives somewhere the result row doesn't show — and `matchText`, the literal
 * substring that matched, present only when `matchField` names something the
 * row displays (so a caller can highlight it in place; null otherwise, so a
 * caller never highlights text that isn't on screen).
 */
export function search(index, query, { placeLimit = 6, dishLimit = 20 } = {}) {
  const q = norm(query).trim();
  if (q.length < 2) {
    return { places: { total: 0, items: [] }, dishes: { total: 0, items: [] } };
  }
  const forms = expand(q);
  return {
    places: rank(index.places, forms, placeLimit, placeMatchField),
    dishes: rank(index.dishes, forms, dishLimit, dishMatchField),
  };
}
