# Design

## Direction

Warm, appetising, confident. Think a beautifully set table, not a
directory listing. The feel to hit: **"a menu you'd be proud to hand a
guest."** People should *enjoy* opening it.

- **Mood**: warm neutrals with one rich accent (e.g. a deep chilli-red
  or burnt-orange), generous whitespace, big friendly headings.
- **Typography**: system font stack (performance rule), but used with
  intent — strong scale contrast between restaurant names, section
  headings, and dish text. Prices set in tabular numerals, right-aligned.
- **Dark mode**: full support via `prefers-color-scheme` — takeaway
  decisions happen on couches at night.
- **Motion**: subtle and purposeful (section transitions, the picker
  shuffle). Respect `prefers-reduced-motion`.

## Mobile-first rules

- Design at 390 px first; enhance for tablet (grid of cards, two-column
  menus) and desktop. Never a desktop layout squeezed down.
- One-thumb reachable: primary actions in the bottom half; the list
  screen's two controls (`Filters`, `Pick for us`) float bottom-right, no
  bar behind them (owner, 2026-08-16); back/section controls within
  thumb reach on menus.
- Tap targets ≥ 44 px; no hover-dependent affordances.
- `100dvh`-safe layouts; safe-area insets respected (iPhone notch/home
  bar).
- Menu text readable at arm's length: ≥ 16 px body, high contrast.

## Screens

### 1. Home — "Where are we eating?"

- Restaurant cards: name, cuisine chips, area, services (takeaway /
  dine-in), status ("menu coming soon" for stubs).
- **One filter control**: a `Filters (n)` button (floating bottom-right;
  inline in the row above the list from 60rem up — `filter_row_check`)
  opening a sheet that holds every filter, under the one heading **Narrow
  to** (service, area, cuisine, open now, cheap eats). Filters are
  instant, no apply button — the sheet's footer button is a dismiss that
  names the live count. `n` and the dismissible chips beside the result
  count keep an active filter visible while its control is hidden.
  *(Amended 2026-08-16: the bar itself, and this section, used to name
  three controls in the bar. At 390 px they wrapped to two rows and the
  screen was 50.7 % chrome, measured. The bar itself went the same day
  (owner: "I dont like the bar… two floating buttons"), which the
  one-thumb rule above now reflects. Amended again 2026-08-17: the **Sort by**
  group is gone — one ranking, distance inside it, ADR 0068 — so the sheet
  holds filters only. Sorting was never a filter: it reordered the list
  and never shortened it, which is why it needed a heading of its own and
  why nothing is left behind when it goes.)*
- **The location ask** is a dialog that opens *after* the list has
  rendered — never in the sheet, never a pill above the list (the
  `📍 Use my location` pill of ADR 0069 was removed by owner ruling,
  ADR 0083). It explains that the location never leaves the device, offers
  Allow / Not now and a "don't ask me again" tickbox whose promise binds
  both surfaces; declining without ticking demotes the ask to a quiet
  banner. Absent where the permission is already `granted`; where it is
  `denied` neither surface appears, only a status line saying so. A
  permission is not a facet. 🔑 The Allow button is labelled by its
  **action**, not its result — owner ruling: a reader surprised by a
  permission prompt taps Block, and Block is sticky. `geo_check` pins the
  pill's absence and the tickbox's promise.
- **"Pick for us"** button: shuffles through the filtered set with a
  short playful animation, lands on one, offers "again" and "that's the
  one". This is the party trick — make it delightful. It floats
  bottom-right and **tucks away as you scroll down** (owner, 2026-08-16),
  which is what answers the earlier finding that a fixed FAB covered 63 %
  of a venue's heart on the landing screen; a keyboard focus brings it back.

### 2. Menu — one restaurant

- Header: name, cuisine, area, **call button** (`tel:`), website link,
  hours if known, "verified <date>".
- Sticky horizontal section nav (Entrées, Mains…) that tracks scroll.
- Dish rows: name, description, price, tag chips. Allergen tags render
  as warnings (icon + colour + text — never colour alone).
- **Our picks** highlighted at the top ("If it's your first time…").
- Search-as-you-type across the menu for regulars who know the word
  they want ("roti").
- Dietary filter chips (vegetarian, GF…) that dim non-matching dishes
  rather than hiding them (groups share one screen).

### 3. Install/offline

- Installable PWA: proper icons, splash colours, standalone display.
- Offline is invisible: everything just works; a small "offline —
  menus may be stale" note if data fetch fails.

## Accessibility

- WCAG 2.2 AA contrast in both colour schemes.
- Semantic landmarks, real headings, list semantics for menus.
- Focus visible; filter state announced (`aria-pressed`, live region
  for result counts).
- Allergen/dietary information conveyed by text + icon, never colour
  alone.

## Anti-goals

- No stock-photo wallpaper, no carousels, no cookie banners, no
  spinners (data is precached — there's nothing to wait for).
- No cleverness that costs clarity: the menu itself is the hero.
