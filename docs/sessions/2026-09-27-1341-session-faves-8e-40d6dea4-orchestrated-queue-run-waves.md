## 2026-09-27-1341 — session `faves-8e` (`40d6dea4`): orchestrated queue run, waves 1–2

**Asked:** an orchestrated queue run: drain the board in doctrine order,
with sub-agents doing the work. Tier stated at open: Opus 5.5.

**Opened on:** the atelier pin was 44 commits behind. None of those commits
touch `docs/method/`; they are review records and a `filewalk.py`
single-sourcing across 12 scanners the hooks already call live. The pin is
now bumped to `c600f62` (`2dc0eb1`) and the stamp hand-check comes back empty.

**Board hygiene (`4a97e5f`, repaired in `d645dca`).**
- **Nine `[~]` items had no claim stamp, no branch and no live session.**
  The bracket was standing in for "part-done", which the house board doesn't
  define. All nine are back to `[ ]`, each with a note.
- **17b and 36c are closed on evidence measured in the tree.** A five-agent
  triage called nine items stale-done. I checked them, and **only two held**:
  340/020 and 080/220 say in their own text that they aren't done, and 36a
  is half done (next point).
- 🚩 **My own script put its notes in the middle of 16 wrapped titles.** The
  index was unaffected because `board.py` reads line 1 only. `d645dca` moved
  every note to the end of its opening paragraph.

**Delivered.**
| Item | What | Where |
|---|---|---|
| 340/290 | Six verify-list gates now run in CI | `64c8176` (CI green) |
| 340/240 | Terminal-marker ruling written down and handed up | `e93470e`, atelier PR #90 |
| 150/040 | Sync carries a settings field it can't name | PR #42 → `ff20c80`, ADR 0127 |
| 310/050 (28h) | Variant enumerator, with its selftest in CI | PR #43 → `1dfd012`, `b6b9bc9` |
| — | `sync_check`'s expected N corrected from 16 to 22 | `6f8fbb5` |

🔎 **`test_tag_addon_options.py` was red on `main` for seven days.** `7a62c57`
(2026-09-20) added `contains-gluten` to a row that the fixture quoted byte for
byte. Nothing ran the test, so nobody saw. Worse, **six of its break-probes
printed "caught" the whole time**, because a case that couldn't be set up was
counted as a catch. Both are fixed, and the breaker fix was break-probed.

🔎 **The 28h tool doesn't reproduce the item's figures.** It retires 285 ids,
not 248, and finds 48 mechanical groups against 78 that need a human, not
63 against 70. 28o's title still says "63", and a note under it now carries
the measured number.

🚩 **For the owner:**
- **36a.** Bake-only `time` still reads as the total on the recipe list row,
  and ADR 0125 kept `time` on that row deliberately.
- **17c.** It is blocked behind 36b's unasked schema question.
- **340/290.** The item's "does the intake record need a repeat-reading
  concept?" question is still open.

### 2026-09-28 addendum (`faves-8e`, same session): waves 2–3

| Item | What | Where |
|---|---|---|
| 310/140 (28q) | Every add-on option has a stored id | PR #44 → `a9f6347`, ADR 0126 |
| 280/020 | The FX refresh restamps itself | PR #45 → `ebac4a6`, ADR 0129 |
| 340/250 (1)–(3) | Stripper, image gate, size report | PR #46 → `7a0a647`, ADR 0128 |
| — | The image gate also runs in the pre-commit hook | `39502ec` |

- **28q merge check.** Measured on the merge: all 200 options gained an id
  and nothing else. No name, price or tag moved. 🔎 **The item's "no
  delimiter" finding was false.** `selectionKey` always separated its
  fields with raw U+001F and U+001E, which most editors don't show. `od -c`
  at `055c594` confirms it.
- **The FX push trigger ran live on the merge itself** (`ebac4a6`, event
  `push`, success). It exits early when no refresh PR is open. Reason 1 (the
  floor judging the whole tree) is untouched; that is the owner's ruleset
  call.
- **Images.** All 51 already-published images are clean, with 0 carrying a
  location. The gate runs in CI and as a `local` floor check on the hook.
  That matters because CI on this repo reports only after a push to `main`
  has already deployed. Break-probed in a throwaway worktree: a staged
  synthetic GPS JPEG was **BLOCKED**.
