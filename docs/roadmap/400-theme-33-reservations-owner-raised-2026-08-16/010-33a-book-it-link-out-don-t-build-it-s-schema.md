- [ ] **33a — book it: link out, don't build it** `[S][schema]`

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
