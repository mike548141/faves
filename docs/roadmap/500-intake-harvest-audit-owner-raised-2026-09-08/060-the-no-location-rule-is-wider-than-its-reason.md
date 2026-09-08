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

  ---

  ✅ **OWNER RULED 2026-09-09 (session faves-p1) — OPTION 2: REWORD **AND**
  OPEN THE SHOP CASE.** He overruled this item's own recommendation of (1)
  now / (2) later, and took the wider option in one step. Recorded as his,
  with the recommendation left standing above so the divergence is visible.
  🎯 **One thing option 2 does not settle, and it is left open for him:**
  whether the validator rule ships **now** (a field with no rows — which is
  what ADR 0047 exists to refuse, and the stated reason this item recommended
  waiting) or **when the first in-shop photograph exists**. Today there are
  **zero** such photographs. Both readings are faithful to "open the shop
  case"; they differ in whether the schema grows ahead of its evidence.
  📌 The privacy floor is untouched either way: his home coordinate never
  enters a tracked file, and the wording change is what stops a future
  session reading *"No location, ever"* as *"never read GPS at intake"* and
  silently breaking venue sorting.
  ⚠️ ADR 0090 is **accepted**, so this lands as a **superseding note**, never
  an edit to its Decision text.

  ---

  ✅ **DELIVERED IN PART 2026-09-09 (session faves-p1, PR on
  `p1-location-rule`) — the rewording. The item stays OPEN on the validator
  fork alone.**

  **What landed.**
  [ADR 0115](../../decisions/0115-where-a-product-was-seen-is-a-business-not-a-coordinate.md)
  supersedes **ADR 0090's rule 1 in full**; 0090 keeps a pointer beside rule 1
  (0064's shape) and its Decision text is otherwise untouched. Rule 1 now
  reads: *no coordinate in a product record, and no position derived from a
  photograph taken at a private address* — with **reading GPS at intake
  explicitly preserved**, and *where a product was seen* admissible as a
  **venue reference or shop name, never a raw coordinate**. The same wording
  now stands in `tools/products.py`'s rules block, its coordinate-refusal
  error message, `docs/ARCHITECTURE.md` and `CLAUDE.md`'s verify list — and
  `tools/intake_exif.py` gained a header paragraph telling a future session
  **not to delete its GPS read**, which is cost 1 above defended at the file
  it would have been deleted from.

  🎯 **STILL OWED, AND IT IS THE OWNER'S: does the validator's positive half
  ship now, or when the first in-shop photograph exists?** Not resolved here.
  Two measurements sharpen the question since it was written:
  1. **The negative half already ships.** `products.py` refuses `lat`, `lng`,
     `latitude`, `longitude`, `gps` and `coords` over the serialised record,
     and `SOURCE_KEYS` is closed with no place field. *"Never a raw
     coordinate"* is live today. Only the **positive** key — one that may hold
     a venue reference or a shop name — is unbuilt, and it has **zero** rows
     to shape it.
  2. 🔎 **This item's stated reason for waiting cites the wrong record.**
     ADR 0047 cuts on `site/data/` (precached to every phone) versus `data/`
     (never served); a field in `data/products/` costs no phone a byte, and
     *"a record store with no reader is exactly what `data/` is for"* is ADR
     0090's own line. The precedent that **does** bite is
     [ADR 0080](../../decisions/0080-a-venue-has-menus-plural.md) Decision 4 —
     *a shape recorded before its first instance is a hypothesis, and the
     session that builds it must re-derive against a real instance*. Same
     answer, sounder reason, and a narrower question than the framing above
     implied. The recommendation is unchanged: **build it against the first
     real in-shop photograph**, so the key's shape is disciplined by an actual
     record rather than invented.

  ---

  🎯 **OWNER CORRECTED THE PREMISE 2026-09-09 (session faves-p1).** Asked
  whether the validator for the new shop field should ship now or wait for the
  first in-shop photograph — the ask stating there were **zero** — he replied:
  *"There are photos of products and menus taken in the restaurants."*

  🔎 **Measured in response, and the correction is right about MENUS and not
  yet demonstrable about PRODUCTS. The two corpora are different and this
  rule governs only one of them.**
  - **Menu photographs — his point holds, and it is already load-bearing.**
    63 of 67 carry GPS across **12 distinct locations**; that is exactly what
    `verifiedBy: in-store` rests on. Nothing about them is in question here:
    ADR 0090 governs `data/products/`, not menu evidence.
  - **Product (pantry) photographs — no in-shop one is yet identifiable.**
    Clustered at 500 m from `product_bursts.py --json`: **119 photographs in
    25 bursts, all in ONE cluster.** The remaining **64 photographs in 34
    bursts carry no GPS at all**, so their location is unknown and cannot be
    ruled either way. No coordinate is printed here; this repo is public.
  - **The 15 product records that mention a retailer are NOT evidence of an
    in-shop photograph** — checked one by one rather than counted. Every hit
    is a **brand name** (Woolworths own-brand), a **manufacturer's address**,
    or an `alsoRead` reference to a retailer's **website**. None describes a
    shop shelf.

  🎯 **So one narrow question is still owed, and it decides whether a schema
  field gets built on a real case or a misreading:** does he mean the **menu**
  photographs (already covered, and the field stays unbuilt), or does he have
  **product** photographs taken in a shop — which would be among the 64 that
  carry no GPS, or not yet imported? If the latter, pointing at one settles it
  and the field should be built against that instance, per ADR 0080 D4's rule
  that a shape recorded before its first instance is a hypothesis.
  📌 Nothing built either way. The rewording — the half he ruled on that was
  unambiguous — is delivered and merged (ADR 0115).
