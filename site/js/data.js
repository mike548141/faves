// Data loading. One source of truth: data/index.json (order) + one file
// per restaurant. Small enough (~50 KB total) to load all on the home
// screen; the service worker precaches it for offline (Phase 5).

const INDEX_URL = "data/index.json";
const restaurantUrl = (id) => `data/restaurants/${id}.json`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

// A multi-location venue (locations.js, ADR 0011) carries its address, coords,
// phone and hours per branch, not at the top level. Project the FIRST (primary)
// branch up to the top level so every consumer that reads r.address/r.hours/etc.
// keeps working unchanged — the branch-aware bits (nearest-branch distance,
// per-branch status, all-branches contact block) layer on top via locations.js.
// Single-location records pass through untouched. This is the one normalisation
// seam; both loaders run through it.
function normaliseVenue(r) {
  if (!Array.isArray(r.locations) || !r.locations.length) return r;
  const primary = r.locations[0];
  return {
    ...r,
    address: r.address ?? primary.address ?? null,
    lat: typeof r.lat === "number" ? r.lat : primary.lat ?? null,
    lng: typeof r.lng === "number" ? r.lng : primary.lng ?? null,
    phone: r.phone ?? primary.phone ?? null,
    hours: r.hours ?? primary.hours ?? null,
  };
}

/** Load every restaurant, in display order. Throws if the index fails. */
export async function loadRestaurants() {
  const ids = await fetchJson(INDEX_URL);
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return normaliseVenue(await fetchJson(restaurantUrl(id)));
      } catch (err) {
        console.error(`Skipping ${id}:`, err);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/** Look up one restaurant by id (used by the menu screen). */
export async function loadRestaurant(id) {
  return normaliseVenue(await fetchJson(restaurantUrl(id)));
}
