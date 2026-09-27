- [ ] 🎯 **A photo for every item, eventually — OWNER GOAL 2026-09-28, not a
  build order** `[XL][content]` — said while answering 340/250's import
  question: *"I do want photos in the app for every item eventually."*
  Recorded as a direction. Nothing here is claimable until he says how
  photos are to be sourced.

  🔑 **This goal and 340/250's import are two different kinds of photo.**
  They were easy to conflate, so the numbers are kept side by side here
  (measured 2026-09-28, `b04f674`).

  | | **Evidence** (340/250) | **Display** (this goal) |
  |---|---|---|
  | What it shows | Menu boards, leaflets, product labels | The dish itself |
  | Where it lives | `intake/`, then `data/` if imported; never shipped | `site/img/`, shipped to phones |
  | Resolution | Full, so handwriting stays legible | Resized WebP |
  | Today | 410 files, ≈1.84 GB stripped | 42 files, 1.3 MB, avg 31 KB |

  🛑 **Committing the intake does not move this goal at all.** Its 410
  photographs are menus and packaged products, not plated dishes.

  **What "every item" would cost, as an estimate, not a measurement:**
  - The corpus is 3,507 dishes. At today's 31 KB average that is roughly
    **110 MB** of display images, which is about 6% of the evidence import.
  - The binding constraint is the **source** of each photo, not bytes.
    ADR 0053 requires that a photo of a named product IS that product, and
    every shipped image carries a provenance row in `data/images/` that
    `check_records.py` enforces.
  - Today's 42 come from two places, both with recorded provenance: a
    chain's own site (McDonald's, 41) and one credited recipe publisher
    (Whittaker's, 1).

  🎯 **What unblocks it is one ruling.** Where may dish photos come from?
  The options are the owner's own photos, venues' own published images
  (ADR 0053's rules), or both. Every other design choice follows from
  that. ADR 0047's precache test (name the screen that renders it) and
  ADR 0128's location gate already apply to anything added under `site/img/`.
