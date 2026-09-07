# Theme 38 — a cold review of the data model AND the features, developed and planned (owner-raised 2026-09-07)

**Raised by the owner at the close of session `faves-b1`, to be done in a
FRESH session.** His framing, kept verbatim because the scope is his:

> *"This one is for the roadmap to do in a fresh session. We need a full cold
> review of the data model and features developed and planned to support all the
> complexities we are finding / trying to handle to make sure we are well setup
> for the future use of Faves.*
>
> - *Cooking food at home vs getting it from a restaurant*
> - *Ready made food at home (from a can of beer to a bag od chips to a ready
>   made meal/dish). And potentially in future maybe we add dishes that have been
>   made prior (e.g. left overs) and are ready to eat in the fridge which gets
>   into what stock we have in the house vs recipes we can make assuming we have
>   the ingredients*
> - *The restaurant vs branch vs franchises we are seeing, each with nuances like
>   different locations, hours, menus etc*
> - *The idea of seasonal menus, and menus by time of day*
> - *Being able to configure a dish (like subway) and or add-on to a dish like
>   adding bacon to a brunch dish.*
> - *Combo's like McDonalds or other places e.g. pie & a can ok coke for $??*
> - *Variants of a dish like beef vs chicken satay skewers*
> - *Specialised pricing based on delivered vs eat in vs takeaway, special deals
>   e.g. time of day,*
> - *Data I want to capture for later liek changes in dish and resaurant pricing
>   over time, changes is the types of dishes offered etc*
> - *The state of a restaurant or branch e.g. temproarily closed, permanently
>   closed*
> - *a restaurant staying open past midnight, Daylight savings etc*
>
> *I am sure there is more that I've missed. Do whatever work, look at sessions,
> do research as needed to supplement this work. We can attack all that in a
> fresh session. For now make sure its fully recorded in the roadmap etc."*

🔑 **That is his text unaltered — spelling, punctuation and all — and only the
line breaks are ours.** It was elided to two sentences plus a `…` when this
theme was first filed on 2026-09-07, with the eleven bullets replaced by a
paraphrased table. He caught it the same day. **A paraphrase of a brief is not
the brief**: "Ready made food at home" lost the chain that follows it — leftovers
in the fridge, *"what stock we have in the house vs recipes we can make assuming
we have the ingredients"* — which is a feature idea, not a storage question, and
the paraphrase dropped it entirely. `RECORD.md`'s rule that a record must not be
narrower than its source applies to an instruction as much as to a decision.

🛑 **AND THE SCOPE IS WIDER THAN "THE DATA MODEL".** He wrote *"the data model
**and features developed and planned**"*. Three things, not one:
- **the data model** — the shapes we store;
- **the features already developed** — whether what ships actually handles this
  list, which is a question about `site/js/` and the screens, not the schema;
- **the features planned** — the roadmap's own open items, reviewed for whether
  they still make sense against the whole picture rather than one at a time.
The first filing of this theme framed it as a schema review and the summary
given back to him narrowed it again. **Two thirds of the ask is about features.**

🛑 **NOT WORK TO START.** He said *"for now make sure it's fully recorded"*. A
session that finds this theme and begins building against it has misread the
instruction. The deliverable of this theme's first item is a **review**, and
even that is scoped to a fresh session with room to do it properly.

## Why now, and why cold

The trigger is cumulative rather than a single defect. Through 2026-08 and
2026-09 the corpus kept meeting shapes the model was not built for, and each
was handled correctly **in isolation**:

- a venue trading past midnight (ADR 0094, 2026-09-07)
- a chain whose branches have their own hours, and a closure that can only be
  stated at venue level (ADR 0054, and `menu.js`'s own comment: *"Until
  per-branch closure exists — an open design question, not ours to settle"*)
- a dish that is really three sizes (`310/010`), and 153 prose price points
  with nowhere to live (`310/020`)
- an add-on that changes what a dish contains (ADR 0048) — and, found
  2026-09-07, an add-on axis that silently does not carry allergens
  (`110/040`)
- two venues describing one idea two ways: `southern-cross` maps a *"no gluten
  added"* marker straight to `gf`, while `dirty-little-secret`'s equivalent is
  refused as a weaker claim (`080/190`)
- `hours` that cannot say *"we do not know about Wednesday"* (`190/020`)

🔑 **The pattern is the point.** Each fix was right and each was local. The
question this theme asks is whether the **model** is right, and that is not
answerable one item at a time — which is exactly why the owner asked for a cold
review rather than another item.

## What "cold" has to mean here

This repo has a documented failure mode for reviews: *a findings list is
evidence, not a work order* — a previous cold review produced five claimed
supersessions of which **two were false**. So:

- **Open the primary source for every claim.** An ADR's slug is not its
  content; a roadmap item's summary is not its decision; this repo's inlined
  doctrine is a lossy copy of atelier's.
- **Report refutations first.** If the review finds that a problem it expected
  does not exist, that is the most valuable output it can produce and the one
  most likely to be dropped.
- **Measure the corpus, do not reason about it.** Nearly every wrong number in
  this repo's history came from a claim about the data that nobody re-ran.
