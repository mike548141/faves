- [x] **Turn `can_approve_pull_request_reviews` back off — UNBLOCKED 2026-08-17,
  but NOT YET SAFE** `[XS][ci]` — with a PAT the PR is opened by a real user, so
  Actions no longer needs the permission. It grants nothing today (no rule here
  requires a review), but it is a latent trap: add a review requirement to the
  ruleset later and a workflow could approve its own PR.
  🛑 **The precondition, and it is checkable: wait for ONE successful refresh
  actually opened by `FX_TOKEN`.** `FX_TOKEN` landing is necessary and not
  sufficient. This permission is what lets the **`GITHUB_TOKEN` fallback path**
  open a PR at all, so removing it now would take away the safety net *before*
  anything has demonstrated the net is no longer needed — and the token's auth
  path is currently unexercised (the dispatch run had no rate movement, and
  every `GH_TOKEN` step is gated behind `changed == 'true'`). Turning it off
  first converts a recoverable "the PAT didn't work, click Approve" into a
  silently skipped weekly refresh.
  ✅ **So the trigger is: the first Sunday a rate moves, confirm the PR was
  opened by the owner's account rather than `github-actions[bot]`, then turn it
  off.** That is one `gh pr list --json author` away and needs no judgement.

  ✅ **DONE 2026-09-08 (session faves-o1) — the trigger had fired twice, so the
  permission is off.** Evidence, read with `gh pr list --state all`: PR #5
  (2026-08-23) and PR #6 (2026-08-30) were both opened by `mike548141`, not
  `github-actions[bot]` — the `FX_TOKEN` path has exercised itself on two
  Sundays where a rate moved (PR #3 on 2026-08-16 was the bot, before the
  token). Then `PUT /repos/mike548141/faves/actions/permissions/workflow` with
  `default_workflow_permissions=read`, `can_approve_pull_request_reviews=false`;
  read back: `{"default_workflow_permissions":"read",
  "can_approve_pull_request_reviews":false}`. Reversible in one call.
  🚩 **Checking the trigger found something else: neither PR merged.** Both
  sat open for two weeks and were closed by hand on 2026-09-06 (`702d65a`).
  Filed as `020` beside this item — the refresh *opens* correctly and cannot
  *land* on its own, for two reasons that the automation's own ADR does not
  name.

