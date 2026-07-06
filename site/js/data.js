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

/** Load every restaurant, in display order. Throws if the index fails. */
export async function loadRestaurants() {
  const ids = await fetchJson(INDEX_URL);
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return await fetchJson(restaurantUrl(id));
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
  return fetchJson(restaurantUrl(id));
}
