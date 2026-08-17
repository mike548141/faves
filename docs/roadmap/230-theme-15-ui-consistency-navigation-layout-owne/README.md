# Theme 15 — UI consistency, navigation & layout (owner-raised 2026-08-09)

✅ **`.order-head` collision — fixed 2026-08-09.** Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
✅ **"Your data" panel split — fixed 2026-08-09.** Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

**a. Settings: alternatives to drill-in** ✅ **RULED 2026-08-16 — keep the
drill-in.** Owner asked the question and answered it: the index-of-rows into
single-topic panels stays. No accordion, no collapsing sections. Worth keeping
the reasoning: the sheet never changes size that way, which is the geometry that
caused the ⓘ flicker (ADR 0059), and every row already shows its current value
as a subtitle. The text below is the original brief, retained so the alternative
is not re-proposed. ~~`[M][design]` ⚑~~ — **owner, raw:**
*"With the new Settings UI I am considering alternative options to a sub-menu
design but I like the grouping/headings you have used. Perhaps accordion or
collapsing sections to make it easier."* The grouping stays either way; this is
about the *navigation*, not the taxonomy.

🚩 **Read [ADR 0025](../../decisions/0025-settings-index-and-panels.md) before
proposing anything** — "accordion sections in one sheet" is its **first rejected
alternative**, on measured grounds: several open sections rebuild the same
1578 px wall, and expanding one shifts everything below it, so the scroll-jump
lands hardest on the 390 px screen the redesign existed to fix. Reopening it is
the owner's call, but a rebuild must answer that, and if built it **supersedes
ADR 0025** (never edit an accepted one).

