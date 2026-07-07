// Pure filter logic — no DOM. Kept separate so it is trivial to reason
// about and reuse (e.g. the "Pick for us" picker filters the same way).

import { openStatus } from "./hours.js";

/** Unique, sorted areas and cuisines present in the data. */
export function deriveFacets(restaurants) {
  const areas = new Set();
  const cuisines = new Set();
  for (const r of restaurants) {
    // The cook-at-home collection isn't a place; keep it out of the
    // area/cuisine dropdowns so they stay about eating out.
    if (r.kind === "recipes") continue;
    if (r.area) areas.add(r.area);
    for (const c of r.cuisine || []) cuisines.add(c);
  }
  const sort = (set) => [...set].sort((a, b) => a.localeCompare(b));
  return { areas: sort(areas), cuisines: sort(cuisines) };
}

/**
 * Filter state shape:
 * { service: 'all'|'takeaway'|'dine-in', area, cuisine, openNow: bool }.
 */
export const DEFAULT_FILTERS = { service: "all", area: "all", cuisine: "all", openNow: false };

/**
 * Apply combinable filters. Every clause is AND-ed. `now` ({dow, minutes})
 * is required only for the openNow clause; a venue whose hours are unknown
 * (or a recipe, which has none) is treated as not-open, so it drops out.
 */
export function applyFilters(restaurants, state, now = null) {
  return restaurants.filter((r) => {
    if (state.service !== "all" && !(r.services || []).includes(state.service)) {
      return false;
    }
    if (state.area !== "all" && r.area !== state.area) return false;
    if (state.cuisine !== "all" && !(r.cuisine || []).includes(state.cuisine)) {
      return false;
    }
    if (state.openNow && now) {
      const st = openStatus(r.hours, now).state;
      if (st !== "open" && st !== "closing-soon") return false;
    }
    return true;
  });
}
