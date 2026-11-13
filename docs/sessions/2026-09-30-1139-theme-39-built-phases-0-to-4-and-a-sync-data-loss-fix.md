## 2026-09-30 — Theme 39 built: phases 0 to 4, and a sync data-loss fix (session `faves-0b`)

An orchestrated queue run over roadmap section `510`, on Opus 5.5, with Opus
and Sonnet workers in worktrees. Atelier had not moved past the pin
(`86da02c`).

- **Shipped (each merged by PR with CI green):** `010` and `070` (PR #54):
  older code carries unknown data through, older backups upgrade, a lost
  race retries, and reconnecting syncs. `020` (#55): the home screen reads
  a summary and a search index, 204,600 → 122,636 B gzip and 59 → 3
  requests. `040` and `090` (#56): one `USER_SCHEMA`, an upgrade chain run
  before any store is read, a pre-upgrade snapshot, a declined storage
  request is remembered, and a paused sync has its own label. `030` (#57):
  one permanent data store keyed by fingerprint, `DATA_VERSION` retired, and
  an update after two venue edits costs 4 requests (about 15.6 KB), not 61
  (about 327 KB). `050` (#58): personal recipes and recipe buckets in sync,
  less the import. `100` (#59): see below.
- 🔥 **A real sync data-loss bug, found and fixed (`510/100`).** Editing on
  one device while its sync was in flight recorded a merge this device never
  applied as the agreed base. The next sync then deleted the other device's
  changes on **both** devices, allergen flags included. The `050` worker
  found it by reading the code. Four new tests failed on `main` before the
  fix, and the break-probe fails the same four.
- **`020` was sent back once.** Its first cut shipped every dish's identity
  twice and made home **heavier** (216,751 B). Redone, it came out 40%
  lighter. ADR 0146's 51–60 KB estimate was not reached: the search text
  alone is about 116 KB, and the worker kept search whole rather than trim
  it.
- **`main` went red on a browser check, and I fixed it (`e4993f1`).**
  `midnight_check` patches the venue file to stage a missing day, and after
  `020` the home card no longer reads that file. Bisected to the `020` merge.
  The brief had not named the check; lesson in memory (the brief is the
  gate).
- **Recorded:** ADR 0147 (reads come from the phone's store, and every
  download is checked against its fingerprint). `cook_check` failed 82/84
  once, in a sweep at load about 9, then passed 84/84 three times; the
  failure names were not captured.
- **Open with the owner:** `050`'s import (his recipe list, the three forks
  in the item, and the Worker deploy); `030`'s freshness trade (ADR 0147);
  `040`'s three forks on the upgrade chain; and how `080`'s storage
  threshold gets measured on real devices. `060` stays deferred until a
  second region exists.
- **Addendum, 2026-10-01, after the owner's rulings.** He ruled: the Worker
  deploys with the import; keep the freshness trade (ADR 0147); an old tab
  stops writing once storage is upgraded; the cookbook is per person. The
  last two were built and merged (PR #60, `510/110` and `510/120`). The full
  browser sweep and 1,621 unit tests passed, and each guard was
  break-probed. 🚩 `STORE_SCHEMA.recipes` is now 2, so a device on a build
  from the last day pauses sync with "Update Faves" until it reloads. That
  is the designed behaviour, and no device holds a recipe yet. A new fork
  about who receives imported recipes on a shared phone is in `050`.

