- [~] **A `chatty_check` tool with asserted budgets** `[S] [tools]` — from the
      `130` survey
      (session `faves-55`, 2026-10-01), its proposal **L**.

  The survey's numbers came from throwaway probes, so they cannot be
  re-derived. A browser check with fixed scenarios and budgets (requests per
  install, load and heart; KV ops per pull and heart; DOM changes per heart)
  keeps them from drifting back. Build it first, so every other fix here has a
  before and an after.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal L.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ **Built 2026-10-01 (`510-tool`).** `tools/chatty_check.mjs` (~3.5 min,
  `--only wire|hint|sync` for one scenario). Measured on unmodified main
  `3f57a7f`; each budget is that value plus a stated margin and names the item
  that should lower it. Today's numbers:
  cold install 269 requests / 1,547 KB gzip; warm home 2 requests (catalogue +
  the `sw.js` update check); menu open 1; open menu idle 0 timers, 0 mutations;
  per page load 6 `setItem` + 6 `removeItem` + 12 cross-tab events; heart 796,
  un-heart 795, rating step 2,387 DOM mutations on the 264-dish menu; hidden
  home 6 mutations / 2 timers; sync (no recipes) first sync 3 requests 26 R 1 W,
  page-load pull 1 request 9 R 0 W, heart 3 requests 26 R 1 W, a second tab
  adds one pull. The survey's figures reproduce. Two break-probes fail their
  budgets every run. **To tighten when the sibling items merge:** `140` pull R
  10 → ~2, heart R 29 → ~4, first-sync R 29 → ~4; `150` heart 877 / un-heart
  875 / rating 2626 → a few dozen; `190` pull `setItem` 3 → 1; `210` second-tab
  pull 2 → 0; `160`/`180` warm and menu requests 3/2 → 1/1 (and idle 2 → 0);
  `170` cold install 296 req / 1,702 KB → ~210 / ~1,070.
