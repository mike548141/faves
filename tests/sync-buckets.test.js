// The recipe buckets' pure half (site/js/sync-buckets.js, roadmap 510/050).
// The engine that drives them is tested in tests/sync.test.js. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RECIPE_BUCKETS,
  BUCKET_PAD,
  bucketOf,
  bucketPlaintext,
  hashRecipes,
  inBucket,
  mergeRecipeBucket,
  parseBucketHeader,
  readBucket,
  recipeHash,
} from "../site/js/sync-buckets.js";

const rec = (id, name = id, extra = {}) => ({ dishId: id, name, steps: ["Mix."], ...extra });
const enc = new TextEncoder();

// The size sample the bucket count was set from: the published Cook at Home
// recipes, re-keyed as personal ones.
const SAMPLE = (() => {
  const d = JSON.parse(readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url)));
  const out = {};
  for (const s of d.menu) for (const i of s.items) out[`u:${i.dishId}`] = { ...i, dishId: `u:${i.dishId}` };
  return out;
})();

test("a recipe's bucket is a stable function of its id", () => {
  assert.equal(bucketOf("u:ginger-crunch"), bucketOf("u:ginger-crunch"));
  for (const id of Object.keys(SAMPLE)) {
    const k = bucketOf(id);
    assert.ok(Number.isInteger(k) && k >= 0 && k < RECIPE_BUCKETS);
  }
  // The 25-recipe sample spreads across the buckets rather than piling into one.
  const used = new Set(Object.keys(SAMPLE).map((id) => bucketOf(id)));
  assert.ok(used.size >= 6, `only ${used.size} buckets used`);
});

test("a bucket's plaintext is padded to a multiple of 4 KiB, empty or full", () => {
  for (let k = 0; k < RECIPE_BUCKETS; k += 1) {
    const body = bucketPlaintext(k, inBucket(SAMPLE, k));
    const len = enc.encode(JSON.stringify(body)).length;
    assert.equal(len % BUCKET_PAD, 0, `bucket ${k}: ${len}`);
    assert.ok(len >= BUCKET_PAD);
  }
  // The whole sample: a size class, not a recipe count.
  const total = Array.from({ length: RECIPE_BUCKETS }, (_, k) =>
    enc.encode(JSON.stringify(bucketPlaintext(k, inBucket(SAMPLE, k)))).length
  ).reduce((a, b) => a + b, 0);
  assert.ok(total <= RECIPE_BUCKETS * BUCKET_PAD * 2, `${total}`);
});

test("a bucket opened under the wrong name is refused, and a stray recipe is left out", () => {
  const k = bucketOf("u:a");
  const body = JSON.parse(JSON.stringify(bucketPlaintext(k, { "u:a": rec("u:a") })));
  assert.deepEqual(Object.keys(readBucket(body, k)), ["u:a"]);
  assert.equal(readBucket(body, (k + 1) % RECIPE_BUCKETS), null);
  assert.equal(readBucket({ ...body, n: 16 }, k), null);
  assert.equal(readBucket({ ...body, format: "x" }, k), null);
  const other = Object.keys(SAMPLE).find((id) => bucketOf(id) !== k);
  body.recipes[other] = SAMPLE[other];
  assert.deepEqual(Object.keys(readBucket(body, k)), ["u:a"]);
});

test("the Worker's report parses, and silence is not 'none'", () => {
  assert.equal(parseBucketHeader(null), null, "an old Worker says nothing");
  assert.deepEqual(parseBucketHeader("none"), {});
  assert.deepEqual(parseBucketHeader('r0="a",r7="b"'), { r0: '"a"', r7: '"b"' });
});

test("a recipe's hash ignores field order and sees any change", () => {
  assert.equal(recipeHash({ a: 1, b: [1, { c: 2, d: 3 }] }), recipeHash({ b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.notEqual(recipeHash(rec("u:a")), recipeHash(rec("u:a", "A")));
});

test("the bucket merge: add, delete, edit, and an edit beats a delete", () => {
  const a = rec("u:a");
  const b = rec("u:b");
  const base = hashRecipes({ "u:a": a, "u:b": b });
  // Not read: the server holds what we agreed, so mine stands as it is.
  assert.deepEqual(mergeRecipeBucket(base, { "u:a": a }, null).map, { "u:a": a });
  // They added one; I deleted one they left alone.
  const c = rec("u:c");
  assert.deepEqual(Object.keys(mergeRecipeBucket(base, { "u:a": a }, { "u:a": a, "u:b": b, "u:c": c }).map), ["u:a", "u:c"]);
  // They edited one I left alone.
  const a2 = rec("u:a", "A, better");
  assert.equal(mergeRecipeBucket(base, { "u:a": a, "u:b": b }, { "u:a": a2, "u:b": b }).map["u:a"].name, "A, better");
  // I deleted it; they edited it. The edit survives, reported.
  const r = mergeRecipeBucket(base, { "u:b": b }, { "u:a": a2, "u:b": b });
  assert.equal(r.map["u:a"].name, "A, better");
  assert.equal(r.conflicts.length, 1);
  // Both edited: the same answer whichever device asks.
  const a3 = rec("u:a", "A, other");
  const x = mergeRecipeBucket(base, { "u:a": a2 }, { "u:a": a3 }).map["u:a"];
  const y = mergeRecipeBucket(base, { "u:a": a3 }, { "u:a": a2 }).map["u:a"];
  assert.deepEqual(x, y);
  // No base (first pairing): a union.
  assert.deepEqual(Object.keys(mergeRecipeBucket({}, { "u:a": a }, { "u:b": b }).map), ["u:a", "u:b"]);
});
