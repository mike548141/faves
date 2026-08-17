- [ ] 🎯🔥 **OWNER: the Worker must be redeployed before sync works at all**
      `[XS][ops]` — found and fixed in source by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`) (`e340d62`), **not
      deployed**. Until it is, **a browser cannot write to sync twice**: the
      CORS response does not expose `ETag`, so the client never sees the
      version it must send back as `If-Match`, and the second write is refused.
      The deploy uses an estate credential and the review session's policy
      declined it, correctly. 🚩 **This is live: sync is shipped and broken on
      the second write**, and the repository fix is invisible to users until
      the deploy happens.
