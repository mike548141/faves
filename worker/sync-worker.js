// Faves cross-device sync — the "dumb ciphertext store" from ADR 0017 and
// ADR 0060. One end-to-end-encrypted blob per user, keyed by an opaque
// `blobId`. Since roadmap 510/340 (ADR 0151) each user's copies live in one
// Durable Object named by that `blobId` (`SyncStore`, below); Workers KV,
// where they lived before, is read once per user to import them and is
// otherwise only an optional mirror for rollback.
//
// THE PROPERTY THAT GOVERNS EVERYTHING (ADR 0017): the user's sync code
// never reaches this Worker. The client runs HKDF on the sync code to derive
// two *independent* values — a `blobId` (the object's name, and the KV key) and a
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
// below: a per-blobId write throttle would need state in the object or
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

/** A copy's lifetime, refreshed on every successful PUT (never on GET — reading
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
export const TTL_SECONDS = 180 * 24 * 60 * 60; // 15,552,000

/** Recipe buckets (roadmap 510/050, ADR 0146 §2). A user's personal recipes
 *  are stored beside their core copy as `<blobId>:r<n>`, the same user key
 *  plus a bucket number. The client uses 8 (site/js/sync-buckets.js); the
 *  Worker accepts up to 16 so the client can move to 16 without a redeploy.
 *  Nothing here can read a bucket either — it is ciphertext like the core. */
export const MAX_BUCKETS = 16;

/** How stale a sibling copy may get before a write under the same user key
 *  re-arms its expiry. (Written when the copies lived in KV; the Durable Object
 *  keeps the rule unchanged so retention is the same to the day — see
 *  SyncStore.rearmFamily.) ADR 0146 §2 says "the Worker resets the expiry of every
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
 *  before the value ever reaches storage, like `isValidBlobId`. */
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
 *  Checked before the value ever reaches storage — an oversized or
 *  oddly-charactered "blobId" never names an object or a KV key. */
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
// The store: one Durable Object per sync code (roadmap 510/340, ADR 0151).
//
// WHY NOT KV ANY MORE. Workers KV is eventually consistent: a location keeps a
// read for 60 s, so a request there is handed the copy it read, whatever has
// been written since. A version is a random id and carries no order, so the
// client merged an older copy as another device's change — a heart removed, a
// removed heart back, a recipe move undone on both devices — and the If-Match
// check below read through the same cache, so a write built on a stale read was
// accepted (tests/stale-sync.test.js; docs/reviews/2026-10-01-1116-stale-sync-
// read-options.md). KV has no compare-and-swap, so no Worker logic over it could
// close that. A Durable Object can: exactly one instance exists per name, it
// owns its storage, and a read of that storage always sees the latest write.
//
// THE CRITICAL SECTION IS SYNCHRONOUS, ON PURPOSE. Every read-compare-write
// below runs inside `transactionSync`, over the SQLite storage API, which is
// synchronous: there is no `await` between reading a copy's version and
// writing its replacement, so nothing else can run in between — whatever the
// runtime's input gates would or would not have held back. The If-Match check
// is a true compare-and-swap by construction, not by a property of the
// platform's scheduling that a later edit could quietly lean on.
//
// WHAT THE OBJECT HOLDS. One row per copy: `core`, or `r<n>` for recipe bucket
// n, with its ciphertext, its version `v` (the ETag) and `t`, when it was last
// written or re-armed, in seconds. Nothing else about a user, and nothing the
// object could decrypt: it is the same dumb ciphertext store, and it logs
// nothing, exactly as the file header promises.
//
// THE HTTP INTERFACE DID NOT CHANGE. The Worker below still answers GET, PUT
// and OPTIONS on /v1/blob/<key> with the same statuses, ETags, bucket report
// and CORS headers; it now forwards each request to the object instead of
// reading KV. A device on any earlier build keeps working, unchanged, on the
// day this deploys — which is why this option was chosen.

/** How long after this Worker version was deployed before an object may
 *  import its copies from KV (see `SyncStore.importReady`). KV documents a
 *  write as visible elsewhere "up to 60 seconds or more" later; five times
 *  that is the margin. The cost is that a code nobody has touched since the
 *  deploy answers 503 for its first five minutes, and the client keeps its
 *  data and tries again later (site/js/sync.js treats any status but 200/404
 *  as "couldn't reach sync"). */
