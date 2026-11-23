// What the activity screen SAYS about the log (Theme 32b). Pure: no DOM, no
// storage, no clock of its own — activity-ui.js owns those. Unit-tested in
// tests/activity-view.test.js.
//
// ONE SENTENCE PER KIND, EVERY ONE KEYED. Each sentence is a template with
// `{name}`-style holes and a `data-i18n`-style key, resolved through the `tr`
// function the caller passes (reo.js `t`), so a te reo gloss can replace a
// whole sentence later without touching this file. Until one is attested by the
// dictionary the English stands, exactly as reo.js does for every interpolated
// string.
//
// THE LABEL IS THE SNAPSHOT (activity.js): an entry reads the same after its
// dish has left the menu. A missing label (an entry from a build that had none)
// falls back to a plain noun rather than an empty hole.
//
// 🛑 settings.change NEVER SAYS WHAT A DIAL WAS SET TO. activity.js discards the
// value on the way in; this file could not show it if it tried, and the dial
// names below are the whole of what may be said (SETTINGS_DIALS).

import { SYSTEM_KINDS } from "./activity.js";
import { canonicalVenueId } from "./renames.js";

/**
 * The day Faves began keeping this log: the day the recorder (32a, ADR 0164)
 * shipped — commit 36b82960, 2026-10-18, New Zealand time. The store keeps no
 * "started on" date of its own (the oldest entry is evicted at the cap, so it
 * would drift), and nothing before the recorder existed was ever recorded, so
 * this is a fact about the app, not about one phone: a phone that took the
 * update later still holds nothing from before that day. The empty screen says
 * it (roadmap 390/020: an empty history reads as a bug unless it says why).
 */
export const ACTIVITY_STARTED = "2026-10-18";

const SYSTEM = new Set(SYSTEM_KINDS);

/** True for the entries the app made about itself (the quiet half). */
export const isSystemKind = (kind) => SYSTEM.has(kind);

/** The sentence templates, by kind. `key` is the reo.js key. */
export const SENTENCES = Object.freeze({
  "favourite.add": { key: "activity.s.favouriteAdd", en: "Added {name} to your favourites" },
  "favourite.remove": { key: "activity.s.favouriteRemove", en: "Removed {name} from your favourites" },
  "rating.set": { key: "activity.s.ratingSet", en: "Rated {name} {to} out of 5" },
  "rating.change": { key: "activity.s.ratingChange", en: "Changed your rating of {name} from {from} to {to}" },
  "rating.clear": { key: "activity.s.ratingClear", en: "Cleared your rating of {name}" },
  "report.sent": { key: "activity.s.reportSent", en: "Sent a report about {name}" },
  "order.add": { key: "activity.s.orderAdd", en: "Added {name} to your order" },
  "order.addMore": { key: "activity.s.orderAddMore", en: "Added {name} to your order ({to} in total)" },
  "order.remove": { key: "activity.s.orderRemove", en: "Removed {name} from your order" },
  "order.less": { key: "activity.s.orderLess", en: "Took {name} down to {to} in your order" },
  "order.clear": { key: "activity.s.orderClear", en: "Cleared your order" },
  "profile.switch": { key: "activity.s.profileSwitch", en: "Switched to {name}" },
  "settings.change": { key: "activity.s.settingsChange", en: "Changed your {name} setting" },
  "reset.settings": { key: "activity.s.resetSettings", en: "Reset your settings to the defaults" },
  "reset.everything": { key: "activity.s.resetEverything", en: "Deleted everything on this device" },
  "app.updated": { key: "activity.s.appUpdated", en: "Faves updated to version {to}" },
  "app.updatedPlain": { key: "activity.s.appUpdatedPlain", en: "Faves updated" },
  "data.updated": { key: "activity.s.dataUpdated", en: "Menus and prices updated" },
  "cache.refreshed": { key: "activity.s.cacheRefreshed", en: "Refreshed the offline copy of the menus and app" },
});

/** The words for each dial `settings.change` may name (SETTINGS_DIALS). */
export const DIAL_NAMES = Object.freeze({
  favBoostKm: { key: "activity.dial.favBoostKm", en: "favourites distance" },
  farKm: { key: "activity.dial.farKm", en: "distance limit" },
  diet: { key: "activity.dial.diet", en: "dietary needs and allergens" },
  foodPrefs: { key: "activity.dial.foodPrefs", en: "food preferences" },
  lang: { key: "activity.dial.lang", en: "language" },
  mapsApp: { key: "activity.dial.mapsApp", en: "maps app" },
  units: { key: "activity.dial.units", en: "units" },
  currency: { key: "activity.dial.currency", en: "currency" },
});

const identity = (_key, en) => en;

/** Fill `{hole}`s from `vars`; a hole with no value is left as nothing. */
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_m, k) => (vars[k] == null ? "" : String(vars[k])));
}

/** Which template an entry uses — the kind, refined by what the numbers say. */
export function templateKey(e) {
  switch (e.kind) {
    case "rating.set":
      return e.from ? "rating.change" : "rating.set";
    case "order.add":
      return e.to > 1 ? "order.addMore" : "order.add";
    case "order.remove":
      return e.to > 0 ? "order.less" : "order.remove";
    case "reset.performed":
      return e.subject?.label === "everything" ? "reset.everything" : "reset.settings";
    case "app.updated":
      return e.to ? "app.updated" : "app.updatedPlain";
    default:
      return e.kind;
  }
}

