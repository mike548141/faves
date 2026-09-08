// Degenerate-state venue fixtures — one idiom, one place to look.
//
// WHY THIS EXISTS. The shipped corpus is uniformly healthy, so a whole class of
// behaviour ships unexercised. Re-measured 2026-09-09 on 57 records: every one
// carries `lifecycle.added` and NOT ONE carries a `lifecycle.events` entry, so
// there is no closed venue anywhere; no day is `null`; no section is empty; no
// dish is unpriced. Those are all states the schema can hold and the site has
// code to render — `menu.js` line 1328 prints "—" for a dish with no price, and
// nothing in the repo has ever made it do so.
//
// The consequence is the one the roadmap item names and it is worth saying
// plainly: *"the checks are green"* says nothing about a state the corpus does
// not contain. That is not a gap in the checks. It is a gap in the fixtures,
// and from the outside the two look identical.
//
// ─── THE RULE THAT MAKES A FIXTURE LIBRARY SURVIVABLE ────────────────────────
//
// DERIVE, NEVER AUTHOR. Every fixture here is a REAL corpus record with ONE
// named transform applied to it. Not a hand-written miniature venue.
//
// This is the whole design, and it is aimed at the failure mode every fixture
// library eventually has: it encodes a shape the product has moved past, and
// then the check passes against a fiction. A hand-written venue is frozen on
// the day it was typed — it will not grow `sectionId` when ADR 0058 lands, or
// `dishId` when ADR 0051 does, or a branch `id` when ADR 0103 does, and the
// browser check standing on it goes on printing PASS. A DERIVED fixture gains
// every one of those on the day the corpus does, for free, because the fields
// were never ours to maintain.
//
// It also buys the second-order thing: the branches, hours, timezones and
// prices under test are the corpus's own, so they are wrong in the ways real
// data is wrong rather than in the ways an invented miniature is.
//
// ─── AND THE GATE, BECAUSE A RULE IS NOT A MECHANISM ─────────────────────────
//
// `tools/fixture_check.mjs` materialises every fixture below into a sandbox
// copy of the tree and runs the REAL `tools/validate.py` over it, demanding
// ZERO new ERROR lines. Not a re-implementation of the schema — the gate the
// corpus itself passes through. So a transform that produces a shape the
// product no longer accepts fails a check rather than quietly certifying a
// wreck, which is exactly what happened here before: the guard meant to cover a
// shut-down chain passed *"the lead is not a branch we know is closed"* on a
// permanently-closed chain (roadmap 340/150, found 2026-08-19).
//
// That gate already earns its keep. Two of the seven transforms below were
// written wrong on the first attempt and the real validator named both: the
// empty section used `{id, name}` where the schema says `{section, sectionId}`,
// and the unpriced dish collided on a derived `dishId`. Neither would have been
// visible in a browser — the page would have rendered *something* and the
// assertions would have measured it.
//
// ─── AND WHERE A FIXTURE MAY LIVE ────────────────────────────────────────────
//
// Never in `site/data/`. A venue file there is precached onto every phone
// (ADR 0047), so inventing a closed venue ships a fiction to the world to make
// a test pass. A fixture exists only as overlay bytes for one HTTP GET
// (`startServer`'s `overlay`), which keeps the browser doing exactly what it
// does in life — one fetch of one venue JSON — with only the bytes staged.
//
// The other rejected alternative is stubbing `fetch` inside the page: that
// tests a fake instead of the real load path, and it is a third idiom on top of
// the two that already exist. (`midnight_check.mjs` does stub `fetch`, and for
// a reason this library does not remove: it toggles the SAME id patched and
// unpatched inside one run, so the pair reads as one venue changing rather than
// two venues differing. Noted rather than converted.)

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Every fixture id ends in this, so a grep can never confuse one for a venue
 *  and a stray fixture that reached `site/data/` is one search away. */
export const FIXTURE_SUFFIX = "-fixture";

/** A closure long past and never reopened, so the venue is shut at every hour
 *  of every day. Deliberate: a check that passes at 1pm and fails at 1am gets
 *  switched off within a week. */
