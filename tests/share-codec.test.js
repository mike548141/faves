// Unit tests for the group-ordering URL codec (site/js/share-codec.js).
// Pure — no DOM, no network. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeShare,
  encodeShortlist,
  decodeShare,
  buildShareUrl,
  readShareToken,
  CODEC_VERSION,
} from "../site/js/share-codec.js";
import { mergeItems, normaliseNote, lineKey } from "../site/js/cart.js";
import { favKey } from "../site/js/favourites.js";

// groupByVenue()-shaped input: what the order sheet hands the encoder.
const groups = [
  {
    venueId: "kk",
    venueName: "KK Malaysian",
    phone: "04 555 1234",
    items: [
      { name: "Mee Goreng", price: 18, qty: 2 },
      { name: "Roti", price: 6, qty: 1 },
    ],
  },
  {
    venueId: "sf",
    venueName: "Sprig + Fern",
    phone: null,
    items: [{ name: "Pilsner", price: 12, qty: 3 }],
  },
];

test("round-trips an order to a flat, cart-shaped item list", () => {
  const decoded = decodeShare(encodeShare({ type: "order", groups }));
  assert.equal(decoded.type, "order");
  assert.equal(decoded.version, CODEC_VERSION);
  assert.equal(decoded.items.length, 3);
  assert.deepEqual(decoded.items[0], {
    venueId: "kk",
    venueName: "KK Malaysian",
    phone: "04 555 1234",
    name: "Mee Goreng",
    price: 18,
    qty: 2,
  });
  assert.equal(decoded.items[2].venueId, "sf");
  assert.equal(decoded.items[2].phone, null);
});

test("carries an optional sender label", () => {
  const decoded = decodeShare(encodeShare({ groups, label: "Alex" }));
  assert.equal(decoded.label, "Alex");
});

test("no label -> empty string, not undefined", () => {
  const decoded = decodeShare(encodeShare({ groups }));
  assert.equal(decoded.label, "");
});

test("preserves macrons / non-ASCII (UTF-8, not Latin-1)", () => {
  const g = [
    { venueId: "x", venueName: "Māori Kai", phone: null, items: [{ name: "Kūmara chips", price: 9, qty: 1 }] },
  ];
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(decoded.items[0].venueName, "Māori Kai");
  assert.equal(decoded.items[0].name, "Kūmara chips");
});

test("encodeShare is order-only; a shortlist type is rejected", () => {
  // Shortlists have their own wire shape — encodeShortlist, not encodeShare.
  assert.throws(() => encodeShare({ type: "shortlist", groups }), /order-only/);
});

test("unknown share type throws at encode", () => {
  assert.throws(() => encodeShare({ type: "nope", groups }));
});

test("null price survives the round-trip", () => {
  const g = [{ venueId: "x", venueName: "X", phone: null, items: [{ name: "Market fish", price: null, qty: 1 }] }];
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(decoded.items[0].price, null);
});

test("clamps quantity into 1..99 and drops non-positive lines", () => {
  const g = [
    {
      venueId: "x",
      venueName: "X",
      phone: null,
      items: [
        { name: "Big", price: 1, qty: 500 },
        { name: "Zero", price: 1, qty: 0 },
        { name: "Neg", price: 1, qty: -4 },
      ],
    },
  ];
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(decoded.items.length, 1);
  assert.equal(decoded.items[0].name, "Big");
  assert.equal(decoded.items[0].qty, 99);
});

test("sanitises the phone to a safe character set", () => {
  const g = [
    { venueId: "x", venueName: "X", phone: "04-555 (1234) javascript:alert", items: [{ name: "A", price: 1, qty: 1 }] },
  ];
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(/[a-z:]/i.test(decoded.items[0].phone), false);
  assert.match(decoded.items[0].phone, /^[0-9+()\s-]+$/);
});

// --- fail-soft: anything unreadable decodes to null -----------------------

