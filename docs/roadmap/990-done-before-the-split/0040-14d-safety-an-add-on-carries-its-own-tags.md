- [x] ✅ **14d — Safety: an add-on carries its own tags** — **shipped
  2026-08-16 with 14a**, as this item insisted. Composition rule: **allergens
  union, dietary claims intersect**. 🔎 The intersection half is the finding —
  a contradiction-only rule (drop `vg` only when an option states a clashing
  allergen) handles satay perfectly and **misses grilled chicken entirely**,
  because meat carries no `contains-*` at all, leaving a vegan dish plus
  chicken still reading vegan. The satay example alone could never have taught
  that. `tools/addon_check.mjs` asserts the whole path in a real browser.
  Original note: **the
  load-bearing point.** Adding halloumi to a dairy-free dish makes it not
  dairy-free; a satay add-on makes a dish contain peanuts. So `dietary.js`'s
  `dishFlagged` / `dishSatisfiesDiet` must evaluate **dish + selected add-ons**,
  not the dish alone, and the order line must show the resulting warning — a
  dish that was safe when you tapped it can stop being safe when you configure
  it. This is not optional polish on 14a; it ships with it.
