# Theme 32 — activity history: what changed, and what *you* changed (owner-raised 2026-08-16)

> *"an activity history that shows every change thats occurred. Include data
> refreshes to new versions of app or menu data, but more importantly user
> changes like adding/changing/removing a rating, a favourite, reporting an
> issue etc."*

Two logs wearing one name, and the theme is mostly about telling them apart.
The owner's own emphasis does it for us — *"but more importantly user
changes"* — so the personal half leads and the system half is the cheap
supporting act.

### What already exists, so we don't build it twice

- **Content history is already kept, and kept forever** — `data/history/prices/`
  and `data/history/dishes/`, under
  [ADR 0023](../../decisions/0023-time-dimension-in-the-data.md) and
  [ADR 0047](../../decisions/0047-the-app-ships-only-what-it-renders.md), plus
  `revisions[]` on a dish. That records *what the shop changed*. It is
  repo-side, never precached, and this theme must not duplicate it into the
  payload.
- **Version state is already computed** — `versions.js`, `sw-update.js`,
  `update-notice.js` and `cache-refresh.js` between them already know the shell
  and data versions, when an update is waiting and when one was taken. The
  system half of this feature is mostly *keeping* what those already compute
  rather than discarding it after the notice is dismissed.
- **The personal layer is already per-profile and device-local** — `store.js`
  with `profileScopedStorage()`
  ([ADR 0012](../../decisions/0012-device-local-profiles.md)). An activity log slots
  straight into that, and must, for the reason below.

So this is not a new subsystem. It is a **recorder** wired to events those
modules already raise, plus a screen.

### 🚩 The thing to decide before any of it is built

An activity log is the **most sensitive thing Faves would ever store**. Today
the app knows your favourites, your ratings and your allergen flags — all
current state. A log knows your *behaviour*: what you looked at, what you
liked and then unliked, and when you were doing it at 11pm. It is a different
category of data living in the same `localStorage`.

Three consequences, none optional:

1. **Per-profile, device-local, never sent, never precached.** It rides
   `profileScopedStorage()` so switching profile switches log, and a shared
   family phone does not leak one person's evening to another.
2. **It must be in the export and in the wipe.** Theme 12's export has to carry
   it, and the Reset flow — which now requires typing "I agree" — has to clear
   it. A record of your data that survives the button that destroys your data is
   a bug with a very bad name.
3. 🎯 **The deletion paradox is the owner's call.** If you remove a favourite,
   the log still says you added it. That is exactly what a history is *for*, and
   exactly what "remove" is supposed to mean. Options: (a) the log is the
   record, removals appear as removals and nothing is erased; (b) removing the
   thing removes its trail; (c) the log is the record, but a "forget this
   entry" action exists. **Recommend (a) plus (c)** — an honest log with an
   explicit escape hatch beats a log that quietly lies about what happened.
   Whichever it is, the screen must state it in one sentence.

### Sizing and sequence

`[L]` overall. 32a + 32d together first (the recorder is worthless without the
wipe, and dangerous without it), then 32c (cheapest, and it proves the recorder
against events we already have), then 32b. 32e stays parked.

🎯 **Blocking question for the owner before 32a:** the deletion paradox above —
does removing a favourite remove its history?

---