test("returns null for garbage / not base64", () => {
  assert.equal(decodeShare("!!!not base64!!!"), null);
  assert.equal(decodeShare(""), null);
  assert.equal(decodeShare(null), null);
  assert.equal(decodeShare(undefined), null);
});

test("returns null for a valid base64 that is not our JSON", () => {
  // base64url("hello") -> not an object with our shape
  const token = Buffer.from("hello").toString("base64url");
  assert.equal(decodeShare(token), null);
});

test("returns null for an unknown codec version", () => {
  const token = Buffer.from(JSON.stringify({ v: 999, t: "o", g: [] })).toString("base64url");
  assert.equal(decodeShare(token), null);
});

test("returns null for an unknown payload type", () => {
  const token = Buffer.from(JSON.stringify({ v: CODEC_VERSION, t: "z", g: [] })).toString("base64url");
  assert.equal(decodeShare(token), null);
});

test("returns null when there are no usable lines", () => {
  const empty = [{ venueId: "x", venueName: "X", phone: null, items: [{ name: "  ", price: 1, qty: 1 }] }];
  assert.equal(decodeShare(encodeShare({ groups: empty })), null);
});

// --- URL glue -------------------------------------------------------------

test("buildShareUrl puts the token in a fragment and drops any old one", () => {
  const url = buildShareUrl("TOKEN", "https://faves.example/#stale");
  assert.equal(url, "https://faves.example/#share=TOKEN");
});

test("readShareToken pulls the token from a hash or a whole URL", () => {
  assert.equal(readShareToken("#share=ABC"), "ABC");
  assert.equal(readShareToken("share=ABC"), "ABC");
  assert.equal(readShareToken("https://faves.example/#share=ABC"), "ABC");
  assert.equal(readShareToken("#other=1&share=ABC"), "ABC");
  assert.equal(readShareToken("#nothing"), null);
  assert.equal(readShareToken(""), null);
});

test("end-to-end: encode -> URL -> read token -> decode", () => {
  const token = encodeShare({ groups, label: "Sam" });
  const url = buildShareUrl(token, "https://faves.example/");
  const back = decodeShare(readShareToken(url));
  assert.equal(back.label, "Sam");
  assert.equal(back.items.length, 3);
});

// --- Shortlist payload (shared favourites) ---------------------------------

// groupForShare()-shaped input: what the Favourites view hands the encoder.
const shortlistGroups = [
  { venueId: "kk", venueName: "KK Malaysian", isRecipe: false, sub: "Tawa · Malaysian", venueFav: true, dishes: ["Mee Goreng", "Roti Canai"] },
  { venueId: "cah", venueName: "Cook at Home", isRecipe: true, sub: "", venueFav: false, dishes: ["Ōtaki Kūmara"] },
];

test("round-trips a shortlist to flat favourites entries", () => {
  const decoded = decodeShare(encodeShortlist({ label: "Alex", groups: shortlistGroups }));
  assert.equal(decoded.type, "shortlist");
  assert.equal(decoded.label, "Alex");
  // venue heart + 2 dishes for KK, then 1 recipe dish for Cook at Home
  assert.equal(decoded.items.length, 4);
  assert.deepEqual(decoded.items[0], { type: "venue", venueId: "kk", venueName: "KK Malaysian", isRecipe: false, sub: "Tawa · Malaysian" });
  assert.deepEqual(decoded.items[1], { type: "dish", name: "Mee Goreng", venueId: "kk", venueName: "KK Malaysian", isRecipe: false, sub: "Tawa · Malaysian" });
  // the recipe flag survives so the received favourite deep-links to recipe.html
  const recipeDish = decoded.items.find((i) => i.venueId === "cah");
  assert.equal(recipeDish.isRecipe, true);
  assert.equal(recipeDish.name, "Ōtaki Kūmara"); // macron survives the round-trip
});

test("shortlist without a venue heart yields only dish entries", () => {
  const decoded = decodeShare(encodeShortlist({ groups: [
    { venueId: "kk", venueName: "KK Malaysian", venueFav: false, dishes: ["Roti"] },
  ] }));
  assert.equal(decoded.items.length, 1);
  assert.equal(decoded.items[0].type, "dish");
});

