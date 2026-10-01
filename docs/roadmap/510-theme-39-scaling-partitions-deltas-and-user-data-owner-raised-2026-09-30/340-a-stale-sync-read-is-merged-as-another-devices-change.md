- [ ] 🔥 **A stale sync read is merged as if another device had changed
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
