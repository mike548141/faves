- [~] **Probe `localStorage` once per page** `[XS] [perf]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **G**.

  Measured: 12 probe writes per page load, each firing a `storage` event in
  every other open tab. Target: 2.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal G.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ **Built 2026-10-01 (`510-tool`).** `safeStorage()` memoises its probe per
  `localStorage` object (`site/js/store.js`; `tests/safe-storage.test.js`).
  `chatty_check`, per page load on home and menu: `setItem` 6 → 1,
  `removeItem` 6 → 1, `storage` events a second tab receives 12 → 2. Its
  break-probe (a `store.js` that re-probes every call) fails the tightened
  budget. Ships in `SHELL_VERSION` `2026-10-01.9`.
