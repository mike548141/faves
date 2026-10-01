// tools/move_recipes.mjs — the one-off move of the owner's Cook at Home
// recipes into his own data, by rewriting an exported backup (roadmap
// 510/050, owner-ruled 2026-10-01). Synthetic people, recipes and notes only;
// the one test that reads the real data checks the PLAN resolves, nothing
// personal. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { moveBackup, personalCopies, insideGitTree } from "../tools/move_recipes.mjs";
import { applyPersonalData, collectPersonalData, parsePersonalData } from "../site/js/personal-data.js";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import { favKey } from "../site/js/favourites.js";
import { MY_RECIPES, RECIPES_KEY } from "../site/js/recipe-record.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(ROOT, "tools/move_recipes.mjs");
const V = "test-kitchen";

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
  Object.defineProperty(s, "length", { get: () => m.size });
  s.key = (i) => [...m.keys()][i] ?? null;
  return s;
}

// A synthetic published collection, and a departed-dish record (ADR 0047's
// shape) holding one recipe that has already left it.
const VENUE = {
  id: V,
  menu: [
    {
      section: "Baking",
      items: [
        { name: "Alpha Bake", dishId: "alpha-bake", steps: ["Mix.", "Bake."], goesWith: ["Beta Stew", "Delta Salad"] },
        { name: "Delta Salad", dishId: "delta-salad", steps: ["Toss."] },
      ],
    },
    { section: "Dinners", items: [{ name: "Beta Stew", dishId: "beta-stew", steps: ["Simmer."] }] },
  ],
};
const HISTORY = {
  venue: V,
  rows: [
    {
      key: { section: "Desserts", sectionId: "desserts", name: "Gamma Pudding", code: null, dishId: "gamma-pudding" },
      item: { name: "Gamma Pudding", dishId: "gamma-pudding", steps: ["Steam."], available: { offBy: "2026-10-02" } },
    },
  ],
};
const PLAN = {
  venueId: V,
  moves: [
    { from: { venueId: V, dishId: "alpha-bake" }, to: "u:alpha-bake" },
    { from: { venueId: V, dishId: "beta-stew" }, to: "u:beta-stew" },
    { from: { venueId: V, dishId: "gamma-pudding" }, to: "u:gamma-pudding" },
  ],
};
const MOVED = ["u:alpha-bake", "u:beta-stew", "u:gamma-pudding"];
const SOURCES = { venue: VENUE, history: HISTORY };

const heart = (dishId, name, venueId = V) => ({ type: "dish", venueId, venueName: "Test Kitchen", name, dishId, isRecipe: true });
const fav = (pid) => scopeKey(pid, "faves.favourites.v1");
const rat = (pid) => scopeKey(pid, "faves.ratings.v1");
const note = (pid) => scopeKey(pid, "faves.notes.v1");
const book = (pid) => scopeKey(pid, RECIPES_KEY);

/** A device with three people: Me (active) holding references to two moved
 *  recipes and one that stays, Sam holding one to a moved recipe, and Kai
 *  holding nothing about any of them. Exported the way Settings exports. */
function deviceBackup({ refs = true } = {}) {
  const st = fakeStorage({
    [PROFILES_KEY]: JSON.stringify({
      v: 1,
      activeId: "default",
      profiles: [
        { id: "default", name: "Me" },
        { id: "p-sam", name: "Sam" },
        { id: "p-kai", name: "Kai" },
      ],
    }),
    [fav("default")]: JSON.stringify([
      ...(refs ? [heart("alpha-bake", "Alpha Bake"), heart("gamma-pudding", "Gamma Pudding")] : []),
      heart("delta-salad", "Delta Salad"),
      { type: "venue", venueId: V, venueName: "Test Kitchen" },
    ]),
    [rat("default")]: JSON.stringify({ ...(refs ? { [`d:${V} alpha-bake`]: 5 } : {}), [`d:${V} delta-salad`]: 3 }),
    [note("default")]: JSON.stringify({ ...(refs ? { [`${V} alpha-bake`]: "less sugar" } : {}), [`${V} delta-salad`]: "fine" }),
    [book("default")]: JSON.stringify({ "u:own": { dishId: "u:own", name: "My Own", steps: ["Cook."] } }),
    [fav("p-sam")]: JSON.stringify(refs ? [heart("beta-stew", "Beta Stew")] : []),
    [rat("p-sam")]: JSON.stringify(refs ? { [`d:${V} beta-stew`]: 4 } : {}),
    [fav("p-kai")]: JSON.stringify([heart("delta-salad", "Delta Salad")]),
    [rat("p-kai")]: JSON.stringify({ [`d:${V} delta-salad`]: 2 }),
    [note("p-kai")]: JSON.stringify({ [`${V} delta-salad`]: "kai's" }),
    "faves.shopping.v1": JSON.stringify([
      ...(refs ? [{ venueId: `${V} alpha-bake`, venueName: "Alpha Bake", dishId: "i:1", name: "flour" }] : []),
      { venueId: `${V} delta-salad`, venueName: "Delta Salad", dishId: "i:1", name: "lettuce" },
    ]),
    // Cook-mode ticks: never in a backup (personal-data.js EXCLUDED).
    [scopeKey("default", "faves.checklist.v1")]: JSON.stringify({ [`${V} alpha-bake`]: { at: 1, t: ["i:1"] } }),
  });
  return collectPersonalData(st, { exportedAt: "2026-10-01T00:00:00.000Z" });
}

