- [ ] 🔎 **A complete menu carries no `verified` date, and three older menu
      photo sets have no price history** `[S][data]` — found 2026-09-08 by the
      intake audit (session faves-o1). **(a) delivered 2026-09-08; (b) still
      owed** — see the note at the foot.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — owner
  authorised this one directly. Delivered by a sub-agent in its own
  worktree (`faves-o1-spices-verified`, branch `spices-verified`), landing by PR.

  **(a) `spices-indian.json` has `verified: null` and `verifiedBy: null`**,
  with `status: "menu-complete"` and **92 priced items**. Its intake
  photographs are EXIF-dated 2023-11-28 and 2026-07-06. Every other venue with
  intake photographs got its date stamped, and the audit matched capture date
  to `verified` date exactly on **12 of 13** venues — this is the thirteenth.
  A menu with no date cannot age, so `refreshCaveat` says nothing about it.

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
