# Cold review — Theme 38: the data model, the features built, the features planned

- **Date:** 2026-09-07 12:16 UTC (2026-09-08 NZST). Worktree `faves-38a`, off
  `main@de6d2b7`.
- **Reviewer:** Claude Fable 5.1, in a fresh session as the brief required. Not the
  author of any record under review.
- **Brief:** roadmap item `490/010`, the owner's eleven strands quoted verbatim in
  `490/README`. Three subjects: the model, what ships, what is planned.
- **Method:** four independent read-only maps, each told to report refutations
  first — the model measured against the corpus, every screen traced from field
  to element, every open board item read together, and every citation in the
  brief opened at its source. Every headline claim below was then re-checked by
  this session at the file and line named, and every count re-run on `de6d2b7`.
  Nothing under `site/`, `data/` or `tools/` was changed.
- **Not a licence.** Nothing here changes the schema. Where a change follows, it is
  filed as its own item and the decision is the owner's.

## Headline

🔎 **The model is in better shape than the brief implies, and the brief is in worse
shape than it looks.** Eleven of its sourced claims drift from or contradict their
sources, headed by the pricing strand, which is written as if ADR 0089 had never
been accepted and says a delivery price "already renders" when the owner removed
that render the day it shipped. Report that first, because a review that builds on
the brief inherits every one of those errors.

**What the review found, in the order it matters:**

1. **The model has shapes it cannot choose between.** The owner's own example, beef
   or chicken satay, is modelled four different ways in the corpus, each under an
   accepted record: two rows (ADR 0089), a pick-one add-on group (ADR 0048), a size
   ladder in prose (363 rows), and sizes as add-on options that quietly degrade a
   dish's dietary claims (ADR 0092 names it and files nothing). A second price is
   modelled three ways. No rule says which to use, so intake picks one each time.
2. **The payload already carries what no screen renders.** `prices` on 101 dishes
   and `priceChannels` on two venues, since the owner reversed the render on
   2026-09-06; `revisions` on 18 rows; section `translations` accepted by the
   validator and never read. ADR 0047's test is unsatisfied on the newest field in
   the schema, and the ruling that made it so is recorded only in a code comment.
3. **The record store is not the one the documents describe, and its identity keys
   are the wrong ones.** History rows key on section heading and dish name for 226
   of 227 rows, so the id ADR 0051 says "carries the price history" carries none of
   the history that exists. Three populated stores are undocumented, two have no
   validator, and three documented directories do not exist.
4. **The constraint the brief calls decisive is already broken and nothing measures
   it.** The home screen's JavaScript alone is 315 KB gzipped against a 300 KB
   first-visit budget. The venue payload is 178 KB gzipped and has grown seven-fold
   in raw bytes since 2026-07-15. "Every field is a download" is true, and the
   shell is twice the data.
5. **Six defects that are not modelling questions**, found while tracing fields to
   screens. One is a privacy promise broken: the location-consent flag is written
   into the backup file and travels in the sync blob, against a stated design.

**What is right and must not be redesigned** is listed in §8, because the likeliest
failure of a review this wide is a redesign nobody asked for.

🎯 **Nine decisions and pieces of follow-up work are filed as items `490/020` to
`490/100`.** Five are the owner's; four are engineering calls with a recommendation.

---

## 1. Refutations first — the brief against its sources

Every row was opened at the file and line named. Verdict key: **WRONG** · **WIDER**
(the record says more than its source) · **NARROWER** · **STALE** ·
**UNVERIFIABLE**.

