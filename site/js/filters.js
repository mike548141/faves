// Pure filter logic — no DOM. Kept separate so it is trivial to reason
// about and reuse (e.g. the "Pick for us" picker filters the same way).

import { openStatus } from "./hours.js";
import { kindOf } from "./kinds.js";
import { isCheapEats } from "./price.js";
import { venueHours } from "./locations.js";
import { venueTimezone } from "./place.js";

/** Unique, sorted areas and cuisines present in the data. */
export function deriveFacets(restaurants) {
  const areas = new Set();
  const cuisines = new Set();
  for (const r of restaurants) {
    // A kind that isn't in the facets stays out of the area/cuisine dropdowns,
    // so they keep meaning "where to eat out" (ADR 0003; the table is
    // kinds.js). Cook at Home is the one such record today.
    if (!kindOf(r).inFacets) continue;
    if (r.area) areas.add(r.area);
    for (const c of r.cuisine || []) cuisines.add(c);
  }
  const sort = (set) => [...set].sort((a, b) => a.localeCompare(b));
  return { areas: sort(areas), cuisines: sort(cuisines) };
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
  };
}

/**
 * Filter state shape:
 * { service: 'all'|'takeaway'|'dine-in', area, cuisine, openNow: bool,
 *   cheap: bool }.
 */
export const DEFAULT_FILTERS = {
  service: "all",
  area: "all",
  cuisine: "all",
  openNow: false,
  cheap: false,
};

// How a service value reads to a person. Same three words the segmented
// control shows; "all" is the absence of a filter, so it never appears here.
const SERVICE_LABEL = {
  takeaway: { label: "Takeaway", key: "service.takeaway" },
  "dine-in": { label: "Dine-in", key: "service.dineIn" },
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
 * Sort modes ("Near me", "Along a route") are deliberately absent: they reorder
 * the list, they never shorten it (ADR 0014), so they are not what a short list
 * needs explaining by. #geo-status says what the sort is doing.
 */
export function activeFilters(state) {
  const out = [];
  if (state.cuisine && state.cuisine !== "all") {
    out.push({ kind: "cuisine", value: state.cuisine, label: state.cuisine, key: null });
  }
  if (state.area && state.area !== "all") {
    out.push({ kind: "area", value: state.area, label: state.area, key: null });
  }
  const service = SERVICE_LABEL[state.service];
  if (service) {
    out.push({ kind: "service", value: state.service, label: service.label, key: service.key });
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
    if (state.service !== "all" && !(r.services || []).includes(state.service)) {
      return false;
    }
    if (state.area !== "all" && r.area !== state.area) return false;
    if (state.cuisine !== "all" && !(r.cuisine || []).includes(state.cuisine)) {
      return false;
    }
    if (state.openNow && clock) {
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
