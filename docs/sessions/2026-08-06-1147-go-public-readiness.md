- **2026-08-06 (go-public readiness — Opus session)**: Took the repo from
  "publishable but sequenced" to "one owner sitting away". The four queued
  pre-flip questions were put to the owner and all four ruled: **full
  history** (fresh public root costed and declined), **records publish
  as-is** with the PAT made historical by rotation, **leakscan disposed by
  scoped allowance + term-list narrowing**, and scope held to faves-side
  with the upstream gates flagged rather than taken.
  Work landed: **leakscan 101 → 0** (`.leakscanignore` × 4 reasoned globs
  over `site/data/*` and three venue-mirroring test files = 32 files, plus
  18 per-line markers on prose quoting an address as a worked example);
  the **suburb trap settled** by dropping `"Churton Park"` from the
  machine-local term list — a public suburb name and product content, while
  the street-level terms that actually pinpoint the house stay.
  🔎 **The find of the session**: the floor *tightens* on a public repo, so
  the 21 datescan/wrapscan/spellscan findings declared advisory with a
  **2026-09-15** review-by were not deferred debt — they were a flip blocker
  dated *after* the intended flip. All 21 cleared (only one, a "yesterday" in
  a 2026-07-09 entry, was a genuine dating slip; five "tonight"s are the
  product's own vocabulary and took reasoned markers).
  `.atelier-floor.json` is now the licence declaration alone, twelve checks
  enforced and green.
  🔎 **Second find**: the roadmap's step 2, "branch protection before
  visibility", **cannot be done** — GitHub refuses branch protection,
  fork-PR approval and secret scanning on a private free-plan repo. So flip
  and harden must be one sitting; superseded in-place and sequenced in the
  new [GO-PUBLIC.md](../GO-PUBLIC.md).
  Deliverables: **[ADR 0022](../decisions/0022-publish-safety-review.md)** (six
  rpi-template gates + two this repo needed: floor-fully-enforced, and the
  platform-settings audit that is this repo's instance of atelier P5) and
  **GO-PUBLIC.md** (12 ordered steps). Gate 3 evidence: **979 blobs across
  236 commits** extracted and scanned — secretscan clean; leakscan's only
  non-venue findings are the owner's own work email (34) and household first
  names in superseded test fixtures (4), both recorded as accepted residual
  risks with the fact in the owner's hand. Also written: `SECURITY.md`, a
  public-facing README, and one reconnaissance fix (`tools/deploy.py`
  docstring naming a private sibling tool + the estate's network vendor).
  Checked in passing: `intake/` is correctly gitignored — its 47 recipe
  files are untracked and were never committed. Noted, not fixed: spellscan
  skips fenced code blocks, so it missed an `artifact` in README's layout
  diagram (found by eye).
  🎉 **The floor CI went green at `8ba6218`** — first time since 2026-07-25,
  and not something this session set out to fix. Same shape as rpi 0009's
  side-effect resolution: CI carries no term list, so it only ever ran the
  structural rules, and it was blocking on the ~86 structural findings in the
  venue data; the `.leakscanignore` took those to zero, leaving nothing to
  block on. ⚠️ **Not a fix of atelier P4** — CI still prints "cover not
  guaranteed" and still cannot catch a term-list-only leak, which is a real
  residual once every push is publication.
  🛑 **One thing now blocks the flip**, and it is estate-side: the PAT
  rotation + credential-root hardening (the records name AWS/Google/TrueNAS
  as *queued*, and publishing that while it is still true is a live
  disclosure rather than a historical one).
  Verified: leakscan/secretscan/publishscan/licenscan/datescan/wrapscan/
  spellscan/linkscan/reviewscan/harvestscan/pointerscan clean; node --test
  301 pass; validate 28 files; no-deps; SBOM check; floor hook green on
  every commit; pushed CI cited at close.

