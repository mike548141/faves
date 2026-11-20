- [x] **37l — a recipe with components needs grouped ingredients**
      `[M][schema][js]`. **CLAIMED 2026-08-16 13:55 UTC (wt: faves-recipe)** — the
      recipe-page pass. Owner, 2026-08-16: *"Some recipes have multiple
      components. For example Booth's Ginger Crunch has the base and the icing,
      look at how we should organise the ingredients to improve this."*
      🔎 **The corpus is already doing this by hand, and the measurement says
      so.** Four recipes fake grouping with a `"Component: "` prefix inside the
      ingredient string itself: **Upside-Down Plum Cake 14 of 14 lines**,
      Chocolate Self-Saucing Pudding 4 of 12, Sticky Date Pudding 3 of 10,
      Booth's Ginger Crunch 4 of 9. A convention that four records invented
      independently is a missing field, not a style choice — and the plum cake,
      where *every* line carries a prefix, is the proof: the prefix is doing all
      the structural work and the reader pays for it on every row.
      **Shape to consider:** `ingredients` becomes either a flat list *or* a
      list of `{ component, items[] }` groups (the same XOR pattern Theme 30
      proposes for `menus`/`menu`), so ungrouped recipes are untouched and no
      migration is forced.
      🛑 **The trap that must be handled in the SAME change:** a tick is keyed
      on a hash of the ingredient line's **raw text** ([ADR 0067]). Rewriting
      `"Sauce: ½ cup brown sugar"` into `{component:"Sauce", text:"½ cup brown
      sugar"}` changes that text, so **every existing tick on all four recipes
      silently detaches** — they do not error, they just stop matching. Either
      hash the component and the line together from the start, or accept the
      loss knowingly and say so. Do not discover this after the data lands.
      🔎 Sequence it with **37c/37d** (collapse, two columns): all three are
      about making a long ingredient list readable, and grouping is the one that
      makes the other two easier — a two-column list breaks far better on
      component boundaries than mid-list.
