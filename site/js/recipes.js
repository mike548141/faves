// Personal recipes — a person's own cookbook, kept in their user data rather
// than in the published data under site/data/ (roadmap 510/050, ADR 0145
// "Personal recipes use the published recipe's shape", ADR 0146 §2).
//
// ONE RECORD PER RECIPE, IN THE PUBLISHED SHAPE. A record is exactly what a
// Cook at Home dish looks like in site/data/ — `name`, `ingredients`, `steps`,
// `tags`, `tagNotes`, `serves`… — so one recipe page renders both kinds with
// one render(). The identity field is the published one too, `dishId`, and it
// carries a `u:` prefix: a published dish id is a slug (`[a-z0-9-]`), so a
// colon can never appear in one and the two can never collide.
//
// WHERE A PERSONAL RECIPE "LIVES". Every stored thing that points at a recipe —
// a heart, a rating, a note, cook-mode ticks, the shopping list — names it as
// venue + dish (ADR 0051). Personal recipes all belong to one virtual
// collection, `MY_RECIPES` (`u:mine`), which is never a file on the server. So
// a personal recipe's heart is `d:u:mine u:ginger-crunch` and its page is
// `recipe.html?id=u:mine&dish=u:ginger-crunch`: every existing link builder
// (favHref, shopping's parseRecipeId, cook mode) already writes that URL, and
// none of them had to learn a second shape. The colon keeps `u:mine` out of the
// venue-id space for the same reason it keeps `u:` out of the dish-id space.
//
// PER PERSON, LIKE HEARTS (roadmap 510/120, owner-ruled "Per person"). Each
// profile on a phone keeps its own cookbook, at its own profile-scoped key, and
// a backup and sync carry it inside that profile. Until 2026-10-01 it was one
// cookbook per device; no recipe had been stored anywhere when it moved (no
// editor, no import run, no sync server that holds recipes — roadmap 510/120
// has the evidence), so no upgrade step carries one across.

// Local storage until roadmap 510/080 moves all user data to IndexedDB. Pure
// where it can be: storage is injected; the singleton at the bottom is the one
// place a real backend is bound.

import { profileScopedStorage, profiles } from "./profiles.js";
import { RECIPES_KEY, personalCollection, sanitiseRecipe, sanitiseRecipes, sortedRecipes } from "./recipe-record.js";

// The record — id, shape, cleaning — is recipe-record.js's, re-exported so a
// screen needs one import for the store and what it holds.
export * from "./recipe-record.js";

export function createRecipes(storage) {
  const subs = new Set();

  function read() {
    try {
      return sanitiseRecipes(JSON.parse(storage.getItem(RECIPES_KEY) || "{}"));
    } catch {
      return {};
    }
  }

  let map = read();

  function commit() {
    try {
      storage.setItem(RECIPES_KEY, JSON.stringify(sortedRecipes(map)));
    } catch {
      /* blocked or over quota — the in-memory copy still drives this session */
    }
    for (const fn of subs) fn(map);
  }

  return {
    all: () => map,
    get: (id) => map[id] || null,
    has: (id) => !!map[id],
    count: () => Object.keys(map).length,
    collection: () => personalCollection(map),

    /** Store a record (the import and, later, the editor). Returns the stored
     *  record, or null when it is not a valid personal recipe. */
    put(record) {
      const r = sanitiseRecipe(record);
      if (!r) return null;
      map = { ...map, [r.dishId]: r };
      commit();
      return r;
    },

    /** Delete one recipe. Returns whether it was there. */
    remove(id) {
      if (!map[id]) return false;
      map = { ...map };
      delete map[id];
      commit();
      return true;
    },

    reload() {
      map = read();
      for (const fn of subs) fn(map);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per person (see the header): read through the active profile's scope, and
// re-read whenever the registry changes — a switch here or in another tab, a
// person removed — exactly as checklist.js does, so every screen that shows a
// personal recipe follows the switch without being told.
export const recipes = createRecipes(profileScopedStorage());
profiles.subscribe(() => recipes.reload());
