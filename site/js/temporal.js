// The time dimension. Every fact this app holds about the world can carry
// *when* it was true; this module resolves those dated facts down to "what is
// true today" so the rest of the app never has to think about time.
//
// Doctrine: atelier PRINCIPLES §9 — data carries the time dimension its domain
// implies. Design and rationale: docs/decisions/0023. Two clocks, kept apart:
//   • world time  — when it was true out there  (`from`, `to`, `date`, `opened`)
//   • record time — when we learned/wrote it    (`recorded`, `offBy`, `added`,
//                                                and the venue's `verified`)
// They diverge constantly here: we read a price off a printed menu years after
// it changed. Collapsing them would force us to invent a date we don't have.
//
// Four primitives, all optional and all backward compatible — a record with no
// dates anywhere resolves to itself:
//   1. Temporal value   a scalar, or a dated series  (dish price, address, phone)
//   2. Lifecycle        dated transitions, never a `closed: true` flag
//   3. Availability     a window and/or a recurring season on a section or dish
//   4. Revisions        a dated log of what changed about a dish (data only)
//
// Pure: every function takes `asOf` (an ISO date string) rather than reading a
// clock, so it is fully unit-testable. `todayNZ()` is the only impure part.

// Dates are ISO 8601, and MAY be reduced precision: "2019", "2019-05" and
// "2019-05-21" are all valid. That is not slackness — it is the honest record
// of a menu scan dated only by its year, and §9's "unknown is not none" applied
// to precision rather than presence. Comparisons always widen a partial date to
// its full interval, so a partial never accidentally reads as 1 January.
const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const isDate = (s) => typeof s === "string" && DATE_RE.test(s);

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** First day of the interval a (possibly partial) date names. "2019" → "2019-01-01". */
export function startOf(d) {
  if (!isDate(d)) return null;
  return d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d;
}

/** Last day of that interval. "2019" → "2019-12-31"; "2019-02" → "2019-02-28". */
export function endOf(d) {
  if (!isDate(d)) return null;
  if (d.length === 10) return d;
  if (d.length === 4) return `${d}-12-31`;
  const [y, m] = d.split("-").map(Number);
  const last = m === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[m - 1];
  return `${d}-${String(last).padStart(2, "0")}`;
}

// NZ seasons by month number (1-12) — the southern hemisphere, deliberately:
// this app is Wellington's. A "summer menu" here means Dec–Feb.
const SEASON_MONTHS = {
  summer: [12, 1, 2],
  autumn: [3, 4, 5],
  winter: [6, 7, 8],
  spring: [9, 10, 11],
};
export const SEASONS = Object.keys(SEASON_MONTHS);

// Lifecycle event types. Transitions with dates, not a boolean: a flag loses
// *when*, cannot express a reopening, and rewrites history as it flips.
export const LIFECYCLE_EVENTS = ["closed-temporarily", "reopened", "closed-permanently"];

/**
 * Today in Pacific/Auckland as "YYYY-MM-DD". The venue's clock, not the
 * viewer's — same call as hours.js makes, for the same reason: a guest
 * browsing from overseas must still see the right answer for a Wellington
 * venue. en-CA is the locale whose date format *is* ISO 8601.
 * The single impure function here; pass its result into everything else.
 */
