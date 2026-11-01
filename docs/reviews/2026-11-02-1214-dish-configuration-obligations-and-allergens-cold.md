# Cold pass — dish configuration: obligations and allergens (refs-only)

**Status:** ACT 1 RUN — the cold pass ran on 2026-11-02 (verdict below the
divider; act 2, the sibling fold-in, follows once act 1 is committed).
Written 2026-11-02 1214 UTC for board items `200/090`, `200/120`,
`200/130`, `200/140` and `200/160`. **Fable-gated:** the pass ran under the
owner's Fable drain approval of 2026-11-02. The verdict is below the divider
in this file (atelier `REVIEW.md` § *The lifecycle*).

## Provenance

This brief was written by a brief-writing sub-agent (Claude Opus 5.5) of
session `2be3482c`, on the owner's instruction of 2026-11-02, verbatim:
*"Write briefs for anything that needs a review in any of the repos, where a
brief is not ready"*. None of the five records carried a review line. The
sub-agent wrote none of the subject, ran no review, and formed no finding.
It wrote the held-back sibling named below.

**Barred from taking this pass** (rule 4: the review comes from a session
the author neither started nor instructed): every session and worker that
built or merged the five pull requests below (among them `faves-77`, which
claimed `200/090`, and the queue runs of 2026-10-16 to 2026-10-18 whose
workers ran on `w/200-*` branches), and this brief-writing sub-agent and its
parent session. Who built each is in the item files and the session log;
read them at phase 2 to confirm you are none of them.

**Tier: Fable, checked at selection.** A session not on Fable stops, and
neither takes the item on a lower tier nor proceeds hoping the pass is
accepted (`REVIEW.md` rule 4). An off-tier orchestrator, if any, forms no
finding, writes no severity, and is disclosed in the claim, the pointer and
the verdict. The verdict repeats this provenance.

## Subject

Five merged changes that together define when a dish on an order is
complete, and what its chosen options make it contain. Each is bounded by
its merge: `git log <merge>^1..<merge>^2` lists its commits. Read each
commit body-free:
`/usr/bin/python3 ../atelier/tools/coldsweep.py --commit <sha>` (from the
primary checkout; from a worktree, use
`"$(git rev-parse --git-common-dir)/../../atelier/tools/coldsweep.py"`).
Plain `git show` is barred until phase 2: it prints the body ahead of the
diff, and reading is atomic (`REVIEW.md` rule 1).

