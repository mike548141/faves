# 0055 — A venue's `website` may be a page on someone else's platform

**Status:** accepted
**Date:** 2026-08-16

## Context

`website` has carried an implicit meaning since the schema was written, and
`ARCHITECTURE.md` says it outright: *"the venue's own site"*. Every record in the
corpus has honoured it — a domain the business controls, or `null`.

Caffiend, 233–235 Jackson Street, Petone, breaks it. The obvious domain, <!-- leakscan:allow: a venue business address, the same class as site/data — this repo publishes them as its product (ADR 0022 gate 1) -->
`caffiend.co.nz`, has **no DNS record at all** — not a parked page, nothing. A
third-party directory still advertises `caffiendpetone.business.site`, a Google
Business Profile site of the kind Google switched off in 2024. The one live
thing the business runs is a Facebook page. It has traded since 2003.

So the field's implicit rule and the reader's need came apart. Honouring "the
venue's own site" means `null`, and `null` means the contact card offers a phone
number and nothing else for a cafe with an obvious public presence.

The owner was told no venue in this corpus had ever used a platform URL here,
and ruled: **allow it.**

## Decision

**`website` may be a page on a platform the venue does not own** — a Facebook
page, an Instagram profile — when the venue has no site of its own. Caffiend is
the first, at `https://www.facebook.com/caffiendpetone/`.

Confirmation is the price of it. A platform page is easy to get wrong: fan
pages, duplicates, a same-named business in another town. This one was confirmed
three ways — the page is titled "Caffiend | Petone"; an independent directory
listing the business at 233 Jackson Street cites that exact URL as its Facebook; <!-- leakscan:allow: a venue business address, the same class as site/data — this repo publishes them as its product (ADR 0022 gate 1) -->
and the same handle, `caffiendpetone`, carries the venue's Instagram. No
competing or duplicate page surfaced. **Where that standard cannot be met the
field stays `null`** — a wrong link is worse than none.

`validate.py` needed no change: it checks `website` as string-or-null with no
host restriction, so the shape was already legal. This record makes the meaning
deliberate rather than accidental.

## Rejected

- **Leave it `null`.** The strict reading, and the status quo. It costs the
  reader the only route to the business that exists — hours, closures, what is
  on today — to preserve a distinction the reader never sees. A cafe that never
  bought a domain is not a cafe with nothing to show you.
- **A second field (`social`, `facebook`) beside `website`.** Truer to the
  model, and rejected on ADR 0047: the app ships only what it renders, and no
  screen would render it differently — the contact card prints the same button
  from either field. A second field costs bytes on every phone to draw a
  distinction the UI then throws away.
- **Link the dead `business.site` URL** a directory still lists. It is not the
  venue's own site either, and unlike the Facebook page it does not work.

## Consequences

- Faves now sometimes sends a reader to a **platform** rather than to a
  business, with whatever that platform asks of them — a login wall, an app
  interstitial, tracking. That is the owner's call, made knowing it.
- `ARCHITECTURE.md`'s gloss on `website` is now the common case, not the rule.
- The corpus gains no way to tell the two apart, by choice. Anyone who later
  wants to *style* a platform link differently is proposing the rejected second
  field, and should reopen this record rather than work around it.
