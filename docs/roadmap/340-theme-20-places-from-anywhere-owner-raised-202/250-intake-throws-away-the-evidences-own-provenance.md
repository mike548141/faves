- [ ] 🛑 **Intake throws away the evidence's own provenance, and the first
      record to prove it overstates its freshness by thirteen days**
      `[M][tools][schema]` — owner-raised 2026-09-07, minutes after the Simmer
      intake landed: *"When you pulled in the Simmer menus you don't appear to
      have used things like the EXIF data for when the photos were taken, where
      they were taken, of what etc. This needs to happen on every update of
      dishes, menus, restaurants, recipes, ingredients etc. Do we need a tool or
      guard or something to ensure all the relevant data is harvested,
      provenance recorded, historical data kept etc?"*

  ## 🔎 The measurement, taken before answering him

  | | |
  |---|---|
  | All four photos' EXIF `creation` | **2026-08-25**, 09:49:44 · 09:49:53 · 10:13:25 · 10:13:29 |
  | File mtime (when they were copied into `intake/`) | 2026-09-07 14:16 |
  | What `simmer.json` recorded | `verified: 2026-09-07`, `verifiedBy: in-store` |
  | GPS on any of the four | **absent** (`kMDItemLatitude` null) |
  | Camera | Apple iPhone 14 Pro |

  🛑 **So the record claims a freshness it does not have, by 13 days.** The
  transcribing session used *today* because today is what a session knows; the
  evidence carried its own date and nobody asked it. **This is not a rounding
  error in a cosmetic field:** `refreshCaveat` ages `verified`, so an inflated
  `verified` **delays the "needs a refresh" warning by exactly the amount it is
  inflated**. The guard that exists to catch staleness was handed a fresher date
  than the truth.
  🔎 **And the two timestamps are 24 minutes apart in two pairs** — 09:49 for
  the two printed boards, 10:13 for the cabinet and the counter. That is a
  visit, and it is a fact about the evidence nobody recorded.
  ✅ **GPS was absent here, which is luck rather than diligence** — nothing in
  the pipeline looked, so a photo *with* GPS would have been treated identically.

  ## 🚩 Why this is not simply "read the EXIF" — the trap on the other side

  [ADR 0090] records, of the packaged-product store: *"137 of the source photos
  carry GPS on a private address"*. `tools/products.py` enforces **no location**
  for exactly that reason, and `.leakscanignore` exempts that store from the
  address rule *because the guard moved into the tool rather than vanishing*.
  🔑 So EXIF is **two different things at once**: `creation` is provenance we
  are throwing away, and GPS is a **home-address leak** in a repo that is
  PUBLIC. A tool that harvests EXIF indiscriminately into `site/data/` would be
  a regression, not a fix. The existing intake convention already knows half of
  this — *GPS sorts photos to a venue, and never pins one* — and that convention
  lives in a session's habits rather than in any code.

  ## 📋 What "all the relevant data" actually spans

  His instruction covers *"dishes, menus, restaurants, recipes, ingredients"*,
  and each has a different evidence type and a different provenance question:

  | Evidence | What it carries | Currently harvested? |
  |---|---|---|
  | A menu photo | capture date/time, device, sometimes GPS, orientation | ❌ nothing |
  | A menu PDF | `/CreationDate` — **already used twice** (1841's 2025-03-27, Baylands' WOAP menu) | ⚠️ by hand, per session |
  | A web page | fetch date, URL, whether the menu is an image or text | ⚠️ partially, in prose |
  | A product photo | the same as a menu photo, plus a barcode | ⚠️ `products.py` guards location |
  | An in-store visit | the date, and which surfaces were read | ⚠️ `verified` + `verifiedBy` only |

  🔎 **The PDF row is the tell.** Two sessions independently extracted a PDF's
  embedded creation date and wrote it into a roadmap item, because it obviously
  mattered. Nobody generalised it, so the photo case — arriving weeks later —
  started from zero. **The knowledge existed and had no home.**

  ## 📋 Options, none taken — he asked whether we need a tool, and this is the
  ask back

  1. **A `tools/intake.py` that READS and REPORTS, and never writes.** Point it
     at an `intake/` folder: it prints each file's capture date, device, GPS
     presence, PDF creation date, and the `verified` date the record *should*
     carry — and refuses nothing. The transcribing session then writes the
     record with the facts in front of it. 🔑 **Matches how
     `allergen_disagreements.py` works** — read-only by design, because the tool
     can be right about the typical case and wrong about one venue.
  2. **A guard in the pre-commit floor**: when a `verified` date changes, check
     it against the evidence in `intake/` and fail if the record claims a date
     *later* than its newest evidence. Mechanism rather than discipline, and it
     catches exactly the defect measured above. Costs a convention linking a
     record to its evidence folder, which does not exist today.
  3. **A provenance block in the schema** — capture date, source type, and what
     was read — carried in `data/` (the record) rather than `site/data/` (the
     payload), per ADR 0047. Richest, and it is the one that needs the **cold
     review** (Theme 38) rather than a quick decision, because it is a schema
     change and every payload field downloads to every phone.
  4. **Write the convention down and change no code.** Free; and this repo's
     own record is that a convention with no mechanism is what just failed.
  🎯 **Recommendation: 1 now, 2 next, 3 into Theme 38.** Option 1 is cheap, is
  useful the very next time a photo arrives, and **cannot itself be wrong about
  a venue** because it only reports. Option 2 turns the discipline into a
  mechanism once there is a convention for it to check. Option 3 is a data-model
  question and Theme 38 is already convened to answer that class.

  🛑 **A correction is owed regardless of which option is chosen.**
  `simmer.json`'s `verified` should read **2026-08-25**, not 2026-09-07. Under
  ADR 0047's rule this is a **correction, not a shop change** — *did the shop
  change it, or did we?* — so it **overwrites and appends no history**.
  ⏸️ Not done at the moment of filing: two agents were live in `site/data/` and
  editing another session's lane is the concurrency rule this repo does not
  bend.

  🔗 Related: [`270/010`](../270-theme-19-from-the-2026-08-15-johnsonville-inta/010-age-detailsverified-the-way-refreshcaveat-ages.md)
  (a venue never checked and one long stale render alike) — that item is about
  *displaying* age, this one is about *recording* it truthfully, and a wrong
  date makes that item's work meaningless. And Theme 38 strand 4, which lists
  provenance as a model-level question.
