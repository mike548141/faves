// Roadmap 510/340: a stale sync read is merged as if another device had
// changed it. The REAL client (site/js/sync.js) and the REAL Worker
// (worker/sync-worker.js) over `EdgeKV`, a KV stand-in that follows
// Cloudflare's documented model: a read is cached at its location for 60 s,
// and a write is seen at once where it was made and up to 60 s later anywhere
// else (tests/stale-sync-harness.js says where that comes from).
//
// 🛑 THE FIRST FOUR TESTS FAIL ON TODAY'S CODE, ON PURPOSE. They assert the
// correct behaviour of a defect that is not fixed yet; the branch that carries
// them is not merged until a fix makes them pass. Each story is the same: one
// device's request lands at a location that read the core copy less than a
// minute ago, so it is handed the copy from before the latest write.
//
// The last two PASS today and are about roadmap 510/320: no schedule of stale
// reads across two devices puts an old recipe heart beside its moved copy —
// and the detector that says so is shown to fire on a route that does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { collectPersonalData, applyPersonalData } from "../site/js/personal-data.js";
import {
  EdgeKV,
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
} from "./stale-sync-harness.js";

const S = 1_000;

/**
 * A phone and a laptop, paired and agreed on `favs`. The phone starts on
 * location L1 (home Wi-Fi); the laptop is on L2. At 100 s the laptop pulls
 * through L2, so L2 now caches the current copy for a minute — the copy any
 * request through L2 will be handed until 160 s, whatever is written since.
 */
async function pairWithL2Cached(favs) {
  const kv = new EdgeKV();
  const p = phone(device(favs), kv, { loc: "L1" });
  const l = phone(device(favs), kv, { loc: "L2" });
  const { code } = await p.sync.enable();
  kv.clock += S;
  await l.sync.join(code);
  kv.clock += S;
  await p.sync.syncNow();
  kv.clock = 100 * S;
  assert.equal((await l.sync.syncNow()).ok, true);
  return { kv, p, l };
}

// These four assert the CORRECT behaviour and fail on today's sync, which is
// the evidence for 510/340. `todo` keeps them running and their failures
// printed without reddening CI; the fix removes the marker, and a todo that
// starts passing before then is a fix nobody recorded.
const TODO = "510/340 — fails until the stale-read fix lands";

/** Every location's cache runs out, then each device syncs twice. */
async function settle(kv, ...devices) {
  kv.clock += 3 * CACHE_TTL_MS;
  for (let i = 0; i < 2; i += 1) for (const d of devices) assert.equal((await d.sync.syncNow()).ok, true);
}

test("510/340: a heart is not taken off the phone by a pull, 10 s later, that reads an older copy", { todo: TODO }, async () => {
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

test("510/340: a heart, then a second heart 10 s later through another location — the first is not lost on either device", { todo: TODO }, async () => {
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

test("510/340: an un-heart, then a heart 10 s later through another location — the removed heart does not come back on either device", { todo: TODO }, async () => {
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

test("510/340 and 320: the recipe move is not undone by the other device's stale read — and the stale read does NOT make 320's union", { todo: TODO }, async () => {
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

// --- 510/320: what a stale read can and cannot produce ----------------------

const RUNS = Number(process.env.FAVES_STALE_FUZZ_RUNS) || 40;

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
    const r = await fuzzOnce(seed);
    assert.equal(r.worst.both, 0, `seed ${seed}: an old heart sat beside its moved copy`);
    stale += r.staleReads ? 1 : 0;
    undone += r.settled.A.oldOnly || r.settled.B.oldOnly ? 1 : 0;
  }
  // The fuzz must actually have exercised stale reads, or it proves nothing.
  assert.ok(stale >= RUNS * 0.8, `only ${stale} of ${RUNS} runs read anything stale`);
  t.diagnostic(`${stale}/${RUNS} runs read a stale copy; ${undone} ended with the move undone (510/340, not 320's shape)`);
});

test("510/320: the detector is live — a third copy of the app with no sync base DOES produce the union, on both devices", async () => {
  // The positive control for the test above (ADR 0072: a guard whose answer
  // cannot change is decorative). A storage context that joins the sync code
  // holding the pre-move list and three hearts since removed — Safari and a
  // Home Screen app on one iPhone keep separate storage — has no base, so its
  // first merge is a union: old hearts and others added, nothing removed.
  const start = [venue("kk"), ...MOVED.map(kHeart)];
  const kv = new EdgeKV();
  const a = phone(device(start), kv);
  const b = phone(device(start), kv);
  const { code } = await a.sync.enable();
  await b.sync.join(code);
  moveOn(a.storage);
  await a.sync.syncNow();
  await b.sync.syncNow();
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
  const c = phone(device(start), kv);
  const d = phone(device(start), kv);
  const { code: code2 } = await c.sync.enable();
  await d.sync.join(code2);
  const before = JSON.stringify(collectPersonalData(c.storage, { exportedAt: "x" }));
  moveOn(c.storage);
  await c.sync.syncNow();
  await d.sync.syncNow();
  assert.equal(applyPersonalData(c.storage, before, { mode: "merge" }).ok, true);
  await c.sync.syncNow();
  await settle(kv, c, d);
  for (const x of [c, d]) assert.equal(moveShape(favsOf(x.storage)).both, MOVED.length);
});
