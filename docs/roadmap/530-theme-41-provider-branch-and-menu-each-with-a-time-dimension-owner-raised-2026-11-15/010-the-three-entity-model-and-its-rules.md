- [ ] **The three-entity model and its rules, as one ADR**
      `[L][schema][design]` — owner-raised 2026-11-15 (the theme README holds
      his words). ⚑ Owner's go to write the ADR; nothing built.

  **What the ADR must state, from his message:**
  - **Provider** — the organisation, typically a registered company.
  - **Branch** — a location belonging to one provider: mobile, temporary or
    permanent (`020`).
  - **Menu** — a collection of dishes and drinks belonging to one provider,
    versioned as it changes (`030`), and available on a pattern: time of
    day, days of the week, season.
  - **Invariant:** a provider has at least one branch and at least one menu.
  - **Time on all three**, and availability changed by sightings,
    announcements and recurring schedules (`520/010`, ruled 2026-11-15) —
    one availability model, used by branches and menus alike, rather than
    one per entity.
  - **The join:** which menus a branch serves, and when. This is what lets
    Rock Yard's truck be a branch of the restaurant with its own menu
    (`520/040` Gap 2, ruled the same day) and what Theme 30 (`370`) calls
    menus, plural.
  - **A meal is not a menu** — his distinction: a meal is the dishes you
    chose for one dining experience. The order tally (Theme 1) is the
    nearest existing object; the ADR should say how they relate rather than
    invent a second one.

  **Recommendation: write the ADR before any schema change, then migrate in
  stages that leave every current file valid** — the way ADR 0003 and ADR
  0155 grew the venue shape. Today's single-file venue is the degenerate
  case (one provider, one branch, one menu), so nothing has to move at once,
  and every phone keeps working through each stage. The first stage worth
  building is the branch–menu join, because a real record (Rock Yard's
  truck) is waiting on it.

  🔗 Rests on ADR 0011 (branches), 0047 (payload vs record), 0051 (dish ids),
  0103 (branch ids), 0155 (the Anywhere branch); folds in `370`, `520/010`,
  `470/050`.
