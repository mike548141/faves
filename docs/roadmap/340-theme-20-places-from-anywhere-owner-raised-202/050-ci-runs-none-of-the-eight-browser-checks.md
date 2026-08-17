- [ ] 🛑 **CI runs none of the eight browser checks** `[M][ops]` — the structural
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
