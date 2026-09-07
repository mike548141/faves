// Does every tag in the CLOSED vocabulary still have reader-facing WORDS on
// every screen that can show it?
//
// The vocabulary is `TAGS` in tools/validate.py — Python. The words are four
// JavaScript tables (menu.js, recipe.js, addons-ui.js) plus Settings' avoid
// list (settings.js). Nothing held the two in step: a tag added to `TAGS` and
// missed in one table renders as whatever that screen's fallback is, on that
// screen only. Silent, partial, and worst on the surface where it matters most
// — an allergen missing from Settings means the reader CANNOT ASK TO AVOID IT
// while the data cheerfully carries it. Owner-ruled 2026-09-07 (roadmap
// 340/230): add this test now; one shared source of truth is the right end
// state and is declined for today.
//
// 🔑 WHY THIS FILE PARSES SOURCE RATHER THAN IMPORTING IT. Three of the five
// surfaces cannot be imported: menu.js and recipe.js both do
// `document.getElementById(...)` at module scope, and none of the three tables
// (`DIETARY`, `ALLERGEN`, `ALLERGEN_LABEL`, `CLAIM_LABEL`, `CARRIES`) is
// exported. Exporting them purely to be testable would change the shipped
// module for the test's convenience. So they are read as text — and a parse
// that rebuilds its input is only trustworthy if it can WRITE THE INPUT BACK
// (ADR 0076). Every parser here re-emits the block it read and compares it to
// the original byte for byte; a shape it half-recognises throws instead of
// quietly yielding fewer entries, because a lenient parse is a check that
// agrees with a broken vocabulary.
//
// Settings IS imported — `ALLERGEN_PREFS`/`DIETARY_PREFS` are exported and the
// module loads under Node (tests/settings.test.js already does it). A real
// value beats a parsed one whenever it is available.
//
// 🚩 WHAT A GREEN RUN HERE CANNOT SHOW YOU: that a label is CORRECT or that it
// is the right words for a reader — only that one exists. And it says nothing
// about whether the tagging on a dish is true, which no test in this repo can.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALLERGEN_PREFS, DIETARY_PREFS } from "../site/js/settings.js";

const ROOT = new URL("../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");

// --- Strict, self-verifying parsers ---------------------------------------
// Each returns what it read AND proves it could re-emit it unchanged.

function block(source, header, terminator, where) {
  const lines = source.split("\n");
  const start = lines.indexOf(header);
  if (start < 0) throw new Error(`${where}: no line reading exactly \`${header}\``);
  const end = lines.indexOf(terminator, start + 1);
  if (end < 0) throw new Error(`${where}: \`${header}\` never closes with \`${terminator}\``);
  return { lines, start, end };
}

function roundTrip(rebuilt, lines, start, end, where) {
  const original = lines.slice(start, end + 1).join("\n");
  if (rebuilt.join("\n") !== original) {
    throw new Error(
      `${where}: the parse could not write its input back unchanged (ADR 0076).\n` +
        `--- read ---\n${original}\n--- re-emitted ---\n${rebuilt.join("\n")}`
    );
  }
}

// 🔑 The separators here are DELIBERATELY loose (`\s*,\s*`) where the re-emit is
// canonical (`", "`). A grammar tight enough to reject every non-canonical line
// would make the round trip a guard that can never fire — ADR 0072's decorative
// guard, wearing ADR 0076's clothes. Loose-in, canonical-out means the round
// trip is the gate that actually catches a re-spaced or re-flowed vocabulary,
// and the regex catches only shapes with no reading at all.
const PY_ROW = /^(\s+)("[a-z0-9-]+"(?:\s*,\s*"[a-z0-9-]+")*)\s*,\s*$/;
const PY_COMMENT = /^\s*#/;

/** A multi-line Python set literal of quoted tags, e.g. `TAGS = {`…`}`. */
function pythonTagSet(source, name, where) {
  const { lines, start, end } = block(source, `${name} = {`, "}", where);
  const tags = [];
  const rebuilt = [lines[start]];
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    if (PY_COMMENT.test(line)) {
      rebuilt.push(line); // a comment carries no tags; re-emitted verbatim
      continue;
    }
    const m = PY_ROW.exec(line);
    if (!m) {
      throw new Error(
        `${where}: line ${i + 1} of \`${name}\` is neither a comment nor a row of ` +
          `quoted tags, so this parser does not understand it: ${JSON.stringify(line)}`
      );
    }
    const row = m[2].split(/\s*,\s*/).map((s) => s.slice(1, -1));
    tags.push(...row);
    rebuilt.push(`${m[1]}${row.map((t) => `"${t}"`).join(", ")},`);
  }
  rebuilt.push(lines[end]);
  roundTrip(rebuilt, lines, start, end, where);
  return tags;
}

