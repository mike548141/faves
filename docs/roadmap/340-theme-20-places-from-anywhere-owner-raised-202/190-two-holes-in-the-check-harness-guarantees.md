- [ ] 🚩 **Two of the harness guarantees CLAUDE.md states are not true — a
      THIRD failure shape it does not describe, and one check that never prints
      the tree line** `[S][tools]` — found 2026-09-07 (session faves-24) while
      building ADR 0091, and both were found the honest way: by a run that
      looked like a regression and was not.

  **(a) `picks_check.mjs` is flaky on the PRISTINE baseline, and its failure
  wears a shape CLAUDE.md does not list.** Building ADR 0091 produced
  `Error: #settings-btn has no clickable box`. The builder bisected — baseline
  plus the new `app.css` passed; baseline plus the new `menu.js`+`units.js`
  failed; baseline plus that `menu.js` with the new function **stubbed to
  return null** *also* failed — then ran the check in a detached worktree at the
  base commit `236b3b6` with **none** of the change present: **1 failure in 3
  runs.** On the branch: 1 pass in 3, same failure position (line 285). Not a
  regression.

  🛑 **The shape is the finding, not the flake.** CLAUDE.md describes exactly
  two outcomes — an assertion failure (`FAIL <name>`, exit 1) and a transport
  death (`HARNESS ERROR …`, exit 2) — and tells the reader to *believe the exit
  code*. This is neither: a plain `Error` thrown out of a click helper, exit
  **1**, and **no `FAIL` line at all**. Following the documented rule, a reader
  classifies it as a real site regression. One did, for a while. This is the
  same family as the flake-impersonating-a-regression problem the repo already
  paid to diagnose, one layer down: `need()` fixed *dereferences*, `160` is
  ruled for *waits*, and this is a third path — a helper that throws on
  geometry (`no clickable box`) rather than on absence.

  **(b) `geo_check.mjs` does not print the second indented tree line.** It
  hand-rolls its summary instead of calling `report.summary(SITE)`. CLAUDE.md
  says, in bold: *"**Every** check prints a SECOND, indented line naming the
  tree it served, that tree's `SHELL_VERSION`, and its `branch@sha`. Read it."*
  That sentence is **false for one of fifteen**.

  🔑 **Why (b) matters more than a missing line usually would.** That line is
  not decoration — it is the mechanism installed after a session's shell cwd
  drifted out of its worktree and its verification ran green against a tree
  without the change. Everything green, everything meaningless. The rule exists
  *"so this is a mechanism and not a discipline"* — and a mechanism with a
  fifteenth hole in it is a discipline again, precisely on the check a session
  is least likely to re-run.

  📋 **Both are small and neither was fixed, on purpose** — they surfaced inside
  another item's build, and the repo's rule is that a finding is filed rather
  than folded into unrelated work. (a) wants a decision (is a geometry throw an
  assertion failure or a harness error? it interacts with `160`'s ruled split);
  (b) is a one-line change to call `report.summary(SITE)` and should ride with
  whatever next touches `geo_check`.
