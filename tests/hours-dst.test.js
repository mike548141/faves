// Unit tests for the WHOLE hours engine across a daylight-saving transition
// (site/js/hours.js and todayIn from site/js/temporal.js). Owner-ruled
// 2026-09-07: *"not just wrapping spans but every hours computation across the
// switch, including served windows and countdowns."* Roadmap 190/030; the gap
// was recorded by ADR 0094's *Consequences* ("No DST coverage. Every fixture is
// NZST June.").
//
// WHY A SEPARATE FILE. tests/hours.test.js drives pure functions with a
// hand-written `now` — `at(dow, hh)` — so no clock is read and no transition can
// occur. That is the right shape for the arithmetic and the reason this ground
// was untested: the transition lives in `nowIn`/`todayIn`, the two functions
// those tests deliberately do not exercise. Everything here starts from a real
// UTC instant and reads it through Intl, which is where the platform either
// handles DST or does not.
//
// THE CLOCK IS FROZEN BY CONSTRUCTION. Every instant below is a literal UTC
// string passed as the `date` argument. Nothing here reads the wall clock, so
// the verdict is the same on 2026-09-27 as on any other day — which is the
// whole point (CLAUDE.md: a check whose verdict depends on the hour gets
// switched off within a week; one that only tells the truth on the day of the
// switch is worthless on the day after).
//
// THE TWO TRANSITIONS, and why they fail differently:
//   • 2026-09-27 02:00 NZST → 03:00 NZDT. Sunday is 23 HOURS long and the wall
//     clock 02:00–02:59 NEVER OCCURS. `segments()` works in absolute
//     minutes-of-week and has no notion of a short day.
//   • 2027-04-04 03:00 NZDT → 02:00 NZST. Sunday is 25 HOURS long and the wall
//     clock 02:00–02:59 OCCURS TWICE. This is the harder direction: a
//     containment test matches the same span twice, an hour apart.
//
// WHAT THE ANSWER TURNED OUT TO BE, so a reader need not run it: the model is
// CORRECT in the only sense a wall-clock model can be. `hours` are wall-clock
// times ("we shut at 3am"), `nowIn` reads the venue's wall clock through Intl,
// and the two therefore agree through both transitions. Two consequences of
// that — neither a defect, both surprising enough to be pinned below rather
// than rediscovered:
//   1. SEPTEMBER SWALLOWS THE COUNTDOWN. A venue closing at 03:00 has its
//      "closing soon" window (02:00–02:59) fall entirely inside the hour that
//      does not exist, so on that one night the badge goes straight from
//      "Open · until 3am" to "Closed". No number is wrong; the number is never
//      shown.
//   2. APRIL REPEATS IT. The same countdown runs 60→1 twice, an hour apart.
//      During the first pass it UNDERSTATES the real time remaining by up to an
//      hour — it says "Closes in 40 min" when 100 minutes of real time remain.
//      That errs in the direction that sends someone early rather than late,
//      which is the same direction ADR 0094 chose for the understated close it
//      replaced. Fixing it means computing in absolute instants instead of
//      wall-clock minutes, which is a different model, not a patch.
//
// THE CONTROL. `Australia/Brisbane` keeps one offset all year. Every sweep
// below is run against it as well and must show an ordinary 24-hour day with
// every wall-clock minute occurring exactly once. Without it a sweep that
// counted nothing, or a `nowIn` that returned a constant, would satisfy the
// "minute 120 never appears" assertions for the wrong reason.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeClock,
  nowIn,
  openStatus,
  segments,
  servedStatus,
  viewerOnVenueTime,
} from "../site/js/hours.js";
import { todayIn } from "../site/js/temporal.js";

const NZ = "Pacific/Auckland";
const NO_DST = "Australia/Brisbane"; // UTC+10 all year — the control zone
const FIXED_12 = "Etc/GMT-12"; // UTC+12 all year: NZ's WINTER offset, frozen

const utc = (iso) => new Date(iso);
const MIN = 60_000;

