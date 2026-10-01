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
  familyAsked,
  knownAsked,
  copyName,
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
  await putWith(e, VALID_ID, `?known=r2:${v}`, [1]); // a heart: the core copy only
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
  await putWith(e, BUCKET(0), "?known=core:old", [1]);
  assert.equal(kv.store.get(VALID_ID).metadata.v, "old");
  assert.ok(Number.isFinite(kv.store.get(VALID_ID).metadata.t));
  const before = kv.puts;
  await putWith(e, BUCKET(1), "?known=core:old", [1]);
  assert.equal(kv.puts - before, 1, "re-armed already, so not again");
});

test("a bucket write re-arms the core copy too (B1: recipes and hearts expire together or not at all)", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, VALID_ID, [1]);
  const c = kv.store.get(VALID_ID);
  kv.store.set(VALID_ID, { ...c, metadata: { ...c.metadata, t: 0 }, ttl: 1 });
  await putWith(e, BUCKET(4), `?known=core:${c.metadata.v}`, [4]);
  assert.equal(kv.store.get(VALID_ID).ttl, 180 * 24 * 60 * 60);
});

// --- Only the buckets the client says exist (roadmap 510/140) ---------------

/** Count KV reads on `e` from here on. */
function countReads(e) {
  const kv = e.SYNC_BLOBS;
  const orig = kv.getWithMetadata.bind(kv);
  const seen = [];
  kv.getWithMetadata = async (k, t) => {
    seen.push(k);
    return orig(k, t);
  };
  return seen;
}

const putWith = (e, key, query, bytes, etag) =>
  worker.fetch(
    req(`/v1/blob/${key}${query}`, {
      method: "PUT",
      headers: { Origin: ORIGIN, ...(etag ? { "If-Match": etag } : {}) },
      body: new Uint8Array(bytes),
    }),
    e,
  );

test("familyAsked: a whole number up to the cap; anything else — an older client — is every bucket", () => {
  const q = (s) => new URLSearchParams(s);
  assert.equal(familyAsked(q("family=0")), 0);
  assert.equal(familyAsked(q("family=8")), 8);
  assert.equal(familyAsked(q("family=99")), MAX_BUCKETS);
  for (const bad of ["", "family=", "family=-1", "family=2.5", "family=x", "family=1e3"]) {
    assert.equal(familyAsked(q(bad)), MAX_BUCKETS, bad);
  }
  assert.deepEqual(familyKeys(VALID_ID, 0), [VALID_ID]);
  assert.equal(familyKeys(VALID_ID, 8).length, 9);
});

test("a heart from a user with no recipes (?family=0) costs one KV read and one write, not 17 and one", async () => {
  const e = env();
  const first = await putWith(e, VALID_ID, "?family=0", [1]);
  const seen = countReads(e);
  const before = e.SYNC_BLOBS.puts;
  const res = await putWith(e, VALID_ID, "?family=0", [2], first.headers.get("ETag"));
  assert.equal(res.status, 204);
  assert.deepEqual(seen, [VALID_ID], "only the copy being written is read");
  assert.equal(e.SYNC_BLOBS.puts - before, 1);
});

/** `?known=` naming every copy of a 16-bucket family but `self`, at `v`. */
const knowAll = (self, v = "x") =>
  `known=${["core", ...Array.from({ length: MAX_BUCKETS }, (_, n) => `r${n}`)].filter((n) => n !== self).map((n) => `${n}:${v}`).join(",")}`;

test("?family=8 reads the eight buckets and no more; a bucket write reads the core and the other seven", async () => {
  const e = env();
  const first = await putWith(e, VALID_ID, "?family=8", [1]);
  let seen = countReads(e);
  // The client names more than eight here on purpose: `family` still bounds it.
  await putWith(e, VALID_ID, `?family=8&${knowAll("core")}`, [2], first.headers.get("ETag"));
  assert.equal(seen.length, 1 + 8);
  assert.ok(!seen.includes(BUCKET(8)), "bucket 8 is outside a family of 8");
  seen.length = 0;
  await putWith(e, BUCKET(3), `?family=8&${knowAll("r3")}`, [3]);
  assert.equal(seen.length, 1 + 8, "its own read, the core, and the seven other buckets");
  assert.ok(seen.includes(VALID_ID));
});

test("a client that names its family but no versions (no ?family, ?known) reads every copy it could have", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, BUCKET(12), [7]);
  const aged = kv.store.get(BUCKET(12));
  kv.store.set(BUCKET(12), { ...aged, metadata: { ...aged.metadata, t: 0 }, ttl: 1 });
  const seen = countReads(e);
  await putWith(e, VALID_ID, `?${knowAll("core", aged.metadata.v)}`, [1]);
  assert.equal(seen.length, 1 + MAX_BUCKETS);
  assert.equal(kv.store.get(BUCKET(12)).ttl, 180 * 24 * 60 * 60, "bucket 12 kept alive");
});

