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
const PROFILES_KEY = "faves.profiles.v1"; // profiles.js; named here to stay pure
const DEFAULT_ID = "default"; // profiles.js: the first profile on every device

// PER PERSON (roadmap 510/120, owner-ruled "Per person"). A moved recipe lands
// in the cookbook of each person on the device who held something about it —
// their heart, rating, note or ticks — never in a device-wide one. The
// shopping list is the device's, so a line on it counts for whoever is active.
// With `add: "all"` (the owner's own devices) every moved recipe goes to the
// ACTIVE person: which person, when a device has several, is a question the
// ruling did not settle (roadmap 510/120's note).
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
// build never migrated is still that person's data — the first profile's).
const STORE_OF = [
  [/\.favourites\.v1$/, "favourites"],
  [/\.ratings\.v1$/, "ratings"],
  [/\.notes\.v1$/, "notes"],
  [/\.checklist\.v1$/, "checklist"],
];

/** The profile a per-profile key belongs to: the id in `faves.p.<id>.<store>`,
 *  or the first profile's for a pre-profile key. */
function profileOfKey(key, re) {
  if (!key.startsWith("faves.p.")) return DEFAULT_ID;
  const m = re.exec(key);
  return m ? key.slice("faves.p.".length, m.index) : DEFAULT_ID;
}

/** `faves.p.<id>.recipes.v1` (profiles.js scopeKey), built here to stay pure. */
const scopedRecipesKey = (pid) => `faves.p.${pid}.${RECIPES_KEY.slice("faves.".length)}`;

/** Add the wanted personal copies to one person's cookbook, never over a
 *  recipe already there. Returns the new cookbook, or null if nothing changed. */
function addToCookbook(have, recipes, wanted) {
  const book = sanitiseRecipes(have);
  let added = 0;
  for (const [id, record] of Object.entries(sanitiseRecipes(recipes))) {
    if (!wanted.has(id) || id in book) continue;
    book[id] = record;
    added += 1;
  }
  return added ? sortedRecipes(book) : null;
}

/**
 * Apply the move to a device's storage, given as `{ "faves.x": "<json>" }` —
 * the shape an upgrade step's `storage` half receives (user-schema.js). Returns
 * a NEW map; never mutates its input, never throws.
 *
 * `recipes` is `{ "<u: id>": record }`, the personal copies (toPersonalRecipe).
 * `add` decides who gets them:
 *   • "referenced" — each person gets the ones they held something about (a
 *     heart, a rating, a note, ticks; a shopping line counts for whoever is
 *     active), so a stranger's phone does not gain a cookbook it never asked
 *     for, and one person's heart does not fill another's cookbook;
 *   • "all" — every one, to the active person (the owner's own devices).
 * A recipe already in a cookbook is never overwritten.
 */
export function moveStorageKeys(keys, moves, recipes = {}, { add = "referenced" } = {}) {
  const map = moveMapOf(moves);
  const out = { ...(isObj(keys) ? keys : {}) };
  if (!map.size) return out;
  const active = String(parse(out[PROFILES_KEY])?.activeId || DEFAULT_ID);
  const byPerson = new Map(); // profile id → Set of u: ids they referenced
  const refsOf = (pid) => {
    if (!byPerson.has(pid)) byPerson.set(pid, new Set());
    return byPerson.get(pid);
  };
  for (const [k, raw] of Object.entries(out)) {
    if (!k.startsWith("faves.") || typeof raw !== "string") continue;
    let next = null;
    if (k === SHOPPING_KEY) next = moveShopping(parse(raw), map, refsOf(active));
    else {
      const hit = STORE_OF.find(([re]) => re.test(k));
      if (!hit) continue;
      const [re, store] = hit;
      const refs = refsOf(profileOfKey(k, re));
      if (store === "favourites") next = moveFavourites(parse(raw), map, refs);
      else if (store === "ratings") next = moveKeyedMap(parse(raw), map, "d:", refs);
      else next = moveKeyedMap(parse(raw), map, "", refs); // notes, checklist
    }
    if (next) out[k] = JSON.stringify(next);
  }
  const wanted = add === "all" ? new Map([[active, new Set(map.values())]]) : byPerson;
  for (const [pid, ids] of wanted) {
    if (!ids.size) continue;
    const key = scopedRecipesKey(pid);
    const book = addToCookbook(parse(out[key]), recipes, ids);
    if (book) out[key] = JSON.stringify(book);
  }
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
  const list = Array.isArray(snapshot.profiles) ? snapshot.profiles : null;
  const activeIdx = list ? Math.max(0, list.findIndex((p) => isObj(p) && p.active)) : -1;
  const profiles = list
    ? list.map((p, i) => {
        if (!isObj(p)) return p;
        const next = { ...p };
        const referenced = new Set();
        const fav = moveFavourites(p.favourites, map, referenced);
        const rat = moveKeyedMap(p.ratings, map, "d:", referenced);
        const note = moveKeyedMap(p.notes, map, "", referenced);
        if (fav) next.favourites = fav;
        if (rat) next.ratings = rat;
        if (note) next.notes = note;
        // Per person (510/120): into this profile's own cookbook.
        const wanted = add === "all" ? (i === activeIdx ? new Set(map.values()) : new Set()) : referenced;
        const book = addToCookbook(p.recipes, recipes, wanted);
        if (book) next.recipes = book;
        return next;
      })
    : snapshot.profiles;
  return { ...snapshot, profiles };
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
