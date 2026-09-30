- [ ] **Phase 3 — the upgrade chain, on local storage** `[M] [data][privacy]`
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
