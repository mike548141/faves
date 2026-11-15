- [ ] **A branch has a kind: mobile, temporary or permanent**
      `[M][schema][ux]` — owner-raised 2026-11-15: *"Branch a LOCATION which
      can be mobile (like a food truck), temporary (opened with the
      intention of closing it again soon even if you dont know the date it
      will be closed like a pop up restaurant), or permanent (nothing is
      truly permanent but its there until tis not)."* Nothing built.

  **What each kind changes:**
  - **Permanent** — today's branch. Its `lifecycle` already records a
    closure when one happens (ADR 0132).
  - **Temporary** — a pop-up. It has an opening and an *intended* end that
    may be undated. A card can say "pop-up", and a refresh can ask whether
    it is still there sooner than for a permanent branch.
  - **Mobile** — a truck. Where it is comes from dated spots (`520/010`:
    sighting, announced or booked, schedule), not from an address.

  **The Food truck option in the Dining filter is a stand-in for this.** It
  reads the `food-truck` vibe today (`520/050`); once a branch carries
  `mobile`, the option reads the branch instead and the vibe can retire.
  Default when absent: permanent, so no current file changes.
