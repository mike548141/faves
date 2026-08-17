# Theme 20 — Places from anywhere (owner-raised 2026-08-16)

Owner's intent, stated 2026-08-16: the collection is **not** scoped to
Wellington, or to New Zealand. A place loved anywhere in the world may be added.

✅ **The framing is fixed — 2026-08-16** (ADR 0042). Title, install name, About
lede, share text and the te reo subtitle name no city; README and CONTRIBUTING
follow. Venue data keeps its real areas and addresses.

What the rename exposed is below. All three are **correct for the venues held
as at 2026-08-16 and silently wrong for the first one outside NZ** — the failure
mode is a confident wrong answer, not a blank. Each is marked at the source
(`#!####` / `#!###`).

✅ **Three items ticked 2026-08-16 by a staleness audit** — all three were
fully delivered as side effects of other work and nobody ticked the box.
**Venue timezone** (ADR 0043): per-branch/per-venue IANA resolution, `nowIn(tz)`
/`todayIn(tz)`, `viewerOnVenueTime`, the zone named on screen, validated at both
levels — residue is data, not code, since all 55 records are in New Zealand.
**Currency is NZD by construction**: `currency` is now *required* on every
non-recipe record and About no longer claims a site currency; the second half —
"the bands stop being global" — was **answered by ruling, not built**, since ADR
0045 chose one NZD calibration reached by conversion. **Seasons assume the
southern hemisphere**: `venueHemisphere()` derives it from latitude and
`data.js` passes it on every load. Detail, and the honest residue in each →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **FIXED 2026-08-16 (wt: faves-cook)** — `sync_check.mjs` reaches its own
> `OK — 16 passed, 0 failed` again, five consecutive green runs, and three
> deliberately re-broken selectors each named the step they broke. **Nothing in
> `site/js/` was changed to achieve it.** Three things it taught, all of which
> outlive the fix:
> - 🛑 **The "real person could hit this" hazard is RETIRED — it was the
>   check's own bug, twice over.** The overflow-menu race did not reproduce
>   once the selector was fixed. Both causes were in the tool: `window.scrollTo(0, 0)`
>   (the two-argument form) obeys `app.css`'s `html { scroll-behavior: smooth }`
>   and returned mid-animation — which fully explains the old trace's mystery
>   reading of *"scrollY:879 immediately after scrollTo(0,0), then scrollY:0 on
>   the next read"*: **one unfinished scroll, not a second scroller.** And
>   scrolling to the top makes `initContactBar()`'s IntersectionObserver drop
>   `body.contact-bar-open` a frame later, moving the layout between
>   `d.click()`'s rect read and its mouse dispatch — the click landed on
>   `#menu-page`, 39 ms apart, while a programmatic `.click()` on the same
>   button worked instantly. **The button was fine; the coordinates went stale
>   under it.** `waitQuiet()` is now wired and shown to change the outcome
>   (9 passes → 16). ⚠️ **Honest residue:** the old trace's third observation —
>   `aria-expanded` reporting two open/close cycles from one click — never
>   reproduced. Unexplained, not disproved.
>   ✅ **Narrowed 2026-08-17 (second look, re-verified green: `OK — 16 passed,
>   0 failed`).** Still not reproduced, but it now has **nowhere to live in the
>   shipped app**: one activation cannot move `aria-expanded` twice, because
>   `overflow-ui.js`'s `setOpen()` returns early on `open === isOpen()`, so two
>   cycles need **two click listeners** on the button — and there is exactly one
>   binding, reachable exactly once per page (one entry module each, one
>   `initOverflowMenu()` call each, no re-init path). The mechanism the original
>   diagnosis named is specifically ruled out: `menu.js`'s `reapply()` is a
>   settings *subscriber* that re-renders dishes and never re-runs
>   `initChrome()`, and `sync-ui.js`'s `render()` rebuilds only its own panel.
>   🔑 **"Unexplained" and "a hazard" are not the same claim** — an unreproduced
>   reading with no possible mechanism is a tooling question, not a product one.
> - 🔎 **A second dead assertion, found while fixing the first.** The landing
>   check `!!document.querySelector(".sync-body")` would have passed **on the
>   index screen**: `sync-ui.js` builds that node once at construction and the
>   panel only un-hides it. It now requires a laid-out box. A guard that passes
>   before you have navigated anywhere is not checking navigation.
> - 🔑 **Why it stayed dead for a whole refactor:** see the CLAUDE.md note added
>   with this fix — **CI runs none of the browser checks.** Nothing was calling
>   it. Every Settings selector now lives in one `NAV` block so the next
>   refactor breaks one line loudly.
> Detail in the tool's own header and → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Shipped 2026-08-17 (`ecbc82e`)** — **a killed browser check no longer
leaks its Chrome.** `tools/lib/browser.mjs` reaps its registered children and
their profile directories on `exit`/`SIGINT`/`SIGTERM`/`uncaughtException`, and
sweeps unheld `faves-*-check-*` profiles from `$TMPDIR` on first launch. 🛑
`SIGKILL` still orphans both and always will, which is what the sweep is for.
🔑 The bigger half was never abnormal exit: three checks never removed their
profile dir on the **happy** path — 178 of the 189 measured that morning. And a
CDP transport timeout now aborts as a harness error with exit 2 instead of
printing `FAIL <assertion>` with exit 1. Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **OWNER RULING 2026-08-16 — FIVE parallel sessions stay. Recommendation
> overruled, deliberately.** A session proposed cutting to **three**, each given
> a *file territory* rather than a roadmap item, on the evidence that the fifth
> session was producing coordination overhead rather than throughput: a ready,
> owner-ruled item (36a) was declined purely for file contention; two sessions
> spent messages negotiating `SHELL_VERSION` ranges; and **twice, one session's
> entirely correct action hard-blocked every other session's commits**.
> **He heard all of that and kept five**, judging the raw parallel output worth
> the per-session friction. That is his call and it is now the operating model —
> do not re-propose the cut without new evidence.
> 🔑 **So the job is to make five work, not to argue about five.** The mechanisms
> that demonstrably paid for themselves on the day, and should be treated as
> standing practice rather than good manners:
> - **Broadcast your FILE SET on open, not just your roadmap claim.** A claim
>   does not say which files. This surfaced `cook.js`/`cook-ui.js` double-held by
>   two sessions who did not know about each other, and it was a *third* session
>   noticing two answers to one broadcast that found it.
> - **Announce version RANGES out loud and re-verify after every rebase.** Never
>   take "deployed + 1" — a rebase does not conflict on a version constant, it
>   **absorbs** it, leaving CI green and installed phones on the old shell.
> - **Ask peers what the owner has ruled at their end.** Rulings do not cross by
>   themselves; three arrived that way today.
> - 🚩 **Announce a change that makes the repo's GATES stricter** the way a
>   `SHELL_VERSION` is announced. Two of the day's four repo-wide stops came from
>   correct changes whose blast radius was everyone else's ability to commit.
> - **One worktree per agent**, or forbid `git add -A` in the brief — disjoint
>   *file ownership* does not make a shared worktree safe, because `git add -A`
>   is not file-scoped. That cost 101 lines of misattributed work today.

