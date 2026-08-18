- [~] ✅ **RULED AND SHIPPED (first half) 2026-08-17 — the answer is DULL, NOT
      HIDE.** The owner ruled it from a screenshot of a dish wearing two
      identical red warnings when only one of them was his:
      > *"If an allergen is enabled in the users settings … it shoud work
      > exactly as it does today. If an allergen exists on a dish but the user
      > has not indicated that they are allergic then the UI element should look
      > the same as it does today except (a) it should be a duller colour so
      > that it does not stand out as much … Still visible but not so that it
      > stands out as a warning and (b) Remove the word Contains … Same thing
      > for the options like DFO, GFO, Vegetarian, Vegan etc"*
      🔑 **"Dull, never hide" dissolves question 2 below rather than answering
      it.** *Absence of a declaration is not absence of an allergy* was the
      hardest objection on this item — a reader who never opened Settings, a
      phone handed across a table, someone ordering for a friend. Nothing is
      removed from the page or from the accessibility tree, so none of them
      loses information; only the visual weight moves. **That is why this could
      ship without the escape hatch (question 6) and without resolving the
      opt-in question.** It also settles question 1 by treating both classes the
      same way — relevance turns the volume up, irrelevance turns it down, and
      neither disappears.
      **Shipped:** `tagChip` in `menu.js` takes the reader's **stored** dietary
      preference (`settings.diet.dietary`) as well as `avoid` — deliberately the
      stored setting, not the menu's transient filter chips, because the question
      is what this reader *needs*, not what they are looking at. `.is-muted` in
      `app.css` uses `color-mix` toward the surface rather than new tokens, so it
      tracks the warn/diet colours in both schemes instead of drifting from them.
      **Break-proven** in `device_check` (20 → 23 assertions): removing the muted
      class fails 2 and nothing else; leaving "Contains" on a muted chip fails 2
      and nothing else; restored, 23/23. The muted chips are asserted **visible,
      non-zero-width and not `aria-hidden`** — a check that only counted the loud
      ones would pass just as happily if the quiet ones vanished.
      🎯 **ONE THING FOR THE OWNER, raised rather than resolved: the ⚠ glyph is
      KEPT on a muted allergen chip.** That is the literal reading of the ruling
      — *"look the same as it does today except (a) … and (b) …"* enumerates two
      changes and the glyph is not one of them. But it sits against his stated
      intent that such a chip *"does not stand out as a warning"*, and a ⚠ is the
      most warning-shaped thing on it. One-line change either way.
      ⏳ **STILL OPEN below:** questions 3 (declared vs inferred), 4 (`DFO` as an
      ordering affordance), 5 (what replaces the space, if anything) and 6 (a
      "show all tags" switch) are untouched — the ruling made them cheaper, not
      moot. Original filing follows —
      🤔 **22d — hide what doesn't apply to this reader: dietary tags, allergen
      chips and the rest** `[M][design]` ⚑ — owner-raised 2026-08-17, **design
      genuinely open**. His framing: *"all the tags on dishes like vegan, DF,
      GF, DFO, peanuts etc are clutter if the user doesn't care about it e.g. no
      dietary preferences, no allergens, or simply other allergens that don't
      affect them… not sure how this will work. Something to think on."* Filed
      as thinking, not as a build order.

## Why it belongs in Theme 22

Same root as 22a–22c: Faves grew a personal layer and each capability arrived
with its own surface. This is that layer seen from the *dish* rather than from
Settings — the app knows who is reading and still renders every dish identically
for everyone.

## What already exists, so nothing gets built twice

The machinery to know what is relevant is **already there**. `site/js/dietary.js`
holds `DIET_FILTERS`, `dishFlagged(tags, avoid)` and `dishSatisfiesDiet(tags,
activeDiet)`; profiles carry the reader's avoid-list; the menu screen already
re-applies warnings live when a profile or allergen changes (that is what
`device_check.mjs` drives). So the app **already personalises the warning**. This
item is about the *other* direction — what to stop rendering — and it needs no
new data.

🔎 **The clutter claim is measurable, and a first sweep of `site/data/` supports
it**: 5,188 tags across 3,225 tagged dish records (mean 1.6, and 88 dishes carry
five or more). **Roughly three quarters are `contains-*` allergen tags** —
`contains-gluten` 1,211 · `contains-dairy` 873 · `contains-egg` 567 ·
`contains-soy` 528 · `contains-shellfish` 301 — which are precisely the ones a
reader with no declared allergy is being shown for no reason. Worth re-running
properly before designing against it.

## The questions, in the order that decides the design

1. 🔑 **Two different things are wearing the same chip, and they should not hide
   by the same rule.** `contains-peanuts` is a **safety** signal. `vegan`, `gf`,
   `spicy-1` are **descriptive and positive** — people browse *toward* them.
   Relevance is bidirectional: a vegan wants `vg` more visible, not less. Decide
   which class each tag is in first; "hide what you don't care about" is only
   coherent for the avoidance class.
2. 🛑 **Absence of a declaration is not absence of an allergy.** A reader who
   never opened Settings, a phone handed across the table, a guest ordering for
   someone else. Hiding by default removes information from exactly the person
   who never told us they needed it — the failure is silent, and the cost is not
   symmetrical with clutter. So the default for an *undeclared* reader is a real
   decision, not a fallthrough.
3. 🔎 **Most of these tags are ours, not the venue's**
   ([`infer-allergens-by-default`](../../decisions/0025-infer-allergens-by-default.md),
   owner-ruled 2026-08-09). Hiding an **inferred** tag hides our own guess.
   Hiding a **declared** one hides the menu-writer's statement. That may be the
   line the design wants, and it is already recorded in the data's provenance.
4. **`DFO` and the other "on request" tags are an ordering affordance, not a
   diet label** — they tell you what to *ask for*. Someone with no dietary needs
   ordering for someone who has them still wants to see them.
5. **What replaces the space:** nothing, a count (*"+3 allergens"*), or a
   per-dish reveal. And what a dish looks like when the rule hides *every* tag it
   has.
6. **Escape hatch and its home.** A "show all tags" switch belongs with the other
   personal settings, which is 22b/22c's screen — so this is sequenced behind
   their model call rather than beside it.

## Constraints it must not break

- **[ADR 0047](../../decisions/0047-the-app-ships-only-what-it-renders.md) is
  untouched**: the tags stay in the payload and the service worker still
  precaches them. This is a render-time decision, not a data one — a second
  reader on the same device must be able to see what the first one hid.
- **Accessibility.** A safety-relevant chip that is visually hidden must not be
  merely `display: none` to a screen reader if a sighted reader could still get
  at it another way; the two must agree. WCAG 2.2 AA is non-negotiable.
- **`reo.js`'s gloss must not describe chips that are not on the page**, and the
  filter row must stay honest: filtering *by* a tag the reader has hidden is a
  contradiction that needs an answer.

⚑ **The owner's calls, when it is ready to put to him:** opt-in or on by
default; what an undeclared reader sees; and whether the avoidance class hides
while the descriptive class stays.
