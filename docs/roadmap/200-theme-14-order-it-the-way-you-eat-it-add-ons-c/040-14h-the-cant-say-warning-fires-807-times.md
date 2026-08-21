- [ ] **14h — The "we can't say" warning fires 807 times, and Spinach is one of
      them** `[S][data]`+`[S][ux]` — **owner-raised 2026-08-17**, looking at
      *"We can't say whether Bacon is vegetarian, so we can't say this still is.
      We can't say whether Bacon is gluten free, so we can't say this still is."*
      and asking what value it has. **Answer: almost none, and it costs the
      warnings that do matter.**

**Measured, not asserted (2026-08-17).** Of **155** add-on options in the
corpus, **62 carry dietary tags and 93 do not** — 40% coverage, concentrated in
seven venues. Cross that against dishes that make a dietary claim and the
untagged-option branch of `addons-ui.js`'s `refresh()` fires on **807
option × dish combinations**. Among them: *Spinach* and *Tomatoes* stripping the
`v` claim off Sprig + Fern's Thick Cut Fries.

🚩 **This is the exact failure `addons-ui.js`'s own header forbids.** It says
the fact-shaped line and the absence-shaped line are *"said differently on
purpose … flattening them into one warning would teach the reader to discount
both, and a discounted allergen warning is worse than none."* Firing the
absence-shaped line 807 times, on spinach, does the discounting anyway — by
volume rather than by wording.

**Three separate problems, and only the third is about words:**

1. **It reports OUR data gap as if it were the reader's risk.** Nobody needs
   telling bacon is not vegetarian; what the line actually says is that we did
   not tag the option.
2. **It fires indiscriminately**, so the reader cannot use its presence as a
   signal — which is the only thing a warning is for.
3. **It is two sentences to say one thing**, repeating the option's name in
   both.

🎯 **The recommended fix, in the order that matters (owner's call, not yet
taken).**

- **(a) Tag the 93 untagged options.** `Bacon`, `Sausages`, `Salmon`,
  `Halloumi` are not judgement calls. This converts the line from an absence
  into a **fact** — *"Bacon is not vegetarian, so this is no longer
  vegetarian"* — which is the branch the module already prefers and already
  words better. Model it on `tools/tag_allergens.py` (ADR 0024): a re-runnable
  script plus a `validate.py` warning, never a hand sweep across 31 venues,
  which is how the allergen inconsistency got made in the first place (14b
  learned the same lesson).
- **(b) Collapse whatever remains unknown into ONE quiet sentence** per
  configuration rather than one per claim per option — e.g. *"Extras aren't
  tagged, so Veg and GF option describe the dish as listed."*

🛑 **What must NOT change: the repo still never asserts the ABSENCE of an
allergen** (ADR 0025, and `search.js`'s synonym map holds the same line — there
is deliberately no "nut free" synonym). Tagging *Bacon* as containing meat is a
positive claim from the option's own name; tagging *Spinach* as "gluten free"
would not be, and is not what (a) asks for.

🔎 **Why this sits in Theme 14 and not with the allergen items:** the tagging
target is the **add-on option**, a field only the picker reads. 37n is about the
corpus disagreeing with itself on *dish* tags and is a different sweep.

✅ **RULED 2026-08-22 — DO (a) THEN (b), THE RECOMMENDED ORDER.** The owner took
the full fix: **tag the 93 untagged add-on options first**, so the line becomes a
*fact* the module already words better (*"Bacon is not vegetarian, so this is no
longer vegetarian"*), **then** collapse whatever is still unknown into one quiet
sentence per configuration. The wording-only option was declined — so the data
gap is being closed, not papered over.

📋 **Binding constraints on (a), restated because this is where it can go wrong.**
- **Model it on `tools/tag_allergens.py` (ADR 0024): a re-runnable script plus a
  `validate.py` warning.** Never a hand sweep across 31 venues — that is how the
  allergen inconsistency got made in the first place, and 14b learned it again.
- 🛑 **Positive claims ONLY.** Tag *Bacon* as containing meat because the
  option's own name says so. **Do NOT tag *Spinach* "gluten free"** — the repo
  never asserts the ABSENCE of an allergen (ADR 0025, and `search.js` carries the
  same line with no "nut free" synonym). Closing the gap means saying what IS
  present, never what is missing.
- The target is the **add-on option**, a field only the picker reads. This is not
  37n, which is about the corpus disagreeing with itself on *dish* tags.

🔑 **Baseline to re-measure against, not to trust:** 155 options, 62 tagged, 93
not — 40% coverage concentrated in seven venues, giving 807 option × dish
combinations. Those numbers were taken 2026-08-17. **Re-derive them before and
after**; a fix whose effect is reported from a stale count proves nothing.
