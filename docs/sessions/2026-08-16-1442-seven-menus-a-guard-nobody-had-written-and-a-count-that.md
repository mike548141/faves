## 2026-08-16 14:42 UTC — seven menus, a guard nobody had written, and a count that lied twice

An orchestration session (wt: `faves-menus`, branch `menus-14`) running two
lanes the owner picked: **content & data**, and **ordering & customisation**.
Twelve sub-agents, four live peer sessions, everything landed on `main`.

### What it took, and how the queue was cleared to take it

The remaining first-party venue menus were **claimed by a session that no longer
existed**. The claim was released on evidence rather than elapsed time, and the
test is worth reusing: **no worktree AND no branch (local or remote) AND a close
record.** Any one alone proves nothing — a live session between commits has a
clean tree, and a worktree can be recreated. `faves-f0` independently found two
more orphaned claims from the same 11:22 UTC cohort; they are still open.

### Shipped

- **Eight venues from stub to menu-complete: 983 dishes.** The Catch Sushi Bar
  (87), Satay Kingdom (53), Charley Noble (125), Regal Chinese (264), Rock Yard
  Vietnamese (58), Pizza Pomodoro (83), Gong Cha (131), Pizza Hut (133). Every
  price from the venue's own site or its own menu PDF; no delivery app touched.
  🎯 **Pizza Hut's allergen PDF grades P (present) vs T (trace), and only P was
  tagged.** [ADR 0025] says "when unsure, tag" — but this is not uncertainty,
  it is the venue's own graded signal, and `T` is near-universal across the
  pizza line, so collapsing it would fire nut/sesame/shellfish warnings on every
  pizza. The vocabulary has no "may contain traces" tier. Surfaced, not settled;
  it will recur on every PDF-sourced venue.
- **Theme 14c — a free-text note per order line** ([ADR 0073]), 938 tests
  green, plus `tools/note_check.mjs`, the seventh headless check.
- **`tools/check_fallback.py`** — gates the no-JS `<ul>` against `index.json`,
  wired into CI and the verify list.

### 🔎 The count that lied twice, in opposite directions

ROADMAP recorded the no-JS fallback as **"35 venues behind"** `index.json`.
It was never behind: all 55 were listed, in order, names matching. The 35 came
from counting `restaurant.html?id=` hrefs — and **a stub is deliberately
rendered without a link**, so the count measured *venues with a menu*, not
*venues in the list*. This session reproduced the 35 exactly before noticing,
which is the point: it is the same trap the roadmap warns about two items
earlier, and knowing about the trap did not prevent falling into it.

🚩 **And underneath the wrong number was a real defect, worse than a stale
list.** Ten venues had **finished menus rendered as unreachable "Menu coming
soon" cards** — four of them landed the previous day. A reader whose JavaScript
had not run was told those menus did not exist. That is a **status** drift, and
no membership count could ever see it. 🔑 **So the gate asserts the link rule,
not just membership** — encoding *why* a card has no href is what stops the next
reader re-measuring it wrong. It caught four more of this session's own venues
before they shipped.

### 🔎 "Publishes a website" is not "publishes a menu" — and it halves an item

The roadmap's `stub` breakdown reads *18 publish a website (a fetchable
first-party source)*. That parenthetical is false. Of the 14 remaining,
**four publish a site with no menu on it anywhere**: New Chapter (its own menu
page says "Coming Soon", and the template still carries its own `<!-- TODO -->`),
Kaffee Eis ("we make more than 45 flavours", naming none), Babaili Malatang
(8 pages, no menu in its own nav), Caffiend (Facebook, menu tab login-gated).
Each was checked exhaustively — sitemap, soft-404 detection by MD5, platform
JSON endpoints, guessed paths, own social accounts.

🔑 **The `stub` count splits three ways, not two: publishes nothing · publishes
a site but no menu · publishes a menu.** The middle group is invisible to the
one-line reproducer the roadmap offers, which is why it was miscounted.

### 🔎 Three "blocked" findings refuted by re-testing them

