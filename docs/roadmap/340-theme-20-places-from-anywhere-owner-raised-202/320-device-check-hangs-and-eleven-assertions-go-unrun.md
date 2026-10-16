- [ ] 🔎 **`device_check` hangs at the same step every run, so 11 of its 81
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
