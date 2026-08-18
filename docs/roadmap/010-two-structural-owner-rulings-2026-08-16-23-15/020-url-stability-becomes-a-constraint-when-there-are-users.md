- [ ] 🚩 **URL stability is NOT a constraint yet, and the day it becomes one is
  not marked on anything** `[S][design]` — owner-ruled 2026-08-17, in his own
  words, correcting a record that had said the opposite:

  > *"its fine to break URL's now because there are minimal users but ONCE there
  > are lots of users we don't want to break URL's"*

  **What this settles, immediately.** A query key, a path or a fragment may be
  renamed or retired outright **today**, with no compatibility path, because the
  audience is small enough that the cost is near zero. That is why the
  `?service=` shim was **dropped** rather than kept (`010`, and the note above
  `orderModeFromQuery` in `site/js/filters.js`).

  🔑 **What it does NOT settle, and this is the whole item: nothing tells a
  future session that the rule has flipped.** The condition is *"once there are
  lots of users"*, and this repo measures no users at all — there is no
  analytics, deliberately, and the [ADR 0001] zero-dependency floor plus the
  no-personal-data rule make most of the obvious answers unavailable. So a
  session in six months reads *"it is fine to break URLs"*, and it is a live
  instruction with an expired premise. **That is the same shape as a guard whose
  verdict does not depend on the thing it guards** ([ADR 0072]): the sentence
  reads identically whether the condition holds or not.

  🎯 **What is owed to the owner is one decision — how we will KNOW.** Options,
  each with a real cost, none chosen:
  - **A date he sets** — crude, needs no measurement, and is wrong in whichever
    direction reality moves.
  - **A signal he already has** — Cloudflare Pages' own request analytics are
    outside the app and cost nothing to look at, but they are a dashboard nobody
    is required to open.
  - **A ratchet on the artefact instead of the audience** — declare the URL
    contract frozen the moment the site is linked from anywhere he does not
    control (a menu QR code, a shared guidebook, a search result). Measurable by
    him, not by the site, and it moves the test from *how many people* to *who
    can reach it* — which is the thing that actually makes a broken link cost
    something.

  ⚠️ **Until he rules, treat the permission as live but SAY SO at every use.**
  Any commit retiring a URL key must name this item, so the change is
  attributable to a permission with a stated expiry rather than to nobody's
  decision. Two places already do: `filters.js`'s `orderModeFromQuery` note and
  `010`'s record of the rename.

  📎 **Related and NOT the same question:** [ADR 0050] fixes *which* facets a
  shared link carries (area and cuisine, plus style from 37k). That is about
  what we choose to put in a URL. This is about what we owe a URL once it exists.

[ADR 0001]: ../../decisions/0001-zero-build-vanilla.md
[ADR 0050]: ../../decisions/0050-a-facet-link-filters-the-list-rather-than-searching.md
[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
