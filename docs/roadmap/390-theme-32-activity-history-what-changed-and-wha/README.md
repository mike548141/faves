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

### 32a — the recorder `[M][js]`

A small append-only ring buffer, `faves.activity.v1`, per profile. Fields kept
deliberately few:

```jsonc
{ "at": "2026-08-16T19:04:11Z",   // record time, ISO 8601 with the zone
  "kind": "rating.set",            // closed vocabulary, below
  "subject": { "venue": "kk-malaysian", "dish": "fried-won-tons",
               "label": "Fried Won Tons" },
  "from": null, "to": 4 }
```

Two design points that are not obvious:

- **The label is snapshotted at write time, never resolved at read time.** A
  dish can leave a menu, and a log entry that renders as "a dish that no longer
  exists" is useless. `dishId`
  ([ADR 0051](../../decisions/0051-a-dish-has-an-id-and-its-name-is-not-it.md))
  makes the *link* durable; the stored label makes the *sentence* durable when
  the link dangles. Keep both — the id to navigate, the label to read.
- **A ring buffer with a stated cap, not unbounded growth.** `localStorage` is
  a handful of megabytes shared with everything else the personal layer keeps,
  and the failure mode of filling it is that *favourites* stop saving. Cap it
  (500 entries is a starting guess, not a measurement), evict oldest, and say on
  screen that it is the last N rather than all of it. **No silent caps.**

**Closed event vocabulary**, extended only when a screen needs a value:
`favourite.add` · `favourite.remove` · `rating.set` · `rating.clear` ·
`report.sent` · `order.add` · `order.remove` · `order.clear` ·
`profile.switch` · `settings.change` · `data.updated` · `app.updated` ·
`cache.refreshed` · `reset.performed`.

⚠️ **`settings.change` needs a rule of its own.** Logging that someone flagged
`contains-peanuts` records a health fact about a named person, which is the one
class this repo never stores. Log that *a preference changed* and which dial —
never the value. The rest of the vocabulary is safe; this one is not.

### 32b — the screen `[M][design]`

A reverse-chronological list, day-grouped, reachable from Settings (it belongs
with "Your data", beside the export). Each row: the sentence, the time, and —
where the subject still exists — a link to it.

- **It starts empty and must say so.** There is no backfill: nothing before the
  day it ships was ever recorded. An empty history reads as a bug unless the
  screen says *"Faves started keeping this on <date>"*. This repo has shipped a
  feature whose emptiness looked like breakage before.
- **The system entries are the quiet ones.** `data.updated` and `app.updated`
  will outnumber everything a person does. Default to showing personal activity
  with system events behind a toggle, rather than burying the owner's stated
  priority under version bumps.
- Reo: every string needs a `data-i18n` key from the start, not retrofitted
  (`reo.js`) — the last three features all had to be swept afterwards.

### 32c — system events, wired to what already computes them `[S][js]`

`versions.js` / `sw-update.js` / `cache-refresh.js` already know when the shell
or data version moved and when a refresh was taken. Emit on those transitions.
Nothing new to detect; the work is not throwing the fact away.

### 32d — export and wipe `[S][js]` 🔗 **depends on 32a**

Add the log to Theme 12's export payload and to `personal-data.js`'s clear path,
and to whatever Reset ends up destroying. Do this **in the same change as 32a**,
not after: a personal store that the export and the wipe don't know about is the
kind of gap nobody finds until it matters.

### 32e — undo, deliberately out of scope for now `[L][design]`

A list of changes invites a button to reverse one, and "un-remove that
favourite" is genuinely useful. It is also a different feature: it needs every
event to be invertible, needs to define what undoing a `settings.change` means
when three more landed after it, and turns a recorder into a state machine.
**Park it, and note that 32a's `from`/`to` fields are what would make it
possible later** — which is why they are in the shape now, even though nothing
reads `from` yet.

### Sizing and sequence

`[L]` overall. 32a + 32d together first (the recorder is worthless without the
wipe, and dangerous without it), then 32c (cheapest, and it proves the recorder
against events we already have), then 32b. 32e stays parked.

🎯 **Blocking question for the owner before 32a:** the deletion paradox above —
does removing a favourite remove its history?

---
