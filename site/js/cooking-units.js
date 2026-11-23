// Recipe quantities in the reader's measures (ROADMAP 18b; ADR 0170, extending
// ADR 0087).
//
// The corpus is written in New Zealand's kitchen: a cup is 250 ml, a tablespoon
// 15 ml, a teaspoon 5 ml, and weights are grams. A US reader sees the same line
// in US customary measures: cups, tablespoons and teaspoons of 8, 1/2 and
// 1/6 of a US fluid ounce, quarts, and ounces and pounds. Everyone else — and
// GB, deliberately — is returned the line untouched (ADR 0170 says why).
//
// Pure and render-time, like units.js: the stored line never changes, and this
// runs AFTER the scaler, on whatever the scaler produced. That order is the
// whole composition story. The scaler works in the author's own units, where
// its exact-rational round trip (ADR 0076) is proven; this module then converts
// the scaled figure ONCE, so 2x and "serve 6" and ounces compose without a
// rounding step in the middle. The tick key is the raw line (checklist.js), so
// none of this can move a tick.
//
// ── THE US DEFINITIONS, AND WHY ──
//
// US customary units are defined from the gallon, 231 cubic inches, which is
// exactly 3.785411784 litres. So a US cup is 236.5882365 ml, a tablespoon 1/16
// of that (14.787 ml) and a teaspoon 1/3 of a tablespoon (4.929 ml). Chosen over
// the "legal cup" of 240 ml that US nutrition labels use, because that is a
// label convention rounded for arithmetic; the cup a US cook owns is marked in
// ounces of the gallon. The difference is 1.4% and nothing here turns on it.
//   NZ cup   250 ml = 1.0567 US cups   (5.7% MORE — the one that matters)
//   NZ tbsp   15 ml = 1.0144 US tbsp
//   NZ tsp     5 ml = 1.0144 US tsp
// 🔑 Spoons are near enough the same measure; the cup is not, which is why
// "2¼ cups" of flour becomes 2⅜ and not 2¼. Weight is the avoirdupois ounce,
// 28.349523125 g, and the pound is 16 of them.
//
// ── WHAT IS NOT DONE, ON PURPOSE ──
//
// Volume is never turned into weight, or the other way round. That needs a
// density per ingredient, and a table of them is a table of claims nothing
// checks ("a cup of flour is 120 g" is 125 in another book). A line written in
// cups stays in cups; a line written in grams stays a weight. Offering grams of
// flour to a US baker is a real idea and is recorded on the roadmap item as
// follow-up, not built.
//
// ── NEVER A HALF-CONVERTED LINE ──
//
// Same doctrine as the scaler's "blocked" (quantity.js): a line that still
// carries a metric amount we did not convert would read, to a US cook, as if it
// had been converted. So the status is three-way and the third is the point:
//   "none"        no measure here, or the reader is not on US measures.
//   "converted"   every amount that names a measure was converted.
//   "unconverted" 🚩 an amount names a measure and we did NOT convert it (a
//                 range, a second amount, a figure with no honest US spelling).
//                 The line comes back exactly as written and the page marks it
//                 "as written", the same mark and the same words as the scaler.

import { unitUsage } from "./units.js";
import { rational, readQuantity, formatRational } from "./quantity.js";

// --- The measures ------------------------------------------------------------

const US_CUP_ML = 236.5882365;
const ML = {
  cup: US_CUP_ML,
  tbsp: US_CUP_ML / 16,
  tsp: US_CUP_ML / 48,
  qt: US_CUP_ML * 4,
};
const NZ_ML = { cup: 250, tbsp: 15, tsp: 5 };
const G_PER_OZ = 28.349523125;
const OZ_PER_LB = 16;

// The largest the snapped figure may sit from the true one, as a share of it.
// A conversion that cannot be spelled within this is refused, not rounded: 5 g
// is 0.18 oz, and "¼ oz" would be 42% more salt. 8% is above the 5.4% the NZ
// cup itself differs from the US one by, so a figure the author wrote as a
// plain fraction always has a spelling, and below the point a cook would call
// the number wrong.
const MAX_ERR = 0.08;

// --- Reading a line ----------------------------------------------------------

