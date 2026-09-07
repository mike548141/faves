- [x] 🚩 **The service worker's install guard is decorative on Pages, and
      one precache entry never matches** `[S][pwa]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). Three
      findings, one surface:
      ✅ **DELIVERED 2026-09-08 (session faves-o1)** — worktree
      `/Users/mike/worktrees/faves-o1-sw-install-guard`, branch
      `sw-install-guard`, ADR 0100. All three halves landed.
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

      **Re-confirmed against the live site, 2026-09-08** (all three, not taken
      on the review's word):

          $ curl -sI https://lets-eat.myspot.nz/js/this-file-does-not-exist.js
          HTTP/2 200
          content-type: text/html; charset=utf-8

          $ curl -sI 'https://lets-eat.myspot.nz/restaurant.html?id=mcdonalds'
          HTTP/2 308
          location: /restaurant?id=mcdonalds

      Every real precached asset carries its own type on Pages (`js/app.js` →
      `application/javascript`, `site.webmanifest` →
      `application/manifest+json`, `favicon.ico` →
      `image/vnd.microsoft.icon`), which is what makes the content type a safe
      signal rather than a way to brick installs.

      **(b) first, because it is the mechanism.** `tools/check_precache.py`
      reads `SHELL`, `DATA_INDEX`/`DATA_FX` and the menu-URL **template** out
      of `sw.js` with parsers that must re-emit what they read byte for byte
      (ADR 0076), and asserts every path exists under `site/`. Wired into
      CLAUDE.md's verify list and into CI's `repo invariants` job, with its own
      `--self-test` beside it. Break-probe, verbatim:

          --- BREAK-PROBE: add a phantom path to SHELL ---
          ✗ the service worker precaches paths that do not exist — 1 finding(s):
            SHELL: 'js/phantom-break-probe.js' → no file at
            site/js/phantom-break-probe.js
          exit=1
          --- after revert ---
          ✓ every precached path exists — 96 shell file(s), 2 data file(s),
          57 menu(s).
          exit=0

      **(a) the predicate chosen, and the one rejected.** The honest signal is
      the CONTENT TYPE: a non-HTML extension answered as `text/html` cannot be
      the file we asked for. Checking `res.redirected` or comparing `res.url`
      was rejected **on measurement** — Pages' stand-in is a direct 200, so
      both are unchanged, and it would have shipped a second decorative guard
      on the first. The predicate is deliberately one-way (unknown extension,
      absent header ⇒ pass), because over-refusing means the new worker never
      installs and every phone holds the old shell for good.

      **Unit-tested as a pure function, and NOT by copying it.** `sw.js` is a
      classic worker — `self.addEventListener` at module scope, so Node cannot
      import it, and it cannot import a helper module either without making the
      shipped registration `{type:"module"}`. So
      `tests/sw-precache-guard.test.js` extracts the two predicates from the
      shipped bytes and runs them: 29 assertions, including a sweep of the real
      `SHELL` and every "must NOT refuse" content type measured above.

      **(c)** `cacheFirst` retries an extensionless pathname as `<path>.html`
      before the network. Precaching `restaurant`/`recipe` as well was rejected:
      those 404 on a plain static file server, which the site must run on
      (ADR 0001) — with (a) in force the install would then reject everywhere
      but Pages.

      **Proved in a real browser.** `tools/precache_check.mjs`, 7 assertions:
      a shell asset served as HTML rejects the install and leaves no ready
      cache; a correct deploy still installs (the control that catches a guard
      broken into refusing everything); and the extensionless deep link opens
      offline with that venue's menu on it. Break-probed both halves — removing
      (a)'s content-type check makes the broken deploy install cleanly
      (`installing worker ended: activated`, ready cache present, 2 assertions
      fail); removing (c)'s sibling lookup leaves the navigation on Chrome's
      own error page (2 assertions fail, nothing else moves).

      🚩 **What the browser check cannot show.** The harness serves `site/`
      with a plain static server: it does not 308 and does not answer a missing
      path with 200, so the Pages behaviour is STAGED — an overlay whose
      content type is the fixture. Only the curl above is evidence about Pages,
      and it is a snapshot of one day. Chrome only; nothing here about Safari.

      🚩 **Offline in that check is the SERVER BEING STOPPED, not CDP's
      `offline:true`.** The first version used
      `Network.emulateNetworkConditions` on the page session and the tool's own
      control caught it doing nothing — a network-only `fetch()` still
      succeeded, because a controlled page's requests belong to the SERVICE
      WORKER, a separate target the page session's emulation never reaches.
      Every assertion after it would have passed against a fully online
      browser.

      🔎 **Found and left alone:** `docs/decisions/README.md` carried an
      unresolved merge conflict on `main` (`<<<<<<< HEAD` at line 1037) when
      this worktree was cut at `04d7fbb`; a peer fixed it at `f4a5958` before
      this branch rebased. The ADR allocator collided TWICE while this was in
      flight — `0098` went to PR #15 and `0099` to PR #16, both merged between
      this session's allocation and its push — so the record is `0100`.
      `SHELL_VERSION 2026-09-08.2` was taken by PR #15 in the same window;
      this is `2026-09-08.3`.
