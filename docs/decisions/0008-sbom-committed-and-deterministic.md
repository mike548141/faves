# 0008 — SBOM: CycloneDX, committed and deterministic

**Status**: accepted • **Date**: 2026-07-09

## Context

Faves' defining property is a shipped artifact with **no third-party
components** (ADR 0001). Theme 7 of the roadmap makes that claim
*checkable* rather than merely stated by publishing a Software Bill of
Materials. For a zero-dependency site an SBOM is **not** vulnerability
management (there is nothing third-party to scan) — its value is
attestation plus a tripwire against dependency creep. The owner delegated
the format call; the constraint is the usual one: stdlib-only, no build
step, offline-safe, reproducible.

## Decision

- **Format**: CycloneDX 1.5 JSON. The third-party `components` list is
  **empty by construction** — that emptiness is the whole point.
- **Generator**: `tools/gen_sbom.py`, stdlib only. It reads `package.json`
  through the *same* dependency-key set as `check_no_deps.py`, so the SBOM
  and the guard can never disagree about what "zero dependencies" means; if
  a dependency ever creeps in it appears as a real component instead of the
  SBOM silently lying.
- **Committed, not generated at deploy**: written to
  `site/.well-known/sbom.json` and served statically at
  `/.well-known/sbom.json`. Cloudflare Pages runs no build command
  (`build_command: ""`, ADR 0004), so a deploy-time generation step has
  nowhere to run — the file must be in the repo.
- **Deterministic**: no wall-clock `metadata.timestamp` (the git commit
  date is the real provenance record), and the `serialNumber` is a uuid5
  hash of the document's own canonical body. Regenerating an unchanged
  tree reproduces the file byte-for-byte.
- **CI gate**: `python3 tools/gen_sbom.py --check` regenerates in memory
  and fails if the committed file is stale — added as its own CI job. Only
  possible *because* generation is deterministic.

## Rejected

- **Generate at deploy time**: cleaner in principle, but there is no build
  step to hook (ADR 0004) and it would mean the live site's provenance
  artifact isn't reviewable in the repo. Committing it keeps it diffable.
- **Per-file inventory with hashes** (list every shipped `site/` file as a
  CycloneDX `file` component): would churn the SBOM on *every* content
  edit — a new menu price would rewrite it — drowning the signal (a
  third-party entry) in noise. The SBOM describes the **dependency
  posture**, which changes ~never; `check_no_deps.py` already guards the
  file tree.
- **Wall-clock timestamp / random serialNumber**: standard for build-time
  SBOMs, but non-reproducible, which would make the `--check` CI gate
  flap. Determinism wins here.

## Consequences

The live site ships a machine-readable provenance artifact from day one
(pairs with the Theme 7 `security.txt`, still pending an owner role-inbox
address). The SBOM only changes when the dependency posture changes, so it
stays quiet until it matters. `gen_sbom.py --check` must be run (and the
file re-committed) if `package.json` ever legitimately gains a dependency —
at which point ADR 0001's guard fails first anyway. The generator carries
its own tool version (`1.0.0`); bump it if the document shape changes.
