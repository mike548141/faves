## 2026-09-20-1053 → 2026-09-21 — session `3e87e0bf`: an orchestrating session, an eleven-day gap, and four items that were already answered somewhere else

**Tier stated at open, not asked** (`ECONOMICS.md`, ruled 2026-09-19):
orchestrating on Opus 5 (1M). Workers dispatched on the same tier where the
work was judgement-heavy.

**The opening state was an eleven-day gap.** The last session log entry was
2026-09-09; the only commit since was the automated Sunday FX refresh. Clean
tree, 0/0 against `origin/main`, no stashes, no worktrees, no open PRs. So the
recovery question — *did the last session close clean, or die mid-flight?* —
answered **clean**, and the normal onramp applied rather than the sweep.

🔎 **Four "orphan branches" were an artefact of a stale local view.** `git
branch -a` showed four `p1-*` remotes; `git ls-remote` showed only `main`.
They had been deleted on the server and this checkout had never pruned. A
`git fetch --prune` was the whole fix. **Worth recording because the wrong
reading was one command away from a confident false finding** — "four orphan
branches" was already written down before the second command contradicted it.

### The queue state, and what the board's own divergence cost

**14 items sat at `- [~]`, the oldest 34 days old, with no live session behind
any of them.** This board diverges from atelier's vocabulary — documented in
`docs/roadmap/README.md` — in using `[~]` for *part-done* as well as *claimed*,
and treating a non-claim `[~]` as free to pick up. So the marker alone was
worth nothing and all 14 had to be read. An audit classified them: 2
`ACTUALLY-DONE` with a wrong bracket, 3 `OWNER-BLOCKED`, 1 `ORPHAN-CLAIM`, the
rest `PART-DONE`.

🔑 **Three of the fourteen disagreed with the tree**, and each disagreement ran
the same direction — the item was written before work landed and nothing went
back to it. McDonald's said allergen tags were "deliberately omitted" while 32
of its 41 dishes now carry them. The sync v2 item asserts *"SYNC IS LIVE …
imported by all three screens"* and, a few lines later, *"nothing under `site/`
calls it yet"* — both sentences arrived in the same commit that split the
monolith, so the contradiction predates the split and nobody reading either
half alone would see it.

### Delivered

| item | what landed |
|---|---|
| `340/040` | **CLOSED.** linkscan's reference-style blindness was fixed upstream 2026-08-23 and reaches this repo by path. Reproduced with a three-link scratch probe before closing. |
| `150/030` | **Two of four findings fixed** — ADR 0118. A cross-device allergen-flag loss, and an error screen with no exit. |
| `500/050 (b)` | **KC Cafe's 2015 board recovered** — 136 superseded prices, joined on `dishId`. |
| `470/030` | **The 37n sweep run at last** — 8 splits over 86 rows → 3 over 44. |
| `470/060` | **Filed:** 68 items under a `Pizza`/`Burger`/`Sandwich` heading carry no gluten tag. |

🛑 **The safety bug is the one to read.** An older client strips an allergen
key it has never heard of; the newer client's three-way merge reads that as a
deletion and clears the flag. **No link in the chain is wrong on its own** —
the sanitiser is right to distrust input, the store right to write what it
holds, the merge right to propagate a deletion — so the loss lives in the seam
and 1,311 unit tests stayed green over it. It was reproduced in two real
browsers before it was fixed, and the fix is break-probed with its
**precondition and its control** either side of it: revert `sanitiseDiet` and
exactly one assertion fails, while the assertion proving the key *arrived* and
the assertion proving ordinary keys still cross both still pass. Without those
two neighbours, a merge that had simply stopped accepting anything — a worse
bug — would have satisfied the test.

🔑 **A worker refused to do part of its job, and that refusal is the most
valuable thing in the KC Cafe branch.** The brief said "9 photographs dated
2015-09-29". EXIF said six distinct photographs, three of them re-saved
duplicates, and one eight months older than the rest. The older one is a
wide-angle shot of a wall at an angle; a trial transcription produced **25
names against 24 prices**. An off-by-one there fabricates 28 plausible numbers,
so nothing was written and the gap is named. **The brief was wrong and the
worker said so rather than making the numbers fit it.**

❌ **And one reported bug was not real.** The allergen worker was handed two
rule defects. The first — `\bmuffins?\b` cannot match "McMuffin" — had been
fixed on 2026-09-09; it checked before editing and changed nothing. The second
was **worse** than filed: `slices?` was tagging a gin cocktail called *Slice of
Heaven* as containing gluten, on the strength of a song title. Fixed with a
lookbehind and **never the `exclude` the roadmap item itself proposed** — the
break-probe rebuilds it as that veto and watches the caramel slice die while
every "not gluten" line still passes.

### 🔑 The shape that ran through the whole session: an item's close event can happen somewhere else

Four separate items turned out to have been answered, fixed, or overtaken
**outside this repo**, with nothing here to notice:

- `340/040` was "blocked on an upstream fix" that landed **four weeks** ago.
- `340/220`'s hand-up came back as **house doctrine** — atelier PR #71, merged
  2026-09-17, and the rule landed in the **floor region itself** at `54201e0`.
  The item's cited atelier number was also wrong: `320/150` is the PR branch
  name, and it settled as `320/210`.
- `340/060`'s open fork question was **reopened by a ruling upstream**
  (`115/030`, 2026-09-19) that collides with the owner's own 2026-08-17 ruling.
- The `Source & drift` fork this repo kept deliberately, because atelier's
  command lacked a `fetch` and read bare `HEAD`, is now **fixed upstream** —
  so the fork's justification has quietly expired.

**A child's upstream filings need re-reading at every pin bump**, because none
of them generates a local event. That is now written into both items.

### The owner ruled three questions

Put to him with the account ahead of the device, each with costed options and
a recommendation:
1. **`340/060` floor copy** — atelier's `115/030` says a child's floor copy is
   the canonical text *word for word*; this repo's block is an enriched summary
   with two forks he ratified. **Ruled: re-stamp verbatim, relocate our text
   below.** Nothing lost, and `stampscan` can finally watch it.
2. **`200/080` spicy tag** — **ruled: render it**, not refuse it in
   `validate.py`. The answer to "no screen renders this" is to name the screen.
3. **`340/220` stash check** — **ruled: build it**, against the argument that
   the house floor already covers it at session start.

All three were claimed and dispatched the same day.

### Verified on the merged tree

Every Python gate · `node --test` **1311/1311** · and seven browser checks CI
does not run: `boot_check` 24 · `device_check` 25 · `focus_check` 26 ·
`addon_check` 52 · `sync_check` **22 (was 16)** · `cook_check` 85 ·
`recipe_check` 29. `SHELL_VERSION` → `2026-09-20.1`, `DATA_VERSION` →
`2026-09-20.1`; two workers independently chose the same `DATA_VERSION` and the
collision was resolved at merge, which is the collision the `--range` form of
`check_versions.py` exists to make visible.

⚠️ **A gate-runner loop silently ran nothing.** `for g in "split_data.py
--check"; do python3 tools/$g; done` — zsh does not word-split, so the whole
string became one filename and the gate *appeared* in the output having never
run. The same trap was independently hit and caught by one of the workers the
same day. Type the gates out; do not loop over strings containing flags.

