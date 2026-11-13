## 2026-08-19-0128 — three claimed items, and two of the three findings were wrong

An orchestrating session on Opus with two sub-agents in worktrees. The through
line was not planned and is worth naming: **every item taken turned out to be
partly a defect in the thing that reported the defect.**

🔑 **The headline is a refutation.** Item `340/120` said `cook_check` wedges on
its default recipe *"deterministically, and it is not machine load"* — seven
runs by one session, reproduced by a second, controlled against `origin/main`.
On byte-identical code (`git log 5e23592..HEAD` over the whole cook path returns
**nothing**) it ran **four consecutive times to `OK — 84 passed, 0 failed`**, at
a **smaller** CDP budget than it was recorded failing at, under comparable load.
🔑 **What survives is better than what was claimed:** the wedge point *"always
the same 30"* is exactly PASS 30 in a green run too. So the position was a
property of the SCRIPT, and two sessions read a shared position as evidence of
determinism. **A fault that always stops in the same place has shown you where
the script's clock runs out, not what stopped it.** The mechanism remains
unexplained and is not claimed to be load either; the merge into `010` is put to
the owner rather than made, because this item's own text forbids that merge and
one session's four greens overturning two sessions' seven reds is a judgement.

**Then the same shape twice more.** `340/070`'s four named stale references were
**all already repaired** — including the one asserting *"every clause of that
paragraph was false"*. A sweep of 124 selector targets across 13 tools found
**zero** stale. And the sync item's *"ADR 0061 leans on that number"* half is
**refuted**: the ADR states both figures correctly; the overstatement was in the
Worker and the README, not the record.

**What actually shipped, all of it verified by breaking it first.**
- `cook_check` passed the **raw** `recipe.ingredients` at **seven** sites (filed
  as one). `ingredientsForStep` keeps only strings, so on *Upside-Down Plum Cake*
  — 0 loose lines, 2 groups, 8 steps — every step "needed nothing", `idxNeeding`
  was `-1`, and **both** ingredient sections skipped in silence. 73 assertions
  and 2 failures before; **85 and 0** after.
- **A third fault, found by the second, and it was accusing the product.**
  Section 12 opened the list entry by substring-matching the recipe NAME.
  `goesWith` prints other dishes' names onto a card: **Shane's Ribs lists
  "Sticky Date Pudding"** and sits five places earlier, so it won the match. The
  tool opened the wrong recipe and reported *"the list's way in reaches the SAME
  checklist, not a second copy"* — which reads as the product losing your ticks.
  It does not. Which recipes this hides is decided by the **pairings corpus**, so
  it grows silently, and the failure always accuses the app. Scoped to `dishId`;
  the `|| d[0]` fallback deleted rather than retargeted, because that half is
  what turned *"cannot find my fixture"* into *"the product loses your ticks"*.
- **`need()` across 26 dereferences in 9 tools**, and its value was the **exit
  code**: a raw deref of a deleted element is `TypeError` at **exit 2** — the
  repo's code for *"the browser stopped answering"* — where `need()` names what
  it wanted at **exit 1**. A real regression was arriving dressed as a transport
  flake. Break-probed independently before merge.
- **A venue's closure now outranks every branch's posted hours.** The fault is
  **latent**: all 55 records carry `lifecycle.added` and **not one** carries a
  `lifecycle.events` entry, so it cannot be seen on any real page. The old guard
  was **certifying the wreck** — it passed *"the lead is not a branch we know is
  closed"* on a permanently-closed chain. Exercised through a bytes-only server
  `overlay`, never a fiction in `site/data/`.
- **The sync `blobId` is 128 bits WIDE and 65 bits of ENTROPY**, in three places
  (filed as one). HKDF cannot manufacture entropy its input lacks. **No
  vulnerability** — 2^65 is ~3.7e19 and ADR 0061 chose 65 deliberately — but the
  number was wrong in the direction that flatters the design, which is the
  direction that gets believed.

🚩 **A board defect no gate can see.** The item carrying the 🎯 for the menu
fetch announced *"three questions … two remain"* and held **one**. The other two
sat inside the Victoria Tavern spirits item, still numbered `2.` and `3.` from
the pre-split single list. Every file was well-formed, every link resolved, the
index rebuilt clean. **Splitting a numbered list preserves the numbering and
loses the belonging.** Moved verbatim.

🎯 **Measured and worth the owner's attention: 21 of 60 open items (35%) carry a
🎯 or ⚑.** A third of the board cannot move without him. That is a throughput
fact, not a complaint about any one item.

⚠️ **Two process notes against ourselves.** A `syncdocs` worktree was created and
then never entered — that work landed directly on `main` in the primary
checkout. No harm (clean tree, gates ran against the tree that held the change,
CI green) but it is the cwd-drift shape and is recorded rather than tidied away.
And a break-probe showed `branch_check`'s assertion **count** is not invariant —
72 clean, 73 probed — so at least one assertion is conditional on the state being
probed, and "N passed" is the one line everybody reads.

**Close state:** `main` clean, CI green on the pushed head, no worktrees, no
branches, no live claims held by this session. Board **63 open · 20 done · 14
part-done · 3 waiting**. `SHELL_VERSION` `2026-08-17.133`. Pin `atelier@f2104f0`
(verified equal to atelier's `origin/main` — no drift to apply).