export function todayNZ(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// ————————————————————————————————— 1. Temporal value —————————————————————————
// A field is either the plain value ("true now; we never established since
// when") or a dated series [{value, from?, recorded?, note?}]. The shorthand is
// not laziness: for most of this data the start date genuinely was never
// established, and the absence of `from` says exactly that.
//
// Only ever applied to fields whose value is a scalar (number/string/null) —
// that is what makes Array.isArray a safe discriminator between "a series" and
// "the value itself". Never put the primitive on an array-valued field.
//
// An entry takes effect on `from` (world time: when the price actually changed)
// when we know it, and otherwise on `recorded` (record time: the day we read it
// off a menu — by which it was demonstrably already true). That fallback is
// what lets a real series exist at all: we almost never learn the day a price
// rose, only the day we saw the new one.

/** The date an entry takes effect: world time if known, else record time. */
const effective = (e) => e.from ?? e.recorded;

/**
 * Normalise a temporal field to a sorted series. Always returns an array;
 * `[]` only when the field is absent entirely (undefined). A plain value —
 * including `null`, which for a price means "market/varies" — becomes one
 * entry. Undated entries ("since before we recorded") sort first.
 *
 * `defaultRecorded` supplies the record time for entries that carry none —
 * callers pass the venue's `verified` date, which is precisely "when we last
 * checked this menu". That is why an unchanged price can stay a bare scalar and
 * still be dated: the venue already carries its record time.
 */
export function series(field, defaultRecorded = null) {
  if (field === undefined) return [];
  const raw = Array.isArray(field) ? field : [{ value: field }];
  const fallback = isDate(defaultRecorded) ? defaultRecorded : null;
  const out = raw
    .filter((e) => e && typeof e === "object" && "value" in e)
    .map((e) => ({
      value: e.value,
      from: isDate(e.from) ? e.from : null,
      recorded: isDate(e.recorded) ? e.recorded : fallback,
      note: typeof e.note === "string" ? e.note : null,
    }));
  out.sort((a, b) => {
    const x = startOf(effective(a));
    const y = startOf(effective(b));
    if (x === y) return 0;
    if (x === null) return -1;
    if (y === null) return 1;
    return x < y ? -1 : 1;
  });
  return out;
}

/**
 * The value in force on `asOf` — the latest entry that had taken effect by
 * then. `null` when the field is absent, or when every entry is still in the
 * future (a price announced before it applies: there is no current value, and
 * `pending()` is where that future entry surfaces).
 */
export function resolveValue(field, asOf, defaultRecorded = null) {
  let current = null;
  for (const e of series(field, defaultRecorded)) {
    const start = startOf(effective(e));
    if (start === null || start <= asOf) current = e;
    else break;
  }
  return current ? current.value : null;
}

/**
 * The next scheduled change, or null. Keyed on `from` only — a *world* date in
 * the future is a genuine announcement ("coffee is $6 from Wednesday"); a
 * future record date would be nonsense. This is what makes an upcoming price
 * rise a data fact rather than a feature: recording one costs nothing today and
 * the UI can pick it up whenever it is built (ROADMAP Theme 13).
 */
export function pending(field, asOf) {
  return series(field).find((e) => e.from !== null && startOf(e.from) > asOf) || null;
}

/** True when the field carries real dated history (more than one entry). */
export function isDated(field) {
  return Array.isArray(field) && field.length > 1;
}

// ————————————————————————————————— 2. Lifecycle ——————————————————————————————
// `lifecycle: { opened, added, events: [{type, date, until?, note?}] }`
//   opened  world time — when the business started trading; absent = never established
//   added   record time — when it entered Faves
//   events  dated transitions, in any order (sorted here)

/**
 * A venue's state on `asOf`, folded from its dated events:
 *   { state, since, until, overdue, note, opened, added, upcoming }
 * `state` is "trading" | "closed-temporarily" | "closed-permanently".
 * `overdue` marks a temporary closure whose stated `until` has passed with no
 * reopening recorded — we do not invent the reopening (that would be a claim
 * stronger than the evidence); the record is flagged as needing a check.
 * `upcoming` is the next event still in the future (a closure announced ahead).
 * A record with no `lifecycle` block resolves to plain "trading" with nulls.
 */
export function venueState(record, asOf) {
  const lc = record?.lifecycle || {};
  const events = (Array.isArray(lc.events) ? lc.events : [])
    .filter((e) => e && LIFECYCLE_EVENTS.includes(e.type) && isDate(e.date))
    .sort((a, b) => {
      const x = startOf(a.date);
      const y = startOf(b.date);
      return x === y ? 0 : x < y ? -1 : 1;
    });

  let state = "trading";
  let since = null;
  let until = null;
  let note = null;
  for (const e of events) {
    if (startOf(e.date) > asOf) break;
    if (state === "closed-permanently") break; // terminal: nothing follows it
    state = e.type === "reopened" ? "trading" : e.type;
    since = e.date;
    until = e.type === "closed-temporarily" && isDate(e.until) ? e.until : null;
    note = typeof e.note === "string" ? e.note : null;
  }

  return {
    state,
    since,
    until,
    overdue: state === "closed-temporarily" && until !== null && endOf(until) < asOf,
    note,
    opened: isDate(lc.opened) ? lc.opened : null,
    added: isDate(lc.added) ? lc.added : null,
    upcoming: events.find((e) => startOf(e.date) > asOf) || null,
  };
}

// ————————————————————————————————— 3. Availability ———————————————————————————
// `available: { from?, to?, offBy?, season?, note? }` on a menu section or dish.
// Absent = always on the menu (the overwhelmingly common case).
//   from    world — first day on the menu (inclusive)
//   to      world — LAST day on the menu (inclusive), read the way a human
//           writes it: "on the menu 1 May to 31 August"
//   offBy   record — the day we confirmed it was GONE, for the common case where
//           a dish vanished between two menu readings and the day it actually
//           came off is unknowable. `to: absent, offBy: <date>` is the honest
//           encoding of "it was here, then it wasn't"; inventing a `to` would
//           be a claim stronger than the evidence.
//   season  recurring, NZ months — a menu that comes back every winter is one
//           fact, not a row per year

/** True when this section/dish is on the menu on `asOf`. */
export function isAvailable(obj, asOf) {
  const a = obj?.available;
  if (!a || typeof a !== "object") return true;
  if (isDate(a.from) && asOf < startOf(a.from)) return false;
  if (isDate(a.to) && asOf > endOf(a.to)) return false;
  if (isDate(a.offBy) && asOf >= startOf(a.offBy)) return false;
  if (typeof a.season === "string") {
    const months = SEASON_MONTHS[a.season];
    if (!months) return true; // unknown season name: don't hide food over a typo
    if (!months.includes(Number(asOf.slice(5, 7)))) return false;
  }
  return true;
}

/**
 * True when this is gone for good rather than merely out of season — a dish
 * taken off the menu. Kept in the data (a hard delete would destroy every date
 * attached to it, including that it ever existed) and filtered out of the view.
 */
export function isRetired(obj, asOf) {
  const a = obj?.available;
  if (!a || a.season) return false;
  return (isDate(a.to) && asOf > endOf(a.to)) || (isDate(a.offBy) && asOf >= startOf(a.offBy));
}

// ————————————————————————————————— 4. Resolution ——————————————————————————————

/**
 * Resolve one menu item to its "today" form: current price, plus the dated
 * extras a future price-trend view needs. Non-temporal items pass through with
 * those extras absent, so every existing consumer (price.js, menu.js, cart.js,
 * search) reads `item.price` exactly as it always has.
 *   priceSeries  the full dated series — present only when there IS history
 *   priceNext    the next scheduled change {value, from, note} — or absent
 */
function resolveItem(item, asOf, defaultRecorded) {
  const out = { ...item };
  if ("price" in item) out.price = resolveValue(item.price, asOf, defaultRecorded);
  if (isDated(item.price)) out.priceSeries = series(item.price, defaultRecorded);
  const next = pending(item.price, asOf);
  if (next) out.priceNext = next;
  return out;
}

/**
 * Project a record onto a single day: dated fields collapse to the value in
 * force, seasonal and retired sections and dishes drop out of the menu, and the
 * venue's lifecycle folds into one `closure` object. The result has the SAME
 * shape the app has always consumed — that is the whole point. Time lives in
 * the data and in this module; nothing downstream learns about it.
 *
 * History beyond `priceSeries` (which has a named future use) is not carried
 * into the projection: the source JSON keeps every dated fact, and anything
 * wanting full history reads the file rather than the resolved record.
 */
export function resolveRecord(record, asOf = todayNZ()) {
  if (!record || typeof record !== "object") return record;
  const out = { ...record };
  // The venue's `verified` date is the record time for every undated fact in
  // its menu: "this is what the menu said when we last checked it".
  const recorded = record.verified;

  // Fields that may carry a dated series, at the top level and per branch.
  for (const f of ["address", "phone"]) {
    if (Array.isArray(record[f])) out[f] = resolveValue(record[f], asOf, recorded);
  }
  if (Array.isArray(record.locations)) {
    out.locations = record.locations.map((b) => {
      const branch = { ...b };
      for (const f of ["address", "phone"]) {
        if (Array.isArray(b[f])) branch[f] = resolveValue(b[f], asOf, recorded);
      }
      return branch;
    });
  }

  if (Array.isArray(record.menu)) {
    out.menu = record.menu
      .filter((s) => isAvailable(s, asOf))
      .map((s) => ({
        ...s,
        items: (s.items || [])
          .filter((i) => isAvailable(i, asOf))
          .map((i) => resolveItem(i, asOf, recorded)),
      }))
      // A section whose dishes are all out of season is an empty heading; a
      // section that genuinely ships no items is a data error validate.py
      // catches, so dropping empties here is safe.
      .filter((s) => s.items.length > 0);
  }

  // A pick pointing at an out-of-season dish would dangle — the reference is
  // still valid in the source (validated against the full menu), just not
  // orderable today.
  if (Array.isArray(record.picks) && Array.isArray(out.menu)) {
    const live = new Set(out.menu.flatMap((s) => s.items.map((i) => i.name)));
    out.picks = record.picks.filter((p) => live.has(p));
  }

  out.closure = venueState(record, asOf);
  return out;
}

/**
 * Is this venue open for business at all today? False for a closure of either
 * kind — a place shut for a refit is not somewhere you can eat tonight, whatever
 * its posted hours say. Ranking and the "Pick for us" shuffle read this.
 */
export function isTrading(record) {
  return (record?.closure?.state ?? "trading") === "trading";
}

/** Permanently closed: kept in the data (a hard delete would destroy the record
 *  that it ever existed), but no longer offered as a place to eat. */
export function isGone(record) {
  return record?.closure?.state === "closed-permanently";
}
