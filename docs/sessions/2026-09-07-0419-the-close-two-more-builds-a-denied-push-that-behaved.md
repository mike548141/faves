## 2026-09-07-0419 — the close: two more builds, a denied push that behaved, and an ADR collision

**Session `faves-b1`, final stretch.** Two agents on work the owner had ruled on
minutes earlier, plus two more ad-hoc asks from him. **67 commits across the
whole session.**

### Delivered

- **`110/060` — a hedge is not a warning** (ADR 0097). `tag_allergens.py`
  proposed `contains-gluten` on a dish named **`Gluten free toast`**: the
  DERIVED wheat-bakery rule matched the word and nothing read the two words in
  front of it. 🔑 **Worse than an ordinary false positive** — a false gluten
  warning on the one item a coeliac is hunting for, and the way a reader
  "fixes" that experience is by learning to distrust every gluten chip.
  Hedge forms were **swept, not guessed**: `gluten free` ×76, `no gluten added`
  ×23, `gluten-free` ×15, `dairy free` ×10, `no added gluten` ×9, `dairy-free`
  ×8, and nothing else of that shape exists.
  🚩 **The narrow lookbehind alone was not enough**, which the brief did not
  anticipate: the Brownie and the ginger muffin state the negation in a
  *separate sentence*, so a second guard matches a clause that is **nothing
  but** a free-from claim, per allergen. The full-clause anchor is the whole
  safety argument — *"sourdough toast, gluten free option available"* still
  tags the wheat, proved by **three** separate breakers including the
  `fullmatch`→`search` item-level-veto trap.
  Two real misses landed, both previously unwarned on any screen: **Hummus →
  sesame** and **Chocolate or Nutella → nuts**. Corpus warnings 80 → **77**.
  ⚠️ **A guard had gone decorative and was repaired in the same commit**: the
  availability breaker passed with the bug back, because its own probe sentence
  was itself a hedge.
- **`200/050` + `200/060` — the picker says it once, and the chips keep up**
  (ADR 0096). Swept **2,866 (dish, option) combinations** and found two shapes
  the item had not anticipated: one fact killing **two** claims was *three*
  sentences, and the unflagged branch repeated identically for a reader who has
  never opened Settings. The chip row now rebuilds from the composed tags, so a
  green `Veg` chip can no longer sit beside a warning saying the dish is not
  vegetarian. Break-probes: unmerging the sentence fails **exactly 3**,
  unwiring the repaint **exactly 4**, removing the chip gate **exactly 2**.
  `addon_check` 25 → **37**.
  🔑 **ADR 0096 exists because a ruling created a hazard rather than removing
  one.** Making composed tags reach `tagChip` makes its bare fallback reachable
  with an option's vocabulary in it — `has-fish`/`has-meat` would have painted
  as raw identifiers. They are **filtered out, not labelled**. The accepted
  cost is stated: a *future* vocabulary word is dropped rather than painted
  raw — safe, still a silence, bounded by the check.

### 🛑 A denied push that behaved exactly as the rule intends

The hedge agent's `git push --force-with-lease origin hedge` was **denied by the
permission system**. It **stopped, disclosed it in that turn, and did not reach
for `+refspec`, `--force` or `update-ref`** — which is precisely the rule
CLAUDE.md carries *because* a sub-agent once tunnelled that exact command.
🔑 **And no rule had to be bent to finish.** It needed a force only because it
had rebased its **own** branch; the same commits pushed to a **new** branch name
are a fast-forward. `hedge-rebased` → PR #11 → 8/8 checks → merged. **The
constraint cost nothing but a branch name.**

### 🔎 An ADR number collision, caught at merge

Both agents allocated **ADR 0096** — *"a tag with no reader-facing branch is not
a chip"* and *"a hedge is not a warning"*. **Each checked the allocator before
publishing and each was right at the time**; neither could see the other's
unpushed work. The picker branch published first, so the hedge ADR was
renumbered **0096 → 0097** across three files at merge. `check_decisions` clean
at 96 records.
🔑 This is the house rule earning its keep verbatim: *"a message reserves
nothing; only a pushed artefact does, so check a shared allocator **after** the
push."* Both agents did the check they could; the collision was only ever
visible to whoever merged second.

### Two more owner asks, mid-turn

- 🛑 **Intake throws away the evidence's own provenance** (`340/250`), raised
  after the Simmer merge. **Measured before answering:** all four photos were
  shot **2026-08-25**; the record claimed `verified: 2026-09-07`. **Thirteen
  days**, and `refreshCaveat` ages `verified`, so the guard against staleness
  was handed a fresher date than the truth. Corrected to the evidence's own
  date.
  🚩 **The trap on the other side is real**: ADR 0090 measured **137 product
  photos carrying GPS on a private address**, and this repo is PUBLIC, where a
  committed photo is published irreversibly. So harvesting EXIF indiscriminately
  would be a regression, not a fix.
  He ruled **all three options plus keeping the original evidence**: a read-only
  intake tool first, a pre-commit guard second, a provenance block in the model
  third, and source files kept in the repo-only store. 🛑 Two costs recorded
  before anyone acts: 32 MB for four photos with git history permanent, and
  **the obvious mitigation defeats the purpose** — downscaling keeps a printed
  menu legible but Simmer's handwritten tags needed native resolution, which is
  exactly the dispute this exists for.
  🔎 A second surface found while correcting it and needing no second fix:
  `validate.py` nags the same wrong tag, but imports `audit` from
  `tag_allergens`, so **one rule set, one fix**.
- **Theme 38 — a cold review of the data model**, owner-raised for a *fresh*
  session and recorded only.

### Close evidence

✅ **CI + floor green on `main`**; PRs #10 and #11 each merged with **8/8**
checks. No branch, worktree, PR or stash left open; no orphan Chromes.
✅ `node --test` **1193/0** · `addon_check` **37/0** · `validate` 57 valid, **77**
warnings (was 80) · `test_tag_allergens` **37** · `test_tag_addon_options` **25**
· `check_decisions` 96 indexed · lockstep holds.
✅ **Zero** warnings remain about `Gluten free toast`.
🚀 **Production verified, not inferred:** `SHELL 2026-09-07.12 / DATA
2026-09-07.10`; `Hummus → ['contains-sesame']` and `Chocolate or Nutella →
['contains-nuts']` served live.

### Owed — all of it owner-ruled and specified, none of it started

`190/040` April's countdown (the proper fix — touches `openStatus`'s signature
and every caller) · `210/070` the click stability wait **with his condition that
the lag be measured in use** · `340/230` the label-table test · `340/200`
retry-once · `340/240` agents signal a terminal state · `340/250` the intake
tool, guard and evidence store · `37n`'s data sweep, all four calls now made ·
`200/070` one substance said two ways · **Theme 38**, the cold review.

