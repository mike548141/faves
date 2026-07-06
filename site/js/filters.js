// Pure filter logic — no DOM. Kept separate so it is trivial to reason
// about and reuse (e.g. the "Pick for us" picker filters the same way).

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

/** Filter state shape: { service: 'all'|'takeaway'|'dine-in', area, cuisine }. */
export const DEFAULT_FILTERS = { service: "all", area: "all", cuisine: "all" };

/** Apply combinable filters. Every clause is AND-ed. */
export function applyFilters(restaurants, state) {
  return restaurants.filter((r) => {
    if (state.service !== "all" && !(r.services || []).includes(state.service)) {
      return false;
    }
    if (state.area !== "all" && r.area !== state.area) return false;
    if (state.cuisine !== "all" && !(r.cuisine || []).includes(state.cuisine)) {
      return false;
    }
    return true;
  });
}