test("shortlist drops groups with neither a venue heart nor any dish", () => {
  const decoded = decodeShare(encodeShortlist({ groups: [
    { venueId: "empty", venueName: "Nothing", venueFav: false, dishes: [] },
    { venueId: "kk", venueName: "KK", venueFav: true, dishes: [] },
  ] }));
  assert.equal(decoded.items.length, 1);
  assert.equal(decoded.items[0].venueId, "kk");
});

test("an all-empty shortlist decodes to null (a dud)", () => {
  assert.equal(decodeShare(encodeShortlist({ groups: [] })), null);
});

test("order and shortlist tokens decode to their own type", () => {
  assert.equal(decodeShare(encodeShare({ groups })).type, "order");
  assert.equal(decodeShare(encodeShortlist({ groups: shortlistGroups })).type, "shortlist");
});

// --- dish ids on the wire (ADR 0051) --------------------------------------
// The id rides as an appended positional slot (index 4), which every decoder
// that predates it ignores by construction — the same trick add-ons used, and
// for the same reason: CODEC_VERSION is checked with a strict `!==` and is
// shared by all three payload kinds, so bumping it would break every
// outstanding link of all three.

// `fixture-venue` and not `sprig-and-fern`: that id is RETIRED — renames.js
// maps it to `sprig-and-fern-tawa`, and the five taverns are now separate
// records in site/data/index.json. A retired-but-live id in a synthetic fixture
// reads as a real venue to the next session and would quietly start exercising
// the rename path the day one of these tests grew a migration. The `fixture-`
// prefix is reserved for tests and can never be a real venue id.
const burgerGroups = [
  {
    venueId: "fixture-venue",
    venueName: "Sprig & Fern",
    phone: null,
    items: [
      { name: "Cheeseburger", dishId: "cheeseburger", price: 28, qty: 1 },
      { name: "Cheeseburger", dishId: "cheeseburger-gold-card", price: 21, qty: 1 },
    ],
  },
];

// Read the raw payload back out of a token, to assert what is actually on the
// wire rather than only what survives the round trip.
const payloadOf = (token) => JSON.parse(Buffer.from(token, "base64url").toString());

test("an ordinary link carries no id slot — links do not grow", () => {
  const lines = payloadOf(encodeShare({ groups })).g[0].i;
  assert.deepEqual(lines[0], ["Mee Goreng", 18, 2]); // three slots, as always
});

test("an id equal to slug(name) is not emitted either", () => {
  const g = [{ venueId: "x", venueName: "X", phone: null, items: [{ name: "Roti Canai", dishId: "roti-canai", price: 6, qty: 1 }] }];
  assert.deepEqual(payloadOf(encodeShare({ groups: g })).g[0].i[0], ["Roti Canai", 6, 1]);
});

test("a distinguishing id rides in slot 4, with a null options slot before it", () => {
  const line = payloadOf(encodeShare({ groups: burgerGroups })).g[0].i[1];
  assert.deepEqual(line, ["Cheeseburger", 21, 1, null, "cheeseburger-gold-card"]);
});

test("the id round-trips, and two same-named dishes stay two order lines", () => {
  const decoded = decodeShare(encodeShare({ groups: burgerGroups }));
  assert.equal(decoded.items.length, 2);
  assert.equal(decoded.items[0].dishId, undefined); // "cheeseburger" == slug(name)
  assert.equal(decoded.items[1].dishId, "cheeseburger-gold-card");
  // The point of the whole exercise: merged into an order they are two lines
  // at $49, not one at $56.
  const merged = mergeItems([], decoded.items.map((i) => ({ ...i, qty: i.qty })));
  assert.equal(merged.length, 2);
  assert.equal(merged.reduce((s, i) => s + i.price * i.qty, 0), 49);
});

