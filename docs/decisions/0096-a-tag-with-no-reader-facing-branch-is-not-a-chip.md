# 0096 — A tag with no reader-facing branch is not a chip

**Status:** accepted
**Date:** 2026-09-07
**Amends:** [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) — its
composed tags now reach a fourth surface, the chip row ·
[0092](0092-an-add-on-option-states-what-it-is.md) — its `has-meat`/`has-fish`
vocabulary is given a permanent answer on the menu screen ·
[0095](0095-an-add-on-carries-both-axes.md) — its §5(a) finding ("nothing
composed reaches the chip row") is what this record ends

## Context

The owner ruled twice on this surface on 2026-09-07, and the second ruling
created the precondition the first one had made hypothetical.

**Roadmap `200/060`: the chip row goes stale.** `menu.js` `renderDish` built the
chip row **once**, from `item.tags`. The `onCompose` callback rewrote
`li.dataset.tags` and toggled `dish-flagged`, and appended no chips. So on Sprig
& Fern Tawa's *Potato, Rosemary + Basil Pesto* (`["v", "gf-option",
"contains-nuts"]`) with **Salmon** ticked, one row carried two meanings of "this
dish" at once — measured in headless Chrome at 390 px:

```
chips        ["⚠ nuts", "Veg", "GF option"]     ← the dish AS LISTED
dataset.tags "contains-nuts has-fish contains-fish"  ← the dish AS CONFIGURED
dish-flagged true                                    ← as configured
warning      "…Salmon is fish, so this is no longer vegetarian…"
```

A green `Veg` chip beside a sentence saying it is not vegetarian. **Ruled:
update the chips live.** Greying the dead claims, and leaving them, were both
declined.

**And that ruling is what makes `tagChip`'s bare fallback reachable.** Its last
line is `return el("span", { className: "tag", textContent: t })` — the raw tag,
unlabelled. Nothing composed had ever reached it, so nothing had ever hit that
line with an option's vocabulary in it. `has-meat` and `has-fish` are exactly
that vocabulary: not `contains-`-prefixed (so not allergens), not `spicy-*`, and
not in `DIETARY`. The moment the chip row is recomposed they paint on a menu row
as their own internal identifiers.

🔑 **An earlier session reported this raw-chip defect as already shipping and
was wrong** — it read `tagChip` without reading its callers, and ADR 0095 §5(a)
corrected it by measurement. So the question is not "fix an existing bug" but
"do not create one", and it had to be answered **before** the re-render was
wired rather than after.

## Decision

**The chip row renders only tags that have a reader-facing branch.** One
predicate, `isChipTag(t) = isAllergen(t) || isSpicy(t) || t in DIETARY`, applied
inside `tagOrder` so the initial paint and every recomposition go through the
same filter and cannot diverge. `has-meat` and `has-fish` are therefore never
chips, on a dish or on a configuration.

Three independent reasons, any one of which would be enough:

1. **The schema already forbids them there.** `validate.py`'s
   `OPTION_ONLY_TAGS` makes `has-meat`/`has-fish` an **error on a dish** —
   naming the reason in its own comment: *"`tagChip` in menu.js has no entry for
   them, so on a dish they would render as a bare, unexplained chip."* The chip
   row describes a dish. Rendering an option-only word there puts a term on the
   one surface the schema exists to keep it off.
2. **For fish it is literally two chips saying one thing.** ADR 0095 §1 has the
   tagger write `has-fish` **and** `contains-fish` on the same option from two
   independent rules, so on the shipped corpus they always travel together. A
   `has-fish` chip would sit beside `⚠ fish` — the owner's own words when he
   ruled on `110/040`: *"We don't want a flood of noisy tags on the menu,
   especially if two tags are telling the reader the same thing."*
3. **The fact is already on the row twice.** `has-meat` has no `contains-meat`
   beside it (ADR 0092 rejected one), so reason 2 does not cover it — but the
   row already says it in two other places, and both got **louder** on the same
   day: the `Veg` chip it killed now **disappears** (`200/060`), and the warning
   line names it in words — *"Bacon is meat, so this is no longer vegetarian."*
   A third statement is the flood, not the fix.

**The failure mode this accepts, stated plainly:** a *future* vocabulary word
with no `tagChip` branch is silently dropped from the row rather than painted
raw. That is the safe direction — the composition model can only ever add an
allergen or remove a claim, and a dropped word is never an allergen (allergens
are `contains-`-prefixed and all nine have branches) — but it is still a
silence. It is bounded by `addon_check.mjs`, which asserts **both** halves on a
real configured row: no chip is a raw identifier, **and** the chips that should
be there are present, before and after configuring, and restored on untick.

## Rejected

- **Label them — `Meat` / `Fish` chips.** The literal reading of "one surface,
  one truth", and the option costed as `[S]` on the item. It loses on all three
  reasons above and hardest on the second: it manufactures the exact duplicate
  pair the owner named, on every fish option in the corpus. It would also make
  the menu chip row the fifth allergen-ish table in the app to carry a
  vocabulary (ADR 0092 counted four and refused to add one for this reason).
- **Leave the bare fallback and let them paint raw.** Not seriously available —
  it is the defect the item was filed to prevent — but recorded because it is
  what happens by *inaction*, which is the only way it could ship. Break-probed:
  removing the filter fails exactly the two `addon_check` assertions that guard
  it and moves nothing else (35 passed, 2 failed).
- **Grey the dead claim chips instead of removing them** (item `200/060` option
  2), reusing the established dull-never-hide pattern. Declined by the owner.
  Noted here because it is the plausible alternative a future session will
  re-propose from the muted-chip rule in `tagChip`'s own docblock — and the
  distinction is that dulling is about *whose* need a chip serves, while this is
  about a claim that is no longer **true** of what the reader configured.
- **Say what the chip row means** (option 3) — leave the chips and let the
  warning carry the configured truth. Declined; it leaves `dish-flagged`
  disagreeing with the chips on the same element.

## Consequences

- `site/js/menu.js`: `tagOrder` filters through `isChipTag`; `renderDish` builds
  the container **unconditionally** (a dish with no tags can *gain* one by
  configuration — satay on a plain kebab — and there must be somewhere to put
  it) and repaints it from `onCompose`. `.dish-tags:empty { display: none }` in
  `app.css` keeps an untagged, unconfigured row laid out exactly as before.
- **Flicker**: the repaint compares the composed tag list with the painted one
  and returns early when it has not moved, so the common tap — a free sauce that
  carries no tags — touches no DOM at all. When it has moved, `replaceChildren`
  swaps the row in one paint.
- `SHELL_VERSION` moves; `DATA_VERSION` does not — no file under `site/data/`
  changed. Nothing in `site/data/` needs to change for either ruling.
- **Reo/i18n is untouched, deliberately.** `reo.js`'s SAFETY BOUNDARY excludes
  allergen and dietary chips and the picker's warning line from translation, so
  the correct action here is to add no keys.
- `addon_check.mjs` grows from 25 to 37 assertions and its raw-identifier
  absence assertion — added by ADR 0095 against a row nothing composed onto —
  becomes load-bearing for the first time.
