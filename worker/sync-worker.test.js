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
    const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(0);
    this.store.set(key, { value: bytes.buffer, metadata: opts.metadata ?? null });
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

test("security headers are present on a normal response", async () => {
  const e = env();
  const res = await worker.fetch(req(`/v1/blob/${VALID_ID}`, { headers: { Origin: ORIGIN } }), e);
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});
