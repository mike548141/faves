# 0022 — Publish-safety review: this repo is safe to make public

**Status**: accepted • **Date**: 2026-08-06 • **Outcome**: evidence produced;
the visibility flip remains the owner's to make

## Context

`faves` is the third of three repos heading for public visibility, after `rpi`
(flipped 2026-07-29) and alongside `ros`. `rpi`'s [ADR 0009] proved the
six-gate template on the smallest surface; this review applies it to the
largest — a live, deployed product with 236 commits, 28 restaurant records and
a full workshop record.

**Flipping visibility is not this review's to do.** Under the CLAUDE.md floor,
making a private repo public is an always-stop-and-confirm action, and it is a
one-way door: forks and copies survive any later unpublish. This ADR produces
the evidence; the owner rules. The ordered steps for the flip itself are in
[GO-PUBLIC.md](../GO-PUBLIC.md).

Scope note: this asks **what the repo publishes**. It does not reopen what the
*site* publishes — the site has been live and public since 2026-07-12.

## Decision

**Verdict: SAFE TO PUBLISH**, with the fixes in this change applied, the two
owner actions below discharged first, and the residual risks accepted.

Each gate, with the evidence rather than an assurance:

| # | Gate | Evidence |
|---|------|----------|
| 1 | leakscan | **101 → 0.** All 101 triaged as restaurant business data — venue addresses, phones, coordinates. 32 files covered by four reasoned `.leakscanignore` globs; 18 prose findings by per-line markers. Zero personal findings. |
| 2 | secretscan | **0** on the tree, and **0** across all 979 history blobs. |
| 3 | Full history | **979 unique blobs across 236 commits** extracted and scanned. secretscan **clean**. leakscan 651 findings — 610 the same venue-data classes, 34 the owner's own work email, 4 a household first name (see *Residual risks*). |
| 4 | Licence | Apache-2.0 present and `licenscan` clean. **Zero** third-party components — `check_no_deps.py` and a committed CycloneDX SBOM both assert it, and the SBOM is verified deterministic ([ADR 0008]). No vendored code, so no copyleft inherited. |
| 5 | Reconnaissance | Swept for absolute local paths, estate hostnames, internal services, RFC1918 addressing and private sibling-repo names: **one hit**, a `tools/deploy.py` docstring aside naming a private sibling tool and the estate's network vendor. Removed here — it was decorative, not load-bearing. |
| 6 | Reads as public | README rewritten to open with what the project *is* to a stranger; licence, contributing and security sections added; `SECURITY.md` written with a real scope/not-in-scope split. |

Two further gates this repo needs that `rpi` did not:

| # | Gate | Evidence |
|---|------|----------|
| 7 | Floor fully enforced | The floor **tightens on a public repo** — advisory checks lose their hatch. The three advisory declarations (datescan/wrapscan/spellscan, 21 findings, review-by 2026-09-15) were therefore a dated flip blocker, not deferred debt. **Cleared**; `.atelier-floor.json` is down to the licence declaration and all twelve checks are enforced and green. |
| 8 | Platform settings | Audited — see below. **Cannot be completed before the flip**, which is the finding. |

### Gate 1 — how 101 findings became 0 without deleting anything

Not one was a leak. Every finding is a street address, phone number or
coordinate belonging to **a restaurant** — the data this site exists to
publish, already live at `lets-eat.myspot.nz` and already on each venue's own
website and front door. The owner's home address appears nowhere in the tree.

Per GUARDS (narrow, noisy, reasoned) the disposition is an allowance, not a
cleanup:

- **Four `.leakscanignore` globs** — `site/data/*` plus the three test files
  whose fixtures deliberately mirror real venue records. (Synthetic fixtures do
  not reproduce geocoding drift: `site/js/geo.js` documents a stored coordinate
  sitting ~100 m off its own street address.) 32 files, ~70 findings. The globs
  are kept tight deliberately — widening one to `site/**` would drop leakscan
  cover on the whole app shell, which is where a real finding would appear.
- **18 per-line markers** for prose that *quotes* a venue address as a worked
  example. Docs stay scanned and each exemption is visible in the diff.

