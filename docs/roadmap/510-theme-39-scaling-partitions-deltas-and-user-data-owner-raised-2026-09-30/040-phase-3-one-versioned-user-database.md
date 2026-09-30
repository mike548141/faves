- [x] **Phase 3 — the upgrade chain, on local storage** `[M] [data][privacy]`
      — owner-raised 2026-09-30. Re-briefed the same day ([ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md)): personal recipes
      fit in local storage (about 1,650 B each), so the owner ruled **"Defer
      the move"**. The IndexedDB move is `080`.

  **Build:**
  - One `userSchema` number (it replaces `FORMAT_VERSION`), carried by every
    store, backup, sync copy and sync base.
  - An upgrade chain that runs at startup, before any store is read.
  - A snapshot of the pre-upgrade data, kept until the new version has run
    successfully.
  - A sample data set for every past version under `tests/fixtures/`, never
    deleted, upgraded to current in CI.
  - A test listing every module that writes user storage, failing when a new
    one appears. An app update may change user data only through the chain and
    the named import modes.

  🚩 Settings hold allergen flags. Break-probe: drop a store from an upgrade and
  the tests must fail.

  📌 **Claimed 2026-09-30 (`faves-0b`)** — built in a worktree. `010`
  shipped per-store numbers (`STORE_SCHEMA`) beside the top-level `v`. ADR
  0146 asks for both: one `userSchema` number drives the chain (§1), and
  each store's own number decides a pause (§3). So both stay, and this item
  states the rule that ties them together: a `userSchema` step that changes
  a store's shape also bumps that store's number.

  ✅ **Shipped 2026-09-30 (`faves-0b` worker, branch `510-040-upgrade-chain`).**

  1. **One number.** `USER_SCHEMA` (`site/js/user-schema.js`) replaces
     `FORMAT_VERSION`. This device's storage records it in `faves.schema.v1`;
     a backup, the sync copy and the sync base carry it as `v` (the field
     keeps its name: every build that ever shipped reads `v`). "Carried by
     every store" is built as "by every COPY of the layer" — the per-store
     number is `STORE_SCHEMA`, as the claim note says.
  2. **The chain runs first.** `upgrade-start.js` is the first import of all
     four entry modules (`app.js`, `menu.js`, `recipe.js`, `sw-register.js`;
     three pages, no inline scripts, no workers touch local storage). Its
     whole import graph is itself, `user-schema.js` and `store.js`, so no
     store module is evaluated before it. `listStoredKeys` moved to
     `store.js` for that reason. A test holds both halves; `boot_check` now
     asserts every screen re-stamps the number itself (35 passed).
  3. **The snapshot.** Every `faves.` key is copied to
     `faves.upgrade.snapshot.v1` before anything is written; the steps run on
     an in-memory copy, and a failed write puts back every key it touched.
     "Run successfully" is concrete: the entry module was evaluated (every
     store read the upgraded data without throwing) AND the page's first
     render finished (`markUpgradeRan`). The snapshot is then deleted on the
     NEXT load. No room for the snapshot means no upgrade.
  4. **Fixtures.** `tests/fixtures/personal-data-v1.json` (a backup) and
     `user-storage-v1.json` (a device's raw storage) — one pair required for
     every version up to `USER_SCHEMA` — upgrade to current in CI with
     nothing lost, allergen lists named.
  5. **Writers.** `tests/storage-writers.test.js` names the 15 modules whose
     code can write browser storage, and fails on a new one or a stale one.
  6. **The tie.** Each step declares `reshapes: { store: n }`; a test fails
     if `STORE_SCHEMA` has not reached `n`.

  🚩 **Break-probe (allergen flags).** The chain is the identity today, so the
  harness is proved with a synthetic schema-2 step injected into both halves:
  a faithful step passes; four damaging ones fail naming their victim — drop
  the settings store, empty its `avoid` list, drop the order, drop the second
  person. Eight more probes on the real code were each caught by one test
  (no rollback, snapshot marked ok early, a new writer, the upgrade imported
  second, `user-schema.js` importing `personal-data.js`, the schema key not
  spared by a replace, and 090's two).

  **Where the code differed from this item:** `profiles.js` `migrate()` still
  copies pre-profile keys forward at load, outside the chain. It predates the
  chain (schema "0"), is idempotent, and is named in the writers list rather
  than moved. Read-time key migrations (`renames.js`, `migrateDishKeys`) also
  stay: they rewrite nothing until the person next writes that store.

  **The 080 threshold:** 1,000,000 UTF-16 code units of `faves.` storage. The
  reasoning is in `080`'s file.

  **Four costs, before → after** (measured in Node on a fake storage, a heavy
  device: 3 people × 200 hearts, 300 ratings, 50 notes, sync on, 287 k units):
  - *Processing:* every load reads one key (0.3 µs here; was nothing). A load
    that upgrades lists every key and copies them: 1.2 ms for the heavy
    device, once per schema change. `markUpgradeRan` reads one absent key.
  - *Storage:* +16 bytes (`faves.schema.v1`). During an upgrade, +1 copy of
    everything (317 k units for the heavy device, 2.1× in total) until the
    load after the first successful render.
  - *Network:* none. Two new shell files (≈ 16 KB raw) precached once.
  - *Server:* none. The sync copy's `v` was already there.