The shape most likely to satisfy both: keep the index exactly as it is —
including each row's **current-value subtitle**, which is what makes one screen
answer *"what have I set?"* — but have a row **expand in place with only one open
at a time**, auto-collapsing the others. That kills the wall and bounds the
scroll-jump while dropping the drill-in gesture. 🎯 **Owner call first:** the
drill-in only landed 2026-08-08 and its 390 px real-phone look is **still owed**
(it's the same pending eyeball as Theme 12a). Judge the current build on the
phone before commissioning a replacement for it.

✅ **b. One noun for one thing — shipped 2026-08-09**
([ADR 0035](../../decisions/0035-one-noun-place-and-branch.md), wt:
`faves-one-noun`). Two nouns and only two: **place** for a venue as the reader
sees it (the owner's steer, and the only candidate that isn't false for *Cook at
Home* — your own kitchen is a place, not a venue), **branch** for one location
of a place that has several. *venue*, *restaurant* and *spot* retired from
user-facing copy. The trap was resolved, not papered over: each dial now names
its own subject — "Hide **places** further than" over "Show **a place's**
branches within" — so two different jobs stop reading as one. 18 strings across
11 files; the reo lockstep held (one keyed string moved, and *wharekai* —
specifically an eating-house — would have desynced the moment the English
stopped saying "restaurants"). 🎯 **Two judgement calls the owner may want to
overrule, and one pre-existing flaw found:** detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

**c. Home screen: one place for filters** — ✅ **MEASURED AND BUILT 2026-08-16.**
The owner re-raised it from his own iPhone (*"On the iPhone its pretty bad"*),
so it was **measured in real headless Chrome** rather than reasoned about, and
then built on his ruling. What the measurement changed:

| At 390 × 844 | Before | After the redesign |
|---|---|---|
| Chrome above the first result | **50.7%** | see the build's own figures |
| …arriving via a facet link (`?cuisine=`) | **58.4%** | |
| Result cards fully visible | **3** | |
| Fixed bar, at every scroll depth, forever | 122.2 px = **14.5%** | |

At 1280 × 800 it is 36.1% — **one design, not two**: both rows wrap below 34rem,
same cause. 15c's own `--bar-h: 7.6rem` claim was confirmed exactly (122.2 px),
as was "six places" (exactly six).

🔎 **Two live defects fell out of the measurement, neither of them a design
question.** `.segmented button` was `min-height: 40px` — a standing breach of
CLAUDE.md's 44 px hard constraint, and fixing it *pushes `--bar-h` higher*,
which is its own argument for the redesign. And "Pick for us" covered
**48 × 30.3 px of a venue's heart — 63% of a 48 px control, unreachable**.

🔎 **The redundancy finding, which no amount of layout work would have found.**
The service segmented control returns **38 of 47 places for "Takeaway" (81%)**
and **37 of 47 for "Dine-in" (79%)**; 60% of places offer both. It removes a
fifth of the list — and it is the *sole* reason `--bar-h` was 7.6rem rather than
4.6rem (`.segmented { flex: 1 1 100% }`), costing **54.4 px of permanently fixed
screen**. The same argument was already accepted on 2026-08-16 when "Dine-in,
Takeaway" was dropped from every card (`app.js:45-49`). Also: two of the four
chips (Near me, Along a route) are **sort modes, not filters** (ADR 0014), sitting
in an undifferentiated row — which is why the sheet separates "Narrow to" from
"Sort by".

**Thumb reach — the trade 15c said would decide it, answered with evidence.**
The bar cost 14.5% of the viewport at every scroll depth across a 7.5-viewport
document, to save *one tap* on `to-top.js`, which already ships. Reach is bought
by having a control down there, not by 122 px of it: a 44 px entry in a 66 px bar
keeps 100% of the reach for 54% of the pixels. It stays a **bar, not a FAB** —
`main`'s padding reserves a bar's space, and the FAB overlap above is measured
proof of what a fourth floating control does.

**Original ask, for the record — owner, raw:**
*"I am considering moving the bottom section of the main page that filters
Everywhere vs takeaway vs dine-in, location/suburb, and cuisine to sit with the
other filters like Open now, cheap eats etc."*

The split is real and hard to justify to a first-timer. Today's home screen
filters live in **two places**: the sticky bottom `.filter-bar` (service
segmented control + Area + Cuisine selects) and the in-flow `.list-toggles`
row above the results (Open now · Cheap eats · Near me · Along a route). Same
job, two locations, and nothing on screen explains the division.

Three things the merge has to answer — the third is the one that will decide it:

- **Mixed control types.** The toggles are `aria-pressed` buttons; Area and
  Cuisine are `<select>`s. Dropping a dropdown into a chip row looks like a
  mistake unless they converge — either the selects become chip-style menus, or
  the chips move into the bar. Nine controls at 390 px is also, precisely, the
  wall the Settings redesign (`0025-settings-index-and-panels`) hit; a wrapping
  chip row handles it, a fixed bar does not.
- **`--bar-h` is load-bearing.** The bottom bar's height is referenced in six
  places — `main`'s bottom padding, the "Pick for us" FAB, back-to-top, the
  order bar. Removing the bar isn't a delete; it's re-anchoring everything that
  sits above it. **Points in the owner's favour:** at the narrowest widths
  `--bar-h` is **7.6rem** (the bar wraps to two rows), so it's eating a real
  slice of a 390 px screen for three controls.
- 🚩 **Thumb reach is what the bottom bar buys, and the merge spends it.** The
  bar is reachable at any scroll depth; `.list-toggles` sits above the results
  and scrolls away, so post-merge you'd scroll back to the top to change
  cuisine. That's the whole trade. Two ways to keep it: make the merged group
  **sticky** under the search field, or keep a slim bottom bar that collapses to
  a single **"Filters (2)"** button opening a sheet — thumb-reachable, one
  control, and it scales as filters keep being added (the same lesson the Settings
  redesign
  learnt about growth). Recommend deciding *this* first; the visual merge is
  easy once it's settled.

Low-risk otherwise: the selects are JS-populated so the no-JS fallback is
unaffected; watch the landmark change (`<nav aria-label="Filter restaurants">`
disappears) and keep the filters adjacent to the `role="status"` result count,
which is a genuine a11y gain — change a filter, hear the new count.

✅ **15x — The desktop filter row — SHIPPED 2026-08-16** (`f619722`), after
being asked for twice and living only in a session log's "owed" list. One
`#filter-controls` section now **moves** between the sheet and an inline host —
a DOM move, so state and listeners survive and there is never a second copy.
🔎 **The breakpoint lives in JS only.** A CSS media query carrying a second copy
of the number could disagree with the move, and that failure mode is a row
styled as an inline panel while it is actually inside a *closed* dialog.
🚩 **The quirk that bit was not the predicted one.** Focus surviving the
narrow→wide re-parent worked first time — Chrome kept it on `#filter-area`
across a `close()` and a re-parent. The hard case is going wide with the sheet
**open**: everything outside an open modal `<dialog>` is inert, so it must close
first — but `close()` parks focus on the very button the move then hides. Capture
`activeElement` **before** the close, restore **after** the hiding. Breaking that
one line fails two assertions in `tools/filter_row_check.mjs`.
⚠️ **Residual, not fixed:** on wide screens `<nav aria-label="Filter places">`
now holds only "Pick for us" and the order pill, so its label is slightly off.

> ✅ **15y — the ⓘ disclosure is click-only** (2026-08-16). It failed WCAG 2.2
> SC 1.4.13 on its hover path; the owner accepted the recommendation to delete
> the reveal rather than patch it. [ADR 0059]; record, and why its regression
> guard is a source test rather than a headless one →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **15z — the desktop filter row IS a row** (2026-08-16, `58432eb`,
> [ADR 0062]). Owner, raw, on seeing 15x shipped: *"truly horrible UI, it wastes
> a ton of screen space, it makes no sense i.e. not intuitive… There are two
> clear groups some filters and some sorting controls. And it should only be the
> height of the Open Now button UI element roughly as a row of UI elements."*
> 15x had moved the sheet's controls inline and kept the **sheet's** vertical
> stacking. Measured before touching it: **284 px in five bands** beside a 44 px
> chip, and **63.9% of a 960 × 800 viewport was chrome before the first card —
> against 25.1% on the phone the sheet was written for.** Now **67 px in one
> band** at every width from 960 px up; 36.8% chrome. Service became a
> `<select>` and the two location toggles became one "Sort by" select — both are
> one-of-N choices that were not shaped like one — and no capability was
> dropped. Three defects only measurement found, the guards that now catch each
> (`filter_row_check` 18 → 22, every new one proved to fail on the reintroduced
> defect), and the rejected alternatives → [ADR 0062].
> ✅ **Both open questions ruled by the owner, 2026-08-16, at the close of the
> session that built it. Recorded so neither is re-proposed:**
> 1. 🎯 **The Service filter stays exactly as it is.** He was shown Theme 15c's
>    own measurement — it returns **81% of the list for "Takeaway" and 79% for
>    "Dine-in"**, so it barely narrows anything — and was offered *drop it*
>    (freeing 160 px of a 928 px row), *keep it*, or *sheet-only*. **He kept
>    it.** Do not re-open this on the "it barely filters" argument; that argument
>    has been made, with numbers, and declined. The 160 px is spent deliberately.
> 2. 🎯 **Both control-shape changes stand**, and he was told plainly that
>    neither was asked for: Service segmented → `<select>`, and the two location
>    toggles → one "Sort by" `<select>`. Offered the revert of either and took
>    neither.

[ADR 0062]: decisions/0062-a-toolbar-is-not-a-sheet-lying-down.md

[ADR 0059]: decisions/0059-the-info-disclosure-is-click-only.md
