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
// `contains-pork` (ADR 0140) is one of them: not an allergen, a presence tag in
// the same namespace so it rides every allergen path — the tagger, the tips,
// the add-on union, the flagged treatment — and is reached in Settings through
// Halal and Kosher rather than an avoid chip of its own (owner-ruled).
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

// --- Halal, Kosher and Meatarian (owner-ruled 2026-09-29, ADR 0140) ---------
//
// Three more food preferences, and NOT ONE OF THEM IS A DIET_FILTERS ENTRY. That
// is the whole design, and each half of it is a trap that was measured first:
//
//   • A DIET_FILTERS entry is a CLAIM a dish must carry to satisfy it, and
//     `dishSatisfiesDiet` returns `false` for a key it does not know. So a
//     "halal" or "meatarian" key reaching an active diet set would dim every
//     dish on every menu — or, written as a filter, dim every dish whose venue
//     never said "halal", which is all of them today. Halal/Kosher may only
//     WARN (owner: they never dim or hide), and Meatarian does nothing yet.
//   • "No pork on the menu line" is not "halal". Halal and Kosher are wider than
//     pork (slaughter, alcohol; shellfish, meat with dairy) and none of that is
//     readable off a menu, so an absence of `contains-pork` is never turned into
//     a halal claim anywhere in this app (ADR 0025's one-way rule).
//
// What they do instead: an observance IMPLIES allergen-style warnings, which join
// the reader's own avoid list in `effectiveAvoid` below — the ⚠ flagged
// treatment and nothing else — and a venue's OWN "halal"/"kosher" on a dish is a
// STATED claim tag (`STATED_CLAIMS`), shown as the venue wrote it and never
// inferred by any tool.

/** What each observance warns on. Kosher's shellfish is the owner's ruling
 *  (2026-09-29); meat-with-dairy is out of scope — no dish-level meat tag
 *  exists to pair with `contains-dairy`. */
export const OBSERVANCE_WARNS = {
  halal: ["contains-pork"],
  kosher: ["contains-pork", "contains-shellfish"],
};

/** Food preferences that are selectable and stored and do NOTHING to a menu yet
 *  (owner, 2026-09-29: "I will decide dishes later. For now just add it to the
 *  food preferences as an option for users to select."). Listed so a test can
 *  hold that every food preference is either an observance or deliberately
 *  inert — never a key that reaches a filter by accident. */
export const INERT_PREFS = ["meatarian"];

/** Claim tags only a VENUE may state — never inferred by any tool. A chip, a
 *  search word and a composition claim (addons.js intersects them), and never a
 *  filter. Kept here beside DIET_FILTERS so the claim vocabulary has one home. */
export const STATED_CLAIMS = [
  { key: "halal", label: "Halal" },
  { key: "kosher", label: "Kosher" },
];

/**
 * The allergen set the ⚠ flagged treatment reads: what the reader flagged, plus
 * what their observances imply. ONE function, read by the menu's render (which
 * its live re-apply re-runs), the recipe page and the add-on picker, so the
 * three cannot disagree about whether a pork dish is flagged for a Halal reader.
 *
 * `foodPrefs` is settings' top-level `foodPrefs` list. A key with no entry in
 * OBSERVANCE_WARNS — Meatarian, or a preference a newer build added — adds
 * nothing, which is what makes an unknown key safe to carry.
 */
export function effectiveAvoid(avoid, foodPrefs) {
  const out = new Set(avoid || []);
  for (const key of foodPrefs || []) {
    if (!Object.hasOwn(OBSERVANCE_WARNS, key)) continue;
    for (const tag of OBSERVANCE_WARNS[key]) out.add(tag);
  }
  return out;
}

/**
 * The claims a reader DECLARED, for chip loudness only (tags.js): their diet
 * keys, plus Halal/Kosher when they chose those, so a venue's own "Halal" chip
 * reads as theirs. Never passed to `dishSatisfiesDiet` — nothing here filters.
 */
export function declaredClaims(dietary, foodPrefs) {
  const out = new Set(dietary || []);
  for (const key of foodPrefs || []) {
    if (STATED_CLAIMS.some((c) => c.key === key)) out.add(key);
  }
  return out;
}

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
