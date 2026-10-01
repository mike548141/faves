// Roadmap 510/320: after the 510/050 recipe move, the owner's laptop showed the
// four old recipe hearts back BESIDE their moved copies, three hearts removed
// days earlier back too, and nothing removed (53 → 60 dishes). This file runs
// the routes that could make a device that has synced before merge with no
// base, a base that does not cover the person, or an additive write, through
// the real client modules and the real Worker (tests/stale-sync-harness.js).
//
// What the runs show (docs/reviews/…-old-hearts-320-routes.md has the table):
//
//   • 320's shape needs TWO things in one merge: an OLD list (one holding the
//     old ids and the since-removed hearts) and a merge that cannot tell its
//     additions from its deletions. Either alone is harmless: a lost base with
//     no old list anywhere settles correctly, and an old list against a good
//     base undoes the move (the #76 route) rather than doubling it.
//   • One user action supplies both at once: receiving a shortlist shared
//     before the move ("Add to favourites"), as Apply and a third copy of the
//     app already did in 510/340's harness. That one is NEW to 320 and has not
//     been put to the owner.
//   • The schema chain, Replace and a base naming another person are NOT ways
//     in on his timeline: the chain is the identity (no step has ever shipped),
//     Replace keeps every profile id, and a base naming another id heals in one
//     cycle.
//
// THE THREE ROUTES THAT MADE THE OWNER'S SHAPE were `todo` until 510/400 (a
// heart on a moved recipe follows it) made each pass as written: the old ids
// land on the moved recipes, so no route can put one beside the other. The
// since-removed hearts still come back on the base-fault routes; 510/390 is
// the guard for that, and strengthens those two tests when it lands. The
// others pin why a route is NOT 320; one of them changed with 400 (an old list
// against a good base no longer undoes the move).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  EdgeKV,
  CACHE_TTL_MS,
  device,
  venue,
  favsOf,
  setFavs,
  unheart,
  phone,
  moveOn,
  moveShape,
  kHeart,
  MOVED,
  MOVE_PLAN,
  MOVE_SOURCES,
} from "./stale-sync-harness.js";
import { applyPersonalData, collectPersonalData } from "../site/js/personal-data.js";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import { createFavourites, groupForShare } from "../site/js/favourites.js";
import { encodeShortlist, decodeShare } from "../site/js/share-codec.js";
import { SYNC_BASE_KEY } from "../site/js/sync.js";
import { upgradeStorage, UPGRADE_STEPS, USER_SCHEMA } from "../site/js/user-schema.js";
import { moveBackup } from "../tools/move_recipes.mjs";

/** Hearts removed some days before the move: the "3 others" that came back. */
const X = ["x1", "x2", "x3"];
/** Hearts nobody touched: the owner lost none, so neither may a route. */
const KEEP = ["kk", "laksa", "pho"];
const start = () => [...KEEP.map(venue), ...MOVED.map(kHeart), ...X.map(venue)];

/** The owner's shape: every moved recipe hearted on both ids, X back, nothing lost. */
function ownerShape(keys) {
  return (
    moveShape(keys).both === MOVED.length &&
    X.every((x) => keys.includes(`v:${x}`)) &&
    KEEP.every((k) => keys.includes(`v:${k}`))
  );
}

/** Every location's cache runs out, then each device syncs twice. */
async function settle(kv, ...ds) {
  kv.clock += 3 * CACHE_TTL_MS;
  for (let i = 0; i < 2; i += 1) for (const d of ds) assert.equal((await d.sync.syncNow()).ok, true);
}

/**
 * Laptop A and phone B, paired. A removes X, both agree; A runs the import
 * (export, tool, Replace) and both agree again — the state the owner checked at
 * 21:13–21:15. Each step is two KV cache windows apart, so no read is stale
 * (510/340 is a separate defect and not under test here). `old` is A's list
 * before X went, which is what a page loaded then still holds in memory.
 */
async function importedAndAgreed() {
  const kv = new EdgeKV();
  const a = phone(device(start()), kv, { loc: "L1" });
  const b = phone(device(start()), kv, { loc: "L2" });
  const gap = () => {
    kv.clock += 2 * CACHE_TTL_MS;
  };
  const { code } = await a.sync.enable();
  gap();
  await b.sync.join(code);
  gap();
  const old = JSON.parse(a.storage.getItem(scopeKey("default", "faves.favourites.v1")));
  for (const x of X) unheart(a.storage, `v:${x}`);
  await a.sync.syncNow();
  gap();
  await b.sync.syncNow();
  gap();
  moveOn(a.storage);
  await a.sync.syncNow();
  gap();
  await b.sync.syncNow();
  gap();
  for (const [n, d] of [["laptop", a], ["phone", b]]) {
    const keys = favsOf(d.storage);
    assert.equal(moveShape(keys).movedOnly, MOVED.length, `${n}: the import was not correct before the route ran`);
    assert.equal(X.some((x) => keys.includes(`v:${x}`)), false, `${n}: a removed heart was back before the route ran`);
  }
  return { kv, a, b, old, gap };
}

