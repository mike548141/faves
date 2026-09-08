// Opening-hours engine: turns the structured `hours` data into a live
// "Open · until 9pm" / "Closed · opens 5pm" / "Closing soon" status, and a
// tidy weekly display that shows lunch/dinner splits. Roadmap: the "Open
// now" idea, plus relative-time and split-hours navigation.
//
// Two design decisions (see docs/decisions/0006, amended by 0043):
//  1. Status is computed in the venue's *own* timezone, not the viewer's device
//     clock, so a guest browsing from overseas still sees the right answer.
//     Intl does this offline, no dependency. That zone comes off the record
//     (place.js) — it was hard-coded to Pacific/Auckland until 2026-08-16,
//     which was right while every venue was in NZ and would have been a
//     confident wrong answer for the first one that wasn't.
//  2. The clock read (nowIn / makeClock) is the only impure part;
//     openStatus/groupWeek are pure functions of (hours, now) so they're
//     fully unit-testable.
//
// And a third, added 2026-09-08 (ADR 0098, owner-ruled): THE VERDICT READS THE
// WALL CLOCK; THE COUNTDOWN COUNTS REAL TIME. "We shut at 3am" is a wall-clock
// promise, so open/closed is still decided in minutes-of-week exactly as before.
// But "Closes in 30 min" is a promise about the reader's next half hour, and on
// the two nights a year the wall clock repeats or skips an hour those are
// different quantities. `now` therefore carries the INSTANT it was read at
// (`epochMs`) and the zone it was read in (`tz`) alongside the wall clock, and
// the countdown is the real minutes between two instants. Purity is untouched:
// the instant is an INPUT — nothing here calls `Date.now()`.
//
// And a fourth, added 2026-09-08 (ADR 0105): A DAY MAY BE `null`, AND THAT IS
// NOT `[]`. `[]` is the venue saying *"we are closed that day"*. `null` — or the
// key simply not being there — is *"the venue did not say"*. Abrakebabra
// publishes four lines (Sun–Tue, Thu, Fri, Sat) and no Wednesday line at all;
// before this the record could either claim a Wednesday it does not know or
// throw away the six days it does, and it threw away the six. The rule is the
// one the corpus already applies to `verified` and to a dish `price`: UNKNOWN IS
// NOT NONE. `hours: null` (nothing known about the week) and `hours.wed: null`
// (nothing known about that day) are the same word meaning the same thing at two
// depths of the same tree, which is why `null` was chosen over a sentinel.
//
// The consequence that matters is that `openStatus` now answers in SIX states,
// not five: `unknown-today` is *"we cannot say about right now"* and it RENDERS
// WORDS. It is deliberately not folded into `unknown`, because `unknown` means
// "draw no badge" at every call site, and a blank is the same shape as the bug —
// a reader cannot tell "we do not know" from "nobody thought this worth saying".
//
// A `now` written by hand as `{dow, minutes}` (which is how tests/hours.test.js
// drives the pure arithmetic) still works and falls back to wall-clock minutes.
// That is not a silent degradation: a bare wall clock genuinely cannot tell the
// two 02:30s apart, so wall minutes is the only answer available and is right
// except inside a transition. Every production `now` comes from `nowIn` or
// `makeClock().at()`, which always carry both — pinned by a unit test, because
// the way this rots is somebody reshaping the clock read, not a caller.

import { HOME_TIMEZONE } from "./home.js";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]; // JS getDay() order
const DAY_LABEL = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
const DOW = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }; // → getDay()
const WEEK = 7 * 24 * 60; // minutes in a week
const CLOSING_SOON = 60; // minutes: "closing soon" / "opens soon" window

/**
 * True when the viewer's device is on the same wall-clock as `tz` right now, so
 * displayed hours need no timezone qualifier. We store hours as venue-local
 * time (NOT UTC — a fixed UTC instant would drift across a DST switch); status
 * is always computed correctly in the venue's zone, so this is only about
 * disambiguating the *displayed* clock for a viewer whose device sits
 * elsewhere. A local reading their local's hours (the common case) sees no
 * redundant "NZ time" — and now neither does a Londoner reading a London one.
 */