test("an id and add-ons coexist in their own slots", () => {
  const g = [{
    venueId: "x", venueName: "X", phone: null,
    items: [{ name: "Kebab", dishId: "kebab-large", price: 20, qty: 1, options: [{ group: "Sauce", name: "Satay", price: 1 }] }],
  }];
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(decoded.items[0].dishId, "kebab-large");
  assert.deepEqual(decoded.items[0].options, [{ group: "Sauce", name: "Satay", price: 1 }]);
});

test("a link minted before ids existed decodes to exactly what it always did", () => {
  // Hand-built at the old three-slot shape — no slot 3, no slot 4.
  const token = Buffer.from(JSON.stringify({
    v: CODEC_VERSION, t: "o",
    g: [{ v: "kk", n: "KK Malaysian", p: "04 555 1234", i: [["Mee Goreng", 18, 2]] }],
  })).toString("base64url");
  assert.deepEqual(decodeShare(token).items, [
    { venueId: "kk", venueName: "KK Malaysian", phone: "04 555 1234", name: "Mee Goreng", price: 18, qty: 2 },
  ]);
});

test("a crafted id is clipped and trimmed like every other string off the wire", () => {
  const craft = (id) => Buffer.from(JSON.stringify({
    v: CODEC_VERSION, t: "o",
    g: [{ v: "x", n: "X", p: null, i: [["A", 1, 1, null, id]] }],
  })).toString("base64url");
  assert.equal(decodeShare(craft("z".repeat(300))).items[0].dishId.length, 120);
  assert.equal(decodeShare(craft("  spaced  ")).items[0].dishId, "spaced");
  assert.equal("dishId" in decodeShare(craft("   ")).items[0], false); // blank → none
});

// --- the free-text note on the wire (Theme 14c) ----------------------------
// The note rides as slot 5, after the dish id, with `null` forced into every
// earlier optional slot so it lands at a stable index. NOT a CODEC_VERSION bump,
// for the reason above — the version is shared with shortlists and checked with
// a strict `!==`.
//
// 🚩 The safety argument written against the add-on slot does NOT transfer here,
// and the code comment says so. An add-on is an ADDITION, so an old decoder
// dropping it takes something off the plate; a note is characteristically a
// REMOVAL ("no tomato"), so an old decoder dropping it leaves the unwanted thing
// ON the plate — the unsafe degradation direction. It is appended anyway,
// eyes open: a note that does not travel fails every time, where this fails only
// against a decoder that predates the slot.

const notedGroups = [
  {
    venueId: "fixture-venue",
    venueName: "A Cafe",
    phone: null,
    items: [{ name: "Eggs on Toast", price: 20, qty: 1, note: "no tomato" }],
  },
];

test("a note-only line: null placeholders keep it at slot 5", () => {
  const line = payloadOf(encodeShare({ groups: notedGroups })).g[0].i[0];
  assert.deepEqual(line, ["Eggs on Toast", 20, 1, null, null, "no tomato"]);
});

test("a note-only line round-trips (no add-ons, no explicit id)", () => {
  const decoded = decodeShare(encodeShare({ groups: notedGroups }));
  assert.equal(decoded.items.length, 1);
  assert.deepEqual(decoded.items[0], {
    venueId: "fixture-venue",
    venueName: "A Cafe",
    phone: null,
    name: "Eggs on Toast",
    price: 20,
    qty: 1,
    note: "no tomato",
  });
  // …and it merges into an order as its OWN line, not onto the plain one.
  const merged = mergeItems([{ ...decoded.items[0], note: undefined, qty: 1 }], decoded.items);
  assert.equal(merged.length, 2);
});

