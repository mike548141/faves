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
// ── A line may be an OBJECT, and then it can be a PART (roadmap 350/020) ──
//
// Since 22e step 4 a line — top level or inside a group — may also be
// `{ text, tags?, trace?, traceSource?, note?, noteSource? }`. A line that
// carries `tags` is a PART: it states its own allergens and diet claims, and the
// dish's tags are composed from the dish's own plus its parts' by addons.js
// `composeTags` — the SAME mechanism an add-on option uses (owner: "a single
// mechanics that serve both needs"). An ingredient is a fixed, pre-selected
// option. That is what lets the Whittaker's chocolate carry its soy and its
// "may contain peanuts" itself, so the day a reader can swap it, the warnings
// leave with it (and a diet claim survives only if the replacement states it:
// an untagged part is unknown, never safe — ADR 0092).
//
// Everything else about a line is unchanged: its `text` is what shows, what
// scales and what the key is built from, so an object line ticks, scales and
// shops exactly as the string it replaced.
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

import { composeTags } from "./addons.js";

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
    const single = asLine(entry);
    if (single) {
      if (!loose) blocks.push((loose = { component: null, lines: [] }));
      loose.lines.push({ ...single, key: single.text });
      continue;
    }
    if (!entry || typeof entry !== "object" || !("component" in entry)) continue;
    const component = String(entry.component ?? "").trim();
    const items = (Array.isArray(entry.items) ? entry.items : []).map(asLine).filter(Boolean);
    if (!component || !items.length) continue;
    // A group ends any run of loose lines: a bare line AFTER a component would
    // read as belonging to it, so validate.py refuses that shape outright and
    // this is only the render-side half of the same rule.
    loose = null;
    blocks.push({
      component,
      lines: items.map((line) => ({ ...line, key: `${component}: ${line.text}` })),
    });
  }
  return blocks;
}

/**
 * One line, string or object, as `{ text, tags?, trace?, traceSource?, note?,
 * noteSource? }` — or null for anything that is not a line (an empty string, a
 * group, junk). Only fields that are really there are carried, so a plain
 * string line is `{ text }` and nothing downstream sees an `undefined` field.
 */
function asLine(entry) {
  if (typeof entry === "string") return entry.trim() ? { text: entry } : null;
  if (!entry || typeof entry !== "object" || "component" in entry) return null;
  if (typeof entry.text !== "string" || !entry.text.trim()) return null;
  const line = { text: entry.text };
  if (Array.isArray(entry.tags)) line.tags = entry.tags;
  if (Array.isArray(entry.trace)) line.trace = entry.trace;
  if (typeof entry.traceSource === "string") line.traceSource = entry.traceSource;
  if (typeof entry.note === "string" && entry.note.trim()) {
    line.note = entry.note;
    line.noteSource = entry.noteSource;
  }
  return line;
}

/**
 * What an ingredient's ⓘ says (owner, 2026-09-28: a note "may be specified by
 * me, the recipe/restaurant source, or inferred by you"). WHO wrote it is part
 * of what it says: an inferred note is OUR suggestion and says so in words, so
 * it can never pass for the recipe's own advice. The owner's note is his
 * collection's voice and reads plain; a publisher's is credited to the recipe.
 * Null when the line has no note.
 */
export function noteText(line) {
  if (!line?.note) return null;
  if (line.noteSource === "inferred") return `Our suggestion, not the recipe's: ${line.note}`;
  if (line.noteSource === "publisher") return `From the recipe: ${line.note}`;
  return line.note;
}

/**
 * The recipe's PARTS — every line that states its own tags — in the shape an
 * add-on selection has (`{ group, id, name, price, tags }`), so addons.js
 * `composeTags` reads them unchanged. `name` is the line's text: it is what a
 * tip names as the tag's cause ("From the ingredients: 250g Whittaker's …").
 */
export function ingredientParts(ingredients) {
  return ingredientBlocks(ingredients)
    .flatMap((b) => b.lines)
    .filter((l) => Array.isArray(l.tags))
    .map((l) => ({ group: "ingredient", id: l.key, name: l.text, price: 0, tags: l.tags, trace: l.trace, traceSource: l.traceSource }));
}

/**
 * A recipe as the app reads it: its tags composed from the dish and its parts.
 * Returns the item unchanged when it has no parts, so every recipe without one
 * — and every venue dish — is byte-for-byte what it was.
 *
 *   • `tags`      — composed (allergens union, diet claims intersect).
 *   • `ownTags`   — the dish's own, kept so a future swap can recompose.
 *   • `partTrace` — each part's "may contain", as `[{ tag, source }]`.
 *   • `tagNotes`  — the dish's own notes, plus one per tag ONLY a part brought
 *                   in, naming that part — the tagger never writes those, as
 *                   it never reads a part's words (tools/tag_allergens.py).
 *
 * Pure, so data.js runs it at the one load seam and tools read it too.
 */
export function composeRecipe(item) {
  const parts = ingredientParts(item?.ingredients);
  if (!parts.length) return item;
  const own = Array.isArray(item.tags) ? item.tags : [];
  const { tags, added } = composeTags(own, parts);
  const notes = { ...(item.tagNotes || {}) };
  const from = new Map();
  for (const a of added) from.set(a.tag, [...(from.get(a.tag) || []), a.from]);
  // `added` names only the FIRST part per tag; a tag two parts carry names both.
  for (const p of parts) {
    for (const t of p.tags) {
      if (!t.startsWith("contains-") || own.includes(t)) continue;
      const list = from.get(t) || [];
      if (!list.includes(p.name)) from.set(t, [...list, p.name]);
    }
  }
  for (const [t, names] of from) notes[t] = `From the ingredients: ${names.join("; ")}.`;
  const partTrace = parts.flatMap((p) =>
    (Array.isArray(p.trace) ? p.trace : []).map((tag) => ({ tag, source: p.traceSource || "" }))
  );
  return { ...item, tags, ownTags: own, partTrace, tagNotes: Object.keys(notes).length ? notes : item.tagNotes };
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
