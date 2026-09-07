- [~] 🛑 **Adding a fish option to a dish produces NO allergen warning — the
      one thing the add-on picker exists to prevent** `[S][js][data]` — found
      2026-09-07 (session faves-b1) while landing `contains-fish` (`010`), and
      **verified on shipped data before filing**, not taken from the delivering
      agent's report.

  **The evidence, from the corpus as it serves today.** `sprig-and-fern-tawa`
  offers a **Salmon** add-on. Its tags are exactly:

  ```
  Salmon    tags=['has-fish']
  ```

  `has-fish` is a **dietary** marker (ADR 0092) — it answers *"does this option
  break a vegetarian or vegan claim?"*. It is deliberately outside the
  `contains-` namespace, and that is correct. But `site/js/addons.js` builds its
  allergen union off `ALLERGEN_PREFIX = "contains-"`, so **`has-fish` carries
  nothing into the warning**. A reader who has ticked **Fish** in Settings'
  avoid list, on a dish that is fish-free, adding salmon to it, is told
  **nothing**.

  🔑 **This is precisely the case [ADR 0048] was written for.** Its own words:
  *"configuring a dish can make it unsafe — satay on a kebab is peanuts"*, and
  `tools/addon_check.mjs` asserts *"the warning names the option and the
  allergen live"* and *"the flagged treatment follows the CONFIGURATION rather
  than the dish"*. Both assertions pass. They pass because they are exercised
  against a **peanut** option, which is in the `contains-` namespace. The fish
  axis walks straight past them.

  🚩 **`contains-fish` did not cause this and removing it would not fix it.**
  Before 2026-09-07 the app had no fish allergen at all, so nothing could have
  warned. Landing the allergen is what made the silence *visible*: the reader
  can now ask to avoid fish, which is a promise the dish surface keeps and the
  add-on surface does not. **A promise kept on one screen and broken on the
  next is worse than never offering it**, which is why this is filed at 🛑 and
  not as a tidy-up.

  🔎 **How wide is it? Measured, and it is narrow TODAY — which is the trap.**
  A sweep of every `options`/`addOns` list in `site/data/restaurants/` for a
  finfish name returns **two rows, both the same Salmon option at one venue**.
  So the live exposure is one venue. But the sweep is over the corpus we happen
  to hold: `tag_addon_options.py`'s `has-fish` rule fires on *"names a
  finfish"*, so **every future venue with a salmon, tuna or anchovy extra
  inherits the same silence automatically**, and nothing will report it. The
  count is small; the mechanism is not.

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 1, AND HE WIDENED
  IT.** In his words: *"I accept Tagger writes both tags but I want to add to
  your recommendation that the UX impact needs to be considered and properly
  designed. We don't want a flood of noisy tags on the menu, especially if two
  tags are telling the reader the same thing i.e. the dish has fish in it. Also
  I believe an add-on like salmon should have its **own** allergen and dietary
  tags the same way a dish does. So when you include one or more add-ons to a
  dish it is a collection of both the dish's and the selected add-ons' that make
  the dietary and allergen info. Think of situations like kebab where we add
  sauces to a dish, Subway where you customise every sandwich etc."*

  🎉 **THE ARCHITECTURE HE DESCRIBES ALREADY EXISTS — only the DATA is
  missing.** Checked in `site/js/addons.js` before briefing anyone, because
  "build this" and "populate this" are very different jobs. `composeTags()`
  already unions the selected options' allergen tags into the dish's, already
  **de-duplicates** through a `seen` set, already records `added: [{tag, from}]`
  so a warning can name *which option* brought the allergen, and already
  *intersects* dietary claims rather than unioning them (a dish stays vegan only
  if every selected option agrees). So the ruling is not a redesign: **an option
  is already a first-class tag carrier and the composition is already
  dish + selection.** What is absent is `contains-*` tags on the option records.

  🔑 **And the de-duplication already answers half the noise worry.** A dish
  that itself declares `contains-fish` gains **nothing** when salmon is added —
  `seen` blocks it, and `added` stays empty, so no second chip and no second
  warning. The reader cannot be told the same thing twice by that path.

  🛑 **BUT THE OTHER HALF IS REAL, AND IT IS WORSE THAN NOISE — VERIFIED IN THE
  CODE.** `tagChip()` in `site/js/menu.js` ends with a bare fallback:

  ```js
  return el("span", { className: "tag", textContent: t });
  ```

  `has-fish` is not `contains-`-prefixed, so it is not an allergen; it is not
  spicy; and it is **not in `DIETARY`** (it is labelled only in
  `addons-ui.js`, for the option picker, as *"is fish"*). It therefore falls
  through to that fallback and would render on the composed dish row as a chip
  reading literally **`has-fish`** — beside a proper `⚠ fish`. That is exactly
  the *"two tags telling the reader the same thing"* he named, in its ugliest
  form: one of them is a raw internal identifier. **This must be designed before
  it is populated, not after.**

  📋 **What the design pass has to settle**, so it is not rediscovered:
  1. Does `has-fish`/`has-meat` reach the dish's chip row at all after
     composition, or is it option-picker-only? (Today it reaches it, as a raw
     string.) A tag with no reader-facing job should not compose onto a row.
  2. When an allergen is added **by an option**, does the chip say so? The
     `added` array already carries `{tag, from}` and nothing uses it on that
     row — *"⚠ fish (from Salmon)"* is available for free and is more useful
     than a bare chip.
  3. The Subway/kebab case he named: a heavily customised item can accumulate
     several options. Design for the row that gains **four** allergens, not the
     one that gains one.
  4. `addon_check.mjs` must gain a **fish** case. Its green run today is
     evidence about peanuts and is being read as evidence about allergens.

  📋 **Original options, kept for the record — option 1 is the ruled one:**
  1. **Have the add-on tagger write BOTH tags** where an option names a
     finfish: `has-fish` for the dietary axis and `contains-fish` for the
     allergen. Correct, and it keeps the two axes separate rather than merging
     them. ⚠️ It **widens ADR 0092's owner-ruled sweep**, which is why the
     delivering session did not just do it. Needs a re-run of the option sweep
     and new absence cases in `test_tag_addon_options.py`.
  2. **Make the allergen union derive `contains-fish` from `has-fish`** in
     `addons.js`. Smaller and touches no data. 🛑 **Not recommended** — it makes
     one axis mean the other, which `010` explicitly forbids (*"neither may be
     implemented in terms of the other"*), and it would silently be wrong for
     any future dietary marker that is not an allergen.
  3. **Leave it and document the limit.** Cheapest, and it leaves a stated
     allergen preference unhonoured on a real surface. Hard to justify for an
     allergen.
  🎯 **Recommendation: option 1**, and the same question should be asked of
  **`has-meat`** in the same pass — not because meat is an allergen (it is not)
  but because the audit that finds this one should not have to be run twice.

  🚩 **`addon_check.mjs` should gain a fish case whichever way this goes.** Its
  current green run is evidence about peanuts and is being read as evidence
  about allergens. That gap is the same shape as the one this repo keeps
  paying for: *a check's description is not evidence about the check.*
