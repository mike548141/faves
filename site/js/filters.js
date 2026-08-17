// Pure filter logic — no DOM. Kept separate so it is trivial to reason
// about and reuse (e.g. the "Pick for us" picker filters the same way).

import { openStatus } from "./hours.js";
import { kindOf } from "./kinds.js";
import { isCheapEats } from "./price.js";
import { venueHours } from "./locations.js";
import { venueTimezone } from "./place.js";
import { isTrading } from "./temporal.js";
import { vibeLabel, vibesFor, vibesOf } from "./vibes.js";

/** The style-facet values a venue carries, as keys. Usually one — style is
 *  mutually exclusive in practice (vibes.js) — but the data is an array and
 *  some venues genuinely are two things: `regal-chinese` is tagged `sit-down`
 *  AND `banquet`, and it does both.
 *
 *  🔎 This reads ALL of them rather than `vibes.styleOf`, which returns only the
 *  first in vocabulary order. Measured 2026-08-17 in real Chrome: with `styleOf`
 *  driving the dropdown, Regal Chinese's card rendered a "Banquet" chip while
 *  "Banquet" was absent from the filter entirely — the only venue carrying it
 *  was already claimed by `sit-down`. A chip naming a thing the control beside
 *  it cannot offer is a dead end in both directions, and reading every value
 *  also makes this clause exactly the shape of the cuisine clause below: a
 *  venue matches if it carries the value, not if the value happens to lead. */
const styleKeysOf = (vibe) => vibesFor(vibe).filter((v) => v.facet === "style");

/**
 * Unique areas and cuisines present in the data, plus the styles of dining.
 *
 * Areas and cuisines are sorted alphabetically because they are open sets of
 * content words with no inherent order. `styles` is NOT: `vibes.js` orders the
 * style values by commitment (quick eats → fine dining), which is the order a
 * reader compares them in, so this filters the vocabulary rather than sorting
 * the data's own values. Only styles some venue actually carries are offered —
 * a dropdown option that can only ever return nothing is a dead end.
 *
 * Styles come back as `{ key, label }` pairs, not bare strings: the stored value
 * is a kebab-case key and the reader sees a label, and both ends of the select
 * need them (`vibes.js` — KEY vs LABEL).
 */
export function deriveFacets(restaurants) {
  const areas = new Set();
  const cuisines = new Set();
  const styleKeys = new Set();
  for (const r of restaurants) {
    // A kind that isn't in the facets stays out of the area/cuisine dropdowns,
    // so they keep meaning "where to eat out" (ADR 0003; the table is
    // kinds.js). Cook at Home is the one such record today.
    if (!kindOf(r).inFacets) continue;
    if (r.area) areas.add(r.area);
    for (const c of r.cuisine || []) cuisines.add(c);
    for (const style of styleKeysOf(r.vibe)) styleKeys.add(style.key);
  }
  const sort = (set) => [...set].sort((a, b) => a.localeCompare(b));
  return {
    areas: sort(areas),
    cuisines: sort(cuisines),
    styles: vibesOf("style")
      .filter((v) => styleKeys.has(v.key))
      .map(({ key, label }) => ({ key, label })),
  };
}

/**
 * The two facets a URL can carry into the home list: `index.html?cuisine=
 * Malaysian`, `?area=Johnsonville`. A venue's subheading links its own
 * cuisines and area this way (menu.js), so "Malaysian · Johnsonville" on a
 * menu page is a route back to every other Malaysian place, not just a label.
 * Both ends read the names from here so they cannot drift apart.
 */
export function filterHref(facet, value, page = "index.html") {
  return `${page}?${facet}=${encodeURIComponent(value)}`;
}

/** The two values the order-mode axis offers. "all" is the absence of a
 *  filter, so it is not one of them. These are also the values a venue's
 *  `services` array holds — the record field kept its name (see applyFilters). */
export const ORDER_MODES = ["takeaway", "dine-in"];

/** The query key this axis is written under, and the one it was shipped under
 *  before the 2026-08-16 rename. Both ends read them from here so a URL and the
 *  state can never disagree about the spelling.
 *
 *  🔎 Read the note above `orderModeFromQuery` before assuming the legacy key is
 *  dead weight — and before assuming it is load-bearing either. */
export const ORDER_MODE_KEY = "order-mode";
export const LEGACY_ORDER_MODE_KEY = "service";

