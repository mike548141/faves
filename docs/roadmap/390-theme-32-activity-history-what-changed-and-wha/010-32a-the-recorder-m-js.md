- [ ] **32a — the recorder** `[M][js]`

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
