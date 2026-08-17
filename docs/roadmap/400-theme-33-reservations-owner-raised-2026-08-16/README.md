# Theme 33 — reservations (owner-raised 2026-08-16)

> *"ability to make a reservation with a restaurant from Faves. And the ability
> to see and update that reservation later. Manage multiple upcoming
> reservations"*

Three asks, and they are not the same size. Booking is easy. **Keeping track of
a booking is the hard one**, and it collides with what Faves is.

### The collision, stated first

A reservation is a **two-party agreement whose source of truth lives in someone
else's system**. Faves has no backend, no accounts and no network dependency at
runtime — that is the product
([ADR 0001](../../decisions/0001-zero-build-vanilla.md)), and it is why crowd ratings
were rejected in
[ADR 0013](../../decisions/0013-ratings-curated-and-local.md): backend, moderation and
accounts break three non-goals at once.

So "see and update that reservation later" splits cleanly:

- **We can always show what *you* recorded.** Device-local, offline, free.
- **We can never know what the *venue* did with it.** If they cancel, move you
  to 8pm, or shut for a refit, our copy still says Friday 7pm. That is the stale
  menu problem with someone standing on a footpath in the rain.

🚩 **The failure mode is worse than a wrong price.** A menu that is out of date
costs you a surprise at the counter. A reservation that is out of date costs you
a table. Any local record must therefore be **visibly a note you made, never a
confirmation Faves is standing behind** — and the wording is load-bearing, not
decoration.

### 33a — book it: link out, don't build it `[S][schema]`

🔗 **Shares Theme 31's shape.**

Same finding as Theme 31's ordering apps: the honest mechanism is an ordinary
`https` link the OS may upgrade to the venue's app. NZ venues mostly sit on a
handful of platforms — ResDiary, Now Book It, OpenTable, SevenRooms, First
Table — plus a Facebook page or a phone number for everyone else.

Data: extend the `ordering[]` pattern rather than inventing a parallel one —
`booking: [{ platform, url }]`, or `ordering[]` gaining
`kind: "booking"` alongside Theme 31's `"first-party"`/`"aggregator"`. **Decide
that once, in Theme 31, and let this inherit it.**

⚠️ **Do not verify these links the way we verified the ordering ones and then
forget.** A booking URL that 404s sends someone to a dead end at the moment they
are trying to commit. Worth the association/liveness re-check Theme 31 floated
(31c) more than ordering was.

For venues with no platform, the honest affordance is the phone number we
already have, labelled "Call to book" rather than dressed up as a booking flow.

### 33b — the reservation note, which is the actual feature `[M][js][design]`

A device-local, per-profile record the reader creates *themselves* after
booking: venue, date, time, party size, an optional note, and the booking
reference if they have one. No backend, no accounts, works in flight mode.

- **It rides `profileScopedStorage()`** with the rest of the personal layer
  ([ADR 0012](../../decisions/0012-device-local-profiles.md)), and inherits every rule
  Theme 32 sets out: in the export (Theme 12), in the wipe, never sent, never
  precached.
- 🚩 **It holds more personal data than anything Faves stores today** — a name,
  a party size, a place and a *future time you will be there*. That is a
  movement record. It never leaves the device, and the repo never sees it. Worth
  an ADR of its own before a line is written.
- **The offer to create one goes where the booking link is**, on the way back:
  tap "Book on ResDiary", come back, and Faves asks "did that work? want me to
  remember it?". Never assume the booking happened — we cannot know.
- **Hand the reminder to the phone, not to us.** A generated `.ics` the reader
  saves into their own calendar gets them a real alert with no notification
  permission, no push service and no backend. Reminders inside Faves would
  need a service worker push, which needs a server — out of scope by
  construction.

### 33c — several at once `[S][design]` 🔗 **depends on 33b**

Upcoming sorted soonest-first, past ones aged out of the main view rather than
deleted (the current-truth/history split this repo already uses everywhere).
Edit and cancel act **on your note** — and cancelling the note must say, in
words, that it does not cancel the booking. Then link out to the platform so the
real cancellation can happen where it actually lives.

An expired reservation should not simply vanish: "was that last Friday?" is a
question people ask.

### 33d — a real integration `[XL]` 🛑 **owner-gated, and against three non-goals**

Reading and writing a booking in the venue's system needs partner API access,
a backend to hold the credentials, and an account to tie the booking to. That is
a different product, and it is the thing ADR 0013 declined. **Not recommended.**
Recorded so a future session finds the reasoning rather than re-proposing it.

The middle option, if the pull is strong: many platforms email a confirmation
with a **stable manage-my-booking link**. Storing *that link* alongside the note
gets most of "update it later" for free — the reader taps through to the
platform's own page, which is always right. No API, no backend, no account.
🎯 **Recommend this as 33b's stretch, and it may be the whole answer.**

### Sizing and open questions

33a is `[S]` and independent. 33b is the theme (`[M]`, plus an ADR). 33c falls
out of 33b. 33d stays parked.

🎯 **For the owner:**
1. Is a **note you made** enough, given Faves can never confirm or update it
   from the venue's side — or is the manage-link stretch the minimum bar?
2. Faves currently stores no forward-looking personal data at all. A record of
   where you will be on Friday at 7pm is a new category. Comfortable?

---
