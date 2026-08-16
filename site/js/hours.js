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

import { HOME_TIMEZONE } from "./place.js";

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
function segments(hours) {
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
      return { state: "closing-soon", label: "Closing soon", detail: `closes in ${left} min` };
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
  const when =
    best <= CLOSING_SOON
      ? `opens in ${best} min`
      : opensToday
        ? `opens ${formatTime(nextSeg.openMin)}` // e.g. after the lunch–dinner gap
        : `opens ${DAY_LABEL[DAYS[nextSeg.dow]]} ${formatTime(nextSeg.openMin)}`;
  return {
    state: best <= CLOSING_SOON ? "opening-soon" : "closed",
    label: best <= CLOSING_SOON ? "Opens soon" : "Closed",
    detail: when,
  };
}

/** One-line human intervals for a day: "11:30am–2pm, 5–9pm" or "Closed". */
export function formatDay(intervals) {
  if (!intervals || !intervals.length) return "Closed";
  return intervals
    .map(([o, c]) => `${formatTime(toMinutes(o))}–${formatTime(toMinutes(c))}`)
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
