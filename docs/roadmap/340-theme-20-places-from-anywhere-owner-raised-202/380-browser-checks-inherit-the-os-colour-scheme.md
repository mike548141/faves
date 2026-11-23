- [x] **Every browser check inherits the OS colour scheme unless it sets one**
      `[S][tools]` — found 2026-11-23 by queue run f9ee6733, from
      [`370`](370-recipe-check-reads-the-os-colour-scheme-as-light.md).

  `tools/lib/browser.mjs` sets no `prefers-color-scheme`, so a check that
  assumes the light theme (a contrast reading, a screenshot compared by eye, a
  colour asserted) is asserting about the laptop's clock: macOS switches to
  Dark automatically at night. Only `activity_check`, `branch_check`,
  `cook_check` and `recipe_check` call `Emulation.setEmulatedMedia` at all.
  **Options:** (a) the harness emulates light on every new page, and a check
  that wants dark asks for it; (b) audit each check for a light-theme
  assumption and set it there. (a) is one place and closes the class; its
  risk is a check that silently relied on the OS default, which a full
  browser sweep at both OS settings would show.

  ✅ **Done 2026-11-23 (queue run f9ee6733).** Option (a), in one place:
  `tools/lib/browser.mjs` (`DEFAULT_COLOR_SCHEME`, `withColorScheme`, and two
  rules inside `Cdp.send`). Every check makes its pages and its emulation
  through `send`, so (1) a session just attached to a target is emulated
  light at once, and (2) every `Emulation.setEmulatedMedia` call is rewritten
  to carry a colour scheme, the one the check named or else light. Rule 2 is
  the part a "set it on new pages" default would have missed: that call
  REPLACES the whole feature list, so `cook_check`'s reduced-motion step
  and its `{ features: [] }` reset (and `branch_check`'s `setColorScheme(null)`)
  dropped straight back to the OS scheme. A check that wants dark names it
  (`activity_check`, `recipe_check`, `branch_check` already did). No check's
  assertions changed; `branch_check`'s comment no longer says null restores
  the OS setting. A tab made by `Target.createTarget` and never attached
  (`cook_check`'s hidden "other tab") is not emulated; nothing reads its colours.

  🔎 **Proof, on this machine in macOS Dark.** `boot_check` gained four
  assertions (38 → 42): a fresh page is light; emulating only
  `prefers-reduced-motion` leaves it light; `{ features: [] }` leaves it
  light; and the control, asking for dark explicitly gets dark. Break-probes,
  each restored after: no default on attach fails the fresh-page assertion;
  no rewrite of `setEmulatedMedia` fails the other two; both off fails all
  three, and the control passes in every arm.

  🔎 **Sweep, all 22 browser checks, one at a time, OS in Dark, shell
  `2026-11-24.3`:** activity 28, addon 216, boot 42, branch 234, cook 87,
  device 91, distance 28, fetch 19, filter_row 25, fixture `--selftest` 24,
  focus 50, geo 22, midnight 89, note 19, picks 20, precache 20, recipe 97,
  rename 13, served 55, sync 47, to_top 142: all passed, 0 failed, no `↻` retry
  line anywhere. `chatty_check`: 42 passed, **3 failed**, the three install
  budgets filed as `510/450`
  (313 req, 1231 KB, 132 req), identical to that item's measurement and to
  the primary checkout's own run of the same check (42 passed, 3 failed), so
  not caused by this change and unrelated to colour. No check turned out to
  have silently relied on OS Dark.
  **Not run:** a sweep with the OS set to Light; the harness
  now ignores the OS scheme either way, so the probes above are the evidence.
