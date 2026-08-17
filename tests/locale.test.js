// locale.js — "Local", the setting that means *wherever I am right now*.
//
// The behaviour worth pinning down is the ORDER of the two signals. A
// Wellington phone in London reports `Europe/London` (the timezone follows the
// traveller) and `en-NZ` (the locale doesn't). Someone standing in a London
// café wants pounds and miles, so the timezone has to win — and a test that
// only ever runs on a NZ laptop would never notice if it stopped.

import test from "node:test";
import assert from "node:assert/strict";
import {
  deviceCountry,
  deviceLocaleRegion,
  localCurrency,
  localLanguage,
  localUnits,
} from "../site/js/locale.js";

// Every case passes both signals explicitly. Nothing here reads the machine
// running the tests, so the answers are the same in Wellington and on CI.
// `null` for the timezone means "the device won't say", NOT "ask the device" —
// locale.js distinguishes the two so a test can pin the no-signal case without
// depending on the machine it runs on.
const AT = (timezone, ...languages) => ({ timezone, languages });

test("the timezone wins, because it is the one that travels", () => {
  // The whole point, in one assertion: a NZ phone that has landed in London.
  assert.equal(deviceCountry(AT("Europe/London", "en-NZ")), "GB");
  assert.equal(localCurrency(null, AT("Europe/London", "en-NZ")), "GBP");
  // …and a New York one, for the units half (GB is metric in the kitchen).
  assert.equal(localUnits(AT("America/New_York", "en-NZ")), "imperial");
});

test("the locale region answers when the timezone is one we don't map", () => {
  assert.equal(deviceCountry(AT("Antarctica/Troll", "en-NZ")), "NZ");
  assert.equal(localCurrency(null, AT("Antarctica/Troll", "en-NZ")), "NZD");
});

test("with neither signal, nothing is guessed", () => {
  assert.equal(deviceCountry(AT(null)), null);
  assert.equal(deviceCountry(AT("Not/AZone", "xx")), null);
});

test("an unmapped country falls back home rather than inventing a currency", () => {
  // Iceland: a real place, no rate shipped. Home is a wrong-but-known answer;
  // a made-up ISK rate would be a wrong-and-unknowable one.
  assert.equal(localCurrency(null, AT("Atlantic/Reykjavik", "is-IS")), "NZD");
});

test("a currency with no rate loaded is not offered, even when we know the country", () => {
  // The picker is built from the rate table; "local" must respect the same
  // limit or it resolves to a currency nothing can convert into.
  const available = new Set(["NZD", "AUD"]);
  assert.equal(localCurrency(available, AT("Europe/London", "en-GB")), "NZD");
  assert.equal(localCurrency(available, AT("Australia/Sydney", "en-AU")), "AUD");
});

test("units are metric everywhere except the one country whose kitchen isn't", () => {
  assert.equal(localUnits(AT("America/New_York", "en-US")), "imperial");
  // GB drives on miles and bakes at °C; the setting drives ovens, so metric
  // (owner ruling 2026-08-17 — before it, a London phone read every oven in °F).
  assert.equal(localUnits(AT("Europe/London", "en-GB")), "metric");
  assert.equal(localUnits(AT("Pacific/Auckland", "en-NZ")), "metric");
  assert.equal(localUnits(AT("Europe/Paris", "fr-FR")), "metric");
  assert.equal(localUnits(AT(null)), "metric", "and metric when we can't tell");
});

test("the euro is one country per line, and they all agree", () => {
  for (const [zone, tag] of [
    ["Europe/Paris", "fr-FR"],
    ["Europe/Berlin", "de-DE"],
    ["Europe/Dublin", "en-IE"],
    ["Europe/Helsinki", "fi-FI"],
  ]) {
    assert.equal(localCurrency(null, AT(zone, tag)), "EUR", `${zone} should be EUR`);
  }
});

test("deviceLocaleRegion reads a region out of a tag, or says it can't", () => {
  assert.equal(deviceLocaleRegion(["en-NZ"]), "NZ");
  assert.equal(deviceLocaleRegion(["zh-Hant-HK"]), "HK");
  assert.equal(deviceLocaleRegion(["en"]), null, "a bare language names no place");
  assert.equal(deviceLocaleRegion(["not a tag", "en-GB"]), "GB", "junk is skipped, not fatal");
  assert.equal(deviceLocaleRegion([]), null);
});

test("language picks the first one Faves actually speaks", () => {
  assert.equal(localLanguage(["en", "mi"], ["mi-NZ", "en-NZ"]), "mi");
  assert.equal(localLanguage(["en", "mi"], ["en-GB"]), "en", "matched at the primary subtag");
  assert.equal(localLanguage(["en", "mi"], ["fr-FR", "de-DE"]), "en", "none spoken → English");
  assert.equal(localLanguage(["en", "mi"], []), "en");
  assert.equal(localLanguage(["en", "mi"], [null, 42, "mi"]), "mi", "junk is skipped");
});
