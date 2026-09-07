// The two predicates the service worker's precache now turns on (ADR 0100):
//
//   `servedAsHtmlStandIn(url, contentType)` — is this 200 actually Cloudflare
//   Pages' index.html standing in for a path that is not there?
//   `htmlSibling(pathname)` — which precached page answers the extensionless
//   URL Pages' 308 leaves a reader holding?
//
// 🔑 WHY THIS PARSES sw.js RATHER THAN IMPORTING IT. `site/sw.js` is a classic
// service worker: it calls `self.addEventListener` at module scope, so `import`
// throws under Node, and it cannot `import` a helper module either (only a
// `{type:"module"}` worker can, and making the shipped registration depend on
// that — for a test's convenience — would take offline away from any browser
// without it). Moving the predicates into a module would therefore change what
// ships. So they are read out of the shipped file as text and executed: the
// bytes under test are the bytes that run on a phone, which a copy would not be.
//
// The parse REFUSES a shape it does not recognise rather than yielding nothing,
// because "no function found" is the reading that makes every case below pass
// vacuously. Each extraction also asserts the block is PURE — no `self`, no
// `caches`, no `fetch` — since that purity is the only reason it can be run here
// at all.
//
// 🚩 WHAT A GREEN RUN HERE CANNOT SHOW: that Cloudflare Pages still behaves the
// way the truth table assumes. The content types below were curl'd against the
// live site on 2026-09-08 and are frozen here as fixtures; if Pages changes what
// it serves, these stay green and the guard stops matching reality. ADR 0100
// records the measurement. Nor does it show the guard is WIRED — the wiring
// assertions at the bottom read the call sites, and `tools/precache_check.mjs`
// drives a real install.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(fileURLToPath(new URL("../site/sw.js", import.meta.url)), "utf8");
const lines = src.split("\n");

/** A top-level `function name(args) {` … `}` block, refused if not found. */
function topLevelFunction(signature) {
  const start = lines.indexOf(signature);
  if (start < 0) throw new Error(`site/sw.js: no line reading exactly \`${signature}\``);
  const end = lines.indexOf("}", start + 1);
  if (end < 0) throw new Error(`site/sw.js: \`${signature}\` never closes with a bare \`}\``);
  const block = lines.slice(start, end + 1).join("\n");
  for (const forbidden of ["self.", "caches", "fetch(", "await "]) {
    assert.ok(
      !block.includes(forbidden),
      `site/sw.js: \`${signature}\` uses \`${forbidden}\`, so it is no longer the ` +
        "pure predicate this test can run outside a browser — move the impure part out"
    );
  }
  return block;
}

/** A top-level `const NAME = …;` single line, refused if not found. */
function topLevelConst(name) {
  const at = lines.findIndex((l) => l.startsWith(`const ${name} = `));
  if (at < 0) throw new Error(`site/sw.js: no line starting \`const ${name} = \``);
  assert.ok(lines[at].endsWith(";"), `site/sw.js: \`${name}\` is not one complete line`);
  return lines[at];
}

// Built from the shipped source, so a rename or a rewrite fails loudly here.
const servedAsHtmlStandIn = new Function(
  `${topLevelConst("NON_HTML_EXT")}\n${topLevelFunction(
    "function servedAsHtmlStandIn(url, contentType) {"
  )}\nreturn servedAsHtmlStandIn;`
)();
const htmlSibling = new Function(
  `${topLevelFunction("function htmlSibling(pathname) {")}\nreturn htmlSibling;`
)();

// --- The failure Pages actually produces -----------------------------------

const HTML = "text/html; charset=utf-8";

// Every content type on the "must pass" side was measured against the live
// site or is what this repo's two dev servers send. None of them is invented:
// over-refusing bricks the install, so these are the cases that matter most.
const CASES = [
  // [what, url, content-type, must refuse?]
  ["a missing module, exactly as Pages answers it", "js/app.js", HTML, true],
  ["a missing stylesheet", "css/app.css", "text/html", true],
  ["a missing menu index", "data/index.json", HTML, true],
  ["a missing venue menu", "data/restaurants/mcdonalds.json", HTML, true],
  ["a missing icon", "icons/icon-192.png", HTML, true],
  ["a missing webmanifest", "site.webmanifest", "text/html", true],
  ["a missing favicon", "favicon.ico", "text/html", true],
  ["the header's case is not load-bearing", "js/app.js", "TEXT/HTML", true],
  ["a query string does not hide the extension", "js/app.js?v=2", "text/html", true],

  ["the REAL module, as Pages serves it", "js/app.js", "application/javascript", false],
  ["the REAL module, as tools/serve.py serves it", "js/app.js", "text/javascript", false],
  ["the real stylesheet", "css/app.css", "text/css; charset=utf-8", false],
  ["the real webmanifest", "site.webmanifest", "application/manifest+json", false],
  ["the real favicon, as Pages serves it", "favicon.ico", "image/vnd.microsoft.icon", false],
  ["the real favicon, as the harness serves it", "favicon.ico", "image/x-icon", false],
  ["the real menu index", "data/index.json", "application/json", false],

  // The shell's own pages are HTML. Refusing these would refuse every install.
  ["index.html IS html", "index.html", HTML, false],
  ["restaurant.html IS html", "restaurant.html", HTML, false],
  ["recipe.html IS html", "recipe.html", HTML, false],
  ["the scope root IS html", "./", HTML, false],

  // Unknown or absent ⇒ pass. The guard is one-way on purpose.
  ["no content-type header at all", "js/app.js", null, false],
  ["an empty content-type", "js/app.js", "", false],
  ["an extension the guard does not know", "some/thing.weird", HTML, false],
];

