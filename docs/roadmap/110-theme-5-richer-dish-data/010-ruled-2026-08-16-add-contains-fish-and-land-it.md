- [x] ✅ **RULED 2026-08-16 — ADD `contains-fish`, and land it WITH 37n.**
      ✅ **SHIPPED 2026-09-07 (session faves-b1), branch `contains-fish`.**
      **199 tags across 32 of 57 venues**, 3,175 dishes read — 196 STATED, 3
      DERIVED. `contains-fish` is in `ARCHITECTURE.md`'s closed vocabulary,
      `validate.py`'s `TAGS`, all four allergen label tables (`menu.js`,
      `recipe.js`, `addons-ui.js`, `settings.js`'s avoid list) and both
      contradiction tables (`addons.js` `CONTRADICTS` ⇄
      `tag_allergens.CONTRADICTED_BY`, which `validate.py` holds in step).
      `report.js`'s `contains-` prefix filter needed nothing.
      **The named dishes, confirmed by the sweep rather than assumed:** Pizza
      Pomodoro 4 (Romana and Inferno, each in two sizes) · Regal 21 (including
      the "Spicy Fish Sauce" dish) · Subway 3 (all three Tuna Mayo rows —
      `contains-fish`, and **not** `contains-shellfish`) · Rock Yard 3.
      🔎 **Rock Yard is NOT what this item said it was, and the item was the
      only source for it.** The line below claims "fish sauce named in a dozen
      dishes, its own badge printed literally as 'Fish', plus Yin & Yang
      Pan-fried Salmon". Measured against
      `site/data/restaurants/rock-yard-restaurant.json` at `b0fb27a`: **one**
      dish names fish sauce (Vietnamese Traditional Sauce), the salmon is
      there, and the third is "Kaffir Lime Seafood Curry", which names grilled
      tarakihi. There is **no "Fish" badge anywhere in the record** and no
      `data/` research file for the venue. Three, not a dozen — either the data
      was trimmed after the note was written, or the note was written from the
      source menu rather than from what we transcribed. Nothing was
      hand-patched to make the number look right.
      🔎 **The species list is mine, and here is what it excludes and why.**
      `sole`, `ray` and bare `bass` are ordinary English words in far commoner
      senses and would mis-fire; `\bseafood\b` stays a *shellfish*-only
      derivation, because the frozen seafood mix a kitchen here buys is squid,
      prawn and mussel far more often than it is fish. Two narrowings were
      found by dry run against the real corpus and both are **lookbehinds, not
      `exclude`s**, so the rest of the rule still fires on the same item:
      `\bfish\w*` cannot reach inside "shellfish" or "jellyfish" (Regal has a
      jellyfish dish, correctly untagged), and "mustard seed caviar" on Charley
      Noble's venison loin is a plating word, not roe — it was the **only false
      positive in 200**, and the real Oscietra Caviar two rows away still
      tags.
      🔎 **Nothing was suppressed by the `v`/`vg` curation guard**, so no venue
      in the corpus calls a dish vegetarian while naming fish in it. The guard
      is still wired and break-probed; it just has nothing to catch today.
      **Verified:** `test_tag_allergens.py` 30/30 with five new cases (four of
      them absence assertions, each also demanding the tool wrote something
      else in the record) and five new breakers, **every one verified by
      reintroducing its bug** — including writing the fish rule's findings to
      `contains-shellfish`, which is the wrong-tag trap named below.
      🔎 **The stated blocker is DISCHARGED, and that is why this is takeable.**
      The line below says this is *"blocked on 37n's report existing, not on a
      decision"* — and `tools/allergen_disagreements.py` **exists** (delivered
      2026-08-16; 37n's own item records it). The remaining open half of 37n is
      the *human data sweep* over its 58 rows, which is a different act and is
      still owner-blocked on four calls. Nothing in `contains-fish` waits on
      those four: the tag, the tagger rules and the named dishes are all
      specified below and owner-ruled. `SESSIONS.md` for 2026-09-07 (faves-24)
      lists this under *"none of it takeable without the owner"* — **that is
      wrong**, and the correction is recorded rather than quietly acted on.
      🚩 **The trap, named before the work starts:** `site/js/addons.js` already
      carries **`has-fish`**, which is a *dietary* marker used to decide whether
      an add-on breaks a vegetarian/vegan configuration. `contains-fish` is an
      **allergen** and is a different axis. Neither may be implemented in terms
      of the other.
      Owner's call, asked with the cost stated. The reasoning he took: fish is a
      major declarable allergen we currently warn about **zero** times, and
      landing it alongside the 37n consistency sweep means the corpus gets
      swept once rather than twice. So this is now **blocked on 37n's report
      existing**, not on a decision.
      **What it needs:** the tag in `ARCHITECTURE.md`'s closed vocabulary · a
      rule in `tools/tag_allergens.py` (**fish sauce · anchovy · unagi ·
      bonito/dashi · Worcestershire sauce** — that last is the one people miss) ·
      a corpus sweep · and the dishes already found and left untagged for want
      of it, listed here so nothing is re-derived: **Rock Yard** (fish sauce
      named in a dozen dishes, its own badge printed literally as "Fish", plus
      "Yin & Yang Pan-fried Salmon"), **Pizza Pomodoro** (anchovy on Romana and
      Inferno), **Regal** (spicy fish sauce), **Subway** (tuna — and 🚩 note it
      must NOT be `contains-shellfish`, which is the wrong-tag trap here).
      ⚠️ ~~**`vg-option` and `df-option` were NOT ruled on** and stay open
      below~~ — **STALE. Both were adopted the same day** (see 37n's rulings
      further down: *"`contains-fish`, `vg-option` and `df-option` are ALL
      ADOPTED"*), and both **shipped 2026-08-16**. 🔑 Kept rather than deleted
      because it cost real time: a session put the `df-option` question to the
      owner a second time without grepping first, and he answered it the same
      way. **The roadmap said it twice, in opposite directions, 5,200 lines
      apart** — which is the monolithic-board problem in its quietest form.
