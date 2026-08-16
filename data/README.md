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

```
data/
  README.md            this file
  entities/<id>.json   an organisation: company, trust, partnership, sole trader
  people/<id>.json     a natural person, recorded only under the rules below
  ownership.json       the edges — who holds what, in what role, since when
  history/
    prices/<venue>.json   superseded price entries, appended forever
    dishes/<venue>.json   dishes that came off the menu
    venues/<venue>.json   venues retired from the payload
```

Every record keys on the venue `id` already used in
`site/data/restaurants/<id>.json`. The link is one-way and read from this side
only: **no file under `site/` refers to anything in here**, so the payload needs
no new field and no migration to gain an owner.

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
