## 2026-08-16 — Themes 17, 36 and 4, run as five parallel streams

An orchestrator session on the owner's queue: Theme 17 (cook mode), Theme 36
(cooking is not ordering) and Theme 4 (content growth), five worktrees, four
peer sessions live throughout. Everything below landed on `main` and is covered
by a green superseding CI run (`078f0ba`; `74c1918` is its ancestor — the
`floor` run on 74c1918 shows `cancelled`, which is a peer's push taking the
concurrency group, not a failure).

### What shipped

- **Theme 36's structural call — [ADR 0065], `site/js/kinds.js`.** ~40 scattered
  `kind === "recipes"` checks across eight modules became **11 declared
  capabilities** plus 10 label slots. `grep -rn '"recipes"' site/js/` now
  returns `kinds.js` alone. `renderDish` lost its `isRecipes` boolean — `r`
  already carried the kind, so the flag was a second copy that could disagree.
- **Theme 36a/36c — `data/estimates/`, [ADR 0064] as amended by [ADR 0066].**
  All 24 recipes and 118 steps, every number carrying its **working** in prose,
  guarded by `tools/recipe_estimates.py --check`.
- **Theme 17e — the cook-mode checklist and read-aloud, [ADR 0067].** Ticks on
  ingredients and steps, surviving a reload; `speechSynthesis` on a tap.
  `cook_check.mjs` 36 → 57 assertions.
- **Theme 4 — `tools/drinks_gap.py`**, and a live user-visible price defect
  fixed (below).

### 🔑 Four capabilities is the owner's floor; eleven is what the code asked for

The ruling named four (hours, location, prices, ordering). Deriving the
vocabulary from the real call sites instead produced eleven, each read by at
least one site — the extra seven (`canReport`, `hasFreshness`, `inFacets`,
`pinnedFirst`, `hasContactCard`, `itemsHaveRecipeFields`, `itemPage`) were
already distinctions the code was making, just spelled as identity checks. The
method that got there: read every call site first and group by *what it is
actually asking*, rather than designing the table and mapping onto it.

**Four identity checks survive deliberately.** `isRecipeKind()` writes a
**persisted** `isRecipe` flag into favourites, ratings and share URLs, read back
for a record that may not be loaded. A persisted answer cannot be re-derived, so
it cannot become a capability. That is the boundary of this refactor and it is
worth naming: capabilities describe a record you *have*; identity is what you
stored when you had it.

### 🔎 A green suite proves a refactor's tests still pass, not that behaviour held

Two things beyond the green runs, and they earned their cost:

1. **Rendered DOM captured from `main` and from the branch, diffed** —
   byte-identical across five screens (home list 30,857 chars, Cook at Home
   73,540, two menus, the home count), with the data verified identical first so
   the comparison isolates the code.
2. **Each capability flipped on purpose to see which bite.** `hasPrices` breaks
   3 tests, `pinnedFirst` 2, `hasHours` 1, `inFacets` 1 — and **`hasLocation`
   breaks none**, because every consumer already guards on `lat`/`lng`. It is
   declaration-only today. Recorded in the ADR rather than left for a future
   session to trust a green run over.
   ⚠️ The DOM harness also missed the `pinnedFirst` break: headless Chrome
   denies geolocation, so it never exercises the distance sort. The unit tests
   are what cover that. **Two harnesses, two blind spots, and neither is
   visible from the other's green output.**

### 🔑 A peer's measurement and a peer's diagnosis are different goods

A peer reported "sorting by distance puts Cook at Home first despite having no
coordinates" as a live `kind` bug. The measurement was reproducible and
valuable. The diagnosis was wrong: `ranking.js` `pinned` is commented *"Cook at
Home always anchors the top"* and `ROADMAP-DONE.md` records it as a deliberate
2026-07-12 decision. Two greps separated them, before an agent had been told to
treat it as a defect — which would have silently reverted a shipped decision
inside a "pure refactor", the worst available version of this.

The real question the report contained is better than the bug would have been:
the pin sorts ahead of *every* key, but "nearest first" is a question the reader
asked **explicitly**. Left for the owner; the refactor makes it *expressible*
(`hasLocation: false`) without deciding it. **Verify a report before you build
on it** — the peer agreed without reservation and asked that measurements keep
coming in that shape, which is the right outcome.

