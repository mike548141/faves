// The personal recipe RECORD — its id, its shape and its cleaning — with no
// storage in sight (roadmap 510/050). Split from recipes.js (the store) so
// that pure code can use it: sync-buckets.js, and recipe-move.js, which an
// upgrade step may import, and user-schema.js's rule is that nothing the
// startup chain imports may read a store when it loads (recipes.js builds one).
// The header of recipes.js says what a personal recipe is and why.

/** The cookbook's BASE key: `{ "<u: id>": <recipe record> }`. Per person
 *  since roadmap 510/120 (owner-ruled "Per person"), like hearts: each profile
 *  keeps its own at `faves.p.<profile id>.recipes.v1` (profiles.js scopeKey),
 *  and nothing stores anything at this bare key. */
export const RECIPES_KEY = "faves.recipes.v1";

/** The id prefix that marks a recipe as personal. */
export const PERSONAL_PREFIX = "u:";

/** The one virtual collection every personal recipe belongs to. Never fetched
 *  from site/data/; built from the store by `personalCollection`. */
export const MY_RECIPES = "u:mine";
export const MY_RECIPES_NAME = "My recipes";

/** A personal recipe id: `u:` then a slug. Bounded, and slug-shaped so it is
 *  safe in a URL query, a storage key and a sync bucket without escaping. */
const ID_RE = /^u:[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

/** Is this a personal recipe id (`u:…`)? */
export const isPersonalId = (id) => typeof id === "string" && ID_RE.test(id);

/** Is this venue id the personal collection? */
export const isPersonalVenue = (venueId) => venueId === MY_RECIPES;

// The store is sealed into sync buckets and read back from backup files, so a
// record is bounded the way every other imported value is. The largest
// published recipe is 2,468 bytes of compact JSON (measured 2026-09-30); 32,000
// characters is thirteen times that, and a pasted novel is refused rather than
// clipped (a half-recipe would read as a whole one).
export const MAX_RECIPE_CHARS = 32_000;
export const MAX_RECIPES = 2000;

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v, n) => (typeof v === "string" && v.trim() ? v.slice(0, n) : undefined);
const strList = (v, n, each = 2000) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, n).map((x) => x.slice(0, each)) : undefined;
const num = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

/** A link that leaves the app: only http(s). A `javascript:` URL in an href is
 *  the one way a stored record could run code on this page. */
function safeHref(v) {
  if (typeof v !== "string") return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

/** An image: a path on this site (as the published recipes use), or https. */
function safeImage(v) {
  if (typeof v !== "string" || !v) return undefined;
  if (/^[a-z0-9_.\-/]+$/i.test(v) && !v.startsWith("/") && !v.includes("..")) return v;
  return safeHref(v)?.startsWith("https:") ? v : undefined;
}

/**
 * One recipe record, or null. The fields the recipe page renders are checked
 * for type, and a wrong-typed one is dropped rather than trusted. Every OTHER
 * field is carried untouched: a newer build may add one, and a whitelist here
 * would shed it on the next write (the lesson of ADR 0118 and ADR 0127). The
 * whole record is bounded by `MAX_RECIPE_CHARS` instead.
 */
export function sanitiseRecipe(raw) {
  if (!isObj(raw) || !isPersonalId(raw.dishId)) return null;
  const name = str(raw.name, 200);
  if (!name) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(k) || v === undefined) continue;
    out[k] = v;
  }
  out.dishId = raw.dishId;
  out.name = name.trim();
  const typed = {
    desc: str(raw.desc, 2000),
    time: str(raw.time, 80),
    difficulty: str(raw.difficulty, 40),
    section: str(raw.section, 80),
    alt: str(raw.alt, 300),
    attribution: str(raw.attribution, 300),
    attributionUrl: safeHref(raw.attributionUrl),
    image: safeImage(raw.image),
    serves: num(raw.serves) ?? str(raw.serves, 40),
    prepMinutes: num(raw.prepMinutes),
    cookMinutes: num(raw.cookMinutes),
    tags: strList(raw.tags, 60, 60),
    steps: strList(raw.steps, 200),
    goesWith: strList(raw.goesWith, 40, 200),
    estimated: strList(raw.estimated, 20, 40),
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.slice(0, 300) : undefined,
    tagNotes: isObj(raw.tagNotes)
      ? Object.fromEntries(
          Object.entries(raw.tagNotes).filter(([k, v]) => !UNSAFE_KEYS.has(k) && typeof v === "string").map(([k, v]) => [k, v.slice(0, 500)])
        )
      : undefined,
  };
  for (const [k, v] of Object.entries(typed)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  // `desc: null` is how the published data says "no description"; keep it.
  if (raw.desc === null) out.desc = null;
  let size;
  try {
    size = JSON.stringify(out).length;
  } catch {
    return null; // a cycle or a BigInt — not JSON, not a recipe
  }
  return size <= MAX_RECIPE_CHARS ? out : null;
}

