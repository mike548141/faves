# 0124 — The shopping list is the order tally's twin, not a second list

**Status**: accepted
**Date**: 2026-09-24
**Answers** roadmap
[`250/040`](../roadmap/250-theme-17-cook-mode-recipes-you-can-actually-co/040-17e-the-rest-of-what-the-research-turned-up.md)
(17e's shopping-list bullet) · **applies the seam of**
[0076](0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md) to a second
screen · **extends** [0012](0012-device-local-profiles.md)'s
device/profile split to a new store · **reuses** ADR 0070's ingredient key

## Context

17e's bullet did not just ask for a feature, it named the implementation:

> **Shopping list from a recipe** — and note it is the same machinery as the
> order tally (`cart.js`), which already gathers, groups and totals. Build it
> as the tally's cook-at-home twin rather than a second list.

That instruction is worth more than it looks. `cart.js` is 345 lines of
gathering, grouping, totalling, storage lifecycle, corrupt-payload fallback and
subscriber wiring, all of it exercised by 488 lines of tests and by four browser
checks. A second `createShoppingList(storage)` would have been locally correct
on the day it was written and would then have drifted — which is not a
hypothetical here. This repo's own record names the shape: *two implementations
of one question, both locally right, only one updated*, with the docstring
naming its callers being what defends the bug.

The obstacle was one line. `createOrder(storage)` hard-coded
`KEY = "faves.order.v1"` in `read()` and `commit()`. Everything else about the
store was already general.

Four judgements then had to be made that the bullet does not answer, and each
of them is a place where a shopping list can be quietly wrong rather than
visibly broken.

## Decision

**A shopping line IS an order line.** `createOrder` takes its storage key as a
parameter, defaulting to the tally's so no existing caller moves, and
`shopping.js` passes `faves.shopping.v1`. The vocabulary changes; the machinery
does not:

| order line | shopping line |
|---|---|
| `venueId` — the shop | the **recipe** (`recipeId()`: collection + dish id, ADR 0051) |
| `venueName` — the shop's name | the recipe's name, which is the group heading a shopper reads |
| `dishId` — which row on the menu | the ingredient line's **raw key** (ADR 0070) |
| `name` — the dish | the ingredient line **as added**, at the scale it was added at |
| `collected` — ticked off at the till | ticked off in the trolley |
| `qty` | always 1 — a shopping line is a thing to buy, not a count of them |
| `price` / `currency` | always null / unused. `groupByVenue` computes a subtotal and no screen renders one. **An ignored column is not a fork.** |

Nothing new is written to a line, so the field is not the unit of change here —
the **store** is. What was reimplemented: nothing. `putRecipe`, `removeRecipe`
and `recipeState` are ~25 lines composed out of the tally's own verbs
(`items`, `add`, `remove`, `toggleCollected`), and the sheet reuses
`.order-sheet`'s frame and its **collect-mode row** — because ticking something
off in a trolley and ticking it off at a till are the same control.

### 1. Scaling — identity on the raw line, amount on the render

The seam is ADR 0076's and `checklist.js`'s, stated once and obeyed twice:
*hash the data, never the render*. A shopping line's identity is the **raw**
ingredient key, so the same ingredient at ½× and at 2× is **one line whose
amount was updated**, never two lines fighting over the butter. What the shopper
reads is the scaled text, because the amount is the entire reason to write an
ingredient down.

🚩 **Rescaling the page does NOT silently rewrite the list.** A list is a thing
you took to a shop. Having it move under you because you tapped 2× to look at
something is the same class of fault as cook mode showing 1× quantities beside a
2× page, which the owner called out on 2026-08-17. So the page **detects the
disagreement and says so in words**, and offers *Update the amounts*.

**It detects it by comparing the amounts, not by storing the scale.**
`recipeState(items, rid, lines)` returns `absent` / `listed` / `stale`. Storing
a scale key on the line was the obvious alternative and is rejected: it is a new
field, which means walking every export/import/codec/sync table for it, and it
answers a *weaker* question — two different scales can produce the same text for
a line the scaler refuses, and what matters is whether the numbers differ.

**A line the shopper took off is not a disagreement.** Only a line that IS on
the list and carries a different amount counts. Otherwise the page would nag to
re-add the thing the ✕ had just removed, for ever, and the ✕ would read as
broken.

### 2. Where it lives — device-level, like the tally

ADR 0012 put the order tally at device level because it is *"one order for the
table"*. A household shops once. A shopping list split three ways by whoever
last tapped a name in Settings is a list that is missing things, so the same
shelf and the same reasoning. **Rejected:** per-profile, which would have been
the more "consistent-looking" answer and the wrong one.

### 3. Combining — never across recipes

Two recipes both want butter, and they stay **two lines under two headings**.
Summing them means adding `125g butter` to `½ cup butter, softened` — unit
arithmetic over free-text prose, strictly harder than the scaling ADR 0076 only
dares do behind a round-trip proof, and with **no round trip available to prove
it**. A wrong total on a shopping list is a dinner you cannot cook; two honest
lines are a judgement a person makes better than a parser. Within **one** recipe,
byte-identical lines already collapse, because that is what `lineKey` does.

A consequence worth naming: the component prefix stays on the **display** text
here, unlike the recipe page. There the heading sits above the line; in a shop
there is no heading, and Sticky Date Pudding's two `60g butter` lines would
otherwise print twice with nothing telling them apart — the exact collision
ADR 0070 exists to prevent.

### 4. Clearing — three ways out, and the big one asks twice

A list you cannot empty is a trap, and this app shipped that trap once already.
So: **✕ on a line** ("I already have butter"), **Remove on a recipe**, and
**Clear the list**, which is the tally's two-tap confirm — a list is read
one-handed in a supermarket with a trolley in the other, and nothing here is
undoable.

### 5. Which ticks survive an update

A tick means *that is in my trolley*. It is **still true** of a line whose
amount did not move and is a **lie** about one that doubled — and a wrong tick
is worse than a missing one, because the shopper walks past the shelf. So
`putRecipe` rebuilds the group in the recipe's order and re-ticks only the lines
whose text is unchanged.

## The tables a new store had to be walked, and what each answered

🚩 This repo has been wrong about this whitelist **twice** — the sync code
leaked into the plaintext backup, and the geo-consent flag after it, both
through the same catch-all sweep. So every row below is **asserted in
`tests/shopping.test.js`**, not reasoned about.

| table | answer | why |
|---|---|---|
| `profiles.js` `SCOPED_BASE_KEYS` | **not added** | device-level; this list is what migrate/export/sync walk for per-profile stores |
| `profiles.js` `PURGED_BASE_KEYS` | **not added** | deleting one person must not empty the household's list — asserted |
| `personal-data.js` `EXCLUDED` | **not added** ⇒ it **is** exported | it is durable data the person composed, exactly like `data.order`. Not a credential, not a clock, not a per-device promise |
| `personal-data.js` catch-all sweep (`other`) | **carries it verbatim** | that sweep exists so the file need not be edited per feature; this is a store it was written for. A named `shopping:` field was rejected as five more call sites for no gain |
| `personal-data.js` `parsePersonalData` (`other` filter) | **re-imports it** — asserted through a **replace** import, the harder direction |
| `sync.js` `writeSnapshot` / `sync-merge.js` | **not synced** | it syncs `SCOPED_BASE_KEYS` and leaves unknown stores alone. ⚠️ See Consequences |
| `share-codec.js` | **untouched** | a shopping list is not shared; `type` still takes `order` and `shortlist` only |
| `sw.js` `SHELL` | **both modules added**, `SHELL_VERSION` → `2026-09-24.2` | `check_precache.py` and `tests/sw-versioning.test.js` enforce it |
| `renames.js` `migrateEntries` | **cannot reach these** | it rewrites a bare `venueId`; a group's is a joined pair. The **link** resolves through `canonicalVenueId` instead; the line itself reads fine either way |
| `summarisePersonalData` | **not counted** | see Consequences |

## Consequences

- ⚠️ **The list does not sync across devices**, for the same reason the order
  tally does not: sync's unit is a *profile* and this store is device-level.
  Making it sync means making it per-profile, which reverses §2. If the owner
  wants the list on the phone that goes to the shop, that is a decision for him
  and a roadmap item, not a quiet widening here.
- ⚠️ **The export's confirmation does not count it.** `summarisePersonalData`
  reports profiles, favourites, ratings and order items; the shopping list rides
  the `other` sweep and is saved but unmentioned. Honest but quiet. Widening the
  summary shape touches the import UI and its tests, and was judged not worth it
  for a list that turns over weekly.
- **Every string is English.** `nav.shopping` and the rest are declared in
  `reo.js`'s owed list and queued in `docs/reo-review-queue.md`. "Shopping list"
  would have to be **composed** from single-word dictionary lookups, which is the
  same refusal this repo already recorded for *dining*; most of the others swap
  under the reader's own tap, which `reo.js` cannot carry at all.
- `recipe_check.mjs` grows to **39 assertions**. Three were break-probed.
  🛑 One probe (removing the two-tap Clear latch) made the run **abort** rather
  than report, because the Clear button correctly hides on an empty list — so
  the second tap's assertion is now guarded and says *NOT PROVEN* instead, the
  same shape the `unscalableFixture` branch already used. That is a fix to the
  check, found by probing it.
- The control sits beside *Start cooking*, **not** inside the ingredients panel.
  The fold is remembered for every recipe (37c), so a reader who folded it once
  would never see this button again. Asserted across a real page load.
