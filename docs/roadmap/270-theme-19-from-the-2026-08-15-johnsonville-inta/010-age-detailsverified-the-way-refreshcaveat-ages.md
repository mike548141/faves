- [ ] **Age `detailsVerified` the way `refreshCaveat` ages `verified`** `[S][js]`
  — today a venue whose details are stale and one whose details were never
  checked both render the same (the note simply omits them).
  🔎 **Measured 2026-08-16, and the stated reason for deferring it was wrong.**
  Not "too few records": **26 of 55 carry the field (47%)**, which is not thin.
  The real blocker is that **every one of those 26 dates lands inside a single
  48-hour window** — this repo's own intake — so there is **zero temporal
  spread** and **zero records currently in the "checked but stale" state**.
  🛑 **STALE — DO NOT ACT ON THIS PARAGRAPH; see the re-measurement at the foot
  of this item (2026-09-09).** The coverage figure is now 32 of 57, and the
  *"single 48-hour window / zero temporal spread"* claim is **false**: there are
  4 distinct dates over 23 days. Only the last clause — zero records in the
  *"checked but stale"* state — still measures true.
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

  ## 📏 RE-MEASURED 2026-09-09 — the coverage figure moved and **the stated
  blocker is half dead**

  Both halves re-run against the corpus at this commit, not inherited.

  | Claim, as written 2026-08-16 | Measured 2026-09-09 | Verdict |
  |---|---|---|
  | 26 of 55 carry the field (47%) | **32 of 57 (56%)** | ⚠️ stale; premise is *weaker* still |
  | every date inside a **single 48-hour window** | **4 distinct dates spanning 23 days** | ❌ **false — this is the blocker** |
  | **zero temporal spread** | 2026-08-15 · 2026-08-16 · 2026-09-01 · 2026-09-07 | ❌ **false** |
  | zero records in the *"checked but stale"* state | **still zero** | ✅ **survives** |

  Counts by date: `2026-08-15` ×8, `2026-08-16` ×17, `2026-09-01` ×1,
  `2026-09-07` ×6.

  🛑 **THIS CHANGES WHAT THE ITEM IS WAITING FOR, so read the two halves apart.**
  The item gave one blocker with two limbs and they have not aged together:
  - **"Zero temporal spread" is simply no longer true.** There are four
    readings across 23 days, from three separate intakes — the original
    Johnsonville batch, one on 2026-09-01, and six on 2026-09-07. The
    *single-window* framing describes a corpus that stopped existing weeks ago.
  - **"Nothing to test a threshold against" survives, but for a different
    reason than the one written down.** `temporal.js:202` sets
    `VERIFY_MAX_AGE_MONTHS = 12`. The oldest `detailsVerified` in the corpus is
    2026-08-15 — **25 days old**. So no record is anywhere near a 12-month
    bound, and building the ageing today would still change nothing on any
    screen. The obstacle is not *absence of spread*; it is that **23 days of
    spread cannot exercise a 12-month threshold**, and it never will until
    either the corpus ages by roughly a year or the threshold is set to
    something a month-old corpus can reach.
  🔑 **Said plainly: the item's conclusion still holds, and its stated reason no
  longer does.** That distinction is exactly the shape this repo has been
  bitten by — a wrong reason is how a rule gets argued away later by whoever
  checks it. Anyone re-reading *"every one lands inside a single 48-hour
  window"*, measuring it, and finding it false could reasonably conclude the
  whole deferral was unfounded and go and build it. It is not unfounded; it is
  mis-stated.

  🎯 **THE OWNER QUESTION IS STILL LIVE, AND IT IS NOW SHARPER (2026-09-09).**
  Unchanged in substance: *how fast do a venue's phone, address and hours
  actually drift?* — a domain estimate only he can give, the way he ruled the
  method-trust split in ADR 0036. What the re-measurement adds is that
  **"resolve it by waiting" is a ~12-month wait**, not a short one, so the
  wait-it-out option is materially worse than it looked when this was written.
  The second reason above — that *"details"* bundles slow-drifting phone and
  address with seasonally-drifting hours under one decay rate — is untouched by
  the re-measurement and still stands.
  🛑 **The bracket stays `- [ ]`.** Nothing is built and this pass built
  nothing; only the account of why is now true.
