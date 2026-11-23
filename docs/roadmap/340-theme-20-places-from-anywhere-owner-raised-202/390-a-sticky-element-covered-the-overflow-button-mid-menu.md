- [~] 🔎 **A sticky element covered `#overflow-btn` while scrolled down a menu**
      `[S][css]` — seen 2026-11-23 by a queue-run worker (f9ee6733) building
      `tools/activity_check.mjs`.

  (claimed 2026-11-23-1523, session f9ee6733, worktree faves-qr-f9ee-sticky)

  **What was seen.** Driving the real page, the harness's hit-test reported
  `#overflow-btn` covered by a sticky element while the menu was scrolled
  down; the worker scrolled to the top first and went on, and did not
  investigate. The harness's `UNREACHABLE ELEMENT` is built to mean exactly
  this (`CLAUDE.md`, the click paragraph): *"a control with something painted
  over it is the defect `to_top_check` exists for"*.
  **Unknown:** whether a person at 390 px can hit it, or only the harness's
  scroll position; which sticky element it was. **Next:** reproduce at 390 px
  mid-menu, read the FAIL line's `page state:` and screenshot, and either fix
  the stacking or record why a reader cannot reach that state.
