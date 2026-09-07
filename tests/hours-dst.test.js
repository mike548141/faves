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
// WHAT THE ANSWER TURNED OUT TO BE, so a reader need not run it: the VERDICT is
// wall-clock and correct. `hours` are wall-clock times ("we shut at 3am"),
// `nowIn` reads the venue's wall clock through Intl, and the two therefore agree
// through both transitions.
//
// 🛑 THE COUNTDOWN IS NO LONGER WALL-CLOCK, AND FIVE ASSERTIONS IN THIS FILE
// FLIPPED ON 2026-09-08 (ADR 0098, roadmap 190/040, owner-ruled). It used to
// pin two consequences of wall-clock arithmetic as "correct rather than
// defects":
//   1. SEPTEMBER SWALLOWED THE COUNTDOWN. A 03:00 close put the whole
//      "closing soon" window inside the hour that does not exist, so the badge
//      stepped from "Open · until 3am" straight to "Closed".
//   2. APRIL REPEATED IT. The 60→1 sequence ran twice, and the first pass
//      understated the real time remaining by up to an hour.
// Both were real, both were filed rather than fixed, and the owner OVERRULED
// that: the countdown now measures REAL minutes between two instants. So
// September shows a countdown that runs 60→1 exactly once (01:00–01:59 NZST,
// because 03:00 NZDT is sixty real minutes after 01:00 NZST), and April shows
// one that also runs exactly once (during the SECOND pass, 02:00–02:59 NZST),
// with the first pass reading "Open · until 3am" because ninety real minutes
// remain. The flipped assertions carry the old expectation in a comment so the
// change is visible rather than merely applied.
//
// THE INVARIANT THAT REPLACES THEM, and the one worth keeping if the file is
// ever cut down: when the badge says "Closes in N min", N minutes of real time
// later the venue is shut. That is now swept across both transitions.
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

// A clock reading carries its INSTANT and its ZONE as well as the wall clock
// (ADR 0098). Where an assertion is about the wall clock alone, compare this.
const wall = (t) => ({ dow: t.dow, minutes: t.minutes });

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
  assert.deepEqual(wall(nowIn(NZ, SEP.lastNzst)), { dow: 0, minutes: 119 }, "Sun 01:59 NZST");
  assert.deepEqual(wall(nowIn(NZ, SEP.firstNzdt)), { dow: 0, minutes: 180 }, "Sun 03:00 NZDT");
});

test("a clock reading carries the INSTANT it was read at and the zone it was read in", () => {
  // The countdown is real minutes between two instants (ADR 0098), and the
  // instant reaches the engine inside `now` — so a `now` that has lost it
  // silently reverts to wall-clock arithmetic and every April assertion below
  // goes back to pinning the understatement. The way that rots is somebody
  // reshaping the clock read, not a caller, so it is pinned HERE.
  const t = nowIn(NZ, SEP.lastNzst);
  assert.equal(t.epochMs, SEP.lastNzst.getTime(), "the instant, not a re-read of the wall clock");
  assert.equal(t.tz, NZ);
  const c = makeClock(APR.firstPass).at(NO_DST);
  assert.equal(c.epochMs, APR.firstPass.getTime(), "makeClock's readings carry it too");
  assert.equal(c.tz, NO_DST, "and the zone the reading was taken in, per venue");
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
  assert.deepEqual(wall(clock.at(NZ)), { dow: 0, minutes: 180 }, "Auckland: 03:00 NZDT");
  assert.deepEqual(wall(clock.at(NO_DST)), { dow: 0, minutes: 0 }, "Brisbane: 00:00, still UTC+10");
  assert.deepEqual(wall(clock.at(NZ)), { dow: 0, minutes: 180 }, "and the memoised answer is unchanged");
  assert.equal(clock.at(NZ).epochMs, clock.at(NO_DST).epochMs, "one instant, read twice");
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
  //
  // 🔁 FLIPPED 2026-09-08 (ADR 0098). This asserted `state: "open"` and
  // `detail: "until 3am"`. The venue is still trading — that has not changed —
  // but it is now ONE REAL MINUTE from its close, and the badge says so. The
  // old expectation was the wall clock's answer: 61 wall minutes to 03:00,
  // sixty of which are about to be deleted.
  const before = openStatus(LATE_NIGHT, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "closing-soon", "Sun 01:59 NZST — Saturday's span still runs");
  assert.equal(before.label, "Closes in 1 min", "and the close is one minute of REAL time away");

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
  // 🔁 FLIPPED 2026-09-08 (ADR 0098): this asserted `"open"`. Sun 01:00 NZST is
  // exactly sixty real minutes from a 03:00 NZDT close, so the venue is now in
  // its closing-soon window. It is still INSIDE Saturday's wrapped span, which
  // is the only thing this test is about — a fix that lost the week boundary
  // would return "closed" here, not "closing-soon".
  assert.equal(openStatus(LATE_NIGHT, nowIn(NZ, SEP.oneAm)).state, "closing-soon", "Sun 01:00 NZST");
});

