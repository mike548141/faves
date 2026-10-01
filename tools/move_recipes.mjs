#!/usr/bin/env node
// Move published recipes into the owner's own data, by rewriting an exported
// backup (roadmap 510/050, owner-ruled 2026-10-01).
//
//   node tools/move_recipes.mjs <exported-backup.json> --out <moved.json> [--plan tools/recipe-moves.json]
//
// WHAT IT DOES. Reads a backup the app exported (Settings → back up your
// data), and writes a second file in which every recipe the plan names
// (`tools/recipe-moves.json`) is a personal `u:` recipe in the ACTIVE person's
// cookbook, and every heart, rating, note and shopping-list line that pointed
// at the published copy points at the `u:` one. That file is then imported on
// ONE device with Replace; sync carries it to the rest.
//
// ONE IMPLEMENTATION. The rewrite is the app's own `moveSnapshot` and
// `toPersonalRecipe` (site/js/recipe-move.js), with `add: "all"`; the shopping
// list, which a backup carries in its `other` bag of raw storage keys, goes
// through the same module's `moveStorageKeys`. Nothing here re-implements a
// key format. The output is checked by the app's own `parsePersonalData`
// before it is written, and tests/move-recipes.test.js imports it through
// `applyPersonalData` with Replace — the path the owner will use.
//
// A BACKUP IS PERSONAL DATA AND THIS REPO IS PUBLIC. So the tool refuses to
// write anywhere inside a git working tree (this repo, a worktree of it, or
// any other), refuses to overwrite a file, and prints COUNTS ONLY — never a
// name, a note, a rating or a profile. Keep both files outside the repo, e.g.
// in ~/Downloads, and delete them once the run is verified.
//
// Recipe text comes from site/data/restaurants/<venue>.json, or — once a
// published copy has left by ADR 0047's route — from
// data/history/dishes/<venue>.json, so the tool works on either side of the
// removal. It refuses (exit 1) if any recipe on the plan is in neither.
//
// Running it on its own output changes nothing: a moved heart has no old key
// left to move, and a recipe already in the cookbook is never overwritten.
//
// Exit codes: 0 written, 1 refused (with the reason), 2 usage.
//
// ─── RUNBOOK — the real run, in the order that is safe ──────────────────────
// (Why this order: roadmap 510/050's 2026-10-01 import note. In short: the
// Worker must hold recipe buckets BEFORE the import, or the other devices get
// the moved hearts without the recipes; and the published copies must stay
// until every device has the personal ones, because removing them first marks
// his hearts "not on your current list" and one tap on Remove there deletes a
// heart and its rating before the backup is taken.)
//
//  1. Deploy the recipe-bucket Worker (worker/README.md "Deploying" and
//     "Owed"), then run that section's live checks at once — `?buckets=8`
//     on an unwritten id answers 404 + `X-Faves-Buckets: none`, a bucket PUT
//     answers 204 + ETag, `:r16` answers 400, and both headers are exposed
//     cross-origin. Do not go on until they pass.
//  2. On EVERY synced device: open Faves, Settings → Sync now, until each
//     says synced. Then change nothing on any device until step 6 is done:
//     an edit made elsewhere to one of the five old recipes in that window
//     can bring its old heart or rating back (a two-sided change resolves
//     to "keep it").
//  3. On the device you will import on (device A): Settings → back up your
//     data. Save it OUTSIDE the repo (e.g. ~/Downloads).
//  4. node tools/move_recipes.mjs ~/Downloads/faves-data-<date>.json \
//        --out ~/Downloads/faves-data-<date>-moved.json
//     Expect "recipes added to the active person's cookbook: 5" and
//     "still on an old id: 0". The active person is whoever was showing on
//     device A when you exported — switch to yourself first if not.
//  5. On device A, straight away: Settings → restore → pick the -moved file
//     → Replace. Anything changed on A between steps 3 and 5 is lost, and
//     sync then removes it everywhere. Then Settings → Sync now.
//  6. On device B (and each other device): open Faves, Sync now. Check: the
//     five are under "My recipes" in Favourites, hearted and rated as before,
//     notes intact; the five Cook at Home rows are no longer hearted. Sync
//     now once more on A and B — nothing should change.
//  7. Only then remove the five published copies from site/data/ by ADR
//     0047's route (they move whole to data/history/dishes/cook-at-home.json).
//     That edit also has to drop "Booth's Ginger Crunch" and "Shane's Ribs"
//     from the venue's `picks`, and update every check and test that uses
//     one of the five as a fixture.
//  8. Delete both backup files once satisfied. Until step 7 the original is
//     the way back: Replace-import it on A and sync reverses the move.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { moveMapOf, moveSnapshot, moveStorageKeys, toPersonalRecipe } from "../site/js/recipe-move.js";
import { MY_RECIPES } from "../site/js/recipe-record.js";
import { parsePersonalData, personalDataJson } from "../site/js/personal-data.js";
import { favKey } from "../site/js/favourites.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOPPING_KEY = "faves.shopping.v1"; // shopping.js SHOPPING_KEY
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

