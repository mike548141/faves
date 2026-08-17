# Theme 8 — Making the repo public ✅ DONE 2026-08-09

🎉 **The repo is public**: <https://github.com/mike548141/faves>. Flipped at
`a207a15` on the owner's explicit instruction, hardened in the same sitting
(secret scanning + push protection, a `protect-main` ruleset, fork-PR approval
for all external contributors, Actions narrowed to selected), and
`/.well-known/security.txt` shipped and serving. Full runbook outcome and the
two commands that were wrong when run: [GO-PUBLIC.md](../../GO-PUBLIC.md).

The history below is kept as the record of how it was sequenced.

Assessed 2026-07-12: publishable, but sequenced. Flipping visibility is a
floor action (one-way door — forks/copies survive any later unpublish) and
stays the owner's explicit call. Order matters:

1. ✅ ~~**GitHub PAT refresh first**~~ — **discharged 2026-08-09
   ([ADR 0026](../../decisions/0026-pat-prerequisite-discharged.md))**. The session
   log (`docs/SESSIONS.md`, 2026-07-12 deploy entry) records the then-current
   PAT as classic + broad and lists unhardened credential roots
   (AWS/Google/TrueNAS); git history preserves that line forever, so the
   fix was making it *historical* rather than redacting the log. It already
   is: the account now carries **no classic tokens at all**. The
   AWS/Google/TrueNAS half is **decoupled** to the estate roadmap — it
   discloses nothing actionable and no longer gates this repo.
2. ~~**Branch protection before visibility**~~ — ⚠️ **superseded 2026-08-06
   by ADR 0022 gate 8: not achievable as written.** GitHub refuses branch
   protection on a private free-plan repo. The requirement stands, the
   *sequencing* doesn't: flip and harden in one sitting (GO-PUBLIC.md).
3. **Owner confirms the docs' family texture.** The 2026-07-06 approval
   covered recipe attributions in site data; the docs also use family
   first names in feature examples and acceptance notes (ROADMAP Themes
   1/1b, SESSIONS). Same first-names-only level, but publishing extends
   the approval from the site to the workshop notes — confirm or trim.
   🎯 **Owner ruling 2026-07-24 — do a full family-texture review before public**
   (a decided pre-public gate, not a piecemeal fix). Sweep **docs + site data +
   tests** for family first names and decide the whole set together. Concrete
   instance that triggered this: leakscan (owner's local term list, invisible to
   CI) flags a child's first name used as a **test fixture** in
   `tests/profiles.test.js` (pre-existing, from `5dfda33` 2026-07-22) and the
   "Churton" suburb across restaurant data (a real place name — likely fine). The
   owner-approved recipe attributions (2026-07-06) stay. **Review ran
   2026-07-28** (Fable session) — full inventory + recommendations in
   [reviews/2026-07-28-1138-family-texture-review.md](../../reviews/2026-07-28-1138-family-texture-review.md).
   ✅ **Ruled 2026-08-06, all four, and applied same day** (rulings + the
   one deviation stamped into the review record): Shane/Jesse kept with
   their OK (owner holds it; the 11e move-private option was offered and
   not taken), test fixtures renamed neutral (`ea4ccde`), all live docs
   neutralised (`5830081` + doc edits; SHELL_VERSION bumped), history
   published as-is, no rewrite. **This gate is closed.** The visibility
   flip stays owner-only.

Verified clean 2026-07-12 (tree + full history): no secrets (the one
token line reads from Keychain; "share tokens" are client-side codec),
Apache 2.0 licence present, only the owner's own `cxi.nz` work address in
commit metadata,
home-area inference no worse than the live site already allows.

**Re-assessed 2026-08-06** (pin bumped to `atelier@33a540a`). The estate
now has a proven flip procedure: `rpi` went public 2026-07-29 through a
six-gate publish-safety ADR — rpi's own
`docs/decisions/0009` <!-- pathscan:allow: rpi's own ADR, cross-repo --> —
leakscan 0, secretscan 0, full-history blob scan, licence, reconnaissance
sweep, docs-read-as-public — with the evidence produced by an agent and
the flip ruled by the owner. faves follows that template. What the
re-assessment adds to the list above:

- **Two upstream atelier items gate the flip.** P5 — the publish-safety
  checklist covers repo *content* but nothing covers GitHub *settings*
  (wiki, actions policy, fork-PR approval, rulesets); atelier's ROADMAP
  marks it owed *before the ros/faves flip*. P6 — the
  estate-internal-context ADR (drafted 2026-08-05, ruling owed) binds
  every repo heading public; faves records name private siblings, so the
  ruling lands here too.
- **Leakscan needs a disposition pass, not a cleanup.** Full-tree
  leakscan: 104 findings at the 2026-08-06 morning HEAD, 101 after the
  family-texture fixes. The bulk are the product — restaurant street
  addresses and phone numbers in `site/data/` and their echoes in our
  records — business data the site exists to publish, not personal
  data. Per GUARDS (narrow, noisy, reasoned) they want a scoped,
  reasoned allowance, not deletion. Gate 1 of the publish-safety ADR can
  only cite "leakscan 0" after that pass. 🚩 The pass must also settle
  the **suburb trap** found applying the rulings: the home suburb is
  product content (three venues, `site/index.html` fallbacks) *and* a
  term-list entry, and term hits are marker-non-exemptible (atelier D1)
  — the existing lines are grandfathered because leakscan judges changed
  lines, so the next edit touching one blocks with no hatch. Fix is a
  scoped carve-out (path-scoped ignore for venue data, or narrowing the
  term list), and it is an owner call either way.
