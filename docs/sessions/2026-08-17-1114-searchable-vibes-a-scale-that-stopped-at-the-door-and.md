## 2026-08-17-1114 — searchable vibes, a scale that stopped at the door, and the pin comes home

Owner-driven throughout: five things he asked for or reported, in the order they
arrived. Three shipped, two are designed and queued on his word.

**1. `vibe` was on the cards and in the data, and unsearchable** (`846c3f5`).
He typed "quick eats" and "dog friendly" at the home search and got nothing. The
style facet at least had a filter; **amenity and character — 21 of the corpus's
38 taggings — had no way in at all**, so a beer garden could not be asked for by
any means the app offered. Now indexed by LABEL and by KEY, resolved through
`vibesFor` so data that slipped past `validate.py` cannot invent a search term.
A vibe hit reports `matchField: "vibe"` and the WHOLE label, and the result row
grows a third sub-line part to show it — for this field the reason and the
answer are the same fact, so a "Matched: vibe" note would have been strictly
worse than showing the words. Ten synonyms onto exact vocabulary labels
("silver service" is 37k's own phrase; "grab and go" and "quick lunch" are
former keys' words). 🔎 **"fast food" was deliberately NOT added and the
omission is asserted** — it names a segment of the industry, not one of the five
styles, and choosing between `quick-eats` and `counter-order` would be a guess.
⚠️ The data is thin: 2 venues `dog-friendly`, 5 `quick-eats`. The search works;
the corpus is what limits the answers.

**2. The 2× mixture stopped at cook mode's door** (`5403552`). He picked 2× on
the recipe page, tapped Start cooking, and the step read ¾ cup under a page
reading 1½ cups. The picker was built into `recipe.js`; **cook mode had never
heard of it.** 🔑 **Two correct halves, never introduced** — `quantity.js`'s 23
unit tests, its corpus sweep and `recipe_check`'s 7 scaler assertions were all
about the *page*; `cook_check`'s 75 were all about a screen opened at 1×. No
gate existed because every test on each side passed. The scale now travels as a
**getter read at the tap** (the page rebuilds on a scale change today, so a
value would work — but a silent wrong quantity in a kitchen is not a bug to
leave one refactor away from returning); the panel, the read-aloud text and a
"2× mixture" badge all carry it. 🚩 **The KEY is never scaled:** a grouped
line's key is `"Sauce: 1 cup brown sugar"` and `readQuantity` reads the amount
at the HEAD of the string, so scaling keys would have reported "none" and left
every component-grouped line silently at 1× beside doubled ones — the
half-scaled recipe `quantity.js` exists to prevent. The text is scaled and the
component re-prefixed. `cook_check` +4 assertions, break-probed by making
`shownLine` ignore the scale.

**3. The step number floated above its own sentence** (same commit). He said
*"level / centred"*. `align-items: start` levels the two grid BOXES, but column
2 is the `.tick` and its `0.35em` top padding puts the words 5.6px lower.
🛑 **`recipe_check` had an assertion for this and passed at 0.00px the whole
time — it compared the numeral against the TICK'S BOX, which is exactly the
thing the number was wrongly aligned to.** A guard written to close a hole,
holed in the same class it was guarding. It now measures **midline to midline**
against the first line of the step's own words, because the protocol hands back
the numeral's LINE box (leading included) and a Range hands back the tight
INLINE box — comparing tops would fail a page that is right. Fixed with a
`margin-top`, not `padding-top`: padding also grows the numeral's line box and
overshoots by 3px. Break-probed both ways.

**4 & 5. Two he raised that are designed, not built** — filed as **14g**
(extras must not be configurable before the dish is ordered; a four-state
machine, and his "two of the same dish with different extras" question is
already answered by `lineKey`, which has carried `selectionKey(options)` since
ADR 0048) and **14h** (the *"we can't say whether Bacon is vegetarian"* line —
**measured at 807 option × dish firings, including Spinach and Tomatoes
stripping a `v` claim**, against 40% option-tag coverage). Both carry a
recommendation and wait on his word.

### The pin, and the debt it was carrying

Bumped `19eb0e2 → 0af3006` (`cde2fa1`). **18 commits, and this time SEVEN
`docs/method/` files had moved** — so the bump was a re-inline, which is exactly <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
what the inlined-floor item had been carrying as a dated `⏳` debt. The floor
region was diffed **directly** (`floor:begin`/`floor:end` extracted at both SHAs
and diffed) rather than by reading the method docs and judging — two edits, both
inlined verbatim: *re-brief **before** the irreversible action at the
always-confirm floor*, and the three **channel** sentences (announce your file
set; a message reserves nothing so check a shared allocator AFTER the push; the
index and a mid-rebase state are shared surfaces, so stage explicit paths and
read the staged hunk headers).

🔑 **That doctrine is this repo's own practice promoted upstream** (atelier
`46dd5a0`, bearing 2026-08-13 to 2026-08-17) — the sentences come home rather
than arrive. **And this session paid for two of them within the hour:** a peer's
`pull --rebase --autostash` in the shared primary checkout absorbed our
uncommitted work and collided on `sw.js`, where **both sessions had
independently picked `SHELL_VERSION` .116**. Resolved to .117 by max-of-each-
field and verified with `check_versions.py --range`. Reading the staged hunk
headers is the check that would have shown it.

