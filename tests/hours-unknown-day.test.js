// Unit tests for the FOURTH state of a day in the hours model (ADR 0105,
// roadmap 190/020): a day may be `null`, meaning *the venue did not say*, and
// that is not `[]`, which means *the venue says it is closed*.
//
// WHY A SEPARATE FILE. tests/hours.test.js pins the arithmetic of a week that is
// fully known, and every fixture in it is a complete seven-day record — which is
// precisely the population in which this defect is invisible. Keeping the
// partial-week fixtures apart makes the two claims separable: if this file goes
// red and that one stays green, the week arithmetic is fine and the unknown-day
// reasoning is not.
//
// THE VENUE THIS COMES FROM, and the one thing these tests do NOT assert.
// Abrakebabra publishes four lines on its own site — Sunday to Tuesday,
// Thursday, Friday, Saturday — and no Wednesday line at all. The record carried
// `hours: null`, throwing away six known days to avoid publishing one false one,
// because `wed: []` renders as CLOSED and telling a reader a kebab shop is shut
// while it is trading is the direction ADR 0094 exists to stop. **These fixtures
// are NOT Abrakebabra's hours.** No source in this repo records its times, only
// which days it publishes, so they were never restored and nothing here claims
// to know them. The shape is the subject; the times are invented for the test
// and say nothing about any real venue.
//
// THE CLOCK IS HAND-WRITTEN, as in tests/hours.test.js: `at(dow, hh)` is a bare
// `{dow, minutes}` wall clock, so nothing here reads a real clock and no verdict
// depends on the hour the suite ran. The countdown's real-minutes path (ADR
// 0098) is a different subject and is covered in tests/hours-dst.test.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayIsKnown, formatDay, groupWeek, openStatus, segments } from "../site/js/hours.js";

const SUN = 0;
const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const at = (dow, hh, mm = 0) => ({ dow, minutes: hh * 60 + mm });

// The shape of the venue that prompted this: six days known, one never
// published. Wednesday is `null`, and Monday is `[]` — a REAL closed day sitting
// beside the unknown one, because every assertion below is worthless unless the
// two are distinguishable in the same record.
const PARTIAL = {
  mon: [],
  tue: [["11:00", "21:00"]],
  wed: null,
  thu: [["11:00", "21:00"]],
  fri: [["11:00", "23:00"]],
  sat: [["11:00", "23:00"]],
  sun: [["11:00", "21:00"]],
};

// The same record with Wednesday spelled the OLD way. Every test below that
// asserts a difference is paired against this, because "the unknown day reads
// differently" is satisfiable by a change that made every day read that way.
const FALSE_CLOSED = { ...PARTIAL, wed: [] };

test("a null day and an empty day are DIFFERENT — dayIsKnown separates them", () => {
  assert.equal(dayIsKnown(PARTIAL, WED), false);
  assert.equal(dayIsKnown(PARTIAL, MON), true, "[] is the venue SAYING closed");
  assert.equal(dayIsKnown(FALSE_CLOSED, WED), true);
  // A missing key reads the same as an explicit null — the tolerant-engine half
  // of ADR 0105. validate.py still demands all seven keys.
  const { wed, ...noWed } = PARTIAL;
  assert.equal(dayIsKnown(noWed, WED), false);
  assert.equal(dayIsKnown(null, WED), false);
});

test("segments() skips a null day exactly as it skips [] — and that is right", () => {
  // The two are identical HERE (neither contributes an opening) and the whole
  // point is that they are not identical in openStatus. A regression that made
  // segments() throw on null, or invent a day-long span for it, fails here.
  assert.deepEqual(segments(PARTIAL), segments(FALSE_CLOSED));
  assert.equal(segments(PARTIAL).filter((s) => s.dow === WED).length, 0);
  const { wed, ...noWed } = PARTIAL;
  assert.deepEqual(segments(noWed), segments(PARTIAL));
});

test("ON the unknown day the verdict is 'we do not know', not 'Closed'", () => {
  const st = openStatus(PARTIAL, at(WED, 13));
  assert.equal(st.state, "unknown-today");
  assert.equal(st.label, "Hours not published today");
  assert.equal(st.detail, "");
  assert.equal(st.minutes, null);
});

test("…and the SAME record with wed: [] still says Closed — the control", () => {
  // Without this the file passes with openStatus hard-wired to answer
  // "unknown-today" for every venue on every day, which would be a worse bug
  // than the one being fixed.
  const st = openStatus(FALSE_CLOSED, at(WED, 13));
  assert.equal(st.state, "closed");
  assert.equal(st.label, "Closed");
  assert.equal(st.detail, "opens Thu 11am");
});

test("the unknown day is NOT rendered as a blank — it carries words", () => {
  // `unknown` means "draw no badge" at every call site on the site. A fourth
  // state that collapsed into it would leave the reader with nothing, which is
  // the same shape as the bug.
  const st = openStatus(PARTIAL, at(WED, 13));
  assert.notEqual(st.state, "unknown");
  assert.ok(st.label.length > 0);
});

