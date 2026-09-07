# `data/` — the research store

**Nothing in this directory is served, and nothing in it is downloaded by the
app.** It sits outside `site/`, so the static file server never sees it and the
service worker cannot precache it. That is the whole point.

The owner ruled on 2026-08-16, in two parts:

1. **Data the app will never render — now or in a future feature — must not be
   in the app's dataset.** It is still kept, here, for research, analytics and
   history.
2. **Ownership and contact information may be recorded**, bounded by
   provenance: only what is in the public domain, or what was purposely given
   to us for use in Faves.

## Why a second store rather than one

`site/data/restaurants/<id>.json` is a **payload**. The service worker
precaches every one of those files on first visit, so a field added there is
downloaded by every phone whether any screen reads it or not. The cost is small
per field and invisible per change, which is exactly how a payload rots.

This store is a **record**. It is allowed to grow, to carry provenance and
working notes, and to hold shapes the app has no use for — a company that owns
four venues is one record here, not four copies of the same company smuggled
into four venue files.

The cut between them is **rendered / not rendered**, not *current / historical*.
A date that the app shows (the age caveat on a price, ADR 0036) stays in the
payload. A price that was superseded three refreshes ago does not.

## Layout

This is what is on disk, and what writes and checks each part. It was wrong for
a year — it described `entities/`, `people/` and `history/venues/` as if they
held something, and did not mention three stores that do (found by the Theme 38
cold review, 2026-09-07).

| Path | Holds | Written by | Checked by |
|---|---|---|---|
| `ownership.json` | the edges — who holds what, in what role, since when | by hand | `tools/registry.py` |
| `entities/<id>.json` | an organisation: company, trust, partnership, sole trader | by hand | `tools/registry.py` |
| `people/<id>.json` | a natural person, under the provenance rule below | by hand | `tools/registry.py` |
| `history/prices/<venue>.json` | superseded price entries, appended forever | `tools/split_data.py` | `split_data.py --check` |
| `history/dishes/<venue>.json` | dishes confirmed off the menu, kept whole | `tools/split_data.py` | `split_data.py --check` |
| `estimates/recipes.json` | estimated times and serving sizes, with their workings | by hand | `tools/recipe_estimates.py --check` |
| `images/<venue>.json` | provenance and rights for every photograph the app ships | by hand | `tools/check_records.py` |
| `withdrawn/<venue>.json` | rows pulled from the payload **by policy**, not by the shop | by hand | `tools/check_records.py` |
| `products/<id>.json` | packaged products off the owner's own pantry photographs (ADR 0090) | `tools/products.py` | `tools/products.py` |

**`entities/` and `people/` do not exist yet**, and that is the honest state
rather than a gap: `ownership.json` holds `{"edges": []}`, no ownership fact has
been recorded, and `registry.py` defines and enforces the shape the first one
will take (`tools/test_registry.py` builds them synthetically to prove it). They
are listed here because the shape is decided, not because there is anything in
them. **`history/venues/` was never real** — nothing has ever written it and
nothing reads it; it is gone from this table rather than waiting to be filled.

Every record keys on the venue `id` already used in
`site/data/restaurants/<id>.json`, and a venue id can be corrected — so the
history reader follows a record's `formerIds` before concluding a venue has no
history, and `split_data.py --check` fails on a history file **no venue read**.
Within a venue, a history row joins to its dish on `sectionId` and `dishId`
(ADR 0099), never on the heading and the name, so a rename ADR 0051 and ADR 0058
both permit cannot orphan a price series.

The link is one-way and read from this side only: **no file under `site/` refers
to anything in here**, so the payload needs no new field and no migration to
gain an owner.

## The provenance rule — mandatory, and checked

Every `people/` record and every contact detail carries a `source` saying how we
came by it. Two values are legal, and nothing else validates:

| `source.kind` | Means | Example |
|---|---|---|
| `public-record` | Published by an authoritative public register | NZ Companies Office, NZBN |
| `given` | The person or organisation gave it to us for Faves | an owner emailing their contact details |

A `source` needs `kind`, a `recorded` date, and enough of a `ref` that a later
session can re-check it without guessing. A record that cannot say where it came
from is not a record we are allowed to hold — `tools/registry.py` errors, it
does not warn.

**What is deliberately not collected**, because the ruling did not authorise it:
home addresses of natural persons, dates of birth, and anything about a person's
health or finances beyond the shareholding a public register already states. The
ruling named name, email and phone, for contacting a person or organisation.
Widening that is the owner's call to make, not a session's to assume.

## This is a public repo

Everything here is published to the world on push, and git history is published
with it — a record removed later stays in the history. Read the ownership ADR
before adding a `people/` record, and if a detail's provenance is unclear, leave
it out and ask. Deleting it afterwards does not undo the publication.