- **Subway** — recorded hard-blocked on a click-only widget. Its menu pages are
  server-rendered and readable, and it publishes a first-party **NZ Allergen
  Web Guide (May 2026)**. But it publishes **no price anywhere**, first-party,
  by design (franchise pricing varies by store) — so every price is legitimately
  `null`, which is a brief-compliant record rather than a blocker.
- **Pizza Hut** — its 9.8 KB homepage really is a Nuxt shell, and one level in,
  `/order/<category>/delivery` serves a complete price-bearing first-party menu.
- **The Victoria Tavern** — HTTP 000 is **not a dead domain**. It is a live
  server with a self-signed Plesk placeholder certificate issued 2026-08-03,
  and its menu PDFs are current (mains dated 2025-11-24).

🔑 **A prior session's "blocked" is a hypothesis, not a fact.** Three of four
survived only until someone re-tested them.

### 🚩 The allergen sweep declines silently — and there is a SECOND trigger

37n (held elsewhere) had diagnosed `tag_allergens.py` skipping 6 of 55 files
because it counts every `"tags"` array including add-on options, so the count
comes out **too HIGH**. This session hit the same silent `SKIPPED` + exit 0 on a
file with **no `addOnGroups` at all**: 6 of `the-catch-sushi-bar`'s 87 items had
**no `tags` key**, so the count came out **too LOW** — 81 for 87.

🔑 **And the failure is CORRELATED WITH THE NEED.** The two tags the tool
identified and then failed to write were on the two items with no `tags` key.
An item with no tags array is simultaneously the most likely to be missing a tag
and the thing that makes the whole file unpatchable. **The tool declines hardest
exactly where it matters most, and reports success.** Proved by removing the
cause: adding `"tags": []` to those six items made the unchanged tool apply both
tags unaided. Relayed to 37n, which adopted it and is folding it into [ADR 0072].

### 🚩 The tag vocabulary has a hole three agents found independently

**There is no `contains-fish`.** Rock Yard names fish sauce in a dozen dishes
and prints its own badge literally as "Fish"; Pizza Pomodoro has anchovy on two
pizzas. The closed set has `contains-shellfish` and nothing for finned fish —
one of the major allergens. Also missing: `vg-option` and `df-option` (Gong Cha
offers a free soy/oat swap on 15 drinks; Rock Yard prints "Vegan Optional").
🎯 **Owner decision — recorded, not acted on.**

### 🚩 A venue's own labels caught lying, twice

Rock Yard's per-item badges **omit Peanuts on two curries** whose own section
note reads *"All curries contain peanuts and cannot be removed"*, and badge a
dipping sauce **Vegan** while its own description says it is made from fish
sauce. The section note was applied by hand to every dish in that section —
exactly the miss `tag_allergens.py` cannot see, since it reads item text only.

### 🔑 Cross-listing has no shape in the model, and it is common

Eleven explicit `dishId`s were needed across three venues, and **the price is
what told the two causes apart**:

- **Genuinely different dishes** — Regal's Deep Fried Squid is $9 at yum cha and
  $10 à la carte; Rock Yard's Hue Spicy Beef is $17 at lunch and $29 at dinner;
  The Catch's Teriyaki Chicken is $31.10 as a main and $23.00 as a donburi.
  This is the case [ADR 0051] exists for.
- **One dish the venue cross-lists** at one price under two headings — Regal's
  Spicy Salt Tofu, Rock Yard's five Small Bites, Satay Kingdom's Char Kueh Teaw.

The second has no representation: the rows are kept because the venue prints
two, but nothing says they are one dish, so a heart on one does not show on the
other. Evidence for Theme 28 and Theme 30.

### 🔎 A false positive worth keeping

`validate.py` warned that The Catch's Donburi Teriyaki Chicken *"lacks
contains-sesame, which another row of the same name carries"*. It is **not** an
inconsistency: the Mains version is $31.10 *"served with Japanese salad"* and the
sesame is in the dressing; the Donburi is a $23.00 rice bowl with no salad.
**Same name, different accompaniments, correctly different tags.** A same-name
comparison cannot see that — relayed to 37n, which has made a same-venue
disagreement across *different prices* weak evidence in its report design.

