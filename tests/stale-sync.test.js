// Roadmap 510/340: a stale sync read is merged as if another device had
// changed it. The REAL client (site/js/sync.js) and the REAL Worker
// (worker/sync-worker.js) over `EdgeKV`, a KV stand-in that follows
// Cloudflare's documented model: a read is cached at its location for 60 s,
// and a write is seen at once where it was made and up to 60 s later anywhere
// else (tests/stale-sync-harness.js says where that comes from).
//
// The first four are the defect's reproduction. Each story is the same: one
// device's request lands at a location that read the core copy less than a
// minute ago. Against the KV-only Worker it was handed the copy from before
// the latest write, and all four FAILED (PR #78). Since 510/340 (ADR 0151) the
// Worker keeps each user's copies in one Durable Object, which reads its own
// storage and never KV's cache, and all four pass — with the `todo` marker
// they carried until the fix removed. A break-probe that makes the object
// read through a lagging KV again fails them (see the PR for 510/340).
//
// Then the fix's own fuzz: the owner's sequence on two devices, randomised,
// against the live Worker — nothing stale is read, nothing is lost or revived.
//
// The last two are about roadmap 510/320: no schedule of stale reads across
// two devices puts an old recipe heart beside its moved copy — and the
// detector that says so is shown to fire on a route that does. The fuzz there
// runs against the frozen KV-only Worker on purpose: the claim is about the
// client's merge under stale reads, which the live Worker can no longer serve.

import { test } from "node:test";
import assert from "node:assert/strict";
import { collectPersonalData, applyPersonalData } from "../site/js/personal-data.js";
import {
  EdgeKV,
  legacyKvWorker,
  device,
  venue,
  favsOf,
  heart,
  unheart,
  phone,
  moveOn,
  moveShape,
  kHeart,
  MOVED,
  OLD_KEYS,
  NEW_KEYS,
  CACHE_TTL_MS,
  fuzzOnce,
  storeFor,
  atClock,
} from "./stale-sync-harness.js";
import currentWorker, { IMPORT_SETTLE_SECONDS } from "../worker/sync-worker.js";
import { scopeKey } from "../site/js/profiles.js";
import { RECIPES_KEY } from "../site/js/recipe-record.js";

const S = 1_000;

/**
 * A phone and a laptop, paired and agreed on `favs`. The phone starts on
 * location L1 (home Wi-Fi); the laptop is on L2. At 100 s the laptop pulls
 * through L2, so L2 now caches the current copy for a minute — the copy any
 * request through L2 will be handed until 160 s, whatever is written since.
 */
async function pairWithL2Cached(favs, { worker } = {}) {
  const kv = new EdgeKV();
  const p = phone(device(favs), kv, { loc: "L1", ...(worker ? { worker } : {}) });
  const l = phone(device(favs), kv, { loc: "L2", ...(worker ? { worker } : {}) });
  const { code } = await p.sync.enable();
  kv.clock += S;
  await l.sync.join(code);
  kv.clock += S;
  await p.sync.syncNow();
  kv.clock = 100 * S;
  assert.equal((await l.sync.syncNow()).ok, true);
  return { kv, p, l };
}

/** Every location's cache runs out, then each device syncs twice. */
async function settle(kv, ...devices) {
  kv.clock += 3 * CACHE_TTL_MS;
  for (let i = 0; i < 2; i += 1) for (const d of devices) assert.equal((await d.sync.syncNow()).ok, true);
}

test("510/340: a heart is not taken off the phone by a pull, 10 s later, that reads an older copy", async () => {
  // The item's measured case. The heart is written through L1; the next pull
  // goes through L2, which is still handing out the copy from before it. The
  // copy's version is a random id, so the client cannot tell "older than what I
  // just wrote" from "another device removed it", and removes it.
  const { kv, p } = await pairWithL2Cached([venue("kk")]);
  kv.clock = 105 * S;
  heart(p.storage, venue("laksa"));
  assert.equal((await p.sync.syncNow()).ok, true);
  kv.clock = 115 * S;
  p.loc = "L2"; // off the Wi-Fi
  const res = await p.sync.syncNow();
  assert.equal(res.ok, true);
  assert.equal(res.changes.favouritesRemoved, 0, "the pull reported removing a heart nobody removed");
  assert.deepEqual(favsOf(p.storage), ["v:kk", "v:laksa"], "the heart just tapped is gone from the phone");
});