/** A whole store (`{ id: record }`), cleaned. A record filed under a key that
 *  is not its own id is filed under its id; the first of two claiming one id
 *  wins, in sorted key order so two devices agree. */
export function sanitiseRecipes(map) {
  const out = {};
  if (!isObj(map)) return out;
  let n = 0;
  for (const key of Object.keys(map).sort()) {
    if (UNSAFE_KEYS.has(key)) continue;
    const r = sanitiseRecipe(map[key]);
    if (!r || r.dishId in out) continue;
    out[r.dishId] = r;
    if (++n >= MAX_RECIPES) break;
  }
  return out;
}

/** The same map with its keys in sorted order — what every writer stores, so
 *  two devices holding the same recipes hold the same bytes. */
export function sortedRecipes(map) {
  return Object.fromEntries(Object.keys(map || {}).sort().map((k) => [k, map[k]]));
}

/**
 * The virtual collection the recipe page and the Favourites view resolve a
 * personal recipe against: the published record's shape (`id`, `name`,
 * `menu: [{ section, items }]`), so `findDish`, `unresolvedReason` and
 * render() read it with no second code path. Sections follow each recipe's
 * own `section` (a moved recipe keeps the one it had), sorted by name.
 */
export function personalCollection(map) {
  const bySection = new Map();
  for (const r of Object.values(map || {})) {
    const s = r.section || MY_RECIPES_NAME;
    if (!bySection.has(s)) bySection.set(s, []);
    bySection.get(s).push(r);
  }
  const menu = [...bySection.keys()].sort().map((section) => ({
    section,
    items: bySection.get(section).sort((a, b) => a.name.localeCompare(b.name)),
  }));
  return { id: MY_RECIPES, name: MY_RECIPES_NAME, kind: "recipes", menu };
}


// --- every person's cookbook as one map (roadmap 510/120) --------------------
//
// A backup carries each person's cookbook inside their profile, as it carries
// their hearts. Sync's recipe buckets and the three-way merge want ONE flat map
// — every recipe has one place, one bucket and one hash — so the two shapes
// meet here. A flat key is `"<u: id> <profile id>"`: the recipe id first,
// because a `u:` id is slug-shaped and never holds a space, so the first space
// always divides the two however odd an imported profile id is.

/** The flat key of recipe `id` in profile `profileId`'s cookbook. */
export const cookbookKey = (profileId, id) => `${id} ${profileId}`;

/** `{ id, profileId }` from a flat key, or null when it is not one. */
export function splitCookbookKey(key) {
  const i = typeof key === "string" ? key.indexOf(" ") : -1;
  if (i < 1 || i === key.length - 1) return null;
  const id = key.slice(0, i);
  return isPersonalId(id) ? { id, profileId: key.slice(i + 1) } : null;
}

/** Every person's cookbook in a snapshot's `profiles`, as one flat map, each
 *  record cleaned. A profile with no id has no key to be filed under. */
export function flattenCookbooks(profiles) {
  const out = {};
  for (const p of Array.isArray(profiles) ? profiles : []) {
    const pid = typeof p?.id === "string" ? p.id : "";
    if (!pid) continue;
    for (const [id, r] of Object.entries(sanitiseRecipes(p.recipes))) out[cookbookKey(pid, id)] = r;
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

/** A flat map back into `Map<profile id, { id: record }>`. A key that is not a
 *  flat key, or a record whose id is not the one in its key, is left out. */
export function groupCookbooks(flat) {
  const out = new Map();
  for (const [key, r] of Object.entries(isObj(flat) ? flat : {})) {
    const k = splitCookbookKey(key);
    const clean = sanitiseRecipe(r);
    if (!k || !clean || clean.dishId !== k.id) continue;
    if (!out.has(k.profileId)) out.set(k.profileId, {});
    out.get(k.profileId)[k.id] = clean;
  }
  for (const [pid, m] of out) out.set(pid, sortedRecipes(m));
  return out;
}
