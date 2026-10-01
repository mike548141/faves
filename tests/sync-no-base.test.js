// No silent merge without a base (roadmap 510/390, guard A of 510/320,
// owner-ruled 2026-10-02). A device that has synced before, or a first join
// that already holds hearts, never merges WITHOUT a last agreement silently:
// when it holds something the server does not, it asks "keep what sync has" or
// "add this device's extras", and nothing is read or sent until it is answered.
// Real client, real Worker (tests/stale-sync-harness.js). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EdgeKV, CACHE_TTL_MS, device, venue, favsOf, heart, phone } from "./stale-sync-harness.js";
import { createSync, SYNC_KEY, SYNC_BASE_KEY, NEEDS_DECISION, IDLE, KEEP_SYNCED, ADD_EXTRAS } from "../site/js/sync.js";
import { baselessPeople, keepTheirsFor, CONFLICT_NO_BASE } from "../site/js/sync-merge.js";
import { scopeKey } from "../site/js/profiles.js";

const gap = (kv) => {
  kv.clock += 3 * CACHE_TTL_MS;
};
const puts = (d) => d.requests.filter((r) => r.method === "PUT").length;

/** A and B paired and agreed on `favs`; then A loses its base and gains `extra`. */
async function lostBase({ favs = [venue("kk")], extra = [venue("x1")] } = {}) {
  const kv = new EdgeKV();
  const a = phone(device(favs), kv, { loc: "L1" });
  const b = phone(device(favs), kv, { loc: "L2" });
  const { code } = await a.sync.enable();
  gap(kv);
  assert.equal((await b.sync.join(code)).ok, true, "a join holding nothing new asked a question");
  gap(kv);
  a.storage.removeItem(SYNC_BASE_KEY);
  for (const e of extra) heart(a.storage, e);
  gap(kv);
  return { kv, a, b, code };
}

// --- the pure half ------------------------------------------------------------

test("baselessPeople names a person both sides hold, with no base for them, who has extras here — and nobody else", () => {
  const me = (favs, extra = {}) => ({ id: "default", name: "Me", favourites: favs, ratings: {}, notes: {}, ...extra });
  const snap = (...profiles) => ({ profiles });
  const mine = snap(me([venue("kk"), venue("x1")]));
  const theirs = snap(me([venue("kk")]));
  const [p] = baselessPeople(null, mine, theirs);
  assert.equal(p.profileId, "default");
  assert.equal(p.favourites, 1);
  assert.deepEqual(p.sample, ["x1"]);
  // A base that covers the person: no question (the three-way merge decides).
  assert.deepEqual(baselessPeople(snap(me([venue("kk")])), mine, theirs), []);
  // A base for SOMEONE ELSE does not cover them.
  assert.equal(baselessPeople(snap({ id: "other" }), mine, theirs).length, 1);
  // Nothing extra here: merging only adds the server's side, nothing to ask.
  assert.deepEqual(baselessPeople(null, theirs, snap(me([venue("kk"), venue("y")]))), []);
  // Nothing on the server (turning sync on): nothing to ask.
  assert.deepEqual(baselessPeople(null, mine, null), []);
  // A rating or a note that differs counts; a setting does not (the allergen
  // question owns those).
  assert.equal(baselessPeople(null, snap(me([], { ratings: { "v:kk": 3 } })), snap(me([], { ratings: { "v:kk": 5 } })))[0].ratings, 1);
  assert.equal(baselessPeople(null, snap(me([], { notes: { r: "a" } })), snap(me([])))[0].notes, 1);
  assert.deepEqual(baselessPeople(null, snap(me([], { settings: { diet: { avoid: ["nuts"] } } })), snap(me([]))), []);
});

test("keepTheirsFor takes the server's hearts, ratings and notes for the named people only, and never their settings", () => {
  const mine = { profiles: [
    { id: "a", favourites: [venue("x")], ratings: { r: 1 }, notes: { n: "mine" }, settings: { diet: { avoid: ["nuts"] } } },
    { id: "b", favourites: [venue("y")] },
  ] };
  const theirs = { profiles: [{ id: "a", favourites: [venue("t")], ratings: {}, notes: {}, settings: {} }, { id: "b", favourites: [] }] };
  const out = keepTheirsFor(mine, theirs, ["a"]);
  assert.deepEqual(out.profiles[0].favourites, [venue("t")]);
  assert.deepEqual(out.profiles[0].ratings, {});
  assert.deepEqual(out.profiles[0].settings, { diet: { avoid: ["nuts"] } }, "the answer changed someone's allergens");
  assert.deepEqual(out.profiles[1].favourites, [venue("y")]);
});