const UNIT_WORD = "kg|g|ml|l|litres?|liters?|cups?|tbsp|tablespoons?|tsp|teaspoons?";
const VULGAR = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
// The measure directly after a quantity, which must END there ("2 garlic" is not
// "2 g"; "2 lemons" is not "2 l").
const UNIT_AT_HEAD = new RegExp(`^(\\s*)(${UNIT_WORD})(?![A-Za-z])`, "i");
// Any amount-with-a-measure ANYWHERE in the text — how a second, unconverted
// amount is found. Digits or a vulgar fraction, optional space, a measure word.
const AMOUNT_ANYWHERE = new RegExp(`(?:\\d|[${VULGAR}])\\s*(?:${UNIT_WORD})(?![A-Za-z])`, "i");
const HEDGE = /^(?:approx\.?|approximately|about|around)\s+/i;
// A bracket holding only a number and a weight or volume: "(150g)", "(375 ml)".
const BRACKET = /^\s*\(\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\s*\)/i;

/** What a measure word measures, and in what base: ml for volume, g for weight. */
function measure(word) {
  const w = word.toLowerCase();
  if (w === "g") return { dim: "weight", base: 1, spelled: false };
  if (w === "kg") return { dim: "weight", base: 1000, spelled: false };
  if (w === "ml") return { dim: "volume", base: 1, spelled: false };
  if (w === "l" || w.startsWith("lit")) return { dim: "volume", base: 1000, spelled: false };
  if (w.startsWith("cup")) return { dim: "volume", base: NZ_ML.cup, spelled: true, vessel: "cup" };
  if (w.startsWith("tbsp") || w.startsWith("tablespoon")) {
    return { dim: "volume", base: NZ_ML.tbsp, spelled: w !== "tbsp", vessel: "tbsp" };
  }
  return { dim: "volume", base: NZ_ML.tsp, spelled: w !== "tsp", vessel: "tsp" };
}

// --- Snapping to what a kitchen owns -----------------------------------------

// Every fraction `formatRational` can write, so a snapped figure always has a
// spelling: halves, thirds, quarters, eighths.
const FRACTIONS = [[0, 1], [1, 8], [1, 4], [1, 3], [3, 8], [1, 2], [5, 8], [2, 3], [3, 4], [7, 8]];
const QUARTERS = FRACTIONS.filter(([, d]) => d === 4 || d === 2 || d === 1);
const EIGHTHS = FRACTIONS.filter(([, d]) => d === 8 || d === 4 || d === 2 || d === 1);
const HALVES = FRACTIONS.filter(([, d]) => d === 2 || d === 1);

/**
 * The nearest of `whole + f` for f in `fractions` to `x`, as an exact rational,
 * or null when it is zero or further than MAX_ERR from `x`. Ties go to the
 * smaller figure (a cook who is told "about" wants the safer of two).
 */
function snap(x, fractions) {
  if (!(x > 0)) return null;
  const base = Math.floor(x);
  let best = null;
  for (const whole of [base, base + 1]) {
    for (const [n, d] of fractions) {
      const r = rational(whole * d + n, d);
      const v = r.n / r.d;
      const err = Math.abs(v - x);
      if (v > 0 && (!best || err < best.err - 1e-12)) best = { r, err };
    }
  }
  return best && best.err / x <= MAX_ERR ? best.r : null;
}

/** Ounces as the kitchen says them: eighths under 1, quarters under 8, halves above. */
const ouncesLadder = (oz) => (oz < 1 ? EIGHTHS : oz < 8 ? QUARTERS : HALVES);

/** Ounces spelled out, rolling up to pounds from 16: "9 oz", "1 lb 1½ oz". */
function spellWeight(grams) {
  const oz = grams / G_PER_OZ;
  if (oz < OZ_PER_LB) {
    const r = snap(oz, ouncesLadder(oz));
    if (!r) return null;
    // Snapping 15.9 up lands on 16, which is a pound and not "16 oz".
    return r.n / r.d >= OZ_PER_LB ? "1 lb" : `${formatRational(r)} oz`;
  }
  // A pound and its ounces are one weight, snapped to the half ounce AS A
  // WHOLE, so the error is measured against what the reader will weigh out
  // and not against the leftover ounces.
  const halves = Math.round(oz * 2);
  if (Math.abs(halves / 2 - oz) / oz > MAX_ERR) return null;
  const pounds = Math.floor(halves / (2 * OZ_PER_LB));
  const ounces = rational(halves - pounds * 2 * OZ_PER_LB, 2);
  return ounces.n === 0 ? `${pounds} lb` : `${pounds} lb ${formatRational(ounces)} oz`;
}

/** The vessel a metric volume is best poured into, by size. */
function vesselFor(ml) {
  if (ml >= ML.qt) return "qt";
  if (ml >= ML.cup / 4) return "cup";
  if (ml >= ML.tbsp) return "tbsp";
  return "tsp";
}

