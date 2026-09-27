# 0129 — The FX refresh restamps itself instead of going stale

**Status:** accepted
**Date:** 2026-09-28

## Context

Roadmap `280/020` found that `.github/workflows/fx.yml`'s weekly refresh could
open a pull request that never merges, and never goes stale gracefully either.
PR #5 (cut 2026-08-23) and PR #6 (2026-08-30) were both closed by hand on
2026-09-06, unmerged. Two separate faults, found from the PR record rather
than assumed:

- **Reason 1 — `floor / scanner floor` fails the bot's branch.** The floor
  runs atelier's scanners at *their* current HEAD against the whole tree, not
  just the PR's diff, so a branch that changes only `site/data/fx.json` can
  still fail on findings that live elsewhere in `main` — `board` index
  staleness, `datescan`, `wrapscan` — none of them caused by the FX change.
- **Reason 2 — a PR that waits goes backwards.** `DATA_VERSION` was stamped
  once, at cut time, into a branch named `fx/refresh-<AS_OF>`. Any further
  data-affecting change on `main` while the PR sat open made that stamp
  *earlier* than main's own — and `check_versions.py`'s `went_backwards()`
  exists precisely because merging that moves the cache name backwards: a
  phone that already installed the newer name keeps serving it, and the
  older name's cache, present and READY, is what a later "revert" would
  actually restore. Worse, the OLD per-date branch naming meant a stale,
  never-merged PR was simply abandoned rather than superseded — nothing
  pointed at it, and nothing rebuilt it, so it just aged in place.

The roadmap item weighed four options and recommended (1) rebase-and-restamp:
make the refresh correct at merge time, not only at cut time. (2), a narrower
required-check set so this one-file data change cannot be held hostage by an
unrelated floor finding, was named as the owner's to rule on (ruleset change,
tracked in `340/180`) and is deliberately not decided here.

## Decision

**One stable branch, `fx/refresh`, replacing the per-date
`fx/refresh-<AS_OF>` naming.** There is at most one open FX PR ever. Re-running
the workflow — for any reason, on any trigger — restamps that one PR; it never
opens a second one and never leaves an old one to rot unaddressed.

**Every run recreates the branch from *current* `main`, not from whatever
`main` was when an earlier run cut it.** `actions/checkout@v4` with no `ref:`
override already puts the job on the default branch's current tip for
`schedule`, `workflow_dispatch` and `push` alike, so `git checkout -B
fx/refresh` inside that checkout is, unconditionally, a rebase onto *now*.
`fetch_fx.py --bump` then computes its `DATA_VERSION` bump from the `sw.js`
sitting in that fresh checkout — so the bump is always relative to whatever
`main` currently holds, never to a snapshot from however many weeks ago the
branch first existed.

**Restamp on every push to `main`, not only on the weekly schedule.** A new
`push: branches: [main]` trigger means an open `fx/refresh` PR is never more
than one `main` commit stale at the moment its checks are evaluated — closing
the gap from "up to a week" (the schedule's own cadence) to "the next commit
to land". The added trigger is cheap on the common case: a `gh pr list` call
answers "is anything of ours open?" before Python is even set up, and a push
with nothing open exits immediately without touching the network or the
fetch guards in `fetch_fx.py`.

**Same-branch force-push stays safe for the reason already documented in this
file's header before this change**: `fx/refresh` is this workflow's own
scratch space, never a human's, and outside `protect-main` (which covers only
the default branch).

## Rejected

- **A guard that blocks the merge outright when the branch's base is behind
  `main`**, as a distinct mechanism from restamping. Considered, and folded
  into the restamp itself rather than built separately: since every run that
  reaches the commit step is *already* rebased onto current `main` by
  construction (the checkout is on it), a same-run "is my base stale?" check
  would always read "no" immediately after the push that just answered it —
  redundant with the mechanism itself. `check_versions.py`'s existing
  `went_backwards()` (the `service-worker version lockstep` required check)
  remains the independent backstop for the residual window between a restamp
  and an actual merge; strengthening that further needs "require branches to
  be up to date before merging" in the ruleset, which is a ruleset change and
  the owner's call, not something this workflow can add unilaterally.
