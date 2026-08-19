# Faves sync Worker

The server half of cross-device sync (ADR
[0017](../docs/decisions/0017-cross-device-sync-encrypted-blob-bearer-code.md),
ADR [0060](../docs/decisions/0060-sync-merges-three-ways-because-the-layer-has-no-clock.md)).
A Cloudflare Worker that stores and serves **one encrypted blob per user** in
Workers KV. It is a dumb ciphertext store: it cannot read a user's data, and
it is not supposed to be able to.

This directory is source and deploy config only. **It has not been
deployed** — see "Deploying" below for why, and what has to happen first.

## The security model, in plain language

- Your **sync code** (the word-code or QR you scan between devices) never
  leaves your device and is never sent to this Worker.
- Your device runs a key-derivation function (HKDF, in
  [`site/js/sync-crypto.js`](../site/js/sync-crypto.js)) on that code and
  splits it into **two unrelated values**:
  - a `blobId` — an opaque 128-bit label, sent to the Worker so it knows
    *which* stored blob to read or write;
  - an **encryption key** — stays on your device, forever. It is a
    non-extractable WebCrypto key: nothing in the app can even read its raw
    bytes, let alone transmit them.
- Your favourites/ratings/settings are encrypted **on your device** (AES-GCM)
  before they're sent. The Worker only ever receives and returns ciphertext.
- **What the Worker can see:** an opaque 32-character blob id, an opaque
  ciphertext blob, and (unavoidably) the requesting IP address and request
  timing, the way any HTTPS endpoint on the internet can. Nothing in this
  code path logs, stores, or acts on any of that beyond serving the request.
- **What the Worker cannot see, ever:** your sync code, your encryption key,
  or the plaintext of anything you've hearted, rated, or set. There is no
  code path in this file that could decrypt a blob even with full access to
  the KV namespace — the key required to do that was never sent here.
- **What the Worker does not have:** accounts, logins, passwords, email,
  usernames, or any concept of "a user" beyond "someone who knows a
  blobId". Anyone who can compute your blobId (i.e. anyone who has your
  sync code) can read and overwrite your blob — that's the bearer-capability
  model ADR 0017 chose instead of accounts, and it's why the sync code must
  be treated like a password even though it unlocks no identity.

## What's in this directory

