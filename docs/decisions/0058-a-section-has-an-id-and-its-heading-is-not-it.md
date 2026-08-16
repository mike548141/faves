# 0058 — A section has an id, and its heading is not it

**Status:** accepted
**Date:** 2026-08-16
**Extends:** [0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — the same
ruling, one level up the tree
**Fired by:** [0057](0057-a-section-heading-is-a-name-not-a-sentence.md)

## Context

ADR 0057 renamed six section headings and broke every deep link to them in the
same commit. The owner's own URL —
`…?id=the-borough-tawa#section-brunch-served-till-2pm` — stopped resolving,
because the anchor was built as `section-${slug(section.section)}`: a function
of the **display name**.

That is exactly the fault ADR 0051 fixed for dishes, where the owner's ruling
was **"identity must be immutable"**. A `dishId` that defaulted to `slug(name)`
was killed there *after* it was built and green, because an id you can
recompute from a mutable field is not an identity — it is a coincidence that
has held so far.

Sections had the same coincidence and nobody had renamed one yet.

## The decision put to the owner, and what he ruled

Three options were put to him with costs stated:

| Option | Cost |
|---|---|
| **Record the finding, don't build** *(recommended)* | A stale link lands at the top of the menu. Six sections affected, no data breaks. |
| **Build stable section ids** | Schema change plus a migration across 235 sections. |
| **Keep old anchors alive** | A hand-maintained table of retired slugs — a second name for the same problem. |

🎯 **He ruled: build the ids — against the recommendation.** Recorded here
because the recommendation was to defer, and a future session reading only the
outcome would otherwise re-propose deferring it.

## Decision

**A menu section carries `sectionId`: stored, immutable, unique within the
venue.** The anchor, the jump-nav `href` and the scroll-spy all come from it.
The heading is free to change and nothing follows it.

```json
{ "section": "Brunch", "sectionId": "brunch", "note": "served till 2pm", "items": [ … ] }
```

**Explicit and required from the seed — never derived at read time.** There is
deliberately no "compute it from the heading if absent" branch to be argued
back in later, because ADR 0051's optional-and-derived `dishId` was built,
tested, green, and then ruled out for precisely that reason.

The one honest caveat: the *first* value has to come from somewhere, and the
only thing available is the current heading. `tools/seed_section_ids.py`
computes it **once, into the file**, exactly as `seed_dish_ids.py` did. Nothing
moves on the day it runs — every section keeps the anchor every existing link
already used. The difference that matters is that it is never computed again.

### The gate with teeth is uniqueness, not presence

Two sections sharing an id is **valid HTML**. The browser does not complain,
`querySelector` resolves to the first match, and the second section becomes
unreachable by link and invisible to the scroll-spy — with nothing on the page
looking wrong. `validate.py` refuses it, and refuses an id that is not a slug
(a space or a capital in a URL fragment works in one browser and not the next).
Both are proved by breaking them: `test_validate.py` is at 78 mutations.

The seed tool **refuses** a colliding id rather than auto-suffixing it. A `-2`
invents an identity nobody chose and then freezes it forever; a human picking
the id is a minute's work and happens once.

### Presence is gated in two steps, on purpose

`sectionId` was landed *ungated for presence*, then made required a few hours
later once the last section was seeded. A parallel session held six venue files
open while this landed, and a mechanical sweep across a file someone else has
uncommitted is how work disappears. So the first sweep covered 210 of 235
sections and `seed_section_ids.py --check` reported the 25 that remained; when
those six files landed the seed finished the job and `validate.py` was flipped
to **required** in the same commit. All 235 sections carry their own id.

**A partial sweep is stated, never silent** — the tool prints `skipped by
request (6): …`, because a run that quietly covered less than the corpus reads
as "everything is seeded" when it isn't.

## Consequences

**The six anchors ADR 0057 broke stay broken.** They were already broken on
`main` before this landed, and the alternative — seeding those sections with
their *old* long slugs — would freeze a discarded sentence into the identity
forever. Cleanliness of the id won over restoring six links that degrade to
landing at the top of the menu.

**`slug` survives in `menu.js` as a fail-soft path only.** `section.sectionId
|| slug(section.section)` runs only for a record that has already failed the
gate, so one missing field costs a link rather than the whole page — the same
reasoning as `dish_id()` in `validate.py`, which kept its fallback so that one
missing field cannot suppress every other complaint about the row.

**Nothing else in the data pointed at a section slug**, which is why this is a
schema addition and not a migration. `find_dish()` resolves `picks` and
`goesWith` by dish id or name and never by section; `app.js` and `search.js`
use the section *name* for display, which is what a reader should see.

**What this does not fix:** a section that moves to another venue, or a venue
id that changes. Both are outside what was asked and neither has happened.
