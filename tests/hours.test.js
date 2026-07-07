// Unit tests for the opening-hours engine (site/js/hours.js). openStatus /
// groupWeek / formatters are pure functions of (hours, now), so we drive
// them with fixed `now` values — no clock, no timezone flakiness. nzNow()
// (the one impure bit) is exercised only for shape. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMinutes,
  formatTime,
  formatDay,
  groupWeek,
  openStatus,
  nzNow,
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

test("open within the hour → Closing soon · relative minutes", () => {
  const s = openStatus(DAILY, at(MON, 21, 30));
  assert.equal(s.state, "closing-soon");
  assert.equal(s.label, "Closing soon");
  assert.equal(s.detail, "closes in 30 min");
});

test("closed, opens later today → Closed · opens <time>", () => {
  const s = openStatus(DAILY, at(MON, 9));
  assert.equal(s.state, "closed");
  assert.equal(s.detail, "opens 11am");
});

test("closed, opening within the hour → Opens soon", () => {
  const s = openStatus(DAILY, at(MON, 10, 30));
  assert.equal(s.state, "opening-soon");
  assert.equal(s.label, "Opens soon");
  assert.equal(s.detail, "opens in 30 min");
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

test("nzNow returns a plausible shape (dow 0-6, minutes 0-1439)", () => {
  const now = nzNow();
  assert.ok(now.dow >= 0 && now.dow <= 6);
  assert.ok(now.minutes >= 0 && now.minutes < 1440);
});