export const IMPORT_SETTLE_SECONDS = 5 * 60;

/** A copy's name (`core`, `r<n>`) back to its KV key. */
function kvKey(blobId, name) {
  return name === "core" ? blobId : `${blobId}:${name}`;
}

/** Every copy name a user can have, in KV-key order. */
function familyNames(buckets = MAX_BUCKETS) {
  return ["core", ...Array.from({ length: buckets }, (_, n) => `r${n}`)];
}

/** Whether a copy last written (or re-armed) at `t` is past its expiry at
 *  `now`. KV stops serving a key at its TTL; this is that, for a row. */
function expired(t, now) {
  return t + TTL_SECONDS <= now;
}

const asBytes = (value) => (value instanceof Uint8Array ? value : new Uint8Array(value));

/** SQLite storage binds an ArrayBuffer for a BLOB, not a view onto one. */
const asBuffer = (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

/**
 * One sync code's copies. Bound in wrangler.toml as SYNC_STORE, class
 * `SyncStore`, SQLite-backed (the only Durable Object backend on the free
 * plan). A plain class with `fetch`: it needs nothing from `cloudflare:workers`,
 * so this file still imports nothing and runs under plain `node --test`.
 */
export class SyncStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    // In memory only — an object that found nothing in KV writes nothing for
    // it, so a GET of an id nobody uses leaves no storage behind. A new
    // instance simply looks again.
    this.importedEmpty = false;
    // Both only ever go false -> true, until the alarm deletes everything; so
    // once seen they are remembered, and a request does not re-read
    // sqlite_master and the meta row every time (rows read are billed).
    this.schema = false;
    this.importedSeen = false;
    this.importing = null;
    this.alarmSet = false;
    // KV mirror writes run one at a time, each writing the copy as it stands
    // WHEN IT RUNS, so the last mirror write is always the newest version.
    this.mirrorChain = Promise.resolve();
  }

  /** Seconds since the epoch. A method so a test can move the clock. */
  nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  // --- storage --------------------------------------------------------------

  hasSchema() {
    if (!this.schema) {
      this.schema = this.sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'copies'").toArray().length > 0;
    }
    return this.schema;
  }

  /** Created on the first WRITE, never on a read: a probe of a random id must
   *  not leave a database behind. */
  ensureSchema() {
    if (this.schema) return;
    this.sql.exec("CREATE TABLE IF NOT EXISTS copies (name TEXT PRIMARY KEY, body BLOB NOT NULL, v TEXT NOT NULL, t INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, val TEXT NOT NULL)");
    this.schema = true;
  }

  /** The live copy `name`, or null (absent, or past its expiry). */
  copy(name, now) {
    if (!this.hasSchema()) return null;
    const rows = this.sql.exec("SELECT body, v, t FROM copies WHERE name = ?", name).toArray();
    if (!rows.length || expired(rows[0].t, now)) return null;
    return rows[0];
  }

  imported() {
    if (this.importedEmpty || this.importedSeen) return true;
    if (!this.hasSchema()) return false;
    this.importedSeen = this.sql.exec("SELECT val FROM meta WHERE k = 'imported'").toArray().length > 0;
    return this.importedSeen;
  }

  // --- the one-time import from KV -------------------------------------------

  /**
   * May this object read its copies from KV yet? Only once KV can no longer
   * hand it a stale one.
   *
   * 🚩 A CHECK ON THE COPY ITSELF CANNOT DO THIS. The options paper suggested
   * refusing a copy "younger than a minute"; but a stale read returns an OLDER
   * copy, carrying the older copy's write time, so it would pass. The only
   * thing that bounds staleness is time since the last write to that key —
   * which a stale read cannot report. What this Worker can know is that nothing
   * writes a user's KV keys after this version is live: every request now goes
   * to the object, and the object writes KV only as a mirror of copies it
   * already holds (it imports only while it holds none). So once
   * IMPORT_SETTLE_SECONDS have passed since this version was deployed, every
   * location's cached read of those keys has expired and a KV read returns the
   * last write. The deploy time is the version's own timestamp
   * (`[version_metadata]` in wrangler.toml). Without it the import is refused
   * outright — loud (a 503 for every unimported code, caught by the runbook's
   * first live check), never a silent stale import.
   */
  importReady(now) {
    const stamp = Date.parse(this.env.CF_VERSION_METADATA?.timestamp ?? "");
    if (!Number.isFinite(stamp)) return false;
    return now >= Math.floor(stamp / 1000) + IMPORT_SETTLE_SECONDS;
  }

  /** Import once; every request waits on the same import. */
  async ready(blobId) {
    if (this.imported()) return true;
    if (!this.importReady(this.nowSeconds())) return false;
    this.importing ??= this.importFromKv(blobId).finally(() => {
      this.importing = null;
    });
    await this.importing;
    return true;
  }

  /**
   * Copy this user's copies in from KV. KV is only read, never written or
   * deleted here — it stays as it was, the fallback a rollback reads. A copy
   * past its expiry is not imported; a copy with no write time (written before
   * roadmap 510/050) is imported as written now, which never shortens its life.
   */
  async importFromKv(blobId) {
    const kv = this.env.SYNC_BLOBS;
    const names = familyNames();
    const got = kv
      ? await Promise.all(names.map((name) => kv.getWithMetadata(kvKey(blobId, name), "arrayBuffer")))
      : names.map(() => ({ value: null, metadata: null }));
    // From here to the end: synchronous. Nothing else can write in between.
    if (this.imported()) return;
    const now = this.nowSeconds();
    const rows = [];
    names.forEach((name, i) => {
      const { value, metadata } = got[i];
      if (value === null || !metadata || !metadata.v) return;
      const t0 = Number(metadata.t);
      const t = Number.isFinite(t0) ? Math.min(t0, now) : now;
      if (expired(t, now)) return;
      rows.push({ name, body: asBuffer(asBytes(value)), v: String(metadata.v), t });
    });
    if (!rows.length) {
      this.importedEmpty = true;
      return;
    }
    this.ctx.storage.transactionSync(() => {
      this.ensureSchema();
      for (const r of rows) this.sql.exec("INSERT OR REPLACE INTO copies (name, body, v, t) VALUES (?, ?, ?, ?)", r.name, r.body, r.v, r.t);
      this.sql.exec("INSERT OR REPLACE INTO meta (k, val) VALUES ('imported', ?)", String(now));
    });
    await this.armAlarm();
  }

  // --- requests -------------------------------------------------------------

  async fetch(request) {
    try {
      const url = new URL(request.url);
      const parsed = parseBlobKey(decodeURIComponent(url.pathname.slice(1)));
      if (!parsed) return new Response(null, { status: 400 });
      // Defence in depth: the Worker routes by the blobId; a request for some
      // other user's key must never reach (or write into) this one's rows.
      const ns = this.env.SYNC_STORE;
      if (ns && this.ctx.id && !this.ctx.id.equals(ns.idFromName(parsed.blobId))) return new Response(null, { status: 500 });
      if (request.method === "GET") return await this.get(parsed, bucketsAsked(url, parsed));
      if (request.method === "PUT") return await this.put(request, parsed, url);
      return new Response(null, { status: 405 });
    } catch {
      return new Response(null, { status: 500 });
    }
  }

  async get(parsed, asked) {
    if (!(await this.ready(parsed.blobId))) return notYet();
    // Read-only and synchronous: the copy and the bucket report are one
    // consistent view, and a GET writes nothing (so it re-arms nothing either:
    // only writes keep a user alive, as before).
    const now = this.nowSeconds();
    const name = copyName(parsed.key, parsed.blobId);
    const cur = this.copy(name, now);
    const headers = {};
    if (asked) {
      const found = [];
      for (let bucket = 0; bucket < asked; bucket += 1) {
        const c = this.copy(`r${bucket}`, now);
        if (c) found.push({ bucket, version: c.v });
      }
      headers["X-Faves-Buckets"] = formatBucketReport(found);
    }
    if (!cur) return new Response(null, { status: 404, headers });
    headers.ETag = formatEtag(cur.v);
    return new Response(asBytes(cur.body), { status: 200, headers });
  }

  async put(request, parsed, url) {
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength === 0) return new Response(null, { status: 400 });
    if (body.byteLength > MAX_BODY_BYTES) return new Response(null, { status: 413 });
    if (!(await this.ready(parsed.blobId))) return notYet();

    const name = copyName(parsed.key, parsed.blobId);
    const ifMatch = parseIfMatch(request.headers.get("If-Match"));
    const family = familyAsked(url.searchParams);
    const known = knownAsked(url.searchParams);
    const now = this.nowSeconds();

    // THE COMPARE-AND-SWAP. Synchronous from the read to the write: see the
    // note at the top of this class.
    const outcome = this.ctx.storage.transactionSync(() => {
      const cur = this.copy(name, now);
      // Same rule as ever: once a copy exists the write MUST be conditional,
      // and a missing If-Match is refused like a wrong one. A copy that does
      // not exist (or has expired) is a first write and goes through.
      if (cur && (!ifMatch || ifMatch !== cur.v)) return null;
      this.ensureSchema();
      const v = crypto.randomUUID();
      this.sql.exec("INSERT OR REPLACE INTO copies (name, body, v, t) VALUES (?, ?, ?, ?)", name, asBuffer(body), v, now);
      this.sql.exec("INSERT OR IGNORE INTO meta (k, val) VALUES ('imported', ?)", String(now));
      return { v, rearmed: this.rearmFamily(name, now, family, known) };
    });
    if (!outcome) return new Response(null, { status: 412 });

    await this.armAlarm();
    await this.mirror(parsed.blobId, [name, ...outcome.rearmed], now);
    return new Response(null, { status: 204, headers: { ETag: formatEtag(outcome.v) } });
  }

  /**
   * RETENTION — kept exactly as the KV Worker had it (ADR 0146 §2 and roadmap
   * 510/140, 510/330). Each copy expires TTL_SECONDS after it was last written
   * or re-armed. A write to one copy re-arms each OTHER copy that:
   *   · is inside the family the writing client names (`?family`, all 16 when
   *     absent),
   *   · the client vouches for — `?known` names exactly the version stored
   *     (absent `?known`, a client before 510/330, vouches for nothing), and
   *   · was last written or re-armed REFRESH_AFTER_SECONDS (30 days) ago or
   *     more.
   * A re-arm moves only `t`: never the bytes, never the version. So every
   * copy a client vouches for keeps at least 150 of its 180 days after any
   * write under its user key, as before.
   *
   * In KV the vouching existed because a re-arm re-wrote bytes it had READ,
   * and a stale read put older bytes back (510/330). Here a re-arm touches no
   * bytes and reads nothing stale, so that hazard is gone; the rule is kept
   * anyway so retention is the same, to the day, as the Worker this replaces.
   * Runs inside the caller's transaction. Returns the names it re-armed.
   */
  rearmFamily(self, now, family, known) {
    if (!known || known.size === 0) return [];
    const out = [];
    for (const name of familyNames(family)) {
      if (name === self || !known.has(name)) continue;
      const c = this.copy(name, now);
      if (!c || c.v !== known.get(name)) continue;
      if (now - c.t < REFRESH_AFTER_SECONDS) continue;
      this.sql.exec("UPDATE copies SET t = ? WHERE name = ?", now, name);
      out.push(name);
    }
    return out;
  }

  /** Make sure an alarm is set. It may fire EARLY (a copy re-armed since): the
   *  handler then re-sets it for the earliest real expiry. It never needs to be
   *  late, because `t` only ever moves forward. Expiry itself is exact without
   *  it — every read treats an expired copy as absent; the alarm only frees
   *  the storage. */
  async armAlarm() {
    if (this.alarmSet) return;
    if ((await this.ctx.storage.getAlarm()) === null) {
      const first = this.sql.exec("SELECT MIN(t) AS t FROM copies").toArray()[0];
      if (first && first.t !== null) await this.ctx.storage.setAlarm((first.t + TTL_SECONDS) * 1000);
    }
    this.alarmSet = true;
  }

  /** Expiry: delete what has expired; when nothing is left, delete everything
   *  (KV is not touched — what it holds expires on its own TTL). */
  async alarm() {
    this.alarmSet = false;
    if (!this.hasSchema()) return;
    const now = this.nowSeconds();
    this.sql.exec("DELETE FROM copies WHERE t + ? <= ?", TTL_SECONDS, now);
    const next = this.sql.exec("SELECT MIN(t) AS t FROM copies").toArray()[0];
    if (!next || next.t === null) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.importedEmpty = false;
      this.importedSeen = false;
      this.schema = false;
      return;
    }
    await this.ctx.storage.setAlarm((next.t + TTL_SECONDS) * 1000);
    this.alarmSet = true;
  }

  /**
   * Keep KV in step, so rolling back to the KV-only Worker loses nothing
   * (worker/README.md, "Deploy owed — the Durable Object store"). On only
   * when `KV_MIRROR` is "on" (wrangler.toml); off, KV is read-only and retires
   * by its own TTL.
   *
   * The mirror is never consulted by this Worker after an import, so it cannot
   * bring a stale read back. Its failure is swallowed: KV's write quota or its
   * one-write-a-second-per-key limit must not fail a sync that has already
   * landed in the object. It writes each copy as it stands when the job runs,
   * one job after another, so a slow write cannot leave an older version last.
   */
  mirror(blobId, names, now) {
    if (this.env.KV_MIRROR !== "on" || !this.env.SYNC_BLOBS) return Promise.resolve();
    const job = this.mirrorChain.then(async () => {
      for (const name of names) {
        const c = this.copy(name, this.nowSeconds());
        if (!c) continue;
        try {
          await this.env.SYNC_BLOBS.put(kvKey(blobId, name), asBytes(c.body), {
            expirationTtl: Math.max(60, c.t + TTL_SECONDS - now),
            metadata: { v: c.v, t: c.t },
          });
        } catch {
          /* best effort — see above */
        }
      }
    });
    this.mirrorChain = job.catch(() => {});
    return this.mirrorChain;
  }
}

