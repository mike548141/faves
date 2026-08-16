# 0082 — `vibe` is a closed vocabulary with facets, and every value is rendered

**Status:** Accepted, on four owner rulings taken 2026-08-16. Closes the two
questions [ADR 0077](0077-style-of-dining-is-not-the-cuisine-axis-work.md) left
open; 0077's own finding is unchanged and is **not** superseded.

**Date:** 2026-08-16

## Context

ROADMAP 37k recorded an owner idea — *"Another useful filter might be style of
dining/food e.g. silver service vs quick eats"* — and ADR 0077 cleared its
blocking question (style is not Theme 30's cuisine axis) while deliberately
deciding nothing else. It left two questions for the owner and put the strongest
case **against** building at all:

- His own relayed ruling (*"dining style folds into `vibe`"*) contradicted the
  item, because `vibe` is free text and free text cannot be filtered.
- **`priceBand`, the app's only comparable curated-judgement field, is filled on
  8 of 55 venues.** Fields that need somebody's opinion do not get filled here.
  A filter over 8 of 55 hides places for no stated reason.
- A fourth filter control re-opens the inline-row width constraint ROADMAP 15z
  spent real effort closing.

**He was shown all of it and ruled to build it.** 🔑 The 8-of-55 objection is
answered by removing its premise rather than by disputing the number: the field
is not waiting on curation-in-general, it is waiting on **him** — the same
footing CLAUDE.md already puts menu content on (*"whatever food/dishes I give
you are to be included"*). That is a different and much better-evidenced bet
than `priceBand` ever was.

**Two of his four rulings were broader than the questions asked**, and both
broadenings are the substance of this record.

## Decision

**1. `vibe` becomes a closed vocabulary — ALL of it, not a style subset.**

Asked whether to validate just the style values, he ruled: validate the whole
field. The corpus had already proved why. `vibe` shipped with **no vocabulary
check at all** while `priceBand` had one, and it grew **five separate strings
for one idea** — `quick`, `quick-eats`, `quick-lunch`, `grab-and-go`,
`counter-order` — across six venues, plus three conventions in one array
(`craft beer`, `quick-lunch`, `Wellington icon`). Closing only the style half
would have left the other 21 taggings free to drift identically.

**2. Every value declares a FACET.**

| facet | what it answers | filterable |
|---|---|---|
| `style` | how the meal happens | ✅ the filter reads this and only this |
| `amenity` | what the place has or does | ✗ |
| `character` | what it is known for | ✗ |

🚩 **The `amenity` facet exists to stop the style vocabulary swallowing things
that are not styles.** `dog friendly`, `byo`, `quiz night`, `craft beer` are
**21 of the corpus's 38 taggings** and no other field holds them. A style
vocabulary that absorbed them would be lying about what it means; deleting them
to keep the vocabulary tidy would destroy the only record of them. So they are
kept, and named as what they are.

**3. The vocabulary is stated ONCE, in `site/js/vibes.js`, and `validate.py`
reads that file.** A Python copy beside a JavaScript copy is two things that can
disagree, and the disagreement would be silent. Precedent: `check_versions.py`
already parses constants out of `site/sw.js`. The parse **fails loudly if it
extracts zero keys** — a regex that silently matches nothing would make the gate
decorative, which is [ADR 0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)
exactly.

**4. Key and label are different things.** The stored value is a kebab-case key;
the reader sees a label. The old corpus mixed both roles in one string, which is
what a vocabulary is for: keys are what a URL, a filter and a validator handle.

**5. The chips are RENDERED on the home cards.**

`ARCHITECTURE.md` has specified this since the original schema — *"free-form
chips shown on cards"* — and the code was **never written**: `grep -rn "vibe"
site/js site/*.html site/css` returned **zero hits**. So `vibe` has been
precached to every phone rendering nothing, an inherited breach of
[ADR 0047](0047-the-app-ships-only-what-it-renders.md)'s *"name the screen that
renders it"*.

🔑 **This is a built-vs-never-runs case, not an abandoned field, and the
distinction decided the outcome.** Deleting `vibe` would have satisfied ADR 0047
in the cheapest possible way and destroyed 38 taggings across 20 venues. The
design had been ratified into the architecture doc and only the render was
missing. Asked to choose, he took the full render — including its day-one cost.

## Consequences

**The migration, and what was dropped.** 23 raw strings → 17 vocabulary keys.
Four speed words collapse to `quick-eats`; nine are convention-only respellings.
🔎 **`counter-order` was NOT folded in with the speed words** — it names *how you
order*, not how fast, and a counter-ordered pub meal is not quick eats. That is
precisely the distinction a style filter exists to make.

**Three values were dropped, and each was verified per venue rather than
assumed** — ADR 0075's rule that a duplication claim is a measurement, not a
reading:

| venue | dropped `vibe` | already in its `cuisine` |
|---|---|---|
| `charley-noble` | `steakhouse` | `["Grill", "Steakhouse", "Seafood"]` |
| `regal-chinese-restaurant` | `yum cha` | `["Chinese", "Yum cha", "Cantonese"]` |
| `burgerfuel` | `burgers-done-properly` | `["Burgers"]` |

No fact is lost, and `vibe` stops competing with `cuisine` to answer the same
question. `FORMER_VIBES` retains every superseded string — it is the only
statement of what a retired tag meant, and a reader meeting `quick-lunch` in an
old share URL or a screenshot has nowhere else to look.

**⚠️ The cost he accepted by choosing to render.** The five inconsistent "quick"
strings become **visible on a card**, so normalising the corpus is part of this
work rather than a follow-up. That is why the migration and the render land
together.

**🚩 New friction, stated so nobody is surprised by it.** A new vibe value must
be added to the vocabulary *before* it can be used, or `validate.py` refuses the
record. That is the point of the gate and it is also a real cost — the same one
`priceBand` already carries. An intake session that meets a genuinely new
characteristic has to stop and extend the vocabulary deliberately.

**What is still owed and is his alone.** The tagging itself. 20 of 55 venues
carry any `vibe`; **35 carry none**, and under CLAUDE.md's standing rule those
are filled only as he supplies them — never inferred from a menu, a photo or a
website's tone. A style value is a judgement, and 0077's argument that it is
unfalsifiable from what we hold is **not** refuted by this record; it is
answered by making him the source, which is the only honest way to hold it.

**ADR 0077 stands.** Style is still not Theme 30's cuisine axis, and `service`
still meant three things — separately ruled, 2026-08-16: it is renamed to
`order-mode` everywhere, including the shipped filter.
