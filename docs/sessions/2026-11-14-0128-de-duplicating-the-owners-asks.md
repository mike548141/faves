# 2026-11-14 0128 UTC — de-duplicating the owner's asks: one overtaken note

**Dispatched by** an estate health sweep (orchestrator session 58027096),
working headless in a detached worktree off `origin/main`. The owner's request,
verbatim: *"scan the pending actions for me/questions for me/decisions waiting
on me/waiting rulings by me and ensure they are not duplicates etc"*. A
cross-repo read-only pass proposed one mechanical fix for this repo; this
session checked it against the primary source before applying it. Headless, so
nothing was asked.

## What changed

- **`docs/WORKPLAN.md`, Phase 1:** one note added below the 2026-07-06 "Owner
  to confirm" paragraph, saying its menu-photo ask (Takeaway @ Churton and
  Spices Indian) is overtaken: both venues are `menu-complete`
  (`spices-indian.json:84`, verified 2026-07-06; `takeaway-at-churton.json:70`,
  verified 2026-08-08; both menus were transcribed in `1ba220ff` the same
  day). The paragraph's other asks (picks, delivery-vs-in-store prices, hours
  conflicts, phone numbers) are untouched and the note says so.

## The one judgement call

The proposed anchor was the line *"Cafe and R & S prices are
delivery/online-ordering (KK & KC marked up)"*, which sits mid-sentence. A note
inserted there would split the sentence and, reading "both venues", attach to
KK and KC's prices, which are **not** overtaken. So the note went after the
paragraph's last line instead, worded to name the two venues and its own
scope. The evidence and the conclusion are the proposal's; only the placement
and the wording that scopes it differ.

## Counts

Applied 1, skipped 0 (one row proposed). No board item changed, so the board
index was not rebuilt; `board.py` was run as a check.

## Landed

`a21e0f4d` (`docs: de-duplicate the owner's asks (estate health sweep)`), CI
green at that head: `CI` (all five jobs), `floor` and `FX rates` all
`success`, none cancelled
([CI run 43540833497](https://github.com/mike548141/faves/actions/runs/43540833497)).
The hook's advisory `pdlistscan` finding (no `docs/PERSONAL-DATA.md`; blocking
from 2027-03-08) is pre-existing and left for the owner.
