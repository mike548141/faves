// Unit tests for the time dimension (site/js/temporal.js): dated values,
// lifecycle folding, seasonal availability, and the record projection that
// keeps the rest of the app time-blind. Pure (no DOM). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startOf,
  endOf,
  series,
  resolveValue,
  pending,
  isDated,
  venueState,
  isAvailable,
  isRetired,
  resolveRecord,
  isTrading,
  isGone,
  todayIn,
  seasonMonths,
  VERIFY_METHODS,
  TRUSTED_VERIFY_METHODS,
  VERIFY_MAX_AGE_MONTHS,
  verification,
  verificationText,
  detailsVerification,
  refreshCaveat,
} from "../site/js/temporal.js";

// ---------- partial dates ----------

test("startOf/endOf widen a partial date to its real interval", () => {
  assert.equal(startOf("2019"), "2019-01-01");
  assert.equal(endOf("2019"), "2019-12-31");
  assert.equal(startOf("2019-05"), "2019-05-01");
  assert.equal(endOf("2019-05"), "2019-05-31");
  assert.equal(endOf("2019-02"), "2019-02-28");
  assert.equal(endOf("2020-02"), "2020-02-29", "leap year");
  assert.equal(startOf("2019-05-21"), "2019-05-21");
  assert.equal(endOf("2019-05-21"), "2019-05-21");
  assert.equal(startOf("nonsense"), null);
});

// ---------- temporal values ----------

test("series: a plain value becomes one undated entry", () => {
  assert.deepEqual(series(17.5), [
    { value: 17.5, from: null, recorded: null, method: null, note: null },
  ]);
});

test("series: null is a value (market price), not an absence", () => {
  assert.equal(series(null).length, 1);
  assert.equal(series(null)[0].value, null);
  assert.deepEqual(series(undefined), [], "an absent field has no entries at all");
});

test("series: sorts oldest first, undated entries leading", () => {
  const s = series([
    { value: 3, recorded: "2026-01-01" },
    { value: 1 },
    { value: 2, from: "2020-06-01" },
  ]);
  assert.deepEqual(s.map((e) => e.value), [1, 2, 3]);
});

test("series: defaultRecorded fills the record time from the venue's verified date", () => {
  const s = series([{ value: 5 }], "2026-08-08");
  assert.equal(s[0].recorded, "2026-08-08");
  const explicit = series([{ value: 5, recorded: "2019" }], "2026-08-08");
  assert.equal(explicit[0].recorded, "2019", "an explicit record date always wins");
});

test("resolveValue: a plain value resolves to itself on any date", () => {
  assert.equal(resolveValue(17.5, "2019-01-01"), 17.5);
  assert.equal(resolveValue(17.5, "2030-01-01"), 17.5);
});

test("resolveValue: picks the entry in force, keyed on record time when world time is unknown", () => {
  // The real Churton shape: we know when we READ each price, never when it rose.
  const price = [
    { value: 10.5, recorded: "2019", note: "2019 menu scan" },
    { value: 17.5, recorded: "2026-08-08" },
  ];
  assert.equal(resolveValue(price, "2019-06-01"), 10.5);
  assert.equal(resolveValue(price, "2026-08-07"), 10.5, "the day before we read the new menu");
  assert.equal(resolveValue(price, "2026-08-08"), 17.5);
  assert.equal(resolveValue(price, "2030-01-01"), 17.5);
});

test("resolveValue: a year-precision entry starts on 1 January, not mid-year", () => {
  const price = [{ value: 4, recorded: "2019" }];
  assert.equal(resolveValue(price, "2019-01-01"), 4);
  assert.equal(resolveValue(price, "2018-12-31"), null);
});

test("resolveValue: world time (from) wins over record time when we have it", () => {
  const price = [
    { value: 5, recorded: "2026-01-01" },
    { value: 6, from: "2026-08-12", recorded: "2026-08-01" },
  ];
  assert.equal(resolveValue(price, "2026-08-05"), 5, "recorded early, but not in force yet");
  assert.equal(resolveValue(price, "2026-08-12"), 6);
});

