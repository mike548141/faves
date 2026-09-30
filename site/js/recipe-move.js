// Moving a published recipe into a person's own recipes — the move map
// (roadmap 510/050, ADR 0146 §4: "Moved recipes carry their hearts, ratings,
// notes and ticks through a move map, like renames.js but from a venue dish id
// to a `u:` id").
//
// WHAT IT IS FOR. The owner will name some Cook at Home recipes to move into
// his own data; their published copies then leave site/data/ by ADR 0047's
// route. Everything a device holds about such a recipe is keyed by where it
// USED to live — `d:cook-at-home ginger-crunch` for a heart or a rating,
// `cook-at-home ginger-crunch` for a note, the cook-mode ticks and a
// shopping-list group — so without this, the move would strand all of it: the
// heart would point at a dish no longer published, and its note would sit on a
// key no page reads.
//
// NOT RUN BY ANYTHING YET, deliberately. Which recipes move is the owner's list
// to give, and HOW it reaches devices is a fork he has not ruled (see roadmap
// 510/050): as an upgrade step every device runs (`moveStep`), or as an import
// only his devices take. Both halves are here, pure, and tested on synthetic
// ids; nothing in site/ imports this module today.
//
// PURE, AND IMPORTS NOTHING THAT READS A STORE, so an upgrade step in
// user-schema.js may use it (that module's rule: nothing the startup chain
// imports may read storage when it loads). recipe-record.js and dish-id.js are
// both pure.

import { dishId } from "./dish-id.js";
import { MY_RECIPES, MY_RECIPES_NAME, RECIPES_KEY, isPersonalId, sanitiseRecipe, sanitiseRecipes, sortedRecipes } from "./recipe-record.js";