const prof = (snap, id) => snap.profiles.find((p) => p.id === id);
const shopping = (snap) => JSON.parse(snap.other["faves.shopping.v1"]);

test("the moved recipes land in the ACTIVE person's cookbook, beside what was there", () => {
  const res = moveBackup(deviceBackup(), PLAN, SOURCES);
  assert.equal(res.ok, true, res.error);
  const me = prof(res.data, "default");
  assert.deepEqual(Object.keys(me.recipes).sort(), ["u:alpha-bake", "u:beta-stew", "u:gamma-pudding", "u:own"]);
  assert.equal(me.recipes["u:alpha-bake"].section, "Baking");
  assert.equal(me.recipes["u:alpha-bake"].movedFrom, `${V} alpha-bake`);
  // A same-collection ref to a recipe that moved too stays a name; one that
  // did not is re-pointed at the published collection.
  assert.deepEqual(me.recipes["u:alpha-bake"].goesWith, ["Beta Stew", `${V}#Delta Salad`]);
  // From the history store: its bookkeeping is not part of the recipe.
  assert.equal(me.recipes["u:gamma-pudding"].section, "Desserts");
  assert.equal("available" in me.recipes["u:gamma-pudding"], false);
  assert.deepEqual(prof(res.data, "p-sam").recipes, {}, "only the active person gets them (owner-ruled)");
  assert.equal(res.summary.added, 3);
  assert.equal(res.summary.present, 3);
});

test("a heart, rating, note and shopping line on a moved recipe follow it; nothing is left on an old id", () => {
  const res = moveBackup(deviceBackup(), PLAN, SOURCES);
  const me = prof(res.data, "default");
  assert.deepEqual(me.favourites.map(favKey), [
    `d:${MY_RECIPES} u:alpha-bake`,
    `d:${MY_RECIPES} u:gamma-pudding`,
    `d:${V} delta-salad`,
    `v:${V}`,
  ]);
  assert.equal(me.ratings[`d:${MY_RECIPES} u:alpha-bake`], 5);
  assert.equal(me.ratings[`d:${V} alpha-bake`], undefined);
  assert.equal(me.notes[`${MY_RECIPES} u:alpha-bake`], "less sugar");
  assert.equal(me.notes[`${V} alpha-bake`], undefined);
  assert.equal(shopping(res.data)[0].venueId, `${MY_RECIPES} u:alpha-bake`);
  // Sam's references move too — onto a recipe only the active person holds,
  // which the summary counts so the run can stop before the import.
  assert.deepEqual(prof(res.data, "p-sam").favourites.map(favKey), [`d:${MY_RECIPES} u:beta-stew`]);
  assert.equal(res.summary.elsewhere, 2);
  assert.deepEqual(res.summary.repointed, { favourites: 3, ratings: 2, notes: 1, shopping: 1 });
  assert.deepEqual(res.summary.left, { favourites: 0, ratings: 0, notes: 0, shopping: 0 });
  // A tick is never in a backup, so there is nothing for the tool to move.
  // (The file's `excluded` table names the store, to say why it is absent.)
  assert.deepEqual(Object.keys(res.data.other).filter((k) => k.includes("checklist")), []);
  assert.equal(JSON.stringify(res.data.profiles).includes("i:1"), false);
});

