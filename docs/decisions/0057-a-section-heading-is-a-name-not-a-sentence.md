# 0057 — A section heading is a name, not a sentence

**Status:** accepted
**Date:** 2026-08-16
**Relates to:** [0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — the
same "one string doing several jobs" fault, one level up the tree

## Context

The owner opened The Borough's menu on his phone and hit the jump-nav strip:

> *"Where a menu section has a time limit like this brunch, don't put the time
> into the section heading because it makes the section heading too big in the
> top section heading list."*

`Brunch (served till 2pm)` is a 24-character chip in a horizontal strip the
reader scrolls with a thumb. It is not the worst one — Sprig & Fern's
`Gold Card (Mon–Fri 11:30–17:30, weekends 10:00–17:30)` is **53 characters**,
a chip wider than a 390 px screen.

The heading string is doing two jobs at once, and they want opposite things:

| Job | Wants |
|---|---|
| **Name** — the chip in the jump-nav, the anchor, the label in search results (`app.js:662`) | As short as it can be and still be distinct |
| **Qualifier** — when the section is served, who may order from it | As long as it takes to be true |

Six sections in the corpus had crammed a time qualifier into the name. Ten more
carry a non-time parenthetical (`Kids (12 and under)`, `Tacos (two tacos each)`)
that has the same shape.

## Decision

**A section may carry `note` — the qualifier the venue prints beside its
heading — and the qualifier never lives in `section`.**

```json
{ "section": "Brunch", "note": "served till 2pm", "items": [ … ] }
```

The menu screen renders it as a `<p class="section-note">` under the `<h2>`.
The jump-nav chip and the anchor are built from `section` alone, so both stay
short.

### Why not `available.note`, which already exists

Considered first, and rejected on two grounds — the second is the one that
matters:

1. **`validate.py` refuses it today.** `check_available` requires at least one
   of `from`/`to`/`offBy`/`season`; a note-only `available` is invalid. Landing
   the qualifier there would have meant loosening a gate to fit a use it was
   not written for.
2. **`available` is a filter object.** `isAvailable()` and `isRetired()` act on
   it and can remove a section from the menu entirely. Putting a purely
   presentational string inside it makes a section's *visibility* look
   conditional when nothing about it is. That is a claim the data would be
   making by accident.

So the two stay apart, and mean different things: **`available.note` is why a
section is on the menu at all** ("The Borough's entry in Burger Wellington");
**`section.note` is what the venue prints beside the heading**. Where a section
has both they stack as two paragraphs rather than being joined — separate facts
from separate sources, and joining them with a separator would assert they are
one statement. No venue carries both today.

### Prose, not structure — deliberately

`note` is a string and nothing parses it. That is honest rather than lazy:
`Mon–Fri 11:30–17:30, weekends 10:00–17:30` is a weekday-plus-interval rule
that the schema **cannot express** — ROADMAP 28c is the open item for it, and
`hours.js` already does exactly this reasoning for a venue's own opening hours.
Until that lands, "we have the words, not the structure" is the true state of
the data, and a prose note is the encoding that says so. When 28c does land it
adds a structured field beside this one; no migration, because the note was
never pretending to be machine-readable.

### The gate that earns the field

`validate.py` rejects a `note` whose text is **still inside the section name**.
The failure mode this exists for has no symptom: a split started and not
finished leaves the data looking migrated, the chip as long as it ever was, and
the reader told "served till 2pm" twice. Proved by breaking it — putting the
qualifier back into The Borough's heading makes `test_validate.py` fail.

## Consequences

**Deep links to a renamed section stop scrolling.** The owner's own URL,
`…?id=the-borough-tawa#section-brunch-served-till-2pm`, is now
`#section-brunch`. Nothing in the data breaks: `find_dish()` resolves picks and
`goesWith` refs by dish id or name and never by section slug. Only a
previously-shared anchor is affected, and it degrades to landing at the top of
the menu.

🔎 **That breakage is a finding, not a cost of this change.** A section's anchor
is derived from its *display name*, so renaming a heading silently invalidates
every link to it — the same fault ADR 0051 fixed one level down, where the
owner's own words were **"identity must be immutable"**. This change did not
create it; it fired it. Recorded as a ROADMAP finding under Theme 28 rather
than fixed here, because section ids are a schema change with its own
migration and no one has asked for one.

**The note is not sticky.** `.section-title` pins under the toolbar while you
scroll its dishes; the note scrolls away with the content. A two-line sticky
block would cost the top of a 390 px screen on every section that has one, and
the qualifier is read on arrival rather than scanned. The trade-off: a reader
who lands mid-section by deep link scrolls up to see it.

**Scope was the six time-qualified sections, because that is what was asked.**
The ten non-time parentheticals (`Kids (12 and under)`, `Burgers (all served
with fries)`, `Kua Teaw Dishes (Noodle Soup)`) use the same field when someone
decides they should — and the last of those is a *translation*, not a
qualifier, which is why the sweep was not automated on the bracket.
