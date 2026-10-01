# 0149 — The first install revalidates the shell rather than re-downloading it

**Status:** accepted (owner-ruled 2026-10-01, `faves-55`: "yes, gated").
Built by roadmap `510/170`.
**Date:** 2026-10-01
**Supersedes, in part:** [ADR 0056](0056-a-precache-must-not-read-the-browsers-cache.md) <!-- wrapscan:allow: a link target cannot wrap -->
decision 1, "`sw.js` precaches with `cache: \"reload\"` on every asset". On a
**first** install the shell is fetched with `cache: "no-cache"`. Everything
else in 0056 stands, including `reload` for every update install and every
data file.

## Context

The 2026-10-01 survey (`docs/reviews/2026-10-01-0418-chatty-app-survey.md`,
finding 3) measured a first visit downloading about 40% of the app twice. The
page loads most of the shell, then the install fetches all of it again with
`cache: "reload"`, which ignores the browser's cache by design.

`reload` was ADR 0056's answer to the 2026-08-16 incident. Pages served
`js/*` with four hours of `max-age`, a plain `fetch()` let the browser's cache
answer, and a renamed shell cache was refilled with the previous deploy's
`app.js`. `no-cache` is the other mode that never uses a stored copy on its
own say-so: it sends a conditional request, and uses the stored copy only
when the **server** answers 304. The owner's gate: ship it only if a
reproduction of that incident still fails safe with the change in.

## Evidence

`tools/precache_check.mjs` section 4 reproduces the incident on a server that
sends the caching headers Pages sends today (`startPagesServer` in
`tools/lib/browser.mjs`: four hours on `js/` and `css/`, ETags, bodiless
304s). Deploy A installs, then deploy B changes `app.js` and `SHELL_VERSION`.
It runs as an update (the incident itself) and as a first install over a
browser cache left by an earlier visit with no worker.

| Install mode | Update holds | First install holds | `app.js` was asked |
|---|---|---|---|
| plain `fetch()` (`default`) | **A** (old) | **A** | never: the cache answered |
| `reload` | B | B | unconditional, 200 |
| `no-cache` | B | B | conditional, 200; unchanged files 304 |
| shipped worker | B (`reload`) | B (`no-cache`) | as above |

The `default` row is **asserted** to hold A. If it ever stops, the harness can
no longer see the incident and the other rows prove nothing. Two break-probes
were run on 2026-10-01. Serving `max-age=0` makes that assertion fail. A
shipped `FIRST_INSTALL_FETCH` of `default` makes the shipped-worker rows fail.
`tests/sw-precache-guard.test.js` pins both modes in the source.

Live headers, curl'd 2026-10-01: `js/app.js`, `js/sw-register.js`,
`css/app.css`, `sw.js` and `icons/icon-192.png` are served
`public, max-age=14400, must-revalidate`. HTML,
`data/*.json` and the web manifest get `max-age=0`. A matching
`If-None-Match` is answered 304, strong or `W/`. The ETag is 32 hex digits
and is not the MD5 of the bytes. That it is content-derived is **inferred**:
no deploy was watched changing it.

## Decision

1. **A first install fetches the shell with `cache: "no-cache"`**
   (`FIRST_INSTALL_FETCH`). "First" means no active worker on this origin.
2. **An update install keeps `reload`.** The ruling covered the first install.
   The reproduction shows `no-cache` is equally safe on an update (106 of 107
   shell files came back 304), so that is a separate question for the owner,
   not a by-product of this one.
3. **Data keeps `reload` everywhere.** Its `?h=` URLs are never in the page's
   cache, so revalidating would save nothing, and every data file is already
   hash-checked (ADR 0147).

## Rejected

- **`no-cache` for every install now.** It is the bigger saving and the
  evidence covers it, but it is not what was ruled.
- **Leaving `reload`.** Correct, and it pays ~470 KB gzip on every first visit
  for no added safety: the reproduction shows no case where `reload` holds the
  current bytes and `no-cache` does not.
- **Plain `fetch()` with `_headers` alone.** The 2026-10-01 curl shows `_headers`
  is not what the browser gets for `js/` and `css/` (below), and the
  reproduction shows plain `fetch()` holding the old deploy.

## Consequences

- **A first visit: 268 requests, 1,542 KB → 1,072 KB gzip** (5,747 → 4,461 KB
  raw). Measured by `tools/chatty_check.mjs` on the Pages-headers instrument,
  3 runs agreed after and 2 before. The request count does not move: in
  `precache_check`'s first-install run, 87 of the shell's 107 requests came
  back as bodiless 304s.
- 🔑 **`no-cache` is exactly as safe as the server's validator.** If Pages ever
  answered 304 for bytes that had changed, this mode would keep the old copy
  and `reload` would not. Nothing observed suggests it does. The same edge
  answers both modes, so a stale edge would fool `reload` too.
- 🚩 **ADR 0056's second half is not live.** Its `_headers` asks `max-age=0` on
  `js/`, `css/` and `sw.js`. Pages serves the files sampled there, and an
  icon, with `max-age=14400` (curl'd 2026-10-01). Data, HTML and the web manifest get
  `max-age=0` as asked. So a first visit within four hours of an earlier one
  can still run the **page** on a previous deploy's scripts, the skew 0056
  meant `_headers` to prevent. The precache is protected either way (above).
  Which Cloudflare setting overrides it is not established; that needs the
  zone's configuration, and is an item for the owner, not part of this one.
- `tools/chatty_check.mjs`'s wire scenario now runs on the Pages-headers
  server, so its cold-install and warm-bytes rows can see a 304. A warm home
  load's `sw.js` update check reads 0 B there (a 304), where the no-store
  server read the whole file.
