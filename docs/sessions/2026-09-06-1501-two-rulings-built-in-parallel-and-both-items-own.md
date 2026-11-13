## 2026-09-06-1501 — two rulings built in parallel, and both items' own numbers were wrong

**Orchestration session (faves-24).** Two worktrees, two Opus agents, disjoint
file sets, merged in version order. 19 commits. No branch, worktree or PR left
open. `main` is `ca37d64`; the push **is** the Cloudflare Pages deploy.

### What was delivered

1. **The distance limit actually cuts** (ADR 0091, item `210/020`, merged
   `d300fb9`). `splitByDistanceLimit` removes a venue past `farKm` **before**
   the ranker; `rankVenues` untouched, so the sort survives *inside* the limit.
   The count is stated and named, the empty state carries its reason and a
   widen button whose figure rounds **up** to a real dial stop, and a direct
   link opens **whole** with one quiet line. New `tools/distance_check.mjs`,
   19 assertions.
2. **An add-on option states what it IS** (ADR 0092, item 14h, merged
   `c31ebf3`). `tools/tag_addon_options.py` — re-runnable, idempotent — then
   the collapse. A reader now sees *"Bacon is meat, so this is no longer
   vegetarian. Spinach, Tomatoes and Bacon aren't tagged gluten free, so that
   label describes the dish as listed."* One fact, then the residue said once.

### 🛑 Both items' headline numbers were wrong, and that is the session's finding

**14h said the warning fired 807 times.** Re-derived against the corpus at the
very commit the figure was taken from (`268c366`), four of five numbers
reproduce **exactly** — 155 options, 62 tagged, 93 untagged, 40%. Two do not:
the venue count was eight, not seven, and **807 was really 72**. 807 is
reachable only by crossing every untagged option at a venue against every
claim-bearing dish there *while ignoring which add-on groups attach to which
dishes*. The worked example — Spinach stripping `v` off Thick Cut Fries — was
**never possible**: that dish declares `addOns: ["gravy"]`, and `Gravy` is
already tagged `v`. Verified here from the primary source, not taken on the
agent's report.

**And the ruling's order is inverted in importance.** Only **17 of 97**
untagged options could honestly be tagged; the other 80 would require asserting
an **absence**, which ADR 0025 forbids. So (b) the collapse is the load-bearing
half, not the polish that "then collapse whatever remains" implies.

**`210/020` carried a premise that is also not true today:** the distance limit
cannot empty the home screen on its own, because two venues carry no
coordinates and a venue we cannot place is never cut. The empty state is
reachable through a *combination*, and on distance alone only once every record
has coordinates.

🔑 **The shape both share:** a number quoted forward without re-derivation
acquires an authority it never earned. Both rulings still stand — the problems
were real — but the owner ruled partly on figures that do not survive contact
with their own source.

### 🔎 The ruleset finding: a direct push can never satisfy a required check

Measured from the rule-suite API's own detail field, not inferred:
`required_status_checks | fail | 6 of 6 required status checks are expected`.
At push time nothing has run them, because a workflow starts *after* the ref
moves. The 14 bypasses in the retained log are the only outcome the mechanism
allows — not carelessness. The single `pass` is the **merge of PR #7**, whose
head already carried green checks.

🛑 **So narrowing `bypass_actors` would not "switch enforcement on" over the
current workflow — it would end direct pushes to `main` entirely** and move the
repo to PR-only. On this repo `main` is the deploy, so it also means every
deploy waits for CI. That is a workflow decision, not a settings tweak. Filed
as `340/180`; CLAUDE.md's paragraph corrected to point at it.

### Other findings filed

- **`340/190` — two harness guarantees are not true.** `picks_check` is flaky on
  the **pristine baseline** (1 failure in 3 runs at `236b3b6`, bisected before
  being believed), and its failure is a **third shape** CLAUDE.md does not
  describe: a plain `Error`, exit **1**, **no `FAIL` line**. And **two** checks
  never print the second indented tree line — `geo_check` **and**
  `served_check` — so CLAUDE.md's bold *"**Every** check prints…"* is false for
  two of fifteen, on the very mechanism installed after a session verified
  green against the wrong tree.
  🔑 **The second one came from a sweep, not the symptom.** The build that
  raised this saw only `geo_check`, the one it ran. Running all fourteen here,
  then `grep -L "summary(SITE)" tools/*_check.mjs`, returned exactly two. A
  symptom count proves a fault exists, never how many there are — and the
  enumeration doubled the answer.
- **`340/160` — a name collision found before executing.** The ruled
  `untilSettled` would sit beside the existing `settleUntil`, which never throws
  and returns its last value. Two exports differing only by word order with
  opposite behaviour. The ruling's substance is untouched; only the label is in
  question. **Not executed** — surfacing the fork rather than picking one. 54
  call sites measured.
- **`340/170` narrowed from an audit to one line.** Of 7 multi-target selectors,
  only `boot_check.mjs:83`'s `[class*='price']` wildcard can pass with every
  named target gone.
- **`340/030` was advertising work already done** — the `repo invariants` rename
  shipped 2026-08-17. Corrected.
- **`240/020` — version constants are dated NZ-local, record filenames UTC.**
  For twelve hours a day they disagree by a calendar day. Nothing breaks;
  `check_versions.py` never parses the date.
- **CLAUDE.md numbers corrected:** `test_validate` is **137** mutations (said
  113), and "the last 100 ruleset evaluations were 100 bypasses" cannot be
  reproduced — the endpoint retains 15.

### Verification on the MERGED tree (the combination neither agent tested)

