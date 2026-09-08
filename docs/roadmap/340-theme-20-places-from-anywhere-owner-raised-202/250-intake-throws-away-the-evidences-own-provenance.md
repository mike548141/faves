- [ ] 🛑 **Intake throws away the evidence's own provenance, and the first
      record to prove it overstates its freshness by thirteen days**
      `[M][tools][schema]` — owner-raised 2026-09-07, minutes after the Simmer
      intake landed: *"When you pulled in the Simmer menus you don't appear to
      have used things like the EXIF data for when the photos were taken, where
      they were taken, of what etc. This needs to happen on every update of
      dishes, menus, restaurants, recipes, ingredients etc. Do we need a tool or
      guard or something to ensure all the relevant data is harvested,
      provenance recorded, historical data kept etc?"*

  ✅ **DELIVERED 2026-09-09 (session faves-o1)** — the tool and the guard, with
  [ADR 0107]. 🛑 **Left OPEN deliberately: two parts of his ask are not met**,
  and they are named at the bottom. Branch `intake-provenance`, by PR.

  ## 🛑 A correction to this item's own measurement, taken first

  This item records *"GPS on any of the four: **absent** (`kMDItemLatitude`
  null)"*. **That is wrong.** `kMDItemLatitude` is Spotlight's index, and it is
  null for these files; the JPEG's **EXIF GPS IFD is present with 15 entries**
  on all four, and `tools/intake_exif.py --near` places every one of them
  within 24–33 m of Simmer. Verified three ways: `mdls` (null), a raw
  APP1/TIFF byte walk (GPS IFD at offset 2694, 15 entries), and the tool's own
  decode. Coordinates deliberately not pasted — leakscan blocks them and they
  are not needed to make the point.
  🔑 **This inverts the item's own consolation.** It reads *"GPS was absent
  here, which is luck rather than diligence"* — in fact the four photographs
  carry GPS, so there was no luck: **the leak risk was live and unlooked-at**.
  Nothing was published (nothing under `intake/` is committed), and the sweep
  below now measures it: **64 of 68 files carry GPS.** That number is the
  argument for the strip-or-refuse rule, not against it.

  ## 🔎 The sweep — every venue holding intake material, 2026-09-09

  `python3 tools/check_provenance.py --sweep`, against the live `intake/`.
  "evidence" is the newest **photograph**; a PDF is shown in the verdict
  because it bounds a reading from below and not above.

  | Venue | Evidence | `verified` | by | Gap | Verdict |
  |---|---|---|---|---|---|
  | bambina-pizzeria | 2026-09-01 | 2026-09-01 | paper-menu | 0 | ✅ photo dates it exactly |
  | burgerfuel | 2026-08-15 | 2026-08-15 | in-store | 0 | ✅ |
  | cook-at-home | 2025-11-15 | — | — | — | ⚠️ no `verified` at all (below) |
  | gold-lining-cafe | 2026-08-07 | 2026-08-07 | in-store | 0 | ✅ |
  | kc-cafe | 2015-09-29 | 2026-07-06 | delivery-app | n/a | ⚠️ not locally evidenced |
  | kk-malaysian | 2026-08-26 | 2026-08-26 | in-store | 0 | ✅ |
  | noodle-canteen | 2026-08-15 | 2026-08-15 | in-store | 0 | ✅ |
  | rs-satay-noodle-house | 2026-08-26 | 2026-08-26 | in-store | 0 | ✅ |
  | **simmer** | 2026-08-25 | 2026-08-25 | in-store | **0** | ✅ **already corrected 2026-09-07** |
  | spices-indian | 2023-11-28 | 2026-07-06 | paper-menu | n/a | ✅ `menu 3.pdf` created 2026-07-06 |
  | takeaway-at-churton | 2026-08-08 | 2026-08-08 | paper-menu | 0 | ✅ |
  | thai-tara-express | 2026-08-15 | 2026-08-15 | in-store | 0 | ✅ |
  | the-ramen-shop | 2026-08-15 | 2026-08-15 | in-store | 0 | ✅ |
  | wellington-kebab-grill | 2026-08-15 | 2026-08-15 | in-store | 0 | ✅ |

  🔑 **No second instance. Nothing was fixed, because nothing needed fixing.**
  Simmer's correction landed on 2026-09-07 and it is the only case the corpus
  had. This item says *"the first record to prove it"* and does not claim it is
  the only one — so the enumeration was owed, and it says one. Said plainly
  because a sweep that finds nothing is the result most likely to be assumed
  rather than run.
  🔎 **`spices-indian` is the row that shaped the guard.** Its record reads
  2026-07-06 against photographs from 2023-11-28 and is **correct** — the
  reading came off the PDF. A "newest photograph wins" rule refuses it, and the
  first version of the new tool offered `2023-11-28` for a session to copy over
  the right date. A tool built to prevent a wrong date handed one over; it now
  refuses to choose when a folder holds both sources.
  ⚠️ **`kc-cafe` is read by `delivery-app`**, which leaves no file in `intake/`,
  so its nine 2015 photographs cannot bound it either way. Listed, never
  silently skipped — a method that escapes the guard should be visible on the
  page that escapes it.

  ## ✅ What was built — he asked "a tool or a guard": both

  **The tool** — `python3 tools/intake_exif.py --for <venue-id>`. The other
  modes report on *files*; this one reports on the **fields you are about to
  type**, as a block to copy. Reading the metadata was never the hard part:
  `--near` has printed the capture date since 2026-08-15 and a session still
  wrote the date the session ran, because the answer sat in a report nobody
  had open while they typed. It also prints the record's current values
  beside the suggestion, the visit's span, and how many files in the folder
  carry no provenance at all.
  `--base` points a worktree at the checkout that holds the material.

  **The guard** — `python3 tools/check_provenance.py`, now a required CI step.
  It refuses a `verified` later than the evidence supports.
  🔑 **It reads a COMMITTED record** (`data/intake/menu-sources.json`: file
  name, capture date and time, device, GPS presence — never a coordinate,
  never a pixel), because `intake/**` is gitignored and a guard that only runs
  beside the raw material never runs in CI or in a worktree. With the material
  at hand it also diffs the record against the live files, so a folder that
  gained a photograph reads as drift rather than as silence.
  🛑 **Presence is MATERIAL, not a path**, and this was measured before it
  shipped: `.gitignore` un-ignores `intake/README.md` and two `.gitkeep`, so
  `intake/` exists in every checkout — an `exists()` test read a clean worktree
  as live and reported **all 14 venues as drift, exit 1**. Two selftest cases
  pin it. Without that, wiring this into CI would have broken every build.

  **Break-probe, verbatim.** `simmer` nudged 2026-08-25 → 2026-08-26:

  ```
  simmer  2026-08-25  2026-08-26  in-store  1  fail: claims 2026-08-26; the
  newest photograph is 2026-08-25 — 1 day(s) of freshness nothing evidences
  ```

  exit 1, naming it and nothing else. Restored: exit 0, tree clean.
  `--selftest` is 9/9 and includes the measured Simmer defect, the one-day
  case, the PDF-bounds-from-below case, the official-site skip, and the two
  `.gitkeep` cases.

  ## 🛑 WHAT IS STILL OWED — why this item stays open

  1. **The evidence itself is not kept.** He ruled *"keep the original evidence
     in the repo-only store"* and what landed is its **provenance**, not the
     images. The two costs this item already names are unresolved and are not a
     delivering session's to resolve: the per-evidence-type **size rule** (four
     Simmer photographs are 32 MB, git history is permanent, and the
     handwritten cabinet tags needed native resolution to read at all), and the
     **strip-or-refuse rule** — now measured at **64 of 68 files carrying GPS**,
     in a public repo. Importing first and deciding after is the one order that
     cannot be undone.
  2. **Option 3, the provenance block in the schema, is not taken.** He ruled
     for it third and this item already routes it to Theme 38 as a data-model
     question. Everything delivered here lives in `data/`, per ADR 0047.
  3. **Text intake carries no provenance and no tool can give it any.** The 24
     Apple Notes recipe exports are Markdown; nothing is embedded.
     `cook-at-home` carries `verified: null`, which is the honest state.
     Products and ingredients are covered by a different store
     (`tools/products.py --coverage`), deliberately not duplicated here.
  4. **`verifiedBy` can still dodge the guard.** A record claiming
     `official-site` is not bounded by local evidence, by design (a website
     reading leaves no file). The dodge is listed in the output rather than
     prevented, because preventing it would refuse correct records.

  ## 🔎 The measurement, taken before answering him

  | | |
  |---|---|
  | All four photos' EXIF `creation` | **2026-08-25**, 09:49:44 · 09:49:53 · 10:13:25 · 10:13:29 |
  | File mtime (when they were copied into `intake/`) | 2026-09-07 14:16 |
  | What `simmer.json` recorded | `verified: 2026-09-07`, `verifiedBy: in-store` |
  | GPS on any of the four | ~~**absent** (`kMDItemLatitude` null)~~ 🛑 **WRONG — see the correction at the top of this item.** The EXIF GPS IFD is **present**, 15 entries, on all four |
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
  🛑 ~~**GPS was absent here, which is luck rather than diligence**~~ — **THIS
  SENTENCE IS FALSE AND IS KEPT ONLY TO SHOW WHAT WAS BELIEVED (annotated
  2026-09-09).** The correction at the top of this item measured the EXIF GPS
  IFD as **present on all four**, and the sweep at **64 of 68 files**. There was
  no luck: nothing in the pipeline looked, and the leak risk was live the whole
  time. The original point survives inverted — a photo *with* GPS **was** treated
  identically, because that is exactly what happened.

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
  🎯 **[SUPERSEDED — he took ALL THREE on 2026-09-07; see the ruling directly
  below. Kept for the record, not a live ask.]
  Recommendation: 1 now, 2 next, 3 into Theme 38.** Option 1 is cheap, is
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
     belongs in the guard (option 2), not in a session's care. ~~The Simmer four
     happened to carry no GPS — luck, not diligence, because nothing looked.~~
     🛑 **FALSE, annotated 2026-09-09** — all four carry a 15-entry GPS IFD.
     This is the third place in this item that repeated the wrong reading; the
     correction at the top is the measured one.
  🎯 **[SUPERSEDED — he ruled on this on 2026-09-09: STRIP LOCATION, THEN
  COMMIT. See the ruling at the foot of this item. Kept for the record.]
  Recommendation: the tool (1) lands first and reports GPS presence, and
  NOTHING is bulk-imported until the size rule and the strip-or-refuse guard
  both exist.** Importing first and deciding after is the one order that cannot
  be undone.
  🔑 **Its substance survived the ruling rather than being discarded** — he
  ordered the strip-or-**refuse** guard *before* the import for the same reason
  this paragraph gives, so the sequencing stands even though the recommendation
  was overtaken.

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

  ✅ **OWNER RULED 2026-09-09 on the half left owed — STRIP LOCATION, THEN
  COMMIT.** He declined keeping the evidence outside the repo, declined
  committing only the four files that carry no GPS, and declined deferring.
  So the original photographs are to live in the repo, permanently, once they
  are clean.

  🛑 **Strip-or-REFUSE, not strip-and-hope — and this is the whole design.**
  64 of 68 files carry GPS, the repo is public, and **git history cannot be
  edited after the fact**. So the tool must refuse any file it cannot prove it
  cleaned, and the proof must be a re-read of the written bytes rather than a
  claim that a library was called. A stripper that silently passes a format it
  did not understand publishes a private address forever, and the failure is
  invisible at the moment it happens.
  🔑 **What must be stripped is wider than GPS.** Today's audit found the GPS
  IFD carries 15 entries; the EXIF also holds a device, a serial-capable
  MakerNote, sub-second timestamps and orientation. The provenance the repo
  actually wants is already committed in `data/intake/menu-sources.json`
  (ADR 0107) — so the image itself needs to keep **nothing**, and the safest
  rule is an allowlist of tags to retain, not a denylist of tags to drop.
  ⚠️ **Cost he accepted, stated plainly:** four Simmer photographs are 32 MB,
  the corpus is 68 files, and a repository never gets smaller. Size should be
  measured and reported before the first commit, not after.
  📋 **The work, in order:** (1) a stripper with a refusal path and a
  byte-level verification pass; (2) a gate that refuses to commit an image
  carrying any location tag, wired into the floor rather than left to care —
  `.leakscanignore` currently exempts a store for a different reason and that
  precedent should not be copied here; (3) a measured size report; (4) only
  then the import. **Not started this session.**

  📝 **BOARD HYGIENE 2026-09-09 — NO LIVE OWNER ASK REMAINS ON THIS ITEM.**
  Both questions it put to him are answered and both answers are corroborated
  outside this file: the three-option ruling on 2026-09-07, and *strip location
  then commit* on 2026-09-09 (`docs/SESSIONS.md:10528-10531`, which also records
  it as strip-or-**refuse** with a byte-level verification pass). The two 🎯s
  above are now labelled in place as superseded recommendations and the section
  heading that read `## 🎯 What was built` — never an ask at all — is now `## ✅`.
  🛑 **The bracket stays `- [ ]`, and the work owed is large:** the stripper with
  its refusal path, the floor gate, the size report, and only then the import.
  🚩 **Three stale "GPS was absent" claims are annotated rather than removed.**
  They sat 120+ lines below the correction that refutes them, so a reader
  arriving mid-file read a falsehood with no marker on it. The measured truth is
  the correction at the top: 15 GPS IFD entries on all four Simmer photographs,
  and 64 of 68 files across the corpus.

