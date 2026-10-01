- [x] **Pause the home search hint timer when hidden** `[XS] [home]` — from
      the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **J**.

  The placeholder rotates forever (about 5 ms/s of idle task time, measured on
  desktop).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal J.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ **Built 2026-10-01 (`510-tool`).** `rotateHints` pauses on
  `visibilitychange` to hidden, never starts on a hidden page, resumes on show
  (unless the field is focused or holds text) and stops for the page after
  three turns; reduced motion already pinned it. `chatty_check`, home page:
  hidden 15 s 6 DOM mutations and 2 timers → 0 and 0; visible 30 s 4 placeholder
  changes → 3. Unit tests in `tests/search-hints.test.js`. Ships in
  `SHELL_VERSION` `2026-10-01.9`.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #66).
