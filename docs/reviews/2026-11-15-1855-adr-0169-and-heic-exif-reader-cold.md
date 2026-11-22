# Cold pass — ADR 0169 (provider, branch and menu) and the HEIC EXIF reader

**Board:** `docs/roadmap/530-theme-41-provider-branch-and-menu-each-with-a-time-dimension-owner-raised-2026-11-15/050-cold-review-owed-adr-0169-and-the-heic-exif-reader.md`
**Status:** REVIEWED — verdict and the sibling's reconcile below the
divider, 2026-11-22 UTC (Fable 5.1, under the owner's drain order of
2026-11-23 NZDT). 0 MAJOR, 7 MINOR, 5 NOTE; decisions owed (F1 the owner's,
the rest the author's); the cycle closes with no MAJOR. Brief written
2026-11-15 1855 UTC (2026-11-16 NZDT).

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

---

## Verdict — cold pass, act 1 (2026-11-22, UTC)

**Reviewer:** Fable 5.1 (model id `claude-fable-5-1`), tier checked at
selection. **Spawn:** a headless per-pass orchestrator (Claude Opus 5.5),
itself started by drain session `eca14b23` (Opus 5.5), under the owner's
weekly Fable drain order of 2026-11-23 08:26 NZDT, verbatim: *"Start a fable
drain or whatever it is called now. Target 100% of weekly budget by 11.30am
NZT todat"*. Both are off-tier orchestrators under `REVIEW.md` rule 4: they
hold the context partition, formed no finding and wrote no severity. Neither
wrote the brief or built either subject. This reviewer was not started or
instructed by `1bdd7eb4`, `21a271a5` or `980835bb`. **Orchestrator direction
received, process only:** the worktree path, the brief path, the barred set
(the `.deferred.md` sibling removed from the worktree; board item `530/050`,
Theme 41 item `010`, `docs/ROADMAP.md`, `docs/sessions/`, `docs/SESSIONS.md`,
prior verdicts, commit bodies), the log path, the deliverable's shape and the
release timing; no question about the delta, no pointer to risk. **No
contact** from any barred session during the pass. **Tree:** worktree at
`ba6b86b9` (detached); both landing commits are ancestors (`merge-base
--is-ancestor` exit 0). **Reading order:** brief in full (the C-list is
inline, so it was read before the reviewer's own assumptions were written;
disclosed), atelier `REVIEW.md`, own assumptions logged, then the two commits
body-free via `coldsweep.py --commit`, then the files. No session log, no
board index, no prior verdict and no commit body was read. The one
`coldsweep` warning: `--also-exclude` for the sibling matched no file,
because the orchestrator had removed it; nothing was searched wide.

### Scope covered

Both subjects whole: ADR 0169 and the code in `c42b2cc1`; `tools/
intake_exif.py` as it stands (unchanged since `426abe4e`), its consumer
`tools/check_provenance.py`, the two other callers (`product_bursts.py`,
`strip_exif.py`), the committed evidence record, the live intake material
(read in place in the primary checkout; nothing copied into any tree), the
rulings the ADR cites (`520/010`, `520/040`, `520/050`, `470/050`, Theme 30
README), ADRs 0003, 0011, 0023, 0047, 0107, 0115, 0128, 0132, 0145/0146, 0153,
0155, Theme 41's README and items `020`–`040` (as claims), and the verify
list in `CLAUDE.md`. Left out, as non-goals: the `counter-order` put-back
beyond its test and its touch on ADR 0169 (none); `gen_summaries.mjs`'s
comment; the
0169 index line's wording beyond checking it matches the ADR (it does). No
non-goal fences off a risk the work carries.

### Lens 1 — approach and assumptions (named first; the log has them)

**A (ADR 0169).** The load-bearing assumption is that today's venue file is
the degenerate case of the target model, so each stage leaves every file
valid. It holds for branches (53 of 66 files carry no `locations[]` and ADR
0011's seam makes the top level one branch; 10 are multi-branch) and fails
for menus: **10 of 66 files are `status: "stub"` with `menu: []`** (measured
on `site/data/restaurants/`). The ADR's invariant *"a Provider has at least
one Branch and at least one Menu"* is the owner's words and is stated as
holding today. Either an empty menu counts, or stubs are the exception, or
stage 1 breaks 10 files, or the invariant is never checked and is prose (ADR
0072's class). The ADR does not say which (F1). The other premises hold: the
rejected hierarchy is what the data has (`locations[]` inside the venue, one
`menu`); the three breaking cases are real (Rock Yard's truck is its own file;
Theme 30's `menus[]` is unbuilt; the eight trucks carry `hours: null` and a
sighting).

**B (HEIC reader).** The assumption is that Apple's HEIC is the HEIF the walk
expects: `meta` top-level, `iinf`/`iloc` in the versions handled, one extent
per item, construction method 0, and the Exif item prefixed by a 4-byte TIFF
header offset. On the 21 files that holds (step 5). The walk itself is more
general than the author needed: synthetic files exercising `iinf` v0/v1,
`infe` v2/v3, `iloc` v0/v1/v2, base offsets, index sizes, 8-byte offset and
length fields, a `size==1` largesize box and a `size==0` last box all read
correctly (step 6). Where it is narrower than the spec — one extent — it
reads partially rather than returning `{}` (F8). Where the input is hostile
or truncated, two paths do not fail closed (F5, F6).

### Lens 2 — correctness and quality

**A.** The ADR says what the owner said, with one widening (F3) and one
cross-reference that reaches the wrong rule (F2). Decision 4's *"three kinds
of evidence (owner-ruled 2026-11-15, 520/010)"*: the ruling's words are in
`520/040` (*"sightings, announed/booked time & place, schedule"*) and carried
into `520/010`; the citation is to the item that holds the build, acceptable.
Decision 7's *"ruled 2026-09-08"* is `470/050`'s ruling, quoted whole there.
Decision 5's *"absent means permanent"*, the relationship names, the staged
order and decision 6's *"the order tally is the nearest object"* are the
record's design, not his words; the status line says *"owner-directed"*,
which is true of the model and should not be read onto those details.
**B.** The reader returns what the file holds (C5, C6): 21/21 agree with an
independent locator and with macOS's conversion on every field except the
two sips alters (step 5). Honest `{}` on method 1, an unmatched item id and a
bad TIFF header offset. Not honest: a partial dict on multi-extent items
(F8), uncaught exceptions on 18 of 265 truncation points and one empty-box
shape (F6), and a hang on a 32-bit `iloc` count (F5).

### Lens 3 — completeness and harvest

- No test anywhere exercises `read_heic_exif`, `_boxes` or `_parse_tiff`;
  `strip_exif.py --selftest` cross-checks `read_jpeg_exif` only
  (`strip_exif.py:376`, `:591`); CI runs `check_provenance.py` with no intake
  material, so the HEIC path never runs there (F7).
- `describe()` dispatches on the file suffix while `tools/lib/imagemeta.py`
  `sniff()` already decides format by bytes; the repo has two answers to one
  question (F9, V4).
- `strip_exif.py:45` says *"No stdlib reader exists"* for HEIC; one now does,
  in the same `tools/` directory (F10, V3).
- The ADR's mirror sites: `docs/decisions/README.md:1974` matches the ADR;
  `docs/ARCHITECTURE.md` owes no line (the ADR is a target model, not
  current truth, and says so); `site/js/filters.js:117` cites it correctly.
  Faves ADRs carry no `review:` line and no back-reference convention (2 of
  168 carry one), so 0011/0003 lacking a "refined by" is not a miss here.
- `520/040`'s account of the HEIC verification is wider than the comparison
  supports (F11).

### Lens 4 — security and privacy

**A, design altitude.** The model adds no field today, so nothing new is
collected or shipped. Two threats for the stages to carry: a sighting *"on
whose evidence"* must never name a natural person in `site/data/` (F4); a
mobile branch's registered address may be a depot or a home, which `520/010`
already says and decision 5 answers by sourcing place from availability.
Cook at Home's private homes stay reader-side (`470/050`); the ADR defers
storage, so no collision with `CLAUDE.md`'s absolute rule or ADR 0046/0047.
**B, code altitude.** Untrusted bytes parsed by hand, checked against CWE
and ASVS V5 with fixtures, not memory: CWE-606/835 (loop bound from the
input) is live (F5); CWE-125-class reads are safe in Python (slicing
returns short, `struct.unpack_from` raises) but the raise is uncaught (F6);
no memory amplification (reads are slices of the file); no path from a
coordinate in the file to any tracked record (the record stores `gps:
present|absent`, checked in `check_provenance.py:163`); `describe()` prints
coordinates in table mode by design (ADR 0115, unchanged by this delta).
**`/security-review`: discharged with grounds.** It scans the session's
pending diff; this worktree's only pending change is the orchestrator's
removal of the deferred sibling, whose diff is the sibling's text, and the
pass may create no branch or worktree to stage the delta elsewhere. In its
place: the fixture run (step 6) and a read-only security sub-read of scratch
copies of the file and the diff by a `review-council:security-reviewer`
agent on **Opus** (not Fable; it formed no finding of this verdict and its
output was weighed as one input — step 9 in the log). It returned ten
claims from reading alone; nine were then confirmed with fixtures (F5, F6,
F8 carry them) and one (two `Exif` items: the last wins, `:218`) is by
reading only. Its "what holds" list — the box walk always moves forward,
slicing never raises, value bounds at `:115`, sub-IFD depth bounded to one —
agrees with the fixtures.

### C1–C7

- **C1 — holds with one widening.** Every decision traces to the three
  quoted passages or to a cited ruling; decision 6 says a meal is chosen
  *"from one or more menus"* where he said *"from a menu"* (F3).
- **C2 — holds.** ADR 0011's rejected *"separate record per branch"* is the
  shape Rock Yard's truck has today; the ADR names it as interim and says
  stage 1 supersedes 0011. ADR 0003's *"one sanctioned deviation"* is left
  until `530/040`. Decision 8 defers to ADR 0047; no collision.
- **C3 — not established.** True for branches; for menus it rests on how
  `menu: []` on 10 stub files is read (F1). A claim about unbuilt stages
  cannot be re-driven; its premise can, and it is incomplete.
- **C4 — holds.** `520/010` (three kinds, option 3 rejected as the wrong
  unit), `470/050` (homes as branches, 2026-09-08) and `520/040` (*"Rock Yard
  Food Truck is a branch of Rock Yard Vietnamese Restaurant"*) say what the
  ADR says they say.
- **C5 — holds on well-formed input, with three exceptions.** The walk finds
  the item through `meta`/`iinf`/`iloc` on every version tried and reads it
  with the shared TIFF walk; it returns `{}` for method 1 and for a missing
  item. It does not return `{}` for a multi-extent item (F8), and it raises
  or hangs on malformed input (F5, F6).
- **C6 — holds, and settles which side is right.** 21/21 identical on IFD0,
  EXIF, position, refs and GPS date; GPS time-of-fix differs on 19 and
  altitude on 5 because sips rewrites the rationals (seconds with denominator
  100 become denominator 1). The reader reports the file's own values. The
  record's "GPS identical" is true of position and date, not of every field
  (F11).
- **C7 — holds.** `judge()` returns `unbounded` when `newest_photo` is None;
  all 19 HEIC rows in the committed record are dated; the live run against
  the primary material reports 0 refused and no drift.

### Re-run results

All six lines reproduce at `ba6b86b9` with `python3` 3.14.6 and Node
v24.18.0: `check_provenance.py --selftest` OK 15/15; `check_provenance.py`
exit 0 (107 recorded, 107 absent in the worktree; 107 verified against the
primary material with `--intake`); `strip_exif.py --selftest` 31/31;
`check_decisions.py` clean, 168; `node --test tests/vibes.test.js` 14/14. C6
re-driven on 21 files: result as the brief recorded, now with the cause.

### Standing checklist

- **V1.** F3, F11; the `owner-directed` status read onto design details
  (lens 2). Elsewhere claims match evidence.
- **V2.** All re-run lines reproduce; C6 re-driven; the brief's "no later
  commit touches the file" re-checked.
- **V3.** F10 (`strip_exif.py` header). Other mirrors checked clean.
- **V4.** F9 (two ways to decide a file's format).
- **V5.** F2 (a cross-reference that reaches a rule which does not cover the
  case: ADR 0153 moves dish ids; hearts are keyed by venue id too). F1 (the
  ADR agrees with itself only if `menu: []` is "a Menu").
- **V6.** Run above; `/security-review` discharged with grounds; sub-read on
  Opus as one input.
- **V7.** Stated at the top; the brief states it too.

### Findings

**F1 — MINOR, for the owner.** The invariant *"at least one Branch and one
Menu"* against 10 stub files with `menu: []` (`babaili-malatang`,
`caffiend`, `cosmic-vape-and-coffee`, `cozy-cake-shop`,
`goldings-free-dive`, `kaffee-eis`, `marigold-takeaway`, `moore-wilsons`,
`new-chapter-cafe`, `wellington-sourdough`). The ADR says today's file is the
degenerate case; for these it is not, unless an empty menu is a Menu.
Options: (a) the invariant is on the relationship, so an empty Menu counts
and `validate.py` checks "at least one menu" at stage 1 — all 66 files stay
valid; (b) a stub Provider may have no Menu while `status` is `stub` — the
invariant becomes conditional; (c) enforce it as written and retire or fill
the ten. Recommendation: (a), stated in the ADR in one sentence, because it
keeps his invariant unconditional and C3 true at no data cost.

**F2 — MINOR.** Consequence 1, *"with `formerIds` keeping every heart (ADR
0153)"*. A heart is keyed `d:<venueId> <dishId>` (`site/js/favourites.js:68`);
ADR 0153's `formerIds` moves a retired **dish** id, and folding
`rock-yard-food-truck` into `rock-yard-restaurant` retires a **venue** id.
The mechanism for that is `site/js/renames.js`'s `RENAMED` table with the
venue-level `formerIds` field (`validate.py:192`), which `520/040` names
(*"`formerIds` and `renames.js` already let a later merge keep hearts"*) and
the ADR dropped. A stage-1 builder following the ADR as written would leave
every truck heart dark. Fix: cite `renames.js` and the venue `formerIds`
beside ADR 0153 in the consequence. Recoverable afterwards (a later `RENAMED`
entry re-migrates), which is why this is not MAJOR.

**F3 — NOTE.** Decision 6 widens *"one or more dishes from a menu"* to *"from
one or more menus"*. Say it is the record's reading or keep his words.

**F4 — NOTE, design-altitude privacy, for stage 3.** A sighting carries *"on
whose evidence"*. In `site/data/` that must name a channel or the business,
never a natural person; `520/010` lists sources (the truck's own post, the
owner, in person) without saying so. One sentence in the ADR or in `530/020`
closes it before anything is built.

**F5 — MINOR, security (CWE-606 / CWE-835).** `read_heic_exif`'s `iloc` loop
runs `item_count` times (32-bit in v2) and `take()` never checks the box end
`e` (`tools/intake_exif.py:226–243`). A file with `iloc` v2 and `item_count`
0x00FFFFFF ran past a 5 s alarm; 0xFFFFFFFF would run for hours. Effect: a
hang of `check_provenance.py` (live), `product_bursts.py` and `--for` on one
hostile or corrupt file in `intake/`; CI is not reachable (no material).
**Second path, same class (CWE-400):** an IFD0 of N entries all tagged
`0x8769` and pointing back at IFD0 makes `_read_tiff` walk N entries N times
(`:103`, `:117–119`; the recursion is bounded to one level, the fan-out is
not). Measured: N=500 0.40 s, N=1000 1.18 s, N=2000 4.78 s; N=65535 (a 786 KB
item, legal in HEIC) ran past a 5 s alarm and extrapolates to about 85
minutes. JPEG's 64 KB APP1 cap kept this under a minute; HEIC lifts the cap,
so the exposure is new with this delta. Fix: stop when `p >= e`, bound the
`iloc` count by `(e - p) // 4`, and follow each sub-IFD pointer once (a
`seen` set) with a cap on entries read. Recurrence prevention: the fixture
test in F7, which already carries both cases.

**F6 — MINOR.** Uncaught exceptions on malformed input, where the docstring
promises `{}`: `struct.error` at `:166` (`_parse_tiff` on a block shorter
than 8 bytes) and `:114` (`_read_tiff` when an entry's offset field is cut),
`IndexError` at `:210` (`data[s]` on an empty child box at end of file),
`struct.error` at `:180` (a `size==1` header with fewer than 16 bytes left)
and at `:216` (an `infe` cut before its item id), and a `TypeError` raised
through `parse_exif_dt` when `DateTimeOriginal` is stored with a SHORT type
(`:132–135` accept any type for any tag, then `describe()` hands an `int` to
`re.match`). Each was reproduced with a fixture. Measured on plain
truncation: 18 of 265 cut points of a valid file raise. `describe()` and
`check_provenance.scan_folder()` catch nothing, so one such HEIC aborts the
whole provenance run instead of yielding a `captured: null` row — the state
the tool's own comment calls "we have a file and it told us nothing". The
`_parse_tiff` and type paths predate this delta (JPEG reaches them too).
Fix: catch `(struct.error, IndexError)` at the two entry points and return
`{}`; accept a tag only in its expected type.

**F7 — MINOR, test evidence.** Nothing tests the HEIC reader; the selftest
cited as verification does not call it; CI cannot reach it. A synthetic
fixture (one `ftyp`, `meta` with `iinf`/`iloc`, `mdat` with a TIFF; ~60
lines, stdlib only, no real photo) covers `iinf`/`infe`/`iloc` versions,
multi-extent, the hostile count and truncation, and belongs on the verify
list and in CI. The brief's own words: a hand-written parser feeding a
guard, verified on one device's photos.

**F8 — MINOR.** A spec-valid Exif item split across two or more extents is
read from `ext[0]` only (`:243`): a dict with IFD0 and no date comes back, a
partial read, not the documented `{}`. Apple writes one extent (21/21), so
no live effect today. Fix: concatenate the extents, or return `{}` when
`extent_count > 1` and say so in the docstring; while there, refuse a file
that names two `Exif` items (`:218` lets the last one win silently).

**F9 — MINOR, harvest.** `describe()` chooses the reader by suffix (`:320`)
while `tools/lib/imagemeta.py` `sniff()` decides by bytes and `strip_exif.py`
says *"never the extension"*. A HEIC named `.jpg` or `.png`, or a JPEG named
`.heic`, is silently undated (measured), which is the failure class this
delta fixed. Two JPEG-by-bytes `.png` files exist in `intake/ingredients/`
today (products.py's store, outside `menu-sources.json`); none under
`menus/`. Fix: dispatch on `imagemeta.sniff()`.

**F10 — NOTE.** `strip_exif.py:45`, *"No stdlib reader exists"*, is false in
this repo since `426abe4e`. The refuse-by-default decision still stands
(reading EXIF is not proving a strip); only the reason is stale.

**F11 — NOTE, V1 on `520/040`.** *"capture date, time, offset, device and GPS
identical"* on *"all 19 photos"*: identical on position, refs and GPS date;
GPS time-of-fix differs on 19 of 21 and altitude on 5, because macOS's
conversion re-encodes the rationals. The reader is right and the sentence is
wider than the check that produced it. (19 is the `menus/` count; two more
HEICs sit under `recipes/`.)

### Tally and verdict

**0 MAJOR · 7 MINOR (F1, F2, F5, F6, F7, F8, F9) · 4 NOTE (F3, F4, F10,
F11).** Both subjects stand: ADR 0169 records the owner's model without
overreach beyond F3, and the reader returns what the file holds on every
real file it has met. Owed before either is leaned on further: F1 is the
owner's call, and F2 should be fixed in the ADR before stage 1 is briefed;
F5, F6 and F7 together are one small change to `intake_exif.py` plus one
fixture test. Per `REVIEW.md`, a pass with no MAJOR closes the cycle; the
decisions are the owner's for F1 and the author's for the rest, recorded
against this file.

## Act 2 — reconcile against the held-back sibling (2026-11-22, UTC)

The sibling was released by the orchestrator after act 1 was committed
(`d4b6334c`), as one held copy outside every tree; nothing else was opened.
Its twelve entries, each answered as confirmed, damaged, or covered by a
finding above. Four needed a further check, run before writing this:

- **D1 (homes as branches vs the absolute rule) — confirmed in part, new
  F12 (NOTE).** The ADR makes private homes Branches (decision 7, stage 5)
  and relies on `470/050` for where they live. `470/050`'s ruling (2026-09-08,
  his words) puts them *"in the users data, not the data held in github"*,
  and ADR 0155 ships the one public branch as `address: {anywhere: true}`,
  refusing lat/lng/phone beside it. So the stage is buildable, and the
  reader-side store is the only shape that honours `CLAUDE.md`. The ADR
  does not say so in its own words; a builder reading decision 7 and stage
  5 alone meets "homes are Branches" with no statement that a home branch
  never enters `site/data/`. One sentence closes it (F12).
- **D2 (a sighting is about a person) — covered by F4.** The data it would
  carry is the truck's whereabouts, not a person's, unless the source names
  one; F4 puts the constraint on the source field. Whether it ships is
  decision 8's deferral to ADR 0047 and `520/010`'s own answer (today's and
  the next few spots ship, older ones age into `data/`).
- **D3 (the invariant against today's data) — covered by F1,** which
  measured it: 10 stub files with `menu: []`. The recipe collection has a
  menu of recipes and the Anywhere branch, so it satisfies both halves. The
  degenerate-state fixtures (`tools/lib/fixtures.mjs`) are built in memory
  by a check, not corpus files, so C3 does not reach them.
- **D4 (`formerIds` for a venue) — covered by F2,** with the rest answered:
  hearts are not keyed by branch id (`favourites.js:68`), so ADR 0103's ids
  are not in the path; deep links to the old venue id are exactly what
  `renames.js`'s `RENAMED` table resolves before any record is fetched (its
  header says so), so the venue-rename mechanism is the one the consequence
  must name.
- **D5 ("refines" while it contradicts) — confirmed as acceptable, no
  finding.** Two accepted records do describe different shapes, but the
  ADR's status line resolves which binds a build today: *"the target model,
  not yet a schema"*. ADR 0011 is the schema until the stage that changes
  nesting supersedes it, and the ADR says that stage does. C2 above.
- **D6 (the date) — confirmed, two conventions meeting, no finding.** The
  commit's author and committer dates are 2026-11-16 00:06:57 +13:00, which
  is 2026-11-15 11:06 UTC; the correction it quotes is dated 2026-11-16 in New
  Zealand time. Same instant, two clocks, and the ADR labels its own date
  "(UTC)". The repo's `CLAUDE.md` already documents the twelve-hour split.
- **D7 (attributions) — confirmed, covered in lens 2.** Decision 4's ruling
  is his words (*"they wll need multiple stypes…"*, recorded in `520/040`,
  carried into `520/010`); decision 7's is `470/050`'s ruling quoted whole;
  *Rejected*'s citation of `520/010`'s option 3 is the item's reasoning, and
  the ADR does not call it his. The one place the record is wider than the
  words is decision 6 (F3). `520/040`'s *"agreed"* to option (b) is an answer
  to options, and the ADR does not cite it as a ruling.
- **D8 (the oracle shares the parser) — damaged in the brief's own re-drive,
  repaired here.** The brief's C6 did compare two reads through the same
  TIFF walk. Act 1 added an independent locator (marker search) and an
  independent rational walk for GPS (step 5 of the log). For the **date**,
  an oracle outside this code: `sips -g creation` (Apple ImageIO decoding
  the HEIC itself, not a transcode) agrees with the reader's wall-clock
  `captured_at` on 21 of 21. `mdls kMDItemContentCreationDate` is not a
  capture-time oracle: it sits 24–38 minutes after the reader's instant on
  19 files and about 3.5 hours on 2, under every clock convention tried —
  consistent with a file-system creation time at export. No `exiftool` is
  installed. C6's standing is unchanged; its evidence is now independent.
- **D9 (only the first extent) — covered by F8.** Measured: a partial dict
  (IFD0 read, no date), not `{}` and not a raise. A date from the wrong
  place was not produced by the two- and three-extent fixtures; it is not
  excluded in general, since a split that lands an IFD offset inside the
  first extent would read whatever bytes sit there.
- **D10 (a misnamed file) — covered by F9.** Both directions are silent
  (measured: `captured: None`, `suggest_verifiedBy: None`).
  `check_provenance.py` then writes a `captured: null` row; the venue reads
  `unbounded` if no other photo dates it and is simply under-evidenced if one
  does. Today no misnamed file sits under `menus/`.
- **D11 (hostile and malformed bytes) — covered by F5, F6, F7.** Crashes do
  surface loudly (uncaught, so the whole run aborts; F6); two inputs loop
  without bound (F5); none allocates without bound (every read is a slice of
  the file; a TIFF header offset is unsigned, so "negative" is huge and
  yields `{}`, measured). No test exists (F7).
- **D12 (mirror sites) — covered by F10, with the rest answered.**
  `check_images.py` and `imagemeta.py` refuse HEIF by allowlist for tracked
  images, which is ADR 0128's rule and is unaffected by a reader existing.
  `products.py` reaches intake photos through `product_bursts.py`, which
  shells out to `intake_exif.py --json` over a directory, and that tool's
  `collect()` admits `.heic`, so the product store already has the reader;
  no `.heic` sits under `ingredients/` today.

**F12 — NOTE (from D1).** Decision 7 / stage 5: add that a private home
Branch lives in the reader's own data and never in `site/data/` (`470/050`'s
ruling; ADR 0155 is the shipped half), so the stage reads as buildable
under `CLAUDE.md` without the citation being followed.

**Tally after act 2: 0 MAJOR · 7 MINOR (F1, F2, F5, F6, F7, F8, F9) · 5 NOTE
(F3, F4, F10, F11, F12).** No act-1 finding changed severity; D8 changed the
evidence under C6, not its answer. The cycle closes with no MAJOR
(`REVIEW.md` § *The lifecycle*); the decisions are the owner's for F1 and
the author's for the rest, and nothing is applied by this pass.

---

## Deferred sibling, folded below the verdict (orchestrator, 2026-11-22T20:44Z)

The text below is the held-back sibling
`2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.deferred.md`, written
by the brief-writing session `980835bb`, copied here verbatim and then
deleted from the tree (`REVIEW.md` rule 1, *Split for the duration, merged
at rest*). It was removed from the reviewer's worktree before the pass
began, held outside the repo, and handed to the reviewer only after act 1
was committed (`d4b6334c` before rebase). The reviewer's answers to its
twelve entries are in *Act 2* above. The fold was done by the off-tier
headless orchestrator (Opus 5.5) started by drain session `eca14b23`,
which formed no finding and changed nothing in the text below.

# Held back — angles for the ADR 0169 and HEIC reader pass

For `2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`. **Open only
after your own findings are durably written in the brief** (`REVIEW.md`
rule 1). Then fold this in below the verdict and delete this file.

Written by the brief-writing session (Claude Opus 5.5, `980835bb`) from the
ADR, the reader's diff, the item and one comparison run. Hypotheses,
unproven; none was driven beyond the brief's re-run lines. Answer each:
confirmed, damaged, or already covered by your finding N.

**ADR 0169**

- **D1 — homes as branches and the absolute rule.** Stage 5 makes Cook at
  Home's private homes Branches, and a branch today carries an address.
  `CLAUDE.md` says no home address of a person, anywhere, absolutely. Does
  the ADR say how a home branch exists without one, or does it set up a
  stage that cannot be built as written?
- **D2 — a sighting is about a person.** "Seen there, when, on whose
  evidence" records who was where and when. Is that personal data under the
  hard constraints, and does it ship (ADR 0047), or belong in `data/` under
  ADR 0046's provenance rule? The ADR is silent.
- **D3 — the invariant against today's data.** "A Provider has at least one
  Branch and at least one Menu." Does every current record satisfy it: the
  recipe collection, an "Anywhere" branch (ADR 0155), a venue with no menu
  yet (the degenerate-state fixtures)? If not, C3 ("every file stays
  valid") and the invariant cannot both hold.
- **D4 — `formerIds` for a venue.** The consequence says folding Rock
  Yard's truck keeps every heart through `formerIds` (ADR 0153). Is that
  mechanism dish-scoped? Hearts on a venue, a branch id (ADR 0103) and
  deep links to the old venue id may have no such path.
- **D5 — "refines" while it contradicts.** ADR 0011 nests branches and
  shares one menu; ADR 0169 rejects exactly that and is accepted. Does
  "refines, neither superseded yet" leave two accepted records that disagree
  about the target, and which one does a session building today follow?
- **D6 — the date.** The ADR is dated 2026-11-15 (UTC) and quotes words
  dated 2026-11-16 (New Zealand time). Is that two conventions meeting, or
  a record that says it was accepted before the correction it quotes?
- **D7 — attributions.** Item 4 says "owner-ruled 2026-11-15" on
  `520/010`; item 7 "ruled 2026-09-08" on `470/050`; *Rejected* cites
  `520/010`'s option 3. Open each: is it the owner's ruling in his words, or
  an answer to options offered, and does the ADR carry it wider than it was
  given?

**The HEIC reader**

- **D8 — the oracle shares the parser.** C6 compared the HEIC read with a
  `sips` JPEG read through the same `_parse_tiff`/`_read_tiff`. If `sips`
  copies the EXIF block, agreement proves only that the box walk found the
  item, never that the dates are read right. Is there an oracle independent
  of this TIFF walk (`mdls`, `exiftool` if installed, Photos)?
- **D9 — only the first extent.** `extents[iid] = ext[0]`: an `Exif` item
  split across extents is read truncated. Does truncation return `{}`, raise,
  or return a partial dict with a date from the wrong place?
- **D10 — a misnamed file.** Dispatch is by suffix. `check_images.py` notes
  intake files whose names lie about their format. A JPEG named `.heic`
  returns `{}` (undated); a HEIC named `.jpg` goes to the JPEG reader. Is
  either silent, and what does `check_provenance.py` conclude from it?
- **D11 — hostile and malformed bytes.** Truncated boxes, `size` 0 or 1 at
  odd places, an `iloc` count larger than the box, a negative or huge TIFF
  header offset. `struct.unpack_from` raises on short buffers: does a crash
  surface loudly in every caller, and can any input loop or allocate
  without bound? Is there any test of this reader at all (none found by the
  brief-writer under `tests/` or `tools/test_*.py`)?
- **D12 — mirror sites.** `tools/strip_exif.py`'s header still says no
  stdlib HEIC reader exists and refuses HEIC by default. Now one exists in a
  sibling tool: is that header stale, and does `check_images.py` or
  `products.py` (which also reads intake photos) need the same reader or the
  same refusal?

---

## Review log (reviewer, verbatim; private while the pass ran, opened at the fold)

Appended verbatim by the orchestrator from the reviewer's working log,
which was then deleted. No token was replaced.

# Review log — faves 530/050 (ADR 0169 + HEIC EXIF reader), cold pass

Reviewer: Fable 5.1. Orchestrator: headless Opus 5.5 per-pass session,
started by drain session eca14b23. Worktree HEAD at start: ba6b86b9.
Log opened 2026-11-22 20:18 UTC. Commands, files, evidence only.

## Step 0 — setup

- Read the brief in full (docs/reviews/2026-11-15-1855-adr-0169-and-heic-
  exif-reader-cold.md, 254 lines). Disclosure: the brief carries C1–C7
  inline, so the reviewer read them before naming its own assumptions
  (the brief says name yours first, then read the list — reading is
  atomic; the file was read whole as the spawn prompt instructed). Own
  assumptions written in step 1 before any subject file was opened.
- Read atelier docs/method/REVIEW.md in full (835 lines).
- `git status --short` in the worktree: only ` D` on the deferred sibling
  (removed by the orchestrator on purpose). Not restored, not read.
- `git merge-base --is-ancestor c42b2cc1 HEAD && … 426abe4e HEAD` → exit 0
  (DELTA-OK). Tree holds both landing commits.
- `coldsweep.py --help` read: --commit prints subject+stat+diff, no body;
  default bar covers docs/sessions, docs/SESSIONS.md, docs/reviews.

## Step 1 — own load-bearing assumptions (named before any subject read)

A (ADR 0169, design):
- A1 The ADR's model is exactly what the owner asked; nothing inferred
  beyond his words (records get stronger than their source).
- A2 "Provider" does not silently collide with the existing branch model
  (locations[], ADR 0103 branch ids, data.js projecting locations[0] to
  the top level) or, if it does, the ADR names the collision.
- A3 The theme's "time dimension" is scoped so history stays in data/
  (ADR 0047: the app ships only what it renders), not in site/data.
- A4 Every stage leaves every existing file valid: today's one-branch
  venue file is the degenerate case, and a provider with zero branches
  or zero menus is unrepresentable, not merely discouraged.
- A5 The ADR carries a `review:` line and sits in the decisions index.
- A6 Privacy at design altitude: a provider may be a natural person (a
  sole trader); the model must not route a person's name/contact into
  site/data; ADR 0046's provenance bound still governs data/.
- A7 ADR 0011 and 0003 are refined, not quietly contradicted.

B (HEIC EXIF reader, tools/intake_exif.py):
- B1 The ISOBMFF walk handles: size==1 (64-bit largesize), size==0 (to
  end), size<8 (must not loop), FullBox version/flags on iinf (v0 16-bit
  count vs v1 32-bit), infe v2/v3 layouts, iloc v0/1/2 with
  offset/length/base_offset/index sizes, extent_count>1, and
  construction_method 1 (idat) / 2 (item ref) — or returns {} for any
  it does not handle.
- B2 The HEIF Exif item payload begins with a 4-byte big-endian
  exif_tiff_header_offset; the reader honours it rather than searching
  for a marker or assuming 0.
- B3 Every offset read is bounds-checked; truncated/malformed/hostile
  input returns {} or a clean error, never a hang, traceback or guess.
- B4 Format is chosen by bytes, not by file name (four intake files are
  known to lie about their format); or describe() handles a misnamed
  file honestly.
- B5 Output shape matches read_jpeg_exif so check_provenance sees one
  shape. For the C6 discrepancy: sips rewrites EXIF on conversion, so
  the reader may be the side that is right; decide from raw bytes.
- B6 check_provenance's before/after for .heic: previously {} → no
  evidence date → "unbounded"; now a date. Confirm by reading the
  consumer, and that no other consumer reads intake_exif.
- B7 There is a test that exercises read_heic_exif on a fixture; the
  commit cited strip_exif --selftest, which may not touch it.
- B8 Nothing prints a coordinate to stdout by default from describe()
  in a way a session transcript would capture (ADR 0115 permits reading
  GPS at intake; ADR 0128 is about tracked images).
- B9 Both TIFF byte orders (II/MM) and both IFD0→ExifIFD→GPSIFD chains
  are followed identically for HEIC and JPEG.

## Step 2 — subject read, body-free

- `coldsweep.py --root <worktree> --commit c42b2cc1 --path <ADR 0169> --path
  site/js/vibes.js --path site/js/filters.js --path site/sw.js --path
  tests/vibes.test.js --path CHANGELOG.md` → subject, stat, diff of 6 files; no
  body. coldsweep reported 5 board-store files left out (not read) and 2
  rule-2 barred files left out.
- `coldsweep.py --commit 426abe4e` → one file, +97 −11, no body.
- `git log --oneline -- tools/intake_exif.py` → 426abe4e is the newest commit
  on the file (brief's "no later commit touches the file" holds at ba6b86b9).
- Read tools/intake_exif.py in full (551 lines) and tools/check_provenance.py
  in full (572 lines); tools/strip_exif.py lines 1–80.
- `grep -rn "intake_exif|read_heic_exif|_parse_tiff|_boxes" tools tests
  .github .githooks` → consumers: check_provenance.py:89 (imports describe),
  product_bursts.py:67 (shells out --json), strip_exif.py:79/376/591
  (cross-checks with read_jpeg_exif ONLY). Nothing calls read_heic_exif,
  _boxes or _parse_tiff outside the file. No test file names intake_exif.
- `grep -c "review:" docs/decisions/*.md` → 0 faves ADRs carry a review line;
  not a repo convention, so A5's review-line half is discharged (the review
  pointer is the board item 530/050). 0169 is in docs/decisions/README.md
  (line 1974); check_decisions.py clean, 168 records.

## Step 3 — re-run lines (worktree code; python3 = 3.14.6, node v24.18.0,
## macOS 26.7.3; /usr/bin/python3 is 3.9.6 and was NOT used for the tools)

- `python3 tools/check_provenance.py --selftest` → OK — 15 passed, exit 0.
- `python3 tools/check_provenance.py` (worktree, no intake) → 23 venues
  against the committed record, 0 refused, 107 recorded, 107 absent, exit 0.
- `python3 tools/check_provenance.py --intake <primary>/intake` (worktree
  code, primary material, read-only) → 23 venues against live intake/, 21
  evidenced, 0 refused, no DRIFT line, fingerprints 107 verified, exit 0.
- `python3 tools/strip_exif.py --selftest` → 31/31 passed, exit 0.
- `python3 tools/check_decisions.py` → clean, 168, exit 0.
- `node --test tests/vibes.test.js` → 14 tests, 14 pass, exit 0.
All six lines reproduce.

## Step 4 — record and intake material (counts only)

- data/intake/menu-sources.json: 107 rows; 19 .heic rows, all 19 dated, all
  19 gps present, across 8 venues (the eight trucks). 0 .png rows.
- Primary intake/, by name suffix vs byte sniff: .heic 21 (all ISOBMFF brand
  heic): 19 under menus/, 2 under recipes/, 0 under ingredients/. .jpeg 385,
  .jpg 2, .pdf 6, .png 4 — of which 2 .png are JPEG by bytes, both under
  ingredients/ (products.py's store, outside menu-sources). No misnamed
  .heic or .jpg.

## Step 5 — C6 re-drive (scratch script c6.py; sips copies in scratch,
## deleted at the end; nothing copied into any tree)

For each of the 21 HEICs: read_heic_exif(h) vs read_jpeg_exif(sips JPEG);
describe() on both; an independent marker-search locator for the TIFF block;
raw GPS rationals read by a separate walk; `mdls -name kMDItemAltitude`.
- box walk located the same TIFF block as the marker search: 21/21.
- ifd0 equal 21; exif equal 21; lat/lng equal 21; refs equal 21; gps_date
  equal 21; describe() core fields (captured, captured_at, device, software,
  lat, lng, pixels) equal 21; all 21 dated.
- gps_time equal 2/21; alt equal 16/21 — reproduces the brief.
- Cause from raw bytes: every HEIC stores GPSTimeStamp seconds with
  denominator 100; every sips JPEG stores denominator 1 (21/21 differ in
  denominator). Altitude denominator differs on 5. So sips re-encodes the
  rationals and drops the fraction; the reader reports the file's own value.
  The reader is the right side. mdls returned no altitude (0/21), so no third
  reader on altitude.

## Step 6 — synthetic and hostile HEIC fixtures (scratch script hostile.py)

Minimal HEIC built from scratch: ftyp + meta(hdlr, pitm, iinf, iloc) + mdat
holding `00000006 Exif\0\0` + a TIFF with IFD0 (Make, ExifIFD ptr) and
ExifIFD (DateTimeOriginal, OffsetTimeOriginal).
- Spec variants → DATE (correct): control; iinf v1 + infe v3; iloc v1 method
  0; iloc v1 base_offset_size 4; iloc v1 index_size 4; iloc v2; offset/length
  size 8; mdat with size==1 largesize; meta as last box with size==0.
- iloc v1 construction_method 1 → EMPTY (documented, honest).
- item id mismatch, tiff header offset beyond payload, offset 0 → EMPTY.
- TWO and THREE extents (spec-valid) → NO-DATE: a dict with ifd0 read and no
  captured — the reader uses ext[0] only. Partial read, not {}.
- Hostile iloc item_count: v0 0xFFFF → DATE in 0.1 s; v2 0x00FFFFFF →
  TIMEOUT at 5 s; v2 0xFFFFFFFF → TIMEOUT at 5 s. extent_count 0xFFFF → fine.
  `take()` never checks the iloc box end `e`, and the loop bound is the
  untrusted 32-bit count.
- Truncations of the control at every byte (265 cuts): struct.error escapes
  at intake_exif.py:114 (12 cuts) and :166 (6 cuts); the rest EMPTY/NO-DATE.
  An empty `iinf` box as the last bytes of the file → IndexError at :210.
- _parse_tiff on 4-byte `MM\0*` → struct.error; IFD entry cut at its offset
  field → struct.error (pre-existing paths, carried by the refactor).
- Random fuzz, 400 mutants (1–8 byte flips), alarm 2 s: EMPTY 286, NO-DATE
  37, WRONG-DATE 23 (the flipped byte was in the date string — the reader
  reports the file's content, correct), DATE 54, 0 exceptions, 0 timeouts,
  worst 0.087 s.
- describe() suffix dispatch: a JPEG named .heic, a HEIC named .jpg and a HEIC
  named .png all → captured None, suggest None (silently undated). The
  repo's tools/lib/imagemeta.py sniff() already decides format by bytes.

## Step 7 — ADR 0169 against its sources (files and lines read)

- Theme 41 README (65 lines): the three owner passages, verbatim; its table
  and items are the author's. 530/020, 030, 040 read as claims.
- 520/010 (85 lines), 520/040 (95), 520/050 (83), 470/050 (182), 370 README
  (349): read whole. C4 checks: 520/040 owner call 1 = the three kinds of
  evidence; call 2 = "Rock Yard Food Truck is a branch of Rock Yard
  Vietnamese Restaurant"; 470/050 = his 2026-09-08 ruling quoted whole;
  520/010 option 3 (a new kind) rejected as the wrong unit — matches the
  ADR's Rejected §2.
- ADR 0011 (82) and 0003 (41) read whole; 0047 lines 1–60; 0153 whole; heads
  of 0023, 0132, 0155, 0146; 0107/0115/0128 by grep for intake/HEIC lines.
- Corpus (scratch corpus.py over site/data/restaurants/): 66 files; kinds:
  65 unset, 1 recipes; 0 without a `menu` key; 10 with `menu: []`, all
  `status: stub` (validate.py:30 STATUSES includes stub; :3213 warns if a
  stub has a menu); 53 without `locations[]`; 10 multi-branch. → F1.
- Heart key: site/js/favourites.js:60–68, `d:${venueId} ${dishId}`; venue
  rename mechanism: site/js/renames.js (RENAMED table, canonicalVenueId,
  migrateRatingKeys), venue-level `formerIds` in validate.py:192; 520/040
  gap-2 option (b) names "formerIds and renames.js". ADR 0169 consequence 1
  cites ADR 0153 only (dish ids). → F2.
- Decision 6 vs the owner's "from a menu" (README line 27) → F3.
- `grep -i "amended by|superseded by|refined by|revised by"` over decisions:
  2 files carry such a header → no back-reference convention; discharged.
- docs/decisions/README.md:1974–1983 index entry read: matches the ADR.
- `grep -n "review:" docs/decisions/*.md` → 0; discharged.

## Step 8 — mirror sites and consumers (B)

- coldsweep `-i heic` over the tree (barred paths excluded; also-excludes
  for 530/050, 530/010, docs/ROADMAP.md): hits in CLAUDE.md:775 (about
  check_images; correct), ADR 0128:21–22, 53 (measurement of the day;
  correct), strip_exif.py:45–46 "No stdlib reader exists" (now false → F10),
  check_images.py / imagemeta.py (refuse HEIF; by design), 520/040:144–150
  (the verification claim → F11), 340/250, 340/310 (counts; untouched).
- .github/workflows/ci.yml:278, 280 run check_provenance.py and its
  selftest; intake is absent in CI so the HEIC path never runs there.
- tests/ and tools/test_*.py: no file names intake_exif → F7.
- tools/lib/imagemeta.py:95–115 sniff(): format by bytes → F9.

## Step 9 — security sub-read (one input, not a finding-former)

- `/security-review` not run: it scans the session's pending diff; this
  worktree's only pending change is the orchestrator's deletion of the
  deferred sibling, and no branch/worktree may be created. Discharged in the
  verdict with these grounds.
- Spawned `review-council:security-reviewer` on Opus (model set explicitly;
  the hook refused an unset model) over scratch copies only:
  scratch/sec/intake_exif.py and scratch/sec/426abe4e.diff (`git diff
  426abe4e^ 426abe4e -- tools/intake_exif.py`, body-free). Read-only tools.
  It returned 10 claims; checked each:
  1 iloc 32-bit count hang — already measured (step 6) → F5.
  2 IFD0 of N entries all 0x8769 pointing at IFD0 → N² entry reads. Fixture:
    N=500 0.40 s, N=1000 1.18 s, N=2000 4.78 s, N=65535 (786 KB payload)
    past a 5 s alarm; extrapolated ~85 min. New with HEIC (JPEG APP1 is
    capped at 64 KB) → added to F5.
  3 size==1 header with <16 bytes left, before meta → struct.error at :180
    (fixture result recorded in this step's next line).
  4 empty iinf/infe/iloc box at EOF → IndexError :210 — measured (step 6).
  5 infe v2 cut before its item id → struct.error at :216 — measured.
  6 TIFF block <8 bytes → struct.error :166 — measured (step 6).
  7 entry cut at offset field → struct.error :114 — measured (step 6).
  8 DateTimeOriginal stored as SHORT → describe() raises TypeError inside
    parse_exif_dt's re.match — measured → added to F6.
  9 multi-extent partial read — measured (step 6) → F8.
  10 two Exif items, last wins — by reading :218–219; not fixtured; NOTE
    only, folded into F8's fix line.
  Its "what holds" list (forward progress of _boxes, slicing never raises,
  value bounds at :115, sub-IFD depth bounded) agrees with the fixtures.
  3 (result): a size==1 box header with 12 bytes left, placed before meta →
    struct.error at :180. Added to F6 with 5 and 8.

## Step 10 — act 1 written

- Verdict appended below a `---` divider in the brief; Status line updated.
- `awk 'length > 79'` over the brief: the only lines over 79 are the
  brief-writer's (3, 52, 57, 87, 213, 218); none of the reviewer's.
- `datescan.py --root <worktree> <brief>` → clean.
- Scratch: sips JPEG copies (21), synthetic fixtures and the two sec copies
  live under the session scratchpad only; deleted at the end of act 2.

## Step 11 — act 2 (sibling released after d4b6334c)

- Read exactly the held copy the orchestrator named (12 entries, D1–D12);
  nothing else opened.
- Further checks run before reconciling:
  - `git log -1 --format='%ai / %ci' c42b2cc1` → 2026-11-16 00:06:57 +1300
    both (D6).
  - D8: for the 21 HEICs, `sips -g creation` (ImageIO, decodes the HEIC in
    place) vs describe()['captured_at'] wall clock → 21/21 equal. `mdls
    -name kMDItemContentCreationDate -raw` vs the reader under naive,
    true-UTC and 60 s-window conventions → 0/21 each; offsets 1457–2290 s
    on 19 files and ~12300–12900 s on 2 — a file-system creation time, not a
    capture-time oracle.
  - D12: tools/product_bursts.py:64–73 shells out to intake_exif.py --json
    over a directory; intake_exif.collect() admits .heic. No grep hit for
    heic in products.py/product_bursts.py themselves.
  - D3: tools/fixture_check.mjs imports tools/lib/fixtures.mjs (built in
    memory); not corpus files.
- Reconcile written below the act-1 verdict in the brief; one new NOTE (F12)
  from D1; tally 0 MAJOR · 7 MINOR · 5 NOTE. Status line updated.
- Scratch deleted: 21 sips JPEG copies, synthetic fixtures, the two sec
  copies, the three scripts and the two text extracts. Nothing was ever
  written into any tree.
