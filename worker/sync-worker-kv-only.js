// 🧊 FROZEN — NOT THE LIVE WORKER. This is worker/sync-worker.js exactly as it
// stood at 49bade2, the last commit before roadmap 510/340 moved the store into
// a Durable Object (ADR 0151). Everything below the next blank line is that
// file, byte for byte. Two things use it, and only these two:
//
//   · ROLLBACK. Cloudflare cannot roll a Worker back across a Durable Object
//     class change, so going back to the KV-only Worker is a fresh deploy of
//     worker/rollback-kv-only.js, which serves THIS file's fetch and still
//     exports SyncStore so the namespace stays valid (worker/README.md,
//     "Deploy owed — the Durable Object store"). While KV_MIRROR is "on", KV
//     holds every copy at the version devices hold, so that rollback loses
//     nothing.
//   · EVIDENCE. The 510/320 claim — "no schedule of stale reads across two
//     devices puts an old recipe heart beside its moved copy" — is about the
//     client's merge UNDER STALE READS, and the live Worker can no longer
//     serve one; tests/stale-sync.test.js runs that fuzz against this file.
//
// Never edit it to "keep it current": a rollback target that drifts is not the
// Worker that was proven in production, and a fixture that drifts towards the
// live code stops being evidence about the code it froze.

// Faves cross-device sync — the "dumb ciphertext store" from ADR 0017 and
// ADR 0060. One end-to-end-encrypted blob per user, in Workers KV, keyed by
// an opaque `blobId`.
//
// THE PROPERTY THAT GOVERNS EVERYTHING (ADR 0017): the user's sync code
// never reaches this Worker. The client runs HKDF on the sync code to derive
// two *independent* values — a `blobId` (used as the KV key below) and a
// symmetric encryption key that never leaves the device. This file never
// sees the sync code, never sees plaintext, and never sees the encryption
// key. All it stores and returns is an opaque key and an opaque byte blob.
// There is nothing here that could decrypt a blob even if the source were
// fully public (it is — this repo is public) or the KV namespace were
// dumped wholesale.
//
// CONTRACT WITH THE CLIENT MODULE (`site/js/sync-crypto.js`, already built on
// this branch — read, not touched, per this file's ownership boundary):
// `blobId` is the lowercase-hex encoding of a 16-byte (128-bit) HKDF output —
// `^[0-9a-f]{32}$`, checked below by BLOB_ID_RE and matched exactly against
// `deriveSyncKeys()`'s own `toHex(128 bits)` and its test
// (`tests/sync-crypto.test.js`: `assert.match(blobId, /^[0-9a-f]{32}$/)`).
// 128 bits is the blobId's WIDTH, and width is not entropy — see "No
// authentication beyond entropy" below for the number that actually holds
// this up. Hex keeps blobIds trivially safe to use as a KV key and a URL
// path segment with no escaping. The HKDF
// `info` string the client uses for blobId (`INFO_BLOB_ID`) differs from the
// one it uses for the encryption key (`INFO_ENC_KEY`), so the two are
// cryptographically independent — deriving one does not help recover the
// other. If `sync-crypto.js` ever changes this shape, BLOB_ID_RE below and
// this comment must change in lockstep, in the same change.
//
// NO AUTHENTICATION BEYOND ENTROPY. This endpoint has no login, no API key,
// no per-user account record — by design (ADR 0017: bearer sync-code, no
// accounts). Anyone who can compute a given blobId can read and overwrite
// that blob. That is intentional and matches the sync-code's own security
// model: knowledge of the code is the capability. Guessing a blobId is
// therefore load-bearing security, not just a KV key — it is what stands in
// for "no one else can guess your address".
//
// ⚠️ AND THE LOAD-BEARING NUMBER IS 65 BITS, NOT 128. This comment said 128
// until 2026-08-19, which overstated the guarantee. A blobId is
// HKDF(sync code), and HKDF is deterministic: it cannot manufacture entropy
// its input does not have. The sync code is 65 bits (ADR 0061), so the
// reachable blobId keyspace is 2^65, not 2^128 — an attacker enumerates
// codes and derives ids rather than sweeping the 128-bit hex space. The
// CONCLUSION is unchanged and the design is not weakened: 2^65 is about
// 3.7e19, far beyond sweeping over a network, and ADR 0061 chose 65
// deliberately against ADR 0017's ~44-bit floor. Only the number was wrong,
// and a security comment that names the wrong parameter is how the right one
// stops being defended. There is
// deliberately no rate limiting in this file beyond the body-size cap
// below: a per-blobId write throttle would need Durable Objects (state) or
// a separate Cloudflare rate-limiting rule, and the honest position is that
// this Worker relies on blobId entropy plus Cloudflare's platform-level
// abuse mitigation, not an app-layer limiter. Flagged in the README as a
// possible future hardening step, not implemented here on spec.
//
// LOGGING: NONE, ANYWHERE IN THIS FILE, ON PURPOSE. No IP, no blobId, no
// body, no error detail — not even to `console.log` for debugging. A "dumb
// ciphertext store that logs nothing identifying" is the whole privacy
// promise; a debug log defeats it as surely as a plaintext store would.
// Cloudflare's own request analytics (aggregate counts/status codes) are a
// platform feature outside this file's control — see the README for what
// that does and does not expose, and why Logpush/Trace must stay off for
// this Worker.

