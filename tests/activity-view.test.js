// What the activity screen says about the log (Theme 32b): one sentence per
// kind, the day grouping, the system toggle's arithmetic and where a row links.
// The panel's wiring in a real browser is tools/activity_check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { KINDS, SETTINGS_DIALS, makeEntry } from "../site/js/activity.js";
import {
  ACTIVITY_STARTED,
  DIAL_NAMES,
  SENTENCES,
  dayHeading,
  dayI18nKey,
  dayKey,
  fill,
  groupByDay,
  isSystemKind,
  linkFor,
  sentenceOf,
  startedText,
  timeText,
} from "../site/js/activity-view.js";

const AKL = "Pacific/Auckland";
const e = (kind, over = {}) =>
  makeEntry({ at: "2026-11-20T06:00:00Z", kind, subject: { venue: "kk", dish: "won-tons", label: "Fried Won Tons" }, ...over });

test("every kind in the vocabulary has a sentence with no hole left open", () => {
  const sample = {
    "settings.change": { subject: { label: "farKm" } },
    "reset.performed": { subject: { label: "settings" } },
    "profile.switch": { subject: { label: "Ruth" } },
    "app.updated": { subject: {}, from: "2026-11-18.1", to: "2026-11-24.2" },
    "data.updated": { subject: {}, from: "a1", to: "b2" },
    "cache.refreshed": { subject: {} },
    "order.clear": { subject: {} },
  };
  for (const kind of KINDS) {
    const text = sentenceOf(e(kind, sample[kind] || {}));
    assert.ok(text.length > 3, `${kind} has a sentence`);
    assert.ok(!/[{}]/.test(text), `${kind} left a hole: ${text}`);
    assert.ok(!/undefined|null/.test(text), `${kind}: ${text}`);
  }
});

test("sentences read naturally and carry the snapshotted label", () => {
  assert.equal(sentenceOf(e("favourite.add")), "Added Fried Won Tons to your favourites");
  assert.equal(sentenceOf(e("favourite.remove")), "Removed Fried Won Tons from your favourites");
  assert.equal(sentenceOf(e("rating.set", { from: null, to: 4 })), "Rated Fried Won Tons 4 out of 5");
  assert.equal(sentenceOf(e("rating.set", { from: 2, to: 5 })), "Changed your rating of Fried Won Tons from 2 to 5");
  assert.equal(sentenceOf(e("rating.clear", { from: 3 })), "Cleared your rating of Fried Won Tons");
  assert.equal(sentenceOf(e("order.add", { from: 0, to: 1 })), "Added Fried Won Tons to your order");
  assert.equal(sentenceOf(e("order.add", { from: 1, to: 2 })), "Added Fried Won Tons to your order (2 in total)");
  assert.equal(sentenceOf(e("order.remove", { from: 2, to: 1 })), "Took Fried Won Tons down to 1 in your order");
  assert.equal(sentenceOf(e("order.remove", { from: 1, to: 0 })), "Removed Fried Won Tons from your order");
  assert.equal(sentenceOf(e("order.clear", { subject: {}, from: 3, to: 0 })), "Cleared your order");
  assert.equal(sentenceOf(e("profile.switch", { subject: { label: "Ruth" } })), "Switched to Ruth");
  assert.equal(sentenceOf(e("reset.performed", { subject: { label: "everything" } })), "Deleted everything on this device");
});

test("a settings entry names its dial and nothing else", () => {
  for (const dial of SETTINGS_DIALS) {
    assert.ok(DIAL_NAMES[dial], `${dial} has words`);
    // The recorder drops these on the way in; the sentence could not show them if it tried.
    const entry = e("settings.change", { subject: { label: dial, venue: "x" }, from: "contains-peanuts", to: "contains-peanuts" });
    const text = sentenceOf(entry);
    assert.equal(text, `Changed your ${DIAL_NAMES[dial].en} setting`);
    assert.ok(!/peanut/i.test(text));
  }
});

