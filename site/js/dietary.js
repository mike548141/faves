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
// "free of it". A highlight/filter, not a guarantee. Most tags are what the
// venue stated; a small enumerated set is derived from the dish name where the
// allergen is near-certain (satay → peanut, unnamed seafood → shellfish) — see
// ADR 0024 and tools/tag_allergens.py. The UI copy says so.

// A dietary filter is satisfied when the dish carries a qualifying tag. Kept
// here (not menu.js) so the menu render and these predicates read one list.
export const DIET_FILTERS = [
  { key: "v", label: "Vegetarian", satisfies: ["v", "vg", "v-option"] },
  { key: "vg", label: "Vegan", satisfies: ["vg"] },
  { key: "gf", label: "Gluten free", satisfies: ["gf", "gf-option"] },
  { key: "df", label: "Dairy free", satisfies: ["df"] },
];

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
