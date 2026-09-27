# 0132 — Closure is per branch, and the venue's closure is the floor

**Status:** accepted
**Date:** 2026-09-28
**Amends:** [0023](0023-time-dimension-in-the-data.md) — `lifecycle` may now
sit on a branch as well as a venue · [0054](0054-the-branch-offered-first-is-the-nearest-open-one.md)
— `leadBranch` gains a fourth answer, `"shut"`, and a fourth tier ·
**Roadmap:** `210/040`, worklist items 1–4, under the owner's ruling on its
decision 2 (2026-08-22). Item 5 (`050`) is deliberately not this record's.

## Context

Until now a closure could only be recorded for a whole venue:
`lifecycle.events[]` folds into one `record.closure` (`temporal.venueState`).
So one branch of a chain shutting while the others trade — the realistic
case, in a corpus that already holds chains whose branches differ — had exactly
one encoding: **delete the branch**. That destroys the record that it ever
traded, which is the loss ADR 0023 exists to prevent.

The owner ruled on 2026-08-22 that **closure becomes per branch**, taking the
schema change over a recommendation to leave it venue-level (no venue in the
corpus is closed). His one condition, stated in the item: *a venue-level
closure must still shut every branch, or this becomes a regression.*

Measured at the start of this work: 57 records, **0** carry a
`lifecycle.events` entry, **0** branches carry anything lifecycle-shaped. So no
real record changes, and every behaviour below is exercised by fixtures.

## Decision

### 1. A branch may carry `lifecycle` — the same block, one level down

`locations[i].lifecycle` is `{ opened?, added?, events? }`: the venue's shape,
with `added` optional (absent = the branch entered Faves with its venue). It is
folded by the **same** `venueState` a venue's is (`resolveRecord` sets
`branch.closure`, only where the branch has a lifecycle, so every existing
record resolves to exactly the shape it did), and validated by the **same**
`check_lifecycle_block` in `validate.py`. One shape at two levels, because a
rule enforced on one and not the other is a branch the app folds differently
from how the gate read it.

`validate.py` also refuses three things rather than let the browser resolve
them quietly:

- a lifecycle on the **sole** branch of a one-branch `locations` — its life is
  the venue's, and two places to say one thing drift;
- a branch `added` **before** its venue's;
- **every** branch ending permanently closed while the venue does not — the
  app reads the venue's closure for ranking, "Open now", search and the home
  card, so that chain would be offered as open for ever. (Every branch shut
  only *temporarily* is a warning: they may reopen on different days.)

### 2. The venue's closure is the floor; the more severe closure wins

`temporal.branchClosure(record, branch)` is the one answer every branch
surface reads:

| venue | branch's own | answer |
|---|---|---|
| trading | refit / gone | the branch's — the mixed case |
| refit | gone | the branch's: when the chain reopens, that branch does not |
| gone | anything | the venue's |
| equal severity | | the venue's — the words the header banner already says |

`isBranchTrading` is its predicate. `branchOpenStateOf`, `branchSummary`
/`branchClosureBadge` and `hoursRow` (menu.js) all read it — the 2026-08-19
engineering fix re-pointed from the venue to the branch, with the venue as
the fallback the table above makes structural rather than remembered.

### 3. `leadBranch` never leads with a shut branch while a trading one exists

`branchOpenStateOf` now answers `"shut"` for a branch that has stopped
trading, not `"closed"`. The distinction is the point: the old three tiers
(open → unknown → nearest) fall through to *the nearest* when nothing is open
or unknown, and at 2am that is whichever branch is nearest — shut for good or
not. A fourth tier sits before that fallback: **a branch that still trades,
even if its hours say it is shut right now**, leads over one that has
shut. The nearest shut branch leads only when every branch is shut (a
venue-level closure), where there is nothing better to offer.

`nearestBranch` (locations.js) applies the same rule, because it is what the
**home screen** reads — the card's hours badge, "Open now", the ranking tier,
the pinned bar on the menu page. Without it, a chain whose nearest branch had
shut would read "Open · until 9pm" on the home card from the shut branch's
posted week, while the menu page led with a different branch: the fifth-surface
disagreement this item is named for, reintroduced one screen over. When nothing
trades, every branch is a candidate again, exactly as before.

### 4. `isGone` is given its job, not deleted

`isGone` had zero callers — while `app.js` carried a hand-typed copy of it
(`r.closure?.state !== "closed-permanently"`, the home card's "Menu coming
soon" suppression for a stub). So the distinction it names *is* one the app
makes: a stub shut for a refit still promises a menu; one closed for good does
not. It now **is** that call, and takes an optional branch
(`isGone(r, branch)`) so a branch-level "gone" is asked the same way. A
predicate plus an inline twin is two answers to one question waiting to drift;
deleting the predicate would have kept the twin and lost the name.

On the branch card itself the two closures already read differently — the
badge text comes from `closureBadge`, which says "Permanently closed" or
"Temporarily closed · back 3 Dec" — so no further per-branch use was invented.

## Rejected

- **Keep closure venue-level** (the recommendation the owner overruled): the
  only way to record a shut branch stays deleting it.
- **A branch's own closure always wins over the venue's.** Reads naturally and
  is exactly the regression the ruling forbade: a branch on a refit inside a
  chain that has closed for good would say "Temporarily closed · back …" under
  a banner saying "Permanently closed". `tj-katsu-closed-branch-refit-fixture`
  exists to fail on it, and does (below).
- **A `closed: true` flag on a branch.** ADR 0023 rejected it for venues — a
  flag has no date and goes stale silently. Same reasons here.
- **Fold "shut" into "closed" inside `leadBranch`.** Simpler, and wrong at
  night: every trading branch is also "closed" at 2am, so the tie fell to the
  nearest, which could be the shut one. Measured: that probe fails
  `tj-katsu-branch-shut-lead-fixture` and nothing else.
- **Leave `nearestBranch` alone** and fix only the menu card: see §3 — the
  home screen would disagree with the card the moment a branch is marked shut.

## Consequences

- **Zero data changes.** No branch in the corpus is known closed.
- `tools/lib/fixtures.mjs` gains `one-branch-shut` and `one-branch-refit`
  (both gated by `fixture_check.mjs` over every multi-branch source, and
  composed with a venue closure). `branch_check.mjs` gains three fixtures:
  one of seven branches shut; a two-branch chain where the other branch is
  shut by its posted hours at every hour (the lead-tier case); and a closed
  chain with one branch on a refit (the floor).
- 🔎 **Found on the way: `NEVER_OPEN` had stopped meaning never open.** It was
  `{}`, documented as "hours.js answers CLOSED". Since ADR 0105 a missing day is
  a day never *published*, so `{}` answers `unknown-today` — which `leadBranch`
  treats as neither open nor closed. It is now every day `[]`. Measured
  consequence for the 490/100 bar fixture: with `{}`, the assertion "the bar
  follows the NEAREST branch, not the primary" **passed with the bar re-pointed
  at the primary**; the fixture still failed that probe, but only through its
  word-for-word assertion. `{}` was also not a legal week, and nothing validates
  a fixture's `hours` override — that gap is left open and named here.
- `docs/roadmap/…/050` (the repeats on a shut chain) is now unblocked, as the
  item said it would be; this record does not touch it.
