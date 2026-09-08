- [ ] 🔎 **Twenty-six of the 183 pantry photographs are not products — they are
      recipes and a menu leaflet, and no record cites any of them**
      `[M][content][data]` — found 2026-09-08 by the intake audit (session
      faves-o1), which read all 26 images.

  **How it hid.** ADR 0090 harvested `intake/ingredients/raw_food_photos/` as a
  pantry: 183 photographs, 59 bursts, 87 product records. Its *Consequences*
  say *"nothing unplaced"*, which is true and means unplaced **in a burst** —
  not uncited by a record. **15 bursts carry no product record**, and reading
  their images shows why: they are not products.

  | Burst(s) | Files | What they actually are |
  |---|---:|---|
  | `b003` | 3 | One cookbook page (p.207), three frames |
  | `b029` | 2 | **Takeaway @ Churton printed menu leaflet**, both sides, 2025-11-25, 82 numbered dishes with prices |
  | `b030`–`b042` | 21 | The owner's recipe notebook and loose sheets, page by page — 19 distinct recipes |

  ✅ **All 19 notebook recipes are already in Cook at Home**, having arrived
  separately through `intake/recipes/`. So the photographs are near-duplicates
  — **except for what shares the page with them.**

  🎯 **Recipes handed over and not in the app**, because a page holds four
  recipes and only one was wanted at the time:
  **Baked Apples**, **Baked Custard**, **Bread and Butter Pudding** (same page
  as the shipped Chocolate Self-Saucing Pudding); **Raspberry Delights** (same
  page as Queen Cakes); an untitled jam/walnut/meringue slice whose title sits
  above the frame; and an untitled second jotting under Ginger Bread cookies.
  🔑 CLAUDE.md's own rule settles whether they are in scope: *"whatever
  food/dishes I give you are to be included"*. These were given — they just
  arrived attached to a page. **Whether to transcribe them is still his call**,
  because a recipe he did not mean to hand over is not a recipe he wants
  published under his name.

  ⏳ **`b029` is the one nobody can settle from the record.** Two frames dated
  2025-11-25 sit between Takeaway @ Churton's 2019 scan (already in
  `data/history/prices/`) and its 2026-08-08 reading. Whether their 82 prices
  differ from either is **unknown** — the audit was read-only and could not crop
  to read them. If they differ, that is a **price layer this repo threw away**,
  which is exactly what ADR 0023's history store exists to prevent.

  **Also found:** `IMG_7562` (b053) and `IMG_8118` (b059) sit inside harvested
  bursts but are absent from their product's `source.files`.
