- [x] **32b — the screen** `[M][design]`

  (claimed 2026-11-23-1433, session f9ee6733, worktree faves-qr-f9ee-screen)


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

  ✅ **Done 2026-11-23 (queue run f9ee6733).** The screen is a panel of
  Settings, "Activity history", directly after "Your data": the existing
  index-row-to-panel pattern (ADR 0025), no new navigation.
  - `site/js/activity-view.js` (new, pure): one keyed sentence template per
    kind (`activity.s.*`, `{name}` holes, so a whole-sentence te reo gloss can
    drop in), local-day grouping newest first, the system-entry arithmetic and
    the link rule. `site/js/activity-ui.js` (new): the panel. Both are in the
    service worker's shell list. `site/css/app.css`: `.activity-*`.
  - Each row: sentence, time, and a link when the subject still exists. "Exists"
    is answered from data the page already holds, loaded when the panel opens
    (the home summary for the venue and its kind, the search index for the dish
    under its CURRENT id, so a renamed dish links by its new one; a personal
    recipe from the cookbook). A dish that left its menu keeps its sentence and
    loses its link; if neither file can be read there are simply no links.
  - System entries (`app.updated`, `data.updated`, `cache.refreshed`) are
    counted and hidden behind a pressed-state chip, off on every visit.
  - 🔑 **The empty state names its date from a constant, not the store.** The
    log keeps no "started on" (the oldest entry is evicted at the cap, ADR
    0164), and a first-entry date would be wrong for anyone whose first act came
    late. `ACTIVITY_STARTED = "2026-10-18"` is the day the recorder shipped
    (commit `36b82960`); nothing before it was ever recorded on any device, so
    the sentence is true of the app and of a phone that updated later. The empty
    line reads *"Nothing here yet. Faves started keeping this on 18 October 2026,
    so anything you did before then isn't in it."*; the footer states the cap
    ("the last 500") and, once there are rows, the date again. The deletion
    rule is one sentence in the intro, as the theme asked.
  - Evidence: `tests/activity-view.test.js` (18 cases); `tools/activity_check.mjs`
    (new, in CLAUDE.md's verify list, not in CI), 28 assertions in headless Chrome
    at 390 px, probed by defaulting the toggle on and dropping the links (7 fail);
    `node tools/boot_check.mjs` 38 passed (its Settings-index list gained the new
    row); `node tools/device_check.mjs` 91 passed. SHELL_VERSION 2026-11-24.1 to
    2026-11-24.2.
  - Not done / not verified: no real service worker or second device (the check
    uses a fresh profile and writes system entries by hand); the link target is
    proved for a dish row only, not for a recipe page; light and dark pictures
    were looked at, a screen reader was not. The toggle is per visit and not
    stored, on purpose (a stored one is a new store to walk through the export,
    wipe and sync tables).
