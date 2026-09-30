// Pure-logic + fetch-handler tests for sync-worker.js. Plain `node --test`,
// no dependencies (repo rule) — a fake in-memory KV namespace stands in for
// Workers KV so the routing/CAS/CORS logic in `export default { fetch }`
// gets exercised without wrangler, Miniflare, or a real Workers runtime.
// Node's global fetch API (Request/Response/ReadableStream) is what makes
// that possible without a shim.

import test from "node:test";
import assert from "node:assert/strict";
import worker, {
  isValidBlobId,
  pickAllowedOrigin,
  parseAllowedOrigins,
  parseIfMatch,
  formatEtag,
  readBodyCapped,
  parseBlobKey,
  familyKeys,
  formatBucketReport,
  MAX_BUCKETS,
  REFRESH_AFTER_SECONDS,
} from "./sync-worker.js";

// 32 hex chars = 128 bits, matching deriveSyncKeys() in site/js/sync-crypto.js
// (verified by reading that module — see the CONTRACT comment in
// sync-worker.js). Getting this wrong here would make every test in this
// file agree with itself while disagreeing with the real client.
const VALID_ID = "a".repeat(32);
const OTHER_VALID_ID = "b".repeat(32);
const ORIGIN = "https://lets-eat.myspot.nz";
const OTHER_ALLOWED_ORIGIN = "https://faves.pages.dev";
const DISALLOWED_ORIGIN = "https://evil.example";
const BASE = "https://sync.faves.test";

// --- Pure helpers -----------------------------------------------------

test("isValidBlobId accepts exactly 32 lowercase hex chars", () => {
  assert.equal(isValidBlobId(VALID_ID), true);
  assert.equal(isValidBlobId("a".repeat(31)), false); // too short
  assert.equal(isValidBlobId("a".repeat(33)), false); // too long
  assert.equal(isValidBlobId("A".repeat(32)), false); // uppercase not accepted
  assert.equal(isValidBlobId("g".repeat(32)), false); // non-hex char
  assert.equal(isValidBlobId(""), false);
  assert.equal(isValidBlobId(undefined), false);
  assert.equal(isValidBlobId(null), false);
  assert.equal(isValidBlobId(12345), false);
});

test("pickAllowedOrigin only ever returns a listed origin, never invents one", () => {
  const allowed = [ORIGIN, OTHER_ALLOWED_ORIGIN];
  assert.equal(pickAllowedOrigin(ORIGIN, allowed), ORIGIN);
  assert.equal(pickAllowedOrigin(DISALLOWED_ORIGIN, allowed), null);
  assert.equal(pickAllowedOrigin(null, allowed), null);
  assert.equal(pickAllowedOrigin(undefined, allowed), null);
});

test("parseAllowedOrigins tolerates whitespace and empty config", () => {
  assert.deepEqual(parseAllowedOrigins(" a , b ,c"), ["a", "b", "c"]);
  assert.deepEqual(parseAllowedOrigins(""), []);
  assert.deepEqual(parseAllowedOrigins(undefined), []);
});

test("parseIfMatch strips quotes and a weak-validator prefix", () => {
  assert.equal(parseIfMatch('"abc123"'), "abc123");
  assert.equal(parseIfMatch('W/"abc123"'), "abc123");
  assert.equal(parseIfMatch(""), null);
  assert.equal(parseIfMatch(null), null);
  assert.equal(parseIfMatch(undefined), null);
});

test("formatEtag wraps an opaque token in quotes", () => {
  assert.equal(formatEtag("abc123"), '"abc123"');
});

test("readBodyCapped assembles chunks under the cap and rejects over it", async () => {
  const makeStream = (chunks) =>
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      },
    });

  const small = makeStream([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]);
  const result = await readBodyCapped(small, 10);
  assert.deepEqual([...result], [1, 2, 3, 4, 5]);

  const big = makeStream([new Uint8Array(6), new Uint8Array(6)]); // 12 bytes total
  const rejected = await readBodyCapped(big, 10);
  assert.equal(rejected, null);

  const empty = await readBodyCapped(null, 10);
  assert.equal(empty.byteLength, 0);
});

// --- Fake KV + fetch-handler integration -------------------------------