// ---------------------------------------------------------------------------
// Configuration constants. TTL and the body cap are behaviour, not
// per-environment config, so they live here as code rather than in
// wrangler.toml. The allowed CORS origin(s) ARE per-environment config (they
// change if the site moves host) and are read from env.ALLOWED_ORIGINS,
// set in wrangler.toml — see the comment there.

/** blobId shape: lowercase hex, exactly 32 chars = 128 bits, matching
 *  `deriveSyncKeys()` in `site/js/sync-crypto.js`. See the CONTRACT comment
 *  above before changing this. */
const BLOB_ID_RE = /^[0-9a-f]{32}$/;

/** Ciphertext body cap. The synced payload is a personal-data snapshot
 *  (hearts, ratings, settings, profile registry) — a few KB even for a
 *  heavy user; 256 KiB is ~40x that with room to spare. The cap exists
 *  because this endpoint is unauthenticated by design (see above): without
 *  one, anyone who mints a blobId gets unbounded free storage on this
 *  Cloudflare account. 256 KiB keeps a single abusive blob cheap regardless
 *  of how many get written, and legitimate payloads are nowhere near it. */
const MAX_BODY_BYTES = 256 * 1024;

/** KV entry TTL, refreshed on every successful PUT (never on GET — reading
 *  a blob you're not actively syncing shouldn't keep it alive forever
 *  either, but a read-only "did anything change" pull is a poor signal of
 *  abandonment either way, so only writes reset the clock). 180 days: an
 *  actively-synced pair of devices writes on basically every visit, so any
 *  real user re-arms this every time they open the app; a sync code that
 *  was minted, used once and never touched again is reclaimed within six
 *  months instead of sitting in KV forever. Long enough that "I sync my
 *  phone and laptop every couple of months" doesn't silently lose data;
 *  short enough that abandoned codes don't accumulate for years. Cloudflare
 *  KV's minimum TTL is 60s, so this is nowhere near a platform limit. */
const TTL_SECONDS = 180 * 24 * 60 * 60; // 15,552,000

/** Recipe buckets (roadmap 510/050, ADR 0146 §2). A user's personal recipes
 *  are stored beside their core copy as `<blobId>:r<n>`, the same user key
 *  plus a bucket number. The client uses 8 (site/js/sync-buckets.js); the
 *  Worker accepts up to 16 so the client can move to 16 without a redeploy.
 *  Nothing here can read a bucket either — it is ciphertext like the core. */
export const MAX_BUCKETS = 16;

