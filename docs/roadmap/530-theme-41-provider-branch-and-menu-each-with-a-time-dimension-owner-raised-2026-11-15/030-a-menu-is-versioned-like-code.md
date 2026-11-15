- [ ] **A menu is versioned like code**
      `[L][schema][data]` — owner-raised 2026-11-15: *"The dishes on the menu
      will change over time (like code in git gets versioned as it chagnes)
      as cooking style and ingredients of dishes are alterered, or dishes are
      added and remove, and things like prices, options, serving ssizes all
      change."* Nothing built.

  **What is versioned today** (ARCHITECTURE.md § *Refreshing a menu*):
  - a **price** the shop changed — the old one is appended to
    `data/history/prices/` (ADR 0047);
  - a **departed dish** — moved whole to `data/history/dishes/`;
  - a **rename** — the `dishId` never moves, and `formerIds` keep old ids
    resolving (ADR 0051, 0153).

  **What is not:** a changed description, ingredient list, option, add-on or
  serving size is overwritten, so what the dish *was* is lost (only git
  history holds it, and nothing reads that). The "did the shop change it, or
  did we?" test already separates a change from a correction; it just has
  nowhere to put a change that is not a price.

  **Direction to weigh:** one dated revision per dish in the record store —
  the whole dish as it stood, with the date it was read — so any field can
  be compared across readings, rather than a history file per field. The
  payload keeps only the current revision (ADR 0047).