// --- the engine ----------------------------------------------------------------

test("a synced device that lost its base, holding a heart sync does not, asks — and sends nothing, and changes nothing", async () => {
  const { kv, a, b } = await lostBase();
  const before = favsOf(a.storage);
  const p0 = puts(a);
  const res = await a.sync.syncNow();
  assert.equal(res.noBase, true, JSON.stringify(res));
  assert.equal(res.needsDecision, true);
  assert.equal(puts(a), p0, "the asking cycle wrote to sync");
  assert.deepEqual(favsOf(a.storage), before, "the asking cycle changed this device");
  const st = a.sync.status();
  assert.equal(st.state, NEEDS_DECISION);
  assert.equal(st.conflicts[0].kind, CONFLICT_NO_BASE);
  assert.equal(st.conflicts[0].people[0].favourites, 1);
  // B never sees the extra while the question is open.
  gap(kv);
  await b.sync.syncNow();
  assert.deepEqual(favsOf(b.storage), ["v:kk"]);
});

test("while the question is open, no background cycle — a pull, a change, a reconnect — reaches the network", async () => {
  const { a } = await lostBase();
  await a.sync.syncNow();
  const n = a.requests.length;
  for (const why of ["open", "change", "leaving", "online", "sync now"]) {
    const r = await a.sync.syncNow({ why });
    assert.equal(r.noBase, true, why);
  }
  heart(a.storage, venue("tapped-meanwhile"));
  await a.sync.syncNow({ why: "change" });
  assert.equal(a.requests.length, n, "a cycle went ahead with the question unanswered");
  // A different engine on the same device (another tab, a reload) asks
  // nothing new and sends nothing either: the question is the device's.
  const tab2 = createSync({ storage: a.storage, endpoint: "https://example.invalid", fetchImpl: async () => assert.fail("tab 2 reached the network"), setTimer: () => 0, clearTimer: () => {} });
  assert.equal(tab2.status().state, NEEDS_DECISION, "a second tab did not see the open question");
  assert.equal((await tab2.syncNow({ why: "open" })).noBase, true);
});

test("'keep what sync has': this device takes the server's hearts, its extras go, and there is a base again", async () => {
  const { kv, a, b } = await lostBase();
  await a.sync.syncNow();
  const res = await a.sync.resolve({ noBase: KEEP_SYNCED });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(favsOf(a.storage), ["v:kk"]);
  assert.ok(a.storage.getItem(SYNC_BASE_KEY), "no base was written");
  assert.equal(JSON.parse(a.storage.getItem(SYNC_KEY)).ask, null, "the question was not cleared");
  assert.equal(a.sync.status().state, IDLE);
  gap(kv);
  await b.sync.syncNow();
  assert.deepEqual(favsOf(b.storage), ["v:kk"]);
  // And it stays settled: the next cycles ask nothing.
  gap(kv);
  assert.equal((await a.sync.syncNow()).ok, true);
});

test("'add this device's extras': they are added here and everywhere", async () => {
  const { kv, a, b } = await lostBase();
  await a.sync.syncNow();
  assert.equal((await a.sync.resolve({ noBase: ADD_EXTRAS })).ok, true);
  gap(kv);
  await b.sync.syncNow();
  for (const d of [a, b]) assert.deepEqual(favsOf(d.storage), ["v:kk", "v:x1"]);
});

test("a base that does not cover this person asks too; a good base never asks", async () => {
  const { kv, a } = await lostBase({ extra: [] });
  // Control first: lost base, nothing extra — merges, asks nothing.
  assert.equal((await a.sync.syncNow()).ok, true);
  gap(kv);
  const base = JSON.parse(a.storage.getItem(SYNC_BASE_KEY));
  for (const p of base.profiles) p.id = "someone-else";
  a.storage.setItem(SYNC_BASE_KEY, JSON.stringify(base));
  heart(a.storage, venue("x2"));
  assert.equal((await a.sync.syncNow()).noBase, true, "a base for another person was trusted");
  // With a real base, a heart added here is simply an addition.
  const { kv: kv2, a: a2 } = await lostBase({ extra: [] });
  assert.equal((await a2.sync.syncNow()).ok, true);
  gap(kv2);
  heart(a2.storage, venue("x3"));
  assert.equal((await a2.sync.syncNow()).ok, true);
});

