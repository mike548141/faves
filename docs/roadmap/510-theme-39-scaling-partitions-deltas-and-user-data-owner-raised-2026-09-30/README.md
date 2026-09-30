# Theme 39 — scaling: partitions, deltas and user data (owner-raised 2026-09-30)

**His brief (session `faves-ad`), in his words:** *"I am looking for
efficiencies so that Faves is ready to be scaled over time in (a) information
partitioning to decide what gets downloaded at all, and (b) delta copies to
control how much gets copied when there is a small change."* He also set three
rules: user data is always kept separate from app data, *"so that a code update
can't lose someone's data"*; schemas are versioned and always
forward-upgradable, with no requirement to move back to older code; and user
data is partitioned too, because personal recipes will grow like the published
data.

**The design is [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).**
The owner ruled on three forks the same day: offline scope becomes **"your
partitions"**, **all** user data moves to IndexedDB, and the design is
**recorded before anything is built**. This section is the build order, one
item per phase. Phase 0 is first because it stops data loss before any schema
change can cause it.

It refines [`240/030`](../240-theme-16-staying-current-pwa-updates-a-manual/030-an-update-to-one-venue-should-not-redownload-them-all.md),
which is closed into `030` here.

**Every phase balances four costs** (owner, 2026-09-30): processing, storage,
network and server. Each item records all four before and after its change,
and names any trade it makes. The costs and the trades already in the design
are in [ADR 0145's addendum](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md#addendum--2026-09-30-every-choice-here-is-a-balance-of-four-costs).
