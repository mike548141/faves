- [ ] 🎯 **ADR 0090's "No location, ever" is wider than the reason it gives, and
      it does not distinguish reading a coordinate from storing one**
      `[S][docs][schema]` — owner challenged the rule 2026-09-08 (*"that seems
      like useful metadata to me"*), and he is right that the wording overreaches.

  **What the rule actually protects, measured 2026-09-08 rather than recalled.**
  Across the 183 pantry photographs, **137 carry GPS and every one of them is
  the same place**: 4 distinct points at 110 m resolution, 16 at 11 m, inside a
  73 m × 51 m box. That is phone jitter around one address — his. So for **this**
  corpus the coordinate is not useful metadata being refused; it is a **constant
  with a home address in it**, and `data/products/` is tracked in a public repo.

  ✅ **And the useful half of GPS is already harvested — the rule does not stop
  it.** `tools/intake_exif.py` reads GPS and states its two jobs: *"it sorts
  loose photos to the right venue without trusting the filename, and it is
  positive evidence of `verifiedBy: in-store` — you cannot stand at the counter
  by accident."* Both happen. Across the **67 menu photographs, 63 carry GPS at
  12 distinct locations** — there it discriminates, and it is used. What lands in
  the repo is the *derived* fact (which venue; that someone stood there), never
  the number. A venue's own coordinate is already public in the payload (43 of
  57 records).

  🛑 **So the defect is the wording, not the decision.** Read literally, *"No
  location, ever"* is a rule about the whole subject; the evidence beneath it
  only supports *"no coordinate in a tracked record in a public repo."* Two
  costs follow:
  1. **A future session may stop READING GPS at intake**, which would silently
     break venue sorting and the `in-store` evidence — the rule would then have
     destroyed the harvest it never meant to touch.
  2. **It forecloses a case that does not exist yet but plainly could**: a
     product photographed *in a shop*. Then the coordinate says where a product
     is stocked and at what price — a fact about a **business**, which this repo
     publishes by the hundred — rather than a fact about him. Today there are
     zero such photographs, which is why nobody noticed.

  🎯 **Options for the owner. The privacy floor is not in question in any of
  them: his home coordinate never enters a tracked file.**
  1. **Reword only.** Rule 1 becomes "no coordinate in a product record, and no
     position derived from a photograph taken at a private address", with the
     intake read explicitly preserved. Costs one paragraph; changes no code;
     removes the risk of a session over-applying it.
  2. **Reword and open the shop case**: a product may carry *where it was seen*
     as a **venue reference or shop name**, never a raw coordinate — the same
     shape the menu side already uses, and a public fact about a business. Buys
     "where can I get this, and what did it cost there", which is a real feature
     for a food app. Costs a validator rule that a location may only be a
     reference to a known business, never a number.
  3. **Leave it.** The rule is correct for every photograph that exists today
     and errs safe. Free; the two costs above stay latent.

  🔑 **Recommendation: (1) now, (2) only when a shop photograph exists.** The
  rewording is pure upside — it makes the record say what the evidence supports.
  (2) is a genuinely useful feature and it should be bought with a real
  photograph rather than a hypothetical, because a field with no row is what
  ADR 0047 exists to refuse.
  ⚠️ ADR 0090 is **accepted**, so whichever he picks lands as a superseding
  note, never an edit to its Decision text.
