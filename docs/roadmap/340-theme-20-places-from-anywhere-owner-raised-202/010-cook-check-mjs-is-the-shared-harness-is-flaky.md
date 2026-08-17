- [ ] 🚩 **~~`cook_check.mjs` is~~ THE SHARED HARNESS is FLAKY under machine
      load, and flakiness is the failure mode that defeats every other guard
      rule we have** `[S][js]` — **RE-FILED 2026-08-17: this was never
      `cook_check`'s.**
      🛑 **The 30-second timeout is in the TRANSPORT**, `tools/lib/browser.mjs`'s
      `send()`, shared by all **ten** checks. Measured by a peer on this laptop
      with five sessions live: `boot_check` **2 of 4 runs failed**,
      `recipe_check` **4 of 8 aborted**, every failure on that one timeout, from
      two tools that are not this one. So scoping it to `cook_check` was reading
      the tool that happened to be under the microscope, not the fault.
      ✅ **The half that could be fixed by mechanism is fixed** (`ecbc82e`): a
      transport timeout is now a `HARNESS ERROR` with exit **2** and never
      prints `FAIL <assertion name>` with exit 1. That does not make the machine
      less loaded; it makes a flake **structurally unable to impersonate a
      regression**, which was the dangerous half. `FAVES_CDP_TIMEOUT_MS` gives a
      loaded machine rope. What remains open is the underlying contention.
      ❌ **The `:1301`/`:1353` diagnosis in this item is WRONG and is struck.**
      It said `:1353` calls `setNotifications("granted")` on an origin already
      pinned to `denied`. It does not: **line 1327, `await
      setNotifications("prompt")`, added in the same commit `3eb3d86b` as the
      pin**, restores the permission one line before the `longTimer` block opens.
      The named mechanism cannot occur in this tree.
      🛑 **So the "candidate fix, one line, deliberately not applied" is now
      REJECTED ON EVIDENCE, not deferred** — and the original reason for not
      applying it stands and is stronger. Flipping `:1301` to `"granted"` would
      delete the only coverage of the notifications-**blocked** path (the
      block's own comment: *"A blocked browser still sounds and buzzes, which is
      the only thing this scenario is about"*) in order to fix something that is
      not there. Three consecutive `cook_check` runs at load 8.6–10.0 on
      2026-08-17 returned `OK — 75 passed, 0 failed` with both named assertions
      passing.
      🔑 **The transferable lesson, which is worth more than the item:** an
      agent reported this correctly as a *measurement* and wrongly as a
      *diagnosis*, twice over — first the tool, then the mechanism. **Separate a
      report's measurement from its diagnosis; the measurements were sound every
      time.**
      Original filing follows —
      measured 2026-08-16 while integrating 36d. Four completed runs of the same
      commit: **75/0, 73/2, 75/0, 75/0.** One run in four failed two assertions;
      the tree did not change between them.
      🔎 **Load is the best explanation and it is not proven.** Six sessions
      were live; 1-minute load average ran 5.9–15.8 across the runs, and the
      failing run was at the high end. The building agent independently hit a
      harder version of this — **seven consecutive runs stalling** in the
      *pre-existing* section 4b, ~30 assertions before its own new code, with
      the audio path disabled and a different fixture, and only five lines of
      *comment* changed since the last green run. It could not get its
      replacement ring-once assertion observed at all; it passed here, later,
      on a quieter machine.
      🛑 **Why this outranks its size.** This repo's whole guard discipline is
      *"a wall of PASS then an error is not a pass — check the summary line"*.
      Flakiness defeats that rule specifically, because the summary line **is**
      there and it says FAILED, and the correct response looks identical to the
      wrong one: run it again. **I ran it again. It went green. That is exactly
      the behaviour that trains a session to re-run until green**, and it is why
      this is written down instead of quietly enjoyed. ⚠️ **The two failing
      assertions were not captured** — the failing run predated the run that
      tee'd its output, and I chose not to burn a load-generating reproduction
      attempt to recover them. That is a real gap in this evidence, not a
      rounding error.
      🔑 **Sequence it with the CI item below, not separately.** They are the
      same decision from two sides: a check too flaky to gate is also a check
      too flaky to *trust when typed by hand*, and "leave them manual" quietly
      assumes the manual runs are believed.
