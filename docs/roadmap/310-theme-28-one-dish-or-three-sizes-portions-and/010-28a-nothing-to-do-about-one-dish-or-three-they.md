- [ ] **28a — Nothing to do about "one dish or three": they are three dishes**
  `[design]` — ✅ **its stated blocker is discharged**: Theme 25 landed
  2026-08-16 (ADR 0051) with exactly the two preconditions this item named — one
  id per **row**, and same-named rows **not** merged (the 22 colliding rows were
  disambiguated, the first of each group keeping the bare slug). The design
  conclusion still stands and the work is still open; only the "Blocked on
  Theme 25" clause below is now false. The same correction applies to the
  "Depends on Theme 25" preamble above 26a/26b/26c and 14f. — the evidence
  says a size variant needs its own desc, tags,
  section, availability and `addOns`, and once it needs all five it *is* a
  dish. The relationship is worth expressing, but as an optional **link
  between dish ids** ("also available as…"), not by merging records. Blocked on
  Theme 25, which must land one id per ROW and must not merge same-named rows.

  ---

  🛑 **OVERTAKEN BY A LATER RULING — 2026-09-09.** The owner was asked *"if
  someone hearts 'Large Butter Chicken', have they hearted a dish or a size?"*
  and answered **the dish**. So a size or a protein is a **choice on one
  dish**, the id belongs to the **base** dish, and the choice lives on the
  order line. That is the opposite of this item's headline. See
  [`490/050`](../490-cold-review-of-the-data-model-owner-raised-2026-09-07/050-one-shape-for-a-dish-with-choices.md)
  for the ruling and `28h`–`28r` in this section for the decomposition.

  🔑 **The reasoning above is NOT deleted, because half of it turned out to be
  right and it is now the rubric.** Measured at `e50c0ee` across the 133
  ladders where rows are already separate dishes: this item's test — *a
  variant needs its own `desc`, `tags`, `section`, availability and `addOns`,
  and once it needs all five it is a dish* — **holds for 70 of them and fails
  for the other 63**, whose siblings differ in nothing but a name and a price.
  So the item was not wrong about the corpus; it was wrong to read one half of
  it as the whole. `28p` applies this paragraph as its rubric, group by group.

  ⏳ **What stays live here, and it is why this item is not closed.** The
  ruling settles what a heart points at. It does not settle:
  - Whether the *"also available as…"* link between dish ids still has a job
    for the groups `28p` refuses to merge — two dishes that really are two
    dishes may still want to name each other.
  - Whether the five-field test above belongs in `ARCHITECTURE.md` as the
    intake rule (`28r`) or stays this item's working note.

  🚩 **Do not read the ruling as agreeing with this item's blocker note.** The
  discharge of "Blocked on Theme 25" at the top is unaffected and still
  correct; only the design conclusion is overtaken.