**The line this draws:** venue business-contact data is allowed; personal data
of any kind is not, anywhere, and the globs never cover docs, the app shell or
`site/js`. A person's details pasted into a restaurant record would not be
caught by any scanner, so that stays a review responsibility.

This also settled the **suburb trap**. `"Churton Park"` sat in the
machine-local leakscan term list *and* is product content — three venues carry
it, and term hits are marker-non-exemptible ([atelier D1]), so the next edit
touching a fallback line in `site/index.html` would have blocked with no hatch.
It is out of the term list: a 10,000-person public suburb name is not an
identifying detail, and the street-level terms that actually pinpoint the house
remain. Cover narrowed, not lost.

### Gate 3 — what the history holds

236 commits, a **single** human author — one distinct address across every
commit (`git log --format=%ae --all | sort -u` returns exactly one row; it is
deliberately not reproduced here, so this review adds no fresh grep-able copy
of it to the tree). The only co-author trailers are Claude models. Sole
copyright holder, so the Apache-2.0 assertion is his
to make.

The 651 history leakscan findings resolve into three classes:

- **610** venue addresses, phones and coordinates — earlier versions of the
  same product data gate 1 disposed of.
- **34** the owner's own `cxi.nz` work email, in commit metadata. Deliberate
  attribution; it is already public on the live site's footer.
- **4** a household first name in two superseded versions of
  `tests/profiles.test.js`, renamed neutral at HEAD by `ea4ccde`.

**No history rewrite is needed on the credential evidence, and none was
performed.** The owner ruled full history on 2026-08-06, twice — once on the
family-texture review, and again in this session with the fresh-public-root
alternative costed and on the table.

### Gate 8 — the platform-settings finding

Audited against atelier P5's gap (the checklist gates repo *content*, never
GitHub *settings*):

| Setting | Now | At flip |
|---|---|---|
| Wiki | disabled ✅ | keep off — a second git repo no scanner sees |
| Discussions / Projects | disabled ✅ | keep off |
| Issues | enabled | keep on; needs triage once strangers can file |
| Default workflow permissions | `read` ✅ | keep |
| Workflows approving PRs | `false` ✅ | keep |
| Allowed actions | **`all`** ⚠️ | tighten; consider SHA pinning |
| Forking | enabled | unavoidable on a public personal repo — accept |
| Secret scanning + push protection | **unavailable** | **free once public — enable** |
| Branch protection / ruleset | **unavailable** | **enable immediately** |
| Fork-PR approval | **unavailable** | **enable immediately** |

**The finding:** the last three are refused by the API on a private free-plan
repo — branch protection returns *"Upgrade to GitHub Pro or make this
repository public"*, fork-PR approval returns *"not allowed for private
repositories"*. The roadmap's sequencing (*"branch protection before
visibility"*) is therefore **not achievable as written**. Hardening can only
happen *after* the flip, so there is an unavoidable window in which the repo is
public, unprotected, and a push to `main` is a live deploy. The mitigation is
procedural, not technical: **flip and harden in one sitting**, in the order set
out in [GO-PUBLIC.md](../GO-PUBLIC.md). Going public is also a net security
*gain* here — it turns on GitHub secret scanning and push protection, which the
free plan withholds from private repos.

## Rejected

- **A fresh public root** (new parentless root commit, lineage archived
  privately, a local `git replace --graft` keeping `log`/`blame` whole). Costed
  and put to the owner in this session; **declined**. It would strand every doc
  cross-reference to a pre-flip SHA, lose the build narrative that is much of
  this repo's value to a reader, and — decisively — buy little, because the
  workshop texture it would hide ships at HEAD anyway. Truncation only pays
  alongside a decision to trim the records, and that was declined too.
- **Trimming or privatising the records** (`SESSIONS.md`, `SESSIONS-ARCHIVE.md`,
  `ROADMAP.md`, `reviews/`). Declined by the owner: the open workshop is a
  feature of this project, and the venue data in the records is the same
  product data gate 1 already disposed of.
- **A blanket `.leakscanignore` over `site/`**. Rejected: it would silence
  genuine future findings in the app shell — the one place they are most
  likely.