/** How stale a sibling copy may get before a write under the same user key
 *  re-arms its expiry. ADR 0146 §2 says "the Worker resets the expiry of every
 *  copy under a user key on any write", because a store nobody edits (recipes)
 *  would otherwise expire while favourites stayed alive (B1 in the cold
 *  review). KV has no "touch": re-arming a copy is a full re-write, and writes
 *  are the scarce resource (1,000 a day free). Re-writing all nine copies on
 *  every heart would spend nine writes where one was needed, so a copy is
 *  re-armed only once it is more than 30 days past its last write. Every copy
 *  therefore has at least 150 of its 180 days left after any write under its
 *  key — the guarantee B1 needed — for at most nine extra writes a month per
 *  user, instead of up to eight per heart. Since roadmap 510/330 only a copy
 *  the writing client vouches for is re-armed (refreshFamily says why, and
 *  why the guarantee survives it). */
export const REFRESH_AFTER_SECONDS = 30 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Pure helpers — exported for `node --test`. None of these touch KV, the
// network, or `console`; they're the parts of the logic that don't need a
// Workers runtime (or wrangler, or a KV namespace) to verify.

/** A KV key this Worker serves: `<blobId>` (the core copy) or
 *  `<blobId>:r<n>` (recipe bucket n, n < MAX_BUCKETS). Returns
 *  `{ key, blobId, bucket }` (bucket null for the core copy), or null. Checked
 *  before the value ever reaches a KV call, like `isValidBlobId`. */
export function parseBlobKey(segment) {
  if (typeof segment !== "string") return null;
  const m = /^([0-9a-f]{32})(?::r(0|[1-9][0-9]?))?$/.exec(segment);
  if (!m) return null;
  const bucket = m[2] === undefined ? null : Number(m[2]);
  if (bucket !== null && bucket >= MAX_BUCKETS) return null;
  return { key: segment, blobId: m[1], bucket };
}

/** Every KV key that belongs to one user: the core copy and each of its
 *  first `buckets` buckets (all MAX_BUCKETS when not told otherwise). */
export function familyKeys(blobId, buckets = MAX_BUCKETS) {
  return [blobId, ...Array.from({ length: buckets }, (_, n) => `${blobId}:r${n}`)];
}

/** How many buckets the writing client says this user has: `?family=<n>` on
 *  a PUT (roadmap 510/140), clamped to MAX_BUCKETS. Absent or not a whole
 *  number — every client before 510/140 — is MAX_BUCKETS: that client's
 *  write re-arms every copy the user could have, exactly as before. `0` is a
 *  user with no recipes, whose heart then reads no sibling at all. */
export function familyAsked(searchParams) {
  const raw = searchParams.get("family");
  if (raw === null || !/^[0-9]{1,3}$/.test(raw)) return MAX_BUCKETS;
  return Math.min(Number(raw), MAX_BUCKETS);
}

/** A copy's name in `?known`: `core` for the core copy, `r<n>` for bucket n. */
export function copyName(key, blobId) {
  return key === blobId ? "core" : key.slice(blobId.length + 1);
}

/** The versions the writing client holds of the user's OTHER copies:
 *  `?known=core:<v>,r0:<v>,…` on a PUT (roadmap 510/330), each version bare or
 *  quoted like an ETag. Returns a Map of name → version, or null when absent —
 *  every client before 510/330 — and re-arming then touches nothing (see
 *  refreshFamily for why that is the safe reading). Entries that do not parse
 *  are dropped, never guessed at. */
export function knownAsked(searchParams) {
  const raw = searchParams.get("known");
  if (raw === null) return null;
  const out = new Map();
  for (const part of raw.split(",").slice(0, MAX_BUCKETS + 1)) {
    const m = /^(core|r(0|[1-9][0-9]?)):(.{1,130})$/.exec(part.trim());
    if (!m || (m[2] !== undefined && Number(m[2]) >= MAX_BUCKETS)) continue;
    const v = parseIfMatch(m[3]);
    if (v) out.set(m[1], v);
  }
  return out;
}

/** The `X-Faves-Buckets` report: `r0="<v>",r3="<v>"` for the buckets that
 *  exist, `none` when none do (an empty header can be dropped in transit, and
 *  a client must be able to tell "no buckets" from "a Worker that predates
 *  them", which sends no header at all). */
