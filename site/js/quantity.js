// Scaling a recipe: "½ / 1× / 2×" over free-text ingredient lines (ROADMAP 17a).
//
// ── WHY THIS PARSES AT RENDER TIME, WHEN THE ROADMAP SAID NOT TO ──
//
// The roadmap's recommendation was to make quantities STRUCTURED DATA
// (`{ qty, unit, item, note }`) because "parsing NZ home-recipe prose at render
// time will be wrong often enough to be worse than useless, and a wrong quantity
// in a recipe is a ruined dinner". That reasoning is right about the stakes and
// wrong about the only available defence, so this module takes the third path
// neither option named:
//
//   **A line is scaled only if the parser can rebuild it, byte for byte, at 1×.**
//
// `scaleLine()` parses, re-formats at scale 1, and compares to the input. If the
// round trip is not identical the line is returned UNTOUCHED at every scale. So
// the parser is not trusted — it is *tested*, on every line, on every render, by
// a check that cannot pass unless it genuinely understood the line. A pattern it
// half-recognises fails the round trip and is left alone, which is the safe
// outcome. This is `convertTemperatures`' discipline (ADR 0029: "the tightest
// pattern that can do the job") with the proof moved from a one-off tool run
// into the function itself, where it also covers lines written next year.
//
// The consequence worth stating plainly: some lines never scale. "Pinch of
// salt", "Water or milk, as required for a thick batter", "Butter, to serve" —
// these have no quantity to double and are correct unchanged at any scale. That
// is not a gap to apologise for; it is what a cook does with them anyway.
//
// Structured data still wins on ONE thing this cannot do: letting the owner
// override a line the parser reads wrongly. But it cannot read a line wrongly
// and survive the round trip, so the override has nothing to correct — and
// ADR 0047 charges every phone for a field whether a screen renders it or not.
// Derivable beats downloaded. See ADR 0076.
//
// ── EXACT RATIONALS, NEVER FLOATS ──
//
// ⅓ of 1½ is 0.49999999999999994 in binary floating point, and a recipe that
// prints "0.5 cups" where it means "½ cup" has already lost the reader. Every
// quantity here is an integer numerator over an integer denominator, scaled by
// multiplying two rationals. No value is ever approximated until it is
// formatted, and formatting snaps to the fractions a measuring cup actually has.
//
// ── THE TICK KEY IS NOT AFFECTED, BY DESIGN ──
//
// `checklist.js` states the house rule: "HASH THE DATA, NEVER THE RENDER …
// hashing what is displayed would drop every tick on a units change; every
// caller therefore passes the RAW line". A scale change is the same class of
// event as a units flip, so it goes through the same seam: `ingredientBlocks()`
// keeps `line.key` on the raw text and moves `line.text` only. Tick an
// ingredient at 2×, drop to ½×, and the tick is still there.

// --- Rationals -------------------------------------------------------------

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** A quantity as an exact fraction, always in lowest terms with n ≥ 0. */
export function rational(n, d = 1) {
  if (d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), d) || 1;
  return { n: n / g, d: d / g };
}

const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
const toNumber = (r) => r.n / r.d;

// --- Reading a quantity out of prose ---------------------------------------

// The vulgar fractions a recipe actually uses. Written as a map rather than
// derived from Unicode decomposition so the set is explicit and closed: an
// exotic fraction nobody types is better left unparsed than half-handled.
const VULGAR = {
  "½": [1, 2], "⅓": [1, 3], "⅔": [2, 3], "¼": [1, 4], "¾": [3, 4],
  "⅕": [1, 5], "⅖": [2, 5], "⅗": [3, 5], "⅘": [4, 5],
  "⅙": [1, 6], "⅚": [5, 6], "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8],
};
// Only these are ever WRITTEN back out. The fifths and sixths are read (a
// recipe may contain one) but scaling into them would print "⅗ cup", which no
// measuring cup in a New Zealand kitchen can serve. See `formatRational`.
const WRITEABLE = ["½", "⅓", "⅔", "¼", "¾", "⅛", "⅜", "⅝", "⅞"];
const VULGAR_CHARS = Object.keys(VULGAR).join("");

// A quantity token, anchored at the start of the line. In order of preference:
// mixed number with a vulgar fraction ("1½"), mixed with an ascii fraction
// ("1 1/2"), a bare vulgar fraction ("½"), an ascii fraction ("3/4"), a decimal
// ("1.5"), a plain integer ("2"). A separating space is optional before a
// vulgar fraction because both "1½" and "1 ½" occur in the wild.
const QTY = new RegExp(
  "^(?:" +
    `(\\d+)\\s*([${VULGAR_CHARS}])` + "|" + // 1½
    "(\\d+)\\s+(\\d+)\\/(\\d+)" + "|" +     // 1 1/2
    `([${VULGAR_CHARS}])` + "|" +           // ½
    "(\\d+)\\/(\\d+)" + "|" +               // 3/4
    "(\\d+\\.\\d+)" + "|" +                 // 1.5
    "(\\d+)" +                              // 2
  ")"
);

