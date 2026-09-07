- [ ] 🔎 **An orchestrator tore down a sub-agent's worktree while the agent was
      still running, because a clean tree and a pushed HEAD look exactly like a
      finished agent** `[S][docs]` — found 2026-09-07 (session faves-b1) by
      doing it **twice**, and reported by both agents it happened to.

  ⚠️ **It says TWICE because the second report corrected the first count.** This
  item was written from the `past-midnight` agent's report and said "an agent".
  The `stub-sweep` agent's report, which arrived afterwards, opens with the same
  incident: *"Between my push and my final test run, my worktree was deleted and
  my branch merged and deleted — not by me."* **Two of three agents, not one.**
  🔑 That is the repo's own lesson landing on the item that records it: *a
  symptom count proves a fault exists, never how many there are.* The
  orchestrator wrote "an agent" from the one report it had, which is exactly the
  inference this board has been burned by before.

  **What happened.** Three sub-agents worked in their own worktrees under
  `/Users/mike/worktrees/`, each briefed to commit, push its branch and stop
  without merging. To decide whether the `past-midnight` agent had finished, the
  orchestrator checked two things:

  ```
  git -C <worktree> status --short      → empty
  git -C <worktree> rev-parse HEAD  ==  git rev-parse origin/<branch>
  ```

  Both held, so the branch was merged, the worktree removed and the branch
  deleted. **The agent was still running.** It was re-verifying on the merged
  tree, and two of its commands failed the moment the directory vanished
  (`test_tag_allergens`, a `test_validate` re-run). It correctly reported them
  as teardown artefacts rather than faults, and re-ran its verification against
  `main`.

  🔑 **The inference was wrong, not the observation.** A clean tree plus a
  pushed HEAD says *"this agent has nothing uncommitted and nothing unpushed"*.
  It does **not** say the agent has stopped: verification, re-reads, and writing
  its own report all happen after the last push and leave no trace in either
  signal. The two facts an orchestrator actually wants — *has it stopped?* and
  *is its work safe to take?* — are different questions, and only the second one
  was measured.

  ⚠️ **Nothing was lost this time, and that is the reason to write it down.**
  The agent had already pushed everything, the merge was correct, and the
  failures were legible enough that the agent diagnosed them itself. A less
  careful agent would have reported *"`test_validate` failed"* and an
  orchestrator would have chased a phantom regression through a tree that no
  longer existed. **The near-miss is the finding; the outcome was luck plus a
  good agent.**

  🚩 **Why the obvious fix is not quite right.** "Wait for the completion
  notification before merging" is correct and was available — the harness sends
  one. But it trades away the thing that made the session fast: reviewing and
  merging a pushed branch while its agent finishes writing up. The useful rule
  is narrower: **merge from the pushed ref freely; do not DESTROY the agent's
  working directory until it has reported.** Merging `origin/<branch>` touches
  nothing the agent is standing in.

  📋 **Options, none taken:**
  1. **Write the rule into the orchestration guidance** — review and merge from
     `origin/<branch>` whenever you like; `git worktree remove` and branch
     deletion wait for the completion notification. Free, and it is the smallest
     change that removes the hazard.
  2. **Have the brief make agents announce a terminal state** — a final commit,
     a sentinel file, or an explicit "I have stopped" line — so the orchestrator
     has a signal that means what it needs. More reliable than inferring, and it
     costs a line in every brief.
  3. **Leave it.** The blast radius is a confusing error message in an agent's
     own transcript, and today's agent handled it. 🛑 Weak: the failure mode is
     *a false regression report against a deleted tree*, which is the most
     expensive kind of wrong answer this repo has.
  🎯 **Recommendation: 1, with 2 if a future session runs more than about three
  agents at once** — at that point inferring state from git for each of them
  stops being cheap.

  🔗 This is the same family as
  [`200`](200-untilpresent-can-manufacture-a-false-regression-under-load.md) and
  [`190`](190-two-holes-in-the-check-harness-guarantees.md): a signal that is
  *correct about what it measures* being read as an answer to a question it was
  never asked.
