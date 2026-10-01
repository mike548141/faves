# 0148 — The data check waits about three minutes, and the wait survives the worker

**Status:** accepted (owner-ruled 2026-10-01, `faves-55`). Built by roadmap
`510/180`.
**Date:** 2026-10-01
**Amends:** [ADR 0147](0147-data-reads-come-from-the-phones-own-store-and-every-download-is-checked.md)
decision 1, "at most once every 10 s". The rest of 0147 stands.

## Context

ADR 0147 made a data read start a background check of
`data/catalogue.json`, coalesced to one per 10 s. The 2026-10-01 survey
(`docs/reviews/2026-10-01-0418-chatty-app-survey.md`, finding 4) measured what
that costs: **one request on every page navigation more than 10 s after the
last**. The bytes are nothing (197, 140 gzip). The cost is a round trip and a
radio wake-up on every screen of an app that otherwise answers from the phone.

And the 10 s did not hold anyway. The gap was a variable in the worker, and the
browser stops an idle worker after about 30 s (inferred, not observed), so a
session of screens a minute apart met a fresh worker every time, with the gap
forgotten.

## Decision

1. **A data read does not check within about 3 minutes of the last check that
   succeeded** (`DATA_CHECK_WINDOW_MS` in `site/sw.js`). The owner's words:
   "yes, about 3 minutes, persisted so it survives the worker sleeping".
2. **The time is a record in the data store** (`__data_checked__`, `{ at }`),
   not a variable. The sweep keeps it by name.
3. **Only a check that left the phone current is recorded.** A failed check
   records nothing, and neither does one whose rates file failed, so the next
   read retries. The 10 s in-memory gap stays, to coalesce those retries.
4. **A resume and a forced `SYNC_DATA` ignore the window** and check at once.
   Only a data read consults it.

## Rejected

- **Leaving the gap in memory and making it longer.** A longer variable still
  dies with the worker. It would have looked like a fix and changed nothing on
  a phone.
- **A 5-minute window,** the top of the survey's range. The owner chose about
  3: the resume check covers the case where someone returns to the app, so the
  window only has to cover a run of screens.
- **Recording failed checks too.** That would hold a phone that had just come
  back online on old menus for three minutes, for no saving: an offline check
  costs no server and no bytes.

## Consequences

- 🚩 **The freshness trade.** A menu edit now reaches an online phone on the
  first screen opened **after the window**, plus one (ADR 0147's "one screen
  later"). So the slowest an edit arrives without a resume is about 3 minutes
  and two screens. A resume still checks at once. This puts a number on ADR
  0146's question "how quickly does an edit arrive".
- Data reads now make at most one catalogue request per ~3 minutes, where
  they made one per screen more than 10 s apart (that follows from the rule;
  no whole session was measured). Measured by `tools/chatty_check.mjs`, 3
  runs: a warm home load 2 requests → 1 (only the `sw.js` update check is
  left), a warm menu open 1 → 0.
- The store holds one more small record. `tools/fetch_check.mjs` counts it,
  and asserts the window holds across a worker the browser has actually
  stopped (it watches CDP's `ServiceWorker` events to prove the stop happened).
- `fetch_check`'s natural-path step used to sleep 10.5 s. It now winds the
  record back past the window instead, because a check that sleeps three
  minutes gets switched off. The worker under test is the shipped one. Setting
  the window to 0 makes the in-window assertion fail (checked 2026-10-01).
