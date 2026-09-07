# 0095 — An add-on carries both axes: fish is a diet marker AND an allergen

**Status:** accepted
**Date:** 2026-09-07
**Amends:** [0092](0092-an-add-on-option-states-what-it-is.md) — its sweep gains
a second tag on the fish rule · [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md)
— no change to `composeTags`; this record is why none was needed

## Context

`sprig-and-fern-tawa` and `crepes-a-go-go` each offer a **Salmon** add-on. Until
2026-09-07 those options carried exactly one tag, `has-fish` — the **dietary**
marker ADR 0092 introduced so the picker could say *"Salmon is fish, so this is
no longer vegetarian"* instead of *"we can't say"*.

`site/js/addons.js` builds its allergen union off `ALLERGEN_PREFIX =
"contains-"`. `has-fish` is deliberately outside that namespace, so it carried
**nothing** into the warning. A reader who had ticked **Fish** in Settings' avoid
list, on a dish that is fish-free, adding salmon to it, was told nothing.

**Measured in headless Chrome before anything was changed**, on Sprig & Fern
Tawa's *Housemade Waffles* (`contains-gluten`, no dietary claim) with
`contains-fish` flagged in Settings, ticking Salmon:

```
warnHidden:   true          ← the warning line is not on the page at all
warnText:     ""
dishFlagged:  false         ← the row does not light up
datasetTags:  "contains-gluten has-fish"
```

A dish that makes no dietary claim is the configuration where the fault is
naked: with no `v`/`vg` to die, the dietary axis has nothing to say, and the
allergen axis was not wired. On a `v` dish the picker *did* print *"Salmon is
fish, so this is no longer vegetarian"* — a true sentence, spoken by the wrong
axis, which is why nobody had noticed.

`contains-fish` did not cause this and removing it would not fix it: before
2026-09-07 the app had no fish allergen at all, so nothing could have warned.
Landing the allergen made the silence *visible*.

`tools/addon_check.mjs` was green throughout. It is exercised against **Satay**,
a peanut option — and peanuts were always inside the `contains-` namespace. Its
green run was evidence about peanuts and was being read as evidence about
allergens.

## Decision

### 1. The option tagger writes BOTH tags, from two independent rules

`tools/tag_addon_options.py` gains a second rule on the same evidence:

```python
("has-fish",      "names a finfish",                        FINFISH, NOT_FISH),
("contains-fish", "names a finfish, and fish is a declarable
                   allergen in NZ",                          FINFISH, NOT_FISH),
```

**Two rules, not one rule emitting a pair.** Both read the option's own *name*;
neither reads the other's tag. Collapsing them would make the allergen a
consequence of the dietary marker — the thing Theme 5 item `010` and the owner's
ruling both forbid — and would make fish the only allergen in the app that
cannot exist without a dietary claim beside it. Two breakers in
`test_tag_addon_options.py` delete one rule each and assert the other alone no
longer satisfies the cases.

`CONTRADICTED_BY` gains `contains-fish: {v, vg}`, matching what
`tag_allergens.py` already applies to the same tag on a dish, so an option the
venue itself calls vegan is never given a fish allergen by a regex.

### 2. `has-meat` gains nothing, and that is not an oversight

Meat is not an allergen and there is no `contains-meat`; ADR 0092 rejected one,
and this record does not reopen it. The audit was run over the meat rules in the
same pass so it does not have to be run twice.

### 3. One list of finfish for the repo, not two

`FINFISH` is now looked up out of `tag_allergens.py`'s STATED fish rule rather
than retyped. **The two lists had already drifted**: measured 2026-09-07, the
copy in `tag_addon_options.py` carried 13 species where the dish sweep carries
thirty-odd, so `Kingfish`, `Gurnard`, `Eel`, `Barramundi`, `Anchovies` (it had
only `anchovy`) and two dozen more were fish on a dish and not fish on an
add-on. Nothing would ever have reported that — both sweeps were green, and each
was right about its own list. A breaker restores the narrow copy and asserts the
`Kingfish` case fails.

### 4. No change to `site/js`, because the architecture was already there

`composeTags` already unions an option's allergens into the dish's, already
de-duplicates through a `seen` set, already records `added: [{tag, from}]`, and
already intersects dietary claims. `ALLERGEN_LABEL` in `addons-ui.js` already
had a `contains-fish` entry. So the whole reader-facing fix is three tags of
data. **Measured after, same dish, same probe:**

```
warnHidden:   false
warnText:     "Salmon contains fish — you asked to avoid it."
dishFlagged:  true
datasetTags:  "contains-gluten has-fish contains-fish"
```

