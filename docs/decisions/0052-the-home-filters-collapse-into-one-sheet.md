# 0052 — the home screen's filters collapse into one sheet

**Status:** accepted
**Date:** 2026-08-16

## Context

The owner, of the home screen on his iPhone: *"there is too much filter/sort
stuff on the screen… We need something for a better UX that is both feature
rich and simple to use without flooding the screen with UI selectors."*
`ROADMAP.md` Theme 15c had already asked for the same merge on 2026-08-09 and
left the deciding trade open. Nobody had measured it.

Measured in headless Chrome via CDP at 390 × 844, CSS pixels, `deviceScaleFactor
1`, on a fresh profile, after `app-ready`:

| | before | |
|---|---:|---|
| Top chrome (header, search, count, four chips) | 305.7 px | |
| Fixed bottom bar (service toggle + two selects, wrapped to two rows) | 122.2 px | 14.5 % of the viewport at **every** scroll depth |
| **Total chrome** | **427.9 px** | **50.7 %** |
| …arriving from a menu's facet link (`?cuisine=…`) | 492.7 px | **58.4 %** |
| Cards fully visible | **3**, or **2** in the facet state | |

Three further findings, all measured rather than argued:

1. **`.segmented button` was `min-height: 40px`** at every viewport — a straight
   breach of the repo's ≥ 44 px rule, invisible to an audit that only looked at
   the chips.
2. **The "Pick for us" FAB covered a venue's ♥.** In the facet state it overlapped
   KC Cafe's heart by 48 × 30.3 px — 63 % of a 48 px control, with `z-index: 11`
   above the card. The owner had seen this and reported it.
3. **Two of the four "filter chips" are not filters.** "Near me" and "Along a
   route" are sort modes (ADR 0014 says so explicitly), sitting in an
   undifferentiated row with two real filters, with nothing on screen saying so.

## Decision

Keep the sticky bottom bar `DESIGN.md` mandates, and collapse its contents into
**one control**: a `Filters (n)` button opening a bottom sheet that reuses
`.order-sheet` + `dialog.js` — a fourth consumer of a pattern that already
ships, not a new one. Inside, the controls are grouped and labelled for the
first time: **Narrow to** (service, area, cuisine, open now, cheap eats) and
**Sort by** (near me, along a route, plus the route destination). "Pick for us"
moves off the FAB and into the bar. `.segmented button` goes to 44 px.

**The rule this design is built on: a filter that is on is never invisible.**
Hiding a control is fine; hiding the fact that it is narrowing the list is not.
Three redundant tells, all reading the same `activeFilters(state)` in
`filters.js` so they cannot drift: the badge on the button, the dismissible
chips beside the count (ADR 0050's escape, generalised from two filters to all
five), and the count itself.

The bar keeps a **fixed** shape and never tucks on scroll. `main`'s
`padding-bottom` reserves a bar's band; nothing reserves a FAB's, which is why
the FAB could cover a heart and the bar cannot cover anything the reader cannot
scroll to.

Measured after, same harness, same viewports:

| | before | after |
|---|---:|---:|
| Total chrome, 390 px, no filter | 427.9 (50.7 %) | **269.4 (31.9 %)** |
| Total chrome, 390 px, one facet | 492.7 (58.4 %) | **291.0 (34.5 %)** |
| Bottom bar | 122.2 | **69.8** |
| Cards fully visible, 390 px | 3 / 2 | **4 / 4** |
| Hearts covered by a floating control | 1 (48 × 30.3 px) | **0** |
| Controls under 44 px | 3 | **0** |

## Rejected

- **A sticky horizontal chip rail replacing the bar** (best sustained figure:
  44 px of permanent chrome vs 66). It needs the two `<select>`s rebuilt as
  hand-rolled popovers over 48 areas and ~30 cuisines — replacing something that
  today is native, accessible, translated by the OS and bug-free with the place
  the accessibility bugs would be. It does not fix the FAB overlap, and a
  seven-plus chip rail at 390 px is what ADR 0025 already measured giving out
  (*"horizontal tab strips cap out around four"*). It also deletes the sticky
  bottom bar `DESIGN.md:23` mandates, which is the owner's call, not a session's.
- **An in-flow summary that expands in place** (`Malaysian · Open now · 6 of 48 ▾`).
  Best raw pixel figure of the three — and it is the accordion ADR 0025
  deliberately rejected, rebuilt from the `collapsible()` helper that ADR
  deliberately deleted. It also deletes the sticky bar.
- **All three land on the same 4 cards.** Card pitch is 130.4 px and a 5th needs
  636 px of content band, which none of the three reaches. The extra pixels the
  other two save buy nothing a reader can see; this one buys the heart defect
  fixed and adds no new interaction primitive.
- **Deleting the service filter**, which returns 38 of 47 and 37 of 47 places —
  the worst pixels-per-discrimination on the screen. The owner's standing rule is
  hide, never delete, and someone who genuinely wants takeaway-only wants it. It
  is simply the first thing that belongs behind a disclosure.
- **A second chip row** when several filters are on. Two chips measure 98.4 px
  and three 152.8 — the toggles row returning in a different colour, and the
  saving evaporating in exactly the heavily-filtered state. The row is capped at
  one chip on a phone (three at ≥ 34rem) with the tail folded into a `+n more`
  button that opens the sheet. `activeFilters` orders cuisine and area first so
  an *arriving* facet — the ADR 0050 case, where the reader pressed nothing on
  this screen — is never the one folded away.
- **A single summary chip** (`3 filters ✕`) instead of per-filter chips. Cleaner,
  but it weakens ADR 0050's per-facet escape, and 0050 is explicit that leaving
  the reader without a per-facet way out is the thing to avoid.
- **Building the sheet lazily**, the way Settings and About do. `filtersFromQuery`
  must set the selects before anything is opened, and `boot_check.mjs` reads
  `#filter-cuisine`'s value with no dialog open. The markup is in `index.html`
  and lives in the DOM from first paint.
- **Making the bar tuck on scroll.** A 70 px bar does not need to, and
  `.is-tucked` is a known bug class: it was only ever cleared by a scroll event,
  so leaving search could restore a control still translated off-screen.

## Consequences

- **`DESIGN.md` is amended in the same commit** — its Home section named the
  three controls the bar used to hold. The sticky-bottom-bar rule at `:23` is
  unchanged and still honoured; that is why this option won over the two that
  saved more pixels.
- **`--bar-h` re-anchors**, from `7.6rem`/`4.6rem` (phone/wide) to a single
  `4.4rem`. Five rules read it and pick the new value up unchanged: `main`'s
  `padding-bottom`, `.order-fab`, `.to-top`, `.toast`, `.update-notice`. The
  sixth, `.pick-fab`, is gone. `.to-top` also drops the extra `3.6rem` it carried
  to clear the FAB that used to sit above it.
- **The chrome saving is larger in the state the reader most often lands in** —
  the facet arrival — which is the opposite of how these things usually go.
- **Discoverability is the honest risk.** A first-timer may never find "Cheap
  eats". There is no telemetry in this app and there should not be, so this
  cannot be measured; it is the reason the badge, the chips and the group
  headings are all there, and the reason to ask the owner after he has lived
  with it.
- **Theme 22b's proposed 8th filter** (favourites as a filter, not a
  destination) now costs 0 px of chrome instead of another row.
- **Not verified:** Safari iOS. Everything above is Chrome headless on macOS,
  where `env(safe-area-inset-bottom)` resolves to 0; a real iPhone adds ~34 px,
  so these figures are the optimistic ones — before *and* after alike.