export function formatBucketReport(found) {
  const parts = found.map(({ bucket, version }) => `r${bucket}=${formatEtag(version)}`);
  return parts.length ? parts.join(",") : "none";
}

/** True iff `id` is exactly the blobId shape the client contract promises.
 *  Checked before the value ever reaches a KV call — an oversized or
 *  oddly-charactered "blobId" never becomes a KV read/write. */
export function isValidBlobId(id) {
  return typeof id === "string" && BLOB_ID_RE.test(id);
}

/** CORS is not this Worker's access control (blobId entropy is — see the
 *  file header) but it still must not be `*`: a wildcard origin would let
 *  any page on the web read/write ciphertext blobs from a visitor's
 *  browser using that visitor's network position, which is exactly the
 *  kind of ambient trust this design otherwise refuses to grant anyone.
 *  Returns the request's Origin if (and only if) it's in the configured
 *  allowlist, else null. */
export function pickAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return null;
  return allowedOrigins.includes(origin) ? origin : null;
}

/** Splits the wrangler.toml `ALLOWED_ORIGINS` var ("a,b,c") into a clean
 *  array. Tolerates stray whitespace so a comma-separated list edited by
 *  hand in the dashboard doesn't silently fail to match. */
export function parseAllowedOrigins(envValue) {
  return (envValue || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strips a `W/` weak-validator prefix and the surrounding quotes an
 *  `If-Match` header carries per HTTP semantics, so it can be compared
 *  directly against the opaque version token this Worker hands out as an
 *  ETag. Returns null for an absent/empty header. This Worker only ever
 *  issues strong (unprefixed) ETags, but a client or intermediary is free
 *  to send `W/"..."` back, so we accept it rather than erroring on it. */
export function parseIfMatch(headerValue) {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  const unweak = trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
  const unquoted = unweak.replace(/^"|"$/g, "");
  return unquoted || null;
}

/** Formats an opaque version token as a strong HTTP ETag. */
export function formatEtag(version) {
  return `"${version}"`;
}

/** Reads a request body from a WHATWG ReadableStream, aborting the moment
 *  cumulative bytes exceed `maxBytes` rather than buffering the whole
 *  thing first. Returns the assembled Uint8Array, or `null` if the cap was
 *  exceeded. Cancels the source stream on the reject path so an oversized
 *  upload doesn't keep streaming into the Worker after we've decided to
 *  refuse it.
 *
 *  Belt-and-braces note: `Content-Length` is checked as a fast path
 *  wherever this is called from `fetch()` below, but that header is
 *  attacker-controlled and can be absent (chunked transfer) — this
 *  function is the real backstop because it measures actual bytes as they
 *  arrive, not a claimed length. */
export async function readBodyCapped(stream, maxBytes) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Response helpers.

/** Headers common to every response: no caching by any intermediary (this
 *  is bearer-capability ciphertext, never something a CDN/proxy should
 *  cache or a browser should keep around after the tab closes) and a small
 *  fixed set of security headers appropriate to a JSON/binary API that
 *  serves no HTML and runs no scripts. */
function baseHeaders(corsHeaders) {
  return {
    ...corsHeaders,
    // On EVERY response, not only the preflight. Per Fetch, a cross-origin
    // page may read only the CORS-safelisted response headers unless the
    // ACTUAL response names more — ETag is not safelisted, and the preflight
    // exposes nothing for the request that follows it. Until 2026-08-17 this
    // header lived in preflight() alone, so the browser client read `etag`
    // as null on every GET, sent every PUT without If-Match, and — once a
    // blob existed — was refused with 412 forever: sync was live and could
    // not write twice. Every Node-side check passed, because undici does not
    // filter response headers by CORS. Found by the 2026-08-17 cold review;
    // verified against the deployed Worker with curl before the change.
    // X-Faves-Buckets: the recipe buckets' versions (roadmap 510/050), read
    // by the page for the same reason — a cross-origin page cannot see it
    // unless the actual response names it.
    "Access-Control-Expose-Headers": "ETag, X-Faves-Buckets",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'",
    "X-Frame-Options": "DENY",
    // The blob is opaque ciphertext with no confidentiality boundary that
    // depends on which origin fetched it (that boundary is the encryption
    // key, which this Worker never sees) — CORP: cross-origin just stops
    // Chrome's default same-origin resource policy from adding a second,
    // redundant gate on top of the CORS allowlist above.
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

/** A response with no body — used for every status this Worker returns
 *  except the 200 that carries ciphertext. Deliberately bodyless: an error
 *  message is one more place to accidentally leak something, and a status
 *  code is all a well-behaved client needs to decide what to do next. */
function empty(status, corsHeaders, extra = {}) {
  return new Response(null, { status, headers: { ...baseHeaders(corsHeaders), ...extra } });
}

function preflight(corsHeaders) {
  return new Response(null, {
    status: 204,
    headers: {
      ...baseHeaders(corsHeaders),
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "If-Match, Content-Type",
      // Cached by the browser only (never an intermediary — this is a
      // preflight response, not the blob itself) so a sync-heavy session
      // doesn't round-trip an OPTIONS before every GET/PUT.
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ---------------------------------------------------------------------------
// Route handlers.

/** What the client asked to be told about its buckets: `?buckets=<n>` on a
 *  GET of the core copy, clamped to MAX_BUCKETS. 0 when absent — an older
 *  client asks nothing, and costs nothing beyond its one read. */
function bucketsAsked(url, parsed) {
  if (parsed.bucket !== null) return 0;
  const n = Number(url.searchParams.get("buckets"));
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_BUCKETS) : 0;
}

async function handleGet(parsed, asked, env, cors) {
  const [{ value, metadata }, found] = await Promise.all([
    env.SYNC_BLOBS.getWithMetadata(parsed.key, "arrayBuffer"),
    // One KV read per bucket asked about, in the same request: a sync that
    // changed nothing still costs one HTTP round trip. Reads are the cheap KV
    // operation (100,000 a day free, against 1,000 writes).
    Promise.all(
      Array.from({ length: asked }, async (_, bucket) => {
        const got = await env.SYNC_BLOBS.getWithMetadata(`${parsed.blobId}:r${bucket}`, "arrayBuffer");
        return got.value !== null && got.metadata && got.metadata.v ? { bucket, version: got.metadata.v } : null;
      })
    ),
  ]);
  const report = asked ? { "X-Faves-Buckets": formatBucketReport(found.filter(Boolean)) } : {};
  if (value === null) return empty(404, cors, report);
  const headers = { ...baseHeaders(cors), ...report, "Content-Type": "application/octet-stream" };
  if (metadata && metadata.v) headers["ETag"] = formatEtag(metadata.v);
  return new Response(value, { status: 200, headers });
}

/**
 * Re-arm the expiry of every OTHER copy under this user key that is more than
 * REFRESH_AFTER_SECONDS past its last write (see that constant). The copy keeps
 * its bytes and its version `v`, so a device's recorded ETag stays valid and
 * the core copy's record of each bucket's version stays true; only `t`, the
 * time of the last write, moves.
 *
 * ONLY A COPY THE CLIENT VOUCHES FOR, AND ONLY IF THE READ IS THAT COPY
 * (roadmap 510/330). A re-arm writes back the bytes it READ, and KV is
 * eventually consistent: a read can return an older value than the latest
 * write for up to a minute or so. Until 2026-10-01 such a read was re-written
 * as it came, with a fresh write time — so the older bytes won, under their old
 * version, and the newer write was gone. In a KV model where a location does
 * not see its own writes for 60 s, an import was undone on both devices that
 * way (the 510/320 simulation; worker/sync-worker.test.js reproduces it, both
 * ways round). The trigger that made it likely: every core copy written before
 * 510/050 has no `t`, so it is due at once.
 *
 * KV offers no read that proves itself current, so the proof comes from the
 * one party that knows: the writing client names, in `?known`, the version it
 * holds of each other copy (the core copy's ETag on a bucket write; the bucket
 * versions the core copy records on a core write). A read whose version is not
 * that one is never re-written. Since a version names one write's bytes, a
 * matching read re-writes exactly the bytes the client holds. And nothing is
 * lost by skipping: a read that disagrees with the client is either stale or
 * newer than the client, and either way that copy was written within KV's
 * window — moments ago — so it already has its full 180 days. ADR 0146's
 * "every copy keeps at least 150 of its 180 days after any write" still holds,
 * at no extra KV write. A copy the client names nothing for is not even read.
 *
 * No `?known` at all — a client from before 510/330 — re-arms NOTHING. Its
 * writes cannot vouch for a read, and every copy has at least 150 days left
 * from the last re-arm, far longer than a page takes to load the new client.
 *
 * WHAT THIS DOES NOT CLOSE, the limit handlePut states: two devices writing
 * through different locations inside KV's window. If another device rewrote a
 * copy seconds ago and EVERYTHING this client read was stale too, it vouches
 * for the older version, the read matches, and the older copy goes back. That
 * needs the same conditions as two conditional PUTs both passing If-Match, and
 * in it this client's core write loses the other device's core write anyway —
 * so the re-arm adds a recipe bucket to what that race already loses, it does
 * not open a new way to lose data. (The client narrows it: a bucket whose
 * reported version disagrees with the core copy's record is not vouched for.)
 * A Durable Object per user key would close both.
 */
async function refreshFamily(parsed, env, nowSeconds, buckets, known) {
  if (!known || known.size === 0) return;
  await Promise.all(
    familyKeys(parsed.blobId, buckets)
      .filter((k) => k !== parsed.key && known.has(copyName(k, parsed.blobId)))
      .map(async (k) => {
        const got = await env.SYNC_BLOBS.getWithMetadata(k, "arrayBuffer");
        if (got.value === null || !got.metadata || !got.metadata.v) return;
        // Not the copy the client holds: a stale read, or written since. Never
        // re-written — see above.
        if (got.metadata.v !== known.get(copyName(k, parsed.blobId))) return;
        const t = Number(got.metadata.t);
        if (Number.isFinite(t) && nowSeconds - t < REFRESH_AFTER_SECONDS) return;
        await env.SYNC_BLOBS.put(k, got.value, {
          expirationTtl: TTL_SECONDS,
          metadata: { ...got.metadata, t: nowSeconds },
        });
      })
  );
}

async function handlePut(request, parsed, family, known, env, cors) {
  const blobId = parsed.key;
  const contentLengthHeader = request.headers.get("Content-Length");
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return empty(413, cors);
  }

  const body = await readBodyCapped(request.body, MAX_BODY_BYTES);
  if (body === null) return empty(413, cors);
  if (body.byteLength === 0) return empty(400, cors);

  // Read-then-write compare-and-swap. HONEST LIMIT, READ THIS BEFORE
  // TRUSTING IT: Workers KV is eventually consistent and has no true atomic
  // compare-and-swap primitive. The read below and the put() further down
  // are two separate operations; if two edge locations race a write for
  // the same blobId within KV's propagation window, both can read the same
  // "current" version, both pass the If-Match check, and both write —
  // the second write wins and the first is lost, with no 412 raised to
  // either caller. This narrows the stale-clobber window (ADR 0017/0060's
  // goal) but does NOT close it. What WOULD close it: a Durable Object
  // per blobId, which gives single-threaded, strongly-consistent
  // read-modify-write for that key — the correct fix if this race is ever
  // shown to matter in practice (measured, not assumed — house rule). Not
  // built here: it's a second primitive (DO namespace + a small object
  // class) for a race that debounced, human-paced writes make rare, and
  // ADR 0017 asks for read-merge-write specifically because the client
  // side is expected to absorb a lost race by re-pulling, not because the
  // server was assumed airtight.
  const current = await env.SYNC_BLOBS.getWithMetadata(blobId, "arrayBuffer");
  const currentVersion = current.metadata && current.metadata.v ? current.metadata.v : null;

  if (current.value !== null) {
    // A blob already exists: the write MUST be conditional. Treat a missing
    // If-Match the same as a mismatched one (both become 412) rather than
    // inventing a separate "precondition required" status — either way the
    // correct client action is identical: GET the current blob, re-merge,
    // retry with its ETag. A client that always reads before it writes
    // (which every caller here should, per ADR 0017's read-merge-write)
    // never hits this branch by surprise.
    const ifMatch = parseIfMatch(request.headers.get("If-Match"));
    if (!ifMatch || ifMatch !== currentVersion) return empty(412, cors);
  }
  // No existing blob: this is a first write (new sync code) and proceeds
  // unconditionally — there is nothing to conflict with yet.

  const newVersion = crypto.randomUUID();
  const nowSeconds = Math.floor(Date.now() / 1000);
  await env.SYNC_BLOBS.put(blobId, body, {
    // Refreshed on every write, per TTL_SECONDS's comment above — this is
    // the "does not accumulate forever" requirement.
    expirationTtl: TTL_SECONDS,
    // KV metadata (not the value) — cheap to read alongside a GET without
    // touching the blob bytes, and invisible to anything that only reads
    // the value. `v` is an opaque per-write token, not a content hash: it
    // changes even if two writes happen to carry identical ciphertext,
    // which is exactly what a version-style ETag should do (it answers
    // "has anyone written since I last read", not "is the content novel").
    // `t` is when this copy was last written, in seconds — what
    // refreshFamily reads to decide whether a sibling needs re-arming.
    metadata: { v: newVersion, t: nowSeconds },
  });

  // Every write keeps the whole user's copies alive (ADR 0146 §2, B1): a
  // heart re-arms a recipe bucket nobody has touched in months, and a recipe
  // edit re-arms the core copy. Only the buckets the client says exist are
  // read (`family`, roadmap 510/140): reading all 16 possible keys cost a
  // heart 16 KV reads, for most users with not one recipe. A bucket the
  // client does not know of — one orphaned by a lost race — is not re-armed
  // by this write; the next recipe sync detects and rewrites it. And only
  // those the client vouches for (`known`, roadmap 510/330): a re-arm
  // re-writes what KV read, and a stale read must never go back over a newer
  // write.
  await refreshFamily(parsed, env, nowSeconds, family, known);

  return empty(204, cors, { ETag: formatEtag(newVersion) });
}

// ---------------------------------------------------------------------------
// Entry point.

const BLOB_PATH_RE = /^\/v1\/blob\/([^/]+)$/;

export default {
  async fetch(request, env, _ctx) {
    // Never let an unexpected exception escape with a default Workers error
    // page — that page can include stack detail, and the "log nothing"
    // promise above extends to "leak nothing in an error response" too.
    try {
      const url = new URL(request.url);
      const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
      const origin = pickAllowedOrigin(request.headers.get("Origin"), allowedOrigins);
      const cors = origin
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : { Vary: "Origin" };

      if (request.method === "OPTIONS") {
        // Preflight is answered identically for every path/method/blobId —
        // it never touches KV, so it has nothing to leak either way, and a
        // response that varied with blobId validity would itself be a
        // (tiny) way to probe blobIds without ever doing a real GET.
        return preflight(cors);
      }

      const match = BLOB_PATH_RE.exec(url.pathname);
      if (!match) {
        // No index route, no listing route, nothing else recognised.
        return empty(404, cors);
      }

      // `<blobId>` or `<blobId>:r<n>` — the core copy or a recipe bucket.
      const parsed = parseBlobKey(match[1]);
      if (!parsed) return empty(400, cors);

      if (request.method === "GET") return await handleGet(parsed, bucketsAsked(url, parsed), env, cors);
      if (request.method === "PUT") {
        return await handlePut(request, parsed, familyAsked(url.searchParams), knownAsked(url.searchParams), env, cors);
      }

      return empty(405, cors, { Allow: "GET, PUT, OPTIONS" });
    } catch {
      // Deliberately no detail in the body or a log line — see the file
      // header. A caller sees a bare 500 and retries; that's the extent of
      // what it needs to know.
      return empty(500, { Vary: "Origin" });
    }
  },
};
