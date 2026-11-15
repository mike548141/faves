- [ ] **Cook at Home is a provider; a recipe is a dish with a method**
      `[M][schema][design]` — owner-raised 2026-11-15 (theme README). Nothing
      built beyond what `470/050` already shipped.

  **Already ruled, 2026-09-08 (`470/050`):** Cook at Home is a restaurant
  with branches, one per home; the public record has one branch matching
  any location; private homes (a holiday home, an RV) live in the reader's
  own data. **Built so far:** the Anywhere branch (ADR 0155, 2026-10-02).
  **Owed:** the private-branch store and its ADR.

  **What his 2026-11-15 message adds:**
  - **Cooking at home is a way of getting the food** — now an option in the
    Dining filter (`520/050`).
  - **The dish differs, not the provider:** a recipe carries ingredients and
    a method. Today that is the `recipes` kind on the whole record (ADR
    0003, `kinds.js`); in the three-entity model it belongs on the dish, so
    one provider could offer both.
  - **The same item at home and in a shop** — his example is a can of Fanta.
    The packaged-product store (`data/products/`, ADR 0090) already gives a
    product its own identity; nothing yet links a menu row to it. That link
    is what would say "this is the same item".
