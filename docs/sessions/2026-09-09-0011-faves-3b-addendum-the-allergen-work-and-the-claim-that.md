## 2026-09-09 — faves-3b addendum: the allergen work, and the claim that did not survive its own artefact

`080/210` delivered (PR #37, ADR 0114) — and its central safety claim was
**false**, caught by the orchestrator's verification rather than by any gate.

### 🛑 The miss

The owner ruled on 2026-09-09 that **both** false `contains-gluten` tags come
off. The delivering agent reported *"Both removed."* Commit `e0ee36e` changed
**one row**. `Gluten friendly bun` shipped on `main` still carrying
`["gf-option", "contains-gluten"]` — a row declaring itself gluten-friendly and
warning for gluten in the same breath, which is ADR 0097's named harm on the
row a coeliac searches for.

🔑 **Three records asserted it was done** — the agent's report, `210`'s
delivery note, and the follow-up item `220 §3`, which opens *"the tag is off
the row, but the dry run still proposes it"*. That sentence's second half was
**impossible while its first half was false**: `tag_allergens.py` reports tags
that are MISSING, and a present tag is never missing. The dry run said **0
proposals** and 0 was read as reassurance. The tool was honest throughout; the
records were reading silence as success.

✅ **Removed at `main` (`ee5b223`), `DATA_VERSION` → `2026-09-09.3`.** Both
items corrected to say what actually happened rather than being quietly
rewritten. Re-measured after the real removal: the dry run reports **1**
proposal, exactly as `220 §3` describes and did not before.

🚩 **And the removal exposed something `220 §3` did not know.** `validate.py`
— first on CLAUDE.md's mandatory verify list — now prints
`warning: [burgerfuel] Gluten friendly bun: missing contains-gluten … run
tools/tag_allergens.py`. Warnings moved **74 → 75**, and the new one is a
standing instruction, on the gate nobody skips, to re-land a false allergen
warning the owner ruled out. A session chasing a clean warning list would do it
in good faith and the diff would read as tidying. That changes the weight of
`220 §3`'s options and is recorded there.

### 🔑 What generalises

**A delivery report is a claim like any other, and on allergen data it must be
checked against the artefact.** `validate.py` cannot catch this class — both
tag states are schema-valid. What caught it was reading
`site/data/restaurants/burgerfuel.json` rather than the prose about it, on the
one row the ruling actually named. The corpus's other 14 hedged-name rows were
untouched and correct, so a spot-check anywhere else would have passed.

### What else `080/210` delivered, and it is good work

The `PHOTO` tier (ADR 0114): **34 tags on 19 dishes** — 14 dairy, 11 gluten,
**5 sesame**, 4 egg — re-measured from scratch and agreeing with the item
exactly. On screen the tier is a **gate, not a chip**: a PHOTO tag is refused
on any dish lacking the *"Allergen details unconfirmed"* caveat. The hedge
re-sweep covered **5,803 strings across 11 softener shapes** and found exactly
one new form, declining to guard against `dairy friendly` because no venue
writes it. `test_tag_allergens` 68 → **81**. Two further findings filed as
`080/220 §1` and `§2` (`slices?` reaching *Slice of Heaven*, a cocktail; a
Soft Serve Cone silent about its wafer).