/**
 * The quantity at the head of `text`, or null.
 * @returns {{value: {n:number,d:number}, raw: string}|null}
 */
export function readQuantity(text) {
  const m = QTY.exec(text);
  if (!m) return null;
  const [raw, iv, v, iw, iwn, iwd, bare, an, ad, dec, int] = m;
  let value = null;
  if (v) value = rational(Number(iv) * VULGAR[v][1] + VULGAR[v][0], VULGAR[v][1]);
  else if (iw) value = rational(Number(iw) * Number(iwd) + Number(iwn), Number(iwd));
  else if (bare) value = rational(VULGAR[bare][0], VULGAR[bare][1]);
  else if (an) value = rational(Number(an), Number(ad));
  // A decimal is exact in base 10 and we keep it that way: 1.5 → 15/10 → 3/2.
  else if (dec) {
    const places = dec.length - dec.indexOf(".") - 1;
    value = rational(Math.round(Number(dec) * 10 ** places), 10 ** places);
  } else if (int) value = rational(Number(int), 1);
  return value ? { value, raw } : null;
}

// --- Writing one back out --------------------------------------------------

/**
 * A quantity as a cook would write it: a whole number, a vulgar fraction, or a
 * mixed number. Returns null when the value cannot be said honestly in the
 * fractions a kitchen owns — the caller then declines to scale the line rather
 * than inventing "0.83 cups".
 *
 * The eighths are included because halving a quarter is a real and ordinary
 * operation; fifths and sixths are not, because no measure carries them.
 */
export function formatRational(r) {
  if (!r || r.n < 0) return null;
  if (r.d === 1) return String(r.n);
  const whole = Math.floor(r.n / r.d);
  const rem = rational(r.n - whole * r.d, r.d);
  const glyph = WRITEABLE.find((g) => VULGAR[g][0] === rem.n && VULGAR[g][1] === rem.d);
  if (!glyph) return null;
  return whole ? `${whole}${glyph}` : glyph;
}

/**
 * How the quantity should be WRITTEN given how it was written before.
 *
 * A recipe that says "1.5 kg" scaled by 2 should say "3 kg", not "3.0"; one
 * that says "0.5" and doubles reads "1". But a line written with a decimal that
 * lands on a fraction ("1.5" halved) has no honest decimal form a cook wants —
 * "0.75" is worse than "¾" — so fractions are preferred once the value is not
 * whole, whichever way the original was written. The one thing never done is
 * printing a repeating decimal.
 */
function writeQuantity(r) {
  if (r.d === 1) return String(r.n);
  return formatRational(r);
}

// --- What must never be scaled ---------------------------------------------

// A RANGE. "1–1½ cups chocolate" holds two quantities and the head parser sees
// only the first, so scaling it prints "2–1½ cups" — a range that runs
// backwards. `6–8 garlic cloves` doubles to `12–8`. This was found by running
// the parser over the corpus, not by reading it: three lines carry a range and
// all three corrupted. Both en-dash and hyphen occur; "1 to 2" is included
// because it is the same thought spelled out.
const RANGE_AFTER_QTY = /^\s*(?:[-–—]|to\s+\d)/;

// AN ALTERNATIVE with its own amount. "2 shallots, chopped (or 1 medium red
// onion)" — double the shallots and the bracket still offers one onion, so the
// line now says two different things. The amount is not wrong, the ADVICE is,
// and a reader following the bracket halves the recipe without knowing.
const ALTERNATIVE = /\(\s*or\b[^)]*\d/i;

// A SECOND AMOUNT JOINED ON. "1 can coconut cream and 1 can coconut milk" —
// the head parser scales the cream and leaves the milk, and the line reads
// "2 cans coconut cream and 1 can coconut milk", status scaled, nothing on
// screen to say half of it moved. Found by this repo's 2026-08-17 cold review
// on a real corpus line (Famous Brade, Green Chicken Curry); the ranged and
// bracketed shapes above were caught and this one, a conjunction, was not.
// Only a quantity INTRODUCED BY a joining word is refused: "4 plums, cut into
// 6 wedges each" carries a second number that is not an amount to scale, and
// "1 x 9-inch pie crust" scales correctly as it is. Tested with brackets
// removed, so the conversion bracket keeps its own rule below.
const CONJOINED_QTY = /\b(?:and|or|plus|with|&)\s+(?:\d|[½⅓¼¾⅔⅛⅜⅝⅞])/i;

