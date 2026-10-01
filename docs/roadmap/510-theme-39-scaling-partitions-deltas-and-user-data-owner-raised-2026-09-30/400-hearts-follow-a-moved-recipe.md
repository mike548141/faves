- [x] **A heart on a moved recipe follows it** `[S] [sync][recipes]` —
      owner-ruled 2026-10-02 (session `faves-4f`), guard 3 of `320`.

  A heart (and its rating) on a recipe's old id moves to the id it was moved
  to, worked out from each moved recipe's own `movedFrom`, so no id is
  written into the app's code. Makes "old beside moved" impossible by any
  route. Does not stop since-removed hearts coming back (`390` and `380` are
  for that). Guard B in `docs/reviews/2026-10-01-1209-old-hearts-320-routes.md`.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Closed 2026-10-02 (`faves-4f`, PR #83, ADR 0152).** Hearts, ratings and
  notes on a moved recipe's old id follow `movedFrom` in that person's own
  cookbook, on every store read and write, every export, and all three merge
  inputs; a server copy still holding an old key is rewritten once.
  Idempotent. Stored old keys are rewritten on the store's next write, not by
  an upgrade step (that would need a `USER_SCHEMA` bump and pause older
  devices); ADR 0152 records the trade. 9 tests and 6 break-probes.
