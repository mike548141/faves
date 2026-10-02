- [ ] ⏳ **Remove the `services` → `orderMode` bridge, on or after 2026-10-16**
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
