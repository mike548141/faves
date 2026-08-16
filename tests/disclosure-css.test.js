// The ⓘ disclosure is click-only (ADR 0059). Run: `node --test`.
//
// WHY A STYLESHEET IS BEING GREPPED, WHICH IS NOT THIS REPO'S HABIT. The
// decision ADR 0059 records is a *deletion*: a `:hover ~ .caveat-note` reveal
// that failed WCAG 2.2 SC 1.4.13 on two counts and produced an infinite flicker
// in the settings dialog. A deletion nothing guards is a deletion the next
// session undoes as a kindness — "mouse users get a preview" is a reasonable
// thing to want, and nothing in the CSS would stop them.
//
// The obvious guard — hover the ⓘ in headless Chrome and assert nothing appears
// — WAS BUILT AND THROWN AWAY. Putting the deleted rule back and re-running it,
// the assertion **passed**: a synthetic `Input.dispatchMouseEvent` does not
// raise CSS :hover reliably in that harness, even with `elementFromPoint`
// confirming the coordinates land on the button. It read as coverage and proved
// nothing, which is the exact failure mode this repo has now hit six times.
// `device_check.mjs` keeps the half a browser CAN prove — that a click still
// opens and closes the note — and the invariant lives here, where it is a
// property of the source and cannot be flaky.
//
// WHAT THIS CANNOT PROVE: that the app is accessible, or that some other
// selector does not reveal the note. It proves one specific regression cannot
// come back unnoticed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  fileURLToPath(new URL("../site/css/app.css", import.meta.url)),
  "utf8"
);

// Comments describe the deletion at length and name the rule they removed, so
// they must not be mistaken for the rule itself.
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("no hover reveal on the ⓘ note — it is click-only (ADR 0059)", () => {
  // Any combinator: `~`, `+`, or a descendant reveal. The failure being guarded
  // is "hovering something makes .caveat-note visible", however it is spelled.
  const reveals = [...code.matchAll(/[^{}]*:hover[^{}]*\.caveat-note[^{}]*\{[^}]*\}/g)].map(
    (m) => m[0].replace(/\s+/g, " ").trim()
  );
  assert.deepEqual(
    reveals,
    [],
    "A :hover rule targeting .caveat-note is back. It fails WCAG 2.2 SC 1.4.13 " +
      "(the note vanishes as the pointer crosses the margin toward it, and " +
      "Escape is wired only on the click path) and it flickers where the note " +
      "sits in flow. Supersede ADR 0059 before re-adding one.\n  Found: " +
      reveals.join("\n  ")
  );
});

test("the click path is what shows the note, and it still exists", () => {
  // The other half: having deleted the hover rule, `.is-open` had better be the
  // thing that reveals it, or the ⓘ shows nothing at all on any input.
  assert.match(code, /\.caveat-note\.is-open\s*\{[^}]*display:\s*block/);
  assert.match(code, /\.caveat-note\s*\{[^}]*display:\s*none/);
});