test("pending: an announced price change is visible before it applies", () => {
  // "Coffee will be $6 from Wednesday" — the roadmap feature, already a data fact.
  const price = [
    { value: 5.5, recorded: "2026-01-01" },
    { value: 6, from: "2026-08-12", note: "posted at the counter" },
  ];
  assert.equal(resolveValue(price, "2026-08-08"), 5.5, "today still pays today's price");
  assert.equal(pending(price, "2026-08-08").value, 6);
  assert.equal(pending(price, "2026-08-12"), null, "once it applies it is no longer pending");
});

test("pending: a record date in the future is never treated as an announcement", () => {
  assert.equal(pending([{ value: 9, recorded: "2030-01-01" }], "2026-08-08"), null);
});

test("resolveValue: null when every entry is still in the future", () => {
  assert.equal(resolveValue([{ value: 6, from: "2030-01-01" }], "2026-08-08"), null);
});

test("isDated: only a real series counts as history", () => {
  assert.equal(isDated(5), false);
  assert.equal(isDated([{ value: 5 }]), false);
  assert.equal(isDated([{ value: 5 }, { value: 6, from: "2026-01-01" }]), true);
});

// ---------- lifecycle ----------

const lc = (events, extra = {}) => ({ lifecycle: { added: "2026-01-01", events, ...extra } });

test("venueState: no lifecycle at all resolves to trading", () => {
  const st = venueState({}, "2026-08-08");
  assert.equal(st.state, "trading");
  assert.equal(st.opened, null);
  assert.equal(st.added, null);
});

test("venueState: a closure applies only from its date", () => {
  const r = lc([{ type: "closed-temporarily", date: "2026-06-01", until: "2026-09-01", note: "kitchen refit" }]);
  assert.equal(venueState(r, "2026-05-31").state, "trading");
  const shut = venueState(r, "2026-08-08");
  assert.equal(shut.state, "closed-temporarily");
  assert.equal(shut.since, "2026-06-01");
  assert.equal(shut.until, "2026-09-01");
  assert.equal(shut.note, "kitchen refit");
  assert.equal(shut.overdue, false);
});

test("venueState: a reopening restores trading — the thing a boolean cannot do", () => {
  const r = lc([
    { type: "closed-temporarily", date: "2026-06-01" },
    { type: "reopened", date: "2026-07-15" },
  ]);
  assert.equal(venueState(r, "2026-06-10").state, "closed-temporarily");
  assert.equal(venueState(r, "2026-07-20").state, "trading");
  assert.equal(venueState(r, "2026-07-20").since, "2026-07-15");
});

test("venueState: an overdue reopening is flagged, never assumed", () => {
  const r = lc([{ type: "closed-temporarily", date: "2026-06-01", until: "2026-07-01" }]);
  const st = venueState(r, "2026-08-08");
  assert.equal(st.state, "closed-temporarily", "we do not invent the reopening");
  assert.equal(st.overdue, true);
});

test("venueState: permanent closure is terminal", () => {
  const r = lc([
    { type: "closed-permanently", date: "2026-05-01" },
    { type: "reopened", date: "2026-06-01" }, // invalid data; must not resurrect it
  ]);
  assert.equal(venueState(r, "2026-08-08").state, "closed-permanently");
});

test("venueState: an announced future closure surfaces without taking effect", () => {
  const r = lc([{ type: "closed-temporarily", date: "2026-12-01", note: "summer break" }]);
  const st = venueState(r, "2026-08-08");
  assert.equal(st.state, "trading");
  assert.equal(st.upcoming.date, "2026-12-01");
});

test("venueState: events are folded in date order however they are listed", () => {
  const r = lc([
    { type: "reopened", date: "2026-07-15" },
    { type: "closed-temporarily", date: "2026-06-01" },
  ]);
  assert.equal(venueState(r, "2026-06-10").state, "closed-temporarily");
});

