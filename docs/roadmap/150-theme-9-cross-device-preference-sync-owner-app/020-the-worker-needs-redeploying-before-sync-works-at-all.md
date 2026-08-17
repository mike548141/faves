- [x] ✅ **DONE 2026-08-17 — the Worker is redeployed and sync works end to
      end.** Owner-authorised and **verified by a live two-device round trip
      including the second write**, which is the write that was failing — not by
      a green deploy log. `[XS][ops]` The account below is the finding as it
      stood. Found and fixed in source by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`) (`e340d62`), **not
      deployed**. Until it is, **a browser cannot write to sync twice**: the
      CORS response does not expose `ETag`, so the client never sees the
      version it must send back as `If-Match`, and the second write is refused.
      The deploy uses an estate credential and the review session's policy
      declined it, correctly. 🚩 **This is live: sync is shipped and broken on
      the second write**, and the repository fix is invisible to users until
      the deploy happens.
