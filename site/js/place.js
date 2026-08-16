// Where a venue *is*, as the three facts the rest of the app has to know about
// it: its timezone (what "open now" means), its currency (what a price means),
// and its hemisphere (what "summer menu" means). ADR 0043.
//
// Until 2026-08-16 all three were hard-coded to New Zealand, because every
// venue was. The collection is no longer scoped to a country (ADR 0042), and
// the failure mode of a hard-coded assumption here is a *confident wrong
// answer* — a London venue rendered "Open · until 9pm" against Wellington's
// clock, with nothing on screen admitting the clock was borrowed. So the three
// facts come off the record, and this is the one module that resolves them.
//
// Pure (no DOM, no network, no clock of its own) so it's unit-testable, and it
// uses only `Intl`, which is built into the browser — the zero-dependency rule
// (ADR 0001) is why we format money with `Intl.NumberFormat` rather than ship a
// currency table.

import { HOME_CURRENCY, HOME_TIMEZONE } from "./home.js";
import { nearestBranch } from "./locations.js";
import { canConvert, convert, fxCurrencies } from "./fx.js";
import { localCurrency } from "./locale.js";
import { AS_CHARGED, LOCAL, settings } from "./settings.js";

// The collection's home lives in `home.js` — a leaf module, because `locale.js`
// needs the currency and `place.js` needs `locale.js`, which is a cycle if
// either one owns the constants. Re-exported here so every existing importer of
// `place.js` is unaffected.
export { HOME_CURRENCY, HOME_TIMEZONE } from "./home.js";

/**
 * The IANA timezone whose clock decides this venue's open/closed status.
 *
 * Resolved per *branch*, the same way `venueHours` is: a chain with a branch in
 * Wellington and one in Sydney is open in each on its own clock, and the branch
 * we're showing is the one whose answer we owe. Falls back to the venue-level
 * `timezone`, then to home. Pure.
 */
export function venueTimezone(r, origin = null) {
  if (!r) return HOME_TIMEZONE;
  const branch = nearestBranch(r, origin).branch;
  return branch?.timezone || r.timezone || HOME_TIMEZONE;
}

/** The timezone for one already-chosen branch (menu.js renders each in turn). */
export function branchTimezone(r, branch) {
  return branch?.timezone || r?.timezone || HOME_TIMEZONE;
}

/**
 * The ISO 4217 code the venue's own menu prices are in — what the shop will
 * actually charge. Venue-level, not per-branch: a menu is one document with one
 * currency, and a chain that genuinely prices in two currencies has two menus,
 * so it is two records. An individual price may still override it (`item.currency`)
 * for the rare menu that quotes one line in another currency.
 *
 * `validate.py` now REQUIRES `currency` on every record (ADR 0045), so the
 * fallback here is a boot-order safety net, not a schema default: every price
 * in the data states the currency it is in, which is what makes conversion
 * possible at all.
 */
export function venueCurrency(r) {
  return r?.currency || HOME_CURRENCY;
}

/** The currency of one price: its own override, else the venue's. */
export function priceCurrency(item, record) {
  return item?.currency || venueCurrency(record);
}

// —————————————————— What currency to SHOW a price in ——————————————————

/**
 * The currency this reader wants prices in, given the venue's own.
 *
 * Falls back to the venue's own currency whenever we cannot honestly convert —
 * no rate table yet, no rate for either side, or the reader asked for the
 * shop's own numbers. That fallback is not a degraded mode: the shop's price is
 * always a correct answer, which is why it is also what a failure returns.
 */
export function displayCurrency(record, item = null) {
  const native = priceCurrency(item, record);
  let want;
  try {
    want = settings.get().currency;
  } catch {
    return native;
  }
  if (want === AS_CHARGED) return native;
  if (want === LOCAL) want = localCurrency(fxCurrencies());
  if (!want || want === native) return native;
  return canConvert(native, want) ? want : native;
}

/**
 * A price ready to render: `{ amount, currency, native, nativeCurrency, converted }`.
 *
 * `converted` is false in the overwhelmingly common case — the reader's
 * currency IS the shop's — and that is what keeps the interface quiet. Nothing
 * downstream adds a currency code, a badge or a note unless this says true.
 */
export function displayPrice(amount, record, item = null) {
  const nativeCurrency = priceCurrency(item, record);
  const currency = displayCurrency(record, item);
  if (currency === nativeCurrency || typeof amount !== "number") {
    return { amount, currency: nativeCurrency, native: amount, nativeCurrency, converted: false };
  }
  const converted = convert(amount, nativeCurrency, currency);
  if (converted === null) {
    return { amount, currency: nativeCurrency, native: amount, nativeCurrency, converted: false };
  }
  return { amount: converted, currency, native: amount, nativeCurrency, converted: true };
}

