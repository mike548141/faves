- [ ] 🎯 **Claim strength has no representation, and a venue has no prose slot**
      `[M][schema][design]` — the two questions referred INTO Theme 38 (by ADR
      0097 and by `080/200`), answered with options in the review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §5 strand 13, §7
      D5 and E4).

  ✅ **OWNER RULED 2026-09-08 on the venue note — OPTION 3, DESIGN IT WIDER
  FIRST.** He declined adding `note` now, taking his own earlier steer
  seriously: *"adding a field now means designing it twice"* ⚠️ **[quote
  UNCORROBORATED — see the note at the foot of this item, 2026-09-09]**.
  So the note waits
  for the prose design it belongs to, and Simmer's kitchen-wide allergen
  statement stays attached to its Breakfast section meanwhile — which is a
  known, accepted wrong until that design lands.
  🚩 **The cost of waiting, stated so it is a choice and not a drift:** a
  statement that all dishes may contain allergens is currently invisible to
  anyone reading the dinner menu. That is the one prose case where the
  misfiling has a safety edge, and it is worth revisiting sooner than the rest
  of the prose question if the design stalls.

  💡 **AND HE ADDED A NEW IDEA IN THE SAME BREATH, which is filed as its own
  item** — *"perhaps we should consider having allergen and dietary tags at a
  per restaurant and per branch level like how we have them on dishes"*. See
  `110` in this section. It is not a variant of the note question; it is a
  different mechanism (tags, which the app already filters and warns on) aimed
  at the same evidence.


  ## Claim strength

  **What is settled.** ADR 0040 (2026-08-15) maps the Star Group's `NGA` → `gf`
  and `NGO` → `gf-option` at dish level. **What is open:** the option-level hedge
  (*"No gluten added bun"* is reviewed, never tagged — ADR 0092, 0097) and the
  weaker claims Dirty Little Secret prints (`LG`/`LD`, refused `gf` in `080/190`).
  So `southern-cross` carries `gf` beside *"No gluten added."* in five descriptions
  and `dirty-little-secret` carries nothing for the same idea. Simmer adds five
  *"no added gluten"* cabinet items, untagged. Two venues, two readings; ADR 0097
  said the question *"stays with Theme 38."*

  📋 **Options.**
  1. **Status quo** — a hedged claim stays prose, untagged. Honest, cheap, and the
     two readings stay in the corpus until ADR 0040's dish-level mapping is
     re-opened.
  2. **A weaker positive tag per claim** (`gf-hedged` or a better word): the
     filter does **not** satisfy it, the chip shows in the duller tone `350/010`
     ruled for unflagged tags, and the picker's hedge review can write it. One
     vocabulary entry, one chip label, one filter rule per claim.
  3. **A per-tag object carrying strength and provenance.** Also answers
     `110/020` (*"where does the trace tier live?"*) and `350/010` Q3
     (declared versus inferred at render). The largest payload change on the
     review's list and the only one that answers three items at once.

  The review's reading: (2) closes the two-readings defect cheaply; (3) is the
  shape the model is drifting toward and should be costed before (2) is built,
  so that (2) is not a third way of saying the same thing.

  ## A venue-level note

  Simmer prints two statements true of its whole kitchen — *"All of our dishes may
  contain allergens…"* and *"we are unable to swap one ingredient for another"* —
  and `VENUE_KEYS` has no prose slot, so both sit on the `Breakfast` section note
  (`080/200`). Sprig & Fern Berhampore parks a pizza-base dairy statement the same
  way; 1841 keeps *"open till late"* in a Mains note; Simmer's happy hour is on
  the Wine note.

  🎯 **[SUPERSEDED — he took option 3 on 2026-09-08 and declined this. Kept for
  the record.] Recommendation: add `note` to the venue**, rendered on the menu
  header under the caveat — the screen ADR 0047 asks to be named — at tens of
  bytes per venue that has one. The alternative in the corpus is a statement
  about the whole kitchen attached to breakfast. The owner's referral said
  *"adding a field now means designing it twice"* ⚠️ **[UNCORROBORATED — see
  below]**; this is the second design.

  ## ⚠️ THE QUOTE THIS ITEM RESTS ON IS UNCORROBORATED — recorded 2026-09-09

  🛑 **His words are kept exactly as written, above and here. Nothing is
  deleted.** What follows is a note about the *evidence* for them, not a
  challenge to the ruling they sit under.

  This repo's own Theme 38 cold review checked the quote **four days before this
  item was written** and marked it **UNVERIFIABLE**
  (`../../reviews/2026-09-07-1216-theme-38-cold-review.md:86`, row 17 of its
  citation audit), in these words:

  > §Referred: the owner said *"adding a field now means designing it twice"* —
  > The referral is evidenced by commit `43a4208`; the quoted words appear in no
  > record but the brief.

  🔎 **Re-checked 2026-09-09 and the finding holds.** `grep -rn "designing it
  twice"` across `docs/SESSIONS.md`, `docs/decisions/` and `docs/roadmap/`
  returns the review line above and **the two occurrences in this file** — and
  nothing else. There is no session log entry, no ADR and no transcript carrying
  it. The **referral itself is evidenced** (commit `43a4208`); it is the
  *wording* that has no first-hand home.

  🔑 **Why it is worth flagging on this item specifically.** The quote is not
  decoration here — it is cited **twice**, and it is the stated reason the ruling
  went the way it did (*"taking his own earlier steer seriously"*). A paraphrase
  that has hardened into quotation marks carries his authority forward
  unchallenged, and this board has a recorded pattern of records getting
  *stronger* than their sources, never weaker.
  ✅ **This changes nothing about the ruling.** He ruled option 3 on 2026-09-08
  and that is independently recorded; the ruling stands whether or not the
  earlier steer was worded this way. **Do not re-open the decision on the
  strength of this note** — the only safe use of it is that a future session
  quoting the line should attribute it to the brief rather than to him directly,
  or ask him.
  🛑 **The bracket stays `- [ ]`:** the claim-strength half of this item
  (options 1-3 above) is unruled and unbuilt, and the venue note is deferred to
  a prose design that does not exist yet.
