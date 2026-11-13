## 2026-09-24-0952 — worker `section-name` (session `3e87e0bf`): a heading is evidence the writer may read and may not use

Roadmap `470/060`, owner-ruled 2026-09-24: **option (3), both halves, data
first.** Branch `section-name-evidence`, worktree `faves-section-name`.

**Re-measured before touching anything** — 230 items under a
`pizza|sandwich|burger|toastie` heading, **162** tagged, **68** not, same five
venues. The filing's numbers were exactly right.

**Part 1 (`e2d42ce`).** 67 of the 68 gained `contains-gluten`; one-way only, via
`tag_allergens.py`'s own raw-text patcher behind a round-trip assertion that
nothing outside a `tags` array moved. `DATA_VERSION` `2026-09-20.2` →
`2026-09-24.1`.

🛑 **One row declined**: `hell-pizza` / *Lamb Shank and Mash*, under **Anti
Pizza** — the venue's own word for the part of its menu that is not a pizza. The
heading is evidence *against*. That one row is what stopped Part 2 shipping a
writer.

🔎 **No section heading in the corpus declares a free-from.** Swept all 57
records: only `burgerfuel`'s *"Free range chicken"* and `the-borough-tawa`'s
*"Wine — alcohol free"*, neither an allergen claim. The *"Gluten Free Pizza"*
trap is real and **not yet in the data**.

**Part 2.** Break-probe written first and watched to fail (4 of 6 groups red
against the unchanged tool; the two that passed are the unchanged-note path and
the control, which must pass on both sides). Then the feature: `section_text()`
and a fourth tier, `SECTION`, **read, reported, never written** (ADR 0123).

🔑 **The hedge machinery answer, which is this half's real finding.** Reusing it
was right — `first_unhedged` cancels *"Gluten Free Pizza"* on a heading exactly
as it cancels *"Gluten free toast"* in a name, no second rule — **and it was not
enough.** A 57-record dry run of the heading proposes **70 findings, ~48 false**,
in two classes carrying no negation for any hedge to read: the heading as a
**disjunction** (`Beer & Cider` → gluten on an apple cider ×11; `Chicken & Fish`
→ fish on a McNugget ×7; `Sushi & Sashimi` → fish on an Avocado Roll ×16), and
the heading as **not about food** (`Anti Pizza`; BurgerFuel's `Bun swaps`,
holding the two rows ADR 0097 and ADR 0116 exist to protect). A writing tier
would have undone both records with one line.

🛑 **The breaker caught a decorative guard in my own first draft.** The
`declared_free`-on-a-heading group originally put a *Margherita* under a heading
called *"Gluten Free"* — which passes with the guard **deleted**, because no
rule matches a bare "gluten" at all. Rewritten to a *Toast* and a *Brownie*; the
guard is load-bearing now. Writing the probe first does not make it honest.

🎯 **Left for the owner, deliberately undecided:** whether the tagger should
**ever** write from a heading. This answers *"not on this evidence"*, not
*"never"*. `--tier SECTION` prints the 70 with each basis.

🔎 **Found in passing, out of lane:** `takeaway-at-churton`'s *Crumb Chicken
Fillet* misses the `crumbed` rule because the menu writes *"Crumb"*. Tagged here
on its heading; the vocabulary gap is `080/160`.

⚠️ **`allergen_disagreements.py` still prints no tree line** — reported by the
previous worker on this session, unchanged here, still a gate-wiring question
rather than one of the rulings.

