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
const zoneFormatters = new Map();

function zoneFormatter(tz) {
  let f = zoneFormatters.get(tz);
  if (!f) {
    const opts = { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    try {
      f = new Intl.DateTimeFormat("en-NZ", { ...opts, timeZone: tz });
    } catch {
      // A malformed zone in the data would otherwise throw mid-render and blank
      // the page. Fall back to home rather than to the *viewer's* clock: home is
      // wrong for that one venue in a knowable way, where the device clock is
      // wrong differently for every reader and looks right to whoever is testing.
      f = new Intl.DateTimeFormat("en-NZ", { ...opts, timeZone: HOME_TIMEZONE });
    }
    zoneFormatters.set(tz, f);
  }
  return f;
}

/**
 * Current moment in `tz` as { dow: 0-6 (Sun=0), minutes: 0-1439 }.
 * The single impure function here — pass its result to openStatus().
 */
export function nowIn(tz = HOME_TIMEZONE, date = new Date()) {
  const parts = zoneFormatter(tz).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const dow = DAYS.indexOf((get("weekday") || "").slice(0, 3).toLowerCase());
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dow, minutes };
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
// EXPORTED for `servedStatus` below, which asks the identical question of a
// menu section's serving window ("is the Gold Card menu on right now, and when
// is it next?"). It was module-private until 2026-08-17. The alternative was a
// second copy of the week-expansion in the section code, and the same rule
// applies here as to `tierFromHours` in ranking.js: export it again if a second
// caller needs this reasoning; don't duplicate it.
export function segments(hours) {
  const out = [];
  DAYS.forEach((key, dow) => {
    for (const [open, close] of hours[key] || []) {
      const o = toMinutes(open);
      const c = toMinutes(close);
      const base = dow * 1440;
      out.push({
        start: base + o,
        end: base + (c == null ? 1440 : c),
        openMin: o,
        closeMin: c,
        dow,
      });
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Live status for a venue's hours at moment `now` ({dow, minutes}).
 * Returns { state, label, detail }:
 *   state: 'open' | 'closing-soon' | 'closed' | 'opening-soon' | 'unknown'
 * `unknown` = no hours data (render no badge). Pure.
 */
export function openStatus(hours, now) {
  if (!hours || typeof hours !== "object") return { state: "unknown", label: "", detail: "" };
  const segs = segments(hours);
  if (!segs.length) return { state: "closed", label: "Closed", detail: "" };

  const at = now.dow * 1440 + now.minutes;

  // Open right now?
  const current = segs.find((s) => at >= s.start && at < s.end);
  if (current) {
    if (current.closeMin == null) return { state: "open", label: "Open", detail: "" };
    const left = current.end - at;
    if (left <= CLOSING_SOON) {
      // One phrase, not two. The card renders `label · detail`, so a "Closing
      // soon" label beside a "closes in 12 min" detail said the same thing
      // twice and spent a line doing it (owner, 2026-08-16). The *number* is
      // the useful half; "soon" is already carried by the amber dot.
      return { state: "closing-soon", label: `Closes in ${left} min`, detail: "" };
    }
    return { state: "open", label: "Open", detail: `until ${formatTime(current.closeMin)}` };
  }

  // Otherwise find the next opening, wrapping the week.
  let best = Infinity;
  let nextSeg = null;
  for (const s of segs) {
    const delta = (s.start - at + WEEK) % WEEK;
    if (delta > 0 && delta < best) {
      best = delta;
      nextSeg = s;
    }
  }
  if (!nextSeg) return { state: "closed", label: "Closed", detail: "" };

  const opensToday = nextSeg.dow === now.dow && nextSeg.start > at;

  // Opening within the hour reads as ONE phrase — "Opens in 14 min" — for the
  // same reason as closing-soon above: "Opens soon · opens in 14 min" was the
  // word "soon" and the number that makes it precise, competing. Further out,
  // label and detail genuinely differ ("Closed" is the state, "opens Mon
  // 9:30am" is the fact), so both are kept.
  if (best <= CLOSING_SOON) {
    return { state: "opening-soon", label: `Opens in ${best} min`, detail: "" };
  }
  const when = opensToday
    ? `opens ${formatTime(nextSeg.openMin)}` // e.g. after the lunch–dinner gap
    : `opens ${DAY_LABEL[DAYS[nextSeg.dow]]} ${formatTime(nextSeg.openMin)}`;
  return { state: "closed", label: "Closed", detail: when };
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
  if (!intervals || !intervals.length) return "Closed";
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
  if (segs.some((s) => at >= s.start && at < s.end)) {
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