### 5. What a reader sees — the four questions the owner's ruling raised

The owner ruled *"the UX impact needs to be considered and properly designed…
We don't want a flood of noisy tags on the menu, especially if two tags are
telling the reader the same thing"*. Each question was answered against the
running page, not against a reading of the code, and the first answer changed
the shape of the other three.

- **(a) Does `has-fish` reach the dish's chip row after composition?**
  **No — nothing does.** The chip row is built once from `item.tags` in
  `menu.js` `renderDish` and is never rebuilt. The `onCompose` callback rewrites
  `li.dataset.tags` and toggles `dish-flagged`; it appends no chips. So the
  feared raw `has-fish` chip **does not render**, and the "flood of noisy tags
  on the menu" cannot happen by this route at all. Verified before and after:
  the waffles row shows `["⚠ gluten"]` in both states.
- **(b) When an allergen is added BY an option, does the chip say so?**
  There is no post-composition chip to say it on. `added`'s `{tag, from}` is
  already consumed by the **warning line**, which is the right home — it is
  `role="status"`, so it is announced when it changes, and it names the option:
  *"Salmon contains fish — you asked to avoid it."*
- **(c) The Subway/kebab case — the row that gains FOUR allergens.**
  The warning already scales the right way: flagged allergens first, one line
  each, then unflagged ones stated plainly, then the facts that killed a claim,
  then **one** collapsed absence sentence (ADR 0092). The cap makes the worst
  case bounded — Wellington Kebab Grill's board is `max: 3`. No new surface was
  added, so nothing new grows with the selection.
- **(d) What if the dish already declares the allergen?**
  Nothing extra, and `seen` is what guarantees it. Pinned by a unit test rather
  than left to the reader of the code, because it is an absence.

## Alternatives rejected

- **Derive `contains-fish` from `has-fish` in `addons.js`.** Smaller, touches no
  data, and makes one axis mean the other — forbidden by item `010`, and
  silently wrong for any future dietary marker that is not an allergen.
- **Run `tag_allergens.py`'s whole rule set over option names**, which is the
  literal reading of *"an add-on should have its own allergen and dietary tags
  the same way a dish does"*. **Measured before rejecting**: 8 candidates, of
  which 2 are real wins (`Hummus` → sesame, `Chocolate or Nutella` → nuts), 3
  are the fish this record lands, and **3 are the venue's own gluten HEDGE** —
  `"No gluten added bun"` → `contains-gluten`, on three records. Tagging the
  gluten-free alternative as containing gluten is the one direction a safety
  sweep may never move, and `tag_addon_options.py` already REVIEWS those names
  rather than touching them. The narrowing needed is a design question with a
  known trap (an item-level veto would lose a real allergen standing beside a
  hedge), so it is filed with the measurement rather than improvised here.
- **Hand-add the two missed allergens to the data.** It closes the two in the
  corpus as at 2026-09-07 and rebuilds the same gap on the next venue with a
  hummus extra, which is the mechanism-versus-count trap the roadmap item itself
  names.
- **Widen the fish rule to `tag_allergens.py`'s DERIVED fish rules** —
  Worcestershire, dashi, surimi, sashimi, ceviche, fish sauce. Defensible and
  not taken: `has-fish` reads *"Worcestershire is fish"* in the picker, which is
  true enough to be safe and odd enough to want a look first. Only the STATED
  species rule is shared.

## Consequences

- **3 tags across 2 venues** (`sprig-and-fern-tawa` ×2, `crepes-a-go-go` ×1).
  Option coverage 103/200 (51%). `DATA_VERSION` moves; `SHELL_VERSION` does
  **not**, because no file under `site/` outside `data/` changed.
- `validate.py`'s `check_add_on_option_tags` now warns for a missing
  `contains-fish` too, so a new venue with a salmon extra cannot quietly
  reintroduce the silence.
- `addon_check.mjs` gains a fish block and its first **absence** assertion: no
  chip on a configured row may be a raw internal identifier. It refuses to run
  against a row with no chips, which would compare `[]` to `[]` and pass with
  the chip row deleted.
- Two defects were **found and filed, not fixed here**, both pre-existing and
  both measured: the picker says the same clause twice when an allergen both
  warns and kills a claim (*"Halloumi contains dairy — you asked to avoid it.
  Halloumi contains dairy, so this is no longer vegan."*, shipped since ADR
  0048), and the chip row keeps showing `Veg` on a dish the warning has just
  said is no longer vegetarian.