test("a note, add-ons and an explicit id all ride together", () => {
  const g = [{
    venueId: "x", venueName: "X", phone: null,
    items: [{
      name: "Kebab", dishId: "kebab-large", price: 20, qty: 2,
      options: [{ group: "Sauce", name: "Satay", price: 1 }],
      note: "no onion",
    }],
  }];
  const line = payloadOf(encodeShare({ groups: g })).g[0].i[0];
  assert.deepEqual(line, [
    "Kebab", 20, 2,
    [["Sauce", "Satay", 1]],
    "kebab-large",
    "no onion",
  ]);
  const decoded = decodeShare(encodeShare({ groups: g }));
  assert.equal(decoded.items[0].dishId, "kebab-large");
  assert.deepEqual(decoded.items[0].options, [{ group: "Sauce", name: "Satay", price: 1 }]);
  assert.equal(decoded.items[0].note, "no onion");
});

test("a note with add-ons but no distinguishing id still needs the id placeholder", () => {
  const g = [{
    venueId: "x", venueName: "X", phone: null,
    items: [{ name: "Kebab", price: 20, qty: 1, options: [{ group: "Sauce", name: "Satay", price: 1 }], note: "no onion" }],
  }];
  const line = payloadOf(encodeShare({ groups: g })).g[0].i[0];
  assert.deepEqual(line, ["Kebab", 20, 1, [["Sauce", "Satay", 1]], null, "no onion"]);
  assert.equal(decodeShare(encodeShare({ groups: g })).items[0].note, "no onion");
});

test("a token minted WITHOUT a note decodes to exactly the object it did before", () => {
  // The backward-compatibility guarantee, field for field on both sides of the
  // wire: no extra slot on the way out, no extra key on the way in.
  assert.deepEqual(payloadOf(encodeShare({ groups })).g[0].i, [
    ["Mee Goreng", 18, 2],
    ["Roti", 6, 1],
  ]);
  const decoded = decodeShare(encodeShare({ groups }));
  assert.deepEqual(decoded.items[0], {
    venueId: "kk",
    venueName: "KK Malaysian",
    phone: "04 555 1234",
    name: "Mee Goreng",
    price: 18,
    qty: 2,
  });
  for (const i of decoded.items) assert.equal("note" in i, false);
  // …and an id-carrying line is still five slots, not six.
  assert.deepEqual(payloadOf(encodeShare({ groups: burgerGroups })).g[0].i[1],
    ["Cheeseburger", 21, 1, null, "cheeseburger-gold-card"]);
});

test("a hostile note is clipped, collapsed and clamped, and never lands garbage", () => {
  const craft = (note) => tokenOf({
    v: CODEC_VERSION, t: "o",
    g: [{ v: "x", n: "X", p: null, i: [["A", 1, 1, null, null, note]] }],
  });
  const first = (note) => decodeShare(craft(note)).items[0];

  // A number, an object, an array and null are all "no note" — never
  // "[object Object]" read out at a counter.
  for (const bad of [7, { evil: 1 }, ["evil"], null, true]) {
    assert.equal("note" in first(bad), false, `note survived for ${JSON.stringify(bad)}`);
  }
  // Over-length is cut to the ceiling, not refused (the order is still usable).
  assert.equal(first("z".repeat(300)).note.length, 80);
  // Whitespace and control characters normalise the same as they do locally.
  assert.equal(first("  no   tomato  ").note, "no tomato");
  assert.equal(first("no\ttomato").note, "no tomato");
  assert.equal(first("no\u0000tomato").note, "no tomato"); // a NUL is not a word joiner
  assert.equal("note" in first("   "), false);
  assert.equal("note" in first(""), false);
  // Markup is carried as CHARACTERS. cart-ui.js sets it with textContent, so it
  // is shown, not parsed; the codec's job is only to not mangle it.
  assert.equal(first("<img src=x onerror=alert(1)>").note, "<img src=x onerror=alert(1)>");
  // A clip that lands mid-space cannot leave a trailing one — that would key as
  // a different line from the sender's.
  const cut = first("y".repeat(79) + "   tail");
  assert.equal(cut.note, "y".repeat(79));
});

