// Unit tests for the group-ordering URL codec (site/js/share-codec.js).
// Pure — no DOM, no network. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeShare,
  decodeShare,
  buildShareUrl,
  readShareToken,
  CODEC_VERSION,
} from "../site/js/share-codec.js";

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
  const decoded = decodeShare(encodeShare({ groups, label: "Ruth" }));
  assert.equal(decoded.label, "Ruth");
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

test("supports the shortlist payload type", () => {
  const decoded = decodeShare(encodeShare({ type: "shortlist", groups }));
  assert.equal(decoded.type, "shortlist");
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
  const token = encodeShare({ groups, label: "Booth" });
  const url = buildShareUrl(token, "https://faves.example/");
  const back = decodeShare(readShareToken(url));
  assert.equal(back.label, "Booth");
  assert.equal(back.items.length, 3);
});
