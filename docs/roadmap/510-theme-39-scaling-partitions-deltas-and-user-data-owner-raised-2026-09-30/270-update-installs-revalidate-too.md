- [x] 🎯 **Should an update install revalidate too?** `[S] [pwa][sw]` —
      found 2026-10-01 by the `170` worker (session `faves-55`). **Waits on
      the owner:** his `170` ruling covered the first install only.

  `precache_check` §4 shows `cache: "no-cache"` equally safe for an update:
  106 of 107 files come back as 304 and the new cache holds the current
  bytes. That would save most of the shell download on every
  `SHELL_VERSION` bump, for every installed phone. It rests on Pages'
  ETag changing with the bytes, which is inferred, not watched across a
  real deploy, so the build should first record two deploys' ETags.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): yes, after an ETag check.**
  First show, against real deploys, that Pages' ETag changes when a file's
  bytes change and stays put when they don't. Then ship `no-cache` for
  update installs, with an ADR superseding the matching part of 0149.
  📌 **Claimed 2026-10-01 (`faves-55`).**
  ✅ **Built 2026-10-01 (`faves-55` worker, branch `510-270`, PR #74), ADR
  0150. The gate PASSED.** `tools/etag_survey.py` compared production with
  four earlier Pages deploys, each body checked against its commit. 968
  file pairs had the same bytes and the same ETag, 114 had different bytes
  and a different ETag, and **0** had different bytes with the same ETag.
  No ETag named two bodies. Production redeployed mid-survey: its 4 changed
  shell files got new ETags and its 104 unchanged ones kept theirs, and the
  pre-deploy `app.js` ETag then got a 200. Evidence:
  [the survey](../../reviews/2026-10-01-0838-pages-etag-across-deploys.md).
  `site/sw.js` now fetches the shell with `no-cache` on every install; data
  keeps `reload`. `precache_check` §4 asserts the update revalidates and holds
  the current `app.js`, break-probed twice. `chatty_check` gained an update
  scenario: one changed file, 621 → 66 KB gzip, 114 requests either way.
  🔎 For `260`: `faves.pages.dev` sends `_headers`' `max-age=0` for the same
  deploy, so the four hours come from the custom domain's zone.
  ⏳ After merge, re-run the survey on production (the review's last section).

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #74), ADR 0150. The
  post-merge ETag survey on the live site passed: 0 changed files kept an
  ETag. An update install is about 621 → 65 KB gzip.
