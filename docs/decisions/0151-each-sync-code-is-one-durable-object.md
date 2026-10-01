# 0151 — Each sync code is one Durable Object

**Status:** accepted (owner-ruled 2026-10-02, session `faves-4f`: option B of
the options paper). Built by roadmap `510/340`. ⏳ **Not yet deployed** — the
deploy and the move off KV wait for the owner's go (`worker/README.md`,
"Deploy owed — the Durable Object store").
**Date:** 2026-10-02
**Builds on:** [ADR 0017](0017-cross-device-sync-encrypted-blob-bearer-code.md)
(the dumb ciphertext store), [ADR 0146](0146-the-scaling-design-revised-after-its-cold-review.md)
§2 (recipe buckets and their expiry). Closes the limit the Worker's README and
`handlePut` recorded since the Worker was built: KV has no compare-and-swap.

## Context

Workers KV is eventually consistent: a location keeps a read for 60 s and hands
it out whatever has been written since. A sync version is a random id, so the
client cannot tell an older copy from another device's change. Four tests drive
the real client against the real Worker over Cloudflare's documented KV model
(`tests/stale-sync.test.js`, PR #78): a fresh heart removed, a heart lost on
both devices, an un-heart undone on both, and a recipe move undone on both —
the last because the Worker's own `If-Match` check read through the same cache
and accepted a write built on a stale read. The options paper
(`docs/reviews/2026-10-01-1116-stale-sync-read-options.md`) weighed a client
fix (A), a Durable Object per sync code (B) and a shorter cache (C). Only B
fixes the import-undone case and protects devices on old builds without an app
update. The owner ruled B.

## Decision

1. **One Durable Object per sync code** (`SyncStore`, SQLite storage), named by
   the same `blobId` the KV key used. It holds one row per copy — `core`,
   `r0`…`r15` — with the ciphertext, the version and the last write time. The
   Worker forwards each `GET` and `PUT` to it and keeps everything else it did:
   the routes, statuses, `ETag`s, bucket report, body cap (enforced before the
   object is woken) and CORS, including the exposed headers on the real
   response. **The HTTP interface is unchanged**, so every build keeps working.
2. **The compare-and-swap is synchronous.** The read of a copy, the `If-Match`
   comparison and the write run inside one `transactionSync` over the
   synchronous SQL API, with no `await`, so nothing can interleave whatever the
   platform's input gates do. Two racing writes: one `204`, the other `412`.
3. **Retention is the KV Worker's, to the day.** A copy expires 180 days after
   its last write or re-arm. A write re-arms each other copy that is inside
   `?family`, vouched for by `?known` at its exact version, and 30 or more days
   past its last write; a `GET` re-arms nothing. A re-arm moves only the write
   time. Expired copies are absent on every read at once; an alarm frees the
   storage, and deletes everything once nothing is left.
4. **The import waits until KV cannot be stale.** On its first request an
   object reads its user's 17 KV keys once, keeping versions and write times, so
   a device's KV-era `ETag` still matches. It does so only once five minutes
   (`IMPORT_SETTLE_SECONDS`) have passed since this Worker version was created
   (the `[version_metadata]` binding); until then it answers `503`, which the
   client already treats as "try again later". Without the binding it never
   imports. An object that finds nothing stores nothing.
5. **KV is never deleted from, and is mirrored while `KV_MIRROR` is "on"** (as
   shipped): each write the object takes is written to KV too, best effort,
   one job at a time and always the newest version, so a rollback to the
   frozen KV-only Worker (`worker/rollback-kv-only.js`) loses nothing. The
   object never reads the mirror after its import.

## Rejected

- **A, the client remembers what it replaced** (and A+, the Worker records each
  write's parent). Fixes only the single-device stories; cannot see the
  import-undone case; leaves old builds exposed. The paper's reasoning stands.
- **C, a 30 s cache.** Halves the window, closes nothing.
- **Judging the imported copy by its own write time** (the paper's suggested
  guard for the one-time import). A stale read returns the older copy *with the
  older copy's write time*, so the check passes exactly the copy it exists to
  refuse. What bounds staleness is time since the last write to the key, and
  after the deploy nothing writes a not-yet-imported user's keys — hence a
  window counted from the deploy (decision 4). A test pins it: the paper's
  check, as the control, imports the stale copy.
- **Falling back to KV when the Durable Object binding is missing.** That is
  the defect; a broken deploy answers `500` instead.
- **The asynchronous storage API, relying on input gates for the CAS.**
  Correct on Cloudflare today, but invisible in a diff: one added `await` of
  network I/O would quietly break it. The synchronous API makes the guarantee
  a property of the code (decision 2).
- **Dropping the `?known`/30-day re-arm rules** now that a re-arm touches no
  bytes. Simpler, and it would only lengthen retention, but "the same
  retention" was the brief; it is a one-function change if wanted later.
- **A KV that stays strictly read-only (`KV_MIRROR` off).** The paper's
  wording. Then a rollback would serve every copy as it stood at the cutover,
  and devices would read the difference as deletions — the defect, for
  everyone at once. Held as the owner's choice at deploy time; off is a
  vars-only redeploy.

## Consequences

- The four 510/340 tests pass with their `todo` removed; a seeded fuzz of the
  owner's sequence against the live Worker reads nothing stale and loses,
  revives and undoes nothing (1,000 seeds measured; 40 in `node --test`). The
  510/320 fuzz now runs against the frozen KV-only Worker, the one that could
  serve a stale read.
- After the import no sync reads KV. A new user's first request costs 17 KV
  reads once; while the mirror is on, each write still costs the KV write the
  KV Worker made, but a failed one (the free tier's 1,000 a day) no longer
  fails the sync.
- `wrangler rollback` cannot cross the class change. Rolling back is a deploy of
  `rollback-kv-only.js`; rolling forward again needs a fresh class, because
  the old objects never re-import (README runbook).
- The tests depend on Node's built-in `node:sqlite` (CI's Node 22 has it
  unflagged; tests only, nothing shipped).
- The free plan carries it: SQLite Durable Objects are on it, and Faves' use
  is far below its daily request and row limits (options paper, sources).
