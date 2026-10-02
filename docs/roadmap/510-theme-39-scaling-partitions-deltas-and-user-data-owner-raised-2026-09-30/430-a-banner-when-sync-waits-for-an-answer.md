- [x] **A banner outside Settings while sync waits for an answer** `[S]
      [sync][ui]` — owner-ruled 2026-10-02 (session `faves-4f`), follow-on to
      `390`.

  Since `390`, sync pauses entirely when it would merge without a base and
  asks "keep what sync has" or "add this device's extras"; the only sign is
  the Settings row "Needs your answer". The owner ruled a banner on every
  screen until it is answered, so a paused sync cannot sit unnoticed while
  devices drift. It must link straight to the question, meet the house
  accessibility bar, and disappear in every tab once answered (the question
  is stored once in `faves.sync.v1.ask`). Extend `sync_check`'s `390` block.

  📌 **Claimed 2026-10-02 04:12 UTC (`faves-77`): the banner (worker in a
  worktree).**

  ✅ **Shipped 2026-10-02 (worker for `faves-77`, PR #94, merged with CI 8
  of 8).**
  `sync-banner.js` (pure: shows only while `sync.status()` carries the
  no-base question, so it follows `faves.sync.v1.ask`) and
  `sync-banner-ui.js`, imported by `sw-register.js`, which all three shells
  load. In flow at the top of `<body>`, never fixed, so it covers nothing;
  a labelled region, silent at load, announced politely only when it
  appears mid-page. Its button fires an event Settings answers by opening
  Your data on the question, focus on its heading. Other tabs learn through
  `sync.subscribe` (the existing `storage`-event repaint), no new mechanism.
  Cook mode is a modal over the recipe page and is left alone. Verified:
  `tests/sync-banner.test.js`; `sync_check` 39 passed (+7, two tabs); three
  break-probes (banner off, no subscribe, never removed) each fail it;
  `to_top_check`, `chatty_check`, `boot_check`, `device_check` green.

  🔎 **Orchestrator's review added one fix (`abd661a`).** After answering,
  closing Settings left focus on `<body>`: the dialog restores focus to the
  element that opened it, the banner's button, which the answer removes.
  The handler now focuses the ⋯ menu button before opening, so the restore
  target survives. Settings' own button could not take it — it sits inside
  the closed ⋯ menu, unrendered. `sync_check` asserts it (40 passed); it
  failed with focus on BODY before the fix, twice.
  🚩 **Unverified, not filed:** the ordinary path (⋯ → Settings → close)
  may strand focus the same way, since its opener is also inside the closed
  menu. Not measured this session.
  ✅ **Closed 2026-10-02 (`faves-77`).**