test("a KNOWN day in the same record is unaffected, open and closed", () => {
  assert.equal(openStatus(PARTIAL, at(TUE, 13)).state, "open");
  assert.equal(openStatus(PARTIAL, at(TUE, 13)).detail, "until 9pm");
  assert.equal(openStatus(PARTIAL, at(MON, 13)).state, "closed", "Monday is a REAL closed day");
  assert.equal(openStatus(PARTIAL, at(MON, 13)).detail, "opens Tue 11am");
});

test("BEING OPEN BEATS AN UNKNOWN DAY — a span wrapping into it wins", () => {
  // Tuesday trades till 2am, so at 1am on the unpublished Wednesday the reader
  // IS inside an opening, and we know that from TUESDAY's line. Silence only
  // decides where there is no positive evidence; getting this order wrong would
  // make a venue that is demonstrably open read "we don't know".
  const wrapping = { ...PARTIAL, tue: [["17:00", "02:00"]] };
  const st = openStatus(wrapping, at(WED, 0, 30));
  assert.equal(st.state, "open");
  assert.equal(st.detail, "until 2am");
  // And once the wrapped span has ended, the silence takes over again — the
  // evidence ran out at 2am and nothing else covers the day.
  assert.equal(openStatus(wrapping, at(WED, 3)).state, "unknown-today");
});

test("an unknown day between now and the next opening HEDGES the detail", () => {
  // Tuesday night, shut. The next opening we hold is Thursday — but Wednesday
  // was never published, so "opens Thu 11am" would re-assert the very day the
  // record was rewritten to stop asserting. The verdict stays "closed" (that is
  // known and true right now); only the claim about which opening is NEXT is
  // hedged, and the hedge leads so it cannot be skimmed past.
  const st = openStatus(PARTIAL, at(TUE, 22));
  assert.equal(st.state, "closed");
  assert.equal(st.detail, "next published opening Thu 11am");
});

test("…and with no unknown day in the way the wording is untouched", () => {
  // THE SHARPEST PAIR IN THIS FILE. `FALSE_CLOSED` differs from `PARTIAL` in one
  // byte — `wed: []` where the other has `wed: null` — and at the same instant
  // it picks the SAME next segment (Thursday, because a closed Wednesday offers
  // nothing either). So the two strings differ by the hedge and by nothing else,
  // which is what a wording change that fired on every record would fail.
  assert.equal(openStatus(FALSE_CLOSED, at(TUE, 22)).detail, "opens Thu 11am");
  assert.equal(openStatus(PARTIAL, at(TUE, 22)).detail, "next published opening Thu 11am");
  // And a plain unhedged record on a different night, for the ordinary case.
  assert.equal(openStatus(PARTIAL, at(SUN, 22)).detail, "opens Tue 11am");
});

test("later the same known day still says 'opens <time>', unhedged", () => {
  const split = { ...PARTIAL, thu: [["11:00", "14:00"], ["17:00", "21:00"]] };
  assert.equal(openStatus(split, at(THU, 15)).detail, "opens 5pm");
});

test("formatDay: 'Not published' for null, 'Closed' for []", () => {
  assert.equal(formatDay(null), "Not published");
  assert.equal(formatDay(undefined), "Not published");
  assert.equal(formatDay([]), "Closed");
  assert.equal(formatDay([["11:00", "21:00"]]), "11am–9pm");
});

test("the week table prints the unknown day, and does not merge it with Closed", () => {
  const rows = groupWeek(PARTIAL);
  const wed = rows.find((r) => r.days === "Wed");
  assert.ok(wed, `no standalone Wed row in ${JSON.stringify(rows.map((r) => r.days))}`);
  assert.equal(wed.text, "Not published");
  const mon = rows.find((r) => r.days === "Mon");
  assert.equal(mon.text, "Closed");
  // The two must not have collapsed into one "Mon–Wed" range: a grouper that
  // treated them as the same string would hide the distinction in the one place
  // a reader goes to look it up.
  assert.ok(!rows.some((r) => r.days.includes("–") && r.dows.includes(WED)));
});

test("a week that says nothing about ANY day never renders a false Closed", () => {
  // validate.py refuses this shape (write `hours: null` instead), but the engine
  // must not be the thing that depends on the validator having run: a
  // hand-written or half-migrated object must fail safe.
  const nothing = Object.fromEntries(
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, null]),
  );
  assert.equal(openStatus(nothing, at(WED, 13)).state, "unknown-today");
  assert.equal(openStatus({}, at(WED, 13)).state, "unknown-today");
});

test("hours: null is still 'unknown' — the whole-week case is unchanged", () => {
  // The two states are neighbours and it would be easy to collapse them. They
  // render differently on purpose: no hours at all draws NO badge, because there
  // is no week to be partial about.
  assert.equal(openStatus(null, at(WED, 13)).state, "unknown");
  assert.equal(openStatus(null, at(WED, 13)).label, "");
});
