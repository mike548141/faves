- [ ] 🔎 **A complete menu carries no `verified` date, and three older menu
      photo sets have no price history** `[S][data]` — found 2026-09-08 by the
      intake audit (session faves-o1). **(a) delivered 2026-09-08; (b) KC Cafe
      delivered 2026-09-20; R&S and Spices still owed** — see the notes at the
      foot.

  ✅ **(b) KC CAFE DELIVERED 2026-09-20 (session `3e87e0bf`, orchestrated queue
  run).** Branch `kc-price-history`, worktree
  `/Users/mike/worktrees/faves-kc-history`, data commit `5b9a09b` (parent
  `origin/main@52709a9`). `data/history/prices/kc-cafe.json` now exists and
  holds **136 superseded price entries** read off the shop's own boards on
  2015-09-29. `DATA_VERSION` → `2026-09-20.1`.

  🚩 **The claim above said "9 photographs dated 2015-09-29 plus a PDF". Two
  halves of that were wrong, and `intake_exif.py` says so.** The folder holds
  **ten** files, and among the nine JPEGs there are only **six distinct
  photographs**: `2015-09-29 21.58.40/.58/21.59.34.jpeg` carry the *same*
  `DateTimeOriginal` to the second, the same GPS fix and the same byte-length
  as `IMG_0636/0637/0638` — they are re-saved duplicates, differing only in
  stored orientation. And `IMG_0327 (1).jpeg` is **not** 2015-09-29: it is
  **2015-01-17**, a second and earlier reading. So the true population is
  **five photographs from 2015-09-29, one from 2015-01-17, and a PDF whose
  `/CreationDate` is 2026-07-06**. A file count is not a reading count — the
  same shape as this item's own "six records, not one" finding.

  **What the five September photographs are.** Three boards, and the shop's
  own physical layout is why the join works: a **lit menu box** numbering
  every dish **1–30** (`IMG_0638`, `IMG_0639`, `IMG_0640` — 1–12 with
  photographs, 13–19 *BBQ Dishes on Rice*, 20–30 *Noodle Soup (Dry)*); the
  **wall board** carrying everything else (`IMG_0636`, and `IMG_0637` at a
  different angle); and a **side board** on `IMG_0637` holding *BBQ Delights*
  and *Drinks & Desserts*. Items 13–19 appear on two photographs and agree.

  🔑 **The numbering shifted, which is why `code` could not be the join.**
  2015 item **27 — *Pork Chop Noodle Soup (Dry)*, $12.80 — has left the menu**,
  and everything below it moved up one: today's 27/28/29 are 2015's 28/29/30.
  2015 item **18 — *Honey BBQ Pork on Rice*, $13.00 — has also gone** (today's
  record has 13–17 and 19, no 18). Two more 2015 lines have no successor:
  *Gingko Pork Maw Cooked with Oyster Sauce* ($13.80, clay pot) and *Ginger and
  Spring Onion Chicken Stir-fried* ($14.50). None of the four is written to
  `data/history/dishes/`: that store holds dishes that **left the payload**,
  and these were never in it — recording them there would assert a removal the
  repo never made. They are recorded here instead.

  🛑 **The 2015-01-17 photograph was deliberately NOT transcribed, and this is
  the honest half of the delivery.** It is a genuine second reading — prices
  visibly differ (*Ma Po Tofu* $12.50 in January, $13.00 in September; several
  right-column prices are hand-amended on the board between the two) — so it
  would have doubled the series. But it is a **wide-angle shot of the entire
  wall from an angle**, and its price column cannot be aligned to its names
  with confidence: a trial transcription of the *Congee / Noodle / Rice*
  column produced **25 names against 24 prices**, and two dishes appearing to
  fall in price against September. An off-by-one there fabricates 28 prices
  that look plausible. Nothing was written. Recovering it needs either a
  closer photograph that does not exist, or a perspective-corrected re-read —
  a separate piece of work, and the only part of KC Cafe still owed.

  **Where the join stopped.** 136 of the roughly 170 lines read were joined.
  The rule applied was **a price is recorded only where the board printed an
  English name on the same baseline as that price, and that name resolves to
  exactly one dish that still ships**. What that excluded, and why:
  **unlabelled lines** — the wall board's *Soup / Snack* column carries
  seventeen Chinese lines and seventeen prices but only nine English labels,
  and the same is true of a band in the right column; **ambiguous lines** —
  2015's single *Hot & Spicy Lamb* ($17.00) faces three lamb steamboats today,
  and *Pork Maw Pepper Corn Soup* ($14.00) matches neither of today's two
  pork-maw dishes by name; and the **BBQ Delights** board, which prices whole
  ducks and roast pork by the kilogram and has no counterpart in the record at
  all (Roast Duck whole $35.00 / half $18.00, Crispy Roast Pork 1 kg $34.00,
  Soya Sauce Chicken whole $30.00 / half $16.00, Sha Keong Chicken whole
  $32.00 / half $17.00, Honey BBQ Pork 1 kg $34.00, Honey BBQ Pork Ribs 1 kg
  $32.00). Where a join rests on *section plus sole candidate* rather than on
  an exact name match, the entry's own `note` says so.

  🚩 **A consequence worth seeing: these two readings are not like for like.**
  The current prices are a **2026-07-06 delivery-app** reading and the 2015
  ones are **counter** prices, so the ~1.85× ratio across the corpus is a
  courier markup *plus* eleven years of inflation and nothing separates them.
  Each entry states its own `method` (ADR 0031) so the record cannot be read
  as a clean like-for-like rise. That consistency was also the corroboration
  used for the alignment: 30 of the 30 numbered items land in a 1.76–2.05 band,
  which an off-by-one in the price column would have scattered.

  🔑 **The payload prices had to become one-entry dated series, and that is a
  mechanical requirement rather than a design choice.**
  `split_data.reconstruct` does `row["superseded"] + item["price"]`, which a
  bare number cannot take — `--check` would raise rather than fail. `isDated`
  is `length > 1`, so a one-entry series sets no `priceSeries` and no new field
  reaches a screen (ADR 0047 holds); `recorded: "2026-07-06"` is the record's
  own `verified` date made explicit, which is exactly what `resolveRecord`
  already inherited for an undated price. This is the second use of the shape
  (a) introduced for Spices.

  **`verified`/`verifiedBy` were NOT touched.** The record's 2026-07-06
  delivery-app reading is still the latest one; the 2015 reading is older and
  belongs on the entries, not on the record. `check_provenance.py` reports
  kc-cafe as *skipped* — a `delivery-app` reading leaves no file in `intake/`
  to bound it — which is unchanged and correct. `data/intake/menu-sources.json`
  already carried all ten files and needed no edit.

  📌 **CLAIM RELEASED 2026-09-08 (session faves-o1) — part (a) delivered and
  merged (PR #20); part (b) is unclaimed and still owed.** (b) is the three
  older photo sets with no price history, and the delivering session sized
  them: **Spices is the LEAST valuable of the three** — its two documents
  barely overlap, its 12 unique dishes already ship at 2023 prices, and the
  one comparable price that moved (Tandoori Chicken half, $13.50 → $13.00)
  was never in the record to supersede. **KC Cafe (9 photographs, 2015) is
  the most valuable** and is where (b) should start.

  **(a) `spices-indian.json` has `verified: null` and `verifiedBy: null`**,
  with `status: "menu-complete"` and **92 priced items**. Its intake
  photographs are EXIF-dated 2023-11-28 and 2026-07-06. Every other venue with
  intake photographs got its date stamped, and the audit matched capture date
  to `verified` date exactly on **12 of 13** venues — this is the thirteenth.
  A menu with no date cannot age, so `refreshCaveat` says nothing about it.

  ✅ **(a) DELIVERED 2026-09-08 (session faves-o1), and it was not two fields.**
  `verified: "2026-07-06"`, `verifiedBy: "paper-menu"` — corroborated by commit
  `1ba220f` of that date. But the record is a **mix of two readings**, and the
  split is exact: **80 items** off the 2026-07-06 paper card, **12** off a
  2023-11-28 in-store board (the record's own *"Bombay Indo-Chinese"* section
  is that poster's heading verbatim), 80 + 12 = 92, and no dish sourced from
  both. Setting the record date alone would have made a **new false claim**,
  because `resolveRecord` passes it to every undated price — asserting the 12
  were read off a card that provably does not contain them. So the 11 priced
  2023 dishes carry a one-entry dated series, ADR 0031's per-entry override
  and the corpus's first use of it. `isDated` needs `length > 1`, so no new
  field reaches a screen (ADR 0047 holds) and all 92 prices resolve
  byte-identically.
  🔎 **GPS did not identify the venue; opening the photographs did.** The fix
  sits **103 m** from Spices and **23 m** from a different venue, and
  `--near` named the wrong one — the documented "sorts to a strip, does not
  pin a shopfront" behaviour, and a useful counter-example to hold beside
  `500/060`.

  🚩 **The sweep found SIX records with a menu and no `verified` date, not
  one** — a symptom count is not an enumeration, and here it multiplied the
  answer by six. `hell-pizza` (99 items), `spices-indian` (92, now fixed),
  `khandallah-trading-company` (72), `sprig-and-fern-tawa` (63), plus
  `cook-at-home` (24) and `mcdonalds` (41), both unpriced. **The other five
  are untouched and none has intake photographs to derive a date from**, so
  each needs a different kind of evidence — that is why they are not folded
  in here.

  **(b) Three older photo sets have no `data/history/prices/` file:** KC Cafe
  (9 photos, 2015), R&S (1, 2017), Spices (2, 2023). Whether those prices were
  ever read and found unchanged, or simply never read, is **unknown** — nothing
  records either. Churton's 2019 pair ✅ *was* recovered (174 rows, `816cb7e`),
  which is the proof the recovery is possible and worth doing.
  🚩 KC Cafe's menu was restructured between its first commit and now — only
  **10 of 169** items share a section-plus-name key — so the missing layer
  cannot be recovered by diffing the record. It has to come off the photographs.

  ---

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — part **(a)** only.
  Worktree `/Users/mike/worktrees/faves-o1-spices-verified`, branch
  `spices-verified`, data commit `4b6b2c5` (parent `origin/main@5e6db9e`).

  **The evidence, re-derived rather than taken on trust.**
  `python3 tools/intake_exif.py "intake/menus/Spices indian"`:

  ```
  IMG_2294.jpeg   2023-11-28  [GPS redacted]  Apple iPhone 14 Pro  in-store
  IMG_2295.jpeg   2023-11-28  [GPS redacted]  Apple iPhone 14 Pro  in-store
  menu 3.pdf      2026-07-06  —               —                    paper-menu
  ```

  🛑 **The GPS column is redacted deliberately and this is the only edit to
  the tool's output.** Both photographs carry a full fix to six decimal
  places. This repo is public, and a phone's own fix is a different class of
  fact from a venue's geocoded coordinates (which are already in `site/data`
  and public) — `leakscan` blocked the paste, correctly, and the honest
  answer was to redact rather than to allow-list a person's location trace
  into a public record. Nothing is lost: the distances below are what the
  coordinates were being cited FOR, and they are more legible than the raw
  numbers were.

  `--json` adds `captured_at` `2023-11-28T19:36:59+13:00` and
  `2023-11-28T19:37:28+13:00` (iOS 17.1.1), the PDF's sole `pdf_dates` entry
  `2026-07-06`, and `file_mtime` `2026-07-06` on **all three** — the mtime is
  the day they were copied in, which is why ADR 0038 forbids reading a date
  off it.

  🚩 **GPS did NOT corroborate the venue, and must not be reported as if it
  had.** The two photographs sit **103 m** from Spices' geocoded address,
  **23 m** from Simmer and **46 m** from Takeaway @ Churton — `--near` names
  *Simmer*, not Spices. That is exactly the failure ARCHITECTURE describes:
  GPS "sorts loose files to a shopping strip; it does not pin a shopfront".
  What identifies the venue is the **content**: both photographs show a
  pin-board headed *"SPICES / BOMBAY INDO-CHINESE MENU"* and a panel reading
  *"SPICES BUTTER CHICKEN SAMOSA (Two for $10.00)"*, hung on a shop wall under
  a fluorescent batten beside a security-camera dome. That is a board read
  where it hangs ⇒ `in-store`.

  **Which reading is the shipped menu? BOTH — and the split is exact.**
  The PDF (2 scanned pages, CCITT G4, no text layer) is Spices' printed
  takeaway card. Transcribing its sections and counting them against the
  record:

  | Source | Sections | Items |
  |---|---|---|
  | `menu 3.pdf`, 2026-07-06 | Entrée · Chicken · Lamb · Seafood · Vegetarian | **80** |
  |  | Biryani · Tandoori Breads · Salads | |
  |  | Accompaniments · Drinks · Desserts | |
  | `IMG_2294/2295`, 2023-11-28 | Bombay Indo-Chinese · Specials | **12** |

  80 + 12 = 92, and **no dish is sourced from both**. The record's own section
  name *"Bombay Indo-Chinese"* is the poster's heading verbatim; Combo ($14),
  Goat Curry ($23) and Butter Chicken Samosa ("Two for $10.00") are the
  poster's other panel. None of those twelve appears anywhere in the PDF.

  **So the date is `2026-07-06` and the method is `paper-menu`** — the day the
  menu was last read, and how. Corroborated independently by commit `1ba220f`
  *"Transcribe menus (Spices, Takeaway, Thai Tara)"*, dated 2026-07-06, and by
  `lifecycle.added`. ADR 0031 keeps `verified` at full precision because "a
  reading happens on a day we know we did it"; ADR 0038 takes that day off the
  document's own metadata, which here is the PDF's `/CreationDate`.

  **But a bare `2026-07-06` would have been a NEW false claim.** `temporal.js`
  `resolveRecord` passes `record.verified`/`verifiedBy` as the default record
  time and method for **every undated price in the menu**, so stamping the
  record alone would assert we read the twelve 2023 dishes off a 2026 card we
  can see does not contain them. The schema already has the answer, and this
  change uses it rather than inventing one: the 11 **priced** 2023-sourced
  dishes now carry a one-entry dated series
  `{"value": …, "recorded": "2023-11-28", "method": "in-store"}` —
  ARCHITECTURE's "a single reading may use it, to date that reading", and its
  per-entry `method` to be stated "only when *that* reading came from
  somewhere other than the venue's last reading". Butter Chicken Samosa has
  `price: null` and so has nothing to date; its "Two for $10.00" is prose in
  `desc` and was left alone. This is the corpus's **first** use of a per-entry
  `method`; `validate.py` has enforced the closed set on it since ADR 0031.

  **What that costs the phone: nothing, measured not reasoned.** `isDated` is
  `length > 1`, so a ONE-entry series never sets `priceSeries` and no new
  field reaches a screen — ADR 0047's test is satisfied because nothing was
  added for a screen to render. Run against the changed file, `resolveRecord`
  returns all 92 items with byte-identical prices (18, 17, 15, 15, 23, 16, 23,
  23, 20, 14, 23 — zero mismatches), while `series()` hands a consumer
  `recorded: "2023-11-28", method: "in-store"` for an Indo-Chinese dish and
  `recorded: "2026-07-06", method: "paper-menu"` for an inheriting one. The
  change is invisible on screen and load-bearing in the record, which is
  exactly what it should be.

  🚩 **Consequence the owner should see: the refresh caveat switches OFF for
  this page.** `paper-menu` is trusted and 2026-07-06 is inside
  `VERIFY_MAX_AGE_MONTHS = 12`, so under ADR 0036 Spices stops showing "Menu
  items and prices need a refresh" and starts showing "Read from a paper menu,
  6 Jul 2026". <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  Correct for 80 dishes and generous to 12, because the caveat is
  **record-level and has no per-section granularity** — the same shape 0036
  flagged for TJ Katsu and did not close. Not fixed here (0036 is Accepted,
  and this is a content-policy call); reported.

  **The wider sweep — the symptom count was not the enumeration.** All 57
  records checked: **6**, not 1, are `menu-complete` with `verified: null`.
  Priced ones: `hell-pizza` (99 items), **`spices-indian` (92, fixed here)**,
  `khandallah-trading-company` (72), `sprig-and-fern-tawa` (63). Unpriced:
  `cook-at-home` (24), `mcdonalds` (41). The other five are **untouched** and
  reported to the orchestrator — each needs its own evidence, and none of them
  has intake photographs to derive it from.

  **Part (b) is NOT settled and stays owed.** For Spices specifically the
  missing 2023 layer is **thin**: the two documents overlap on almost nothing,
  and the twelve 2023-only dishes are already in the payload at their 2023
  prices. The one comparable price that **moved** is Tandoori Chicken *half*,
  $13.50 on the 2023 board → $13.00 on the 2026 card — and the record has
  never carried a half price (it is prose in `desc`), so there is no payload
  entry for it to supersede. Nothing was transcribed. On this evidence Spices
  is the **least** valuable of (b)'s three targets; KC Cafe (9 photos, 2015)
  is the most.

  **Found and left alone:** the record's `hours` are 16:00–21:30 seven days,
  but the 2026 card prints *"Opening Hours 4.00pm to 9.00pm Seven Days"* — a
  30-minute disagreement with the venue's own document. Out of scope for this
  item; `hours` are dated by `detailsVerified`, not `verified`.

  **Verified:** `validate.py` (57 valid, 77 warnings, none new) ·
  `split_data.py --check` (227/227 history rows join on `dishId`) ·
  `check_no_deps.py` · `check_fallback.py` · `check_versions.py --range` ·
  `node --test` · `boot_check.mjs`. `DATA_VERSION` → `2026-09-08.2`.
