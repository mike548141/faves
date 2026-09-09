- [ ] 🎯 **Which of the remaining 47 venues deliver?**
      `[S][data][owner-input]` — opened 2026-09-09 by the Delivery filter
      ([ADR 0117](../../decisions/0117-a-door-is-declared-never-derived.md)),
      which shipped the option the owner asked for and can only answer for the
      venues the corpus can evidence.

      **Where it stands: 10 of 57 venues declare the door.** Each was read once
      from an `ordering` link in its own record naming a courier — Uber Eats,
      DoorDash, Delivereasy, Easy Eats, or Pizza Hut's own delivery page.

      🛑 **The other 47 are SILENCE, not a no.** The filter treats them as
      not-delivering because that is the only safe reading, and being told a
      place delivers when it does not is the expensive direction to be wrong —
      a reader rings a shop and is told no. But silence is what the record
      holds, so nothing here is a finding about those venues.

      They split into two groups that want different answers:

      **1. Nine venues whose ordering link is ambiguous** — `crepes-a-go-go` ·
      `dragonfly` · `gong-cha` · `pandan-asian-cuisine` · `rock-yard-restaurant`
      · `rs-satay-noodle-house` · `satay-kingdom-cafe` · `sushi-bi` ·
      `the-catch-sushi-bar`. Every one says *"Order on our site"*, *"Order
      direct"* or the shop's own storefront name, and **nothing in the record
      says whether that order arrives at your door or waits on the counter.**
      These are the cheap ones: each is one page-load to settle, and the page is
      already linked from the record. `rock-yard-restaurant`'s URL ends
      `/order-pickup`, which is suggestive and is **not** on its own proof that
      the venue never delivers — a shop can take pickup orders online and
      deliveries by phone.

      **2. Thirty-eight venues with no ordering link at all.** No evidence
      either way. Several are obvious noes by kind — a brewery taproom, the
      Sprig + Fern chain — and several are likely yeses that simply have never
      been recorded.

      🎯 **THE OWNER CALL, and it is why this is not just a fetch item.** Menu
      content here is owner-supplied or owner-directed and never harvested on a
      hunch (CLAUDE.md). Reading nine links already in the record is arguably
      inside that, since we put them there. Going out and establishing 38
      venues' delivery arrangements is **not**, and it is not this item's to
      start. Three shapes he could pick:
      - **direct the nine** — settle the ambiguous links only, no new fetching;
      - **direct a sweep** — name the venues, or say "all of them", and it
        becomes an ordinary content-growth fetch;
      - **leave it** — the filter answers for 10 places and grows as venues
        arrive, which is honest and is the resting state.

      ⚠️ **Do not "fix" this by deriving the answer.** ADR 0117 §2 rejects
      deriving delivery from a dish's `prices.delivery` and from the raw
      `ordering` list, and the second is the one that will look tempting to a
      session reading this item: `ordering` is right there and it is already
      structured. It mixes couriers with pickup links, which is the whole reason
      group 1 exists.
