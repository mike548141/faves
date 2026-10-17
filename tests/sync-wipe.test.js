// "Delete everything" travelling between devices (roadmap 180/010, ADR 0167):
// the REAL client (site/js/sync.js) and the REAL Worker over the harness's KV
// stand-in. The claim under test is the owner's "everywhere, always" — and its
// shadow: a deletion another device can UNDO is not a deletion.
//
// Why a deletion needs more than the three-way merge. Against a base, a heart
// missing on one side reads as a deletion only if the base held it; what the
// other device added since the last agreement reads as an ADDITION and comes
// straight back. And saved orders, the activity log, the shopping list and
// cook ticks are not in the synced snapshot at all. So the deletion travels as
// an epoch marker (sync-merge.js `resolveWipe`), and these tests are the
// scenarios that make that necessary.
//
// Run: `node --test tests/sync-wipe.test.js`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EdgeKV, CACHE_TTL_MS, device, venue, favsOf, heart, phone } from "./stale-sync-harness.js";
import { collectPersonalData, ERASE_KEEPS, ORDER_KEY } from "../site/js/personal-data.js";
import { SYNC_KEY, SYNC_BASE_KEY } from "../site/js/sync.js";
import { SYNC_LOG_KEY } from "../site/js/sync-log.js";
import { PROFILES_KEY, scopeKey, CHECKLIST_BASE_KEY, SAVED_ORDERS_BASE_KEY, ACTIVITY_BASE_KEY } from "../site/js/profiles.js";
import { SHOPPING_KEY } from "../site/js/shopping.js";
import { TIMERS_KEY } from "../site/js/cook.js";
import { resolveWipe, newWipe } from "../site/js/sync-merge.js";

/** Every cache runs out, then each device syncs twice (the other tests' rhythm). */
async function settle(kv, ...ds) {
  kv.clock += 3 * CACHE_TTL_MS;
  for (let i = 0; i < 2; i += 1) for (const d of ds) assert.equal((await d.sync.syncNow()).ok, true);
}
const gap = (kv) => {
  kv.clock += 2 * CACHE_TTL_MS;
};

/** The stores that never reach the synced snapshot, seeded on one device. */
function seedLocalOnly(st, id = "default") {
  st.setItem(scopeKey(id, SAVED_ORDERS_BASE_KEY), JSON.stringify([{ id: "o1", name: "Usual", venueId: "kk", lines: [] }]));
  st.setItem(scopeKey(id, ACTIVITY_BASE_KEY), JSON.stringify([{ at: "2026-10-01T00:00:00Z", kind: "favourite.add", subject: { venue: "kk", label: "KK" } }]));
  st.setItem(scopeKey(id, CHECKLIST_BASE_KEY), JSON.stringify({ r: { t: 1 } }));
  st.setItem(ORDER_KEY, JSON.stringify([{ venueId: "kk", name: "Pie", qty: 1 }]));
  st.setItem(SHOPPING_KEY, JSON.stringify([{ venueId: "r", name: "flour", qty: 1 }]));
  st.setItem(TIMERS_KEY, JSON.stringify({ t: 1 }));
}

/** Everything a person put in, anywhere on the device, in one number plus a list. */
function held(st) {
  const data = collectPersonalData(st, { exportedAt: "2026-10-18T00:00:00Z", localOnly: true });
  const out = [];
  for (const p of data.profiles) {
    if (p.favourites?.length) out.push(`${p.id}: ${p.favourites.length} favourites`);
    if (Object.keys(p.ratings || {}).length) out.push(`${p.id}: ratings`);
    if (Object.keys(p.notes || {}).length) out.push(`${p.id}: notes`);
    if (Object.keys(p.recipes || {}).length) out.push(`${p.id}: recipes`);
    if (p.savedOrders?.length) out.push(`${p.id}: saved orders`);
    if (p.activity?.length) out.push(`${p.id}: activity`);
  }
  if (data.order?.length) out.push("order tally");
  // Anything else under faves.: the device-only stores and whatever else is there.
  const keep = new Set([...ERASE_KEEPS, SYNC_BASE_KEY, SYNC_LOG_KEY, PROFILES_KEY]);
  for (let i = 0; i < st.length; i += 1) {
    const k = st.key(i);
    if (k.startsWith("faves.") && !keep.has(k) && !/\.(favourites|ratings|notes|settings)\.v1$/.test(k)) out.push(`key ${k}`);
  }
  return out;
}

