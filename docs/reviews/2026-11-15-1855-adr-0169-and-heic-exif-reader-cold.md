# Cold pass — ADR 0169 (provider, branch and menu) and the HEIC EXIF reader

**Board:** `docs/roadmap/530-theme-41-provider-branch-and-menu-each-with-a-time-dimension-owner-raised-2026-11-15/050-cold-review-owed-adr-0169-and-the-heic-exif-reader.md`
**Status:** BRIEF ONLY — the review has NOT run. Written 2026-11-15 1855
UTC (2026-11-16 NZDT). **Fable-gated:** the pass runs only on the owner's
explicit approval of Fable work at the time; this brief existing is not that
approval. The verdict goes below a divider in this file (atelier
`REVIEW.md` § *The lifecycle*).

## Provenance

Written by a headless brief-writing session (Claude Opus 5.5, session
`980835bb`), started by session `21a271a5` on the owner's word of
2026-11-16, *"yes do it"*, answering an offer to have a headless session
write the missing brief for `530/050`. That instruction named the item and
nothing else. This session wrote none of the subject, ran no review and
formed no finding. It wrote the held-back sibling named at the end.

**Barred from taking this pass** (rule 4: the review comes from a session
the author neither started nor instructed):

- session `1bdd7eb4`, which built both subjects (the HEIC reader in its
  `2026-11-14-0340` record, ADR 0169 in its `2026-11-15-0222` record) and
  filed `530/050`;
- session `21a271a5`, which may orchestrate the pass but must not review;
- this brief-writing session, `980835bb`.

**Tier: Fable, checked at selection.** A session not on Fable stops, and
neither takes the item on a lower tier nor proceeds hoping the pass is
accepted (`REVIEW.md` rule 4). An off-tier orchestrator forms no finding,
writes no severity, and is disclosed in the claim, the pointer and the
verdict. The verdict repeats this provenance.

## Before reading anything

1. **Skip the session-log step of the repo's read order.** `CLAUDE.md`
   § *Where to start* says to skim `docs/SESSIONS.md`; a cold reviewer does
   not (rule 2). The two session records above carry the author's account.
2. **Check your tree has the delta:**
   `git merge-base --is-ancestor c42b2cc1 HEAD && git merge-base
   --is-ancestor 426abe4e HEAD` must exit 0. If it does not, merge
   `origin/main` first.
3. **Read commits body-free.** Plain `git show` prints the message body
   ahead of the diff, and reading is atomic (`REVIEW.md` rule 1). Use
   `coldsweep.py` (`../atelier/tools/coldsweep.py` from the primary
   checkout; from a worktree,
   `"$(git rev-parse --git-common-dir)/../../atelier/tools/coldsweep.py"`,
   because `../atelier` does not resolve there).

## Subject

**A. ADR 0169** — `docs/decisions/0169-provider-branch-and-menu-are-three-independent-objects.md`,
landed in `c42b2cc1` (2026-11-16 NZDT). Read it body-free:

```sh
python3 <coldsweep> --commit c42b2cc1 \
  --path docs/decisions/0169-provider-branch-and-menu-are-three-independent-objects.md \
  --path site/js/vibes.js --path site/js/filters.js --path site/sw.js \
  --path tests/vibes.test.js --path CHANGELOG.md
```

The same commit also carries a code change: `counter-order` goes back from
an amenity to a style in `site/js/vibes.js` (owner-directed, `520/050`), a
comment in `site/js/filters.js` citing ADR 0169, the `SHELL_VERSION` bump,
and `tests/vibes.test.js`. See *Non-goals*.

**B. The HEIC EXIF reader** — `tools/intake_exif.py`, commit `426abe4e`
(2026-11-14 NZDT, one file, +97 −11): `_parse_tiff`, `_boxes`,
`read_heic_exif` and the `.heic` branch of `describe()`. Read it with
`python3 <coldsweep> --commit 426abe4e`. No later commit touches the file
(checked at `f8ee2d43`); review it as it stands.

Its consumer is `tools/check_provenance.py`, which imports `describe` from
it (line 89) and treats `.heic` as a photo (line 99). The reader decides
the capture date a menu reading is bounded by (ADR 0107), so it is in
scope as far as it feeds that gate.

**Intent records** (read freely, as evidence of what was asked):

