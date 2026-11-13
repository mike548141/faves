- **2026-08-08 (data export shipped + a menu refresh — Opus 5 session)**: Two
  owner asks, plus a live bug found on the way.
  **Roadmap first, then built it.** The owner asked for "save/export all data
  to a machine readable file… absolutely anything that the user provides",
  under the menu or settings. Wrote it up as **Theme 12** (12a export / 12b
  import / 12c the shared seam), the owner said go, and 12a + 12c shipped the
  same day. `site/js/personal-data.js` collects the whole personal layer from
  the **device** storage rather than the live per-profile singletons — those
  only see whoever is active, and a backup holding one person's data while
  three share the phone would look like a backup and not be one. Settings
  gains a "Your data" section under the profile switcher (ruled there, since
  the export covers every profile in that list). Output is a versioned
  envelope, not a raw localStorage dump, pretty-printed with ids *and* names.
  🔎 **The location exclusion had a hole, caught by its own test**: the
  catch-all sweep for unknown `faves.*` keys would have re-collected
  `faves.origin.v1` the moment it appeared in localStorage, quietly defeating
  the "we never export your whereabouts" promise. Excluded keys now seed the
  sweep's skip-set. **Import (12b) was deliberately not built** — merge-vs-
  replace, colliding profile ids across devices, and overwriting someone's
  allergen prefs are open design calls, and a speculative applier answers them
  silently.
  🛑 **Second find, and the more serious one: menus were broken offline.**
  `js/dietary.js` shipped 2026-07-23 and was never added to `sw.js`'s SHELL
  precache list; `cacheFirst()` has no offline fallback on a miss, so opening a
  menu in flight mode could fail outright — a live breach of the
  offline-capable hard constraint, found only because this change touched the
  same list. Fixed, and the list is now **checked against `site/js/`** by test
  rather than maintained by memory.
  **Menu refresh**: Takeaway @ Churton rebuilt from the printed menu the owner
  dropped into `intake/` — 184 items replacing 2019 prices (Wonton Soup $10.50
  → $17.50). Prices were read from **cropped enlargements per column**, because
  the leader dots slant in the photo and the burger column misreads by one row
  at full frame. Captured the shop's **order numbers** (`code`) for the first
  time — it takes phone orders by number. Tags were carried forward by exact
  name, never re-derived: 175 of 184 inherited, 9 new items tagged only where
  the class already was.
  ⏳ **Owner to eyeball** on a real phone: the "Your data" placement/wording at
  390 px, and the refreshed Churton menu. ⚠️ Two things flagged not fixed: the
  record's **shellfish tagging is internally inconsistent** (Battered Mussel
  and Calamari Ring are tagged, Prawn Cutlet and Crab Stick are not — pre-
  existing, and expanding it is a data-sourcing call, not a transcription one),
  and **satay dishes carry no peanut tag** anywhere because no menu states it,
  which is the "no tag = not stated" rule working as designed but worth an
  owner ruling given a household nut allergy.
  Verified: node --test **320 pass** (18 new for the collector, 1 precache
  guard); validate 28 files; no-deps; SBOM check; floor hook green on every
  commit; the export **browser-verified end-to-end over CDP** in headless
  Chrome with a fresh `--user-data-dir` — real button click, real file on disk,
  both profiles present, seeded coordinates absent from the bytes.

