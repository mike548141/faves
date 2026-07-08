// Hearted favourites — the second device-local personal feature (after the
// order tally), and the simplest: a heart is binary where a rating is a
// scale. You can favourite a whole venue or an individual dish (restaurant
// menus and Cook at Home). Stored in localStorage only — no account, no
// backend, nothing personal in the repo. A "Favourites" view on the home
// screen gathers them so it's quick to pick the usual.
//
// Entries are stored denormalised (venueName, name) so the Favourites view
// renders from storage alone, without re-resolving against the menu data.
// The deep-link href is derived at render time from the shared slug, so a
// favourited dish always anchors to the exact row the menu screen builds.

import { safeStorage } from "./store.js";
import { slug } from "./slug.js";

const KEY = "faves.favourites.v1";

/** Stable identity of a favourite: venue by id, dish by venue + name. */
export const favKey = (e) =>
  e.type === "venue" ? `v:${e.venueId}` : `d:${e.venueId} ${e.name}`;

/** Deep link for a favourite — a venue's menu, or a dish's row / recipe. */
export function favHref(e) {
  if (e.type === "venue") return `restaurant.html?id=${e.venueId}`;
  return e.isRecipe
    ? `recipe.html?id=${e.venueId}&dish=${slug(e.name)}`
    : `restaurant.html?id=${e.venueId}#dish-${slug(e.name)}`;
}

export function createFavourites(storage) {
  const subs = new Set();

  function read() {
    try {
      const a = JSON.parse(storage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }

  let items = read();

  function commit() {
    try {
      storage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* blocked/over quota — in-memory state still drives the UI */
    }
    for (const fn of subs) fn(items);
  }

  return {
    items: () => items,
    count: () => items.length,
    has: (entry) => items.some((i) => favKey(i) === favKey(entry)),

    /** Add if absent, remove if present. Returns the new on/off state. */
    toggle(entry) {
      const k = favKey(entry);
      const idx = items.findIndex((i) => favKey(i) === k);
      if (idx >= 0) {
        items = items.filter((_, n) => n !== idx);
        commit();
        return false;
      }
      items = [...items, entry];
      commit();
      return true;
    },

    removeKey(k) {
      items = items.filter((i) => favKey(i) !== k);
      commit();
    },

    venues: () => items.filter((i) => i.type === "venue"),
    dishes: () => items.filter((i) => i.type === "dish"),

    reload() {
      items = read();
      for (const fn of subs) fn(items);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const favourites = createFavourites(safeStorage());
