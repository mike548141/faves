# Faves sync Worker

The server half of cross-device sync (ADR
[0017](../docs/decisions/0017-cross-device-sync-encrypted-blob-bearer-code.md),
ADR [0060](../docs/decisions/0060-sync-merges-three-ways-because-the-layer-has-no-clock.md)).
A Cloudflare Worker that stores and serves **one encrypted blob per user**.
It is a dumb ciphertext store: it cannot read a user's data, and it is not
supposed to be able to.

⏳ **Since roadmap 510/340 (ADR
[0151](../docs/decisions/0151-each-sync-code-is-one-durable-object.md); built,
not yet deployed)** each user's copies live in one **Durable Object** named by
the `blobId` (`SyncStore` in `sync-worker.js`), not in Workers KV. KV is read
once per user, to import, and otherwise only mirrored for a lossless rollback.
The HTTP interface did not change. Sections below that describe KV reads and
writes describe the Worker until then; "Deploy owed — the Durable Object store" at the end is
the runbook.

This directory is source and deploy config only. It is deployed (see
"Deployed" below); `wrangler.toml` keeps placeholders on purpose.

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
| `sync-worker.js` | The Worker itself — plain ES module, `export default { fetch }` plus the `SyncStore` Durable Object class, no dependencies. |
| `sync-worker.test.js` | Unit + fetch-handler tests, plain `node --test`, no dependencies. Runs against the Durable Object stand-in below, over a fake KV (strongly consistent, so *more* forgiving than real KV) and `LaggyKV` (reads lag writes, as KV's eventual consistency does) for the import's stale-read case. |
| `durable-object-standin.js` | Test support, never deployed: a Durable Object namespace over real SQLite (Node's built-in `node:sqlite`). Its header says where it is stricter than Cloudflare and the few places it is not. |
| `sync-worker-kv-only.js` | 🧊 Frozen: the KV-only Worker as it ran until 510/340, byte for byte. The rollback target, and the Worker the 510/320 stale-read fuzz runs against. Never edited (a test pins its hash). |
| `rollback-kv-only.js` | The rollback entry point: the frozen fetch handler, still exporting `SyncStore`. Deployed only by the runbook's rollback. |
| `wrangler.toml` | Deploy config for [Wrangler](https://developers.cloudflare.com/workers/wrangler/), Cloudflare's Workers CLI. Has placeholders — see "Deploying". |

## API

| Route | Method | Response |
| --- | --- | --- |
| `/v1/blob/<blobId>` | `GET` | `200` + ciphertext body (`application/octet-stream`) + `ETag`, or `404` if nothing stored yet. |
| `/v1/blob/<blobId>` | `PUT` | `204` on success, with a fresh `ETag`. `412` if `If-Match` doesn't match the current version (see "Concurrency" below). `413` if the body is too large. `400` if the body is empty or `blobId` is malformed. |
| `/v1/blob/<blobId>` | `OPTIONS` | `204` CORS preflight. |
| `/v1/blob/<blobId>?buckets=<n>` | `GET` | As `GET` above, plus `X-Faves-Buckets`: the version of each recipe bucket 0…n−1 that exists (`r0="<v>",r3="<v>"`), or `none`. On a `404` too. Costs one storage read per bucket asked about (one KV read each, before 510/340). |
| any `GET` / `PUT` | | `503` + `Retry-After` (since 510/340): this user's copies have not been imported from KV yet and it is less than five minutes since the deploy (see ADR 0151). The client treats it like any unreachable moment: it keeps its data and tries again. |
| `/v1/blob/<blobId>:r<n>` | `GET` / `PUT` | A recipe bucket, `n` from 0 to 15. Same rules as the core copy: ciphertext, `ETag`, conditional `PUT`, 256 KiB cap. |
| `…?family=<n>` on any `PUT` | `PUT` | How many recipe buckets the user has (roadmap 510/140). After the write, only the core copy and buckets 0…n−1 are read to re-arm their expiry. `0` (no recipes) reads none. Absent or not a whole number: all 16. |
| `…&known=core:<v>,r0:<v>,…` on any `PUT` | `PUT` | The version the client holds of each other copy (roadmap 510/330). Of the copies `family` allows, only those named are read, and one is re-armed only if KV returns exactly that version. Absent: nothing is read or re-armed. Never changes the response. |
| anything else | any | `404` (unknown route) or `405` (wrong method on a real route). No index, no listing — there is no way to enumerate what blobIds exist. |

`blobId` must be exactly 32 lowercase hex characters (128 bits) — anything
else is rejected with `400` before it ever reaches KV. This is the exact
shape `deriveSyncKeys()` in `site/js/sync-crypto.js` produces; the two are
tested against each other in that module's own test suite
(`tests/sync-crypto.test.js`).

## Recipe buckets and expiry (roadmap 510/050)

> Since 510/340 these rules run inside the user's Durable Object, **unchanged**,
> so retention is the same to the day: each copy expires 180 days after its
> last write or re-arm, and a write re-arms the other copies in `family` that
> the client vouches for in `known` and that are 30 days past their last write.
> A re-arm now moves only the write time — it re-writes no bytes, so the stale
> re-write 510/330 fixed cannot happen at all — and an alarm frees an object's
> storage once everything in it has expired. The KV read and write counts
> below are the KV Worker's.

A user's personal recipes are stored beside their core copy, under the same
user key plus a bucket number: `<blobId>:r0` … `<blobId>:r7` (ADR 0146 §2).
The Worker cannot read them any more than it can read the core copy. What it
learns is that "a recipe bucket changed", and each bucket's size class: the
client pads every bucket to a multiple of 4 KiB and writes all eight once
any recipe exists (`site/js/sync-buckets.js` says why).

**Every write keeps all of a user's copies alive.** Each copy's metadata
records `t`, when it was last written. After any successful `PUT`, the Worker
reads every other copy under that user key that the client vouches for (see below) and re-writes, with a fresh
180-day expiry, the ones last written more than 30 days ago — keeping their
bytes and their version, so an `ETag` a device holds stays valid. So a
recipe bucket nobody has touched in months does not expire while the
hearts beside it stay alive (B1 in the ADR 0145 cold review). Re-writing
every copy on every write would have spent up to nine KV writes on a heart;
the 30-day threshold spends at most nine a month per user and still leaves
every copy at least 150 of its 180 days after any write.

**A client that predates buckets** asks nothing (`?buckets` absent), gets no
report and costs the one read it always did. Since 510/330 its writes no
longer re-arm anything (it names no versions; see below).

**Only the buckets that exist are read (roadmap 510/140).** Until 2026-10-01
every `PUT` read all 16 possible sibling keys and every client `GET` asked
about 8 buckets, so a heart cost 26 KV reads and a pull 9, for a user with
no recipes, none of whose bucket keys exist. Now the client asks `?buckets=8`
only when it holds a recipe or last agreed on buckets, and every `PUT`
carries `?family=<n>`, the bucket count the core copy records (`0` for no
recipes). Measured with the real client and Worker over a counting KV: no
recipes, a pull 9 → 1 read and a heart 26 → 2 reads (1 write either way);
200 recipes, a pull 9 → 9 and a heart 26 → 18. A device that asked nothing
and finds a core copy recording buckets (another device's first recipe)
reads again, asking: one extra request, once.

What `family` gives up: a bucket the writing client does not know of (one
orphaned by a lost race, with no core copy recording it) is not re-armed by
that write. It is some device's merge that device still holds, and the next
recipe sync detects it (the report names it) and writes it again.

**A re-arm only re-writes a copy the client vouches for (roadmap 510/330).**
Re-arming re-writes the bytes KV *read*, and KV is eventually consistent: a
read can return an older value than the latest write for up to a minute or
so. Until 2026-10-01 such a read was re-written as it came, with a fresh write
time, so the older bytes won under their old version and the newer write was
lost. Both ways round: a recipe edit re-reads and puts back the older core
copy (the 510/320 simulation undid an import that way), and a core write puts
back the older version of a bucket the same sync had just written. Copies the
pre-050 Worker wrote carry no `t`, so they counted as due at once — that made
it likely the day the import ran, but a user back after 30 days hits it too.

Now every `PUT` carries `?known=core:<v>,r0:<v>,…`, the version the client
holds of each *other* copy: on a bucket write, the core copy's version it read
and the other buckets' versions; on a core write, the bucket versions that copy
records. The Worker reads only the copies named there, and re-arms one only if
the version it read is that one — and a version names one write's bytes, so a
re-arm re-writes exactly what the client holds. A read that disagrees is stale
or newer than the client, so that copy was written moments ago and already has
its full 180 days: the 150-day promise holds, at no extra KV write. The client
does not vouch for a bucket whose reported version disagrees with the core
copy's record, unless it has just written it.

| A user with one recipe, real client + real Worker | Before | After |
| --- | --- | --- |
| First sync | 90 R + 9 W | 54 R + 9 W |
| Heart | 18 R + 1 W | 18 R + 1 W |
| Recipe edit | 27 R + 2 W | 27 R + 2 W |
| Heart, every bucket past 30 days | 18 R + 9 W | 18 R + 9 W |

A user with no recipes sends no `known` and costs what it did (a heart 2 R +
1 W). A `PUT` with no `known` at all — a client from before this change —
re-arms nothing and reads no sibling: it cannot vouch for a read, every copy
has at least 150 days from its last re-arm, and that client is replaced the
next time its page loads.

**What this does not close:** two devices writing through different locations
inside KV's window, where *everything* one of them read was stale. Then it
vouches for the older version and the re-arm can put it back. That is the race
"Concurrency" below already describes — the same device's core write loses the
other's core write in it — and a Durable Object would close both.

## Concurrency: compare-and-swap, honestly

`PUT` supports `If-Match` so a device syncing a stale copy can't silently
clobber a newer write — it gets `412` back and is expected to `GET`,
re-merge (client-side, `site/js/sync-merge.js`), and retry.

✅ **Closed by 510/340, once deployed.** Each user's copies now live in one
Durable Object. Exactly one instance exists per user, every request goes to
it, and its read of a copy, the `If-Match` comparison and the write are one
synchronous step over its SQLite storage, so two racing writes cannot both
win: one gets `204`, the other `412`. A read always sees the latest write, so
a device is never handed a minute-old copy either (the defect 510/340
measured: a heart removed, a removed heart back, a recipe move undone on both
devices). The paragraphs below are the KV Worker's honest limit, kept as the
record of why.

**Read this before assuming that's airtight (the KV Worker, until 510/340).** Workers KV is
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
with a Durable Object stand-in and fake KV namespaces, so the routing,
validation, CORS, CAS, retention and migration logic can be verified without
`wrangler`, a Cloudflare account, or a network call. `tests/stale-sync.test.js`
drives the real client against the real Worker over a KV model with
Cloudflare's documented 60-second read cache, including the cutover itself.
It is **not** a substitute for a real deploy smoke test (step 5 above) — it can't tell you whether `wrangler.toml`'s bindings are
correct, whether KV's or Durable Objects' real behaviour differs in a way that
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

## Deployed — the recipe-bucket Worker, 2026-10-01 (roadmap 510/050 and 140)

✅ **Deployed 2026-10-01 (session `faves-55`), with the owner's import, as he
ruled.** Version `1a368b38-e276-41a9-b760-a7dc32dda30e`, from `main` at
`ac9ea6f`, with the `faves-sync-deploy` credential and a config filled outside
this tree (as above). The live checks below were run against it and all passed:
`?buckets=8` on an unwritten id gives `404` and `X-Faves-Buckets: none`; a
bucket `PUT` gives `204` and an `ETag`, and the next `GET` reports it; `:r16`
gives `400`; `?family=0` and `?family=x` both give `204`; and
`Access-Control-Expose-Headers` names `ETag` and `X-Faves-Buckets`. The
owner's import then synced five recipes from his laptop to his phone. Residue:
two test copies under random ids, holding junk bytes, not user data; they
expire with the 180-day TTL.

The rest of this section is the pre-deploy record, kept as written.

**Either order is safe**, by design:

- **Site first** (today's state once 510/050 merges): the client asks
  `?buckets=8`, the old Worker ignores the query and reports nothing, and the
  client keeps recipes on the device, touching no bucket and changing nothing
  it has not read. Hearts, ratings, notes and settings sync exactly as before.
  Nothing is lost; recipes simply do not cross devices yet.
- **Worker first**: the old client asks nothing and gets nothing new; its
  writes now re-arm sibling copies (there are none yet). No behaviour change.

The same holds for `?family` (roadmap 510/140): the deployed Worker ignores
it and reads all 16 siblings, as it does today, and the new Worker treats a
`PUT` without it (any client before 510/140) the same way. A new client with
no recipes sends no `?buckets` at all, so against the deployed Worker its
pull is already one read.

**After the deploy, verify live** (as the 2026-08-16 table did):
`GET /v1/blob/<id>?buckets=8` on an unwritten id → `404` with
`X-Faves-Buckets: none`; `PUT /v1/blob/<id>:r0` → `204` + `ETag`; the same
`GET` → `X-Faves-Buckets: r0="<that etag>"`; `PUT /v1/blob/<id>:r16` → `400`;
and `Access-Control-Expose-Headers` names both `ETag` and `X-Faves-Buckets`
on a real cross-origin response. For `?family` (roadmap 510/140), which
changes no response, only what the Worker reads: `PUT /v1/blob/<id>?family=0`
on a fresh id → `204`, then the same with `If-Match` → `204`; and
`PUT /v1/blob/<id>?family=x` → `204` (an unreadable family is "all 16", never
an error). The read counts themselves cannot be seen from outside; the
Cloudflare dashboard's KV read graph for the namespace should fall once the
site and Worker are both live.

## Deployed — the re-arm fix, roadmap 510/330, 2026-10-01

✅ **Deployed 2026-10-01 (session `faves-55`) at the owner's go**, version
`3a21e527-49ed-49a1-9dd3-10e58dac6d34`, from `main` at `c9d51a8`. Live checks
1–3 below passed against it: every `PUT` with `known` (valid, quoted, bare,
out of range, garbage) answered `204` with an `ETag`, and a bucket `PUT`
vouching for the core copy's ETag was then reported by
`GET ?buckets=8`. Check 4 (a real two-device recipe sync) is the owner's.
Residue: one test copy and one bucket under a random id, junk bytes only.

The rest of this section is the pre-deploy record, kept as written.

**Either order is safe:**

- **Site first** (this change merges to `main`, which deploys the site): the
  client adds `&known=…` to its `PUT`s; the live Worker ignores it and keeps
  re-arming as it does today. Nothing breaks, and the risk stays as it is
  until the Worker goes.
- **Worker first:** a client without `known` re-arms nothing. Every copy has
  at least 150 days left from its last re-arm, and the site's next deploy
  replaces those clients on their next page load.

**After the deploy, verify live** (none of this is visible in a response, so
the checks are that nothing broke and that the new query is accepted):

1. `PUT /v1/blob/<fresh id>?family=8&known=r0:x` → `204` + `ETag`.
2. The same with `If-Match` and `&known=core:"x",r0:y` (quoted and bare) →
   `204`; `&known=r16:x` and `&known=garbage` → `204` (dropped, never an
   error).
3. `PUT /v1/blob/<id>:r0?family=8&known=core:<the core's etag>` → `204`, then
   `GET /v1/blob/<id>?buckets=8` → `X-Faves-Buckets` names `r0`.
4. A real recipe sync between two of the owner's devices still converges (a
   recipe edit on one shows on the other).

Re-arming itself cannot be seen from outside (it changes only expiry); the
unit tests in `sync-worker.test.js` (`510/330`) and the real-client test in
`tests/sync.test.js` are the evidence for it.

## Deploy owed — the Durable Object store, roadmap 510/340

✅ **Deployed 2026-10-02 (session `faves-4f`) at the owner's go, mirror on.**
Version `efd2aeee-f179-410c-b042-20be14255ffb`, from `main` at `3750d4b`
(Worker code as merged in PR #82), replacing `3a21e527`, with the
`faves-sync-deploy` credential and a config filled outside this tree. The
credential's two permission groups were enough to create the Durable Object
class; nothing was widened. Live checks 1–5 below all passed (16 assertions):
`503` with `Retry-After: 300` and CORS nine seconds after the deploy; after
the window, `404` and `X-Faves-Buckets: none`; a copy planted in KV before the
deploy came back `200` under its KV-era `ETag` and took a `PUT` on it; the
interface checks; and two `PUT`s sent at once on one `ETag` gave one `204` and
one `412`. Check 6 (the owner's devices) is his. Turning the mirror off is
roadmap `510/410`, on or after 2026-10-09. The rest of this section is the
pre-deploy record, kept as written.

⏳ **Built, not deployed.** The deploy, and with it the move off KV, needs the
owner's go at the time (ruled 2026-10-02: option B, one Durable Object per
sync code; ADR [0151](../docs/decisions/0151-each-sync-code-is-one-durable-object.md)).
Nothing under `site/` changed, so there is no site half and no order to get
right: devices on every build keep working on the day, because the HTTP
interface is the same.

🎯 **One decision rides with the go — `KV_MIRROR`.** The ruling's paper said
"KV stays as a read-only fallback". `wrangler.toml` ships `KV_MIRROR = "on"`
instead: every write the object takes is also written to KV (best effort; the
same KV writes the KV Worker made, and a failed one never fails the sync), so a
rollback serves the newest copies under the versions devices hold. With it
`"off"`, KV is truly read-only and retires by its own 180-day TTL, but a
rollback would serve copies as they stood at the cutover, and devices would
read them as other devices' deletions: the 510/340 defect, for everyone at
once. Turning it off later is a vars-only redeploy.

### What changes on the day

- Every `GET`/`PUT` goes to the user's object. **For the first five minutes
  after the deploy, every user answers `503`** until their object can import
  (below). The client already treats that as "couldn't reach sync, your data is
  safe on this device" and tries again on its next sync. Deploy when nobody is
  mid-change; Faves' traffic makes that easy.
- On a user's first request after those five minutes, their object reads all
  17 of their KV keys once, keeps the versions and write times exactly, and
  never reads KV again. A device's `ETag` from the KV Worker still matches.
- **Why five minutes, and why not the paper's "refuse a copy younger than a
  minute":** a stale read returns the *older* copy carrying the older copy's
  write time, so a check on the copy cannot see it is stale. What bounds it is
  time since the last KV write, and after the deploy nothing writes a user's KV
  keys until their object exists. So the object imports only once
  `IMPORT_SETTLE_SECONDS` (300, five times KV's documented 60 s) have passed
  since this version was created, read from the `[version_metadata]` binding.
  Without that binding it never imports and every unimported user gets `503`:
  loud on purpose, and check 1 below catches it.

### Steps

1. **Credential.** The `faves-sync-deploy` token holds `Workers Scripts Write`
   and `Workers KV Storage Write`. 🤔 **Not verified:** whether that covers
   creating a Durable Object class (a migration). If `wrangler deploy` refuses
   for want of a permission, stop: widening the token is the owner's decision.
2. **Before the deploy, plant a KV-era copy** to prove the import live: `PUT
   /v1/blob/<fresh random 32-hex id>` with a junk body to the *live* KV Worker;
   note the `ETag`. Record the live version id (`wrangler versions list`,
   read-only) for the record.
3. **Config.** Regenerate the filled config outside this tree from `main`'s
   `wrangler.toml`. It now carries `[[durable_objects.bindings]]`
   (`SYNC_STORE` → `SyncStore`), `[[migrations]]` tag
   `v1-510-340-sync-store` with `new_sqlite_classes`, `[version_metadata]`, and
   `KV_MIRROR`. Keep `compatibility_date` as it is (the code deletes its own
   alarm, so it does not rely on 2026-02-24's `deleteAll` change).
4. **Deploy with `wrangler deploy -c <filled config>`** — one step. Never
   `wrangler versions upload` now and `versions deploy` later, and never a
   gradual deployment: the settling window counts from when the version was
   *created*, and old and new Workers must not serve side by side.

### Live checks

1. **Inside five minutes:** `GET /v1/blob/<another fresh id>` → `503` with
   `Retry-After: 300` and `Access-Control-Allow-Origin` for the site.
2. **After five minutes:** the same `GET` → `404`, and with `?buckets=8` →
   `404` + `X-Faves-Buckets: none`. (Still `503`? The version-metadata binding
   is missing: roll back, below.)
3. **The import:** `GET /v1/blob/<step 2's id>` → `200` with step 2's `ETag`;
   then `PUT` with that `If-Match` → `204`.
4. **The interface:** on a fresh id, `PUT` → `204` + `ETag`; `GET` → `200`, same
   `ETag`; `PUT` with a wrong `If-Match` → `412`; `:r0` `PUT` then the core
   `GET ?buckets=8` names `r0`; `:r16` → `400`; 300 KiB → `413`;
   `Access-Control-Expose-Headers` names `ETag` and `X-Faves-Buckets` on the
   real responses.
5. **Compare-and-swap, live:** two `PUT`s sent at once with the same correct
   `If-Match` (two `curl`s in the background) → one `204`, one `412`. Under KV
   both could pass.
6. **The owner's devices:** a heart on one shows on the other, including a
   phone switching between Wi-Fi and mobile data inside a minute.

Residue: the test ids' copies, junk bytes only, in objects and (mirrored) KV.
They expire in 180 days; the object's alarm then frees its storage.

### Rollback

`wrangler rollback` **cannot** go back to a pre-510/340 version: Cloudflare
refuses a rollback across a Durable Object class change (Workers → Versions &
deployments → Rollbacks, read 2026-10-02). The way back is a fresh deploy of
`rollback-kv-only.js`, which serves the frozen KV-only Worker and still exports
`SyncStore`:

```sh
wrangler deploy -c <filled config> rollback-kv-only.js
```

With `KV_MIRROR` on, nothing is lost: KV holds every copy the objects took, at
the versions devices hold (`sync-worker.test.js` proves it against the frozen
Worker). KV's stale reads, the 510/340 defect, come back with it.

🛑 **Rolling forward again after a rollback needs a fresh class.** While rolled
back, writes land in KV only, and the objects still hold what they had, and
never re-import. Re-deploying the same class would serve those older copies.
So roll forward with a new class: add `export class SyncStoreV2 extends
SyncStore {}` to `sync-worker.js`, point the binding's `class_name` at it, and
add a **new** `[[migrations]]` entry (`new_sqlite_classes = ["SyncStoreV2"]`,
a new tag). Fresh objects import from KV again, five minutes after that deploy.
The old class's objects are left as they are; deleting them
(`deleted_classes`) destroys data and is the owner's call.
