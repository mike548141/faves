## 2026-08-16 10:12 UTC — a heading that was doing two jobs, and the identity it was quietly holding

Three sessions live in this repo at once. This one took a single owner
observation from a phone screenshot, and it opened into a schema change.

**The observation.** *"Where a menu section has a time limit like this brunch,
don't put the time into the section heading because it makes the section heading
too big in the top section heading list."* `Brunch (served till 2pm)` — a
24-character chip in a strip you scroll with a thumb. Measuring the corpus first
found the worse one nobody had reported: Sprig & Fern's `Gold Card (Mon–Fri
11:30–17:30, weekends 10:00–17:30)`, **53 characters, wider than a 390 px
screen**.

**The heading was doing two jobs that want opposite lengths** — a *name* (chip,
anchor, search-result label) wants to be short; a *qualifier* wants to be true.
`section.note` splits them (ADR 0057). Eleven sections across seven venues moved
over two commits, the second after the owner ruled on the follow-up: move the
qualifiers, leave the glosses.

### The field that was nearly the wrong one

`available.note` already existed and looked like the obvious home. Two things
said otherwise, and the second is the one that matters: `check_available`
(`validate.py:304`) **refuses a note-only `available`**, and `available` is a
*filter* object — `isAvailable()` and `isRetired()` act on it and can remove a
section from the menu. A presentational string in there would make a section's
visibility look conditional when nothing about it is. Two note fields now mean
two different things, and both render.

A sibling session reached for a sibling field the same day for a neighbouring
reason (unreviewed te reo drafts in a live dictionary). Twice in one day, the
obvious home was wrong for a reason only a header comment or a measurement
revealed. That is what the ADRs are for.

### What the rename fired

🔎 **The anchor was `slug(section.section)` — derived from the display name.** So
the commit that shortened the headings invalidated every deep link to them,
including the owner's own pasted URL. Not a new fault: **ADR 0051's fault, one
level up the tree**, where the owner's ruling was *"identity must be immutable"*.
Sections had the same coincidence and nobody had renamed one yet.

🎯 **Put to the owner as three options with costs. He took the schema change,
against the recommendation to record-and-defer.** ADR 0058: `sectionId`, stored,
immutable, unique per venue; 210 of 235 sections seeded with nothing moving on
the day it ran. **The gate with teeth is uniqueness, not presence** — two
sections sharing an id is *valid HTML*, `querySelector` takes the first, and the
second silently becomes unreachable by link and invisible to the scroll-spy with
nothing on the page looking wrong.

25 sections in six files are deliberately unseeded: a parallel session held them
open, and the tool prints `skipped by request (6): …` rather than reporting a
full sweep. The field becomes required in the commit that closes that gap.

### What three concurrent sessions actually cost, and what paid

- **A version constant was allocated by negotiation, not read from
  `origin/main`.** Both sessions had independently picked `.39`. Ranges were
  agreed out loud (`.45`+ here) and verified with the **range** form of
  `check_versions.py` — the bare form reads only *staged* changes and reports
  "not in scope" on a finished branch.
- **A file I had already changed on `main` appeared on a peer's do-not-touch
  list.** `burgerfuel.json`'s split would have been silently reverted by an
  agent working from an older tree, and `validate.py` could never have caught it
  — a record is perfectly valid without a note. Warned; verified intact after
  their rebase.
- **Staged work in the shared checkout that belonged to neither of us.** It was
  captured read-only to a patch file rather than absorbed, and the owner's
  instruction was to re-check before rescuing it. The re-check found it: a third
  session, `faves-d0`, landed it itself as `97e12d9`. **Rescuing it would have
  duplicated a commit that already existed.** The instruction to verify before
  acting was the whole difference.
- **pathscan's verdict depends on where it runs.** `.claude/worktrees` exists in
  the primary checkout and cannot exist in a worktree, so the same committed
  content reports 2 findings on `main` and 5 from a worktree. Nothing was
  silenced — a `pathscan:allow` written from a worktree would have suppressed a
  finding that was never true on `main`. Seventh instance of a check whose scope
  quietly differs from the question it appears to answer.

### Owed, and open

- **28g-tail** — seed the last 25 sections once the six files land, then make
  `sectionId` required and add `seed_section_ids.py --check` to the verify list.
- **Theme 35, the split-flap search placeholder** — owner-raised, owner-ruled to
  queue behind the section-id build. Written up with the finding that matters:
  it is a *transition swap* inside `search-hints.js`, which already carries the
  reduced-motion, focus-stop and accessible-name guarantees. Three content
  decisions are his before it is built.
- **The six broken anchors stay broken.** Seeding them with their old long slugs
  would freeze a discarded sentence into the identity forever.

---

