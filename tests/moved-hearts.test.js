// A heart on a moved recipe follows it (roadmap 510/400, guard B of 510/320,
// owner-ruled 2026-10-02). A heart, rating or note on a recipe's OLD id lands
// on the id the recipe was moved to, worked out from the moved recipe's own
// `movedFrom` in the person's cookbook — so no id is written into the app, and
// a person who moved nothing is untouched. It runs wherever a copy of the
// personal layer comes in: the stores as they read and write, a collect (so a
// backup and a sync send it moved), and all three inputs of a sync merge.
// Synthetic ids only. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  movesOfCookbook,
  movesOfStoredCookbook,
  followMovesInProfile,
  followMovesInSnapshot,
  toPersonalRecipe,
} from "../site/js/recipe-move.js";
import { createFavourites, favKey } from "../site/js/favourites.js";
import { createRatings } from "../site/js/ratings.js";
import { createNotes } from "../site/js/notes.js";
import { collectPersonalData } from "../site/js/personal-data.js";
import { RECIPES_KEY, MY_RECIPES } from "../site/js/recipe-record.js";
import { scopeKey } from "../site/js/profiles.js";
import { EdgeKV, CACHE_TTL_MS, ORIGIN, device, phone, favsOf, fakeStorage, storeFor } from "./stale-sync-harness.js";
import { SYNC_BASE_KEY } from "../site/js/sync.js";
import { deriveSyncKeys, openBlob, sealBlob } from "../site/js/sync-crypto.js";
import { normaliseSyncCode } from "../site/js/sync-code.js";
import worker from "../worker/sync-worker.js";

/** The server's copy as stored — decrypted, NOT followed — so a test can see
 *  whether an old key is still on the server for an older build to read. */
async function serverCopy(kv, code) {
  const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(code));
  const res = await worker.fetch(new Request(`https://w.test/v1/blob/${blobId}`, { headers: { Origin: ORIGIN } }), {
    SYNC_BLOBS: kv.at("L9"),
    SYNC_STORE: storeFor(kv),
    ALLOWED_ORIGINS: ORIGIN,
  });
  return openBlob(key, new Uint8Array(await res.arrayBuffer()));
}

/** Rewrite the server's core copy as an OLDER build would: `edit` gets the
 *  decrypted copy, the result is sealed and put back under If-Match. */
async function writeAsOlderBuild(kv, code, edit) {
  const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(code));
  const env = { SYNC_BLOBS: kv.at("L9"), SYNC_STORE: storeFor(kv), ALLOWED_ORIGINS: ORIGIN };
  const got = await worker.fetch(new Request(`https://w.test/v1/blob/${blobId}`, { headers: { Origin: ORIGIN } }), env);
  const etag = got.headers.get("etag");
  const snap = await openBlob(key, new Uint8Array(await got.arrayBuffer()));
  const body = await sealBlob(key, edit(snap));
  const put = await worker.fetch(
    new Request(`https://w.test/v1/blob/${blobId}?family=${snap.recipeBuckets?.n ?? 0}`, { method: "PUT", body, headers: { Origin: ORIGIN, "If-Match": etag } }),
    env
  );
  assert.equal(put.status, 204, "the older build's write was refused");
}

const V = "test-kitchen";
const ALPHA = toPersonalRecipe({ name: "Alpha Bake", dishId: "alpha-bake", steps: ["Mix."] }, { venueId: V, to: "u:alpha-bake" });
const BOOK = { "u:alpha-bake": ALPHA };
const OLD = { type: "dish", venueId: V, venueName: "Test Kitchen", name: "Alpha Bake", dishId: "alpha-bake", isRecipe: true };
const NEW = { type: "dish", venueId: MY_RECIPES, venueName: "My recipes", name: "Alpha Bake", dishId: "u:alpha-bake", isRecipe: true };
const OLD_K = `d:${V} alpha-bake`;
const NEW_K = `d:${MY_RECIPES} u:alpha-bake`;
const OTHER = { type: "venue", venueId: "kk", venueName: "KK" };

test("the moves come from the cookbook's own movedFrom, and nothing else", () => {
  const m = movesOfCookbook(BOOK);
  assert.deepEqual([...m], [[`${V} alpha-bake`, "u:alpha-bake"]]);
  // A recipe that was never moved, a personal "source", a malformed one, and a
  // non-personal key add nothing; two claiming one old id: first sorted wins.
  const odd = movesOfCookbook({
    "u:plain": { dishId: "u:plain", name: "Plain" },
    "u:a": { movedFrom: "u:mine u:x" },
    "u:b": { movedFrom: "nospace" },
    "not-personal": { movedFrom: `${V} beta` },
    "u:z-second": { movedFrom: `${V} gamma` },
    "u:a-first": { movedFrom: `${V} gamma` },
  });
  assert.deepEqual([...odd], [[`${V} gamma`, "u:a-first"]]);
  assert.equal(movesOfCookbook(null).size, 0);
  assert.equal(movesOfStoredCookbook(null).size, 0);
  assert.equal(movesOfStoredCookbook(JSON.stringify({ "u:plain": { dishId: "u:plain", name: "P" } })).size, 0);
  assert.equal(movesOfStoredCookbook(JSON.stringify(BOOK)).get(`${V} alpha-bake`), "u:alpha-bake");
});