/**
 * The order mode a query string asks for, tolerating the key's old spelling.
 *
 * The axis was called `service` until the owner's 2026-08-16 ruling renamed it
 * (`order-mode`), because the one word was doing three unrelated jobs and three
 * sessions collided with it in a day. The ruling's condition on the rename was a
 * compatibility path — read the old key, write only the new one — so a link that
 * predates it keeps filtering instead of silently widening to every venue.
 *
 * ⚠️ What that ruling assumed, and what is actually true: it says the filter is
 * "shipped and in URLs". It is shipped, but it was never *in* a URL — no version
 * of `filtersFromQuery` has ever read this axis (`git log -S 'get("service")'`
 * is empty across all history), and `app.js`'s `syncQuery` deliberately does not
 * write it, because it is not a shareable facet (ADR 0050 carries area and
 * cuisine, and 37k added style). So the legacy branch here guards a link that
 * cannot exist yet. It is kept because the ruling is explicit, it costs one
 * lookup, and the day this axis does become shareable the old spelling is
 * already handled. Nothing in the app mints either key.
 *
 * Unknown values mean "all", the same rule the facets follow below.
 */
function orderModeFromQuery(params) {
  for (const key of [ORDER_MODE_KEY, LEGACY_ORDER_MODE_KEY]) {
    const v = params.get(key);
    if (v && ORDER_MODES.includes(v)) return v;
  }
  return "all";
}

/**
 * Read those facets back out of a query string, keeping only values the data
 * actually has — `facets` is deriveFacets' output. An unknown value ("?cuisine=
 * Klingon", or a cuisine we've since renamed) becomes "all" rather than being
 * trusted: a <select> handed a value with no matching <option> silently falls
 * back to its first one, so the control would read "All cuisines" while the
 * state filtered on Klingon and the list came back empty. Better to show the
 * whole list than a blank one under a control claiming nothing is wrong.
 */
export function filtersFromQuery(search, facets) {
  const params = new URLSearchParams(search || "");
  const pick = (key, allowed) => {
    const v = params.get(key);
    return v && allowed.includes(v) ? v : "all";
  };
  return {
    area: pick("area", facets.areas || []),
    cuisine: pick("cuisine", facets.cuisines || []),
    // The URL carries the stored KEY ("?style=fine-dining"), never the label:
    // a key is stable, url-safe and the thing the data holds, where a label is
    // wording we are free to change. Same "unknown means all" rule as above —
    // and here it also covers a value the vocabulary has since renamed
    // (vibes.js FORMER_VIBES), which is exactly the case a link shared before
    // the migration would carry.
    style: pick("style", (facets.styles || []).map((s) => s.key)),
    // Validated against the vocabulary rather than against `facets`: unlike area
    // and cuisine, this axis's two values are fixed by the schema and are not
    // derived from whatever the corpus happens to hold today.
    orderMode: orderModeFromQuery(params),
  };
}

/**
 * Filter state shape:
 * { orderMode: 'all'|'takeaway'|'dine-in', area, cuisine, style, openNow: bool,
 *   cheap: bool }. `style` is a `vibes.js` style KEY ("sit-down"), never a
 * label.
 *
 * `orderMode` was `service` until 2026-08-16; the word was doing three unrelated
 * jobs at once and the owner ruled that it stop being one of them here.
 */
export const DEFAULT_FILTERS = {
  orderMode: "all",
  area: "all",
  cuisine: "all",
  style: "all",
  openNow: false,
  cheap: false,
};

// How an order mode reads to a person. Same words the <select> shows; "all" is
// the absence of a filter, so it never appears here.
const ORDER_MODE_LABEL = {
  takeaway: { label: "Takeaway", key: "orderMode.takeaway" },
  "dine-in": { label: "Dine-in", key: "orderMode.dineIn" },
};

/**
 * Every filter currently narrowing the list, as `{ kind, value, label, key }`.
 * Pure, and the single source of truth for BOTH the "Filters (n)" badge and the
 * dismissible chips beside the count — which is the point. The filters now live
 * behind a sheet, so the only thing standing between a reader and a mystery
 * short list is this count; if the badge and the chips could be computed
 * differently they could disagree, and the disagreement would always be
 * invisible (a filter that is on and named nowhere).
 *
 * ORDER IS LOAD-BEARING: cuisine and area come first because those are the two
 * a URL can carry in from a venue's subheading (ADR 0050), and the reader who
 * arrived that way pressed nothing on this screen. The chip row shows the first
 * few and overflows the rest, so putting the arriving facet first guarantees it
 * is never the one folded away.
 *
 * The viewer's location is deliberately absent, and since ADR 0068 it could not
 * be here even in principle: there is no sort mode left to list. Distance is a
 * term inside the one ranking, so it reorders the list and never shortens it —
 * which is not what a short list needs explaining by. #geo-row says what it did.
 */
