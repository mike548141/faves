- [x] **33a — book it: link out, don't build it** `[S][schema]`

🔗 **Shares Theme 31's shape.**

Same finding as Theme 31's ordering apps: the honest mechanism is an ordinary
`https` link the OS may upgrade to the venue's app. NZ venues mostly sit on a
handful of platforms — ResDiary, Now Book It, OpenTable, SevenRooms, First
Table — plus a Facebook page or a phone number for everyone else.

Data: extend the `ordering[]` pattern rather than inventing a parallel one —
`booking: [{ platform, url }]`, or `ordering[]` gaining
`kind: "booking"` alongside Theme 31's `"first-party"`/`"aggregator"`. **Decide
that once, in Theme 31, and let this inherit it.**

⚠️ **Do not verify these links the way we verified the ordering ones and then
forget.** A booking URL that 404s sends someone to a dead end at the moment they
are trying to commit. Worth the association/liveness re-check Theme 31 floated
(31c) more than ordering was.

For venues with no platform, the honest affordance is the phone number we
already have, labelled "Call to book" rather than dressed up as a booking flow.

**Done 2026-10-18 (worker `w/400-010`, ADR 0165).**
Shape: `ordering[]` gains an optional `kind`, and `"booking"` is its only legal
value (Theme 31 proposed `kind` and never built it; the other values wait for
a screen). It renders as "Book a table" on the contact card with the platform
as its value line, never under "Order online"; no "Call to book". Six venues
ship, each read off the venue's own website and fetched once (200):
Dirty Little Secret (SevenRooms), Hei, Dragonfly, Hotel Bristol, Southern
Cross and The Borough Tawa (ResDiary). Provenance rows live in
`data/bookings/<venue>.json`; `validate.py` checks them both ways (12 new
mutation cases). `branch_check.mjs --booking` covers the row.
**Left over, owner or later session:** Charley Noble, Rock Yard and The
Victoria Tavern publish Now Book It links, but that platform's page could
not show any venue on 2026-10-18 and answers 200 to any id, so they are
withheld: re-check when it is up. Pandan's Sipo link is per branch and
`ordering[]` is per venue. Te reo for "Book a table" is not added (the key
falls back to English). A liveness re-check (31c) would cover these links too.

  📌 **Closed 2026-10-18 (faves-b4), PR #126 merged** (ADR 0165,
  SHELL_VERSION 2026-10-18.4): six venues carry a booking link. The withheld
  ones are carried by [`050`](050-33e-booking-links-withheld.md).