test("510/330: a client from before ?known re-arms nothing, and reads no sibling to find out", async () => {
  // Its write cannot vouch for a read, and a re-arm from an unvouched read is
  // the revert this item fixed. Every copy has at least 150 days left from the
  // last re-arm; that client is gone the next time its page loads.
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, BUCKET(12), [7]);
  const aged = kv.store.get(BUCKET(12));
  kv.store.set(BUCKET(12), { ...aged, metadata: { ...aged.metadata, t: 0 }, ttl: 1 });
  const seen = countReads(e);
  const before = kv.puts;
  await put(e, VALID_ID, [1]);
  assert.deepEqual(seen, [VALID_ID]);
  assert.equal(kv.puts - before, 1);
  assert.equal(kv.store.get(BUCKET(12)).ttl, 1);
});

test("510/330: a sibling whose version is not the one the client names is neither re-written nor counted due", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, BUCKET(2), [9]);
  const aged = kv.store.get(BUCKET(2));
  kv.store.set(BUCKET(2), { ...aged, metadata: { ...aged.metadata, t: 0 }, ttl: 1 });
  const before = kv.puts;
  await putWith(e, VALID_ID, "?family=8&known=r2:someone-elses", [1]);
  assert.equal(kv.puts - before, 1, "only the core write");
  assert.equal(kv.store.get(BUCKET(2)).ttl, 1);
});

test("knownAsked: names and versions, bare or quoted; anything else dropped; absent is null", () => {
  const q = (s) => knownAsked(new URLSearchParams(s));
  assert.equal(q(""), null);
  assert.deepEqual([...q("known=")], []);
  assert.deepEqual([...q('known=core:"abc",r0:def,r15:g')], [["core", "abc"], ["r0", "def"], ["r15", "g"]]);
  for (const bad of ["known=r16:x", "known=r01:x", "known=core", "known=core:", "known=x:y", "known=core:\"\""]) {
    assert.deepEqual([...q(bad)], [], bad);
  }
  assert.equal(copyName(VALID_ID, VALID_ID), "core");
  assert.equal(copyName(BUCKET(7), VALID_ID), "r7");
});

test("a stale sibling inside the family is still re-armed when the client names the family", async () => {
  const e = env();
  const kv = e.SYNC_BLOBS;
  await put(e, BUCKET(2), [9]);
  const aged = kv.store.get(BUCKET(2));
  kv.store.set(BUCKET(2), { ...aged, metadata: { ...aged.metadata, t: 0 }, ttl: 1 });
  await putWith(e, VALID_ID, `?family=8&known=r2:${aged.metadata.v}`, [1]);
  assert.equal(kv.store.get(BUCKET(2)).ttl, 180 * 24 * 60 * 60);
});

// --- Re-arming never writes back older bytes (roadmap 510/330) ---------------

/**
 * A KV stand-in with the one property FakeKV leaves out: Workers KV is
 * eventually consistent, so a read can return an OLDER value — and older
 * metadata — than the latest write, for a bounded time. Here a write is
 * invisible to every read for `lagMs` after it is made, on the stand-in's own
 * clock (`kv.clock`, in ms, which a test moves); a read returns the newest
 * write at least that old, or what was seeded. Writes are last-writer-wins, so
 * `latest(key)` is what KV really holds once the dust settles.
 *
 * This is the model the 510/320 simulation used: a location that does not see
 * even its own writes for 60 s. Cloudflare documents writes as "usually"
 * visible at once where they were made and up to 60 s or more elsewhere, so
 * this is the worst case — a device whose next request lands somewhere else.
 */
class LaggyKV {
  constructor(lagMs = 60_000) {
    this.lagMs = lagMs;
    this.clock = 0;
    this.history = new Map(); // key -> [{ at, value, metadata, ttl }], oldest first
    this.puts = 0;
  }
  seed(key, bytes, metadata) {
    this.history.set(key, [{ at: -Infinity, value: new Uint8Array(bytes).buffer, metadata, ttl: null }]);
  }
  latest(key) {
    const h = this.history.get(key) || [];
    return h[h.length - 1] || null;
  }
  async getWithMetadata(key) {
    const seen = (this.history.get(key) || []).filter((w) => w.at <= this.clock - this.lagMs);
    const w = seen[seen.length - 1];
    return w ? { value: w.value.slice(0), metadata: w.metadata } : { value: null, metadata: null };
  }
  async put(key, value, opts = {}) {
    const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
    const h = this.history.get(key) || [];
    h.push({ at: this.clock, value: bytes.buffer, metadata: opts.metadata ?? null, ttl: opts.expirationTtl ?? null });
    this.history.set(key, h);
    this.puts += 1;
  }
}

const laggyEnv = () => ({ SYNC_BLOBS: new LaggyKV(), ALLOWED_ORIGINS: ORIGIN });
const bytesOf = (w) => [...new Uint8Array(w.value)];
const etagOf = (res) => parseIfMatch(res.headers.get("ETag"));
const DAY = 86400;
const nowS = () => Math.floor(Date.now() / 1000);