// --- Countables: the egg problem -------------------------------------------

// Things a recipe counts rather than measures. Halving these is where scaling
// stops being arithmetic: "1½ eggs" is not an instruction, it is a shrug. The
// roadmap's ruling is to be honest rather than to print it, so a fractional
// countable is refused and the line is left at its written amount.
//
// Deliberately NOT a general "no unit means countable" rule: "2 onions" halves
// to "1 onion" perfectly well, and "3 rashers" to "1½ rashers" is fine because
// you can cut a rasher. Only the genuinely indivisible are listed.
const COUNTABLE = /\b(eggs?|egg yolks?|egg whites?)\b/i;

// --- The public operation --------------------------------------------------

/**
 * `text` with its leading quantity multiplied by `scale`, or `text` unchanged.
 *
 * Unchanged is returned whenever the line cannot be scaled *provably*:
 *   - no quantity at the head of the line ("Pinch of salt")
 *   - the scaled value has no honest kitchen fraction (⅓ of ⅔ is 2/9)
 *   - the line counts something indivisible and would land off a whole (eggs)
 *   - **the round trip fails**: re-writing the parsed quantity at scale 1 does
 *     not reproduce the original characters exactly. This is the guard that
 *     lets the parser be liberal without being dangerous — a line it only
 *     half-understood cannot survive it, so a misread can never reach a reader.
 *
 * A parenthetical second measure — "1½ cups (375 ml) white sugar", which the
 * corpus writes by hand — is scaled TOO, and by the same round-trip rule. A
 * line that scaled its cups and left its millilitres would be actively
 * misleading, which is worse than not scaling at all, so if the bracket cannot
 * be scaled provably then neither half is.
 *
 * @param {string} text
 * @param {{n:number,d:number}} scale
 * @returns {string}
 */
export function scaleLine(text, scale) {
  return scaleLineStatus(text, scale).text;
}

/**
 * `scaleLine` with the reason attached. Status is one of:
 *
 *   "scaled"  — the amount was multiplied and the text rewritten.
 *   "none"    — there is no amount here to multiply ("Pinch of salt", "Garlic",
 *               "Butter, to serve"). Correct unchanged at every scale, and the
 *               reader needs no telling: a cook seasons to taste anyway.
 *   "blocked" — 🚩 there IS an amount and we refused it. THIS IS THE ONE THE UI
 *               MUST SHOW.
 *
 * ── Why "blocked" has to be a distinct status, and not just "unchanged" ──
 *
 * A line with no quantity is safe to leave alone silently. A line that HAS a
 * quantity and is left alone is a **half-scaled recipe** — the flour doubled,
 * the chocolate did not, and nothing on screen says so. That is worse than
 * refusing to scale the recipe at all, because it looks finished. Forty lines
 * of the corpus are "none" and want no apology; roughly ten are "blocked" and
 * are the whole safety problem. Collapsing the two would hide the dangerous
 * ones inside a crowd of harmless ones.
 */
export function scaleLineStatus(text, scale) {
  const none = { text, status: "none" };
  if (typeof text !== "string" || !scale) return none;
  const head = readQuantity(text);
  if (!head) return none;
  const rest = text.slice(head.raw.length);
  const blocked = { text, status: "blocked" };

  // 1× runs the WHOLE pipeline and then discards the rewrite, keeping the
  // author's own characters. Two things fall out of doing it this way round
  // rather than returning early: byte-identity at 1× is guaranteed by
  // construction rather than asserted, and a range still reports "blocked" at
  // 1×, so the UI can warn a reader BEFORE they pick a scale instead of after.
  const identity = scale.n === scale.d;

  if (RANGE_AFTER_QTY.test(rest)) return blocked;
  if (ALTERNATIVE.test(text)) return blocked;
  if (CONJOINED_QTY.test(rest.replace(/\([^)]*\)/g, ""))) return blocked;

  // The round trip, on the head quantity: could we have written what we read?
  // One tolerated difference: "1 ½" is written back as "1½", so compare with
  // whitespace collapsed — spacing alone never blocks a scale, while any
  // difference in the DIGITS still does.
  if (writeQuantity(head.value) !== head.raw.replace(/\s+/g, "")) return blocked;

  const scaled = mul(head.value, scale);
  if (COUNTABLE.test(text) && scaled.d !== 1) return blocked;
  const written = writeQuantity(scaled);
  if (written == null) return blocked;

  let out = written + pluralise(rest, toNumber(scaled));

  // The parenthetical conversion, if there is one — "¾ cup (190 ml)", which the
  // Chocolate Self-Saucing Pudding writes on all nine of its lines. Scoped to a
  // bracket holding ONLY a number and a unit, before any other bracket:
  // "(190 ml)" scales, "(from a jar)" is prose and is left alone.
  //
  // 🚩 If the bracket is present and CANNOT be scaled, the whole line is
  // blocked. A line that scaled its cups and left its millilitres would
  // contradict itself on screen — "1½ cup (190 ml)" — and of the two numbers
  // the reader will believe the precise-looking one. That is the worst outcome
  // available, so it is refused outright: half of ½ cup (125 ml) is 62.5 ml,
  // and a bracket exists to give an exact figure, never a fraction of one.
  const bracket = /^([^(]*)\((\s*)(\d+(?:\.\d+)?)(\s*[a-zA-Z]+\s*)\)/.exec(out);
  if (bracket) {
    const [m, pre, sp, num, unit] = bracket;
    const inner = readQuantity(num);
    if (!inner || writeQuantity(inner.value) !== num) return blocked;
    const w = mul(inner.value, scale);
    if (w.d !== 1) return blocked;
    out = out.replace(m, `${pre}(${sp}${w.n}${unit})`);
  }
  return { text: identity ? text : out, status: "scaled" };
}

