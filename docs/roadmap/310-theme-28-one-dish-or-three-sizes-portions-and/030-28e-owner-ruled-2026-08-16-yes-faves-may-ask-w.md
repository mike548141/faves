- [ ] 🎯 **28e — OWNER RULED 2026-08-16: yes, Faves may ask who the reader is.**
      Put to him as the decision it is — this would be the first thing the app
      knows about a reader beyond dietary needs. Ruled:
      > *"Yes happy to collect more info on the user like age, gold card etc to
      > get discounts or help them use Faves."*
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
