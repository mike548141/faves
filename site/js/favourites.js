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

/**
 * Group a flat favourites list by venue for sharing (Theme 1b shortlist), in
 * first-seen order: `{ venueId, venueName, isRecipe, sub, venueFav, dishes }`.
 * `venueFav` marks a whole-place heart; `dishes` is the hearted dish names.
 * Facts (name, recipe flag, sub) come from whichever entry carries them —
 * mirrors the Favourites view's own grouping so the share matches what's shown.
 */
export function groupForShare(items) {
  const order = [];
  const byVenue = new Map();
  for (const e of items) {
    let g = byVenue.get(e.venueId);
    if (!g) {
      g = { venueId: e.venueId, venueName: "", isRecipe: false, sub: "", venueFav: false, dishes: [] };
      byVenue.set(e.venueId, g);
      order.push(e.venueId);
    }
    if (e.type === "venue") {
      g.venueFav = true;
    } else {
      g.dishes.push(e.name);
    }
    g.venueName = g.venueName || e.venueName || "";
    g.isRecipe = g.isRecipe || !!e.isRecipe;
    g.sub = g.sub || e.sub || "";
  }
  return order.map((id) => byVenue.get(id));
}

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

    /**
     * Add every entry not already saved (received shortlist share). Never
     * removes or duplicates; commits once. Returns how many were newly added,
     * so the UI can say "Added 3 favourites" (or note there were no new ones).
     */
    merge(entries) {
      const present = new Set(items.map(favKey));
      const fresh = [];
      for (const e of entries || []) {
        const k = favKey(e);
        if (present.has(k)) continue;
        present.add(k); // guard against duplicates within the incoming list too
        fresh.push(e);
      }
      if (fresh.length) {
        items = [...items, ...fresh];
        commit();
      }
      return fresh.length;
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
