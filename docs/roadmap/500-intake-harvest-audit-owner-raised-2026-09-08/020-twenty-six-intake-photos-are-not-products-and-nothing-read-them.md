- [~] 🔎 **Twenty-six of the 183 pantry photographs are not products — they are
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

  📌 **CLAIMED 2026-09-08 21:46 UTC (session faves-p1) — the `b029` half only.**
  Reading the two 2025-11-25 leaflet frames and settling whether their 82
  prices are a price layer this repo threw away, against Takeaway @ Churton's
  2019 scan and its 2026-08-08 reading. The recipe half (the six recipes that
  shared a page) stays the owner's call and is **not** claimed. ADR 0112
  reserved if the answer needs one.

  ---

  ✅ **`b029` DELIVERED 2026-09-09 (session faves-p1) — ADR 0112.** Worktree
  `/Users/mike/worktrees/faves-p1-churton-leaflet`, branch
  `p1-churton-leaflet`, based on `main@cbfca81`. The recipe half is untouched
  and still the owner's; the item stays `- [~]`.

  🎉 **The question is answered and the answer is NO — nothing was thrown
  away.** All **179** priced dishes on the leaflet match the layer the record
  already held **to the cent**: 179 identical, **0 differ**, and no dish is in
  one layer and not the other. Against the current 2026-08-08 record, **174**
  prices have moved, **5** dishes have gone (exactly the five already in
  `data/history/dishes/`, which b029 independently corroborates — on the
  leaflet, gone by 2026-08-08) and **9** dishes are new since it.

  🚩 **Two corrections to this item's own description of `b029`, both
  measured.** The table above says *"82 numbered dishes with prices"*; that is
  **one side**. The leaflet carries **180 dishes, 179 priced** — 82 numbered
  Chinese items on side 1 (`IMG_7234`) and **98 unnumbered** fish-and-chip,
  burger, wrap, sandwich and pack items on side 2 (`IMG_7235`); Bluff Oysters
  is *"available during seasons"* and unpriced. The audit read the frames but
  could not crop, so it counted the side that numbers itself. Second, the
  frames are dated `2025-11-25T20:36:16+13:00` and `…:20`, Apple iPhone 14 Pro,
  iOS 26.1 — re-read off the files, not inherited.

  🔎 **The real finding is a DATE, not a price.** Answering the question meant
  opening the venue's *other* evidence for the first time, and the layer the
  leaflet matches is **misdated**. Its 179 entries said `recorded: "2019"`,
  `note: "2019 menu scan"`. They were transcribed on **2026-07-06** from
  `menu 2.pdf`. Four lines, each checkable:

  | | Evidence |
  |---|---|
  | The 2019 photos are **not a menu** | `IMG_2689`/`IMG_2690` (2019-06-04, iPhone 7) are in-store counter shots — laminated pack cards and three kids-pack cards. **Seven** dishes' prices between them. Cannot be the source of 179 |
  | When the prices **entered the repo** | `1ba220f`, 2026-07-06, *"Transcribe menus (Spices, Takeaway, Thai Tara)"* — 180 dishes, 179 priced, `verified: null` |
  | `menu 2.pdf` **is** the leaflet | `/CreationDate D:20260706181009+12'00'`, 2 pages, `DCTDecode`, no text layer, 3512×2488. Same layout, same 82 numbered items, same typos as b029 — *"Pineapple Fritterb"*, *"Cinnemon Donut"*, *"Corn Frtitter"*, *"Lecttuce"*, *"Prawn Culet"*, *"Meduim"* |
  | The **multisets are equal** | the 179 prices at `1ba220f` and the 179 on the leaflet are the same multiset, not merely the same range |

  The date was attributed at `816cb7e`, the ADR 0023 retrofit: it mined the
  values from git correctly, then dated them from the only *other* file in the
  folder. **One folder was read as one document.**

  ✅ **Corrected under ARCHITECTURE refresh rule 5** — *did the shop change it,
  or did we?* We did ⇒ overwrite, add no entry. 174 entries in
  `data/history/prices/` and 5 in `data/history/dishes/` go `2019` →
  `2026-07-06`. **Entry count unchanged at 179**, which is why
  `check_append_only` — it counts entries — passes an honest redate by design.
  The **seven** dishes the 2019 photographs genuinely show keep that fact in
  words (`family-pack-1/2/3`, `seafood-pack`, `calamari-pack`,
  `fish-burger-pack`, `kids-packs`).

  🔑 **What it buys: the window on Churton's price rise goes from seven years
  to five weeks.** Wonton Soup $10.50 → $17.50 did not happen "somewhere in
  2019–2026"; it happened between **2026-07-06** and **2026-08-08**, with
  b029 showing the $10.50 still in print on 2025-11-25. No price value moved.

  🚩 **It also removes a premise ADR 0023 leaned on.** Its *Alternatives
  rejected* declines full-precision dates because *"the Churton scan is dated
  only 2019"* — the corpus's one cited loosely-dated reading, and it was not
  real. The corpus now holds **no** reduced-precision `recorded` date.
  0023 is Accepted and was **not** edited; 0112 corrects the fact, not the
  decision.

  **`verified` / `verifiedBy` unchanged, and ADR 0107 is why.** `verified` may
  not be fresher than its evidence — these frames are **older** than the
  record's 2026-08-08 reading, and an older document cannot date a newer one.
  `paper-menu` also stands. (`intake_exif.py` suggests `in-store` for these
  two: a heuristic on "photograph + GPS". It is a leaflet on a kitchen bench,
  and the images outrank the suggestion.)

  **Nothing under `site/data/` changed** — the string `2019` appears nowhere in
  the payload — so **no `DATA_VERSION` bump was owed** and `SHELL_VERSION` was
  not touched.

  🔒 **Privacy.** Both frames carry a GPS fix on a **private address**, not the
  shop. No coordinate and no distance is recorded in this repo or computed for
  this report; `--near` was deliberately not run on them. The frames show a
  person's feet on a kitchen floor and nothing else personal — no name, no
  handwriting, no private number transcribed. The only phone number is the
  business's, already in the record.

  **Found and left alone:** `menu 2.pdf` page 1 carries a **handwritten**
  *"Rice Noodles"* under item 78 that the 2026-07-06 transcription did not
  pick up; `rice-noodles` reached the record later, at the 2026-08-08 refresh,
  with no 2019 history. Noted, not acted on.

  **Verified** (all from inside the worktree, tree line read on each):
  `validate.py` · `seed_dish_ids.py --check` · `seed_section_ids.py --check` ·
  `seed_branch_ids.py --check` · `split_data.py --check` ·
  `test_split_data.py` · `check_provenance.py` · `check_records.py` ·
  `check_no_deps.py` · `check_fallback.py` ·
  `check_versions.py --range origin/main..HEAD` · `node --test` ·
  `boot_check.mjs`.
