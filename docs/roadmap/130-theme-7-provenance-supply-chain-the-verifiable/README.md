# Theme 7 — Provenance & supply-chain: the verifiable zero-dependency claim

Faves' defining property is that the shipped artefact has **no
third-party components** (ADR [0001](../../decisions/0001-zero-build-vanilla.md)):
no npm packages, no CDN, no framework. This theme makes that claim
*checkable* rather than merely stated. Note the honest framing: for a
zero-dependency site an SBOM is **not** vulnerability management (there's
nothing third-party to scan) — its value is attestation + a tripwire
against dependency creep.

✅ **Shipped** — **SBOM publishing** (2026-07-09, ADR 0008: deterministic
CycloneDX at `/.well-known/sbom.json`, `gen_sbom.py --check` CI gate) and the
**zero-dependency CI guard** (2026-07-08, `check_no_deps.py`). Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

**Still open:**

- **`security.txt` + provenance metadata** `[S]` — a `/.well-known/
  security.txt` (contact + policy) is cheap good-citizenship for a public
  site. 🎯 **Owner ruling 2026-07-25 — contact points at the repo's GitHub
  security advisories** (not an email). **Sequenced with go-public (Theme 8):**
  the advisories URL only resolves once the repo is public, so don't ship it to
  the already-live site pointing at a 404 — build it *as* the repo flips public.
  Build provenance/attestation (SLSA-style) is **N/A today** — Cloudflare Pages
  serves static files with no build to attest; revisit only if a real pipeline
  ever appears.