test("an entry with no label falls back to a plain noun, never an empty hole", () => {
  const text = sentenceOf(e("favourite.add", { subject: { venue: "kk" } }));
  assert.equal(text, "Added a favourite to your favourites");
  assert.equal(sentenceOf(e("rating.clear", { subject: { venue: "kk" }, from: 3 })), "Cleared your rating of an item");
});

test("a translator is asked by key, and its answer wins", () => {
  const asked = [];
  const tr = (key, en) => (asked.push(key), key === "activity.s.favouriteAdd" ? "KIA {name}" : en);
  assert.equal(sentenceOf(e("favourite.add"), tr), "KIA Fried Won Tons");
  assert.deepEqual(asked, ["activity.s.favouriteAdd"]);
  const keys = Object.values(SENTENCES).map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length, "no two sentences share a key");
  for (const k of keys) assert.match(k, /^activity\.s\./);
});

test("fill leaves nothing behind for a missing value", () => {
  assert.equal(fill("a {x} b {y}", { x: 1 }), "a 1 b ");
});

test("system kinds are exactly the three the app writes about itself", () => {
  assert.deepEqual(KINDS.filter(isSystemKind).sort(), ["app.updated", "cache.refreshed", "data.updated"]);
});

test("days are the reader's local days, newest first", () => {
  // 10:30Z is 23:30 NZDT on the 23rd; 11:30Z is 00:30 NZDT on the 24th.
  const a = e("favourite.add", { at: "2026-11-23T10:30:00Z" });
  const b = e("favourite.remove", { at: "2026-11-23T11:30:00Z" });
  const c = e("rating.set", { at: "2026-11-22T01:00:00Z", to: 3 });
  const { days, hiddenSystem } = groupByDay([c, a, b], { tz: AKL });
  assert.equal(hiddenSystem, 0);
  assert.deepEqual(days.map((d) => d.key), ["2026-11-24", "2026-11-23", "2026-11-22"]);
  assert.deepEqual(days[0].items.map((x) => x.kind), ["favourite.remove"]);
  assert.equal(dayKey("2026-11-23T11:30:00Z", AKL), "2026-11-24");
  assert.equal(dayKey("2026-11-23T11:30:00Z", "UTC"), "2026-11-23");
});

test("out-of-order input is sorted, and same-second entries keep the order they landed in", () => {
  const first = e("favourite.add", { at: "2026-11-23T01:00:00Z" });
  const second = e("favourite.remove", { at: "2026-11-23T01:00:00Z" });
  const older = e("rating.clear", { at: "2026-11-23T00:00:00Z", from: 2 });
  const { days } = groupByDay([first, second, older], { tz: "UTC" });
  assert.deepEqual(days[0].items.map((x) => x.kind), ["favourite.remove", "favourite.add", "rating.clear"]);
});

test("system entries are held back by default, counted, and leave no empty day", () => {
  const sys = e("data.updated", { at: "2026-11-23T01:00:00Z", subject: {}, from: "a", to: "b" });
  const mine = e("favourite.add", { at: "2026-11-21T01:00:00Z" });
  const hidden = groupByDay([mine, sys], { tz: "UTC" });
  assert.equal(hidden.hiddenSystem, 1);
  assert.deepEqual(hidden.days.map((d) => d.key), ["2026-11-21"]);
  const shown = groupByDay([mine, sys], { tz: "UTC", showSystem: true });
  assert.equal(shown.hiddenSystem, 0);
  assert.deepEqual(shown.days.map((d) => d.key), ["2026-11-23", "2026-11-21"]);
});

test("an empty log groups to nothing", () => {
  assert.deepEqual(groupByDay([], { tz: AKL }), { days: [], hiddenSystem: 0 });
});

