# 0145 — Faves scales by partition and fingerprint, and user data by a versioned store

**Status:** accepted, **superseded in part by
[ADR 0146](0146-the-scaling-design-revised-after-its-cold-review.md)** (its
cold review, same day) — design only; nothing here is built yet (roadmap
section `510`, Theme 39)
**Date:** 2026-09-30
**Refines:** [`240/030`](../roadmap/240-theme-16-staying-current-pwa-updates-a-manual/030-an-update-to-one-venue-should-not-redownload-them-all.md)
(one venue's update re-downloads all 57), which asked for a direction and left
the design "to be decided later". This is that decision.
**Will supersede when built:** [ADR 0015](0015-split-precache-versioning.md)'s
data half (one `DATA_VERSION`, one all-or-nothing data cache), and the
CLAUDE.md hard constraint *"precaches the app shell and all menu data"*.

## Context

The owner asked for Faves to be ready to scale in two ways (session `faves-ad`):

> *"(a) information partitioning to decide what gets downloaded at all, and (b)
> delta copies to control how much gets copied when there is a small change."*

His examples: a reader in New Zealand should not download Estonia's
restaurants, and partitions should be *"sensible, it could be a part of NZ, or
all of NZ, or some other break down that is not geographic"*. And with
thousands of venues, one menu edit plus one change to opening hours must not
re-download everything.

He set three rules that bind everything below:

1. **User data is always kept separate from application data**, *"so that a
   code update can't lose someone's data"*.
2. **Data schemas are versioned and always forward-upgradable.** Data a user
   holds today must move to any newer schema. Moving back to older code is
   **not** required.
3. **User data is partitioned too**, and personal recipes will grow like the
   published data. The first step moves some published recipes into his own
   user data. A recipe editor comes later.

**Measured 2026-09-30 against the code, not recalled:**

- **The home screen fetches every full venue file.** `loadRestaurants()`
  (`site/js/data.js:90`) loads all 57, because home search reads each menu
  (`search.js:196`) and the card counts dishes (`app.js:201`). The venue fields
  without `menu`, compressed, come to **12,274 bytes**. With menus the total is
  **164,716 bytes**. So the home screen downloads about 13× what the cards
  render.
- **A data edit re-downloads the whole data set.** Every `DATA_VERSION` bump
  opens a new, empty cache and re-fetches every venue file with
  `cache: "reload"` (`site/sw.js:264-279`, ADR 0056). The weekly exchange-rate
  refresh bumps it too.
- 🔥 **Sync lets older code delete newer data.** `mergePersonal` builds its
  output from the fields it knows about, and stamps it
  `v: mine?.v ?? theirs?.v` (`site/js/sync-merge.js:423`). Nothing refuses a
  copy written by newer code. So the first change that adds a user store (for
  example personal recipes) is erased for every device the next time a device
  still on old code syncs.
- **A backup in an older format is refused, not upgraded.**
  `site/js/personal-data.js:539`: *"which this version of Faves can no longer
  read"*. That breaks rule 2 as soon as `FORMAT_VERSION` becomes 2.
- **User data lives only in local storage**, and `navigator.storage.persist()`
  is never called. Local storage is capped at roughly 5 MB per site; that is the
  browsers' documented limit, not measured here. Browsers may also clear data
  they were not told to keep. Personal recipes will not fit.

## Decision

### Published data: four layers, with a fingerprint on every file

| Layer | Holds | When a phone fetches it |
|---|---|---|
| 1. **Catalogue** | Every partition, with its fingerprint and schema version | Always. A few KB even worldwide |
| 2. **Partition summary** | The card fields for every venue and branch in the partition, plus each venue file's fingerprint | For the reader's partitions |
| 3. **Partition search index** | Dish names and tags, for search across venues | With its summary |
| 4. **Venue file** | The full menu or recipes, as today | The reader's partitions are held offline. Anywhere else is fetched when opened, then kept |

- **A partition is any named set of venues.** It can be a region (`nz-wgn`)
  or a collection that is not geographic (Cook at Home). Regions form a
  hierarchy that **splits by size**: a region is split when its summary grows
  past a set limit and merged when it is tiny, so a partition stays a sensible
  size whether an area holds ten venues or ten thousand. The limit is chosen
  and measured in the item that builds it.
- **Download only what changed.** Files keep their **stable names**, so git
  history still reads by venue. The manifest one layer up carries each file's
  content fingerprint, and the phone fetches `<id>.json?h=<fingerprint>`. Each
  such URL is immutable, so it can be cached forever. **One permanent data
  store** on the phone replaces the per-version cache. An update fetches the
  catalogue, then the changed summaries, compares fingerprints, fetches **only
  the changed files**, switches over in one step, and then deletes files no
  longer listed. Offline never sees a half-updated set.
- **`DATA_VERSION` retires** once this lands, and with it the version clashes
  between parallel sessions and the weekly all-menus re-download.
- **No build step.** A repo tool writes the manifests and a `--check` gate
  proves they match the tree, as `gen_sbom.py` does. The files served are
  still exactly what is committed (ADR 0001).
- **The published schema is versioned.** Each manifest carries a schema
  version. Code that meets a newer major version keeps its own copy and says
  "update to see the latest". It never reads a shape it does not understand.
- **App code** can use the same fingerprint approach later. At about 1.6 MB it
  needs no partitioning, so it goes last.

### Offline scope — owner-ruled 2026-09-30: "Your partitions"

A phone holds these fully offline: its **home region**, **every partition
holding one of its favourites**, and **the region it is in now**. Any other
venue is cached once it has been viewed. This replaces "precache all menu
data" **when the partitioning item lands**. Until then the old rule stands,
because until then there is only one partition.

### User data: one versioned database, kept apart from app data

- **Kept apart mechanically, not by care.** User data lives **only** in
  IndexedDB, in one database named `faves-user`. App data lives **only** in the
  service worker's caches, which updates delete and rebuild. No code path lets
  an app update write to or delete from user storage, and a test holds that
  line. The app asks for persistent storage (`navigator.storage.persist()`).
- **Everything moves, not only recipes** — owner-ruled 2026-09-30: *"Move
  everything"*. One storage engine means one schema version, and every upgrade
  runs as one IndexedDB transaction. Split across two engines, no upgrade could
  be atomic.
- **Forward upgrades are guaranteed by tests, not promised.**
  - One `userSchema` number. A chain of steps upgrades 1→2→3… at startup,
    before any store is read.
  - **The pre-upgrade data is snapshotted first**, and the snapshot is kept
    until the upgraded version has run successfully.
  - **A sample data set from every past version is kept forever** under
    `tests/fixtures/`, and CI upgrades each one to the current version.
  - Backup import and sync both run through the same chain.
- **Partitions (object stores):** `meta`, `profiles`, `settings`,
  `favourites`, `ratings`, `notes`, `checklist`, the device-level stores that
  live in local storage today (order, shopping, timers), `recipes` (one record
  per recipe), and later `recipe-media`.
- **Personal recipes use the published recipe's shape**, so one recipe page
  renders both. Their ids carry a `u:` prefix so they can never collide with a
  published id. The first move, from published to his own, is a one-off import
  through the upgrade and import path.
- **Sync splits the same way.** Each partition gets its own encrypted copy on
  the server, its own version stamp and its own "last agreed" copy, so a heart
  uploads favourites and not every recipe. Recipes go in a fixed number of
  buckets keyed by a hash of the recipe id. One copy per recipe would tell the
  server how many recipes a person has. **Sync refuses to write a copy made by
  newer code** and tells the person to update.

### Build order — owner-ruled 2026-09-30: "record the design first"

| Phase | Item | What it delivers |
|---|---|---|
| 0 | `510/010` | Sync refuses newer copies; backups upgrade instead of being refused; persistent storage requested |
| 1 | `510/020` | Summaries and search index split out; the home screen reads summaries only |
| 2 | `510/030` | Fingerprint manifests, the permanent data store, download only what changed; `DATA_VERSION` retires |
| 3 | `510/040` | The `faves-user` database, the upgrade chain and the past-version fixtures |
| 4 | `510/050` | Personal recipes (import only) and sync split by partition |
| 5 | `510/060` | Region partitions, and choosing which partitions a phone holds |

Phase 0 is first because it stops data loss before any schema change can
cause it.

## Rejected

- **Content-fingerprinted filenames** (`simmer.3f9a2c.json`). Every edit would
  rename the file, and git history would stop reading by venue. A fingerprint
  in the query string gives the same immutable URL, and the file keeps its
  name.
- **Keep one version and rely on browser revalidation** (`no-cache` in place
  of `reload`). This brought back the stale-copy failure ADR 0056 exists to
  prevent, and a phone's browser cache may already have evicted the file, so
  the saving is not dependable.
- **Every summary offline, menus for your partitions only.** Offered to the
  owner and declined. The summaries grow with the whole world at about 215 B
  per venue.
- **Keep "all data offline" and do only the deltas.** Offered and declined.
  It fails the Estonia case.
- **IndexedDB for recipes only.** Offered and declined. Two engines mean two
  version schemes, and no upgrade could be atomic.
- **One sync copy per recipe.** This tells the server how many recipes a
  person has, and ADR 0017's server must learn nothing it cannot help learning.
- **Timestamps for sync conflicts** is not reopened here. ADR 0060 still
  governs how a single partition merges.

## Consequences

- The CLAUDE.md offline constraint carries a dated pointer to this record. Its
  text changes when `510/060` lands, not before.
- `tools/check_versions.py` and the lockstep rule "a bump is what tells phones"
  change with `510/030`. Until then they stand exactly as written.
- `240/030` is closed as refined into this design; its measurements stay
  there as evidence.
- Every phase is its own item. Phase 0 needs no further ruling, and each later
  phase states what it measured before it changes a hard rule.

## Addendum — 2026-09-30: every choice here is a balance of four costs

Added by the owner the same day, after the design was recorded:

> *"There is a balance achieved in all of this to offset the cost of
> processing power used, storage consumed, and network traffic to keep Faves
> both performant and extensible."*

So no phase optimises one cost alone. The four costs:

| Cost | Measured as |
|---|---|
| **Processing** | Main-thread time on a phone, at startup and on update (parsing, fingerprint comparison, upgrades, merges) |
| **Storage** | Bytes held on the device: the service worker's caches plus `faves-user` |
| **Network** | Bytes transferred **and** the number of requests, first visit and per update |
| **Server** | Workers KV reads and writes, measured against the free tier ADR 0017 names as the scarce resource |

**Where the design already trades them, stated so that each dial is set by
measurement and not by habit:**

- **Partition size.** Bigger partitions mean fewer requests but more bytes you
  did not need; smaller ones the reverse. Hence a size-based split with a
  measured limit, not a fixed geography.
- **One file per venue.** The smallest possible update, but one request per
  changed venue. If an update ever touches many venues at once, fetching them
  as one bundled file may win; measure it first.
- **Summary plus search index.** Costs a little storage twice over (a dish
  name sits in the index and in its venue file) to save fetching and parsing
  every menu on the home screen.
- **Offline scope.** "Your partitions" trades storage against usefulness in
  flight mode; the owner ruled it.
- **Sync buckets for recipes.** Fewer buckets mean fewer KV writes but a larger
  upload per edit; more buckets the reverse. Set the number from measured
  recipe sizes.
- **Pre-upgrade snapshot.** Briefly doubles user storage during an upgrade, in
  exchange for a guarantee that an upgrade cannot lose data. Deleted once the
  upgraded version has run successfully, so the cost is temporary.

**The rule for every item in section `510`:** measure the four costs before
and after the change, and record the numbers in the item. A change that
improves one cost by making another worse states that trade and why it pays.
