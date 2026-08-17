- [x] ⚠️ **SUPERSEDED 2026-08-17 by `020-ci-runs-none-of-the-browser-checks.md`
      in this same section — do not work this copy.** Two items were filed for
      one finding and this is the older, staler face of it. Three ways it is out
      of date: it says **eight** browser checks (the sibling's own correction
      says ten, and `CLAUDE.md` now says thirteen); the decision it asks for —
      *"which subset gates a merge"* — was **ruled 2026-08-16 and shipped**
      (`344adfb`, the `every screen boots` job, deliberately chosen as the one
      safe to require, with `cook_check`/`sync_check` explicitly excluded as
      contention-flaky); and its flakiness paragraph was re-filed as `010` in
      this section, where the fault is correctly located in the shared transport
      rather than in `cook_check`. **The live residue is in `020` and `030`**,
      not here. Original filing follows —
      `[M][ops]` — the structural
      face of [ADR 0072] and the one that undercuts the rest.
      `.github/workflows/ci.yml` runs `node --test` and the Python gates;
      `sync_check`, `cook_check`, `device_check`, `boot_check`, `addon_check`,
      `branch_check`, `to_top_check`, `filter_row_check` and now `recipe_check`
      run **only when a human types them**. Every guard in this repo written
      *because* unit tests missed something real is on the honour system, and
      that is the whole answer to how `sync_check.mjs` stayed dead through an
      entire refactor. 🔑 **The cheap guards that catch the least are automated;
      the expensive guards that catch the most are not.** ⚠️ Not free: they need
      Chrome in the runner and they are slow, and several are flaky under
      parallel load — two `cook_check` runs on one machine timed out on
      `Runtime.evaluate` and `Input.dispatchKeyEvent` while a third passed 60/60,
      which is contention, not a logic fault. So this needs a decision about
      which subset gates a merge and which run nightly, not just a workflow edit.
