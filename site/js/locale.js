// "Local" — the setting that means *wherever I am right now* (ADR 0045).
//
// Language, units and currency are the same question asked three ways: how
// should this be shown, for a person in this place? So each offers `local`, and
// each resolves it here, from the device.
//
// ————————————————————— How "where am I" is answered —————————————————————
//
// Two signals, in this order, and the order is the whole point:
//
//   1. The device's TIMEZONE (`Intl.DateTimeFormat().resolvedOptions()`). This
//      is the one that FOLLOWS A TRAVELLER: a phone landing in London switches
//      to Europe/London by itself, usually before its owner has unlocked it.
//   2. The device's LOCALE region (`navigator.language` → "en-NZ" → "NZ").
//      This says where its owner is *from*, and stays put when they travel.
//
// A Wellington phone in London reports `Europe/London` and `en-NZ`. Someone
// standing in a London café wants pounds and miles, so the timezone wins.
//
// Neither signal is geolocation, and that is deliberate: the app already asks
// for location for "Near me", and turning a permission granted for one purpose
// into a second, unasked-for use is not a trade worth making — for a guess this
// good, about something the reader can override in two taps.
//
// The tables below are small on purpose. They cover the currencies Faves ships
// rates for (site/data/fx.json) and nothing else: an unlisted place simply
// falls back, which is a smaller failure than a confident wrong currency.

import { HOME_CURRENCY } from "./home.js";
import { METRIC_USAGE, IMPERIAL_USAGE } from "./units.js";

// IANA zone → ISO 3166-1 alpha-2. Only zones whose country has a currency in
// our table; everywhere else falls through to the locale region, then home.
const ZONE_COUNTRY = {
  "Pacific/Auckland": "NZ",
  "Pacific/Chatham": "NZ",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Darwin": "AU",
  "Australia/Hobart": "AU",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Lisbon": "PT",
  "Europe/Athens": "GR",
  "Europe/Helsinki": "FI",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Istanbul": "TR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "Asia/Tokyo": "JP",
  "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Jakarta": "ID",
  "Asia/Makassar": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Manila": "PH",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN", // the old alias; still what some devices report
  "Asia/Dubai": "AE",
  "Asia/Jerusalem": "IL",
  "Africa/Johannesburg": "ZA",
  "Pacific/Fiji": "FJ",
  "Pacific/Apia": "WS",
  "Pacific/Tongatapu": "TO",
  "Pacific/Port_Moresby": "PG",
  "Pacific/Noumea": "NC",
  "Pacific/Tahiti": "PF",
};

// ISO country → ISO 4217. Every value here must exist in fx.json, or "local"
// would resolve to a currency we cannot convert into.
const COUNTRY_CURRENCY = {
  NZ: "NZD", AU: "AUD", GB: "GBP", US: "USD", CA: "CAD", JP: "JPY",
  SG: "SGD", TH: "THB", FJ: "FJD", CN: "CNY", HK: "HKD", TW: "TWD",
  KR: "KRW", ID: "IDR", MY: "MYR", VN: "VND", PH: "PHP", IN: "INR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  MX: "MXN", BR: "BRL", ZA: "ZAR", AE: "AED", TR: "TRY", IL: "ILS",
  WS: "WST", TO: "TOP", PG: "PGK", NC: "XPF", PF: "XPF",
  // The euro, one line per country rather than a clever prefix rule.
  IE: "EUR", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", GR: "EUR", FI: "EUR",
};

// Region → what each KIND of measure reads in (ADR 0087). CLDR — the
// localisation data every platform ships — models units as region × usage and
// marks its own metric/US/UK flag deprecated, because Britain is not a point
// on a dial between the two: road distance is miles and yards, the oven is
// °C. A single word cannot say that, and the word we had said °F.
//
// The short list IS the exception list: anywhere absent is metric throughout,
// which is why it is stated this way round. Only the two usages Faves
// actually renders are listed — a table with entries no screen reads would be
// a claim we never check.
//
// Supersedes the interim GB → metric of 2026-08-17 (`f253812`), which fixed
// the °F oven by giving Britain metres as well. This is the same ruling done
// once: GB keeps its °C oven AND gets its miles back.
const REGION_USAGE = {
  GB: Object.freeze({ distance: "imperial", oven: "metric" }),
  US: IMPERIAL_USAGE,
};

/** The device's IANA timezone, or null when the browser won't say. */
export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** The region from the device's own locale ("en-NZ" → "NZ"), or null. */
export function deviceLocaleRegion(languages) {
  // `undefined` means "ask the device"; an explicit null or [] means "there is
  // no signal" — a distinction `??` erases, and one the tests need in order to
  // pin the no-signal case without depending on the machine running them.
  const tags =
    languages === undefined
      ? globalThis.navigator?.languages || [globalThis.navigator?.language]
      : languages;
  for (const tag of tags || []) {
    if (typeof tag !== "string") continue;
    try {
      const region = new Intl.Locale(tag).region;
      if (region) return region.toUpperCase();
    } catch {
      // A malformed tag from a browser extension shouldn't take the page down.
    }
    const parts = tag.split("-");
    if (parts.length > 1 && /^[A-Za-z]{2}$/.test(parts[1])) return parts[1].toUpperCase();
  }
  return null;
}

/**
 * Where the reader is, best guess: timezone first (it travels), then the
 * device's locale region (it doesn't). null when neither answers.
 */
export function deviceCountry({ timezone, languages } = {}) {
  const tz = timezone === undefined ? deviceTimezone() : timezone;
  const byZone = tz ? ZONE_COUNTRY[tz] : null;
  return byZone || deviceLocaleRegion(languages) || null;
}

/**
 * The currency to show prices in when the setting is "local".
 * `available` is the set of codes fx.json actually has a rate for — a currency
 * we can name but cannot convert into is worse than falling back, because the
 * fallback at least shows a real number.
 */
export function localCurrency(available = null, opts = {}) {
  const country = deviceCountry(opts);
  const code = country ? COUNTRY_CURRENCY[country] : null;
  if (!code) return HOME_CURRENCY;
  if (available && !available.has(code)) return HOME_CURRENCY;
  return code;
}

/**
 * The usage table for a "local" units setting: `{distance, oven}`, each
 * "metric" or "imperial" (units.js reads it; ADR 0087).
 *
 * Region is the only signal available. Browsers expose no OS measurement-system
 * preference, and `Intl`'s `usage` option — which would answer this properly —
 * is TC39 Stage 2, so it is not shippable under this repo's zero-dependency,
 * zero-build constraint. Metric everywhere we do not know, which is also the
 * answer for the whole world bar two entries.
 */
export function localUnits(opts = {}) {
  const country = deviceCountry(opts);
  return (country && REGION_USAGE[country]) || METRIC_USAGE;
}

/**
 * The UI language for a "local" language setting: the first of the device's
 * preferred languages that Faves actually speaks, else English.
 *
 * Matched at the primary subtag, so `en-GB` and `en-NZ` both pick `en`.
 */
export function localLanguage(supported = ["en", "mi"], languages) {
  const tags =
    languages === undefined
      ? globalThis.navigator?.languages || [globalThis.navigator?.language]
      : languages;
  for (const tag of tags || []) {
    if (typeof tag !== "string") continue;
    const primary = tag.toLowerCase().split("-")[0];
    if (supported.includes(primary)) return primary;
  }
  return supported[0] ?? "en";
}