test("isTrading / isGone read the resolved closure", () => {
  const gone = resolveRecord(lc([{ type: "closed-permanently", date: "2026-05-01" }]), "2026-08-08");
  assert.equal(isTrading(gone), false);
  assert.equal(isGone(gone), true);
  assert.equal(isTrading({}), true, "a record with no closure block is trading");
});

// ---------- availability ----------

test("isAvailable: no window means always on the menu", () => {
  assert.equal(isAvailable({ name: "Chips" }, "2026-08-08"), true);
});

test("isAvailable: a dated window is inclusive of its last day", () => {
  const dish = { available: { from: "2026-05-01", to: "2026-08-31" } };
  assert.equal(isAvailable(dish, "2026-04-30"), false);
  assert.equal(isAvailable(dish, "2026-05-01"), true);
  assert.equal(isAvailable(dish, "2026-08-31"), true, "the last day still counts");
  assert.equal(isAvailable(dish, "2026-09-01"), false);
});

test("isAvailable: a year-precision `to` runs to 31 December", () => {
  const dish = { available: { to: "2019" } };
  assert.equal(isAvailable(dish, "2019-12-31"), true);
  assert.equal(isAvailable(dish, "2020-01-01"), false);
});

test("isAvailable: offBy retires a dish from the day we confirmed it was gone", () => {
  const dish = { available: { offBy: "2026-08-08" } };
  assert.equal(isAvailable(dish, "2026-08-07"), true);
  assert.equal(isAvailable(dish, "2026-08-08"), false);
});

test("isAvailable: a season recurs every year (NZ months)", () => {
  const winter = { available: { season: "winter" } };
  assert.equal(isAvailable(winter, "2026-07-15"), true);
  assert.equal(isAvailable(winter, "2027-07-15"), true, "back next year, no data edit");
  assert.equal(isAvailable(winter, "2026-01-15"), false);
  const summer = { available: { season: "summer" } };
  assert.equal(isAvailable(summer, "2026-12-20"), true, "southern summer wraps the year");
  assert.equal(isAvailable(summer, "2026-02-10"), true);
  assert.equal(isAvailable(summer, "2026-06-10"), false);
});

test("isAvailable: an unknown season name never hides food", () => {
  assert.equal(isAvailable({ available: { season: "monsoon" } }, "2026-08-08"), true);
});

test("isRetired: distinguishes gone-for-good from merely out of season", () => {
  assert.equal(isRetired({ available: { offBy: "2026-08-08" } }, "2026-08-08"), true);
  assert.equal(isRetired({ available: { to: "2019" } }, "2026-08-08"), true);
  assert.equal(isRetired({ available: { season: "winter" } }, "2026-01-15"), false);
  assert.equal(isRetired({}, "2026-08-08"), false);
});

// ---------- record projection ----------

const record = {
  id: "x",
  name: "X",
  verified: "2026-08-08",
  picks: ["Wonton Soup", "Iced Coffee"],
  address: [
    { value: "OLD-ADDR", recorded: "2019" },
    { value: "NEW-ADDR", from: "2026-03-01" },
  ],
  lifecycle: { added: "2026-01-01" },
  menu: [
    {
      section: "Soups",
      items: [
        { name: "Wonton Soup", price: [{ value: 10.5, recorded: "2019" }, { value: 17.5, recorded: "2026-08-08" }] },
        { name: "Retired Broth", price: 8, available: { offBy: "2026-08-08" } },
      ],
    },
    {
      section: "Summer drinks",
      available: { season: "summer" },
      items: [{ name: "Iced Coffee", price: 6 }],
    },
  ],
};

test("resolveRecord: projects every dated field onto one day", () => {
  const now = resolveRecord(record, "2026-08-08");
  assert.equal(now.address, "NEW-ADDR");
  assert.equal(now.menu[0].items[0].price, 17.5, "a plain number, exactly as before");
  assert.equal(now.closure.state, "trading");
  assert.equal(now.closure.added, "2026-01-01");
});

