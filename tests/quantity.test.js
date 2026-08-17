// Scaling ingredient lines (ROADMAP 17a, ADR 0076).
//
// Every case below that is marked CORPUS is a line taken verbatim from
// site/data/restaurants/cook-at-home.json. The corruption cases in
// "refuses what it cannot do honestly" were all found by RUNNING the parser
// over the corpus, not by reading it — each one shipped a wrong number before
// the guard that now blocks it existed, and the comment names what it printed.

import test from "node:test";
import assert from "node:assert/strict";
import {
  rational, readQuantity, formatRational, scaleLine, scaleLineStatus,
  scaleServes, SCALES, scaleFor, DEFAULT_SCALE,
} from "../site/js/quantity.js";

const HALF = rational(1, 2);
const ONE = rational(1, 1);
const TWO = rational(2, 1);
const THIRD = rational(1, 3);

// --- rationals -------------------------------------------------------------

test("rationals reduce to lowest terms", () => {
  assert.deepEqual(rational(2, 4), { n: 1, d: 2 });
  assert.deepEqual(rational(6, 3), { n: 2, d: 1 });
  assert.deepEqual(rational(0, 5), { n: 0, d: 1 });
});

test("a zero denominator is refused rather than producing Infinity", () => {
  assert.equal(rational(1, 0), null);
});

// --- reading ---------------------------------------------------------------

test("reads every quantity form the corpus uses", () => {
  const cases = [
    ["2 cups milk", 2],              // CORPUS
    ["250g butter, softened", 250],  // CORPUS
    ["½ cup caster sugar", 0.5],     // CORPUS
    ["2¼ cups plain flour", 2.25],   // CORPUS — digit glued to the fraction
    // CORPUS. Written as a division rather than `1 + 2/3`, which is a DIFFERENT
    // float (…65 vs …67) — the exact bug the module's rationals exist to avoid,
    // reproduced here by accident on the first run of this test.
    ["1⅔ cups plain flour", 5 / 3],
    ["1.5 kg potatoes", 1.5],
    ["3/4 cup water", 0.75],
    ["1 1/2 cups water", 1.5],
    ["1 ½ cups water", 1.5],         // space before the fraction
  ];
  for (const [text, want] of cases) {
    const got = readQuantity(text);
    assert.ok(got, `no quantity read from ${text}`);
    assert.equal(got.value.n / got.value.d, want, text);
  }
});

test("a line with no leading quantity reads as none", () => {
  // CORPUS, all four.
  for (const t of ["Pinch of salt", "Garlic", "Butter, to serve", "Approx. 2 cups flour"]) {
    assert.equal(readQuantity(t), null, t);
  }
});

// --- writing ---------------------------------------------------------------

test("writes the fractions a kitchen owns, and refuses the ones it does not", () => {
  assert.equal(formatRational(rational(3, 2)), "1½");
  assert.equal(formatRational(rational(1, 4)), "¼");
  assert.equal(formatRational(rational(9, 8)), "1⅛");
  assert.equal(formatRational(rational(4, 1)), "4");
  // No measuring spoon serves a sixth or a ninth, so these are refused outright
  // rather than approximated — the caller then declines to scale the line.
  assert.equal(formatRational(rational(1, 6)), null);
  assert.equal(formatRational(rational(2, 9)), null);
});

// --- the round trip, which is the whole safety argument --------------------

test("1× is exactly identity on every line of the corpus shape", () => {
  const lines = [
    "2 tbsp fresh lemon juice", "¾ cup (190 ml) white sugar", "Pinch of salt",
    "1–1½ cups chocolate", "3 free-range eggs", "1 x 9-inch pie crust",
    "Lukewarm water (approx. 300–400ml, see method)",
  ];
  for (const t of lines) assert.equal(scaleLine(t, ONE), t, t);
});

test("a line it cannot rebuild byte-for-byte at 1× is never scaled", () => {
  // "01" reads as 1 but would be written back "1" — the round trip fails, so
  // the parser declines rather than silently reformatting the author's text.
  assert.equal(scaleLineStatus("01 cup sugar", TWO).status, "blocked");
});

// --- scaling ---------------------------------------------------------------

