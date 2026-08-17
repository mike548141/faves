# Theme 37 — cook mode and the recipe page, as the owner reads them (owner-raised 2026-08-16)

Five defects and asks, given live during the 2026-08-16 session while looking at
`recipe.html?id=cook-at-home&dish=chocolate-self-saucing-pudding` on a wide
screen and in cook mode. All five are **presentation**, not model: the timer,
the checklist and the recipe data are all sound underneath. ✅ **All five are
SHIPPED** — 37a, 37b and 37c/37d/37e each carry their own ✅ line below (claim
released 2026-08-17: `wt: faves-tidy` no longer exists).
⚠️ **Later items in this theme are a different matter and are NOT covered by
that release** — 37k is **shipped 2026-08-16** (claim released; build complete,
only the owner's tagging owed), and 37n is open.
The released claim only ever covered the owner's original five.

> ✅ **Shipped 2026-08-16** — 37a — the Clear ticks button goes. Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16** — 37b — the timer's whole presentation is wrong. Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16 — 37c, 37d and 37e**, with 37l and 37m below: the
> recipe-page pass, done together because all five move the same rows. The
> ingredient list folds and remembers, splits into two columns where two fit,
> and a recipe carries its source as a field. [ADR 0070] holds the schema.
> Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **Shipped 2026-08-16** — 37f — "Along a route" is removed whole. Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-17** — 37g — the SORT BY section goes, and distance joins
> the one ranking. Built to [ADR 0068], its item 4 superseded by [ADR 0069] (the
> location ask is primed, not sprung). Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **Shipped 2026-08-16** — 37h — remove "Transfer to another device". Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16** — 37i — Sync lives inside "Your data". Detail →
> [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-17** — 37j — "Everywhere" → "Any service", and the te reo
> re-glossed with it. Landed inside 37g. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

> ✅ **37k's BLOCKING 🚩 IS CLEARED 2026-08-16 — and nothing else is.** Recorded
> as **ADR 0077**. The owner's ruling was *check Theme 30's `service` axis
> first, enter no data until it's settled*. **Settled: style is NOT that axis.**
> They sit at different levels — Theme 30's `service` is metadata about a
> *vocabulary term* ("`Cafe` is a format word"), style is data about a *venue* —
> and it **cannot reach 33 of 55 venues**, which carry no service-axis cuisine
> value at all. On his own poles, "silver service" is *formality* and "quick
> eats" is *speed*; the axis captures **format**, which equals neither:
> `Gastropub`, the corpus's most-used cuisine value at 10 venues, implies
> neither. ⇒ **Theme 30 proceeds unblocked; 37k does not wait on it.**
> 🛑 **A NAMING DEFECT IN SHIPPED CODE, found by three sessions converging from
> three directions in one day, and it does not depend on 37k proceeding.**
> `filters.js` already ships `service: 'all'|'takeaway'|'dine-in'` (55/55
> venues, a `<select>` on the home screen). Theme 30's `channel`
> (`dine_in`/`takeaway`/`delivery`) is a **price-and-tax** axis — a third
> meaning of the same words. Whatever Theme 30's axis is called, it cannot be
> `service`. 🎯 Worth the owner's eye whether or not style is ever built.
> 🎯 **TWO OWNER QUESTIONS, both open, and 37k must not move until they close:**
> **(a) His own relayed ruling contradicts the item.** `SESSIONS.md` (`041a6ff`)
> carries a one-line relay — *"dining style folds into `vibe`"* — no primary
> quote, no record of what he was asked. 37k is titled a *filter* and says
> `vibe`'s free text "is neither [filterable nor comparable]". **Folding style
> into a free-text field yields no filter.** A session picking one quietly would
> be resolving his ruling for him.
> **(b) The measurement that predicts this feature never gets populated.**
> Every other filter derives from checkable evidence — `services` from what the
> venue states, `openNow` from hours, cheapness from menu medians. "Fine
> dining" is a judgement no menu photo verifies. The app's ONE curated
> venue-level judgement field is `priceBand`: **present on 10 of 55, non-null
> on 8**. A filter over 8 of 55 hides places for no stated reason.
> 🔎 **The corpus already makes the case for a vocabulary, without anyone
> arguing it.** Of 38 `vibe` taggings: 9 values are style (14 taggings), 11 are
> orthogonal amenities a style vocabulary must never swallow (21 taggings —
> `dog friendly`, `byo`, `quiz night`), 3 duplicate a `cuisine`. **Five strings
> already say one thing** — `quick` · `quick-eats` · `quick-lunch` ·
> `grab-and-go` · `counter-order`, across six venues — and no filter can
> aggregate them. `vibe` has no vocabulary check in `validate.py`; `priceBand`
> does.
> 🚩 **A prerequisite nobody had noticed: `vibe` is precached to every phone and
> NO SCREEN RENDERS IT.** `grep -rn "vibe" site/js site/*.html site/css` → zero
> hits, while ARCHITECTURE.md describes it as "free-form chips shown on cards".
> The design shipped; the render never did. So 37k proposes a filter on a field
> that fails ADR 0047's "name the screen that renders it" gate **today**.
> Inherited, not introduced (`vibe` predates ADR 0047), and it is 1,050 bytes of
> 1,087,040 — a principle problem, not a performance one.
> ⚠️ **And a fourth filter re-opens a constraint 15z paid to close:** the old
> segmented service control cost "256 px of a 928 px row — the single largest
> reason the inline row could not be one row". `filter_row_check.mjs` is the
> guard that would fail.

> 🎯 **FOUR OWNER RULINGS, 2026-08-16 23:08 UTC — 37k IS BUILT, and it is bigger
> than the item as written.** He was shown the case for parking it (the
> `priceBand` 8-of-55 measurement, the filter-row width cost, the
> unfalsifiability of a judgement field) and ruled the other way, in full
> knowledge of it. ⚑ **discharged.**
> 1. **BUILD IT FULLY. He supplies the values.** Not a vocabulary-only stub, not
>    "tag nothing yet" — the vocabulary, the filter control and the tagging pass.
>    🔑 This retires the 8-of-55 objection by removing its premise: the field is
>    not waiting on curation-in-general, it is waiting on **him**, which is the
>    same footing as menu content (*"whatever food/dishes I give you are to be
>    included"*).
> 2. **It lives INSIDE `vibe` — and VALIDATE ALL OF `vibe`, not just a style
>    subset.** This is a bigger ruling than the question asked and it is the
>    better answer. `vibe` has had **no vocabulary check at all** while
>    `priceBand` has had one; the corpus proved the cost by growing five strings
>    for one idea (`quick` · `quick-eats` · `quick-lunch` · `grab-and-go` ·
>    `counter-order`). Closing only the style subset would have left the other 21
>    taggings free to drift the same way. ⇒ **`vibe` becomes a closed vocabulary
>    with FACETS** — each value declares its facet (`style` | `amenity` | …); the
>    filter reads the `style` facet, the chips render all of them.
>    🚩 **The workflow consequence, stated so nobody is surprised:** a new vibe
>    value must be added to the vocabulary before it can be used, and
>    `validate.py` will refuse it otherwise. That is the point, and it is also
>    friction — the same friction `priceBand` already has.
> 3. **RENDER THE `vibe` CHIPS ON CARDS, as `ARCHITECTURE.md:138` always said.**
>    This closes an inherited ADR 0047 breach: `vibe` has been precached to every
>    phone since the original schema with **zero** references in `site/`. The
>    design shipped and the render never did — a **built-vs-never-runs** case,
>    not an abandoned field, which is why deleting it would have been the wrong
>    cheap answer. 38 taggings across 20 venues start earning their download.
> 4. **The amenity values are KEPT.** `dog friendly`, `byo`, `garden bar`,
>    `live sport`, `quiz night`, `Wellington icon` — 21 taggings no other field
>    holds. They are not swallowed into the style vocabulary; they get their own
>    facet.
> ⚠️ **Known consequence he accepted by choosing to render:** the five
> inconsistent "quick" strings become **visible on a card on day one**, so
> normalising the corpus is part of this work and not a follow-up.
> ⚠️ **ADR 0077 is NOT superseded** — its finding (style is not Theme 30's
> `service` axis, and `service` already means three things) stands unchanged.
> What these rulings close are the two questions 0077 explicitly left open.

> 🕳️ **Orphan stash, VERIFIED REDUNDANT 2026-08-17 — nobody needs to look at it
> again.** `stash@{0}` "WIP on faves-content-growth" (2026-08-16 23:31) survived
> an interrupted session whose worktree no longer exists, and was flagged to two
> sessions during the day without either taking it. Checked rather than left
> ambiguous: it holds `priceBand`/`pricePerPerson` for `burgerfuel` and
> `hell-pizza`, and **`main` already carries identical values** (`$$`/16 and
> `$$`/24) plus a superseded `sw.js` bump. **No work is lost in it.** Left in
> place rather than dropped — deleting another session's stash is not this
> session's call — but recorded so the next reader spends nothing on it.

> ✅ **37k BUILT AND SHIPPED 2026-08-16** (wt: faves-cook2, `9aa6071`…`62546b4`).
> Recorded as **ADR 0084**. `site/js/vibes.js` is new — 17 keys in three facets.
> **The build is done; only the TAGGING is owed, and it is his.**
> 🔑 **The vocabulary is stated ONCE and `tools/validate.py` READS that file**
> rather than holding a Python copy — two copies would drift silently. The parse
> **dies loudly on zero keys**: a regex that quietly matched nothing would make
> the gate pass every value, which is ADR 0072 exactly.
> 🔎 **Measured, not guessed — the chip cap is TWO.** Swept in a real browser
> over all 55 cards at 390 px: one chip wraps 5 cards (+3% list height), **two
> wraps 29 and never makes a third line**, three wraps **all 55** for **+26%**.
> Three is the cliff.
> ✅ **The fourth select FITS** — `filter_row_check` 25/25, narrowest select
> **134 px against a 104 px floor**. It fits *because* the row has since lost the
> Sort-by group (ADR 0068) **and** 256 px of segmented control (15z), so 15z's
> warning was true when written and is no longer binding. Worth knowing before
> anyone else declines a control on it.
> 🔎 **One design reading changed by evidence.** The filter matches **any** style
> value a venue carries, not the first in vocabulary order: `regal-chinese` is
> both `sit-down` and `banquet`, and picking one made "Banquet" render on the
> card while being **absent from the dropdown** — a dead end you could see but
> not select.
> 🚩 **TWO GUARDS WERE BROKEN BY THIS MIGRATION AND FIXED WITH IT** — both found
> by going to look, neither by any gate: `test_validate.py`'s sandbox did not
> copy `vibes.js`, so its baseline failed outright; and `drinks_gap.py`'s
> `DEFINITE_VIBE = {"craft beer", …}` **silently matched nothing** after the
> rename and lost 7 worklist hits without failing or warning. The second is the
> DEGRADED face recorded at the head of this file.
> ⚠️ `test_validate.py` is now **110 mutations** — CLAUDE.md said 93, then 99,
> then 104 within one hour as three sessions added to it. Read the tool's output,
> never the doc.
> 🎯 **STILL OWED AND HIS ALONE: the tagging.** 20 of 55 venues carry any `vibe`;
> **35 carry none**. Under CLAUDE.md's standing rule those are filled only as he
> supplies them — **never inferred** from a menu, a photo or a website's tone.
> ADR 0077's argument that a style value is unfalsifiable from what we hold is
> **not refuted** by this build; it is answered by making him the source.
> 📌 Also queued: the two te reo drafts (`filter.style` → *"Tāera kai"*) are in
> `reo-review-queue.md` and want a speaker — *tāera* may read as style-of-FOOD,
> which would name the cuisine filter sitting beside it.

> ✅ **Shipped 2026-08-16 — 37l and 37m**, with 37c/37d/37e above.
> 🔑 **37l's stated trap did not happen, and the reason generalises.** Splitting
> `"Sauce: 150g brown sugar"` into a field was expected to detach every tick on
> the four affected recipes. It did not — because the question is *correctness*,
> not compatibility: **Sticky Date Pudding lists "60g butter" in the pudding and
> again in the sauce**, so the text alone is not an identity and the component
> belongs in the key. Keying on `"<component>: <text>"` is then byte-identical to
> what the corpus already held — 0 mismatches across all 24 recipes. **Ask what
> the identity IS and the migration question often stops existing.**
> 🔎 **37d was a *consider* and the answer was yes, with three guards** —
> `column-width` not `column-count`, `:has(li:nth-child(6))` so a short list is
> never split, and `break-inside: avoid`. Proven at 390/1100 px and 16/24/32 px
> text by the new `tools/recipe_check.mjs` (22 assertions, each verified by
> reintroducing its own bug). Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

### 37n's owner rulings — taken 2026-08-16, all four, before the sweep runs

✅ **`contains-fish`, `vg-option` and `df-option` are ALL ADOPTED.** The two
option tags were ruled in a parallel session, alongside the fish tag and for the
same sweep, so taking them together is nearly free. 🚩 **`vgo` is NOT
`v-option`** — vegan-optional and vegetarian-optional are different claims, and
mapping one to the other misrepresents the venue. Data already found and
currently discarded at intake: **Gong Cha** (free soy/oat swap on 15 drinks),
**Rock Yard** ("Vegan Optional" on Vermicelli Noodles and Roti Rolls, "DF
optional" on Sizzling Shaking Beef), **The Victoria Tavern** (its own `vgo` and
`dfo` markers on 8+ dishes).

✅ **`contains-fish` is ADOPTED.** The vocabulary gains it. Three agents in a peer
session hit the gap independently: fish sauce runs through a dozen Rock Yard
dishes, that venue prints its own badge as literally "Fish", and anchovy is on
two Pizza Pomodoro pizzas — all untagged, because inventing a vocabulary entry
was not an agent's call. The set is closed in **three** places that must move
together (`docs/ARCHITECTURE.md`'s tag vocabulary, `tools/validate.py`'s `TAGS`,
`site/js/settings.js`'s `ALLERGEN_PREFS`), plus a settings-screen row, plus the
corpus sweep. 🛑 **Land it WITH the 37n sweep, not beside it** — the sweep is the
pass that would apply it, and doing them separately means walking 55 venues
twice.

✅ **The trace tier: keep the app's tags as they are, and extend the DATA MODEL to
carry both.** Owner ruling, consistent with one he had already given in a
parallel session. Pizza Hut's first-party allergen document grades `P` (present)
against `T` (*"stored or used to manufacture other items at the site"*), and `T`
is near-universal across its pizza line for nuts, peanuts, sesame and shellfish —
so collapsing the two tiers would fire four warnings on every pizza, which is a
warning carrying no information. **What ships is unchanged: only `P` becomes a
`contains-*` tag.** What changes is that the record can now hold the distinction
instead of discarding it. ✅ **AND HE RULED WHERE IT LIVES —
`site/data/`, not the record store.** A peer session recommended the repo-only
`data/` on ADR 0047's payload rule, and **he overruled the premise**: *"In ruling
47 I said it only holds data the screen shows, **or may with future features**.
This is an example of a likely future feature for Faves."* So the trace tier
ships in the payload.
🔎 **He is right about his own ADR, and the strict reading was still
reasonable — which is the interesting part.** ADR 0047's *Context* carries the
clause verbatim: *"data the app will never render — now or in a future feature —
must not be in the app's dataset"*. But its **Consequences** state the operative
rule narrowly (*"the payload can only grow by adding something a screen shows"*)
and `CLAUDE.md` restates it narrower still (*"Before adding a field to a venue
file, name the screen that renders it"*). **Two of the three places a builder
actually looks state the rule without the future clause**, which is why two
sessions independently read it strictly today.
🎯 **So this wants a superseding note on 0047 and an amendment to CLAUDE.md's
restatement.** The accepted text and the owner's intent agree; the two summaries
of it do not. Left for the owner rather than fixed here — 0047 is accepted, and
an accepted record is superseded, never edited.

✅ **`crumbed → contains-egg` SPLITS into two classes.** 30 of 42 disagreed, the
largest block in the report, and the disagreement is real rather than sloppy: a
house kitchen egg-washes its schnitzel, a commercial frozen nugget or crumbed
fish fillet often does not. Two honest classes beat one that is wrong 71% of the
time. `crumbed → contains-gluten` is untouched and holds at 39 of 45.

⏳ **Still owed, and cheap** — the three the report itself raised: the tier a
note-derived tag carries (kept as the firing rule's own, so "sesame bun" lands
STATED); whether *"dairy free cheese available"* should tag or only report
(currently reports); and whether add-on options belong in the report at all
(currently yes, and it found one real gap).