test("SEPTEMBER SHOWS THE COUNTDOWN ONCE, in real minutes, for a 3am close", () => {
  // 🔁 FLIPPED WHOLE 2026-09-08 (ADR 0098). This test was called "SEPTEMBER
  // SWALLOWS THE COUNTDOWN … and that is correct" and asserted
  // `states.includes("closing-soon") === false`: the wall-clock window
  // (02:00–02:59) fell inside the hour that does not exist, so no number was
  // ever shown. Measuring real time instead moves the window to 01:00–01:59
  // NZST, which is genuinely the last hour before the shop shuts at 03:00 NZDT.
  const states = [];
  const labels = [];
  for (let i = 0; i < SEP_HOURS * 60; i++) {
    const s = openStatus(LATE_NIGHT, nowIn(NZ, new Date(SEP_DAY_START.getTime() + i * MIN)));
    states.push(s.state);
    if (s.state === "closing-soon") labels.push(s.label);
  }
  assert.equal(labels.length, 60, "sixty closing-soon minutes on the short Sunday, not zero and not 120");
  assert.equal(labels[0], "Closes in 60 min", "01:00 NZST");
  assert.equal(labels[59], "Closes in 1 min", "01:59 NZST");
  assert.equal(states[0], "open", "midnight NZST — two real hours out, so no number yet");
  assert.equal(states[59], "open", "00:59 NZST — 61 real minutes, still outside the window");
  assert.equal(states[60], "closing-soon", "01:00 NZST — the window opens on the real minute");
  assert.equal(states[119], "closing-soon", "01:59 NZST — the last minute of NZST");
  assert.equal(states[120], "closed", "the very next minute of real time is 03:00 NZDT and it is shut");
});

test("APRIL runs the countdown ONCE, and the first pass through 02:30 is 90 real minutes out", () => {
  // 🔁 FLIPPED 2026-09-08 (ADR 0098) — the item's own defect, on the two
  // instants it was measured on. This asserted `first.label === "Closes in 30
  // min"` and `deepEqual(second, first)`: the same wall clock, an hour of real
  // time apart, read identically. It now reads DIFFERENTLY, which is the whole
  // point of the ruling.
  const first = openStatus(LATE_NIGHT, nowIn(NZ, APR.firstPass));
  const second = openStatus(LATE_NIGHT, nowIn(NZ, APR.secondPass));
  assert.equal(first.state, "open", "Sun 02:30 NZDT — 90 real minutes left is not 'closing soon'");
  assert.equal(first.label, "Open");
  assert.equal(first.detail, "until 3am", "the wall-clock close is still what is NAMED");
  assert.equal(first.minutes, 90, "and ninety real minutes is what is MEASURED");
  assert.equal(second.state, "closing-soon", "Sun 02:30 NZST — one hour of real time later");
  assert.equal(second.label, "Closes in 30 min");
  assert.equal(second.minutes, 30);
  assert.notDeepEqual(second, first, "the same wall clock, an hour apart, must NOT read the same");
  assert.equal(openStatus(LATE_NIGHT, nowIn(NZ, APR.after)).state, "closed", "Sun 03:00 NZST");

  // …and the sequence is run ONCE rather than twice. It used to assert 120.
  const counted = [];
  for (let i = 0; i < APR_HOURS * 60; i++) {
    const s = openStatus(LATE_NIGHT, nowIn(NZ, new Date(APR_DAY_START.getTime() + i * MIN)));
    if (s.state === "closing-soon") counted.push(s.label);
  }
  assert.equal(counted.length, 60, "60 closing-soon minutes, lived through once");
  assert.equal(counted[0], "Closes in 60 min");
  assert.equal(counted[59], "Closes in 1 min");
  assert.deepEqual(
    counted,
    Array.from({ length: 60 }, (_, i) => `Closes in ${60 - i} min`),
    "one strictly descending run, with no number repeated",
  );
});

