- [x] **32a — the recorder** `[M][js]`

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


  ✅ **Done 2026-10-18 (worker `w/390-010`, built with 32d as one change).**
  `site/js/activity.js` (new; ring buffer `faves.activity.v1`, `ACTIVITY_CAP`
  500, label snapshotted, frozen entries, `record`/`clear`, no per-entry
  delete) and the recorder wired through an optional `record` option on
  `createFavourites`/`createRatings`/`createOrder`/`createSettings`, passed by
  the singletons only; `profiles.js` gained `onSwitch`. Events live: `favourite.add/remove`,
  `rating.set/clear`, `order.add/remove/clear`, `profile.switch`, `settings.change`,
  and `reset.performed`. Not wired, left for later: `report.sent`, the three system
  kinds (32c), the order line's note/finish/move edits. `settings.change` is the dial
  only: `makeEntry` accepts a label from `SETTINGS_DIALS` and discards from/to/venue/dish,
  with tests that walk every allergen, diet and food-preference key through the real
  settings store and fail if one reaches the log. ADR 0164. Store-added whitelist walk
  and measurements are in the PR.

  📌 **Closed 2026-10-18 (faves-b4), PR #125 merged** (ADR 0164,
  SHELL_VERSION 2026-10-18.3). The ruled "Delete everything" control that
  must also clear the log had no item; it is now
  [`180/010`](../180-theme-12-export-your-data-owner-raised-2026-08/010-delete-everything-the-second-reset.md).

