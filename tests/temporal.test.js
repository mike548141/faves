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
  todayNZ,
  VERIFY_METHODS,
  verification,
  verificationText,
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

test("todayNZ: returns an ISO date in the venue's timezone", () => {
  assert.match(todayNZ(), /^\d{4}-\d{2}-\d{2}$/);
  // 09:00 UTC on 1 Jan is already the 1st in NZ (UTC+13 in January).
  assert.equal(todayNZ(new Date("2026-01-01T09:00:00Z")), "2026-01-01");
  // 22:00 UTC on 31 Dec is the 1st in NZ but still the 31st in UTC.
  assert.equal(todayNZ(new Date("2025-12-31T22:00:00Z")), "2026-01-01");
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
