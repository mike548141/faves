- [ ] **Every browser check inherits the OS colour scheme unless it sets one**
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
