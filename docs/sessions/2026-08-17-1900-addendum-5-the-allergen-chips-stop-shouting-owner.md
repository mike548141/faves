## 2026-08-17-1900 — addendum 5: the allergen chips stop shouting (owner ruling, mid-close)

**The ruling, from a screenshot** of a dish wearing two identical red warnings
when only one of them was his (`22d`, quoted verbatim on the item): a chip for a
need the reader **has** declared behaves exactly as before; every other chip is
**dulled** — *"Still visible but not so that it stands out as a warning"* — and
an allergen chip additionally **drops the word "Contains"**. Same for the option
tags (DFO, GFO, Vegetarian, Vegan).

🔑 **"Dull, not hide" dissolves 22d's hardest objection rather than answering
it.** *Absence of a declaration is not absence of an allergy* had been the reason
this item could not ship: a reader who never opened Settings, a phone handed
across a table, someone ordering for a friend. Because **nothing leaves the page
or the accessibility tree** — only the visual weight moves — none of them loses
information, so the change needed no escape hatch (22d question 6) and no opt-in
decision. It also settles question 1 by treating the safety class and the
descriptive class the *same* way: relevance turns the volume up, irrelevance
turns it down, and neither disappears.

**Built:** `tagChip` takes the reader's **stored** dietary preference
(`settings.diet.dietary`) alongside `avoid` — deliberately the stored setting and
not the menu's transient filter chips, because the question is what this reader
*needs*, not what they happen to be looking at. `.is-muted` uses `color-mix`
toward the surface rather than new tokens, so it tracks the warn/diet colours in
both schemes instead of drifting from them.

🔑 **The assertion that mattered was the one about what did NOT change.**
`device_check` 20 → 23, and the muted chips are asserted **visible, non-zero-width
and not `aria-hidden`** — a check that only counted the loud chips would pass
just as happily if the quiet ones vanished, and vanishing is the failure this
whole design exists to avoid. Break-proven both directions: removing the muted
class fails 2 assertions and nothing else; leaving "Contains" on a muted chip
fails 2 and nothing else; restored, 23/23.

🎯 **Raised with him, not resolved: the ⚠ glyph is KEPT on a muted chip.** His
ruling enumerates two changes and the glyph is not one of them, so the literal
reading keeps it — but it sits against his stated intent that such a chip should
not *read* as a warning, and ⚠ is the most warning-shaped thing on it. One line
either way. Recorded on `22d` rather than decided.

⏳ **`22d` stays part-done:** questions 3 (declared vs inferred tags), 4 (`DFO` as
an ordering affordance rather than a diet label), 5 (what replaces the space) and
6 (a "show all tags" switch) are untouched. The ruling made them cheaper, not
moot.

