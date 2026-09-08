- [x] 🔎 **Five smaller defects found while tracing fields to screens**
      `[S][js][docs]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §4c). None is a
      modelling question; each is a fix with a test. Filed together because they
      were found together; take them one at a time.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — all five reproduced and
  fixed, one commit and one break-probe each, on branch `five-defects`.
  **All five were real.** Two carried a fix that was wrong as filed, and
  saying so is the more useful half of this note.

  1. **Every order line is hard-coded `NZD`.** ✅ REAL, fixed.
     `menu.js` and `addons-ui.js` now pass `venueCurrency(r)` and
     `cart-ui.js` formats the line in `item.currency`. Verified on a GBP
     fixture of the kebab record served through `addon_check`'s overlay,
     driving BOTH call sites: `[["Chicken kebab","GBP",0],["Chicken
     kebab","GBP",1]]`, lines `["£16.50","£16.50"]`, subtotal `["£33"]`,
     against a control that the real NZD venue's lines still store
     `["NZD","NZD"]`. 41 passed, 0 failed. Break-probe: reverting all
     three edits fails exactly the three new assertions — 38 passed, 3
     failed.
     **The dead `place.js:65-67` path stays, and the comment goes.**
     `currency` is not in `ITEM_KEYS`, and no caller passes an item —
     all seven call sites of `displayPrice`/`displayCurrency` give a
     record and nothing else. Deleting it would change three exported
     signatures on the path that formats every price chip on the home
     screen and buy nothing a phone can measure. What could not stand
     was the comment promising a capability the schema refuses; it now
     says plainly that no shipped record can carry an override.

  2. **Deleting a profile leaves its cook-mode ticks behind.** ✅ REAL,
     fixed — **but the filed fix was wrong and was measured to be.**
     "Add the key" to `SCOPED_BASE_KEYS` would also have re-opened the
     export, because that list is what `personal-data.js` walks BY NAME:
     with the key added, `collectPersonalData` against the real module
     printed

         EXPORTED PROFILE FIELDS: ['id','name','active','favourites',
                                   'settings','ratings','checklist']

     reversing ADR 0067 and the owner's 36g ruling (*"if it isn't
     restored, it shouldn't be exported"*). So the item's parenthetical —
     *"Its export exclusion is deliberate and unaffected"* — is true of
     the defect and false of the remedy beside it. `remove` now walks a
     WIDER list (`PURGED_BASE_KEYS`); a second test pins the travelling
     list unchanged. The key's literal moved to `profiles.js` so the
     purge can name it without an import cycle that would leave
     `profileScopedStorage` in its TDZ at `checklist.js`'s module scope.
     Break-probe both ways: restoring the old loop fails exactly *"remove
     purges the cook-mode ticks too"*; taking the filed fix instead fails
     exactly *"the checklist is still absent from the list that travels"*.

  3. **The compact contact bar reads the primary branch.** ✅ REAL, fixed.
     It resolves `nearestBranch(r, recallOrigin())` for the hours and the
     timezone, the same origin the card, the caveat and the served window
     use. Verified by a new two-branch `branch_check` fixture — primary
     never open, nearest always open, origin on the nearest, no closure
     injected — 98 passed, 0 failed; break-probe restoring the `r.hours`
     read fails exactly the two new agreement assertions (96/2).
     **Found and fixed alongside: the call button.** It dialled `r.phone`
     while showing another branch's status. It now prefers the nearest
     branch's own number and falls back to the venue's — not a plain
     per-branch read, because 6 of TJ Katsu's 7 branches publish no
     number and a bar that vanished on six of seven would be worse; the
     bar exists for its call button.
     **A first draft of the check asserted `state === "open"` and failed
     at 23:49**, because a segment ending at `24:00` reads
     `closing-soon`. It asserts `!== "closed"` now, which is
     time-independent as that file requires.

  4. **Section `translations` accepted and never rendered.** ✅ REAL.
     **DECIDED: render it.** Both cases, since this was the judgement
     call:
     - *Refuse it.* 0 records carry one, so ADR 0047's test — name the
       screen that renders it — was failing today, and dropping the key
       from `SECTION_KEYS` is one line that provably loses nothing.
     - *Render it.* ADR 0044 is accepted and shipped: a dish's name and
       description already take the reader's best rendering with the
       others beneath, so refusing leaves one record translating its
       dishes under an untranslated heading. `ARCHITECTURE.md` documents
       the field and says why — *"a heading is read before any dish under
       it"* — so refusing is not a deletion but the reversal of an
       accepted decision, which is not a child repo's to do in passing.
       And it is cheap here precisely because ADR 0058 already moved the
       anchor onto the stored `sectionId`: the words in a heading are
       display text and nothing links to them, which is exactly why a
       dish's `name` is NOT translated in the same sense.
     Render wins on the second and third of those. The jump-nav chip
     takes the same rendering and every string carries its `lang`
     (WCAG 2.2 AA 3.1.2). Verified by an `addon_check` overlay declaring
     the record's language as Thai: heading `"Soups" lang="en"`,
     alternate `[["ซุป","th"]]`, chip `"Soups" lang="en"`,
     `#section-kebabs` still resolving — 46 passed, 0 failed; break-probe
     fails exactly the four new assertions (42/4). App-wide search still
     labels a result with the canonical heading, which is untouched and
     is a separate question nobody has filed.

  5. **A cross-record `goesWith` chip can dead-end.** ✅ REAL —
     **reproduced, not taken on trust.** Against the real modules, for a
     dish named "Fish and Chips" carrying `dishId:
     "fish-and-chips-mains"`:

         chip href      restaurant.html?id=b#dish-fish-and-chips
         element id     dish-fish-and-chips-mains   ← no such element
         findDish(B, "fish-and-chips")  →  null      ← and no recovery

     85 of 3,506 dishes are unreachable this way (re-counted with the
     real `slug`), and the same shape reaches any link shared before ADR
     0051. **The filed fix is not possible as written**: resolving the
     reference through `findDish` at render cannot work, because the
     source page holds one record and fetching the other to draw a chip
     is what `menu.js` already refuses. The recovery belongs at the
     destination, so `findDish` grew a fifth, weakest tier.
     🛑 **And it must be OPT-IN — the first version was not, and that
     broke something real inside the hour.** `data.js` asks the same
     resolver whether a hearted dish is still on the live menu; an
     always-on name tier answers "present" for a menu now printing that
     name under a NEW id, which is a stale heart and the exact ADR 0051
     collision the tier order closes. `tests/data-loader.test.js` caught
     it. One caller passes `byNameSlug`: the `#dish-…` fragment
     resolver. `validate.py`'s `find_dish` deliberately does NOT mirror
     the new tier and now says why — it asks the identity question, not
     the link one.
     **The item's other half is declined**: validating cross-record refs
     by id as well as name would let `"venue#fish-chips-mains"` through,
     and `pairingLinks` renders the text after `#` as the chip's visible
     label, so the card would print a raw identifier. Nothing else is
     needed — a name that exists in the target now always resolves.
     Break-probe both ways: removing the tier fails the 2 new
     assertions; forcing it always-on fails those 2 plus data-loader's
     *"a dish gone from a live menu is absent"*.

  📋 **The doc drift, verified line by line before editing — and the
  list was itself partly stale.** 7 of 9 were real and are corrected;
  one was already fixed and one is a genuine omission the list named
  correctly.
  - ✅ DESIGN.md: card services (removed 2026-08-16), the `"verified
    <date>"` header line (removed 2026-08-16, ADR 0036), picks at the
    top (they sit under the search field, owner ruling 2026-08-17), and
    dietary chips that dim — **that one was wrong twice**: the dimming
    went with ADR 0088 and the chip row went with it.
  - ✅ ARCHITECTURE.md: the cook-mode ingredients toggle (gone
    2026-08-16 — the panel is derived from the step now, not a
    control), the Refresh control's location (Settings → **Refresh &
    reset**, its own topic since Theme 15), and *"the future trend
    view"* (Theme 13: *"not 'not yet': not ever"* — `priceSeries` and
    `priceNext` are computed and read by nothing, which is the current
    truth, not a staging post).
  - ❌ **The private-repo row does not exist.** `ARCHITECTURE.md:39`
    already reads *"**Public** since 2026-08-09"* and records that it
    said Private until 2026-09-08. Nothing to change; the drift list is
    a month behind on this one.
  - ✅ **The per-profile store list omitting the checklist was STILL
    TRUE**, and is the one item on the list that was not merely
    cosmetic — it is the same omission as defect 2, one level up. Now
    named, with the reason `SCOPED_BASE_KEYS` still excludes it.
  - ➕ **Two code comments carried the same drift** and were corrected
    with the docs they mirror: `menu.js`'s header (*"dietary chips dim
    them"*) and `temporal.js`'s two references to a trend view.
  - ➕ **ADR 0089's Decision names a render that no longer ships** —
    *"The dish row renders a quiet second line: $24 on Delivereasy —
    about 26% more"*, removed by the owner on 2026-09-06 the day it
    shipped. Accepted ADRs are not edited, so it carries a dated
    *Partly superseded* pointer; the Decision text is untouched and the
    model it decided is unchanged.
