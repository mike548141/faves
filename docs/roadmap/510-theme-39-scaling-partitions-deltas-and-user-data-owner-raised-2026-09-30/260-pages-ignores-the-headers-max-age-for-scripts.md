- [x] 🔎 **Pages serves scripts with a four-hour cache, not `_headers`'
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

  🔎 **Narrowed 2026-10-01 by the `270` worker:** `faves.pages.dev` serves
  the same deploy with `_headers`' `max-age=0`; only `lets-eat.myspot.nz`
  answers `max-age=14400`. So the override is in the custom domain's
  Cloudflare zone, likely its Browser Cache TTL (inferred, not read).

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  🔎 **Cause read 2026-10-02 (`faves-4f`), read-only token.** The `myspot.nz`
  zone's **Browser Cache TTL is 14400** (four hours; `cache_level`
  aggressive). Cloudflare raises an origin `max-age` below that setting to
  it, which is exactly `max-age=0` becoming `14400` on `lets-eat.myspot.nz`
  while `faves.pages.dev` (no zone) keeps `max-age=0` (re-curled the same
  day). No cache rules and no response-header transforms exist in the zone.
  Page Rules could not be read (the endpoint refuses account-owned tokens), so
  one there is not excluded, but the setting matches the observed number
  exactly.

  **Options (a zone change is the owner's):** A, a Cache Rule scoped to
  hostname `lets-eat.myspot.nz` with Browser TTL "respect origin" (touches no
  other host); B, the zone-wide setting to "Respect Existing Headers" (every
  `myspot.nz` host; hosts that send no `Cache-Control` then get browser
  heuristics); C, leave it (the precache is protected by ADR 0149; a first
  visit within four hours of another can run older scripts). Recommended: A,
  done in the dashboard, so no token is minted or widened.

  ✅ **Closed 2026-10-02 (`faves-4f`): option A, applied.** The owner chose a
  minted token over doing it himself in the dashboard. A zone-scoped token
  (Cache Settings Write and Zone Read, `myspot.nz` only; recorded in the
  estate root's registry) created one Cache Rule: host `lets-eat.myspot.nz`,
  browser TTL "respect origin". Re-curled the same minute: `js/app.js`,
  `css/app.css`, `sw.js`, `/`, an icon and `data/summary.json` all answer
  `max-age=0, must-revalidate`, as `faves.pages.dev` does. No other host is
  touched. 🚩 The estate's mint tool first left the token at all-zones scope
  (unused, a few minutes) before it was tightened by hand; that defect is
  filed in the estate root's own board.