// ————————————————————————— The two transitions, stated ———————————————————————
//
// Each boundary was confirmed against Intl before being written down (the probe
// output is in the roadmap item), never worked out in the head: an off-by-one
// here would move every assertion in the file to a different day's hours.
//
// September: Sunday 2026-09-27 runs from 2026-09-26T12:00Z (Sun 00:00 NZST) to
// 2026-09-27T11:00Z (Mon 00:00 NZDT) — 23 hours.
const SEP_DAY_START = utc("2026-09-26T12:00:00Z");
const SEP_HOURS = 23;
// April: Sunday 2027-04-04 runs from 2027-04-03T11:00Z (Sun 00:00 NZDT) to
// 2027-04-04T12:00Z (Mon 00:00 NZST) — 25 hours.
const APR_DAY_START = utc("2027-04-03T11:00:00Z");
const APR_HOURS = 25;

// Named instants either side of the September jump. 13:59Z is the LAST minute
// of NZST; one minute later the wall clock reads 03:00 NZDT.
const SEP = {
  lastNzst: utc("2026-09-26T13:59:00Z"), // Sun 01:59 NZST
  firstNzdt: utc("2026-09-26T14:00:00Z"), // Sun 03:00 NZDT — one minute later
  oneAm: utc("2026-09-26T13:00:00Z"), // Sun 01:00 NZST
  middaySun: utc("2026-09-27T00:00:00Z"), // Sun 13:00 NZDT
};

// The April repeated hour: the SAME wall clock an hour of real time apart.
const APR = {
  firstPass: utc("2027-04-03T13:30:00Z"), // Sun 02:30 NZDT
  secondPass: utc("2027-04-03T14:30:00Z"), // Sun 02:30 NZST — one hour later
  after: utc("2027-04-03T15:00:00Z"), // Sun 03:00 NZST
};

// The offset-invariance pair: the same WALL CLOCK on two ordinary Mondays, one
// either side of the switch. A clock hard-wired to UTC+12 reads the NZDT one an
// hour early and lands outside the venue's opening; a correct one does not.
const MON_NZST = utc("2026-09-21T02:30:00Z"); // Mon 21 Sep 14:30 NZST
const MON_NZDT = utc("2026-09-28T01:30:00Z"); // Mon 28 Sep 14:30 NZDT

// ————————————————————————————————— Fixtures ——————————————————————————————————

const CLOSED_WEEK = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

// Dragonfly's real week — the corpus's only wrapping spans (ADR 0094).
const LATE_NIGHT = {
  mon: [["16:30", "23:00"]],
  tue: [["16:30", "23:00"]],
  wed: [["16:30", "00:00"]],
  thu: [["16:30", "00:00"]],
  fri: [["16:30", "03:00"]],
  sat: [["16:30", "03:00"]],
  sun: [],
};

// Sprig and Fern Petone's Monday — the ordinary, non-wrapping control venue.
const ORDINARY = { ...CLOSED_WEEK, mon: [["14:00", "22:00"]] };

// Synthetic, because the corpus has no such record and the shape is the point:
// a close that lands INSIDE the hour September deletes.
const CLOSES_IN_THE_GAP = { ...CLOSED_WEEK, sat: [["16:30", "02:30"]] };
// …and an OPEN inside it. Nobody trades these hours; the question is whether
// the engine copes when the wall clock steps over an opening rather than onto it.
const OPENS_IN_THE_GAP = { ...CLOSED_WEEK, sun: [["02:15", "09:00"]] };

// ——————————————————————— 1. The clock: nowIn across the jump —————————————————

test("nowIn reads NZST and NZDT either side of the September jump", () => {
  // One minute of real time separates these two readings and the wall clock
  // moves an hour. If this fails, nothing else in the file means anything.
  assert.deepEqual(nowIn(NZ, SEP.lastNzst), { dow: 0, minutes: 119 }, "Sun 01:59 NZST");
  assert.deepEqual(nowIn(NZ, SEP.firstNzdt), { dow: 0, minutes: 180 }, "Sun 03:00 NZDT");
});

test("SEPTEMBER: the wall clock 02:00–02:59 never occurs, and the day is 23 hours", () => {
  // Sweep every real minute of the New Zealand Sunday and collect the wall
  // clocks the engine is handed. A 23-hour day is the fact `segments()` has no
  // representation for, so it is asserted directly rather than inferred.
  const seen = new Map();
  for (let i = 0; i < SEP_HOURS * 60; i++) {
    const t = nowIn(NZ, new Date(SEP_DAY_START.getTime() + i * MIN));
    assert.equal(t.dow, 0, `minute ${i} of the NZ Sunday should still be Sunday`);
    seen.set(t.minutes, (seen.get(t.minutes) ?? 0) + 1);
  }
  assert.equal(seen.size, SEP_HOURS * 60, "23 hours of distinct wall-clock minutes");
  for (const m of seen.values()) assert.equal(m, 1, "no wall-clock minute repeats in September");
  for (let m = 120; m < 180; m++) {
    assert.equal(seen.has(m), false, `wall clock ${m} minutes past midnight must not exist`);
  }
  assert.equal(seen.has(119), true, "01:59 is the last minute before the jump");
  assert.equal(seen.has(180), true, "03:00 is the first minute after it");
});

