// Pure-logic + fetch-handler tests for sync-worker.js. Plain `node --test`,
// no dependencies (repo rule) — a Durable Object namespace stand-in
// (durable-object-standin.js, real SQLite via Node's built-in `node:sqlite`)
// and fake KV namespaces stand in for Cloudflare, so the routing, CAS, CORS,
// retention and migration logic gets exercised without wrangler, Miniflare,
// or a real Workers runtime. Node's global fetch API
// (Request/Response/ReadableStream) is what makes that possible without a shim.

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
  TTL_SECONDS,
  IMPORT_SETTLE_SECONDS,
  SyncStore,
} from "./sync-worker.js";
import { DurableObjectNamespaceStandIn } from "./durable-object-standin.js";

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

// --- The store stand-ins + fetch-handler integration ---------------------
//
// Since roadmap 510/340 (ADR 0151) every GET and PUT goes to the user's
// Durable Object; KV is read once, to import, and written only as a mirror.
// `DurableObjectNamespaceStandIn` (worker/durable-object-standin.js) is at
// least as strict as Cloudflare's (its header says where, and the two places
// it is more permissive). FakeKV below is strongly consistent, which is MORE
// forgiving than real KV — so the import's stale-read case is tested with
// LaggyKV further down, never with this.

/** Minimal stand-in for a Workers KV namespace binding — getWithMetadata/put,
 *  counting both. */
class FakeKV {
  constructor() {
    this.store = new Map();
    this.puts = 0;
    this.reads = 0;
  }
  async getWithMetadata(key) {
    this.reads += 1;
    const entry = this.store.get(key);
    if (!entry) return { value: null, metadata: null };
    return { value: entry.value.slice(0), metadata: entry.metadata };
  }
  async put(key, value, opts = {}) {
    const bytes =
      value instanceof Uint8Array ? new Uint8Array(value) : value instanceof ArrayBuffer ? new Uint8Array(value.slice(0)) : new Uint8Array(0);
    this.store.set(key, { value: bytes.buffer, metadata: opts.metadata ?? null, ttl: opts.expirationTtl ?? null });
    this.puts += 1;
  }
  seed(key, bytes, metadata) {
    this.store.set(key, { value: new Uint8Array(bytes).buffer, metadata, ttl: null });
  }
}

const DAY = 86400;
const NOW0 = Math.floor(Date.parse("2026-10-02T00:00:00Z") / 1000);
/** Deployed a day before the tests' clock starts: the import may run. */
const DEPLOYED = new Date((NOW0 - DAY) * 1000).toISOString();

/**
 * A Worker environment: the Durable Object namespace, the KV it imports from
 * and mirrors to, and a clock the test moves (`e.clock.now`, seconds).
 */
function env({ kv = new FakeKV(), mirror = "off", deployed = DEPLOYED, Store = SyncStore } = {}) {
  const clock = { now: NOW0 };
  const objEnv = { SYNC_BLOBS: kv, KV_MIRROR: mirror };
  if (deployed !== null) objEnv.CF_VERSION_METADATA = { timestamp: deployed };
  const ns = new DurableObjectNamespaceStandIn(Store, objEnv, { now: () => clock.now });
  return {
    SYNC_STORE: ns,
    SYNC_BLOBS: kv,
    ALLOWED_ORIGINS: `${ORIGIN},${OTHER_ALLOWED_ORIGIN}`,
    clock,
    kv,
    ns,
    /** The rows the object for `blobId` holds, by name. */
    rows: (blobId = VALID_ID) => Object.fromEntries(ns.storage(blobId).dump("copies").map((r) => [r.name, r])),
    /** Set a stored copy's write time directly (the way a month passes). */
    age: (name, t, blobId = VALID_ID) => ns.storage(blobId).sql.exec("UPDATE copies SET t = ? WHERE name = ?", t, name),
  };
}

function req(path, init = {}) {
  return new Request(BASE + path, init);
}

const get = (e, key, query = "", headers = {}) => worker.fetch(req(`/v1/blob/${key}${query}`, { headers: { Origin: ORIGIN, ...headers } }), e);

test("GET on a blob that was never written is 404, and leaves no storage behind", async () => {
  const e = env();
  const res = await get(e, VALID_ID);
  assert.equal(res.status, 404);
  assert.equal(await res.arrayBuffer().then((b) => b.byteLength), 0);
  // A probe of a random id must not create a database (rows cost, forever).
  assert.equal(e.ns.storage(VALID_ID).dump("copies").length, 0);
  assert.deepEqual(e.ns.storage(VALID_ID).db.prepare("SELECT name FROM sqlite_master").all(), []);
});