- **Restamping (bumping `DATA_VERSION`) on every push regardless of whether a
  rate actually changed**, to close the residual case where an *unrelated*
  data change on `main` bumps `DATA_VERSION` while the open FX PR's own rates
  are unchanged. Rejected: `fetch_fx.py`'s own design principle is that a
  write with identical numbers costs every installed phone a redownload of
  the data cache for nothing (documented in the tool already), and forcing a
  version bump with no content change contradicts that outright. This is a
  known, narrow residual: it requires an unrelated `DATA_VERSION` bump to land
  on `main` while an FX PR is open *and* stuck on floor *and* FX rates
  themselves have not moved since. It is defended-in-depth by
  `check_versions.py`'s required check exactly as the paragraph above
  describes, and fully closing it is the same ruleset-territory fix as the
  point above.
- **Stop opening PRs; push straight to `main`.** Unchanged from the original
  design's rejection (ADR 0045): a scheduled job cannot satisfy
  `protect-main`'s required checks on a direct push, proved rather than
  assumed on 2026-08-16.

## Consequences

**Fixed: Reason 2, in full for the common case, and bounded for the rest.** A
restamped `fx/refresh` PR's `DATA_VERSION` bump is always computed against
`main` as of the run that produced it, and a run fires on every push to
`main` (while the PR is open) as well as weekly — so the branch is never more
than one commit behind at the moment its checks run. The dry run below
demonstrates the old per-date, cut-time-only stamp going backwards against a
`main` that moved on, refused by the repo's own `check_versions.py`; the
restamped branch, rebuilt from current `main`, is not refused.

**Not fixed: Reason 1.** Restamping onto fresher `main` does nothing for a
floor finding that lives in `main`'s own tree — if it is still there, the
freshly-cut branch's tree still carries it too. An FX PR can sit open,
correctly restamped every time `main` moves, indefinitely, without ever
passing floor. Closing that is `340/180`'s narrower-required-check-set
question, and it is the owner's ruleset call, not this workflow's.

**Two runs overlapping.** Unchanged: `concurrency: {group: fx-rates,
cancel-in-progress: false}` already serialises every invocation regardless of
which trigger fired it, so a burst of pushes queues cheap early-exit runs
rather than racing one push-in-flight against another.

**`fetch_fx.py --bump` finding no change.** Unchanged behaviour when no FX PR
is open (schedule/dispatch: nothing to do, as before). When a push-triggered
run finds an FX PR open and the freshly fetched rates equal what `main`
already has, no commit is made and the existing PR is left as it was from its
last real restamp — see the rejected alternative above for why this is not
force-bumped, and the residual case that leaves open.

## Verification

A throwaway local git repo (bare "remote" + a "runner" clone) staged the
exact incident: a branch cut against an early `main`, then an unrelated
commit bumping `DATA_VERSION` on `main` while that branch sits open, then the
restamp. The repo's own `tools/check_versions.py` — copied in unmodified, not
reimplemented — was the judge: `--range origin/main..origin/fx-refresh-<old>`
(the never-restamped branch) fails with `DATA_VERSION goes BACKWARDS`, while
`--range origin/main..origin/fx-refresh` (the restamped branch, rebuilt from
the *then-current* `main`) reports `Version lockstep holds`. The GitHub-side
half — `gh pr list`, `gh pr create`/`edit`/`merge --auto`, the push trigger
actually firing on a real merge to `main`, and the approval-gate interaction
with `FX_TOKEN` — was not exercised, because it needs a live PR/Actions run
against `origin/mike548141/faves`, which is outside a local dry run's reach.
