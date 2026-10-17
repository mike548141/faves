- [~] **"Delete everything": the second Reset the owner ruled, never built**
      `[M][js][safety]` — filed 2026-10-18 by `faves-b4`. Found while closing
      32d: the ruling is in [roadmap 430](../430-owner-rulings-2026-08-16-end-of-the-branch-pic/README.md)
      and no item carried it, so nothing was going to build it.
  **The ruling (2026-08-16):** Reset becomes two gated controls. "Reset
  preferences" keeps today's scope (one profile's dietary needs, flagged
  allergens, distance, units, language, maps app). **"Delete everything"**
  wipes all profiles, favourites, ratings and the order tally, behind its own
  typed confirmation with different wording, so the two cannot be confused.
  Once sync exists (it does) a reset propagates to every device, *"everywhere,
  always"*, and the confirmation names the scope — *every device signed in
  with this sync code* — with no device count (same README).
  **What it must also take:** every store the personal layer now keeps — the
  activity log (ADR 0164; `activity.clear()` is tested but only empties the
  active person), saved orders (ADR 0154), notes, cook ticks, the shopping
  list. Walk every whitelist, as ADR 0164 did, because a store added later is
  the one a wipe forgets.
  **Proof wanted:** a browser check that seeds every store across two
  profiles, deletes everything, and asserts each is empty; plus `sync_check`
  coverage of the propagation, since a wipe that a second device re-uploads
  is not a wipe.

  (claimed 2026-10-17-2254, faves-b4, wt: faves-180-010)
