- [~] 🔎 **ADR 0090 promised a name index of the prior food databases and none
      was ever written; the exports also hold data with no store**
      `[M][data][docs]` — found 2026-09-08 by the intake audit (session
      faves-o1), which read all six files.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — owner
  authorised this one directly. Delivered by a sub-agent in its own
  worktree (`faves-o1-intake-coverage`, branch `intake-coverage`), landing by PR.

  **What is in `intake/ingredients/`** — five nutrition exports the owner
  collected before Faves, plus one chat export:

  | File | Rows | What it carries |
  |---|---:|---|
  | `all_foods_with_provenance.json` | 107 | name, category, serving size, per-serving macros, provenance, capture date |
  | `full_food_database (1).json` | 64 | the same, without provenance |
  | `mike_food_database.json` | 17 | brand, per-100 g **and** per-serving, source notes |
  | `food_database (1).json` | 9 | per-serving and per-100 g |
  | `Gemini food DB 1st 20 photos` | 19 | the richest — taxonomy, **ingredient lists**, **allergens (contains / may contain)**, macros, provenance |
  | `conversation_export_partial.json` | 9 | chat messages logging meals eaten. **Correctly excluded** — ADR 0090 rule 2 bars eating events |

  🛑 **The unkept promise.** ADR 0090 ruled the exports *"are a good **index of
  what exists**; they are not data"* and *"kept as a name index only."* **No
  such index exists in the repo.** The exports were read once, judged, and left
  in `intake/`. Verified: every brand in them that has no product record —
  Vogel's, Freya's, Fresh 'n Fruity, Nescafé, Best Foods, Big Ben, Lisa's,
  Danny's — returns **0 hits** in both `site/` and `data/`. About thirty
  branded items are named there and nowhere else, including a whole yoghurt
  line (five SKUs with full nutrition) that was never photographed.
  🔑 An accepted record describing a thing that does not exist is worse than a
  gap, because the next reader stops looking.

  🎯 **And they hold something with no home at all.** The exports carry
  **estimated nutrition for restaurant dishes at venues that are live in the
  app** — Nasi Goreng at KK Malaysian, Chicken Biryani at Spices, Combination
  Fried Rice at Takeaway @ Churton, a Pizza Hut Hawaiian. ADR 0047 governs:
  name the screen that renders it. There is none, so the payload is out.
  `data/products/` is a **packaged-product** store, so that is out too. This is
  a decision, not a tidy-up: either a store exists for third-party nutrition
  estimates about a venue's dish, or the data stays in `intake/` and the ADR
  should say so rather than promising an index.

  📋 **Options.** (1) Write the index ADR 0090 promised — a flat list of names
  with their source file, no nutrition, purely so a future session can see what
  was collected. Cheapest, and it keeps the record honest. (2) Ingest the
  packaged-product rows properly into `data/products/` where a photograph
  exists to back them, and index the rest. (3) Amend ADR 0090 to say the
  exports are kept in `intake/` and referenced nowhere, which is the truth
  today. Recommendation: **(1)**, because it costs almost nothing and it is
  what the accepted record already says was done.