test("doubles and halves the ordinary case", () => {
  assert.equal(scaleLine("2 tbsp fresh lemon juice", TWO), "4 tbsp fresh lemon juice");
  assert.equal(scaleLine("250g butter, softened", HALF), "125g butter, softened");
  assert.equal(scaleLine("2¼ cups plain flour", TWO), "4½ cups plain flour");
  assert.equal(scaleLine("¼ cup caster sugar", TWO), "½ cup caster sugar");
});

test("keeps the tail of the line untouched, including a trailing instruction", () => {
  // CORPUS. "plus extra for frying" is not a quantity and must survive intact.
  assert.equal(
    scaleLine("2 tbsp melted butter, plus extra for frying", TWO),
    "4 tbsp melted butter, plus extra for frying"
  );
});

test("only the LEADING quantity moves, never a later number", () => {
  // CORPUS. A scaler that found the last number would print "12 wedges"; a
  // scaler that found the largest would print "1 x 18-inch". Both are absurd
  // and both were live possibilities before this was pinned down.
  assert.equal(
    scaleLine("4 prune plums, not peeled, cut into 6 wedges each", TWO),
    "8 prune plums, not peeled, cut into 6 wedges each"
  );
  assert.equal(scaleLine("1 x 9-inch pie crust", TWO), "2 x 9-inch pie crust");
});

test("a second amount JOINED ON by a conjunction is refused, not half-scaled", () => {
  // CORPUS (Famous Brade, Green Chicken Curry). Until 2026-08-17 this line
  // doubled to "2 cans coconut cream and 1 can coconut milk", status scaled —
  // half the line moved and nothing on screen said so, which is the exact
  // outcome "blocked" exists to prevent. The wedges and pie-crust lines above
  // are the control: a later number that is NOT an amount still scales.
  const s = scaleLineStatus("1 can coconut cream and 1 can coconut milk", TWO);
  assert.equal(s.status, "blocked");
  assert.equal(s.text, "1 can coconut cream and 1 can coconut milk");
  assert.equal(scaleLineStatus("1 tsp salt or 2 tsp flakes", TWO).status, "blocked");
  assert.equal(scaleLineStatus("2 tbsp butter, plus 1 tbsp for the tin", TWO).status, "blocked");
  // A conversion bracket followed by prose with no amount is still fine.
  assert.equal(scaleLine("1 cup flour (125 g) and a pinch of salt", TWO), "2 cups flour (250 g) and a pinch of salt");
});

test("a parenthetical metric conversion scales with its primary", () => {
  // CORPUS — Chocolate Self-Saucing Pudding writes all nine lines this way.
  assert.equal(scaleLine("¾ cup (190 ml) white sugar", TWO), "1½ cups (380 ml) white sugar");
  assert.equal(scaleLine("2 cups (500 ml) boiling water", HALF), "1 cup (250 ml) boiling water");
});

test("a bracket that is prose, not a measure, is left alone", () => {
  assert.equal(scaleLine("2 cups flour (sifted)", TWO), "4 cups flour (sifted)");
});

// --- refusals: every one of these shipped a wrong number in testing --------

test("a RANGE is refused — it printed a range running backwards", () => {
  // CORPUS ×3. Before this guard: "6–8" doubled to "12–8" and "1–1½" to
  // "2–1½". The head parser sees only the first number of a range.
  for (const t of ["1–1½ cups chocolate", "6–8 garlic cloves, crushed", "1–2 level tsp sea salt"]) {
    const got = scaleLineStatus(t, TWO);
    assert.equal(got.status, "blocked", t);
    assert.equal(got.text, t, t);
  }
});

test("an alternative with its own amount is refused", () => {
  // CORPUS. Doubling gave "4 shallots, chopped (or 1 medium red onion)" — the
  // amount is right and the ADVICE is now wrong, which is the harder bug.
  const t = "2 shallots, chopped (or 1 medium red onion)";
  assert.equal(scaleLineStatus(t, TWO).status, "blocked");
  assert.equal(scaleLine(t, TWO), t);
});