// --- Plural agreement ------------------------------------------------------

// "2 cup sugar" and "1 cups plain flour" are both wrong, and a recipe page that
// prints them looks machine-made. Only a CLOSED list of measure and count words
// is touched — the word after a quantity is as often an adjective ("1 small
// packet") or the item's first word ("2 garlic cloves") as it is the unit, and
// a general pluraliser would produce "2 smalls" and "2 garlics". Every word
// here was measured in the corpus. Anything unlisted keeps exactly the form the
// recipe author wrote, which is never wrong about the AMOUNT — only, at worst,
// about the grammar.
const PLURALS = {
  cup: "cups", teaspoon: "teaspoons", tablespoon: "tablespoons",
  clove: "cloves", can: "cans", packet: "packets", jar: "jars", tin: "tins",
  slice: "slices", egg: "eggs", yolk: "yolks", white: "whites",
  shallot: "shallots", onion: "onions", plum: "plums", banana: "bananas",
  rasher: "rashers", sheet: "sheets", stick: "sticks", sprig: "sprigs",
};
const SINGULARS = Object.fromEntries(Object.entries(PLURALS).map(([s, p]) => [p, s]));

/** `rest` (the line after its quantity) with the measure word agreeing with `n`. */
function pluralise(rest, n) {
  return rest.replace(/^(\s*)([A-Za-z]+)(\s+[A-Za-z]+)?/, (m, sp, word, next) => {
    const lower = word.toLowerCase();
    // A COMPOUND count noun pluralises on its second word, not its first:
    // "6 egg yolks" halves to "3 egg yolks", never "3 eggs yolks". Detected by
    // the next word being a count noun too, which is what makes it a compound.
    const after = next?.trim().toLowerCase();
    if (after && (after in PLURALS || after in SINGULARS)) return m;
    // Singular at one AND below it: English says "½ cup", not "½ cups", so the
    // test is "is this at most one", not "is this exactly one".
    const one = n <= 1;
    const want = one ? (SINGULARS[lower] ?? (lower in PLURALS ? lower : null))
                     : (PLURALS[lower] ?? (lower in SINGULARS ? lower : null));
    if (!want || want === lower) return m;
    // Keep the author's capitalisation: "Cups" stays "Cups". `next` is matched
    // only to detect a compound and must be handed back exactly as it came.
    const cased = word[0] === word[0].toUpperCase() ? want[0].toUpperCase() + want.slice(1) : want;
    return sp + cased + (next ?? "");
  });
}

/** The scales offered to the reader. Kept here so the UI and tests share one list. */
export const SCALES = [
  { key: "half", label: "½×", value: rational(1, 2) },
  { key: "one", label: "1×", value: rational(1, 1) },
  { key: "double", label: "2×", value: rational(2, 1) },
  { key: "triple", label: "3×", value: rational(3, 1) },
];

export const DEFAULT_SCALE = "one";

/** The scale for a key, falling back to 1× for anything unrecognised. */
export const scaleFor = (key) =>
  (SCALES.find((s) => s.key === key) ?? SCALES.find((s) => s.key === DEFAULT_SCALE)).value;

/**
 * `serves` restated at a scale, when the recipe states one at all.
 * Returns null when it does not, or when the scaled figure is not a whole
 * number of people — "serves 3½" is arithmetic, not hospitality.
 */
export function scaleServes(serves, scale) {
  const n = typeof serves === "number" ? serves : Number(String(serves ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const scaled = mul(rational(Math.round(n * 100), 100), scale);
  return scaled.d === 1 ? scaled.n : null;
}