/** Every dish of a venue record, with the section it sits in. */
function* publishedDishes(venue) {
  for (const s of Array.isArray(venue?.menu) ? venue.menu : []) {
    for (const item of Array.isArray(s?.items) ? s.items : []) yield { item, section: s.section };
  }
}

/**
 * The personal copies the plan asks for: `{ "<u: id>": record }`, plus the
 * dishes found in neither source. `venue` is the published record (or null
 * once it has gone), `history` the departed-dish record (or null).
 */
export function personalCopies(plan, { venue = null, history = null } = {}) {
  const moves = Array.isArray(plan?.moves) ? plan.moves : [];
  const found = new Map(); // dish id → { item, section }
  for (const d of publishedDishes(venue)) if (d.item?.dishId) found.set(d.item.dishId, d);
  for (const row of Array.isArray(history?.rows) ? history.rows : []) {
    const id = row?.item?.dishId || row?.key?.dishId;
    if (!id || found.has(id)) continue;
    // `available.offBy` is the history store's own bookkeeping, not recipe.
    const { available: _, ...item } = row.item || {};
    found.set(id, { item, section: row.key?.section });
  }
  const want = moves.map((m) => ({ ...m, hit: found.get(m?.from?.dishId) }));
  const movedNames = new Set(want.filter((w) => w.hit).map((w) => w.hit.item.name));
  const recipes = {};
  const missing = [];
  for (const w of want) {
    if (!w.hit) {
      missing.push(w?.from?.dishId);
      continue;
    }
    const r = toPersonalRecipe(w.hit.item, { venueId: w.from.venueId, section: w.hit.section, to: w.to, movedNames });
    if (r) recipes[w.to] = r;
    else missing.push(w.from.dishId);
  }
  return { recipes, missing };
}

/** How many references in a snapshot still point at a recipe the plan moves,
 *  per store. Used before and after, so the summary is measured, not assumed. */
export function countOld(snapshot, moves) {
  const map = moveMapOf(moves);
  const out = { favourites: 0, ratings: 0, notes: 0, shopping: 0 };
  for (const p of Array.isArray(snapshot?.profiles) ? snapshot.profiles : []) {
    for (const e of Array.isArray(p?.favourites) ? p.favourites : []) {
      if (e?.type === "dish" && map.has(favKey(e).slice(2))) out.favourites += 1;
    }
    for (const k of Object.keys(isObj(p?.ratings) ? p.ratings : {})) if (k.startsWith("d:") && map.has(k.slice(2))) out.ratings += 1;
    for (const k of Object.keys(isObj(p?.notes) ? p.notes : {})) if (map.has(k)) out.notes += 1;
  }
  let lines = [];
  try {
    lines = JSON.parse(snapshot?.other?.[SHOPPING_KEY] ?? "[]");
  } catch {
    /* a corrupt list moves nothing and counts nothing */
  }
  for (const l of Array.isArray(lines) ? lines : []) if (map.has(l?.venueId)) out.shopping += 1;
  return out;
}

/** The active person's index: the one marked active, else the first — the
 *  same reading moveSnapshot and the import make. */
const activeIndex = (snap) => Math.max(0, (snap?.profiles || []).findIndex((p) => isObj(p) && p.active));

/**
 * The whole rewrite, pure. Returns `{ ok: true, data, summary }` or
 * `{ ok: false, error }`. `data` is the moved backup object.
 */
export function moveBackup(raw, plan, sources) {
  if (!parsePersonalData(raw).ok) return { ok: false, error: "the input is not a Faves backup this build can read" };
  if (!Array.isArray(raw.profiles) || !raw.profiles.length) return { ok: false, error: "the backup has no people in it" };
  const moves = Array.isArray(plan?.moves) ? plan.moves : [];
  const map = moveMapOf(moves);
  if (!map.size || map.size !== moves.length) return { ok: false, error: "the move plan is empty or has an invalid move" };
  const { recipes, missing } = personalCopies(plan, sources);
  if (missing.length) return { ok: false, error: `${missing.length} recipe(s) on the plan are in neither site/data nor data/history: ${missing.join(", ")}` };

  const before = countOld(raw, moves);
  const ai = activeIndex(raw);
  const hadIds = new Set(Object.keys(isObj(raw.profiles[ai]?.recipes) ? raw.profiles[ai].recipes : {}));
  const data = moveSnapshot(raw, moves, recipes, { add: "all" });
  // The shopping list is device-wide and travels in the raw `other` bag; it is
  // the storage half's to move. No recipes passed, so no cookbook is added
  // there — the cookbook goes in the named per-person field above.
  if (isObj(data.other)) data.other = moveStorageKeys(data.other, moves, {}, { add: "referenced" });
  const after = countOld(data, moves);
  const book = isObj(data.profiles[ai]?.recipes) ? data.profiles[ai].recipes : {};
  const added = [...map.values()].filter((id) => id in book && !hadIds.has(id)).length;
  const present = [...map.values()].filter((id) => id in book).length;

  const check = parsePersonalData(data);
  if (!check.ok) return { ok: false, error: `the rewritten backup would not import: ${check.error}` };
  const imported = check.data.profiles[ai];
  if (!imported || [...map.values()].some((id) => !(id in (imported.recipes || {})))) {
    return { ok: false, error: "the rewritten backup lost a moved recipe on the app's own parse" };
  }
  // A person other than the active one whose heart, rating or note moved now
  // points at a `u:` recipe only the active person's cookbook holds — the
  // owner's ruling (the active person gets the recipes) leaves theirs
  // unresolved. Counted so the run can be stopped before the import.
  const elsewhere = data.profiles.reduce((n, p, i) => {
    if (i === ai || !isObj(p)) return n;
    const own = isObj(p.recipes) ? p.recipes : {};
    const refs = [
      ...(Array.isArray(p.favourites) ? p.favourites : []).filter((e) => e?.venueId === MY_RECIPES).map((e) => e.dishId),
      ...Object.keys(isObj(p.ratings) ? p.ratings : {}).filter((k) => k.startsWith(`d:${MY_RECIPES} `)).map((k) => k.split(" ")[1]),
      ...Object.keys(isObj(p.notes) ? p.notes : {}).filter((k) => k.startsWith(`${MY_RECIPES} `)).map((k) => k.split(" ")[1]),
    ];
    return n + refs.filter((id) => [...map.values()].includes(id) && !(id in own)).length;
  }, 0);
  const repointed = Object.fromEntries(Object.keys(before).map((k) => [k, before[k] - after[k]]));
  return {
    ok: true,
    data,
    summary: { added, present, total: map.size, people: raw.profiles.length, active: ai + 1, repointed, left: after, elsewhere },
  };
}

