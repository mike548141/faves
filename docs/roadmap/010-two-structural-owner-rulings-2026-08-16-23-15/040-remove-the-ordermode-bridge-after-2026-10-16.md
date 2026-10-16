- [x] **Remove the `services` → `orderMode` bridge, on or after 2026-10-16**
  `[XS][js][tools]` — filed 2026-10-02 (`faves-77`), from `010`.

  `010`'s rename shipped a two-sided, one-release bridge so a phone caught
  between versions keeps its Dining filter: `tools/gen_summaries.mjs` mirrors
  `orderMode` into `services` in `site/data/summary.json` (for an old shell
  on new data), and `site/js/data.js` `readOrderMode` maps a `services`-only
  summary record (for a new shell on old data). Both carry a `#!#` note.

  **The work:** delete `readOrderMode` and its call, its tests in
  `tests/data-loader.test.js`, and the generator mirror, together; rerun
  `node tools/gen_summaries.mjs`, bump `SHELL_VERSION`. The date is the
  worker's estimate of time enough for installed phones to update, not an
  owner ruling; a later date is harmless (one duplicated array per venue).

  ✅ **Done 2026-10-16 (`faves-11`).** `readOrderMode` and its call, its two
  tests, and the generator's `services` mirror are gone together; the
  summarise test now asserts the mirror's absence. `summary.json` regenerated
  (57 `services` arrays dropped), `SHELL_VERSION` `2026-10-16.1`. Verified:
  `node --test` 1845/1845, `validate.py`, `gen_summaries --check`,
  `check_versions`, `check_precache`, and `boot_check` 38, `fetch_check` 17,
  `filter_row_check` 25, `distance_check` 28, all against this worktree.
  `validate.py`'s refusal of `services` in a venue file stays: that is the
  permanent half, not the bridge.
