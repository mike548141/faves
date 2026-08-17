// Structured add-ons: what the menu offers you on top of a dish, and what that
// does to the dish's safety tags (ADR 0048, Theme 14a + 14d).
//
// The prose was always there — "Add gravy $3.", "Add chicken, halloumi, prawns
// or beef +$7.", a whole brunch-sides section, a counter card of twelve free
// sauces. Only the SHAPE was wrong, so nothing could read it. This module is
// the shape: venue-level group definitions, referenced by a section or a dish,
// resolved here and nowhere else.
//
// THE LOAD-BEARING HALF IS `composeTags`. A dish that was safe when you tapped
// it can stop being safe when you configure it: satay on a kebab is peanuts,
// halloumi on a dairy-free brunch is dairy. So the tags the app reasons about
// are the tags of the dish PLUS the selection, never the dish alone.
//
// It composes by the mirror of ADR 0025's one-way inference rule, and for the
// same reason — every move is fail-safe:
//
//   • Allergens UNION.        Present on any part ⇒ present on the whole.
//   • Dietary claims INTERSECT. The whole is vegan only if every part is.
//
// So composition can only ever ADD a `contains-*` or REMOVE a `gf`/`df`/`v`/
// `vg`. It can never invent a safety claim, which is the one thing the data is
// not allowed to do (see dietary.js's framing: this surfaces what the data
// records, it never asserts safety).
//
// Intersection, not just contradiction — the choice that cost the most thought.
// A contradiction-only rule (drop `vg` only when an option positively carries a
// clashing allergen) reads more gently and is WRONG: grilled chicken carries no
// `contains-*` at all, because meat is not an allergen, so a vegan dish plus
// chicken would still read vegan. Intersection makes an untagged option
// visibly degrade the claim instead of silently keeping it. Between a reader
// who is told less than we know and a reader who is told a chicken salad is
// vegan, the first is merely annoying. Untagged options are the content sweep's
// problem (Theme 14b), not a reason to soften the predicate.

import { DIET_FILTERS } from "./dietary.js";

const ALLERGEN_PREFIX = "contains-";

// Which allergen makes which dietary claim untrue. This is the same food fact
// as `CONTRADICTED_BY` in tools/tag_allergens.py, read the other way round:
// there it stops a pattern overriding curation WITHIN one dish; here it
// explains why a claim died when a DIFFERENT item was added. Same table, two
// uses — validate.py holds the two in step so they cannot drift.
//
// Absent by design: nuts, peanuts, soy and sesame contradict nothing. A peanut
// is vegan and gluten free. Their whole job here is the union half.
export const CONTRADICTS = {
  gf: ["contains-gluten"],
  df: ["contains-dairy"],
  v: ["contains-shellfish"],
  vg: ["contains-dairy", "contains-egg", "contains-shellfish"],
};

const DIET_KEYS = DIET_FILTERS.map((f) => f.key);

// Every tag that counts as making a given dietary claim — `gf` and `gf-option`
// both do. Read off DIET_FILTERS so the claim vocabulary has one definition.
const CLAIM_TAGS = new Map(DIET_FILTERS.map((f) => [f.key, f.satisfies]));

const isAllergen = (t) => t.startsWith(ALLERGEN_PREFIX);

/** Every tag that asserts one of the four dietary claims, `-option` forms included. */
const claimTagsOf = (tags) => tags.filter((t) => DIET_KEYS.some((k) => CLAIM_TAGS.get(k).includes(t)));

/**
 * The add-on groups that apply to `item`, in the order they should be offered.
 *
 * Groups are defined ONCE at the venue (`record.addOnGroups`) and referenced by
 * id from a section (`section.addOns`) or a dish (`item.addOns`) — so "brunch
 * sides" attaches to eight brunch dishes without being written eight times, and
 * a sauce board that spans every section is written once. A dish gets its
 * section's groups first, then its own; a group named by both appears once.
 *
 * An id with no definition is dropped rather than thrown on: validate.py is the
 * gate for that, and a menu screen must never fail to render over it.
 */
export function groupsFor(record, section, item) {
  const defs = new Map((record?.addOnGroups || []).map((g) => [g.id, g]));
  const ids = [...(section?.addOns || []), ...(item?.addOns || [])];
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const g = defs.get(id);
    if (g) out.push(g);
  }
  return out;
}

/**
 * What this option costs. The group may set a default (`price: 0` once, for a
 * board of twelve free sauces); the option overrides it.
 *
 * A free add-on is the commonest kind there is, so 0 is a real, sayable price —
 * NOT the "we don't know" state the menu screen renders as `?` for a dish
 * (needs.js `priceUnknown`). Those two must never collide, so an add-on price
 * is never null: validate.py rejects it. If we don't know what an extra costs,
 * it stays in the prose and is not structured yet.
 */