async function pair({ favsA = [venue("kk")], favsB = [venue("kk")] } = {}) {
  const kv = new EdgeKV();
  const a = phone(device(favsA), kv, { loc: "L1" });
  const b = phone(device(favsB), kv, { loc: "L2" });
  const { code } = await a.sync.enable();
  gap(kv);
  const joined = await b.sync.join(code);
  // A device joining with hearts the group lacks is asked first (510/390);
  // these stories start from "both agreed", so it adds them.
  if (joined.needsDecision) await b.sync.resolve({ noBase: "add" });
  gap(kv);
  await settle(kv, a, b);
  return { kv, a, b, code };
}

test("a deletion on one device empties the other, including the stores that never sync", async () => {
  const { kv, a, b } = await pair({ favsA: [venue("kk"), venue("pho")], favsB: [venue("kk"), venue("pho")] });
  seedLocalOnly(a.storage);
  seedLocalOnly(b.storage);
  assert.ok(held(b.storage).length >= 6, "the control did not seed B");

  const res = await a.sync.eraseEverywhere();
  assert.deepEqual([res.ok, res.paired, res.reached], [true, true, true]);
  assert.deepEqual(held(a.storage), [], "A kept something");

  gap(kv);
  assert.equal((await b.sync.syncNow()).ok, true);
  assert.deepEqual(held(b.storage), [], "B kept something after the deletion reached it");

  // And it stays deleted: neither device's next syncs bring anything back.
  await settle(kv, a, b);
  assert.deepEqual([favsOf(a.storage), favsOf(b.storage), held(a.storage), held(b.storage)], [[], [], [], []]);
  assert.equal(JSON.parse(a.storage.getItem(SYNC_KEY)).wipe ?? null, null, "the deletion is still pending on A");
});

test("what the other device added since the last agreement does not survive either", async () => {
  // The case a three-way merge gets wrong: B hearted something A has never
  // heard of. Against the base it is an addition, so without an epoch it is
  // merged back in and sent to A — the deletion undone by the device that
  // had not yet been told.
  const { kv, a, b } = await pair();
  heart(b.storage, venue("added-on-b"));
  seedLocalOnly(b.storage);
  await a.sync.eraseEverywhere();
  gap(kv);
  assert.equal((await b.sync.syncNow()).ok, true);
  assert.deepEqual(favsOf(b.storage), [], "B's unsynced heart survived the deletion");
  await settle(kv, a, b);
  assert.deepEqual([favsOf(a.storage), favsOf(b.storage), held(b.storage)], [[], [], []], "B's heart came back to A or to B");
});

test("a heart made on the deleting device AFTER it deleted is kept, and the other device's older ones are not", async () => {
  const { kv, a, b } = await pair({ favsA: [venue("old-a")], favsB: [venue("old-a"), venue("old-b")] });
  await a.sync.eraseEverywhere({ afterErase: () => heart(a.storage, venue("fresh")) });
  await settle(kv, a, b);
  assert.deepEqual(favsOf(a.storage), ["v:fresh"]);
  assert.deepEqual(favsOf(b.storage), ["v:fresh"]);
});

test("a deletion is sent even when the synced snapshot is already empty, for the stores that never sync", async () => {
  // Nothing to delete in the snapshot — so nothing differs from what the server
  // holds, and a write skipped for being identical would never carry the marker.
  const { kv, a, b } = await pair({ favsA: [], favsB: [] });
  seedLocalOnly(b.storage);
  seedLocalOnly(a.storage);
  await a.sync.eraseEverywhere();
  gap(kv);
  await b.sync.syncNow();
  assert.deepEqual(held(b.storage), [], "B's device-only stores survived a deletion from an empty A");
});

