# Cold pass — the activity log and "Delete everything" (ADRs 0164, 0167; refs-only)

**Status:** BRIEF ONLY — the review has NOT run. Written 2026-11-02 1204
UTC for board items `180/010` (Delete everything) and `390/010` + `390/040`
(32a, 32d: the activity log's recorder, export and wipe). **Fable-gated:**
the pass runs only on the owner's explicit approval of Fable work at the
time. The verdict goes below a divider in this file (atelier `REVIEW.md`
§ *The lifecycle*).

## Provenance

This brief was written by a brief-writing sub-agent (Claude Opus 5.5) of
session `2be3482c`, on the owner's instruction of 2026-11-02, verbatim:
*"Write briefs for anything that needs a review in any of the repos, where a
brief is not ready"*. Neither record carried a review line. The sub-agent
wrote none of the subject, ran no review, and formed no finding. It wrote
the held-back sibling named below.

**Barred from taking this pass** (rule 4: the review comes from a session
the author neither started nor instructed):

- session `faves-b4` and the workers it ran on 2026-10-18 (`w/180-010` and
  `w/390-010`), which built both changes;
- this brief-writing sub-agent and its parent session.

**Tier: Fable, checked at selection.** A session not on Fable stops, and
neither takes the item on a lower tier nor proceeds hoping the pass is
accepted (`REVIEW.md` rule 4). An off-tier orchestrator, if any, forms no
finding, writes no severity, and is disclosed in the claim, the pointer and
the verdict. The verdict repeats this provenance.

## Subject

Two merged changes on `main`, built the same day; the second deletes what
the first records. Read each commit body-free:
`/usr/bin/python3 ../atelier/tools/coldsweep.py --commit <sha>` (from the
primary checkout; from a worktree, use
`"$(git rev-parse --git-common-dir)/../../atelier/tools/coldsweep.py"`).
Plain `git show` is barred until phase 2: it prints the body ahead of the
diff, and reading is atomic (`REVIEW.md` rule 1).

**A. The activity log** (ADR 0164; PR #125, merge `a8874b10`):

| Commit | What | Files |
|---|---|---|
| `36b82960` | the recorder (32a) | `site/js/activity.js` (new), `cart.js`, `favourites.js`, `profiles.js`, `ratings.js`, `settings.js`, `site/sw.js`; tests `activity.test.js`, `activity-wiring.test.js`, `storage-writers.test.js` |
| `1ba3751f` | backup and wipe, off sync (32d) | `site/js/personal-data.js`, `personal-io-ui.js`, `settings-ui.js`, `user-schema.js`; tests `activity-backup.test.js`, `personal-data.test.js` |
| `2f15c0eb` | the record | ADR 0164, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, the decisions README, the two item files |

**B. Delete everything** (ADR 0167; PR #128, merge `94138b89`):

| Commit | What | Files |
|---|---|---|
| `7c79945b` | the erase and the sync epoch | `site/js/live-stores.js`, `personal-data.js`, `sync-merge.js`, `sync-start.js`, `sync-ui.js`, `sync.js`, `site/sw.js`; tests `erase.test.js`, `sync-wipe.test.js`, `old-hearts-320.test.js` |
| `e6c11df7` | the second control | `site/js/settings-ui.js`, `site/css/app.css` |
| `8df4930e` | browser checks | `tools/device_check.mjs`, `tools/sync_check.mjs` |
| `43528226`, `2d002f9b` | size budgets | `tools/chatty_check.mjs` |
| `bd7bfb12` | the record | ADR 0167, `CHANGELOG.md`, the decisions README, the item file |

No later commit on `main` touches `activity.js`, `personal-data.js`,
`sync.js`, `sync-merge.js`, `live-stores.js` or `settings-ui.js` (checked
at `649696c5`). Review the files as they stand.

**Intent records** (refs only; read at phase 2): ADRs `0164` and `0167`;
the owner's 2026-08-16 rulings in
`docs/roadmap/430-owner-rulings-2026-08-16-end-of-the-branch-pic/README.md`;
Theme 32's README (`docs/roadmap/390-*/README.md`); ADRs `0060`, `0146` and
`0154`, which these build on. 🚩 **Not** the three item files until phase 2:
each carries the builder's own account of the work.

## Type

Built and shipped work in a public, accountless app, and direction: ADR
0167 sets how every later store must behave under a deletion, and ADR 0164
sets what a behaviour record may hold. Whether any part is doctrine by
function (`REVIEW.md` rule 3) is for you to judge and state.

## Why it earns a review

"Delete everything" is irreversible by design and acts on every device in a
sync group, so its two failure modes are both silent: data that survives a
deletion the person was told had happened, or a deletion that reaches data
nobody meant to delete. The activity log is, in its own record's words, the
most sensitive thing the app stores. Neither change has had an independent
pass.

## Scope and the four lenses — run all four

Scope is the whole commitment: the rulings' intent, both decisions and what
they rejected, the code, the tests (a wrong test verifies nothing), the
browser checks, the docs, and real-world behaviour, exercised wherever this
machine allows. An impossibility claim states its grounds.

1. **Approach & assumptions** — the most important. Name the load-bearing
   assumptions yourself, as your first act, before reading the list below.
2. **Correctness & quality** — does each change do what its ADR says;
   anything overclaimed, stubbed or silently cut.
3. **Completeness / harvest** — every store, key and path the two records
   should reach; every mirror site of a changed rule (`REVIEW.md` V3).
4. **Security & privacy** — a must. What the log holds and who can read it;
   what a sync peer, or anyone holding a sync code, can make another device
   do; checked against open catalogues (OWASP ASVS, OWASP Top 10), not
   memory. Aim `/security-review` at the JS delta by staging it in a
   scratch worktree of your own; weigh it as one input. Never run it over
   this file while the sibling below still exists.

Run the standing checklist (V1–V7) unasked.

## Load-bearing claims to attack

The records' own claims, in their own terms — a floor, never a fence.
Damage each with a probe or confirm it by re-driving it.

- **C1** — The activity log is per person, never in the sync snapshot, and
  in a backup file only when the person asks for one (`localOnly`).
- **C2** — Nothing in the log can be erased short of wiping the whole log;
  there is no per-entry delete.
- **C3** — The log is capped at 500 entries per person, about 80 KB at the
  cap.
- **C4** — A settings change logs which dial moved, never its value, on
  write, on read and on import; an allergen value never enters the log.
- **C5** — Recording never blocks or breaks the write it follows.
- **C6** — "Delete everything" removes every `faves.` key except a
  four-key keep-list, and `tests/erase.test.js` fails on any storage-key
  literal it has not classified.
- **C7** — A deletion propagates as an epoch marker, so a heart another
  device added since the last agreement does not come back, and the four
  never-synced stores are emptied on every device that honours it.
- **C8** — Two deletions at once converge on the later one; a deletion made
  offline waits and is sent later.
- **C9** — The confirmation states only what is true: it names every store,
  names the scope without a device count, and says *sent* or *will be sent*.
- **C10** — A build from before ADR 0167 ignores the marker, and the
  record's stated consequence of that is complete.

## Grounding — re-run lines

Each run once by the brief-writer on 2026-11-02, from a fresh worktree of
`origin/main` at `649696c5`, Node v24.18.0. Re-run every one; a line that no
longer reproduces is a finding.

- `nice -n 19 node --test tests/erase.test.js tests/sync-wipe.test.js
  tests/activity.test.js tests/activity-backup.test.js
  tests/activity-wiring.test.js` → 66 tests, 66 pass, exit 0.
- `nice -n 19 node --test` (the whole suite; pass no path) → 2,016 tests,
  2,016 pass, exit 0.

**Not run by the brief-writer, with grounds:** `node tools/device_check.mjs`
(section 12) and `node tools/sync_check.mjs` (5g): both drive a browser, and
the brief-writer ran no browser. The item records *"`sync_check` 5g (40 →
47)"*; re-run both, and run each new test against the parent version of its
subject (a scratch copy from `git show <sha>^:<path>`) to show it fails on
the old code. A test the old code passes proves nothing about the change.

## Rule 2 — what is barred until your findings are committed

"Committed" means durably written to your draft of this file.

- The commit message bodies (see *Subject*).
- The three item files, and the session records (`docs/SESSIONS.md`, and
  any detail files), which carry the builder's account. If your onramp
  reads them, treat them as claims and disclose that you did.
- Prior verdicts in `docs/reviews/`; search with `coldsweep.py`, whose
  default bar excludes them.

## Non-goals

- 32b (the activity screen) and 32c (system events): not built.
- *Reset preferences*' own scope, which the owner ruled unchanged; in scope
  only where the second control changed it.
- Changing the owner's 2026-08-16 rulings. Where you judge one wrong, label
  the finding *against a ruling*, for the owner.

If a non-goal fences off a risk the work actually carries, say so as a
finding.

## The held-back sibling

`2026-11-02-1204-delete-everything-and-activity-log-cold.deferred.md`,
beside this file, holds 8 entries. Open it only after your findings are
durably written here; then fold it in below your verdict and delete it
(`REVIEW.md` rule 1).
