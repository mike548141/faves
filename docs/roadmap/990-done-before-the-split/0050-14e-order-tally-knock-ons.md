- [x] ✅ **14e — Order-tally knock-ons** — **shipped 2026-08-16**. Line
  identity widened to `(venueId, name, selectionKey)`; a line's `price` is now
  the *configured* unit price, which is why the totals maths needed no change.
  🔎 **The codec did NOT bump, against this item's expectation.** Measured:
  `CODEC_VERSION` is shared by orders, shortlists *and* personal transfers and
  checked with a strict `!==`, so bumping it would invalidate every outstanding
  link of all three kinds for a change two of them never use. The selection is
  appended as a fourth positional slot, which every existing decoder ignores by
  construction. Original note: a dish added twice with different
  add-ons is **two lines, not a quantity of 2**; the subtotal maths takes add-on
  prices; and the group-order share codec (ADR 0009) has to carry the
  configuration, which means a **versioned codec bump** and a receive-side path
  for links minted before it. Audit these together before building 14a, not after.