Separately, `tag_allergens.py`'s "wheat bakery item" rule fires on the token
**`slices`** and tagged two Regal dishes for *"Black Fungus Slices"*. Fail-safe,
so the tags stayed, but the reason is wrong — an EXCLUDE candidate.

### 🔎 What the sub-agents found that the brief got wrong

- **Oyster sauce → shellfish was missing from the brief's class table.** An
  agent challenged it. Audited corpus-wide: `tag_allergens.py` had already
  tagged **15 of 15** oyster-sauce dishes. The brief was wrong, the tool was
  right, and the layering caught it.
- **`setNote(venueId, id, sel, note)` is not implementable.** Because the note
  is part of line identity, the *old* note is the only thing that can locate the
  line — so the specified signature can address the un-noted line and nothing
  else. Shipped as `setNote(…, from, to)`.
- **The ± stepper operated the wrong line.** With "Eggs on Toast" and "Eggs on
  Toast — no tomato" both in the sheet, minus on the noted line decremented the
  plain one, and the two buttons were indistinguishable to a screen reader. No
  unit test can see which line the DOM wired a button to; `note_check.mjs` can.

### 🔑 The codec's safety argument does not cover a removal

`share-codec.js` justifies appending a slot rather than bumping `CODEC_VERSION`
with a *safety* claim: *"dropping an add-on can never put something extra on a
plate."* **That does not transfer to a note.** An add-on is an addition; a note
is characteristically a *removal*, so dropping one leaves the unwanted thing
**on** the plate — the opposite degradation direction, and the unsafe one.
Carried anyway, because not carrying it fails for everyone every time while
carrying it fails only against a decoder older than the slot. [ADR 0073].

### 🚩 The absorbed version bump, caught live

Committed SHELL `.88`; main independently moved to `.88` during the rebase. A
rebase does not *conflict* on that, it **absorbs** it — the constant reads
exactly the number intended and is unbumped relative to `origin/main`, so the
install step skips the cache and installed phones keep the old shell with CI
green. `check_versions.py --range origin/main..HEAD` caught it; nothing else
would. Re-picked to `.89`. Spent this session: **SHELL `.89`, DATA `.36`.**

### Working alongside four peer sessions

Broadcasting the file set on open, not just the claim, paid for itself several
times. It surfaced that **`cook.js`/`cook-ui.js` were double-held** by two peers
who did not know about each other — 36d's claim block asserted file-disjointness
in writing, and that sentence went false within the hour when ADR 0070 landed.
They resolved it directly. It also caught a **SHELL `.84` collision** between two
peers, and brought back three owner rulings this session would otherwise never
have seen (dining style folds into `vibe`; `detailsVerified` ageing at 6 months
for hours and 24 for phone/address; a **named** third-party source is acceptable
for opening hours). 🔑 **Rulings do not cross between sessions by themselves.**

### Left deliberately

- **The Victoria Tavern.** Transcribable, but only over HTTPS with certificate
  verification disabled. That is a security judgement and a provenance one —
  we cannot honestly write `official-site` for a site we could not verify *is*
  the official site. 🎯 Owner's call, and the venue should probably be told.
- **Subway.** Names and a first-party allergen guide are reachable; no price is
  published anywhere, so every price would be `null`. 🎯 Owner's call on whether
  a price-less record earns its place in the payload.
- **Caffiend, New Chapter, Kaffee Eis, Babaili.** Need a photo or a visit. No
  further web session will find what was never published.
- **Theme 14b (the add-on content sweep).** Deliberately NOT taken: it would add
  `addOnGroups` across the corpus, and every record carrying them is one
  `tag_allergens.py` silently refuses to write to. Doing it before 37n's fix
  lands would multiply the silent-decline surface sevenfold.

