- [x] ⚠️ **ANSWERED AND SUPERSEDED by `010` in this same section — its ⚑ is
      discharged and its substance now lives there.** Marked 2026-08-17 by a
      board sweep. This item ends *"⚑ Owner's call … Recorded, not acted on"*,
      which was true when written and is not now: `010` records the ruling
      (**ADD `contains-fish`, land it WITH 37n**) and both smaller holes were
      adopted and shipped 2026-08-16. **Verified in the tree, not read off the
      sibling item:** `vg-option` and `df-option` are both in
      `tools/test_validate.py`'s vocabulary fixture, and `test_validate.py`
      carries a mutation that drops `df-option` from the vocabulary and expects
      the gate to catch it. `contains-fish` remains owed and is tracked at `010`,
      blocked on 37n's report rather than on a decision. Original filing
      follows —
      🎯 ⚑ **The tag vocabulary has no `contains-fish`, and three sub-agents
      found it independently on one day** `[S][schema]` (2026-08-16). The closed
      set carries `contains-shellfish` and **nothing for finned fish** — one of
      the major declarable allergens, and the one this corpus meets constantly.
      Rock Yard names **fish sauce** in a dozen dishes (dipping sauces,
      dressings, marinades) and prints its own badge literally as **"Fish"**;
      Pizza Pomodoro has anchovy on two pizzas; Regal has a spicy fish sauce.
      All of it is currently **untagged**, because the honest alternative is
      inventing a tag, which the vocabulary's own header forbids
      (*"extend here, not ad hoc"*).
      🚩 **This is not a tidiness gap — it is a silent safety hole**, and worse
      than a missing tag on one dish: a reader with a fish allergy gets a corpus
      that never once warns them, which reads as "no dish here contains fish".
      Adding it is a schema change plus a corpus sweep plus a rule in
      `tools/tag_allergens.py` (fish sauce · anchovy · unagi · bonito/dashi ·
      Worcestershire sauce, which is the one people miss), and it should land
      with 37n rather than beside it.
      **Two smaller holes found the same way, same day, lower stakes:** there is
      `gf-option` and `v-option` but no **`vg-option`** or **`df-option`**. Gong
      Cha offers a free soy/oat swap on 15 drinks and Rock Yard prints "Vegan
      Optional" on two — genuinely useful to the people the dietary filters
      exist for, and currently unrecordable.
      ⚑ **Owner's call**, because it widens a closed set that safety copy leans
      on. Recorded, not acted on.
