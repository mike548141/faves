# Theme 36 — cooking is not ordering (owner-raised 2026-08-16)

Owner, after a session on the live site: *"review the UX of the whole cook at
home and recipes because I think it can be better. Think holistically about the
UX across the app and recognise that cooking recipes is not identical to
ordering food from a restaurant."*

Four of his specifics shipped the same session (the cook button, the per-step
ingredients, the per-step timer, the recipe page's top bar — see CHANGELOG).
What is left is the structural half he was pointing at, plus the two asks that
turned out to be blocked on data rather than on design.

### 🔎 The finding, corrected against [ADR 0003] — this is DRIFT, not a design gap

⚠️ **First pass at this theme missed that the question was already decided.**
[ADR 0003] (accepted 2026-07-06) chose `kind: "recipes"` reusing the venue
shape, and its **Rejected** list already covers two of the three options below.
Anyone reading this theme must read that ADR first; the recommendation survives,
the framing needed fixing.

What ADR 0003 actually decided: venue-only fields **relax** for recipes —
`area`/`city`/`address` *may be null*, `services` empty, no contact or order
card. It explicitly rejected *"forcing recipes into a fake venue"* on the
grounds that it produces *"misleading contact/service semantics… and pollutes
the area/cuisine filter facets"*.

Measured against that, `site/data/restaurants/cook-at-home.json` is **partly
compliant and partly the very thing the ADR rejected**:

| Field | Value | Against ADR 0003 |
|---|---|---|
| `address`, `phone`, `website`, `hours`, `city`, `verified` | `null` | ✅ the relaxation the ADR granted |
| `services`, `ordering`, `vibe` | `[]` | ✅ as specified |
| `currency` | `"NZD"` | ✅ **owner ruling, 2026-08-16** — see below |
| `area` | `"Home"` | 🤔 an invented suburb rather than the `null` the ADR allowed — open question |

🎯 **Owner ruling on `currency`, 2026-08-16.** This analysis called it a fake
fact on a collection with no prices. He disagreed, and he is right: *"a recipe
may in the future include the total cost to make that dish."* The field is
**anticipatory, not spurious** — a recipe that one day carries a cost needs a
currency to carry it in, and NZD is the correct one. Corrected here rather than
quietly dropped, because the reasoning is the useful part: a field that looks
empty may be holding a place. See 36f, which is the feature behind it.

That leaves `area: "Home"` as the only open one, and it is a question rather
than a finding: ADR 0003 allowed `area` to be **null** for recipes, and the
facet pollution it feared is dodged in code rather than in data —
`filters.js` opens with `if (r.kind === "recipes") continue`. So `"Home"` is
inert today, on a guarantee held by a single line. Worth deciding deliberately:
either null it per the ADR, or keep it and say what reads it.

The code then subtracts what the data asserted: **`kind === "recipes"` is
special-cased in about twenty places** across `app.js`, `menu.js` and
`filters.js` — no hours badge, no distance, no contact card, no report button,
no price, a different search placeholder, a different card class, pinned to the
top of every ranking. A recipe row is `renderDish()` with an `isRecipes` flag
threaded through it.

None of that is *wrong* — it shipped a working screen cheaply, and reuse is why
recipes got favourites, ratings, allergen flagging, offline and search for free.
But it is why the owner can feel the seam. Every screen starts from "restaurant"
and reasons its way to "not that", and the leftovers show: the giant orange
order-style button, the back link that belonged to a menu page, the ⋯ menu that
was never added because a recipe was not thought of as a destination.

### The design question, stated once

**Is a recipe collection a `kind` of venue, or its own thing?** Three answers,
and the cheap one may well be right:

1. **Keep the shared shell, name the seam** `[M]`. Replace the twenty scattered
   `isRecipes` branches with one declared capability set per `kind` (has hours,
   has a location, has prices, can be ordered, can be reported). Same screens,
   same reuse, but a screen asks "does this have hours?" instead of "is this a
   recipe?". Cheapest, and it makes the next `kind` free.
2. ~~**A parallel screen for collections**~~ 🛑 **already rejected by
   [ADR 0003]** as *"a separate content type with its own route/renderer"* —
   it duplicates the menu screen, the filters and the card logic for a
   collection that is 95% the same shape, and forks the search/favourites/
   offline paths that currently come free. Do not re-propose without
   superseding that ADR.
3. **Leave it and keep patching** `[S]` — what today did. Fine once; the third
   time is a pattern.

### 🔎 Reported as a bug, checked, and it is not one — but a real question sits inside it `[S][design]`

A peer session measured in headless Chrome that **sorting by distance puts Cook
at Home first despite it having no coordinates**, and reported it as a live
`kind` bug on the render path. The measurement is right; the diagnosis is not.
Checked against the source and the record before acting on it:

- `ranking.js:153` — `pinned: r.kind === "recipes" ? 0 : 1`, commented *"Cook at
  Home always anchors the top"*, and `pinned` is the **first** sort key, ahead
  of `stub`, `far`, availability and distance alike.
- `ROADMAP-DONE.md` — *"Home ranking pass, done 2026-07-12 — added two sort
  keys ahead of the existing ones: `pinned` (the Cook-at-Home recipes collection
  always anchors the top)"*. **Deliberate, shipped, and documented.**
- `ranking.js:79` `availabilityTier` returns 0 for recipes with the reason
  stated: *"always an option"*. Also deliberate.

🎯 **The real question, which the 2026-07-12 pass may simply not have faced:**
the pin was added ahead of *every* key, including distance — but "Near me /
nearest first" is a question the reader asked **explicitly**, and answering it
with a coordinate-less collection at the top answers a different one. Cooking
genuinely is always available, so the pin is right in the default view; whether
it should survive an explicit *distance* sort is a design call nobody has taken.
The capability refactor makes it expressible ("has a location" → false) rather
than deciding it. ⚑ Owner's call; nothing is being changed on a peer's report.

🔑 **Worth keeping as method:** a peer's measurement and a peer's *diagnosis*
are different goods. The measurement was reproducible and valuable; the
diagnosis reversed a deliberate decision, and two greps (the source comment, the
done-record) separated them. Verify a report before you build on it — the same
lesson [ADR 0017]'s merge rule taught this repo from the other direction.

✅ **`area: "Home"` — SETTLED, owner ruling 2026-08-16: it stays.** The item
asked to null it per ADR 0003 *or* keep it and **name the screen that reads it**.
The screen was found by measuring rather than reasoning: the **global search
result** for Cook at Home renders `Home · Home cooking` — `search.js` copies
`r.area` onto each place entry and `app.js` joins `[p.area, cuisine]` into the
result row's subtitle. Nulling it would have made that row read "Home cooking".
Everything else that touches `area` is inert for this record (`cardArea()` is
overwritten by "Cook at home"; the facet is never selectable; `areaCentroids`
and `picker.js` skip recipes).
🔑 **Worth keeping: ADR 0003 permitted `null` on the assumption that nothing
rendered the field, and that assumption had quietly stopped being true.** A
permission granted by an old ADR is not evidence about today's code — check what
actually reads a field before acting on a record's licence to drop it. Same
family as *"an ADR is a design, not evidence"*. (`currency` likewise stays —
owner ruling above.)

🎯 **Recommend 1** — ✅ **DELIVERED** (claim released 2026-08-17: `wt:
faves-kind-capabilities` no longer exists and the refactor is on `main`).
Verified at code level, not by the file existing: `site/js/kinds.js` exports the
capability API (`kindOf`, `labelsOf`, `kindIds`, `isRecipeKind`) and is imported
by **all seven** surviving modules named below — `app.js`, `menu.js`,
`filters.js`, `ranking.js`, `search.js`, `price.js`, `picker.js`. `route.js` is
absent because 37f removed "Along a route" whole, so the eighth was deleted
rather than skipped. `site/data/restaurants/cook-at-home.json` carries
`kind: "recipes"`, and `tests/kinds.test.js` covers it.
🔑 **The measure that actually proves it: `isRecipes` is gone.** The item existed
because ~20 scattered `isRecipes` branches were the ADR's relaxation expressed as
conditionals. There is now **not one** in executable code — the single remaining
occurrence anywhere under `site/js/` is a comment in `menu.js` explaining that
the boolean was a second copy of a fact the record already stated.
And note it does not contradict [ADR 0003] — it *implements*
it. The ADR said venue-only fields relax for recipes; twenty `isRecipes`
branches are that relaxation expressed as scattered conditionals instead of as a
declared property of the `kind`. Option 1 turns the ADR's prose into something
the code can read. Do it before any further recipe UX, or the next fix lands on
the same sand.

[ADR 0003]: decisions/0003-recipes-as-kind-not-separate-type.md

### 36a — what the data says about time, and what it doesn't `[S][data]` 🎯

> 🎯 **Owner ruling 2026-08-16, relayed from a peer session:** *estimate the
> per-step and total times, and label them as estimates.* Same ruling for 36c.
> This **reverses** the position the rest of this item argues for, and it is his
> call to make. ✅ **The derivation is DONE 2026-08-16** — `data/estimates/`
> (the repo-only research store), all 24 recipes and 118 steps, every number
> carrying its **working**, guarded by `tools/recipe_estimates.py --check`
> and recorded as [ADR 0064]. It landed in the record first, not the payload,
> so the numbers are auditable before any of them reach a phone.
> 🎯 **A safety line was raised here and the owner OVERRULED it the same day —
> [ADR 0066] supersedes [ADR 0064]'s decision 2.** This build first held that an
> *estimated* duration must never drive a **timer**, on the grounds that an
> invented "simmer 20 min" on chicken is a food-safety failure rather than a
> disappointing dinner. That argument, and a middle option splitting on `phase`
> rather than on source, were both put to him. His ruling, verbatim:
> *"Estimates drive timers too, clearly marked — every step gets a countdown;
> estimated ones are labelled as estimates on the timer face."*
> So **`timerSafe` is retired, not inverted** — under the ruling every duration
> is timer-eligible, making the flag `true` everywhere and therefore
> information-free. `source` (`stated`/`estimated`) is what the timer face
> reads. **The gate was replaced, not dropped:** a step carrying `minutes` with
> **no `source`** now exits 1, because that is a countdown with no way to know
> whether to mark it. Proved by deleting a `source`: `🛑 SAFETY: … has minutes 5
> but source None … its countdown would run with no way to mark it an estimate`.
> ⚑ **"Clearly marked" means on the timer face itself** — `12:00 (estimate)` as
> real text, not a colour and not the step text alone. A countdown that looks
> identical whether the number was read or guessed is not marked.
> 🔑 **Worth keeping as method, not as grievance:** raising the concern *before*
> building to it was right, and so was complying the moment it was ruled. What
> made the reversal cheap was landing in `data/` rather than `site/` — no phone
> ever held the retired rule.
>
> 🔎 **The corpus is better than this item said: 32 steps state their time,
> not 28.** The extra four state it in *words* — "cook the garlic for a
> minute" (×3) and "marinate for at least an hour". 28 is the **digits-only**
> count, which is exactly what `cook.js`'s regex can see. Calling those four
> "estimates" would have mislabelled the data to match a tool's limitation.
>
> ✅ **Both ANSWERED by the owner, 2026-08-16 — and the weak-estimate question
> with them:**
> - **`serves` vs yield → SHOW BOTH, LABELLED** (e.g. *"Makes 12 waffles ·
>   serves 4"*). The record already keeps them apart, so this is a render job,
>   not a data one. `[S][ux]` and now unblocked.
> - **The nine weak estimates → SHIP AS THEY ARE.** He declined to supply his
>   own numbers, and the reasoning holds: every one is labelled an estimate and
>   carries its **working** in prose, so nothing is presented as fact. Do NOT
>   re-open this by asking him per recipe. The weak ones stay weaker, visibly.
> - **The five bake-only `time` values remain open** — see the question below.
>
> 🚩 **Two findings that need an owner call, neither resolved here:**
> - **`serves` and yield are conflated in the payload today.** Liège Waffles'
>   `serves: 12` is 12 *waffles*; the puddings' `serves: 6` is 6 *people*;
>   "makes 21" is 21 queen cakes. The record now keeps `yield` separately
>   rather than silently picking one — which the app shows is his call.
> - **Five stated `time` values are bake-only** (Orange Yoghurt Cake, Queen
>   Cakes, Chocolate Self-Saucing, B's Brownie, Chewy Cookies) and exclude
>   6–15 min of prep, yet the app renders `time` as if it were the total.

[ADR 0064]: decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md
[ADR 0066]: decisions/0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md

The owner asked for *"an estimate of time required for each step and each recipe
as a total"*. Measured across the corpus, 2026-08-16:

| | have it | missing |
|---|---|---|
| Steps stating their own duration | **28 of 118** (24%) | 90 |
| Recipes with a `time` total | **9 of 24** | 15 |
| Recipes with a `serves` count | **3 of 24** (Liège Waffles 12, Chocolate Self-Saucing Pudding 6, Tiramisu 6) | **21** |

The 28 stated step times now drive the timers, and they are read from the text,
never guessed. The other 90 steps have **no source**: how long "beat together
the sugar and butter" takes is not in the data, not on the page, and not
something this repo may invent — a wrong time on a cake is a burnt cake.

⚠️ **And the sum of stated steps is not a total.** Chocolate Self-Saucing
Pudding's steps state 35 minutes; its `time` is "~35 min" — but Perfectly Pretty
Hotcakes states 5 minutes across its steps against a `time` of "~50 min",
because prep is untimed. Publishing sum-of-steps as a recipe total would
understate most recipes by most of their length.

🎯 **For the owner — this one only you can close.** Per-step times and the 15
missing totals need to come from you (or from cooking them). Say the word and
the field goes in the schema and the screens read it; what will not happen is a
number being invented to fill a column.

### 36b — the quantity used *at this step* `[L][schema][data]` 🎯

The owner's example: *"lets say a recipe called for 2 cups of sugar in total,
but only 1 cup is used at this step… show just the 1 cup."*

Shipped today: the step shows the lines it names, at the recipe's **stated**
quantity. Correct whenever an ingredient is used all at once — which is every
case in the current corpus — and an overstatement when a recipe splits one line
across two steps.

**Not shipped, because it does not exist.** `ingredients` is a flat list of
free-text lines; `steps` is a flat list of sentences; nothing links the two and
no line records a split. Getting there means `steps` becomes objects carrying
`uses: [{ ingredient, amount }]`, an ADR for the schema, and a hand pass over
**all 23 recipes with a method** — the work is the data entry, not the code.
Note the corpus is already doing this by hand and badly: Chocolate Self-Saucing
Pudding has `"1 tbsp cocoa"` and `"Sauce: ¼ cup cocoa"` as two lines, and
Upside-Down Plum Cake prefixes every line `Topping:` or `Batter:`. The `"Sauce:"`
convention *is* a per-step grouping, invented by whoever typed it in. That is
the strongest argument that the model wants the structure.

### 36c — serving sizes `[M][data]` 🎯 ⚠️ **not researchable**

The owner asked me to research estimated serving sizes. **21 of 24 recipes have
none, and for most of them no source exists**: "Booth's Ginger Crunch",
"Shane's Ribs", "B's Dope-As Brownie", "Jesse's Garlic Chicken Thighs" and
"Famous Brade Green Chicken Curry" are family recipes. A few are adaptations of
published ones (the Edmonds cookbook is credited on the pudding), but a serving
count taken from a published recipe is a claim about *that* recipe, not this
variant of it — and this dataset is public.

What *is* honest, and is the recommendation:
- **Two are already stated in the data and simply not read**: Queen Cakes' step
  says "(makes 21)", and the pudding's "1.5–2L ovenproof dish" bounds it.
  Surface a yield where the text already carries one — no new facts.
- **Everything else comes from the owner.** He has cooked them.
- If he wants estimates rather than facts, they can be derived from tin size and
  batter volume and **shown as estimates** — but that is a labelling decision he
  should take deliberately, not one to slip into a public dataset.

### 36d — the timer's alarm ✅ SHIPPED 2026-08-16

> ✅ **BUILT AND MERGED 2026-08-16 (wt: faves-cook, merge `42b1a7a`)** — all
> three channels, exactly as ruled. Recorded as **ADR 0071**. `site/js/alarm.js`
> is new; `cook-ui.js` arms the audio context and raises the ask inside the
> start tap; `sw.js` answers `notificationclick`. 25 unit tests, 15 new
> `cook_check` assertions, **`cook_check` OK — 75 passed**.
> 🔎 **Three of the new assertions were proved by breaking them** — inverting
> the 15-minute guard failed exactly the two notification assertions, dropping
> the vibrate call failed exactly the five vibration ones and left the tone
> green. 🛑 **And one new assertion was found to be decorative and replaced:**
> the ring-once guard could not bite, because the tick that rings the last timer
> also stops the interval — so deleting the guard failed nothing. Replaced with
> a two-timer scenario. *An assertion nobody has watched fail is not yet a
> guard*, and this one was written in the same session that was hunting
> decorative guards elsewhere.
> ⚠️ **Three things a green run does not show, and the ADR says so:** no real
> speaker was heard, no real motor was felt, and iOS ignores `navigator.vibrate`
> entirely — so on the owner's own phone this feature is tone plus notification,
> never a buzz. He was told and chose it anyway.
> 🎯 **Three left for the owner** — see the questions at the end of this block.

**Ruling as given, for the record.** It lives in
`cook.js`/`cook-ui.js`/a new `alarm.js`/`sw.js`.

⚠️ **This claim originally asserted file-disjointness from the live peers, and
that sentence was false within the hour.** It read *"none of which 37c/d/e/j/l/m
(wt: faves-recipe), 37g (wt: faves-ranking) or 37n (wt: faves-allergens)
touch."* Then 37l's own ADR landed and pulled **`cook-ui.js`** into its
blast radius — one statement at ~line 116, where the ingredient array becomes a
call to a new `ingredients.js`. Corrected in place rather than quietly, because
a claim that states disjointness is precisely what the next session trusts
*instead of* re-checking. 🔑 **Disjointness is a measurement with a timestamp,
not a property of a claim** — the roadmap already says one level up that 36a and
37l are *"different roadmap items and the same edit"*, and this claim made the
same mistake about itself while citing it. Two sessions each holding a correct
map of their own files still had a collision neither could see; what found it
was a third session noticing they had both answered the same broadcast.
**Settled with faves-recipe:** `cook.js` is faves-cook's entirely; `cook-ui.js`
is faves-cook's outright *except* that one statement and its import, which
faves-recipe lands first so this session rebases onto a settled file.

Owner ruled the shape in full, going further than the recommendation:

- **A tone on every timer.** Generated in code (Web Audio `OscillatorNode`) —
  no asset, no precache entry, no network, and no permission. The tap that
  starts the timer is the gesture that unlocks the `AudioContext`, so autoplay
  policy is satisfied without asking for anything.
- **Vibration on every timer.** `navigator.vibrate`, also permission-free.
  ⚠️ **iOS Safari ignores it entirely**, so this half does nothing on the
  owner's own phone — an Android-only benefit. He was told and chose it anyway;
  recorded so it is not later read as an oversight.
- **A notification as well, for timers over 15 minutes.** This is the posture
  change: it needs `Notification.requestPermission()` — the **first permission
  prompt Faves has ever shown** — plus a service-worker path. Accepted
  knowingly.
  🚩 **Ask at the moment a long timer starts, never at page load.** A cold
  prompt on arrival is what trains people to refuse. And degrade silently: no
  permission means no notification, with tone and vibration still firing.

Write the ADR when built — first permission prompt, first audio, first
vibration, three firsts in one feature.
⚠️ **"First permission prompt" was not written into ADR 0071, deliberately.**
ADR 0069 (the location ask, wt: faves-ranking) claims the same superlative, and
the two were built **concurrently in different worktrees on the same day**.
🔑 **A superlative is a claim about every other change, including ones being
written in parallel that the author cannot see** — it is unverifiable from
inside the repo and it decays without anyone touching the file it sits in. 0071
says the two were concurrent and that merge order settles nothing worth
asserting. Peer sessions carried this into ADR 0072 as a face of the same
family.

**🎯 Three questions put to the owner — ✅ ALL THREE ANSWERED 2026-08-16:**
1. ✅ **A notification fires even when you are looking at the page — RULED: LEAVE
   IT, duration only.** The condition stays *over fifteen minutes* and nothing
   else. He took the redundant-notification cost knowingly, over an offered
   "only if the tab is hidden" alternative. 🔑 **His reasoning generalises and is
   worth keeping**: a rule with one condition is predictable; a second condition
   buys quiet and costs predictability, and "hidden" is a poor proxy anyway — a
   phone locking mid-bake counts as hidden. **Nothing to build.** ADR 0071's
   rejected-options list already records the alternative; it is now rejected by
   the owner rather than by the agent's restraint.
2. ✅ **No visible cue at all — RULED: BUILD IT, and style the blocked line
   too.** `[S][css]` **OPEN AND UNCLAIMED — the next session should take this.**
   Two parts, one small CSS pass in `app.css`:
   - a **finished timer's card visibly changes** (the timer face reaching zero
     must be legible without sound), and
   - the notifications-blocked line gets **its own styling** instead of borrowing
     `.cook-awake` via the `.cook-notify-blocked` hook already in the markup.
   🚩 **Why this is the highest-value of the three, in his own case:** iOS Safari
   ignores `navigator.vibrate` entirely, so on the owner's own phone the alarm is
   tone plus notification. **A silenced phone with notifications denied currently
   gives no alarm at all** — and a silenced phone in a kitchen is the likely
   case, not the edge case. Verify at 390 px and extend `cook_check.mjs`.
3. ✅ **`cook.notifyBlocked` has no te reo string — RULED: to the reo queue.**
   Add it to `docs/reo-review-queue.md` as a `// draft` string in `reo.js`; it
   falls back to English safely until then, so nothing is broken meanwhile.

⚠️ **Vibration is NOT gated on `prefers-reduced-motion`, and that was a
judgement call worth challenging.** `settings.js` has no quiet/haptics
precedent, and the preference is usually set for vestibular reasons — silencing
the buzz could leave a reader who cannot hear the tone with no perceivable
alarm at all. Recorded as a rejection in 0071 rather than taken silently.

### 36a/36c — estimates DO drive timers ✅ RULED 2026-08-16

⏳ **NOT taken 2026-08-16 13:59 UTC, and the reason is worth keeping.** The
faves-cook session wanted this and left it. Getting the estimated minutes into
the payload rewrites `steps` inside
`site/data/restaurants/cook-at-home.json` — the *same records*, adjacent keys,
that the live 37l build is rewriting `ingredients` in, and it lands the same
[ADR 0067] tick-rehash trap **twice, from two sessions, in one file**. A merge
conflict is the good outcome there; the bad one is a clean textual merge that
detaches every tick. 🔑 **File-disjointness is the real unit of parallel
safety, not item-disjointness** — 36a and 37l are different roadmap items and
the same edit. Take this once faves-recipe lands, in a session that can hash
component and step together in one pass.

Put to him because two sessions had independently built the cautious version:
estimates as text, only stated times driving countdowns, on the reasoning that
an estimated "simmer 20 min" on chicken is a food-safety failure rather than a
disappointing dinner. **He ruled the other way**, with that argument in front of
him and a middle option (split on risk, not on source) also offered.

**Every step with a duration gets a countdown; an estimated one is marked as an
estimate ON THE TIMER FACE**, not merely in the step text — a countdown that
looks identical whether the number was read or guessed is not "clearly marked".
So `timerSafe` is not a function of `stated` vs `estimated`.
✅ **Done 2026-08-16, and the gate was RETIRED rather than inverted** —
[ADR 0066]. Under the ruling every duration is timer-eligible, so a boolean
asking "may this drive a timer?" is `true` everywhere and carries nothing;
`source` is what the timer face reads. The replacement invariant is that a step
with `minutes` and **no `source`** exits 1. 🚩 **One trap for whoever builds the
render:** `stepDuration()` in `cook.js` re-parses the recipe *sentence* rather
than reading a stored number, so the per-step minutes must actually reach the
payload — otherwise the estimated steps stay silently untimed while every check
stays green.

### 36g — four rulings on the cook-mode checklist (owner, 2026-08-16)

The checklist and read-aloud shipped under [ADR 0067]. Four follow-ups were put
to the owner at close and answered:

- ✅ **The twelve-hour tick expiry stays.** It was the building agent's own
  number, declared as such; he ratified it. Nothing to do.
- ✅ **Read-aloud keeps the phone's default voice at `en-NZ` — no picker.**
  Consistent with the same day's ruling that Settings stays a drill-in rather
  than growing. Nothing to do.
- ✅ **Bake-only `time` values → show the estimated TOTAL instead.** Orange
  Yoghurt Cake, Queen Cakes, Chocolate Self-Saucing, B's Brownie and Chewy
  Cookies each state a bake time that excludes 6–15 min of prep, and the app
  renders it as if it were the total. `data/estimates/` already holds a full
  estimated total for each. `[S][ux]`, unblocked — and it lands with the
  serves/yield render above, since both change the same recipe meta line.
> ✅ **Shipped 2026-08-16 — 36g — ticks must leave the backup export**, on the
> owner's ruling *"if it isn't restored, it shouldn't be exported."* Claim
> released 2026-08-17 (`wt: faves-cook` gone) and the item's self-contradicting
> header — "Ruled, not yet built" above its own "✅ BUILT" — corrected with it.
> ADR 0074. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).


### 36e — one place to look, not two `[M][ux]`

A recipe currently renders **twice**, through two code paths: expanded inside
the Cook at Home list (`menu.js` `<details>`) and on its own page (`recipe.js`).
The owner's screenshots show near-identical content in both. That is why the
cook button had to be fixed in two places, and why it had to be given two
weights. Decide what the list row is *for* — a preview that makes you choose, or
the whole recipe — and let the other path be the one that owns the detail.

### 36f — what it costs to make it `[L][schema][data]` — owner-signalled 2026-08-16

Raised by the owner while correcting this theme: *"a recipe may in the future
include the total cost to make that dish."* That is why `currency` sits on the
collection, and it is a stronger feature than it first looks — **Faves' whole
question is "order out, or cook?", and it currently answers only one half of it
with a number.** A recipe that says "$14 to make, serves 6" beside a takeaway
that says "$28" is the app finally comparing the two things it puts side by side
on the home screen.

**What makes it hard is not the arithmetic.** A cost needs a price per
ingredient, and:
- **We do not hold grocery prices, and they move.** Menu prices come from the
  owner or an owner-directed fetch (CLAUDE.md's standing rule); grocery prices
  are a different corpus entirely, with no first-party source and weekly drift.
  Every objection that blocked live menu scraping applies here with more force.
- **A recipe line is prose, not a quantity.** "Water or milk, as required for a
  thick batter" cannot be costed. The same ingredient/step structure 36b needs
  is the prerequisite here too — this is 36b's schema, used a second way.
- **Pack sizes, not recipe sizes.** A recipe wanting 100g of butter costs a
  500g block; "cost to make" and "cost to shop for" are different numbers and
  the app must not conflate them. Which one is wanted is a design call.
- **ADR 0047 applies.** A per-ingredient price is a field on every recipe line,
  precached to every phone. It ships only if a screen renders it.

🎯 **The staged version that is actually buildable:** an owner-supplied
`costToMake` on the recipe — one number, one date, his own figure — rendered
beside `serves` as "about $X, serves Y (priced <date>)". No grocery corpus, no
per-ingredient maths, no invented facts, and it answers the comparison question
today. Per-ingredient costing stays behind 36b's schema.
✅ **RULED 2026-08-16: park `costToMake`.** `currency` stays as the placeholder
it is. ⚑ discharged — the grocery-source question is not live until he unparks
this.

### Sizing

36a and 36c are small in code and blocked on the owner. 36b is the big one and
is mostly data entry — and it is the prerequisite for the full 36f, so doing it
once buys both. 36f's staged version is `[S]` and independent of all of it. The
structural call above (1/2/3) should be taken before 36e, because 36e is a
symptom of it.

---
