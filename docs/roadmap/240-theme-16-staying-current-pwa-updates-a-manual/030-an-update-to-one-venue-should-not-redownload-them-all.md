- [x] ✅ **An update to one venue should not re-download every venue** `[L]
      [design][pwa]` — owner-raised 2026-09-29 (session faves-ec). Direction
      only; the design is to be decided later.

  **The brief, in his words:** *"We will probably need to consider how we
  segment the data set further so that an update to one part does not require
  a user to download the entire data set. For example we might make each
  restaurant its own versioned data set perhaps — that is to be decided
  later."*

  **How it works as at 2026-09-29 (read from `site/sw.js`).** ADR 0015 split
  the app from its data: one `SHELL_VERSION` and one `DATA_VERSION`, each its
  own cache. But the data cache is all or nothing. It holds `site/data/index.json`
  and every `site/data/restaurants/<id>.json`, so **any** menu edit bumps
  `DATA_VERSION` and every installed phone re-fetches all 57 files (the
  precache uses `cache: "reload"`, so the browser's own cache does not help).

  **What that costs, measured 2026-09-29.** `site/data/` is 1.7 MB on disk and
  about **196 KB gzipped** in total (a tar+gzip of the directory, which is an
  estimate of the transfer, not a measurement of one). 48 commits touched
  `site/data/` since 2026-09-01.

  **Why it will matter more.** Venue ingredients
  ([`110/070`](../110-theme-5-richer-dish-data/070-a-venue-dish-records-its-ingredients.md))
  and nutrition
  ([`120/010`](../120-theme-6-north-star-the-health-tie-in/010-nutrition-for-every-dish-recipe-and-serving.md))
  would both enlarge the per-venue files that all get re-fetched.

  **Shapes to weigh later (not recommended yet):**
  - **Per-venue versions:** the index carries each venue's version or hash,
    and the service worker re-fetches only the files whose version changed.
    This is the owner's example.
  - **Content-hashed file names:** `<id>.<hash>.json`, so a changed venue is a
    new URL and an unchanged one is never re-fetched.
  - **Tiers:** the menus a reader has opened or hearted refresh eagerly, and
    the rest lazily.
  All three still need `tools/check_versions.py` and the
  "a bump is what tells phones" rule in CLAUDE.md to change with them.

  ✅ **Closed 2026-09-30: refined into a decided design** (session `faves-ad`).
  The owner widened the ask to partitioning and user data, and ruled on the
  design: [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).
  The work owed here now lives in
  [`510/030`](../510-theme-39-scaling-partitions-deltas-and-user-data-owner-raised-2026-09-30/030-phase-2-fetch-only-what-changed.md),
  which takes the first shape above (a fingerprint per venue in the manifest)
  and keeps file names stable, rejecting the second. The measurements above
  stay as evidence.
