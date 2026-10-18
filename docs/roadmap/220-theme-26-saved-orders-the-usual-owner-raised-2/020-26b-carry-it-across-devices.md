- [ ] **26b — Carry it across devices** `[S]` — falls out of Theme 12's personal
  transfer/sync for free if the store is shaped like the others; check that
  before designing anything bespoke.

  🔎 **Checked 2026-10-17 (faves-b4): it does NOT fall out for free, and
  that was decided on purpose.** ADR 0154 §3 keeps saved orders outside
  `SCOPED_BASE_KEYS` and out of the sync snapshot, because 26a's brief was
  *"never leaves the device"*; it rejects "put it in `SCOPED_BASE_KEYS` now"
  by name and says *"26b is the item that decides"*. Measured in the tree:
  `site/js/sync.js` `writeSnapshot` writes exactly four keys (favourites,
  ratings, notes, settings); the backup file already carries saved orders
  (ADR 0154 §4), so moving them between devices by export and import works
  today.
  🎯 **So 26b is the owner's call, not a build:** should a usual travel with
  you through sync (it is per person, so it would reach only your own
  devices), or stay on the phone it was made on? If yes, the work is one
  ADR superseding 0154 §3, the store added to the snapshot with a schema
  bump so an older build pauses rather than erasing it (the
  whitelist-sheds-a-field lesson), and `sync_check` assertions.

  ✅ **Owner ruled 2026-10-18 (asked by faves-b4): YES, SYNC IT.** Build:
  an ADR superseding ADR 0154 §3, the store added to the snapshot with a
  schema bump so an older build pauses rather than erasing it, and
  `sync_check` assertions. Per person, so it reaches only his own devices.
