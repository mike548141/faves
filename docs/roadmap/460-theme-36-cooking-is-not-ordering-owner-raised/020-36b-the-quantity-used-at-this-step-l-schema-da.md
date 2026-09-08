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
~~Note the corpus is already doing this by hand and badly: Chocolate
Self-Saucing Pudding has `"1 tbsp cocoa"` and `"Sauce: ¼ cup cocoa"` as two
lines, and Upside-Down Plum Cake prefixes every line `Topping:` or `Batter:`.
The `"Sauce:"` convention *is* a per-step grouping, invented by whoever typed it
in. That is the strongest argument that the model wants the structure.~~

## ⚠️ BOTH EXAMPLES WERE FIXED ON 2026-08-17 — re-measured 2026-09-09

The paragraph above is kept because its **argument** survives; its **evidence**
does not. Both cited lines were repaired by commit
[`cad8466`](https://github.com/mike548141/faves/commit/cad8466) —
*"data: the four recipes that faked grouping now carry it as a field (37l)"* —
which landed the very next day and which nobody folded back into this item.

**What those two records hold today**, read from
`site/data/restaurants/cook-at-home.json` at this commit:

```json
{"component": "Sauce", "items": ["½ cup (125 ml) brown sugar",
  "¼ cup (60 ml) cocoa", "1 tbsp (15 ml) cornflour", "2 cups (500 ml) boiling water"]}
{"component": "Topping", "items": ["2 tablespoons butter, melted", …]}
{"component": "Batter", "items": ["1⅔ cups plain flour, sifted", …]}
```

So the `"Sauce:"` string prefix is gone and the grouping is a **field**.
🔎 **Swept the whole corpus, not just the two named records: `0` ingredient
lines out of `184` carry an `Xxx:` prefix.** The convention this item calls
*"doing it by hand and badly"* no longer exists anywhere in the data.

🔑 **The structural claim STANDS, and this is the important half.** Nothing here
weakens the item. `ingredients` and `steps` are still two flat lists with
**nothing linking them**, and no line records a split — which is exactly what
36b is about. Components group ingredients by *part of the dish*; they do not
say *which step consumes how much*, which is the owner's actual example (2 cups
of sugar in total, 1 cup at this step).
⚠️ **What changed is the argument's strength, so it should be made honestly.**
The old evidence was *"whoever typed the data invented a grouping, so the model
wants the structure"*. Since 2026-08-17 that inventiveness has an official home,
which means the corpus is **no longer straining against the schema in the way
this item claimed**. The case for 36b now rests on the owner's own example and
on the absent ingredient↔step link — not on hand-typed prefixes. A session
re-reading the struck paragraph, finding both examples false, and concluding the
item is obsolete would be wrong; a session quoting them as current evidence
would also be wrong. Hence both, said here.

🛑 **The bracket stays `- [ ]`** — nothing in 36b is built, and the `[L]` data
pass over all 23 recipes with a method is untouched.
🎯 **The 🎯 on the title line is left standing deliberately.** This item has
never been ruled on: it proposes a schema change (`steps[].uses`) plus a hand
pass over the whole recipe corpus, and that is a genuine owner call that nobody
has put to him. This pass verified the item's facts; it did not answer its
question.
