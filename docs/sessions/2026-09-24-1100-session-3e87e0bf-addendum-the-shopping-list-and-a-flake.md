## 2026-09-24-1100 — session `3e87e0bf` addendum: the shopping list, and a "flake" that was a defect in the check

**`17e`'s shopping list shipped** — built as the item's own direction said, the
order tally's cook-at-home twin. `createOrder(storage)` gained a defaulted
`key` parameter and **that one line is the whole of the reuse**: one
gather/group/total, one storage lifecycle, one corrupt-payload fallback, one
subscriber model. A shopping line *is* an order line — `venueId` the recipe,
`dishId` the ingredient, `collected` the trolley instead of the till.
`recipe_check` 29 → **39**. ADR 0124.

🔑 **Te reo owed and none added, checked rather than assumed.**
maoridictionary.co.nz has no entry for *shopping list* or for the composed
candidate, so a gloss could only be **built** — the refusal this repo already
recorded for *dining*. Queued with its evidence.

### 🛑 The finding: `main` was red on `cook_check` across four merges

A worker reported `cook_check` at 83/85 once, 85/85 on four other runs, and
**said plainly it had not bisected against `main` and could not rule its own
branch out**. The documented loaded-laptop explanation was sitting right there
and would have absorbed it. That refusal to claim a green run it could not
account for is the only reason this was found.

The bisect, run before merging:

| commit | shell files precached | runs |
|---|---|---|
| `935f44e` | 96 | 3 of 3 green |
| `9178b5b` | 96 | 3 of 3 green |
| `3db205f` — `js/heat.js` joins the precache | 97 | **1 of 3 RED** |
| `f3a93c5` | 97 | **2 of 3 RED** |

**The failure rate tracked the precache size**, at load 1.7 — so not the
transport flake, and **not a product defect**. The check waited on
`getRegistration()`, which resolves while the worker is still `installing`;
`showNotification()` needs an **active** worker. Every file added to the
precache widened the race. Fixed to `navigator.serviceWorker.ready`:
**4 of 4 green on the same tree that was 2 of 3 red before.**

🚩 **The check's own comment said it was waiting for the right thing.** *A
check's description is not evidence about the check* — third time in this repo,
second time in this session. And it was invisible because **CI runs
`boot_check` and nothing else**: `290`'s shape from the other side, where the
gate is broken and `main` is fine.

### Close

Tree clean · `origin/main` only · no worktrees · stash stack empty · CI green
on `7d998ae` and `824b1c5` · deploy verified live at `lets-eat.myspot.nz`
(`SHELL_VERSION 2026-09-24.2`, `DATA_VERSION 2026-09-24.1`).

