- [ ] 🔎 **Two flakes seen under heavy load on 2026-10-02, neither named**
      `[S] [tests]` — filed by session `faves-4f` from its workers' sweeps
      (load averages of 120 to 800 while several sweeps overlapped).

  1. **`node --test` failed 1 test once** on the `26a` branch after `280`'s
     fix had landed; the next four runs passed 1,823 of 1,823. The output
     was not kept, so the name is unknown. It may be a second fixed-timer
     wait outside `tests/` (`280` swept only `tests/`), or something new.
     Next time: run the 40-run saved-output loop `280` used, under load.
  2. **`addon_check` failed 10–11 assertions** (the allergen-flag and
     currency wording) in 1 of 6 runs **on `main` itself**, and passed the
     rest. These are assertion failures, not harness errors, which is the
     misleading kind: a reader would take them for a regression. `cook_check`
     also failed its two notification assertions once (83/85) and passed on
     re-run, twice today.
  Prove or refute that load alone causes each: run the check N times quiet
  and N times under a synthetic load, and name what differs.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  🔎 **2026-10-02 (`faves-4f`):** 40 saved-output runs of `node --test` on
  `main` at `a608dc6`, quiet machine: 40 of 40 clean (1,823 each). So (1)
  does not reproduce at rest; it needs the loop run under real load. Also
  seen the same day: CI's `every screen boots` exited 2 once with "timed out
  waiting for Chrome's DevToolsActivePort" on the runner (harness, not an
  assertion; re-run green), and a local `boot_check --id the-victoria-tavern`
  crashed once with an uncaptured Node stack trace, then passed twice.
  📌 **Claim released.**
  **Recurred 2026-10-02 (`faves-4f`), a second time:** CI's `every screen
  boots` exited 2 with "timed out waiting for Chrome's DevToolsActivePort" on
  `30327a8` (a board-only commit). Twice in one day on the runner, both
  harness (Chrome never started), both green on re-run. If it keeps
  recurring, the boot job wants a launch retry (a harness retry, unlike an
  assertion retry, re-issues nothing the page sees).

  🔎 **`device_check` flaked twice more on 2026-10-02 (`faves-77`), two
  different ways, neither retried by design (ADR 0101):**
  - a worker's run: `UNREACHABLE ELEMENT: #overflow-btn covered by
    #geo-dialog`, reported failing on `main` too; not reproduced — 69/0 and
    then 81/0 on later runs;
  - the orchestrator's post-merge sweep of all 21 browser checks on `main`
    (`58a73d8`): `UNSTABLE ELEMENT — #favourites-toggle has no clickable box`,
    0×0 after 2 s and 122 frames. The very next run on the same commit, at
    load 8–13, passed 81/0. The other 20 checks in that sweep were green.
  The geo dialog covering ⋯ and a toggle that never gets a box both look like
  a page state reached out of order, not slowness — the stable-click wait
  measured frames, and the box stayed 0×0 throughout. Unexplained; the
  harness does not record what was on screen, so the next occurrence should
  capture a screenshot at the failure.

  🔎 **2026-10-16 (faves-11 worker): three of the four pieces built; the
  load experiment is deliberately NOT run, so this stays open.**

  **Built.**
  1. **CI launch retry** (ADR 0160). The CI failure of 2026-10-16 is run
     38865430120 on `62b9c1cf`: 20 s from the orphan sweep to "timed out waiting
     for Chrome's DevToolsActivePort", no Chrome stderr, exit 2, green on re-run.
     `launchChrome` now retries that one condition once (stop the stuck Chrome,
     empty the profile, start again) and prints `↻ LAUNCH RETRY`, then `↻ THE
     LAUNCH RETRY WORKED` or `… FAILED TOO`; on GitHub Actions also a
     `::warning::`. It lives in the library, not the CI job: every check gets it,
     and a `|| node …` in the YAML would also re-run unclassified errors and
     transport deaths. Proven by `tests/launch-retry.test.js` (a fake Chrome that
     hangs once, always, never; 4 cases), break-probed twice (one attempt only:
     2 cases fail; profile not emptied: 1 fails), and end to end by running
     `boot_check` through a wrapper that hangs the real Chrome's first start
     (both ↻ lines printed, 38 passed). **Not proven:** that a real Chrome that
     timed out once starts on its second go; that rests on three of three CI
     occurrences being green on re-run.
  2. **Evidence on a refused click.** `UNREACHABLE ELEMENT` and `UNSTABLE
     ELEMENT` now carry a `page state:` line and a screenshot path (ADR 0160).
     Staged: a covering overlay (PNG read back, shows the overlay over the ⋯), a
     closed menu's 0×0 button, a hidden page (state line, correctly no
     screenshot), an unwritable `FAVES_SHOT_DIR` (the FAIL line survives).
  3. **The two flakes explained below.**

  **Does the 2026-10-16 hidden-page finding explain the 2026-10-02 flakes?
  No. A different cause does, and it is not load by itself.**
  - **Measured: a hidden page cannot make either message.** On a backgrounded
    page `click`'s in-page frame wait never returns, so the run ends after 30 s
    as `HARNESS ERROR … Runtime.evaluate timed out`, exit 2. The 0×0 flake
    reported 122 frames in 2 s, which is 60 frames a second: the page was
    visible and painting throughout. So `340/320` is not the cause of either,
    and it could not have produced those messages even if it had been present.
  - **Measured (mechanism, not the original runs): both flakes reproduce
    from the geo ask.** `site/js/app.js` opens `#geo-dialog` with `showModal()`
    about 900 ms after the list renders, unless the reader has already
    scrolled, pressed a pointer or a key (the `engaged` flag). On a quiet
    machine the harness's first click lands inside that window and `engaged`
    stops the dialog; the dialog then never opens (a banner shows instead).
    - A harness that simply arrives 1.8 s after the list rendered, with
      nothing else changed, fails `UNREACHABLE ELEMENT — #overflow-btn is
      covered … would land on #geo-dialog`, the same message as flake 1, and
      the screenshot shows the dialog.
    - Opening the dialog in the gap between `click`'s hit-test and its
      `mousePressed` (done by tapping the ⋯ coordinates with the dialog already
      open) leaves the ⋯ menu closed, so the next click on `#favourites-toggle`
      fails `UNSTABLE ELEMENT … has no clickable box: 2001ms and 122 frames …
      0.0x0.0`, the same message and almost the same numbers as flake 2.
    - Opening the dialog while the menu is already open does NOT close the menu
      (toggle stayed 178x44), so that path is not the cause.
  - **Inferred, not measured:** that the 2026-10-02 runs were this race. A
    starved harness is a late harness, which is the condition that opens the
    window, so load is the *trigger*, but the cause is the page's timer and the
    missing guard in the checks; the same lateness on a quiet machine does it
    too. `device_check` home-page steps (the focus loop at its `#overflow-btn`
    clicks; the home-list step at `#favourites-toggle`) navigate to
    `index.html` with no consent seeded and nothing that dismisses the ask.
    Not shown: that no other cause exists for either flake.
  - The harness is blameless in the narrow sense: it reported what it measured.
    The gap is that nothing told a reader it was the geo ask; the page-state line
    (`open dialogs: dialog#geo-dialog`) now does.

  **Deliberately not done: the "N quiet runs against N runs under synthetic
  load" experiment.** The machine had a probable load-related crash the same
  evening, so no artificial load was generated. The geo finding above did not
  need it. The experiment is still owed for the two flakes this session did not
  touch: **`node --test` failing one test under load** (item 1 above; the
  40-quiet-run loop is already done and clean) and **`addon_check` failing
  10-11 assertions in 1 of 6 runs, and `cook_check`'s two notification
  assertions (83 of 85)**. Those are untouched by the geo race (neither drives
  the home page's first click) and remain unexplained.

  **Verified (this branch, `0c03d627` plus docs, load 7 to 8):** `node --test`
  1875 passed; `boot_check` 38 passed; `device_check` 81 passed, 0 failed (the
  count that the hidden-page fix restored); `cook_check` 85 passed;
  `sync_check` 40 passed; each run alone, `nice -n 5`; no orphan Chromes after.

  **What remains, for whoever picks this up.**
  - 🎯 *The geo race itself, a fix and not a diagnosis:* decide whether the
    checks that open the home page (`device_check` first) should seed the
    ask as already answered, or dismiss `#geo-dialog` when it appears, or
    assert on it. Not done here: it changes what the checks measure and the
    item asked only for the explanation. `filter_row_check` and `geo_check`
    deliberately exercise the ask and must keep doing so.
  - The load experiment, for the three unexplained flakes above, when the
    machine can take it.
  - CI discards the failure screenshot with the runner. Wiring
    `$FAVES_SHOT_DIR` to an artefact upload is a CI change (a new action, so a
    trust-surface decision) and is not made.

  📌 *Claimed 2026-10-17-2119 by faves-b4 for bullet 1 only; released
  2026-10-18 at PR #121's merge.* Still open: the load experiment for the
  three unexplained flakes (`node --test` under load, `addon_check` 10–11
  assertions in 1 of 6, `cook_check`'s two notification assertions), which
  wants a quiet machine; and 🎯 the CI screenshot upload, a new action and so
  a trust-surface decision that is the owner's.

  **Done (bullet 1: the geo race, in the checks; worker `w/510-420`).** The
  orchestrator's call was to seed, not dismiss or assert: a check that is not
  about the ask starts with it answered, as a returning reader would. One opt-in
  helper, `answerGeoAskBeforeLoad(cdp, sessionId)` in `tools/lib/browser.mjs`,
  installs the app's own consent record (key imported from
  `site/js/geo-consent.js`, so it cannot drift) before any page script runs.
  `device_check` and `addon_check` (section aa clicks the home page's order
  button) now use it; `picks_check`, `focus_check` and `to_top_check` already
  carried a pasted copy of the same line and now call the helper (same source
  string, no behaviour change). Left unseeded on purpose, each with its reason
  in the code or here: `geo_check` (it is the ask; comment added),
  `filter_row_check` (already seeds the flag itself and drives the banner by
  unhiding it; untouched), `chatty_check` (counts localStorage writes, and the
  first-time reader is its subject), `boot_check` (its clicks are programmatic,
  which an inert page does not stop, and its job includes running the ask's
  JavaScript), `distance_check` (grants the permission, so the app never asks),
  and `cook_check`, `midnight_check`, `fetch_check`, `precache_check`,
  `sync_check` (open the home page but never click it, so a dialog cannot
  reach them). The menu-page-only checks never meet the ask.
  *Proof:* with `device_check`'s first home-page click delayed 1.8 s after the
  list paints, the unseeded run fails `UNREACHABLE ELEMENT — #overflow-btn …
  would land on #geo-dialog` and the seeded run passes 81/0. `site/` untouched.