| ADR | Merge (PR) | Item | Code and tests touched |
|---|---|---|---|
| 0156 a required choice has no None, and Add waits | `6d13e3c8` (#100) | `200/090` | `addons.js`, `addons-ui.js`, `cart-ui.js`, `menu.js`, `saved-recall.js`, `sw.js`; `validate.py`, `test_validate.py`, `addon_check.mjs`; 33 groups marked on 19 venue files |
| 0158 an unfinished dish is flagged on the sheet | `e164e61c` (#107) | `200/130` | `order-finish.js` (new), `order-finish-ui.js` (new), `addon-warning.js`, `cart.js`, `cart-ui.js`, `addons-ui.js`, `saved-*`; tests `order-finish`, `saved-orders`, `tag-labels` |
| 0159 a must-see choice opens on Add | `b97fbeda` (#108) | `200/120` | `addons.js`, `addons-ui.js`, `cart.js`, `cart-ui.js`, `menu.js`; `validate.py`; tests `addons`, `order-move` |
| 0163 a pick-many group can ask for N picks and charge for extras | `72992aad` (#124) | `200/140` | `addons.js`, `addons-ui.js`, `order-finish*.js`, `saved-recall.js`; `validate.py`; test `pick-counts` |
| 0168 a swap names what it replaces, and removes nothing | `3be63622` (#129) | `200/160` | `addons.js`, `addons-ui.js`, `order-finish.js`, `saved-recall.js`; `validate.py` (13 mutations); test `swap` |

The composers at the centre: `missingRequired` / `owed` and `composeTags` in
`site/js/addons.js`, and `configurationWarning` in `site/js/addon-warning.js`.
Review the files as they stand at the HEAD you start from, and record it.

**Intent records** (refs only; read at phase 2): the five ADRs; ADRs `0048`
and `0130`, which they build on; the dish-configuration survey
`docs/reviews/2026-10-03-0759-dish-configuration-survey.md` (it is a survey,
not a verdict, but it sits in a barred directory: open it at phase 2). 🚩
**Not** the five item files until phase 2: each carries its builder's
account.

## Type

Built and shipped work, and direction: one obligation mechanism and one
allergen composer that every later configuration shape must reuse. Whether
any part is doctrine by function (`REVIEW.md` rule 3) is for you to judge
and state.

## Why it earns a review

These are the functions that decide two things a reader acts on: whether a
dish is ready to order, and which allergens and dietary claims the chosen
dish carries. Their failures are silent: an incomplete order sent to a
venue, or a dish shown without an allergen its chosen option adds. This
repo's ARCHITECTURE calls that composition *safety*. Five changes in sixteen
days have widened both functions, and no change in the set has had an
independent pass.

## Scope and the four lenses — run all four

Scope is the whole commitment: the owner's rulings behind each item, the
five decisions and what they rejected, the code, the validator rules and
their mutation cases, the tests (a wrong test verifies nothing), the
browser check blocks, the data marked under them, and real-world behaviour,
exercised wherever this machine allows. An impossibility claim states its
grounds.

1. **Approach & assumptions** — the most important. Name the load-bearing
   assumptions yourself, as your first act, before reading the list below.
2. **Correctness & quality** — does each change do what its ADR says;
   anything overclaimed, stubbed or silently cut.
3. **Completeness / harvest** — every path that adds a line to an order,
   and every surface that shows a dish's allergens, against the five rules
   (`REVIEW.md` V3).
4. **Security & privacy** — a must, and here safety too: wrong allergen
   or dietary claims; any data-driven text reaching the page unescaped;
   checked against open catalogues (OWASP ASVS, OWASP Top 10), not memory.
   Aim `/security-review` at the JS delta by staging it in a scratch
   worktree of your own; weigh it as one input. Never run it over this
   file while the sibling below still exists.

Run the standing checklist (V1–V7) unasked.

## Load-bearing claims to attack

The records' own claims, in their own terms — a floor, never a fence.

- **C1** — A required pick-one group shows no None and nothing
  pre-selected, and Add stays unavailable until every required group is
  answered (0156).
- **C2** — The picker, the row's own Add, a recalled saved order and the
  order sheet all answer "is this dish finished?" from one function, with
  no parallel path (0156, 0158, 0163).
- **C3** — "Unfinished" is judged against the venue's live record, and a
  menu that fails to load is said, not read as complete (0158).
- **C4** — The allergen and dietary sentence is produced by one composer,
  used by the picker and the sheet alike (0158).
- **C5** — A must-see choice opens only on the Add press that takes a
  configuration from none to one, and the dish is still added (0159).
- **C6** — `min`, `included` and `extraPrice` change nothing, byte for
  byte, for a group that does not use them; exactly N is `min == max`
  (0163).
- **C7** — A swap is words only: choosing one never removes an allergen
  tag or a warning, and `tests/swap.test.js` walks every shipped swap
  (0168).
- **C8** — The validator refuses each field where it would do nothing
  (`required: false`, `mustSee` on a required or `selects` group, a
  `replaces` the menu does not state), each with a mutation case.

## Grounding — re-run lines

Each run once by the brief-writer on 2026-11-02, from a fresh worktree of
`origin/main` at `2cc123a8`, Node v24.18.0. Re-run every one; a line that no
longer reproduces is a finding.

- `nice -n 19 node --test tests/addons.test.js tests/order-finish.test.js
  tests/saved-orders.test.js tests/tag-labels.test.js
  tests/order-move.test.js tests/pick-counts.test.js tests/swap.test.js` →
  176 tests, 176 pass, exit 0.
- `nice -n 19 python3 tools/validate.py` → exit 0, *"All 58 restaurant
  file(s) valid (67 warning(s))"*.
- `nice -n 19 python3 tools/test_validate.py` → exit 0, *"All 352
  mutations behaved as specified"* (about 25 minutes under `nice`).

**Not run by the brief-writer, with grounds:** `node tools/addon_check.mjs`
(blocks `ac`, `ad`, `ae` and the required and unfinished-dish blocks): it
drives a browser, and the brief-writer ran none. Re-run it, and run each new
test against the parent of its merge to show it fails on the old code. A
test the old code passes proves nothing about the change.

## Rule 2 — what is barred until your findings are committed

"Committed" means durably written to your draft of this file.

- The commit message bodies (see *Subject*).
- The five item files and the session records (`docs/SESSIONS.md`), which
  carry the builders' accounts. If your onramp reads them, treat them as
  claims and disclose that you did.
- Everything in `docs/reviews/` but this file, the survey included; search
  with `coldsweep.py`, whose default bar excludes them.

## Non-goals

- The other configuration records of the same weeks, judged not to earn a
  pass on their own: ADR 0157 (a size ladder's default) and ADR 0166 (a
  minimum order). In scope only where they touch the two composers.
- `200/030` (14g), an unapproved design.
- Transcribing menus, or judging whether a venue's menu was read right.

If a non-goal fences off a risk the work actually carries, say so as a
finding.

## The held-back sibling

`2026-11-02-1214-dish-configuration-obligations-and-allergens-cold.deferred.md`,
beside this file, holds 7 entries. Open it only after your findings are
durably written here; then fold it in below your verdict and delete it
(`REVIEW.md` rule 1).

---

## Verdict — act 1 (cold pass, 2026-11-02)

### Provenance

Reviewer: Claude Fable 5.1, tier checked at selection. Spawned by a
headless per-pass orchestrator (Claude Opus 5.5), itself started by shed
session `c87c4ee0` (Opus 5.5). Both are off-tier orchestrators under
`REVIEW.md` rule 4: they held the context partition, formed no finding and
wrote no severity. Neither wrote this brief, its sibling or any of the five
changes. The reviewer was not started or instructed by any session the
brief bars: the sessions and workers that built or merged PRs #100, #107,
#108, #124 and #129 (`faves-77` and the 2026-10-16 to 2026-10-18 queue-run
workers on `w/200-*` branches among them), nor the brief-writing sub-agent
of session `2be3482c` or that session. Confirmed at phase 2 against the
five item files and the session log (see *Phase 2*). Run under the owner's
Fable drain approval of 2026-11-02, verbatim: *"As in past sessions I want
you to use fable model in subagents to do all fable dependent work in all my
repos including cold fable reviews"*.

**HEAD reviewed:** `3016d708` (this worktree, detached; the brief-writer's
base `2cc123a8` plus the claim commit, which touches no code). All files
were read as they stand at that HEAD.

**Reading order, disclosed.** Phase 1: my own assumptions first (below),
then the code, tests, validator, mutation cases, browser-check blocks and
the data under them, with the re-runs and probes; findings were written to
this file before anything else was opened. Phase 2: the five ADRs, ADRs
0048 and 0130, the survey, the commit bodies (`git show`), the five item
files and the tail of `docs/SESSIONS.md`. The held-back sibling was not in
the worktree and was not sought. `coldsweep.py` was used for every tree
search; no `--include-barred` sweep was run. The onramp read nothing under
`docs/reviews/` but this file.

### My assumptions, named first (lens 1)

Written before the code was opened; each is marked with what the pass
found.

- **A1** "Finished" is recomputed from the venue's live record on every
  read, never stored. *Holds* (`order-finish.js` takes the record
  everywhere) — with the count-not-resolution gap in F2.
- **A2** One definition of "required" shared by the validator and the JS.
  *Holds*: `validate.py` refuses `required` off a pick-one `adds` group and
  `min` off a pick-many one; `isRequired`/`minOf` read exactly those shapes.
- **A3** Composition is monotone in the safe direction and a swap never
  subtracts. *Holds* (`replacesOf` is read by nothing in `composeTags`;
  `tests/swap.test.js` walks the corpus) — and F1 is what that costs on the
  shipped data.
- **A4** Every path that creates a line reaches the same check. *Holds by
  design*: the sheet judges every line it holds (menu Add, picker Add,
  recall, share link, backup import, sync pull), so the net is the sheet,
  not the writers. Its two holes are F2 and F6.
- **A5** No synthetic None on a required group and no way round the
  disabled Add. *Holds*: no None radio is built (`addons-ui.js` line 446),
  nothing is `checked`, and `dishStepper` renders only the blocked Add
  while gated, so there is no ＋ to press (block z, 216/216).
- **A6** Must-see opens only on the none-to-one Add. *Holds*: `onAdded` fires
  only from the `q === 0` Add button (`cart-ui.js` `dishStepper`).
- **A7** Default `min`/`included`/`extraPrice` and no `replaces` reproduce
  the old bytes. *Holds*: `swapField` returns `{}`; `extraFee` returns 0;
  the legend strings in `ruleText` are the same literals `addons-ui.js`
  carried at `72992aad^1` lines 390–394; `tests/pick-counts.test.js` pairs
  every positive case with a control.
- **A8** Data-driven strings reach the DOM as text. *Holds* (`el()` appends
  strings as text nodes; `textContent` throughout; see lens 4).
- **A9** Validator refusals and JS reads agree. *Holds*, field by field (see
  C8).
- **A10** Each new test fails on its merge's parent. *Holds* (re-run below).
- **A11** Shell/data skew: new data on an old shell degrades safely. *Holds*:
  every new field is additive; old JS ignores it and keeps the old
  behaviour (a None on a required group, no gate), which is the pre-0156
  state, not a regression.
- **A12** `extraPrice` composes into the line price like any option price.
  *Holds* (`configuredPrice` adds `extraFee` per group; `finishChoice`
  adds the fee delta).
- **A13** A group made required after a save is landed and flagged on
  recall, not dropped. *Holds* (`planRecall` `unfinished`).
- **A14** A flagged line is visible, named and finishable. *Holds* (block
  aa).

### Re-run lines — every one, actual result

- `nice -n 19 node --test tests/addons.test.js tests/order-finish.test.js
  tests/saved-orders.test.js tests/tag-labels.test.js
  tests/order-move.test.js tests/pick-counts.test.js tests/swap.test.js` →
  **176 tests, 176 pass, 0 fail, exit 0** (Node v24.18.0). Reproduces.
- `nice -n 19 python3 tools/validate.py` → **exit 0, "All 58 restaurant
  file(s) valid (67 warning(s))"**, tree line `detached@3016d708 ·
  worktree`. Reproduces.
- `nice -n 19 python3 tools/test_validate.py` → **exit 0, "All 352
  mutations behaved as specified"**, same tree line. Reproduces.
- `nice -n 19 node tools/addon_check.mjs` (not run by the brief-writer) →
  **"OK — 216 passed, 0 failed"**, `HEAD@3016d708`, 163 clicks all on the
  first frame, 0 re-scrolled, exit 0. Blocks (z), (aa), (ab), (ac), (ad)
  and (ae) all ran.
- **Each merge's new tests against the merge's first parent** (scratch
  worktrees at `M^1`, the test files copied in from `M`):
  - #100 `6d13e3c8^1` = `dd29fee3`: `addons.test.js` fails to load
    (`isRequired` not exported) — 1 fail / 0 pass.
  - #107 `e164e61c^1` = `9913f365`: `order-finish.test.js` fails to load
    (no `order-finish.js`); `saved-orders.test.js` and `tag-labels.test.js`
    together **29 pass / 2 fail** on the old code. So the three files bite
    on 3 of 32 tests; the other 29 are pre-existing coverage that the old
    code already passed (F9).
  - #108 `b97fbeda^1` = `67449f92`: `addons.test.js` and
    `order-move.test.js` both fail to load (`freshAction`, `dishQtyTotal`
    not exported) — 2 fail / 0 pass.
  - #124 `72992aad^1` = `d94228fb`: `pick-counts.test.js` fails to load
    (`extraFee` not exported) — 1 fail / 0 pass.
  - #129 `3be63622^1` = `7f3e86be`: `swap.test.js` fails to load
    (`insteadText` not exported) — 1 fail / 0 pass.

### The load-bearing claims, C1–C8

- **C1** holds. No None radio for a required pick-one group, nothing
  pre-selected, both Adds `aria-disabled` with the reason in their labels
  (`addons-ui.js` 446–470, `cart-ui.js` `dishStepper`; block z).
- **C2** holds with one note. `owed`/`missingRequired` is the one question;
  the picker, the row's gate, `planRecall` and `unfinishedOf` all ask it.
  The finish control's `answeredBy` is a second judgement *of the draft*,
  but the commit goes back through `finishChoice` → `unfinishedOf`, and the
  sheet re-judges after the write. The one disagreement found is F2, which
  is a gap in the shared question, not a parallel path.
- **C3** holds for a failed fetch and is unasserted anywhere: the caption
  fires on `venueRecords.get(id) === null`, which `ensureRecords` sets only
  on rejection; while a fetch is in flight the lines read as complete.
  Nothing tests the failed path (F6).
- **C4** holds: `configurationWarning` is called by `addons-ui.js`
  `refresh()` and by `order-finish-ui.js` `paint()`, and block (aa) asserts
  the two sentences are equal word for word.
- **C5** holds: `onAdded` fires only from the none-to-one Add; `reveal()`
  is a no-op with no must-see group or an open picker; the dish is added
  before the reveal (`order.add(meta); onAdded?.()`). Block (ab).
- **C6** holds, byte for byte on the three surfaces that matter: the legend
  strings (`ruleText` versus `addons-ui.js` at `72992aad^1`), the selection
  entry (`swapField` → `{}`) and the price (`extraFee` → 0). `min == max`
  prints "Required — choose N".
- **C7** holds: `composeTags` never reads `replaces`; `tests/swap.test.js`
  walks every `replacesOf` group in `site/data/restaurants/` and refuses to
  pass with fewer than four (four ship). What "words only" does to the
  reader on those four is F1.
- **C8** holds: `required: false`, `mustSee` on a required or selects group,
  `min` on a pick-one group, `included` without `extraPrice`, and a
  `replaces` the menu does not state are each refused, each with a mutation
  case (`test_validate.py` lines 962–1130; 352/352). The refusals and the JS
  reads agree field by field (A9).

### Findings

**F1 — MAJOR (lens 1, 4; `200/160`, ADR 0168 with 0048/0092). The shipped
swap's own exemplar tells a gluten-avoider two things that cancel.** On
Hotel Bristol's Cheeseburger (`gf-option`, `contains-gluten`,
`contains-dairy`) the "No gluten added bun" option is tagged `[]`, so
choosing "No gluten added bun (instead of the milk bun)" composes to the
residue sentence *"No gluten added bun isn't tagged gluten free, so that
label describes the dish as listed."*, drops `gf-option` from the dish, and
leaves the row flagged "contains gluten" to a reader avoiding gluten
(measured: `configurationWarning(["contains-gluten","contains-dairy",
"gf-option"], [bun], {contains-gluten})` → tags `[contains-gluten,
contains-dairy]`, that one line, `flagged: true`). Three of the four shipped
swaps are in this state (Bristol's bun, Thorndon's "No added gluten bun" on
three burgers, Thorndon's curly fries — all `tags: []`); only Tawa's
"Gluten free toast" carries `gf`, and there the claim survives. The
mechanism is correct and fail-safe — ADR 0168 §2 is right that a swap must
remove nothing until the owner rules — but the feature's first real use
now prints "instead of the milk bun" on the line beside a warning that still
counts the milk bun's gluten, with no sentence saying why. That is the
shape the composer's own header and ADR 0092 warn teaches a reader to
discount the warning, and it lands on exactly the reader a gluten-free bun
exists for. Not a transcription question: "no gluten added" is the venue's
wording, and tagging the option `gf` would be a stronger claim than the
menu makes, so the data may be right and the words are still wrong.
**The owner has already ruled on the question ADR 0168 deferred**: on
2026-10-18, after #129 merged, *"YES, WHEN THE MENU SAYS SO"* — a swap may
remove an allergen warning where the menu states the replacement (item
`200/160`; the recommendation "never, add only" was declined). ADR 0168's
*Rejected* list still says the decision "has not been made", so the ADR is
stale against the item (F11). Part 2 is buildable and unbuilt; until it
lands the shipped site reads as above. Options for the gap:

1. Say it, now, in words, with no change to composition: when a chosen
   option's group has `replaces`, the warning line adds one sentence of the
   rule's own — e.g. *"A swap doesn't lower a warning here: this still
   counts the milk bun until you check with the venue."* — and the residue
   sentence is suppressed for that option, because "isn't tagged gluten
   free" is not news about a bun the menu calls "no gluten added". Cost: a
   sentence in `addon-warning.js` and one assertion in block (ae).
2. Tag the swap option with the claim the menu *does* make, where it makes
   one (Tawa's toast already does), and leave `[]` where the menu hedges.
   Changes nothing at Bristol or Thorndon on its own.
3. Build part 2 as ruled: a `replaces` swap may drop the replaced
   component's allergen where the menu states the replacement, with the
   break-probes in both directions the item asks for. Largest change, and
   it does not touch the residue sentence on its own: "no gluten added" is
   not "gluten free", so the bun stays untagged and the sentence stays
   unless 1 or 2 lands too.

Recommendation: **1 now**, as the stopgap the ruled part 2 does not
replace; 2 where the menu wording allows; 3 is the owner's ruled direction
and belongs to part 2's own ADR and pass. 1 keeps every tag and every
flag, and turns a contradiction into a stated rule.

**F2 — MINOR (lens 2, 3; `200/130`, ADR 0158). The sheet judges a required
group by how many stored options sit in it, not by whether they still
resolve, so the sheet and recall disagree about the same line.** Probe
(`scratchpad/probe1.mjs`, record with one required `sauce` group; a live
line holding `{group: "sauce", id: "chef-special"}` the venue no longer
offers): `unfinishedOf` → `null` (complete), `selectionWithTags` → tags
`[]` (composes as not-stated, the fail-safe direction, so no under-warn),
while `planRecall` of the identical line → skipped, *"“Chef special” is no
longer offered"*. `owed()` counts `selection.filter(s => s.group ===
group.id)`; `order-finish.js`'s header says a line is never called
unfinished "on evidence we do not have", but here the evidence is held: the
group is required and the only thing in it is not on the menu. Reaches a
line that was on the sheet when the venue's data moved (fingerprinted
fetch, `510/030`), a shared link, or a backup. Consequence: the sheet reads
out "Stir fry with Chef special" at the counter as a finished dish the
kitchen cannot make, priced at the stale price. Fix: in `unfinishedOf`,
count only options that resolve on the live group (`optionId` match, as
`selectionWithTags` already does) — or flag the line "no longer offered"
on the sheet as recall does. Add the probe as a case in
`tests/order-finish.test.js`.

**F3 — MINOR (lens 1; `200/090`, ADR 0156 on top of ADR 0133). Two Adds,
and one silently drops optional picks after the reader has been sent into
the picker.** The row's ＋ Add carries `rowSel` = the variant plus picks in
`requiredIds` only (`addons-ui.js` 328–330); the picker's own stepper
carries the whole selection. Before 0156 the picker was optional reading;
now a blocked row Add *opens* it and puts focus on the first required
radio, so answering there is the designed route. A reader who answers
"Sauce" and also ticks an optional "Extra halloumi +$3", then taps the row's
＋ (the one beside the heart, where their thumb started), gets a line with
the sauce and without the halloumi, told only by the button's `aria-label`.
Block (z) asserts the row's Add adds "the SAME configured line" with only
the required pick ticked, so a green run cannot see this. Not a safety
defect (an extra is dropped, never added), but a silent difference between
what was configured and what was ordered. **Owner's call**, since it
extends ADR 0133's rule for the row Add; options: (1) once the picker is
open, the row's Add carries the whole selection (one configuration, two
buttons); (2) while the picker is open, the row's stepper is replaced by, or
mirrors, the picker's; (3) keep it and say so in the `need`/summary text.
Recommendation: 1 — the two buttons should never order different dishes.

**F4 — MINOR (lens 2, V5; `200/090` against `200/160`). `replaces` must
be stated by the menu (an error) but `required`, whose consequence is
larger — the None is removed and Add is blocked — needs no evidence at
all.** `check_replaces_stated` refuses a `replaces` no dish `desc` or
section `note` carries; nothing in `validate.py` asks whether the menu
makes a `required` group compulsory. Measured on the corpus: 13 of the 33
`required` groups sit on dishes whose name, `desc` and section note carry
no choice word (`choice`/`choose`/`your choice`/`pick one`/`selection of`);
6 of those 13 have a group name that itself states the choice ("Fries or
mash", "Fries or rosti"), leaving 7 with no stated source in the record:
`noodle-canteen` `heat` on five dishes ("…in a Thai chilli sauce"),
`1841-bar-restaurant` `sundae-topping`, `burgerfuel` `choppers-sauce`.
The survey (`docs/reviews/2026-10-03-0759-dish-configuration-survey.md`,
read at phase 2) had already re-checked two of the seven (`heat`,
`choppers-sauce`) and one of the six (the Borough's `schnitty-side`)
against the pre-conversion text in `f56eda63` and found them sound, left
the rest unchecked, and wrote the rule this finding asks for: *"A default
inferred 'from the wording used on the menu' needs that wording kept
somewhere a later reader can check."* Nothing was filed or built for it.
This is not a verdict on the transcription (a non-goal, and the printed
menu may well say it); it is that the gate exists for the lesser field and
not the greater, and a wrong `required` makes a dish the venue sells plain
unorderable plain. Fix: a `warning` (not an error) from `validate.py` when
neither the dish text, the section note nor the group name states a choice,
in the shape of `check_replaces_stated`; or a `required` that names its
source line as `replaces` effectively does.

**F5 — NOTE (lens 3; `200/140`, ADR 0163). The allowance-then-fee half
ships on no record.** `included`/`extraPrice` appear on zero groups in
`site/data/restaurants/` (`min` appears once: Charley Noble `cheese-two`,
`min 2, max 2`). The fee path is exercised only by `tests/pick-counts.test.js`
and block (ac)'s overlay fixture (the kebab record served back with
`included: 1, extraPrice: 4`). The first real record will be its first
field use, and the rule "included/extraPrice need free options" will be
tested against a real menu for the first time then. Record, not a defect.

**F6 — NOTE (lens 2; `200/130`, C3). "Couldn't load every menu" fires on
failure only, and no check exercises it.** `uncheckedEl` reads
`venueRecords.get(id) === null`; during the fetch the entry is `undefined`,
so the lines read as complete and un-captioned until `.finally` repaints —
a sub-second window on a working network, longer on a bad one. Block (aa)
fetches the record successfully from the home page; nothing stages a failed
fetch. Suggest one assertion in (aa) with the record's URL blocked (the
harness already serves fixtures), and the caption shown while a fetch is
pending.

**F7 — NOTE (lens 2; `200/140`). The finish control's sentence counts the
stored line, not the draft.** `order-finish-ui.js` line 169 calls
`owedSentence(stillMissing, item.options)`; with one of two cheeses ticked
in the draft it still says "choose 2 under “Choose two”", where the menu
picker says "choose 1 more". Same function, wrong argument; pass the
stored options plus the draft's picks.

**F8 — NOTE (lens 1; `200/120`, ADR 0159, owner-ruled B). After Add, a
change in the picker moves the unit only when the picker was opened by the
reveal.** `reveal()` starts `fresh` only when it opened the picker; on a
dish with no must-see group, or a picker the reader already had open, the
same radio change makes a second line. Deliberate and documented
(`addons-ui.js` 588–591); the reader's only cue is the "Added as listed…"
note. Recorded so the next report of "it made two lines" is read against
the rule rather than as a bug.

**F9 — NOTE (V2; `200/130`). Of #107's 32 tests, 29 pass on the parent.**
`saved-orders.test.js` and `tag-labels.test.js` were edited (16 and 13
lines) rather than written, and all but two of their assertions hold on the
old code; the change's real cover is `order-finish.test.js` (new) plus two
assertions. Fine as a record; stated because the brief asks for it.

**F10 — NOTE (lens 4). Security and privacy.** Every data-driven string in
the delta reaches the DOM through `el()` children or `textContent`
(`addons-ui.js` option rows and the swap span, `order-finish-ui.js`
fieldsets, `cart-ui.js` line rows); no `innerHTML`. Identifiers that enter
the line key are slugged or percent-encoded (`optionId`, `selectionKey`),
and the swap wording is written into `name`, which is never part of the
key. Prices from a link or backup go through `priceOrNull`/`Number` guards
before `configuredPrice`; `extraFee` refuses a non-integer `included` or a
non-positive fee. No new field is stored, exported or synced — `replaces`
lives on the in-memory selection entry and `lineOptions` drops it. The
validator's new regexes are anchored literals. `/security-review` was
**not** run: it scans the session's pending diff regardless of the path
given, and this worktree's pending diff is the sibling's deletion — exactly
the material rule 2 bars (atelier memory, 2026-08-15, three
reproductions). Its floor was delivered instead by a read-only security
agent over the delta as a diff file (`scratchpad/js-delta.diff`, 3,513
lines: HEAD's versions of the eleven files the five merges touched, over
base `dd29fee3`, so it also carries other commits to those files in the
window) — weighed as one input, OWASP Top 10 (2021) A03 injection and ASVS
v4 §5 and §8 the lens. Its report: **no HIGH or MEDIUM**; two LOWs and one
validator note, carried as F12; everything else confirmed the defences
above (spreads from `swapField`/stored lines cannot reach
`Object.prototype`; the key encodes both halves; link, backup and
saved-order prices are clamped before any total; every new string lands in
`textContent` or an attribute; the validator's regexes are anchored and
linear). It did not examine `dish-rules.js` or `activity.js` (absent from
the base checkout; neither belongs to the five changes) or `sw.js`.
Nothing here collects or stores personal data.

**F11 — NOTE (V5, V1; `200/160`). ADR 0168 is stale against its item.**
The ADR's *Rejected* list says removing the replaced component's allergen
is "owner's decision, not made"; item `200/160` records the owner's ruling
of 2026-10-18 that it may, where the menu states the replacement. The ADR
is accepted and is not to be edited; part 2's record should supersede that
line and the ADR's *Context* sentence, and until then a reader of the ADR
alone believes the question open.

**F12 — NOTE (lens 4, LOW). Three items from the security floor.**
(a) `cart-ui.js` `ensureRecords` (new in #107) fetches
`data/restaurants/<id>.json` for every distinct `venueId` an order holds,
and a share link's `venueId` is clipped to 120 characters but not
shape-checked (`share-codec.js` `decodeOrderItems`), so a crafted link can
make the sheet issue up to 200 attacker-chosen same-origin GETs per open —
no credentials, no cross-origin, a failed parse lands as `null`; request
churn only. Accept only ids matching the id shape (or the index) before
fetching. (b) `draft.picks[g.id]`, `need/have/held[g.id]` and
`picks?.[g.id]` are plain objects read by a data-supplied key; the id
regex excludes `__proto__` but admits `constructor`, so a group with that
id breaks the finish control (`Object.includes` is not a function).
Repo-authored data only; use `Object.create(null)` or refuse reserved
words in `validate.py`. (c) `check_replaces_stated` is a substring test:
`replaces: "bun"` is satisfied by a `desc` containing "bundle" — a false
pass of a wording gate, not a security hole; a word-boundary match fixes
it.

### Standing checklist V1–V7

- **V1** No claim stronger than its evidence: the five ADRs' claims are
  tested as C1–C8 above; the one claim the records make that the shipped
  data does not bear out is F1 (words that read as a removal beside tags
  that remove nothing).
- **V2** Every recorded proof re-run: the three brief lines, the browser
  check and the parent-of-merge runs, all above.
- **V3** Mirror sites: `docs/ARCHITECTURE.md`'s group schema (the JSON
  example at lines 224–238 and the prose at 947–975) carries all five
  fields with their refusals; `CHANGELOG.md` *Unreleased* carries the swap,
  the counts and the must-see entries; `CLAUDE.md`'s verify list names
  `addon_check`. No mirror missed. The one record out of step is ADR 0168
  against its item (F11).
- **V4** One fact, one home: the legend words moved into `ruleText`; the
  sentences moved into `addon-warning.js` and `tag-labels.test.js` follows
  them; `owedSentence` is shared. The finish control re-renders the
  picker's *markup* (fieldset, radios, classes) rather than its rule — a
  second rendering, not a second rule; acceptable, noted.
- **V5** No internal contradiction: F1 (line words vs composed tags), F2
  (sheet vs recall), F4 (validator gate on the lesser field only).
- **V6** Security and privacy: F10.
- **V7** Provenance: stated in the brief and repeated above.

### Doctrine by function (rule 3)

`validate.py`'s refusals for the five fields and ADR 0168's "removes
nothing" rule govern what future transcribers may write and what the app
may ever claim; both are doctrine by function. F1 and F4 touch them and are
therefore the owner's to decide, not the builders'.

### Tally and follow-up

**1 MAJOR / 3 MINOR / 8 NOTE.** For the board, in one follow-ups item:
F1 (the stopgap sentence now; part 2 as already ruled), F3 (owner's
call), F4 (owner's call on the gate's shape), F2, F7 and F12 (fixes with
tests), F6 (one harness assertion), F11 (part 2's record), F5/F8/F9/F10
(record only).

### Phase 2 — intent records, barred material, security floor

*(written after the findings above were saved to this file)*

**Read, in this order:** ADRs 0156, 0158, 0159, 0163, 0168; ADRs 0048 and
0130; the survey; `CHANGELOG.md` *Unreleased* and `docs/ARCHITECTURE.md`'s
group schema; the twelve landing commits' bodies (`git show --no-patch`);
the five item files; the `docs/SESSIONS.md` lines naming the five items
(grep hits, not the entries in full). Treated as claims throughout.

**Provenance confirmed.** The item files name the builders: `faves-77` and
its worker (#100); `faves-11`'s worker (#107, #108); the `w/200-140` and
`w/200-160` workers with `faves-b4` merging (#124, #129); `faves-de` put
the rulings. This reviewer and its two orchestrators are none of them.

**What the records changed.** Two findings were revised on what they
showed, none withdrawn: F1, because item `200/160` records the owner's
2026-10-18 ruling that ADR 0168 still calls unmade (hence F11); F4,
because the survey had already re-checked three of the groups and had
written the rule the finding asks for. F3's asymmetry turns out to be
stated in ADR 0156 §5 and ADR 0159 §9 as a consequence, never put as a
question; it stands as a lens-1 finding for that reason. F5 is
acknowledged in ADR 0163 itself ("No data was invented for them"). ADR 0158
§1 judges only a dish the record no longer holds, so F2 stands. Item
`200/090` lists four groups left optional for the owner to overrule; none
blocks anything, and nothing here changes that.

**Recorded proofs re-run beyond the brief's lines.** ADR 0168's break-probe
("`composeTags` drop[ping] `contains-gluten` when a swap is chosen (4 tests
fail)"): reproduced at `3be63622` in a scratch worktree — 13 pass
unpatched, 9 pass / 4 fail with the probe applied. The commit bodies' test
counts (`node --test` 1847 → 1867, `addon_check` 122 → 216) are consistent
with the run here (216) and were not individually re-run at each commit.
ADR 0158's three browser break-probes and ADR 0159's were not reproduced
(each needs the harness run with the code reverted; the brief did not ask
and the claims are specific enough to be re-run by the follow-ups item).

**Security floor.** The read-only agent's report is folded into F10 and
F12 above. Its one unscored item — the activity log (`activity.js`,
roadmap 32a) now receives `subjectOf(line)` for every add/remove/merge —
belongs to a different change and is outside this pass; noted for whoever
reviews 32a.