### 🔎 The defect no gate could have caught, found by a tool aimed elsewhere

`tools/drinks_gap.py` was built to answer "which venues sell drinks and have no
drink rows?" (answer: 1841, Baylands, Sprig + Fern Tawa). Its `--price-effect`
mode, added only to check whether the roadmap's `priceBand` warning was *true*,
found that **BurgerFuel and Hell Pizza were shipping `$` on the home card**
against food-only medians of **$15.75 and $23.50** — the `$`/`$$` boundary being
$15. Live, user-visible, on two of the busiest venues in the corpus.

**Why it hid:** `validate.py` passes a record with **no** `priceBand`, because
the field is optional and the app derives one. There was no invariant to
violate. Of the 11 venues carrying drinks, **5 flip to a cheaper band and 0 flip
the other way** — so the roadmap's warning was true and now has a number.
Both fixed by curating `priceBand` **and** `pricePerPerson` together from the
food-only median, per the two 2026-08-15 pubs, so the band and the `~$Npp`
beside it agree instead of contradicting.

🔑 **The transferable part: a derived worklist finds things its own question did
not ask about.** Eyeballing never would have.

### 🔎 The corpus is measurably better and worse than the roadmap said

- **32 of 55 venue records carry zero dishes**, not the six Theme 4 named — and
  **14 publish no website at all**, so no amount of research clears them; only a
  photo or an in-store visit can. A five-fold understatement, fixed with a
  one-line reproducer rather than a re-typed list.
- **32 recipe steps state their own time, not 28.** The extra four state it in
  *words* — "cook the garlic for a minute", "marinate for at least an hour". 28
  is the **digits-only** count, i.e. exactly what `cook.js`'s regex can see.
  🔑 **A measurement taken through a tool inherits the tool's limits.** Calling
  those four "estimates" would have mislabelled the data to match a parser.

### Overruled on timers, and why it cost almost nothing

The estimates work encoded a safety rule raised as an open question: an
*estimated* duration may never drive a countdown. The owner ruled the other way
with the food-safety argument and a split-on-`phase` middle option in front of
him — *"estimates drive timers too, clearly marked"*.

**`timerSafe` was retired, not inverted.** Under the ruling every duration is
timer-eligible, so the flag reads `true` everywhere and a field with one value
tells a renderer nothing. `source` is what the timer face reads. The gate was
**replaced, not dropped**: a step with `minutes` and no `source` now exits 1 —
that is a countdown with no way to know whether to mark it.

🔑 **What made the reversal cheap was landing in `data/` rather than `site/`.**
The precaution was taken against a different risk (auditability before
publication, ADR 0047) and paid off here: no phone ever held the retired rule,
so overruling cost a tool edit and an ADR, not a shipped-behaviour rollback.
**Stage work where a reversal is cheap when the decision behind it is still
open.**

### 🚩 A feature that looks correct and is silently inert

`stepDuration()` in `cook.js` **re-parses the recipe sentence** rather than
reading a stored number. So building the marked-estimate timer requires the
per-step minutes to actually reach the payload — otherwise the estimated steps
stay untimed while every check stays green. Found while writing the render spec,
which is the cheapest place to find it.

### 🔎 Adding a checkbox re-armed a bug the repo had fixed twice

The cook-mode ingredient list is `replaceChildren`-ed on every step change, so a
new focusable box holding focus dropped focus to `<body>` and killed the arrow
keys — the identical failure ADR 0039 caught on the Back button. Fixed the same
way (hand focus to Next first) and asserted. **A hazard class closed on one
control is not closed on the next control added to the same container.**

Two more from that build worth keeping:
- **The strike-through is CSS `:has()`, never a JS class**, because the lines
  sit inside an `aria-live` region and a DOM mutation there re-reads the whole
  step aloud on every tick. The guard proves it by comparing the live region's
  markup byte for byte.
- **A tick is keyed on a hash of the line's own raw text**, not its index. The
  index fails *silently*: insert an ingredient and every tick below slides onto
  the wrong one — "I already added the salt" pointing at the sugar. Hashing the
  **raw** line, not the `convertTemperatures` render, is what stops an imperial
  reader losing every tick on a units flip.

### Concurrency: what fired, and what the fix actually was

Five worktrees, four peers, one afternoon. Every one of these fired:

