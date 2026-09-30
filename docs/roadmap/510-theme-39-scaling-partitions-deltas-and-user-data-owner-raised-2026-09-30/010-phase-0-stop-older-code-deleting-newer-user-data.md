- [ ] 🔥 **Phase 0 — stop older code deleting newer user data** `[S]
      [sync][data]` — owner-raised 2026-09-30 (session `faves-ad`), revised
      the same day by [ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md) after its cold review. Must land before **any** user
      schema change.

  **The hazard, confirmed at source.** `mergePersonal` outputs only the
  stores it knows, stamped `v: mine?.v ?? theirs?.v`
  (`site/js/sync-merge.js:423`), and `sync.js` checks no version. An old
  device writes the server copy without a store added later. The newer device's
  three-way merge then reads the missing store as a deletion, locally and on
  the server. ADR 0127(b)'s "nothing is destroyed" misses this direction.

  **Build (owner-ruled "Carry unknown data through"):**
  1. Sync carries every store it does not understand through untouched,
     the ADR 0127 pattern. Each known store carries a schema number; sync
     pauses with "Update Faves to keep syncing" only when a **known** store's
     number is newer than this build's.
  2. A backup in an older format upgrades instead of being refused
     (`site/js/personal-data.js:539`). Flip the test at
     `tests/personal-data.test.js:327` in the same commit. Until a v2 exists
     the chain is the identity; keep a v1 fixture forever.
  3. The sync base snapshot (`faves.sync.base.v1`) runs through the same
     chain.
  4. Call `navigator.storage.persist()` once, after the first personal write.
     About says whether it was granted, and that a Safari browser tab can still
     be cleared unless Faves is on the Home Screen.

  **Test:** a server copy one version ahead carrying an unknown store; after
  an old device syncs, the store is still on the server **and** on the newer
  device.
