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
