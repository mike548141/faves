# Owner-reported — 2026-07-22

Both resolved; verbatim raw-note records → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

- ✅ **Bug: "Nearest first" sorts 10 km above 2.5 km** — **fixed 2026-07-22**
  (`566aa20`). Root cause was not a text sort: the sort-key order put
  availability + the favourite boost ahead of distance; the fix makes distance
  lead when "Nearest first" is on. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
  ⚠️ Hearts-in-Nearest-first question: **ruled + applied 2026-07-23** (pure
  distance, `9a4ed78`) — see Owner rulings above.
- ✅ **Split versioning: app vs config vs data** `[M]` — **shipped 2026-07-23**
  (ADR 0015): `sw.js` split into `SHELL_VERSION` + `DATA_VERSION`, each its own
  cache, so a data-only menu edit refetches just `site/data/*` and no longer
  re-downloads the shell. Runtime upgrade behaviour needs a device pass (steps
  in ADR 0015). Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
