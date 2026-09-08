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
  📌 And whichever lands, ADR 0089 is accepted, so his 2026-09-06 reversal needs
  a superseding note. It currently lives **only in a code comment**, which is
  the narrowest possible home for a ruling that changed a shipped feature.


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
  note, never an edit, and his reversal needs a home other than a code comment.
  🔑 `370/010` (30g)'s question — a fee on the order or a per-dish price — is
  untouched by 0089, which chose per-dish without asking it, and its premise
  that nothing exercises a per-channel price is stale by 101 rows.
