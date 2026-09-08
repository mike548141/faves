- [x] 🚩 **Two of the harness guarantees CLAUDE.md states are not true — a
      THIRD failure shape it does not describe, and one check that never prints
      the tree line** `[S][tools]` — found 2026-09-07 (session faves-24) while
      building ADR 0091, and both were found the honest way: by a run that
      looked like a regression and was not.

  ✅ **PART (a) DELIVERED 2026-09-09 (session faves-o1), and with (b) closed on
  2026-09-07 THE ITEM CLOSES.** ADR 0108; worktree `faves-o1-picks-flake`,
  branch `picks-flake`. Both halves of the item are now answered — the flake
  and the classification question it held open.

  🔑 **IT IS A HIT-TEST FAULT, AND EVERY EARLIER DIAGNOSIS WAS WRONG,
  INCLUDING THE ONE IN THIS FILE.** Not the new `menu.js` (the 2026-09-07
  bisect), not an animation (ADR 0101 disproved that itself), and **not a
  missing scroll** — `driver.click` has scrolled its target into view with
  `behavior: "instant"` since ADR 0101, and that scroll **works**. Measured
  inside the failing click on 2026-09-09:

  ```
  [trail #overflow-btn] settled@25.9ms f2 -> dispatch (350.0,-11.0)
  [{"f":0,"ms":0,"sy":0,"y":40,"w":48},{"f":1,"ms":11.2,"sy":51,"y":-11,"w":48},
   {"f":2,"ms":25.9,"sy":51,"y":-11,"w":48}]
  ```

  Frame 0: `scrollY 0`, the button's centre at viewport `y = 40` — reachable.
  **One animation frame later the page is at `scrollY 51` and the centre is at
  `y = -11`**, above the top of the screen. Two frames agree there, so ADR
  0101's settle loop calls it stable, and the click goes to **(350, −11)**.
  Nothing is at a negative coordinate, the ⋯ menu never opens, and the failure
  surfaces one line later as `#settings-btn has no clickable box` — **the wrong
  element, the wrong line and the wrong cause**, which is why this took three
  goes to diagnose. Pass or fail is decided by that one number: 23 (centre
  `+17`, lands) versus 51 or 79 (centre `−11` or `−39`, misses).

  🔎 **The page does not do it.** `window.scrollTo`,
  `Element.prototype.scrollIntoView` and `HTMLElement.prototype.focus` were
  monkey-patched across the whole sequence; the only entry recorded is the
  harness's own `scrollIntoView`, followed by a bare `SCROLL-EVENT`. Document
  height does not change and no toast appears or goes. It is one-shot and
  reproducible: from `scrollY 547`, `scrollTo(0)` lands at 0 and is at 51 next
  frame and stays — a *second* identical scroll from 51 lands at 0 and holds
  for twelve frames. ⚠️ **Scroll anchoring was the obvious answer and is ruled
  out** (`* { overflow-anchor: none !important }`: bounce unchanged). **The
  Chrome mechanism is NOT identified** and this note does not pretend it is.

  ❌ **NOT a product bug**, and the evidence says so rather than an opinion: no
  site scroll code runs at that moment, the header is not sticky, and the drift
  is 23–79 px on an 844 px viewport. A person sees where they land and taps.
  Only a program that reads a coordinate, waits, then dispatches at the
  remembered value can be caught by it.

  🎯 **FIXED AT THE HARNESS LAYER** (`tools/lib/browser.mjs`), not in
  `picks_check`: every `driver.click` in all seventeen tools is exposed to the
  same trap and only one had hit it. After the box settles, `elementFromPoint`
  answers the question ADR 0101 never asked — *will this click land?* A
  descendant counts (the `<span>` in a button bubbles); an ancestor does not.
  🛑 **Off-screen re-scrolls (3 goes, inside the ONE existing 2 s budget);
  covered FAILS ON THE SPOT and is never scrolled away from.** That split is
  the whole design: a control with something painted over it is exactly the
  defect `to_top_check` exists for, and a harness that scrolled until the
  overlay cleared would turn it green in seventeen tools at once. The run says
  which happened — `· 1 re-scrolled (worst 2 goes at #overflow-btn)`, **and the
  zero is printed too**, because a silently-scrolling harness is ADR 0072's
  decorative guard pointed the other way. `clickStats` is exported so a check
  can assert on it.

  ✅ **THE CLASSIFICATION QUESTION, ANSWERED.** *Is a geometry throw a claim
  about the SITE or the HARNESS?* **The site** — `UnreachableElementError` →
  `FAIL UNREACHABLE ELEMENT`, **exit 1**, not retried (the harness already
  scrolled and re-measured; what is left is the page, not the machine). Same
  reasoning `210/070` used for its neighbour. Two consequences: a click whose
  selector matches nothing now raises `MissingElementError` instead of a plain
  `Error` — that was landing on the fallback at **exit 2 with no `FAIL` line**,
  the exact shape this item filed; and **`exitFromError`'s fallback stays at
  exit 2 deliberately**, because an unclassified throw says nothing about the
  site. What changed is that no geometry or presence failure reaches it now.

  📊 **Paired, interleaved, ten each** — base is `efb7272`, this branch's own
  parent, so the change is the only variable. Zero orphan Chromes at every
  sample.

  | arm | failures | shape |
  |---|---|---|
  | base | **5 / 10** | `FAIL UNSTABLE ELEMENT — #settings-btn has no clickable box` |
  | branch | **1 / 10** | `FAIL UNREACHABLE ELEMENT — #overflow-btn is covered…` |

  ⚠️ **The machine was NOT quiet — 1-minute load ran 29–85 across it**, so
  those rates are load-inflated and are not the quiet-machine numbers. The
  direction is not in doubt: the base arm's five failures are all the
  documented fault and the branch had none of it. Quieter, the branch ran **41
  consecutive passes** (11 + 30) with the re-scroll firing and being reported.

  🚩 **One residual, unexplained.** The branch's single failure was a
  **covered** verdict on `#overflow-btn` — a shape nothing could see before
  this change. It did not reproduce in 30 later runs, and **what covered the
  button is not known: the message named it and the measuring loop truncated
  the line at 70 characters.** A self-inflicted loss of the one observation
  that mattered. The diagnostic now prints the coverer's `position` and
  `z-index`, so the next one is actionable. Whether it was a real overlay or a
  false positive of this check is **open**, and neither is claimed.

  ✅ **Break-probed both halves, verbatim.** Re-scroll capped at one go — 4 of
  6 runs, exit 1, and note it now names the RIGHT element:

  ```
  FAIL  UNREACHABLE ELEMENT — #overflow-btn could not be brought into the
  viewport: after 1 scrolls at it its centre is (350.0, -11.0) in a 390x844
  viewport (scrollY 51). A control that will not scroll into view is one a
  person cannot reach.
  ```

  And a fixed overlay laid over the page (exit 1, and it did **not** re-scroll
  to escape it):

  ```
  FAIL  UNREACHABLE ELEMENT — #overflow-btn is covered at its own centre: it
  settled to a 48.0x48.0 box, but a click at (350.0, 40.0) would land on
  #probe-overlay (fixed, z-index 99999) instead. Something is painted over a
  control this check presses, which is a tap a person would also miss.
  ```

  🔎 **Sweep — who else clicks a control that can scroll out of view?** Every
  harness click in all seventeen tools goes through `createDriver().click`
  (`cook_check`, `device_check` and `recipe_check` destructure it; `note_check`
  calls `d.click`), so **all of them are fixed by this one change**. All 17
  pass, and the other tools' **261 clicks** report `0 re-scrolled` with no
  reachability failure — evidence the strict ancestor rule breaks no existing
  call site. 🚩 Outside it sit **16 in-page `.click()` sites** — `boot_check`
  (8), `device_check` (2), `focus_check` (2), `sync_check` (2), `geo_check` (1),
  `filter_row_check` (1). `HTMLElement.click()` dispatches with no hit test, so
  they can never suffer this fault **and can never detect a covered control**.
  Listed, not changed: converting them would alter what they assert.

  🔗 Discharges what
  [`210/070`](../210-theme-27-search-ranking-a-name-match-is-not-a/070-the-harness-reads-geometry-while-it-is-still-animating.md)
  hoped and could not deliver — *"one fix could cover both"*. It took two, and
  the second one is this.

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