export function activeFilters(state) {
  const out = [];
  if (state.cuisine && state.cuisine !== "all") {
    out.push({ kind: "cuisine", value: state.cuisine, label: state.cuisine, key: null });
  }
  if (state.area && state.area !== "all") {
    out.push({ kind: "area", value: state.area, label: state.area, key: null });
  }
  // Third, ahead of order mode. A URL can carry `?style=` too, but no venue's
  // subheading links one, so the reason cuisine and area lead — a reader who
  // arrived on a narrowed list having pressed nothing on this screen — does not
  // extend to it, and neither does its claim on the first chip slot.
  //
  // `key: null` like cuisine and area, for a different reason: these labels are
  // ours, not the venues', but the reo table carries no gloss for an individual
  // vibe and inventing one here is exactly what reo.js's SAFETY BOUNDARY note
  // forbids. English is the honest state until a fluent speaker reviews them.
  if (state.style && state.style !== "all") {
    out.push({ kind: "style", value: state.style, label: vibeLabel(state.style), key: null });
  }
  const orderMode = ORDER_MODE_LABEL[state.orderMode];
  if (orderMode) {
    out.push({
      kind: "orderMode",
      value: state.orderMode,
      label: orderMode.label,
      key: orderMode.key,
    });
  }
  if (state.openNow) {
    out.push({ kind: "openNow", value: true, label: "Open now", key: "toggle.openNow" });
  }
  if (state.cheap) {
    out.push({ kind: "cheap", value: true, label: "Cheap eats", key: "toggle.cheapEats" });
  }
  return out;
}

/**
 * Apply combinable filters. Every clause is AND-ed. `clock` (hours.js
 * makeClock) is required only for the openNow clause, which reads it in each
 * venue's own timezone; a venue whose hours are unknown
 * (or a recipe, which has none) is treated as not-open, so it drops out.
 */
export function applyFilters(restaurants, state, clock = null) {
  return restaurants.filter((r) => {
    // 🚩 The state key is `orderMode`; the RECORD field is still `services`.
    // The 2026-08-16 ruling renamed the filter axis, and renaming the data field
    // would mean 55 venue files, `validate.py`'s `SERVICES`, and the schema —
    // which lives in `docs/ARCHITECTURE.md`. Left deliberately, not missed.
    if (state.orderMode !== "all" && !(r.services || []).includes(state.orderMode)) {
      return false;
    }
    if (state.area !== "all" && r.area !== state.area) return false;
    if (state.cuisine !== "all" && !(r.cuisine || []).includes(state.cuisine)) {
      return false;
    }
    // Style of dining reads the `style` FACET of `vibe`, never the raw array:
    // amenities and character tags are dropped, so "sit-down" cannot be
    // answered by a venue tagged "licensed", and a pre-migration string is
    // outside the vocabulary and matches nothing. A venue with no style is not
    // silently a match — an untagged place drops out, the same way an unpriced
    // one drops out of Cheap eats rather than being called a bargain.
    if (
      state.style &&
      state.style !== "all" &&
      !styleKeysOf(r.vibe).some((v) => v.key === state.style)
    ) {
      return false;
    }
    if (state.openNow && clock) {
      // A venue that has SHUT DOWN fails this whatever its posted week says
      // (lifecycle, ADR 0023). "Open now" is a time filter and a closure is not
      // a time of day — but the filter's promise is "somewhere I can eat right
      // now", and a refit or a permanent closure fails that harder than 3am
      // does, not more weakly. Deciding otherwise would put a card reading
      // "Permanently closed" inside a list the reader asked to be open, which
      // is one card contradicting itself. Note the asymmetry, which is
      // intended: closure DISQUALIFIES here and DEMOTES in the ranking
      // (ranking.js tierOf), and it never removes the venue from the unfiltered
      // list — that list is how someone finds out the place has gone.
      if (!isTrading(r)) return false;
      // For a multi-location venue this reads the branch that drives its card:
      // the nearest one when we know the viewer's location (state.origin), else
      // the primary — so "Open now" and the card badge always agree.
      const origin = state.origin ?? null;
      const st = openStatus(venueHours(r, origin), clock.at(venueTimezone(r, origin))).state;
      if (st !== "open" && st !== "closing-soon") return false;
    }
    // "Cheap eats" — only the $ band (see price.isCheapEats). A venue we can't
    // price (stub, recipe, thin menu) is not cheap: we won't imply a bargain.
    if (state.cheap && !isCheapEats(r)) return false;
    return true;
  });
}