test("resolveRecord: retired dishes and out-of-season sections drop out of the view", () => {
  const now = resolveRecord(record, "2026-08-08"); // August = NZ winter
  const names = now.menu.flatMap((s) => s.items.map((i) => i.name));
  assert.deepEqual(names, ["Wonton Soup"]);
  assert.equal(now.menu.length, 1, "the summer section goes with its only dish");
});

test("resolveRecord: the summer section returns in December, no data edit", () => {
  const summer = resolveRecord(record, "2026-12-20");
  assert.ok(summer.menu.some((s) => s.section === "Summer drinks"));
});

test("resolveRecord: picks never dangle on an unavailable dish", () => {
  assert.deepEqual(resolveRecord(record, "2026-08-08").picks, ["Wonton Soup"]);
  assert.deepEqual(resolveRecord(record, "2026-12-20").picks, ["Wonton Soup", "Iced Coffee"]);
});

// A pick may be written as a dishId, not only a name (ADR 0051) — `dishId` is
// the identity, and the whole point of it is that a rename doesn't move it. The
// gate that drops picks whose dish is out of season must therefore ask the one
// resolver, not intersect against a set of live NAMES: the latter deletes an
// id-written pick silently, on a dish that is right there on the menu.
const idPickRecord = {
  id: "y",
  name: "Y",
  verified: "2026-08-08",
  // Three references, one per way a pick can legally be written: an id, a name,
  // and a formerId. All three point at dishes that are on the menu today.
  picks: ["cheeseburger-gold-card", "Wonton Soup", "old-broth-id"],
  menu: [
    {
      section: "Mains",
      items: [
        { name: "Cheeseburger", dishId: "cheeseburger" },
        { name: "Cheeseburger", dishId: "cheeseburger-gold-card" },
        { name: "Wonton Soup", dishId: "wonton-soup" },
        { name: "House Broth", dishId: "house-broth", formerIds: ["old-broth-id"] },
      ],
    },
    {
      section: "Summer drinks",
      available: { season: "summer" },
      items: [{ name: "Iced Coffee", dishId: "iced-coffee" }],
    },
  ],
};

test("resolveRecord: a pick written as a dishId survives the availability gate", () => {
  const out = resolveRecord(idPickRecord, "2026-08-08"); // NZ winter
  assert.deepEqual(out.picks, ["cheeseburger-gold-card", "Wonton Soup", "old-broth-id"]);
});

test("resolveRecord: the gate still drops a pick whose dish has genuinely gone", () => {
  const r = {
    ...idPickRecord,
    picks: ["iced-coffee", "wonton-soup", "no-such-dish", "Iced Coffee"],
  };
  // August: the summer section is filtered out, so both the id-written and the
  // name-written pick at it must go — and so must a reference to nothing.
  assert.deepEqual(resolveRecord(r, "2026-08-08").picks, ["wonton-soup"]);
  // December: it is back, and both spellings of it resolve again.
  assert.deepEqual(resolveRecord(r, "2026-12-20").picks, [
    "iced-coffee",
    "wonton-soup",
    "Iced Coffee",
  ]);
});

test("resolveRecord: history rides along only where it has a named use", () => {
  const now = resolveRecord(record, "2026-08-08");
  const soup = now.menu[0].items[0];
  assert.equal(soup.priceSeries.length, 2, "priceSeries feeds the future trend view");
  assert.equal(soup.priceSeries[1].recorded, "2026-08-08");
  assert.equal(now.menu[0].items.find((i) => i.name === "Retired Broth"), undefined);
});

test("resolveRecord: an undated price inherits the venue's verified date as its record time", () => {
  const r = { verified: "2026-08-08", menu: [{ section: "S", items: [{ name: "D", price: [{ value: 5 }, { value: 6, from: "2026-09-01" }] }] }] };
  const now = resolveRecord(r, "2026-08-08");
  assert.equal(now.menu[0].items[0].priceSeries[0].recorded, "2026-08-08");
  assert.equal(now.menu[0].items[0].priceNext.value, 6, "the announced rise is carried for the UI");
});