| # | The brief says | The source says | Verdict |
|---|---|---|---|
| 1 | Strand 8: *"counter-vs-delivery price already renders (`focus_check` pins which is primary)"* | `menu.js:1417`: *"NOTHING RENDERS `item.prices` HERE, and that is deliberate."* Shipped and removed 2026-09-06 on the owner's words: *"this is just you dumping more content in the UI."* `focus_check.mjs` asserts the **absence** of a second channel price. CLAUDE.md's blurb carries the same stale sentence. | **WRONG** |
| 2 | Strand 8 and README: 28b, *"153 prose price points with nowhere to live"* | ADR 0089 (accepted 2026-09-06, owner-ruled) gave a per-**door** price a home: `prices{}` on 101 dishes, `priceChannels` on 2 venues. Only the per-**size** price, 28b's actual subject, is homeless. The count is 363 rows by the repo's own classifier, `tools/find_addons.py`. ADR 0089 is cited by neither file. | **STALE**, and the most relevant uncited record |
| 3 | *"`price: null` means unknown (240 items)"* | 216 at filing, 218 at `de6d2b7`; 240 counted the 24 recipes that carry no `price` key. And ADR 0041 already split the meaning: `null` alone is "priced on application", `null` with `needs: price` (170 dishes) is "we could not read it". | **WRONG** count, **NARROWER** meaning |
| 4 | *"`hours: null` means unknown but `hours: []` asserts closed"* | A **day** key `[]` asserts closed (`190/020`, ADR 0006 line 60: *"unstated days → closed `[]`"*). `hours: []` is a schema error (`validate.py:1273`). | **WRONG** as written |
| 5 | Strand 4: *"Seasonality is not modelled"* | `available.season` exists on sections and dishes (`validate.py:555-578`, `temporal.js:426-454`, ADR 0023 §3). Used by 0 records, rendered by nothing, absent at menu level because there is no menu entity. | **WRONG**; should read modelled, unused, unrendered |
| 6 | *"The model currently allows per-branch hours and nothing else"* | `BRANCH_KEYS` = label, address, lat, lng, phone, hours, timezone, detailsVerified, detailsVerifiedBy (ADR 0063). The brief's own strand 3 row says so. | **WRONG**, and internally inconsistent |
| 7 | Strand 5, present tense: 🛑 *"`110/040`: the fish axis silently carries nothing"* | Closed 2026-09-07, ADR 0095; sibling `110/060` closed the same day, ADR 0097. | **STALE** |
| 8 | Strand 7 and §Collisions: *"`310/010` ruled that three sizes are three dishes"*, *"ADR 0051's 'three sizes are three dishes'"* | `310/010` is an open item's design conclusion; no owner ruling on it is recorded anywhere. The owner's own ask was the opposite: *"$28 (Mains), $21 (Gold Card) should be one dish"*. ADR 0051 rejected merging the rows and said *"any 'these are variants of each other' relationship is a later link between ids"*. | **WIDER** and misquoted |
| 9 | Strand 3: per-branch closure *"is explicitly an open design question"* | **Ruled** 2026-08-22, `210/040`: *"CLOSURE BECOMES PER-BRANCH. The owner took the schema change over the recommendation"*, sized `[L]`. Unbuilt: 0 of 47 branches carry `lifecycle`. The question is decided; the work is open. | **STALE** |
| 10 | Strand 7: variants *"Not modelled"* | Modelled four ways (see Headline 1 and §6 C1). | **WRONG** in the more dangerous direction |
| 11 | *"`36c` … not researchable for 21 of 24 recipes"* | Reversed by the owner 2026-08-16 (ADR 0064: estimate and label). `data/estimates/recipes.json` holds `serves` for 24 recipes: 3 stated, 19 estimated, 2 null. | **STALE** |
| 12 | Claim strength: *"a vocabulary question the board has explicitly refused to settle"* | ADR 0040 settled the dish-level case (NGA → `gf`, NGO → `gf-option`). What is open is the option-level hedge and Dirty Little Secret's `LG`/`LD`, which ADR 0097 says *"stays with Theme 38"*. That second referral is missing from the brief's 📥 section. | **WIDER** |
| 13 | *"neither may be implemented in terms of the other (ADR 0092)"* | The sentence is item `110/010`, owner-ruled 2026-08-16, restated in ADR 0097. ADR 0092 has no such wording. | misattributed |
| 14 | Strand 10: `closure` listed as a stored field with an `overdue` state | `closure` is derived at load (`temporal.js:558`), not stored; `overdue` is a computed flag. The absence claim holds: 0 of 57 venues carry an event. | imprecise |
| 15 | Strand 2: leftovers and household stock are *"genuinely new"* | Twice fenced out already: ADR 0090 rule 2, *"No eating events"*, and Theme 6, an eating diary is *"a separate, private, personal app that consumes Faves"*. Not unaddressed; refused. | **NARROWER** |
| 16 | Strand 11: `190/040` is a *"residual"* | Owner-ruled 2026-09-07, *"FIX IT PROPERLY"*, over the recommendation. ADR 0094 also lists cross-day overlap as known and not built. | understated |
| 17 | §Referred: the owner said *"adding a field now means designing it twice"* | The referral is evidenced by commit `43a4208`; the quoted words appear in no record but the brief. | **UNVERIFIABLE** |
| 18 | README: the eleven-bullet brief is *"his text unaltered"* | The text exists in no other record. The elision on first filing and the same-day catch are both evidenced by the commits. | **UNVERIFIABLE** (accepted as the transcript's) |

Held up under the same check: `composeTags` unions, de-duplicates, records the
option that carried each tag and intersects dietary claims (`addons.js:167-227`);
87 products; 68 midnight assertions, re-run green; `served` annotates and never
filters; the per-branch closure comment in `menu.js` is verbatim; the previous cold
review's two false supersessions are in the session log as stated; every roadmap id
resolves to the item described.

---

## 2. The constraints, measured

The brief names the precache budget as the constraint that decides most answers.
Measured on `de6d2b7`, gzip sizes, static analysis of the import graph (no dynamic
imports exist in `site/js`):

| What | Size (gzip) | Note |
|---|---|---|
| Home screen JS, static import graph | **315 KB** (72 of 85 modules) | loaded on first paint, before any data |
| Menu page JS graph | 366 KB (78 modules) | |
| Recipe page JS graph | 271 KB (61 modules) | |
| All 85 modules | 416 KB | what the service worker precaches |
| `app.css` + three shells | 66 KB | |
| Venue payload, 57 files | **178 KB** | 1.26 MB raw; about 51 bytes per dish |
| `index.json` + `fx.json` | 1.2 KB | |
| **Precache total, first visit** | **≈ 660 KB** | photos excluded, as the budget says |

The budget in CLAUDE.md is *"total transfer for first visit < 300 KB (excluding
photos)"*. WORKPLAN carries it as `[~]` and no tool measures it; the last time a
number was recorded (ADR 0047, 2026-08-16) the venue files gzipped to 56 KB.

| Date | Venues | Payload raw | |
|---|---|---|---|
| 2026-07-15 | 27 | 154 KB | |
| 2026-08-08 | 28 | 177 KB | ADR 0023 lands |
| 2026-08-16 | 38 | 393 KB | `dishId` seeded (+12.6 KB gzip, "the largest single field") |
| 2026-08-24 | 56 | 1,106 KB | the menu fetches |
| 2026-09-08 | 57 | 1,261 KB | |

