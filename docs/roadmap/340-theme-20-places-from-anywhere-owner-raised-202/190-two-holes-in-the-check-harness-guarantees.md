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

  ⚠️ **UPDATE 2026-09-07 — (a)'s SHAPE HAS CHANGED, and the change is an
  improvement made by accident.** Re-observed after ADR 0093 landed, the same
  failure now reads:

  ```
  harness error: #settings-btn has no clickable box
  Error: #settings-btn has no clickable box
      at Object.click (tools/lib/browser.mjs:942)
      at async run (tools/picks_check.mjs:285)
  ```

  — i.e. it is now classified as a **harness error at exit 2**, not the "plain
  `Error`, exit **1**, no `FAIL` line" recorded below. ADR 0093 routed every
  tool's top-level catch through `exitFromError()`, whose fallback branch is
  exit 2, so an *unclassified* throw now lands there instead of wherever each
  tool's own catch used to put it. **The third shape is gone; the flake is
  not.** What remains open is the classification question — is a geometry
  throw a site claim or a harness claim? — and it is now a live question about
  `exitFromError`'s fallback rather than about one tool's stray catch.

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

  **(b) TWO checks never print the second indented tree line — `geo_check.mjs`
  and `served_check.mjs`.** Both hand-roll their summary instead of calling
  `report.summary(SITE)`. CLAUDE.md says, in bold: *"**Every** check prints a
  SECOND, indented line naming the tree it served, that tree's `SHELL_VERSION`,
  and its `branch@sha`. Read it."* That sentence is **false for two of
  fifteen**.

  🔎 **The count came from a sweep, not from the symptom.** The build that
  raised this found `geo_check` — the one it happened to run. Running all
  fourteen on the merged tree showed `served_check` doing the same thing, and
  `grep -L "summary(SITE)" tools/*_check.mjs` returns exactly those two and
  nothing else. Worth recording as method: *a symptom count proves a fault
  exists, never how many there are* — the enumeration is a different act from
  the observation, and here it doubled the answer.

  🔑 **Why (b) matters more than a missing line usually would.** That line is
  not decoration — it is the mechanism installed after a session's shell cwd
  drifted out of its worktree and its verification ran green against a tree
  without the change. Everything green, everything meaningless. The rule exists
  *"so this is a mechanism and not a discipline"* — and a mechanism with two
  holes in it is a discipline again, on exactly the checks a session is least
  likely to re-run.

  📋 **Both are small and neither was fixed, on purpose** — they surfaced inside
  another item's build, and the repo's rule is that a finding is filed rather
  than folded into unrelated work. (a) wants a decision (is a geometry throw an
  assertion failure or a harness error? it interacts with `160`'s ruled split);
  (b) is a one-line change per tool to call `report.summary(SITE)` and should
  ride with whatever next touches `geo_check` or `served_check`.