const PY_INLINE = /^([A-Z_]+) = \{("[a-z0-9-]+"(?:\s*,\s*"[a-z0-9-]+")*)\}$/;

/** A one-line Python set literal, e.g. `OPTION_ONLY_TAGS = {"a", "b"}`. */
function pythonInlineSet(source, name, where) {
  const lines = source.split("\n");
  const at = lines.findIndex((l) => l.startsWith(`${name} = {`));
  if (at < 0) throw new Error(`${where}: no line starting \`${name} = {\``);
  const m = PY_INLINE.exec(lines[at]);
  if (!m || m[1] !== name) {
    throw new Error(`${where}: \`${name}\` is not a one-line set of quoted tags: ${lines[at]}`);
  }
  const tags = m[2].split(/\s*,\s*/).map((s) => s.slice(1, -1));
  roundTrip([`${name} = {${tags.map((t) => `"${t}"`).join(", ")}}`], lines, at, at, where);
  return tags;
}

// Loose in, canonical out — same reasoning as PY_ROW above.
const JS_ENTRY = /(?:([A-Za-z_$][A-Za-z0-9_$]*)|"([a-z0-9-]+)")\s*:\s*"([^"\\]*)"\s*,\s*/y;
const JS_COMMENT = /^\s*\/\//;

/** One line of a JS object literal: `key: "words",` possibly several per line. */
function jsEntries(line, name, lineNo, where) {
  const indent = line.match(/^\s*/)[0];
  JS_ENTRY.lastIndex = indent.length;
  const entries = [];
  while (JS_ENTRY.lastIndex < line.length) {
    const m = JS_ENTRY.exec(line);
    if (!m) {
      throw new Error(
        `${where}: line ${lineNo} of \`${name}\` is not a run of \`key: "words",\` ` +
          `entries, so this parser does not understand it: ${JSON.stringify(line)}`
      );
    }
    entries.push({ raw: m[1] ?? `"${m[2]}"`, key: m[1] ?? m[2], words: m[3] });
  }
  return { entries, rebuilt: `${indent}${entries.map((e) => `${e.raw}: "${e.words}"`).join(", ")},` };
}

/** A `const NAME = {` … `};` table, returned as tag → words. */
function jsTable(source, name, where) {
  const { lines, start, end } = block(source, `const ${name} = {`, "};", where);
  const table = new Map();
  const rebuilt = [lines[start]];
  for (let i = start + 1; i < end; i++) {
    if (JS_COMMENT.test(lines[i])) {
      rebuilt.push(lines[i]);
      continue;
    }
    const { entries, rebuilt: line } = jsEntries(lines[i], name, i + 1, where);
    for (const e of entries) {
      if (table.has(e.key)) throw new Error(`${where}: \`${name}\` lists ${e.key} twice`);
      table.set(e.key, e.words);
    }
    rebuilt.push(line);
  }
  rebuilt.push(lines[end]);
  roundTrip(rebuilt, lines, start, end, where);
  return table;
}

const SPICY_LINE = /^const isSpicy = \(t\) => \/(.+)\/([a-z]*)\.test\(t\);$/;

/**
 * The heat levels are a REGEX, not a table — so read the regex and run every
 * tag past it. That is what makes a hypothetical `spicy-4` fail here rather
 * than paint as a bare chip.
 */
function spicyMatcher(source, where) {
  const lines = source.split("\n");
  const at = lines.findIndex((l) => l.startsWith("const isSpicy ="));
  if (at < 0) throw new Error(`${where}: no \`const isSpicy =\` line`);
  const m = SPICY_LINE.exec(lines[at]);
  if (!m) throw new Error(`${where}: \`isSpicy\` is not a plain regex test: ${lines[at]}`);
  roundTrip([`const isSpicy = (t) => /${m[1]}/${m[2]}.test(t);`], lines, at, at, where);
  return new RegExp(m[1], m[2]);
}

// --- The vocabulary --------------------------------------------------------

const validatePy = read("tools/validate.py");
const TAGS = pythonTagSet(validatePy, "TAGS", "tools/validate.py");
const OPTION_ONLY = pythonInlineSet(validatePy, "OPTION_ONLY_TAGS", "tools/validate.py");

// --- The five surfaces the ruling names ------------------------------------

const menuJs = read("site/js/menu.js");
const recipeJs = read("site/js/recipe.js");
const addonsUiJs = read("site/js/addons-ui.js");

