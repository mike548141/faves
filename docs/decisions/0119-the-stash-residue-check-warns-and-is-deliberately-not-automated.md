# 0119 — The stash-residue check warns, and is deliberately not automated

**Status:** Accepted.

**Date:** 2026-09-21

## Context

Roadmap `340/220` found two stash entries on this repository's stack that had
sat there for three weeks, from two different sessions, one of them an
`autostash` nobody typed. Nothing was lost — their contents had all reached
`main` — which is the finding, because residue is what nobody investigates.

The stack is **per-repository**: `refs/stash` lives in the common git dir, so
every linked worktree shares one stack. Measured 2026-09-21 on git 2.50.1 — a
`git stash list` inside a linked worktree lists entries pushed from the primary
checkout, same order, same `stash@{N}` selectors. A bare `git stash pop`
anywhere pops `stash@{0}`, whoever made it.

The rule half went up and came back: atelier's Concurrency floor now opens
*"At session start read `git status` first — dirty work this session didn't
make means stop and move, never autostash it"* (atelier `54201e0`, settled as
atelier `320/210`, merged 2026-09-17). That covers **creation** and **use**. It
does not cover **cleanup**, and the owner ruled on 2026-09-21 — shown the
counter-argument that the floor now covers this and that this repo already
carries ~20 gates a human must type — to build the local check anyway:
a doctrine line is a discipline, and [ADR 0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)
is precisely about guards that exist but cannot change an outcome.

## Decision

`tools/check_stashes.py` warns when the shared stash stack is non-empty **and**
any entry predates today. Three decisions inside that sentence rejected a
plausible alternative, and each is the sort a future session will re-propose.

### 1. It never mutates, and the item is the reason

It runs exactly one git command — `git stash list --format=…` — and never
applies, pops, drops, shows, clears or checks out. **An entry on the stack is
another session's uncommitted work, and dropping one is not a delivering
session's call.** That is `340/220`'s own ruling, and it is why this is a check
and not a cleanup. The promise is asserted, not claimed: `--selftest` counts the
entries and their SHAs before and after a firing run and demands they match.

**Rejected: a `--clean` or `--drop-older-than` flag.** The residue this item
found was cleared by somebody, unrecorded, and `git reflog show stash` now
errors with *"unknown revision"* — the ref went and took the reflog with it, so
**who dropped them is unrecoverable**. A flag that makes that outcome one
keystroke away is a flag that will eventually be typed by an agent tidying up.

### 2. "Predates today" is a LOCAL calendar-day test

CLAUDE.md warns that this repo runs two date conventions — `sw.js` version
constants on **NZ local**, record filenames on **UTC** — and that from midday
UTC the two name different days. So the zone has to be chosen, not inherited
from whichever call was handy.

**Chosen: the machine's local zone.** The stash stack is a local, per-machine
artefact: never pushed, never fetched, with exactly one reader — the person or
agent at this checkout. "Predates today" is a question about *their* day.

**Rejected: UTC**, to match the record-filename convention. It would tell a
session working at 1am NZST that a stash it made forty minutes ago is from a
previous day. **Rejected: hard-coding `Pacific/Auckland`**, to match the `sw.js`
convention. It is right on the owner's machine and wrong on every other, and
local *already* equals NZ local there — so hard-coding buys nothing and costs
correctness elsewhere.

The boundary is testable rather than reasoned about: `--now` freezes today.
`--selftest` freezes it at 2026-09-21 and runs `2026-09-20T23:59:59` (fires)
against `2026-09-21T00:00:00` (quiet), then runs **one fixed instant under two
`TZ` values and demands opposite verdicts**. That case is what stops the zone
choice silently becoming a different one.

### 3. 🛑 It is NOT wired into `.githooks/pre-commit` or CI — on purpose

This cuts directly against this repo's own instinct (ADR 0072 face 7: *a guard
that is not automated is not a guard*), so the reason is recorded here rather
than left to be rediscovered as an omission.

- **Exit 1 is not a statement about your change.** It is a statement about
  somebody else's uncommitted work. Wired into the pre-commit floor, one peer's
  live stash would block **every commit in the repository**, by every session,
  until a stranger's work was dealt with — which is exactly the blocking
  `340/220` refuses. Blocking on a shared surface converts a warning into a
  hostage.
- **In CI it could never fire.** A runner clones fresh; a fresh clone has an
  empty stack by construction. That is ADR 0072 face 2 — a guard whose trigger
  nothing can observe — and adding it to `ci.yml` would manufacture a green
  line that means nothing.

It belongs on CLAUDE.md's verify list, typed by a human or an agent, in the
checkout that actually has the stack. That is the *only* place it can both fire
and be right.

## Consequences

The verdict names **the common git dir** — `/…/faves/.git` — as well as the
checkout it was read from. Two worktrees print the same stack home, so the
per-repository fact is visible in the output rather than only in a docstring.
ADR 0072's second consequence, applied: a verdict is worthless without the
identity of what it checked.

The clean verdict prints the **count**: `Stash stack OK: 0 entries` versus
`2 entries`. An empty stack and a stack of same-day entries are different facts,
and a guard printing one word for both cannot be told from a broken one.
"Could not read the stack" exits **2**, never 0.

One blind spot, said out loud because a guard's blind spot is not the reader's
to guess: **a rebase stopped by a conflict keeps its autostash in
`.git/rebase-merge/autostash`, not on `refs/stash`** — measured here — so this
check cannot see that one. The tree line's `REBASE IN PROGRESS` marker is what
covers that state, from a different direction.

Verified against a broken version of itself. Four break-probes, each reverted:
`predates_today` forced False fails 6 cases and passes every "quiet" one;
forced True fails 4; reading dates in UTC instead of local fails 4 including
the two-zone case; and a `git stash drop` added to the read path (guarded to
fixtures) fails 9, the read-only assertion among them.

## Rejected

**Leaving it to the floor.** Put to the owner with the argument stated. He
chose the mechanism.

**Making it a `git` alias or a shell snippet in CLAUDE.md.** It would not carry
the tree line, could not be self-tested, and would be one more thing whose
description is not evidence about its behaviour.
