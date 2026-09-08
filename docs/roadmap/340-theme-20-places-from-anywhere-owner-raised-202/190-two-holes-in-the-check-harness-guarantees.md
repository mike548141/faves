- [~] 🚩 **Two of the harness guarantees CLAUDE.md states are not true — a
      THIRD failure shape it does not describe, and one check that never prints
      the tree line** `[S][tools]` — found 2026-09-07 (session faves-24) while
      building ADR 0091, and both were found the honest way: by a run that
      looked like a regression and was not.

  🔒 **CLAIMED 2026-09-09 (session faves-o1, orchestrating)** — delivered by
  a sub-agent in its own worktree (`faves-o1-picks-flake`, branch
  `picks-flake`), landing by PR so CI runs before the merge.

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

  🔒 **PART (b) CLAIMED 2026-09-07 (session faves-b1); part (a) is NOT claimed
  and stays open** — (a) is a classification question about `exitFromError`'s
  fallback, not a fix, and it is one of the questions put to the owner this
  session. Re-verified before claiming:
  `grep -L "summary(SITE)" tools/*_check.mjs` still returns exactly
  `geo_check.mjs` and `served_check.mjs`, out of **15** checks.

  📋 **Both are small and neither was fixed, on purpose** — they surfaced inside
  another item's build, and the repo's rule is that a finding is filed rather
  than folded into unrelated work. (a) wants a decision (is a geometry throw an
  assertion failure or a harness error? it interacts with `160`'s ruled split);
  (b) is a one-line change per tool to call `report.summary(SITE)` and should
  ride with whatever next touches `geo_check` or `served_check`.

  ✅ **PART (b) DELIVERED 2026-09-07 (session faves-tree-line), part (a)
  UNTOUCHED and still open.** `tools/geo_check.mjs` and
  `tools/served_check.mjs` each hand-rolled their final summary; both now end
  with `report.summary(SITE)` — byte-identical in shape to the other checks
  that use their respective return convention (`return report.summary(SITE);`
  for `geo_check.mjs`, matching `to_top_check.mjs`/`picks_check.mjs`/etc.;
  `return report.summary(SITE) ? 0 : 1;` for `served_check.mjs`, matching the
  `exitFromError`-wired checks `cook_check.mjs`/`branch_check.mjs`/
  `device_check.mjs`/`sync_check.mjs`/`addon_check.mjs`). No change to
  `exitFromError` or to how errors are classified — that is (a), left alone.

  Re-swept after the fix: `grep -L "summary(SITE)" tools/*_check.mjs` now
  returns nothing (was exactly the same two files before). Also checked
  whether any check calls `report.summary(...)` with something other than
  `SITE` — `grep -n "report.summary(" tools/*_check.mjs | grep -v
  "summary(SITE)"` returns nothing, so no check was printing a tree line
  naming the wrong tree.

  Verbatim evidence, worktree `/Users/mike/worktrees/faves-tree-line`, branch
  `tree-line` at `b0fb27a` (this repo confirms it: `git rev-parse --short
  HEAD` → `b0fb27a`):

  ```
  $ node tools/geo_check.mjs
  ...
  OK — 22 passed, 0 failed
     tree /Users/mike/worktrees/faves-tree-line/site · shell 2026-09-07.7 · tree-line@b0fb27a

  $ node tools/served_check.mjs
  ...
  OK — 55 passed, 0 failed
     tree /Users/mike/worktrees/faves-tree-line/site · shell 2026-09-07.7 · tree-line@b0fb27a
  ```

  Regression checked the other thirteen were not disturbed: `node
  tools/boot_check.mjs` (OK — 24 passed, 0 failed) and `node
  tools/to_top_check.mjs` (OK — 64 passed, 0 failed), both printing the same
  tree line. Also ran the cheap gates: `python3 tools/check_no_deps.py` (zero-
  dependency invariant holds), `python3 tools/check_decisions.py` (92 records,
  clean), `python3 tools/validate.py` (57/57 restaurant files valid — only
  pre-existing, unrelated warnings), `python3 tools/check_versions.py --range
  origin/main..HEAD` ("Version lockstep not in scope: nothing under site/
  changed" — correct, this change is `tools/`-only, no `SHELL_VERSION`/
  `DATA_VERSION` bump owed), and `node --test` (1158/1158 pass).

  No CHANGELOG entry: this is developer tooling (the check harness), not a
  user-visible feature or fix in the shipped site.

  🔎 **THE FIX BOUGHT MORE THAN THE TREE LINE, and the delivering agent did not
  claim this — it was found reviewing the merge.** `report.summary()` opens with
  `if (transportBroken) abortAsHarnessError("the summary")`, whose own comment
  says why: *"A run that lost the browser between its final assertion and here
  would otherwise print a clean `OK — N passed, 0 failed` with a short N, which
  is the wrong-tree bug's twin: a green line nobody reads twice."* Both
  hand-rolled summaries went straight to `console.log`, **bypassing that gate**.
  So for these two checks the hole was not one missing line — it was that a
  `geo_check` or `served_check` run which lost its browser mid-way could print
  **`OK`** and exit **0**. That is a false GREEN, which is strictly worse than
  the false red this section is otherwise about, and neither the item nor
  CLAUDE.md knew it. Restoring the call closes it.
  🔑 **Method note worth keeping:** the item's framing ("a one-line change per
  tool") was accurate about the *edit* and wrong about the *stake*. A defect
  described by its diff size gets triaged by its diff size.

  📌 **CLAIM RELEASED 2026-09-07 (session faves-b1) — merged to `main` at
  `4ef7fd6`.** The item stays `- [ ]` because **(a) is still owed** and is
  unclaimed: it is the classification question — is a geometry throw a claim
  about the SITE or about the HARNESS? — and it is now a question about
  `exitFromError`'s fallback branch. 🔗 It should be decided **together with**
  [`200`](200-untilpresent-can-manufacture-a-false-regression-under-load.md),
  which the owner ruled this session (retry the whole check once): a retry
  changes what the fallback should do with a throw that a second run survives.
