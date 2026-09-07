- [ ] 🚩 **The weekly FX PR opens correctly and cannot land on its own — the
      floor fails it, and a week on the shelf moves `DATA_VERSION` backwards**
      `[S][ci]` — found 2026-09-08 (session faves-o1) while confirming `010`'s
      trigger, from the PR record rather than from memory.

  **What the record shows.** PR #5 (cut 2026-08-23) and PR #6 (2026-08-30)
  were opened by the owner's token, queued for `--auto --squash`, and never
  merged. Both were closed on 2026-09-06 by `702d65a`, whose message
  attributes the stall to the *"Approve and run"* click ADR 0045 describes.
  🔎 **That attribution does not hold**: the `fx.yml` runs that cut both PRs
  completed `success`, so the click was not what was waiting. What was
  waiting was CI on the PR itself.

  **Reason 1 — the floor failed the bot's branch.** PR #5's status rollup
  reads `floor / scanner floor: FAILURE` beside six green checks, and the
  run's failed log (`32645883452`) names `board` (index stale), `datescan`
  (6) and `wrapscan` (1) findings — none of them in `site/data/fx.json`, the
  only file the PR changed. The floor runs atelier's scanners at *their*
  HEAD against the whole tree, so a branch cut from a `main` the house's
  newer scanners no longer pass fails on the house's behalf, and auto-merge
  waits for a check that will never turn green on that branch. (atelier's
  own board carries the class: *the floor at HEAD*.)

  **Reason 2 — a PR that waits a week goes backwards.** The refresh stamps
  `DATA_VERSION` at cut time. Any data bump on `main` in the following days
  makes the merge move the constant *backwards*, which `702d65a` correctly
  refused to do: a version is a cache name, and a phone holding a cache by
  the older name keeps serving it, indefinitely, CI green. So the two PRs
  were unmergeable on the day they were closed even if the floor had passed.
  🔑 The design assumes the PR lands the same day it opens. Nothing enforces
  that, and the first time it did not, both halves failed together.

  📋 **Options, none taken.** (1) Make the refresh **rebase-and-restamp**:
  the workflow re-runs `fetch_fx.py --bump` on top of current `main` before
  merging, so the constant is always fresh at merge time — the shape
  `check_versions.py`'s `went_backwards()` already assumes. (2) Give the
  FX PR a **narrower required-check set** (the four data gates) so a floor
  finding elsewhere in the tree cannot hold a one-file data change hostage
  — a ruleset change, owner's. (3) Stop opening PRs: commit the refresh to
  `main` directly from the workflow, since the owner's push already bypasses
  the same ruleset (`340/180`) — smallest, and it removes the review a bot
  commit to a deploy branch arguably should keep. (4) Leave it: a human
  supersedes stale bot PRs by hand, as happened, and `fetch_fx.py --bump`
  stays the real refresh path. Recommendation: (1), because it fixes the
  backwards-version hazard for good and is workflow-only; (2) is worth
  raising with the owner alongside `340/180` because it is the same
  ruleset question.
