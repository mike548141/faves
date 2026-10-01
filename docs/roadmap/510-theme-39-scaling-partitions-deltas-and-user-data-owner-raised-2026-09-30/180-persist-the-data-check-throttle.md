- [ ] **Persist the service worker's data-check throttle** `[S] [pwa][sw]` —
      from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **E**.

  Today the throttle lives in service-worker memory, so a restarted worker
  fetches the catalogue on every navigation more than 10 s apart.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal E.

  🎯 **Owner ruling needed:** a 2–5 minute window means a menu edit reaches an
  online phone that much later. That sits beside ADR 0147's freshness trade.
