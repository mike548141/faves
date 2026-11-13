## 2026-09-20-1237 — session `3e87e0bf` (worker): the stash stack gets a check, and it is kept out of CI on purpose

*(Heading is **UTC** per the concurrency clause; the work is dated 2026-09-21
everywhere else, which is NZ local. The two conventions name different days
from midday UTC — the same split this check had to choose a side of.)*

Roadmap `340/220`, owner-ruled the same day: **build the local check.** Option 2
of three, the only one still open — option 1 (drop the two entries) went moot
when somebody cleared them unrecorded, and option 3 (write the rule down) came
back from atelier as floor doctrine on 2026-09-17. What was left was whether to
mechanise the cleanup half locally. He was shown the argument for *not*
building it — the floor now says *"read `git status` first … never autostash
it"*, and this repo already carries ~20 gates a human must type — and chose the
mechanism, on the reasoning that a doctrine line is a discipline and ADR 0072
is about guards that exist but cannot change an outcome.

Delivered: `tools/check_stashes.py` and
[ADR 0119](../decisions/0119-the-stash-residue-check-warns-and-is-deliberately-not-automated.md).
Stdlib only; one git command, `git stash list --format=…`, and no other.

### The premise was measured, not quoted

The item rests on the stack being per-**repository**, so that was checked
first rather than repeated. On git 2.50.1, from the worktree
`faves-stashcheck`: `--git-dir` is `…/faves/.git/worktrees/faves-stashcheck`
and `--git-common-dir` is `…/faves/.git`, and `git stash list` there lists
entries pushed from the **primary checkout**, same order, same `stash@{N}`
selectors. `refs/stash` lives in the common dir. The premise holds — so the
check prints the common git dir in its verdict beside the checkout it read
from, and two worktrees visibly name one stack instead of the fact living only
in a docstring.

### A sharp edge the item did not have

Building a fixture that produces a *genuine* leftover autostash turned up
something worth keeping. An autostash reaches `refs/stash` only when the rebase
**completes** and the re-apply conflicts — git prints *"Your changes are safe
in the stash"* and **exits 0**. 🔑 It is the successful-looking rebase that
leaves somebody's uncommitted work on a shared stack. A rebase *stopped* by a
conflict is the opposite: its autostash stays in `.git/rebase-merge/autostash`
and this check cannot see it. That blind spot is written into the tool's own
docstring and into ADR 0119 rather than left to be discovered, and the tree
line's `REBASE IN PROGRESS` marker covers that state from another direction.

### The three decisions, and the one that cuts against this repo's instinct

**It never mutates**, and no flag could make it. The residue this item found
was dropped by *somebody*, unrecorded, and `git reflog show stash` now errors
with "unknown revision" — the ref went and took its reflog with it, so who is
unrecoverable. A `--clean` would put that outcome one keystroke from an agent
tidying up.

**"Predates today" is a LOCAL calendar day.** This repo runs two date
conventions and CLAUDE.md warns they disagree from midday UTC, so the zone had
to be chosen rather than inherited. The stack is a local, per-machine artefact
with one reader: the person at this checkout. UTC would call a stash made at
1am NZST part of the previous UTC day; hard-coding `Pacific/Auckland` is
right on one machine
and wrong on every other, and local already equals it there.

🛑 **It is NOT wired into the pre-commit floor or CI, deliberately.** That cuts
against ADR 0072 face 7 — *an un-automated guard is no guard* — so the reason
is recorded rather than left as an omission. Exit 1 here is a statement about
**somebody else's** uncommitted work: in the floor, one peer's live stash would
block every commit in the repository, which is exactly the blocking `340/220`
refuses. And in CI it could never fire at all — a runner clones fresh and a
fresh clone's stack is empty by construction, which is face 2. It belongs on
the verify list, typed in the checkout that actually has a stack. The
verify-list line was handed to the merging session rather than written here:
this worker held `tools/` and `docs/`, and a peer held `CLAUDE.md`.

### The ADR 0072 test, answered in both directions

This repo's stack is empty and has been since 2026-09-08, so a naive check
passes trivially and would pass identically if it were broken. `--selftest`
builds throwaway repositories under a temp dir — never a stash in this repo or
any worktree of it — and runs **14 cases**: it **fires** on an entry older than
today, on a mixed stack counted honestly as `1 of 2`, on `2026-09-20T23:59:59`
and on a real autostash; it **stays quiet** on an empty stack, on two same-day
entries and on `00:00:00` today; it exits **2**, not 0, on a directory that is
not a checkout and on an unparseable `--now`. Three more hold the promises: the
stack is byte-identical after a firing run, a worktree sees the primary's
stash, and the tree line names *this* gate's tree rather than the fixture. One
case pushes a single fixed instant and runs the check under two `TZ` values,
demanding **opposite verdicts** — which is what stops the zone choice silently
becoming a different one.

Then the suite was broken on purpose, four ways, each reverted: forcing
`predates_today` to `False` fails 6 cases and no quiet ones, to `True` fails 4,
reading dates in UTC fails 4 including the two-zone case, and a `git stash
drop` spliced into the read path (guarded to fixtures) fails 9. A selftest that
cannot fail is the thing the ADR it cites is about.

### Said plainly

The check has **never fired on real residue**. Its evidence is the selftest and
the break-probes; the live stack has been empty throughout. No `CHANGELOG.md`
line — this is dev tooling, nothing in `site/` changed, and no version constant
moved.