test("day headings: today, yesterday, then a dated one (with the year when it is not this one)", () => {
  const now = new Date("2026-11-24T01:00:00Z"); // 14:00 on the 24th in NZDT
  assert.equal(dayHeading("2026-11-24", now, AKL), "Today");
  assert.equal(dayHeading("2026-11-23", now, AKL), "Yesterday");
  assert.match(dayHeading("2026-11-16", now, AKL), /Mon.*16.*Nov/);
  assert.doesNotMatch(dayHeading("2026-11-16", now, AKL), /2026/);
  assert.match(dayHeading("2025-12-31", now, AKL), /2025/);
  assert.equal(dayI18nKey("2026-11-24", now, AKL), "activity.today");
  assert.equal(dayI18nKey("2026-11-23", now, AKL), "activity.yesterday");
  assert.equal(dayI18nKey("2026-11-16", now, AKL), null);
  // Month and year boundaries do not break "yesterday".
  assert.equal(dayHeading("2026-12-31", new Date("2027-01-01T05:00:00Z"), "UTC"), "Yesterday");
});

test("the time is the reader's local time", () => {
  assert.match(timeText("2026-11-23T10:30:00Z", AKL), /11:30\s?pm/i);
  assert.match(timeText("2026-11-23T10:30:00Z", "UTC"), /10:30\s?am/i);
});

test("the start date is the recorder's ship day, in words", () => {
  assert.equal(ACTIVITY_STARTED, "2026-10-18");
  assert.equal(startedText(), "18 October 2026");
});

const where = {
  venueKind: (id) => ({ kk: "venue", "cook-at-home": "recipes", "burgerfuel": "venue" })[id] || null,
  currentDish: (venue, dish) =>
    ({ "kk/won-tons": "won-tons", "kk/old-name": "new-name", "cook-at-home/waffles": "waffles", "burgerfuel/x": "x" })[`${venue}/${dish}`] || null,
};

test("a link goes only where the subject still exists", () => {
  assert.equal(linkFor(e("favourite.add"), where), "restaurant.html?id=kk#dish-won-tons");
  assert.equal(linkFor(e("favourite.add", { subject: { venue: "kk", label: "KK" } }), where), "restaurant.html?id=kk");
  assert.equal(
    linkFor(e("rating.set", { subject: { venue: "cook-at-home", dish: "waffles", label: "W" }, to: 5 }), where),
    "recipe.html?id=cook-at-home&dish=waffles"
  );
  // a renamed dish links by its id today
  assert.equal(linkFor(e("favourite.add", { subject: { venue: "kk", dish: "old-name", label: "Old" } }), where), "restaurant.html?id=kk#dish-new-name");
  // a dish that left its menu, a venue that is gone: no link, and the sentence still reads
  assert.equal(linkFor(e("favourite.remove", { subject: { venue: "kk", dish: "gone", label: "Gone" } }), where), null);
  assert.equal(linkFor(e("favourite.add", { subject: { venue: "closed", dish: "x", label: "X" } }), where), null);
  // an entry written before a venue was renamed reaches the venue that replaced it
  assert.equal(linkFor(e("favourite.add", { subject: { venue: "burgerfuel-johnsonville", dish: "x", label: "X" } }), where), "restaurant.html?id=burgerfuel#dish-x");
});

test("no link without a catalogue, and none for entries that point at nothing", () => {
  assert.equal(linkFor(e("favourite.add"), null), null);
  assert.equal(linkFor(e("data.updated", { subject: {}, from: "a", to: "b" }), where), null);
  assert.equal(linkFor(e("settings.change", { subject: { label: "farKm" } }), where), null);
  assert.equal(linkFor(e("profile.switch", { subject: { label: "Ruth" } }), where), null);
  assert.equal(linkFor(e("order.clear", { subject: {}, from: 2, to: 0 }), where), null);
});

test("the screen's modules store nothing: the toggle is a view, not a preference", () => {
  for (const f of ["activity-ui.js", "activity-view.js"]) {
    const src = readFileSync(new URL(`../site/js/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /localStorage|sessionStorage|setItem|indexedDB/, f);
  }
});

test("both modules are in the service worker's shell list", () => {
  const sw = readFileSync(new URL("../site/sw.js", import.meta.url), "utf8");
  for (const f of ["js/activity-ui.js", "js/activity-view.js"]) assert.ok(sw.includes(`"${f}"`), f);
});
