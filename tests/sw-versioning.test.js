// Static invariants of the split-versioning service worker (site/sw.js,
// ADR 0015). sw.js is browser-API code node can't execute, so this asserts the
// *shape* of the shipped file — the constants exist, the two caches derive from
// two independent version stamps, and the shell/data split holds (index.json is
// data, not shell). Runtime SW behaviour — install skips the unchanged cache,
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

test("two independent version constants exist and are well-formed", () => {
  const shell = constValue("SHELL_VERSION");
  const data = constValue("DATA_VERSION");
  assert.match(shell, /^\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.match(data, /^\d{4}-\d{2}-\d{2}\.\d+$/);
});

test("cache names derive from their own version constant", () => {
  assert.match(src, /const SHELL_CACHE = `faves-shell-\$\{SHELL_VERSION\}`;/);
  assert.match(src, /const DATA_CACHE = `faves-data-\$\{DATA_VERSION\}`;/);
  // The image cache is deliberately version-free: it survives every bump.
  assert.match(src, /const IMG_CACHE = "faves-img-v1";/);
});

test("index.json is data, not shell — the split's whole point", () => {
  // The SHELL precache list must NOT contain the menu index; it belongs to the
  // data cache so a menu edit (DATA_VERSION bump) refetches it without the shell.
  const shellBlock = src.slice(
    src.indexOf("const SHELL = ["),
    src.indexOf("];", src.indexOf("const SHELL = ["))
  );
  assert.ok(
    !shellBlock.includes("data/index.json"),
    "data/index.json must not be in the SHELL list (it's data)"
  );
  assert.match(src, /const DATA_INDEX = "data\/index\.json";/);
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

test("activate keeps exactly the three current caches", () => {
  assert.match(
    src,
    /const keep = new Set\(\[SHELL_CACHE, DATA_CACHE, IMG_CACHE\]\);/
  );
});