- **Deleting the venue data to clear the reds.** Rejected: it is the product.
- **Deferring the advisory scanner debt to its 2026-09-15 review-by.** Rejected
  once the public-floor tightening was noticed: the date is after the intended
  flip, so it would have made a red floor the repo's front step.
- **Shipping `/.well-known/security.txt` now.** Rejected: the owner ruled the
  contact is GitHub security advisories, and that URL 404s while the repo is
  private. Shipping it early puts a dead contact on a live site. It is a
  flip-day step instead, with the file content ready in GO-PUBLIC.md.

## Consequences

### Two owner actions are owed before the flip

1. 🎯 **Rotate the GitHub PAT, and confirm the AWS / Google / TrueNAS
   credential roots are hardened.** `SESSIONS-ARCHIVE.md` records the PAT as
   classic + broad and names those roots as *queued* for hardening. The owner's
   standing stance is right — make the line historical by rotating, don't
   redact it — and under the full-history ruling redaction would achieve
   nothing anyway, since the text stays reachable in every clone. But that
   stance only holds **if the rotation has actually happened**. Publishing
   "these credential roots are not yet hardened" while it is still true is a
   live disclosure, not a historical one. This is the one item that can turn a
   safe flip into an unsafe one, and it is estate-side work.
2. 🎯 **Own the residual risks below**, or reopen the ruling they rest on.

### Residual risks the owner accepts on a flip

- **Household first names publish in history.** Three of them — a partner's
  and two children's — appear ~31 times as test-fixture profile names and
  share labels in superseded versions of three test files, until `ea4ccde`
  renamed them neutral. (Named here only by relationship: reproducing them
  would defeat the rename.) HEAD is clean; history is not, and full history
  was ruled. Marginal rather than novel for one of the three, which already
  ships at HEAD in a recipe title under the owner-approved 2026-07-06
  exception and has been on the live public site for weeks. First names only:
  no addresses,
  no contact details, no health data, none of which appear anywhere in tree or
  history. **This is the single strongest argument for the fresh-root option,
  and the owner declined it with the fact in hand.**
- **Real name and work email become permanently public**, attached to all 236
  commits. Already true of the live site's attribution.
- **Home *area* is inferable** from the venue set — three venues in the owner's
  suburb. Unchanged by this flip: the site has been live and public since
  2026-07-12, so this is already the case.
- **The repo's own open defects publish** — the roadmap and session logs are
  candid about what is unfinished, unverified and deferred. That is the honest
  posture, and it is the point of publishing the workshop.
- **A push to `main` is a deploy**, now from a public repo. Branch protection
  closes the drive-by path but not the window described in gate 8.

### Upstream, still open — not blockers this repo can close

- **atelier P4** — the CI plane calls leakscan without `--require-terms`. The
  `floor` workflow had been **red since 2026-07-25**; it went **green at
  `8ba6218`** as a side effect of gate 1, exactly as `rpi` 0009's floor failure
  resolved itself. The mechanism is worth being precise about, because it is
  not a fix: CI has no term list, so it only ever ran the structural rules, and
  it was blocking on the ~86 structural findings in the venue data. The
  `.leakscanignore` took those to zero, so there is now nothing for it to block
  on. **The gap itself is untouched** — CI still prints *"cover not guaranteed
  — the ci plane does not pass `--require-terms`"* and still cannot catch a
  term-list-only leak. Post-flip every push is publication, so a CI plane that
  can only see structural patterns is a real residual, and the fix stays
  atelier's.
- **atelier P5** — the platform-settings checklist. Gate 8 above is this
  repo's instance of it; the generic checklist is still owed upstream.
- **atelier P6** — the estate-internal-context ADR, drafted 2026-08-05, ruling
  owed. It binds every repo heading public. This review applied the *narrow*
  rule it already holds (gate 5) but cannot pre-empt the wider ruling.

[ADR 0009]: https://github.com/mike548141/rpi/blob/main/docs/decisions/0009-publish-safety-review.md
[ADR 0008]: 0008-sbom-committed-and-deterministic.md
[atelier D1]: https://github.com/mike548141/atelier