test("a first join holding hearts the server lacks asks; one holding nothing new does not", async () => {
  const kv = new EdgeKV();
  const a = phone(device([venue("kk")]), kv);
  const { code } = await a.sync.enable();
  gap(kv);
  const b = phone(device([venue("pandan")]), kv);
  const res = await b.sync.join(code);
  assert.equal(res.noBase, true, "a first join holding hearts merged without asking");
  assert.deepEqual(favsOf(b.storage), ["v:pandan"], "the join changed the device before the answer");
  const c = phone(device([]), kv);
  assert.equal((await c.sync.join(code)).ok, true);
  assert.deepEqual(favsOf(c.storage), ["v:kk"]);
  // Turning sync on (a new code, nothing on the server) never asks.
  const d = phone(device([venue("solo")]), new EdgeKV());
  assert.equal((await d.sync.enable()).noBase, undefined);
});

test("the answer survives a cycle that cannot finish (offline), and is applied by the next one without asking again", async () => {
  const { kv, a } = await lostBase();
  await a.sync.syncNow();
  const real = a.worker;
  a.worker = { fetch: async () => { throw new TypeError("offline"); } };
  const off = await a.sync.resolve({ noBase: KEEP_SYNCED });
  assert.equal(off.ok, false);
  assert.equal(JSON.parse(a.storage.getItem(SYNC_KEY)).ask.answer, KEEP_SYNCED, "the answer was lost with the failed cycle");
  a.worker = real;
  gap(kv);
  const next = await a.sync.syncNow({ why: "online" });
  assert.equal(next.ok, true, JSON.stringify(next));
  assert.deepEqual(favsOf(a.storage), ["v:kk"]);
});

test("two tabs: one answers, the other stops asking, and a second answer after the first lands changes nothing", async () => {
  const { kv, a } = await lostBase();
  const tab2 = phone(a.storage, kv, { loc: "L1" }); // a second engine over the same storage
  await a.sync.syncNow();
  assert.equal(tab2.sync.status().state, NEEDS_DECISION);
  // The other tab runs into the question itself, so it holds it in memory —
  // the copy that would go stale when this tab answers.
  assert.equal((await tab2.sync.syncNow({ why: "open" })).noBase, true);
  assert.equal((await a.sync.resolve({ noBase: ADD_EXTRAS })).ok, true);
  assert.equal(tab2.sync.status().state, IDLE, "the other tab still shows a question already answered");
  assert.equal(tab2.sync.status().conflicts, null);
  // The late second answer, the other way, from the other tab: there is a
  // base now, so it is not a question any more and nothing is dropped.
  gap(kv);
  const late = await tab2.sync.resolve({ noBase: KEEP_SYNCED });
  assert.equal(late.ok, true);
  assert.deepEqual(favsOf(a.storage), ["v:kk", "v:x1"], "a late second answer undid the first");
});

test("answering the no-base question is not an answer to the allergen question", async () => {
  // Lost base, an extra heart, AND each device flagging a different allergen:
  // after "add", the merge finds a two-sided allergen difference with no base
  // to settle it, and that still stops for its OWN answer (ADR 0060) instead
  // of being written as the provisional union.
  const { kv, a, b } = await lostBase();
  const setDiet = (st, avoid) =>
    st.setItem(scopeKey("default", "faves.settings.v1"), JSON.stringify({ diet: { dietary: [], avoid } }));
  setDiet(b.storage, ["contains-nuts"]);
  assert.equal((await b.sync.syncNow()).ok, true);
  gap(kv);
  setDiet(a.storage, ["contains-peanuts"]);
  assert.equal((await a.sync.syncNow()).noBase, true);
  const p0 = puts(a);
  const res = await a.sync.resolve({ noBase: ADD_EXTRAS });
  assert.equal(res.needsDecision, true, JSON.stringify(res));
  assert.equal(res.noBase, undefined, "it asked the no-base question again");
  assert.equal(puts(a), p0, "the allergen union was written without an allergen answer");
  const diet = await a.sync.resolve({ diet: "combine" });
  assert.equal(diet.ok, true, JSON.stringify(diet));
  assert.deepEqual(favsOf(a.storage), ["v:kk", "v:x1"], "the no-base answer was forgotten while the allergen one was asked");
  const avoid = JSON.parse(a.storage.getItem(scopeKey("default", "faves.settings.v1"))).diet.avoid.sort();
  assert.deepEqual(avoid, ["contains-nuts", "contains-peanuts"]);
});
