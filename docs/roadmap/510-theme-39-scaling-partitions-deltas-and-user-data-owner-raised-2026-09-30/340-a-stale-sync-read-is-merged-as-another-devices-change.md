- [x] 🔥 **A stale sync read is merged as if another device had changed
      it** `[M] [sync][data]` — found 2026-10-01 by the `330` worker
      (session `faves-55`), measured with the real client and the real
      Worker over a KV stand-in that lags 60 s. Not yet seen live.

  Workers KV is eventually consistent: a read may return a copy older than
  the last write for up to about a minute. The client merges whatever the
  read returns, and versions are random ids, so a stale copy looks exactly
  like another device's change. Measured: a heart, then a sync 10 s later,
  **removed the heart**. The same mechanism run the other way (a stale copy
  still holding hearts the base has dropped) would **bring old hearts
  back**. That is a candidate for `320`'s unexplained comeback, which the
  owner's answer (no third browser or app with sync on) leaves open. The
  probe script is not in the repo (it was scratch); rebuild it as a test.

  **Options to weigh:** an ordered version (a counter or timestamp in the
  sealed copy) so a client can refuse a copy older than its base; never
  merging a read whose version is the base's predecessor; or one Durable
  Object per user key, which the Worker's README already names as the real
  fix for KV's lack of compare-and-swap. A design ruling for the owner,
  with costs.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  🔎 **Reproduced and weighed 2026-10-02 (`faves-4f`, PR #78).**
  `tests/stale-sync.test.js` drives the real client and Worker over a KV
  stand-in with Cloudflare's documented 60 s per-location read cache. Four
  tests fail on today's code and are marked `todo` until the fix: a fresh
  heart removed, a heart lost on both devices, an un-heart undone on both, and
  **the recipe move undone on both** (the Worker's `If-Match` reads through
  the same stale cache, so a write built on a stale read is accepted). Options
  paper: `docs/reviews/2026-10-01-1116-stale-sync-read-options.md`. It
  recommends **B, one Durable Object per sync code**: the only option that
  fixes the import-undone case and protects old builds without an app update.
  It runs on Cloudflare's free tier (orchestrator re-read the DO pricing page
  on 2026-10-02: SQLite backend only, 100,000 requests and 100,000 rows written
  a day). Estimated two to three days. A (client-only, about a day) is an
  optional stopgap.

  🎯 **Owner ruled 2026-10-02: B, one Durable Object per sync code.** The
  Worker deploy (and the KV cutover) still needs his go at the time.

  🔨 **Built 2026-10-02 (`faves-4f` worker, PR #82, ADR 0151), not
  deployed.** One SQLite-backed Durable Object per sync code; the HTTP
  interface is unchanged, `If-Match` is a synchronous compare-and-swap inside
  `transactionSync`, retention is the KV Worker's to the day, and the 330
  re-write hazard is gone (a re-arm moves only the time). The four 340 tests
  pass with `todo` removed; break-probes (object reading KV, CAS with an
  `await`, no settling window, unchained mirror) each fail what they should.
  Fuzz, 1,000 seeds: 0 lost, 0 revived, 0 moves undone, against 328 and 312
  on the frozen KV Worker. 🔎 Two corrections to the options paper: "refuse a
  copy younger than a minute" cannot detect a stale read (the stale copy
  carries its own older time), so the import waits 5 minutes from the deploy
  instead; and the paper's fuzz "lost" counts include a no-op-heart artefact
  (`lostEffective` added). Runbook: `worker/README.md`, "Deploy owed — the
  Durable Object store".
  🎯 **Owed to the owner:** the deploy go, and `KV_MIRROR` on (ships on: a
  rollback loses nothing) or off.

  ✅ **Closed 2026-10-02 (`faves-4f`): deployed at the owner's go, mirror
  on.** Version `efd2aeee`, live checks 1–5 passed (16 assertions, including
  a KV-era copy imported under its old `ETag` and a live compare-and-swap:
  two simultaneous `PUT`s on one `ETag` gave one `204` and one `412`). Check
  6, a heart crossing his two devices, is the owner's. Mirror off: `410`.
