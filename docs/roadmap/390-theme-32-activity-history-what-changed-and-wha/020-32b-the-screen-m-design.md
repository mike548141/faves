- [ ] **32b — the screen** `[M][design]`

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
