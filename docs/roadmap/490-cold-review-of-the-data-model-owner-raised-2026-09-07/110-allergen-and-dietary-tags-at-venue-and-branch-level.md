- [ ] 🎯 **Allergen and dietary tags at venue and branch level, the way dishes
      carry them** `[M][schema][design]` — **owner-raised 2026-09-08**, in his
      answer to the venue-note question (`070`): *"perhaps we should consider
      having allergen and dietary tags at a per restaurant and per branch level
      like how we have them on dishes"*.

  🔑 **This is a different mechanism from `070`'s prose note, aimed at the same
  evidence, and it is the stronger of the two.** A note is words a reader must
  find and interpret. A **tag** is already wired into three things this app
  does: the dietary filters, the avoid-list warnings from Settings, and the
  chip rows. A kitchen-wide fact expressed as a tag would therefore *act*,
  where the same fact as prose only *informs*.

  **The evidence that it has rows to hold, today.** Simmer prints two
  statements true of its whole kitchen — *"All of our dishes may contain
  allergens…"* and *"we are unable to swap one ingredient for another"*. Sprig
  & Fern Berhampore parks a pizza-base dairy statement on a section note.
  `080/200` is the item where these were found with nowhere to live. That is a
  venue-level claim in the corpus now, not a hypothetical.

  🛑 **Three hard questions before any of it is built, because a wrong answer
  here degrades every dish in the venue.**
  1. **Which way does a venue tag COMPOSE with a dish tag?** ADR 0048 settled
     union/intersect for add-ons and the lesson was expensive: an option that
     *adds* an allergen unions, an option that *claims* a diet intersects. A
     venue-level *"may contain"* is a **weakening** of every dish's claim — the
     first thing in this model that would degrade a claim from ABOVE. Get it
     wrong and Simmer's gluten-free row stops reading gluten-free, or worse,
     keeps reading gluten-free when the kitchen says otherwise.
  2. **Is a venue-level "may contain" a WARNING or a HEDGE?** ADR 0097 drew
     exactly this line for dish text — a venue writing an allergen word to say
     the allergen is *absent* is a hedge, and a false gluten warning lands on
     the very item a coeliac is hunting for. A blanket *"all dishes may
     contain"* fires on all of them at once. If it makes every dish warn, the
     filters return nothing and the reader learns to distrust the chips.
  3. **What does a BRANCH tag mean that the venue's does not?** The obvious
     real case is a branch with a dedicated fryer or a nut-free kitchen where
     its siblings have neither. That is genuinely per-branch and worth having —
     and it makes `490/060` (a branch has no id) a precondition, again.

  🔗 **It also connects to a decision already ruled.** `340/230` shipped a
  guard that every tag has reader-facing words on all four label tables and in
  Settings' avoid list. A venue-level tag would need the same, on surfaces that
  do not exist yet (a venue header chip row). Whatever is built inherits that
  guard rather than needing a new one.

  📋 **Options, offered rather than recommended — the composition rule is the
  whole design and it is not this session's to pick.**
  1. **Venue/branch tags that only ever WARN, never claim.** A venue may say
     *may contain X* and may not say *is free of X*. Warnings union upward;
     nothing degrades a dish's positive claim. Safest, and it covers Simmer's
     real statement. It does not cover *"we cannot swap ingredients"*, which is
     not an allergen fact at all.
  2. **Full tag vocabulary at venue and branch, composing by ADR 0048's rules
     one level up.** Most expressive, and it is the version where question 1
     has to be answered exactly right for every existing dish in the corpus.
  3. **A venue-level tag that only affects the FILTERS, never the chips** — it
     changes what a venue matches on the home screen without touching any dish
     row. Cheapest to reason about; invisible to a reader already inside the
     menu, which is where the safety question actually lives.

  🚩 **Sequencing note:** `070`'s prose note was ruled *"design it wider
  first"* on the same day. If this lands, part of what the note was for may not
  need prose at all — which is an argument for designing the two together
  rather than in the order they were raised.