test("resolveRecord: a record with no dates anywhere is unchanged in every way that matters", () => {
  const plain = {
    id: "p",
    name: "P",
    address: "PLAIN-ADDR",
    picks: ["Chips"],
    menu: [{ section: "S", items: [{ name: "Chips", price: 4.5, tags: ["gf"] }] }],
  };
  const out = resolveRecord(plain, "2026-08-08");
  assert.equal(out.address, "PLAIN-ADDR");
  assert.deepEqual(out.picks, ["Chips"]);
  assert.deepEqual(out.menu[0].items[0], { name: "Chips", price: 4.5, tags: ["gf"] });
  assert.equal(out.closure.state, "trading");
});

test("resolveRecord: multi-location branches resolve their own dated fields", () => {
  const r = {
    locations: [
      { label: "A", address: [{ value: "old", recorded: "2019" }, { value: "new", from: "2026-01-01" }], phone: "+64 4 111" },
    ],
    menu: [],
  };
  assert.equal(resolveRecord(r, "2026-08-08").locations[0].address, "new");
  assert.equal(resolveRecord(r, "2019-06-01").locations[0].address, "old");
});

test("resolveRecord: survives junk without throwing", () => {
  assert.equal(resolveRecord(null, "2026-08-08"), null);
  assert.equal(resolveRecord(undefined, "2026-08-08"), undefined);
});

test("todayIn: returns an ISO date in the venue's timezone", () => {
  assert.match(todayIn(), /^\d{4}-\d{2}-\d{2}$/);
  // 09:00 UTC on 1 Jan is already the 1st in NZ (UTC+13 in January).
  assert.equal(todayIn("Pacific/Auckland", new Date("2026-01-01T09:00:00Z")), "2026-01-01");
  // 22:00 UTC on 31 Dec is the 1st in NZ but still the 31st in UTC.
  assert.equal(todayIn("Pacific/Auckland", new Date("2025-12-31T22:00:00Z")), "2026-01-01");
});

// ---------- derivation: how we know (ADR 0031) ----------

test("verification: no reading at all is null, not an empty derivation", () => {
  assert.equal(verification({ verified: null }), null);
  assert.equal(verification({}), null);
  assert.equal(verification(null), null);
  // A garbage date is not a reading either — it must not render as one.
  assert.equal(verification({ verified: "soon" }), null);
});

test("verification: a date with no method stays distinct from a full derivation", () => {
  // §9's "unknown is not none": three states, all separately readable.
  const legacy = verification({ verified: "2026-08-07" });
  assert.deepEqual(legacy, { date: "2026-08-07", method: null, label: "Verified" });
  const full = verification({ verified: "2026-08-07", verifiedBy: "in-store" });
  assert.equal(full.method, "in-store");
  assert.equal(full.label, "Read in store");
});

test("verification: an unknown method is dropped, never echoed to the screen", () => {
  const v = verification({ verified: "2026-08-07", verifiedBy: "vibes" });
  assert.equal(v.method, null, "an off-vocabulary method must not become a claim");
  assert.equal(v.label, "Verified");
});

test("verification: every method in the closed set has a phrase", () => {
  for (const m of VERIFY_METHODS) {
    const v = verification({ verified: "2026-08-07", verifiedBy: m });
    assert.equal(v.method, m);
    assert.equal(typeof v.label, "string");
    assert.ok(v.label.length > 0, `${m} has no phrase`);
  }
});

// ---------- details provenance: venue-level, branch-level (ADR NNNN) ----------

test("detailsVerification: a record with no branch reads exactly as it always did", () => {
  // BACKWARD COMPATIBILITY. Every record in the corpus but one carries the pair
  // at the venue level only, and nothing about them may change.
  const r = { detailsVerified: "2026-08-15", detailsVerifiedBy: "third-party" };
  const v = detailsVerification(r);
  assert.equal(v.date, "2026-08-15");
  assert.equal(v.method, "third-party");
  assert.equal(v.label, "Read from a third-party listing");
  assert.equal(v.scope, "venue");
  // …and the same when a branch is passed that has no pair of its own.
  assert.deepEqual(detailsVerification(r, { label: "Melling", hours: null }), v);
  // No reading anywhere is still null, with or without a branch.
  assert.equal(detailsVerification({}), null);
  assert.equal(detailsVerification({}, { label: "Melling" }), null);
  assert.equal(detailsVerification(null, null), null);
});