test("APRIL: the wall clock 02:00–02:59 occurs TWICE, and the day is 25 hours", () => {
  // The harder direction, and the one a naive containment test gets wrong by
  // matching the same span twice — which here is the CORRECT answer, because
  // the wall clock genuinely does repeat.
  const seen = new Map();
  for (let i = 0; i < APR_HOURS * 60; i++) {
    const t = nowIn(NZ, new Date(APR_DAY_START.getTime() + i * MIN));
    assert.equal(t.dow, 0, `minute ${i} of the NZ Sunday should still be Sunday`);
    seen.set(t.minutes, (seen.get(t.minutes) ?? 0) + 1);
  }
  assert.equal(seen.size, 24 * 60, "25 hours of readings, but only 24 hours of distinct clocks");
  const twice = [...seen.entries()].filter(([, n]) => n === 2).map(([m]) => m);
  assert.deepEqual(
    twice,
    Array.from({ length: 60 }, (_, i) => 120 + i),
    "exactly 02:00–02:59 is repeated, and nothing else",
  );
});

test("CONTROL: a zone with no DST gives an ordinary 24-hour day on the same instants", () => {
  // Brisbane is UTC+10 all year. Run the identical sweep against it: if the two
  // assertions above passed because the sweep counts nothing, or because
  // `nowIn` returns a constant, this one fails.
  for (const [start, hours, label] of [
    [SEP_DAY_START, SEP_HOURS, "September"],
    [APR_DAY_START, APR_HOURS, "April"],
  ]) {
    const seen = new Map();
    for (let i = 0; i < hours * 60; i++) {
      const t = nowIn(NO_DST, new Date(start.getTime() + i * MIN));
      seen.set(`${t.dow}:${t.minutes}`, (seen.get(`${t.dow}:${t.minutes}`) ?? 0) + 1);
    }
    assert.equal(seen.size, hours * 60, `${label}: every Brisbane reading is distinct`);
    for (const n of seen.values()) assert.equal(n, 1, `${label}: no Brisbane clock repeats`);
  }
});

test("makeClock hands the same instant to two zones that disagree about the offset", () => {
  // The render takes ONE clock and asks it per venue. On the night of a switch
  // the memoised answers must still be two readings of one instant, not two
  // instants — the fault that would make two venues disagree about what time
  // it is because the render took a moment to run.
  const clock = makeClock(SEP.firstNzdt);
  assert.deepEqual(clock.at(NZ), { dow: 0, minutes: 180 }, "Auckland: 03:00 NZDT");
  assert.deepEqual(clock.at(NO_DST), { dow: 0, minutes: 0 }, "Brisbane: 00:00, still UTC+10");
  assert.deepEqual(clock.at(NZ), { dow: 0, minutes: 180 }, "and the memoised answer is unchanged");
});

// ——————————————————— 2. The day boundary: todayIn (surface 4) —————————————————

test("todayIn holds one calendar day across a 23-hour Sunday and rolls at Monday 00:00 NZDT", () => {
  // Which day a venue is "in" decides WHICH day's hours are read at all, so an
  // early or late roll moves every other answer with it.
  for (let i = 0; i < SEP_HOURS * 60; i++) {
    const d = new Date(SEP_DAY_START.getTime() + i * MIN);
    assert.equal(todayIn(NZ, d), "2026-09-27", `minute ${i} of the short Sunday`);
  }
  const monday = new Date(SEP_DAY_START.getTime() + SEP_HOURS * 60 * MIN);
  assert.equal(todayIn(NZ, monday), "2026-09-28", "the 23rd hour ends the day, not the 24th");
  assert.equal(todayIn(NZ, new Date(SEP_DAY_START.getTime() - MIN)), "2026-09-26");
});

