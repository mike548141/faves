# 0100 — What the service worker's install can actually see on Cloudflare Pages

**Status:** accepted
**Date:** 2026-09-08
**Amends:** [0015](0015-split-precache-versioning.md) — the split precache
gains a second admission test and a second lookup key · no change to
[0027](0027-pwa-update-flow.md)'s waiting worker

## Context

`site/sw.js` builds its precache with a hand-written `!res.ok → throw`, the
guard that is supposed to stop a broken shell installing. The 2026-08-17 cold
review found it cannot fire on the platform this site is deployed to, and two
things beside it. All three were re-confirmed by curl against the live site on
2026-09-08.

**(a) A missing path is a 200.** Cloudflare Pages answers a path it does not
have with `index.html`:

    $ curl -sI https://lets-eat.myspot.nz/js/this-file-does-not-exist.js
    HTTP/2 200
    content-type: text/html; charset=utf-8

So `res.ok` is true for a shell asset that is simply gone, and the home page is
precached under the missing file's URL. The guard passes on exactly the input it
exists to catch — the pattern of
[ADR 0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md),
in the most load-bearing place in the app.

**(b) Nothing checked the list against the tree.** That guard was the only thing
standing in for it, and it does not stand.

**(c) The URL a reader holds is not the URL we precache.** Pages 308-redirects
`/foo.html` → `/foo`:

    $ curl -sI 'https://lets-eat.myspot.nz/restaurant.html?id=mcdonalds'
    HTTP/2 308
    location: /restaurant?id=mcdonalds

The precache is keyed on `restaurant.html`, because that is the only name a
plain static file server has for the file and the site must run on one
([ADR 0001](0001-zero-build-vanilla.md)). `cache.match`'s `ignoreSearch` drops
the `?id=…` but not a missing extension, so `/restaurant?id=…` — the URL in the
address bar, the bookmark, the shared link — missed the shell cache and fell
through to the network. Offline, that throws. The deep link a reader is most
likely to have saved was the one route flight mode did not cover.

## Decision

**(a) The install refuses a non-HTML path answered as HTML.** A
`.js`/`.mjs`/`.css`/`.json`/`.webmanifest`/image URL returning `text/html` cannot
be the file we asked for. `servedAsHtmlStandIn(url, contentType)` decides it and
`requireAsset(url, res)` applies it alongside the existing `!res.ok` throw —
which is kept, not replaced. The rates file (`DATA_FX`) is refused a *cache
entry* but never rejects the install: a missing rates file already degrades to
each venue's own currency, and that is the correct fallback.

**The guard is deliberately one-way.** It fails only on a known non-HTML
extension answered as HTML; an unknown extension, an absent header or anything
else passes. Over-refusing here is unrecoverable — an install that rejects means
the new worker never activates and every installed phone holds the old shell
for good, with no notice and no way back. Under-refusing is what the new
repo-side gate covers before the push.

**(b) `tools/check_precache.py`.** Reads `SHELL`, `DATA_INDEX`/`DATA_FX` and the
menu-URL *template* out of `sw.js` with parsers that must re-emit what they read
byte for byte — the standard of
[ADR 0076](0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md).
It asserts every path exists under `site/`. Wired into CI's `repo
invariants` job with its own `--self-test`, because a completeness check
is satisfied by a parse that found nothing.

**(c) `cacheFirst` falls back to the HTML sibling.** On a miss, an extensionless
pathname is retried as `<path>.html` before the network. `/` needs nothing —
`"./"` is already in `SHELL`.

## Rejected

- **(a) Check `res.redirected`, or compare `res.url` to the request URL.** The
  obvious alternative, and it does not work: Pages' stand-in is a *direct* 200,
  not a redirect. Measured — no `location` header, `res.redirected === false`,
  `res.url` equal to the request URL. It would have shipped as a second
  decorative guard on top of the first.
- **(a) Sniff the body for `<!doctype html>`.** Reads the whole response before
  caching it, costs a clone of every asset at install, and is defeated by any
  future fallback page. The header already says it.
- **(a) Compare against an expected content type per extension.** Stricter, and
  strict is the wrong direction here: `js/app.js` is `application/javascript` on
  Pages and `text/javascript` from `tools/serve.py`, both correct. A table of
  acceptable types is a list to get wrong, and getting it wrong bricks installs.
- **(c) Precache `restaurant` and `recipe` as well as the `.html` paths.**
  Superficially simplest, and it breaks the site on a plain static file server:
  those paths 404 there, so with (a) in force the install would reject
  everywhere but Pages. It also doubles the transfer for two HTML files.
- **(c) A `_redirects` rule making `/restaurant` serve the file directly.** Fixes
  the online URL and does nothing offline, which is where the fault is: the
  service worker answers before any Pages rule is consulted.
- **(c) Rewrite every link to the extensionless form.** Same static-server
  objection as above, and it would strand every link already shared.

## Consequences

- The install can now reject on a Pages deploy — the state (a) made impossible.
  A rejected install leaves the old worker in place and the old shell serving,
  which is the correct failure: stale beats broken.
- `tools/precache_check.mjs` drives all of this in a real browser: a shell asset
  served as HTML rejects the install and leaves no ready cache; a correct deploy
  still installs; and the extensionless deep link opens offline. Break-probed —
  removing (a)'s content-type half makes the broken deploy install cleanly, and
  removing (c)'s sibling lookup leaves the offline navigation on Chrome's own
  error page.
- 🚩 **Offline in that check is the server being stopped, not CDP's
  `offline:true`.** The first version used `Network.emulateNetworkConditions` on
  the page session, and the tool's own control caught it doing nothing: a
  controlled page's requests are the *service worker's*, and the worker is a
  separate target the page session's emulation never reaches. Every assertion
  would have passed against a fully online browser.
- 🚩 **None of this is evidence about Cloudflare Pages.** The content types and
  the 308 are frozen here as fixtures from one day's curl. If Pages changes what
  it serves, the tests stay green and the guard stops matching reality. Re-curl
  before trusting this record as current.
- `tools/lib/browser.mjs`'s overlay now takes `{ body, type }` as well as a
  string, because a local static server cannot otherwise produce a `.js` URL
  answered as `text/html` — the type is derived from the name.
