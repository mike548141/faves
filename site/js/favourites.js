// Hearted favourites — the second device-local personal feature (after the
// order tally), and the simplest: a heart is binary where a rating is a
// scale. You can favourite a whole venue or an individual dish (restaurant
// menus and Cook at Home). Stored in localStorage only — no account, no
// backend, nothing personal in the repo. A "Favourites" view on the home
// screen gathers them so it's quick to pick the usual.
//
// Entries are stored denormalised (venueName, name) so the Favourites view
// renders from storage alone, without re-resolving against the menu data.
// The deep-link href is derived at render time from the dish id, so a
// favourited dish always anchors to the exact row the menu screen builds.

import { profileScopedStorage } from "./profiles.js";
import { migrateEntries } from "./renames.js";
import { dishId } from "./dish-id.js";

const KEY = "faves.favourites.v1";

/**
 * Stable identity of a favourite: venue by id, dish by venue + dish id
 * (ADR 0051). A stored entry saved before dish ids existed carries no `dishId`,
 * so `dishId()` falls through to `slug(name)` — byte for byte the key it always
 * had. That is why hearts need no stored migration, and adding one would be
 * pure motion: they are stored as entry OBJECTS and re-keyed on every read,
 * unlike ratings, which are stored as key STRINGS and so do migrate.
 */
export const favKey = (e) =>
  e.type === "venue" ? `v:${e.venueId}` : `d:${e.venueId} ${dishId(e)}`;

/**
 * Group a flat favourites list by venue for sharing (Theme 1b shortlist), in
 * first-seen order: `{ venueId, venueName, isRecipe, sub, venueFav, dishes }`.
 * `venueFav` marks a whole-place heart; `dishes` is `{ name, dishId? }` per
 * hearted dish — the id rides along (ADR 0051) so a shared shortlist naming a
 * disambiguated row (the Gold Card Cheeseburger, not the Mains one) lands on
 * that row rather than whichever same-named dish happens to match first.
 * `dishId` is present only when the entry carries one; share-codec.js's
 * packGroups() accepts a bare string too, so either shape rides the wire.
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
      g.dishes.push(e.dishId ? { name: e.name, dishId: e.dishId } : { name: e.name });
    }
    g.venueName = g.venueName || e.venueName || "";
    g.isRecipe = g.isRecipe || !!e.isRecipe;
    g.sub = g.sub || e.sub || "";
  }
  return order.map((id) => byVenue.get(id));
}

/** Deep link for a favourite — a venue's menu, or a dish's row / recipe.
 *  Anchored on the dish id, which is what the menu screen renders the row's
 *  `#dish-…` anchor from; an entry with no id resolves to `slug(name)`, the
 *  same anchor this built before ids existed. */
export function favHref(e) {
  if (e.type === "venue") return `restaurant.html?id=${e.venueId}`;
  return e.isRecipe
    ? `recipe.html?id=${e.venueId}&dish=${dishId(e)}`
    : `restaurant.html?id=${e.venueId}#dish-${dishId(e)}`;
}

export function createFavourites(storage) {
  const subs = new Set();

  function read() {
    try {
      const a = JSON.parse(storage.getItem(KEY) || "[]");
      // Hearts stored against an id that has since been corrected follow the
      // venue rather than detaching from it (renames.js). Rewritten in memory
      // on read and persisted by the next commit — nothing is destroyed if the
      // viewer never touches their favourites again.
      return Array.isArray(a) ? migrateEntries(a) : [];
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

// Per-profile: hearts belong to whoever is browsing. profileScopedStorage
// namespaces the key by the active profile, so a switch + reload() re-points it.
export const favourites = createFavourites(profileScopedStorage());
