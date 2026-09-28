- [ ] 🤔 **22e — a dish's tags: sorted, collapsed, explained, and composed from
      its parts** `[L][design][schema]` ⚑ — owner-raised 2026-09-28 from the
      Chocolate Lava Cakes recipe. Four asks in one message; two ruled the same
      day, one open. **Build none of it piecemeal** — the chip row is rendered
      by TWO implementations today (`menu.js` `tagChip`/`tagOrder` and a mirror
      in `recipe.js`) that already disagree: the menu dulls an unflagged
      allergen and drops "Contains" (22d, 2026-08-17), the recipe page does
      neither. One shared module first, then the rules below land once.

## What he asked (verbatim intent, 2026-09-28)

1. **Compose tags from parts.** Allergens and diet labels attach either to the
   dish as a whole or to one add-on / ingredient that might be varied (the
   Whittaker's chocolate could be swapped for one without peanut traces). The
   reader still sees ONE row of tags that updates live as parts change. Not
   letting readers swap recipe ingredients yet — but ONE mechanism for add-ons
   and ingredients, so it is future-proof.
2. **Tap a tag for why.** "Contains peanuts" opens a tip naming what caused it,
   the same control as the venue's "last checked" ⓘ (`disclosure.js`).
3. **Sort.** Allergens before food preferences. Allergens: contained before
   not-contained, alphabetical within each group. Preferences: the reader's
   selected ones first, alphabetical within each group.
4. **Collapse.** When a dish has N or more tags (N a variable, starting 3),
   hide the less important ones behind a control that shows them all. A tag
   matching the reader's own allergy or preference is NEVER hidden.
5. **(Same day) A note on an ingredient** — e.g. "you can substitute other
   chocolates, dark is recommended" — written by the owner, the source, or
   inferred by us.

## Ruled 2026-09-28

- ✅ **Collapse = "hide, labelled".** The "+N" control says WHAT it hides
  (e.g. "⚠ +3 allergens"), so a hidden allergen is never silent. Flagged /
  selected tags always show, even past N. N = the most tags shown; collapse
  only when it would hide at least 2 (a "+1" costs the space it saves).
  🔑 **How this sits against 22d, as the owner framed it:** 22d's ruling had
  two halves — (a) a tag matching the reader's declaration behaves exactly as
  before and is never hidden; (b) every other tag is dulled, *never hidden*.
  Today's ruling **keeps (a) verbatim** (his 4.2.1) and **replaces only (b)'s
  "never hidden"**: an unflagged tag may now sit behind the labelled control.
  The safety core — a declared allergy is always on screen — is unchanged.
- ✅ **Tag tips record the reason.** For a venue dish (no ingredient list) the
  allergen tagger stores the words that triggered each tag (e.g. "satay →
  peanuts", tier STATED/DERIVED/PHOTO) in the payload, and the tip shows it.
  ADR 0047's test is met: the tip is the screen that renders it.
- ✅ **Buttons** — separate ask, shipped `281b57b` (one action row).

## Flaws found in the spec, and the resolution taken

- 🔎 **His own example did not follow from 4.1.2–4.1.3.** Alphabetically,
  peanuts sorts after dairy, egg, gluten and nuts; it comes first on his screen
  only because he flagged it. **Added rule: allergens the reader flagged come
  first** — the mirror of 4.1.4 for preferences.
- 🔎 **"Allergens it does not contain" is an empty group by construction.** The
  app never asserts "free of X" (ADR 0025: no tag = not stated). The only
  absence claims are `gf`/`df`(+`-option`), which are diet labels. Resolution:
  they stay in the preference group; the allergen group is `contains-*` only.
- **Heat (`spicy-*`) is covered by no rule.** Proposed: a preference-group tag
  with no setting, so it sorts in the unselected group. Not yet ruled.
- **Allergens and diet labels compose in OPPOSITE directions.** An allergen on
  any part is on the dish (union). A diet label holds only if EVERY part holds
  it; an untagged part leaves it unknown, never true (ADR 0092's "we can't
  say"). So swapping the chocolate drops the peanut warning only if the
  replacement is positively tagged. `addons.js` `composeTags` already does
  this — recipes reuse it, with an ingredient as a fixed, pre-selected option.
- **Chips as tap targets are 44px tall**, which lengthens the row the collapse
  is trying to shorten. Accepted cost; measured when built.

## 🎯 Open — "may contain" (the Whittaker's case)

His question: *"What do we already do with may contain vs does contain? I
remember I ruled on this previously based on allergens published for pizzas."*
**He did — `110/020`, ruled 2026-08-16 and again 2026-09-09 (Pizza Hut's P/T
chart): only PRESENT becomes a `contains-*` tag; TRACE is kept in `site/data/`
but is not a tag and no screen renders it. Not built.**
🚩 **The lava cakes and the brownie contradict that ruling today:** both carry
`contains-peanuts` and `contains-nuts`, and the only evidence is the chocolate
label's *"may contain peanuts and tree nuts"* — a trace statement. Under the
ruling those two tags come off and the trace is recorded instead. Removing a
peanut warning is not a step to take silently, and the new tag tip gives trace
its first natural screen (the tip under a present tag, or a quiet line), so
this goes back to him with that option rather than being applied.

## Build order (when claimed)

1. One shared chip module (`menu.js` + `recipe.js` → one), 22d's dulling on both.
2. Sort (with the flagged-first rule) + labelled collapse, N in one constant.
3. Per-tag reason in the payload (tagger writes it) + tap tips.
4. Recipe ingredients as objects `{ text, tags?, note? }` through
   `composeTags`; ingredient notes with a `source` (owner / publisher /
   inferred — inferred says so on screen). Touches the scaler, checklist keys
   (keep keying on `text`), shopping list and cook mode.
5. The trace tier, once "may contain" is answered.
