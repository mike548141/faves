# 0065 — a `kind` declares what it can do

**Status**: accepted • **Date**: 2026-08-16

## Context

[0003](0003-recipes-as-kind-not-separate-type.md) chose one record shape for
everything the app holds, discriminated by `kind`, and said the venue-only
fields **relax** for a recipe collection: `area`/`city`/`address` may be null,
`services` empty, no contact or order card. That relaxation was never written
anywhere the code could read. It lived as **~40 `kind === "recipes"`
conditionals** across eight modules, plus a boolean threaded through
`renderDish(item, isRecipes, …)`.

The cost is not style. Every screen started from "restaurant" and reasoned its
way to "not that", which is why the owner could feel the seam
(ROADMAP Theme 36) even though nothing on screen was wrong. And a missing
capability was only ever expressed as the *absence* of a branch, so nothing
could be asked about it — a ranking that sorts by distance had no way to check
whether the thing it was ranking has a location at all.

Owner ruling, 2026-08-16: declare a capability set per kind.

## Decision

`site/js/kinds.js` holds one row per `kind` — `venue` (the default; 54 of our
55 records omit the field) and `recipes` — carrying:

- **eleven capabilities**: `hasLocation`, `hasHours`, `hasPrices`, `canOrder`,
  `canReport`, `hasFreshness`, `inFacets`, `pinnedFirst`, `hasContactCard`,
  `itemsHaveRecipeFields`, `itemPage`. The first four are the owner's own
  wording; the rest were read off live call sites, and none was added without
  one.
- **the words a kind supplies for itself** — icon, chip, card and row class
  modifiers, item noun, browse label, tagline, stub chip, empty-menu note,
  search placeholder. Naming a thing does need to know what it is; what it does
  not need is a `kind === "recipes"` at each of the dozen places that wants a
  noun.

Accessors are `kindOf` / `labelsOf` / `kindId`, all total — an absent or
unrecognised `kind` resolves to `venue`, because a typo in the data should cost
a venue rendered as a venue, never a blank screen.

This **implements 0003; it does not supersede it.** 0003's Rejected list
already covers the alternatives, and the scattered conditionals simply *are*
its "venue-only fields relax" written the long way. Behaviour is unchanged:
the rendered DOM of the home list, the Cook at Home menu and two venue menus is
**byte-identical** before and after, captured from headless Chrome.

`renderDish` loses its `isRecipes` parameter outright. The record was already
an argument and already carried the kind, so the boolean was a second copy of a
fact that could disagree with the first.

## Rejected

- **A superseding ADR.** The recommendation the owner accepted is 0003's own
  consequence, so superseding it would retire a record whose reasoning still
  stands and invite the rejected options back.
- **Capabilities only, labels left as conditionals.** Twelve of the ~40 sites
  are wording. Leaving them means the next `kind` is still a day's work across
  eight files, which is most of the benefit gone.
- **Folding `hasPrices` into `canOrder`.** They are false together today, so
  one flag would have fitted. The owner ruled (2026-08-16, on `currency`) that
  *"a recipe may in the future include the total cost to make that dish"* — the
  day that ships, prices flip and ordering must not. A merged flag would have
  had to be split under time pressure by whoever built it.
- **Deriving a capability from the data** (e.g. "has hours" = `hours != null`).
  Tempting, and wrong in the direction that hurts: 10 of our 22 branches carry
  no hours ([0054](0054-the-branch-offered-first-is-the-nearest-open-one.md)),
  and a venue we simply have not recorded hours for is not a venue *without*
  hours. Absent data and an absent capability are different facts, and 0054
  already paid for confusing "unknown" with "no".
- **One `isRecipe` accessor replacing all forty.** That is the same identity
  question with a shorter name.

## Consequences

The next `kind` costs one row here and nothing at the call sites. `"recipes"`
as a literal now appears in exactly one module.

**One identity survivor, deliberately**: `isRecipeKind()`. Favourites, ratings
and shared shortlists each **store** an `isRecipe` flag —
`share-codec` encodes it as `r: 0|1` inside URLs already in people's messages —
and read it back to pick 🏠 over 🍽️ for a row whose record may not be loaded,
or may no longer exist. It cannot be re-derived at read time, so it cannot
become a capability lookup. Its doc comment says so, and says not to reach for
it to answer a capability question.

**It makes a standing tension askable, which was the point.** `rankVenues`
sorts on `pinnedFirst` as its first key in *every* mode, including "Nearest
first" — which the owner ruled (2026-07-23) is pure distance. So the one record
answering `hasLocation: false` leads the distance sort. That pinning is a
deliberate decision, not a defect, and the refactor preserves it exactly. What
changes is that the two facts now sit side by side as declared properties, so
the question "should something with no location lead a distance sort?" can be
put to the owner from the table rather than reverse-engineered from the absence
of a branch.

`site/js/kinds.js` joins `sw.js`'s `SHELL` precache list — caught by
`tests/sw-versioning.test.js`, which exists because `js/dietary.js` shipped
without it and broke menu screens in flight mode.
