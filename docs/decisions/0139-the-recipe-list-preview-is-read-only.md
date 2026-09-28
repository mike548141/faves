# 0139 — The recipe list's preview is read-only

**Status:** accepted
**Date:** 2026-09-29
**Supersedes:** [0034] §6's second entry point (the Cook at Home list).

[0034]: 0034-cook-mode-overlay-and-wake-lock.md

## Context

ADR 0034 §6 gave cook mode two ways in: the recipe's own page, and the
"Ingredients & method" preview on the Cook at Home list, *"where people are
when they decide to cook"*. Roadmap 22e step 4 (ADR 0138) then put an ingredient
ⓘ on that preview too, so a note would read on both screens.

The owner, from the live site, 2026-09-29:

- *"In the list of recipes screen when I expand a recipe to show the
  ingredients and method (without going into the recipe page) don't show the
  'Start cooking' button to keep the UX simple."*
- *"When I press on the info tip on an ingredient from the main recipe list
  page — the info tip does not render properly… However I don't think we
  should show info tips on ingredients in the main recipe list page, they
  should still be shown on the recipes dedicated page where there is more
  screen space to use."* His screenshot showed the note's panel opening under
  the two-column ingredient list, clipped by the column beside it.

## Decision

The list's expanded preview shows the ingredients and the method, and nothing
you act on: **no "Start cooking" and no ingredient ⓘ.** The recipe's own page
is the one way into cook mode and the one place an ingredient's note reads.
Its ticks were already page-only (ADR 0067), so the preview is now read-only
throughout.

## Consequences

- The clipped panel is fixed by removal, not repaired: the ⓘ no longer exists
  on the surface that had no room for it.
- A note is still never lost — the recipe page carries every one, and
  `recipe_check` asserts it there.
- `cook_check` §12 now asserts the ABSENCE of both on the list, with the
  control that the preview it opened shows ingredient lines; both assertions
  fail against the pre-change `menu.js` (break-probed 2026-09-29).
- `cookButton`'s `quiet` variant has no caller left. It is kept, not deleted:
  it is one argument, and a second way in is the kind of thing that comes back.
