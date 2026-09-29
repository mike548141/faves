# 0141 — No estimate wording on prices or the order total; "~" on the recipe list

**Status:** accepted
**Date:** 2026-09-29
**Amends:** [0125](0125-the-recipe-page-leads-with-a-photo-and-a-stats-panel.md)
§5 — the Cook at Home list row marks an estimated value with "~", not the word
"about". **Does not touch** [0064](0064-an-estimate-carries-its-working-and-never-a-timer.md)
/ [0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md) or
[0135](0135-an-estimated-recipe-stat-is-shown-unmarked.md).

## Decision (the owner's ruling)

Shown every place Faves tells a reader a figure is inferred or estimated, the
owner ruled on four of them, reasoning that *"the reader will naturally assume
that by reading the Faves app"*:

| Surface | Was | Now |
|---|---|---|
| Menu header spend line | `$$ about $16 per person · our estimate` (or `· estimated from the menu`) | `$$ $16 per person` |
| Home card price chip | `$$ ~$16pp`, tip/label "About … — our estimate" / "estimated from N menu prices" | `$$ $16pp`, tip/label "$16 per person" |
| Order sheet | "Estimated total" | "Total" — the caption **"Estimated from our menu — confirm at the till." stays**, by name |
| Cook at Home list row | "Serves about 4 · about 45 min" | "Serves ~4 · ~45 min" |

And: the About dialog states that **Faves is independent and in no way
associated with any of the restaurants listed.**

## What was not ruled on, and so stands

Converted-currency wording ("≈ Prices shown in…", "about what that comes to"),
the "~N min walk/drive" travel hint, the allergen tag tips and the Settings
allergen caveat ("Most we work out ourselves"), and the inferred ingredient
note ("Our suggestion, not the recipe's"). All four were listed to the owner
alongside the ruled ones; he named these four only. A later session reading
this ruling across to them would be widening it — the allergen ones above all,
which are safety wording.

## Consequences

- The curated-versus-derived split in `price.js` (`curated`) is still computed
  and no longer changes any wording. Left in place: it is one field, and a
  reinstated caption would need it.
- The "~" is `aria-hidden`, with a visually-hidden "about " beside it, so a
  screen reader still says "about 4" — "~" alone is spoken as "tilde" or
  skipped depending on the reader's punctuation setting. The painted text is
  exactly the ruled "Serves ~4".
- `recipe_check` §10 asserts both halves: painted `~27 min` with no "about",
  spoken `about 27 min` with no "~".
