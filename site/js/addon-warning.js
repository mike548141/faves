// The SENTENCES the add-on picker says when configuring a dish changes what it is
// (ADR 0048, 0092, 0096) — moved out of addons-ui.js unchanged, so the order sheet's
// finish-in-place control (order-finish-ui.js, roadmap 200/130) says exactly what the
// picker says, from the same code. addons-ui.js imports cart-ui.js (the stepper) and
// cart-ui.js imports the finish control, so the finish control could not import the
// picker without a module cycle; this file has no such dependency. Pure: no DOM.
// The history of each rule is in addons-ui.js's header and in ADRs 0092/0095/0096.

import { composeTags } from "./addons.js";
import { dishFlagged } from "./dietary.js";

const ALLERGEN_LABEL = {
  "contains-nuts": "nuts",
  "contains-peanuts": "peanuts",
  "contains-shellfish": "shellfish",
  "contains-fish": "fish",
  "contains-egg": "egg",
  "contains-dairy": "dairy",
  "contains-gluten": "gluten",
  "contains-soy": "soy",
  "contains-sesame": "sesame",
  "contains-pork": "pork",
};

const CLAIM_LABEL = {
  v: "vegetarian",
  vg: "vegan",
  gf: "gluten free",
  df: "dairy free",
  "gf-option": "gluten free",
  "v-option": "vegetarian",
  "df-option": "dairy free",
  "vg-option": "vegan",
  halal: "halal",
  kosher: "kosher",
};

// How a contradicting tag is SAID. An allergen reads "contains dairy"; the two
// non-allergen facts read "is meat" / "is fish", because "Bacon contains meat"
// is not how anybody says it. Falls back to the raw tag rather than dropping
// the clause, so a vocabulary addition is visible instead of silent.
const CARRIES = {
  "has-meat": "is meat",
  "has-fish": "is fish",
};
const carries = (tag) => CARRIES[tag] || `contains ${ALLERGEN_LABEL[tag] || tag}`;

