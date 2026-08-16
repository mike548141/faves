// Every link menu.js sends off-site opens in a new window (target="_blank"),
// and 31d requires each one to say so — G201's technique, worded so it never
// promises the app switch the OS may or may not make (site/js/menu.js's
// newWindowWarning()). Run: `node --test`.
//
// WHY THIS IS A SOURCE TEST, NOT A RENDERED-DOM ONE. menu.js is a page script:
// importing it needs `document` at module load (it grabs #menu-root and wires
// initOrderUI()/initBackToTop() etc. as a side effect of import), and this repo
// ships no DOM shim (no jsdom, no npm deps — CLAUDE.md's zero-build rule). The
// real rendering IS exercised, in a real browser, by device_check.mjs and
// boot_check.mjs; what belongs here is the invariant a browser check can't
// cheaply pin down for every future edit: *every* function that opens a new
// window must call the one shared warning helper, not just the ones that do
// today. tests/disclosure-css.test.js established this source-scanning
// pattern in this repo for the same reason — a live check that was tried first
// and found unreliable.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  fileURLToPath(new URL("../site/js/menu.js", import.meta.url)),
  "utf8"
);

// Comments (incl. this file's own prose about target="_blank") must not be
// mistaken for the object-literal `target: "_blank"` the code actually writes.
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Extract every top-level `function name(...) { ... }` by matching braces.
// Not a JS parser — good enough for this file's flat, unnested function style,
// and menu.js has no stray '{'/'}' inside a string or template literal in the
// functions this test cares about.
function extractFunctions(source) {
  const out = {};
  const re = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    const name = m[1];
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    out[name] = source.slice(m.index, i);
    re.lastIndex = i;
  }
  return out;
}

test("every function that opens target=\"_blank\" also calls newWindowWarning() (WCAG G201, 31d)", () => {
  const fns = extractFunctions(code);
  const offenders = Object.entries(fns)
    .filter(([, body]) => /target:\s*"_blank"/.test(body))
    .filter(([, body]) => !/newWindowWarning\(\)/.test(body))
    .map(([name]) => name);
  assert.deepEqual(
    offenders,
    [],
    "Function(s) below open a new window with no newWindowWarning() call — a " +
      "screen-reader user gets no notice before leaving the site. " +
      `Found: ${offenders.join(", ")}`
  );
});

test("the two known off-site links — pickup/maps (addressRow) and order/website (orderCard) — both warn", () => {
  const fns = extractFunctions(code);
  for (const name of ["addressRow", "orderCard"]) {
    assert.ok(fns[name], `expected menu.js to still define ${name}()`);
    assert.match(fns[name], /target:\s*"_blank"/, `${name} should still open in a new window`);
    assert.match(fns[name], /newWindowWarning\(\)/, `${name} should call newWindowWarning()`);
  }
});

test("newWindowWarning() names the guaranteed behaviour, never the app switch", () => {
  const fns = extractFunctions(code);
  assert.ok(fns.newWindowWarning, "expected menu.js to define newWindowWarning()");
  const body = fns.newWindowWarning;
  assert.match(body, /sr-only/, "the warning should be visually hidden, not a new visible affordance");
  assert.match(body, /new window/i, "the warning should name the one guaranteed behaviour");
  assert.doesNotMatch(
    body,
    /open.*app/i,
    'the warning must never promise "open in app" — no API can confirm the OS will (Theme 31)'
  );
});