- the owner's verbatim words in the Theme 41 README
  (`docs/roadmap/530-…/README.md`); its unquoted prose and tables are the
  author's account, so treat them as claims;
- ADRs `0011`, `0003` and `0047` (the item names these for collisions), and
  `0023`, `0132`, `0145`, `0146`, `0153`, `0155`, which ADR 0169 cites;
- the rulings ADR 0169 cites: `520/010`, `520/040`, `520/050`
  (`docs/roadmap/520-…/`), `470/050`
  (`docs/roadmap/470-…/050-cook-at-home-as-a-venue-with-branches-one-per-house.md`)
  and Theme 30 (`docs/roadmap/370-…/`);
- for B: ADRs `0107` (evidence provenance), `0115` and `0128` (what may be
  read and kept from an image), and `tools/strip_exif.py`'s header.

Theme 41's items `020`, `030` and `040` were written by the author session
as the stages to come; read them as claims about the plan.

## Type

A: a design record others will build to, which forecloses one shape (the
hierarchy) and sets a staged migration. It is a decision, not doctrine;
say so if you judge otherwise (`REVIEW.md` rule 3). B: shipped tooling
whose output a gate reads as evidence.

## Why it earns a review

- **A** commits every later stage of Theme 41. Its worst failure is a
  record stronger than the owner's words, or one that collides with an
  accepted ADR, built on for months before anyone checks.
- **B** is a hand-written binary parser feeding a guard. Its worst failure
  is silent: a wrong or missing date makes `check_provenance.py` pass a
  stale menu as fresh, or call a fresh one unbounded, and nothing else
  reads the bytes. It was verified on one device's photos.

## Scope and the four lenses — run all four

Scope is the whole commitment: the owner's words, the decision and what it
rejected, its consequences for every stage, the reader's code, its consumer,
whatever tests exist for it, and real behaviour on real files, exercised
wherever this machine allows. An impossibility claim states its grounds.

1. **Approach & assumptions** — the most important. Name the load-bearing
   assumptions yourself, as your first act, before reading the list below.
2. **Correctness & quality** — does the ADR say what the owner said, no
   more; does the reader return what the file holds, or nothing, and never
   a guess.
3. **Completeness / harvest** — every record that should change with these
   two and did not; every mirror site of a changed rule (`REVIEW.md` V3).
4. **Security & privacy** — a must. For A: what the target model would
   collect, store or ship, against `CLAUDE.md` § *Hard constraints* (no
   personal data; the two owner-approved exceptions) and ADR 0046/0047.
   For B: untrusted bytes parsed by hand (malformed, truncated, hostile
   or misnamed files), and what the reader exposes, checked against open
   catalogues (OWASP ASVS V5 input handling, CWE), not memory. Aim
   `/security-review` at `426abe4e`'s diff by staging it in a scratch
   worktree of your own; weigh it as one input. Never run it over this
   file while the sibling below still exists.

Run the standing checklist (V1–V7) unasked.

🛑 **This repo is public.** Never write a coordinate, an altitude, a place
of capture or an intake file name into this file. Count and classify; do
not quote GPS values.

## Load-bearing claims to attack

The records' own claims, in their own terms — a floor, never a fence.
Damage each with a probe or confirm it by re-driving it.

- **C1** — ADR 0169's decision is the owner's: three independent objects,
  joined by relationships, with a provider having at least one branch and
  one menu. Nothing in it is stronger than his two messages.
- **C2** — It refines ADR 0011 and ADR 0003 and supersedes neither yet, and
  it does not collide with ADR 0047 (the app ships only what it renders).
- **C3** — Every staged migration step leaves every existing file valid,
  because today's venue file is the degenerate case.
- **C4** — The rulings it cites (`520/010`'s three kinds of evidence,
  `470/050`'s homes as branches, `520/040`'s truck as a branch) say what
  the ADR says they say.
- **C5** — `read_heic_exif` finds the `Exif` item through `meta`/`iinf`/
  `iloc`, reads it with the same TIFF walk a JPEG uses, and returns `{}`
  rather than a guess for anything it does not handle.
- **C6** — On the intake material, the HEIC reader agrees with macOS's own
  HEIC→JPEG conversion on capture date, time, offset, device and GPS.
