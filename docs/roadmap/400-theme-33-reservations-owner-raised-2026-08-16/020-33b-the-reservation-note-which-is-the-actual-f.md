- [ ] **33b — the reservation note, which is the actual feature** `[M][js][design]`

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