test("a deletion made offline waits, survives the other device's edits meanwhile, and lands when the device can reach sync", async () => {
  const { kv, a, b } = await pair();
  // A is offline: its requests fail.
  const realFetchOk = a.worker;
  a.worker = { fetch: async () => { throw new Error("offline"); } };
  const res = await a.sync.eraseEverywhere();
  assert.deepEqual([res.ok, res.reached], [true, false], "an offline deletion claimed to have been sent");
  assert.ok(JSON.parse(a.storage.getItem(SYNC_KEY)).wipe, "the deletion was not kept to send later");
  assert.equal(a.sync.status().wipePending, true);

  // B keeps working in the meantime.
  heart(b.storage, venue("b-meanwhile"));
  gap(kv);
  assert.equal((await b.sync.syncNow()).ok, true);

  // A comes back: its deletion stands over what B did meanwhile.
  a.worker = realFetchOk;
  gap(kv);
  assert.equal((await a.sync.syncNow()).ok, true);
  assert.equal(a.sync.status().wipePending, false);
  await settle(kv, a, b);
  assert.deepEqual([favsOf(a.storage), favsOf(b.storage)], [[], []]);
});

test("two devices deleting at once converge on one empty state", async () => {
  const { kv, a, b } = await pair();
  await a.sync.eraseEverywhere({ afterErase: () => {} });
  gap(kv);
  await b.sync.eraseEverywhere();
  await settle(kv, a, b);
  assert.deepEqual([held(a.storage), held(b.storage), favsOf(a.storage), favsOf(b.storage)], [[], [], [], []]);
  for (const d of [a, b]) assert.equal(d.sync.status().wipePending, false);
});

test("a second deletion later is honoured too, not mistaken for the first", async () => {
  const { kv, a, b } = await pair();
  await a.sync.eraseEverywhere();
  await settle(kv, a, b);
  heart(b.storage, venue("second-life"));
  seedLocalOnly(a.storage);
  await settle(kv, a, b);
  assert.deepEqual(favsOf(a.storage), ["v:second-life"]);
  await b.sync.eraseEverywhere();
  await settle(kv, a, b);
  assert.deepEqual([favsOf(a.storage), favsOf(b.storage), held(a.storage), held(b.storage)], [[], [], [], []]);
});

test("personal recipes go with it, here and on the server", async () => {
  const { kv, a, b } = await pair();
  const RECIPES = scopeKey("default", "faves.recipes.v1");
  const rec = (id) => ({ dishId: id, name: id.slice(2), steps: ["Mix.", "Bake."] });
  a.storage.setItem(RECIPES, JSON.stringify({ "u:ginger-crunch": rec("u:ginger-crunch"), "u:pavlova": rec("u:pavlova") }));
  await settle(kv, a, b);
  assert.deepEqual(Object.keys(JSON.parse(b.storage.getItem(RECIPES) || "{}")).sort(), ["u:ginger-crunch", "u:pavlova"], "the control: B never received the recipes");

  await a.sync.eraseEverywhere();
  gap(kv);
  await b.sync.syncNow();
  await settle(kv, a, b);
  for (const d of [a, b]) assert.equal(d.storage.getItem(RECIPES), null, "a recipe survived");
  // A fresh device joining the group afterwards receives none.
  const c = phone(device([]), kv, { loc: "L3" });
  gap(kv);
  await c.sync.join(a.sync.status().code);
  await settle(kv, a, b, c);
  assert.equal(c.storage.getItem(RECIPES), null, "the server still held the recipes");
});

