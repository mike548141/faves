- [~] 🚩 **The branch picker is a FIFTH surface that disagrees about a closed
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
  1. ✅ *Engineering — SHIPPED 2026-08-19.* A venue-level closure now wins over
     every branch's posted hours. `branchSummary` and `branchBlock` state the
     closure once per branch **heading**; `hoursRow` prints no live chip while
     the venue is shut (the week's hours stay — they are the record of when it
     traded); `branchOpenStateOf` answers `closed` for every branch, so
     `leadBranch` no longer leads with one its timetable calls open. Sited on
     the heading rather than the hours row on evidence: the first fix hung the
     badge off `hoursRow`, which a branch with no captured hours never gets, so
     the **lead** row of an hours-less chain stayed silent while the header said
     "Permanently closed" — caught by the McDonald's fixture, not by reading.
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

  🔎 **The fault was LATENT, and this is why the guard needed a fixture.**
  Measured 2026-08-19: all 55 records carry `lifecycle.added` and **not one
  carries a `lifecycle.events` entry**, so no venue in the corpus is closed and
  the disagreement could not be seen on any real page. `branch_check.mjs` now
  serves three of the real chains back with one closure event injected
  (`startServer`'s new `overlay`, bytes only — the genuine venues are untouched
  and still checked as themselves in the same run). Time-independence is kept by
  the event being a decade old and never reopened. Three new assertions, all
  four halves of the fix break-probed separately, each failing only its own:
  restoring the hours chip fails 4, dropping the lead heading's badge fails 3,
  dropping `branchSummary`'s fails 5, dropping the `branchOpenStateOf` guard
  fails 1. The third fixture (`tj-katsu-lead-fixture`, branch 1 never open and
  branch 2 always open) exists because `branchOpenStateOf`'s change was
  **measured** to be covered by nothing otherwise — a run with it reverted was
  fully green.

  🚩 **STILL OWED, and both are the owner's:** decision (2) below, and `isGone`.
  The engineering fix deliberately gates on `isTrading` — the same predicate
  `closureBadge` already agrees with — so a temporary closure and a permanent
  one read alike on the branch card, exactly as they do on the header banner.
  It therefore found **no** natural use for `isGone`, which is left untouched:
  giving it one would be answering (2).

  🔎 **Also found and not fixed: `isGone` is dead code.** It is exported from
  `temporal.js`, has a unit test, and has **zero callers** anywhere in `site/`,
  `tools/` or `tests/`. `isTrading` does all the work. Either `isGone` names a
  distinction the app should be making — permanently closed reads differently
  from shut for a refit — or it should go. That is the same question as (2)
  wearing different clothes.

[ADR 0023]: ../../decisions/0023-time-dimension-in-the-data.md
[ADR 0054]: ../../decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md

  🔎 **Found while independently break-probing the merge, 2026-08-19 — small,
  and the exact shape this session spent the day on.** Removing the
  `!isTrading(r)` gate from `branchOpenStateOf` fails **one** assertion and
  only one, as reported. But the run's TOTAL moved: a clean run is
  `OK — 72 passed, 0 failed` (72 assertions) and the probed run is
  `FAILED — 72 passed, 1 failed` (**73**). So at least one assertion in
  `branch_check` is **conditional on the very state being probed** — it does
  not run when the lead branch behaves, and does run when it does not.
  That is not necessarily wrong: a fixture that leads differently can
  legitimately reach an extra check. It is worth writing down because a guard
  whose assertion count depends on the outcome cannot be verified by its count,
  and "N passed" is the one line everybody reads. Nobody has looked at which
  assertion it is; that is the next step, not a conclusion.

  ✅ **DECISION 2 RULED 2026-08-22 — CLOSURE BECOMES PER-BRANCH.** The owner
  took the schema change over the recommendation, which was to leave it
  venue-level for now on the grounds that no venue in the corpus is closed and
  the engineering half already stopped anything wrong appearing on screen. He
  chose the bigger job anyway, and the reason the item gave for it is the one
  that holds: leaving closure venue-level means **a shut branch can only be
  recorded by deleting it**, which destroys the record that it ever traded —
  the exact loss [ADR 0023] exists to prevent.

  📋 **What this now owes, and it is a real piece of work — `[L]`, not `[S]`.**
  1. A per-branch `lifecycle` (or equivalent) in the venue schema, with
     `validate.py` teaching, and `docs/ARCHITECTURE.md` updated.
  2. The three functions changed on 2026-08-19 (`branchOpenStateOf`,
     `branchSummary`/`branchClosureBadge`, `hoursRow`) re-pointed at the
     **branch's** answer, **falling back to the venue's** — a venue-level
     closure must still shut every branch, or this becomes a regression.
  3. `branch_check` fixtures for the mixed case that is the whole point: one
     branch shut, the others trading. The current fixtures are all-or-nothing.
  4. `leadBranch` must never lead with a shut branch while an open one exists.
  5. ⚑ **It also settles `050`** (a shut chain saying *"Permanently closed"*
     eight times): once closure is per-branch the repeats stop being repeats,
     because each row is then saying something the header cannot. Do `050`
     **after** this, not before.

  🔎 **`isGone` is still dead code with zero callers, and this ruling is what
  gives it a possible job** — "permanently closed" reading differently from
  "shut for a refit" is a per-branch distinction now worth making. Decide it
  **inside** this work rather than as a separate tidy-up.
