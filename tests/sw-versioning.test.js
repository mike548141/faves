// Static invariants of the service worker's caches (site/sw.js, ADR 0015 as
// changed by roadmap 510/030). sw.js is browser-API code node can't execute,
// so this asserts the *shape* of the shipped file — the shell cache derives
// from SHELL_VERSION, the data lives in one permanent store with NO version
// constant, and the shell/data split holds (index.json is data, not shell).
// The data store's own rules run for real in tests/sw-data-store.test.js. Runtime SW behaviour — install skips the unchanged cache,
// activate cleans old caches, offline-after-first-visit — is only verifiable on
// a real device; the manual steps live in ADR 0015. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  fileURLToPath(new URL("../site/sw.js", import.meta.url)),
  "utf8"
);

const VERSION_RE = /"(\d{4}-\d{2}-\d{2}\.\d+)"/;

function constValue(name) {
  const m = src.match(new RegExp(`const ${name} = ${VERSION_RE.source};`));
  assert.ok(m, `${name} must be defined as a "YYYY-MM-DD.N" string`);
  return m[1];
}

test("the shell version constant exists and is well-formed", () => {
  assert.match(constValue("SHELL_VERSION"), /^\d{4}-\d{2}-\d{2}\.\d+$/);
});

// Roadmap 510/030 retired DATA_VERSION: a menu edit is carried by the
// catalogue's fingerprints, not by a constant here. Its return would bring
// back the whole-data-set re-download and the version clashes it caused.
test("DATA_VERSION is retired — the data store is not versioned by a constant", () => {
  assert.doesNotMatch(src, /const DATA_VERSION\b/);
  assert.doesNotMatch(src, /faves-data-\$\{/);
});

test("the shell cache derives from its version; the data store is permanent", () => {
  assert.match(src, /const SHELL_CACHE = `faves-shell-\$\{SHELL_VERSION\}`;/);
  assert.match(src, /const DATA_STORE = "faves-data";/);
  // The image cache is deliberately version-free: it survives every bump.
  assert.match(src, /const IMG_CACHE = "faves-img-v1";/);
});

test("index.json is data, not shell — the split's whole point", () => {
  // The SHELL precache list must NOT contain any data file; data belongs to
  // the data store, so a menu edit refetches only what changed and never the
  // shell (and a shell change never refetches the data).
  const shellBlock = src.slice(
    src.indexOf("const SHELL = ["),
    src.indexOf("];", src.indexOf("const SHELL = ["))
  );
  assert.ok(!shellBlock.includes("data/"), "no data/ file may be in the SHELL list (it's data)");
  assert.match(src, /const DATA_CATALOGUE = "data\/catalogue\.json";/);
});

// Regression guard, added 2026-08-08. `js/dietary.js` shipped 2026-07-23 and
// was never added to SHELL, so it was fetched from the network on demand — and
// cacheFirst() has NO offline fallback on a miss, which meant a menu screen
// simply failed in flight mode. "Offline capable" is a hard constraint, so the
// list is now checked against the directory instead of maintained by memory.
test("every shipped module is precached — no module may be missing from SHELL", () => {
  const shellBlock = src.slice(
    src.indexOf("const SHELL = ["),
    src.indexOf("];", src.indexOf("const SHELL = ["))
  );
  const jsDir = fileURLToPath(new URL("../site/js/", import.meta.url));
  const missing = readdirSync(jsDir)
    .filter((f) => f.endsWith(".js"))
    .filter((f) => !shellBlock.includes(`"js/${f}"`));
  assert.deepEqual(missing, [], `not precached (offline would break): ${missing.join(", ")}`);
});

// ADR 0027. The worker used to call skipWaiting() at the end of install, so a
// new worker served new assets to a page still running the old HTML and
// modules. It now holds in `waiting` until the page asks — which is the whole
// mechanism behind the "newer version is ready" notice, and easy to undo by
// accident when someone next wonders why an update "doesn't apply immediately".
test("install does not skipWaiting — the new worker waits to be asked", () => {
  const installBlock = src
    .slice(
      src.indexOf('self.addEventListener("install"'),
      src.indexOf('self.addEventListener("message"')
    )
    .replace(/^\s*\/\/.*$/gm, ""); // the comment explains the absence; the code must show it
  assert.ok(installBlock.length > 0, "install and message handlers must both exist");
  assert.ok(
    !installBlock.includes("skipWaiting"),
    "install must not call skipWaiting (ADR 0027) — it strands old pages on new assets"
  );
});

test("SKIP_WAITING is the one way out of waiting", () => {
  assert.match(src, /event\.data\.type === "SKIP_WAITING"/);
  assert.match(src, /self\.skipWaiting\(\)/);
});

test("activate keeps exactly the three current caches", () => {
  assert.match(
    src,
    /const keep = new Set\(\[SHELL_CACHE, DATA_STORE, IMG_CACHE\]\);/
  );
});

// ROADMAP 16f, ADR 0032. About's version stamp asks the worker directly for
// its own constants rather than inferring from cache names — the inference
// can't tell a controlling worker's cache from a waiting worker's freshly
// built one. This pins the worker's half of that contract: it must answer
// with its *own* SHELL_VERSION, and for the data the generation ITS pointer
// names (roadmap 510/030) — never a hardcoded value.
test("GET_VERSIONS answers with this worker's own version and data generation", () => {
  assert.match(src, /event\.data\.type === "GET_VERSIONS"/);
  assert.match(src, /type: "VERSIONS", shell: SHELL_VERSION, data \}/);
  assert.match(src, /data = \(await readPointer\(await caches\.open\(DATA_STORE\)\)\)\?\.generation/);
});
