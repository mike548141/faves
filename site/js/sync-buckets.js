// Personal recipes in sync: a fixed number of buckets beside the core copy
// (roadmap 510/050, ADR 0146 §2 — owner-ruled "Core copy + recipe buckets").
//
// THE SHAPE. The core copy (everything tied to a profile: hearts, ratings,
// notes, settings, the registry) stays ONE all-or-nothing write, exactly as
// before — a heart still costs one read and one write. Only recipes split, into
// `RECIPE_BUCKETS` buckets stored beside the core copy under the same user key,
// as `<blobId>:r<n>`. A recipe's bucket is a hash of its id, so it never moves.
// The core copy records each bucket's version (the Worker's ETag for it), which
// is what lets a device notice a bucket written without its core update (B2 in
// the cold review): the Worker reports the versions it actually holds, and a
// bucket whose version is not the one the core copy recorded is read and merged
// rather than trusted or ignored.
//
// WHY 8 BUCKETS (measured 2026-09-30, the 25 published Cook at Home recipes as
// the sample): a recipe is 1,112 bytes of compact JSON on average (median 969,
// largest 2,468). User data moves to IndexedDB at 1,000,000 code units
// (user-schema.js STORAGE_THRESHOLD) — about 900 recipes if nothing else were
// stored — and the Worker refuses a body over 256 KiB. Eight buckets put the
// threshold at about 125 KB a bucket, half the cap with room for an unlucky
// hash; four would sit at the cap. More buckets would not make an edit cheaper
// in writes (an edit is one bucket plus the core copy either way), only the
// first upload dearer. Changing the number is a change of the recipes store's
// SHAPE: bump STORE_SCHEMA.recipes with it, so older builds pause rather than
// file recipes into the wrong bucket.
//
// PADDING (the item asked whether it is needed; it is, and it is cheap). The
// ciphertext is exactly as long as the plaintext, so an unpadded bucket tells
// the server "about one recipe was added" (+1 KB) from "a word changed" (+5 B),
// and with few recipes which buckets EXIST tells it how many there are. So each
// bucket's plaintext is padded to a multiple of `BUCKET_PAD` (4 KiB), and once
// any recipe exists all eight buckets are written. With the 25-recipe sample
// that is eight 4 KiB buckets — 32 KiB instead of 28 KB, once — and the server
// learns only the size class of the whole cookbook and that "a recipe bucket
// changed" (M6). The core copy is not padded; that was never in scope.
//
// Pure and DOM-free: no storage, no network. sync.js drives it.

import { USER_SCHEMA } from "./user-schema.js";
import { isPersonalId, sanitiseRecipes, sortedRecipes } from "./recipe-record.js";

export const RECIPE_BUCKETS = 8;
export const BUCKET_PAD = 4096;
export const BUCKET_FORMAT = "faves.recipe-bucket";

/** The query a GET of the core copy carries so the Worker reports the buckets'
 *  versions, and the response header it reports them in. A query rather than a
 *  request header: a custom header on a GET would cost a CORS preflight. */
export const BUCKET_QUERY = "buckets";
export const BUCKET_HEADER = "x-faves-buckets";

/** `r0`…`r7`: a bucket's name, and the suffix of its key on the server. */
export const bucketName = (k) => `r${k}`;

/** FNV-1a, 32-bit. Not a security primitive: the server never sees a recipe
 *  id, only which bucket changed. Stable across devices, which is all a
 *  bucket assignment needs. */
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Which bucket a recipe lives in. */
export const bucketOf = (id, n = RECIPE_BUCKETS) => fnv1a(String(id)) % n;

/** JSON with every object's keys sorted, so two devices holding the same
 *  recipe produce the same string whatever order its fields arrived in. */
export function canonicalJson(v) {
  const canon = (x) => {
    if (Array.isArray(x)) return x.map(canon);
    if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]));
    return x;
  };
  return JSON.stringify(canon(v));
}

/**
 * A 53-bit hash of a recipe (cyrb53). What the sync base keeps per recipe
 * instead of a second copy of the recipe: the three-way merge only ever asks
 * "is this the value we last agreed on?", and a hash answers that for about
 * 20 characters where the recipe costs about 1,100. A collision would make an
 * edit look unchanged; at 53 bits that is not a risk worth a second copy.
 */
