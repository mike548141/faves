- [x] 🔎 **A direct push to `main` can never satisfy a required status check —
      so narrowing the bypass would not "switch enforcement on", it would end
      direct pushes entirely** `[S][owner]` — measured 2026-09-06 (session
      faves-24) against the rule-suite API, and it reframes the deferred half of
      [`030`](030-two-ci-jobs-run-on-every-push-and-cannot-block.md).

  **The evidence, from the API's own detail field rather than inferred.** The
  rule-suite endpoint returns 15 evaluations on `main`: **14 `bypass`, 1
  `pass`**. Opening any of the 14 shows the same four rows —

  ```
  secret_scanning        | pass | None
  required_status_checks | fail | 6 of 6 required status checks are expected.
  non_fast_forward       | pass | None
  deletion               | pass | None
  ```

  🔑 **"Expected" is the whole finding.** At the instant of a direct push the
  six required checks have not reported on the new SHA, because nothing has run
  them yet — a workflow starts *after* the ref moves. So the requirement is
  structurally unmeetable on a direct push, the rule fails every single time,
  and `bypass_actors: RepositoryRole 5 → always` is what carries it through.
  The 14 bypasses are not 14 acts of carelessness; they are the only outcome the
  mechanism allows.

  **The one `pass` proves the other half.** It is the merge of PR #7
  (`e9dfb3f`, 2026-09-06). A pull-request merge evaluates against a head whose
  checks have **already reported green**, so the requirement is satisfied and no
  bypass is needed. The enforcing path already exists and already works; it is
  just not the path this repo normally takes.

  🛑 **What this means for the owner's deferred decision (b).** CLAUDE.md frames
  it as *"the requirement takes effect the moment the bypass is narrowed."*
  That is true but reads as though enforcement is one setting away from the
  current workflow. It is not. Narrowing `bypass_actors` would make **every
  direct push to `main` fail**, with no exception for the owner's own machine —
  because there is no version of a direct push that can present a green check.
  The change is therefore not "turn on enforcement"; it is **"every change to
  `main` now goes through a pull request"**, and on this repo `main` is the
  Cloudflare Pages deploy, so it is also "every deploy now waits for CI".

  ✅ **RULED 2026-09-06 — LEAVE IT AS IT IS (option 1).** Put to the owner with
  the mechanism above stated plainly and the PR-only consequence costed; he
  chose the resting state. So direct pushes keep working and a red CI result
  keeps landing **after** the deploy it describes — that is now an accepted
  cost, not an unexamined one. The break-glass variant was also declined.
  🔑 **What this ruling settles that the old framing could not:** nobody should
  again read the bypass log as a discipline problem, and nobody should propose
  "just narrow the bypass" as a cheap fix. It is not cheap; it is PR-only, and
  it has been considered and declined on that basis.

  🎯 **Options, for the owner and nobody else. The cost is workflow, not code.**
  1. **Leave it.** Direct pushes keep working; CI keeps reporting after the
     deploy. Honest resting state, and the one the record already describes.
  2. **Narrow the bypass and move to PR-only on `main`.** Buys real enforcement
     — the deploy cannot go out red. Costs a PR per change, which at five
     parallel sessions is five PR cycles, and the auto-merge machinery would
     have to be trusted with the deploy path.
  3. **Narrow it for everyone *except* an emergency actor**, keeping a
     documented break-glass. Middle ground; the risk is that break-glass
     becomes the habit, which is the state we are already in.

  🚩 **Whatever is chosen, one line in CLAUDE.md should change.** *"the last
  100 ruleset evaluations on `main` were 100 bypasses"* is stale — the endpoint
  now retains 15, of which 14 bypassed. The conclusion survives; the number does
  not, and a number that cannot be reproduced is how a true paragraph starts
  being disbelieved.
