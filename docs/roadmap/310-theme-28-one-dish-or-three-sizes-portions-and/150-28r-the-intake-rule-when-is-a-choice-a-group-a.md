- [x] **28r — The intake rule: when is a choice a group, and when is it two
      dishes?** `[S][docs]` — the thing `490/050` option (a) said it *"needs"*
      and nothing has yet written down.

  🔎 **Why it is owed, in the corpus's own words.** `490/050` records the
  owner's satay example living in the record **four ways**, each under an
  accepted ADR. And `abrakebabra`, transcribed 2026-09-07, *"added 14 more
  `Regular $x / large $y` ladders as prose, because intake has no rule to
  follow"* — a transcriber doing exactly the right thing with nothing to
  follow. Every session that transcribes a menu between now and `28p` adds to
  the pile this decomposition exists to clear.

  **What it must answer**, in `docs/ARCHITECTURE.md` beside "Refreshing a
  menu", short enough that a transcriber reads it:
  - The test, from `28a`'s own argument as `28p` re-uses it: does the variant
    need its own `desc`, `tags`, `section`, availability and `addOns`? All
    five ⇒ two dishes. None ⇒ one dish with a `selects` group.
  - Which id the base dish carries, and where the retired ones go
    (`formerIds`) — `28o`'s ruling, restated once.
  - The refusals that are **not** ladders, so a transcriber does not merge
    them: alcohol-free next to the same beer, numbered platters at the same
    price, a Kids row that is a different composition rather than a portion.
  - That an unlabelled size stays unlabelled and an unstated price stays
    unstated (`28b`'s 26 rows and Hell's 13).

  🛑 **This restates a rule; it does not make one.** The shape is `28k`'s and
  the hard case is `28i`'s. If writing it surfaces a case neither answers,
  that is a finding for the owner, not a decision for the writer.

  **Depends on:** `28i`, `28k`, `28o`. Small, and worth doing the day those
  land rather than at the end — its whole value is stopping new prose arriving.

  ✅ **Done 2026-10-18 (worker `w/310-150`; PR pending the orchestrator's
  merge).** The rule is in `docs/ARCHITECTURE.md` as "Intake — a choice on one
  dish, or two dishes?", directly after "Refreshing a menu" and its
  resolution/closure notes. Six numbered points: the five-field test and the
  `find_variants.py` pointer; dietary claims decide first (28i option 3, ADR
  0130 §3); fresh id plus `formerIds` (28o, ADR 0153); the refusals that are
  not ladders; what is not expressible yet; unlabelled and unstated stay so
  (28b, ADR 0130, 0133, 0157). Every line cites its source inline. It makes no
  new rule.

  🎯 **Findings for the owner — cases writing it surfaced that no source
  answers, listed here and not decided.**
  1. **The middle band of the five-field test.** "All five ⇒ two dishes, none
     ⇒ one dish" says nothing for a variant that needs some of the five. 28p
     rules the existing groups one at a time; no source says what a
     transcriber does with a *new* menu in that band. The text says "judgement,
     never merge on a hunch" and stops there.
  2. **Two volumes at one price (Hell's 13 drinks).** ADR 0130 §2 lets two
     options share a `dishPrice`, and six groups in the corpus do. But 28n
     lists "two volumes at one price" among the refusals that "still bind", and
     Hell's rows are still prose. The rule says a shared price is allowed and
     a second is never invented; whether intake should convert Hell's-shaped
     rows is unanswered.
  3. **Siblings that differ in `tagNotes`, order `code` or photograph.** 28o
     part 1 left such groups unmerged because a merged dish has one slot for
     each. That is an observation in a worker's report, not a ruling, and
     point 5 of the rule only repeats it.
  4. **A fresh id that equals a sibling's own id.** If the base dish's name
     slugs to an id one of the siblings already holds (a bare "Kebab" beside
     "Kebab Large"), "fresh, never a sibling's" has no spelling. ADR 0051 says a
     live id beats another dish's former one, which does not cover this.
  5. **Stale sentence in 28o.** *(Not an owner question: the orchestrator
     corrects 28o's text when part 2 lands.)* Its *What each merge does* says to "re-key that
     venue's price-history rows onto the survivor"; ADR 0153 rejected exactly
     that. The rule follows 0153. 28o's text was left alone (not this item's).

  📌 **Closed 2026-10-18 (faves-b4), PR #117 merged.** Findings 1–4 are
  carried as their own open item,
  [`170`](170-28r-four-intake-cases-no-source-answers.md), so they do not sit
  unseen under a ticked box.
