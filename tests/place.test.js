// place.js — where a venue is, as the three facts the app can't guess:
// timezone, currency, hemisphere (ADR 0043).
//
// What these guard is a failure mode with no visible symptom. A venue outside
// New Zealand used to render its open/closed status against Wellington's clock
// and its prices with a bare "$", and the page looked entirely healthy while
// doing it. So the tests below care most about the cases where a wrong answer
// would still LOOK right: the fallbacks, and the branch-level resolution.

import test from "node:test";
import assert from "node:assert/strict";
import {
  HOME_CURRENCY,
  HOME_TIMEZONE,
  branchTimezone,
  currencyName,
  formatMoney,
  money,
  venueCurrency,
  venueHemisphere,
  venueTimezone,
  zoneLabel,
} from "../site/js/place.js";

const WELLINGTON = { lat: -41.29, lng: 174.78 };
const LONDON = { lat: 51.51, lng: -0.13 };

// ————————————————————————— Timezone —————————————————————————

test("a record that says nothing about where it is gets the collection's home", () => {
  assert.equal(venueTimezone({ name: "KK Malaysian", ...WELLINGTON }), HOME_TIMEZONE);
  assert.equal(venueTimezone({}), HOME_TIMEZONE);
  assert.equal(venueTimezone(null), HOME_TIMEZONE);
});

test("a venue's own timezone wins over home", () => {
  assert.equal(venueTimezone({ timezone: "Europe/London", ...LONDON }), "Europe/London");
});

test("timezone resolves per BRANCH, the same way hours do", () => {
  // A chain either side of the Tasman: whichever branch we're showing is the
  // one whose clock we owe an answer on.
  const chain = {
    name: "Some Chain",
    locations: [
      { label: "Wellington", ...WELLINGTON, address: "a" },
      { label: "Sydney", lat: -33.87, lng: 151.21, address: "b", timezone: "Australia/Sydney" },
    ],
  };
  assert.equal(venueTimezone(chain), HOME_TIMEZONE); // no origin → primary branch
  assert.equal(venueTimezone(chain, { lat: -33.9, lng: 151.2 }), "Australia/Sydney");
  assert.equal(venueTimezone(chain, WELLINGTON), HOME_TIMEZONE);
});

test("a branch inherits the venue's timezone when it states none", () => {
  const r = { timezone: "Europe/London", locations: [{ address: "a", ...LONDON }] };
  assert.equal(venueTimezone(r), "Europe/London");
  assert.equal(branchTimezone(r, { address: "a" }), "Europe/London");
  assert.equal(branchTimezone(r, { address: "b", timezone: "Europe/Paris" }), "Europe/Paris");
  assert.equal(branchTimezone(null, null), HOME_TIMEZONE);
});

// ————————————————————————— Hemisphere —————————————————————————

test("hemisphere comes off the latitude, never off a stored field", () => {
  assert.equal(venueHemisphere(WELLINGTON), "south");
  assert.equal(venueHemisphere(LONDON), "north");
  assert.equal(venueHemisphere({ lat: 0, lng: 100 }), "north"); // the equator is not south
});

test("no coordinate means no hemisphere — null, so a caller can decline to guess", () => {
  assert.equal(venueHemisphere({ name: "A stub with no pin yet" }), null);
  assert.equal(venueHemisphere({ lat: "-41", lng: "174" }), null); // strings aren't coordinates
  assert.equal(venueHemisphere(null), null);
});

test("hemisphere follows the branch too", () => {
  const chain = {
    locations: [
      { address: "a", ...LONDON },
      { address: "b", ...WELLINGTON },
    ],
  };
  assert.equal(venueHemisphere(chain), "north"); // primary
  assert.equal(venueHemisphere(chain, WELLINGTON), "south"); // nearest
});

// ————————————————————————— Currency —————————————————————————

test("currency defaults to home and is venue-level, not per-branch", () => {
  assert.equal(venueCurrency({}), HOME_CURRENCY);
  assert.equal(venueCurrency({ currency: "GBP" }), "GBP");
  assert.equal(venueCurrency(null), HOME_CURRENCY);
});

test("a whole amount drops the cents; anything else keeps the currency's own digits", () => {
  assert.equal(formatMoney(12), "$12");
  assert.equal(formatMoney(12.5), "$12.50"); // NOT "$12.5" — that reads as a typo
  assert.equal(formatMoney(12.05), "$12.05");
  assert.equal(formatMoney(0), "$0");
});

test("a price renders in the venue's own currency, with its own symbol", () => {
  assert.equal(formatMoney(8.95, "GBP"), "£8.95");
  assert.equal(formatMoney(12, "EUR"), "€12");
  assert.equal(money(8.95, { currency: "GBP" }), "£8.95");
  assert.equal(money(8.95, {}), "$8.95");
});

test("a zero-decimal currency never grows a decimal point", () => {
  assert.equal(formatMoney(900, "JPY"), "¥900");
  assert.equal(formatMoney(950.5, "JPY"), "¥951");
});

test("an unusable amount is blank, not NaN on the page", () => {
  assert.equal(formatMoney(null), "");
  assert.equal(formatMoney(undefined), "");
  assert.equal(formatMoney("not a number"), "");
});

test("an unknown currency code still renders a price, never a thrown render", () => {
  // Two different paths, both ending in something readable — blanking a whole
  // menu page over one typo in one record is the outcome worth avoiding.
  //
  // "XYZ" is WELL-FORMED but unassigned, so Intl accepts it and prints the code
  // itself (with its own non-breaking space, hence \u00a0 here rather than " ").
  assert.equal(formatMoney(5, "XYZ"), "XYZ\u00a05");
  // "NOTACODE" is malformed, so Intl throws and our fallback catches it.
  assert.equal(formatMoney(5, "NOTACODE"), "NOTACODE 5");
  assert.equal(formatMoney(5.5, "NOTACODE"), "NOTACODE 5.50");
});

test("currencyName names what we hold and falls back to the bare code", () => {
  assert.equal(currencyName("NZD"), "New Zealand dollars (NZD)");
  assert.equal(currencyName("GBP"), "pounds sterling (GBP)");
  assert.equal(currencyName(), "New Zealand dollars (NZD)");
  assert.equal(currencyName("XYZ"), "XYZ"); // an invented name would be worse than none
});

// ————————————————————————— Naming a zone —————————————————————————

test("zoneLabel says NZ time at home and names the city elsewhere", () => {
  assert.equal(zoneLabel(), "NZ time");
  assert.equal(zoneLabel(HOME_TIMEZONE), "NZ time"); // never "Auckland time" on a Wellington venue
  assert.equal(zoneLabel("Europe/London"), "London time");
  assert.equal(zoneLabel("America/New_York"), "New York time"); // underscore is not shown
  assert.equal(zoneLabel("Asia/Bangkok"), "Bangkok time");
});
