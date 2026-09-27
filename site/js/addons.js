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
import { slug } from "./slug.js";

const ALLERGEN_PREFIX = "contains-";

// Which allergen makes which dietary claim untrue. This is the same food fact
// as `CONTRADICTED_BY` in tools/tag_allergens.py, read the other way round:
// there it stops a pattern overriding curation WITHIN one dish; here it
// explains why a claim died when a DIFFERENT item was added. Same table, two
// uses — validate.py holds the two in step so they cannot drift.
//
// Absent by design: nuts, peanuts, soy and sesame contradict nothing. A peanut
// is vegan and gluten free. Their whole job here is the union half.
//
// `contains-fish` (added 2026-09-07) contradicts `v` and `vg` for the same
// reason `contains-shellfish` does, and is a SEPARATE allergen from it —
// neither implies the other. It is also not `has-fish` below: that one is a
// dietary marker read off an option's own name, this one is the allergen. They
// contradict the same two claims and are never written in terms of each other.
//
// `has-meat` and `has-fish` are NOT allergens and are deliberately outside the
// `contains-` namespace (ADR 0092). Meat is not an allergen, and a ninth
// `contains-` tag would have joined four separate allergen tables — the chips
// in menu.js and recipe.js, the avoid list in settings.js, the report filter in
// report.js — as a half-built one nobody can filter on. What they ARE is the
// positive fact that closes 14h: "Bacon is meat" is readable off the option's
// own name, and it turns the picker's absence-shaped line into a fact-shaped
// one. Applied by tools/tag_addon_options.py; never inferred the other way.
export const CONTRADICTS = {
  gf: ["contains-gluten"],
  df: ["contains-dairy"],
  v: ["contains-shellfish", "contains-fish", "has-meat", "has-fish"],
  vg: ["contains-dairy", "contains-egg", "contains-shellfish", "contains-fish",
       "has-meat", "has-fish"],
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
    // A `selects` group (ADR 0130) is offered too since roadmap 28m — it was
    // withheld until a screen could draw it as the single choice it is rather
    // than as a pick-one of extras. addons-ui.js is that screen; the rules it
    // prices and keys by are the pure functions below (ADR 0133).
    if (g) out.push(g);
  }
  return out;
}

/** Does this group choose WHICH plate (a size, a protein) rather than add to it? (ADR 0130) */
export const isSelects = (group) => group?.kind === "selects";

/**
 * The option a `selects` group starts on: the one marked `default`. validate.py
 * requires exactly one; the first option is a fallback for a record that got
 * past it, so the control can never render with nothing chosen.
 */
export function defaultVariant(group) {
  const opts = group?.options || [];
  return opts.find((o) => o?.default === true) || opts[0] || null;
}

/**
 * What a variant is CALLED, on the picker and on the order line (ADR 0133).
 *
 * Its `name` where the menu gave one. ADR 0130 lets a variant be unlabelled —
 * 26 rows print two prices and never say what the bigger one is called — and
 * a radio with no words is not a control anybody can choose, nor a line anybody
 * can read out at a counter. So an unlabelled variant is named by the one thing
 * the menu DID state about it, its price, followed by the group's own name:
 * "$24 size". Nothing is invented — no "Large", no "Size 2" — and the words say
 * which plate the reader means in terms the shop printed.
 *
 * Two unlabelled variants may share a `dishPrice` (ADR 0130 permits it), which
 * would give them one label: then each is suffixed with its position in the
 * group, "(2)", so the two radios are still two things to a screen reader.
 *
 * `fmt` formats money — injected so this stays a pure function of the data.
 */
export function variantLabel(group, option, fmt = (n) => String(n)) {
  const own = typeof option?.name === "string" ? option.name.trim() : "";
  if (own) return own;
  const bare = (o) => {
    const noun = typeof group?.name === "string" ? group.name.trim().toLowerCase() : "";
    const price = typeof o?.dishPrice === "number" ? fmt(o.dishPrice) : "";
    return [price, noun].filter(Boolean).join(" ");
  };
  const opts = group?.options || [];
  const label = bare(option) || optionId(option);
  const twins = opts.filter((o) => !(typeof o?.name === "string" && o.name.trim()) && bare(o) === bare(option));
  if (twins.length < 2) return label;
  return `${label} (${opts.indexOf(option) + 1})`;
}

/**
 * The configured unit price of a dish: its own price, or the chosen variant's
 * WHOLE `dishPrice` in its place — never the two added (ADR 0130: `dishPrice`
 * is the plate, not a surcharge) — plus every add-on's surcharge.
 *
 * `selection` entries for a variant carry `dishPrice` (and `price: 0`, so
 * `selectionPrice` sums only the add-ons). An unpriced dish with no variant
 * chosen stays null: a dish we cannot total is not totalled by guessing.
 */
export function configuredPrice(base, selection) {
  const chosen = selection || [];
  const variant = chosen.find((s) => typeof s?.dishPrice === "number");
  const plate = variant ? variant.dishPrice : base;
  if (typeof plate !== "number") return null;
  return plate + selectionPrice(chosen);
}