const scoped = (st) => ({
  getItem: (k) => st.getItem(scopeKey("default", k)),
  setItem: (k, v) => st.setItem(scopeKey("default", k), v),
  removeItem: (k) => st.removeItem(scopeKey("default", k)),
});

// --- the routes that made the shape, now guarded by 510/400 -------------------

test("510/320: a shortlist shared before the move and received after it does not put old hearts beside the moved ones", async () => {
  // Share-receive's "Add to favourites" is favourites.merge(): additive by
  // design, so on a synced device it is this device's own addition and the
  // three-way merge carries it everywhere. A shortlist made before the move
  // names the old ids and the hearts since removed — one tap supplies both
  // ingredients of the owner's shape. The person asked for those hearts, so
  // they land (X included): what 510/400 stops is two hearts for one recipe,
  // because the old ids follow the moved recipes in this person's cookbook.
  const { kv, a, b, old } = await importedAndAgreed();
  const token = encodeShortlist({ label: "", groups: groupForShare(old) });
  const added = createFavourites(scoped(a.storage)).merge(decodeShare(token).items);
  assert.ok(added > 0, "the shortlist added nothing, so this test proves nothing");
  await settle(kv, a, b);
  for (const [n, d] of [["laptop", a], ["phone", b]]) {
    const keys = favsOf(d.storage);
    assert.equal(ownerShape(keys), false, `${n}: the owner's exact shape (old beside moved, X back, nothing lost)`);
    assert.equal(moveShape(keys).both, 0, `${n}: an old heart sits beside its moved copy`);
    assert.equal(moveShape(keys).movedOnly, MOVED.length, `${n}: a moved recipe lost its heart`);
    assert.ok(X.every((x) => keys.includes(`v:${x}`)), `${n}: the shortlist's hearts the person asked for did not land`);
  }
});

for (const [fault, breakBase] of [
  ["is unreadable", (st) => st.setItem(SYNC_BASE_KEY, "{not json")],
  [
    "names another profile id",
    (st) => {
      const base = JSON.parse(st.getItem(SYNC_BASE_KEY));
      for (const p of base.profiles) p.id = "someone-else";
      st.setItem(SYNC_BASE_KEY, JSON.stringify(base));
    },
  ],
]) {
  test(`510/320: a synced device whose base ${fault} does not merge an old list in beside the move`, async () => {
    // The second ingredient on its own is a page that loaded before X went and
    // before the move, writing its whole list (every build before PR #76 did).
    // Against a good base that UNDOES the move (the next test pins it); against
    // no base — or one that does not cover this person — every difference is
    // an addition, so the old ids and X join the moved hearts on both devices.
    const { kv, a, b, old } = await importedAndAgreed();
    breakBase(a.storage);
    setFavs(a.storage, [...old, venue("tapped")]);
    await settle(kv, a, b);
    for (const [n, d] of [["laptop", a], ["phone", b]]) {
      const keys = favsOf(d.storage);
      assert.equal(ownerShape(keys), false, `${n}: the owner's exact shape (old beside moved, X back, nothing lost)`);
      assert.equal(moveShape(keys).both, 0, `${n}: an old heart sits beside its moved copy`);
    }
  });
}

// --- why the other routes are not 320 (pass today) ---------------------------

test("510/320: each ingredient alone does not make the shape — a lost base with no old list settles, asking nothing; an old list against a good base no longer undoes the move (510/400)", async () => {
  {
    const { kv, a, b } = await importedAndAgreed();
    a.storage.setItem(SYNC_BASE_KEY, "{not json");
    await settle(kv, a, b);
    for (const d of [a, b]) {
      const keys = favsOf(d.storage);
      assert.equal(moveShape(keys).movedOnly, MOVED.length, "a lost base alone changed the move");
      assert.equal(X.some((x) => keys.includes(`v:${x}`)), false, "a lost base alone brought a removed heart back");
    }
  }
  {
    // The #76 route in its pre-fix form. Until 510/400 the moved hearts WENT
    // (the old list's old ids won). Now the old ids follow the moved recipes
    // in this person's cookbook, so the move stands. X still comes back —
    // the old list holds it and the base says it is new here — which 400
    // does not claim to stop (PR #76 stopped that page writing at all).
    const { kv, a, b, old } = await importedAndAgreed();
    setFavs(a.storage, [...old, venue("tapped")]);
    await settle(kv, a, b);
    for (const d of [a, b]) {
      const s = moveShape(favsOf(d.storage));
      assert.equal(s.both, 0, "an old list against a good base doubled a heart");
      assert.equal(s.movedOnly, MOVED.length, "the old list undid the move (the #76 shape) — 510/400 should keep it");
    }
  }
});