/**
 * "south" | "north" — which way this venue's seasons run, from its latitude.
 * Derived, never stored: a coordinate already answers it, and a stored copy is
 * one more thing that can disagree with the pin. null when we have no
 * coordinate, so a caller can decline to guess rather than default to ours.
 */
export function venueHemisphere(r, origin = null) {
  if (!r) return null;
  const lat = nearestBranch(r, origin).branch?.lat ?? r?.lat;
  return typeof lat === "number" && Number.isFinite(lat) ? (lat < 0 ? "south" : "north") : null;
}

// —————————————————————————————— Money ——————————————————————————————
// One formatter per currency, built once. `Intl.NumberFormat` construction is
// the expensive part and the home screen formats a price chip per card.
// Keyed `<code>:<whole|part>` — see formatMoney for why a currency needs two.
const moneyFormatters = new Map();

function moneyFormatter(currency, whole) {
  const key = `${currency}:${whole ? "whole" : "part"}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency,
        // "$12.50", not "NZ$12.50" — a venue's own menu shows the bare symbol,
        // and the ⓘ beside the prices names the currency in words for anyone
        // who needs it (ADR 0037).
        currencyDisplay: "narrowSymbol",
        // Whole amounts drop the cents entirely — "$12", not "$12.00", the
        // house style since the first menu shipped. Anything else takes the
        // currency's OWN default precision rather than a forced 2: min:0 would
        // render 12.5 as "$12.5" (reads as a typo on a price) and a forced 2
        // would give a zero-decimal currency the "¥950.50" it has no minor unit
        // for. Intl already knows each currency's digits — let it decide.
        ...(whole ? { minimumFractionDigits: 0 } : {}),
      });
    } catch {
      // An unknown/invalid code would otherwise throw mid-render and blank the
      // page. Fall back to the plain number with the code beside it: uglier
      // than a symbol, but it still says what the price is, which is the job.
      f = { format: (n) => `${currency} ${Number(n).toFixed(2).replace(/\.00$/, "")}` };
    }
    moneyFormatters.set(key, f);
  }
  return f;
}

/**
 * A price as its venue shows it: `$12`, `$12.50`, `£8.95`, `¥900`.
 * null/undefined passes through as "" so callers can render a blank slot.
 */
export function formatMoney(amount, currency = HOME_CURRENCY) {
  if (amount == null || !Number.isFinite(Number(amount))) return "";
  const n = Number(amount);
  return moneyFormatter(currency, Number.isInteger(n)).format(n);
}

/** The same, for a record — the common call site. */
export function money(amount, record) {
  return formatMoney(amount, venueCurrency(record));
}

// Currency names for the places that state it in words rather than symbols (the
// ⓘ note, the About panel). Deliberately a short list of what we hold or expect
// to: an unlisted code falls back to the code itself, which is unambiguous and
// honest, where an invented name would not be.
const CURRENCY_NAMES = {
  NZD: "New Zealand dollars",
  AUD: "Australian dollars",
  USD: "US dollars",
  GBP: "pounds sterling",
  EUR: "euros",
  JPY: "Japanese yen",
  SGD: "Singapore dollars",
  THB: "Thai baht",
  CAD: "Canadian dollars",
  FJD: "Fijian dollars",
};

/** "New Zealand dollars (NZD)" — for prose. Falls back to the bare code. */
export function currencyName(currency = HOME_CURRENCY) {
  const name = CURRENCY_NAMES[currency];
  return name ? `${name} (${currency})` : currency;
}

// ————————————————————————— Naming a timezone —————————————————————————

/**
 * A timezone as a reader recognises it — "NZ time", "London time", "New York
 * time". Used only to qualify displayed hours for a viewer whose own clock
 * differs, so it has to be short enough to sit inside a label.
 *
 * Built from the IANA id's own last segment rather than a lookup table: the id
 * already carries the representative city, and a table would be a second place
 * to forget to update. The one special case is our own zone, because
 * "Auckland time" on a Wellington venue's hours would read as a mistake — and
 * every New Zealander already says "NZ time".
 */
export function zoneLabel(tz = HOME_TIMEZONE) {
  if (tz === HOME_TIMEZONE) return "NZ time";
  const city = String(tz).split("/").pop().replace(/_/g, " ");
  return city ? `${city} time` : "local time";
}
