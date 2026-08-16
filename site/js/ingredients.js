// One shape for an ingredient list, whichever way the recipe was written
// (ADR 0070).
//
// `item.ingredients` is a list whose entries are EITHER a plain string — one
// ungrouped line — OR a group `{ component, items: [string, …] }`. Four recipes
// in the corpus had already invented grouping by hand, prefixing the component
// into the string itself ("Sauce: 150g brown sugar"), and Upside-Down Plum Cake
// carried that prefix on all 14 of its lines. A convention four records reach
// for independently is a missing field, not a style choice.
//
// Every consumer reads the list through here so none of them has to know which
// way a given recipe was written: the recipe page, the collection list's
// expanded body, cook mode's per-step panel, and both search haystacks.
//
// ── The line's KEY is not its display text, and that is load-bearing ──
//
// A tick is stored against a hash of the line (ADR 0067). The key this module
// hands back is `"<component>: <text>"` for a grouped line and the bare text for
// an ungrouped one — which is byte-for-byte the string those four recipes
// already held, so migrating them to the field detached exactly zero ticks.
//
// That is a happy consequence, not the reason. The reason is that WITHOUT the
// component two lines genuinely collide: Sticky Date Pudding lists "60g butter"
// in the pudding and "Sauce: 60g butter" in the sauce. Hash the text alone and
// those are one key — tick the butter for the sauce and the pudding's butter
// ticks itself. The component is part of the line's identity, so it belongs in
// the key.

/**
 * `item.ingredients` normalised to blocks, in the recipe's own order.
 *
 * Consecutive ungrouped strings collapse into a single leading block with a
 * null component, which is how the corpus actually reads: Booth's Ginger Crunch
 * lists the base unlabelled and then names "Ginger icing". Rendering that first
 * block without a heading is what a cookbook does, and it saves inventing a
 * component name — "Base", "Pudding" — that no owner ever supplied.
 *
 * @param {Array<string|{component: string, items: string[]}>|undefined} ingredients
 * @returns {{component: string|null, lines: {key: string, text: string}[]}[]}
 */
export function ingredientBlocks(ingredients) {
  const blocks = [];
  let loose = null;
  for (const entry of Array.isArray(ingredients) ? ingredients : []) {
    if (typeof entry === "string") {
      if (!entry.trim()) continue;
      if (!loose) blocks.push((loose = { component: null, lines: [] }));
      loose.lines.push({ key: entry, text: entry });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const component = String(entry.component ?? "").trim();
    const items = (Array.isArray(entry.items) ? entry.items : []).filter(
      (x) => typeof x === "string" && x.trim() !== ""
    );
    if (!component || !items.length) continue;
    // A group ends any run of loose lines: a bare line AFTER a component would
    // read as belonging to it, so validate.py refuses that shape outright and
    // this is only the render-side half of the same rule.
    loose = null;
    blocks.push({
      component,
      lines: items.map((text) => ({ key: `${component}: ${text}`, text })),
    });
  }
  return blocks;
}

/**
 * Every line's KEY, flat and in order — the string a tick hashes, and the one
 * the search haystacks and cook mode's step matcher want.
 *
 * Cook mode is the reason this is the key rather than the display text:
 * `cook.js`'s `ingredientTerms` already strips a leading "Label: " before
 * matching, so feeding it the key leaves its behaviour exactly as it was.
 *
 * @param {Array<string|{component: string, items: string[]}>|undefined} ingredients
 * @returns {string[]}
 */
export function ingredientKeys(ingredients) {
  return ingredientBlocks(ingredients).flatMap((b) => b.lines.map((l) => l.key));
}

/** How many lines the list holds, groups flattened. */
export const ingredientCount = (ingredients) => ingredientKeys(ingredients).length;
