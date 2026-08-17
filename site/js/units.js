// Metric or imperial, the reader's choice (ROADMAP Theme 18; ADR 0029).
//
// One rule governs everything here: **convert at RENDER time, never in
// storage**. Distances stay kilometres in the data and in every calculation
// (haversine, walk/drive estimates, the ranking cutoffs); oven temperatures
// stay °C in the recipe JSON. This module is the single place a stored metric
// value turns into the words a reader sees. Nothing round-trips through an
// imperial value, so the source of truth can never drift.
//
// Pure: no DOM, no storage, no settings import — the caller passes the units
// it read. That keeps it unit-testable and keeps settings.js free of display
// concerns.
//
// What the caller passes is a USAGE TABLE, not a word (ADR 0087). Each kind of
// measure answers for itself, because Britain is the case a single word cannot
// carry: miles on the road, °C in the oven.

// The vocabulary a reader can CHOOSE, and what the store keeps. Two words, and
// deliberately not three — "UK" is something Local *does*, never an option on
// this list. The moment it is offered, someone in Britain reads "imperial" as
// "the British one" and gets a °F oven, which is the bug this replaced.
export const UNITS = ["metric", "imperial"];
export const DEFAULT_UNITS = "metric"; // New Zealand first; the data is metric

// Shown in the Settings picker. The parenthetical names the two things that
// actually change, so the choice is concrete rather than an abstraction.
// "US customary" rather than "Imperial" because that is what this option has
// always been: °F ovens are a US usage, not a British one.
export const UNIT_OPTIONS = [
  { key: "metric", label: "Metric (km, °C)" },
  { key: "imperial", label: "US customary (miles, °F)" },
];

// One entry per KIND of measure Faves shows. Frozen because these are shared
// constants handed out by `unitUsage` — a caller that mutated one would change
// what every other reader on the page sees.
export const METRIC_USAGE = Object.freeze({ distance: "metric", oven: "metric" });
export const IMPERIAL_USAGE = Object.freeze({ distance: "imperial", oven: "imperial" });

const KM_PER_MILE = 1.609344; // exact, by international agreement
const YARDS_PER_MILE = 1760;

const one = (v) => (v === "imperial" ? "imperial" : "metric");

/**
 * The usage table for whatever the caller passed: a table (what `localUnits()`
 * returns), one of the two stored words, or anything else at all. Every
 * formatter in this file goes through it, so an unrecognised value reads metric
 * instead of throwing — the same fail-soft the string version had, kept because
 * a stale saved setting must never take a menu page down.
 */
export function unitUsage(units) {
  if (units && typeof units === "object") {
    return { distance: one(units.distance), oven: one(units.oven) };
  }
  return units === "imperial" ? IMPERIAL_USAGE : METRIC_USAGE;
}

/**
 * What to call a usage table on the Settings index row.
 *
 * The two chooseable words keep their option label verbatim, so a reader who
 * picked one sees back exactly what they picked. A MIXED table has no option
 * that names it — it can only have come from a region, never from the picker —
 * so it is described rather than given an invented name, which would read as a
 * third choice the reader could go and select.
 */
export function unitsLabel(units) {
  const u = unitUsage(units);
  if (u.distance === u.oven) return UNIT_OPTIONS.find((o) => o.key === u.distance)?.label ?? "";
  const road = u.distance === "imperial" ? "Miles" : "Kilometres";
  const oven = u.oven === "imperial" ? "°F" : "°C";
  return `${road}, ${oven}`;
}

const isImperialDistance = (units) => unitUsage(units).distance === "imperial";
const isImperialOven = (units) => unitUsage(units).oven === "imperial";

export const kmToMiles = (km) => km / KM_PER_MILE;
export const milesToKm = (mi) => mi * KM_PER_MILE;

// --- Distance -------------------------------------------------------------

/**
 * Human distance in the reader's units.
 *
 * Metric (unchanged from what shipped): "450 m" under a km, "1.2 km" under
 * ten, "14 km" beyond.
 *
 * Imperial mirrors that shape rather than inventing a new precision: yards to
 * the nearest 50 for the short walk (the counterpart of metres to the nearest
 * 50), then one decimal of a mile, then whole miles. The yard band ends when
 * rounding would print 900 — so the ladder reads 850 yd → 0.5 mi → 0.6 mi and
 * never doubles back on itself.
 */