test("510/340: a heart, then a second heart 10 s later through another location — the first is not lost on either device", async () => {
  // The same stale read, now with something to send. The Worker's own If-Match
  // check reads through the same location, so it is stale too and accepts the
  // write: the copy without the first heart replaces the copy with it.
  const { kv, p, l } = await pairWithL2Cached([venue("kk")]);
  kv.clock = 105 * S;
  heart(p.storage, venue("laksa"));
  assert.equal((await p.sync.syncNow()).ok, true);
  kv.clock = 115 * S;
  p.loc = "L2";
  heart(p.storage, venue("pho"));
  assert.equal((await p.sync.syncNow()).ok, true);
  await settle(kv, p, l);
  for (const [name, d] of [["phone", p], ["laptop", l]]) {
    assert.deepEqual(favsOf(d.storage), ["v:kk", "v:laksa", "v:pho"], `${name}: a heart was lost`);
  }
});

test("510/340: an un-heart, then a heart 10 s later through another location — the removed heart does not come back on either device", async () => {
  // The mirror: the older copy still holds a heart the base has dropped, so it
  // reads as another device adding it.
  const { kv, p, l } = await pairWithL2Cached([venue("kk"), venue("bao")]);
  kv.clock = 105 * S;
  unheart(p.storage, "v:bao");
  assert.equal((await p.sync.syncNow()).ok, true);
  kv.clock = 115 * S;
  p.loc = "L2";
  heart(p.storage, venue("pho"));
  assert.equal((await p.sync.syncNow()).ok, true);
  await settle(kv, p, l);
  for (const [name, d] of [["phone", p], ["laptop", l]]) {
    assert.deepEqual(favsOf(d.storage), ["v:kk", "v:pho"], `${name}: the removed heart came back`);
  }
});

test("510/340 and 320: the recipe move is not undone by the other device's stale read — and the stale read does NOT make 320's union", async () => {
  // The owner's sequence: the laptop imports the moved backup through L1. The
  // phone, on L2 where the pre-move copy is cached, hearts something inside
  // the minute: its read is stale, the Worker's If-Match read is stale, and the
  // pre-move copy plus the heart replaces the move. The laptop's next pull then
  // reads that as the phone REMOVING the moved hearts and ADDING the old ones.
  const start = [venue("kk"), ...MOVED.map(kHeart)];
  const kv = new EdgeKV();
  const laptop = phone(device(start), kv, { loc: "L1" });
  const ph = phone(device(start), kv, { loc: "L2" });
  const { code } = await laptop.sync.enable();
  kv.clock += S;
  await ph.sync.join(code);
  kv.clock = 100 * S;
  assert.equal((await ph.sync.syncNow()).ok, true); // L2 caches the pre-move copy
  kv.clock = 105 * S;
  moveOn(laptop.storage);
  assert.equal((await laptop.sync.syncNow()).ok, true);
  kv.clock = 115 * S;
  heart(ph.storage, venue("pho"));
  assert.equal((await ph.sync.syncNow()).ok, true);
  await settle(kv, laptop, ph);
  for (const [name, d] of [["laptop", laptop], ["phone", ph]]) {
    const keys = favsOf(d.storage);
    // What happens today, asserted so the shape is on record either way: the
    // move is undone (old hearts back, moved ones gone) — never both at once.
    assert.equal(moveShape(keys).both, 0, `${name}: an old heart sat beside its moved copy`);
    assert.deepEqual(
      keys,
      ["d:u:mine u:alpha-bake", "d:u:mine u:beta-bake", "v:kk", "v:pho"],
      `${name}: the move was undone, or the heart lost`
    );
  }
});

test("510/340 control: the same first story against the frozen KV-only Worker still removes the heart — the harness can still see the defect", async () => {
  // Without this, the four above could pass because EdgeKV stopped serving
  // stale reads rather than because the Worker stopped reading KV (ADR 0072:
  // a guard whose answer cannot change is decorative).
  const { kv, p } = await pairWithL2Cached([venue("kk")], { worker: legacyKvWorker });
  kv.clock = 105 * S;
  heart(p.storage, venue("laksa"));
  assert.equal((await p.sync.syncNow()).ok, true);
  kv.clock = 115 * S;
  p.loc = "L2";
  const res = await p.sync.syncNow();
  assert.equal(res.changes.favouritesRemoved, 1);
  assert.deepEqual(favsOf(p.storage), ["v:kk"]);
  assert.ok(kv.staleReads > 0);
});

const RUNS = Number(process.env.FAVES_STALE_FUZZ_RUNS) || 40;

