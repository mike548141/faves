- [ ] **Phase 3 — one versioned user database** `[L] [data][privacy]` —
      owner-raised 2026-09-30, owner-ruled the same day: *"Move everything"*
      into IndexedDB. [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).

  **Build:**
  - One IndexedDB database named `faves-user`, with object stores `meta`,
    `profiles`, `settings`, `favourites`, `ratings`, `notes` and `checklist`,
    plus the device-level stores (order, shopping, timers).
  - `meta.userSchema` plus an upgrade chain that runs at startup, before any
    store is read, as one transaction.
  - A snapshot of the pre-upgrade data, kept until the new version has run
    successfully.
  - The first upgrade copies local storage into the database, and removes the
    old keys only after a later start confirms the copy.
  - A sample data set for every past version under `tests/fixtures/`, never
    deleted. CI upgrades each one to the current version.
  - A test that no module the service worker loads can open `faves-user`.

  🚩 **Settings hold allergen flags, which are safety data.** Break-probe the
  upgrade: drop one store from the copy and the tests must fail.