test("first PUT to a new blobId succeeds unconditionally and hands back an ETag", async () => {
  const e = env();
  const body = new Uint8Array([9, 8, 7, 6]);
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body }), e);
  assert.equal(res.status, 204);
  assert.ok(res.headers.get("ETag"));
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("GET after PUT returns the exact bytes, the right content type, and an ETag", async () => {
  const e = env();
  const body = new Uint8Array([1, 2, 3, 4, 5]);
  await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body }), e);

  const res = await get(e, VALID_ID);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/octet-stream");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.ok(res.headers.get("ETag"));
  const got = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...got], [...body]);
});

test("a second PUT with no If-Match is refused once the blob exists (412)", async () => {
  const e = env();
  await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }), e);
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([2]) }), e);
  assert.equal(res.status, 412);
});

test("a stale If-Match is refused (412); the correct one succeeds and rotates the ETag", async () => {
  const e = env();
  const first = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }), e);
  const firstEtag = first.headers.get("ETag");

  const staleAttempt = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN, "If-Match": '"not-the-real-one"' }, body: new Uint8Array([2]) }),
    e,
  );
  assert.equal(staleAttempt.status, 412);

  const correctAttempt = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN, "If-Match": firstEtag }, body: new Uint8Array([3]) }),
    e,
  );
  assert.equal(correctAttempt.status, 204);
  assert.notEqual(correctAttempt.headers.get("ETag"), firstEtag);
  // A weak validator for the current version is accepted, as before.
  const weak = await worker.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN, "If-Match": `W/${correctAttempt.headers.get("ETag")}` }, body: new Uint8Array([4]) }),
    e,
  );
  assert.equal(weak.status, 204);
});

test("an invalid blobId never reaches storage — 400 on both GET and PUT, no object woken", async () => {
  const e = env();
  const badId = "not-32-hex-chars";
  const getRes = await get(e, badId);
  assert.equal(getRes.status, 400);
  const putRes = await worker.fetch(req(`/v1/blob/${badId}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }), e);
  assert.equal(putRes.status, 400);
  assert.equal(e.ns.requests, 0);
  assert.equal(e.kv.reads + e.kv.puts, 0);
});

test("an oversized PUT body is rejected with 413 before any object is woken", async () => {
  const e = env();
  const tooBig = new Uint8Array(256 * 1024 + 1);
  const res = await worker.fetch(req(`/v1/blob/${OTHER_VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: tooBig }), e);
  assert.equal(res.status, 413);
  assert.equal(e.ns.requests, 0);
});

test("an empty PUT body is rejected with 400", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${OTHER_VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array(0) }), e);
  assert.equal(res.status, 400);
  assert.equal(e.ns.requests, 0);
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
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "DELETE", headers: { Origin: ORIGIN } }), e);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, PUT, OPTIONS");
  assert.equal(e.ns.requests, 0);
});

test("OPTIONS answers a CORS preflight without touching storage", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "OPTIONS", headers: { Origin: ORIGIN } }), e);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "GET, PUT, OPTIONS");
  assert.match(res.headers.get("Access-Control-Allow-Headers") || "", /If-Match/);
  assert.equal(e.ns.requests, 0);
});

test("CORS never reflects an origin outside the allowlist — no ACAO, never *", async () => {
  const e = env();
  const res = await get(e, VALID_ID, "", { Origin: DISALLOWED_ORIGIN });
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
  // 2026-08-17; the deployed Worker had exactly this fault. Since 510/340 the
  // object's response is re-wrapped by the Worker, so this is also the check
  // that the re-wrap keeps it.
  const e = env();
  const put = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([1]) }), e);
  assert.equal(put.status, 204);
  assert.match(put.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
  const got = await get(e, VALID_ID);
  assert.equal(got.status, 200);
  assert.match(got.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
  assert.equal(got.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  // And on the refusals a client has to be able to read too.
  const missing = await get(e, "0".repeat(32));
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
  const refused = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN }, body: new Uint8Array([2]) }), e);
  assert.equal(refused.status, 412);
  assert.equal(refused.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.match(refused.headers.get("Access-Control-Expose-Headers") || "", /\bETag\b/i);
});