> ✅ **Closed 2026-08-16** — whole-repo scanner runs inflated by live worktrees.
> **Stale, and re-measured with five worktrees live**: `leakscan .` clean (not
> 101-and-blocked), `plainscan .` 652 with no doubling. Worktrees moved to
> `~/worktrees/`, outside the tree, so `.` no longer holds a second checkout —
> the item's premise was a *neighbouring repo's convention*, and it moved.
> Bare sweeps are safe here again. 🚩 Returns if a worktree is ever taken inside
> the tree; upstream atelier E9 stays valid and untouched. Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Two accepted ADRs both numbered 0025 — ruled 2026-08-15.**
`0025-settings-index-and-panels.md` (2026-08-08) and
`0025-infer-allergens-by-default.md` (2026-08-09) are unrelated decisions
sharing one number, with 24 inbound references. **Owner ruled: both stay.**
Renumbering would rewrite an accepted record's identity and break every inbound
reference plus any external link, on a public repo — dearer than the oddity.
Delivered: a disambiguating note in each file's header, the rule in
[`decisions/README.md`](../../decisions/README.md) that a number is allocated **at
merge, never in a worktree**, and `0025` recorded as permanently ambiguous —
**cite an ADR by file path, never by bare number.**
🔎 **The root cause was not the number, it was the index.** The allergen record
had **never been added to the index** in `decisions/README.md` — the one place a
duplicate number is visible. That entry now exists, and the README carries the
rule that earned it: *add the index entry in the same commit as the record; an
unindexed ADR is invisible to the next person allocating a number.*

