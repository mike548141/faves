- ⏳ **The CI job called "zero dependencies" runs nine checks, and the name
  cannot be fixed from the workflow alone** `[XS][ops]` — split out 2026-08-17
  from `030`, which had it as a sub-finding. It is small, it is real, and it is
  **waiting on a repo-settings change only the owner makes** — which is exactly
  why it needed its own line rather than a paragraph inside a closed item.

  **The fault.** `.github/workflows/ci.yml`'s `guard` job now runs nine checks:
  zero-dependencies, the SBOM, repo visibility, the ADR-index allocator, the
  no-JS fallback, the history append-only guarantee, and three tool suites. Its
  display name says *"zero dependencies"*. So an audit by job name reports the
  ADR allocator and [ADR 0023]'s history guarantee as **ungated when they are
  gated** — this is not a decorative *guard* ([ADR 0072]); the guard works. It
  is a **decorative label**, and the damage lands on the reader rather than on
  the code. Same family as an all-clear that cannot be falsified: *the
  observable output does not distinguish the two states an honest reader needs
  to tell apart.*

  🛑 **Why it is not a one-line fix.** `protect-main` matches required status
  checks **BY JOB NAME**, and *"zero dependencies"* is one of the six required
  contexts. Renaming it to `repo invariants` in the workflow **silently
  un-requires the job** until the ruleset is edited in the same breath. The two
  edits have to land together, and the ruleset half is a repo-settings change,
  which is the owner's.

  🎯 **What is owed:** the owner renames the required context on `protect-main`
  from `zero dependencies` to `repo invariants` (or authorises a session to do
  it via `gh api`), and the workflow's `name:` changes in the same sitting.
  Until then the misleading name is **documented at the point of use** in
  `ci.yml`, so a reader auditing coverage meets the explanation before they
  reach the wrong conclusion.

  ⚠️ **Worth stating with it, because it changes how much this buys:**
  `bypass_actors` still carries `RepositoryRole 5 → always`, so all six required
  contexts are bypassable from the owner's machine and the last 100 ruleset
  evaluations on `main` were 100 bypasses (`030`(b), deferred by him
  deliberately). Fixing the label makes an **audit** honest; it does not make
  the gate bite.

[ADR 0023]: ../../decisions/0023-time-dimension-in-the-data.md
[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
