## 2026-08-16 11:40 UTC — the filter row, and three collisions that all fired

Owner, on the desktop filter row 15x shipped: *"truly horrible UI, it wastes a
ton of screen space, it makes no sense i.e. not intuitive… There are two clear
groups some filters and some sorting controls. And it should only be the height
of the Open Now button UI element roughly as a row of UI elements."*

Three things landed on `main`: **15z** (the row, [ADR 0062]), **per-branch
details provenance** ([ADR 0063], Theme 19) and **31d** (the WCAG G201
new-window warning). Two were built by subagents in their own worktrees.

### The measurement that made the case, and rebuked the last build

Taken before touching anything, in real headless Chrome:

| | Phone (390 × 844, sheet) | Desktop (960 × 800, inline) |
|---|---|---|
| Chrome above the first card | 212 px — **25.1%** | 511 px — **63.9%** |
| Panel height | behind a button | **284 px** |
| Bands of controls | — | **5** |
| The "Open now" chip beside it | 44 px | 44 px |

🔎 **The desktop build was 2.5× worse than the phone the sheet existed to
rescue.** 15c's whole case was that 50.7% of a phone viewport was chrome; the
desktop half of the fix shipped at 63.9% and nobody measured it. The owner did
not need numbers to see it, which is the point — **the numbers were available at
any moment and were only taken once he complained.**

After: **67 px, one band, at every width ≥ 960 px.** 36.8% chrome.

### The design call, and the one thing left with the owner

A sheet and a toolbar are opposite shapes. A sheet has vertical room and no
context so it labels everything; a toolbar has horizontal room only and its
controls must name themselves. So inline every label and heading goes
**visually hidden** — still naming controls and landmarks for assistive tech —
and the only surviving text is "Sort by" beside a rule. Two groups, one word.

Two controls changed shape, and **neither was asked for**:
- **Service → `<select>`.** Same one-of-three as Area and Cuisine, and as a
  segmented control it cost **256 px of a 928 px row** to say so differently.
- **"Near me" + "Along a route" → one "Sort by" select.** `app.js`'s own comment
  has always called them *"mutually exclusive sort modes"*, which is not what
  two `aria-pressed` toggles mean. The select also names the third state that
  previously existed only as *neither pressed* and could be reached only by
  pressing the pressed one.

🎯 **Left with the owner, deliberately unresolved:** Theme 15c measured the
Service filter returning **81% of the list for "Takeaway" and 79% for
"Dine-in"**. Dropping it frees 160 px and simplifies the row further — but
removing a filter is a product decision, not a layout one, so it was raised
rather than taken. The same restraint the "no harvesting on a hunch" rule asks
for, applied to deletion.

### 🔎 Three defects that only measurement found — all invisible to the CSS

1. **`flex-wrap: wrap` breaks on flex-*basis*, not on shrunk width.** Turning it
   on so the destination bar could take a second line put the resting row
   straight back to 121 px. This row only fits because the selects shrink
   *below* their basis, and a wrapping line never gets that far. Wrap is now
   scoped to `.routing` alone. **"It fits" and "it does not wrap" are different
   questions, and only the second one is the promise.**
2. **A select squeezed to 107 px renders "All cuisi…".** The first cut satisfied
   every width constraint written for it and was unreadable.
3. **The destination bar rendered *on top of* three other controls.** All three
   stayed visible, non-zero-sized and in the DOM. Only `elementFromPoint` sees
   that — the same lesson `to_top_check` paid for, in a new place.

All three are now in `tools/filter_row_check.mjs` (18 → 22 assertions) and
**each was proved by reintroducing the defect.** 🚩 The overlap needed the
*exact* original CSS: a half-reverted version failed only the cheaper of its two
assertions, so one of the pair would have shipped decorative. **When a guard is
proved by breaking the fix, break it the whole way — a partial revert
under-reports.** That is the tenth instance of the decorative-guard shape.

### Concurrency — the day's real lesson, and it is not "use worktrees"

Four sessions ran on this repo at once. Worktrees held. What did not:

1. **Every reserved version number was stale by merge time.** I gave two
   subagents `SHELL .64` and `.65`; `.64` was already on `origin/main` when
   the first one started, and `.66` was consumed while the second worked. All
   three merges hit a `sw.js` conflict and resolved to `.67/.68/.69`.
   🚩 **A reserved version is only valid at the instant it is reserved.** The
   provenance agent caught its own collision *because* it ran
   `check_versions.py --range origin/main..HEAD` rather than trusting the
   reservation. That is the check that works; the reservation is a courtesy.
2. **ADR numbers collided the same way.** I wrote `0061`; a peer landed `0061`
   while I worked. Mine became `0062` at merge and cost nothing — because the
   *other* agent's convention (`DRAFT-<slug>.md`, number allocated at merge,
   index entry in the same commit) is right and mine was not. Adopt the draft
   convention every time.
3. **`git pull --rebase` on a checkout holding merge commits is a trap.** It
   flattened three merges into a rebase, conflicted, and a concurrent `push`
   raced it. Recovered intact (`git rebase --abort`, then verify
   `main..origin/main` is empty **both ways**), but the safe order is: finish
   the merge, verify, push, *then* pull.
4. **A peer corrected me and was right.** I reported "sorting by distance puts
   Cook at Home first with no coordinates" as a `kind` bug. It is
   `ranking.js:153` `pinned: r.kind === "recipes" ? 0 : 1`, a decision shipped
   2026-07-12 and recorded in `ROADMAP-DONE.md`. He checked it in two minutes
   *because the report carried the mechanism and the numbers*, and turned it
   into a better open question than the bug would have been — should the pin
   survive a sort the reader **explicitly asked for**? 🚩 **A peer's measurement
   and a peer's diagnosis are different goods. Send both, label which is
   which.**

### What the subagents were worth

Two `[S]`/`[XS]` items delivered in parallel with the flagship, both with
break-it-to-prove-it evidence I did not have to ask twice for. The brief that
made it work named the **locked files** up front, gave **exact version numbers**,
and demanded the gate output verbatim. The provenance agent also spent its own
judgement well: it flagged the version collision, refused the out-of-scope
per-kind ageing, declined to write this file (a subagent appending to an
append-only log nine sessions share is a near-certain conflict), and fixed a
stale mutation count in `CLAUDE.md` because a stale count is the decorative
guard again.

[ADR 0062]: ../decisions/0062-a-toolbar-is-not-a-sheet-lying-down.md
[ADR 0063]: ../decisions/0063-details-provenance-belongs-to-a-branch.md

---