/**
 * The selection as the ORDER LINE records it (ADR 0133): `{ group, id, name,
 * price }` per option — the four fields every table that carries a line
 * already knows (cart.js, the backup whitelist in personal-data.js, the share
 * codec's option tuple) — with the DEFAULT variant left out.
 *
 * Why the default is absent rather than recorded: it IS the dish as the menu
 * lists it — the row's own price is the default's `dishPrice` (validate.py holds
 * them equal) — so "Eggs on Toast" and "Eggs on Toast, Regular" are one plate
 * and must be one line. Recording it would split every line already stored for
 * a dish the day that dish gains a ladder (roadmap 28n): the saved "Eggs on
 * Toast" and the next tap on it would be two lines for one plate, the defect
 * 28j names. A non-default variant IS recorded, so Small and Large are two
 * lines. A variant's `price` on the line is 0; the line's own `price` carries
 * the whole plate, which is what every consumer already totals.
 */
export function lineOptions(selection) {
  return (selection || [])
    .filter((s) => !s?.isDefault)
    .map((s) => ({ group: s.group, id: s.id, name: s.name, price: s.price }));
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
 *                 clashing allergen, or is meat or fish) or "not-stated" (the
 *                 option simply never said). The screen says different things
 *                 for the two: "Halloumi contains dairy" is a fact, "we can't
 *                 say whether Mushrooms is dairy free" is an absence, and
 *                 flattening them into one warning would teach the reader to
 *                 discount both.
 *                 A "not-stated" entry also carries `silent` — EVERY chosen
 *                 option that failed to state that claim, not just the first.
 *                 `from` names one of them and is what the old per-claim
 *                 sentence used; `silent` is what lets the screen collapse the
 *                 whole residue into one sentence (ADR 0092) instead of
 *                 repeating an option's name once per claim.
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
    // Every option that failed to state this claim, in selection order — the
    // screen names them all in one sentence, so stopping at the first would
    // under-report the residue rather than over-report it.
    const silent = [];
    for (const opt of chosen) {
      const ot = opt.tags || [];
      const hit = ot.find((t) => clashes.includes(t));
      if (hit) {
        kill = { tag, from: opt.name, reason: "contradicted", allergen: hit };
        break; // a stated clash outranks a silence — report the harder fact
      }
      if (!CLAIM_TAGS.get(key).some((t) => ot.includes(t))) {
        silent.push(opt.name);
        if (!kill) kill = { tag, from: opt.name, reason: "not-stated" };
      }
    }
    // Only on the silence branch: a claim killed by a fact is reported as that
    // fact, and the options that merely said nothing about it are not the news.
    if (kill && kill.reason === "not-stated") kill.silent = silent;
    if (kill) dropped.push(kill);
    else surviving.push(tag);
  }

  const lost = new Set(dropped.map((d) => d.tag));
  return { tags: tags.filter((t) => !lost.has(t)), added, dropped };
}

/**
 * An option's identity (ADR 0126): its `id` where it has one, `slug(name)`
 * otherwise — `dishId()`'s rule, one level down (ADR 0051).
 *
 * Every option in `site/data/` carries an `id` (validate.py requires it; seeded
 * once by tools/seed_option_ids.py from `slug(name)`), so renaming "Large" to
 * "Lg" no longer moves it. The fallback is NOT dead code: it reads what the repo
 * does not control — an order line stored on a phone before ids existed, a
 * backup file, a share link — which carry only `{ group, name }`. Those resolve
 * to `slug(name)`, and the seeded id IS `slug(name)`, so an old line and a new
 * one for the same option produce the same key.
 *
 * Always returned in slug form, even from a hostile `id` off the wire: the key
 * below separates its parts with control characters, and a slug cannot hold one.
 * The one exception is a name that slugs to NOTHING ("炒饭" — the slug keeps only
 * a-z and 0-9): two such names would otherwise share the empty id, so it is
 * percent-encoded instead, behind a `~` no slug can start with. Still free of
 * control characters (encodeURIComponent escapes them), still distinct. No
 * option in the corpus takes this path — validate.py requires a slug `id`, and
 * the seeder refuses a name like that — so it only ever reads a stored line.
 */
export function optionId(option) {
  if (!option || typeof option !== "object") return "";
  const raw = typeof option.id === "string" && option.id ? option.id : option.name;
  if (typeof raw !== "string") return "";
  return slug(raw) || (raw.trim() ? `~${encodeURIComponent(raw.trim())}` : "");
}

/**
 * A stable identity for a selection, so the order tally can tell one
 * configuration of a dish from another (Theme 14e: a dish added twice with
 * different add-ons is two lines, not a quantity of 2).
 *
 * Sorted, so the same choices made in a different order are the same line —
 * otherwise "chips then drink" and "drink then chips" quietly become two.
 *
 * Built from the group id and the OPTION ID, never the display name (ADR 0126):
 * a name-keyed selection re-keyed every stored line the day a venue renamed an
 * option. The parts are joined by U+001F (unit separator) and the entries by
 * U+001E (record separator), written as escapes here because the raw bytes this
 * line used to carry are invisible in most editors — which is how a review came
 * to read it as having no delimiter at all. Neither half can CONTAIN a separator:
 * the option half is a slug (or percent-encoded, see `optionId`) and the group
 * half is percent-encoded — which leaves a kebab-case group id byte-identical and
 * escapes a control character in a crafted one. So two different (group, option)
 * pairs cannot produce one key by construction, whatever a link or backup says.
 */
export function selectionKey(selection) {
  return (selection || [])
    .map((s) => `${encodeURIComponent(String(s?.group ?? ""))}\u001f${optionId(s)}`)
    .sort()
    .join("\u001e");
}

/** Human-readable configuration, for the order sheet and collect mode. */
export function selectionSummary(selection) {
  return (selection || []).map((s) => s.name).join(", ");
}
