// Unit tests for the opening-hours engine (site/js/hours.js). openStatus /
// groupWeek / formatters are pure functions of (hours, now), so we drive
// them with fixed `now` values — no clock, no timezone flakiness. nowIn()
// (the one impure bit) is exercised only for shape. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMinutes,
  formatTime,
  formatDay,
  groupWeek,
  openStatus,
  nowIn,
  makeClock,
  viewerOnVenueTime,
} from "../site/js/hours.js";

// dow: Sun=0 … Sat=6. minutes = hours*60+mins.
const MON = 1;
const at = (dow, hh, mm = 0) => ({ dow, minutes: hh * 60 + mm });

const daily = (open, close) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[open, close]]]));

const DAILY = daily("11:00", "22:00"); // like KC Cafe
const SPLIT = { ...daily("11:00", "21:00"), mon: [["12:00", "15:00"], ["17:00", "21:00"]] };
const LATE = daily("17:00", null); // "late" / open-ended
const CLOSED_ALL = daily("11:00", "22:00");
for (const d of Object.keys(CLOSED_ALL)) CLOSED_ALL[d] = [];

test("toMinutes / formatTime round-trips and edge times", () => {
  assert.equal(toMinutes("11:30"), 690);
  assert.equal(toMinutes(null), null);
  assert.equal(formatTime(0), "12am");
  assert.equal(formatTime(660), "11am");
  assert.equal(formatTime(690), "11:30am");
  assert.equal(formatTime(720), "12pm"); // noon
  assert.equal(formatTime(1290), "9:30pm");
  assert.equal(formatTime(null), "late");
});

test("open with plenty of time → Open · until close", () => {
  const s = openStatus(DAILY, at(MON, 12));
  assert.equal(s.state, "open");
  assert.equal(s.label, "Open");
  assert.equal(s.detail, "until 10pm");
});

// The badge renders `label · detail`, so a "soon" state must put its whole
// phrase in the label and leave detail empty — otherwise it reads "Closing
// soon · closes in 30 min", the same fact twice (owner, 2026-08-16).
test("open within the hour → one phrase, with the number", () => {
  const s = openStatus(DAILY, at(MON, 21, 30));
  assert.equal(s.state, "closing-soon");
  assert.equal(s.label, "Closes in 30 min");
  assert.equal(s.detail, "", "no detail, or the badge repeats itself");
});

test("closed, opens later today → Closed · opens <time>", () => {
  const s = openStatus(DAILY, at(MON, 9));
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "opens 11am");
});

test("closed, opening within the hour → one phrase, with the number", () => {
  const s = openStatus(DAILY, at(MON, 10, 30));
  assert.equal(s.state, "opening-soon");
  assert.equal(s.label, "Opens in 30 min");
  assert.equal(s.detail, "", "no detail, or the badge repeats itself");
});

// Further out the two halves say different things, so both survive: "Closed"
// is the state, "opens 11am" is the fact you act on.
test("closed well before opening keeps state and fact apart", () => {
  const s = openStatus(DAILY, at(MON, 9));
  assert.equal(s.label, "Closed");
  assert.equal(s.detail, "opens 11am");
});

test("after close → Closed · opens next open day", () => {
  const s = openStatus(DAILY, at(MON, 22, 30));
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "opens Tue 11am");
});

test("lunch/dinner split: open during lunch", () => {
  const s = openStatus(SPLIT, at(MON, 13));
  assert.equal(s.state, "open");
  assert.equal(s.detail, "until 3pm");
});

test("lunch/dinner split: the afternoon gap shows the reopen time", () => {
  const s = openStatus(SPLIT, at(MON, 15, 30));
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "opens 5pm"); // navigates the split
});

test("open-ended (null close, 'late') → Open with no countdown", () => {
  const s = openStatus(LATE, at(MON, 20));
  assert.equal(s.state, "open");
  assert.equal(s.detail, "");
});

test("no hours data → unknown (render no badge)", () => {
  assert.equal(openStatus(null, at(MON, 12)).state, "unknown");
});

test("closed all week → Closed, no next-open", () => {
  const s = openStatus(CLOSED_ALL, at(MON, 12));
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "");
});

test("week wrap: closed Sunday night finds Monday", () => {
  const mostlyClosed = { ...CLOSED_ALL, mon: [["09:00", "17:00"]] };
  const s = openStatus(mostlyClosed, at(0, 20)); // Sunday 8pm
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "opens Mon 9am");
});

