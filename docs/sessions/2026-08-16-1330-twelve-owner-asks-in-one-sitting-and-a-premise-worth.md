## 2026-08-16 13:30 UTC — twelve owner asks in one sitting, and a premise worth checking

An orchestration session that started on the queue and was overtaken, happily,
by the owner watching the live site and reporting as he went. Twelve asks
arrived mid-turn. Five shipped, one was designed and deliberately left unbuilt,
and six are recorded with their causes already found.

### Shipped

- **The Clear ticks button, removed from both surfaces** (Theme 37a). The
  consequence is recorded rather than argued: ticks expire twelve hours after
  the *last* tick, so a recipe cooked twice inside that window now starts
  part-ticked with no one-tap reset. The store's own comment named the button as
  the answer to exactly that. His call, made knowingly.
- **The timer's face, rebuilt** (37b). Three complaints, one cause: the numeral
  and its state word shared a button, so centring the flex *pair* left the
  numeral off-centre by half the word's width. No amount of CSS fixes that while
  the word is in the box. Now a three-column grid with equal fixed flankers,
  CSS-drawn play/pause, a de-weighted reset and a hairline progress bar.
- **"Along a route", removed whole** (37f), superseding ADR 0014.
- **Four Sprig + Fern menus, 65 dishes** where there were none.
- **ADR 0068**, the ranking design.

### 🔑 The premise that was worth checking

He said the home list is *"already sorted by closest first with weighting for
being open, close, a favourite"* and asked for the sort control to go. Three
readings were needed to answer honestly, and the honest answer was neither
"you're right" nor "you're wrong":

- The blend he remembered **is built** — `rankVenues`'s default branch is
  availability → distance → favourite, and has been since 2026-07-08.
- It has **never once run**. `origin` is written in exactly one place, the sort
  control's own change handler, so in the default order every venue's distance
  is `Infinity`. Distance has never participated in the default home order in
  the project's entire history.
- So deleting the control as asked would have deleted the only mode where
  distance does anything — leaving an app that knows every venue's coordinates
  and never uses them.

**Two traps sat behind the obvious fix**, either of which would have shipped a
defect that read as "the ranking is broken":

1. The favourite credit is **10 km**, not the *"few hundred metres"* he
   remembers asking for. The commit that introduced it says so outright: *"a
   favourite 8 km away beats a plain place 2 km away."* Wiring `origin` through
   without touching it puts a hearted venue across town above the shop next
   door.
2. **`favBoostKm` cannot be re-tuned to fix that**, because it was quietly
   repurposed on 2026-07-23 as the branch-proximity cutoff and is what Settings
   now labels "Show branches within". One constant, two jobs, one name — and
   `settings.js` already carried a `#!##` marker saying so. Re-tuning it would
   have broken every chain's menu page instead.

🔑 **The generalisable lesson: "it isn't built" and "it never runs" are
different findings, and only one of them is fair.** The first was the easy
answer and it was wrong. Checking cost three reads of the same file and turned
an argument into a design.

And a second: **there was no ADR for ranking at all** — 68 records, none about
the home list's order. The whole specification lived in commit messages and
archived session prose, all of it in a scribe's voice. That is how a 10 km dial
nobody meant survived unchallenged for six weeks. ADR 0068 closes it.

### 🚩 Concurrency: the primary checkout was on someone else's branch

Twice, a file written into `/Users/mike/.pets/faves` vanished before it could be
committed — first a draft ADR, then its rewrite. The cause was not a tool
failure: **`git branch --show-current` in the primary checkout returned
`sync-live`.** A peer session had switched the shared checkout off `main`, so
untracked files written there were being cleared under a branch this session
never chose.

Worse, an earlier `git pull --rebase --autostash` in that shared checkout had
**stashed a peer's uncommitted work** and not restored it. That was recovered:
the stash held an older draft of a README index entry that had since landed on
`main` with corrected filenames, so nothing was lost — but it was only provable
by diffing the stash against `HEAD` rather than by assuming.