test("todayIn holds one calendar day across a 25-hour Sunday and rolls at Monday 00:00 NZST", () => {
  for (let i = 0; i < APR_HOURS * 60; i++) {
    const d = new Date(APR_DAY_START.getTime() + i * MIN);
    assert.equal(todayIn(NZ, d), "2027-04-04", `minute ${i} of the long Sunday`);
  }
  const monday = new Date(APR_DAY_START.getTime() + APR_HOURS * 60 * MIN);
  assert.equal(todayIn(NZ, monday), "2027-04-05", "the day does not roll until the 25th hour is up");
  assert.equal(todayIn(NZ, new Date(APR_DAY_START.getTime() - MIN)), "2027-04-03");
});

test("CONTROL: todayIn rolls after exactly 24 hours in a zone with no DST", () => {
  for (const [start, label] of [[SEP_DAY_START, "September"], [APR_DAY_START, "April"]]) {
    const first = todayIn(NO_DST, start);
    const at24 = todayIn(NO_DST, new Date(start.getTime() + 24 * 60 * MIN));
    // Brisbane's day does not begin at these instants, so the point is only
    // that 24 hours later is a different date and 23 hours later is not
    // necessarily — the day length is unchanged by anything New Zealand does.
    assert.notEqual(at24, first, `${label}: Brisbane's date advances after 24 hours`);
  }
});

// —————————————— 3. The wrapping span across the switch (surface 1) ————————————

test("a venue trading till 3am is OPEN through the September jump and shut after it", () => {
  // The claim the whole item is about, on the two instants a minute apart.
  const before = openStatus(LATE_NIGHT, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "open", "Sun 01:59 NZST — Saturday's span still runs");
  assert.equal(before.detail, "until 3am");

  const after = openStatus(LATE_NIGHT, nowIn(NZ, SEP.firstNzdt));
  assert.equal(after.state, "closed", "Sun 03:00 NZDT — the stated close has been reached");
  assert.equal(after.detail, "opens Mon 4:30pm", "Sunday itself is closed, so the next opening is Monday");
});

test("the week boundary and the DST boundary are crossed at once, and both hold", () => {
  // Saturday's span ends past absolute minute 10080 AND passes through the
  // transition. These are two independent ways to be wrong (ADR 0094 §1) and
  // this is the only instant where both apply.
  const segs = segments(LATE_NIGHT);
  assert.ok(segs.some((s) => s.end > 7 * 24 * 60), "a segment must overrun the week for this to test anything");
  assert.equal(openStatus(LATE_NIGHT, nowIn(NZ, SEP.oneAm)).state, "open", "Sun 01:00 NZST");
});

test("SEPTEMBER SWALLOWS THE COUNTDOWN for a 3am close, and that is correct", () => {
  // A 03:00 close puts the whole "closing soon" window inside the hour that
  // does not exist. Pinned because it is the sort of absence a future reader
  // would file as a bug: the badge is never wrong, the number is never shown.
  const states = [];
  for (let i = 0; i < SEP_HOURS * 60; i++) {
    const s = openStatus(LATE_NIGHT, nowIn(NZ, new Date(SEP_DAY_START.getTime() + i * MIN)));
    states.push(s.state);
  }
  assert.equal(states.includes("closing-soon"), false, "no closing-soon minute exists on the short Sunday");
  assert.equal(states[0], "open", "midnight NZST — still trading");
  assert.equal(states[119], "open", "01:59 NZST — the last minute of NZST, still trading");
  assert.equal(states[120], "closed", "the very next minute of real time is 03:00 NZDT and it is shut");
});

test("APRIL runs the countdown TWICE, an hour of real time apart", () => {
  // The 25-hour day's signature. Same wall clock, same badge — and during the
  // first pass the number understates the real time left by up to an hour.
  const first = openStatus(LATE_NIGHT, nowIn(NZ, APR.firstPass));
  const second = openStatus(LATE_NIGHT, nowIn(NZ, APR.secondPass));
  assert.equal(first.state, "closing-soon");
  assert.equal(first.label, "Closes in 30 min", "Sun 02:30 NZDT");
  assert.deepEqual(second, first, "Sun 02:30 NZST — one hour later, the identical badge");
  assert.equal(openStatus(LATE_NIGHT, nowIn(NZ, APR.after)).state, "closed", "Sun 03:00 NZST");

  // …and the sequence really is run twice rather than stalling or skipping.
  const counted = [];
  for (let i = 0; i < APR_HOURS * 60; i++) {
    const s = openStatus(LATE_NIGHT, nowIn(NZ, new Date(APR_DAY_START.getTime() + i * MIN)));
    if (s.state === "closing-soon") counted.push(s.label);
  }
  assert.equal(counted.length, 120, "60 closing-soon minutes, lived through twice");
  assert.equal(counted[0], "Closes in 60 min");
  assert.equal(counted[59], "Closes in 1 min");
  assert.deepEqual(counted.slice(60), counted.slice(0, 60), "the second pass repeats the first exactly");
});

