- [x] **The first install revalidates rather than re-downloads** `[S]
      [pwa][sw]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **D**.

  Measured: a first visit downloads about 40% of the app twice (about 1,524 KB
  gzip in all, about 600 KB of it duplicated).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal D.

  🎯 **Owner ruling needed:** this touches ADR 0056's "never fill the store
  from the browser's cache". Check it against the 2026-08-16 incident's
  reproduction first.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): yes, gated.** Build it with an
  ADR that supersedes ADR 0056, and ship it only if the 2026-08-16
  stale-bytes reproduction still fails safe with the change in.
  📌 **Claimed 2026-10-01 (`faves-55`).**
  ✅ **Built 2026-10-01 (`faves-55` worker, branch `510-sw`), ADR 0149 —
  the gate PASSED.** `tools/precache_check.mjs` section 4 reproduces the
  2026-08-16 incident on a server sending Pages' real caching headers
  (`startPagesServer`): plain `fetch()` fills the new shell cache with the
  OLD `app.js` (asserted, both as an update and as a first install);
  `reload`, `no-cache` and the shipped worker all hold the current one, and
  `no-cache` is shown to revalidate (a conditional request for `app.js`
  answered 200; 87 of 107 shell files 304 on a first install). Break-probed
  twice: `max-age=0` headers ⇒ the "incident reproduces" assertion fails;
  a shipped `default` mode ⇒ the shipped-worker rows fail. So `site/sw.js`
  fetches the shell with `cache: "no-cache"` on a FIRST install only (no
  active worker); updates and data keep `reload`. Measured (`chatty_check`,
  wire scenario now on the Pages-headers server): first visit 268 requests,
  1,542 → 1,072 KB gzip (3 runs after, 2 before); budgets 295 req, 1,179 KB.
  🚩 Found on the way: live Pages serves `js/`, `css/`, `sw.js` and an icon
  with `max-age=14400`, so ADR 0056's `_headers` half is not in effect
  (curl'd 2026-10-01; see ADR 0149). Not fixed here: it needs the
  Cloudflare zone's configuration and an owner ruling.
  🎯 Open for the owner: the reproduction shows `no-cache` is equally safe
  on an UPDATE install (106 of 107 shell files 304), which would save most
  of the shell's download on every `SHELL_VERSION` bump. Not built: the
  ruling covered the first install.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #67), CI 8 of 8. The
  gate passed: `precache_check` §4 reproduces 2026-08-16 (plain `fetch()`
  keeps the old `app.js`) and `no-cache` comes out current. ADR 0149. A first
  visit is 1,542 → 1,072 KB gzip. Follow-ups filed: `260` (Pages ignores
  `_headers`' `max-age=0`) and `270` (`no-cache` for update installs, 🎯).