test("510/330: a bucket write does not put back an older core copy that a stale read returned (the pre-050 trigger: no `t`)", async () => {
  // The deployed Worker before 510/050 wrote `{ v }` only, so such a core
  // copy counts as due for re-arming at once. The import writes a new core
  // copy; a bucket write a few seconds later reads the core copy from a
  // location that has not seen that write yet.
  const e = laggyEnv();
  const kv = e.SYNC_BLOBS;
  kv.seed(VALID_ID, [1], { v: "old" });
  const core = await putWith(e, VALID_ID, "?family=8", [2], '"old"');
  assert.equal(core.status, 204);
  const vNew = etagOf(core);

  kv.clock = 5_000;
  // The client names the core version it holds — the one it just wrote.
  const bucket = await putWith(e, BUCKET(0), `?family=8&known=core:${vNew}`, [7]);
  assert.equal(bucket.status, 204);

  const held = kv.latest(VALID_ID);
  assert.deepEqual(bytesOf(held), [2], "the older core copy was written back over the import");
  assert.equal(held.metadata.v, vNew);
});

test("510/330: the same revert without the trigger — a core copy last written 31 days ago, a heart, then a recipe edit", async () => {
  // Treating a missing `t` as fresh would not reach this: a user back after a
  // month hearts something, then edits a recipe inside a minute.
  const e = laggyEnv();
  const kv = e.SYNC_BLOBS;
  kv.seed(VALID_ID, [1], { v: "c1", t: nowS() - 31 * DAY });
  const heart = await putWith(e, VALID_ID, "?family=8", [2], '"c1"');
  const vNew = etagOf(heart);
  kv.clock = 10_000;
  await putWith(e, BUCKET(3), `?family=8&known=core:${vNew}`, [7]);
  assert.deepEqual(bytesOf(kv.latest(VALID_ID)), [2], "the heart was undone");
});

test("510/330: the mirror — a core write does not put back an older bucket a stale read returned", async () => {
  // A sync cycle writes its buckets first, then the core copy recording their
  // versions (site/js/sync.js). The core write's re-arm reads the bucket the
  // cycle wrote a moment ago; if that read is stale and the bucket's previous
  // write is more than 30 days old, the recipe edit is undone.
  const e = laggyEnv();
  const kv = e.SYNC_BLOBS;
  kv.seed(VALID_ID, [1], { v: "c1", t: nowS() });
  kv.seed(BUCKET(0), [7], { v: "b1", t: nowS() - 31 * DAY });
  const edit = await putWith(e, BUCKET(0), "?family=8&known=core:c1", [8], '"b1"');
  assert.equal(edit.status, 204);
  const vB2 = etagOf(edit);

  kv.clock = 1_000;
  const core = await putWith(e, VALID_ID, `?family=8&known=r0:${vB2}`, [2], '"c1"');
  assert.equal(core.status, 204);

  const held = kv.latest(BUCKET(0));
  assert.deepEqual(bytesOf(held), [8], "the older bucket was written back over the recipe edit");
  assert.equal(held.metadata.v, vB2);
});

test("510/330: after the fix every copy still keeps 150 of its 180 days — the stale copies were written seconds ago", async () => {
  // ADR 0146's promise: every copy under a user key keeps at least 150 of its
  // 180 days after any write. A re-arm the fix skips is one whose read did not
  // match the version the client holds — so that copy was written within KV's
  // window, and its own write armed it in full.
  const e = laggyEnv();
  const kv = e.SYNC_BLOBS;
  kv.seed(VALID_ID, [1], { v: "c1", t: nowS() - 31 * DAY });
  kv.seed(BUCKET(0), [7], { v: "b1", t: nowS() - 31 * DAY });
  kv.seed(BUCKET(1), [6], { v: "b2", t: nowS() - 31 * DAY });
  const edit = await putWith(e, BUCKET(0), "?family=2&known=core:c1,r1:b2", [8], '"b1"');
  kv.clock = 1_000;
  await putWith(e, VALID_ID, `?family=2&known=r0:${etagOf(edit)},r1:b2`, [2], '"c1"');
  for (const k of [VALID_ID, BUCKET(0), BUCKET(1)]) {
    const w = kv.latest(k);
    assert.ok(nowS() - Number(w.metadata.t) < REFRESH_AFTER_SECONDS, `${k} was left due`);
    assert.equal(w.ttl, 180 * 24 * 60 * 60, `${k} expiry not re-armed`);
  }
  // …and the untouched bucket, read in step with what the client holds, was
  // re-armed keeping its bytes and version. Twice, in fact: the second write
  // read it before the first re-arm was visible. A version names one write's
  // bytes, so a re-arm whose read matched what the client holds re-writes the
  // newest bytes — wasted, as it was before 510/330, but never older.
  const r1 = kv.history.get(BUCKET(1)).slice(1);
  assert.ok(r1.length >= 1, "bucket 1 was not re-armed");
  for (const w of r1) {
    assert.deepEqual(bytesOf(w), [6]);
    assert.equal(w.metadata.v, "b2");
  }
});
