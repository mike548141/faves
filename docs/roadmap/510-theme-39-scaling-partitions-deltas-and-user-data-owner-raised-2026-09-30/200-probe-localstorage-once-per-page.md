- [ ] **Probe `localStorage` once per page** `[XS] [perf]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **G**.

  Measured: 12 probe writes per page load, each firing a `storage` event in
  every other open tab. Target: 2.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal G.