🔑 **Two conclusions, both of which change how the strands should be answered.**
First, the payload discipline of ADR 0047 is right and is not where the bytes are:
the shell is more than twice the data, and a field costing 582 bytes (`prices` and
`priceChannels`, measured by stripping them) is a principle question, not a
performance one. Second, the budget as written is unmet, unmeasured and undefined:
it does not say whether it means the page's first paint or the precache, and those
differ by a factor of two. That is a decision, filed as `490/090`.

The other hard constraints hold and were not close to being tested by anything
below: zero build step, offline after first visit (the whole payload is precached),
no personal data in the payload, menu content owner-supplied. The sync envelope is
a Worker body cap of 256 KiB per blob (`worker/sync-worker.js:85`), and the merge
deliberately excludes live state such as the order tally (`sync-merge.js:35`).

---

## 3. The model as it is

Full field-by-field tables, with measured presence and how absence is spelled for
every field, are in the session's working map and summarised here. Counts at
`de6d2b7`: 57 venue files (56 `venue`, 1 `recipes`), 454 sections, 3,506 dishes,
47 branches across 12 venues (8 with more than one), 50 add-on groups with 200
options in 14 venues (95 options carry `tags: []`), 87 products, 212 superseded
price entries and 15 departed dishes across 3 venues, 0 lifecycle events, 0 uses of
`available.season`, 13 sections with `served` in 5 venues, 0 translations, 0
non-NZD currencies, 0 ratings, 0 ownership records.

### 3a. Entities and their identity

| Entity | Store | Identity | Survives a rename of its display name? |
|---|---|---|---|
| Venue | payload | `id` (+ `renames.js` and `formerIds` for an id move) | Payload yes. **Record store no**: nothing renames `data/history/<id>.json`, `--check` then reports "0 with a history file" and passes. |
| Branch | payload `locations[]` | **none** — a `label` (universal in the corpus, optional in the schema) and a position; `locations[0]` is "primary" | A label rename is invisible; a reorder changes which branch is projected to the top level. |
| Section | payload | `sectionId` (required, immutable) | Anchors yes. **Record store no**: history rows key on the heading string (`split_data.py:63`). |
| Dish | payload | `dishId` (required, immutable, `formerIds`) | Payload yes, by construction. **Record store no for 226 of 227 rows** (see 3c). |
| Add-on group / option | payload | group `id`; option **`name`** | An option rename changes every stored order line's identity (`selectionKey`). |
| Recipe / step / ingredient line | payload | `dishId`; steps by **position**; lines by text | A step reorder silently misaligns `data/estimates`; editing a line's text detaches its tick. |
| Price series, channel price, need, revision, lifecycle event | payload sub-shapes | positional | — |
| Price history, departed dish | `data/history/` | venue file + `{section, name, code}` key | no |
| Withdrawn row | `data/withdrawn/` | carries `sectionId` and `dishId` | yes — the newest store is the only one keyed correctly |
| Recipe estimate | `data/estimates/` | `dishId`; steps by index | id change fails the check; reorder passes and misaligns |
| Image provenance | `data/images/` | `dishId` + file | yes |
| Product | `data/products/` | filename; **no inbound reference anywhere** | n/a |
| Ownership edge / entity / person | `data/ownership.json`, dirs absent | `venue:<id>` | id rename breaks the edge |

### 3b. How "we do not know" is spelled — a different way in every field