/** "A", "A and B", "A, B and C" — NZ English, no serial comma. */
function joinList(items, last = "and") {
  if (items.length < 2) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/**
 * ONE sentence for everything the configuration leaves unknown (ADR 0092).
 *
 * Was: one sentence per claim per option — "We can't say whether Spinach is
 * vegetarian, so we can't say this still is. We can't say whether Spinach is
 * gluten free, so we can't say this still is." Two sentences, one option, one
 * fact, and the reader learns to skip the whole block.
 *
 * It says "aren't tagged", not "we can't say whether" — because that is the
 * true statement and it is shorter. It never says an extra IS safe, which is
 * the line ADR 0025 draws and this must not cross: the claim has already been
 * dropped from the dish by the time this renders, and the sentence explains
 * which labels no longer cover what the reader configured.
 */
function unstatedLine(drops) {
  // `silent` names every option that failed the claim; `from` is the fallback
  // for a drop composed before that field existed.
  const names = [...new Set(drops.flatMap((d) => (d.silent?.length ? d.silent : [d.from])))];
  const claims = [...new Set(drops.map((d) => CLAIM_LABEL[d.tag] || d.tag))];
  const verb = names.length > 1 ? "aren't" : "isn't";
  const labels = claims.length > 1 ? "those labels describe" : "that label describes";
  return `${joinList(names)} ${verb} tagged ${joinList(claims, "or")}, so ${labels} the dish as listed.`;
}

/**
 * SAY THE FACT ONCE (roadmap 200/050, owner-ruled 2026-09-07).
 *
 * The allergen an option brings in and the dietary claim that same allergen
 * kills are two consequences of ONE fact, and until now they were two sentences
 * that each opened with it — measured verbatim in headless Chrome on Sprig &
 * Fern Tawa's Garden Salad with dairy flagged:
 *
 *   "Halloumi contains dairy — you asked to avoid it. Halloumi contains dairy,
 *    so this is no longer vegan."
 *
 * Shipping since ADR 0048 and reachable by every (`contains-*`, claim) pair in
 * `CONTRADICTS`. The owner ruled: merge into one sentence, say the fact once,
 * both consequences after it.
 *
 * 🚩 THE ALLERGEN HALF LEADS AND IS NOT WEAKENED. It stays first, in its own
 * block, in the words a reader scanning for their own allergy is looking for;
 * the dietary consequence is appended to it. Dropping the dietary half was
 * offered and declined — it is what a reader choosing on vegan grounds rather
 * than allergy is reading for, so both meanings survive the merge.
 *
 * Keyed on (option, SUBSTANCE) since 2026-09-08 (roadmap 200/070). It was
 * keyed on the literal tag until then, so it merged only where the clause was
 * word for word the same one twice — and "Salmon contains fish" beside "Salmon
 * is fish" names one substance through two tags, which sailed past it. See
 * `SUBSTANCE` above for what that map is and, more importantly, what it is
 * not: `has-fish` and `contains-fish` stay independent everywhere else in the
 * app, exactly as ADR 0095 §1 requires.
 *
 * It also merges a fact that kills TWO claims — "Halloumi contains dairy, so
 * this is no longer dairy free or vegan" — which was three sentences before and
 * is the same repetition wearing a different hat.
 */
/**
 * ONE SUBSTANCE, TWO TAGS — AND THIS IS ABOUT WORDS, NOT ABOUT THE TAG MODEL
 * (roadmap 200/070, owner-recommended option 1).
 *
 * 🛑 READ THIS BEFORE REUSING IT. `has-fish` and `contains-fish` are kept
 * deliberately INDEPENDENT of each other — two rules on the same evidence,
 * neither written in terms of the other (ADR 0095 §1), because making the
 * allergen a consequence of the dietary marker is what Theme 5 item `010`
 * forbids. This map does NOT relate them: `composeTags` still reports
 * `has-fish` as the tag that killed the claim and `contains-fish` as the
 * allergen the option added, both unchanged, and neither is derivable from the
 * other anywhere in the app. What this map says is narrower and purely
 * presentational — **a reader told about fish twice in two consecutive
 * sentences has been told about fish twice.** It is consulted in exactly one
 * place, `factKey` below, whose only job is deciding which two SENTENCES are
 * one sentence.
 *
 * Measured verbatim in headless Chrome at 390 px before it existed, Sprig &
 * Fern Tawa's *Potato, Rosemary + Basil Pesto* with `contains-fish` in the
 * avoid list, ticking Salmon:
 *
 *   "Salmon contains fish — you asked to avoid it. Salmon is fish, so this is
 *    no longer vegetarian. …"
 *
 * `050`'s merge could not see it: it keys on the literal tag, and here the
 * allergen half comes from `contains-fish` while the contradiction half comes
 * from `has-fish`.
 *
 * Fish is the only substance in the vocabulary carried by two tags — `has-meat`
 * has no `contains-meat` (ADR 0092 rejected one), so meat cannot make this
 * shape. Swept 2026-09-08 over all 57 venues: the only other option in the
 * corpus carrying a `has-` and a `contains-` tag at once is Little Sprig's
 * *Cheese & beef gravy* (`contains-dairy` + `has-meat`), which is two
 * substances and stays two sentences. A future pair would be added here, and
 * only here.
 */
const SUBSTANCE = {
  "has-fish": "fish",
  "contains-fish": "fish",
  // The second pair, and the one this comment's "a future pair would be added
  // here" was waiting for (ADR 0140): Bacon now carries `has-meat` AND
  // `contains-pork`, one substance through two tags, and without this line the
  // picker said "Bacon contains pork. Bacon is meat, so this is no longer
  // vegetarian." — 200/070's defect in a new place. Keyed "meat" because pork is
  // the meat; `has-meat` beside `contains-dairy` (Little Sprig's gravy) still
  // names two substances and stays two sentences.
  "has-meat": "meat",
  "contains-pork": "meat",
};

// Substance FIRST: a tag comes from a closed, hyphenated vocabulary and a
// substance name from the map above, so neither can contain a space and one
// space is an unambiguous separator however the option is named. (It read
// `${from}\0${tag}` for about an hour on 2026-09-07 — a literal NUL in a
// shipped module, which git reported by calling the file binary. Nothing needs
// a control character here.)
const factKey = (from, tag) => `${SUBSTANCE[tag] || tag} ${from}`;

/** (option, substance) → the claim labels that fact killed, in the dish's order. */
function claimsKilledBy(dropped) {
  const out = new Map();
  for (const d of dropped) {
    if (d.reason !== "contradicted") continue;
    const key = factKey(d.from, d.allergen);
    const claims = out.get(key) || [];
    const label = CLAIM_LABEL[d.tag] || d.tag;
    // `gf` and `gf-option` are two tags making ONE claim; a dish carrying both
    // must not produce "no longer gluten free or gluten free".
    if (!claims.includes(label)) claims.push(label);
    out.set(key, claims);
  }
  return out;
}

/** "Halloumi contains dairy" — the clause both halves of the merge share. */
const containsClause = (a) => `${a.from} contains ${ALLERGEN_LABEL[a.tag] || a.tag}`;

/**
 * Every sentence the warning line says, for one composed selection.
 *
 * Pure, and exported for that reason: the merges above are the whole of what
 * roadmap `200/050` and `200/070` changed, and a rule this small is one that a
 * sweep can run over the real corpus rather than over a copy of it. A replica
 * of these five loops in a tool would be a second implementation of a safety
 * sentence, correct in every diff and updated in only one place.
 *
 * `flagged` is whether any allergen the SELECTION added is on the reader's own
 * avoid list — the loud treatment on the warning, returned rather than
 * recomputed so the class and the sentences cannot disagree about it.
 */
export function warningLines(added, dropped, avoidSet) {
  const lines = [];
  const killed = claimsKilledBy(dropped);
  // Which (option, substance) facts have already been said by the allergen
  // block, so the contradiction block below does not say them a second time.
  const spoken = new Set();
  const lost = (from, tag) => {
    const claims = killed.get(factKey(from, tag));
    if (!claims) return "";
    spoken.add(factKey(from, tag));
    return ` no longer ${joinList(claims, "or")}`;
  };

  // Flagged allergens first and loudest: this is the reader's own list, and
  // it is the reason they will look at all.
  const hit = added.filter((a) => avoidSet.has(a.tag));
  for (const a of hit) {
    const also = lost(a.from, a.tag);
    lines.push(
      `${containsClause(a)} — you asked to avoid it${also ? `, and this is${also}` : ""}.`,
    );
  }
  // Then allergens they did not flag, stated plainly rather than as a warning.
  for (const a of added.filter((a) => !avoidSet.has(a.tag))) {
    const also = lost(a.from, a.tag);
    lines.push(`${containsClause(a)}${also ? `, so this is${also}` : ""}.`);
  }
  // Facts first, one per (option, substance), exactly as before. The absences
  // are held back and said once at the end — the order is the point: what we
  // KNOW leads.
  const unstated = [];
  for (const d of dropped) {
    if (d.reason !== "contradicted") {
      unstated.push(d);
      continue;
    }
    const key = factKey(d.from, d.allergen);
    if (spoken.has(key)) continue; // the allergen line above already said it
    spoken.add(key);
    lines.push(`${d.from} ${carries(d.allergen)}, so this is no longer ${joinList(killed.get(key), "or")}.`);
  }
  if (unstated.length > 0) lines.push(unstatedLine(unstated));

  return { lines, flagged: hit.length > 0 };
}

/**
 * Everything a configuration says about safety, in one call: the composed tags,
 * the sentences, and whether the reader's own avoid list is hit. The picker (on
 * every tick) and the order sheet's finish control (before it commits) both ask
 * THIS, so a dish finished on the sheet is warned about exactly as the same dish
 * configured on the menu — never a second composition. `notice` is the picker's
 * one-off cap line, appended after the allergen text.
 */
export function configurationWarning(dishTags, selection, avoidSet, notice) {
  const { tags, added, dropped } = composeTags(dishTags, selection);
  const { lines, flagged } = warningLines(added, dropped, avoidSet);
  if (notice) lines.push(notice);
  return { tags, lines, flagged: flagged || dishFlagged(tags, avoidSet) };
}
