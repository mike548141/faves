- [ ] 🎯 **A size ladder's default is the menu's — and when the menu names none?**
  `[S][data][schema]` — **owner-ruled 2026-10-03**, raised on Spices Indian's
  Garlic Tikka (Half $12 / Full $20, Full pre-selected and the row priced $20):

  > *"When you have different portion sizes like the "Garlic Tikka" the menu
  > must either, (a) my preference is use the size specified as the default by
  > the menu assuming the restaurant has specified such things. It is ok to
  > infere the default from the wording used on the menu or title of an
  > option/addon, for example a coffee size named "regular" is fine to assume as
  > the default option. (b) not have a default so the user is required to pick
  > one when they add the dish to their order, or (c) if the dish does have a
  > default it must select the cheaper size and the dish price should default to
  > that cheaper price. Besides portion sizes there may be other addons that
  > need the same cpaability as this for similar reasons perhaps a coffee order
  > with a mandatory drink here vs takeaway option."*

  **What exists (ADR 0130).** A `selects` group must have **exactly one**
  `default`, and `validate.py` holds the dish's `price` equal to that default's
  `dishPrice`. There is no rule about *which* option is the default.

  **Measured 2026-10-03:** there are 57 `selects` groups. In 54 the default is
  already the cheapest option. In 3 it is not, all of them at Spices Indian
  (Seekh Kabab, Garlic Tikka, Tandoori Chicken; `d75ee464`). The source text
  was *"Half $12.00 / full $20.00."* and the record's headline price was the
  full one, so the conversion made Full the default. ⚠️ Not checked: whether
  the printed menu shows Full as its headline price, which would make this
  case (a). That reading is the owner's call.

  🎯 **Open: when the menu names no default, is it (b) or (c)?** He prefers
  (a) and listed (b) and (c) as the other admissible outcomes without picking
  between them.
  - **(c) default to the cheapest.** Needs no schema change, so the
    exactly-one-default rule and the single headline price both stay. A
    validator rule can require *default = cheapest unless the menu names one*.
    That needs somewhere to record "the menu names it", which is a design point
    for whoever builds it.
  - **(b) no default.** ADR 0130's exactly-one rule would have to be
    superseded. Every reader of a dish's `price` (`price.js` bands, the
    summary, the search index, order totals) would also have to cope with a
    dish that has no single price, and Add would have to wait the way a
    `required` group's Add waits (ADR 0156).
  - The coffee case ("drink here vs takeaway") is a pick-one `adds` group, and
    `required: true` (ADR 0156) already expresses it. What it may lack is a
    default ("regular"). That is the same question as this item, asked of an
    `adds` group instead of a `selects` group.

  Lands in: an ADR (amending 0130's default rule), `ARCHITECTURE.md`'s
  `selects` paragraph, `validate.py`, the 3 Spices Indian records if the ruling
  moves them, and `28r`'s intake rule, so new ladders are written to it.