function chipSurface(source, file) {
  const dietary = jsTable(source, "DIETARY", file);
  const allergen = jsTable(source, "ALLERGEN", file);
  const isSpicy = spicyMatcher(source, file);
  const labelled = new Set([...dietary.keys(), ...allergen.keys(), ...TAGS.filter((t) => isSpicy.test(t))]);
  return { labelled, keys: [...dietary.keys(), ...allergen.keys()] };
}

const menu = chipSurface(menuJs, "site/js/menu.js");
const recipe = chipSurface(recipeJs, "site/js/recipe.js");

const addonAllergen = jsTable(addonsUiJs, "ALLERGEN_LABEL", "site/js/addons-ui.js");
const addonClaim = jsTable(addonsUiJs, "CLAIM_LABEL", "site/js/addons-ui.js");
const addonCarries = jsTable(addonsUiJs, "CARRIES", "site/js/addons-ui.js");

const settingsKeys = [...ALLERGEN_PREFS, ...DIETARY_PREFS].map((p) => p.key);

// A tag is EXEMPT from a surface only with a reason written down. Nothing is
// exempt by default: a word added to `TAGS` lands in none of these maps and so
// fails on all five surfaces at once, loudly, which is the whole point.
const OPTION_ONLY_REASON =
  "option-only (validate.py REJECTS it on a dish) and it deliberately gets no " +
  "chip — ADR 0096: it would paint a second chip saying what the warning line " +
  "already says";
const SPICY_NOT_HERE = (surface) =>
  `heat is not part of ${surface} — no add-on contradiction and no allergy/diet ` +
  "preference names a spicy level, so nothing here has words for one";

const SURFACES = [
  {
    file: "site/js/menu.js",
    what: "the menu's tag chips (DIETARY + ALLERGEN + isSpicy)",
    labelled: menu.labelled,
    tableKeys: menu.keys,
    exempt: Object.fromEntries(OPTION_ONLY.map((t) => [t, OPTION_ONLY_REASON])),
  },
  {
    file: "site/js/recipe.js",
    what: "the recipe page's tag chips (DIETARY + ALLERGEN + isSpicy)",
    labelled: recipe.labelled,
    tableKeys: recipe.keys,
    exempt: Object.fromEntries(OPTION_ONLY.map((t) => [t, OPTION_ONLY_REASON])),
  },
  {
    file: "site/js/addons-ui.js",
    what: "the add-on picker's words (ALLERGEN_LABEL + CLAIM_LABEL + CARRIES)",
    labelled: new Set([...addonAllergen.keys(), ...addonClaim.keys(), ...addonCarries.keys()]),
    tableKeys: [...addonAllergen.keys(), ...addonClaim.keys(), ...addonCarries.keys()],
    exempt: {
      "spicy-1": SPICY_NOT_HERE("the picker"),
      "spicy-2": SPICY_NOT_HERE("the picker"),
      "spicy-3": SPICY_NOT_HERE("the picker"),
    },
  },
  {
    file: "site/js/settings.js",
    what: "Settings' avoid list (ALLERGEN_PREFS + DIETARY_PREFS)",
    labelled: new Set(settingsKeys),
    tableKeys: settingsKeys,
    exempt: {
      "spicy-1": SPICY_NOT_HERE("Settings"),
      "spicy-2": SPICY_NOT_HERE("Settings"),
      "spicy-3": SPICY_NOT_HERE("Settings"),
      // The preference is the CLAIM; dietary.js `DIET_FILTERS` maps each one on
      // to its `-option` form, so ticking "Vegetarian" already reaches `v-option`.
      // A separate row for it would be the same preference offered twice.
      "v-option": "reached by the `v` preference via DIET_FILTERS.satisfies",
      "vg-option": "reached by the `vg` preference via DIET_FILTERS.satisfies",
      "gf-option": "reached by the `gf` preference via DIET_FILTERS.satisfies",
      "df-option": "reached by the `df` preference via DIET_FILTERS.satisfies",
      ...Object.fromEntries(
        OPTION_ONLY.map((t) => [
          t,
          "a fact about an add-on option, not something a reader avoids or seeks",
        ])
      ),
    },
  },
];

// --- The vocabulary parsed out of Python -----------------------------------

test("validate.py's TAGS parses, and to the count we expect", () => {
  // A count, because every assertion below is satisfied by a vocabulary of
  // nothing: an empty or truncated parse would pass the lot in silence.
  assert.equal(TAGS.length, 22, `TAGS parsed as ${TAGS.length} tags: ${TAGS.join(", ")}`);
  assert.equal(new Set(TAGS).size, TAGS.length, "TAGS lists a tag twice");
  assert.ok(TAGS.includes("contains-fish"), "the tag whose landing found this hole");
});

test("OPTION_ONLY_TAGS is part of the vocabulary it narrows", () => {
  assert.equal(OPTION_ONLY.length, 2);
  for (const t of OPTION_ONLY) assert.ok(TAGS.includes(t), `${t} is not in TAGS`);
});