`node --test` **1158 pass / 0 fail** · `test_validate` **137 mutations** ·
`test_tag_addon_options` 16 · `test_tag_allergens` 18 · `validate` 57 files ·
all ten Python gates clean · `check_versions --range e13af35..HEAD`:
**lockstep holds, SHELL 2026-09-06.6 → 2026-09-07.2 (9 files), DATA
2026-09-07.1 → 2026-09-07.2 (6 files)**. Browser: `boot_check` 24 ·
`distance_check` 19 · `addon_check` 21 · `device_check` 25 · `focus_check` 16 ·
`note_check` 19 · `geo_check` 22 · `served_check` 55 · `to_top_check` 28 ·
`filter_row_check` — all green, and every one **except `geo_check` and
`served_check`** reporting `tree …/.pets/faves/site · shell 2026-09-07.2 ·
main@ca37d64`, read rather than assumed. Those two printed no tree line, which
is how the second half of `340/190` was found. ✅ **CI green on the deployed
commit `ca37d64`** — both `floor` and `CI` jobs.

⚠️ **The `--range origin/main..HEAD` form said "not in scope"** once HEAD *was*
origin/main — an empty range proves nothing. The session range was used
instead. Worth knowing: the documented invocation is only meaningful on a
branch that is ahead.

### Four rulings taken at the close, and three of them built the same session

Put through `AskUserQuestion` with the account first. All four recorded on the
board; three needed code and all three landed.

1. **`340/160` naming fork → `untilPresent` / `untilStable`.** The 2026-08-22
   ruling said `untilSettled`; `browser.mjs` already exports `settleUntil`,
   which never throws and returns its last value. Two exports differing only by
   word order with opposite behaviour is a trap, so the fork was surfaced rather
   than silently resolved. `settleUntil` untouched, its 13 call sites unchanged.
2. **`340/170` → assert WHICH alternative matched.** Narrowed from an audit to
   one line by measuring first.
3. **`210/050` → a muted style for the repeats.** The sequencing-safe option:
   `040` names option 2, not 3, as the one needing undoing later.
4. **`340/180` → leave the CI bypass as it is.** Now an accepted cost, not an
   unexamined one, and nobody should again propose "just narrow the bypass" as
   cheap. Closed `[x]`.

### 🛑 The `until` split found a bigger fault than the one it was sent to fix

**Eight of fifteen tools ended with their own `catch { process.exit(2) }`
around `run()`.** A local catch sits *upstream* of the `uncaughtException`
handler that classifies errors — so **`need()`'s exit-1 promise from `070` had
been void in over half the corpus since the day it shipped**, all eight green
throughout. [ADR 0072]'s decorative-guard pattern, applied to ADR 0072's own
remedy. Fixed by one exported `exitFromError()`; recorded as **ADR 0093**,
because wrapping `run()` in a `try/catch` is an obvious thing a future author
would do and nothing would tell them they had switched it off.

**Population re-counted at execution: 56 `until(` occurrences — 1 definition +
55 call sites.** Not the 49 first measured nor the 54 corrected to; it grew
mid-session when `distance_check` landed. 7 → `untilStable`, 48 →
`untilPresent`, four sites deliberated and named rather than pattern-matched.

**Proven by breaking, and re-proven independently by this session** rather than
taken on the agent's report: renaming `.order-fab` under an `untilPresent` gave
`FAIL MISSING ELEMENT …` and `REAL_EXIT=1`, where the same break at the base
commit gave exit 2. `note_check` was restored and re-run to 19/19 afterwards.

### 🛑 And shipping it immediately produced the risk the ruling had declined

**A load-induced `untilPresent` timeout now presents as exit 1 — a false
regression.** Measured on the *same commit* within minutes: inside a 15-check
sweep with two extra Chrome instances live (load 18–27) `cook_check` exited 1
on the `MissingElementError` path; isolated and quiet it ran **85 passed, 0
failed**, exit 0. Nothing about the site changed. This is option 1's rejected
failure mode arriving through option 2's door — the split keeps the 7 timing
waits at exit 2, but the 48 site claims can still be starved into a phantom.
Filed with four costed options as `340/200`, added to ADR 0093's Consequences,
and CLAUDE.md's exit-code guidance amended: **a lone `FAIL MISSING ELEMENT` on
a busy machine is not evidence until it reproduces quiet.**

🔑 Worth keeping as method: the finding exists only because the sweep and an
isolated re-run disagreed on identical code. A single green run would have
hidden it; a single red one would have been reported as a regression.

### Verification at close — all fifteen browser checks on merged `main`

boot 24 · distance 19 · focus 16 · filter_row 25 · to_top 28 · picks 20 ·
geo 22 · served 55 · note 19 · addon 21 · device 25 · branch 84 · recipe 29 ·
**sync 16** · cook 85 — every one exit 0. `node --test` **1158 pass, 0 fail**;
`test_validate` 137 mutations; all Python gates clean; `check_decisions` 92
records. ⚠️ `geo_check` and `served_check` print no tree line, so for those two
there is an exit code but **no confirmation of which tree they measured**
(`340/190`). The other thirteen all reported `main@…`, read not assumed.

🚀 **Deploy verified in production, not just locally:** `faves.pages.dev/sw.js`
served `SHELL/DATA 2026-09-07.2` after the first merge, and the live venue JSON
showed `Bacon → has-meat`, `Salmon → has-fish`, `Spinach → []` — the
never-assert-an-absence rule holding on a real phone's payload.

### Still owed

Nothing takeable is left uncaptured. Open for the owner alone: the te reo gloss
for "Dining" (`340/140`, needs a fluent speaker, not a session); the ninth
closure surface (`210/060`); the `untilPresent` load question (`340/200`); and
the geometry-throw classification (`340/190` a).

