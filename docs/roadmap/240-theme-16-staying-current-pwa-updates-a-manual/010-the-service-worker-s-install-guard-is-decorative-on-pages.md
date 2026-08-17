- [ ] 🚩 **The service worker's install guard is decorative on Pages, and
      one precache entry never matches** `[S][pwa]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). Three
      findings, one surface:
      **(a)** The install step's `!res.ok → throw` cannot fire on Cloudflare
      Pages, because a missing path returns `index.html` with **200**, curl'd
      and confirmed. The guard that is supposed to stop a broken shell
      installing therefore passes on exactly the input it exists to catch —
      ADR 0072's pattern, in the most load-bearing place in the app.
      **(b)** **Nothing checks that every path in `SHELL` exists on disk.** The
      guard above was the only thing standing in for it, and it does not stand.
      **(c)** `/restaurant?id=` is served through a 308 to the canonical path,
      so the precached entry never matches the request and that route misses
      the cache offline.
