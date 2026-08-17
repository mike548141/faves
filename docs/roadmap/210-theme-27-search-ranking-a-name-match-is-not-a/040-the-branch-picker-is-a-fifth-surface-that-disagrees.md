- [ ] 🚩 **The branch picker is a FIFTH surface that disagrees about a closed
  venue — and the schema cannot answer it yet** `[S][js][schema]` — found
  2026-08-17 while shipping `030`, and deliberately left rather than guessed at.

  `030` made ranking and "Open now" agree with the card badge and the dice. The
  branch picker did not move. `branchOpenStateOf` (`site/js/menu.js:291`),
  `branchSummary` (`menu.js:309`) and `hoursRow` (`menu.js:220`, called at
  `menu.js:266`) each read `openStatus(b.hours, …)` with **no closure
  precedence**. So a chain that has shut down renders **"Open" chips on every
  branch row**, and `leadBranch` still leads with one — **inside a page whose own
  header already carries the "Permanently closed" banner.** One screen, two
  answers, and the wrong one is the actionable-looking one.

  🛑 **Why this was not fixed with `030`: the schema has no per-branch
  `lifecycle`.** Closure is a venue-level fold (`lifecycle.events[]` →
  `record.closure`, `site/js/temporal.js:558`). So "is this branch shut down?"
  is not a question the data can answer, and the honest fix depends on a design
  call that has not been made:

  🎯 **Two decisions, and the second is the owner's.**
  1. *Engineering:* until per-branch closure exists, a venue-level closure should
     plainly win over every branch's posted hours — that much is answerable now
     and is a small change to the three functions above.
  2. ⚑ *Owner's:* **should closure be per-branch at all?** It is the realistic
     case — one branch of a chain shuts while the others trade — and this repo
     already holds chains where branches differ (hours on some, none on others).
     Making it per-branch is a schema change plus a corpus pass; leaving it
     venue-level means a shut branch can only be recorded by removing it, which
     destroys the record that it existed — the exact thing [ADR 0023] exists to
     prevent.

  ⚠️ **Guarded by `branch_check.mjs` and [ADR 0054]**, so whoever takes it should
  read both first: the branch card makes the "where does your food come from"
  choice for the reader, and its assertions are deliberately time-independent.
  A closed-branch assertion has to stay time-independent too.

  🔎 **Also found and not fixed: `isGone` is dead code.** It is exported from
  `temporal.js`, has a unit test, and has **zero callers** anywhere in `site/`,
  `tools/` or `tests/`. `isTrading` does all the work. Either `isGone` names a
  distinction the app should be making — permanently closed reads differently
  from shut for a refit — or it should go. That is the same question as (2)
  wearing different clothes.

[ADR 0023]: ../../decisions/0023-time-dimension-in-the-data.md
[ADR 0054]: ../../decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md
