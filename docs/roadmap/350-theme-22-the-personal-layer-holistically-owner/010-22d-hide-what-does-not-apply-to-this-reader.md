- [ ] 🤔 **22d — hide what doesn't apply to this reader: dietary tags, allergen
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
