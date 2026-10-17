- [ ] ⏳ **33e — booking links withheld at 33a, and why** `[S][data]` —
      filed 2026-10-18 by `faves-b4` from 33a's hand-back (ADR 0165 lists
      each venue and its reason).
  - **Now Book It is not loading** (Charley Noble, Rock Yard, The Victoria
    Tavern). Each venue publishes a link, but on 2026-10-18 the platform
    answered 200 to every account id, including a made-up one, and every page
    said *"We couldn't load the venue right now"*. A status code cannot tell a
    live link from a dead one there, so none shipped. ⏳ Re-check in a browser;
    ship each one that shows its own venue.
  - **Pandan's Sipo link is per branch**, and `ordering[]` is per venue, so a
    venue-level "Book a table" would book Melling only. Needs a per-branch
    home for links, which is a schema question, not a data one.
  - A scheduled liveness re-check (Theme 31's 31c, unbuilt) would cover all
    booking links; a dead booking link fails someone at the moment they commit.
