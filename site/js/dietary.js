// Pure dish/diet safety predicates, shared by the menu render AND its live
// re-apply (menu.js). Kept DOM-free so the two questions this screen bakes into
// every dish —
//   • "does this dish carry an allergen the viewer flagged?" (the ⚠ dish-flagged
//     warning treatment), and
//   • "does it satisfy the active dietary filters?" (matching dishes stay, the
//     rest dim),
// have exactly ONE definition each, unit-tested here. The menu can be re-rendered
// live when a viewer changes their allergen/dietary prefs or switches profile
// (Settings is reachable on the menu page): sharing this one code path is what
// guarantees the initial paint and the reactive re-apply can never diverge — a
// stale or missing allergen highlight is a safety failure, not a cosmetic bug.
//
// Load-bearing safety framing (as everywhere these tags surface): this SURFACES
// what the data records, it never asserts safety — "no tag = not stated", never
// "free of it". A highlight/filter, not a guarantee.
//
// Most `contains-*` tags are now INFERRED from the dish rather than stated by
// the venue (owner ruling, ADR 0025; swept by tools/tag_allergens.py) — menus
// rarely mention wheat or dairy, so waiting for them left the filter useless.
// The one-way rule: inference only ever adds a `contains-*`, NEVER `gf`/`df`/
// `v`/`vg`. Inferring presence is fail-safe; inferring absence would assert
// safety from a guess. The Settings copy tells the reader this.

// A dietary filter is satisfied when the dish carries a qualifying tag. Kept
// here (not menu.js) so the menu render and these predicates read one list.
export const DIET_FILTERS = [
  { key: "v", label: "Vegetarian", satisfies: ["v", "vg", "v-option"] },
  { key: "vg", label: "Vegan", satisfies: ["vg", "vg-option"] },
  { key: "gf", label: "Gluten free", satisfies: ["gf", "gf-option"] },
  { key: "df", label: "Dairy free", satisfies: ["df", "df-option"] },
];

// WHY `vg-option` IS NOT ALSO IN `v`'s LIST, when plain `vg` is.
//
// `vg` sits in `v`'s list because every vegan dish IS vegetarian — an
// entailment that needs nobody to do anything. The tempting parallel is that
// `vg-option` should follow it in: if staff will make it vegan, a vegetarian
// can certainly eat that version. Both readings are defensible and the corpus
// does not settle it, so two other things did.
//
// First, it costs the reader nothing. Every dish the corpus tags `vg-option`
// already carries `v` or `v-option` (a venue offering to veganise a dish has
// invariably said the vegetarian version exists), so the vegetarian filter
// shows all of them either way. The choice is currently about meaning, not
// about what anyone sees.
//
// Second — and this is what decided it at the time — a tag in two lists
// resolved AMBIGUOUSLY in addons.js `composeTags`, which mapped a claim tag
// back to its filter key by first list membership: a `vg` dish resolved to
// key `v`, was checked against CONTRADICTS.v (shellfish) instead of
// CONTRADICTS.vg (dairy, egg, shellfish), and kept its vegan claim when dairy
// was added to it. FIXED 2026-08-17: composeTags now reads the claim off the
// tag's own name (`vg-option` → `vg`), so list membership no longer decides
// which contradictions apply, and a tag in two lists is no longer a hazard.
//
// So this is a deliberate stop, not an oversight — and with the hazard gone
// the vegetarian question is a free choice again, to be reopened on its
// merits (does "we can make it vegan" entail "vegetarian version exists"?)
// rather than forced either way by the machinery.

/**
 * Does `tags` carry an allergen the viewer flagged to avoid? `avoid` is a Set of
 * allergen keys (settings.js). No flagged allergens ⇒ never flagged.
 */
export function dishFlagged(tags, avoid) {
  if (!avoid || avoid.size === 0) return false;
  return (tags || []).some((t) => avoid.has(t));
}

/**
 * Does `tags` satisfy EVERY active dietary filter? `activeDiet` is a Set of
 * filter keys. An empty set means no dietary filtering is on, so every dish
 * qualifies. AND across filters (vegan + GF ⇒ must be both), matching menu.js.
 */
export function dishSatisfiesDiet(tags, activeDiet) {
  if (!activeDiet || activeDiet.size === 0) return true;
  const t = tags || [];
  return [...activeDiet].every((key) => {
    const f = DIET_FILTERS.find((x) => x.key === key);
    return f ? f.satisfies.some((tag) => t.includes(tag)) : false;
  });
}