const VESSEL_LADDER = { cup: FRACTIONS, tbsp: FRACTIONS, tsp: FRACTIONS, qt: QUARTERS };

/** The unit word for a figure: singular at one and below ("½ cup"), else plural. */
function vesselWord(vessel, r, like) {
  if (vessel === "qt") return "qt";
  if (vessel === "tbsp" || vessel === "tsp") {
    if (!like?.spelled) return vessel;
    const full = vessel === "tbsp" ? "tablespoon" : "teaspoon";
    return cased(like.word, r.n <= r.d ? full : `${full}s`);
  }
  return cased(like?.word ?? "cup", r.n <= r.d ? "cup" : "cups");
}

/** `word` in the capitalisation `like` was written in ("Cups" stays "Cups"). */
const cased = (like, word) => (like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase()
  ? word[0].toUpperCase() + word.slice(1) : word);

// A US spoon is within 1.4% of a NZ one, which is inside what anyone can pour.
// "5 tsp" is therefore not "5⅛ tsp": where the author's own figure is this
// close to the true conversion it IS the answer, and the line keeps its words.
// (The NZ cup is 5.7% off, outside this, so cups do convert.)
const SAME_ENOUGH = 0.03;

/** One amount, in US measures, as text — or null when it has no honest spelling. */
function spell(r, m, word) {
  const value = r.n / r.d;
  if (m.dim === "weight") return spellWeight(value * m.base);
  const ml = value * m.base;
  // A measure the author wrote in a vessel keeps that vessel; ml and litres are
  // poured into whichever US vessel suits the size.
  const vessel = m.vessel ?? vesselFor(ml);
  const x = ml / ML[vessel];
  const kept = m.vessel && Math.abs(x - value) / x <= SAME_ENOUGH ? formatRational(r) : null;
  const snapped = kept ? r : snap(x, VESSEL_LADDER[vessel]);
  const spelled = snapped && formatRational(snapped);
  return spelled ? `${spelled} ${vesselWord(vessel, snapped, m.vessel ? { ...m, word } : null)}` : null;
}

// --- The public operation ------------------------------------------------------

/**
 * `text` (one ingredient line, already scaled) in the reader's cooking measures.
 * `units` is whatever `settings.get().units` holds — a table, a stored word, or
 * junk (units.js `unitUsage` makes all three safe).
 *
 * @returns {{text: string, status: "none"|"converted"|"unconverted"}}
 */
export function convertLine(text, units) {
  const none = { text, status: "none" };
  if (typeof text !== "string" || unitUsage(units).cooking !== "imperial") return none;

  const unconverted = { text, status: "unconverted" };
  const hedge = HEDGE.exec(text)?.[0] ?? "";
  const afterHedge = text.slice(hedge.length);
  const head = readQuantity(afterHedge);
  if (!head) return AMOUNT_ANYWHERE.test(text) ? unconverted : none;

  let rest = afterHedge.slice(head.raw.length);
  const unitAt = UNIT_AT_HEAD.exec(rest);
  if (!unitAt) {
    // "1–1½ cups chocolate": a range, whose far end the head parse cannot see.
    // "1 can (400g) tomatoes": the amount names a measure but the head does not.
    return AMOUNT_ANYWHERE.test(text) ? unconverted : none;
  }
  const word = unitAt[2];
  const m = measure(word);
  rest = rest.slice(unitAt[0].length);
  const headText = spell(head.value, m, word);
  if (!headText) return unconverted;

  // A bracket of the OTHER kind is converted too ("⅔ cup (150g)" → "(5¼ oz)"). A
  // bracket of the SAME kind said the same thing in the author's metric, and
  // after conversion the head already says it in the reader's, so it goes —
  // "1⅝ cups (375 ml)" would be two answers to one question.
  let bracketText = "";
  const br = BRACKET.exec(rest);
  if (br) {
    const bm = measure(br[2]);
    if (bm.dim !== m.dim) {
      const inBracket = readQuantity(br[1])?.value;
      const spelledBracket = inBracket && spell(inBracket, bm, br[2]);
      if (!spelledBracket) return unconverted;
      bracketText = ` (${spelledBracket})`;
    }
    rest = rest.slice(br[0].length);
  }

  // Anything still in the line that names a measure is an amount we did not
  // convert; letting it through would print "1 cup … and 250 ml".
  if (AMOUNT_ANYWHERE.test(rest)) return unconverted;
  return { text: `${hedge}${headText}${bracketText}${rest}`, status: "converted" };
}

/** `convertLine`'s text alone, for the surfaces that do not mark a refusal. */
export const convertQuantities = (text, units) => convertLine(text, units).text;