test("detailsVerification: a branch's own reading wins over the venue's", () => {
  // Pandan, the record that forced this: Melling's address, phone and hours are
  // all from Pandan's own site; Press Hall's hours are its landlord's. The
  // venue-level field had to read as the weaker of the two for BOTH.
  const r = { detailsVerified: "2026-08-15", detailsVerifiedBy: "third-party" };
  const melling = { label: "Melling", detailsVerified: "2026-08-15", detailsVerifiedBy: "official-site" };
  const pressHall = { label: "Press Hall", detailsVerified: "2026-08-15", detailsVerifiedBy: "third-party" };

  const m = detailsVerification(r, melling);
  assert.equal(m.method, "official-site", "the stronger branch must stop being dragged down");
  assert.equal(m.label, "Read from the place’s own site");
  assert.equal(m.scope, "branch");

  const p = detailsVerification(r, pressHall);
  assert.equal(p.method, "third-party");
  assert.equal(p.scope, "branch");
});

test("detailsVerification: the pair is taken whole from one level, never mixed", () => {
  // A branch date paired with the venue's method would describe a reading
  // nobody did — the exact "guesses dressed as precision" this field exists to
  // avoid. A branch with a date and no method is method-less, not inheriting.
  const r = { detailsVerified: "2026-01-01", detailsVerifiedBy: "in-store" };
  const v = detailsVerification(r, { detailsVerified: "2026-08-15" });
  assert.equal(v.date, "2026-08-15");
  assert.equal(v.method, null, "the venue's method must not attach to the branch's date");
  assert.equal(v.scope, "branch");

  // The mirror case: a branch method with no branch date is not a derivation,
  // so the venue's whole pair answers — the branch method is discarded, never
  // welded to the venue's date.
  const w = detailsVerification(r, { detailsVerifiedBy: "delivery-app" });
  assert.deepEqual(w, { date: "2026-01-01", method: "in-store", label: "Read in store", scope: "venue" });
});

test("detailsVerification: a branch reading with no venue fallback still stands alone", () => {
  const v = detailsVerification(
    {},
    { label: "Press Hall", detailsVerified: "2026-08-15", detailsVerifiedBy: "third-party" }
  );
  assert.equal(v.method, "third-party");
  assert.equal(v.scope, "branch");
});

test("detailsVerification: an off-vocabulary branch method is dropped, not echoed", () => {
  const v = detailsVerification(
    { detailsVerified: "2026-01-01", detailsVerifiedBy: "in-store" },
    { detailsVerified: "2026-08-15", detailsVerifiedBy: "a mate reckons" }
  );
  assert.equal(v.method, null);
  assert.equal(v.label, "Verified");
});

test("verificationText: reads as a sentence, and says nothing when we know nothing", () => {
  assert.equal(
    verificationText({ verified: "2026-08-07", verifiedBy: "in-store" }, "7 Aug 2026"),
    "Read in store, 7 Aug 2026"
  );
  assert.equal(
    verificationText({ verified: "2026-08-08", verifiedBy: "paper-menu" }, "8 Aug 2026"),
    "Read from a paper menu, 8 Aug 2026"
  );
  // Pre-ADR-0031 records keep the wording they always had.
  assert.equal(verificationText({ verified: "2026-08-08" }, "8 Aug 2026"), "Verified 8 Aug 2026");
  assert.equal(verificationText({ verified: null }, "8 Aug 2026"), null);
});

test("series: an entry inherits the venue's method and can override it", () => {
  const s = series(
    [
      { value: 10.5, recorded: "2019", method: "paper-menu" },
      { value: 17.5, recorded: "2026-08-08" },
    ],
    "2026-08-08",
    "in-store"
  );
  assert.equal(s[0].method, "paper-menu", "an entry's own reading wins");
  assert.equal(s[1].method, "in-store", "an undated-method entry inherits the venue's");
});

