- [~] 🛑 **Intake throws away the evidence's own provenance, and the first
      record to prove it overstates its freshness by thirteen days**
      `[M][tools][schema]` — owner-raised 2026-09-07, minutes after the Simmer
      intake landed: *"When you pulled in the Simmer menus you don't appear to
      have used things like the EXIF data for when the photos were taken, where
      they were taken, of what etc. This needs to happen on every update of
      dishes, menus, restaurants, recipes, ingredients etc. Do we need a tool or
      guard or something to ensure all the relevant data is harvested,
      provenance recorded, historical data kept etc?"*

  🔒 **CLAIMED 2026-09-09 (session faves-o1, orchestrating)** — delivered by
  a sub-agent in its own worktree (`faves-o1-intake-provenance`, branch
  `intake-provenance`), landing by PR so CI runs before the merge.

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

  1. **A `tools/intake.py` that READS and REPORTS, and never writes.** <!-- pathscan:allow: proposed tool name, deliberately does not exist yet -->
     Point it
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

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — ALL THREE, IN ORDER, PLUS
  KEEP THE EVIDENCE.** He took options **1, 2 and 3** (they stack rather than
  compete) and, on a second question, **keep the original evidence in the
  repo-only store** so a disputed reading can be re-checked against what was
  actually read. Option 4 (write the convention down and change no code) is
  declined by omission.
  📌 **Sequencing, since he chose the order himself:** the read-only tool first,
  the pre-commit guard second (it needs the tool's convention to exist before it
  can check anything), and the schema block third. 🔗 **Option 3 still belongs
  with Theme 38** — it is a data-model change and Theme 38 is convened for
  exactly that class. Taking it here means the review inherits a decided
  question rather than an open one; that is fine, but the review must be told,
  or it will re-open it.

  ## 🛑 TWO COSTS OF "KEEP THE EVIDENCE" THAT MUST BE SETTLED BEFORE ANY BULK
  IMPORT

  Both were stated in the ask; both are sharper than they look, and neither is
  the delivering session's to resolve alone.

  1. **Size, and it does not scale linearly — it accumulates for ever.** The
     four Simmer photos are **32 MB**. Across 57 venues, plus recipes, plus the
     87 packaged products, that is a repository measured in gigabytes — and
     **git history is permanent**, so a photo committed once is carried for
     ever even if deleted later.
     🚩 **The obvious mitigation defeats the purpose.** Downscaling to ~2200 px
     (about 1 MB) keeps a *printed* menu perfectly legible — but the Simmer
     cabinet's **handwritten tags needed native-resolution crops to read at
     all**, and reading a disputed handwritten price is precisely the case this
     is for. So "store a smaller copy" is not a free win; it is a choice about
     which disputes remain re-checkable. **A per-evidence-type rule is probably
     the answer** (full resolution for handwriting, downscaled for print), and
     that is a decision, not a detail.
  2. **This repo is PUBLIC, and a committed photo is published irreversibly.**
     [ADR 0090] measured **137 product photos carrying GPS on a private
     address**. CLAUDE.md's rule for secrets applies unchanged to this: *a
     secret committed and then removed is still disclosed*. So **every image
     must be stripped or verified GPS-free BEFORE it lands**, and that check
     belongs in the guard (option 2), not in a session's care. The Simmer four
     happened to carry no GPS — luck, not diligence, because nothing looked.
  🎯 **Recommendation: the tool (1) lands first and reports GPS presence, and
  NOTHING is bulk-imported until the size rule and the strip-or-refuse guard
  both exist.** Importing first and deciding after is the one order that cannot
  be undone.

  🛑 **A correction is owed regardless of which option is chosen.**
  `simmer.json`'s `verified` should read **2026-08-25**, not 2026-09-07. Under
  ADR 0047's rule this is a **correction, not a shop change** — *did the shop
  change it, or did we?* — so it **overwrites and appends no history**.
  ✅ **DONE 2026-09-07** — `verified` now reads `2026-08-25`, the date the
  evidence carries. Applied as a single-line string replacement rather than a
  re-serialisation, so a concurrent agent's tag sweep over the same file merges
  cleanly.
  🔎 **And it immediately produced the effect the item predicted**, which is the
  cheapest possible confirmation that the field is load-bearing: `validate.py`'s
  warning count for the corpus moved the moment the date became truthful.

  🔎 **A second surface, found while correcting it, and it needs no second
  fix.** `tools/validate.py` *itself* warns *"[simmer] Gluten free toast:
  missing contains-gluten (DERIVED — a wheat bakery item (toast))"* — so the
  hedge defect nags from the validator as well as from the tagger. It imports
  `audit` from `tag_allergens` (line 2046), so **the two share one rule set and
  one fix silences both**. Worth recording because the opposite — two
  implementations of one question, both locally right, only one updated — is a
  failure this repo has already paid for.

  🔗 Related: [`270/010`](../270-theme-19-from-the-2026-08-15-johnsonville-inta/010-age-detailsverified-the-way-refreshcaveat-ages.md)
  (a venue never checked and one long stale render alike) — that item is about
  *displaying* age, this one is about *recording* it truthfully, and a wrong
  date makes that item's work meaningless. And Theme 38 strand 4, which lists
  provenance as a model-level question.