**Owner ruled two open decisions on the inlined floor:** the **cancelled-run
sub-clause is ADDED** (enriching past the region means owning the whole clause;
without it ours was satisfiable by exactly the evidence the source rejects), and
**the two forks are KEPT with the reason written into `CLAUDE.md` itself** —
`Source & drift` is ours and is the *better* text, since the region's own
command has no fetch and reads bare `HEAD`, which is the stale-checkout silent
pass this repo already diagnosed. Recorded at the point of use so `stampscan`'s
future red has an answer waiting instead of an argument.

### The board split — verified, not redone

He asked for it; it was already done (2026-08-17, `0530`). Verified rather than
assumed: **48 sections, 86 item files, index generated, `board` floor check
green**, and **no `[~]` item carries a live claim** — every one is part-done or
explicitly released, and `git worktree list` shows only the primary checkout.
Two tidies fell out: the split item's own pre-execution *"BLOCKED ON QUIESCENCE
· do NOT pick this up"* block is now marked as history (it read as live
instruction standing guard over finished work), and 17a records the hole its
shipped half left.

🚩 **A correction of my own, found by grepping my own comments:** four of them
cited roadmap item **"37p", which does not exist** — I invented the number while
writing the cook-mode fix. Repointed to 17a. An invented cross-reference is the
cheapest possible way to send a future session to a file that was never there.

⏳ **Owed to atelier:** nothing new. The three findings queued 2026-08-17 (the
region's fetchless drift command; recoverable-bytes vs the record store; CF3's
monolithic-board branch) and the fourth (a present-but-bypassed ruleset reads
GREEN to a presence check) all stand as previously recorded.

### Addendum 3 — the close audit, and the trap I fell into while warning others about it

🛑 **I stashed a peer's uncommitted work, in the primary checkout, using the
exact command this repo's record warns about — hours after telling two separate
sessions not to leave work there.** A session nine minutes old had search-by-vibe
staged in `/Users/mike/.pets/faves`; my `git pull --rebase --autostash` took it,
the rebase replayed, and re-applying conflicted on `site/sw.js`.

🔑 **What made it recoverable was stopping instead of resolving.** The rule this
repo already carried — *uncommitted work in the shared tree resolves by asking,
not by acting* — held: I backed the stash out to a patch file before touching
anything, confirmed all six files were back in the working tree, left
`stash@{0}` in place, and told the owner rather than absorbing or dropping it.
**One thing did not come back: their index.** Content survives an autostash round
trip; staging does not. That is worth knowing before it happens to someone else,
because it is invisible — the files are all there and only the `git add` is
gone.

⚠️ **And the `sw.js` resolution was already done when I looked, by neither me nor
git as far as I can tell** — `SHELL .117 / DATA .47`, which is the correct
max-of-each-field answer. I reported it as *"verify this, I did not make it and
cannot tell you who did"* rather than as a fact. In a shared checkout with an
active session, a state you did not create is not evidence of anything.

🎯 **The transferable part is not "use a worktree" — everyone here already knows
that.** It is that **I had verified the primary checkout clean minutes earlier**
and treated that reading as current. Same shelf-life failure as the line count
corrected earlier in this record and as the ADR number taken twice: *a
measurement of a shared mutable thing expires, and the interval is minutes when
five sessions are live.* Three instances in one session, three different shared
things — a counter, a file's length, a working tree.

📋 **The close audit itself, so the claim is checkable rather than asserted.**
Eleven commits verified as ancestors of `origin/main` by
`git merge-base --is-ancestor`, not by having watched them push. No worktree or
branch of mine remains in either repo. CI and floor green on `main`. The board
stands at **48 sections / 88 item files**. The primary checkout is dirty with
another session's live work, which is theirs and correct. One debt is dated
rather than done: the next atelier pin bump owes a re-inline of the floor block,
recorded on the item whose subject is that this copy drifts silently.

### Addendum 2 — 18d ruled

Owner, 2026-08-17: **"I agree"** to the units-as-region × usage recommendation
above (zero new settings; `local` resolves to a usage table; `imperial`
relabelled "US customary (miles, °F)"; UK is an outcome, never a choice; one
ADR superseding 0029's binary). 18d is therefore **owner-ruled and open**, not
a proposal — the board-lane session holds the item; the interim GB → metric
(`f253812`) stands until it is built.