test("510/320: a base naming another profile id is replaced by a correct one on the next cycle", async () => {
  // So it can only combine with an old list inside ONE cycle — and no code
  // path writes a base for another id (writeBase writes the merged copy, whose
  // ids are this device's and the server's).
  const { kv, a, b } = await importedAndAgreed();
  const base = JSON.parse(a.storage.getItem(SYNC_BASE_KEY));
  for (const p of base.profiles) p.id = "someone-else";
  a.storage.setItem(SYNC_BASE_KEY, JSON.stringify(base));
  assert.equal((await a.sync.syncNow()).ok, true);
  assert.deepEqual(JSON.parse(a.storage.getItem(SYNC_BASE_KEY)).profiles.map((p) => p.id), ["default"]);
  await settle(kv, a, b);
  for (const d of [a, b]) assert.equal(moveShape(favsOf(d.storage)).movedOnly, MOVED.length);
});

test("510/320: Replace keeps every profile id, so the base still covers each person (two people, neither 'default')", async () => {
  // The owner's profile id is not known here; a non-default one is the case a
  // re-minted id would break. A Replace that re-minted it would leave the base
  // describing a person who no longer exists — the "base from the wrong
  // person" route. It does not.
  const kv = new EdgeKV();
  const two = () => {
    const s = device([]);
    s.removeItem(scopeKey("default", "faves.favourites.v1"));
    s.setItem(PROFILES_KEY, JSON.stringify({ v: 1, activeId: "pme1", profiles: [{ id: "pme1", name: "Me" }, { id: "pkid2", name: "Kid" }] }));
    s.setItem(scopeKey("pme1", "faves.favourites.v1"), JSON.stringify(start()));
    s.setItem(scopeKey("pkid2", "faves.favourites.v1"), JSON.stringify([venue("kidplace")]));
    return s;
  };
  const a = phone(two(), kv, { loc: "L1" });
  const b = phone(two(), kv, { loc: "L2" });
  const { code } = await a.sync.enable();
  kv.clock += 2 * CACHE_TTL_MS;
  await b.sync.join(code);
  kv.clock += 2 * CACHE_TTL_MS;
  const res = moveBackup(collectPersonalData(a.storage, { exportedAt: "2026-10-01T08:00:00.000Z" }), MOVE_PLAN, MOVE_SOURCES);
  assert.equal(res.ok, true, res.error);
  assert.equal(applyPersonalData(a.storage, JSON.stringify(res.data), { mode: "replace" }).ok, true);
  const ids = (st) => JSON.parse(st.getItem(PROFILES_KEY)).profiles.map((p) => p.id);
  assert.deepEqual(ids(a.storage), ["pme1", "pkid2"], "Replace re-minted a profile id");
  assert.deepEqual(JSON.parse(a.storage.getItem(SYNC_BASE_KEY)).profiles.map((p) => p.id), ["pme1", "pkid2"], "Replace touched the base");
  await settle(kv, a, b);
  const mine = (st) =>
    JSON.parse(st.getItem(scopeKey("pme1", "faves.favourites.v1")) || "[]").map((e) =>
      e.type === "venue" ? `v:${e.venueId}` : `d:${e.venueId} ${e.dishId}`
    );
  for (const d of [a, b]) {
    const s = moveShape(mine(d.storage));
    assert.equal(s.movedOnly, MOVED.length);
    assert.equal(s.both, 0);
  }
});

test("510/320: the startup upgrade chain is the identity and leaves the base alone, so a page load cannot unseat it", async () => {
  // No step has ever shipped: USER_SCHEMA has been 1 at every commit
  // (`git log -G'USER_SCHEMA = [0-9]'`), so the "old tab stops writing" pause
  // (510/110) has never fired on a real device either. If this changes, the
  // chain gains a way in and 320's question has to be asked of it again.
  assert.equal(USER_SCHEMA, 1);
  assert.deepEqual(Object.keys(UPGRADE_STEPS), []);
  const { kv, a, b } = await importedAndAgreed();
  const before = a.storage.getItem(SYNC_BASE_KEY);
  for (const d of [a, b]) assert.equal(upgradeStorage(d.storage).status, "current");
  assert.equal(a.storage.getItem(SYNC_BASE_KEY), before, "the startup upgrade rewrote the base");
  await settle(kv, a, b);
  for (const d of [a, b]) assert.equal(moveShape(favsOf(d.storage)).movedOnly, MOVED.length);
});

test("510/320: the sync base is removed only by turning sync on, joining and turning it off", () => {
  // The whole "a base-less merge on a device that has synced before" question
  // rests on this list: every other way the base could go is a write that the
  // enumeration in the review read and ruled out. A new remover is a new way
  // into 320's union, and should be read with that in mind.
  const dir = new URL("../site/js/", import.meta.url);
  const hits = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(new URL(f, dir), "utf8");
    for (const m of src.matchAll(/removeItem\(\s*SYNC_BASE_KEY\s*\)|["']faves\.sync\.base\.v1["']/g)) hits.push(`${f}:${m[0]}`);
  }
  assert.deepEqual(hits.sort(), [
    "personal-data.js:\"faves.sync.base.v1\"", // EXCLUDED, `spare: true`: Replace keeps it
    "sync.js:\"faves.sync.base.v1\"", // the constant
    "sync.js:removeItem(SYNC_BASE_KEY)", // enable()
    "sync.js:removeItem(SYNC_BASE_KEY)", // join()
    "sync.js:removeItem(SYNC_BASE_KEY)", // disable()
  ]);
});
