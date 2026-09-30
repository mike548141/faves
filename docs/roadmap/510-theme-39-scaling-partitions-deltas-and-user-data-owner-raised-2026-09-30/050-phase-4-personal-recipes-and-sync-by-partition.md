- [ ] **Phase 4 — personal recipes, and recipe buckets in sync** `[L]
      [data][sync][recipes]` — owner-raised 2026-09-30, revised the same day
      by [ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md). Needs `010` and `040`.

  **Build:**
  - A `recipes` store, one record per recipe, in the published recipe shape
    with a `u:` id prefix. The recipe page renders both kinds. Local storage
    until `080` moves it.
  - A one-off import moves the recipes the owner names from Cook at Home into
    his user data. **Which recipes is his list to give.** A move map carries
    their hearts, ratings, notes and ticks to the `u:` ids. Published copies
    leave `site/data/` by the ADR 0047 route.
  - Sync (owner-ruled **"Core copy + recipe buckets"**): the core copy stays one
    all-or-nothing write. Recipes go in a fixed number of buckets stored as
    `<blobId>:r<n>`; the Worker resets the expiry of every copy under a user
    key on any write, and the core copy records each bucket's version.
  - Measure recipe sizes to set the bucket count, and whether bucket sizes
    need padding.

  No editor in this item; it comes later.
