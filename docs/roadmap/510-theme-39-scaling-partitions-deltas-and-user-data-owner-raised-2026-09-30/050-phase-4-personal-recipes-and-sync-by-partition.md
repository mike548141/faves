- [ ] **Phase 4 — personal recipes, and sync by partition** `[L]
      [data][sync][recipes]` — owner-raised 2026-09-30,
      [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).
      Needs `010` and `040`.

  **Build:**
  - A `recipes` store, one record per recipe, in the published recipe shape
    with a `u:` id prefix. The recipe page renders both kinds.
  - A one-off import moves the recipes the owner names from Cook at Home into
    his user data. **Which recipes is his list to give.** Their published
    copies then leave `site/data/` by the ADR 0047 route, not by deletion.
  - Sync splits into one encrypted copy per partition, each with its own
    version stamp and "last agreed" copy. Recipes go in a fixed number of
    buckets keyed by a hash of the recipe id.

  No editor in this item; it comes later.
