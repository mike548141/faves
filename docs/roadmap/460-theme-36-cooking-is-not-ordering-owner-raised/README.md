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


### Sizing

36a and 36c are small in code and blocked on the owner. 36b is the big one and
is mostly data entry — and it is the prerequisite for the full 36f, so doing it
once buys both. 36f's staged version is `[S]` and independent of all of it. The
structural call above (1/2/3) should be taken before 36e, because 36e is a
symptom of it.

---