- **C7** — `check_provenance.py` now dates a HEIC reading correctly, where
  before it called a same-day reading unbounded.

## Grounding — re-run lines

Each run once by the brief-writer on 2026-11-15 ~1855 UTC, in the primary
checkout at `f8ee2d43`, Python 3.14.6, Node v24.18.0, macOS 26.7.3.
Re-run every one; a line that no longer reproduces is a finding.

- `python3 tools/check_provenance.py --selftest` → `OK — 15 passed, 0
  failed`, exit 0.
- `python3 tools/check_provenance.py` → exit 0; 107 recorded files, 107
  fingerprints verified.
- `python3 tools/strip_exif.py --selftest` → `31/31 passed`, exit 0 (the
  commit cites this run as verification).
- `python3 tools/check_decisions.py` → clean, 168 records, exit 0.
- `node --test tests/vibes.test.js` → 14 tests, 14 pass, exit 0.
- **C6, re-driven.** For every `.heic` under the primary checkout's
  `intake/` (21 files today; the commit says 19), the brief-writer compared
  `read_heic_exif(p)` with `read_jpeg_exif` on a copy made by
  `sips -s format jpeg p --out <scratch>`. Result: IFD0 and EXIF blocks
  identical on all 21; GPS `lat`, `lng`, their refs and `gps_date`
  identical on all 21; `gps_time` differs on 19 and `alt` on 5 of those, by
  sub-second and sub-metre amounts. All 21 got a capture date from
  `describe()`. The commit's "GPS identical" therefore does not reproduce
  field for field; which side is right is yours to establish. Keep the
  scratch copies outside the repo and delete them after.

`intake/` is gitignored: a worktree has no HEIC files. Point the tools at
the primary checkout's material by absolute path, and never copy it into
a tree that can be committed.

**Not run by the brief-writer:** no HEIC from any device but the one the
intake holds, and no malformed or hostile HEIC. Both are yours to build if
you judge them owed.

## Rule 2 — what is barred until your findings are committed

"Committed" means durably written to your draft of this file.

- The commit message bodies (see *Before reading anything*).
- The board item under review (`530/050`) and Theme 41's item `010` (the
  author's account of the ADR), and the generated `docs/ROADMAP.md`.
- The session records: `docs/SESSIONS.md` and `docs/sessions/`, including
  `2026-11-14-0340-eight-food-trucks-and-what-they-showed.md` and
  `2026-11-15-0222-the-owners-three-truck-rulings.md`.
- Prior verdicts in `docs/reviews/`, and this file's sibling.

Search the tree with the barred paths excluded:

```sh
T=docs/roadmap/530-theme-41-provider-branch-and-menu-each-with-a-time-dimension-owner-raised-2026-11-15
python3 <coldsweep> \
  --also-exclude $T/050-cold-review-owed-adr-0169-and-the-heic-exif-reader.md \
  --also-exclude $T/010-the-three-entity-model-and-its-rules.md \
  --also-exclude docs/ROADMAP.md \
  --also-exclude docs/reviews/2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.deferred.md \
  '<pattern>'
```

(`docs/SESSIONS.md`, `docs/sessions/` and `docs/reviews/` are in
coldsweep's default bar.)

## Non-goals

- **The `counter-order` put-back** in `c42b2cc1` (`vibes.js`,
  `tests/vibes.test.js`): an owner-directed reversal of a one-day-old move,
  with its own test. In scope only where it touches ADR 0169 (it does not,
  on the brief-writer's read).
- `tools/gen_summaries.mjs` (comment only, in `9047030f`) and
  `docs/decisions/README.md` (the 0169 index line, gated by
  `check_decisions.py`), as the item says.
- Field names, file layout and payloads for any stage: ADR 0169 leaves them
  to later records.
- Changing the owner's rulings. Where you judge one wrong, label the finding
  *against a ruling*, for the owner.

If a non-goal fences off a risk the work actually carries, say so as a
finding.

## Questions the brief-writer could not settle

- The item names "his two messages"; the README quotes three passages
  (2026-11-15, and two on 2026-11-16). The brief treats all three as the
  owner's words. Nothing here waited on the owner.

## The held-back sibling

`2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.deferred.md`, beside
this file, holds 12 entries. Open it only after your findings are durably
written here; then fold it in below your verdict and delete it
(`REVIEW.md` rule 1).
