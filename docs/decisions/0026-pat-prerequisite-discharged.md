# 0026 — The PAT prerequisite is discharged; credential-root hardening is decoupled

**Status:** accepted — amends the *Consequences* of
[0022](0022-publish-safety-review.md) (its analysis stands unchanged)
**Date:** 2026-08-09

## Context

ADR 0022 left two owner actions owed before the flip. The first bundled two
things that had been treated as one item since 2026-07-12:

1. rotate the GitHub PAT that `SESSIONS-ARCHIVE.md` records as *classic + broad*, and
2. confirm the AWS / Google / TrueNAS credential roots are hardened.

The reasoning was that publishing "these roots are not yet hardened" while it
is still true is a live disclosure rather than a historical one, so the whole
bundle blocked the flip.

Checked against the account on 2026-08-09: **there are no classic personal
access tokens.** `github.com/settings/tokens` reports *"No personal access
token created"*. The only tokens on the account are two fine-grained ones
(`floorfleet-conformance`, `Portainer`), both repo-scoped by construction and
neither matching the record's description. Whether the classic token expired or
was cleaned up earlier is not recoverable — GitHub keeps no history of deleted
tokens — but the state the record describes no longer holds.

## Decision

**The PAT half is discharged by evidence, not by action.** The archived line is
now historical, which is the precise condition ADR 0022 required for its
"publish the records as-is" ruling to hold. Nothing needs rotating.

**The credential-root half is decoupled** and moves to the estate roadmap as
ordinary work (owner ruling, 2026-08-09). It is no longer a faves gate.

The disclosure it guards against is content-free: the record names three
mainstream providers and states the owner intended to improve them. No account
identifiers, no endpoints, no key ages, no MFA state, no named weakness —
nothing an attacker can act on. Gating a static menu site's publication on a
whole-estate hardening programme is disproportionate to that.

**With both resolved, no pre-flip blocker remains.** GO-PUBLIC step 1 is
closed; the sequence resumes at step 3.

## Rejected

- **Rotating something anyway, to be able to say a rotation happened.** There is
  no classic token left to rotate, and rotating an unrelated fine-grained token
  would be theatre — it would produce a reassuring log line and change nothing
  about the exposure the record describes. Honesty over the comfortable record.
- **Keeping the bundle intact until the estate roots are done.** Rejected on
  proportionality, above. The two halves differ by orders of magnitude in both
  what they disclose and what they cost to resolve; bundling them let the
  cheap, real item be held hostage by the expensive, notional one.
- **Redacting the archived line instead.** Still rejected — but ADR 0022's
  stated reason for rejecting it is wrong and should not be relied on again.
  It argued the text "stays reachable in every clone". That does not hold here:
  the repo has been private since 2026-07-06, has zero forks, and clone traffic
  shows two unique cloners, both the owner's own machines. No third-party clone
  exists, so a history rewrite *would* genuinely erase it.

  The real reason not to rewrite is cost: **44 distinct commit SHAs are cited
  across the ADRs, session logs and reviews.** A `filter-repo` invalidates every
  one and turns the documented decision trail into dead references — the same
  stranded-SHA cost that defeated the fresh-root option in the 2026-08-06
  ruling. That cost far exceeds the benefit of scrubbing a metadata line.

## Consequences

- GO-PUBLIC step 1 is closed. The runbook's remaining prerequisite is step 3
  (re-run the gates on the exact tree that flips), then the owner's one-sitting
  flip-and-harden.
- Anyone re-proposing a history rewrite must argue against the SHA-citation
  cost, not against the "reachable in every clone" claim, which is false for
  this repo.
- One evidence gap is recorded rather than resolved: the account screenshots
  came from a browser profile labelled *Work*. If that is a different GitHub
  account from `mike548141`, this ADR's central finding does not hold and the
  check must be repeated on the owning account.
- ADR 0022's residual risks (household first names in superseded test fixtures,
  the owner's work email in history) are untouched and remain accepted.
</content>
</invoke>