test("a person's old heart, rating and note land on the moved recipe — once, and idempotently", () => {
  const p = {
    id: "default",
    favourites: [OLD, OTHER, NEW],
    ratings: { [OLD_K]: 5, "v:kk": 3 },
    notes: { [`${V} alpha-bake`]: "less sugar" },
    recipes: BOOK,
  };
  const out = followMovesInProfile(p);
  assert.deepEqual(out.favourites.map(favKey), [NEW_K, "v:kk"], "two hearts for one recipe, or the old one kept");
  assert.deepEqual(out.ratings, { "v:kk": 3, [NEW_K]: 5 });
  assert.deepEqual(out.notes, { [`${MY_RECIPES} u:alpha-bake`]: "less sugar" });
  assert.equal(followMovesInProfile(out), out, "a second pass changed something");
  // A rating already on the moved id wins over the old one.
  assert.equal(followMovesInProfile({ ...p, ratings: { [OLD_K]: 5, [NEW_K]: 2 } }).ratings[NEW_K], 2);
});

test("a person who moved nothing is untouched — no id in the app moves anybody's hearts", () => {
  const stranger = { id: "default", favourites: [OLD, OTHER], ratings: { [OLD_K]: 4 }, notes: {}, recipes: {} };
  assert.equal(followMovesInProfile(stranger), stranger);
  // Per person: the mover's cookbook moves the mover's hearts only.
  const snap = {
    profiles: [
      { id: "me", favourites: [OLD], recipes: BOOK },
      { id: "kid", favourites: [OLD], recipes: {} },
    ],
  };
  const out = followMovesInSnapshot(snap);
  assert.deepEqual(out.profiles[0].favourites.map(favKey), [NEW_K]);
  assert.deepEqual(out.profiles[1].favourites.map(favKey), [OLD_K], "the kid's heart moved on someone else's cookbook");
  assert.equal(followMovesInSnapshot({ profiles: [{ id: "x", favourites: [OTHER] }] }).profiles[0].favourites[0], OTHER);
});

test("a snapshot with no cookbook of its own (the server's copy, the base) follows the cookbooks a sync passes in", () => {
  const server = { v: 1, profiles: [{ id: "default", favourites: [OLD, NEW] }], pantry: "carried" };
  const out = followMovesInSnapshot(server, new Map([["default", BOOK]]));
  assert.deepEqual(out.profiles[0].favourites.map(favKey), [NEW_K]);
  assert.equal(out.pantry, "carried", "a field the follow does not name was dropped");
  assert.equal(server.profiles[0].favourites.length, 2, "the input was mutated");
});

/** One person's storage view holding a cookbook with the moved recipe. */
function personWithBook(seed = {}) {
  const s = fakeStorage({ [RECIPES_KEY]: JSON.stringify(BOOK), ...seed });
  return s;
}

test("the favourites store reads an old heart as the moved one, and a shortlist adding the old id lands on the moved heart", () => {
  const s = personWithBook({ "faves.favourites.v1": JSON.stringify([OLD, NEW, OTHER]) });
  const fav = createFavourites(s);
  assert.deepEqual(fav.items().map(favKey), [NEW_K, "v:kk"], "storage holding old + moved showed two hearts");
  // "Add to favourites" on a shortlist shared before the move.
  const before = fav.count();
  fav.merge([OLD, { type: "venue", venueId: "x1", venueName: "X1" }]);
  assert.equal(fav.count(), before + 1, "the old id was added beside the moved heart");
  const stored = JSON.parse(s.getItem("faves.favourites.v1")).map(favKey);
  assert.equal(stored.includes(OLD_K), false, "the old id was written to storage");
  assert.ok(stored.includes(NEW_K));
  // A stale page tapping the old recipe's heart on: one heart, the moved one.
  fav.toggle(OLD);
  assert.deepEqual(JSON.parse(s.getItem("faves.favourites.v1")).map(favKey).filter((k) => k.includes("alpha")), [NEW_K]);
});

