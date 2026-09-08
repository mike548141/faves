# 0103 — A branch has an id, and its position is not it

**Status:** accepted
**Date:** 2026-09-08
**Follows:** [0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — this is
its identity rule applied to a third entity, in its own shape ·
[0058](0058-a-section-has-an-id-and-its-heading-is-not-it.md) — the second
application, whose seeder and gate this copies rather than reinvents ·
[0011](0011-multi-location-venues.md) — which created the `locations` array
without giving anything in it a name

## Context

`locations[]` (ADR 0011) gave a venue several branches. Nothing pointed at one,
so nothing needed to name one, and nothing did. A branch has been addressed two
ways ever since, and neither is an identity:

- **By position.** `site/js/data.js:33-44` projects `locations[0]` to the top
  level, so the *primary* branch — the venue's address, phone, hours and the
  number an order line stores (`menu.js:1479`) — is whichever branch happens to
  be written first. Insert a new branch at the top of the array and all four
  move to a different shop, in a diff that looks like an addition.
- **By `label`.** Optional in the schema, free text in the corpus, universal
  only by habit: 47 of 47 carry one. It is also the field a transcriber is
  likeliest to tidy — the exact mutable-display-name problem ADR 0051 was
  written about, one entity over.

Three ruled things now point at a branch, which is what turns a latent defect
into a precondition:

1. **The owner's Cook at Home ruling, 2026-09-08** (`470/050`): Cook at Home
   becomes a venue with a shipped wildcard branch plus **private branches the
   reader adds on their own device**. A key stored on a phone against a branch
   in a *shipped* record must survive the next payload refresh inserting a
   branch above it. A position cannot; this is the case with no workaround.
2. **Per-branch closure** (`210/040`, owner-ruled 2026-08-22).
3. **Per-branch price overrides**, held by ADR 0080 D4 in Square's
   `absent_at_location_ids` shape — which is, literally, a list of ids.

And the standing direction to carry every Wellington-region branch of every
chain (`080/120`) guarantees the arrays keep growing and reordering.

## Decision

**A branch's identity is `id`; its `label` is display text and its position is
an accident.** Seeded once, immutable thereafter, required by `validate.py`,
unique within the record — ADR 0051's four properties, unchanged.

1. **`id` is REQUIRED on every branch, seeded from `slug(label)`.** All 47
   branches across 12 records were seeded in the commit that added the field.
   `tools/seed_branch_ids.py` does the seeding, `--check` reports the gap, and
   the tool **never overwrites an existing id** — an id a tool can rewrite is
   not an identity.
2. **The field is `id`, not `branchId`**, and the divergence from
   `dishId`/`sectionId` is deliberate. A branch is a *place*, and the record for
   a place already spells its identity `id` at the top level, so a reader who
   knows what a venue's `id` is learns nothing new. A dish and a section are
   qualified because a bare `id` on a menu row reads as that row's HTML `id`
   attribute, which is a different and derived thing. No branch has an HTML id.
3. **The id sits immediately after `label`**, the adjacency ADR 0051 credits
   with most of the benefit: someone renaming a branch meets the identity on the
   very next line and leaves it alone.
4. **A slug collision is a refusal, not an auto-suffix** — `seed_section_ids.py`'s
   rule, for its reason: a `-2` invents an identity nobody chose and then freezes
   it forever. None of the 47 collided; the refusal is for the 48th.
5. **`validate.py` gates presence, non-emptiness, slug form and uniqueness**
   (`check_branch_id`), with four mutation cases in `test_validate.py`. The
   uniqueness gate is the one with teeth, and it is *harder* teeth than
   `sectionId`'s: a duplicate `sectionId` at least makes a link land in the
   wrong place, whereas a duplicate branch id has **no visible symptom
   anywhere** — nothing renders a branch id — so the gate is the only thing in
   the repo that can ever say so.

**Nothing moves on the day it lands.** The array order is untouched, so
`locations[0]` is the same branch it was, and no screen reads the new field yet.
Cost measured against `origin/main`, not estimated: **+1312 bytes raw, +330
bytes gzipped** across the 12 files that have branches.

### On ADR 0047 — the field ships before its screen exists

ADR 0047 says *name the screen that renders it* before adding a field to
`site/data/`. No screen renders a branch id, and this is a deliberate,
narrow exception rather than an oversight: the screen is the one `210/040`
will build, and the roadmap item (`490/060`) put the cost on the record for
exactly that trade — it estimated *"about 1 KB gzipped"*, and the measured
answer is 330 bytes. The alternative is worse than 330 bytes: seeding the id
*later*, alongside the first reader, means seeding it while somebody's phone
already holds a positional key.

## Rejected

- **Derive the id from the label at read time**, the way `dishId` defaulted to
  `slug(name)` before ADR 0051. This is the shape that needs no payload at all.
  It loses for exactly the reason the owner overruled it for dishes on
  2026-08-16 — *"immutable ID's or somthing"* — and the loss is sharper here,
  because the private-branch store means a reader's own data holds the key.
- **`formerIds` on a branch**, mirroring ADR 0051 D4 and the venue level. Not
  added: no branch id has ever been published, so none can be former, and ADR
  0047 forbids shipping a field with no reader when nothing forces it. Add it
  the day a branch id genuinely has to change.
- **Deriving the id from the address** when a branch has no label. Rejected in
  the seeder and stated in its code: an address is the field most likely to be
  *corrected*, so an id derived from it reintroduces the mutable source this
  record exists to remove. A branch with no label is a refusal with a message.
- **Auto-suffixing a collision (`courtenay-place-2`).** See D4.
- **Keying the record store on the branch id too.** `data/history/` holds
  price and dish rows only, keyed on `sectionId` + `dishId` (ADR 0099); no row
  in it is per-branch, because no *price* in `site/data/` is per-branch yet.
  Adding a branch component to the key today would key rows on a dimension the
  data does not have. `split_data.py` is deliberately untouched. When ADR 0080
  D4's per-branch overrides land, the key gains a branch component then — and
  the id this record creates is what it will use.

## Consequences

- ✅ The three ruled features above have a key to name. `470/050`'s private
  branch store can hold a stable foreign key into a shipped record.
- ✅ A branch can be reordered, renamed or relocated without anything detaching.
  `locations[0]` remains the *primary* by position — that is unchanged and still
  a convention — but anything that wants to name a *specific* branch no longer
  has to say "the first one".
- ⚠️ **Nothing enforces immutability except the seeder's refusal to overwrite
  and the reader's eye**, and that is equally true of `dishId` and `sectionId`:
  no check in this repo compares an id against the committed tree, so a hand
  edit that changes one is caught by nothing. Said plainly here rather than
  implied, because "immutable" reads like a guarantee and it is a *practice* —
  the field's presence beside the label is the whole mechanism, exactly as ADR
  0051 described it ("they cannot fail" is about what a transcriber sees, not
  about what a gate refuses).
- ⚠️ A fourth entity now has an identity field and the corpus has three
  spellings of the idea (`dishId`, `sectionId`, `id`). D2 says why; a future
  session tempted to harmonise them should note that renaming `dishId` would
  detach every heart and rating on every phone.
- 🚩 `validate.py` now **requires** `id` on a branch, so a hand-added branch
  fails the gate until it is seeded. That is the intent, and the error names
  the tool to run.