test("the countdown is never negative and never absurd across either switch", () => {
  // ADR 0094 §2: the naive subtraction against an unwrapped end yields
  // "Closes in -1315 min". A transition is a second, independent way to get a
  // nonsense number, so every minute of both days is swept rather than sampled.
  for (const [start, hours, label] of [
    [SEP_DAY_START, SEP_HOURS, "September"],
    [APR_DAY_START, APR_HOURS, "April"],
  ]) {
    for (let i = 0; i < hours * 60; i++) {
      const s = openStatus(LATE_NIGHT, nowIn(NZ, new Date(start.getTime() + i * MIN)));
      const m = /(Closes|Opens) in (-?\d+) min/.exec(s.label);
      if (!m) continue;
      const n = Number(m[2]);
      assert.ok(n > 0 && n <= 60, `${label} minute ${i}: "${s.label}" is outside 1–60`);
    }
  }
});

test("a close INSIDE the deleted hour counts down and then simply stops", () => {
  // 02:30 is a wall clock that does not occur on 2026-09-27, so the venue's
  // stated close never arrives — it is shut the moment the clock steps over it.
  const before = openStatus(CLOSES_IN_THE_GAP, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "closing-soon");
  assert.equal(before.label, "Closes in 31 min", "01:59 NZST, closing at a 02:30 that will not happen");
  const after = openStatus(CLOSES_IN_THE_GAP, nowIn(NZ, SEP.firstNzdt));
  assert.equal(after.state, "closed", "03:00 NZDT — past a close that was never reached");
});

test("an open INSIDE the deleted hour is honoured the instant the clock steps past it", () => {
  const before = openStatus(OPENS_IN_THE_GAP, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "opening-soon");
  assert.equal(before.label, "Opens in 16 min", "01:59 NZST, opening at a 02:15 that will not happen");
  const after = openStatus(OPENS_IN_THE_GAP, nowIn(NZ, SEP.firstNzdt));
  assert.equal(after.state, "open", "03:00 NZDT — the venue is open, it just never read 'opening now'");
  assert.equal(after.detail, "until 9am");
});

// ————————————————————— 4. served windows across the switch (surface 2) ————————

test("a section served past midnight follows the venue through the September jump", () => {
  // `served` feeds the identical segments(), so it inherits the wrap — and it
  // must inherit the transition handling with it, or one engine reads two
  // dialects (ADR 0094 §3).
  const LATE_MENU = { ...CLOSED_WEEK, sat: [["22:00", "02:00"]] };
  assert.equal(servedStatus(LATE_MENU, nowIn(NZ, SEP.oneAm), LATE_NIGHT).state, "served", "Sun 01:00 NZST");
  assert.equal(
    servedStatus(LATE_MENU, nowIn(NZ, SEP.firstNzdt), LATE_NIGHT).state,
    "not-served",
    "Sun 03:00 NZDT — the 02:00 close was inside the deleted hour",
  );
});

test("a section whose window opens inside the deleted hour is served after the jump", () => {
  const GAP_MENU = { ...CLOSED_WEEK, sun: [["02:00", "05:00"]] };
  const before = servedStatus(GAP_MENU, nowIn(NZ, SEP.lastNzst), LATE_NIGHT);
  assert.equal(before.state, "not-served", "01:59 NZST");
  assert.equal(before.minutes, 1, "one wall-clock minute away, though an hour of it will not be lived");
  assert.equal(servedStatus(GAP_MENU, nowIn(NZ, SEP.firstNzdt), LATE_NIGHT).state, "served", "03:00 NZDT");
});

test("a served window inside the repeated April hour is served on both passes", () => {
  const REPEAT_MENU = { ...CLOSED_WEEK, sun: [["02:00", "02:45"]] };
  assert.equal(servedStatus(REPEAT_MENU, nowIn(NZ, APR.firstPass), LATE_NIGHT).state, "served", "02:30 NZDT");
  assert.equal(servedStatus(REPEAT_MENU, nowIn(NZ, APR.secondPass), LATE_NIGHT).state, "served", "02:30 NZST");
});

