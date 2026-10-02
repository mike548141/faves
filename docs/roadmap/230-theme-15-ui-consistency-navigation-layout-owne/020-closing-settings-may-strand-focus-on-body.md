- [~] 🔎 **Closing Settings may leave focus on `<body>`** `[S][js][a11y]` —
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
