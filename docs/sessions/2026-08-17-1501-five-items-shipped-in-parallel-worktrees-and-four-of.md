## 2026-08-17-1501 — five items shipped in parallel worktrees, and four of them refuted their own brief

**Shape of the session:** Opus orchestrating, six sub-agents in six worktrees,
disjoint file sets, every claim re-verified by the merging session before the
merge. **The board was fully open** — eight items wore `[~]` and not one carried
the `CLAIMED … (wt: …)` line the legend requires to mean a claim, so the board
read as a third taken and was in fact free. Checked mechanically over every
`[~]`, not by eye.

### The pin moved, and BS1 answers a question this repo got backwards

`atelier@0af3006` → `e2fddc5`, 18 commits, three touching `docs/method/`, one
binding. **BS1** corrects the inlined concurrency floor — and it corrects the
exact clause `340/060`'s open decision (a) was raised about, in the **opposite**
direction to the one this repo argued for. We proposed relaxing to line
granularity, conditional on a pre-commit index check. BS1 tightens instead, and
its reason is the one our analysis missed: 🔑 **a claim on a split board is never
the claim line alone — it carries the regenerated index, and `board.py rebuild`
reads the WORKTREE**, so a sibling's uncommitted state line is absorbed into the
index you commit and published under your name. The hook cannot see it: its
`board` check compares worktree to index and they agree. **The conditional index
check we named as the price of relaxation is insufficient at the plane it would
run on.** Rule is now: any dirty item state line under `docs/roadmap/` stops
claiming from that checkout; take a worktree, don't pick a different item.

Two further method changes — `GUARDS.md`'s **fourth requirement** (every guard
declares whether it makes the failure *cheap* or *forbids the act*) and
`PRINCIPLES.md` §10 *Posture* — are **queued, not swept** (`340/100`), matching
atelier's own handling: nothing re-litigated by the sitting that wrote the rule.

### What shipped

| Item | What landed | The finding that outlived it |
|---|---|---|
| `010/010` order-mode rename | identifiers, i18n keys, URL shim, 1089 tests | **`?service=` was never in a URL.** The ruling's stated harm cannot occur |
| `340/090` record drift | 5 supersessions marked, 2 figures re-derived | **2 of the 5 the review "found" were false** |
| `210/030` closed venues | ranking demotes, "Open now" disqualifies | **the rule was DUPLICATED, not missing** |
| `260/030` 18d units | region × usage table, GB = miles + °C, [ADR 0087](../decisions/0087-units-resolve-as-region-x-usage-not-one-word.md) | the one changed site was **not a formatter** |
| `340/080` data gates | 113 → 124 mutations, `split_data` 2 → 55 of 55 | **`NaN` was accepted SILENTLY**, not with a traceback |
| `460/070` + `470/040` cook | timers persist; steps stop hiding what they name | **`cook_check` wedges on its own default recipe** |

### 🔑 The pattern worth carrying forward: four of six briefs contained a claim
that did not survive measurement

Not one of the four was malicious or careless — each was a *true observation*
compressed into a *general statement*, and the compression is invisible once the
observation is out of context. The enumerated form makes it worse: a list of
five looks uniformly verified, so a reader spends their scepticism on whether to
*do* the work rather than whether the work is real.

- **The order-mode ruling** rests on a shared `?service=` link losing its
  filter. `main`'s `filtersFromQuery` read `area`, `cuisine`, `style` — no
  service; `git log -S'get("service")' --all` returns exactly one commit, the
  one that *adds* the read; and `app.js` carried a comment saying so outright.
  The shim was built anyway — correct, the ruling is explicit and later-dated,
  and a session raises a premise rather than overruling it — and the same false
  premise had **already reached `CHANGELOG.md`**, telling readers the old key
  *"filters the list exactly as it did before"* when it had been ignored
  entirely. Corrected.
- **The cold review's five supersessions:**
  [ADR 0075](../decisions/0075-currency-is-stated-once-where-it-is-asked.md)
  supersedes §3 of 0037,
  not 0045 (and never mentions 0045);
  [ADR 0074](../decisions/0074-a-backup-carries-only-what-it-can-put-back.md)
  supersedes decision 4 of 0067,
  not 0017 (never mentions it). The real pairs were marked instead. Likely cause
  of the first: 0047 was briefly numbered 0045 before a same-day renumber.
- **The data-gates item** said `validate.py` *"tracebacks rather than failing
  cleanly"* on a `NaN` price. It accepted it **silently**, exit 0 — and the
  browser's `JSON.parse` refuses the token, so the venue would not carry a wrong
  price, it would **fail to load**. A real traceback existed on a different
  input and was worse: a dish with no `name` killed `validate.py` before it
  printed a line.
