- [ ] **33d — a real integration** `[XL]` 🛑 **owner-gated, and against three non-goals**

Reading and writing a booking in the venue's system needs partner API access,
a backend to hold the credentials, and an account to tie the booking to. That is
a different product, and it is the thing ADR 0013 declined. **Not recommended.**
Recorded so a future session finds the reasoning rather than re-proposing it.

The middle option, if the pull is strong: many platforms email a confirmation
with a **stable manage-my-booking link**. Storing *that link* alongside the note
gets most of "update it later" for free — the reader taps through to the
platform's own page, which is always right. No API, no backend, no account.
🎯 **Recommend this as 33b's stretch, and it may be the whole answer.**
