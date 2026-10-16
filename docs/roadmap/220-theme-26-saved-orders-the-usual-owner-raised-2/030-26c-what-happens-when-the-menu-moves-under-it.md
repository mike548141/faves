- [x] **26c — What happens when the menu moves under it** `[M]` 🚩 **the real
  design problem.** A saved order references dishes and prices that a refresh
  can change, rename or remove — and `renames.js` already exists precisely
  because ids move. So recall has to answer honestly: *this dish is $2 dearer
  than when you saved it*, *this dish is gone*. Silently recalling a stale price
  into the tally would make the app lie about the total, which is the one thing
  the price work has been careful never to do. Model it on the refresh caveat
  (ADR 0036): say what changed, let the reader decide.

  ✅ **Done 2026-10-16 (faves-11 worker).** Measured first: ADR 0154 already
  resolved every id against the live record (so the sheet is never given a stale
  price) and `planRecall` already reported gone dishes, gone options, caps and
  compulsory choices. The one thing missing was the price-change message, and the
  snapshot it needs *is* stored: each saved line keeps its configured unit price
  (`price`, null when the dish had none) and each option's price. `planRecall` now
  also returns `changed: [{ name, qty, was, now, text }]`, and the venue-page
  panel lists it under "Prices have changed since you saved this:" — "now $16.50
  each, was $14.50 when you saved it (up $2)", in words, a fall as well as a rise,
  money through `formatMoney` in the venue's currency. Fail quiet: no numeric
  snapshot, a different currency, a skipped line, or an unfinished line (its live
  price lacks the compulsory choice not yet made) produce no claim. A dish that
  has since lost its price is said too ("no price listed now"). Compared in whole
  cents. Verified: `node --test` 1871/1871, `boot_check` 38/38, `addon_check` (read-only
  run; it drives recall) 146/146, `check_versions --range` / `check_precache` /
  `check_decisions` clean; 7 new unit tests in
  `tests/saved-orders.test.js` incl. pre-snapshot and a price decrease, two
  break-probes (a missing snapshot read as 0; unfinished lines compared) each
  fail exactly the test written for them. A browser run of the real recall on
  daily-bakery (rise, fall, unchanged, pre-snapshot) passed 4/4 from a scratch
  driver. 🚩 **Not committed as a check:** the right home for a permanent browser
  assertion is `tools/addon_check.mjs` section (w), which another worker's open PR
  owns; owed there: seed a line with `price` below/above the live one and assert
  `.saved-changed li` text and that the tally holds the live price.
  The reo queue has no saved-orders family (26a's strings were never queued), so
  none was added.
