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

### Sizing and open questions

33a is `[S]` and independent. 33b is the theme (`[M]`, plus an ADR). 33c falls
out of 33b. 33d stays parked.

🎯 **For the owner:**
1. Is a **note you made** enough, given Faves can never confirm or update it
   from the venue's side — or is the manage-link stretch the minimum bar?
2. Faves currently stores no forward-looking personal data at all. A record of
   where you will be on Friday at 7pm is a new category. Comfortable?

---