test("series: an unknown method falls back rather than propagating", () => {
  assert.equal(series([{ value: 5, method: "hearsay" }], null, "in-store")[0].method, "in-store");
  assert.equal(series([{ value: 5 }], null, "hearsay")[0].method, null);
  assert.equal(series([{ value: 5 }])[0].method, null);
});

test("resolveRecord: priceSeries carries the venue's derivation onto each reading", () => {
  const r = {
    verified: "2026-08-08",
    verifiedBy: "paper-menu",
    menu: [
      {
        section: "S",
        items: [
          {
            name: "Wonton Soup",
            price: [
              { value: 10.5, recorded: "2019" },
              { value: 17.5, recorded: "2026-08-08" },
            ],
          },
        ],
      },
    ],
  };
  const item = resolveRecord(r, "2026-08-08").menu[0].items[0];
  assert.equal(item.price, 17.5, "the screen still sees a plain number");
  assert.deepEqual(item.priceSeries.map((e) => e.method), ["paper-menu", "paper-menu"]);
});

// ---------- the refresh caveat: read the method, not the date (ADR 0036) ----------

test("refreshCaveat: never read is its own reason, not just 'unverified'", () => {
  assert.deepEqual(refreshCaveat({ verified: null }, "2026-08-09"), {
    show: true,
    reason: "never",
    method: null,
    date: null,
  });
  assert.equal(refreshCaveat({}, "2026-08-09").reason, "never");
  assert.equal(refreshCaveat(null, "2026-08-09").reason, "never");
});

test("refreshCaveat: the owner's split — the shop's own word counts, a middleman's does not", () => {
  // Read today, by each of the six methods in turn.
  const on = (m) => refreshCaveat({ verified: "2026-08-09", verifiedBy: m }, "2026-08-09");
  for (const m of ["in-store", "paper-menu", "official-site", "phone"]) {
    assert.equal(on(m).show, false, `${m} is a check`);
    assert.equal(on(m).reason, null);
  }
  for (const m of ["delivery-app", "third-party"]) {
    assert.equal(on(m).show, true, `${m} is not a check`);
    assert.equal(on(m).reason, "untrusted");
    assert.equal(on(m).method, m, "the UI needs to name the source it distrusts");
  }
  // Every method in the closed set is classified: none falls through unruled.
  for (const m of VERIFY_METHODS) {
    assert.equal(
      TRUSTED_VERIFY_METHODS.includes(m),
      !on(m).show,
      `${m} must be on exactly one side of the ruling`
    );
  }
});

test("refreshCaveat: an untrusted reading stays untrusted however fresh or old", () => {
  const fresh = refreshCaveat({ verified: "2026-08-09", verifiedBy: "delivery-app" }, "2026-08-09");
  const old = refreshCaveat({ verified: "2019-01-01", verifiedBy: "delivery-app" }, "2026-08-09");
  assert.equal(fresh.reason, "untrusted");
  assert.equal(old.reason, "untrusted", "the method is decided before the age, and it is enough");
});

test("refreshCaveat: a date with no method caveats, and says so distinctly", () => {
  const c = refreshCaveat({ verified: "2026-08-09" }, "2026-08-09");
  assert.equal(c.show, true, "absence of a method is not evidence of a trusted one");
  assert.equal(c.reason, "unknown-method");
  assert.equal(c.date, "2026-08-09", "we still know WHEN — 'unknown' is not 'none'");
  // A method off the closed set is the same state: we cannot read it.
  assert.equal(refreshCaveat({ verified: "2026-08-09", verifiedBy: "vibes" }, "2026-08-09").reason,
    "unknown-method");
});

