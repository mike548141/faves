- [x] 🔎 **`device_check` hangs at the same step every run, so 11 of its 81
      assertions go unrun** `[S][tests]` — found 2026-10-16 (`faves-11`)
      while verifying `200/130`.

  **What happens.** Every run stops after `PASS home page, opened by mouse,
  closed by close button: focus returns to the ⋯ button` with `HARNESS ERROR
  — Runtime.evaluate timed out after 60s`, exit 2. That is the next
  iteration of the settings-focus loop (home page, mouse, **Escape**), so
  that close path, the backdrop path, the keyboard path and the profile
  clean-up never run. A full run was 81 assertions on 2026-10-02 (`230/020`);
  today every run reports 70 PASS, 0 FAIL, then the hang.
  **Measured, five runs:** `main` at `627cb2d7` and at `9913f365`, the
  pre-session commit `8c74e2ee`, and `200/130`'s branch twice. The 70
  assertion lines are identical on `main` and on `200/130`, at load 7 and at
  load 20+, with `FAVES_CDP_TIMEOUT_MS=60000`. So it is not this session's
  change and not load, which is what `510/420`'s flakes were.
  **Leading lead, not a finding:** nothing under `site/js`, `site/css`,
  `site/index.html`, `tools/device_check.mjs` or `tools/lib/` changed between
  the last full green run (`b0ac1455`, PR #100) and `8c74e2ee`. Chrome did:
  155.0.8059.82 was installed 2026-10-16 10:55 local and 155.0.8059.85 at
  21:30. A changed CDP or `<dialog>` behaviour on Escape is the first thing to
  test, e.g. by pinning the previous Chrome with `FAVES_CHROME`.
  **Why it matters:** exit 2 reads as "the harness, not the site", so a
  session that sees it shrugs. It is deterministic, so it is a guard that has
  quietly stopped guarding the Escape and keyboard close paths (the
  decorative-guard class, ADR 0072). The step that hangs is "an unguarded
  step", so the harness cannot say which call.
  **The work:** find the call that never returns, fix the check or the site
  (whichever is wrong), and restore 81 assertions with a break-probe.

  ✅ **Done 2026-10-16 (faves-11 worker).** Cause found and fixed in the
  harness; the site was not wrong and `site/` is untouched.
  **The call that never returned** was the `settle()` (two
  `requestAnimationFrame`s) inside `press("Escape")`, not the Escape itself.
  Traced with a log line per CDP call: the Escape key events were sent, then
  `Runtime.evaluate {new Promise(r => requestAnimationFrame(...))}` never came
  back. A plain evaluate beside it answered, and showed
  `document.visibilityState` had gone from `"visible"` to `"hidden"` between
  the key event and the next call. A hidden page never fires rAF, so the
  promise cannot settle until the 60 s CDP timeout.
  **Why it went hidden.** `Target.getTargets` after the key showed a new
  `chrome://settings/help` page that was not there before it: **a CDP key
  event with no `text` opened "About Google Chrome" in a foreground tab.**
  (Reading, not measured: Chrome on macOS hands a key the page did not swallow
  to the application menu, and an event with empty characters matches the first
  menu item that has no key equivalent. What was measured is the rest.)
  Reproduced with no site code at all: a blank page, a plain `<dialog>`, and
  `index.html` all went hidden on a bare `Input.dispatchKeyEvent`, for Escape,
  Enter, `a`, ArrowDown, ArrowUp, Home and ArrowRight (Tab did not). No key sent
  ⇒ the page stayed visible for 5 s of polling; a mouse click did not hide it.
  **The Chrome lead is refuted, not confirmed.** Chrome for Testing
  **131.0.6778.204** (puppeteer's cache) hides the page on the same bare
  Escape, so it is not a 155.0.8059.82 → .85 change. I did not test .82 itself.
  Not explained, and said plainly: why this passed on 2026-10-02 and not on 2026-10-16.
  The screen is locked on this machine (`CGSSessionScreenIsLocked` true,
  display wrangler asleep; `caffeinate -u` woke the display and changed
  nothing), so a session-state difference is possible, but I have no run from
  an unlocked session to show it. The fix does not depend on the answer.
  **Fixed in `tools/lib/browser.mjs`.** `press()` now sends `text` with every
  key (`KEY_TEXT`: `\u001b` for Escape, the NSEvent function-key code points
  for the arrows, Home and End, `\r` as a `keyDown` for Enter). Measured: with
  `text` alone the page stays visible, no About tab opens, Escape still closes
  a `<dialog>` and the page still sees `key: "ArrowDown"`. Two variants that do
  not work, so nobody tries them again: adding `unmodifiedText` as well (hides
  the page, and `event.key` arrives empty), and `text: "\0"` (hides it).
  Giving the real macOS `nativeVirtualKeyCode` instead did not help either.
  `Emulation.setFocusEmulationEnabled` keeps the page visible but still opens
  the About tab on every key, so it was rejected.
  `device_check`'s local `key()` helper, which had the same hole for ArrowDown,
  was replaced by the shared `press()`.
  **The guard.** `press()` now asks `document.visibilityState` (a plain
  evaluate, which answers on a hidden page) before it settles, and raises a
  `HarnessError` that names this cause. Break-probe: with `KEY_TEXT` bypassed,
  `device_check` stops at the first Escape with `the page became "hidden"
  after pressing Escape: a key event reached Chrome's menu…` and exit 2, in
  seconds instead of a 60 s timeout; restored afterwards.
  **Verified.** `device_check` ran to its summary twice in a row, **81 passed,
  0 failed** both times (the 11 that were unrun now run: tree
  `faves-340-320/site`). Other users of `press()`: `cook_check` 85 passed,
  `sync_check` 40 passed (CLAUDE.md still says 22 — stale, not touched here),
  `boot_check` 38 passed, `node --test` 1864 passed. `SHELL_VERSION` not bumped
  (nothing under `site/` changed).
