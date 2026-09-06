- [ ] 🔎 **The version constants and the record filenames run on different
      clocks, and for twelve hours a day they disagree by a calendar day**
      `[XS][docs]` — found 2026-09-06 (session faves-24) while allocating a
      `SHELL_VERSION` for two parallel agents.

  **The measurement.** At `2026-09-06 14:25 UTC` the machine's local clock read
  `2026-09-07 02:25 NZST`. `site/sw.js` carried `DATA_VERSION =
  "2026-09-07.1"`, stamped by the previous session — so the version constants
  are dated on **New Zealand local time**. CLAUDE.md's concurrency clause dates
  record filenames the other way: *"`YYYY-MM-DD-HHMM-slug.md`, `HHMM` in UTC
  (`date -u`)"*. New Zealand is UTC+12 (UTC+13 in daylight time), so from
  midday UTC onward the two conventions name different days.

  🔎 **Nothing is broken today, and that is the point.**
  `tools/check_versions.py` enforces only that the constant *changed*; it never
  parses the date, so a mis-dated stamp passes every gate. The convention is
  carried entirely by imitation of the previous value.

  **What it actually costs.** A session record named `2026-09-06-1425-*.md`
  describing a commit that stamps `sw.js` `2026-09-07.1` reads, to anyone
  auditing later, like a record written before the work it describes. The
  repo's own provenance rule is that an item's `git log` says which commit
  flipped its state — and `git log`'s author dates here are local (`+12:00`),
  which agrees with the constants and not with the filenames. So the odd one
  out is the filename rule, which is inherited and not ours to change.

  🎯 **Options, none taken:**
  1. **Say which clock the version constant uses**, in ADR 0015 and the
     CLAUDE.md lockstep bullet — one sentence, settles it by writing down what
     is already practised. Cheapest, and changes no artefact.
  2. **Move the version constants to UTC** so every dated artefact agrees.
     Consistent, but it makes the next stamp appear to go *backwards* relative
     to `2026-09-07.1` for twelve hours, which is worse than the problem.
  3. **Leave it undocumented.** The status quo: correct only while each session
     copies the previous value's shape.

  🔑 **Why this is ours and not a hand-up.** The UTC filename rule is atelier's
  and is not in question. The version-constant convention is this repo's alone
  (ADR 0015) and is not written down anywhere — so the gap is a local
  documentation defect, not a house one.