/** Minimal stand-in for a Workers KV namespace binding — just enough of
 *  getWithMetadata/put for sync-worker.js's usage. Not a KV consistency
 *  model: it's strongly consistent (a plain Map), which is *more*
 *  forgiving than real KV, not less — see the CAS honesty comment in
 *  sync-worker.js for what that means for the 412 behaviour in production. */
class FakeKV {
  constructor() {
    this.store = new Map();
  }
  async getWithMetadata(key) {
    const entry = this.store.get(key);
    if (!entry) return { value: null, metadata: null };
    return { value: entry.value.slice(0), metadata: entry.metadata };
  }
  async put(key, value, opts = {}) {
    const bytes =
      value instanceof Uint8Array ? new Uint8Array(value) : value instanceof ArrayBuffer ? new Uint8Array(value.slice(0)) : new Uint8Array(0);
    this.store.set(key, { value: bytes.buffer, metadata: opts.metadata ?? null, ttl: opts.expirationTtl ?? null });
    this.puts = (this.puts || 0) + 1;
  }
}

function env() {
  return {
    SYNC_BLOBS: new FakeKV(),
    ALLOWED_ORIGINS: `${ORIGIN},${OTHER_ALLOWED_ORIGIN}`,
  };
}

function req(path, init = {}) {
  return new Request(BASE + path, init);
}

test("GET on a blob that was never written is 404", async () => {
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), env());
  assert.equal(res.status, 404);
  assert.equal(await res.arrayBuffer().then((b) => b.byteLength), 0);
});

test("first PUT to a new blobId succeeds unconditionally and hands back an ETag", async () => {
  const e = env();
  const body = new Uint8Array([9, 8, 7, 6]);
  const res = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body }),
    e,
  );
  assert.equal(res.status, 204);
  assert.ok(res.headers.get("ETag"));
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("GET after PUT returns the exact bytes, the right content type, and an ETag", async () => {
  const e = env();
  const body = new Uint8Array([1, 2, 3, 4, 5]);
  await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body }), e);

  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/octet-stream");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.ok(res.headers.get("ETag"));
  const got = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...got], [...body]);
});

test("a second PUT with no If-Match is refused once the blob exists (412)", async () => {
  const e = env();
  await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }),
    e,
  );
  const res = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([2]) }),
    e,
  );
  assert.equal(res.status, 412);
});

test("a stale If-Match is refused (412); the correct one succeeds and rotates the ETag", async () => {
  const e = env();
  const first = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }),
    e,
  );
  const firstEtag = first.headers.get("ETag");

  const staleAttempt = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, {
      method: "PUT",
      headers: { Origin: ORIGIN, "If-Match": '"not-the-real-one"' },
      body: new Uint8Array([2]),
    }),
    e,
  );
  assert.equal(staleAttempt.status, 412);

  const correctAttempt = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, {
      method: "PUT",
      headers: { Origin: ORIGIN, "If-Match": firstEtag },
      body: new Uint8Array([3]),
    }),
    e,
  );
  assert.equal(correctAttempt.status, 204);
  assert.notEqual(correctAttempt.headers.get("ETag"), firstEtag);
});

test("an invalid blobId never reaches KV — 400 on both GET and PUT", async () => {
  const e = env();
  const badId = "not-32-hex-chars";
  const getRes = await worker.fetch(req(`/v1/blob/${badId}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(getRes.status, 400);
  const putRes = await worker.fetch(
    req(`/v1/blob/${badId}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }),
    e,
  );
  assert.equal(putRes.status, 400);
  assert.equal(e.SYNC_BLOBS.store.size, 0);
});

test("an oversized PUT body is rejected with 413 and never stored", async () => {
  const e = env();
  const tooBig = new Uint8Array(256 * 1024 + 1);
  const res = await worker.fetch(
    req(`/v1/blob/${OTHER_VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: tooBig }),
    e,
  );
  assert.equal(res.status, 413);
  assert.equal(e.SYNC_BLOBS.store.size, 0);
});

test("an empty PUT body is rejected with 400", async () => {
  const e = env();
  const res = await worker.fetch(
    req(`/v1/blob/${OTHER_VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array(0) }),
    e,
  );
  assert.equal(res.status, 400);
});

