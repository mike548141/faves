# Cold pass — ADR 0169 (provider, branch and menu) and the HEIC EXIF reader

**Board:** `docs/roadmap/530-theme-41-provider-branch-and-menu-each-with-a-time-dimension-owner-raised-2026-11-15/050-cold-review-owed-adr-0169-and-the-heic-exif-reader.md`
**Status:** REVIEWED, act 1 — verdict below the divider, 2026-11-22 UTC
(Fable 5.1, under the owner's drain order of 2026-11-23 NZDT). 0 MAJOR, 7
MINOR, 4 NOTE; decisions owed (F1 the owner's, the rest the author's). Act 2
(the deferred sibling's reconcile) pending. Brief written 2026-11-15 1855
UTC (2026-11-16 NZDT).

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
