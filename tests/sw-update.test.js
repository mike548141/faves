// Unit tests for site/js/sw-update.js — the decision rules behind the PWA
// update flow (ADR 0027). The service-worker plumbing itself can only be
// exercised on a device; these cover the parts that decide *whether* to act:
// what counts as a resume, how often a resume may check, when an installed
// worker is worth announcing, and which controller changes may reload the page.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHECK_INTERVAL_MS,
  isResume,
  isUpdateReady,
  createUpdateGate,
  createReloadGuard,
} from "../site/js/sw-update.js";

test("a resume is focus, or visibilitychange on the way back in", () => {
  assert.equal(isResume("focus", "visible"), true);
  assert.equal(isResume("focus", "hidden"), true); // focus implies foreground
  assert.equal(isResume("visibilitychange", "visible"), true);
  // Leaving: nobody is waiting on the answer.
  assert.equal(isResume("visibilitychange", "hidden"), false);
  assert.equal(isResume("blur", "visible"), false);
});

test("an installed worker is only news when something already controlled the page", () => {
  assert.equal(isUpdateReady("installed", true), true);
  // First-ever install: no older version to replace, nothing to announce.
  assert.equal(isUpdateReady("installed", false), false);
  assert.equal(isUpdateReady("installing", true), false);
  assert.equal(isUpdateReady("activated", true), false);
});

test("the gate lets the first resume through, then throttles", () => {
  let clock = 1000;
  const gate = createUpdateGate({ intervalMs: 5000, now: () => clock });
  assert.equal(gate.claim("focus", "visible"), true);
  clock += 4999;
  assert.equal(gate.claim("focus", "visible"), false);
  clock += 1;
  assert.equal(gate.claim("focus", "visible"), true);
});

test("a phone flicking between apps can't hammer the origin", () => {
  let clock = 0;
  const gate = createUpdateGate({ intervalMs: CHECK_INTERVAL_MS, now: () => clock });
  let checks = 0;
  for (let i = 0; i < 50; i++) {
    clock += 1200; // a switch away and back every ~1.2 s for a minute
    if (gate.claim("visibilitychange", "visible")) checks++;
  }
  assert.equal(checks, 1);
});

test("a non-resume event never claims, and never spends the interval", () => {
  let clock = 0;
  const gate = createUpdateGate({ intervalMs: 5000, now: () => clock });
  assert.equal(gate.claim("visibilitychange", "hidden"), false);
  assert.equal(gate.lastCheckedAt(), null);
  assert.equal(gate.claim("focus", "visible"), true);
});

test("`since` seeds the throttle, so the page load itself counts as a check", () => {
  let clock = 10_000;
  const gate = createUpdateGate({ intervalMs: 5000, now: () => clock, since: clock });
  assert.equal(gate.claim("focus", "visible"), false);
  clock += 5000;
  assert.equal(gate.claim("focus", "visible"), true);
});

// A device clock that steps backwards (travel, an NTP correction) would
// otherwise wedge the gate shut for however far it moved.
test("a backwards clock step resets the gate rather than jamming it", () => {
  let clock = 1_000_000;
  const gate = createUpdateGate({ intervalMs: 5000, now: () => clock });
  assert.equal(gate.claim("focus", "visible"), true);
  clock -= 3_600_000; // an hour back
  assert.equal(gate.claim("focus", "visible"), true);
});

test("a controller change nobody asked for does not reload the page", () => {
  const guard = createReloadGuard();
  // Another tab tapped Refresh: this page must not be yanked mid-order.
  assert.equal(guard.shouldReload(), false);
});

test("a requested reload happens exactly once — no reload loop", () => {
  const guard = createReloadGuard();
  guard.request();
  assert.equal(guard.shouldReload(), true);
  assert.equal(guard.shouldReload(), false);
  guard.request();
  assert.equal(guard.shouldReload(), false);
});