- **Floor CI must be green before the flip.** Red since 2026-07-25
  (leakscan lacks cover in CI — no term list on the runner). The owning
  fix is atelier P4 (the ci plane calls leakscan without
  `--require-terms`), still open upstream. Post-flip every push is
  publication, so a red floor at flip time is not acceptable debt.
- **The flip artefact is a faves publish-safety ADR** modelled on rpi
  0009: six gates, evidence not assurance, full-history blob scan
  included, re-verified on the exact tree that flips. The visibility
  change itself stays an owner-only floor action.

✅ **Pre-flip decision pair — RULED 2026-08-06.** (1) **Full history**, no
fresh public root: the fresh-root option was costed (stranded doc SHAs,
lost build narrative, and it buys little because the texture ships at
HEAD anyway) and declined, reaffirming the family-texture ruling. (2)
**Records publish as-is**, with the PAT line made historical rather than
redacted. ⚠️ **Reasoning corrected 2026-08-09
([ADR 0026](../../decisions/0026-pat-prerequisite-discharged.md))**: the original
argument — redaction achieves nothing "since the text stays reachable in
every clone" — is **false for this repo** (private since 2026-07-06, zero
forks, the only cloners the owner's own machines). The conclusion still
holds, on cost: a rewrite strands the **44 commit SHAs** cited across the
ADRs, session logs and reviews.

✅ **Publish-safety review done 2026-08-06** →
[ADR 0022](../../decisions/0022-publish-safety-review.md), with the flip
sequence in [GO-PUBLIC.md](../../GO-PUBLIC.md). Verdict **safe to publish**,
two owner actions owed first. What that pass closed:

- **Leakscan disposition done: 101 → 0.** Every finding was restaurant
  business data — the product. Four reasoned `.leakscanignore` globs
  (`site/data/*` + three venue-mirroring test files, 32 files) and 18
  per-line markers on prose that quotes an address as a worked example.
  The **suburb trap is settled**: `"Churton Park"` is out of the
  machine-local term list (a public suburb name and product content;
  the street-level terms that actually pinpoint the house stay).
- **Advisory scanner debt cleared — this was a hidden flip blocker.**
  The floor *tightens* on a public repo (atelier P3): advisory checks
  lose their hatch. So the 21 datescan/wrapscan/spellscan findings
  declared advisory with a 2026-09-15 review-by would have gone red at
  the flip, which is *before* that date. All 21 fixed;
  `.atelier-floor.json` is down to the licence declaration and all
  twelve checks are enforced and green.
- **Platform-settings audit (this repo's instance of atelier P5).** 🚩
  **The roadmap's step 2 above — "branch protection before visibility"
  — is not achievable as written.** GitHub refuses branch protection,
  fork-PR approval and secret scanning on a *private free-plan* repo.
  Hardening can only happen after the flip, so flip and harden in **one
  sitting** (GO-PUBLIC.md steps 4–8). Going public is also a net gain:
  it turns on secret scanning + push protection, withheld while private.
- **Reads-as-public pass** — README opens with what the project is to a
  stranger and gained licence/contributing/security sections;
  `SECURITY.md` written; one reconnaissance hit (a `tools/deploy.py`
  docstring naming a private sibling tool and the estate's network
  vendor) removed.
- **Full-history evidence**: 979 blobs across 236 commits — secretscan
  clean; leakscan's only non-venue findings are the owner's own work
  email (34) and household first names in superseded test fixtures (see
  ADR 0022's residual risks, accepted with the fact in hand).

🎯 **Still owed before the flip — owner's:**

1. ✅ ~~**Rotate the GitHub PAT and confirm the AWS / Google / TrueNAS
   credential roots are hardened.**~~ — **closed 2026-08-09
   ([ADR 0026](../../decisions/0026-pat-prerequisite-discharged.md))**. No classic
   tokens exist on the account, so the line is already historical; the
   credential-root half is decoupled to the estate roadmap. 🎉 **No pre-flip
   blocker remains** — the sequence resumes at GO-PUBLIC step 3.
2. ✅ **Floor CI green at `8ba6218`** — first time since 2026-07-25,
   resolved as a side effect of the leakscan disposition (CI was
   blocking on the venue-data structural findings; the ignore took them
   to zero). ⚠️ **Not a fix of atelier P4**: CI still carries no term
   list and still reports "cover not guaranteed", so it cannot catch a
   term-list-only leak. Real cover stays the local `--require-terms`
   run. Post-flip, every push is publication — so this residual is worth
   closing upstream.
3. **atelier P5 / P6** still open upstream (the generic settings
   checklist; the estate-internal-context ruling). Neither blocks: P5's
   substance is discharged for this repo by ADR 0022 gate 8, and P6's
   ruling would bind the records convention going forward rather than
   gate this flip.