- **Three ADR-number collisions.** 0064 twice (two of my own agents), then 0065
  again. The convention that worked, copied from a peer: **name the file
  `DRAFT-<slug>.md` in the worktree with no number in it, and take the number by
  `ls docs/decisions/` in the same minute as the final commit.** Renumbering is
  then a rename, not a rewrite.
- **`check_versions --range` false-positives on a stale base** — it reports
  *main's own* bumps as "SHELL_VERSION goes BACKWARDS" and lists other sessions'
  files, on a branch touching none of them. It fired four times. 🔑 The check
  that settles it: `git merge-base HEAD origin/main` must equal
  `git rev-parse origin/main` **before** the version check is believed. Main can
  move *during* a rebase, so "I just rebased" is not the same claim.
- **A reserved version number is only valid at the instant it is reserved.**
  A peer's three reservations were all stale by merge time.
- **I was the shared-checkout committer** a peer's aborted rebase hit. A claim
  line is a sanctioned touch in a shared tree; a *run of commits* while others
  pull is not. Moved to worktrees and `git push origin <branch>:main` for the
  rest of the session — a fast-forward that never checks out `main` anywhere.
- **Push races**: three pushes to `main` lost a race and needed a
  fetch-rebase-retry loop. Cheap, but budget for it.

### 🔑 My own check lied to me

A homemade `for c in …; do python3 $c && echo PASS || echo FAIL; done` wrapper
reported `split_data.py --check` and `gen_sbom.py --check` as **failing on clean
`main`**. Both exit 0. The wrapper was wrong, not the repo — caught only by
running the tools directly and reading their output.

That is the decorative-guard pattern, and this time it was in the orchestrator's
own hands rather than in the codebase. **A convenience wrapper around a set of
gates is itself an unverified gate.** Run the tool, read the sentence.

### Left open, deliberately

- **36d is ruled and buildable** — tone (WebAudio `OscillatorNode`), vibration,
  and a notification for timers over 15 minutes. **Not started**: it introduces
  the **first permission prompt Faves has ever shown**, and beginning a new
  trust surface at the tail of a session is how a half-built one ships.
  ⚠️ `navigator.vibrate` is **a no-op on iOS Safari** — an Android-only benefit,
  chosen knowingly. Recommend `Notification.requestPermission()` **at the moment
  a long timer starts**, never at page load, degrading silently to tone when
  refused.
- **`area: "Home"`** — evidence gathered, not decided (below).
- **Aggregate ratings** — a peer resolved this without a backend; nothing here.
- **The Cook at Home list has no tick boxes** — blocked by file ownership only,
  ~20 lines, recorded in [ADR 0067]'s *Rejected* so it is built, not redesigned.

### 🎯 Sitting with the owner

- **`area: "Home"`** — the roadmap called it an invented suburb, and asked
  whether to null it per ADR 0003. Measured instead: **the global search result
  for Cook at Home renders "Home · Home cooking"**, via `search.js` copying
  `area` and `app.js` joining `[p.area, cuisine]`. Nulling it makes that row
  read "Home cooking". Everything else that touches `area` is inert for this
  record. So it is a **visible display preference**, not a data-hygiene defect —
  a sharper question than the one asked.
- **Nine recipes have estimates weak enough that his own number would beat
  them** — headline: *Booth's Ginger Crunch* has **no method at all** (empty
  `steps`), and *Slow-Cooked Chicken Noodle Soup* never says low or high, so a
  guess would invent the setting *and* the time on six chicken thighs.
- **`serves` and yield are conflated in the shipped data.** Liège Waffles'
  `serves: 12` is 12 *waffles*; the puddings' `serves: 6` is 6 *people*. The
  record keeps them separate rather than silently picking one.
- **Five stated `time` values are bake-only** and exclude 6–15 min of prep, yet
  the app renders `time` as if it were the total.
- **The checklist's twelve-hour expiry is the agent's number, not his**, and
  ticks are in a backup but not restored from one.
- **Whether any of the 18 fetchable empty-menu venues get fetched** — under his
  own standing rule, naming a URL in the roadmap is not an instruction to fetch.

[ADR 0064]: ../decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md
[ADR 0065]: ../decisions/0065-a-kind-declares-what-it-can-do.md
[ADR 0066]: ../decisions/0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md
[ADR 0067]: ../decisions/0067-a-tick-is-keyed-on-the-line-not-its-place.md

---

