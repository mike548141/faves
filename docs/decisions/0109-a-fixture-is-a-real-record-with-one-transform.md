# 0109 — A fixture is a real record with one transform, gated by the real validator

**Status:** accepted. Generalises the one-off `overlay` added to
`startServer` on 2026-08-19 while shipping the branch card's closure
precedence. Bounded by `0047-the-app-ships-only-what-it-renders.md`, which
is why no fixture may live in `site/data/`.

**Date:** 2026-09-09 • Roadmap `340/150`

## Context

The shipped corpus is uniformly healthy, so a whole class of behaviour ships
unexercised. **Re-measured 2026-09-09 across all 57 venue files:**

| state | in the corpus |
| --- | --- |
| `lifecycle.events` (any closure at all) | **0 of 57** |
| a `null` day — "the venue never published that day" (ADR 0105) | **0** |
| a section with no items | **0** |
| a dish with no recorded price | **0** |
| a venue with no hours anywhere | 12 of 57 |
| a branch with no hours | 10 of 47 |

So there is no closed venue, no overdue reopening and no unpriced dish
anywhere in the data. The site nonetheless has code for all of them —
`menu.js` prints `—` for a dish with no price, `closure-ui.js` drops the
stated return date of an overdue temporary closure — and **nothing in the
repo had ever made either line run**.

The consequence is what makes this worth an ADR rather than a fixture:
*"the checks are green"* says nothing about a state the corpus does not
contain. That is not a gap in the checks. It is a gap in the fixtures, and
from the outside the two look identical. It has already cost this repo once
— the guard meant to cover a shut-down chain passed *"the lead is not a
branch we know is closed"* on a permanently-closed chain, because with no
closed venue to run against, the rule's vacuous pass read exactly like a
real one.

## Decision

**1. A fixture is a REAL corpus record with one named transform applied.**
Derive, never author. `tools/lib/fixtures.mjs` holds the states by name, and
a check asks for one — *"a venue that is permanently closed"* — instead of
hand-rolling JSON.

**2. Every generated fixture is validated by the REAL `tools/validate.py`.**
`tools/fixture_check.mjs` builds every state in `STATES` — read off the
object, not a hand-listed subset — over two structurally different venues,
writes them into a sandbox copy of the tree, and runs the actual gate,
demanding zero new ERROR lines. New *warnings* are allowed and printed: a
degenerate record may well warn, and refusing warnings would push the next
author to weaken the fixture instead of the check.

**3. A fixture lives only as overlay bytes.** Never in `site/data/`.

**4. A state declares the shape it needs (`requires`), and a pair the source
cannot hold is skipped and named.**

**5. `--selftest` breaks each fixture and demands the validator name that
fixture, with the regex its own complaint must match.**

## Why derived rather than authored

This is the whole design, and it is aimed at the one failure mode every
fixture library has: it encodes a shape the product has moved past, and then
the check standing on it passes against a fiction while printing PASS. That
is worse than no fixture, because the green run gets read as coverage.

A hand-written venue is frozen on the day it was typed. It does not grow
`sectionId` when ADR 0058 lands, or `dishId` when 0051 does, or a branch
`id` when 0103 does — and the browser check standing on it goes on passing.
A derived fixture gains all of those on the day the corpus does, for free,
because those fields were never ours to maintain.

## Why the real validator rather than a JS schema check

A second copy of the rules is a rule that can be locally right and globally
wrong; this repo has paid for that shape before. Shelling out to
`validate.py` costs one subprocess and **cannot diverge**.

It is not a theoretical benefit. The gate caught three faults before any of
this was committed:

1. the empty-section transform wrote `{id, name}` where the schema says
   `{section, sectionId}`;
2. the unpriced dish collided on a derived `dishId`;
3. a module-level closure constant was **aliased** into every fixture, so one
   `--selftest` case's mutation leaked into the next five and satisfied all
   of them — every case green, two of them proving nothing.

None of the three would have shown up in a browser: the page renders
*something* for each, and the assertions would have measured it and passed.
The third is why every self-test case now names its expected complaint,
which is `test_validate.py`'s 2026-08-17 lesson arriving by the same route.

## Alternatives rejected

**Invent a closed venue in `site/data/`.** Rejected: a venue file there is
precached onto every phone (ADR 0047), so this ships a fiction to the world
to make a test pass. Rejected on 2026-08-19 and still rejected.

**Stub `fetch` inside the page.** Rejected as the default: it tests a fake
instead of the real load path. `midnight_check.mjs` does stub `fetch` and
keeps doing so for a reason this decision does not remove — it toggles the
**same id** patched and unpatched inside one run, so its pair reads as one
venue changing rather than two venues differing, which an overlay cannot
express. That is a stated exception, not a third idiom by drift.

**A synthetic sibling corpus served wholesale** (the item's option 3).
Rejected: most thorough, most to keep in step with the real schema, and the
most likely to rot — it is the "authored" failure mode at corpus scale.

**Leave `overlay` per-tool** (the item's option 1). Rejected: it was already
drifting into three idioms by the time the item was read.

## Consequences

- Seven named states, all schema-legal, all gated. `branch_check` builds its
  closure fixtures from the library rather than hand-rolling them; 98 passed,
  0 failed before and after.
- The fixtures immediately found live facts nothing had asserted: an overdue
  reopening drops its date and that branch had never run; and `temporal.js`
  drops a section with no items **for a stated reason that is false** — its
  comment says *"a data error validate.py catches"*, and the schema gate here
  proves validate.py accepts it. The behaviour survives its wrong reason;
  the comment is recorded in `340/150` rather than changed, because that
  change would touch `site/`.
- 🚩 **The standing consequence does not go away.** These are the states
  someone thought of. A state nobody has named is still invisible, and still
  looks exactly like a passing check.
- `fixture_check.mjs` is not in CI, like fifteen of the seventeen browser
  checks. Its **schema half** runs without a browser (`--schema-only`) and is
  the half that rots silently, so it is the half worth wiring in first.
