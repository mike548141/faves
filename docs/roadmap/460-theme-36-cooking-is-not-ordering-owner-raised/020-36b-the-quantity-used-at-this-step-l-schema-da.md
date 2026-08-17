- [ ] **36b — the quantity used at this step** `[L][schema][data]` 🎯

The owner's example: *"lets say a recipe called for 2 cups of sugar in total,
but only 1 cup is used at this step… show just the 1 cup."*

Shipped today: the step shows the lines it names, at the recipe's **stated**
quantity. Correct whenever an ingredient is used all at once — which is every
case in the current corpus — and an overstatement when a recipe splits one line
across two steps.

**Not shipped, because it does not exist.** `ingredients` is a flat list of
free-text lines; `steps` is a flat list of sentences; nothing links the two and
no line records a split. Getting there means `steps` becomes objects carrying
`uses: [{ ingredient, amount }]`, an ADR for the schema, and a hand pass over
**all 23 recipes with a method** — the work is the data entry, not the code.
Note the corpus is already doing this by hand and badly: Chocolate Self-Saucing
Pudding has `"1 tbsp cocoa"` and `"Sauce: ¼ cup cocoa"` as two lines, and
Upside-Down Plum Cake prefixes every line `Topping:` or `Batter:`. The `"Sauce:"`
convention *is* a per-step grouping, invented by whoever typed it in. That is
the strongest argument that the model wants the structure.