test("CONTROL: an ordinary daytime section is unmoved by either transition", () => {
  // Sunday lunch, nowhere near 2am. If a change made every window match, or
  // none, this is the assertion that notices.
  const LUNCH = { ...CLOSED_WEEK, sun: [["11:30", "14:00"]] };
  assert.equal(servedStatus(LUNCH, nowIn(NZ, SEP.middaySun), ORDINARY).state, "served", "Sun 13:00 NZDT");
  assert.equal(
    servedStatus(LUNCH, nowIn(NZ, SEP.oneAm), ORDINARY).state,
    "not-served",
    "Sun 01:00 NZST is not lunchtime, switch or no switch",
  );
});

// ——————————— 5. The control that must NOT change: same clock, two offsets —————

test("CONTROL: the same wall clock gives the same badge under NZST and under NZDT", () => {
  // Two ordinary Mondays a week apart, both read at 14:30 local — one NZST, one
  // NZDT. This is what "the platform handles DST" means, stated as a claim
  // about the product rather than about Intl. 14:30 is chosen deliberately: an
  // hour's error puts 13:30 outside the venue's 14:00 opening, so a clock
  // hard-wired to the winter offset fails HERE and passes almost everywhere
  // else.
  assert.deepEqual(nowIn(NZ, MON_NZST), { dow: 1, minutes: 870 }, "Mon 21 Sep 14:30 NZST");
  assert.deepEqual(nowIn(NZ, MON_NZDT), { dow: 1, minutes: 870 }, "Mon 28 Sep 14:30 NZDT");

  const nzst = openStatus(ORDINARY, nowIn(NZ, MON_NZST));
  const nzdt = openStatus(ORDINARY, nowIn(NZ, MON_NZDT));
  assert.equal(nzst.state, "open");
  assert.equal(nzst.detail, "until 10pm");
  assert.deepEqual(nzdt, nzst, "the badge must not know which offset is in force");

  // And the same for the late-night venue, whose Monday does not wrap.
  assert.deepEqual(
    openStatus(LATE_NIGHT, nowIn(NZ, MON_NZDT)),
    openStatus(LATE_NIGHT, nowIn(NZ, MON_NZST)),
    "a wrapping record must not change on an ordinary Monday either",
  );
});

test("CONTROL: an ordinary venue is never open at 2am on a switch night", () => {
  // The absence assertion. A change that made every venue read open through a
  // transition would satisfy every positive assertion above; this is what
  // refuses it. Same shape and same reason as midnight_check's control venue.
  for (const [start, hours, label] of [
    [SEP_DAY_START, SEP_HOURS, "September"],
    [APR_DAY_START, APR_HOURS, "April"],
  ]) {
    for (let i = 0; i < hours * 60; i++) {
      const t = nowIn(NZ, new Date(start.getTime() + i * MIN));
      if (t.minutes >= 6 * 60) continue; // only the small hours are at issue
      const s = openStatus(ORDINARY, t);
      assert.equal(s.state, "closed", `${label} minute ${i}: a Mon-only 14:00–22:00 venue is shut on Sunday`);
    }
  }
});

// ————————————————— 6. viewerOnVenueTime across the switch —————————————————————

test("viewerOnVenueTime tracks the venue's offset, not a remembered one", () => {
  // The one function that compares the DEVICE clock with the venue's. Read from
  // the venue side so no process timezone has to be pinned: Etc/GMT-12 is New
  // Zealand's WINTER offset frozen in place, so a viewer there agrees with
  // Auckland in NZST and is an hour out in NZDT. If this returned true after
  // the switch, an overseas reader would be shown NZ hours with no qualifier.
  assert.equal(viewerOnVenueTime(FIXED_12, SEP.lastNzst), viewerOnVenueTime(NZ, SEP.lastNzst));
  const nzstAgrees = nowIn(FIXED_12, SEP.lastNzst).minutes === nowIn(NZ, SEP.lastNzst).minutes;
  const nzdtAgrees = nowIn(FIXED_12, SEP.firstNzdt).minutes === nowIn(NZ, SEP.firstNzdt).minutes;
  assert.equal(nzstAgrees, true, "UTC+12 is New Zealand's clock in winter");
  assert.equal(nzdtAgrees, false, "and is an hour behind it in summer");
});
