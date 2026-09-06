# 0088 — The menu filters focus the list; search offers them, never becomes them

**Status**: accepted • **Date**: 2026-09-06

## Context

The owner asked for two things on the menu screen, in his own words:

> *"I want a way that when I'm looking at a menu for a restaurant I can easily
> filter it down to favourite dishes, or filter out dishes I'm allergic to /
> don't meet my dietary requirements."*

and, having proposed a control row beside the section jump-nav, immediately
proposed something better:

> *"Perhaps better than adding more buttons or UI elements is building this
> capability into the search function that is atop of the menu list."*

Three things had to be settled before any of it could be built.

### 1. What a filter is allowed to make disappear

`docs/DESIGN.md:83` had specified the dietary chips as *"dim non-matching dishes
rather than hiding them (groups share one screen)"*, and `menu.js` carried the
asymmetry as a stated design fact — *search hides, dietary dims*. The owner
ruled against it on 2026-09-06:

> *"It's not about hiding dishes as much as it is about allowing the user to
> focus on the types of dishes they are interested in. So if I type favourites
> in the search then I want to see all the dishes I marked as favourites in that
> menu, not all the others. Similar deal for things like finding all the
> vegetarian dishes."*

### 2. The confusion that cost a session time, recorded so it is not repeated

This work was initially put to the owner as being in tension with **ROADMAP
22d**, which he had ruled on three weeks earlier as *"dull, never hide"*. He
rejected the framing, and he was right:

> *"You are confusing different asks… The feature about dimming things like
> dietary or allergen tags on a dish was about reducing the noise on a page."*

**22d is about which TAG CHIPS SHOUT ON A DISH — a noise problem. This ADR is
about WHICH DISH ROWS ARE IN THE LIST — a finding problem.** One governs the
noise on a row, the other governs which rows exist. Neither constrains the
other, and reading 22d as a bar on row filtering nearly stopped a feature it has
nothing to say about.

### 3. Whether an allergen may filter

It may not, and the owner drew that line himself in the same ruling:

> *"If one of those dishes that still show when filtered has an allergen then
> that allergen should still show against the dish the same as it does now
> without the filter."*

Roughly three-quarters of `contains-*` tags are **our inference** rather than
the venue's statement (ADR 0025). A list shortened on an allergen would read as
*"what remains is safe"* — a claim this app has no basis for, and the one
direction of error that hurts somebody.

## Decision

**A filter removes rows. Favourites is one of them. Allergens are not.**

1. `site/js/dish-filters.js` owns one predicate. The chip row gains a leading
   **♥ Favourites**, and the dietary chips now **hide** a non-matching dish
   instead of dimming it. Filters AND together — each chip narrows.
2. **The narrowing is loud.** A persistent `Showing 12 of 47 dishes · Show all`
   line appears whenever anything is withheld, as `role="status"` so a screen
   reader hears the count change. This is what answers *"groups share one
   screen"*: the person handed the phone is one tap from the whole menu, and a
   filter that is on is never invisible (ADR 0052).
3. **A surviving row renders its allergen chips exactly as it does unfiltered.**
   There is deliberately no filter key for an allergen, and `dish-filters.js`
   has no code path that could produce one.
4. **Availability is honest.** A diet chip appears only when a dish on this menu
   carries a qualifying tag; ♥ Favourites appears only when this reader has
   hearted a dish *here*. A control that can only return nothing is not offered.
5. **Search SUGGESTS a filter; it never becomes one.** Typing "veg" offers the
   Vegetarian chip as an autocomplete row, and choosing it presses the real chip
   — so the state lands where it is visible rather than hidden inside a word in
   a text field. The text search is untouched underneath.
6. **Filtering reads the venue's claim (`baseTags`), never the reader's
   configuration.** A dish configured out of an active filter by an add-on
   **dims**; it does not vanish under the finger that just changed it.

## Consequences

**The keyword-as-command reading was rejected on corpus evidence, not taste.**
Seven dishes in this corpus have "Vegetarian" in their printed name — R & S
Satay Noodle House has three, KK Malaysian four. Under a command reading,
typing "vegetarian" stops finding any of them and the reader has no way to ask
for the other meaning. `tools/focus_check.mjs` asserts both halves against those
real rows, so the shortcut fails against real data rather than a fixture.

**This reconciles two ADRs that pull opposite ways.** ADR 0050 says a property
question must be answered by a filter, not free text; ROADMAP 22a says search
should be able to offer an action as a result kind. A suggestion that *routes to
the filter* satisfies both.

**It cost the layout-stability assumption.** `ui-state.js` noted that *"the
re-rendered menu is normally the same height (search hides and the dietary dim
don't change layout)"*. That is no longer true, and the scroll clamp now runs
against a menu that genuinely changes height.

**Two pre-existing bugs surfaced while building it, both found by the new
guard**, and both recorded here because neither would have been found by looking
for it:

- **ADR 0048 §3 was documented and never wired.** A dish configured out of a
  dietary filter was required to *"dim with the rest of them, not linger looking
  like a match"*. The add-on callback rewrote `dataset.tags` and stopped;
  nothing re-ran the view. `addon_check` never saw it (it turns no filter on)
  and `device_check` never saw it (it configures no dish). `focus_check` is the
  first check to do both at once.
- **`closePicks` parked focus on `section.nextElementSibling`**, which the new —
  and normally `hidden` — count line silently became. `.focus()` on a hidden
  element is a no-op, so focus fell to `<body>`: the exact failure that handoff
  exists to prevent, reintroduced from three hundred lines away by a change
  nowhere near it. `picks_check` caught it; it now skips hidden siblings.

**A trap worth knowing for anything added to this screen.** `dishAddOns` calls
its own `refresh()` once at construction, so any hook passed into `renderDish`
fires *during* the section loop — before a `const` declared after it has
initialised. Two rounds of debugging and one venue rendering nothing at all went
into learning that. Everything `applyView` touches is now declared above the
loop, with a comment saying why.

**Not covered by any guard, and stated rather than implied:** the keyboard path
through a real screen reader, and Safari/WebKit entirely.

## Alternatives rejected

- **A control row beside the section jump-nav** (the owner's first idea, which
  he withdrew himself). Two measured reasons to keep it out: `--toolbar-h` is
  cached once on a documented *"single search + one-row nav"* assumption and
  drives every deep-link scroll offset, and Theme 29 measured the order pill
  already owning **82.5%** of a dietary chip's tap at large text. A new control
  in that band inherits both.
- **Sorting favourites to the top instead of filtering.** No reversal, no empty
  sections — but on KK Malaysian's 48 dishes you still scroll the whole menu,
  and reordering a list under the reader has its own disorientation cost.
- **Allergen-based removal.** Ruled out above, by the owner, on the day.
