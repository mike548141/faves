- [x] ✅ **Derivation is venue-level, but provenance is now per-branch** —
  **DONE 2026-08-16** (`434f6b1`,
  [ADR 0063](../../decisions/0063-details-provenance-belongs-to-a-branch.md)).
  Branch-wins, venue as the default — the `timezone` precedent, not the
  address/phone/hours one. The pair moves **whole**: a branch's date welded to
  the chain's method would describe a reading nobody performed. Pandan migrated
  (Melling `official-site`, Press Hall `third-party`); its ⓘ now names the
  branch. `test_validate` 79 → 83 mutations, each new one proved to catch a
  hole. **Per-kind ageing deliberately not built** — the shape is ruled, the
  numbers still cannot come from a corpus whose every date sits in one 48-hour
  window. This unblocks the McDonald's/Subway third-party hours capture.
  Original text:
  `[S][schema]` — Pandan proves the gap: address and phone first-party from the
  venue's own site, one branch's hours third-party from its landlord, and one
  `detailsVerifiedBy` to describe both. The honest read (weakest wins) throws
  away true information about the stronger facts. A per-branch
  `detailsVerified`/`detailsVerifiedBy` would fix it; deferred because one record
  is not an evidence base for a schema change, which is the same restraint
  ADR 0037 applied to ageing the field.
