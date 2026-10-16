- [ ] ⏳ **Turn the KV mirror off after a clean week** `[XS] [worker]` —
      owner-ruled 2026-10-02 (session `faves-4f`), with the `340` deploy go.

  The Durable Object store went live 2026-10-02 with `KV_MIRROR = "on"`, so
  a rollback to the KV Worker loses nothing. The cost is that KV's free
  1,000 writes a day stays the ceiling. **On or after 2026-10-09**, if sync
  has run clean (no rollback, no sync fault reported, the `380` sync log
  shows nothing odd once it ships), redeploy with `KV_MIRROR = "off"`: a
  vars-only change, same config otherwise (`worker/README.md`, "Deploy owed —
  the Durable Object store"). After that a rollback would serve copies as at
  the cutover, so rolling back stops being lossless; say so in the record.

  🔎 **Measured 2026-10-16 (`faves-11`), not flipped.** Cloudflare's Worker
  analytics (`workersInvocationsAdaptive`, read-only estate token) for
  `faves-sync`, 2026-10-02 to 2026-10-16: **36 invocations, 0 errors**, every
  one `success`, on 9 days, 1 to 12 a day. No commit has touched `worker/`
  since the cutover, so there has been no rollback. This shows the Worker
  threw nothing; it does not show what any device's sync log says, which only
  the owner can read. At this volume the 1,000-writes-a-day ceiling the flip
  lifts is two orders of magnitude away, while the flip ends lossless
  rollback. Put to the owner at the 2026-10-16 queue run's close rather than
  done unattended.
