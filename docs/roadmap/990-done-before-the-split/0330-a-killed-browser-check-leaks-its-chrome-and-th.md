- [x] 🚩 **A killed browser check LEAKS ITS CHROME, and the orphans then break
      every later run** `[S][js]` — **DELIVERED 2026-08-17 (`ecbc82e`)**; the
      claim it carried (2026-08-16 22:38 UTC, wt: faves-hygiene) is discharged.
      — the root cause behind the "flakiness" this
      item was first filed under. **Found 2026-08-16, and only after a confident
      wrong answer.**
      🔎 **The mechanism.** `cook_check.mjs` (and by construction every tool on
      `tools/lib/browser.mjs`) launches headless Chrome on a throwaway profile.
      **If the check is killed mid-run — a timeout, a Ctrl-C, an agent giving up
      — the Chrome survives.** Six orphans accumulated from killed runs and
      pushed 1-minute load past **100**. At that load the check does not fail; it
      **stalls silently** on a CDP call with a renderer spinning, and exits with
      no summary line. `pgrep -f faves-cook-check` finds them; nothing cleans
      them up automatically.
      🛑 **So it produces the exact trap CLAUDE.md documents for `sync_check` —
      a wall of PASS lines and no summary — from no code change at all.**
      🔑 **The methodological lesson is the valuable half.** An agent bisected
      this across five arms plus a control, and **every arm stalled at the
      identical point (30 PASS), including the control at `0978a04~1`**. It
      correctly concluded *"not my code"* — and then overreached to *"`cook_check`
      cannot complete on this machine"*. It could not, because **the orphans were
      still running underneath every arm of the bisect**, which the same agent
      cleaned up only afterwards. **A bisect whose every arm carries the same
      confound returns a uniform, confident, meaningless result — and its
      *control* is what makes it look rigorous.** Verified by simply re-running
      once the orphans were gone and load was 4.16: **`OK — 75 passed, 0
      failed`**, including the two-timer assertion the agent reported as
      unverifiable (*"a bell rings ONCE, even while a second timer keeps the
      clock ticking"*).
      🎯 **What to actually do:** make the harness reap its own browser on
      abnormal exit (a `process.on("exit"/"SIGINT"/"SIGTERM")` kill of the child),
      and add `pgrep -f faves-.*-check` to the verify list as the thing to check
      when a browser tool stalls. Until then, **if a browser check ever stalls,
      kill its Chrome before believing anything it or its successor tells you.**
      ⚠️ **The original flakiness observation stands and is now explained**, but
      one instance is still unaccounted for: four runs of the same commit during
      integration gave **75/0, 73/2, 75/0, 75/0** with load in the 5.9–15.8 range
      — well below the orphan-driven 100+. Whether that 73/2 shares this cause is
      **not established**, and its two failing assertions were not captured.
      Flakiness remains the failure mode that defeats our summary-line rule,
      because a flaky run's summary line *is* present and the correct response is
      indistinguishable from the wrong one: run it again.

      ✅ **THE TWO FAILING ASSERTIONS ARE NOW NAMED**, which the first filing
      could not do. They are the granted-notification pair:
      *"a granted long timer raises ONE notification through the service
      worker"* (`0 showNotification() call(s)`) and *"the notification carries
      the recipe it has to reopen, and a tag so it cannot stack"*.
      🔑 **The product is not implicated.** In the same failing scenario the bell
      itself rings — `3 oscillator(s), 1 vibrate() call(s)` passes. `notify()`
      correctly declines when the permission is not `granted`. **The check
      poisons its own permission state**: `tools/cook_check.mjs:1301` pins the
      origin to `denied` for the two-timer block (to stop a real prompt wedging
      the run), and the later granted block at `:1353` calls
      `setNotifications("granted")` on an origin already denied.
      🎯 **Candidate fix, ONE line and DELIBERATELY NOT APPLIED:** `:1301`
      `"denied"` → `"granted"` (a granted browser also never prompts, which was
      the only reason for pinning), or move the `pair` block after the
      `longTimer` scenarios. Verify by running to the summary line several times
      before trusting it.
      🛑 **Why it was left:** the agent proposing it reported the failure as
      **deterministic** — *"`main` still ends at FAILED — 73 passed, 2 failed"*.
      **Directly contradicted by measurement, and the agent re-asserted it four
      times.** ELEVEN runs of the merged tree: **nine × `OK — 75 passed, 0
      failed`, one × `73/2`, one × `harness error: Runtime.evaluate timed out
      after 30s`.**

      | Machine state | Runs | Result |
      |---|---|---|
      | load 5.9–15.8, integration | 4 | 75/0, **73/2**, 75/0, 75/0 |
      | load ~4.2–4.6, 26 peer Chromes live | 4 | 75/0, **timeout**, 75/0, 75/0 |
      | load 2.82, quiet | 3 | 75/0, 75/0, 75/0 |

      🔑 **Both failures fell under contention; none on a quiet machine.** So the
      permission-ordering mechanism at `:1301`/`:1353` is a credible explanation
      of *why it fails when it fails*, and **contention is what decides whether
      it fails at all**. "Deterministic" is wrong; "flaky, with a named
      mechanism and a candidate fix" is the accurate description.
      A fix whose premise is disproven
      by six observations is not a fix yet, and shipping an unverified change to
      a *guard* at the tail of a long session is the thing this repo keeps
      writing ADRs about. 🚩 Note also that **26 Chrome processes** were live at
      measurement time from peer sessions' own browser checks — the ordering
      theory may still be right and merely intermittent under contention.
      ⚠️ **So this agent was wrong three times about one check** — "my product
      change broke it", then "the machine cannot run it", then "it fails
      deterministically" — while being **right every time about the narrower
      fact it had actually measured**. Separate a report's measurement from its
      diagnosis; the measurements were all sound.
      Original filing follows.