test("no route exists but /v1/blob/<id> — no index, no listing", async () => {
  const e = env();
  for (const path of ["/", "/v1/blob", "/v1/blob/", `/v1/blob/${VALID_ID}/extra`, "/v1", "/favicon.ico"]) {
    const res = await worker.fetch(req(path, { headers: { Origin: ORIGIN } }), e);
    assert.equal(res.status, 404, `expected 404 for ${path}`);
  }
});

test("an unsupported method on a valid blob path is 405 with an Allow header", async () => {
  const e = env();
  const res = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "DELETE", headers: { Origin: ORIGIN } }),
    e,
  );
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, PUT, OPTIONS");
});

test("OPTIONS answers a CORS preflight without touching KV", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "OPTIONS", headers: { Origin: ORIGIN } }), e);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "GET, PUT, OPTIONS");
  assert.match(res.headers.get("Access-Control-Allow-Headers") || "", /If-Match/);
  assert.equal(e.SYNC_BLOBS.store.size, 0);
});

test("CORS never reflects an origin outside the allowlist — no ACAO, never *", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: DISALLOWED_ORIGIN } }), e);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
  assert.notEqual(res.headers.get("Access-Control-Allow-Origin"), "*");
});

test("the ETag is EXPOSED on the actual GET and PUT responses, not only on the preflight", async () => {
  // A cross-origin fetch() may read only the safelisted response headers
  // unless the actual response names more; ETag is not safelisted, and the
  // preflight's list exposes nothing for the request that follows it. With
  // this header on the preflight alone the browser client read `etag` as
  // null, sent every PUT without If-Match, and was refused with 412 forever
  // once a blob existed — while every Node-side check stayed green, because
  // Node's fetch does not filter response headers by CORS. Cold review,
  // 2026-08-17; the deployed Worker had exactly this fault.
  const e = env();
  const put = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }),
    e,
  );
  assert.equal(put.status, 204);
  assert.match(put.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
  const get = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(get.status, 200);
  assert.match(get.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
  // And on the refusals a client has to be able to read too.
  const missing = await worker.fetch(req(`/v1/blob/${"0".repeat(32)}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
});

test("security headers are present on a normal response", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

// --- Recipe buckets (roadmap 510/050, ADR 0146 §2) ---------------------

const BUCKET = (n) => `${VALID_ID}:r${n}`;
const put = (e, key, bytes, etag) =>
  worker.fetch(
    req(`/v1/blob/${key}`, {
      method: "PUT",
      headers: { Origin: ORIGIN, ...(etag ? { "If-Match": etag } : {}) },
      body: new Uint8Array(bytes),
    }),
    e,
  );

test("parseBlobKey takes the core copy and buckets 0–15, and nothing else", () => {
  assert.deepEqual(parseBlobKey(VALID_ID), { key: VALID_ID, blobId: VALID_ID, bucket: null });
  assert.deepEqual(parseBlobKey(BUCKET(0)), { key: BUCKET(0), blobId: VALID_ID, bucket: 0 });
  assert.equal(parseBlobKey(BUCKET(15)).bucket, 15);
  for (const bad of [BUCKET(16), `${VALID_ID}:r01`, `${VALID_ID}:r`, `${VALID_ID}:x1`, `${VALID_ID}:r-1`, `A${VALID_ID.slice(1)}:r1`, "", null]) {
    assert.equal(parseBlobKey(bad), null, `accepted ${bad}`);
  }
  assert.equal(familyKeys(VALID_ID).length, 1 + MAX_BUCKETS);
  assert.equal(formatBucketReport([]), "none");
  assert.equal(formatBucketReport([{ bucket: 2, version: "abc" }]), 'r2="abc"');
});

test("a bucket is stored under the user's key plus its number, with its own ETag", async () => {
  const e = env();
  const res = await put(e, BUCKET(3), [7, 7]);
  assert.equal(res.status, 204);
  assert.ok(e.SYNC_BLOBS.store.has(BUCKET(3)));
  const get = await worker.fetch(req(`/v1/blob/${BUCKET(3)}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("ETag"), res.headers.get("ETag"));
  // Conditional like the core copy: a second write without If-Match is refused.
  assert.equal((await put(e, BUCKET(3), [8])).status, 412);
});

test("a bucket number past the cap is refused before KV", async () => {
  const e = env();
  assert.equal((await put(e, BUCKET(16), [1])).status, 400);
  assert.equal(e.SYNC_BLOBS.store.size, 0);
});

test("a GET of the core copy asking ?buckets=n reports each bucket's version — on 200 AND 404", async () => {
  const e = env();
  const r0 = await put(e, BUCKET(0), [1]);
  const r5 = await put(e, BUCKET(5), [2]);
  // No core copy yet: the report still comes, so a first sync sees the buckets.
  const missing = await worker.fetch(req(`/v1/blob/${VALID_ID}?buckets=8`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")},r5=${r5.headers.get("ETag")}`);
  await put(e, VALID_ID, [3]);
  const got = await worker.fetch(req(`/v1/blob/${VALID_ID}?buckets=8`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")},r5=${r5.headers.get("ETag")}`);
  // A client may read it cross-origin.
  assert.match(got.headers.get("Access-Control-Expose-Headers") || "", /\bX-Faves-Buckets\b/i);
  // Only the buckets asked about: bucket 5 is outside ?buckets=4.
  const four = await worker.fetch(req(`/v1/blob/${VALID_ID}?buckets=4`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(four.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")}`);
});

test("no buckets reads 'none'; an older client that asks nothing gets no report and costs one read", async () => {
  const e = env();
  await put(e, VALID_ID, [3]);
  const none = await worker.fetch(req(`/v1/blob/${VALID_ID}?buckets=8`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(none.headers.get("X-Faves-Buckets"), "none");
  let reads = 0;
  const kv = e.SYNC_BLOBS;
  const orig = kv.getWithMetadata.bind(kv);
  kv.getWithMetadata = async (k) => {
    reads += 1;
    return orig(k);
  };
  const old = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(old.status, 200);
  assert.equal(old.headers.get("X-Faves-Buckets"), null);
  assert.equal(reads, 1);
});

test("any write re-arms the expiry of a sibling copy last written more than 30 days ago, keeping its bytes and version", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  const bucketPut = await put(e, BUCKET(2), [9, 9, 9]);
  const v = parseIfMatch(bucketPut.headers.get("ETag"));
  // Age the bucket: last written 31 days ago, with its expiry counting down.
  const aged = kv.store.get(BUCKET(2));
  const now = Math.floor(Date.now() / 1000);
  kv.store.set(BUCKET(2), { ...aged, metadata: { v, t: now - REFRESH_AFTER_SECONDS - 86400 }, ttl: 12345 });

  const before = kv.puts;
  await put(e, VALID_ID, [1]); // a heart: the core copy only
  assert.equal(kv.puts - before, 2, "the core write plus one re-armed bucket");
  const after = kv.store.get(BUCKET(2));
  assert.deepEqual([...new Uint8Array(after.value)], [9, 9, 9], "same bytes");
  assert.equal(after.metadata.v, v, "same version, so the core copy's record stays true");
  assert.ok(after.metadata.t >= now, "its write time moved");
  assert.equal(after.ttl, 180 * 24 * 60 * 60, "expiry re-armed in full");
});

test("a sibling written within 30 days is left alone — a heart costs one write, not nine", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  for (let n = 0; n < 8; n += 1) await put(e, BUCKET(n), [n + 1]);
  const core = await put(e, VALID_ID, [1]);
  const before = kv.puts;
  await put(e, VALID_ID, [2], core.headers.get("ETag"));
  assert.equal(kv.puts - before, 1);
});

test("a copy from before the write time was recorded is re-armed once, then left alone", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  // The deployed Worker wrote `{ v }` only.
  kv.store.set(VALID_ID, { value: new Uint8Array([5]).buffer, metadata: { v: "old" }, ttl: 99 });
  await put(e, BUCKET(0), [1]);
  assert.equal(kv.store.get(VALID_ID).metadata.v, "old");
  assert.ok(Number.isFinite(kv.store.get(VALID_ID).metadata.t));
  const before = kv.puts;
  await put(e, BUCKET(1), [1]);
  assert.equal(kv.puts - before, 1, "re-armed already, so not again");
});

test("a bucket write re-arms the core copy too (B1: recipes and hearts expire together or not at all)", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, VALID_ID, [1]);
  const c = kv.store.get(VALID_ID);
  kv.store.set(VALID_ID, { ...c, metadata: { ...c.metadata, t: 0 }, ttl: 1 });
  await put(e, BUCKET(4), [4]);
  assert.equal(kv.store.get(VALID_ID).ttl, 180 * 24 * 60 * 60);
});