🔑 **The rule this sharpens: a clean tree is not the check — the BRANCH is.**
`git status` was clean and said nothing useful. `git branch --show-current` was
the one command that explained both symptoms, and it was not run until the
second file disappeared. Add it to the session-start sync, not just
`pull --rebase`.

Everything after that point was done in a worktree and pushed with
`git push origin <branch>:main`, which never checks out `main` anywhere.

### 🚩 The allergen sweep declines silently

`tools/tag_allergens.py` **writes nothing at all** on any record carrying
`addOnGroups` — it patches `tags` positionally and bails when the count
mismatches, exiting clean having done nothing. All four Sprig + Fern records hit
it. It also cannot see a **section note**, so Thorndon's *"on a Sesame Bun"*
printed once above the burgers left all three burgers untagged for sesame, and
Berhampore's *"our pizza bases contain dairy"* likewise — **30+ tags missed**
that way.

That is the decorative-guard pattern again, in the one tool whose silence is a
safety question: it can *report* the gap and cannot *apply* the fix. Roughly a
third of the tags on those four venues are inference rather than reading; every
one is written down on the roadmap, including the two `contains-egg` declines.

🔑 **And never trust PDF text extraction's ORDER.** `pypdf` emits Berhampore's
menu description-before-name, which would have handed a fried item the polenta
sticks' *"Vegan, DF, GF"* — a false **safety** claim. Render to PNG and read it
visually.

### 🔎 A challenge that was wrong, and worth making anyway

Thorndon's "Margherita" carried `contains-nuts` with no toppings in its name,
while every other pizza listed toppings inline. That looked exactly like a
dropped line whose tag outlived it. It wasn't: Thorndon's Margherita is *"Basil
Pesto / Mozzarella"* — a pesto pizza, no tomato — and the tag came from an
enumerated rule firing on text that is really there. The data was right.

What the challenge did surface is a **reporting** defect: the agent's
judgement-call table listed only tags *it* added, so the tool's own inferences
sat in the data with nothing in the summary to explain them. A correct tag with
no visible provenance is indistinguishable from an orphaned one. Three tiers now
— reading, tool inference, human judgement — not two.

### Left deliberately

**ADR 0068's build.** It introduces the **first unprompted permission prompt in
Faves' history**, and a new trust surface begun at the tail of a long session is
how a half-built one ships — the same call 36d got on 2026-08-16, for the same
reason. The design is ratified and the next session has four decisions, a named
constant to add, and a pure test file to pin it with before any of it reaches a
browser.

### Owner rulings taken at the close

Three questions were put to him rather than resolved quietly, and all three
changed something:

- **Little Sprig Seatoun's menu date → the conservative read** (2025-10-01, not
  the 2026-06-29 export). The stale-menu caveat now fires on that venue. 🔑 His
  reasoning generalises: **a caveat that fires wrongly costs less than one that
  stays silent on a ten-month-old price.**
- **The two declined `contains-egg` tags → added.** They were declined on the
  grounds that the split is genuine (set cheesecakes carry no egg; egg is in
  most croquette breading but not all). That was the agent's judgement quietly
  overriding [ADR 0025], whose rule is that the burden falls on *not* tagging.
  🔑 **He overturned it, and the lesson is about where the override happened:**
  the reasoning was sound and it still wasn't the agent's call to make. An
  accepted ADR is not a default to be weighed against a good argument — it is
  the answer until it is superseded in writing.
- **And he redirected the question**: *"add egg, and fix the real problem."* The
  real problem is 37n — the corpus disagrees with itself, and the disagreement
  tracks which session read which menu rather than anything about the food.
  Seatoun's sausages are tagged for gluten and Tawa's identical ones are not.
  🔑 **Inconsistency does not fail safe; it fails quiet.** A reader who finds one
  sausage flagged and an identical one not learns that an absent tag means
  nothing — and every correct tag in the corpus stops working with it.

**Next session, by his pick:** the ranking rebuild (ADR 0068) and the remaining
14 venue menus. The recipe-page pass and the timer alarm stay queued.