const SHOPPING_KEY = "faves.shopping.v1"; // shopping.js; named here to stay pure
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const parse = (raw) => {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * A move plan, checked: `[{ from: { venueId, dishId }, to: "u:<slug>" }]` →
 * a Map from the old recipe id (`"<venueId> <dishId>"`, checklist.js
 * `recipeId`) to the new `u:` id. A move whose target is not a personal id, or
 * whose source is already personal, is dropped; two moves from one recipe keep
 * the first. Throws nothing.
 */
export function moveMapOf(moves) {
  const out = new Map();
  for (const m of Array.isArray(moves) ? moves : []) {
    const venueId = m?.from?.venueId;
    const dish = m?.from?.dishId;
    if (typeof venueId !== "string" || !venueId || typeof dish !== "string" || !dish) continue;
    if (venueId.startsWith("u:") || !isPersonalId(m?.to)) continue;
    const key = `${venueId} ${dish}`;
    if (!out.has(key)) out.set(key, m.to);
  }
  return out;
}

/**
 * The personal copy of a published recipe: the same record with its id
 * replaced by the `u:` one, the section it sat in kept (so "My recipes" groups
 * it the same way), and where it came from recorded in `movedFrom`.
 *
 * A same-collection "goes well with" ref ("Pavlova") resolves against the
 * collection the recipe is in — which is now the personal one. A ref to a
 * recipe that moved too still resolves there; one that did not is rewritten as
 * a cross-record ref to the published collection ("cook-at-home#Pavlova"), so
 * the link still lands somewhere real.
 */
export function toPersonalRecipe(item, { venueId, section, to, movedNames = new Set() } = {}) {
  if (!isObj(item) || !isPersonalId(to)) return null;
  const goesWith = Array.isArray(item.goesWith)
    ? item.goesWith.map((ref) =>
        typeof ref === "string" && !ref.includes("#") && !movedNames.has(ref) ? `${venueId}#${ref}` : ref
      )
    : undefined;
  return sanitiseRecipe({
    ...item,
    dishId: to,
    ...(section ? { section } : {}),
    ...(goesWith ? { goesWith } : {}),
    movedFrom: `${venueId} ${dishId(item)}`,
    // A published recipe's former ids name the PUBLISHED dish; they would
    // resolve nothing in the personal collection and are dropped.
    formerIds: undefined,
  });
}

/** Rewrite one stored favourites list. Returns the new list, or null if
 *  nothing in it moved. A moved heart that collides with one already under the
 *  new id is dropped: the two are the same heart. */
function moveFavourites(list, map, referenced) {
  if (!Array.isArray(list)) return null;
  let moved = false;
  const seen = new Set();
  const out = [];
  const keyOf = (e) => (e?.type === "venue" ? `v:${e.venueId}` : `d:${e?.venueId} ${dishId(e)}`);
  for (const e of list) {
    let next = e;
    if (isObj(e) && e.type === "dish") {
      const to = map.get(`${e.venueId} ${dishId(e)}`);
      if (to) {
        next = { ...e, venueId: MY_RECIPES, venueName: MY_RECIPES_NAME, dishId: to, isRecipe: true };
        referenced.add(to);
        moved = true;
      }
    }
    const k = keyOf(next);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(next);
  }
  return moved ? out : null;
}

/** Rewrite one `{ key: value }` map whose keys are `<prefix><venueId> <dishId>`
 *  (ratings: `d:`; notes and ticks: none). An entry already under the new key
 *  wins, as renames.js does: it was written by a build that knew the id. */
function moveKeyedMap(obj, map, prefix, referenced) {
  if (!isObj(obj)) return null;
  let moved = false;
  const out = {};
  const incoming = [];
  for (const [k, v] of Object.entries(obj)) {
    const to = k.startsWith(prefix) ? map.get(k.slice(prefix.length)) : undefined;
    if (!to) {
      out[k] = v;
      continue;
    }
    moved = true;
    referenced.add(to);
    incoming.push([`${prefix}${MY_RECIPES} ${to}`, v]);
  }
  for (const [k, v] of incoming) if (!(k in out)) out[k] = v;
  return moved ? out : null;
}

/** The shopping list's lines carry their recipe's id as `venueId`. */
function moveShopping(list, map, referenced) {
  if (!Array.isArray(list)) return null;
  let moved = false;
  const out = list.map((line) => {
    const to = isObj(line) && typeof line.venueId === "string" ? map.get(line.venueId) : undefined;
    if (!to) return line;
    moved = true;
    referenced.add(to);
    return { ...line, venueId: `${MY_RECIPES} ${to}` };
  });
  return moved ? out : null;
}

// Which per-profile store a storage key is, by its suffix: `faves.p.<id>.<x>`
// and the pre-profile `faves.<x>` alike (profiles.js scopeKey; a key an older
// build never migrated is still that person's data).
const STORE_OF = [
  [/\.favourites\.v1$/, "favourites"],
  [/\.ratings\.v1$/, "ratings"],
  [/\.notes\.v1$/, "notes"],
  [/\.checklist\.v1$/, "checklist"],
];

/**
 * Apply the move to a device's storage, given as `{ "faves.x": "<json>" }` —
 * the shape an upgrade step's `storage` half receives (user-schema.js). Returns
 * a NEW map; never mutates its input, never throws.
 *
 * `recipes` is `{ "<u: id>": record }`, the personal copies (toPersonalRecipe).
 * `add` decides which of them this device gets:
 *   • "referenced" — only the ones this device held something about (a heart,
 *     a rating, a note, ticks or a shopping line), so a stranger's phone does
 *     not gain a cookbook it never asked for;
 *   • "all" — every one (the owner's own devices).
 * A recipe already in the store is never overwritten.
 */
export function moveStorageKeys(keys, moves, recipes = {}, { add = "referenced" } = {}) {
  const map = moveMapOf(moves);
  const out = { ...(isObj(keys) ? keys : {}) };
  if (!map.size) return out;
  const referenced = new Set();
  for (const [k, raw] of Object.entries(out)) {
    if (!k.startsWith("faves.") || typeof raw !== "string") continue;
    let next = null;
    if (k === SHOPPING_KEY) next = moveShopping(parse(raw), map, referenced);
    else {
      const store = STORE_OF.find(([re]) => re.test(k))?.[1];
      if (store === "favourites") next = moveFavourites(parse(raw), map, referenced);
      else if (store === "ratings") next = moveKeyedMap(parse(raw), map, "d:", referenced);
      else if (store === "notes" || store === "checklist") next = moveKeyedMap(parse(raw), map, "", referenced);
    }
    if (next) out[k] = JSON.stringify(next);
  }
  const wanted = add === "all" ? new Set(map.values()) : referenced;
  const have = sanitiseRecipes(parse(out[RECIPES_KEY]));
  let added = 0;
  for (const [id, record] of Object.entries(sanitiseRecipes(recipes))) {
    if (!wanted.has(id) || id in have) continue;
    have[id] = record;
    added += 1;
  }
  if (added) out[RECIPES_KEY] = JSON.stringify(sortedRecipes(have));
  return out;
}

/**
 * The same move on a snapshot — a backup file, the sync copy or the sync base
 * (`collectPersonalData`'s shape), which is what an upgrade step's `snapshot`
 * half receives. A backup taken before the move and restored after it then
 * lands its hearts on the personal copy rather than on a recipe that is no
 * longer published. Fields it does not name are carried untouched.
 */
export function moveSnapshot(snapshot, moves, recipes = {}, { add = "referenced" } = {}) {
  const map = moveMapOf(moves);
  if (!isObj(snapshot) || !map.size) return snapshot;
  const referenced = new Set();
  const profiles = Array.isArray(snapshot.profiles)
    ? snapshot.profiles.map((p) => {
        if (!isObj(p)) return p;
        const next = { ...p };
        const fav = moveFavourites(p.favourites, map, referenced);
        const rat = moveKeyedMap(p.ratings, map, "d:", referenced);
        const note = moveKeyedMap(p.notes, map, "", referenced);
        if (fav) next.favourites = fav;
        if (rat) next.ratings = rat;
        if (note) next.notes = note;
        return next;
      })
    : snapshot.profiles;
  const out = { ...snapshot, profiles };
  const wanted = add === "all" ? new Set(map.values()) : referenced;
  const have = sanitiseRecipes(snapshot.recipes);
  let added = 0;
  for (const [id, record] of Object.entries(sanitiseRecipes(recipes))) {
    if (!wanted.has(id) || id in have) continue;
    have[id] = record;
    added += 1;
  }
  if (added || snapshot.recipes) out.recipes = sortedRecipes(have);
  return out;
}

/**
 * The move as an upgrade step (user-schema.js `UPGRADE_STEPS` shape), for the
 * day the owner's list and his ruling on reach arrive. It reshapes no store —
 * it moves entries between keys every build already reads — so `reshapes` is
 * empty and no store's number moves.
 */
export function moveStep(moves, recipes, options) {
  return {
    reshapes: {},
    snapshot: (data) => moveSnapshot(data, moves, recipes, options),
    storage: (keys) => moveStorageKeys(keys, moves, recipes, options),
  };
}
