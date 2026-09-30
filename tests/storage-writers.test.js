// Every module that writes user storage, by name (roadmap 510/040, ADR 0146 §4).
// Run: `node --test`.
//
// THE RULE THIS HOLDS: an app update may change a person's data only through
// the upgrade chain (user-schema.js) and the named import modes
// (personal-data.js `IMPORT_MODES`, and sync's write-back). Everything else
// that writes is a store writing its OWN key because the person just did
// something. This test cannot read intent, so it does the next best thing: it
// lists every module whose code can write browser storage, and fails the
// moment a module not on the list gains that power — or one on the list loses
// it, so the list cannot rot into a comfortable over-approximation.
//
// If this fails because you added a writer: that is the review point. Say in
// WRITERS why the module writes, and which key. If it rewrites data that was
// already there because the app changed (a migration), it belongs in the chain
// instead — see the header of site/js/user-schema.js.
//
// What counts as a write: `.setItem(`, `.removeItem(`, `<something>Storage.clear(`,
// or naming `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie`
// at all (reaching the raw object is the power to write it). Comments are
// stripped first. A static scan; a module that reached storage through some
// cleverer path would evade it, and code review is what catches that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const SITE_JS = new URL("../site/js/", import.meta.url);

const WRITERS = {
  "store.js": "the storage primitive: probes localStorage once, falls back to memory",
  "user-schema.js": "THE UPGRADE CHAIN — the only code that rewrites data because the app changed",
  "personal-data.js": "the named import modes (merge / replace) and nothing else",
  "sync.js": "sync's write-back of an agreed merge, its pairing and its base",
  "profiles.js": "the profile registry; also copies pre-profile keys forward once (a pre-chain migration, 2026-08)",
  "favourites.js": "its own key: hearts",
  "ratings.js": "its own key: ratings",
  "notes.js": "its own key: recipe notes",
  "recipes.js": "its own key: personal recipes, the device's cookbook (510/050)",
  "settings.js": "its own key: settings, including allergen flags",
  "cart.js": "its own key: the order tally (and, via createOrder, the shopping list)",
  "checklist.js": "its own key: cook-mode ticks",
  "cook.js": "its own key: running cook-mode timers",
  "geo-consent.js": "its own key: the location ask's “don't ask again”",
  "geo.js": "sessionStorage: the last “Near me” origin, this tab only",
  "storage-persist.js": "its own key: that this browser was asked to keep the data (510/090)",
};

const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const WRITES =
  /\.setItem\s*\(|\.removeItem\s*\(|\b\w*[sS]torage\w*\.clear\s*\(|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/;

function writersNow() {
  const files = readdirSync(SITE_JS).filter((f) => f.endsWith(".js"));
  const out = files.filter((f) => WRITES.test(strip(readFileSync(new URL(f, SITE_JS), "utf8"))));
  // The service worker has no localStorage, but IndexedDB and cookies are not
  // out of its reach, so it is scanned too and must stay off the list.
  const sw = strip(readFileSync(new URL("../sw.js", SITE_JS), "utf8"));
  if (WRITES.test(sw)) out.push("../sw.js");
  return out.sort();
}

test("every module that writes user storage is named, and no other does", () => {
  const now = writersNow();
  const named = Object.keys(WRITERS).sort();
  const added = now.filter((f) => !named.includes(f));
  const gone = named.filter((f) => !now.includes(f));
  assert.deepEqual(added, [], `new writer(s) of user storage: ${added.join(", ")} — see this file's header`);
  assert.deepEqual(gone, [], `named but no longer writing (take them off the list): ${gone.join(", ")}`);
});

test("the scan can see a writer", () => {
  // Break-probe for the scanner itself: each form must be caught, and a
  // comment mentioning one must not be.
  for (const src of [
    "storage.setItem('faves.x', '1')",
    "s.removeItem(k)",
    "sessionStorage.getItem('a')",
    "const l = localStorage;",
    "indexedDB.open('faves-user')",
    "deviceStorage.clear()",
    "document.cookie = 'a=1'",
  ]) {
    assert.ok(WRITES.test(strip(src)), `missed: ${src}`);
  }
  assert.ok(!WRITES.test(strip("// localStorage.setItem is not called here\nconst a = 1;")));
  assert.ok(!WRITES.test(strip("ratings.clear(entry); order.clear();")), "a store's own clear() is not a raw write");
});
