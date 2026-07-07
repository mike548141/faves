# 0006 — Structured per-day hours, computed in NZ time

**Status**: accepted • **Date**: 2026-07-08

## Context

The hours data was a list of `{days, open, close}` where `days` was free
text ("Mon–Fri") and each entry held a single open/close. That shape can
express neither of two things the owner asked for:

1. **A live status** — "Open · until 9pm", "Closing soon", "Closed ·
   opens 5pm". Computing that needs to map "now" to a specific weekday's
   hours; a free-text `days` range can't be indexed.
2. **A lunch/dinner split** — many venues close mid-afternoon (e.g.
   3–5pm). A single open/close per day literally cannot represent a gap.

A related question surfaced once we compute "open now": **whose clock?**
The site is static, offline, account-free, and could be opened from
anywhere.

## Decision

**Model:** `hours` is `null` or a full week keyed `mon`…`sun` (all seven
keys). Each day is a list of `[open, close]` intervals in `"HH:MM"` 24h:
`[]` = closed; multiple intervals = a split. `close` may be `null`
("late"/open-ended). `close`, when given, must be after `open`.

**Timezone:** status is computed in **Pacific/Auckland**, via `Intl`
(`nzNow()`), not the device clock. A Wellington venue's open/closed state
is a fact about Wellington time; a guest browsing from Sydney or a phone
left on the wrong timezone should still see the right answer. `Intl` does
this offline with no dependency.

**Shape of the code:** `nzNow()` is the only impure function (reads the
clock). `openStatus(hours, now)` and `groupWeek(hours)` are pure, so the
whole engine is unit-tested against fixed `now` values with no clock or
timezone flakiness (`tests/hours.test.js`).

## Rejected

- **Keep `{days, open, close}`, parse the range at runtime:** still can't
  express a split, and "Mon–Fri" parsing is a fragile tax on every read.
- **Device-local time:** simpler, but silently wrong for anyone whose
  device isn't on NZ time — the exact people a "what's open now" feature
  should serve well (a visitor).
- **Cross-midnight via a wrap (`close < open` ⇒ next day):** adds edge
  cases (a segment spanning the week boundary) to every computation. The
  dataset's only late-night venues use `null` ("late") anyway, so we
  forbid the wrap in validation and express open-ended closes as `null`.
- **Per-day rows in the UI (7 lines):** honest but long. `groupWeek()`
  merges identical consecutive days into ranges ("Mon–Fri 11:30am–9pm")
  and still shows splits inline; the live status covers "right now".

## Consequences

`validate.py` enforces the seven keys, `HH:MM` times, and `close > open`.
The home cards gain a live open/closed badge and the menu screen a status
line + grouped week with today highlighted — realising the parked "Open
now" idea plus the relative-time and split-navigation asks. Existing hours
were migrated in place (unstated days → closed `[]`, "late" → `null`).
The data is still owner-unverified (venues carry no `verified` date), so
the badge is only as right as the hours we hold — the "needs a refresh"
caveat still applies.
