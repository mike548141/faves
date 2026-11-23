- [x] 🔎 **`chatty_check`'s three install budgets are red on `main`, and were
      before 2026-11-23** `[S][tools]` — found 2026-11-23 by queue run
      f9ee6733 while re-measuring `220`.

  (claimed 2026-11-23-1522, session f9ee6733, primary checkout)

  `node tools/chatty_check.mjs --no-probe`, same machine, same hour:

  | Row | Budget | At `31b7ba20` (run start) | At `dadd7d89` | Run's share |
  |---|---|---|---|---|
  | cold install: requests | 296 | 305 | 313 | +8 |
  | cold install: gzip-6 | 1200 KB | 1213 KB | 1231 KB | +18 KB |
  | update install: requests | 127 | 128 | 132 | +4 |

  **The run's share is accounted for:** four new shell files (`system-events.js`
  for `390/030`, `activity-view.js` and `activity-ui.js` for `390/020`,
  `cooking-units.js` for `260/010`), 126 → 130 `SHELL` entries; each is one
  more update request, and the home page imports one of them. **The rest is
  not:** +9 requests and +13 KB were already over at the run's start, from
  commits after the budgets were last set (2026-10-18). Nothing runs this check
  but a person typing it, which is how it went red unseen.
  **The work:** find what grew between the last re-baseline and `31b7ba20`
  (the comment block above `BUDGETS` says how each was set), then either
  re-baseline with every increment attributed, as that block requires, or
  shrink what grew. Not loosened here: half the overrun is unexplained.

  ✅ **Done 2026-11-23 (queue run f9ee6733): every increment attributed, then
  re-baselined.** The part before the run is content, not a regression: eight
  venues added since the budgets were set on 2026-10-18 (`2d002f9b`; 58 → 66
  menu files, each precached) and one SHELL entry, `js/photo-viewer.js`
  (125 → 126). That is +9 cold requests exactly and the +1 update request.
  The run's four SHELL entries are above. Budgets: `coldReq` 296 → 313,
  `coldGz` 1200 → 1236 (measured 1231 + 5 KB, the 2026-10-18 margin),
  `updReq` 127 → 132, each with its reasons in the comment above `BUDGETS`.
  The home page's share of the run's +8 cold requests is inferred from the
  count, not traced request by request, and the comment says so. Re-run on
  `main` at `123e5499` with the break-probes: **45 passed, 0 failed**.