/** Is `dir` (an existing directory) inside any git working tree? Walks up
 *  looking for `.git`, a directory in a primary checkout and a file in a
 *  worktree, so it needs no git binary. */
export function insideGitTree(dir) {
  let d = realpathSync(dir);
  for (;;) {
    if (existsSync(join(d, ".git"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readIfThere = (p) => (existsSync(p) ? readJson(p) : null);

function usage(msg) {
  if (msg) console.error(`move_recipes: ${msg}`);
  console.error("usage: node tools/move_recipes.mjs <exported-backup.json> --out <moved.json> [--plan <plan.json>]");
  return 2;
}

export function main(argv) {
  const args = [...argv];
  let input = null;
  let out = null;
  let planPath = join(ROOT, "tools/recipe-moves.json");
  while (args.length) {
    const a = args.shift();
    if (a === "--out") out = args.shift();
    else if (a === "--plan") planPath = args.shift();
    else if (a === "-h" || a === "--help") return usage();
    else if (a.startsWith("-")) return usage(`unknown option ${a}`);
    else if (!input) input = a;
    else return usage("one backup at a time");
  }
  if (!input || !out) return usage("both a backup and --out are required");

  const refuse = (why) => {
    console.error(`move_recipes: REFUSED — ${why}`);
    return 1;
  };
  const outAbs = resolve(out);
  const outDir = dirname(outAbs);
  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) return refuse("the --out folder does not exist");
  const tree = insideGitTree(outDir);
  if (tree) return refuse(`--out is inside a git working tree (${tree}). A backup is personal data; write it outside any repo, e.g. ~/Downloads.`);
  if (existsSync(outAbs)) return refuse("--out already exists; this tool never overwrites a file");

  let raw;
  let plan;
  try {
    raw = readJson(input);
  } catch {
    return refuse("the backup could not be read as JSON");
  }
  try {
    plan = readJson(planPath);
  } catch {
    return refuse("the move plan could not be read");
  }
  const venueId = plan?.venueId;
  if (typeof venueId !== "string" || !/^[a-z0-9-]+$/.test(venueId)) return refuse("the move plan names no valid venueId");
  const sources = {
    venue: readIfThere(join(ROOT, "site/data/restaurants", `${venueId}.json`)),
    history: readIfThere(join(ROOT, "data/history/dishes", `${venueId}.json`)),
  };
  const res = moveBackup(raw, plan, sources);
  if (!res.ok) return refuse(res.error);
  writeFileSync(outAbs, personalDataJson(res.data), { flag: "wx" });

  const s = res.summary;
  console.log(`move_recipes: wrote ${outAbs}`);
  console.log(`  people in the backup: ${s.people}; the active one is person ${s.active}`);
  console.log(`  recipes added to the active person's cookbook: ${s.added} (${s.present} of ${s.total} now there)`);
  console.log(`  re-pointed to the u: ids — favourites: ${s.repointed.favourites}, ratings: ${s.repointed.ratings}, notes: ${s.repointed.notes}, shopping lines: ${s.repointed.shopping}`);
  const left = Object.values(s.left).reduce((a, b) => a + b, 0);
  console.log(`  still on an old id: ${left}`);
  console.log(`  references held by OTHER people to a moved recipe they have no copy of: ${s.elsewhere}`);
  console.log("  cook-mode ticks are never in a backup; Replace clears this device's, and other devices' expire within 12 hours.");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