test("security headers are present on a normal response", async () => {
  const e = env();
  const res = await get(e, VALID_ID);
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("no SYNC_STORE binding is a broken deploy: 500, never a fallback to reading KV", async () => {
  const e = env();
  const kv = e.kv;
  kv.seed(VALID_ID, [1], { v: "kv-copy", t: NOW0 });
  const bare = { SYNC_BLOBS: kv, ALLOWED_ORIGINS: ORIGIN };
  const res = await get(bare, VALID_ID);
  assert.equal(res.status, 500);
  assert.equal(kv.reads, 0);
});

test("an object refuses a key that is not its own (routing integrity)", async () => {
  const e = env();
  // Straight to the object for VALID_ID, asking for another user's key.
  const stub = e.ns.get(e.ns.idFromName(VALID_ID));
  const res = await stub.fetch(new Request(`https://sync-store.internal/${OTHER_VALID_ID}`, { method: "PUT", body: new Uint8Array([1]) }));
  assert.equal(res.status, 500);
  assert.deepEqual(e.rows(VALID_ID), {});
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
const putWith = (e, key, query, bytes, etag) =>
  worker.fetch(
    req(`/v1/blob/${key}${query}`, {
      method: "PUT",
      headers: { Origin: ORIGIN, ...(etag ? { "If-Match": etag } : {}) },
      body: new Uint8Array(bytes),
    }),
    e,
  );
const etagOf = (res) => parseIfMatch(res.headers.get("ETag"));
const bytesOf = (body) => [...new Uint8Array(body)];

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

test("a bucket is stored in the user's object under its own name, with its own ETag", async () => {
  const e = env();
  const res = await put(e, BUCKET(3), [7, 7]);
  assert.equal(res.status, 204);
  assert.deepEqual(Object.keys(e.rows()), ["r3"]);
  const got = await get(e, BUCKET(3));
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("ETag"), res.headers.get("ETag"));
  // Conditional like the core copy: a second write without If-Match is refused.
  assert.equal((await put(e, BUCKET(3), [8])).status, 412);
});

test("a bucket number past the cap is refused before storage", async () => {
  const e = env();
  assert.equal((await put(e, BUCKET(16), [1])).status, 400);
  assert.equal(e.ns.requests, 0);
});

test("a GET of the core copy asking ?buckets=n reports each bucket's version — on 200 AND 404", async () => {
  const e = env();
  const r0 = await put(e, BUCKET(0), [1]);
  const r5 = await put(e, BUCKET(5), [2]);
  // No core copy yet: the report still comes, so a first sync sees the buckets.
  const missing = await get(e, VALID_ID, "?buckets=8");
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")},r5=${r5.headers.get("ETag")}`);
  await put(e, VALID_ID, [3]);
  const got = await get(e, VALID_ID, "?buckets=8");
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")},r5=${r5.headers.get("ETag")}`);
  // A client may read it cross-origin.
  assert.match(got.headers.get("Access-Control-Expose-Headers") || "", /\bX-Faves-Buckets\b/i);
  // Only the buckets asked about: bucket 5 is outside ?buckets=4.
  const four = await get(e, VALID_ID, "?buckets=4");
  assert.equal(four.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")}`);
});

test("no buckets reads 'none'; an older client that asks nothing gets no report", async () => {
  const e = env();
  await put(e, VALID_ID, [3]);
  const none = await get(e, VALID_ID, "?buckets=8");
  assert.equal(none.headers.get("X-Faves-Buckets"), "none");
  const old = await get(e, VALID_ID);
  assert.equal(old.status, 200);
  assert.equal(old.headers.get("X-Faves-Buckets"), null);
});

test("after the import, sync reads no KV at all — a heart, a pull and a bucket report", async () => {
  // Under the KV Worker a heart cost 1–17 KV reads and every pull one or
  // nine. Now the one-time import is the only KV read a user ever costs.
  const e = env();
  const first = await putWith(e, VALID_ID, "?family=8", [1]);
  const reads = e.kv.reads;
  assert.equal(reads, 1 + MAX_BUCKETS, "the import read every copy the user could have, once");
  await putWith(e, VALID_ID, `?family=8&known=r0:x`, [2], first.headers.get("ETag"));
  await get(e, VALID_ID, "?buckets=8");
  await put(e, BUCKET(1), [3]);
  assert.equal(e.kv.reads, reads);
});

// --- Retention: exactly the KV Worker's (ADR 0146 §2; roadmap 510/140, 330) --
//
// Each copy expires TTL_SECONDS after it was last written or re-armed. A write
// re-arms another copy only if it is inside `?family` (16 when absent), the
// client vouches for its exact version in `?known` (nothing when absent), and
// it is REFRESH_AFTER_SECONDS or more past its last write. A GET re-arms
// nothing. These are the KV tests of 510/050, 140 and 330, re-expressed on
// the object's rows: `t` there was KV metadata, here it is a column.

test("any write re-arms the expiry of a sibling copy last written more than 30 days ago, keeping its bytes and version", async () => {
  const e = env();
  const bucketPut = await put(e, BUCKET(2), [9, 9, 9]);
  const v = etagOf(bucketPut);
  e.age("r2", NOW0 - REFRESH_AFTER_SECONDS - DAY);

  await putWith(e, VALID_ID, `?known=r2:${v}`, [1]); // a heart: the core copy only
  const after = e.rows().r2;
  assert.deepEqual(bytesOf(after.body), [9, 9, 9], "same bytes");
  assert.equal(after.v, v, "same version, so the core copy's record stays true");
  assert.equal(after.t, NOW0, "its write time moved, so its full 180 days start again");
});

test("a sibling written within 30 days is left alone", async () => {
  const e = env();
  for (let n = 0; n < 8; n += 1) await put(e, BUCKET(n), [n + 1]);
  e.clock.now += 29 * DAY;
  const core = await put(e, VALID_ID, [1]);
  const known = Array.from({ length: 8 }, (_, n) => `r${n}:${e.rows()[`r${n}`].v}`).join(",");
  await putWith(e, VALID_ID, `?family=8&known=${known}`, [2], core.headers.get("ETag"));
  for (let n = 0; n < 8; n += 1) assert.equal(e.rows()[`r${n}`].t, NOW0, `r${n} was re-armed inside 30 days`);
});

test("a bucket write re-arms the core copy too (B1: recipes and hearts expire together or not at all)", async () => {
  const e = env();
  const core = await put(e, VALID_ID, [1]);
  e.clock.now += 100 * DAY;
  await putWith(e, BUCKET(4), `?known=core:${etagOf(core)}`, [4]);
  assert.equal(e.rows().core.t, e.clock.now);
});

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

/** `?known=` naming every copy of a 16-bucket family but `self`, each at the version stored. */
const knowAll = (e, self) =>
  `known=${["core", ...Array.from({ length: MAX_BUCKETS }, (_, n) => `r${n}`)]
    .filter((n) => n !== self && e.rows()[n])
    .map((n) => `${n}:${e.rows()[n].v}`)
    .join(",")}`;

test("?family bounds the re-arm: bucket 12 is outside a family of 8; with no ?family every bucket is in", async () => {
  const e = env();
  await put(e, BUCKET(3), [3]);
  await put(e, BUCKET(12), [12]);
  e.clock.now += 40 * DAY;
  await putWith(e, VALID_ID, `?family=8&${knowAll(e, "core")}`, [1]);
  assert.equal(e.rows().r3.t, e.clock.now, "bucket 3 is in a family of 8");
  assert.equal(e.rows().r12.t, NOW0, "bucket 12 is outside it");
  const core = e.rows().core.v;
  await putWith(e, VALID_ID, `?${knowAll(e, "core")}`, [2], `"${core}"`);
  assert.equal(e.rows().r12.t, e.clock.now, "no ?family is all 16");
});

test("?family=0 — a user with no recipes — re-arms no bucket", async () => {
  const e = env();
  await put(e, BUCKET(0), [1]);
  e.clock.now += 40 * DAY;
  await putWith(e, VALID_ID, `?family=0&${knowAll(e, "core")}`, [1]);
  assert.equal(e.rows().r0.t, NOW0);
});

test("510/330: a client from before ?known re-arms nothing", async () => {
  // Kept from the KV Worker so retention is the same to the day. Every copy
  // has at least 150 days left from the last re-arm; that client is gone the
  // next time its page loads.
  const e = env();
  await put(e, BUCKET(12), [7]);
  e.clock.now += 40 * DAY;
  await put(e, VALID_ID, [1]);
  assert.equal(e.rows().r12.t, NOW0);
});

test("510/330: a sibling whose version is not the one the client names is not re-armed", async () => {
  const e = env();
  await put(e, BUCKET(2), [9]);
  e.clock.now += 40 * DAY;
  await putWith(e, VALID_ID, "?family=8&known=r2:someone-elses", [1]);
  assert.equal(e.rows().r2.t, NOW0);
});

test("knownAsked: names and versions, bare or quoted; anything else dropped; absent is null", () => {
  const q = (s) => knownAsked(new URLSearchParams(s));
  assert.equal(q(""), null);
  assert.deepEqual([...q("known=")], []);
  assert.deepEqual([...q('known=core:"abc",r0:def,r15:g')], [["core", "abc"], ["r0", "def"], ["r15", "g"]]);
  for (const bad of ["known=r16:x", "known=r01:x", "known=core", "known=core:", "known=x:y", 'known=core:""']) {
    assert.deepEqual([...q(bad)], [], bad);
  }
  assert.equal(copyName(VALID_ID, VALID_ID), "core");
  assert.equal(copyName(BUCKET(7), VALID_ID), "r7");
});

test("510/330, re-run on the object: a bucket write a moment after a core write never puts the older core copy back", async () => {
  // Under KV a re-arm re-wrote the bytes it READ, and a stale read put the
  // older core copy back over the import (the pre-050 trigger: no `t`). Here a
  // re-arm moves `t` and nothing else, and every read is the latest write.
  const e = env();
  const kv = e.kv;
  kv.seed(VALID_ID, [1], { v: "old" }); // a pre-050 core copy, imported
  const core = await putWith(e, VALID_ID, "?family=8", [2], '"old"');
  assert.equal(core.status, 204);
  const vNew = etagOf(core);
  e.clock.now += 5;
  const bucket = await putWith(e, BUCKET(0), `?family=8&known=core:${vNew}`, [7]);
  assert.equal(bucket.status, 204);
  assert.deepEqual(bytesOf(e.rows().core.body), [2]);
  assert.equal(e.rows().core.v, vNew);
});

test("a GET never extends a copy's life; a copy is gone at exactly 180 days after its last write", async () => {
  const e = env();
  await put(e, VALID_ID, [1]);
  e.clock.now += TTL_SECONDS - 1;
  assert.equal((await get(e, VALID_ID)).status, 200);
  assert.equal(e.rows().core.t, NOW0, "the GET re-armed it");
  e.clock.now += 1;
  // Expired is absent — on the read itself, before any alarm has run — and the
  // next write is a first write again, exactly as with a KV key past its TTL.
  assert.equal((await get(e, VALID_ID)).status, 404);
  assert.equal((await get(e, VALID_ID, "?buckets=8")).headers.get("X-Faves-Buckets"), "none");
  assert.equal((await put(e, VALID_ID, [2])).status, 204);
});

test("expiry: the alarm deletes what has expired and frees the object once nothing is left", async () => {
  const e = env();
  const st = e.ns.storage(VALID_ID);
  await put(e, VALID_ID, [1]);
  assert.equal(st.alarm, (NOW0 + TTL_SECONDS) * 1000, "an alarm at the first expiry");
  e.clock.now += 10 * DAY;
  await put(e, BUCKET(0), [2]); // expires 10 days after the core copy
  // Early: the core copy was re-armed in the meantime, so the alarm finds
  // nothing to delete and moves itself to the real first expiry.
  e.clock.now = NOW0 + 100 * DAY;
  await put(e, VALID_ID, [3], `"${e.rows().core.v}"`); // vouches for nothing: bucket 0 is not re-armed
  e.clock.now = NOW0 + TTL_SECONDS;
  assert.equal(await e.ns.runAlarm(VALID_ID), true);
  assert.deepEqual(Object.keys(e.rows()).sort(), ["core", "r0"], "nothing had expired yet");
  assert.equal(st.alarm, (NOW0 + 10 * DAY + TTL_SECONDS) * 1000, "re-set for bucket 0's expiry");
  // Bucket 0 expires (the core write vouched for nothing, so it was not re-armed).
  e.clock.now = NOW0 + 10 * DAY + TTL_SECONDS;
  await e.ns.runAlarm(VALID_ID);
  assert.deepEqual(Object.keys(e.rows()), ["core"]);
  // Then the core copy, and with it everything: no rows, no tables, no alarm.
  e.clock.now = NOW0 + 100 * DAY + TTL_SECONDS;
  await e.ns.runAlarm(VALID_ID);
  assert.deepEqual(st.db.prepare("SELECT name FROM sqlite_master").all(), []);
  assert.equal(st.alarm, null);
  assert.equal((await get(e, VALID_ID)).status, 404);
});

// --- Compare-and-swap (roadmap 510/340) ----------------------------------

test("CAS: two PUTs racing with the same If-Match — exactly one wins, the other gets 412", async () => {
  // Under KV both could pass (each read the version through its own location
  // and both wrote, the later silently winning). In the object the read and
  // the write are one synchronous step.
  for (let round = 0; round < 50; round += 1) {
    const e = env();
    const first = await put(e, VALID_ID, [0]);
    const tag = first.headers.get("ETag");
    const racers = await Promise.all([put(e, VALID_ID, [1], tag), put(e, VALID_ID, [2], tag), put(e, VALID_ID, [3], tag)]);
    const statuses = racers.map((r) => r.status).sort();
    assert.deepEqual(statuses, [204, 412, 412], `round ${round}`);
    const winner = racers.find((r) => r.status === 204);
    assert.equal(e.rows().core.v, etagOf(winner), "the stored version is the winner's");
  }
});

test("CAS: two FIRST writes racing — one creates the copy, the other is refused like any write to an existing copy", async () => {
  const e = env();
  const [a, b] = await Promise.all([put(e, VALID_ID, [1]), put(e, VALID_ID, [2])]);
  assert.deepEqual([a.status, b.status].sort(), [204, 412]);
});

test("CAS: racing on the core copy does not disturb a bucket written at the same moment", async () => {
  const e = env();
  const core = await put(e, VALID_ID, [0]);
  const bucket = await put(e, BUCKET(0), [5]);
  const [c1, c2, b1] = await Promise.all([
    put(e, VALID_ID, [1], core.headers.get("ETag")),
    put(e, VALID_ID, [2], core.headers.get("ETag")),
    put(e, BUCKET(0), [6], bucket.headers.get("ETag")),
  ]);
  assert.deepEqual([c1.status, c2.status].sort(), [204, 412]);
  assert.equal(b1.status, 204);
  assert.deepEqual(bytesOf(e.rows().r0.body), [6]);
});

// --- The one-time import from KV (roadmap 510/340 migration) -------------

test("migration: the first request imports every copy from KV, versions intact — a device's ETag from the KV Worker still matches", async () => {
  // The decisive compatibility property: a device that last synced against
  // the KV Worker holds an ETag that Worker issued. After the cutover its next
  // conditional PUT must still match, or every device would 412 forever.
  const e = env();
  const kv = e.kv;
  kv.seed(VALID_ID, [1, 1], { v: "kv-core", t: NOW0 - 3 * DAY });
  kv.seed(BUCKET(0), [2], { v: "kv-r0", t: NOW0 - 3 * DAY });
  kv.seed(BUCKET(7), [3], { v: "kv-r7", t: NOW0 - 40 * DAY });
  const got = await get(e, VALID_ID, "?buckets=8");
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("ETag"), '"kv-core"');
  assert.equal(got.headers.get("X-Faves-Buckets"), 'r0="kv-r0",r7="kv-r7"');
  assert.deepEqual(bytesOf(await got.arrayBuffer()), [1, 1]);
  // Write times carried over, so retention continues where KV left it.
  assert.equal(e.rows().r7.t, NOW0 - 40 * DAY);
  const write = await put(e, VALID_ID, [9], '"kv-core"');
  assert.equal(write.status, 204);
  // And KV was only READ: not written, not deleted.
  assert.equal(kv.puts, 0);
  assert.deepEqual(bytesOf(kv.store.get(VALID_ID).value), [1, 1]);
});

test("migration: imported once — a later change in KV is never read again", async () => {
  const e = env();
  e.kv.seed(VALID_ID, [1], { v: "kv-core", t: NOW0 });
  await get(e, VALID_ID);
  e.kv.seed(VALID_ID, [6, 6, 6], { v: "written-to-kv-later", t: NOW0 });
  e.ns.evict(VALID_ID); // a fresh instance, the same storage
  const got = await get(e, VALID_ID);
  assert.equal(got.headers.get("ETag"), '"kv-core"');
});

test("migration: requests racing on an object's first touch import it ONCE", async () => {
  const e = env();
  e.kv.seed(VALID_ID, [1], { v: "kv-core", t: NOW0 });
  const all = await Promise.all([get(e, VALID_ID), get(e, VALID_ID, "?buckets=8"), put(e, VALID_ID, [2], '"kv-core"')]);
  assert.deepEqual(all.map((r) => r.status), [200, 200, 204]);
  assert.equal(e.kv.reads, 1 + MAX_BUCKETS);
});

test("migration: an expired KV copy is not imported; one with no write time (before 510/050) is, as written now", async () => {
  const e = env();
  e.kv.seed(VALID_ID, [1], { v: "pre-050" });
  e.kv.seed(BUCKET(0), [2], { v: "too-old", t: NOW0 - TTL_SECONDS });
  const got = await get(e, VALID_ID, "?buckets=8");
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("X-Faves-Buckets"), "none");
  assert.equal(e.rows().core.t, NOW0);
});

test("migration: an id with nothing in KV and nothing written stores nothing — and a fresh instance looks again", async () => {
  const e = env();
  assert.equal((await get(e, VALID_ID)).status, 404);
  assert.deepEqual(e.ns.storage(VALID_ID).db.prepare("SELECT name FROM sqlite_master").all(), []);
  e.ns.evict(VALID_ID);
  e.kv.seed(VALID_ID, [4], { v: "late", t: NOW0 });
  assert.equal((await get(e, VALID_ID)).status, 200);
});

/**
 * Workers KV's eventual consistency as the 510/330 tests modelled it: a write
 * is invisible to every read for `lagMs` after it is made (`clock` in ms, moved
 * by the test). The harsh model — a location that does not even see its own
 * writes — which is the right one for an object reading keys that devices
 * wrote through OTHER locations.
 */
class LaggyKV {
  constructor(lagMs = 60_000) {
    this.lagMs = lagMs;
    this.clock = 0;
    this.history = new Map();
    this.reads = 0;
    this.puts = 0;
  }
  write(key, bytes, metadata, at = this.clock) {
    const h = this.history.get(key) || [];
    h.push({ at, value: new Uint8Array(bytes).buffer, metadata });
    this.history.set(key, h);
  }
  async getWithMetadata(key) {
    this.reads += 1;
    const seen = (this.history.get(key) || []).filter((w) => w.at <= this.clock - this.lagMs);
    const w = seen[seen.length - 1];
    return w ? { value: w.value.slice(0), metadata: w.metadata } : { value: null, metadata: null };
  }
  async put(key, value) {
    this.puts += 1;
    this.write(key, new Uint8Array(value instanceof ArrayBuffer ? value : value.buffer), null);
  }
}

/** A SyncStore with the settling window removed — the import the options
 *  paper's 🚩 warned about, used as the control for the test below. */
class NoSettleStore extends SyncStore {
  importReady() {
    return true;
  }
}

test("migration 🚩: no import until KV cannot be stale — a write in the minute before the deploy is what gets imported", async () => {
  // A device writes through some location 10 s before the deploy. Through the
  // object's location KV keeps handing out the copy before it for a minute.
  // The import waits IMPORT_SETTLE_SECONDS from the deploy: until then the
  // object answers 503 (the client keeps its data and tries again), and then
  // it imports the newest copy. The control is the paper's suggestion — judge
  // the copy by its own write time — which imports the stale one, because a
  // stale read reports the OLDER copy's (older) time.
  const deployAt = NOW0;
  const run = async (Store) => {
    const kv = new LaggyKV();
    const e = env({ kv, Store, deployed: new Date(deployAt * 1000).toISOString() });
    kv.clock = 0;
    kv.write(VALID_ID, [1], { v: "before", t: deployAt - 3600 }, -3_600_000);
    kv.write(VALID_ID, [2], { v: "latest", t: deployAt - 10 }, -10_000);
    const at = (s) => {
      e.clock.now = deployAt + s;
      kv.clock = s * 1000;
    };
    return { e, kv, at };
  };

  const real = await run(SyncStore);
  real.at(30);
  const early = await get(real.e, VALID_ID);
  assert.equal(early.status, 503, "imported inside the settling window");
  assert.equal(early.headers.get("Retry-After"), String(IMPORT_SETTLE_SECONDS));
  assert.equal(early.headers.get("Access-Control-Allow-Origin"), ORIGIN, "a 503 still carries CORS, or the page cannot read it");
  assert.equal(real.kv.reads, 0, "nothing read from KV inside the window");
  assert.equal((await put(real.e, VALID_ID, [3], '"before"')).status, 503, "and nothing written");
  real.at(IMPORT_SETTLE_SECONDS);
  const later = await get(real.e, VALID_ID);
  assert.equal(later.status, 200);
  assert.equal(later.headers.get("ETag"), '"latest"');

  const control = await run(NoSettleStore);
  control.at(30);
  const stale = await get(control.e, VALID_ID);
  assert.equal(stale.headers.get("ETag"), '"before"', "control: without the window the stale copy is imported");
  assert.ok(stale.headers.get("ETag") !== '"latest"');
});

test("migration: without the version-metadata binding no import ever runs — loud (503), never a guess", async () => {
  const e = env({ deployed: null });
  e.kv.seed(VALID_ID, [1], { v: "kv-core", t: NOW0 - 30 * DAY });
  e.clock.now += 365 * DAY;
  assert.equal((await get(e, VALID_ID)).status, 503);
  assert.equal((await put(e, OTHER_VALID_ID, [1])).status, 503, "a brand-new code too: the config error shows at once");
  assert.equal(e.kv.reads, 0);
});

// --- The KV mirror (KV_MIRROR = "on", for a lossless rollback) -----------

test("mirror on: every write lands in KV with the object's version and write time, so the KV-only Worker could serve it", async () => {
  const e = env({ mirror: "on" });
  const a = await put(e, VALID_ID, [1]);
  const b = await put(e, VALID_ID, [2], a.headers.get("ETag"));
  const held = e.kv.store.get(VALID_ID);
  assert.deepEqual(bytesOf(held.value), [2]);
  assert.equal(held.metadata.v, etagOf(b));
  assert.equal(held.metadata.t, NOW0);
  assert.equal(held.ttl, TTL_SECONDS);
  // A re-arm is mirrored too (same bytes and version, a fresh TTL), as the KV
  // Worker's re-arm was a KV write.
  e.clock.now += 40 * DAY;
  await putWith(e, BUCKET(0), `?known=core:${etagOf(b)}`, [9]);
  assert.equal(e.kv.store.get(VALID_ID).metadata.t, e.clock.now);
  assert.equal(e.kv.store.get(VALID_ID).metadata.v, etagOf(b));
});

test("mirror on: overlapping writes leave KV holding the newest version, never an older one", async () => {
  // Device A's write commits and its mirror write is slow. Device B reads the
  // new version straight away (the object answers at once) and writes on top
  // of it; B's mirror write is fast. If each mirror job wrote the copy it had
  // in hand, A's older copy would land in KV last — and a rollback would serve
  // it under a version nobody holds any more.
  const e = env({ mirror: "on" });
  const tag0 = (await put(e, VALID_ID, [0])).headers.get("ETag");
  const kv = e.kv;
  const orig = kv.put.bind(kv);
  const delays = [40, 0];
  kv.put = async (...a) => {
    await new Promise((r) => setTimeout(r, delays.shift() ?? 0));
    return orig(...a);
  };
  const first = put(e, VALID_ID, [1], tag0);
  while (e.rows().core.v === parseIfMatch(tag0)) await new Promise((r) => setImmediate(r));
  const seen = await get(e, VALID_ID);
  const second = await put(e, VALID_ID, [2], seen.headers.get("ETag"));
  await first;
  assert.equal(second.status, 204);
  assert.equal(kv.store.get(VALID_ID).metadata.v, e.rows().core.v);
  assert.deepEqual(bytesOf(kv.store.get(VALID_ID).value), [2]);
});

test("mirror on: a KV write that fails does not fail the sync", async () => {
  const e = env({ mirror: "on" });
  e.kv.put = async () => {
    throw new Error("KV write limit");
  };
  const res = await put(e, VALID_ID, [1]);
  assert.equal(res.status, 204);
  assert.equal((await get(e, VALID_ID)).status, 200);
});

test("mirror off: KV is only ever read", async () => {
  const e = env({ mirror: "off" });
  const a = await put(e, VALID_ID, [1]);
  await put(e, VALID_ID, [2], a.headers.get("ETag"));
  assert.equal(e.kv.puts, 0);
});

// --- Old clients (roadmap 510/340: the interface did not change) ----------

test("an old client syncs unchanged: pre-050 (no buckets), pre-140 (no family) and pre-330 (no known) requests all work", async () => {
  const e = env();
  // Pre-050: plain GET and PUT on the core copy, If-Match from the last ETag.
  assert.equal((await get(e, VALID_ID)).status, 404);
  const w1 = await put(e, VALID_ID, [1]);
  assert.equal(w1.status, 204);
  const r1 = await get(e, VALID_ID);
  assert.equal(r1.headers.get("ETag"), w1.headers.get("ETag"));
  assert.equal(r1.headers.get("X-Faves-Buckets"), null);
  const w2 = await put(e, VALID_ID, [2], r1.headers.get("ETag"));
  assert.equal(w2.status, 204);
  // A client that lost a race gets 412 and goes round again.
  assert.equal((await put(e, VALID_ID, [3], w1.headers.get("ETag"))).status, 412);
  // Pre-140: ?known without ?family re-arms across all 16.
  await put(e, BUCKET(15), [7]);
  e.clock.now += 40 * DAY;
  await putWith(e, VALID_ID, `?known=r15:${e.rows().r15.v}`, [4], w2.headers.get("ETag"));
  assert.equal(e.rows().r15.t, e.clock.now);
});

// --- The rollback target stays frozen ------------------------------------

test("the rollback target is still byte-for-byte the KV-only Worker that ran in production (49bade2)", async () => {
  // `git show 49bade2:worker/sync-worker.js | shasum -a 256`. If this fails,
  // someone edited the frozen file: the rollback would no longer deploy the
  // Worker that was proven live, and the 510/320 fuzz would no longer be
  // evidence about it. Put it back; never update the hash to match.
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const text = await readFile(new URL("./sync-worker-kv-only.js", import.meta.url), "utf8");
  const body = text.slice(text.indexOf("\n\n") + 2);
  const FROZEN_SHA256 = "d41225fb7ea6e8d66e2807cd50f801caae4568b793bba6a970566593c639dd29"; // secretscan:allow:low-variety-entropy: SHA-256 of a public source file, not a credential
  assert.equal(createHash("sha256").update(body).digest("hex"), FROZEN_SHA256);
  const rollback = await import("./rollback-kv-only.js");
  const frozen = await import("./sync-worker-kv-only.js");
  assert.equal(rollback.default, frozen.default, "the rollback serves the frozen fetch handler");
  assert.equal(rollback.SyncStore, SyncStore, "and still exports the class the namespace needs");
});

test("rollback with the mirror on loses nothing: the KV-only Worker serves the object's latest copies under the versions devices hold", async () => {
  const { default: rollback } = await import("./rollback-kv-only.js");
  const e = env({ mirror: "on" });
  const a = await put(e, VALID_ID, [1]);
  const b = await put(e, VALID_ID, [2], a.headers.get("ETag"));
  const r0 = await put(e, BUCKET(0), [7]);
  const old = { SYNC_BLOBS: e.kv, ALLOWED_ORIGINS: ORIGIN };
  const got = await rollback.fetch(req(`/v1/blob/${VALID_ID}?buckets=8`, { headers: { Origin: ORIGIN } }), old);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("ETag"), b.headers.get("ETag"));
  assert.equal(got.headers.get("X-Faves-Buckets"), `r0=${r0.headers.get("ETag")}`);
  assert.deepEqual(bytesOf(await got.arrayBuffer()), [2]);
  // A device's next write, on the ETag the object gave it, goes through.
  const next = await rollback.fetch(
    req(`/v1/blob/${VALID_ID}`, { method: "PUT", headers: { Origin: ORIGIN, "If-Match": b.headers.get("ETag") }, body: new Uint8Array([3]) }),
    old,
  );
  assert.equal(next.status, 204);
});
