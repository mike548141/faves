- [ ] **Phase 5 — region partitions, and "your partitions" offline** `[L]
      [data][pwa][geo]` — owner-raised 2026-09-30, owner-ruled the same day:
      offline scope is **"Your partitions"**.
      [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).

  **Deferred until a second region exists**, because with one region every
  phone holds everything anyway.

  **Build:**
  - Partitions form a region hierarchy that splits by size, with non-geographic
    collections alongside. Measure, then set, the size limit for a summary.
  - A phone holds its home region, every partition holding one of its
    favourites, and the region it is in now; anything else is cached once
    viewed.
  - The CLAUDE.md hard constraint "precaches … all menu data" is reworded in
    the same commit.

  **Revised 2026-09-30 by ADR 0146:** with location declined (ADR 0083), "home
  region" falls back to the region holding the person's favourites.
