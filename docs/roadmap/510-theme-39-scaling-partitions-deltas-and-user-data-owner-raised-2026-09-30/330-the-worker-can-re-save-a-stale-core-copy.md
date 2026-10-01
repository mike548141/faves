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

  ✅ **Built 2026-10-01 (`faves-55` worker, branch `510-330`); Worker NOT
  deployed.**
  1. **Reproduced on main's code**, `worker/sync-worker.test.js`, with a KV
     stand-in (`LaggyKV`) whose reads lag its writes by 60 s. Three ways,
     all failing on main: the pre-050 trigger (a core copy with no `t`, a
     new core write, then a bucket write puts the old core back); the same
     with no trigger (a core copy last written 31 days ago, a heart, then a
     recipe edit); and the mirror (a core write puts back the older version
     of a bucket the same sync had just written).
  2. **Why not the item's first option.** Treating a missing `t` as fresh
     fails the second and third cases: the class is "any copy past 30 days
     read stale", not the pre-050 copies. KV has no read that proves itself
     current, so no Worker-only rule can tell a stale read from an old copy.
     Moving re-arming to each copy's own writes loses B1 (unedited recipes
     would expire).
  3. **The fix: the client vouches.** Every `PUT` carries
     `?known=core:<v>,r0:<v>,…`, the version it holds of each other copy.
     The Worker reads only those, and re-arms one only if KV returns that
     exact version, so a re-arm re-writes exactly the bytes the client holds.
     A read that disagrees was written within KV's window, so it already has
     180 days: ADR 0146's 150-day promise holds at no extra KV write. No
     `known` (an older client) re-arms nothing. The client does not vouch for
     a bucket whose reported version disagrees with the core copy's record
     unless it has just written it (a stale view of another device's rewrite).
     Needed a site change: `sync.js`, `sync-buckets.js`, shell `.20`.
  4. **Break-probes.** Drop the version check in the Worker: the three
     reproductions and the mismatch test fail (4). Main's Worker behaviour
     with the new exports: those plus "a client from before `known`
     re-arms nothing" (5). Client naming nothing: the `known` test fails;
     a wrong separator: it and the real-client + real-Worker test fail;
     the mismatch filter removed: its test fails.
  5. **KV cost, one recipe, real client + real Worker, before → after:**
     first sync 90 R + 9 W → 54 R + 9 W; heart 18 R + 1 W, unchanged;
     recipe edit 27 R + 2 W, unchanged; heart with every bucket past 30
     days 18 R + 9 W, unchanged. No recipes: unchanged (`chatty_check` 40/40,
     budgets not moved).
  6. 🚩 **Not closed:** two devices through different locations inside
     KV's window, where everything one read was stale. That is the race
     `handlePut` already documents; a Durable Object closes both.
  7. 🚩 **Found, not fixed (client, not this item):** the client merges
     whatever its GET returns, and a version is a random id, so a stale GET
     of the core copy reads as another device's change. Measured with the
     real client and Worker over the same 60 s-lag KV: a heart, then a sync
     10 s later, and the heart was gone (`favouritesRemoved: 1`), with no
     re-arm involved. So the KV model that found this item breaks sync more
     directly on the client. Detecting it needs the client to remember the
     versions it has already replaced. Not filed: for the orchestrator.
  8. **Deploy owed**, either order safe; the live checks are in
     `worker/README.md` ("Deploy owed — the re-arm fix").