test("data about other recipes and other people is byte-unchanged", () => {
  const before = deviceBackup();
  const res = moveBackup(before, PLAN, SOURCES);
  const me0 = prof(before, "default");
  const me = prof(res.data, "default");
  const unmoved = (list) => JSON.stringify(list.filter((e) => !String(favKey(e)).match(/alpha-bake|gamma-pudding|beta-stew/)));
  assert.equal(unmoved(me.favourites), unmoved(me0.favourites));
  assert.equal(me.ratings[`d:${V} delta-salad`], 3);
  assert.equal(me.notes[`${V} delta-salad`], "fine");
  assert.equal(JSON.stringify(me.settings), JSON.stringify(me0.settings));
  assert.equal(JSON.stringify(me.recipes["u:own"]), JSON.stringify(me0.recipes["u:own"]));
  assert.equal(JSON.stringify(prof(res.data, "p-kai")), JSON.stringify(prof(before, "p-kai")), "Kai held nothing about them");
  assert.equal(JSON.stringify(shopping(res.data)[1]), JSON.stringify(shopping(before)[1]));
  for (const k of ["format", "v", "stores", "exportedAt", "_readme", "order", "excluded"]) {
    assert.equal(JSON.stringify(res.data[k]), JSON.stringify(before[k]), k);
  }
  assert.deepEqual(Object.keys(res.data.other).sort(), Object.keys(before.other).sort());
});

test("a backup with no reference to any of them still gets every moved recipe", () => {
  const res = moveBackup(deviceBackup({ refs: false }), PLAN, SOURCES);
  assert.equal(res.ok, true, res.error);
  assert.deepEqual(Object.keys(prof(res.data, "default").recipes).sort(), [...MOVED, "u:own"].sort());
  assert.equal(res.summary.added, 3);
  assert.deepEqual(res.summary.repointed, { favourites: 0, ratings: 0, notes: 0, shopping: 0 });
});

test("running it on its own output changes nothing", () => {
  const once = moveBackup(deviceBackup(), PLAN, SOURCES);
  const twice = moveBackup(once.data, PLAN, SOURCES);
  assert.equal(twice.ok, true, twice.error);
  assert.equal(JSON.stringify(twice.data), JSON.stringify(once.data));
  assert.equal(twice.summary.added, 0);
  assert.equal(twice.summary.present, 3);
  assert.deepEqual(twice.summary.repointed, { favourites: 0, ratings: 0, notes: 0, shopping: 0 });
});

test("the output is accepted by the app's own import, with Replace, and lands where the app reads", () => {
  const res = moveBackup(deviceBackup(), PLAN, SOURCES);
  const st = fakeStorage({ "faves.p.old.favourites.v1": "[]" }); // a device with something to replace
  const report = applyPersonalData(st, JSON.stringify(res.data), { mode: "replace" });
  assert.equal(report.ok, true, report.error);
  assert.equal(report.recipesAdded, 4); // three moved + the one already theirs
  assert.equal(st.getItem("faves.p.old.favourites.v1"), null, "Replace replaced");
  const reg = JSON.parse(st.getItem(PROFILES_KEY));
  assert.equal(reg.activeId, "default", "the active person stays active, under the same id");
  assert.deepEqual(Object.keys(JSON.parse(st.getItem(book("default")))).sort(), [...MOVED, "u:own"].sort());
  assert.deepEqual(JSON.parse(st.getItem(fav("default"))).map(favKey).slice(0, 2), [
    `d:${MY_RECIPES} u:alpha-bake`,
    `d:${MY_RECIPES} u:gamma-pudding`,
  ]);
  assert.equal(JSON.parse(st.getItem(rat("default")))[`d:${MY_RECIPES} u:alpha-bake`], 5);
  assert.equal(JSON.parse(st.getItem(note("default")))[`${MY_RECIPES} u:alpha-bake`], "less sugar");
  assert.equal(JSON.parse(st.getItem("faves.shopping.v1"))[0].venueId, `${MY_RECIPES} u:alpha-bake`);
});