export function viewerOnVenueTime(tz = HOME_TIMEZONE, date = new Date()) {
  const there = nowIn(tz, date);
  const local = date.getHours() * 60 + date.getMinutes();
  const diff = Math.abs(local - there.minutes);
  return Math.min(diff, 1440 - diff) <= 1;
}

/** Minutes since midnight from "HH:MM"; null passes through. */
export function toMinutes(hhmm) {
  if (hhmm == null) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "9pm", "11:30am", "12pm" (noon), "12:30am". */
export function formatTime(min) {
  if (min == null) return "late";
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

// One formatter per zone, built once. Constructing an Intl.DateTimeFormat is
// the expensive part, and a render reads the clock for every venue on screen —
// nearly all of which share a zone.
//
// The cache entry carries the zone that is ACTUALLY in force, not the one asked
// for: a malformed zone falls back to home below, and the countdown re-reads the
// clock a second time to find an instant. Handing it the requested name would
// make the two reads disagree for exactly the record already known to be broken.
const zoneFormatters = new Map();

function zoneFormatter(tz) {
  let f = zoneFormatters.get(tz);
  if (!f) {
    const opts = { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    try {
      f = { format: new Intl.DateTimeFormat("en-NZ", { ...opts, timeZone: tz }), zone: tz };
    } catch {
      // A malformed zone in the data would otherwise throw mid-render and blank
      // the page. Fall back to home rather than to the *viewer's* clock: home is
      // wrong for that one venue in a knowable way, where the device clock is
      // wrong differently for every reader and looks right to whoever is testing.
      f = {
        format: new Intl.DateTimeFormat("en-NZ", { ...opts, timeZone: HOME_TIMEZONE }),
        zone: HOME_TIMEZONE,
      };
    }
    zoneFormatters.set(tz, f);
  }
  return f;
}

/**
 * Current moment in `tz` as
 * `{ dow: 0-6 (Sun=0), minutes: 0-1439, epochMs, tz }`.
 * The single impure function here — pass its result to openStatus().
 *
 * `epochMs` and `tz` are the INSTANT this wall clock was read at and the zone it
 * was read in (the resolved one — see zoneFormatter). They carry no meaning for
 * the open/closed verdict, which is wall-clock by ruling; they are what lets the
 * countdown measure real time across a daylight-saving transition (ADR 0098).
 */
export function nowIn(tz = HOME_TIMEZONE, date = new Date()) {
  const fmt = zoneFormatter(tz);
  const parts = fmt.format.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const dow = DAYS.indexOf((get("weekday") || "").slice(0, 3).toLowerCase());
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  // `Number(date)`, not `date.getTime()`: tests hand this a duck-typed Date
  // whose prototype is Date's but which has no internal slot, so `getTime`
  // exists and throws while `valueOf` answers. A clock read must not be the
  // thing that blows up a render.
  const epochMs = Number(date);
  return { dow, minutes, epochMs: Number.isFinite(epochMs) ? epochMs : null, tz: fmt.zone };
}

/**
 * A clock frozen at one instant that can be read in any zone, memoised per zone.
 *
 * This is what let per-venue timezones land without making the ranker impure or
 * the render O(venues) in Intl constructions. A render takes ONE clock and asks
 * it for each venue's zone; every venue sharing a zone shares the answer, and
 * the whole list is still ranked against a single instant — two venues can't
 * disagree about what time it is because the render took a moment to run.
 * Tests pass a fixed `date`, or a stub with the same `at(tz)` shape.
 */
export function makeClock(date = new Date()) {
  const cache = new Map();
  return {
    date,
    at(tz = HOME_TIMEZONE) {
      if (!cache.has(tz)) cache.set(tz, nowIn(tz, date));
      return cache.get(tz);
    },
  };
}

// Expand the week into absolute open segments (minutes from Sun 00:00).
// A null close is open-ended: capped at midnight for "is it open now" but
// carries closeMin=null so we show no countdown.
//
// A CLOSE AT OR BEFORE ITS OPEN MEANS THE NEXT DAY (owner-ruled 2026-09-07,
// ADR 0094). `["16:30", "03:00"]` is a Friday night that ends on Saturday
// morning. Until then the arithmetic produced `end < start` — a segment that
// ends before it begins — which nothing rejected and `openStatus` simply never
// matched, so a late-trading venue read CLOSED for the whole evening. The
// corpus was swept before this landed: 507 spans, none of which changed meaning.
//
// EXPORTED for `servedStatus` below, which asks the identical question of a
// menu section's serving window ("is the Gold Card menu on right now, and when
// is it next?"). It was module-private until 2026-08-17. The alternative was a
// second copy of the week-expansion in the section code, and the same rule
// applies here as to `tierFromHours` in ranking.js: export it again if a second
// caller needs this reasoning; don't duplicate it.
//
// A DAY THAT IS `null` (or absent) CONTRIBUTES NOTHING, exactly as `[]` does —
// and that is right HERE and wrong everywhere the result is turned into a
// verdict. This function answers "when is this venue open, that we know of";
// `[]` and `null` genuinely have the same answer to that. The difference between
// them is the difference between "and therefore it is shut" and "and therefore
// we cannot say", which is `openStatus`'s job, not this one's (ADR 0105). Do not
// "simplify" a caller by asking this function whether a day is known: it cannot
// tell you, by construction.
export function segments(hours) {
  const out = [];
  DAYS.forEach((key, dow) => {
    for (const [open, close] of hours[key] || []) {
      const o = toMinutes(open);
      const c = toMinutes(close);
      const base = dow * 1440;
      out.push({
        start: base + o,
        end: base + (c == null ? 1440 : c + (c <= o ? 1440 : 0)),
        openMin: o,
        closeMin: c,
        dow,
      });
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

/**
 * The segment containing absolute minute `at`, plus the coordinate the match
 * was made in — `{ seg, at }`, or null. Shared by openStatus and servedStatus
 * so the week-boundary reasoning below exists once.
 *
 * WHY IT ASKS TWICE. A span that wraps out of SATURDAY ends past the last
 * minute of the week: Sat 16:30–03:00 runs to minute 10260 where the week is
 * 10080 long. Sunday 1am is minute 60, not 10140, so the direct containment
 * test cannot see it. Asking again a week later is the same instant for a
 * segment that overran the boundary. Without this the exact case the wrapping
 * close was introduced to serve — a Saturday night — would still read closed on
 * the Sunday morning, which is the failure with the fix half-applied and is
 * why the second loop is not an edge case worth trimming.
 *
 * The caller must use the RETURNED `at` for any arithmetic against `seg.end`
 * (the countdown), not its own: in the wrapped case they differ by a week.
 */
function containing(segs, at) {
  for (const s of segs) if (at >= s.start && at < s.end) return { seg: s, at };
  for (const s of segs) {
    const wrapped = at + WEEK;
    if (wrapped >= s.start && wrapped < s.end) return { seg: s, at: wrapped };
  }
  return null;
}

// ————————————————— The countdown, measured in REAL minutes (ADR 0098) ————————
//
// Everything above works in minutes-of-week, which is a WALL CLOCK. On the two
// nights a year a zone changes offset that stops being a measure of time:
//   • APRIL (NZ, fall back). 02:00–02:59 happens twice. At 02:30 NZDT a 03:00
//     close is NINETY real minutes away and wall arithmetic says thirty.
//   • SEPTEMBER (NZ, spring forward). 02:00–02:59 never happens. At 01:59 NZST
//     a 03:00 close is ONE real minute away and wall arithmetic says sixty-one.
// Both are the same defect and this is the one fix for both.
//
// THE INVARIANT WORTH STATING: the number in "Closes in N min" is the real
// minutes until this engine's own verdict changes. Before, on a transition
// night, the badge could say "31 min" and read "Closed" one minute later.

const MS_MIN = 60_000;
const HALF_WEEK = WEEK / 2;

/** Signed shortest distance between two minutes-of-week, in (-5040, 5040]. */
function signedWeekDelta(d) {
  return ((((d % WEEK) + WEEK + HALF_WEEK) % WEEK) - HALF_WEEK);
}

/** Minutes-of-week the wall clock in `zone` reads at instant `ms`. */
function wallOfWeek(zone, ms) {
  const t = nowIn(zone, new Date(ms));
  return t.dow * 1440 + t.minutes;
}

/**
 * The first instant at or after `fromMs` whose wall clock in `zone` has reached
 * the wall clock `wallDelta` minutes ahead of the one `fromMs` reads.
 *
 * TWO PROBES, NOT A SEARCH. Adding `wallDelta` to the instant is right whenever
 * the offset is the same at both ends; when it is not, the miss IS the offset
 * change, so correcting by it lands on the answer. A third probe would only
 * repeat the second. This is why the whole thing costs one extra Intl read on
 * an ordinary day and two on a transition night, rather than a scan.
 *
 * WHEN THE TARGET DOES NOT EXIST (a close inside the deleted hour) the two
 * probes disagree in both directions and neither converges. The honest answer
 * is then the transition itself — the instant at which this engine's own
 * wall-clock verdict flips — so the bracket the probes straddle is bisected for
 * it. Saying "31 min" and then "Closed" a minute later is the LATE direction,
 * which ADR 0094 named as the serious one.
 */
function instantAhead(zone, fromMs, wallHere, wallDelta) {
  const target = (wallHere + wallDelta) % WEEK;
  const first = fromMs + wallDelta * MS_MIN;
  const miss = signedWeekDelta(target - wallOfWeek(zone, first));
  if (miss === 0) return first;
  const second = first + miss * MS_MIN;
  if (signedWeekDelta(target - wallOfWeek(zone, second)) === 0) return second;

  // The gap. Within the bracket the wall clock only ever jumps FORWARD, so
  // "how much wall clock has elapsed since lo" is monotonic there and can be
  // bisected — which it cannot be across a fall-back, hence the probes above.
  let lo = Math.min(first, second);
  let hi = Math.max(first, second);
  const base = wallOfWeek(zone, lo);
  const want = (target - base + WEEK) % WEEK;
  const elapsed = (ms) => (wallOfWeek(zone, ms) - base + WEEK) % WEEK;
  if (elapsed(hi) < want) return hi;
  while (hi - lo > MS_MIN) {
    const mid = lo + Math.round((hi - lo) / 2 / MS_MIN) * MS_MIN;
    if (mid <= lo || mid >= hi) break;
    if (elapsed(mid) >= want) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * `wallDelta` wall-clock minutes ahead, re-measured as REAL minutes.
 *
 * Falls back to the wall-clock number when `now` carries no instant (a
 * hand-written `{dow, minutes}` — see the module header) and when the answer
 * comes back non-positive or non-finite, which is not a countdown and must
 * never reach a label: ADR 0094 §2 already shipped "Closes in -1315 min" once.
 */
function realMinutes(now, wallDelta) {
  if (!now || now.epochMs == null || !now.tz) return wallDelta;
  const ms = instantAhead(now.tz, now.epochMs, now.dow * 1440 + now.minutes, wallDelta);
  const real = Math.round((ms - now.epochMs) / MS_MIN);
  return Number.isFinite(real) && real > 0 ? real : wallDelta;
}

/**
 * Did this record say anything at all about day `dow` (a getDay() index)?
 *
 * `null` and a MISSING KEY both answer no, and they answer it identically on
 * purpose. `validate.py` insists on all seven keys, so a written record says
 * *"we asked and were not told"* rather than trailing off; but the engine reads
 * an absent key the safe way regardless, because the alternative is a
 * hand-written or half-migrated object silently asserting CLOSED — which is the
 * exact direction ADR 0094 exists to stop. Strict validator, tolerant engine.
 */
export function dayIsKnown(hours, dow) {
  return hours != null && hours[DAYS[dow]] != null;
}

/** The day keys this record says nothing about, as getDay() indices. */
function unknownDows(hours) {
  return DAYS.map((_, dow) => dow).filter((dow) => !dayIsKnown(hours, dow));
}

/**
 * Live status for a venue's hours at moment `now`.
 *
 * `now` is `{ dow, minutes }` — and, from `nowIn`/`makeClock().at()`, also
 * `{ epochMs, tz }`, which is what makes the countdown real minutes rather than
 * wall-clock minutes (ADR 0098). The open/closed VERDICT reads the wall clock
 * either way.
 *
 * Returns { state, label, detail, minutes }:
 *   state:   'open' | 'closing-soon' | 'closed' | 'opening-soon' | 'unknown'
 *            | 'unknown-today'
 *   minutes: real minutes until that state changes — until the close when open,
 *            until the next opening when closed — or null when there is nothing
 *            to count to (no hours, an open-ended close, a week with no
 *            segments). It is the number `label` renders when it renders one,
 *            exposed because the 60-minute gate means the interesting values are
 *            the ones the badge does NOT show.
 * `unknown` = no hours data (render no badge).
 * `unknown-today` = we hold hours, but nothing for the day the reader is in, and
 *            nothing else puts them inside an opening. It CARRIES WORDS and must
 *            be rendered (ADR 0105) — the whole point is that a person can tell
 *            it apart from "Closed", which is what this record used to say about
 *            a day nobody ever told us about. Pure.
 */
export function openStatus(hours, now) {
  if (!hours || typeof hours !== "object") return { state: "unknown", label: "", detail: "", minutes: null };
  const segs = segments(hours);

  const at = now.dow * 1440 + now.minutes;

  // Open right now?
  //
  // THIS COMES FIRST, BEFORE THE UNKNOWN-DAY TEST, AND THE ORDER IS THE WHOLE
  // ARGUMENT. A Tuesday span that runs to 03:00 puts the reader inside an
  // opening at 2am on an unknown Wednesday, and we know that from TUESDAY's
  // line. Positive evidence of being open beats an absent day; only when there
  // is no such evidence does the silence decide.
  const found = segs.length ? containing(segs, at) : null;
  if (found) {
    const current = found.seg;
    if (current.closeMin == null) return { state: "open", label: "Open", detail: "", minutes: null };
    // Wall-clock minutes to the close, then re-measured as real ones. The
    // 60-minute gate reads the REAL number, so "closing soon" means the last
    // hour of the reader's life rather than the last hour of the clock face —
    // which is also what stops April running the whole 60→1 sequence twice.
    const left = realMinutes(now, current.end - found.at);
    if (left <= CLOSING_SOON) {
      // One phrase, not two. The card renders `label · detail`, so a "Closing
      // soon" label beside a "closes in 12 min" detail said the same thing
      // twice and spent a line doing it (owner, 2026-08-16). The *number* is
      // the useful half; "soon" is already carried by the amber dot.
      return { state: "closing-soon", label: `Closes in ${left} min`, detail: "", minutes: left };
    }
    return {
      state: "open",
      label: "Open",
      detail: `until ${formatTime(current.closeMin)}`,
      minutes: left,
    };
  }

  // Not inside an opening — so what the record says about TODAY now decides,
  // and if it says nothing, so must we (ADR 0105). "Closed" here would be the
  // record asserting a day it was never told about, in the direction that sends
  // someone across town to a shut door — or, worse, keeps them at home while the
  // shop is trading.
  const unknown = unknownDows(hours);
  if (unknown.includes(now.dow)) {
    // ONE PHRASE, NOT A LABEL PLUS A BLANK. Every render on the site draws
    // `label · detail` and skips the badge entirely on `unknown`; this state
    // exists so that something legible is drawn instead of nothing.
    return {
      state: "unknown-today",
      label: "Hours not published today",
      detail: "",
      minutes: null,
    };
  }

  if (!segs.length) return { state: "closed", label: "Closed", detail: "", minutes: null };

  // Otherwise find the next opening, wrapping the week.
  //
  // The SEARCH stays on the wall clock: it is picking which stated opening comes
  // next, and an offset shift is an hour against gaps that are hours or days.
  // Only the chosen one's distance is re-measured.
  let best = Infinity;
  let nextSeg = null;
  for (const s of segs) {
    const delta = (s.start - at + WEEK) % WEEK;
    if (delta > 0 && delta < best) {
      best = delta;
      nextSeg = s;
    }
  }
  if (!nextSeg) return { state: "closed", label: "Closed", detail: "", minutes: null };

  const opensToday = nextSeg.dow === now.dow && nextSeg.start > at;

  // 🚩 AN UNKNOWN DAY BETWEEN HERE AND THERE MAKES "next" A CLAIM WE CANNOT
  // MAKE (ADR 0105). Today is known by now — the branch above returned
  // otherwise — but the days in between need not be. On a Tuesday night, with
  // Wednesday unpublished, "opens Thu 5pm" quietly re-asserts the Wednesday the
  // record was rewritten to stop asserting: the shop may well open tomorrow.
  // The VERDICT is untouched (closed right now is known and true); only the
  // detail is hedged, and the hedge leads so it cannot be skimmed past.
  //
  // The comparison is on the wall clock deliberately: it matches the search
  // above, and an unknown day is a 1,440-minute window against which an
  // offset shift is noise. Note this cannot collide with `opening-soon` below —
  // an unknown day contributes no segment, so an opening within the hour is
  // always on a day that starts no later than this one.
  const dayStartDelta = (dow) => (dow * 1440 - at + WEEK) % WEEK;
  const unknownFirst = unknown.some((dow) => dayStartDelta(dow) < best);

  best = realMinutes(now, best);

  // Opening within the hour reads as ONE phrase — "Opens in 14 min" — for the
  // same reason as closing-soon above: "Opens soon · opens in 14 min" was the
  // word "soon" and the number that makes it precise, competing. Further out,
  // label and detail genuinely differ ("Closed" is the state, "opens Mon
  // 9:30am" is the fact), so both are kept.
  if (best <= CLOSING_SOON) {
    return { state: "opening-soon", label: `Opens in ${best} min`, detail: "", minutes: best };
  }
  const at_ = opensToday
    ? formatTime(nextSeg.openMin) // e.g. after the lunch–dinner gap
    : `${DAY_LABEL[DAYS[nextSeg.dow]]} ${formatTime(nextSeg.openMin)}`;
  const when = unknownFirst ? `next published opening ${at_}` : `opens ${at_}`;
  return { state: "closed", label: "Closed", detail: when, minutes: best };
}

/**
 * One-line human intervals for a day: "11:30am–2pm, 5–9pm" or "Closed".
 *
 * A NULL OPEN reads as "till 2pm", not as a range. Venue `hours` never carry
 * one — validate.py requires a real open time there — but a section's `served`
 * window may (ROADMAP Theme 28c): a menu that says *"served till 2pm"* states no start,
 * and writing one we were never told would be inventing evidence. "late–2pm"
 * is what the naive formatter produced, which is worse than saying nothing.
 */
export function formatDay(intervals) {
  // A NULL OR ABSENT DAY reads "Not published", never "Closed" (ADR 0105). The
  // column is already headed "Hours", so two words are enough here and the badge
  // above carries the fuller sentence. This is the row a reader compares against
  // a real "Closed" one line up, so the two must not be the same string — which
  // is exactly what the shape used to force.
  if (intervals == null) return "Not published";
  if (!intervals.length) return "Closed";
  return intervals
    .map(([o, c]) => {
      if (o == null && c == null) return "all day"; // no bound either end
      if (o == null) return `till ${formatTime(toMinutes(c))}`;
      return `${formatTime(toMinutes(o))}–${formatTime(toMinutes(c))}`;
    })
    .join(", ");
}

/**
 * Collapse the week into rows, merging consecutive days with identical
 * hours into ranges: [{ days: "Mon–Fri", text: "11:30am–9pm" }, …]. Pure.
 */
export function groupWeek(hours) {
  if (!hours) return [];
  const rows = [];
  for (const key of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
    const text = formatDay(hours[key]);
    const prev = rows[rows.length - 1];
    if (prev && prev.text === text) {
      prev.end = key;
      prev.keys.push(key);
    } else {
      rows.push({ start: key, end: key, text, keys: [key] });
    }
  }
  return rows.map((r) => ({
    days: r.start === r.end ? DAY_LABEL[r.start] : `${DAY_LABEL[r.start]}–${DAY_LABEL[r.end]}`,
    text: r.text,
    dows: r.keys.map((k) => DOW[k]), // getDay() indices, for "today" highlighting
  }));
}

// ——————————————————— When a SECTION is served (Theme 28c) ————————————————————
//
// `section.served` has exactly the same shape as a venue's `hours` — all seven
// day keys, each a list of [open, close] "HH:MM" pairs, [] meaning not served
// that day — which is the whole point: everything above applies to it unchanged
// and there is one week-reasoning engine, not two.
//
// ONE DELIBERATE EXTENSION: `open` may be null, meaning "from opening". `hours`
// already allows a null CLOSE for "till late"; this is the symmetric case, and
// real menus need it — "served till 2pm" states an end and no start.
//
// IT ANNOTATES; IT NEVER FILTERS. This diverges from `available` (temporal.js),
// which removes an out-of-window section from the record before anything
// renders. Three reasons, and each of them is a bug we would be shipping:
//   1. `available` resolves once per load from `todayIn()`, so it is date-
//      granular and stable for a whole session. A time-of-day window resolved
//      the same way would make the menu CHANGE UNDER THE READER mid-session —
//      dishes disappearing at 2pm while they are looking at them.
//   2. Hiding the section means a reader at 9pm cannot discover that the venue
//      HAS a Gold Card menu. That is information they want, for tomorrow.
//   3. `#section-<id>` DEEP LINKS would break as a function of the clock. A
//      link someone was sent would work at 1pm and 404 at 1am. Theme 34 is
//      entirely about sending a URL that survives; a section that vanishes on a
//      timetable is the opposite of that.
// So everything below returns text to put BESIDE the section. Nothing here
// removes anything.

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * `served` with its null opens resolved to real times, in the venue `hours`
 * shape `segments()` consumes. A null open takes the venue's FIRST opening time
 * that day when we have hours, and 00:00 when we don't (the section is served
 * from whenever the doors open; with no hours the safest reasoning bound is the
 * start of the day, which can only make the window wider, never narrower).
 *
 * The 00:00 is a REASONING bound and must never be rendered — see
 * `openIsStated`. Pure; `hours` may be null.
 */
export function resolveServed(served, hours = null) {
  const out = {};
  for (const key of DAY_KEYS) {
    const intervals = Array.isArray(served?.[key]) ? served[key] : [];
    out[key] = intervals
      .filter((iv) => Array.isArray(iv) && iv.length === 2)
      .map(([open, close]) => {
        if (open != null) return [open, close];
        const day = Array.isArray(hours?.[key]) ? hours[key] : [];
        return [day.length && day[0][0] != null ? day[0][0] : "00:00", close];
      });
  }
  return out;
}

/**
 * Did the SECTION itself state this start time, or did we derive it from the
 * venue's hours (or from the 00:00 floor)? Only a stated time may be printed as
 * a start time: "brunch starts at 10am" is our inference from two facts, not
 * something the shop ever said, and "next served 12am" would be a pure
 * invention. The derived case renders "from opening" instead.
 */
function openIsStated(served, dow, openMin) {
  const key = DAY_KEYS[(dow + 6) % 7]; // getDay() (Sun=0) → mon-first index
  const intervals = Array.isArray(served?.[key]) ? served[key] : [];
  return intervals.some((iv) => Array.isArray(iv) && iv[0] != null && toMinutes(iv[0]) === openMin);
}

/**
 * Is this section being served at moment `now` ({dow, minutes}), and if not,
 * when is it next? Pure — the clock is read by the caller (nowIn/makeClock).
 *
 * Returns `{ state, next, today, stated, minutes }`:
 *   state    'served' | 'not-served' | 'unknown' ('unknown' = no window at all,
 *            or a window with no servable minutes: render nothing, never a guess)
 *   next     the next segment {start,end,openMin,closeMin,dow}, or null
 *   today    that segment falls later on the same day
 *   stated   the section stated that start time itself (see openIsStated)
 *   minutes  how far away it is
 */
export function servedStatus(served, now, hours = null) {
  const none = { state: "unknown", next: null, today: false, stated: false, minutes: null };
  if (!served || typeof served !== "object") return none;
  const segs = segments(resolveServed(served, hours));
  if (!segs.length) return none;

  const at = now.dow * 1440 + now.minutes;
  if (containing(segs, at)) {
    return { state: "served", next: null, today: false, stated: false, minutes: null };
  }

  let best = Infinity;
  let nextSeg = null;
  for (const s of segs) {
    const delta = (s.start - at + WEEK) % WEEK;
    if (delta > 0 && delta < best) {
      best = delta;
      nextSeg = s;
    }
  }
  if (!nextSeg) return { state: "not-served", next: null, today: false, stated: false, minutes: null };
  return {
    state: "not-served",
    next: nextSeg,
    today: nextSeg.dow === now.dow && nextSeg.start > at,
    stated: openIsStated(served, nextSeg.dow, nextSeg.openMin),
    minutes: best,
  };
}

/**
 * The section's serving window in the same words the venue's hours table uses:
 * "Served Mon–Fri 11:30am–5:30pm, Sat–Sun 10am–5:30pm", "Served every day till
 * 3pm". Built on groupWeek/formatDay/formatTime so there is one formatter for
 * both, and from the RAW `served` — never the resolved one — so a start time we
 * derived from the venue's hours cannot leak into the line.
 *
 * Days with no window are left out rather than printed as "Closed": the line
 * lists when the section IS served, and the days it omits say the rest.
 * null when there is nothing to say. Pure.
 */
export function servedText(served) {
  if (!served || typeof served !== "object") return null;
  const rows = groupWeek(served).filter((r) =>
    r.dows.some((d) => (served[DAY_KEYS[(d + 6) % 7]] || []).length)
  );
  if (!rows.length) return null;
  // One row covering all seven days is "every day", not "Mon–Sun" — it is how a
  // menu writes it, and it is shorter on a 390 px screen.
  if (rows.length === 1 && rows[0].dows.length === 7) return `Served every day ${rows[0].text}`;
  return `Served ${rows.map((r) => `${r.days} ${r.text}`).join(", ")}`;
}

/**
 * The quiet marker for a section that is not being served right now, naming
 * when it next is. null when it IS being served, or when we cannot say.
 *
 * "from opening" rather than a time whenever the start was not stated by the
 * section itself — the one thing this must never do is print a start time
 * nobody told us (see openIsStated). Pure; takes a `servedStatus` result.
 */
export function notServedText(status) {
  if (!status || status.state !== "not-served") return null;
  const seg = status.next;
  if (!seg) return "Not served right now";
  const when = status.stated ? `at ${formatTime(seg.openMin)}` : "from opening";
  const day = status.today ? "" : `${DAY_LABEL[DAYS[seg.dow]]} `;
  return `Not served right now · next served ${day}${when}`;
}
