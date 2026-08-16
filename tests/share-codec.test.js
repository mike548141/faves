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
  encodeTransfer,
  decodeTransfer,
  buildTransferUrl,
  readTransferToken,
  CODEC_VERSION,
} from "../site/js/share-codec.js";
import { mergeItems } from "../site/js/cart.js";
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

test("a transfer carries dish ids too — the same packer, so they cannot drift", () => {
  const out = decodeTransfer(encodeTransfer({
    profile: { id: "p1", name: "Me" },
    groups: goldCardShortlist,
  }));
  assert.deepEqual(out.favourites.map(favKey), [
    "d:fixture-venue cheeseburger",
    "d:fixture-venue cheeseburger-gold-card",
  ]);
});

// --- personal transfer (Theme 9 v1, ADR 0030) -----------------------------
// One person's own hearts + ratings + settings, handed to their second device.
// It rides the same base64url wire under its own tag and its own fragment
// parameter — the two must never be readable as each other.

const xferGroups = [
  {
    venueId: "kk",
    venueName: "KK Malaysian",
    isRecipe: false,
    sub: "Newtown · Malaysian",
    venueFav: true,
    dishes: ["Roti Canai"],
  },
  {
    venueId: "cook-at-home",
    venueName: "Cook at Home",
    isRecipe: true,
    sub: "",
    venueFav: false,
    dishes: ["Booth’s Ginger Crunch"],
  },
];

const xferPayload = {
  profile: { id: "p2abc", name: "Michael" },
  groups: xferGroups,
  ratings: { "v:kk": 5, "d:kk Roti Canai": 4 },
  settings: { farKm: 15, lang: "mi", diet: { dietary: ["gf"], avoid: ["contains-nuts"] } },
};

test("a transfer round-trips hearts, ratings, settings and who it came from", () => {
  const out = decodeTransfer(encodeTransfer(xferPayload));
  assert.deepEqual(out.profile, { id: "p2abc", name: "Michael" });
  assert.deepEqual(
    out.favourites.map((f) => `${f.type}:${f.name ?? f.venueId}`),
    ["venue:kk", "dish:Roti Canai", "dish:Booth’s Ginger Crunch"]
  );
  // The recipe flag survives, so a received recipe heart deep-links correctly.
  assert.equal(out.favourites[2].isRecipe, true);
  // The dish half of every rating key lands in id form (ADR 0051), whatever
  // form the sending device wrote it in.
  assert.deepEqual(out.ratings, { "v:kk": 5, "d:kk roti-canai": 4 });
  assert.deepEqual(out.settings, xferPayload.settings);
});

test("macrons survive the wire", () => {
  const out = decodeTransfer(
    encodeTransfer({ ...xferPayload, profile: { id: "p1", name: "Māui" } })
  );
  assert.equal(out.profile.name, "Māui");
});

test("a transfer token is not a share token, and vice versa", () => {
  assert.equal(decodeShare(encodeTransfer(xferPayload)), null);
  assert.equal(decodeTransfer(encodeShortlist({ groups: shortlistGroups })), null);
});

test("rubbish and empty transfers fail soft to null", () => {
  for (const bad of [null, "", "!!!!", "e30", btoa("{}"), undefined]) {
    assert.equal(decodeTransfer(bad), null);
  }
  // Nothing worth applying is a dud, not an empty success.
  assert.equal(decodeTransfer(encodeTransfer({ profile: { id: "p", name: "Nobody" } })), null);
});

test("a crafted transfer can't smuggle a bad rating or a giant string through", () => {
  const token = encodeTransfer({
    ...xferPayload,
    ratings: { "v:kk": 99, "d:kk x": 0, "d:kk y": "abc", ["z".repeat(300)]: 3 },
  });
  const out = decodeTransfer(token);
  assert.equal(out.ratings["v:kk"], 5); // clamped to the 1–5 scale
  assert.equal("d:kk x" in out.ratings, false);
  assert.equal("d:kk y" in out.ratings, false);
  assert.equal(Object.keys(out.ratings).find((k) => k.startsWith("z")).length, 120);
});

test("settings that aren't an object are dropped rather than trusted", () => {
  const out = decodeTransfer(encodeTransfer({ ...xferPayload, settings: ["nope"] }));
  assert.equal(out.settings, null);
});

test("transfer has its own fragment parameter, so the order receiver never sees it", () => {
  const url = buildTransferUrl("TOKEN", "https://faves.example.nz/index.html#old");
  assert.equal(url, "https://faves.example.nz/index.html#xfer=TOKEN");
  assert.equal(readTransferToken(url), "TOKEN");
  assert.equal(readShareToken(url), null);
  assert.equal(readTransferToken(buildShareUrl("TOKEN", "https://faves.example.nz/")), null);
});