test("a recipe in neither the published data nor the history is refused, never half-moved", () => {
  const plan = { ...PLAN, moves: [...PLAN.moves, { from: { venueId: V, dishId: "nowhere" }, to: "u:nowhere" }] };
  const res = moveBackup(deviceBackup(), plan, SOURCES);
  assert.equal(res.ok, false);
  assert.match(res.error, /nowhere/);
  // With the published copies gone, the history alone is enough.
  const gone = { rows: [...HISTORY.rows, ...VENUE.menu.flatMap((s) => s.items.map((item) => ({ key: { section: s.section, dishId: item.dishId }, item })))] };
  const after = moveBackup(deviceBackup(), PLAN, { venue: null, history: gone });
  assert.equal(after.ok, true, after.error);
  assert.equal(JSON.stringify(prof(after.data, "default").recipes), JSON.stringify(prof(moveBackup(deviceBackup(), PLAN, SOURCES).data, "default").recipes));
});

test("something that is not a backup is refused", () => {
  assert.equal(moveBackup({ hello: 1 }, PLAN, SOURCES).ok, false);
  assert.equal(moveBackup(deviceBackup(), { moves: [] }, SOURCES).ok, false);
});

test("the real plan names exactly the owner's five, and each resolves in site/data or data/history", () => {
  const plan = JSON.parse(readFileSync(join(ROOT, "tools/recipe-moves.json"), "utf8"));
  assert.deepEqual(plan.moves.map((m) => m.from.dishId).sort(), [
    "booth-s-ginger-crunch",
    "chocolate-self-saucing-pudding",
    "famous-brade-green-chicken-curry",
    "jesse-s-garlic-chicken-thighs",
    "shane-s-ribs",
  ]);
  const read = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : null);
  const { recipes, missing } = personalCopies(plan, {
    venue: read(`site/data/restaurants/${plan.venueId}.json`),
    history: read(`data/history/dishes/${plan.venueId}.json`),
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(Object.keys(recipes).sort(), plan.moves.map((m) => m.to).sort());
  // Ingredients, not steps: some published recipes carry no steps.
  for (const r of Object.values(recipes)) assert.ok(r.name && r.ingredients?.length, r.dishId);
});

// --- the command line: where it may write, and what it may print ----------

function scratch() {
  return mkdtempSync(join(tmpdir(), "faves-move-recipes-"));
}
const run = (args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });

test("the tool refuses to write inside this repo, or inside any git working tree", (t) => {
  const dir = scratch();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const input = join(dir, "backup.json");
  writeFileSync(input, JSON.stringify(deviceBackup()));
  const inRepo = join(ROOT, "tests", "moved-backup-should-never-exist.json");
  const r = run([input, "--out", inRepo]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /REFUSED — --out is inside a git working tree/);
  assert.equal(existsSync(inRepo), false);
  // Any repo, including a worktree (whose .git is a file).
  const other = join(dir, "repo");
  rmSync(other, { recursive: true, force: true });
  spawnSync("mkdir", ["-p", join(other, "sub")]);
  writeFileSync(join(other, ".git"), "gitdir: elsewhere\n");
  assert.ok(insideGitTree(join(other, "sub")));
  assert.equal(run([input, "--out", join(other, "sub", "out.json")]).status, 1);
  assert.equal(existsSync(join(other, "sub", "out.json")), false);
});

test("the tool writes outside any repo, prints counts and never the contents, and never overwrites", (t) => {
  const dir = scratch();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // A scratch folder under $TMPDIR is outside every git tree on a normal
  // machine; say so plainly rather than pass on a machine where it is not.
  if (insideGitTree(dir)) return t.skip("the temp folder is inside a git tree here");
  const input = join(dir, "backup.json");
  writeFileSync(input, JSON.stringify(deviceBackup()));
  const out = join(dir, "moved.json");
  const r = run([input, "--out", out, "--plan", join(dir, "plan.json")]);
  assert.equal(r.status, 1, "a missing plan is refused");
  // The real plan against the real data: the CLI's own source lookup.
  const ok = run([input, "--out", out]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /recipes added to the active person's cookbook: 5 \(5 of 5 now there\)/);
  assert.match(ok.stdout, /still on an old id: 0/);
  for (const secret of ["less sugar", "Sam", "Kai", "kai's", "flour", "lettuce", "My Own"]) {
    assert.equal(ok.stdout.includes(secret) || ok.stderr.includes(secret), false, `printed "${secret}"`);
  }
  assert.equal(parsePersonalData(readFileSync(out, "utf8")).ok, true);
  // Never overwrites — and run on its own output, writes the same bytes.
  assert.equal(run([input, "--out", out]).status, 1);
  const again = join(dir, "moved-again.json");
  assert.equal(run([out, "--out", again]).status, 0);
  assert.equal(readFileSync(again, "utf8"), readFileSync(out, "utf8"));
});