test("a device with no history is not wiped by a deletion made before it joined", async () => {
  const { kv, a } = await pair();
  await a.sync.eraseEverywhere();
  await settle(kv, a);
  // C has its own things and no last agreement with this group.
  const c = phone(device([venue("mine-on-c")]), kv, { loc: "L3" });
  gap(kv);
  await c.sync.join(a.sync.status().code);
  assert.deepEqual(favsOf(c.storage), ["v:mine-on-c"], "joining wiped the new device");
});

test("not paired: nothing is sent, and the deletion is local", async () => {
  const kv = new EdgeKV();
  const a = phone(device([venue("kk")]), kv);
  seedLocalOnly(a.storage);
  const res = await a.sync.eraseEverywhere();
  assert.deepEqual([res.ok, res.paired, res.reached], [true, false, false]);
  assert.equal(a.requests.length, 0, "an unpaired deletion touched the network");
  assert.deepEqual(held(a.storage), []);
});

test("a tab behind storage deletes nothing and sends nothing", async () => {
  const { a } = await pair();
  const before = a.requests.length;
  a.storage.setItem("faves.schema.v1", "999");
  const res = await a.sync.eraseEverywhere();
  assert.equal(res.ok, false);
  assert.equal(a.requests.length, before);
  assert.deepEqual(favsOf(a.storage), ["v:kk"]);
  assert.equal(JSON.parse(a.storage.getItem(SYNC_KEY)).wipe ?? null, null);
});

test("the sync log records that a deletion happened and not which hearts went", async () => {
  const { kv, a, b } = await pair({ favsA: [venue("secret-laksa")], favsB: [venue("secret-laksa")] });
  await a.sync.eraseEverywhere();
  gap(kv);
  await b.sync.syncNow();
  for (const d of [a, b]) {
    const log = d.sync.history();
    assert.ok(log.some((e) => e.wipe), "the deletion left no entry");
    assert.equal(JSON.stringify(d.storage.getItem(SYNC_LOG_KEY)).includes("secret-laksa"), false, "the log still names a deleted heart");
  }
});

// --- the decision itself, as a pure function ---------------------------------

test("resolveWipe: who wins, in every case the cycle can meet", () => {
  const W1 = { id: "2026-10-18T01:00:00Z~aaaa", at: "x" };
  const W2 = { id: "2026-10-18T02:00:00Z~bbbb", at: "y" };
  const base = (w) => ({ profiles: [], ...(w ? { wipe: w } : {}) });
  const srv = (w) => ({ profiles: [], ...(w ? { wipe: w } : {}) });
  // Nothing in play.
  assert.deepEqual(resolveWipe(base(), null, srv()), { winner: null, marker: null });
  // Mine, server has none / an older one already honoured.
  assert.equal(resolveWipe(base(), W1, srv()).winner, "mine");
  assert.equal(resolveWipe(base(W1), W2, srv(W1)).winner, "mine");
  // Theirs, new to me.
  assert.equal(resolveWipe(base(), null, srv(W1)).winner, "theirs");
  assert.equal(resolveWipe(base(W1), null, srv(W2)).winner, "theirs");
  // Already honoured: the ordinary merge.
  assert.deepEqual(resolveWipe(base(W1), null, srv(W1)), { winner: null, marker: W1 });
  // Both made one: the later wins, on both ends alike.
  assert.equal(resolveWipe(base(), W1, srv(W2)).winner, "theirs");
  assert.equal(resolveWipe(base(), W2, srv(W1)).winner, "mine");
  // The same one on both sides (sent, then the base write was lost): ordinary.
  assert.equal(resolveWipe(base(), W1, srv(W1)).winner, null);
  // No base: a marker is carried but never honoured.
  assert.deepEqual(resolveWipe(null, null, srv(W1)), { winner: null, marker: W1 });
  // Mine with no base still stands (nothing to be older than).
  assert.equal(resolveWipe(null, W1, srv(W2)).winner, "mine");
  // A new marker sorts after an older one made earlier.
  const a = newWipe("2026-10-18T01:00:00.000Z");
  const b = newWipe("2026-10-18T01:00:01.000Z");
  assert.ok(b.id > a.id);
});