test(`510/340: across ${RUNS} randomised runs of the owner's sequence against the live Worker, nothing stale is read and nothing is lost, revived or undone`, async (t) => {
  // The same fuzz the options paper ran against the KV-only Worker (3,000 runs:
  // a heart lost in 1,127, a removed heart back in 899, the move undone in
  // 150). Here every request goes to the user's Durable Object. "Lost" and
  // "revived" are judged against what each tap actually CHANGED on its device
  // (`lostEffective`, fuzzOnce says why); 1,000 seeds measured 0 and 0 on
  // 2026-10-02, and the same 1,000 against the frozen KV-only Worker measured
  // 328 and 312, so the measure is live, not blind.
  let mixed = 0;
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = await fuzzOnce(seed);
    assert.equal(r.staleReads, 0, `seed ${seed}: a read was stale`);
    assert.deepEqual(r.lostEffective, [], `seed ${seed}: a heart was lost`);
    assert.deepEqual(r.revivedEffective, [], `seed ${seed}: a removed heart came back`);
    assert.equal(r.settled.A.oldOnly + r.settled.B.oldOnly, 0, `seed ${seed}: the move was undone`);
    assert.equal(r.worst.both, 0, `seed ${seed}: an old heart sat beside its moved copy`);
    assert.ok(r.agree, `seed ${seed}: the devices disagree after settling`);
    mixed += r.lost.length ? 1 : 0;
  }
  t.diagnostic(`${mixed}/${RUNS} runs held a no-op heart that the paper's intent count reads as lost`);
});

test("510/340 cutover: two devices paired on the KV-only Worker carry on, unchanged, against the Durable Object — and a write in the minute before the deploy is not lost", async () => {
  // The deploy, end to end, with the REAL client (a build from before this
  // change: nothing under site/ moved). The object lives at L1, where the
  // phone's reads have cached the core copy; the laptop writes through L2
  // ten seconds before the deploy. Inside the settling window the object
  // refuses (503) and the phone keeps its data; after it, the object imports
  // the laptop's write — not L1's cached copy from before it — and the
  // phone's next write goes through on the ETag the KV Worker issued.
  const kv = new EdgeKV();
  const DEPLOY = 200 * S;
  storeFor(kv, { deployedAt: atClock(DEPLOY), location: "L1" });
  const p = phone(device([venue("kk")]), kv, { loc: "L1", worker: legacyKvWorker });
  const l = phone(device([venue("kk")]), kv, { loc: "L2", worker: legacyKvWorker });
  const { code } = await p.sync.enable();
  kv.clock += S;
  await l.sync.join(code);
  kv.clock = 185 * S;
  assert.equal((await p.sync.syncNow()).ok, true); // L1 caches the core copy until 245 s
  kv.clock = 190 * S;
  heart(l.storage, venue("late"));
  assert.equal((await l.sync.syncNow()).ok, true); // through L2, ten seconds before the deploy
  kv.clock = DEPLOY;
  p.worker = l.worker = currentWorker;

  kv.clock = DEPLOY + 15 * S;
  // The control: at this moment L1 really is holding a copy older than the
  // laptop's write, so an import now would have taken it.
  const l1 = kv.caches.get("L1");
  assert.ok(
    [...l1.entries()].some(([k, c]) => c.entry !== kv.latest(k) && kv.clock - c.at < kv.ttlMs),
    "L1 held nothing stale — the test would prove nothing"
  );
  heart(p.storage, venue("pho"));
  const early = await p.sync.syncNow();
  assert.equal(early.ok, false, "synced inside the settling window");
  assert.deepEqual(favsOf(p.storage), ["v:kk", "v:pho"], "the phone's own data is untouched");

  kv.clock = DEPLOY + IMPORT_SETTLE_SECONDS * S;
  const after = await p.sync.syncNow();
  assert.equal(after.ok, true);
  assert.equal(after.changes.favouritesRemoved, 0);
  assert.equal((await l.sync.syncNow()).ok, true);
  for (const [name, d] of [["phone", p], ["laptop", l]]) {
    assert.deepEqual(favsOf(d.storage), ["v:kk", "v:late", "v:pho"], `${name}: a heart was lost across the cutover`);
  }
});

// --- 510/320: what a stale read can and cannot produce ----------------------

test(`510/320: across ${RUNS} randomised runs of the owner's sequence on two devices, no stale read puts an old heart beside its moved copy`, async (t) => {
  // A three-way merge keeps "exactly one of old and moved" whenever its three
  // inputs each hold exactly one, and every copy two devices can produce —
  // fresh or stale, the server's or a base — starts that way. So the union the
  // owner saw cannot come from stale reads between two devices with a base.
  // This is the empirical side of that argument, with the real code. The
  // default count keeps `node --test` quick; set FAVES_STALE_FUZZ_RUNS for
  // more (the parameter space is fuzzOnce's docstring).
  let stale = 0;
  let undone = 0;
  for (let seed = 1; seed <= RUNS; seed += 1) {
    // The frozen KV-only Worker: the one that could serve a stale read.
    const r = await fuzzOnce(seed, { worker: legacyKvWorker });
    assert.equal(r.worst.both, 0, `seed ${seed}: an old heart sat beside its moved copy`);
    stale += r.staleReads ? 1 : 0;
    undone += r.settled.A.oldOnly || r.settled.B.oldOnly ? 1 : 0;
  }
  // The fuzz must actually have exercised stale reads, or it proves nothing.
  assert.ok(stale >= RUNS * 0.8, `only ${stale} of ${RUNS} runs read anything stale`);
  t.diagnostic(`${stale}/${RUNS} runs read a stale copy; ${undone} ended with the move undone (510/340, not 320's shape)`);
});

