# 0146 — The scaling design, revised after its cold review

**Status:** accepted — design only; nothing built
**Date:** 2026-09-30
**Supersedes in part:** [ADR 0145](0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md)
— the parts named below. Everything else in 0145 stands, including its
addendum on the four costs.
**Amends:** [ADR 0127](0127-a-settings-field-a-build-cannot-name-is-carried-not-dropped.md)(b)
— see "Older code".

## Context

A cold review of ADR 0145 ran the same day, on a model that was not its author
and with none of the author's conclusions:
[the review](../reviews/2026-09-30-0639-adr-0145-cold-review.md). It found two
blockers and six majors. The authoring session opened the key rows at source,
and they hold. One changes an owner ruling, because the ruling rested on it:
**personal recipes do fit in local storage** (about 1,650 bytes each, so more
than a thousand in about 5 MB). 0145 said they would not.

The owner ruled three forks after being re-briefed, all on 2026-09-30.

## Decision

### 1. IndexedDB: the move is deferred, not split — owner-ruled "Defer the move"

- **Build the engine-independent half now, on local storage:** the
  `userSchema` number, the upgrade chain run at startup, the pre-upgrade
  snapshot, and a sample data set for every past version, upgraded in CI.
- **Move everything to IndexedDB in one go** when recipe photos arrive, or when
  measured storage use passes a threshold that `510/040` sets. His "move
  everything, never split" intent stands; only the timing changed.
- That move must then handle what the review found (M2, M3): close on
  `versionchange` from the first build that opens the database, replace the
  `storage` event for cross-tab repaint, and never lose a write the page made
  before it was killed.
- **One version number.** `FORMAT_VERSION` becomes `userSchema`; backups, the
  sync copy and the sync base snapshot all carry it and all run through the
  chain.

### 2. Sync shape — owner-ruled "Core copy + recipe buckets"

- **One core copy** holds every small store tied to a profile: profiles,
  settings, favourites, ratings, notes. It is written all-or-nothing, exactly
  as today, so a heart still costs one read and one write.
- **Only recipes split**, into a fixed number of buckets. A bucket is stored
  under the **same user key** as the core copy (`<blobId>:r<n>`), so the Worker
  resets the expiry of every copy under that key on any write (fixes B1). The
  core copy records each bucket's version, so a bucket written without its core
  update is detectable (fixes B2 for the one split that remains).
- The server learns only that "a recipe bucket changed" (M6). Padding bucket
  sizes is left to `510/050` to measure.

### 3. Older code — owner-ruled "Carry unknown data through"

- A device carries **every store it does not understand** through a sync
  untouched, as ADR 0127 already does for an unknown setting. It keeps syncing
  and destroys nothing.
- It pauses sync and says "Update Faves to keep syncing" **only when a store
  it does know has changed shape**, which the store's own schema number
  records.
- **This amends ADR 0127(b).** 0127 recorded that an unknown store "simply
  never syncs … nothing is destroyed". That holds only for the device that owns
  the store. The other direction destroys data: an old device writes the server
  copy without the new store, and the newer device's three-way merge then reads
  the missing store as a deletion, both locally and on the server.

### 4. Corrections the review forced, which need no ruling

- **Numbers.** As a phone fetches them, the 57 venue files come to about
  **204–208 KB** gzip, not 164,716 B. The home screen's honest saving is about
  **3×** (51–60 KB), because search keeps reading ingredients.
- **Phase 1** summaries carry the price band and dish ids (for the price chip
  and for heart resolution). The search index keeps ingredients, attribution
  and order number. Summaries are built through `load()`, so dated fields
  resolve. `index.json` stays until `recheckReferences` and
  `check_fallback.py` move off it.
- **Fingerprinted URLs are not immutable on the server** (`site/_headers`
  matches paths, not query strings). What makes fetching only changed files
  work is the phone's own store keyed by fingerprint, not HTTP caching.
- **Phase 2 names its switch-over mechanism**: write the new files beside the
  old ones, then swap one pointer record last; anything half-written is
  unreachable and cleared on the next start. Cache-busted rechecks are
  excluded from the store, and orphans are deleted after each swap.
- **Moved recipes carry their hearts, ratings, notes and ticks** through a
  move map (like `renames.js`, but from a venue dish id to a `u:` id).
- **Storage persistence** is requested, but a Safari browser tab can still be
  cleared; only a Home Screen install is exempt (platform behaviour, inferred
  and not measured here). About says which applies.
- **"Home region"** falls back to the region of the person's favourites when
  location was declined (ADR 0083).
- **The separation test tests the pages, not the worker.** An app update may
  change user data only through the upgrade chain and the named import modes;
  a test lists every module that writes user storage and fails when a new one
  appears.
- **Two sync bugs are filed** as `510/070`: a refused write is never retried,
  and nothing syncs when the device comes back online.

## Rejected

- **Move everything to IndexedDB now.** Re-briefed and declined: it pays the
  async refactor, the version-change blocking and a replacement for cross-tab
  repaint before anything needs them.
- **One sync copy per store.** Declined: expiry of quiet stores, no
  all-or-nothing write, an extra server write per push for an index, and the
  server learns which kind of data changed.
- **Always pause sync on newer data.** Declined: a household's un-updated phone
  would stop syncing at every schema change, while most changes only add a
  store.

## Consequences

- `510/040` becomes "the upgrade chain on local storage". The IndexedDB move is
  its own item, `510/080`, triggered by photos or a measured threshold.
- `510/010` implements the carry-through and the shape-change pause, not a
  blanket refusal. The test at `tests/personal-data.test.js:327` that asserts
  the old refusal flips in the same commit.
