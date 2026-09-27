# 0126 — An add-on option has an id, and its name is not it

**Status:** accepted
**Date:** 2026-09-28
**Follows:** [0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — its
identity rule, and its owner ruling, applied to a fourth entity ·
[0103](0103-a-branch-has-an-id-and-its-position-is-not-it.md) — whose seeder
this copies · [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md)
§4 — which put the add-on selection into the order line's identity

## Context

An order line's identity is `venueId · dishId · selection · note`
(`site/js/cart.js` `lineKey`), and the selection part (`selectionKey`,
`site/js/addons.js`) identified each chosen option by its group id and its
**display name**. Options carried no id: `validate.py` gated `name`, `price`
and `tags`, and nothing else — 200 options across 50 groups in 14 records.

So a venue renaming "Large" to "Lg" re-keyed every order line saved on a phone,
every backup file and every outstanding share link that chose it: each would
stop merging with the line the picker makes after the rename. That is the fault
ADR 0051 fixed for dishes and left open one level down. It was an annoyance
while an option was a sauce; after `490/050` an option is a **size or a
protein**, and a mis-keyed one is the difference between a $14.50 plate and a
$29.00 one.

🔎 **The roadmap item's second finding was not true, and is recorded as such.**
It said `selectionKey` had *no delimiter*, so `{group:"a", name:"bc"}` and
`{group:"ab", name:"c"}` collided. They never did: the line carried a raw
U+001F between group and name and a raw U+001E between entries — bytes most
editors and terminals render as nothing, which is how the review read it as
`${s.group}${s.name}`. The residual hole was narrower: a separator *inside* a
part, which a crafted share link or backup file is free to send
(`{group:"a\u001fb", name:"c"}` and `{group:"a", name:"b\u001fc"}` were one
key). The fix below closes that by construction, and the separators are now
written as `\u001f` / `\u001e` escapes so the next reader can see them.

## Decision

1. **An option's identity is its `id`; `name` is display text.** Resolved by
   one function, `optionId()` in `site/js/addons.js` — `id` where present,
   `slug(name)` otherwise — which is `dishId()`'s rule one entity down.
2. **The id is STORED in `site/data/`, required, seeded once from
   `slug(name)`** (`tools/seed_option_ids.py`, all 200). Stored rather than
   derived for exactly the reason ADR 0051 gives, and under the owner's
   2026-08-16 ruling it quotes (*"immutable ID's"*): an id recomputed from the
   name moves when the name moves, which is the defect itself one step removed.
   A transcriber renaming an option meets `"id": "large"` beside the name and
   leaves it. `validate.py` requires it, requires slug form, and requires it
   **unique within its group** — the scope the key uses; two groups may each
   offer a `large`. The field is `id`, like its group's and a branch's.
3. **Nothing moves on the day it lands.** Every seeded id equals `slug(name)`,
   which is what `optionId()` resolves a stored `{group, name}` to — so a line
   saved before 2026-09-28 and a line the picker makes now produce the same key, and
   continue to after a rename, because the id was pinned when the name moved.
   The name-to-slug fold cannot merge two options that were distinct: measured,
   no two options in any group slug alike (and the gate now keeps it so).
4. **The key cannot collide by construction.** The option half is a slug (or,
   for a stored name that slugs to nothing, `~` + percent-encoding — no slug
   starts with `~`); the group half is percent-encoded, which leaves every
   kebab-case group id byte-identical. Neither can contain U+001F or U+001E.
5. **Every carrier of an option was walked, because a whitelist sheds the field
   added after it:** the picker's selection and the line it hands `order.add`
   (`addons-ui.js`), the backup sanitiser (`personal-data.js`
   `sanitiseOptions`), and the share wire. The order tally is not synced
   (ADR 0012), so sync carries it only as the already-sanitised snapshot.
6. **`CODEC_VERSION` is not bumped.** The id rides as an optional fourth element
   of the option tuple, `[group, name, price, id?]`, emitted only where it says
   something the name doesn't — so every link minted on the day this shipped is
   byte-identical to before. A decoder that predates it reads `o[0..2]`; for a
   renamed option it keys by the new name and may fail to *merge* with an
   identical line already on the phone, but never mis-states the order. Decoded
   and restored ids are forced through the slug.

## Rejected

- **Derive the id at runtime from `slug(name)`, ship nothing (ADR 0047's
  cheapest reading).** Weighed seriously, because ADR 0047 asks that a payload
  field name the screen that renders it, and no screen *prints* an option id.
  It lost on the item's own acceptance test: "renaming an option's display name
  leaves the line key unchanged" is false by definition for an id computed from
  the display name. The answer to ADR 0047's question is the same one ADR 0051
  gave for `dishId`: the screens that read it are the order tally, the order
  sheet and the share link, which key on it — a field read by the screen is a
  field the screen needs, whether or not it is painted. Measured cost:
  **+5.9 KB raw, +0.74 KB gzipped** across the 14 records.
- **Optional id, required only when it differs from `slug(name)`.** Smaller
  still, and the shape the owner overruled for dishes on 2026-08-16: it holds
  only if every transcriber remembers to add the id *at the moment of renaming*,
  and a rule a person has to remember is the thing the field exists to replace.
- **Add a delimiter only (the item's option 2).** The delimiter was already
  there, and it does nothing for a rename.
- **Forbid renaming an option (option 3).** Unenforceable; a venue renames what
  it likes.
- **`formerIds` on an option, as on a dish.** Not built: an option whose id
  genuinely has to change has no stored heart, rating or anchor to strand, only
  order lines, which are short-lived. Add it when a case arrives.

## Consequences

- A venue can rename an option without stranding a saved order, backup or
  share link; `validate.py` fails a menu where two options in one group would be
  one order line.
- `tools/seed_option_ids.py --check` reports any option added by hand without an
  id; `validate.py` is the gate that makes it matter, and runs in CI.
- `addon_check.mjs` stages a line in the pre-change shape, reloads, and asserts
  today's picker finds it and merges into it — both unchanged and after the
  venue renames the option (a fixture). Unit tests pin the no-collision property
  over the whole corpus as well as over crafted inputs.
- ⚠️ As with `dishId`, `sectionId` and a branch `id`, **nothing but the seeder's
  refusal to overwrite and the transcriber's eye enforces immutability.** A
  session that "tidies" an option id to match its new name strands every line
  that chose it, and no gate can tell that from a legitimate new option.
