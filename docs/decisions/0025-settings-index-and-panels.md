# 0025 — Settings is an index of rows that drill into panels, not one long scroll

**Status**: accepted • **Date**: 2026-08-08

## Context

The Settings sheet grew a section at a time — distance dials, food preferences,
te reo, profiles, maps app, and most recently "Your data" ([Theme 12a]) — each
one reasonable on its own, all of them stacked into a single scrolling `<dialog>`.
Measured at 390 px (the width CLAUDE.md says to design at first), the sheet's
content was **1578 px tall with 31 controls**, against a sheet that can show
about 790 px.

That is not a tidiness complaint. It has two concrete costs:

1. **The safety-critical part was below the fold.** A screenshot at 390 px shows
   the sheet cut off partway through "Your dietary needs" — the allergen chips,
   both distance dials, the maps app and the reset all sat past the cut, with
   nothing on screen indicating they existed. The allergen list was clamped
   further still, behind a "Show all 8" toggle, so *one* of eight allergens was
   visible by default.
2. **It gets worse on every roadmap item.** Import (12b), the sync claim/code
   (Theme 9 v2), personal tag overrides (Theme 5), hidden recipes (11a) and user
   recipes (11b) all want a home in Settings. Each one adds another slab to the
   same scroll.

## Decision

**An index of topic rows that drill into single-topic panels**, inside the same
`<dialog>` — the pattern every phone's own Settings app uses, so the gesture is
already learnt.

Six rows: Food preferences, Distance, Maps app, Language, Who's using Faves?,
Your data. Ordered safety-first, then how-far, then the rest.

Three details carry most of the value:

- **Each row's subtitle is that setting's current value** — "Gluten free · 3
  allergens flagged", "Hide places past 25 km", "Apple Maps". The state you used
  to have to scroll to read is now legible on the first screen without opening
  anything, and it's inside the `<button>`, so a screen reader announces
  "Food preferences, 3 allergens flagged" as one name. This is what makes the
  index *more* informative than the flat list it replaces, not just shorter.
- **The profile switcher stays on the index**, above the rows, and moves into the
  People panel when that panel opens. Switching who's browsing is one tap because
  it's the context every other setting sits inside — a second person picking up
  the phone must not land in someone else's allergen filter. It hides itself when
  there's only one profile.
- **Reset moved into "Your data"** and now confirms inline, naming the person and
  what goes. On the old 1578 px scroll it was buried at the bottom, which was its
  own accidental safety rail; on a one-screen index a bare reset button would sit
  one stray tap from clearing someone's flagged allergens.

Measured after (390 px): index **552 px, fits one screen**; every panel between
174 px and 441 px, all fitting without scrolling. The "Show all 8" clamp is gone
— all eight allergens are visible at once in their own panel — and with it the
`collapsible()` measure/resize machinery.

## Rejected

- **Accordion sections in one sheet.** Cheapest change, but several open sections
  rebuild the same wall, and expanding one shifts everything below it — the
  scroll-jump is worst on the small screen this is meant to fix.
- **Tabs / a segmented control.** Doesn't survive six topics at 390 px, and the
  roadmap adds more. Horizontal tab strips cap out around four.
- **Scattering settings to where they bite** (food preferences onto the menu
  screen, distance onto the home list). Tempting, and it would shrink Settings to
  nothing, but it leaves no single place to answer "what have I set?" — and the
  allergen preferences are exactly the thing a person wants to audit in one look.
- **Escape stepping back one level instead of closing the sheet.** Built, tested,
  removed. It needs `preventDefault()` on the dialog's `cancel` event, and
  Chrome's close-watcher only honours that while the page holds close-request
  budget from a recent interaction. Measured headless (Chrome 151, real
  `Input.dispatchMouseEvent` clicks, identical timing): six drill-in → Escape
  cycles **stepped back four times and force-closed twice**, in no pattern a user
  could learn. A back gesture that works two times in three is worse than one
  that never pretends to. Escape now means what it means in every other dialog in
  the app; the always-visible `‹` is the back affordance.

## Consequences

- The one `<h2>` is retitled per panel and so **cannot carry `data-i18n`**:
  `translate()` caches an element's English text the first time it sees one and
  would restore that caption for every later panel. `renderTitle()` does its own
  `t()` lookup instead. It also has to run on a microtask, because `app.js`
  registers `initSettingsUI` *before* `initReo`, so at the instant our settings
  subscriber fires, reo still holds the previous language.
- New topic = one entry in the `TOPICS` array (title, panel, summary) plus its
  panel builder. No new scroll for anyone.
- Row titles for the four topics with no reo key stay English and fall through
  safely, as reo.js is designed to do. Worth a pass when the reo review happens
  (Phase 7) — the keys to add are Food preferences, Distance, Maps app, Your data.
- Deleted: `collapsible()`, `.chips-collapsible`, `.chips-toggle`, the
  resize-measure listener, `.settings-group-title`, `.data-section`,
  `.profile-section`, `.settings-actions`.

[Theme 12a]: ../ROADMAP.md
