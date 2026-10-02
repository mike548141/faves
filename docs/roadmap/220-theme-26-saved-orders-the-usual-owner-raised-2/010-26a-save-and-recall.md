- [x] **26a — Save and recall** `[M]` — name an order, list saved orders per
  venue, recall into the tally, delete. Local-first like every other personal
  store (`store.js`), so it works offline and never leaves the device.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Closed 2026-10-02 (`faves-4f`, PR #89, ADR 0154).** "Save this order"
  in the order sheet (name pre-filled "My <venue>"; the same name updates),
  and "Your saved orders" on the menu page with "Add to my order" and a
  two-tap Delete. Per person, on the device (`faves.savedorders.v1`), never
  synced; included in a backup file. Stored by dish and option ids, with a
  name and price snapshot recall never trusts: recall re-prices from today's
  menu, and a line whose dish, option or cap no longer resolves is skipped
  and named. Every store table walked (sync collect, older builds' apply, the
  backup `other` bag, Replace, profile purge, precache). 29 unit tests, 11
  unit and 9 browser break-probes; `addon_check` 108.
  🎯 **Forks recorded for the owner, each built as recommended:** recall
  ADDS to the tally rather than replacing it; per person, not per device;
  save lives in the order sheet, recall on the menu page.

  ✅ **Owner ruled 2026-10-02: keep as built** (recall adds; per person;
  save in the sheet, recall on the menu page).
