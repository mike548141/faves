## 2026-09-07-0235 — the same session, continued: eleven rulings, and two claims of mine that were wrong

**Session `faves-b1`, continuing.** The owner stayed live through the close, so
the second half is mostly **his rulings** plus two more agents and two ad-hoc
asks. **Eleven rulings taken in four batches.** Every one was put in
`AskUserQuestion` with real options, costs and a recommendation; he took the
recommendation nine times and **overruled it twice**, both times upward.

### What he ruled, and the two overrules

| Ruling | Outcome |
|---|---|
| Past-midnight hours | Option 1, the wrapping close — **shipped**, ADR 0094 |
| Load-starved `untilPresent` | Retry the WHOLE check once, never the CDP call |
| The ninth closure surface | Measure first → then **leave it**; item closed unbuilt |
| The thirteen stubs | **Wider than recommended** — re-check *and* fetch |
| 37n's four allergen calls | All four; the sweep is unblocked |
| Fish add-on | Option 1 **and widened** — an add-on carries its own axes |
| DST | **Widest option** — test the whole hours model |
| Animating geometry | Option 1 **with a condition** — measure the lag in use |
| Allergen label tables | Add the test now |
| Agent teardown | **OVERRULED** — agents signal done; don't infer it |
| The stale stashes | Drop both |

🔑 **The two overrules point the same way**: he twice rejected the cheaper,
narrower option for the one that removes a class of problem rather than an
instance. Worth remembering when framing the next ask — the recommendation
being *smallest* is not what he optimises for.

### 🛑 Two claims of mine were wrong, and both were "verified"

1. **The raw `has-fish` chip defect does not exist.** I told him, and wrote on
   `110/040`, that a composed dish row would render a chip reading literally
   `has-fish` beside a proper `⚠ fish` — marked **VERIFIED IN THE CODE**. What
   I verified is that `tagChip()` has a bare fallback: **true**. What I
   *assumed* is that composed tags reach it: **false**. `menu.js` builds the
   chip row **once**, in `renderDish`, from `item.tags`; `onCompose` rewrites
   `dataset.tags` and toggles a class and appends nothing. The delivering agent
   caught it by **measuring the rendered row** rather than reading the source,
   which is the only method that could have.
   🔑 **Reading a callee is not reading the call graph.** A true observation
   about one function plus an unexamined assumption about who calls it,
   published as one verified claim.
2. **My corpus sweep undercounted** — "two rows at one venue" was three at two.
   It was **true when written and stale when read**: a *concurrent* agent
   transcribed `crepes-a-go-go` in between. **A corpus measurement taken while
   other sessions are writing to the corpus has a shelf life**, and this board
   has no convention for saying so.

### What shipped in the second half

- **DST — tested and CORRECT, in both directions** (`190/030`). The good
  outcome, and recorded as one so nobody re-investigates. *Why*: `hours` are
  wall-clock and `nowIn`/`todayIn` read the venue's wall clock through `Intl`,
  so **both sides of every comparison move together**; `segments()` has no
  notion of a 23- or 25-hour day and never needs one, because it is never
  handed an elapsed duration. `tests/hours-dst.test.js` (22 new) and
  `midnight_check` **34 → 68**. Break-probe: hard-wiring the clock to a no-DST
  zone fails 12/22 unit and 9/68 browser assertions, **every one at an NZDT
  instant and not one of the June six**.
  🔎 Filed `190/040`: in **April** the 02:00 hour happens twice, so the
  countdown runs twice — at 02:30 it says "closes in 30 min" when the door
  shuts **90** minutes later. Errs early, the same direction ADR 0094 chose.
- **An add-on that names a fish now warns about it** (`110/040`, ADR 0095).
  Three tags, three options, two venues — and **no `site/js` change was
  needed**: `composeTags` already unioned, de-duplicated and recorded which
  option carried each allergen. The owner's stated architecture was already
  built; only the data was missing.
  🔎 **The best find was not the fish.** The two taggers each carried their own
  finfish list and they had **drifted** — 13 species against thirty-odd — so
  Kingfish, Gurnard, Eel and two dozen more were *fish on a dish and not fish
  on an add-on*, with both sweeps green.
  🎯 Two findings want a ruling and both predate this work: `200/050`, the
  picker says one clause twice verbatim (*"Halloumi contains dairy — you asked
  to avoid it. Halloumi contains dairy, so this is no longer vegan."*),
  reachable by five allergen×claim pairs; and `200/060`, the chip row still
  says `Veg` on a dish the warning has just called not vegetarian.

### Two ad-hoc asks, both mid-turn

- **Simmer's menu photos.** Owner supplied four JPEGs — the menu-content rule's
  **first** limb (owner-*supplied*), needing no scoping argument. Filed as
  `080/200` and claimed before starting. 🔑 **It does not refute this session's
  own stub sweep**, which put Simmer in the not-fetchable column and was right:
  Simmer still publishes nothing online. **A venue that publishes no menu is
  not a venue with no menu** — the sweep measured the web, and a camera is a
  different instrument.
  🛑 Two readings refused rather than guessed: the **Caramel** and **Citrus**
  slice tags read literally `$55` at full crop, while the `$7·50` tag beside
  them plainly shows its decimal — so $5.50 is the obvious intent and writing
  it would be inventing a price. Both recorded `price: null`.
- **Theme 38 — a cold review of the data model**, owner-raised for a *fresh*
  session and recorded only. His eleven strands are mapped to what already
  exists (two already closed; `data/products/` already holds 87 packaged
  products), plus **nine he did not name**, drawn from the record rather than
  speculation. The sharpest: **"we do not know" has no consistent shape** —
  `price: null` is unknown, `hours: null` is unknown, but `hours: []` asserts
  **CLOSED**.

### An orchestration lesson, paid for twice

🚩 **I destroyed two running agents' worktrees**, on a clean tree plus a pushed
HEAD — which answers *"is its work safe to take?"* and not *"has it stopped?"*.
Both agents diagnosed the resulting errors as teardown artefacts themselves and
re-verified against `main`. **Nothing lost: luck plus two good agents.** Filed
as `340/240` — and the item was filed saying *"an agent"* from the one report
in hand, then corrected to **twice** when the second arrived. *A symptom count
proves a fault exists, never how many there are*, landing on the item that
records the board's own error. The owner **overruled** the narrow fix.

💡 **Both later agents opened a PR rather than only pushing, unprompted, and
were right to.** `ci.yml` triggers on `push: [main]` and `pull_request` only —
so a bare branch push runs the `floor` workflow **alone**, and a session that
pushes a branch and cites "CI green" is citing half of it. PRs #8 and #9 each
carried all **8** checks. This is worth adopting as the default for agent work.

### Close evidence

✅ **CI + floor green on every pushed commit**, including `b78a019` and
`4e1fdf0`. PRs #8 and #9 merged with 8/8 checks each.
✅ `node --test` **1193/0** · `midnight_check` **68/0** · `addon_check` **26/0**
· `validate` 57 files · `check_versions` lockstep holds · board current.
✅ Earlier in the session, **all sixteen browser checks green on merged `main`**
with one legible flake: `to_top_check` died as a `HARNESS ERROR` at exit 2 at a
**1-minute load average of 107.28** with zero orphan Chromes, then passed
**64/64** on re-run. Recorded on `340/200` as the first data point pairing a
load figure with a verdict.
🚀 **Deploy verified in production, not inferred:** `SHELL 2026-09-07.10 /
DATA 2026-09-07.7`; the Salmon add-on serves `['has-fish', 'contains-fish']`.
✅ **Stash stack emptied** — both entries verified against `main` first.

