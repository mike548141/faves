- [ ] **The first install revalidates rather than re-downloads** `[S]
      [pwa][sw]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **D**.

  Measured: a first visit downloads about 40% of the app twice (about 1,524 KB
  gzip in all, about 600 KB of it duplicated).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal D.

  🎯 **Owner ruling needed:** this touches ADR 0056's "never fill the store
  from the browser's cache". Check it against the 2026-08-16 incident's
  reproduction first.