test("a line whose only extra slots are placeholders decodes as a plain line", () => {
  // Explicit nulls in slots 3 and 4 must mean "nothing here", not "an empty
  // options array" or "a blank id".
  const token = tokenOf({
    v: CODEC_VERSION, t: "o",
    g: [{ v: "kk", n: "KK Malaysian", p: null, i: [["Mee Goreng", 18, 2, null, null]] }],
  });
  assert.deepEqual(decodeShare(token).items, [
    { venueId: "kk", venueName: "KK Malaysian", phone: null, name: "Mee Goreng", price: 18, qty: 2 },
  ]);
});

test("the codec and cart.js normalise a note IDENTICALLY", () => {
  // share-codec.js keeps its own cleaner (it re-sanitises everything off the
  // wire by design) — but a note that arrives spelt differently from the way the
  // sender's store spelt it keys as a DIFFERENT line, so the two must agree.
  // This is the guard that fires if either drifts.
  const cases = [
    "no tomato", " no  tomato ", "no\ttomato", "no\n\ntomato", "  ", "",
    "Sauce ON the side", "Māori kūmara, no butter", "a".repeat(40),
  ];
  const craft = (note) => tokenOf({
    v: CODEC_VERSION, t: "o",
    g: [{ v: "x", n: "X", p: null, i: [["A", 1, 1, null, null, note]] }],
  });
  for (const c of cases) {
    const local = normaliseNote(c);
    const wire = decodeShare(craft(c)).items[0].note ?? "";
    assert.equal(wire, local, `disagreed on ${JSON.stringify(c)}`);
  }
});

test("end-to-end: a noted line survives encode → share → decode → merge", () => {
  const g = [{
    venueId: "cafe", venueName: "A Cafe", phone: null,
    items: [
      { name: "Eggs on Toast", price: 20, qty: 1 },
      { name: "Eggs on Toast", price: 20, qty: 1, note: " no  tomato " },
    ],
  }];
  const back = decodeShare(readShareToken(buildShareUrl(encodeShare({ groups: g }), "https://faves.example/")));
  assert.equal(back.items.length, 2);
  const merged = mergeItems([], back.items);
  assert.equal(merged.length, 2); // two things to make, not a quantity of 2
  assert.equal(new Set(merged.map(lineKey)).size, 2);
  assert.equal(merged[1].note, "no tomato");
});

// --- dish ids on a shortlist (ADR 0051 residue) ---------------------------
// `d` is still a bare array of NAME strings, byte for byte: changing its
// element type is the one change to this wire an existing decoder cannot
// ignore. The ids ride BESIDE it in `k`, a parallel array — the same
// append-an-optional-slot trick the order line used, in the container this
// payload actually has (a keyed group object, so the "appended slot" is a new
// key). Old decoders read `g.d` and never look at `g.k`, so they degrade to the
// bare slug, which is exactly what they do today.

const goldCardShortlist = [
  {
    venueId: "fixture-venue",
    venueName: "Fixture Venue",
    isRecipe: false,
    sub: "",
    venueFav: false,
    dishes: [
      { name: "Cheeseburger", dishId: "cheeseburger" },
      { name: "Cheeseburger", dishId: "cheeseburger-gold-card" },
    ],
  },
];

const tokenOf = (payload) => Buffer.from(JSON.stringify(payload)).toString("base64url");

test("an ordinary shortlist carries no id array — links do not grow", () => {
  const g = payloadOf(encodeShortlist({ groups: shortlistGroups })).g[0];
  assert.deepEqual(g.d, ["Mee Goreng", "Roti Canai"]);
  assert.equal("k" in g, false);
});

test("a shortlist naming a disambiguated row resolves to the RIGHT row", () => {
  const decoded = decodeShare(encodeShortlist({ groups: goldCardShortlist }));
  assert.equal(decoded.items.length, 2);
  // Both are called "Cheeseburger"; only the id keeps them apart.
  assert.equal("dishId" in decoded.items[0], false); // "cheeseburger" == slug(name)
  assert.equal(decoded.items[1].dishId, "cheeseburger-gold-card");
  assert.deepEqual(decoded.items.map(favKey), [
    "d:fixture-venue cheeseburger",
    "d:fixture-venue cheeseburger-gold-card",
  ]);
});

