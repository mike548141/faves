# 0093 — One place decides what a thrown error means, because eight tools had quietly re-decided it

**Status**: accepted • **Date**: 2026-09-07

## Context

This repo runs fifteen headless-browser checks. A run can end three ways and the
distinction is load-bearing, because CLAUDE.md tells readers to **believe the
exit code**:

- **exit 0** — everything asserted held.
- **exit 1** — an assertion failed. A statement about the *site*.
- **exit 2** — `HARNESS ERROR`, the browser stopped answering. A statement about
  the *machine*, and explicitly **not** about the site.

Two earlier pieces of work rested on that classification. [ADR 0072]'s sweep
added `need()`, so a check that *dereferences* a missing element throws a
`MissingElementError` and fails at exit 1 by name instead of dying on a null.
Roadmap item `340/160` then ruled — 2026-08-22, naming refined 2026-09-06 — that
a check which *waits* for a missing element must do the same, splitting the poll
helper into `untilPresent` (a claim about the site, exit 1) and `untilStable` (a
claim about timing, exit 2).

Both rest on the same mechanism: `browser.mjs` installs a
`process.on("uncaughtException", …)` handler that inspects the error's type and
picks the exit code.

## The finding

**Eight of the fifteen tools ended with their own top-level
`catch (err) { console.error(err); process.exit(2) }` around `run()`** —
`addon`, `branch`, `cook`, `device`, `note`, `recipe`, `served` and `sync`.

A local `catch` sits **upstream** of `uncaughtException`. Nothing propagates to
a handler that fires only for errors nobody caught. So in those eight tools the
classifier was unreachable, and **every** `MissingElementError` raised in them
became a flat exit 2 — a site regression wearing a transport flake's clothes,
which is precisely the fault `need()` was built to remove.

🛑 **So `need()`'s promise had already been void in over half the corpus since
the day it shipped, and nothing said so.** Every one of those eight tools was
green. The guard's own verification could not see it, because a guard that never
fires and a guard that fires into a `catch` which discards its meaning look
identical from outside — [ADR 0072]'s pattern, applied to [ADR 0072]'s own
remedy.

Had `340/160` been built without finding this, the split would have been
decorative in eight of fifteen tools on the day it landed.

## Decision

**The mapping from error type to exit code lives in exactly one exported
function, `exitFromError(err)` in `tools/lib/browser.mjs`, and every path that
ends a run calls it.** That is the `uncaughtException` handler *and* each tool's
own top-level `catch`. A tool may still catch — there are good reasons to, such
as tidying a browser — but it may not **classify**.

Rejected: *delete the eight local catches and rely on `uncaughtException`
alone*. It gets the same result now and re-opens the moment anyone wraps
`run()` in a `try/catch` again — an obvious, locally-correct thing for a future
author to do, and nothing would tell them they had just switched the
classification off. Exporting the classifier makes the correct call the easy
one and keeps the local catch available.

## Consequences

- `MissingElementError` now reaches exit 1 from all fifteen tools, not seven.
- The `untilPresent` / `untilStable` split is meaningful everywhere rather than
  in the seven tools that happened to have no top-level catch.
- 🚩 **A new failure shape is possible and is not yet covered.** `picks_check`
  throws a plain `Error: #settings-btn has no clickable box` from a *geometry*
  helper — neither a `MissingElementError` nor a `HarnessError` — so
  `exitFromError` sends it to exit 2 with no `FAIL` line. Whether a geometry
  throw is a site claim or a harness claim is undecided; see roadmap
  `340/190` (a).
- ⚠️ **This ADR asserts nothing about the two tools that print no tree line.**
  `geo_check` and `served_check` hand-roll their summaries, so a run of either
  cannot confirm which tree it measured (`340/190` (b)). Their exit
  classification is fixed here; their provenance line is not.

## Evidence

Verified by breaking, in one tool so only the wrapper name differs:

| probe | broken | result |
|---|---|---|
| `untilPresent` — `app-ready` renamed | site claim | `FAIL  MISSING ELEMENT — this check waited 15s for home rendered…` → **exit 1** |
| `untilStable` — `localStorage` renamed | timing claim | `harness error: timed out waiting for storage reachable` → **exit 2**, no `FAIL` line |

And before/after on the same break in `note_check` (`.order-fab` renamed):

- at `815c568`: `Error: timed out waiting for the order UI` + stack
  → **exit 2** ❌
- after: `FAIL  MISSING ELEMENT — this check waited 15s for the order UI…`
  → **exit 1** ✅ (re-verified independently by the orchestrating session,
  which broke it again and read `REAL_EXIT=1` from the process itself)

All fifteen checks pass on the merged tree.

[ADR 0072]: 0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
