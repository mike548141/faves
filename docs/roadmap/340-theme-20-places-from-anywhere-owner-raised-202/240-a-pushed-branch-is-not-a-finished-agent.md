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

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 2: MAKE AGENTS SIGNAL
  WHEN THEY ARE DONE.** 🚩 **He did NOT take the recommendation**, which was the
  narrower option 1 (write the rule down: merge freely, delay only the
  teardown). He took the more robust one: an orchestrator should not have to
  *infer* a terminal state at all. Recorded as an overrule so nobody re-proposes
  option 1 as "what was agreed".
  📋 **What this obliges, and the hole it leaves.** Every agent brief requires an
  explicit terminal marker as the agent's last act. But **a crashed agent never
  sends one**, so the signal proves *done* and can never prove *not done* — an
  absent marker is ambiguous between "still working" and "died". The harness's
  own completion notification covers that second case (it fires on failure as
  well as success), so the working rule is: **teardown waits for the completion
  notification; the agent's marker is what makes the report trustworthy.** Option
  1's substance survives inside option 2 rather than being discarded — merging
  from `origin/<branch>` early is still safe and is still what keeps a session
  fast.
  ⏸️ **Not retro-fitted to the three agents live when this was ruled.**
  Interrupting a working agent to change its brief risks the exact derailment
  this item is about. Their briefs already carry *"after you push, STAY PUT
  until you have written your report"*, and the orchestrator waited for each
  completion notification before any teardown.

  📋 **Original options, kept for the record — option 2 is the ruled one:**
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
  🎯 **[SUPERSEDED — he took OPTION 2 on 2026-09-07 and explicitly did NOT take
  this recommendation; see the ruling above. Kept for the record, not a live
  ask.]
  Recommendation: 1, with 2 if a future session runs more than about three
  agents at once** — at that point inferring state from git for each of them
  stops being cheap.

  📝 **BOARD HYGIENE 2026-09-09 — NO LIVE OWNER ASK REMAINS ON THIS ITEM.** The
  question was ruled on 2026-09-07 and the item already records the overrule
  plainly; the only 🎯 left is the superseded recommendation above, now labelled
  in place so it cannot be read as still sitting with him.
  🛑 **The bracket stays `- [ ]`** because option 2's obligation is unbuilt: every
  agent brief must carry an explicit terminal marker, and the ⏸️ note above says
  it was deliberately not retro-fitted. That is `[XS][docs]` work, not a
  decision.

  🔗 This is the same family as
  [`200`](200-untilpresent-can-manufacture-a-false-regression-under-load.md) and
  [`190`](190-two-holes-in-the-check-harness-guarantees.md): a signal that is
  *correct about what it measures* being read as an answer to a question it was
  never asked.
