# Cold pass — dish configuration: obligations and allergens (refs-only)

**Status:** BRIEF ONLY — the review has NOT run. Written 2026-11-02 1214
UTC for board items `200/090`, `200/120`, `200/130`, `200/140` and
`200/160`. **Fable-gated:** the pass runs only on the owner's explicit
approval of Fable work at the time. The verdict goes below a divider in this
file (atelier `REVIEW.md` § *The lifecycle*).

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
