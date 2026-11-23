- [ ] ⏳ **Cold review owed: ADR 0170 and the recipe-quantity converter**
      `[M][review]` — filed 2026-11-23 at the landing of
      [`010`](010-18b-recipe-quantities.md) by queue run f9ee6733, whose
      worker built it, so neither may take the pass (`REVIEW.md` rule 4).
      ⏳ **Waits on the owner's Fable approval** (his standing ruling: no Fable
      work, reviews included, without it). No brief written yet.

  **What earns a review (REVIEW.md § calibrate to risk):**
  - **ADR 0170** forecloses alternatives a reader will live with: the US cup
    as 236.6 ml (not the 240 ml label cup), GB kept metric for cooking on a
    reading of CLDR 46 plus an unverified assumption about British recipes,
    and precision over familiarity (`2⅛ cups`, not `2 cups`).
  - **`site/js/cooking-units.js`** rewrites quantities a person cooks from; a
    wrong conversion is a silent failure on the plate. Its rounding (keep the
    author's figure within 3%, refuse past 8%) and the bracket rule (convert
    the other kind, drop the same kind) are the parts to read cold.
  - **Composition** with 17a's scaler, the people stepper, the shopping list's
    stale flag (ADR 0124) and cook mode.

  **Not owed, and why:** the `recipe_check` / `cook_check` timezone pin is a
  harness change those checks' own runs verify.
