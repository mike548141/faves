- [ ] **Age `detailsVerified` the way `refreshCaveat` ages `verified`** `[S][js]`
  — today a venue whose details are stale and one whose details were never
  checked both render the same (the note simply omits them).
  🔎 **Measured 2026-08-16, and the stated reason for deferring it was wrong.**
  Not "too few records": **26 of 55 carry the field (47%)**, which is not thin.
  The real blocker is that **every one of those 26 dates lands inside a single
  48-hour window** — this repo's own intake — so there is **zero temporal
  spread** and **zero records currently in the "checked but stale" state**.
  Building it today would change nothing on any screen, and there is nothing to
  test a candidate threshold against. `refreshCaveat`'s own
  `VERIFY_MAX_AGE_MONTHS = 12` was never derived from the corpus either; ADR 0036
  states it as a house default from domain reasoning and flags it as the part of
  that ADR most open to being overruled.
  🚩 **And a second reason nobody had named:** "details" bundles phone and
  address (which rarely change) with opening hours (which change seasonally).
  One decay rate for both is the same "guesses dressed as precision" that ADR
  0036 rejected, one level down. The per-branch provenance item below is the
  same fault seen from another angle.
  🎯 **So this does not resolve by more intake — it resolves by waiting, or by
  an owner-supplied domain estimate** of how fast a venue's phone, address and
  hours actually drift, the way he ruled on the method-trust split in ADR 0036.
  Claim released; nothing built, deliberately.