✅ **`pathscan` is decorative here — closed 2026-08-15.** Ran from 25 standing
warn-only findings to a **clean scan**. Our two classes were fixed 2026-08-09;
the third was an upstream defect, queued as atelier Track E item E8 under the
queue-never-deliver rule and fixed upstream in `atelier@ab74014`. Re-verified
here today: 16 findings → 0. 🔎 **Our stated root cause was wrong** — we named
the dot-directory, upstream found the hyphen — and the write-up carries why a
repro built from a single failing shape confirms the shape, not the cause.
Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
✅ **`plainscan` — scope and both sub-calls ruled, 2026-08-15.** Arrived
2026-08-09 with **1177** findings and no decided scope; **302 today**. The scope
question was answered twice over and independently: the owner ruled it here on
2026-08-09 ("live docs only, exempt the records"), and atelier ruled the same
way upstream on 2026-08-10 (`atelier@e390382`). Ours is the wider net, also
exempting `docs/reviews/` and `CHANGELOG.md`; both apply, both kept.
- ✅ **Accepted ADRs exempted (owner ruled 2026-08-15).** They carried the
  largest single block of findings, and "never edit an accepted one" means not
  one could ever be fixed — the exact definition upstream used to exempt
  records, and the exact way `pathscan` went decorative here. **The cost is
  stated, not hidden:** new ADRs are no longer checked at commit time, which is
  a real fail-open. Accepted because the **reply plane is untouched and has no
  scoping** — every reply an agent writes is scanned, including the prose that
  becomes a new ADR. The check moves to where the fix is possible.
  🔎 **The obvious glob was the wrong one.** `docs/decisions` exempts the whole
  directory including `README.md` — but that file is the live *index*, rewritten
  every time a record lands, so its prose *can* be fixed and the ruling's
  reasoning does not cover it. The glob is `docs/decisions/0*.md`: the numbered
  records only. Measured difference: 266 with the loose glob, **302** with the
  correct one. The looser number would have looked better and been wrong.
- ✅ **The P3 word limit: left alone, nothing swept (owner ruled 2026-08-15).**
  The 35-word sentence cap is the single largest rule, and atelier's own
  docstring calls it "a house call, not a published standard" and "the one
  number in this file the principal should rule on". Sweeping the P3+P4
  findings would be a mass rewrite of the live docs against a threshold nobody
  has ratified, with real risk of flattening meaning for no reader gain. The
  docs are dense because the subject is. **P3/P4 stay advisory.**
- ✅ **`docs/GLOSSARY.md` written 2026-08-15** — `plainscan`'s designed escape
  for P2, which this repo had never used. **P2 96 → 8**, no prose rewritten. It
  earns its place independently of the scanner: the repo is public and a
  stranger meets "PWA", "CDN" and "SBOM" cold in `ARCHITECTURE.md`. Two findings
  kept: a glossary **cannot** fix P1 (`_load_glossary` feeds only the acronym
  check; P1 needs a definition inside the same document), and **`D1` is a trap**
  — it sits beside `S3`, `R2` and `WGS84` and reads like Cloudflare D1, but
  every occurrence is `atelier D1`, a doctrine citation.
The residue is **302 advisory findings, all in live rewritable prose**, none of
them the unfixable class. That is a scanner whose output can still be read.

✅ **Shipped 2026-08-17 (`ecbc82e`)** — **a passing browser check now says which
tree it ran in.** All ten checks print a second indented line naming the served
tree, its `SHELL_VERSION` and its `branch@sha`; the `OK — N passed, N failed`
first line is byte-identical, so every existing grep still works. The item's own
premise — that `tools/lib/browser.mjs` owns the summary — was **false**, all ten
hand-rolled their own tail, so the fix made the premise true rather than working
around it. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Done** — **"Open now"** live status + filter (2026-07-08, ADR 0006);
**shareable group shortlist links** (2026-07-10, ADR 0009); the **te reo Māori**
UI toggle first pass (2026-07-09, `reo.js` — chrome only; safety text stays
English); and the pre-launch reo **wording review** (✅ ran 2026-07-22 — an AI
pass over all 68 strings). ⚠ **honest caveat:** the AI pass is **not** a
fluent-speaker sign-off — a native review of the 9 flagged strings stays the
**owner option** before public launch
([review](../../reviews/2026-07-22-1148-reo-wording-review.md)). Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md). **2026-08-09 additions to that review
queue:** ~25 new `// draft` strings landed with the update notice, units,
report and import/transfer features (all flagged in `reo.js`); the dictionary
check flagged two existing choices worth a fluent speaker's eye — **`tahua
kai`** for "menu" in 7 pre-existing strings (Te Aka suggests `rārangi kai`;
`tahua` leans "fund/budget") and **`hapa`** for "error" (first gloss is the
loanword "supper" — unfortunate on a food app, though context resolves it).

---
