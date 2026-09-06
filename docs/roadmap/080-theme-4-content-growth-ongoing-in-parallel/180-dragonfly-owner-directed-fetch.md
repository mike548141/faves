- [~] 🎯 **Dragonfly, Courtenay Place — owner-directed online fetch**
      `[S][content]` — 🔒 **CLAIMED 2026-09-07 (session faves-24).**
      Owner, this session: *"Add Dragonfly restaurant in courtney place,
      Wellington to the list of restaurants. Gather all the info you can
      online."* That is the direction the menu-content rule requires — content
      is owner-supplied **or owner-directed**, and this is the second.

  🔎 **It was already in the corpus as a `stub`**, added 2026-08-16 with a name,
  address, coordinates and nothing else — no phone, no website, no hours, no
  menu. So this is a flesh-out, not a new venue, and the owner's framing ("add
  it to the list") is right about the *substance* and not about the mechanics.

  🛑 **AND IT REFUTES `150-venues-still-stub.md` ON THIS RECORD.** That item
  states, measured 2026-08-17: *"18 stubs remain and NOT ONE is fetchable …
  the four that publish a website (`babaili-malatang`, `caffiend`,
  `kaffee-eis`, `new-chapter-cafe`) publish no menu *on* it, and the other
  fourteen publish nothing at all."* Dragonfly is in that "other fourteen".
  **It publishes a website AND a full priced menu on it** —
  `dragon-fly.co.nz/menu` carries 24 dishes across four sections with prices
  and dietary markers, plus `/beverage` and `/takeaway` pages. Verified by
  fetching the pages, not by a search-result snippet.
  🔑 **What that means for `150`, stated carefully:** one refuted record does
  not refute the count. It refutes the *method's completeness*, which is the
  more useful finding — whatever sweep produced "publishes nothing at all"
  missed a venue whose menu is two clicks from its homepage. **The other
  thirteen have not been re-checked**, so nobody should now assume they are
  fetchable either. Re-running that sweep is its own job; see `190`.

  📋 **What the fetch actually yielded, and what it did not.**
  - ✅ **Food menu — complete**, 24 dishes, four sections, every price and the
    venue's own dietary markers (`GF`, `G+` = can be gluten free, `V`, `V+` =
    vegan). Transcribed from `dragon-fly.co.nz/menu`.
  - ✅ Phone, email, address and per-day hours, all from the venue's own site.
    🔑 **The values live in `site/data/restaurants/dragonfly.json` and are
    deliberately NOT repeated here.** `.leakscanignore` allows venue contact
    detail in the data paths and *"never docs"* — and it blocked this file until
    the number came out, which is the guard working exactly as written.
  - ❌ **Beverage menu NOT captured.** `/beverage` publishes prose and two
    weekly specials, not a priced list. Nothing invented.
  - ❌ **Takeaway menu NOT captured.** `/takeaway` links to a `mobi2go`
    ordering platform that renders client-side; the page itself carries no
    dishes. The *ordering link* is recorded; the menu behind it is not.
    🔑 This is the KK/R & S finding again — a platform menu is a **subset**,
    not a markup — so it would need its own reading even if it were fetchable.
