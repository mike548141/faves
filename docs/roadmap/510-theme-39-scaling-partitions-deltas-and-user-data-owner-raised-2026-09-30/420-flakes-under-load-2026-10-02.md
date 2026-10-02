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
