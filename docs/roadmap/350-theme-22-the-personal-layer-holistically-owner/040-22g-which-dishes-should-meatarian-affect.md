- [ ] 🤔 **22g — which dishes should Meatarian affect?** `[M][design]`
      ⚑ Owner-raised on 2026-09-29, verbatim: *"add Meatarian to the food
      preferences for someone that only eats dishes with meat in them"*, then
      *"I will decide dishes later. For now just add it to the food
      preferences as an option for users to select."*

## What exists today (ADR 0140)

- Meatarian is a Settings food preference beside Halal and Kosher, stored in
  the top-level `foodPrefs` list, synced and exported. It is listed in
  `site/js/dietary.js` `INERT_PREFS` and does **nothing** to any menu; the
  Settings copy says so. A test holds that it reaches no filter, claim or
  warning table.
- There is **no dish-level meat tag**. `has-meat` exists only on add-on
  options (ADR 0092). `contains-pork` (ADR 0140) and `contains-fish` are
  presence tags; there is no beef/lamb/chicken tag at all.

## 🔎 The design question: it is an ABSENCE claim in reverse

"Only eats dishes with meat in them" needs a dish to be known to HAVE meat.
Most dishes carry no meat tag, so "no tag" means "not stated", not "no meat".
Measured against the corpus on 2026-09-29 (3,507 dishes): **1,854 name no
meat or fish word at all**, and **1,136 of those are not tagged `v`/`vg`
either** — sides, drinks, desserts, and mains described only by their sauce,
about which nothing is stated. A "meat only" view built on the words menus use
would hide many dishes that are in fact meat. (A word sweep of names,
descriptions and ingredients against ~70 meat/fish words — not a per-dish
ruling.)

## Options to put to the owner (not ruled)

1. **Dim the dishes the MENU states are vegetarian** (`v`/`vg`). The one
   honest signal we already hold, used in the direction it supports: a dish
   the venue calls vegetarian has no meat. Everything else stays, because
   everything else is "not stated". Smallest; nothing new to tag.
2. **Show only dishes known to contain meat.** Needs a dish-level meat tag
   (a `has-meat` on dishes, or per-animal tags) and a sweep; even then the
   ~1,100 unnamed dishes would be hidden or need a "not stated" bucket. Large,
   and the absence risk runs the other way (hiding a meat dish is a miss for
   this reader, not a safety issue).
3. **As 1, plus a positive "meat" chip** on dishes a sweep can prove carry
   meat, so the reader sees which are known — without hiding the unknown.

Recommendation when asked: **1**, because it reads only what venues state.

## Touches

`dietary.js` (`INERT_PREFS` → a real behaviour), `menu.js` (dim rule),
`tests/tag-labels.test.js` ("an INERT food preference reaches no table" must be
rewritten, not deleted), `device_check.mjs` (its "Meatarian changes nothing"
assertion becomes the new rule), the Settings copy.
