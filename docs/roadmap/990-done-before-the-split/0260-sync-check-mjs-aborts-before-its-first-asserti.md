- [x] 🚩 **`sync_check.mjs` aborts before its FIRST assertion — the guard proves
  nothing at all** `[S][js]`. **DONE 2026-08-16 (wt: faves-cook)**.
  ⚠️ **Measured 2026-08-16, and the title of this item was wrong.** It said
  "before its last three assertions". Run on a clean `main`, the check prints
  its banner and then dies at the **first UI interaction**, with **zero PASS
  lines**:
  `harness error: no element matching .settings-row containing "Sync across
  your devices"`.
  🔎 **Cause, and it is not the race below.** Commit `e745923` *"settings:
  remove Transfer to another device, and fold Sync into Your data"* turned that
  top-level row into a `<p class="settings-sub">` inside the Your-data panel
  (`settings-ui.js:384`). `sync_check.mjs:405` still clicks `.settings-row`.
  🛑 **The documented warning is itself stale, and it misleads in the dangerous
  direction.** `CLAUDE.md`'s verify list says to watch for *"a wall of PASS
  lines followed by 'harness error'"*. There is no wall of PASS lines — there
  are none — so a reader matching the documented symptom concludes they are
  looking at something else. **Fix `CLAUDE.md` in the same change.**
  🔑 **Third sighting today of one shape: a record whose premise expired in
  silence.** The scanner-inflation item (closed above) and the "source did not
  move" hand-check are the other two. Here a *UI refactor* invalidated a *test's
  selector* and a *doctrine file's description of the failure*, and none of the
  three knew about the others.
  ⚠️ **Everything below this line is now UNVERIFIED, not false.** The
  overflow-menu race was real when observed, but the check cannot reach it any
  more, so nothing has re-confirmed it since `e745923`. Fix the selector first,
  then find out whether the race is still there:
  the two-device sync check (Theme 9 v2) **was** passing every sync assertion
  including
  the headline one (a removed heart is removed on the other device, not
  re-added), then **aborting on an overflow-menu interaction**, so
  rating-replace, sync-off-leaves-data-intact and server-unreachable are
  *written and never observed*. 🔎 **The trace points at a real product hazard,
  not just a flaky check:** after a rating slider takes focus deep in a menu,
  the header scrolls off; the check compensates, and it was still observed
  failing — scroll snapping back to 879px on its own, and the ⋯ button's own
  handler reporting **two** open/close cycles from **one** click. The suspect is
  `menu.js`'s `reapply()` (`settings.subscribe(reapply)`, wrapped in
  capture/restoreUiState), which a completed sync now triggers on every device
  via `sync-start.js`'s `onApplied` hook and which is asynchronous relative to
  the panel saying "Last synced…". **So a real person acting fast right after
  their device finishes syncing may hit it.** Full evidence is in the check's
  own header; an unwired `waitQuiet()` MutationObserver helper sits in
  `openDevice()` as an untested starting point. Owner is `overflow-ui.js` /
  `menu.js`, not the sync engine.
  ⛔ **All of the above is now SUPERSEDED by the fix note at the top of this
  item.** The suspect was wrong: `reapply()` and the sync engine were never
  involved, and the owner is `sync_check.mjs` itself. Kept rather than deleted
  because the *trace* was real and correctly recorded — it was the *diagnosis*
  built on it that failed, which is the same lesson this repo already wrote down
  when a peer's measurement and a peer's diagnosis were separated by two greps
  (Theme 36).
