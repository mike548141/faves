// What a place is like — the `vibe` vocabulary (ROADMAP 37k; owner-ruled
// 2026-08-16).
//
// ── WHY THIS IS A CLOSED VOCABULARY, AND WHY ALL OF IT ──
//
// 37k asked for a "style of dining" filter — *"silver service vs quick eats"*.
// The owner ruled it lives inside `vibe` and that **the whole of `vibe` is
// validated, not just the style values**. That is broader than the question he
// was asked, and the corpus had already proved why: `vibe` shipped with no
// vocabulary check at all (while `priceBand` had one), and it grew **five
// separate strings for one idea** — `quick`, `quick-eats`, `quick-lunch`,
// `grab-and-go`, `counter-order` — across six venues. No filter can aggregate
// those. Closing only the style half would have left the other 21 taggings free
// to drift exactly the same way.
//
// So every value declares a **facet**. The filter reads `style`; the cards
// render all of them. A value not listed here is refused by `tools/validate.py`,
// which reads THIS FILE as its source — the vocabulary is stated once, so a
// Python copy and a JavaScript copy cannot disagree.
//
// ── THE FACETS ──
//
//   style      how the meal happens. Mutually exclusive in practice, and the
//              only facet the filter offers.
//   amenity    what the place has or does. Freely combined; orthogonal to
//              style — a beer garden tells you nothing about how you order.
//   character  what it is known for. Not a facility and not a service model.
//
// 🚩 The amenity facet exists to STOP the style vocabulary swallowing things
// that are not styles. `dog friendly`, `byo`, `quiz night` and `craft beer` are
// 21 of the corpus's 38 taggings and no other field holds them; a style
// vocabulary that absorbed them would be lying about what it means.
//
// ── KEY vs LABEL ──
//
// The stored value is a kebab-case KEY; the reader sees a LABEL. The corpus
// previously mixed conventions in one array — `craft beer` beside `quick-lunch`
// beside `Wellington icon` — which is exactly what a vocabulary is for. Keys are
// what a URL, a filter and a validator handle; labels are what a card shows.

export const FACETS = ["style", "amenity", "character"];

// Ordered: style first (it is the axis being filtered on), then amenity, then
// character. A card renders chips in this order, so two venues never present
// the same facts in a different sequence.
export const VIBES = [
  // --- style: how the meal happens -----------------------------------------
  // Ordered by commitment, least to most, which is the order a reader compares
  // them in and the order the filter's <select> offers.
  { key: "quick-eats", label: "Quick eats", facet: "style" },
  { key: "counter-order", label: "Counter order", facet: "style" },
  { key: "sit-down", label: "Sit-down", facet: "style" },
  { key: "banquet", label: "Banquet", facet: "style" },
  { key: "fine-dining", label: "Fine dining", facet: "style" },

  // --- amenity: what the place has or does ---------------------------------
  { key: "family-friendly", label: "Family friendly", facet: "amenity" },
  { key: "dog-friendly", label: "Dog friendly", facet: "amenity" },
  { key: "garden-bar", label: "Garden bar", facet: "amenity" },
  { key: "beer-garden", label: "Beer garden", facet: "amenity" },
  { key: "craft-beer", label: "Craft beer", facet: "amenity" },
  { key: "licensed", label: "Licensed", facet: "amenity" },
  { key: "byo", label: "BYO", facet: "amenity" },
  { key: "live-music", label: "Live music", facet: "amenity" },
  { key: "live-sport", label: "Live sport", facet: "amenity" },
  { key: "quiz-night", label: "Quiz night", facet: "amenity" },

  // --- character: what it is known for -------------------------------------
  { key: "cheap-and-cheerful", label: "Cheap and cheerful", facet: "character" },
  { key: "wellington-icon", label: "Wellington icon", facet: "character" },
];

const BY_KEY = new Map(VIBES.map((v) => [v.key, v]));

/** The vocabulary entry for a stored value, or null if it is not in it. */
export const vibe = (key) => BY_KEY.get(key) ?? null;

/** What a reader sees. Falls back to the raw key rather than rendering nothing:
 *  `validate.py` refuses an unknown value, so this can only fire on data that
 *  bypassed the gate — and showing it is how anyone would notice. */
export const vibeLabel = (key) => BY_KEY.get(key)?.label ?? key;

/** Every value of one facet, in vocabulary order. */
export const vibesOf = (facet) => VIBES.filter((v) => v.facet === facet);

/** The values a venue carries, in VOCABULARY order rather than the order they
 *  happen to sit in the JSON — so two venues with the same facts read the same
 *  way, and a card never leads with an amenity on one venue and a style on the
 *  next. Unknown values are dropped here: a card is not the place to surface a
 *  data fault, and the validator already refuses them at the gate. */
export const vibesFor = (list) =>
  VIBES.filter((v) => (Array.isArray(list) ? list : []).includes(v.key));

/** The style value a venue carries, if any. At most one is meaningful — a place
 *  is not both fine dining and quick eats — but the data is an array and this
 *  takes the first in vocabulary order rather than pretending the case cannot
 *  arise. */
export const styleOf = (list) => vibesFor(list).find((v) => v.facet === "style") ?? null;

// ── THE MIGRATION, KEPT BECAUSE IT IS A RECORD ──────────────────────────────
//
// What the corpus said before the vocabulary existed, and what each value
// became. Retained rather than deleted with the migration commit: this is the
// only statement of what a superseded tag MEANT, and a future reader finding
// `quick-lunch` in an old share URL or a screenshot has nowhere else to look.
// Not used by any render — `validate.py` reads it so an old value fails with
// "renamed to X" instead of the bare "not in vocabulary".
export const FORMER_VIBES = {
  // Four strings for one idea. `counter-order` was NOT folded in with them: it
  // names how you order, not how fast — a counter-ordered pub meal is not quick
  // eats, and the distinction is the sort a style filter exists to make.
  quick: "quick-eats",
  "quick-lunch": "quick-eats",
  "grab-and-go": "quick-eats",
  // Convention only — same idea, different spelling.
  "fine dining": "fine-dining",
  "craft beer": "craft-beer",
  "family friendly": "family-friendly",
  "dog friendly": "dog-friendly",
  "garden bar": "garden-bar",
  "beer garden": "beer-garden",
  "live music": "live-music",
  "live sport": "live-sport",
  "quiz night": "quiz-night",
  "Wellington icon": "wellington-icon",
  // 🔎 Dropped, not renamed — each one duplicated a `cuisine` value the venue
  // ALREADY carries, verified per venue rather than assumed (ADR 0075's rule: a
  // duplication claim is a measurement, not a reading):
  //   charley-noble       vibe "steakhouse"            ← cuisine ["Grill", "Steakhouse", "Seafood"]
  //   regal-chinese       vibe "yum cha"               ← cuisine ["Chinese", "Yum cha", "Cantonese"]
  //   burgerfuel          vibe "burgers-done-properly" ← cuisine ["Burgers"]
  // So no fact is lost by removing them, and `vibe` stops competing with
  // `cuisine` to answer the same question. `null` means "dropped deliberately".
  steakhouse: null,
  "yum cha": null,
  "burgers-done-properly": null,
};
