- [~] 🔥 **The sync Worker can put back an older copy when it re-arms
      expiry** `[S] [worker][sync]` — found 2026-10-01 by the `320`
      worker (session `faves-55`), by simulation. Not seen live.

  When a recipe bucket is written, `refreshFamily` re-saves the core copy
  from whatever KV just read, to reset its 180-day expiry. A copy written
  by the Worker before `510/050` carries no last-written time, so it counts
  as due for re-arming at once. KV is eventually consistent, so if that read
  is stale, an older core copy goes back under its old version. In a
  simulation where one location could not see its own writes for 60 s, the
  whole import was undone on both devices. **This Worker is live** (deployed
  2026-10-01 with the `050` import), so the risk is live too.

  **Build:** re-arming must never write back bytes older than the ones it
  is refreshing. Options to weigh, with evidence: treat a missing
  last-written time as fresh and stamp it on the copy's own next write;
  re-arm only from a read that proves it is current; or move re-arming to
  the copy's own writes only. A test reproduces the stale-read revert on
  today's code and passes after. A Worker deploy needs the owner's go.

  📌 **Claimed 2026-10-01 (`faves-55`).**