export function recipeHash(record) {
  const s = canonicalJson(record);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** `{ id: hash }` for a whole store. */
export const hashRecipes = (map) =>
  Object.fromEntries(Object.keys(map || {}).sort().map((id) => [id, recipeHash(map[id])]));

/** Filter a `{ id: … }` map to the ids in bucket `k`. */
export const inBucket = (map, k, n = RECIPE_BUCKETS) =>
  Object.fromEntries(Object.entries(map || {}).filter(([id]) => bucketOf(id, n) === k));

/**
 * The Worker's report of which buckets exist and their versions. `null` means
 * the Worker said nothing — it predates buckets — and recipes then stay on this
 * device (sync.js), which loses nothing: an old Worker never held any.
 * `"none"` is a Worker that knows buckets and holds none.
 */
export function parseBucketHeader(value) {
  if (value == null) return null;
  const out = {};
  const s = String(value).trim();
  if (!s || s === "none") return out;
  for (const part of s.split(",")) {
    const m = /^\s*(r\d{1,2})=([^,\s]+)\s*$/.exec(part);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const enc = new TextEncoder();

/**
 * The plaintext of bucket `k`, padded so its UTF-8 length is a multiple of
 * `BUCKET_PAD` (see the header). `k` and `n` travel inside the sealed bytes, so
 * a bucket served under the wrong name is refused rather than merged.
 */
export function bucketPlaintext(k, recipes, n = RECIPE_BUCKETS) {
  const body = { format: BUCKET_FORMAT, v: USER_SCHEMA, n, k, recipes: sortedRecipes(recipes), pad: "" };
  const len = enc.encode(JSON.stringify(body)).length;
  const target = Math.ceil(len / BUCKET_PAD) * BUCKET_PAD;
  body.pad = " ".repeat(target - len);
  return body;
}

/** The recipes in an opened bucket, or null when it is not bucket `k` of `n`
 *  in a format this build reads. Recipes are cleaned on the way in, and one
 *  filed in the wrong bucket is left out — it belongs to another bucket's merge. */
export function readBucket(plain, k, n = RECIPE_BUCKETS) {
  if (!plain || typeof plain !== "object" || plain.format !== BUCKET_FORMAT) return null;
  if (plain.k !== k || plain.n !== n) return null;
  const clean = sanitiseRecipes(plain.recipes);
  return Object.fromEntries(Object.entries(clean).filter(([id]) => isPersonalId(id) && bucketOf(id, n) === k));
}

/** Kind of a two-sided recipe conflict, for the caller to report. */
export const CONFLICT_RECIPE = "recipe";

function tieBreak(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return canonicalJson(a) <= canonicalJson(b) ? a : b;
}

/**
 * Three-way merge of one bucket's recipes, against the HASHES of the recipes
 * last agreed (`baseHashes`). `theirs` null means this bucket was not read —
 * the server's copy is the one last agreed — so the answer is simply `mine`:
 * whatever changed here since then is the only change there is.
 *
 * The same rules as `mergeMap` (sync-merge.js), with absence as a value: added
 * on one side is kept, deleted on one side (and unchanged on the other) is
 * gone, and a genuine two-sided difference settles on a value both devices
 * pick alike. An edit on one side beats a deletion on the other — losing a
 * recipe someone just changed is the worse of the two mistakes.
 */
export function mergeRecipeBucket(baseHashes, mine, theirs) {
  const m = mine || {};
  if (theirs == null) return { map: { ...m }, conflicts: [] };
  const b = baseHashes || {};
  const t = theirs;
  const out = {};
  const conflicts = [];
  for (const id of [...new Set([...Object.keys(m), ...Object.keys(t)])].sort()) {
    const mv = m[id];
    const tv = t[id];
    const mh = mv === undefined ? undefined : recipeHash(mv);
    const th = tv === undefined ? undefined : recipeHash(tv);
    const bh = b[id];
    let value;
    if (mh === th) value = mv;
    else if (mh === bh) value = tv; // only they moved
    else if (th === bh) value = mv; // only I moved
    else {
      value = tieBreak(mv, tv);
      conflicts.push({ kind: CONFLICT_RECIPE, key: id, resolved: value === undefined ? null : value.name });
    }
    if (value !== undefined) out[id] = value;
  }
  return { map: out, conflicts };
}
