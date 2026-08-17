# Automating the FX refresh — ✅ shipped 2026-08-16

`.github/workflows/fx.yml` refreshes the rates weekly (Sunday 14:10 UTC, Monday
~2am NZ) by opening a pull request that **merges itself** once the four required
checks pass. Proved end to end the same day: PR #3 opened, checks ran,
auto-merge landed it, branch deleted itself.

**Why a PR and not a push**, since this took three attempts and the dead ends are
worth keeping:

| Attempt | Outcome |
|---|---|
| Scheduled job pushes straight to `main` | Refused: `GH013 … 4 of 4 required status checks are expected … [remote rejected]`. A direct push can never satisfy a required check — the check runs on the push the rule is refusing. |
| Add a ruleset bypass for GitHub Actions | Weakens a protection on a public repo to buy a convenience. Rejected. |
| Stage the commit on a branch, poll for its checks, fast-forward `main` | Works, and is machinery a later reader must reverse-engineer before trusting it. Rejected by the owner, correctly. |
| **PR + `--auto` merge** | No bypass, no unusual git; a PR is how required checks were designed to be satisfied. **Shipped.** |

**Two repo settings were changed to make it work**, both disclosed to the owner:
`allow_auto_merge` on (weakens nothing — every merge still passes the same four
checks), and `can_approve_pull_request_reviews` on (needed for Actions to open a
PR at all).

✅ **Done 2026-08-17 — the owner minted `FX_TOKEN` and it is in this repo's
Actions secrets.** Fine-grained PAT scoped to `mike548141/faves` alone: Metadata
read, Contents read+write, Pull requests read+write, **no user permissions** —
the narrowest shape that can do the job. No code change was needed; the workflow
reads the secret by name. **Registered in the estate root's credential registry**
with its permissions and expiry read from the console rather than transcribed
from a comment, so the roll story exists before the roll does.
🛑 **It expires 2026-11-15, and the failure then is LOUD, not graceful — which
is the opposite of what the code reads like.** `${{ secrets.FX_TOKEN ||
secrets.GITHUB_TOKEN }}` looks like a fallback; it is not. **An expired token's
secret is still a non-empty string, so the `||` never fires** — the dead value
is used, `gh` returns 401, and `set -euo pipefail` takes the run red. Good
outcome (the red run *is* the rotation reminder), and it was checked in the
workflow rather than assumed: the first reading of this was that expiry would
silently revert to the weekly click, and that reading was wrong. The registry's
expiry check warns 30 days out as well.
🚩 **A 401 will read misleadingly on the way past.** `gh pr create` is guarded by
`|| echo "PR already open … reusing it"`, so an auth failure prints that
reassuring line before the run actually dies on the following `gh pr merge`. If
this workflow ever fails, look for a 401 before believing the message.
⚠️ **Honest limit: the token's auth path is UNPROVEN.** A `workflow_dispatch`
run on 2026-08-17 went green — which proves the file still parses and runs after
the header edits — but it reported *"already refreshed today — nothing to do"*,
and every step that actually uses `GH_TOKEN` is gated on `changed == 'true'`. So
nothing has yet exercised the credential. **The first real rate movement is the
proof**, and the item below is sequenced behind it for exactly that reason.

  The account of why it exists, kept because it explains the design: a PR opened
  by the built-in `GITHUB_TOKEN` counts as coming
  from an *external contributor*, and this repo requires approval before
  workflows run for those (`approval_policy: all_external_contributors`). So the
  PR opens and arms itself, then waits for an "Approve and run" click.

  **Do not fix this by loosening `approval_policy`** — it governs every outside
  contributor's PR on a public repo, forever, so a stranger's workflow would run
  unreviewed. Far too broad for one convenience.

  The narrow fix is a repo secret **`FX_TOKEN`**: a fine-grained PAT scoped to
  this repository only, with `Contents: read & write` and
  `Pull requests: read & write`. The workflow already prefers it and falls back,
  so adding the secret is the whole change — no code edit. Only the owner can
  mint it (it is a credential, and a new trust surface).

---