export function formatDistance(km, units = DEFAULT_UNITS) {
  if (km == null || Number.isNaN(km)) return "";
  if (isImperialDistance(units)) {
    const mi = kmToMiles(km);
    const yd = Math.max(50, Math.round((mi * YARDS_PER_MILE) / 50) * 50);
    if (yd < 900) return `${yd} yd`;
    if (mi < 10) return `${mi.toFixed(1)} mi`;
    return `${Math.round(mi)} mi`;
  }
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// --- The two Settings distance dials --------------------------------------
// Both dials STORE kilometres whatever the reader's units. In imperial they
// run on a mile grid with round steps (½ mile, 5 miles) — a dial that offered
// "15.5 mi" because 25 km happens to convert there would be worse than the km
// dial it replaced. Ranges are the metric range converted and then trimmed to
// a round mile figure.

export const DIALS = {
  favBoostKm: {
    metric: { min: 0, max: 30, step: 1 },
    imperial: { min: 0, max: 20, step: 0.5 },
  },
  farKm: {
    metric: { min: 5, max: 100, step: 5 },
    imperial: { min: 5, max: 60, step: 5 },
  },
};

/** {min, max, step} for a dial in the reader's units (values in that unit). */
export function dialSpec(key, units = DEFAULT_UNITS) {
  return DIALS[key][isImperialDistance(units) ? "imperial" : "metric"];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Floating-point steps (0.5) leave 1.4999999 behind; two decimals is plenty
// for a slider position and kills the noise.
const tidy = (n) => Math.round(n * 100) / 100;

/**
 * Where the slider thumb sits for a stored km value, in the reader's units:
 * snapped to that dial's grid and clamped to its range. The readout and the
 * Settings row summary both go through this too, so the thumb, the number
 * beside it, and the index row can never disagree — even when a value set on
 * one unit grid is being shown on the other.
 */
export function dialValue(km, key, units = DEFAULT_UNITS) {
  const spec = dialSpec(key, units);
  const raw = isImperialDistance(units) ? kmToMiles(km) : km;
  const snapped = spec.min + Math.round((raw - spec.min) / spec.step) * spec.step;
  return tidy(clamp(snapped, spec.min, spec.max));
}

/**
 * The km to store for a slider position. Kept to one decimal so an imperial
 * grid point survives the round trip (2.4 km reads back as 1.5 mi, which snaps
 * to the 1.5 mi step it came from — whole kilometres would not).
 */
export function dialKm(value, key, units = DEFAULT_UNITS) {
  const spec = dialSpec(key, units);
  const v = clamp(Number(value), spec.min, spec.max);
  return isImperialDistance(units) ? Math.round(milesToKm(v) * 10) / 10 : v;
}

// "20" not "20.0", "0.5" not "0.50" — Number's own formatting already does it.
const num = (n) => String(n);

/** The dial's readout: "25 km" / "15 mi". Always agrees with the thumb. */
export function formatDial(km, key, units = DEFAULT_UNITS) {
  const v = dialValue(km, key, units);
  return isImperialDistance(units) ? `${num(v)} mi` : `${num(v)} km`;
}

// --- Oven temperatures ----------------------------------------------------
// Recipe temperatures live inside free-text method steps ("Bake at 180°C for
// 2 hours") because the recipe schema has no structured quantities yet
// (that's 17a). So imperial readers get a render-time rewrite of the step
// text — deliberately the tightest pattern that can do the job:
//
//   - a 2–3 digit number, then an optional space, then a LITERAL ° sign, then
//     C on a word boundary. The degree sign is what makes this safe: no
//     ordinary sentence contains one, so no quantity, time, price or dish name
//     can be caught. "°Cook" fails the word boundary; "1.5–2L" has no ° at all.
//   - an optional "(425°F)" immediately after, which two of our recipes carry
//     by hand. The bracket is SWALLOWED (never left to read "430°F (425°F)")
//     but its number is not adopted: one recipe writes the bracket on its first
//     step and not on the next, so honouring it would print "preheat to 425°F …
//     bake at 430°F" for what is one oven setting. Computing every occurrence
//     the same way is the only way a recipe stays internally consistent.
//
// Metric readers see the text exactly as written — the default path does not
// touch the string at all.

const TEMP_C = /(\d{2,3})\s*°\s*C\b(?:\s*\(\s*\d{2,3}\s*°\s*F\s*\))?/g;

/** Exact conversion, unrounded. */
export const celsiusToFahrenheit = (c) => (c * 9) / 5 + 32;

// Rounding the converted figure. Nearest 25 would land on the classic US dial
// stops (325, 350, 425) but can drift 12°F from the recipe as written —
// 170°C would be served as 350°F, and in baking an overshoot burns while an
// undershoot only takes longer. Nearest 5 is never more than 2.5°F out, still
// never prints "356.0", and every oven made this century takes a 5°F step.
const OVEN_STEP_F = 5;

/** Oven-facing °F: the exact conversion, snapped to a settable figure. */
export const ovenFahrenheit = (c) =>
  Math.round(celsiusToFahrenheit(c) / OVEN_STEP_F) * OVEN_STEP_F;

/**
 * Rewrite every °C in a recipe step for the reader's units. Imperial swaps the
 * figure outright ("Bake at 355°F for 2 hours") rather than appending a
 * bracket — a step read one-handed at the bench should carry one number, not
 * two. Metric returns the string untouched.
 */
export function convertTemperatures(text, units = DEFAULT_UNITS) {
  if (!isImperialOven(units) || typeof text !== "string") return text;
  return text.replace(TEMP_C, (_match, c) => `${ovenFahrenheit(Number(c))}°F`);
}