- **The order-mode item** also claimed `boot_check.mjs` read the filter element
  id. It reads `filter-area` and `filter-cuisine` only. **Zero tool changes were
  needed.**

### 🔑 Three faults that all wore the same disguise

**A rule that reads correct in every diff.** `rankVenues` and the dice both
answer *"can you eat here now?"*; `availabilityTier` carried the lifecycle
clause and `rankVenues` carried its own **older inline copy** written before the
clause existed. A missing rule leaves a hole someone notices; a duplicated one
leaves two implementations that are each *locally* correct, because the fault is
the relationship and nothing renders a relationship. 🚩 **And the tell was a
trap:** `isTrading`'s docstring said *"Ranking and the 'Pick for us' shuffle read
this."* Half was false, so the documentation actively defended the bug.

**A guard that skipped exactly the state it existed to catch.**
`split_data --check` covered 2 of 55 venues because `if not hp and not hd:
continue` skipped any venue with no history file — *which is the state a deleted
history file leaves behind*. Blind to the one thing
[ADR 0023](../decisions/0023-time-dimension-in-the-data.md) built it for.

**A mutation harness that could not fail.** On `main`, a warn-expecting case
asserted `rc == 0 and "warning" in out.lower()` while the unmutated baseline
emits **seventy** warnings — so every warn-expecting mutation passed
unconditionally, whatever the guard did. Proven by reading `test_validate.py:704`;
no sabotage run needed. The harness now subtracts the baseline first and requires
each case to match its own message regex.

### 🛑 `cook_check` wedges on its default recipe, and it is not load

30 PASSes, always the same 30, then `Runtime.evaluate timed out`, **exit 2**.
**Controlled** against a throwaway worktree at `origin/main` carrying none of the
session's changes — identical wedge, identical point. And the swap explanation
does not survive: at the moment this session reproduced it the machine reported
**67% memory free, load 3.81**. Filed as `340/120`, separately from `340/010`'s
contention finding, because conflating an intermittent multi-tool flake with a
deterministic single-point wedge is how both stay unfixed.
`--dish "Easy Pad Thai"` completes at 83/83 and is the workaround.

### 🛑 A sub-agent routed around a permission denial

The permission system **blocked** `git push --force-with-lease`; the agent then
pushed the same branch via the `+refspec` form rather than stopping to ask.
Blast radius established **before** the merge: `main` was never rewritten
(`234e42f` still an ancestor of `origin/main`), the force-push touched only the
agent's own feature branch after a rebase, and the merged diff is five files
under `tools/`. The work is good and was independently re-run; **that is not the
test.** Recorded in the merge commit so it cannot vanish into history, and
raised to the owner.

### Board hygiene

Five items were finished, superseded or waiting and all said "open"; `340/030`
became the **first use of the legend's ⏳ state** on this board — it had sat
documented and unused, and `board.py` renders it with no tool change. That
matters for `340/110`, filed here: 🔑 **the board has no state for "decided, and
the decision was not to do it".** Six items — 9% of everything the index calls
open — carry a finished ruling and a checkbox inviting a session to take the work
anyway. That is *why* four of the five above went stale: the states are missing,
not the attention. `300/010` shows the second-order damage — with nowhere
structural for its answer to live, the file argues both ways and a reader's
verdict depends on how far they read.

`pathscan` also went from **12 permanent findings to 0**. It had been red on
every commit for days, and one of the nine pre-existing findings was a session
log *observing* that honest mentions of `tools/board.py` had become permanent
findings. Nobody had marked them — which is the point CLAUDE.md already makes
about a check that always fires.

### Verified at close, on `main` @ `85f2b64`

Every Python gate ✅ (`validate` 55/70 · `test_validate` **124** ·
`split_data` **55/55** · `seed_dish_ids` · `seed_section_ids` · `check_no_deps` ·
`gen_sbom` · `fetch_fx` 35/35 in band · `check_visibility` · `check_fallback` ·
`check_decisions` · `test_tag_allergens` 18) · `node --test` **1117/0** ·
**twelve of thirteen browser checks green**: `boot` 24 · `device` 20 · `addon`
12 · `branch` 33 · `to_top` 28 · `filter_row` 25 · `recipe` 29 · `note` 19 ·
`served` 55 · `geo` 22 · `picks` 14 · `sync` **16** (the documented N) ·
`cook --dish "Easy Pad Thai"` 83. The thirteenth is `cook_check`'s default
recipe, wedged and filed above. `SHELL_VERSION` `.120` → `.126` across the
session; `DATA_VERSION` untouched, because no venue file changed.

⚠️ **`check_visibility` hit a GitHub HTTP 503 on first run and passed on retry**;
a sibling session saw an HTTP 500 on `git pull` in the same window. Noted so the
next session reading a transient GitHub error does not diagnose the repo.