test("the id rides in a parallel `k`; `d` stays a bare string array", () => {
  const g = payloadOf(encodeShortlist({ groups: goldCardShortlist })).g[0];
  assert.deepEqual(g.d, ["Cheeseburger", "Cheeseburger"]);
  assert.deepEqual(g.k, [null, "cheeseburger-gold-card"]);
});

test("an OLD decoder reading a NEW code degrades to the bare slug, and never throws", () => {
  // An old decoder reads `g.d` and `g.f` and ignores every key it doesn't know,
  // so what it sees is the new payload with `k` deleted. Simulated exactly.
  const payload = payloadOf(encodeShortlist({ groups: goldCardShortlist }));
  for (const g of payload.g) delete g.k;
  const asOldDecoderSeesIt = decodeShare(tokenOf(payload));
  assert.equal(asOldDecoderSeesIt.items.length, 2);
  assert.deepEqual(asOldDecoderSeesIt.items.map(favKey), [
    "d:fixture-venue cheeseburger",
    "d:fixture-venue cheeseburger", // both land on the bare slug — today's behaviour
  ]);
});

test("a shortlist minted before ids existed decodes to exactly what it always did", () => {
  // Hand-built at the old shape — no `k` key anywhere.
  const token = tokenOf({
    v: CODEC_VERSION,
    t: "s",
    l: "Alex",
    g: [{ v: "kk", n: "KK Malaysian", r: 0, s: "Tawa · Malaysian", f: 1, d: ["Mee Goreng"] }],
  });
  assert.deepEqual(decodeShare(token), {
    version: CODEC_VERSION,
    type: "shortlist",
    label: "Alex",
    items: [
      { type: "venue", venueId: "kk", venueName: "KK Malaysian", isRecipe: false, sub: "Tawa · Malaysian" },
      { type: "dish", name: "Mee Goreng", venueId: "kk", venueName: "KK Malaysian", isRecipe: false, sub: "Tawa · Malaysian" },
    ],
  });
});

test("a plain string dish is still accepted, and encodes to the old bytes", () => {
  // groupForShare() hands bare name strings today; the encoder must keep
  // producing byte-identical payloads for them.
  const asStrings = encodeShortlist({ groups: [
    { venueId: "kk", venueName: "KK", isRecipe: false, sub: "", venueFav: false, dishes: ["Roti Canai"] },
  ] });
  const asObjects = encodeShortlist({ groups: [
    { venueId: "kk", venueName: "KK", isRecipe: false, sub: "", venueFav: false, dishes: [{ name: "Roti Canai" }] },
  ] });
  assert.equal(asStrings, asObjects);
  assert.equal(decodeShare(asStrings).items[0].name, "Roti Canai");
});

test("a crafted `k` cannot smuggle anything past the sanitisers", () => {
  const craft = (k) => tokenOf({
    v: CODEC_VERSION, t: "s",
    g: [{ v: "x", n: "X", r: 0, s: "", f: 0, d: ["A", "B"], k }],
  });
  // Not an array, shorter than `d`, over-long, padded, and blank — none of it
  // may throw, and none of it may become an id the name doesn't warrant.
  assert.equal("dishId" in decodeShare(craft("nope")).items[0], false);
  assert.equal("dishId" in decodeShare(craft(["only-one"])).items[1], false);
  assert.equal(decodeShare(craft(["only-one"])).items[0].dishId, "only-one");
  assert.equal(decodeShare(craft(["z".repeat(300)])).items[0].dishId.length, 120);
  assert.equal(decodeShare(craft(["  spaced  "])).items[0].dishId, "spaced");
  assert.equal("dishId" in decodeShare(craft(["   "])).items[0], false);
  assert.equal("dishId" in decodeShare(craft(["a"])).items[0], false); // == slug("A")
  assert.equal("dishId" in decodeShare(craft([{ evil: 1 }])).items[0], false);
});