test("formatDay: split, simple, closed, late", () => {
  assert.equal(formatDay([["12:00", "15:00"], ["17:00", "21:00"]]), "12pm–3pm, 5pm–9pm");
  assert.equal(formatDay([["11:00", "22:00"]]), "11am–10pm");
  assert.equal(formatDay([]), "Closed");
  assert.equal(formatDay([["11:30", null]]), "11:30am–late");
});

test("groupWeek merges identical consecutive days into ranges (with dows)", () => {
  assert.deepEqual(groupWeek(DAILY), [
    { days: "Mon–Sun", text: "11am–10pm", dows: [1, 2, 3, 4, 5, 6, 0] },
  ]);
  const varied = { ...daily("12:00", "21:00"), mon: [["16:00", "21:00"]] };
  assert.deepEqual(groupWeek(varied), [
    { days: "Mon", text: "4pm–9pm", dows: [1] },
    { days: "Tue–Sun", text: "12pm–9pm", dows: [2, 3, 4, 5, 6, 0] },
  ]);
});

test("nowIn returns a plausible shape (dow 0-6, minutes 0-1439)", () => {
  const now = nowIn();
  assert.ok(now.dow >= 0 && now.dow <= 6);
  assert.ok(now.minutes >= 0 && now.minutes < 1440);
});

test("viewerOnVenueTime returns a boolean (value depends on the runner's tz)", () => {
  // Deterministic value would require stubbing the process timezone, so we
  // only assert the shape here; the display qualifier it gates is cosmetic.
  assert.equal(typeof viewerOnVenueTime(), "boolean");
});

// ——————————————————— Per-venue timezones (ADR 0043) ———————————————————
// The bug these exist to stop: a venue outside NZ reading its open/closed
// status off Wellington's clock and saying nothing about it.

test("nowIn reads a real instant in the zone it is handed, not the default", () => {
  // 2026-08-16T13:00:00Z — already Monday 1am in Auckland, still Sunday 2pm in
  // London. Different DAY and different hour, so neither can pass by luck.
  const t = new Date("2026-08-16T13:00:00Z");
  const akl = nowIn("Pacific/Auckland", t);
  const ldn = nowIn("Europe/London", t);
  assert.equal(akl.dow, 1); // Monday
  assert.equal(akl.minutes, 60);
  assert.equal(ldn.dow, 0); // Sunday
  assert.equal(ldn.minutes, 14 * 60);
});

test("nowIn falls back to home for a malformed zone rather than throwing", () => {
  const t = new Date("2026-08-16T13:00:00Z");
  assert.deepEqual(nowIn("Not/AZone", t), nowIn("Pacific/Auckland", t));
});

test("a venue's open status follows ITS zone, not the collection's", () => {
  const week = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [["09:00", "17:00"]] };
  const t = new Date("2026-08-16T13:00:00Z");
  // Monday 1am in Auckland → closed (Sunday's window has passed there);
  // Sunday 2pm in London → open. Same instant, opposite answers.
  assert.equal(openStatus(week, nowIn("Pacific/Auckland", t)).state, "closed");
  assert.equal(openStatus(week, nowIn("Europe/London", t)).state, "open");
});

test("makeClock freezes one instant and reads it in any zone, memoised", () => {
  const t = new Date("2026-08-16T13:00:00Z");
  const clock = makeClock(t);
  assert.deepEqual(clock.at("Pacific/Auckland"), nowIn("Pacific/Auckland", t));
  assert.deepEqual(clock.at("Europe/London"), nowIn("Europe/London", t));
  // Same object back on a second read — that memo is what keeps a render from
  // constructing one Intl formatter per venue.
  assert.strictEqual(clock.at("Europe/London"), clock.at("Europe/London"));
  assert.strictEqual(clock.date, t);
});

test("makeClock defaults to home when asked for no zone", () => {
  const t = new Date("2026-08-16T13:00:00Z");
  assert.deepEqual(makeClock(t).at(), nowIn("Pacific/Auckland", t));
});

test("viewerOnVenueTime is about the VENUE's zone, not New Zealand's", () => {
  // A device on UTC: on London time (within an hour of it in summer), not on NZ's.
  const t = new Date("2026-08-16T00:30:00Z");
  const utcish = { getHours: () => 0, getMinutes: () => 30, valueOf: () => t.valueOf() };
  Object.setPrototypeOf(utcish, Date.prototype);
  assert.equal(viewerOnVenueTime("Pacific/Auckland", utcish), false);
});