test("the countdown is the difference between two INSTANTS across the fall-back", () => {
  // The claim stated as arithmetic rather than as a badge: take the instant the
  // countdown was read at, add the number it printed, and the venue must be
  // shut. Run for every minute of the 25-hour Sunday, so the repeated hour is
  // crossed 60 times rather than sampled once.
  //
  // This is the assertion that a wall-clock countdown cannot satisfy: it said
  // "30 min" at 13:30Z, and at 14:00Z Dragonfly was still trading.
  let checked = 0;
  for (let i = 0; i < APR_HOURS * 60; i++) {
    const t = new Date(APR_DAY_START.getTime() + i * MIN);
    const s = openStatus(LATE_NIGHT, nowIn(NZ, t));
    if (s.state !== "closing-soon") continue;
    const n = Number(/Closes in (\d+) min/.exec(s.label)[1]);
    const shut = openStatus(LATE_NIGHT, nowIn(NZ, new Date(t.getTime() + n * MIN)));
    assert.equal(shut.state, "closed", `"${s.label}" read at ${t.toISOString()} did not come true`);
    const stillOpen = openStatus(LATE_NIGHT, nowIn(NZ, new Date(t.getTime() + (n - 1) * MIN)));
    assert.notEqual(stillOpen.state, "closed", `it was already shut a minute BEFORE "${s.label}" ran out`);
    checked++;
  }
  // Without this the loop could `continue` past everything and pass empty —
  // the shape that has burned this repo before (a sweep that never arrived).
  assert.equal(checked, 60, "every closing-soon minute of the long Sunday was carried to its close");
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

test("a close INSIDE the deleted hour counts down to the instant it is REACHED", () => {
  // 02:30 is a wall clock that does not occur on 2026-09-27, so the venue's
  // stated close never arrives — it is shut the moment the clock steps over it.
  //
  // 🔁 FLIPPED 2026-09-08 (ADR 0098): this asserted "Closes in 31 min", the
  // wall-clock distance to a 02:30 that will not happen. One real minute later
  // the badge read "Closed" — a countdown contradicted by its own engine, and
  // in the LATE direction ADR 0094 named as the serious one. A target the zone
  // steps over resolves to the transition itself.
  const before = openStatus(CLOSES_IN_THE_GAP, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "closing-soon");
  assert.equal(before.label, "Closes in 1 min", "01:59 NZST, closing at a 02:30 that will not happen");
  const after = openStatus(CLOSES_IN_THE_GAP, nowIn(NZ, SEP.firstNzdt));
  assert.equal(after.state, "closed", "03:00 NZDT — past a close that was never reached");

  // The gap must not produce a negative, a zero or a NaN anywhere in the hour
  // before it — the failure mode a subtraction across a skipped hour invites.
  // Swept rather than sampled, and counted, so an empty sweep cannot pass.
  let seen = 0;
  for (let i = 0; i < 120; i++) {
    const s = openStatus(CLOSES_IN_THE_GAP, nowIn(NZ, new Date(SEP.lastNzst.getTime() - i * MIN)));
    if (s.minutes == null) continue;
    assert.ok(Number.isFinite(s.minutes) && s.minutes > 0, `minute -${i}: minutes was ${s.minutes}`);
    seen++;
  }
  assert.equal(seen, 120, "every one of the two hours running into the gap carried a real number");
});

test("an open INSIDE the deleted hour is honoured the instant the clock steps past it", () => {
  // 🔁 FLIPPED 2026-09-08 (ADR 0098): this asserted "Opens in 16 min" — the
  // wall-clock distance to a 02:15 that never occurs — one real minute before
  // the venue was open. The two halves of this test disagreed with each other.
  const before = openStatus(OPENS_IN_THE_GAP, nowIn(NZ, SEP.lastNzst));
  assert.equal(before.state, "opening-soon");
  assert.equal(before.label, "Opens in 1 min", "01:59 NZST, opening at a 02:15 that will not happen");
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
  assert.deepEqual(wall(nowIn(NZ, MON_NZST)), { dow: 1, minutes: 870 }, "Mon 21 Sep 14:30 NZST");
  assert.deepEqual(wall(nowIn(NZ, MON_NZDT)), { dow: 1, minutes: 870 }, "Mon 28 Sep 14:30 NZDT");

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
