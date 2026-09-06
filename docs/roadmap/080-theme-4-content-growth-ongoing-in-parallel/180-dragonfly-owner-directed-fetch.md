- [x] 🎯 **Dragonfly, Courtenay Place — owner-directed online fetch**
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

  ✅ **DELIVERED 2026-09-07 (`093f7d7`).** `stub` → `menu-complete`: 24 dishes
  in four sections, phone, website, per-day hours, `priceBand` `$$$`, vibe, the
  takeaway ordering link, and the fallback `<li>` promoted from an unlinked
  "Menu coming soon" card to a real link (40 linked / 17 stub, was 39 / 18).

  🛑 **TWO THINGS THE WORK FOUND THAT ARE BIGGER THAN THE VENUE.**
  1. **The allergen tagger flags `water chestnut` as a tree nut.** Both a
     dumpling and a side of greens here name it, and `validate.py` demanded
     `contains-nuts` on a **vegan side dish**. Water chestnut is *Eleocharis
     dulcis*, an aquatic sedge tuber, botanically unrelated to *Castanea* and
     safe for a tree-nut allergy — the same call the rule's own comment already
     makes for coconut. Fixed with a **fixed-width negative lookbehind**, not
     an `exclude`: `exclude` vetoes the whole rule for the item, so
     *"water chestnuts and toasted almonds"* would have **lost the almonds** —
     trading an over-warning for a MISS, the one direction this tool must never
     move. New test case plus a breaker that removes the lookbehind and proves
     the case notices; suite 18 → 20.
     🔑 An over-warning is not harmless here: firing a nut warning on a vegan
     side is exactly how a reader learns to discount the warnings that matter,
     which is the finding 14h shipped the same day.
  2. **The schema cannot express a past-midnight close** — filed as
     [`190/010`](../190-theme-13-what-the-time-dimension-unlocks-owner/010-hours-cannot-express-a-past-midnight-close.md).
     This venue is the corpus's **first** with one, and the record knowingly
     understates Fri–Sat.

  ✅ **Two allergen findings from the tagger were accepted, not argued away.**
  `Massaman Potatoes` → `contains-peanuts` (DERIVED: massaman is a peanut
  curry; the venue prints no peanut, and this is precisely the gap a diner
  cannot see) and `Coconut Gelato` → `contains-nuts`. The gelato's is a
  **deliberate over-warning**: its "black sesame praline" names its own
  inclusion, but praline is a technique that is usually nut-based, and unlike
  water chestnut that is genuinely ambiguous. **Certain → exclude; ambiguous →
  warn** is the line drawn, and it is the line worth reusing.

  🛑 **A SAFETY GAP THIS VENUE MAKES CONCRETE AND CANNOT FIX: there is no
  `contains-fish` tag.** `Seared Sesame Tuna`, `Salmon Two Ways` and the
  squid's neighbours cannot declare fish, because the vocabulary has no such
  tag and `has-fish` is **option-only** (an error on a dish, ADR 0092). Adding
  it is already ruled — Theme 5 `010`, *"RULED 2026-08-16 — ADD contains-fish,
  and land it WITH 37n"* — and still open. Until it lands, three fish dishes on
  this menu are silent about fish.

  📋 **Ownership deliberately NOT recorded.** The About page names the two
  people who own the venue, and ADR 0046 would permit it. `data/ownership.json`
  is empty, no Faves screen reads it, and the owner's own design rule is *don't
  write an identifier into the repo the product doesn't need*. Permissible is
  not the same as needed, and this is a public repo.

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
