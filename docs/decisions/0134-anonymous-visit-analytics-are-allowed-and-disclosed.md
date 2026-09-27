# 0134 — Anonymous visit analytics are allowed, and the site says so

**Status:** accepted
**Date:** 2026-09-28
**Supersedes:** the "no analytics" half of the privacy goal
[0001](0001-zero-build-vanilla.md) cites under *Rejected* — the zero-build and
no-CDN-library decision itself stands untouched · **Owner-ruled:** 2026-09-28

## Context

Asked what would tell him about uptake, the answer from the repo was "nothing,
deliberately": the About screen, the footer, `SECURITY.md` and
`ARCHITECTURE.md` all said *no analytics, no tracking, no third-party
scripts*.

Pulling Cloudflare's own data (read-only estate credential) to answer the
question anyway found that **the promise was already false**. Cloudflare Web
Analytics was switched on zone-wide for `myspot.nz` on 2025-10-20 — before
Faves existed — with *automatic install*, so Cloudflare injects
`static.cloudflareinsights.com/beacon.min.js` into every HTML response it
serves a browser. Verified 2026-09-28 by fetching the live page with a
browser user agent; a plain `curl` does not get the script, which is why
nobody had seen it. The site sets no Content-Security-Policy, so the script
runs. Nothing in the repo mentioned it.

Put to the owner with three options (exclude this hostname, disclose it, or
turn it off zone-wide), he ruled:

> *"keep it and disclose it. I am ok with having analytics for web usage,
> security, cost management etc. There is a difference between tracking a
> devices location, or collecting personal info, and recording when someone
> uses my web services"*

## Decision

1. **Recording that the site is used is allowed.** Cloudflare's cookie-free
   Web Analytics beacon and Cloudflare's ordinary edge request logs may run
   on Faves, for usage, security and cost management.
2. **What stays forbidden is unchanged:** no accounts, no cookies, no personal
   information, and a device's location never leaves the device. No analytics
   of our own is written into `site/` — the beacon is Cloudflare's, injected
   at the edge, and `site/` still makes no request of its own to anyone but us.
3. **The site says so where the promise is made** — the footer, the About
   dialog, and `SECURITY.md` — in plain words, including that the host sees
   each request as any web host does.

## Consequences

- The disclosure has to track reality, and **nothing enforces that**: the
  beacon is switched on and off in the Cloudflare dashboard, not in this repo,
  so a change there is invisible to every gate here. If the zone setting is
  ever turned off, the words are merely over-cautious; if anything *more* is
  added (Zaraz, a second analytics product, Logpush), the words must change
  first.
- **What the data can and cannot show (measured 2026-09-28):** the edge
  request logs keep 31 days on the Free plan, carry IP and user agent, and are
  what actually answered the uptake question. The beacon's data is sampled at
  about 1 in 10 page loads ("lite" mode) and held 9 events in 13 weeks — too
  thin to count individual visitors at today's volume. Neither can tell an
  installed home-screen app from a browser tab: iOS sends the same user agent
  for both, and the manifest and icons are fetched by the service worker's
  precache on every shell update anyway.
- The geolocation promise ("your location never leaves your device") is
  unaffected: the beacon does not read location, and Cloudflare's
  country-from-IP is not the device's location.
- Roadmap `010/020` (how we will know when URLs must stop breaking) now has a
  real signal to point at; that item's ruling is still the owner's.