/** The import may not run yet (see `importReady`). 503 is what the client
 *  already reads as "couldn't reach sync, your data is safe on this device";
 *  it keeps its changes and tries again on its next sync. */
function notYet() {
  return new Response(null, { status: 503, headers: { "Retry-After": String(IMPORT_SETTLE_SECONDS) } });
}

// ---------------------------------------------------------------------------
// Route handlers.

/** What the client asked to be told about its buckets: `?buckets=<n>` on a
 *  GET of the core copy, clamped to MAX_BUCKETS. 0 when absent — an older
 *  client asks nothing. */
function bucketsAsked(url, parsed) {
  if (parsed.bucket !== null) return 0;
  const n = Number(url.searchParams.get("buckets"));
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_BUCKETS) : 0;
}

/** The headers the object may set that the Worker passes on. Everything else
 *  on the way out — CORS, security headers — is the Worker's own. */
const FROM_STORE = ["ETag", "X-Faves-Buckets", "Retry-After"];

/**
 * Forward a GET or PUT to the user's object. The body cap is enforced here,
 * before the object is ever woken, as it was when the store was KV: a hostile
 * upload costs this Worker, not a Durable Object request.
 */
async function toStore(request, parsed, url, env, cors) {
  let body;
  if (request.method === "PUT") {
    const contentLengthHeader = request.headers.get("Content-Length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) return empty(413, cors);
    body = await readBodyCapped(request.body, MAX_BODY_BYTES);
    if (body === null) return empty(413, cors);
    if (body.byteLength === 0) return empty(400, cors);
  }
  const headers = {};
  const ifMatch = request.headers.get("If-Match");
  if (ifMatch) headers["If-Match"] = ifMatch;
  const ns = env.SYNC_STORE;
  const stub = ns.get(ns.idFromName(parsed.blobId));
  const res = await stub.fetch(
    new Request(`https://sync-store.internal/${encodeURIComponent(parsed.key)}${url.search}`, {
      method: request.method,
      headers,
      body,
    })
  );
  const extra = {};
  for (const h of FROM_STORE) {
    const v = res.headers.get(h);
    if (v !== null) extra[h] = v;
  }
  if (res.status !== 200) {
    await res.body?.cancel();
    return empty(res.status, cors, extra);
  }
  return new Response(await res.arrayBuffer(), {
    status: 200,
    headers: { ...baseHeaders(cors), ...extra, "Content-Type": "application/octet-stream" },
  });
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
        // it never touches storage, so it has nothing to leak either way, and
        // a response that varied with blobId validity would itself be a
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

      if (request.method === "GET" || request.method === "PUT") {
        // No store bound is a broken deploy. It fails loudly (500) rather
        // than falling back to reading KV, which is the defect this replaced.
        if (!env.SYNC_STORE) return empty(500, cors);
        return await toStore(request, parsed, url, env, cors);
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
