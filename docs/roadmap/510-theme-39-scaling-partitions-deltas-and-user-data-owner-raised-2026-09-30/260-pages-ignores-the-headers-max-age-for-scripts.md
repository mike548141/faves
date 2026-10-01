- [ ] 🔎 **Pages serves scripts with a four-hour cache, not `_headers`'
      `max-age=0`** `[S] [pwa][deploy]` — found 2026-10-01 by the `170`
      worker (session `faves-55`), by `curl` against the live site.

  ADR 0056's second half asked `site/_headers` for `max-age=0` on `js/`,
  `css/` and `sw.js`. Pages answers `max-age=14400` on `js/`, `css/`,
  `sw.js` and an icon. So a first visit within four hours of an earlier one
  can run the page on a previous deploy's scripts. The precache is
  protected either way (ADR 0149). The cause needs the Cloudflare zone
  configuration (a cache rule or browser-cache TTL that overrides the
  origin's headers is the inferred suspect, not confirmed). Read-only
  access is in the estate root's tooling; a change to the zone is the
  owner's to approve.