const CLOSED_PERMANENTLY = {
  type: "closed-permanently",
  date: "2016-04-01",
  note: "fixture",
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** `{}` has no segments at all, which hours.js answers as CLOSED. That is not
 *  the same as "unknown", which needs no `hours` key whatsoever — see the
 *  `no-hours-anywhere` state below, which is the other one. */
export const NEVER_OPEN = {};

/** Every segment ends exactly where the next begins, so there is no minute of
 *  the week this is shut. Clock-independent by construction. */
export const ALWAYS_OPEN = Object.fromEntries(DAYS.map((d) => [d, [["00:00", "24:00"]]]));

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * The degenerate states, by name. A check asks for one by saying what it wants
 * — "a venue that is permanently closed" — rather than hand-rolling JSON.
 *
 * Each entry is:
 *   summary  one line, printed by `--list` and by the gate, so a state cannot
 *            be added without saying what it is for.
 *   absent   how the CORPUS was measured to lack it, on 2026-09-09. A state
 *            the corpus has acquired since does not need a fixture, and this
 *            field is what a future session re-measures rather than trusts.
 *   requires (record) => boolean — whether this source can HOLD the state.
 *   apply    (record, opts) => void — mutates a DEEP CLONE of a real record.
 *
 * `apply` mutates in place because a transform that returns a new object can
 * silently drop a field it did not know about, which is the exact drift this
 * file exists to prevent.
 *
 * `requires` exists because the gate found a silent no-op on its first run:
 * `branch-without-hours` applied to `gold-lining-cafe` — a single-site venue
 * with no `locations` at all — produced a fixture byte-identical to the real
 * record, which validates perfectly and asserts nothing. A fixture that changed
 * nothing is the fixture-library twin of a mutation test that mutates nothing.
 * So the shape a state needs is DECLARED, the gate skips the pairs that cannot
 * hold it and SAYS SO, and a state that no source can hold is a failure rather
 * than a silent absence.
 */
export const STATES = {
  "permanently-closed": {
    summary: "a venue shut for good, with a decade-old closure event",
    absent: "0 of 57 records carry any lifecycle.events entry",
    requires: () => true,
    apply(r) {
      // CLONED, not aliased. Handing out the module constant let a caller that
      // mutates the fixture reach back and change every later fixture in the
      // same process — found by this file's own --selftest, where a mutation
      // made in one case went on being reported in the next five, and each of
      // those cases only asserted that SOME new error appeared.
      r.lifecycle = { ...(r.lifecycle || {}), events: [clone(CLOSED_PERMANENTLY)] };
    },
  },

  "temporarily-closed": {
    summary: "a venue shut with a stated reopening date already in the past",
    absent: "0 of 57 records carry any lifecycle.events entry",
    requires: () => true,
    apply(r) {
      // `until` in the past is the OVERDUE reopening the item names: the venue
      // said it would be back and the date has been and gone. A future `until`
      // would make the state depend on the clock.
      r.lifecycle = {
        ...(r.lifecycle || {}),
        events: [
          { type: "closed-temporarily", date: "2016-04-01", until: "2016-05-01", note: "fixture" },
        ],
      };
    },
  },

  "no-hours-anywhere": {
    summary: "a venue that has published no opening times at all, on any branch",
    // NOT absent from the corpus — 12 of 57 venues are like this, so this state
    // is here for COMPOSITION (a shut chain that also has no hours) rather than
    // to fill a hole. Said out loud because a fixture justified by a corpus fact
    // goes stale exactly when the corpus changes.
    absent: "present in 12 of 57 records — kept for composing with other states",
    requires: (r) => !!r.hours || (r.locations || []).some((b) => b.hours),
    apply(r) {
      delete r.hours;
      for (const b of r.locations || []) delete b.hours;
    },
  },

  "unknown-day": {
    summary: "one weekday nulled — the venue never published that day (ADR 0105)",
    absent: "0 null day entries across every record's hours and every branch's",
    requires: (r) => !!r.hours || (r.locations || []).some((b) => b.hours),
    apply(r, { day = "wed" } = {}) {
      // `null` is "not published", which is a different fact from `[]` ("shut
      // that day") and from an absent `hours` key ("we never captured any").
      // The three are kept distinguishable on purpose.
      if (r.hours) r.hours[day] = null;
      for (const b of r.locations || []) if (b.hours) b.hours[day] = null;
    },
  },

  "branch-without-hours": {
    summary: "one branch of a chain with no hours while its siblings have them",
    absent: "present on 10 of 47 branches — kept for the mixed-chain shape",
    requires: (r) => (r.locations || []).some((b) => b.hours),
    apply(r, { index = 0 } = {}) {
      const b = (r.locations || [])[index];
      if (b) delete b.hours;
    },
  },

  "empty-section": {
    summary: "a menu section with a heading and no rows under it",
    absent: "0 empty sections across every record",
    requires: () => true,
    apply(r, { name = "Nothing here yet" } = {}) {
      // Appended rather than emptied, so every assertion the real sections
      // carry still runs on the same page in the same load.
      r.menu = [...(r.menu || []), { section: name, sectionId: "fixture-empty", items: [] }];
    },
  },

  "unpriced-dish": {
    summary: "a dish whose price was never recorded (`price: null`)",
    absent: "0 dishes with a null or absent price across every record",
    requires: (r) => ((r.menu || [])[0]?.items || []).length > 0,
    apply(r, { name = "Fixture Unpriced Dish" } = {}) {
      // A COPY of a real dish with its price removed, not an invented row —
      // so it carries whatever fields a dish is required to carry today.
      // `dishId` is set explicitly because the derived id would collide with
      // the dish it was copied from, which validate.py catches and which is
      // the second of the two mistakes this file's gate found on day one.
      const section = (r.menu || [])[0];
      if (!section || !(section.items || []).length) return;
      const dish = clone(section.items[0]);
      dish.name = name;
      dish.dishId = "fixture-unpriced";
      delete dish.prices;
      // `null`, not absent: "no price recorded" is a fact the schema states,
      // and `menu.js` renders it as "—" (or "?" where a `needs` entry says we
      // know it is missing). Nothing in the corpus has ever made it do either.
      dish.price = null;
      section.items = [...section.items, dish];
    },
  },
};

export const STATE_NAMES = Object.keys(STATES);

/** The real record for a venue id, parsed. */
export async function readVenue(siteDir, id) {
  return JSON.parse(await readFile(join(siteDir, "data", "restaurants", `${id}.json`), "utf8"));
}

/**
 * Build one fixture record.
 *
 *   buildFixture(SITE, { from: "tj-katsu", states: ["permanently-closed"] })
 *
 * `id` defaults to `<from>-<states joined>-fixture`, which makes a fixture's id
 * say what it is — a failing assertion names the state without anyone having to
 * come back here and look it up.
 *
 * `states` may name several: they are applied in order, so composition is the
 * default rather than a special case ("a shut chain that also has no hours").
 * `opts` is passed to every transform; each reads only its own keys.
 *
 * `hours` overrides the first N branches' hours, and exists because a clock
 * independent branch is the only way to assert which branch LEADS at 1am as
 * well as 1pm. `keepBranches` truncates the chain.
 */
export async function buildFixture(siteDir, spec) {
  const { from, states = [], id = defaultId(from, states), opts = {} } = spec;
  for (const s of states) {
    if (!STATES[s]) throw new Error(`unknown degenerate state ${JSON.stringify(s)} — have: ${STATE_NAMES.join(", ")}`);
  }
  if (!id.endsWith(FIXTURE_SUFFIX)) {
    // Not cosmetic. A fixture id that does not announce itself is one careless
    // copy away from being taken for a venue.
    throw new Error(`fixture id ${JSON.stringify(id)} must end in ${FIXTURE_SUFFIX}`);
  }
  const record = clone(await readVenue(siteDir, from));
  record.id = id;
  if (spec.hours) {
    // `clone` for the same reason as the closure event: NEVER_OPEN and
    // ALWAYS_OPEN are module constants, and an aliased one is a fixture that
    // can be edited from another fixture.
    record.locations = (record.locations || []).map((b, i) =>
      i < spec.hours.length ? { ...b, hours: clone(spec.hours[i]) } : b,
    );
  }
  if (spec.keepBranches) {
    record.locations = (record.locations || []).slice(0, spec.keepBranches);
  }
  for (const s of states) STATES[s].apply(record, opts);
  return record;
}

export function defaultId(from, states) {
  return `${from}-${states.join("-") || "plain"}${FIXTURE_SUFFIX}`;
}

/**
 * Build several fixtures and return `{ records, overlay }` — the overlay keyed
 * by the path the page will actually GET, so the served bytes and the
 * assertions cannot disagree about which record ran.
 */
export async function buildFixtures(siteDir, specs) {
  const records = new Map();
  const overlay = new Map();
  for (const spec of specs) {
    const record = await buildFixture(siteDir, spec);
    records.set(record.id, record);
    overlay.set(`/data/restaurants/${record.id}.json`, JSON.stringify(record));
  }
  return { records, overlay };
}