| Field | Unknown | None / absent | Empty asserts | Source |
|---|---|---|---|---|
| dish `price` | `null` + `needs: price` → `?` | `null` → `—` "priced on application" | — | ADR 0041 |
| add-on option `price` | **error**, never null | inherits the group's | `0` = free | ADR 0048 |
| venue `hours` | `null` (10 venues) | **absent** (12 — exactly the multi-location set) | a day `[]` = **closed** | ADR 0006, `190/020` |
| branch `hours` | `null` (Subway, 5) **and** absent (McDonald's, 5) | — | — | two venues, two spellings |
| `served` | — | absent = always | a day `[]` = not served | ADR 0081 |
| dish `tags` | no tag = not stated | — | — | ADR 0025 |
| option `tags` | `[]` = not stated (key required) | — | — | ADR 0048 |
| `verified` | `null` = never; four reasons at render | — | — | ADR 0036 |
| `desc` | — | `null` (1,286) **and** absent (178) | — | — |
| `picks` | — | `[]` (27) **and** absent (16) | — | — |
| `lifecycle.opened` | absent | — | — | ADR 0023 |
| `needs` | the only explicit vocabulary, closed set, not allergens | — | — | ADR 0041 |

The brief's strand 14 is right about the pattern and wrong about the example. The
case that matters is `hours`: the shape has three states and needs four, and the
missing one ("the venue did not say") is the one that sends a reader across town
(`190/020`, Abrakebabra's Wednesday). ADR 0006 chose `[]` for unstated days as a
migration convenience and the choice was never revisited.

### 3c. The record store, as documented and as it is

| Documented (`ARCHITECTURE.md:67-74`, `data/README.md:34-44`) | On disk |
|---|---|
| `data/entities/`, `data/people/` | **do not exist**; 0 records |
| `data/history/venues/` | **does not exist**; no tool writes it |
| `data/history/prices/`, `dishes/` | 2 and 3 files; keyed on `{section heading, name, code}`; `dishId` on 1 row of 227 |
| — | `data/estimates/` (24 recipes; validated by `recipe_estimates.py`, not in CI) |
| — | `data/images/` (41 rows; **no validator**) |
| — | `data/withdrawn/` (2 rows; **no validator**) |

🔎 **The identity finding.** ARCHITECTURE says *"the id is what carries the price
history … across the rename"* and ADR 0051's consequences say `split_data.py` keys
history on the id. Read the tool: it adds `dishId` to a key only *"when the data
gives one"*, the files predate ids and were never re-keyed, and `same_dish`
matches by name whenever the key has no id (`split_data.py:55-87`). So a permitted
dish rename or a permitted section-heading rename orphans every history row it
touches. `--check` catches the orphan and fails, which is the right failure, but
the id is doing none of the work the records credit it with. This is an engineering
fix with a proof already written (`--check` round-trips), filed as `490/040`.

Also measured against the current-truth doc: 265 dishes carry a one-entry price
series, which `ARCHITECTURE.md:389` says only a moved price needs and its own
§Refreshing prescribes; the decisions table still says the repo is private; and
the refresh procedure's step 3 (*"add `available.offBy`"*) describes a state the
`--check` refuses until the tool is run, so two paragraphs read as alternatives
when they are halves of one procedure.

---

## 4. The features as they are

### 4a. What the model can express that no screen shows

The brief's half-omitted subject. Each row has no reader under `site/js` (grep) or a
reader that never reaches an element.

| Field | Corpus | Known by |
|---|---|---|
| `prices` + `priceChannels` | 101 dishes, 2 venues | ADR 0089 says it renders; the owner removed it (`menu.js:1417`); **unfiled** |
| price series, `priceSeries`, `priceNext`, entry `method`/`note` | 265 series; 265 objects built per load, unread | Theme 13: never in-app; ARCHITECTURE still says "for the future trend view" |
| `revisions` | 18 rows, 3 venues | `080/160` |
| section `translations` | 0 records; accepted by `validate.py:1723`; headings render raw | **unfiled** |
| `lifecycle.added`, `opened`, `closure.since`, `closure.upcoming` | 57 / 0 / derived | **unfiled** — a closure announced in advance is invisible until the day |
| `status: verified` vs `menu-complete` | 0 / 46; only `=== "stub"` is ever tested | **unfiled**; WORKPLAN treats the promotion as a milestone |
| `detailsVerified` when the menu caveat is amber | 32 venues carry it; read only inside the blue-tone note | adjacent to `270/010` |
| `city`; item `rating` on the row; venue `image` on the menu page; item `available.note` | search haystack only / pick chip only / card only / no reader | minor |
| `data/products/`, `data/history/*` | 87 / 227 | by design (ADR 0047, 0090) |
| Unit-tested code with no caller | `dish-filters.js`'s two filter functions (ADR 0088 removed their surface), `ui-state.js` chip restore, `priceLabel`, `isGone`, `styleOf` | partly documented in code; the `dish-filters` pair is **unfiled** |

The three strands the brief flagged as "storable and not shown" are confirmed and
sharpened: `served` annotates each section but no screen says what is on right now
across the app; per-branch hours render per branch but nothing lets a reader
compare branches or choose one for the order, and the order line's phone is the
primary branch's (`menu.js:1479`), never the branch the reader expanded; price
history accrues and is never rendered, by ruling.

### 4b. What the screens imply that the model cannot carry

| Screen behaviour | Missing in the model | Evidence |
|---|---|---|
| Branch rows wear the venue's closure | per-branch `lifecycle` (ruled, unbuilt) | `menu.js:361-370` |
| A branch's "suburb" on the card | branches have no `area`; the label stands in | `app.js:164-172` |
| Cook mode's "what you need" per step; one-tap timer; °F ovens | no ingredient↔step link; duration and temperature are regex-read from prose | `cook.js:168-264`, `units.js:201-246` |
| ½/1×/2×/3× scaler | quantities are free text; `serves` scales, `time` does not; `yield` has no field | ADR 0076, `460/010` |
| "We don't know this extra's price" | add-on `price` may never be null | ADR 0048 §2 |
| Venue-wide statements ("all dishes may contain allergens") | no venue-level prose slot; parked on Simmer's `Breakfast` note | `080/200` |
| Market price as a positive fact | `null` + a `needs.note` in prose (Regal, 14 rows) | ADR 0041 |
| Eligibility ("Gold Card", "12 and under") | prose in a section heading or note | `310/040`, ADR 0081 |

### 4c. Defects found while tracing, none of them modelling questions

| # | Defect | Evidence | Filed |
|---|---|---|---|
| 🛑 1 | **The location-consent flag travels in the backup file and the sync blob.** ARCHITECTURE and `geo-consent.js:16-22` say the key is *"deliberately outside the backup export"*. It is not in `personal-data.js`'s EXCLUDED table, so the catch-all sweep carries it, a merge import writes it back, and sync seals `collectPersonalData`. **Executed**, not inferred: a Node probe against the real module prints `exported other keys: ['faves.geo.consent.v1']` and the same after re-import. | `personal-data.js:79-144, 215, 812-816` | `490/020` |
| 2 | **Every order line is hard-coded `NZD`.** `cart.js:237` defaults it and no caller passes a currency; line prices format with no currency. A GBP venue's order renders in `$`. The per-item currency override in `place.js:65-67` is unreachable because the schema forbids the key. 0 non-NZD venues, so latent. | `menu.js:1474-1486`, `cart-ui.js:199` | `490/100` |
| 3 | **Deleting a profile leaves its cook-mode ticks behind.** `checklist.js` is per-profile but not in `SCOPED_BASE_KEYS`, which is the list the purge walks. | `profiles.js:38, 193-199` | `490/100` |
| 4 | **The compact contact bar reads the primary branch** while the card, header and served window read the nearest; its own comment says the opposite. On a chain with an origin known, the pinned bar and the page above it can disagree. | `menu.js:2026-2036` vs `app.js:152` | `490/100` |
| 5 | Section `translations` accepted and never rendered (4a). | `menu.js:1791, 1833` | `490/100` |
| 6 | A cross-record `goesWith` chip targets `#dish-<slug(name)>`, unreachable when the target's `dishId` differs from its slug (85 dishes do). Reasoned from `findDish`'s tiers, not reproduced; 0 cross-record pairings in the corpus. | `menu.js:1207-1211`, `dish-id.js:99-112` | `490/100` |

Documentation drift found on the same pass and not separately filed: DESIGN.md
still specifies card services, dietary chips that dim, picks at the top and a
header date line, all removed by owner rulings; ARCHITECTURE's cook-mode
ingredients toggle, the Refresh control's location and *"the future trend view"*.
These belong in the docs commit that follows this review, not in an item.

---

## 5. The strands — does the model express it, express it badly, or not at all?

Verdicts: ✅ expresses it · ⚠️ expresses it badly or partly · ❌ not at all ·
🛑 the plan collides with something accepted.

| # | Strand | Model | Ships | Planned, and the problem with the plan |
|---|---|---|---|---|
| 1 | Cooking at home vs a restaurant | ✅ one corpus, `kind: recipes`, capabilities declared in `kinds.js` (ADR 0003, 0065). ⚠️ `serves` on 3 of 24, `time` on 9, no `yield`, steps are strings. | recipe page, cook mode, scaler | `460/010` is ruled ("show both, labelled") and cannot be rendered: `yield` and per-step minutes live only in `data/estimates`, which ADR 0047 keeps out of the payload. **It is a data job first**, and the item calls it a render job. |
| 2 | Ready-made food at home; leftovers; stock | ⚠️ 87 products in `data/products/`, never served, **no inbound reference from anything**. ❌ stock, leftovers, "what can I make". | nothing; ingredient-first search ships | No item exists. Three fences already stand (ADR 0090 no eating events; Theme 6 separate app; sync excludes live state) and none knows it fences this. 🛑 See §6 C6 and `490/080`. |
| 3 | Restaurant vs branch vs franchise | ⚠️ `locations[]` carries contact, hours, clock and details provenance per branch (ADR 0011, 0043, 0063). Nothing else. **A branch has no id.** | branch card, nearest-branch status, `branch_check` | Per-branch closure ruled `[L]` (`210/040`); per-branch menus and prices held until a chain exercises them (ADR 0080 D4) while `080/100` already suspects Pizza Hut's prices are not Johnsonville's. 🛑 Every per-branch plan needs to name a branch and can only use a label. `490/060`. |
| 4 | Seasonal menus; menus by time of day | ⚠️ three mechanisms with three semantics: `available` filters at load (`season` used by 0 records); `served` annotates a section and never filters (13 sections); `menus[]` with priority-ordered availability recorded and held (ADR 0080). | the served marker; nothing says "on now" | ADR 0080 said 28c should be built into the rule-set shape so venue and menu machinery are one thing; ADR 0081 built it the other way and does not cite 0080. `080/080` Baylands is the first real dated menu and is framed as a re-read. |
| 5 | Configuring a dish; add-ons | ✅ `addOnGroups`, composition unions allergens and intersects claims, a configured dish is its own order line (ADR 0048, 0092, 0095, 0097). ⚠️ no `min`, no substitution (out **and** in), a preparation-only option must fake its tags. | picker, warning line, chips re-painted | Owner ruling 2026-08-17: **one mechanism** for sauces, removals, a different milk, upsize, sides, combos. 14g's state machine survives; its vocabulary does not. 🛑 upsize and combos are claimed by three themes (C1, C2). |
| 6 | Combos | ❌ no bundle entity. Modelled in prose (13 combo names, 6 venues), as an add-on group (Abrakebabra, 11 sections), and as a per-person minimum in a note (Regal). | nothing | `200/020` asks entity-or-configuration; the 2026-08-17 ruling says configuration; ADR 0048 §5 (accepted) says *"14f inherits the same constraint"* that options are standalone records; `cart.js`'s line key holds **one** `dishId`. 🛑 C2. |
| 7 | Variants (beef vs chicken) | ⚠️ **four ways** (Headline 1). ADR 0092 names the missing notion, *"a group that selects a variant rather than adds to the plate"*, and files nothing. | pick-one groups render; two-row variants render as two rows | `310/010` wants a link between ids; Theme 14 wants a control; no rule tells intake which. 🛑 C1. `490/050`. |
| 8 | Pricing by channel and deal | ⚠️ `price` = counter (ADR 0085, 0089); `prices{door}` on 101 dishes, **rendered by nothing**; no deal, no per-size, no per-person shape; 363 prose price points. | one price per dish | Four records pull four ways and none cites the others (C3). 30g's premise ("nothing exercises it") predates 0089's 101 rows; its question (fee on the order vs per-dish price) is untouched and 0089 chose per-dish without asking it. `490/030`. |
| 9 | Capturing change over time | ✅ two clocks, two stores, append-never-overwrite, `split_data --check` (ADR 0023, 0047). ⚠️ history keyed on names (3c); channel prices carry no history (0089); no `corrected` event distinct from a change; floats. | nothing, by ruling (Theme 13) | The ruling is firm and repeatedly re-proposed. What is owed is record-store hygiene (`490/040`), not a surface. |
| 10 | Venue or branch state | ✅ dated lifecycle events fold to a derived `closure`; badge, banner, ranking (ADR 0023). ❌ per-branch; ❌ an announced closure before its date. 0 closed venues in the corpus, so every surface ships exercised only by fixtures (`340/150`). | badge, banner, branch heading | Per-branch closure ruled; needs a branch id first (`490/060`). ADR 0047 leaves open how long a closed venue stays in the payload. |
| 11 | Past midnight; daylight saving | ✅ both closed 2026-09-07 (ADR 0094, `190/030`, 68 assertions re-run green). | badge, countdown | Three open items land on one function (`190/040` ruled, `190/020`, ADR 0094's cross-day overlap) and nothing sequences them (C14). |

### The nine strands the brief added, briefly

| # | Strand | Verdict |
|---|---|---|
| 12 | Two tag axes | ✅ settled and enforced: allergen and dietary never implemented in terms of each other (`110/010`, ADR 0095, 0097). Open: `200/070`, one substance said twice in the picker — owner's call, presentation only. |
| 13 | Claim strength | ⚠️ dish level settled (ADR 0040); option level and the weaker claims (`LG`, "no added gluten") refused into prose, so two venues read one idea two ways. Filed to this review by ADR 0097. `490/070` puts the options. |
| 14 | Unknown / absent / empty | ⚠️ §3b. `hours` is the one that matters; `190/020`'s option 1 is the right shape and is an engineering call. |
| 15 | Provenance and ageing | ✅ three clocks (menu, details, channel), a method on each, per-branch details (ADR 0031, 0037, 0063, 0089). ⚠️ the source document's own date has no field (`080/030`, `340/250`'s EXIF finding is the same gap in a PDF); `270/010`'s split is ruled and its item does not say so; option 3 of `340/250` (a provenance block in `data/`) is referred here and is the right home. |
| 16 | Identity across change | ✅ dishes and sections in the payload. ❌ branches (no id), removed dishes (26c's "this dish is gone" needs the name ADR 0051 declined to ship), the record store (3c), and venue renames never reach `data/`. |
| 17 | Every field is a download | §2. True, and the shell is the bigger number. Pending adds that must each name a screen: trace tier, `yield`, per-step minutes, branch `lifecycle`, an inter-dish link, `alsoKnownAs`, `ordering[].kind`, eligibility, a structured second price, a null day. |
| 18 | Local-first sync envelope | ⚠️ export is free for any new `faves.*` key (the sweep); continual **sync is not** — `sync-merge.js` merges three named stores and excludes live state, and a saved order, an activity log, a reservation and a stock list each need a merge rule nobody has written. 256 KiB per blob. `150/030`'s forward-compatibility hole (an older app drops unknown allergen keys and the deletion rule un-flags them) applies to every new store. |
| 19 | Servings, quantity, yield | ⚠️ four meanings (recipe `serves`, recipe `yield`, product `servings`, the owner's restaurant "serving size") and two blocked schemas; ADR 0076 chose parse-at-render over structure with evidence, while 36b, 17c and 18b still assume structure. |
| 20 | Per-branch everything | see 3 and 10. The corpus already split one chain into four venue records because the taverns cook different menus, and Pandan smuggles a branch into `ordering[].platform`. |

---

## 6. Collisions — where two accepted things want incompatible shapes

**C1 · A dish with choices is modelled four ways and three themes claim it.**
Two rows (ADR 0089: Nasi Lemak chicken $21, beef $23, "the record's own
precedent"); a pick-one group (ADR 0048: the Garden Salad's chicken, halloumi,
prawns or beef); prose ladders (363 rows, and Abrakebabra added 14 more on
2026-09-07 with no rule to follow); sizes as add-on options that strip `gf` off a
drink for choosing Large (ADR 0092, left open, nothing filed). Theme 28 says a size
is a dish and wants a link between ids; Theme 14's ruling says upsizing is the same
control as a sauce; Theme 14's README admits *"somebody has to rule which theme
owns the data shape, or the two will model it twice"*. It is modelled four times.

**C2 · Combos against the order line and an accepted ADR.** A line is one `dishId`
plus a selection plus a note. A combo that picks a kebab has no single id; a combo
sold as an add-on fits the selection key but its members are invisible to allergen
composition, which unions option tags, not dish tags. ADR 0048 §5 still binds:
options are standalone records, *"14f inherits the same constraint"*. The reason
(no dish ids) is discharged; the decision was never superseded.

**C3 · A second price: three accepted records and an open item, none citing the
others.** ADR 0085 forbids `channel` in the payload and two prices on one dish. ADR
0089 admits `prices{delivery|online}` and says the row renders a second line. The
owner removed that render the same day; the field stays, unrendered. ADR 0080 D5
requires 28b's axis to be open-ended data, and 0089 introduced a closed set under a
new word, "door", after `370/010` said not to open a fourth word. `310/020` needs
"size unknown, price known" and "two volumes, one price", neither of which fits a
`{door: number}` map.

**C4 · Per-branch anything against a record with no branch identity.** Per-branch
closure (ruled), per-branch price overrides (held), all-region branch lists
(owner-directed, growing) each need to address a branch. `BRANCH_KEYS` has no id.
Only a label, which is optional in the schema and free text in the corpus.

**C5 · Seasonal and time-of-day: three mechanisms, three semantics** (strand 4).
The two that ship disagree about whether a window filters or annotates, and the
recorded third would unify them but is held until a venue exercises it.

**C6 · Household stock against every fence.** The owner's brief wants leftovers,
stock and "what can I make". ADR 0090 forbids eating events in the product store;
Theme 6 puts the eating diary in a separate app that consumes Faves; the sync merge
excludes live state; products are never served, so there is no ingredient
vocabulary in the app to match a recipe against. No item exists. Each fence was
right for its own reason; together they make strand 2 either a new app or a new
category of personal store, and that is the owner's call before any design.

**C7 · Servings, yield, quantity.** `460/010` is ruled and unshippable without two
payload fields; ADR 0076 refuses structure that 36b, 17c and 18b assume; the owner's
restaurant "serving size" is a fourth meaning with no home.

**C8 · Claim strength and the tag axes.** `350/010` assumes a declared-versus-
inferred tier is reachable at render; `110/020` has not decided where the tier
lives; ADR 0097 refers the hedge vocabulary here. Composition's intersect rule is
what makes C1's size options dangerous: an untagged option kills every claim.

**C9 · The sync envelope.** Saved orders, an activity log, reservations and user
recipes each want in; each needs a merge rule; one of them (a reservation) is a
future location, which the export excludes on principle for the present one.

**C10 · Three items on one function.** `190/040` (absolute instants, ruled),
`190/020` (a null day) and ADR 0094's cross-day overlap all change
`hours.js`'s `segments`/`openStatus`, which `served` shares. Nothing sequences them.

---

## 7. Options and recommendations

Offered where the choice is the owner's; recommended where it is an engineering
call. Each is filed as an item so it can be claimed, and none is started here.

### 🎯 Owner decisions

**D1 · `prices` and `priceChannels` in the payload with no renderer (`490/030`).**
(a) Keep them, on the record that a render is owed and will be designed as its own
piece of work; ADR 0047's test stays unsatisfied meanwhile, at 582 bytes gzipped.
(b) Move them to `data/` as provenance, which ADR 0085 §5 already permits, and keep
`price` as the counter; the fallback caveat still fires from `verifiedBy`. (c)
Design the render the owner rejected differently and ship it. Whichever: ADR 0089's
Decision text says the row renders and it does not, so a superseding note is owed
either way, and the owner's reversal needs a home other than a code comment.

**D2 · One shape for "a dish with choices" (`490/050`).** The 2026-08-17 ruling
already picks the mechanism: one control for sauces, removals, a different milk,
upsize, sides and combos. What is left is which data shape carries it. (a) A `kind`
on an add-on group (`adds` | `selects`), where a `selects` group is a variant chooser
exempt from the intersect-degrade rule and its choice becomes part of the line key
as options already do; sizes, proteins and pick-a-kebab combos all fit, the picker
and the order line already exist, and the two-row precedent of 0089 becomes the
exception for genuinely different compositions. (b) An inter-dish link (28a) for
sizes plus a combo entity for bundles: two new shapes, two renders, and the reader
can tell which one they are using, which the ruling forbids. (c) `menus[]` and a
price-as-context resolution per ADR 0080: the industry's answer, held by ADR 0080
D4 until a venue exercises the container. **Recommendation, as an engineering
reading of his own ruling: (a)**, with a written rule for intake about when a
choice is a `selects` group and when it is two dishes.

**D3 · Household stock and leftovers (`490/080`).** (a) Out of Faves: Theme 6's
separate private app reads Faves' JSON and the product store; nothing in Faves
changes except that `data/products/` is kept fit to be read. (b) In Faves as a
device-local personal store that is exported but never synced, like the order
tally; "what can I make" then needs an ingredient vocabulary in the payload, which
is a new precache cost. (c) In Faves and synced, which reopens the 256 KiB
envelope and adds the first per-household (not per-profile) store. No
recommendation: this is a product boundary, and the three existing fences were each
his rulings.

**D4 · The first-visit budget (`490/090`).** (a) Restate it as what it can mean
and measure it in CI: home first paint, JS + CSS + HTML, a number he chooses; the
current figure is about 380 KB. (b) Keep 300 KB and cut the shell: 72 modules on
the home screen's static graph is the lever, and dynamic import is within the
zero-build rule. (c) Drop the number and keep ADR 0047's discipline, which is
about the payload and is working. No recommendation on the number; a
recommendation that whichever he picks gets a check, because a quality bar nothing
measures is the same class of decorative guard ADR 0072 names.

**D5 · Claim strength vocabulary (`490/070`).** (a) Keep prose and no tag for a
hedged claim (the status quo, two venues reading one idea two ways). (b) Add a
weaker positive tag per claim (`gf-hedged` or similar) that the filter does **not**
satisfy and the chip shows in the duller tone `350/010` already ruled for
unflagged tags; costs a vocabulary entry, a chip label and a filter rule. (c) A
per-tag object carrying strength and provenance, which also answers `110/020`'s
"where does the tier live" and `350/010`'s declared-versus-inferred; the largest
payload change on this list and the only one that answers three items at once.
The review's reading: (b) closes the two-readings defect cheaply; (c) is the shape
the model is drifting toward and should be costed before (b) is built.

### Engineering calls, with a recommendation

**E1 · Give a branch an id (`490/060`).** Seed `id` on all 47 branches from the
label, immutable thereafter, exactly as `dishId` was seeded, before per-branch
closure `[L]` starts. Cost: about 1 KB gzipped across the corpus, a validator rule,
a seed tool. Without it every per-branch feature keys on free text.

**E2 · Re-key the record store and document it (`490/040`).** One tool run to add
`dishId` and `sectionId` to every history key (the `--check` round-trip proves the
result), a `history/` writer that follows a venue rename, documentation of
`estimates/`, `images/` and `withdrawn/`, a validator for the two that have none,
and removal of the three directories the docs describe and the tree lacks.

**E3 · A null day in `hours` (`190/020`, option 1).** `null` = not stated, `[]` =
the venue says closed; the menu prints "hours not published" for the day. Sequence
it with `190/040` and the cross-day overlap, all on one engine.

**E4 · A venue-level `note` (`490/070` carries it too).** The one field the owner
referred in. The screen that renders it is the menu header, under the caveat, where
Simmer's two kitchen-wide statements belong; the cost is tens of bytes on the venues
that have one. Recommend adding it, because the alternative in the corpus is a
statement about the whole kitchen attached to breakfast.

**E5 · Fix the six defects in §4c (`490/020`, `490/100`).** The consent leak
first: it is a stated privacy promise, the fix is one entry in an exclusion table
plus a test that the probe becomes, and it should not wait for anything on this
list.

---

## 8. What NOT to change

Each of these was tested by this review against the strands and held. Re-proposing
one needs a superseding ADR, not a session's judgement.

- **The two-store split, cut on rendered versus not rendered** (ADR 0047). It is the
  right discipline and its bytes are not the problem; the shell is.
- **Immutable seeded `dishId` and `sectionId`** (ADR 0051, 0058). Extend the idea to
  branches; do not weaken it.
- **`price` is the counter; Faves shows one price** (ADR 0085). D1 is about where
  the second number lives, not whether a reader sees two.
- **Trends are never displayed** (Theme 13). The record store keeps accruing; no
  screen, no chip, no sparkline.
- **`served` annotates and never filters** (ADR 0081), and **hours are wall-clock
  through `Intl`** (ADR 0006, 0094). Fix the engine's remaining edges on one branch.
- **Composition unions allergens and intersects claims** (ADR 0048); **the two tag
  axes are never implemented in terms of each other** (`110/010`); **no tag means
  not stated** (ADR 0025). D2's variant group is an exemption from intersect for a
  group that adds nothing, not a change to the rule.
- **Recipes as a `kind` with declared capabilities** (ADR 0003, 0065). A ready-made
  or leftovers collection, if it ever enters Faves, is a new `kind` in that table.
- **Parse-at-render for quantities** (ADR 0076) until a real recipe defeats it.
- **`menus[]` stays recorded and unbuilt** until a venue has two menus (ADR 0080
  D4). D2's answer must not be a back door to it.
- **No accounts, no backend beyond the dumb blob store, nothing personal in the
  payload.** Every strand-2 and strand-18 option above was checked against this.
- **Menu content is owner-supplied or owner-directed.** No strand needed an
  invented venue to be answered, and none should.

---

## 9. What this review owes and did not do

- It did not drive the app in a browser. The features map is a static trace to
  elements; the one executed check is the consent probe.
- Prose-workaround counts (variants in names, combos in prose, market price in
  notes) are regex hits, deliberately over-inclusive; the quoted examples were read,
  the totals were not hand-checked.
- The history-key finding was read out of the tool and the on-disk keys, not
  reproduced by renaming a dish; the code path is eleven lines.
- The owner's 2026-09-06 reversal of the delivery-price render exists only in a
  comment in `menu.js`. This review quotes it from there. If the transcript says
  more, the item `490/030` should carry it.
- Every count is dated `de6d2b7` and will drift; the appendix names the commands.

## Appendix — how the numbers were produced

- Corpus: a Python sweep over `site/data/restaurants/*.json` and `data/**` (field
  presence, absence spelling, series lengths, branch and served counts); `python3
  tools/validate.py` (57 valid, 77 warnings); `python3 tools/split_data.py --check`
  (clean); `python3 tools/find_addons.py` (14b 146 · 28b 363 · 14f 28 · 14c 96 ·
  converted 32); `python3 tools/products.py --stats`.
- Sizes: `gzip.compress` per file; the import graph by following `import … from
  "./x.js"` statically from each shell's `<script>` entries; growth from `git
  ls-tree -r -l` at the last commit before each date.
- Readers: `grep -rlE <field> site/js` excluding the loader and resolver, for every
  key in the four `*_KEYS` sets; then the hit opened and traced to an element.
- Citations: every ADR, item, module and count named in `490/010` and `490/README`
  opened; counts re-run at the filing commit `4e1fdf0` and at `de6d2b7`.
- Checks re-run: `node tools/midnight_check.mjs` (68 passed).
