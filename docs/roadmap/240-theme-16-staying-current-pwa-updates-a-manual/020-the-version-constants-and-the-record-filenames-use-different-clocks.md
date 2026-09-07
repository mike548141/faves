- [x] 🔎 **The version constants and the record filenames run on different
      clocks, and for twelve hours a day they disagree by a calendar day**
      `[XS][docs]` — found 2026-09-06 (session faves-24) while allocating a
      `SHELL_VERSION` for two parallel agents.

  ✅ **DELIVERED 2026-09-07 (session faves-b1) — OPTION 1, with one correction
  to where it lands.** The convention is now written down in
  `docs/ARCHITECTURE.md` (the fuller note) and in CLAUDE.md's lockstep bullet
  (the working reminder). No artefact changed; no constant moved.

  🔎 **RE-VERIFIED INDEPENDENTLY before acting, not taken from this item.** At
  `2026-09-07 01:05 UTC` / `13:05 NZST`, `sw.js` carried `SHELL 2026-09-07.7`
  and `DATA 2026-09-07.3`. The two `sw.js` bumps at **00:51 and 02:51 NZST** on
  2026-09-07 stamped `2026-09-07.x` while UTC still read **2026-09-06** — so the
  constants follow New Zealand local time, confirmed on real commits rather than
  on a single earlier observation. `git log`'s author dates on those same
  commits are `+12:00`, agreeing with the constants.

  🛑 **THE ITEM'S OWN OPTION 1 WOULD HAVE BREACHED A REPO RULE, AND THAT IS
  WORTH MORE THAN THE FIX.** It said to record the convention *"in ADR 0015 and
  the CLAUDE.md lockstep bullet"*. ADR 0015's status is **accepted**, and
  `docs/decisions/README.md` says: *"Never edit an accepted ADR's substance —
  supersede it."* Adding a convention that ADR never stated **is** substance. So
  the instruction as written asked for a rule breach, and a session following
  its own roadmap faithfully would have committed one.
  🔑 The fact is also not worth an ADR of its own — it decides nothing and
  rejects no alternative that anyone proposed. The right home for a convention
  that is simply *true of the repo today* is the compact current-truth
  (`ARCHITECTURE.md`) plus the place a session will actually trip over it
  (CLAUDE.md). That is where it went, and the reasoning is recorded in
  `ARCHITECTURE.md` itself so nobody "fixes" it into ADR 0015 later.
  🚩 **The general shape, because it will recur:** an item written at *finding*
  time proposes a landing site from memory. Between filing and delivery nobody
  re-checks that the landing site is legal. Options in a roadmap item are
  **suggestions with the authority of whoever was tired that evening**, not
  instructions — a delivering session owes them the same scepticism it owes any
  other inherited claim.

  ❌ Options 2 (move the constants to UTC) and 3 (leave it undocumented) are
  **declined**, for the reasons the item already gives.

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
