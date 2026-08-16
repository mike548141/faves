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
  notServedText,
  resolveServed,
  segments,
  servedStatus,
  servedText,
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

// ————————————— When a SECTION is served (Theme 28c) —————————————
// `served` has the venue-`hours` shape plus one extension: a null open means
// "from opening". Every function below is pure — fixed `now`, fixed data — for
// the same reason the rest of this file is: a check that passes at 1pm and
// fails at 1am gets switched off within a week.

const GOLD_CARD = {
  mon: [["11:30", "17:30"]],
  tue: [["11:30", "17:30"]],
  wed: [["11:30", "17:30"]],
  thu: [["11:30", "17:30"]],
  fri: [["11:30", "17:30"]],
  sat: [["10:00", "17:30"]],
  sun: [["10:00", "17:30"]],
};
// "served till 2pm" — an end, and no start anybody told us.
const TILL_TWO = daily(null, "14:00");
const VENUE_TEN = daily("10:00", null); // opens 10am, till late, every day
const SAT = 6;
const SUN = 0;
const TUE = 2;

test("formatDay renders a null open as 'till', never as a made-up range", () => {
  assert.equal(formatDay([[null, "14:00"]]), "till 2pm");
  assert.equal(formatDay([["11:30", "17:30"]]), "11:30am–5:30pm");
  assert.equal(formatDay([[null, null]]), "all day");
  assert.equal(formatDay([]), "Closed");
});

test("servedText reads like the venue's own hours table", () => {
  assert.equal(servedText(GOLD_CARD), "Served Mon–Fri 11:30am–5:30pm, Sat–Sun 10am–5:30pm");
  assert.equal(servedText(TILL_TWO), "Served every day till 2pm");
  assert.equal(servedText(null), null);
});

test("servedText lists the days it IS served, not the days it isn't", () => {
  const weekdays = { ...GOLD_CARD, sat: [], sun: [] };
  assert.equal(servedText(weekdays), "Served Mon–Fri 11:30am–5:30pm");
  const nothing = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  assert.equal(servedText(nothing), null, "nothing to say, so say nothing");
});

test("servedText never leaks a start time derived from the venue's hours", () => {
  // The line is built from the RAW window; the venue's 10am opening resolves
  // the reasoning, not the words.
  assert.ok(!servedText(TILL_TWO).includes("10am"));
});

test("servedStatus: inside the window is 'served', outside is 'not-served'", () => {
  assert.equal(servedStatus(GOLD_CARD, at(MON, 13)).state, "served");
  assert.equal(servedStatus(GOLD_CARD, at(MON, 21)).state, "not-served");
  assert.equal(servedStatus(GOLD_CARD, at(MON, 11, 29)).state, "not-served");
  assert.equal(servedStatus(GOLD_CARD, at(MON, 11, 30)).state, "served", "inclusive at open");
  assert.equal(servedStatus(GOLD_CARD, at(MON, 17, 30)).state, "not-served", "exclusive at close");
});

test("servedStatus names the next serving, wrapping the week", () => {
  const later = servedStatus(GOLD_CARD, at(MON, 9));
  assert.equal(later.today, true);
  assert.equal(later.next.openMin, 690);
  assert.equal(later.stated, true);
  const tomorrow = servedStatus(GOLD_CARD, at(SAT, 21));
  assert.equal(tomorrow.today, false);
  assert.equal(tomorrow.next.dow, SUN);
  assert.equal(tomorrow.next.openMin, 600);
});

test("servedStatus with no window at all says so, rather than guessing", () => {
  const nothing = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  assert.equal(servedStatus(nothing, at(MON, 13)).state, "unknown");
  assert.equal(servedStatus(null, at(MON, 13)).state, "unknown");
  assert.equal(servedStatus(undefined, at(MON, 13)).state, "unknown");
});

test("a null open resolves to the venue's opening time for that day", () => {
  assert.deepEqual(resolveServed(TILL_TWO, VENUE_TEN).mon, [["10:00", "14:00"]]);
  // 9am is before the doors open, so brunch is not on yet…
  assert.equal(servedStatus(TILL_TWO, at(MON, 9), VENUE_TEN).state, "not-served");
  // …10:30 is.
  assert.equal(servedStatus(TILL_TWO, at(MON, 10, 30), VENUE_TEN).state, "served");
});

test("a null open with NO venue hours falls back to the start of the day", () => {
  assert.deepEqual(resolveServed(TILL_TWO, null).mon, [["00:00", "14:00"]]);
  assert.equal(servedStatus(TILL_TWO, at(MON, 9)).state, "served");
});

test("a derived start time is NEVER rendered — 'from opening' instead", () => {
  // The 00:00 fallback is a reasoning bound. Printing it as "next served at
  // 12am" would be a time nobody ever told us.
  const noHours = servedStatus(TILL_TWO, at(MON, 15));
  assert.equal(noHours.stated, false);
  assert.equal(notServedText(noHours), "Not served right now · next served Tue from opening");
  // Same with real venue hours behind it: 10am is the VENUE's fact, not the
  // section's, so the section still declines to claim it as a start time.
  const withHours = servedStatus(TILL_TWO, at(MON, 15), VENUE_TEN);
  assert.equal(withHours.stated, false);
  assert.equal(notServedText(withHours), "Not served right now · next served Tue from opening");
});

test("a STATED start time is named, with the day only when it isn't today", () => {
  assert.equal(
    notServedText(servedStatus(GOLD_CARD, at(MON, 9))),
    "Not served right now · next served at 11:30am"
  );
  assert.equal(
    notServedText(servedStatus(GOLD_CARD, at(MON, 21))),
    "Not served right now · next served Tue at 11:30am"
  );
  assert.equal(
    notServedText(servedStatus(GOLD_CARD, at(SAT, 21))),
    "Not served right now · next served Sun at 10am"
  );
});

test("notServedText says nothing while the section IS being served", () => {
  assert.equal(notServedText(servedStatus(GOLD_CARD, at(TUE, 13))), null);
  assert.equal(notServedText(servedStatus(null, at(TUE, 13))), null);
  assert.equal(notServedText(null), null);
});

// The exported week-expansion openStatus and servedStatus now share. Exported
// rather than copied (ranking.js's tierFromHours comment states the rule); this
// asserts the shape both callers rely on.
test("segments expands the week into sorted absolute minutes", () => {
  const segs = segments({ mon: [["11:00", "14:00"], ["17:00", null]], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  assert.equal(segs.length, 2);
  assert.deepEqual(segs.map((s) => [s.start, s.end, s.openMin, s.closeMin, s.dow]), [
    [1440 + 660, 1440 + 840, 660, 840, 1],
    [1440 + 1020, 1440 + 1440, 1020, null, 1],
  ]);
});

test("served and the venue's own hours stay separate questions", () => {
  // The venue is open till late; the section stops at 5:30pm. openStatus must
  // still say "open" at 9pm — `served` annotates the section, never the venue.
  assert.equal(openStatus(VENUE_TEN, at(MON, 21)).state, "open");
  assert.equal(servedStatus(GOLD_CARD, at(MON, 21), VENUE_TEN).state, "not-served");
});
