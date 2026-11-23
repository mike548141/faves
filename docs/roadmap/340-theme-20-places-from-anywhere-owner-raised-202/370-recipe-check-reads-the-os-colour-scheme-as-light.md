- [~] **`recipe_check` measures "light" in whatever scheme the OS is in, so
      it fails every night** `[S][tools]` — found 2026-11-23 by queue run
      f9ee6733 (a worker saw it fail on untouched `main`).

  (claimed 2026-11-23-1451, session f9ee6733, primary checkout)

  🔎 **Measured.** `node tools/recipe_check.mjs` at `d9c59322` and at
  `31b7ba20` (before this run): *85 passed, 1 failed*, both times on *"the
  picker is legible (≥ 4.5:1) in light AND in dark, and dark really
  switched"*, reading `page luminance 0.007 → 0.007`. The machine was in
  macOS Dark (`AppleInterfaceStyle` = Dark, switching automatically). The
  check takes its "light" reading with no emulated colour scheme, so headless
  Chrome inherits the OS's, and at night "light" is dark. A verdict that
  depends on the hour is the shape this repo's own notes say gets a check
  switched off. **The fix:** emulate `prefers-color-scheme: light` for the
  light reading, and restore light rather than the OS default after.
