- [x] 🔥 **Phase 0 — stop older code deleting newer user data** `[S]
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

  📌 **Claimed 2026-09-30 (`faves-0b`)** — built in a worktree, then `070` by the
  same worker.

  ✅ **Shipped 2026-09-30 (`faves-0b` worker, branch
  `510-010-sync-carry-through`).** All four steps.
  1. `carryUnknown` (`sync-merge.js`) carries every profile and snapshot field
     this build does not know; absence is "no opinion", never a deletion. The
     copy is stamped with the higher `v`. `STORE_SCHEMA` (`personal-data.js`)
     numbers each store; `storesAhead` pauses sync with "Update Faves to keep
     syncing" only for a known store numbered newer. An import refuses the
     same case.
  2. `upgradePersonalData` + `UPGRADE_STEPS` (empty: the identity). The test
     flipped; `tests/fixtures/personal-data-v1.json` is the keep-forever
     fixture. A test fails if the version rises without its step.
  3. `sync.js` `upgradeSnapshot` runs the base and the server copy through the
     same chain; the chain carries fields it does not know.
  4. `storage-persist.js` asks once per page load, after the first change to
     favourites, ratings, notes, settings or the order. About's "Private by
     design" group says whether it was granted, plus the Safari caveat off
     the Home Screen. `boot_check` asserts it (30 passed).

  **The named test** is in `tests/sync.test.js` ("a server copy one version
  ahead…"). The newer device is modelled (this build plus a three-way merge of
  its `recipes` store), because a browser check runs one build. Break-probed:
  with `sync-merge.js` reverted to `main` the test fails on the server copy.
  With the server assertions removed, it fails "the newer device read the
  recipe as deleted".

  **Where the code differed from this item:** `sync-merge.js:423` was the
  `v` stamp, as cited. The base had no parse step to upgrade, so it now has
  one. `personal-data.js:539` and the test at `:327` were as cited. "Call
  once" is built as once per page load, not once ever: remembering it would
  need a new `faves.` key, and the backup's `EXCLUDED` table would have to
  list it. Firefox may therefore ask again on a later visit if the prompt was
  dismissed rather than answered.

  **Four costs, before → after:**
  - *Processing:* one extra pass over each profile's and the copy's unknown
    keys per merge, plus a six-entry version check. Negligible next to the
    AES-GCM seal. `persist()` is one async call per page load, after a write.
  - *Storage:* `stores` adds 85 bytes of JSON to the base, the backup and the
    server copy. An old device's base now also holds the newer stores it
    carries. That is the price of not deleting them.
  - *Network:* the copy grows by the same 85 bytes before encryption. There
    are no extra requests. A paused device makes one GET per foreground and
    no PUT.
  - *Server:* reads and writes are unchanged. A paused device writes nothing,
    where before it would have written a damaging copy.
