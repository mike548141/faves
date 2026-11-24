# 0171 — Family recipes the owner made private leave the research store

**Status:** accepted — narrows
[0047](0047-the-app-ships-only-what-it-renders.md) for five records;
supersedes nothing
**Date:** 2026-11-24
**Roadmap:** `340/400` · **Follows:**
[0046](0046-ownership-is-recorded-bounded-by-provenance.md)

## Context

ADR 0047 keeps every departed dish forever in `data/history/dishes/`, and
`data/estimates/` keeps a working for every recipe the app has ever shipped.
Five Cook at Home recipes with family attributions left `site/data/` on
2026-10-01 by that route (roadmap `510/050`), because the owner moved them into
his own private recipes. The repo has been public since 2026-08-09, so the
research store's whole copy of them (full text, and an estimate with its
working each) was public too.

## The owner's answer

On 2026-11-24 the owner said, in words: *"I have moved the recipes with family
attributions into my private recipes so it stays private."* He was then offered
three options with their impacts (remove completely; keep names only; keep as
an exception), and his pick, an answer to options and not a ruling in his own
words, was *"Remove completely (Recommended)"*.

What was put to him first: the app never reads `data/`, so nothing stops
working; for these five the history file was the only ready copy that
`tools/move_recipes.mjs` read, so the repo loses it (his private copies travel
with sync); and the keep-forever rule would be set aside for these records.

## Decision

The five rows in `data/history/dishes/cook-at-home.json` and the five entries
in `data/estimates/recipes.json` are removed, with the prose and the one
provenance line that named them. This is an **exception to ADR 0047's
keep-forever rule for these records only**; the rule stands for every other
departed dish, and a recipe that is merely retired from the menu is still kept.

## Consequences

- **Git history keeps the old text.** A public repo's history cannot be
  retracted without a rewrite, and the owner was not asked to take one on. This
  was accepted: the text is recipes, not a credential, and the live tree no
  longer carries it. Rewriting history stays the owner's call if he wants it.
- `tools/move_recipes.mjs` now refuses ("in neither site/data nor data/history")
  for these five. That is by design: the move is done, on the owner's devices.
- A sixth recipe the estimates README used to list was never moved and is still
  published; it is untouched here and filed separately (`340/410`).