- 🛑 **340/250 part (4) goes back to the owner because its premise moved.**
  He ruled on 68 files. `intake/` holds **410**, 236 of them carrying GPS,
  and committing them stripped adds **≈1.84 GB permanently**. Stripping
  saves under 5%.
- 🚩 **A refused command, disclosed at the time.** `rm -rf` of the 1.7 GB of
  stripped copies in this session's scratch was denied. I did not route
  around it. The copies carry no location (the gate checked all 406), and
  deleting them is put to the owner.
- 🔎 **Theme 32 (32a) has a blocking owner question the triage missed:**
  the "deletion paradox" in its README.
- **Theme 26 (saved orders) should wait for 28o.** Its own README gates it
  on the add-on shape settling, and Theme 28 is about to change that shape.

### 2026-09-28 addendum (`faves-8e`): waves 4–5, and the close

| Item | What | Where |
|---|---|---|
| 340/100 | `docs/GUARDS.md` declares every guard's posture | PR #47 → `cda5052` |
| 310/080 + 160 (28k, 28s) | The `selects` schema only, and the checks it would fool | PR #48 → `82b377e`, ADR 0130 |
| 250/040 (17e) | Personal notes on a recipe | PR #49 → `de2245a`, ADR 0131 |
| 310/100 (28m) | Render a `selects` group and put its choice on the order line | PR #50 → `470c748`, ADR 0133 |
| 210/040 | Closure becomes per-branch (worklist 1–4) | PR #51 → `9fe21af`, ADR 0132 |

- 🔎 **`docs/GUARDS.md`'s census found an orphan.** `fixture_check.mjs` had
  been listed nowhere and run by nothing since 2026-09-09. It passed on 2026-09-28,
  so it is now on the verify list. It is **not** in CI, because it is
  browser-driven and the 2026-08-16 subset ruling holds.
- **The browser-check count was hard-coded in three files and wrong in all
  of them** (19 today). The sentences now name the counting command, or
  date the number where it can't be dropped.
- **Data safety.** No venue file changed in any wave-3 to wave-5 merge
  (measured). 28q changed only option ids, and I measured that on all 200
  options.
- 🔎 **28l has a fourth follow-on that 28j didn't list.** A heart stored
  under a `formerIds` id doesn't light its row. It is recorded on 28l.

**Stopped because of economics, not an empty queue.** The orchestrator's
context was large enough that the next wave belongs to a fresh session.
Unblocked for it: **28l** (now 28h and 28j are done), **28n** (after 28m),
**470/050** (it edits `validate.py`'s branch rules, which are free now),
**050** under 210, and 330/010 and 110/020.

🎯 **Owner questions raised this session** (each is recorded on its item):
- 340/250 part 4: the import is **1.84 GB**, not 68 files.
- 36a: bake-only `time` on the list row.
- 28m: whether the default size goes on the order line.
- 210/040: `nearestBranch` skipping shut branches, and the closure
  tie-break.
- 28k: two ladders on one dish, and channel prices beside a ladder.
- Search for variants.
- 340/290: a repeat-reading concept for the intake record.
- 32a: the deletion paradox.
- 17c: blocked on 36b.
- Deleting the 1.7 GB of stripped copies in scratch.

**Put away:** every worktree this session created (six in faves, one
in atelier) is removed, and the stash stack is empty. Atelier PR #90 (the
hand-up) stays open for atelier to rule on.

### 2026-09-28 addendum (`faves-8e`): owner rulings at the close

Asked via AskUserQuestion, after the report:

| Question | Ruling | Result |
|---|---|---|
| 28m: default size on the order line | Leave it off | Confirmed as built (ADR 0133 §3) |
| 210/040: `nearestBranch` skips shut branches | Yes | Confirmed as built (ADR 0132) |
| 36a: the list row's time | Prep + cook | **Built and shipped, `b04f674`** |
| 080/240: dish photo source | Venue images only | Recorded; the goal is queued as a direction |
| 340/250 part 4: import 1.84 GB | "Already answered" | Read as the 2026-09-09 ruling standing |
| Stripped copies in scratch | Somewhere safer | Moved to gitignored `evidence-stripped/` |

- **36a detail.** The row uses `totalTime()` and says "about" when either
  half is our estimate. `recipe_check` §10 asserts the rendered row with a
  control, and a break-probe confirms it catches the old wiring. Thirteen
  recipes now show a time for the first time.