test("a metric bracket that will not divide blocks the WHOLE line", () => {
  // Half of "½ cup (125 ml)" is 62.5 ml. Scaling the cup and leaving the
  // millilitres would print "¼ cup (125 ml)" — a line contradicting itself,
  // and the reader believes the precise-looking number. Refuse both halves.
  const t = "½ cup (125 ml) brown sugar"; // CORPUS
  assert.equal(scaleLineStatus(t, HALF).status, "blocked");
  assert.equal(scaleLine(t, HALF), t);
  // …but it doubles perfectly well, so the refusal is per-scale, not per-line.
  assert.equal(scaleLine(t, TWO), "1 cup (250 ml) brown sugar");
});

test("eggs never go fractional", () => {
  // CORPUS. The roadmap's ruling: say so rather than printing "1½ eggs".
  assert.equal(scaleLineStatus("3 free-range eggs", HALF).status, "blocked");
  assert.equal(scaleLineStatus("1 egg", HALF).status, "blocked");
  assert.equal(scaleLineStatus("6 egg yolks", HALF).status, "scaled");
  assert.equal(scaleLine("6 egg yolks", HALF), "3 egg yolks");
  assert.equal(scaleLine("3 free-range eggs", TWO), "6 free-range eggs");
});

test("a value with no kitchen fraction is refused, not approximated", () => {
  // CORPUS. ⅓ halved is ⅙ and no spoon serves a sixth.
  assert.equal(scaleLineStatus("⅓ cup cocoa", HALF).status, "blocked");
  assert.equal(scaleLine("⅓ cup cocoa", HALF), "⅓ cup cocoa");
});

// --- the three statuses ----------------------------------------------------

test("no-quantity is 'none', not 'blocked' — and the difference is the point", () => {
  // "none" needs no warning: a cook seasons to taste anyway. "blocked" is a
  // half-scaled recipe and MUST be shown. Collapsing them would bury ten
  // dangerous lines inside forty harmless ones.
  for (const t of ["Pinch of salt", "Garlic", "Butter or whipped cream, to serve"]) {
    assert.equal(scaleLineStatus(t, TWO).status, "none", t);
  }
  assert.equal(scaleLineStatus("3 eggs, whisked", HALF).status, "blocked");
});

test("a blocked line reports blocked at 1× too, so the warning precedes the choice", () => {
  assert.equal(scaleLineStatus("6–8 garlic cloves, crushed", ONE).status, "blocked");
  assert.equal(scaleLineStatus("2 cups milk", ONE).status, "scaled");
});

// --- plural agreement ------------------------------------------------------

test("the measure word agrees with the number", () => {
  assert.equal(scaleLine("1 cup sugar", TWO), "2 cups sugar");
  assert.equal(scaleLine("3 cups plain flour", THIRD), "1 cup plain flour");
  assert.equal(scaleLine("1 egg", TWO), "2 eggs");
  // At or below one, English is singular: "½ cup", never "½ cups".
  assert.equal(scaleLine("1 cup sugar", HALF), "½ cup sugar");
});

test("an unlisted word keeps the author's form rather than being guessed at", () => {
  // "1 small packet" must not become "2 smalls". Being silent about grammar is
  // always available; being wrong about the amount is not.
  assert.equal(scaleLine("1 small packet dried yeast", TWO), "2 small packet dried yeast");
});

// --- serves ----------------------------------------------------------------

test("serves restates only when it lands on whole people", () => {
  assert.equal(scaleServes(6, TWO), 12);   // CORPUS — the pudding, Tiramisu
  assert.equal(scaleServes(12, HALF), 6);  // CORPUS — Liège Waffles
  assert.equal(scaleServes(6, HALF), 3);
  assert.equal(scaleServes(3, HALF), null); // "serves 1½" is arithmetic, not hospitality
  assert.equal(scaleServes(null, TWO), null);
  assert.equal(scaleServes("6", TWO), 12);
});

// --- the scale list --------------------------------------------------------

test("the offered scales are the ones the UI and the tests share", () => {
  assert.deepEqual(SCALES.map((s) => s.key), ["half", "one", "double", "triple"]);
  assert.deepEqual(scaleFor(DEFAULT_SCALE), ONE);
  assert.deepEqual(scaleFor("nonsense"), ONE); // unknown falls back to 1×, never throws
  assert.deepEqual(scaleFor("half"), HALF);
});