test("the ratings and notes stores follow the same way, on read and on write", () => {
  const s = personWithBook({
    "faves.ratings.v1": JSON.stringify({ [OLD_K]: 4 }),
    "faves.notes.v1": JSON.stringify({ [`${V} alpha-bake`]: "more ginger" }),
  });
  const r = createRatings(s);
  assert.equal(r.get(NEW), 4, "the rating did not follow on read");
  assert.equal(r.get(OLD), 0);
  r.set({ type: "venue", venueId: "kk" }, 2);
  assert.deepEqual(Object.keys(JSON.parse(s.getItem("faves.ratings.v1"))).sort(), [NEW_K, "v:kk"].sort());
  const n = createNotes(s);
  assert.equal(n.get(`${MY_RECIPES} u:alpha-bake`), "more ginger");
  n.set("kk thing", "x");
  assert.equal(`${V} alpha-bake` in JSON.parse(s.getItem("faves.notes.v1")), false, "the old note key was written back");
});

test("a collect — a backup, and what sync sends — carries the moved heart, never the old one beside it", () => {
  const st = device([OLD, NEW, OTHER], { [OLD_K]: 5 });
  st.setItem(scopeKey("default", RECIPES_KEY), JSON.stringify(BOOK));
  const p = collectPersonalData(st, { exportedAt: "x" }).profiles[0];
  assert.deepEqual(p.favourites.map(favKey), [NEW_K, "v:kk"]);
  assert.deepEqual(p.ratings, { [NEW_K]: 5 });
});

test("sync follows all three inputs: a server copy and a base still holding the old id cannot bring it back, and the server copy is rewritten", async () => {
  // Laptop A holds the moved recipe and its heart. The server copy and A's
  // base were written before the move — or by a build without the follow —
  // and hold the OLD heart (and a rating on it). Followed on one side only,
  // the old key would read as someone else's heart and both would be kept.
  const kv = new EdgeKV();
  const a = phone(device([OTHER, OLD], { [OLD_K]: 5 }), kv);
  const b = phone(device([OTHER, OLD], { [OLD_K]: 5 }), kv);
  const { code } = await a.sync.enable();
  await b.sync.join(code);
  // The move lands on A by hand (as an import from an older build would):
  // cookbook + moved heart, old heart still there beside it in storage.
  a.storage.setItem(scopeKey("default", RECIPES_KEY), JSON.stringify(BOOK));
  a.storage.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([OTHER, OLD, NEW]));
  const baseBefore = a.storage.getItem(SYNC_BASE_KEY);
  assert.ok(baseBefore.includes(`"dishId":"alpha-bake"`), "the base did not hold the old heart, so this proves nothing");
  for (let i = 0; i < 2; i += 1) {
    kv.clock += 3 * CACHE_TTL_MS;
    for (const d of [a, b]) assert.equal((await d.sync.syncNow()).ok, true);
  }
  for (const [n, d] of [["laptop", a], ["phone", b]]) {
    const keys = favsOf(d.storage);
    assert.equal(keys.includes(OLD_K), false, `${n}: the old heart came back`);
    assert.ok(keys.includes(NEW_K), `${n}: the moved heart is missing`);
    const ratings = JSON.parse(d.storage.getItem(scopeKey("default", "faves.ratings.v1")));
    assert.deepEqual(ratings, { [NEW_K]: 5 }, `${n}: the rating did not follow`);
  }
  assert.equal(a.storage.getItem(SYNC_BASE_KEY).includes(`"dishId":"alpha-bake"`), false, "the base still holds the old heart");
  const onServer = (await serverCopy(kv, code)).profiles[0];
  assert.deepEqual(onServer.favourites.map(favKey).sort(), [NEW_K, "v:kk"].sort(), "the server copy still holds the old heart");
  assert.deepEqual(onServer.ratings, { [NEW_K]: 5 });
});

test("a server copy an older build wrote with the old heart beside the moved one is rewritten without it, though nothing else changed", async () => {
  // Isolates the server-side half: the cookbook is already agreed (no bucket
  // write to force a PUT), so only comparing the copy AS READ — not as
  // followed — notices the old key is still on the server for an older build
  // to bring back.
  const kv = new EdgeKV();
  const a = phone(device([OTHER, NEW]), kv);
  a.storage.setItem(scopeKey("default", RECIPES_KEY), JSON.stringify(BOOK));
  const { code } = await a.sync.enable();
  kv.clock += 3 * CACHE_TTL_MS;
  assert.equal((await a.sync.syncNow()).ok, true);
  await writeAsOlderBuild(kv, code, (snap) => {
    snap.profiles[0].favourites.push(OLD);
    return snap;
  });
  assert.ok((await serverCopy(kv, code)).profiles[0].favourites.map(favKey).includes(OLD_K), "the setup did not put the old heart on the server");
  kv.clock += 3 * CACHE_TTL_MS;
  assert.equal((await a.sync.syncNow()).ok, true);
  assert.deepEqual(favsOf(a.storage), [NEW_K, "v:kk"].sort());
  assert.deepEqual((await serverCopy(kv, code)).profiles[0].favourites.map(favKey).sort(), [NEW_K, "v:kk"].sort(), "the old heart was left on the server");
});
