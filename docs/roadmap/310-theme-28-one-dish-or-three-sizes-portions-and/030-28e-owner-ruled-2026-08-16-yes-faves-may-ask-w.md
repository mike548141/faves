- [ ] 🎯 **28e — OWNER RULED 2026-08-16: yes, Faves may ask who the reader is.**
      Put to him as the decision it is — this would be the first thing the app
      knows about a reader beyond dietary needs. Ruled:
      > *"Yes happy to collect more info on the user like age, gold card etc to
      > get discounts or help them use Faves."*

      ⚠️ **THIS QUOTE IS UNCORROBORATED — recorded 2026-09-09, and his words are
      kept exactly as written.** The wording above appears **only in this file**.
      The independent record of the same ruling, `docs/SESSIONS.md:7782`, carries
      the decision but not the sentence: *"🎯 **Faves may ask who the reader is.**
      28e unblocked, moved to Theme 22. One concern raised and not acted on:
      **collect the entitlement, not the attribute** — a stored age rots, a flag
      does not."* `grep -rn "gold card" docs/ -i` returns nothing else relevant —
      every other hit is Sprig & Fern's *Gold Card* menu pricing, a different
      subject.
      🔑 **What is corroborated and what is not, kept apart.** ✅ Corroborated:
      that he ruled Faves **may ask who the reader is**, that 28e is unblocked,
      and that it moved to Theme 22. ⚠️ Uncorroborated: that he named **"age"**
      and **"gold card"** specifically, and that he framed the purpose as
      **"discounts"**.
      🛑 **Why the distinction is load-bearing here rather than pedantic.** The
      whole concern raised below — *collect the entitlement, not the attribute* —
      turns on whether he asked for **age** or for **eligibility**. If the word
      "age" is this record's paraphrase rather than his, then the item may be
      arguing against a position he never took, and the narrower design might
      simply be what he meant. This board has a recorded pattern of records
      getting **stronger** than their sources — conditional hardening into
      absolute, inference into attribution — and this has the exact shape.
      ✅ **Nothing here re-opens the ruling**, which stands on the independent
      record. The safe use of this note is that a session acting on the *detail*
      of the quote should confirm the wording with him first.
      ⇒ **28e is unblocked and grows beyond a schema field into a personal-layer
      feature.** It belongs with Theme 22 (the personal layer) rather than
      standing alone, and it is `[M]`+ now, not `[S]`.
      🚩 **A concern raised for him, not a refusal — his call stands either way.**
      **Collect the ENTITLEMENT, not the ATTRIBUTE.** *"Has a Gold Card"* and
      *"ordering for a child"* are what every use he named actually needs; **age
      and date of birth are not**, and they are a different sensitivity class —
      especially for children's profiles, which this app already supports. Three
      reasons the narrower field is better on its own merits, before privacy is
      even mentioned:
      - **It cannot go stale.** An age needs a birth date to stay true, and a
        stored age silently rots. An entitlement flag does not.
      - **It matches the venue's own rule.** The menu says *"Gold Card"* and
        *"12 and under"* — a door test, not a database field. `eligible: true`
        is the same claim the counter makes.
      - **It survives Theme 9 sync unchanged.** Sync pushes an E2E blob to a
        Worker; a birth date in that blob is a materially bigger promise to keep
        than a boolean, and ADR 0017's "no PII" framing would need revisiting.
      **The estate's standing rule bars a person's date of birth even in the
      research store** (ADR 0046), so DOB specifically should not be the shape
      whatever else is decided. 🎯 **If he wants true age anyway — for something
      an entitlement flag cannot do — that is his to say, and this note is the
      briefing, not an objection to it.**