test("a malformed vocabulary is REFUSED, never parsed as fewer tags", () => {
  // ADR 0076's rule, exercised: the parser must not shrug at a shape it does
  // not understand, because "fewer tags" is exactly the answer that makes every
  // completeness assertion below pass.
  const mangled = validatePy.replace('    "spicy-1", "spicy-2", "spicy-3",', '    "spicy-1" "spicy-2",');
  assert.notEqual(mangled, validatePy, "the fixture line moved — update this test");
  assert.throws(() => pythonTagSet(mangled, "TAGS", "fixture"), /does not understand it/);

  // …and a shape it DOES understand but cannot write back is refused too.
  // …and a shape it DOES read but cannot write back is refused too — this is
  // the round trip firing, not the regex, and it is why the regex is loose.
  const respaced = validatePy.replace('    "v", "vg", "gf", "df",', '    "v",  "vg", "gf", "df",');
  assert.notEqual(respaced, validatePy, "the fixture line moved — update this test");
  assert.throws(() => pythonTagSet(respaced, "TAGS", "fixture"), /write its input back unchanged/);

  const gone = validatePy.replace("TAGS = {", "TAGS = {  ");
  assert.throws(() => pythonTagSet(gone, "TAGS", "fixture"), /no line reading exactly/);
});

test("a JS table that is not a plain key/words map is REFUSED", () => {
  const mangled = menuJs.replace('  "contains-soy": "Contains soy",', '  "contains-soy": SOY,');
  assert.notEqual(mangled, menuJs, "the fixture line moved — update this test");
  assert.throws(() => jsTable(mangled, "ALLERGEN", "fixture"), /does not understand it/);

  const respaced = menuJs.replace('  "contains-soy": "Contains soy",', '  "contains-soy":  "Contains soy",');
  assert.notEqual(respaced, menuJs, "the fixture line moved — update this test");
  assert.throws(() => jsTable(respaced, "ALLERGEN", "fixture"), /write its input back unchanged/);
});

// --- Completeness, per surface ---------------------------------------------

for (const s of SURFACES) {
  test(`every tag has reader-facing words in ${s.file} — ${s.what}`, () => {
    assert.ok(s.tableKeys.length > 0, `${s.file}: parsed no entries at all`);
    const missing = TAGS.filter((t) => !s.labelled.has(t) && !(t in s.exempt));
    assert.deepEqual(
      missing,
      [],
      `${s.file} has no label for: ${missing.join(", ")} — either give it words ` +
        "there or record why that surface never shows it (tests/tag-labels.test.js)"
    );
  });

  // The reverse direction is drift too: a label for a word validate.py has
  // never heard of is a rename half-done, or a tag that was retired from the
  // schema and left behind on a screen.
  test(`${s.file} labels nothing outside validate.py's TAGS`, () => {
    const stray = s.tableKeys.filter((k) => !TAGS.includes(k));
    assert.deepEqual(stray, [], `${s.file} labels tags the schema does not know: ${stray.join(", ")}`);
  });

  test(`${s.file}'s exemptions are all still true`, () => {
    for (const [tag, why] of Object.entries(s.exempt)) {
      assert.ok(TAGS.includes(tag), `${s.file} exempts ${tag}, which is no longer in TAGS`);
      assert.ok(
        !s.labelled.has(tag),
        `${s.file} now labels ${tag}, so the exemption ("${why}") is stale — delete it`
      );
      assert.ok(why.length > 20, `${s.file}'s exemption for ${tag} carries no real reason`);
    }
  });
}

// --- The surface the ruling singles out ------------------------------------

test("EVERY allergen in the vocabulary can be avoided in Settings", () => {
  // The sharp one. A `contains-*` tag missing here is not a cosmetic gap: the
  // data carries the allergen and the reader has no way to ask about it.
  const allergens = TAGS.filter((t) => t.startsWith("contains-"));
  assert.ok(allergens.length >= 9, `only ${allergens.length} allergen tags parsed`);
  const offered = new Set(ALLERGEN_PREFS.map((p) => p.key));
  const missing = allergens.filter((t) => !offered.has(t));
  assert.deepEqual(missing, [], `cannot be avoided in Settings: ${missing.join(", ")}`);
});

test("Settings offers nothing it cannot mean", () => {
  for (const p of [...ALLERGEN_PREFS, ...DIETARY_PREFS]) {
    assert.ok(TAGS.includes(p.key), `Settings offers ${p.key}, which is not a schema tag`);
    assert.ok(p.label && p.label.trim().length > 0, `${p.key} has no label`);
  }
});
