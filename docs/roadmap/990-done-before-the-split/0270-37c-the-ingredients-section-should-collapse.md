- [x] **37c — the ingredients section should collapse** `[S][js][css]`.
      **CLAIMED 2026-08-16 13:55 UTC (wt: faves-recipe)** — the recipe-page pass.
      Owner:
      *"I should be able to collapse or hide the ingredients section"*. Once
      everything is in the bowl the list is a wall of struck-through text
      between the reader and the method. Use the house pattern — native
      `<details>/<summary>`, as `addons-ui.js` already does — open by default.
      ✅ **RULED 2026-08-16: remember it for ALL recipes** — one profile-scoped
      preference, not one per recipe. Collapse once and every recipe opens
      collapsed until you expand one. 🚩 The cost he accepted: opening an
      *unfamiliar* recipe then hides the ingredients you have not bought yet.
      If that bites, the fix is per-recipe state, not abandoning persistence.
