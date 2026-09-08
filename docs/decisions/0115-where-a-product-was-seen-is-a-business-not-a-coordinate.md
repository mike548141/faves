# 0115 — Where a product was seen is a business, not a coordinate

**Status**: accepted • **Date**: 2026-09-09
**Supersedes**: [0090](0090-the-packaged-product-record-store.md) **rule 1
only** — *"No location, ever."* Rules 2 and 3, the `needs` rule, the
`source.kind` vocabulary and everything in that record's Consequences,
Alternatives and Addendum stand unchanged.

## Context

The owner challenged rule 1 on 2026-09-08 — *"that seems like useful metadata
to me"* — and roadmap item `500/060` measured the rule against the reason it
gives rather than recalling it.

**What the rule actually protects.** Across the 183 pantry photographs, **137
carry EXIF GPS and every one of them is the same place**: 4 distinct points at
110 m resolution, 16 at 11 m, inside a 73 m × 51 m box. That is phone jitter
around one address — the owner's home — and `data/products/` is tracked in a
public repo. So for *this* corpus the coordinate is not useful metadata being
refused; it is a **constant with a home address in it**.

**And the useful half of GPS is already harvested — the rule never stopped
it.** `tools/intake_exif.py` reads GPS and states its two jobs: it sorts loose
photographs to the right venue without trusting the filename, and it is
positive evidence of `verifiedBy: in-store` — you cannot stand at the counter
by accident. Both happen. Across the **67 menu photographs, 63 carry GPS at 12
distinct locations**; there it discriminates, and it is used. What lands in the
repo is the **derived** fact — which venue, that someone stood there — never
the number. A venue's own coordinate is already public in the payload (43 of 57
records).

🛑 **So the defect was the wording, not the decision.** Read literally, *"No
location, ever"* is a rule about the whole subject, while the evidence beneath
it supports only *"no coordinate in a tracked record in a public repo."* Two
costs follow, and the first is the reason this was put to the owner at all:

1. **A future session may stop READING GPS at intake.** That would silently
   break venue sorting and the `in-store` evidence — the rule would have
   destroyed a harvest it never meant to touch, and nothing in the tree would
   have said so.
2. **It forecloses a case that plainly could arise**: a product photographed
   *in a shop*. Then where it was seen says where that product is stocked and
   at what price — a fact about a **business**, which this repo publishes by
   the hundred — rather than a fact about him.

The item recommended **reword now, open the shop case only when a shop
photograph exists**. 🎯 **The owner overruled that recommendation on 2026-09-09
and took the wider option in one step: reword AND open the shop case.**
Recorded as his; the recommendation is left standing in the item above his
ruling so the divergence stays legible.

## Decision

**ADR 0090's rule 1 is replaced, in full, by:**

> **1. No coordinate in a product record, and no position derived from a
> photograph taken at a private address.** A product record never carries a
> number that locates anything — `lat`, `lng`, `latitude`, `longitude`, `gps`,
> `coords`, in any spelling — and never a position derived from these pantry
> photographs: 137 of the 183 carry EXIF GPS clustered inside one 73 m × 51 m
> box, that box is a private address, this repo is public, and a capture date
> plus a position is a movement record.
>
> **Reading GPS at intake is untouched, and must continue.**
> `tools/intake_exif.py` reads it for two jobs — sorting loose photographs to
> the right venue without trusting the filename, and positive evidence of
> `verifiedBy: in-store`. What may enter the repo is the **derived** fact
> (which venue; that someone stood there), never the number.
>
> **Where a product was seen may be recorded as a venue reference or a shop
> name — never a raw coordinate.** A shop is a business, and a fact about a
> business is what this repo publishes; a fact about the owner's home is not.

The privacy floor is unchanged and is not what moved: **his home coordinate
never enters a tracked file.** What moved is that the rule now says that, and
says it without also forbidding two things it was never aimed at — the intake
read, and a public fact about a shop.

**🎯 One thing this record deliberately does NOT settle, because the owner left
it open.** Whether the validator rule that admits a venue reference or a shop
name — and refuses a number in its place — **ships now** or **when the first
in-shop photograph exists**. Today there are **zero** such photographs. Both
readings are faithful to "open the shop case"; they differ only in whether the
schema grows ahead of its evidence. See *Consequences* for what is already
enforced regardless, and roadmap item `500/060`, which stays open on this fork
alone.

## Rejected

- **Leave the rule as it stands.** It is correct for every photograph that
  exists today and errs safe. It lost because "errs safe" is not free here:
  cost 1 above is a *silent* failure in a harvest that is working, and the
  wording is what invites it. The owner ruled.
- **Reword only, and open the shop case later** — this item's own
  recommendation, on the reasoning that a field with no row should be bought
  with a real photograph rather than a hypothetical. Overruled: the owner took
  the wider option in one step. It survives as the reason the *build* half is
  still a live question rather than a settled one.
- **Editing rule 1 in place in ADR 0090.** That record is accepted, and this
  repo does not edit an accepted ADR's substance
  ([`README.md`](README.md)). Superseding one clause of an accepted record has
  precedent here —
  [0075](0075-currency-is-stated-once-where-it-is-asked.md) took §3 of 0037,
  [0085](0085-a-delivery-price-fills-a-hole-it-is-not-a-feature.md) took the
  channel half of 0080, and
  [0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md)
  took 0064's timer clause. 0090 keeps a pointer beside rule 1, in 0064's
  shape.
- **Admitting a raw coordinate for the shop case too**, on the argument that a
  shop's position is public. It buys nothing: a venue reference resolves to the
  coordinate the payload already publishes, so the number in the record would
  be a second, un-checkable copy of a public fact — and the moment a record may
  hold a number, the validator can no longer tell a shop's from a kitchen's.
  The refusal of a number is what makes the rule mechanically enforceable
  rather than a matter of care.

## Consequences

- **The negative half is already enforced and needs no new code.**
  `tools/products.py` refuses every spelling of a coordinate anywhere in a
  record (`"lat"`, `"lng"`, `"latitude"`, `"longitude"`, `"gps"`, `"coords"`,
  matched over the serialised record, not over a key list), and `SOURCE_KEYS`
  is closed without a place field. *"Never a raw coordinate"* is therefore live
  today, under the old wording and the new one alike. What is **not** built is
  the positive half — a key that may hold a venue reference or a shop name —
  and that is the open fork above.
- **`tools/intake_exif.py` is explicitly out of scope of the rule**, and this
  record is the thing a future session will find when it reads *"no location"*
  and reaches for the GPS reader. Its two jobs are named here and in
  `products.py`'s rules block so the connection is not left to inference.
- **The three places that state the rule now state the same one**:
  `tools/products.py`'s rules block (the guard), `docs/ARCHITECTURE.md` (the
  compact current truth) and `CLAUDE.md`'s verify list. A guard that says
  something the record no longer says is how a superseded rule survives — this
  repo has paid for that at least twice ([0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)).
- **ADR 0047 is not the objection to shipping the positive half, and the item
  said it was.** 0047 cuts on `site/data/` (precached onto every phone) versus
  `data/` (never served) — a field in `data/products/` costs no phone a byte,
  and *"a record store with no reader is exactly what `data/` is for"* is 0090's
  own words. The precedent that does bite is
  [0080](0080-a-venue-has-menus-plural.md) Decision 4: a shape recorded before
  its first instance is a hypothesis, and the session that builds it must
  re-derive against a real instance rather than transcribe a record. That is
  what makes the fork a real question rather than a formality, and it is a
  narrower one than the item framed.
