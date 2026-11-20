# 2026-11-16 0638 UTC — 🎯 removed from three asks the tidy-up closed, one held

**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 297+1 -->
- [2026-11-16 · 0638 UTC](2026-11-16-0638-asks-markers-removed.md) — 🎯 removed from three asks the 2026-11-16 0545 tidy-up closed, one commit (`ade5dd10`), C0711 held: no 🎯 on its item (estate health sweep follow-up)


**Dispatched by** an estate health sweep (orchestrator session 58027096),
working headless in a detached worktree off `origin/main`. It follows
[the asks tidy applied at 0545 UTC on 2026-11-16](2026-11-16-0545-asks-tidy-applied.md):
four of that run's rows marked an ask closed or not the owner's, but left the
ask's 🎯 in place, so the next de-dupe would list it as his again.

💬 **The owner's answer** (a structured question, 2026-11-16, put by the
orchestrator), his pick verbatim: *"Remove them (Recommended)"*. The question
was whether to remove the 🎯 from the items the tidy-up had just marked closed
or not his ask; the option read *"One commit per repo, so each repo is undone
with one git revert. Each item gains a line recording that the marker was
removed and why. Only items whose tidy line was applied today are touched."*
His standing conditions on the whole tidy-up, the same day, verbatim: *"each
has a confidence rating of high or better * and we have a way to reverse each
change if needed in the future * and the board or relevant place for each
shows it has been adapted and where to find the original info and how to
revert it"*. Headless, so nothing was asked.

## What changed

For each row the tidy commit was opened to find the ask its `🔀 Tidied` line
sits under, and only the 🎯 on that ask was removed. Each item gained one line
under its tidy line saying what was removed, what the line read before, and
how to revert. No other text, checkbox or marker moved: `--numstat` shows one
deleted line per file, the 🎯 line itself, rewritten without the marker.

| Row | Item | 🎯 removed from | Result |
|---|---|---|---|
| C0728 | `docs/roadmap/310-…/130-28p-the-70-ladders-…md` | mid-line, before "**Likely a further ask.**" | done |
| C0740 | `docs/roadmap/470-…/050-cook-at-home-as-a-venue-…md` | "**Owner fork: where the wildcard sorts…**" | done |
| C0746 | `docs/roadmap/510-…/220-bucket-versions-…md` | "**Design ruling needed:**" | done |
| C0711 | `docs/roadmap/040-theme-2-location-maps/010-mcdonald-s-finish-the-flesh-out.md` | — | **held**: the item carries no 🎯, and `git log -S'🎯'` on the file is empty, so there was never one to remove |

**Marker commit:** `ade5dd10` (`docs: remove 🎯 from asks the 2026-11-16
tidy-up closed`). **To revert all three:** `git revert ade5dd10`.

🔎 **Left alone, on purpose.** C0740's item carries a second 🎯, in the older
"kept for the record" options block ("The recommendation was (1) first…").
It is not the ask the tidy line closed, and the item's own 2026-09-09 hygiene
note already calls it a superseded recommendation, not a live ask. A future
de-dupe may list it; removing it is outside this run's approval.

The board index is generated from item headlines only, and `board.py`
reported it current before and at the commit, so it was not regenerated.

## Landed

`ade5dd10` (the markers), then this record. CI is reported in the sweep's
report. Every hook run carried the pre-existing advisory `pdlistscan` finding
(no `docs/PERSONAL-DATA.md`; blocking from 2027-03-08), left for the owner as
before.
