# 0165 — A booking link is an `ordering[]` entry with a `kind`, and the venue published it

**Status:** accepted
**Date:** 2026-10-18
**Implements** roadmap `33a` (Theme 33, "book it: link out, don't build it").
**Inherits** the shape Theme 31 proposed for `ordering[]` and never built
(`kind`); **builds on** [0047](0047-the-app-ships-only-what-it-renders.md) (a
field ships only if a screen renders it) and
[0096](0096-a-tag-with-no-reader-facing-branch-is-not-a-chip.md) (a value with no
reader-facing branch is not admitted). Leaves 33b–33d (a reservation note, a
personal record, an integration) untouched: they are owner-gated.

## Context

33a said to extend the `ordering[]` pattern, either as `booking: [{platform,
url}]` or as `ordering[]` gaining `kind: "booking"`, and to *"decide that once,
in Theme 31, and let this inherit it."* Read 2026-10-18: Theme 31's README
proposes **one optional `kind` on `ordering[]` entries** (`"first-party"`,
`"aggregator"`, `"app-store"`) and its 31a was never built. No venue carries a
`kind` and neither `validate.py` nor `menu.js` knows the word. So the shape is
decided in Theme 31 in the only sense it can be (one optional field on the
existing entry), and what was missing was a first value.

## Decision

**1. `ordering[]` entries gain an optional `kind`; the only legal value today
is `"booking"`.** An entry without `kind` is an order link, exactly as before
(58 venues untouched). Theme 31's three proposed values stay out of the
validator until a screen reads them (0096's test) — that is 31a's to add, and it
will find the field already there. No parallel `booking[]` array: two lists of
`{platform, url}` would need two validators, two renderers and two answers to
"which list does a new platform go in".

**2. It renders on the contact card, not under "Order online".** A "Book a
table" row, label fixed, with the platform name as its value line ("ResDiary").
An ordinary `https` link in a new window, with the same hidden
"(opens in a new window)" every off-site link here carries (31d). Never an
in-app flow, never "Open in app" (Theme 31: we cannot know whether an app is
installed). `orderCard` skips booking entries, because booking a table is not
ordering food and the heading would lie.

**3. No "Call to book".** The existing row already says "Call to order" and
that is all it claims. A label saying a venue *takes bookings by phone* is a
claim needing a source this repo does not hold for any venue; the item's
suggestion is not taken up until a venue's own site is the source.

**4. A booking link is only shipped if the venue published it itself, and it
answered 200.** A dead link is worst at the moment someone is trying to commit.
Each link has a row in `data/bookings/<venue>.json` (repo-only, never served,
0047): the venue's own page it was read from, a hash of that page as fetched, the
link's HTTP status and final URL, and what a headless render showed.
`validate.py` enforces it both ways — `kind: "booking"` without a row, a row
without a link, a status other than 200, an `https` violation, or a source page
whose host is not the venue's own `website` host are errors. An aggregator
listing or a search result cannot be a source, by construction.

**5. Cosmetic tails are normalised and nothing else.** Two venues publish the
address with a bare trailing `?`, one with `Https://` and a trailing space; those
were trimmed. No query parameter was dropped, no platform address was composed.

## Measured 2026-10-18: six links shipped, and why not more

Of the 46 venues with a website, 6 publish a booking link a reader can use:
Dirty Little Secret (SevenRooms), Hei, Dragonfly, Hotel Bristol, Southern Cross
and The Borough Tawa (ResDiary). ResDiary answers `500` for a venue that does
not exist, so its `200`s mean something; SevenRooms redirects to its own app
page; each was also rendered in headless Chrome and showed the right venue.

**Withheld, and reported rather than guessed:**

- **Charley Noble, Rock Yard and The Victoria Tavern (Now Book It).** The
  platform answers `200` for *any* address (a shell page of identical size for a
  made-up account id), and rendered in a browser it says *"We couldn't load the
  venue right now"* — for these three venues' own published links and for a
  nonsense id alike. Its production config appears to lack the API address its
  script falls back from, so today the page cannot show a venue at all. A status
  code cannot tell a live Now Book It link from a dead one, so none ships. Worth
  a second look when the platform is up: all three venues publish the links.
- **Pandan Asian Cuisine.** Its booking link (Sipo) is per branch, and the
  record's `ordering[]` is per venue. A venue-level "Book a table" would book
  Melling only.
- **Regal, Bambina, Baylands, Garage Project, 1841, Khandallah Trading Company,
  Noodle Canteen.** Regal's reservation form is a Wix widget in which no
  booking address was found; Bambina's page embeds a ResDiary venue named
  "TheAtlas" that is not demonstrably Bambina; Baylands' taproom page sits
  behind an age gate and Noodle Canteen's site did not answer a scripted
  fetch; Garage Project's form is private-hire enquiry; 1841 offers only a
  phone number; Khandallah Trading Company's own page redirects to a "looking
  for" stub.

## Rejected

- **A `booking: [{platform, url}]` field.** Rejected in §1: a second parallel
  structure for the same shape.
- **Composing a platform URL from a venue's slug**, or taking one from a
  platform's listing. It is what 33a warned about; the six that ship are
  copied from the venue's own page.
- **Shipping Now Book It links on the strength of a `200`.** See above: a check
  that cannot fail is decoration (0072).
- **Showing the link to venues without one, as a "Book" that falls back to
  the phone.** A label that claims more than the data holds (§3).

## Consequences

- `data/bookings/` joins the repo-only store (`data/README.md`).
- Adding a platform needs no code: `platform` is free text, `kind` is the switch.
- Booking links rot like order links do. 31c's liveness re-check would cover them;
  until it exists, the row's `fetched` date is how a later session sees how old
  the claim is.
- `tools/branch_check.mjs --booking` asserts the row exists on every venue that
  carries a link (read from the corpus, refusing to run empty), on a multi-branch
  card (an injected fixture), never under "Order online", and nowhere for venues
  without one.
