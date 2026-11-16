# 2026-11-16 0545 UTC — the owner's asks tidied: five lines added, none held

**Dispatched by** an estate health sweep (orchestrator session 58027096),
working headless in a detached worktree off `origin/main` (session
`115f965c`). It applies the follow-up to the 2026-11-14 de-duplication of the
owner's asks: five rows for this repo, each verified at confidence high on
2026-11-14. The owner approved applying them on 2026-11-16, verbatim, on each
group: *"Apply ... per your recommended option but only if each one meets all
of the following, * each has a confidence rating of high or better * and we
have a way to reverse each change if needed in the future * and the board or
relevant place for each shows it has been adapted and where to find the
original info and how to revert it if I decide to revert any or all of the
changes in future."* Headless, so nothing was asked.

## How each row was applied

Before writing, each row's cited lines were opened and still said what the
evidence quoted. Each row then got **one added line** (a `🔀 Tidied` bullet)
on its item, under the ask it concerns, saying what it establishes, citing the
lines it rests on, and how to revert it. **Nothing was edited, moved, deleted
or ticked**: every commit's `--numstat` shows 0 deletions. Body lines do not
reach the generated index, so `board.py` reported `docs/ROADMAP.md` current
after each one and it was not regenerated. One commit per row, so each is
undone by its own revert.

| Row | File | What was added | Commit | Revert |
|---|---|---|---|---|
| C0103 | `docs/roadmap/200-…/160-a-swap-is-not-an-extra.md` | partly answered: the swap-removal question is answered (💬 2026-10-18, lines 82-84); F1, F3, F4 of the 2026-11-02 cold review stay his | `82c14207` | `git revert 82c14207` |
| C0728 | `docs/roadmap/310-…/130-28p-the-70-ladders-…md` | the "Likely a further ask" is a forecast inside the 70-group cleanup, not his yet | `76f51100` | `git revert 76f51100` |
| C0740 | `docs/roadmap/470-…/050-cook-at-home-as-a-venue-…md` | the wildcard-sort fork is deferred by his 2026-10-02 decision until the private-branch store is built; not a live ask | `935c7d2b` | `git revert 935c7d2b` |
| C0746 | `docs/roadmap/510-…/220-bucket-versions-…md` | the design ruling is not his yet: re-measure with `chatty_check` first (premise moved 2026-10-02) | `3c3e47ec` | `git revert 3c3e47ec` |
| C0711 | `docs/roadmap/040-theme-2-location-maps/010-mcdonald-s-finish-the-flesh-out.md` | part (b)'s "needs the actual image files" is already closed (done 2026-08-16, lines 1-3); (c) and (d) stay open as content work | `d6ec0d26` | `git revert d6ec0d26` |

**Held:** none. All five passed the three conditions: confidence high, a
one-commit revert, and the line on the item saying what changed and how to
undo it. No row named a home in another repo.

## Note on wording

C0103 and C0740 rest on records that say "Owner ruled". The added lines call
them his answer (C0103, to a question a session put) and his decision
(C0740), not rulings: the evidence is that he answered a question, and a
record must not make it stronger than that.

## Landed

The five row commits above, then this record. Every hook run carried the
advisory `pdlistscan` finding (no `docs/PERSONAL-DATA.md`; blocking from
2027-03-08), pre-existing and left for the owner. CI at `d6ec0d26`, the
last row commit, all `success`, none cancelled: `CI`
([run 43812594644](https://github.com/mike548141/faves/actions/runs/43812594644)),
`floor`
([run 43812594893](https://github.com/mike548141/faves/actions/runs/43812594893))
and `FX rates`
([run 43812594657](https://github.com/mike548141/faves/actions/runs/43812594657)).
The earlier row commits' `floor` runs were cancelled by the next push, which
is not a result; the green at `d6ec0d26` covers all five. CI on this record's
own commit is reported in the sweep's report.