- 🔎 **The first photo question conflated two things.** Evidence photos
  (410 menu and label photos, ≈1.84 GB) are not app photos (42 WebP,
  1.3 MB). A photo for all 3,507 dishes is an estimated ~110 MB, and
  importing the evidence does nothing towards it. The distinction is now in
  080/240.
- 🛑 **340/250's reading must be confirmed in one line before the import
  runs.** The reply is ambiguous and the act is irreversible.
- **`evidence-stripped/` sits outside `intake/` deliberately.**
  `menu-sources.json --rebuild` would read GPS-free copies as new evidence.
- 🔎 **080/250 (new).** Nine Simmer photos dropped 2026-09-09 were never
  read, and `check_provenance` is red locally. CI can't see `intake/`.

### 2026-09-28 addendum (`faves-8e`): the FX loop proven live, and silence

- 🛑 **ADR 0129 shipped a regression, and it was caught live.** Restamps
  force-pushed with the bot token, so every restamp of open PR #52 waited at
  `action_required`. `7b26772` makes the push use `FX_TOKEN`, which is scoped
  Contents read/write for this repo only.
- 🔎 **A latent clock bug surfaced once that was fixed.** `fetch_fx.py`
  stamped by the runner's UTC date, which went backwards against main's
  NZ-dated `DATA_VERSION`, and `check_versions` refused it. Fixed in
  `0798c30`, and `test_fetch_fx.py` runs in CI.
- ✅ **Proven live:** #52 restamped, ran unapproved, went `.1` → `.2` and
  auto-merged (`ab005d0`).
- 🔇 **340/300, owner-raised:** the browser checks beeped through the
  laptop, because `cook_check` drives the real alarm and read-aloud.
  `--mute-audio` is now the harness default (`096da8a`). `cook_check` passed
  85/85 muted, including all eight sound assertions.

### 2026-09-28 — who uses Faves, and a privacy promise that was false (ADR 0134)

- 🔎 **Uptake, from Cloudflare's own data** (shed's read-only `estate-cf-read`;
  edge logs keep 31 days on Free). 351 IPs, nearly all bots. The humans: the
  home WAN (Mac Chrome, `curl`), iPhones on 11–13 Sep only — two at once on
  12 Sep, one on home Wi-Fi and one via iCloud Private Relay — and six
  iMessage link previews with no visit following five of them. **No visitor
  identifiable as outside the household.** Installed-vs-browser is **not
  answerable** from edge data: iOS sends the same UA, and the precache fetches
  the manifest and icons on every shell bump.
- 🛑 **The live page carried Cloudflare's Web Analytics beacon** — zone-wide
  auto-install on `myspot.nz` since 2025-10-20, invisible to plain `curl`,
  unmentioned anywhere in the repo — while the footer, About and
  `SECURITY.md` said "no analytics, no tracking, no third-party scripts".