for (const [what, url, type, refuse] of CASES) {
  test(`${refuse ? "REFUSES" : "accepts"}: ${what}`, () => {
    assert.equal(servedAsHtmlStandIn(url, type), refuse);
  });
}

// A sweep of the SHIPPED list, not a hand-picked sample. Its value is the hole
// it can find: a SHELL entry whose extension `NON_HTML_EXT` has never heard of
// would sail through a Pages stand-in unnoticed, and no case above would say so.
test("every non-HTML entry in SHELL is covered by the guard", () => {
  const start = lines.indexOf("const SHELL = [");
  const end = lines.indexOf("];", start + 1);
  assert.ok(start >= 0 && end > start, "site/sw.js: SHELL is not the list this test reads");
  const shell = lines
    .slice(start + 1, end)
    .map((l) => l.match(/^\s+"([^"\\]+)",$/))
    .map((m) => {
      assert.ok(m, "site/sw.js: a SHELL row is not a quoted path — update this test");
      return m[1];
    });
  assert.ok(shell.length > 50, `SHELL parsed as ${shell.length} entries`);

  const uncovered = shell.filter(
    (u) => !u.endsWith("/") && !u.endsWith(".html") && !servedAsHtmlStandIn(u, HTML)
  );
  assert.deepEqual(
    uncovered,
    [],
    `these precached paths would accept Pages' HTML stand-in: ${uncovered.join(", ")} ` +
      "— add the extension to NON_HTML_EXT in site/sw.js"
  );

  const htmlPages = shell.filter((u) => u.endsWith("/") || u.endsWith(".html"));
  assert.ok(htmlPages.length >= 4, "the shell should carry `./` and three pages");
  for (const u of htmlPages) {
    assert.equal(
      servedAsHtmlStandIn(u, HTML),
      false,
      `${u} is a page — refusing it as HTML would reject every install`
    );
  }
});

// --- The URL a 308 leaves the reader holding --------------------------------

test("htmlSibling maps an extensionless path to its precached page", () => {
  assert.equal(htmlSibling("/restaurant"), "/restaurant.html");
  assert.equal(htmlSibling("/recipe"), "/recipe.html");
  assert.equal(htmlSibling("/foo/bar"), "/foo/bar.html");
  // A dot in a DIRECTORY name is not an extension on the file.
  assert.equal(htmlSibling("/.well-known/thing"), "/.well-known/thing.html");
});

test("htmlSibling leaves alone everything that already resolves", () => {
  assert.equal(htmlSibling("/restaurant.html"), null);
  assert.equal(htmlSibling("/"), null, "`./` is in SHELL — the root needs no sibling");
  assert.equal(htmlSibling("/js/app.js"), null);
  assert.equal(htmlSibling("/css/app.css"), null);
  assert.equal(htmlSibling("/data/restaurants/mcdonalds.json"), null);
  assert.equal(htmlSibling("/icons/favicon.svg"), null);
  assert.equal(htmlSibling("/sw.js"), null);
});

// --- Wiring. A correct predicate nothing calls is decoration (ADR 0072) ------

test("the install step routes every precached asset through requireAsset", () => {
  const install = src.slice(
    src.indexOf('self.addEventListener("install"'),
    src.indexOf('self.addEventListener("message"')
  );
  assert.ok(install.length > 0, "install and message handlers must both exist");
  const calls = install.match(/requireAsset\(/g) ?? [];
  assert.equal(
    calls.length,
    3,
    `requireAsset is called ${calls.length}× in install; expected 3 — the shell ` +
      "list, the menu index, and each venue menu"
  );
  // fx is deliberately NOT one of them: a missing rates file must not reject
  // the install. It still refuses to CACHE a stand-in.
  assert.match(install, /const usable =\s*\n?\s*fx\.ok && !servedAsHtmlStandIn\(DATA_FX/);
});

test("requireAsset keeps the status guard it is adding to, not replacing", () => {
  const fn = src.slice(
    src.indexOf("function requireAsset(url, res) {"),
    src.indexOf("\n}", src.indexOf("function requireAsset(url, res) {"))
  );
  assert.match(fn, /if \(!res\.ok\) throw new Error/);
  assert.match(fn, /servedAsHtmlStandIn\(url, res\.headers\.get\("content-type"\)\)/);
});

test("cacheFirst falls back to the html sibling before the network", () => {
  const fn = src.slice(
    src.indexOf("async function cacheFirst(req) {"),
    src.indexOf("\n}", src.indexOf("async function cacheFirst(req) {"))
  );
  assert.match(fn, /htmlSibling\(new URL\(req\.url\)\.pathname\)/);
  // Order matters: the sibling lookup must sit BEFORE the network fall-through,
  // or offline still fails on exactly the route this fixes.
  assert.ok(
    fn.indexOf("htmlSibling(") < fn.indexOf("return fetchClean(req)"),
    "the sibling lookup must come before the network fall-through"
  );
});
