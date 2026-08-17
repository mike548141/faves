- [ ] **Turn `can_approve_pull_request_reviews` back off — UNBLOCKED 2026-08-17,
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
