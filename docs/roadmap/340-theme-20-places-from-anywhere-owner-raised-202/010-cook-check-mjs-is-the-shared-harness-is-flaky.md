- [~] 🚩 **PART-DONE, not open — the mechanism half shipped (`ecbc82e`), the
      contention half is not repo work.** Marked 2026-08-17 by a board sweep;
      free to pick up, not claimed. What remains is a loaded laptop, which no
      commit fixes; what a session *could* still take is capping concurrent
      browser checks or making the harness wait for a free slot. Original
      filing follows —
      🚩 **~~`cook_check.mjs` is~~ THE SHARED HARNESS is FLAKY under machine
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

  🛑 **ONE OF THE "FLAKES" WAS NOT A FLAKE — it was a defect in the check, and
  it was found 2026-09-24 (session `3e87e0bf`) only because a worker refused to
  claim a green run it could not account for.**

  **What happened.** A worker delivering `17e` reported `cook_check` at
  **83/85** once and 85/85 on four other runs of the same commit, on the two
  notification assertions, and said plainly it had *not* bisected against
  `main` and so could not rule its own branch out. That honesty is the whole
  reason this was found: the documented loaded-laptop explanation was sitting
  right there and would have absorbed it.

  **The bisect, run by the orchestrator before merging.**

  | commit | shell files precached | runs |
  |---|---|---|
  | `935f44e` (session start) | 96 | **3 of 3 green** |
  | `9178b5b` | 96 | **3 of 3 green** |
  | `3db205f` (`js/heat.js` joins the precache) | 97 | **1 of 3 RED** |
  | `f3a93c5` (current `main` at the time) | 97 | **2 of 3 RED** |

  🔑 **The failure rate TRACKED THE PRECACHE SIZE, and that is what made it
  diagnosable.** It is not a transport timeout, not a loaded machine — the
  machine was at load 1.7 — and **not a product defect**: cook mode's
  notification path was never broken.

  **The defect.** The check waited on
  `navigator.serviceWorker.getRegistration().then((r) => !!r)`, which resolves
  the moment the worker is **registered** — which it is while still
  `installing`. `showNotification()` requires an **active** worker. So the two
  assertions raced the install step, and every file added to `sw.js`'s
  precache list widened the window. Fixed to
  `navigator.serviceWorker.ready.then((r) => !!(r && r.active))`, which cannot
  be satisfied by an installing worker however long the install takes.
  **4 of 4 green after, on the same tree that was 2 of 3 red before** — the
  before-state is the break-probe.

  🚩 **Two lessons, and the second is the uncomfortable one.**
  1. *A guard written to close a hole is not thereby free of holes of its own
     class.* This check exists because unit tests against a fake wake lock let
     two leaks ship; it then shipped its own race against a real platform
     object.
  2. **The check's own comment said it was waiting for the right thing** —
     *"wait for the registration rather than letting the run silently take the
     fallback"* — so a reader auditing it would have read the sentence and
     moved on. *A check's description is not evidence about the check*, for the
     third time in this repo and the second time in this session.
  🔎 **And it was invisible because CI runs `boot_check` and nothing else.**
  `main` was red on a verify-list gate across four merges; the deploys were
  fine, because the fault was never in the product. This is `290`'s shape
  arriving again from the other side: there the gate was right and `main` was
  broken; here `main` was right and the gate was broken. Both are unwatched.