const NOUN_FALLBACK = {
  "favourite.add": "a favourite",
  "favourite.remove": "a favourite",
  "report.sent": "a place",
};

/**
 * The sentence for one entry, in the language `tr` answers in. `tr(key,
 * english)` is reo.js `t`; the default keeps English, which is what a unit
 * test and a build with no gloss both want.
 */
export function sentenceOf(entry, tr = identity) {
  const tpl = SENTENCES[templateKey(entry)];
  if (!tpl) return "";
  let name = entry.subject?.label || "";
  if (entry.kind === "settings.change") {
    const d = DIAL_NAMES[name];
    name = d ? tr(d.key, d.en) : "";
  } else if (!name) {
    name = tr("activity.someItem", NOUN_FALLBACK[entry.kind] || "an item");
  }
  return fill(tr(tpl.key, tpl.en), { name, from: entry.from, to: entry.to });
}

// --- Days and times ---------------------------------------------------------
// Local time, because "what did I do last night" is a question about the
// reader's own clock. `tz` is injectable only so a test is not at the mercy of
// the machine's zone; production passes none and the device's own is used.

/** `YYYY-MM-DD` of an instant in `tz` (en-CA is the one locale that writes it so). */
export function dayKey(iso, tz) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "7:04 pm" — the time of day, in the reader's zone. */
export function timeText(iso, tz) {
  return new Intl.DateTimeFormat("en-NZ", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

const dayNumber = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

/** The reo.js key a day heading carries ("activity.today" / "activity.yesterday"),
 *  or null for a dated heading — which is interpolated, so it stays English. The
 *  screen puts the key on the heading as `data-i18n`, so reo.js's translate()
 *  swaps it AND marks it `lang="mi"` (WCAG 3.1.2) — a string swapped by hand
 *  would be pronounced as English. */
export function dayI18nKey(key, now, tz) {
  const gap = dayNumber(dayKey(now, tz)) - dayNumber(key);
  return gap === 0 ? "activity.today" : gap === 1 ? "activity.yesterday" : null;
}

/** "Today", "Yesterday", or "Mon 16 Nov" (with the year when it is not this one). */
export function dayHeading(key, now, tz, tr = identity) {
  const today = dayKey(now, tz);
  const gap = dayNumber(today) - dayNumber(key);
  if (gap === 0) return tr("activity.today", "Today");
  if (gap === 1) return tr("activity.yesterday", "Yesterday");
  // Noon UTC of that calendar day, formatted in UTC, so the zone cannot move the date.
  const [y, m, d] = key.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d, 12));
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(at);
}

/** The date `ACTIVITY_STARTED` in words: "18 October 2026". */
export function startedText() {
  const [y, m, d] = ACTIVITY_STARTED.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

/**
 * Newest first, grouped by local day. `showSystem` false drops the app's own
 * entries (the quiet half) before grouping, so a day holding only version bumps
 * does not appear as an empty heading. Returns `{ days, hiddenSystem }`:
 * `days` is `[{ key, items }]` (items newest first) and `hiddenSystem` counts
 * the entries the toggle is holding back, so the screen can say so.
 */
export function groupByDay(entries, { showSystem = false, tz } = {}) {
  const days = [];
  let hiddenSystem = 0;
  // The log is oldest-first by append, but an import's union is merged in time
  // order and a clock can step back, so sort rather than trust append order.
  // Array sort is stable: entries sharing a second keep the order they landed in.
  const sorted = entries
    .map((e, i) => [e, i])
    .sort((a, b) => Date.parse(b[0].at) - Date.parse(a[0].at) || b[1] - a[1])
    .map(([e]) => e);
  for (const e of sorted) {
    if (isSystemKind(e.kind) && !showSystem) {
      hiddenSystem += 1;
      continue;
    }
    const key = dayKey(e.at, tz);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(e);
    else days.push({ key, items: [e] });
  }
  return { days, hiddenSystem };
}

// --- Links -------------------------------------------------------------------

/**
 * Where an entry's subject lives NOW, or null when it does not (or cannot be
 * shown to). `where` answers about the present data:
 *   venueKind(id) -> "venue" | "recipes" | null   (null: no such venue)
 *   currentDish(venueId, dishId) -> the dish's id today (a renamed dish answers
 *                                  with its new one, dish-id.js `formerIds`), or null
 * Both take CANONICAL venue ids; an entry written before a rename is resolved
 * here (renames.js), so an old log still reaches the venue that replaced it.
 * Entries with no subject (updates, a reset, an order cleared) have no link,
 * and neither does a dish that has left its menu: a link that lands on the top
 * of an unrelated menu would say the dish is still there.
 */
export function linkFor(entry, where) {
  const s = entry?.subject;
  if (!s?.venue || !where) return null;
  if (isSystemKind(entry.kind) || entry.kind === "settings.change" || entry.kind === "profile.switch") return null;
  const venue = canonicalVenueId(s.venue);
  const kind = where.venueKind(venue);
  if (!kind) return null;
  const id = encodeURIComponent(venue);
  if (!s.dish) return `restaurant.html?id=${id}`;
  const now = where.currentDish(venue, s.dish);
  if (!now) return null;
  const dish = encodeURIComponent(now);
  return kind === "recipes" ? `recipe.html?id=${id}&dish=${dish}` : `restaurant.html?id=${id}#dish-${dish}`;
}