export function optionPrice(group, option) {
  const p = option?.price ?? group?.price;
  return typeof p === "number" ? p : 0;
}

/** Total surcharge of a selection, added to the dish price by cart.js. */
export function selectionPrice(selection) {
  return (selection || []).reduce((sum, s) => sum + (typeof s.price === "number" ? s.price : 0), 0);
}

/**
 * Is this selection legal for its group? "Choose up to 3" is a rule the venue
 * set, so it belongs in the data (`max`) and is enforced here — the order sheet
 * must not cheerfully produce something the shop will refuse to make.
 */
export function selectionAllowed(group, chosenCount) {
  if (group.select === "one") return chosenCount <= 1;
  if (typeof group.max === "number") return chosenCount <= group.max;
  return true;
}

/**
 * The tags of the dish AS CONFIGURED, plus an account of what changed and why.
 *
 * `selection` is a flat list of chosen options — `{ group, name, price, tags }`
 * — because the order line carries it flat and the menu screen composes live
 * from the same shape.
 *
 * Returns `{ tags, added, dropped }`:
 *   • `tags`    — what dishFlagged/dishSatisfiesDiet should be asked about.
 *   • `added`   — `[{ tag, from }]`, allergens the selection brought in.
 *   • `dropped` — `[{ tag, from, reason }]`, dietary claims the selection cost,
 *                 `reason` being "contradicted" (the option positively carries a
 *                 clashing allergen) or "not-stated" (the option simply never
 *                 said). The screen says different things for the two: "Halloumi
 *                 contains dairy" is a fact, "we can't say whether Mushrooms is
 *                 dairy free" is an absence, and flattening them into one
 *                 warning would teach the reader to discount both.
 *
 * An empty selection returns the dish's own tags, unchanged and in order —
 * nothing moves on the day this lands, which is the test that matters most.
 */
export function composeTags(dishTags, selection) {
  const base = dishTags || [];
  const chosen = selection || [];
  if (chosen.length === 0) return { tags: [...base], added: [], dropped: [] };

  const added = [];
  const seen = new Set(base);
  const tags = [...base];

  // Allergens (and everything that is not a dietary claim — heat carries over
  // the same way: a hot chilli sauce makes the plate spicy) union in.
  for (const opt of chosen) {
    for (const t of opt.tags || []) {
      if (claimTagsOf([t]).length > 0) continue; // dietary claims are handled below
      if (seen.has(t)) continue;
      seen.add(t);
      tags.push(t);
      if (isAllergen(t)) added.push({ tag: t, from: opt.name });
    }
  }

  // Dietary claims intersect: the dish's claim survives only if every selected
  // option makes the same claim, and nothing selected contradicts it.
  const dropped = [];
  const surviving = [];
  for (const tag of claimTagsOf(base)) {
    // The claim a tag MAKES is its own name (`vg`, `gf-option` → `gf`), never
    // the first filter list it happens to satisfy. `vg` sits in `v`'s
    // satisfies list too (every vegan dish is vegetarian), and a lookup by
    // list membership resolved it to `v` — so a vegan dish was checked
    // against CONTRADICTS.v (shellfish) and kept its vegan claim when dairy
    // was added to it. Latent in the corpus, live the moment one option is
    // written as ["vg", "contains-dairy"] (board, Theme 14; fixed 2026-08-17).
    const key = tag.replace(/-option$/, "");
    const clashes = CONTRADICTS[key] || [];
    let kill = null;
    for (const opt of chosen) {
      const ot = opt.tags || [];
      const hit = ot.find((t) => clashes.includes(t));
      if (hit) {
        kill = { tag, from: opt.name, reason: "contradicted", allergen: hit };
        break; // a stated clash outranks a silence — report the harder fact
      }
      if (!CLAIM_TAGS.get(key).some((t) => ot.includes(t)) && !kill) {
        kill = { tag, from: opt.name, reason: "not-stated" };
      }
    }
    if (kill) dropped.push(kill);
    else surviving.push(tag);
  }

  const lost = new Set(dropped.map((d) => d.tag));
  return { tags: tags.filter((t) => !lost.has(t)), added, dropped };
}

/**
 * A stable identity for a selection, so the order tally can tell one
 * configuration of a dish from another (Theme 14e: a dish added twice with
 * different add-ons is two lines, not a quantity of 2).
 *
 * Sorted, so the same choices made in a different order are the same line —
 * otherwise "chips then drink" and "drink then chips" quietly become two.
 */
export function selectionKey(selection) {
  return (selection || [])
    .map((s) => `${s.group}${s.name}`)
    .sort()
    .join("");
}

/** Human-readable configuration, for the order sheet and collect mode. */
export function selectionSummary(selection) {
  return (selection || []).map((s) => s.name).join(", ");
}
