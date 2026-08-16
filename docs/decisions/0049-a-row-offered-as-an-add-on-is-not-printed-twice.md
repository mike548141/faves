# 0049 — A row offered as an add-on is not printed twice

**Status:** accepted
**Date:** 2026-08-16
**Extends:** [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) — the
same session that created the duplication, ruled on hours later

## Context

Converting a menu to structured add-ons (ADR 0048) leaves the source rows in
place. Wellington Kebab Grill's five-row `Extras` section and Sprig & Fern's
twelve-row `Brunch Sides` each ended up on the page **twice**: once as an
orderable dish in its own section, once as an option inside a group.

That was deliberate at the time and for a real reason. Those rows are named by
things the app cannot see: a stored heart, a personal rating (`d:<venueId>
<name>`), a `picks` entry, and any group-order link already shared. Deleting
them breaks all of that silently, on other people's phones.

The owner was given the trade-off with that consequence stated, and ruled:
**hide the duplicated section.** A menu that prints "Extra halloumi" twice is
the version a person is actually holding in the shop, and tidiness there
outranks a stored heart on a garnish.

## Decision

A menu section may carry `"addOnsOnly": true`. The menu screen skips it — no
section, no nav link, nothing in the search haystack.

**The rows stay in the data.** This is a rendering rule, not a deletion. Every
old link, heart, rating and `picks` entry still resolves against the record;
they simply have no on-page home. That is the whole difference between this and
deleting the section, and it is why the flag is worth having at all.

**`validate.py` will not let it become a delete wearing a nicer name.** The
flag is rejected unless **every dish in the section is reachable as an option**
somewhere in the same record. Hiding rows nothing else offers would take real,
orderable food off the menu with nothing pointing at it. Proved by breaking it:
removing one option from the group makes `validate.py` name the newly
unreachable dish.

## Consequences

- A heart or rating already saved against a hidden row **stops appearing**.
  Nothing is lost — it is still in the store and returns if the section is ever
  shown again — but a reader will notice a favourite has vanished from the
  page. This was the stated cost of the ruling, not a discovered surprise.
- `tools/addon_check.mjs` asserts both halves in a real browser: the section is
  absent from the page *and* every row it hid is still offered as an option.
- The flag is per-section and opt-in. Nothing infers it, because a section that
  merely *overlaps* an add-on group is a different thing from one made
  redundant by it, and only a person reading the menu can tell them apart.
- Theme 25 (dish ids) may retire this: once an option can reference a dish by
  id rather than restate it, the duplication has no reason to exist and the
  flag becomes the compatibility shim it already looks like.
