- [ ] 🎯 **`prices` and `priceChannels` ship to every phone and nothing renders
      them** `[S][schema][docs]` — owner's decision, put by the Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §5 strand 8, §6 C3,
      §7 D1).

  ✅ **OWNER RULED 2026-09-08 — OPTION 3, DESIGN A RENDER HE WOULD ACCEPT.**
  Not option 1 (keep them shipping on a promise) and not option 2 (move them to
  `data/`). So the fields stay in the payload **and** ADR 0047's test now has a
  deadline rather than an exemption: a screen must be named.
  🛑 **What the ruling does NOT license.** The thing he rejected on 2026-09-06
  is on the record in `site/js/menu.js:1417-1429`: *"this is not how we are
  going to show pricing variances over time, per channel, delivered vs
  in-store… this is just you dumping more content in the UI."* A quiet second
  line under every price is the design that already failed. Anything proposed
  here has to be a different idea, not the same idea in a smaller font.
  🎯 **Still his, and unanswered:** what the render actually is. This session
  put the disposition to him, not the design. The next session should bring him
  **two or three sketched alternatives with their costs**, not ask him an open
  question — the open question is what produced the rejected line.
  📌 ~~And whichever lands, ADR 0089 is accepted, so his 2026-09-06 reversal
  needs a superseding note. It currently lives **only in a code comment**, which
  is the narrowest possible home for a ruling that changed a shipped feature.~~
  🛑 **FALSE — CORRECTED 2026-09-09. The superseding note ALREADY EXISTS and the
  reversal is NOT only in a code comment.** `docs/decisions/0089-a-dish-has-a-price-per-door.md`
  carries a section headed **`## Partly superseded, 2026-09-08 — the render, not
  the model`** (line 122), which opens *"Recorded here as a pointer, not as an
  edit. The Decision above is unchanged and its model still ships. One clause of
  it does not"*, quotes the removed line, and then quotes him **verbatim**
  (lines 130-133) — the same words this item attributes to the code comment
  alone. It also records his reasoning (*the ruling he had given was about the
  DATA MODEL … putting a second price on every row was a rendering decision
  nobody asked for*) and closes by routing the ADR 0047 question to this very
  item by number.
  🔑 **Why this correction matters rather than being pedantry: it inflates the
  item's own ask.** As written, this item tells the next session it owes a
  superseding note on an accepted ADR — a real piece of work, done carefully or
  not at all. That work is done. Left standing, the likely outcomes are a
  session writing a second superseding note on the same clause, or a session
  editing the accepted record because it believes nothing else covers it. The
  repo forbids the second outright.


  **The facts, measured at `de6d2b7`.** ADR 0089 (accepted 2026-09-06, owner-ruled)
  put a per-door price on the dish and a `priceChannels` block on the venue: **101
  dishes in 2 venues** (`kk-malaysian` delivery ×29, `rs-satay-noodle-house` online
  ×72). Its Decision says *"The dish row renders a quiet second line"*. The line
  shipped the same day and **the owner removed it the same day** — his words,
  recorded only in `site/js/menu.js:1417-1429`: *"this is not how we are going to
  show pricing variances over time, per channel, delivered vs in-store… this is
  just you dumping more content in the UI."* `grep -rn "priceChannels\|\.prices\b"
  site/js` finds no reader. Cost: 582 bytes gzipped across the payload.

  🚩 **Three records are wrong about it.** ADR 0089's Decision text; CLAUDE.md's
  `focus_check` blurb (*"the price on a row is the COUNTER price with the delivery
  one subordinate to it"* — the check asserts the **absence** of a second price);
  and this theme's own `010` item, which said it *"already renders"*.

  **Why it is a decision and not a tidy-up.** ADR 0047's test is *"name the screen
  that renders it"*, and the answer as at 2026-09-08 is none. ADR 0085 §5 already
  permits a channel note in `data/` as provenance. So three shapes are open:

  1. **Keep the fields in the payload** on the record that a render is owed and
     will be designed as its own piece of work. Cheapest; ADR 0047 stays
     unsatisfied on the newest field in the schema meanwhile.
  2. **Move them to `data/` as provenance** (ADR 0085 §5), keep `price` as the
     counter, let the `verifiedBy` caveat keep saying where a fallback price came
     from. `split_data.py` gains a third relocation; `--check` proves it.
  3. **Design a render the owner would accept** — not a second number on every
     row — and ship it, which satisfies ADR 0047 as ADR 0089 intended.

  Whichever he picks: ADR 0089 is accepted, so the correction is a superseding
  note, never an edit. ~~and his reversal needs a home other than a code
  comment.~~ ✅ **It has one — ADR 0089 § *Partly superseded, 2026-09-08*. See
  the correction above (2026-09-09).**
  🔑 `370/010` (30g)'s question — a fee on the order or a per-dish price — is
  untouched by 0089, which chose per-dish without asking it, and its premise
  that nothing exercises a per-channel price is stale by 101 rows.

  📝 **BOARD HYGIENE 2026-09-09 — what this item still owes, and what it does
  not.**
  - ❌ **Owed and now removed from the ask: the superseding note on ADR 0089.**
    It exists. Corrected in both places above; the wrong text is struck through
    rather than deleted so the diff is legible.
  - ✅ **Re-measured and CORRECT as written: "101 dishes in 2 venues"**
    (`kk-malaysian` ×29, `rs-satay-noodle-house` ×72 — counted from
    `site/data/restaurants/*.json` on 2026-09-09, exactly 101). And
    `grep -rn "priceChannels\|\.prices\b" site/js` still finds **no reader**.
  - 🎯 **STILL LIVE AND STILL HIS: what the render actually is.** Option 3 was
    ruled on 2026-09-08, so the *disposition* is settled and the *design* is
    not. The instruction above stands — bring him two or three sketched
    alternatives with their costs, never an open question, because an open
    question is what produced the line he deleted.
  🛑 **The bracket stays `- [ ]`.** A screen is owed and none exists.