/**
 * A device's moved recipes with their `movedFrom` taken off — what a cookbook
 * looks like to a build without 510/400's follow. The control below needs the
 * owner's union to be POSSIBLE, so it gives the follow nothing to follow.
 */
function forgetMoves(storage) {
  const k = scopeKey("default", RECIPES_KEY);
  const book = JSON.parse(storage.getItem(k) || "{}");
  for (const r of Object.values(book)) delete r.movedFrom;
  storage.setItem(k, JSON.stringify(book));
}

/** Two devices, the move run on A and agreed; `unfollowable` strips the moves
 *  first (the control). Returns them and a pre-move backup of A. */
async function movedPair(start, { unfollowable = false } = {}) {
  const kv = new EdgeKV();
  const a = phone(device(start), kv);
  const b = phone(device(start), kv);
  const { code } = await a.sync.enable();
  await b.sync.join(code);
  const before = JSON.stringify(collectPersonalData(a.storage, { exportedAt: "x" }));
  moveOn(a.storage);
  if (unfollowable) forgetMoves(a.storage);
  await a.sync.syncNow();
  await b.sync.syncNow();
  return { kv, a, b, code, before };
}

test("510/320: the detector is live — with nothing to follow, a third copy of the app and an Apply DO produce the union, on both devices", async () => {
  // The positive control for the fuzz above (ADR 0072: a guard whose answer
  // cannot change is decorative). A storage context that joins the sync code
  // holding the pre-move list and three hearts since removed — Safari and a
  // Home Screen app on one iPhone keep separate storage — has no base, so its
  // first merge is a union: old hearts and others added, nothing removed.
  // Since 510/400 the old ids follow the moved recipes, so the control strips
  // the moves (forgetMoves) to keep the shape reachable, and the next test
  // runs the same routes with the follow in place.
  const start = [venue("kk"), ...MOVED.map(kHeart)];
  const { kv, a, b, code } = await movedPair(start, { unfollowable: true });
  const third = phone(device([...start, venue("x1"), venue("x2"), venue("x3")]), kv);
  await third.sync.join(code);
  await settle(kv, a, b);
  for (const d of [a, b]) {
    const keys = favsOf(d.storage);
    assert.equal(moveShape(keys).both, MOVED.length);
    for (const k of [...OLD_KEYS, ...NEW_KEYS, "v:x1", "v:x2", "v:x3"]) assert.ok(keys.includes(k), k);
  }
  // …and so does the additive restore ("Apply", not "Replace") of the backup
  // taken before the move. Two routes to the shape; neither is a stale read.
  const p2 = await movedPair(start, { unfollowable: true });
  assert.equal(applyPersonalData(p2.a.storage, p2.before, { mode: "merge" }).ok, true);
  await p2.a.sync.syncNow();
  await settle(p2.kv, p2.a, p2.b);
  for (const x of [p2.a, p2.b]) assert.equal(moveShape(favsOf(x.storage)).both, MOVED.length);
});

test("510/320 guarded (510/400): the same third copy and Apply leave each moved recipe with ONE heart", async () => {
  const start = [venue("kk"), ...MOVED.map(kHeart)];
  const { kv, a, b, code } = await movedPair(start);
  const third = phone(device([...start, venue("x1"), venue("x2"), venue("x3")]), kv);
  await third.sync.join(code);
  await settle(kv, a, b, third);
  for (const d of [a, b, third]) {
    const keys = favsOf(d.storage);
    assert.equal(moveShape(keys).both, 0, "an old heart beside its moved copy");
    assert.equal(moveShape(keys).movedOnly, MOVED.length, "a moved recipe lost its heart");
  }
  const p2 = await movedPair(start);
  assert.equal(applyPersonalData(p2.a.storage, p2.before, { mode: "merge" }).ok, true);
  await p2.a.sync.syncNow();
  await settle(p2.kv, p2.a, p2.b);
  for (const x of [p2.a, p2.b]) assert.equal(moveShape(favsOf(x.storage)).both, 0, "Apply put an old heart beside its moved copy");
});