test("refreshCaveat: the age limit is 12 months and the boundary day is still fresh", () => {
  assert.equal(VERIFY_MAX_AGE_MONTHS, 12, "a retune is a deliberate act — ADR 0036");
  const at = (d) => refreshCaveat({ verified: d, verifiedBy: "in-store" }, "2026-08-09");
  assert.equal(at("2025-08-10").show, false, "just inside a year");
  assert.equal(at("2025-08-09").show, false, "exactly 12 months is not longer ago than 12 months");
  assert.equal(at("2025-08-08").show, true, "one day past the limit");
  assert.equal(at("2025-08-08").reason, "stale");
  assert.equal(at("2025-08-08").method, "in-store", "still a trusted source, just an old one");
});

test("refreshCaveat: month arithmetic clamps rather than rolling over a short month", () => {
  // 2027-02-29 does not exist; 12 months back from 2027-02-28 is 2026-02-28.
  assert.equal(refreshCaveat({ verified: "2026-02-28", verifiedBy: "phone" }, "2027-02-28").show,
    false);
  assert.equal(refreshCaveat({ verified: "2026-02-27", verifiedBy: "phone" }, "2027-02-28").show,
    true);
  // Crossing a year boundary backwards.
  assert.equal(refreshCaveat({ verified: "2025-12-31", verifiedBy: "phone" }, "2026-08-09").show,
    false);
});

test("refreshCaveat: a partial date claims only its earliest day", () => {
  // "read sometime in 2025" must not borrow the freshness of 31 Dec 2025.
  assert.equal(refreshCaveat({ verified: "2025", verifiedBy: "paper-menu" }, "2026-08-09").reason,
    "stale");
  assert.equal(refreshCaveat({ verified: "2026", verifiedBy: "paper-menu" }, "2026-08-09").show,
    false, "2026-01-01 is inside the year");
});

test("refreshCaveat: a future-dated reading is not stale", () => {
  assert.equal(refreshCaveat({ verified: "2026-09-01", verifiedBy: "in-store" }, "2026-08-09").show,
    false);
});

test("refreshCaveat: the corpus's own records land where the ruling says", () => {
  // The four dated records as they ship, read on the day this policy landed.
  const asOf = "2026-08-09";
  assert.equal(refreshCaveat({ verified: "2026-08-07", verifiedBy: "in-store" }, asOf).show, false);
  assert.equal(refreshCaveat({ verified: "2026-08-08", verifiedBy: "paper-menu" }, asOf).show, false);
  assert.equal(refreshCaveat({ verified: "2026-08-08", verifiedBy: "official-site" }, asOf).show,
    false, "TJ Katsu and Sushi Bi — the shop's own site, read two days ago");
  // …and every other record, which has never been read at all.
  assert.equal(refreshCaveat({ verified: null }, asOf).show, true);
});

// ——————————————————— Hemisphere-aware seasons (ADR 0043) ———————————————————

test("todayIn reads the date in the zone it is handed", () => {
  // 22:00 UTC on 31 Dec is already New Year's Day in Auckland and still the
  // old year in London — one instant, two dates.
  const t = new Date("2025-12-31T22:00:00Z");
  assert.equal(todayIn("Pacific/Auckland", t), "2026-01-01");
  assert.equal(todayIn("Europe/London", t), "2025-12-31");
});

test("todayIn falls back to home for a malformed zone rather than throwing", () => {
  const t = new Date("2025-12-31T22:00:00Z");
  assert.equal(todayIn("Not/AZone", t), todayIn("Pacific/Auckland", t));
});

test("seasonMonths: summer is Dec-Feb in the south and Jun-Aug in the north", () => {
  assert.deepEqual(seasonMonths("summer", "south"), [12, 1, 2]);
  assert.deepEqual(seasonMonths("summer", "north"), [6, 7, 8]);
  assert.deepEqual(seasonMonths("winter", "north"), [12, 1, 2]);
});

test("seasonMonths: unknown hemisphere falls back to south, unknown season to null", () => {
  assert.deepEqual(seasonMonths("summer", undefined), [12, 1, 2]);
  assert.deepEqual(seasonMonths("summer", "sideways"), [12, 1, 2]);
  assert.equal(seasonMonths("harvest", "south"), null);
});