| File | Purpose |
| --- | --- |
| `sync-worker.js` | The Worker itself — plain ES module, `export default { fetch }`, no dependencies. |
| `sync-worker.test.js` | Unit + fetch-handler tests, plain `node --test`, no dependencies. Uses a fake in-memory KV namespace — see the file for why that's a *more* forgiving stand-in than real KV, not an equivalent one. |
| `wrangler.toml` | Deploy config for [Wrangler](https://developers.cloudflare.com/workers/wrangler/), Cloudflare's Workers CLI. Has placeholders — see "Deploying". |

## API

| Route | Method | Response |
| --- | --- | --- |
| `/v1/blob/<blobId>` | `GET` | `200` + ciphertext body (`application/octet-stream`) + `ETag`, or `404` if nothing stored yet. |
| `/v1/blob/<blobId>` | `PUT` | `204` on success, with a fresh `ETag`. `412` if `If-Match` doesn't match the current version (see "Concurrency" below). `413` if the body is too large. `400` if the body is empty or `blobId` is malformed. |
| `/v1/blob/<blobId>` | `OPTIONS` | `204` CORS preflight. |
| anything else | any | `404` (unknown route) or `405` (wrong method on a real route). No index, no listing — there is no way to enumerate what blobIds exist. |

`blobId` must be exactly 32 lowercase hex characters (128 bits) — anything
else is rejected with `400` before it ever reaches KV. This is the exact
shape `deriveSyncKeys()` in `site/js/sync-crypto.js` produces; the two are
tested against each other in that module's own test suite
(`tests/sync-crypto.test.js`).

## Concurrency: compare-and-swap, honestly

`PUT` supports `If-Match` so a device syncing a stale copy can't silently
clobber a newer write — it gets `412` back and is expected to `GET`,
re-merge (client-side, `site/js/sync-merge.js`), and retry.

**Read this before assuming that's airtight.** Workers KV is
[eventually consistent](https://developers.cloudflare.com/kv/reference/consistency/)
and has **no true atomic compare-and-swap primitive**. This Worker's CAS is
a plain read, then a plain write, as two separate KV operations — if two
requests for the same `blobId` land on different edge locations inside KV's
propagation window, both can read the same "current" version, both pass the
`If-Match` check, and both write, with the later one silently winning. This
**narrows** the stale-clobber race (which is what ADR 0017/0060 ask for —
they design the client to expect and recover from a lost race, not to trust
the server never loses one) but it does **not close it**.

**What would close it:** a [Durable Object](https://developers.cloudflare.com/durable-objects/)
per `blobId`, which gives single-threaded, strongly-consistent
read-modify-write for that key. Not built here — it's a second Cloudflare
primitive (a Durable Object namespace + a small object class) for a race
that debounced, human-paced writes (ADR 0017: 5–30s idle/blur batching)
make rare in practice, and the design was explicitly built to tolerate a
lost race rather than assume the server prevents one. If a real conflict
rate ever justifies it, this is the documented next step — same spirit as
ADR 0060's rejected "wall-clock last-write-wins", which is also parked
until evidence, not assumption, justifies the extra machinery.

## Other honest limits

- **No rate limiting beyond the body-size cap.** There's no per-`blobId` or
  per-IP write throttle in this code. The design leans on the sync code's
  **65 bits** of entropy (nobody can guess or enumerate a blob to target)
  plus Cloudflare's platform-level abuse mitigation, not an app-layer
  limiter. ⚠️ This line said *"`blobId`'s 128 bits of entropy"* until
  2026-08-19. A `blobId` is 128 bits **wide** but is `HKDF(sync code)`, and
  HKDF cannot manufacture entropy its input lacks — so the keyspace an
  attacker actually sweeps is 2^65 (ADR 0061), not 2^128. The conclusion
  holds; the number did not.
  Worth adding (a Durable Object or Cloudflare's Rate Limiting rules
  product) if abuse is ever observed — not implemented speculatively.
- **`Content-Length` is a fast path, not the real cap.** It's checked first
  because it's cheap and catches obvious cases early, but it's
  client-supplied and can be absent (chunked transfer). The actual cap
  (`MAX_BODY_BYTES`, 256 KiB) is enforced by counting real bytes as they
  stream in and aborting the moment the cap is crossed — see
  `readBodyCapped()` in `sync-worker.js`.
- **The TTL (180 days, refreshed on every write) is a judgement call, not a
  measurement.** It trades "don't accumulate abandoned blobs forever"
  against "don't lose data for someone who syncs every few months". See the
  comment on `TTL_SECONDS` in `sync-worker.js` for the reasoning; revisit if
  real usage says otherwise.
- **Logging: genuinely none, by design, not just "nothing we call
  console.log for".** No line of this file logs an IP, a `blobId`, or any
  body content — see the file header comment. Cloudflare's own dashboard
  keeps *aggregate* request analytics (counts, status codes, response
  times) as a platform feature outside this file's control; that's the
  ordinary "does my Worker respond" telemetry every Worker gets and doesn't
  identify individual blobs or users. **Do not turn on Workers Logpush or
  Tail/Trace logging for this Worker** — either would start capturing
  request metadata (source IP, full URL including the `blobId`) somewhere
  this design's whole point is to avoid, and nothing about it can be
  configured to log "nothing identifying" — logging URLs necessarily logs
  `blobId`s.

## Deploying

🚩 **This cannot be deployed from this machine.** No `wrangler` is
installed, no Cloudflare credential is configured here, and none should be
minted or entered into this session — deploying is a separate act, by the
owner or a future session holding a proper token. What follows is the exact
procedure for whoever does it.

### 0. About `wrangler`

`wrangler` is Cloudflare's Workers CLI, distributed as an npm package. This
repo's zero-dependency rule (ADR 0001, `CLAUDE.md`) governs the **shipped
site** in `site/` — it says nothing about deploy tooling for a separate
backend component, so using `wrangler` here doesn't violate it. But
installing anything — globally, in this repo, or even running it
one-off via `npx` (which still downloads and caches the package) — is a
new tool touching this machine, and per this repo's doctrine that's a
decision for the owner to make explicitly, not something a session
does on its own initiative. Don't run `npm install -g wrangler` or
`npx wrangler ...` unless the owner has said to.

### 1. Create the KV namespace

```sh
cd worker
npx wrangler kv namespace create SYNC_BLOBS
npx wrangler kv namespace create SYNC_BLOBS --preview
```

Each prints an `id`. Paste the first into `kv_namespaces[0].id` and the
second into `kv_namespaces[0].preview_id` in `wrangler.toml`, replacing the
`REPLACE_WITH_...` placeholders.

### 2. Fill in the account id

```sh
npx wrangler whoami
```

(after `npx wrangler login`, or with `CLOUDFLARE_API_TOKEN` set — see below)
prints the account id. Paste it into `account_id` in `wrangler.toml`,
replacing the placeholder. Not a secret, but also not something to invent —
it names a real Cloudflare account.

### 3. Authenticate

Either:

- `npx wrangler login` — interactive OAuth in a browser, simplest for a
  one-off manual deploy; or
- an API token in `CLOUDFLARE_API_TOKEN`, following the same
  minted-child-token pattern this repo already uses for Pages deploys
  (`docs/DEPLOY.md`) — mint one scoped to **Account · Workers KV Storage ·
  Edit** and **Account · Workers Scripts · Edit** only, nothing wider, kept
  in the macOS keychain and sourced into the shell, never pasted or
  committed. Reuse the pattern, not the same token: the existing Pages
  token is scoped to Pages/DNS, not Workers/KV, and should stay that way
  (least privilege — a token that can deploy Workers is a token that can
  serve arbitrary code on this account, a strictly bigger blast radius than
  one that can only push static files).

### 4. Deploy

```sh
cd worker
npx wrangler deploy
```

This publishes the Worker to a `*.workers.dev` subdomain by default (printed
on success) — e.g. `https://faves-sync.<your-subdomain>.workers.dev`. A
custom route/domain can be attached later the same way Pages' custom domain
was (`docs/DEPLOY.md`), but isn't required for the Worker to function.

### 5. Verify

```sh
BASE="https://faves-sync.<your-subdomain>.workers.dev"
ID=$(python3 -c "import secrets; print(secrets.token_hex(16))")   # a fake 32-hex-char blobId for smoke testing

curl -i "$BASE/v1/blob/$ID"                                        # expect 404
curl -i -X OPTIONS "$BASE/v1/blob/$ID" -H "Origin: https://lets-eat.myspot.nz"   # expect 204 + CORS headers
curl -i -X PUT "$BASE/v1/blob/$ID" -H "Origin: https://lets-eat.myspot.nz" --data-binary "test-ciphertext"  # expect 204 + ETag
curl -i "$BASE/v1/blob/$ID" -H "Origin: https://lets-eat.myspot.nz"               # expect 200, body "test-ciphertext"
curl -i "$BASE/v1/blob/not-a-valid-id"                              # expect 400
curl -i "$BASE/"                                                    # expect 404
```

Delete that test blob when done (it'll also expire on its own after the
TTL) — there's no delete endpoint by design (nothing here needs one: a
device that wants to "reset" sync just mints a new sync code, and the old
blob ages out on its TTL), so either let it expire or overwrite it with
something harmless.

### 6. Wire it into the client

Nothing in `site/js/` calls this Worker yet — only the crypto primitives
(`sync-crypto.js`) and the merge logic (`sync-merge.js`) exist so far. A
future change needs a small fetch wrapper (not part of this task's file
ownership) pointed at the deployed base URL from step 4, sending
`GET`/`PUT` to `/v1/blob/<blobId>` with the `If-Match`/`ETag` dance this
README and `sync-worker.js` describe.

## Local testing without deploying

`worker/sync-worker.test.js` runs under plain `node --test` (from the repo
root, `node --test` already picks it up automatically — no wiring needed)
with a fake in-memory KV namespace, so the routing, validation, CORS, and
CAS logic can be verified without `wrangler`, a Cloudflare account, or a
network call. It is **not** a substitute for a real deploy smoke test
(step 5 above) — it can't tell you whether `wrangler.toml`'s bindings are
correct, whether KV's real consistency behaviour differs in a way that
matters, or whether the account/namespace ids are right.

---

## Deployed — 2026-08-16

**Live at `https://faves-sync.cakeit.workers.dev`.** The owner authorised the
backend that day (ADR 0060 addendum) and it was deployed the same session.

**Where the real config lives, and why not here.** `wrangler.toml` in this
directory keeps its `REPLACE_WITH_…` placeholders **on purpose**. Faves is a
public repo; a Cloudflare account id and two KV namespace ids sitting in a
public tree are reconnaissance, and this repo's own rule is that estate
resources are pointed at rather than copied down. The real values, the live
verification and the deploy credential's story are recorded in the operator's
private estate-root repo — its credential registry and its inventory. To
redeploy, regenerate a filled config **outside this tree** from those values and
run `wrangler deploy -c <that file>`.

**The credential.** A dedicated Cloudflare child token, `faves-sync-deploy`,
minted through the estate root's own mint tooling and stored **only** in the
macOS login keychain — never in any repo. Two account permission groups and
nothing else: `Workers Scripts Write` and `Workers KV Storage Write`. **No zone
scope at all**, so it cannot reach DNS; and deliberately **not** the Pages
credential the site deploys on, because reusing that would put two unrelated
blast radii on one token.

Write scope is acceptable here only because of what this Worker holds: the blobs
are encrypted client-side and the key derives from the user's sync code under a
different HKDF label from the blob id (ADR 0061). Whoever holds this credential
can replace the Worker or delete ciphertext. They cannot read one user's data.

**Verified live against the deployed Worker**, not inferred from the unit tests —
all ten passed:

| Check | Result |
|---|---|
| `GET` before any write | `404` |
| First `PUT` | `204` |
| `GET` after write, with `ETag` | `200`, ETag present |
| Ciphertext decrypts to the identical snapshot | ✅ |
| No plaintext anywhere in the bytes on the wire | ✅ |
| Stale `If-Match` | `412` |
| Correct `If-Match` | `204` |
| Another code's blob id | `404` |
| Malformed blob id | `400` |
| 300 KiB body against the 256 KiB cap | `413` |

**Residue:** one test blob written under a throwaway minted code during that
verification. It is ciphertext of a fixture and expires with the 180-day TTL.

**Still not reachable from the app.** Nothing in `site/` calls this yet — the
push/pull client, the pairing screen and the base-snapshot store the merge needs
are all still to build. The endpoint being live is not the feature being live.
