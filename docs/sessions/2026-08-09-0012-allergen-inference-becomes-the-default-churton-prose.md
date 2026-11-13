- **2026-08-09 (allergen inference becomes the default + Churton prose — Opus 5,
  wt: faves-allergen-inference)**: 🎯 **Owner ruling**, verbatim: *"it is
  preferable that we infer information like allergens where the menu writer
  hasn't bothered to define it and we have a high confidence that we are
  correct."* That inverts [ADR 0024](../decisions/0024-derived-allergen-tags.md)'s
  narrow exception, so it is **superseded by
  [ADR 0025](../decisions/0025-infer-allergens-by-default.md)** rather than amended
  — the burden now falls on *not* tagging.
  **575 tags applied** in two commits. The gap was worse than it looked: before
  this the corpus carried 45 gluten tags, 45 dairy, 18 soy, 17 egg and 1 sesame
  across 1,062 dishes — so the allergen filter was near-useless for five of the
  eight allergens it offers, not because the food was free of them but because
  menu-writers don't mention them.
  **The hard limit, and the whole safety argument**: inference may only ever
  *add* a `contains-*`. Never `gf`/`df`/`v`/`vg`, never a removal. Inferring
  presence is fail-safe; inferring absence asserts safety from a guess.
  🔎 **Three guards, every one earned from a real dry-run false positive** rather
  than imagined: per-rule exclusions ("rice noodles" aren't wheat, "oat milk"
  isn't dairy, "pumpkin pie spice" isn't a pie, a "fish cake" isn't a bakery
  cake); curation outranking a pattern (a `gf` dish never gains
  `contains-gluten`); paid add-ons not counting as ingredients. **"creamy" is
  deliberately unmatched for dairy** — in these cuisines it means coconut cream
  as often as not, and it was tagging every Malaysian laksa and curry.
  🔎 **Second find, caught while verifying a concurrent session's edit had
  survived my rebase**: the audit only read a dish's *name and description*, so
  Cook at Home's `ingredients` lists were invisible — a Chocolate Self-Saucing
  Pudding read as allergen-free despite listing flour, butter and eggs. 33 tags
  across 14 household recipes, 32 of them STATED. Best evidence in the corpus,
  and it had been ignored.
  **Churton prose** (owner steer): six section headings shortened — "Curry on
  Steamed Rice with Vegetables" → "Curry on Rice" — with the detail moved into
  41 dish descriptions that had none. Dish *names* deliberately untouched:
  `cart.js` keys an order line by name and the order sheet shows it without its
  section. Left alone on purpose: "Sweet and Sour Sauce" (item 128 isn't a
  sweet-and-sour dish, so a blanket description would be false) and R & S's
  Malaysian headings — those are dish terms, not clumsy prose. 🎯 R & S's "Chew
  Kua Tew" looks like *char kway teow*; owner to confirm with the shop.
  🚩 **Concurrency cost me a lap.** A second session was live in the primary
  tree; my first apply ran there and wrote tags on top of their in-flight recipe
  edit. Backed out precisely — their edit preserved, my tags removed, verified
  against HEAD — then redone in a worktree. Landing needed a rebase, and their
  commits had bumped `sw.js` to **exactly the version stamps I'd chosen**, which
  would have shipped 542 tag changes that installed phones never refetch. Caught
  by comparing against `origin/main` before pushing.
  Two tool bugs fixed by running it for real: `mcdonalds.json` has no literal
  `tags` arrays, and a positional patch would have written tags onto the **wrong
  dishes** — it now refuses and skips that record instead of aborting the run
  half-written (and no longer counts skipped tags as "applied" in its own
  summary). That record is normalised so it participates.
  ⚑ **Strongest queued follow-up in this area**: a `may-contain` tier showing
  which tier a tag came from. Deferred at 36 derived tags; at 291 it's more
  attractive, and it's the answer if generous flagging ever reads as wallpaper.
  Verified: only tags changed and none removed (semantic diff vs HEAD, 575
  added); re-run reports 0 outstanding; validate 31 files; node --test 372 pass;
  no-deps; SBOM; floor green; CI green at `a516918`.
**Addendum to "Recipe themes, the pudding halved, versions on About" (above) —
a self-audit before close.** The owner asked whether every point from his prompt
was landed. Re-checking each against the repo rather than from memory turned up
three things worth fixing, all now in:

1. 🔎 **The record misrepresented him.** Theme 17a said auto-scaling cooking
   times was "the one part to refuse as specified" — but his ask was *"adjust
   ingredients and **where we can** the timing"*. He had already hedged it; the
   entry now records where the line falls rather than framing it as a refusal.
   Future sessions read this as the record of what was asked, so the fairness of
   the wording is load-bearing.
2. **Two open questions existed only in chat.** The metric/imperial ask was
   *recorded, not built* — now stated as such in Theme 18 with the reason (18b
   is blocked on 17a's structured quantities; **18a is not blocked and can ship
   any time**). And the "all the relevant versions… etc" ask is now closed out
   explicitly as **16e**: the two named stamps shipped, and an audit recorded
   that the only others in the app are internal storage-schema keys, which
   identify a data shape rather than freshness.
3. Nothing else was outstanding: items 1–5 map to 17a/17b/17c/17d+17e, the
   pudding and the About versions shipped and were browser-verified.

🚩 **Found while rebasing onto the allergen-inference session: two ADRs are
numbered 0025.** `0025-settings-index-and-panels.md` (2026-08-08) and
`0025-infer-allergens-by-default.md` (2026-08-09) both exist, and
`docs/decisions/README.md` indexes only the first. A bare "ADR 0025" in prose no
longer identifies a record. **Not fixed here** — renumbering another session's
accepted ADR, and rewriting its inbound references, is that session's call and
it may still be live; this session stayed in its lane and only disambiguated its
*own* bare references in ROADMAP (Themes 15c and 16c now name the file). 🎯 The
renumber and the index entry are owed by whoever owns that record.

