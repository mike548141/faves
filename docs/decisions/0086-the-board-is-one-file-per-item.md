# 0086 — The board is one file per item; `ROADMAP.md` is generated

**Status**: accepted • **Date**: 2026-08-17

## Context

`docs/ROADMAP.md` had grown to 6,233 lines holding 48 themes and 54 claimable
items. Three costs, one root — the file was simultaneously the unit of
contention, the unit of reading, and the unit of truth:

- **The claiming rule was unsatisfiable as written.** `CLAUDE.md` said *"if
  `ROADMAP.md` is dirty, another session is queue-active — take the next open
  item, touch nothing."* That is a compression of atelier's *"if **the item's
  file** is dirty"*, which is self-consistent upstream because atelier runs a
  split board: item A dirty ⇒ go to item B ⇒ B's file is clean ⇒ claim. With one
  file holding every item, "the next item" lives inside the file "touch nothing"
  has just forbidden. Read literally, nobody can ever claim anything. **Three
  sessions were blocked simultaneously at open on 2026-08-16**, which is what
  put it in front of the owner.
- **Read cost.** ~6,200 lines ordered at every session open, for a board whose
  reader needs one item.
- **The harvest step was a deletion operation on a shared file.** Closing a theme
  meant moving `[x]` blocks to `ROADMAP-DONE.md`; an open `- [ ]` item sitting
  beside a closed one is the easiest thing in that file to lose. It happened on
  2026-08-16 to an unfixed WCAG AA failure, which then survived only as prose in
  a session log.

The `board` floor check had been wired and passing since the day it was written,
reporting *"not in scope — no `docs/roadmap/` directory"* on every commit. That
is a **latent guard** — honest, and carrying zero information because its subject
did not exist. It is named as the third face of [ADR 0072]'s pattern in the
ruling itself.

[ADR 0072]: 0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md

## Decision

The owner was offered the cheap fix — reword the rule so the unit is the item's
*line*, which is what atelier itself says two paragraphs further down — and
**ruled the other way: adopt the structure, split the board** (2026-08-16). So
the inherited rule becomes correct **as written** rather than correct-once-
reworded, and the two repos stop diverging.

The shape is atelier's board-store ADR (2026-08-15), adopted without local
variation:

- **`docs/roadmap/<NNN>-<section>/<NNN>-<slug>.md`** — one item per file, the
  existing checkbox grammar verbatim. State lives in the item file's first line
  and nowhere else.
- **`docs/roadmap/<NNN>-<section>/README.md`** — that section's narrative,
  verbatim; its `# ` title is what the index renders as a heading.
- **`docs/ROADMAP.md` is generated** and never hand-edited — a 271-line index of
  state glyph, linked title and eye-flags. Done items render `✅`, never `[x]`.
- **`ROADMAP-DONE.md` is frozen** as the pre-split archive. A done item now stays
  in its own file; the harvest step, and the window it opened between finishing
  work and recording it, are both retired.
- **The claim edits the item's own file.** Sessions on different items conflict
  on nothing; sessions on the same item collide on the same line, which git
  shows. `CLAUDE.md`'s concurrency bullet was rewritten to say this — the
  owner's ruling is the approval for that specific edit to the safety floor.

The migration was mechanical and verified as such. An item is a column-0 checkbox
line plus the indented continuations beneath it — the monolith's own visual
grammar — so nothing judged where an item's prose stops. Losslessness was checked
as a multiset over every non-heading source line.

## Rejected

- **Reword the rule to say "the item's line" (the cheap fix).** Put to the owner
  with its cost and declined. It fixes the unsatisfiable rule and leaves the read
  cost, the harvest deletion class, and the divergence from atelier untouched.
- **Lifting `###` subsections into items as well.** Themes 32, 33, 34 and 36
  carry work in prose subsections (`32a — the recorder [M][js]`) that never
  carried a checkbox. Converting them would assign a state the monolith never
  asserted — a claim stronger than its evidence. They stay as section narrative;
  which of them become items is a later, deliberate pass.
- **Vendoring `board.py` into `tools/`.** The floor's scanners are atelier's, one
  source; children do not carry a copy (`.githooks/pre-commit`, ADR 0008). What
  landed instead is a shim that resolves atelier's tool by the hook's own order,
  because the generated banner names `python3 tools/board.py rebuild` — true in
  atelier, false in every child, and printed at the top of the one file readers
  are told not to hand-edit.

## Consequences

- The session-start read drops from 6,233 lines to a 271-line index — 96% — with
  item detail loaded on demand.
- Parallel sessions editing different items cannot conflict. The one shared write
  surface left is the generated index, whose conflicts resolve deterministically
  by regenerating.
- An item's `git log` is its provenance: which commit flipped its state, and what
  work that commit carried. State is no longer asserted in prose.
- Items' position *within* a theme's narrative is no longer expressed;
  cross-item prose references degrade to section level. Known cost, accepted
  upstream and inherited here.
- Two holes were opened in the floor's boundary, each reasoned in the file that
  opens it: `docs/ROADMAP.md` is exempt from `wrapscan` (the generator's banner
  is 115 columns and a rebuild overwrites any hand-wrap) and from `pathscan`
  (the index renders link *text* as a path-shaped string, which produced 49
  false findings per commit — a warn-only check that always fires is a check
  nobody reads). `linkscan`, which checks the links themselves, stays enforced
  over the whole board and passes.
- Re-prioritising is a rename: sections and items are numbered by tens.
- ~32 reference-style `[ADR NNNN]` uses had no definition in the monolith's tail
  and rendered as literal text there too. They still do — that is the `linkscan`
  reference-style blindness the board's own item records, and repairing it behind
  a migration would have hidden it.
