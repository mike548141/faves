## 2026-08-16 05:05 UTC — closing: two rulings recorded, and 3.5 GB of leaked Chrome

**Owner ruling 1 — the facet links stay as they are.** Presented with the
measurement (facet and text search agree on 45 of 51 facets; on the other 6
search never misses, it *adds* — "Pub" returns 6 places of which 5 are not
pubs), the owner ruled **keep as is**, and asked that the option stay open in
case he changes his mind. Recorded as **ADR 0050**, which is deliberately a
*kept-open* record rather than a closed one: it carries the measurement table,
the four-step switch path (`filterHref` → `?q=`, `wireSearch` reads it, delete
the now-duplicate chip, retarget the two `boot_check` assertions), and — the
part that matters — **what switching costs**, so the trade is never
re-litigated from memory by a session that only remembers the ask.

**Owner ruling 2 — search's over-matching is roadmapped, not fixed.** Recorded
as **Theme 27**. The framing that survived the analysis: this is not a matching
bug, it is a **ranking** gap. A wide haystack is correct for free text; what is
missing is that a venue which *is* Malaysian and a venue merely *named*
"…Malaysian" are indistinguishable in the result list. 27b (show which field
matched) is recommended before 27a (weight facet hits higher), because letting
the reader judge relevance may make the weighting unnecessary.

🔎 **The closing sweep found 64 leaked headless-Chrome processes holding
3.48 GB**, plus 60 abandoned throwaway profile directories. The owner's Chrome
had just crashed, and this is a very plausible contributor. **None were from
this session** — `tools/lib/browser.mjs` calls `stopChrome` in a `finally`, and
every `boot-check`/`shot`/`live` profile was already gone. The survivors were
`stub`, `tip`, `fade` (56 processes, from earlier ad-hoc one-off scripts written
inline during the browse sweep) and `addon-check` (8, from the live Theme 14
session). Owner approved killing all 64; done, plus the profile dirs.

🚩 **The lesson is about ad-hoc scripts, not the harness.** The three purpose-
built live runs recorded in the 03:13 UTC entry each launched Chrome inline and
never stopped it. Anything that launches a browser must use
`tools/lib/browser.mjs`'s try/finally shape — or, better, earn its place as an
assertion inside `boot_check`/`device_check`/`cook_check` rather than existing
as a throwaway. A one-off script that leaks 3 GB is not cheaper than a check
that lives in the tree.

**Also noted, not fixed (not this session's lane):** ADRs **0048** and **0049**
are not yet in `docs/decisions/README.md`. They belong to the live add-ons
session, which is mid-flight; an unindexed record is invisible to the next
allocator and is exactly how the duplicate `0025` survived, so it is flagged
here for that session to close rather than filled in from outside.

**Session close.** Six commits landed on `main` across the session, each with
CI and floor green. Nothing owed, nothing uncommitted, no open PRs, worktrees
removed.

### 2026-08-16 — a safety defect found by asking a modelling question

The owner asked whether Sprig & Fern's three Cheeseburgers ($28 Mains, $21 Gold
Card, $15 Kids) should be one dish with a serving size and a discount. Two
corpus surveys were run before answering, and they turned up something more
urgent than the question.

**The Gold Card rows had lost their allergen warnings.** All seven carried
fewer `contains-*` tags than their full-price twins; Chicken Parma shipped with
`tags: []` on a crumbed, mozzarella-topped dish. Cause: `tag_allergens.py`
matches on name + desc, and a `"Gold Card portion."` stub has no ingredients in
it. Effect: a reader filtering for gluten free saw the $21 row survive the
filter while the $32 row dimmed. Fixed fail-safe — only `contains-*` added,
only what the twin already carried; Summer Salad's missing `df` deliberately
left off, because restoring a positive claim from a stub desc is precisely what
ADR 0025 forbids. `check_twin_allergens()` is the guard, a warning not an error
because a kids' version really is different food.

**On the question itself, the measurement contradicted the premise.** Gold Card
is not a discount: four rows say `"Gold Card portion."`, the Sirloin says 150g
against the Mains 230g, and the ratios run 66–79% rather than one percentage.
The corpus contains **zero** discount language of any kind. The real pattern is
size — 41 variant groups over 96 rows, plus **81 rows carrying a second price
inside a `desc` string** (153 price points), 72 of them drinks. Collapsing on
name would be actively wrong for 29 rows, including merging an alcohol-free
`Heineken 0.0` into a beer, and 5 variant groups have an empty allergen-tag
intersection so no merge rule preserves safety. Recorded as Theme 28.

**Incidental finding worth someone's judgement:** the new twin check flags that
Mains `Cheeseburger` carries no `contains-dairy` while the Kids one does — and
its own desc ends "Dairy free available.", which implies the default has cheese.
Left as a warning rather than guessed at; it is a claim about food.

### Owner ruling — 2026-08-16: identity must be immutable

Asked to choose between `formerNames` and `formerIds` for Theme 25, the owner
answered past the question, and the answer is the more important one:

> *"There is no much (maybe no) use beyond myself and I am ok with breaking
> changes that lose favourites, ratings etc right now but in the future I will
> not be ok with losing any of that and impacting end users. So make the change
> that is best for that long term even if its breaking now, but we MUST ENSURE
> things like ratings and favourites are never lost in future thus immutable
> ID's or somthing"*

Two grants and a requirement. **He may be broken now** — he is the only user and
has accepted the cost of losing hearts and ratings once. **Choose the long-term
shape, not the least disruptive one** — "even if its breaking now" removes the
constraint that had been shaping the design. And **identity must be immutable**,
so it cannot happen twice.

The requirement bites on the shape Theme 25 was written to. `dishId` optional
with *"Absent = `slug(name)`"* is a **derived** id: recomputed from a mutable
display name on every read, so a rename silently changes it — the exact failure
the theme exists to fix, reintroduced one level up. The distinction that
survives the ruling is **seeded once and written into the data** (immutable; a
later rename touches `name` and leaves `dishId` alone) versus **derived on every
read** (not). Seeding keeps "nothing moves on day one" intact, because the
seeded value is what every existing anchor already resolves to.

Relayed to the Theme 25 session while it was live rather than recorded and left;
the shape is its call and its ADR, but it was building on the premise the ruling
moves.

**A false alarm, checked rather than assumed.** The owner and the Theme 25
session both believed a *third* session was working on dish identity. Evidence
says no: `origin` carries `main` and `faves-dish-ids` only, ROADMAP holds exactly
one claim, `git log --all -S"dishId"` finds only that session's commit and the
original write-up, and `ListAgents` shows one other faves session. The likely
source is that this session wrote the Theme 25 *analysis* — the four-jobs
evidence, the collision measurement, the $56-vs-$49 proof — into ROADMAP twenty
minutes before that session claimed the theme. From outside, analysis handed
over is indistinguishable from work in progress. Worth a habit: a claim line
says who holds an item, but nothing says who merely *wrote about* one.

