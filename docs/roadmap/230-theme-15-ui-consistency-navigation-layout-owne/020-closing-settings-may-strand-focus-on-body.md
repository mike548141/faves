- [x] 🔎 **Closing Settings may leave focus on `<body>`** `[S][js][a11y]` —
  found 2026-10-02 (`faves-77`) while reviewing `510/430`.

  A modal `<dialog>` hands focus back on close to whatever had it when it
  opened. Settings is opened from `#settings-btn`, which lives inside the ⋯
  overflow menu, and choosing a menu item closes that menu. So the restore
  target may be an unrendered element, and focus would fall to `<body>` —
  a keyboard or screen-reader user back at the top of the document. Measured
  on the banner path (`510/430`, fixed there by opening from `#overflow-btn`);
  **the ordinary ⋯ → Settings → close path is not yet measured.**

  **The work:** measure it on all three pages in a real browser; if it
  strands, fix it in one place for every way Settings opens, and assert it
  in a browser check, break-probed.

  📌 **Claimed 2026-10-02 05:25 UTC (`faves-77`), worker in a worktree.**

  **2026-10-02 (`faves-77` worker): measured, fixed, asserted.** Headless
  Chrome, 390 px, real mouse and keys. Where focus landed after closing
  Settings, before the fix (every row closed the sheet; keyboard-open =
  Enter on ⋯, ArrowDown to Settings, Enter):

  | page | opened by | ✕ | Escape | backdrop |
  |------|-----------|---|--------|----------|
  | home | mouse | body | body | body |
  | home | keyboard | body | `#settings-title` | body |
  | menu | mouse | body | `#settings-title` | body |
  | menu | keyboard | body | `#settings-title` | body |
  | recipe | mouse | body | `#settings-title` | body |
  | recipe | keyboard | body | `#settings-title` | body |

  (Escape's `#settings-title` is the hidden heading: equally nowhere.) It
  stranded on every row. After the fix all 18 land on `#overflow-btn`.
  Openers: a click on `#settings-btn` (also how app.js and menu.js open it
  for their "change your distance limit" buttons) and the sync banner's
  `OPEN_SYNC_QUESTION`; no other `showModal` reaches this sheet.

  **Fix, one place:** `openSheet()` in `site/js/settings-ui.js` focuses
  `#overflow-btn` before `showModal()`; both openers call it (the banner
  path's own copy of that is gone).

  **Assert:** `tools/device_check.mjs` section 11, 12 checks (3 pages x
  mouse x 3 closers, plus keyboard-open x Escape per page). Break-probe:
  settings-ui.js reverted to HEAD gave 69 passed, 12 failed (all twelve
  new); restored, 81 passed, 0 failed.

  ✅ **Closed 2026-10-02 (`faves-77`, PR #95, merged with CI 8 of 8).**
  It stranded on every page and every close path (18 of 18); now none do.