- 🎯 **Owner ruled: keep it and disclose it** ("recording when someone uses
  my web services" is not tracking location or personal info). ADR 0134;
  footer, About, `SECURITY.md`, `ARCHITECTURE.md` reworded; `010/020` notes
  its premise moved (its ruling stays open).
- ⚠️ **Nothing guards the new wording.** The beacon lives in the Cloudflare
  dashboard, outside every gate here.

### 2026-09-28 addendum (`faves-8e`): the evidence-photo impact analysis

The owner asked what "import the evidence photos" would actually mean. The
measured answer:
- The photos never reach phones, because `data/` is not deployed.
- The repo would grow from **13 MB to ≈1.85 GB**, forever, and every clone,
  CI job and worktree would carry that.
- About **311 photos taken in his home** would become public. GPS stripping
  cannot hide what is in the frame.
- `intake/ingredients/` also holds **"Healthy Mike" diet transcripts**,
  which must never be swept up by an "import intake".

**Ruling: option C.** SHA-256 fingerprints go in the public provenance
record, and the originals are backed up privately to Google Drive. That
meets both goals, auditable and durable, publishes nothing, and stays
reversible. Queued as **340/310** 🔥. My earlier reading of "already
answered" as "commit all" would have published the lot, which is why a
one-line yes was never enough for an irreversible step.

### 2026-09-28 (`faves-3c`): recipe feedback, search, favourites, and 22e steps 1–3

The owner gave recipe-page feedback live, one message at a time. Everything
below was shipped to `main` and checked in a real browser.
- **Content.** The lava cakes' method now says where the flaky salt goes.
  The chocolate-label sentence is gone from the summaries of the lava cakes
  and the brownie.
- **Method ticks cascade.** Ticking step N ticks 1..N; unticking N unticks
  N onwards. Works on the recipe page and in cook mode.
- **Provenance.** A recipe's source sits behind an ⓘ by its name, and a
  new `attributionUrl` links to the original.
- **Search.** A search down to one result opens it: a recipe goes to its
  page, a venue dish to its row in the full menu.
- **Favourites search fixed.** Hearts saved before dish ids existed all
  counted as the empty string (KK: 4 hearts counted as 1, then none shown).
  They now use the heart's own key.
- **Recipe actions.** The three buttons share one row (owner's pick of three
  layouts offered).
- **22e (`350/020`), steps 1–3.** One shared tag module (`tags.js`) for the
  menu and recipe screens. Tags are sorted, folded behind a labelled "+N",
  and each tag opens a tip saying why it is there (`tagNotes`, written by
  `tag_allergens.py --explain`, with a CI drift gate).
- 🔎 **Spec flaws found and ruled on.** Flagged allergens sort first (the
  owner's own example needed this rule). "Does not contain" is an empty
  group. Hiding tags replaces only the "never hidden" half of 22d.
- 🔎 **"May contain" was already ruled** (Pizza Hut P/T, `110/020`). The
  Whittaker's trace tags contradict it. Ruled: apply it and show the trace
  in tips. This lands with 22e step 5.
- ⚠️ **Folding the tag row made `addon_check`'s baseline read a folded row.**
  Its guard caught this; the check now opens the row first.
- ⏳ **Still open on 22e:** step 4 (ingredient-level tags and notes) and
  step 5 (trace tier, including the lava cakes/brownie tags and the ADR
  0047 note owed since 2026-08-16).
- **Late ask:** the "est. — our estimate" line under the recipe stats panel
  has been removed (`63f43d2`). The "est." marker stays, as an `<abbr>` that
  carries the explanation, per ADR 0125's rule that an estimate is never
  shown unlabelled.
- **Then the marker too:** the owner ruled the `est.` beside each value off
  as well ("my ruling remains"). ADR 0135 amends 0125 and records the advice:
  a reader can no longer tell our estimate from the recipe's own figure on
  that panel.


### 2026-09-28 (`faves-b8`): 22e steps 5 and 4, the trace tier and ingredient parts

Picked up `350/020` from `faves-3c`'s handover. Its six points were checked
and applied, and it answered two follow-up questions with the owner's
verbatim words. All five steps of 22e are now built.
- **Step 5, "may contain" (ADR 0136).** A dish's `trace` + `traceSource`
  sit beside its tags, in `site/data/`. Every tip on the dish says "May
  contain traces of … — source". The lava cakes' and brownie's Whittaker's
  peanut/nut tags became trace. `validate.py` `check_trace` keeps the two
  tiers apart (8 mutation cases).
- 🛑 **The safety gap, put back to the owner before shipping.** "Show the
  trace in the tag tips" left a peanut-flagged reader with no peanut chip:
  the tip only opens from some other chip. He first asked which option
  matched what he had ruled. The answer given was "Tips only", literally, and
  that it breaks the option's own promise that the warning isn't lost. He
  ruled **Flagged-only chip**: a dashed "May contain …" chip, never folded,
  only for a reader who flagged it. The row accent stays present-only.
- **ADR 0137 is the note on 0047 owed since 2026-08-16**: the owner's "or
  may with future features" half, dropped by 0047's Consequences and by
  CLAUDE.md. CLAUDE.md's line now carries it.
- **Step 4, ingredients as parts (ADR 0138).** An ingredient line may be an
  object. A line with tags is a fixed, pre-selected add-on, composed through
  `composeTags` at `data.js`'s load seam, so the list row, the accent,
  filters and search all see it. An ⓘ opens a note, and an inferred note says
  so. The tagger skips parts' words (done by a Sonnet worker, plus
  `validate.py`'s object rules by a second one).
- 🚩 **Data moved, reported rather than buried:** the brownie gained
  `contains-soy` (Whittaker's states it, per ADR 0025). The lava cakes'
  chocolate carries the owner's substitution note as `owner`, typos fixed.
- **Also ruled (third round):** accept the chip tap-target overlap, keep the
  tag reasons offline, heat sorts with the unselected preferences.
- **Filed 22f** (`350/030`), owner-raised mid-session: a "no spice" or "mild
  only" preference. 🔎 It is an absence claim ("not tagged spicy" ≠ "not
  spicy"), so options are filed, not built.
- 🔎 **A break-probe that could not break:** moving the ingredient ⓘ inside
  the tick's `<label>` did not make a tap tick the line, because browsers
  don't forward a click from a button inside a label. The "does not tick"
  assertion stays as a behaviour pin and is not break-proven.
- 🔎 **An import shadowed by a local:** recipe_check's `noteText` import
  collided with a `const [noteTag, noteText]` in §13 and threw a harness
  error. It is imported under an alias now.

### 2026-09-28-2138 (`faves-41`): Halal, Kosher and Meatarian; five owner-asked UI fixes

An owner-driven session. One feature was built by a sub-agent on PR #53 and
reviewed by a second, while five small asks from the live site landed directly
on `main`.

- **Halal, Kosher, Meatarian (PR #53, merged `cd91de9`, ADR 0140).** The owner
  asked for "Meatarian" and a no-pork preference. He was told halal and kosher
  are wider than no-pork, and ruled: *"Use Halal and Kosher and if a
  restaurant marks it as such we can show that"*, so there is no separate "No
  pork" option.
  - Both preferences warn on a new inferred `contains-pork` tag.
  - Kosher also warns on shellfish (owner took the recommendation).
  - `halal`/`kosher` are dish-level, venue-stated-only claim tags; there are
    none in the corpus today.
  - Meatarian is selectable but inert, per his words *"I will decide dishes
    later"*; filed as 22g (`350/040`).
  - The preferences are stored in a top-level `foodPrefs`, because
    `sanitiseDiet` strips unknown `diet.dietary` keys on older builds. That
    was proved against the live `settings.js`.
- 🛑 **The independent review earned its cost.** It found a real rule defect
  in the dangerous direction before merge: the plant/mock exceptions (soy,
  coconut, mushroom, tofu) disabled the named-product rule, so "Sweet soy pork
  belly" went untagged. The exceptions are now lookbehinds on the one word
  they replace, each break-probed.
  - It also found 30 rows whose pork is stated elsewhere on the same menu,
    26 of them at Thai Tara's "choice of meat".
  - The owner then ruled on the held rows: 1841 Nachos `v` → `v-option`, and
    "only the clearest" general-knowledge rows (Meat Lovers, KC's BBQ
    combinations, Hawaiian Burger).
  - Final count: 463 dishes and 11 options. The builder's own report had
    called the sweep clean.
- **Direct to main:**
  - `7e47f59`: the home count shares a row with the location line, and is
    right-aligned.
  - `e49bc03`: a recipe's description sits above its stats panel.
  - `8a03ad2`: the "May contain" tip says each thing once.
  - `f69ab27`: allergen tips drop ingredient amounts. The JS and Python
    writers share one fixture, `tests/fixtures/ingredient-names.json`.
  - `8f18043`: the recipe list's preview is read-only (ADR 0139, superseding
    0034 §6): no Start cooking and no ingredient ⓘ.
- ⚠️ **My miss:** `f69ab27` was pushed without running `recipe_check`, which
  still expected the amount. It failed 74/75 on main until `ba9716c`. CI runs
  only `boot_check`, so nothing else would have said so. That is the
  "brief is the gate" lesson, applied to myself.
- **Filed:** 29c (`300/030`, the ⋯ button reported covered mid-menu, not
  reproduced by hand) and `080/260` (Hell Pizza's half-and-half carries no
  dairy).
- **Harness notes from the builder:** compound shell commands (heredocs,
  `xargs`, loops) were refused as unverifiable in a worktree. It re-ran each
  as plain commands and routed around no git refusal. It turned a
  rebase-then-force-push into a merge of `origin/main`, because force-push is
  forbidden.
- **Addendum, same session:** `cdbaa37` removes the recipe page's ingredient
  fold (37c) at the owner's word: *"The ingredients dont need a hide
  feature."* The `ingredientsFolded` setting went with it. `recipe_check` §2
  plants the old stored `true` and reloads, so a reader who had folded it
  still sees the list (break-probed against the old code).

