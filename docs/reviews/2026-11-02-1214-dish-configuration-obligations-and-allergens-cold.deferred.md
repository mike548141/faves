# Held back — angles for the dish-configuration pass

For `2026-11-02-1214-dish-configuration-obligations-and-allergens-cold.md`.
**Open only after your own findings are durably written in the brief**
(`REVIEW.md` rule 1). Then fold this in below the verdict and delete this
file.

Written by the brief-writing sub-agent (Claude Opus 5.5, of session
`2be3482c`) from the five ADRs' decision sections and the merge file lists;
it did not read the diffs. Hypotheses, unproven; none was driven. Answer
each: confirmed, damaged, or already covered by your finding N.

- **D1 — a default that decides allergens.** 0156 refuses a pre-selected
  answer on a required group because the dish's allergens depend on it. A
  `selects` group (a size, a variant) always has a default. Can a default
  variant carry allergens or dietary claims the reader never chose?
- **D2 — a menu that changes under a stored line.** Lines are judged
  against the live record. When a venue's menu changes, can a line that
  was finished become unfinished, or its allergen sentence change, with
  nothing telling the reader what moved?
- **D3 — every way in.** Is there a path that puts a line on an order
  without passing the obligation check: a received shared order, a saved
  order made before a group became required, an import, the shopping
  list, collect mode?
- **D4 — menu words on the page.** Group names, option names and the
  `replaces` phrase reach visible text and accessible names ("Needs a
  choice: …", "instead of the …"). Are they always set as text, never as
  markup?
- **D5 — a swap that keeps the old thing's allergens.** Unioning a swap's
  allergens into the dish keeps the replaced item's tags. That errs safe
  for allergens, but can it wrongly withdraw a dietary claim the swap was
  chosen to earn (a gluten-free bun on a dish that then never reads as
  gluten-free)? Does the page say which?
- **D6 — Add that is "disabled" but focusable.** With `aria-disabled`, a
  tap or Enter opens the picker instead. Does that hold for every input
  route (switch control, a screen reader's activate, a double tap), and
  does the button keep its 44 px target while gated?
- **D7 — "the menu must state it".** The `replaces` rule is a
  case-insensitive match on the dish's `desc` or section `note`. Can a
  phrase pass because it appears in an unrelated sentence, and do the 13
  mutations cover each refusal the ADR lists?
