## 2026-09-07-0020 — two owner asks, and both turned out to be about something else

**Same session (faves-24), continued after the close.** Two ad-hoc asks, both
filed to the board and claimed before starting, both delivered. Nine commits.

### 1. "Add Dragonfly, Courtenay Place. Gather all the info you can online"

The direction the content rule requires — menu content is owner-supplied **or
owner-directed**, and this was the second.

🔎 **It was already there, as a `stub`** (added 2026-08-16: name, address,
coordinates, nothing else). So the ask was right about the substance and not
the mechanics. Now `menu-complete`: **24 dishes in four sections**, phone,
website, per-day hours, `$$$`, vibe, the takeaway ordering link, and the
fallback `<li>` promoted from an unlinked "Menu coming soon" to a real link
(40 linked / 17 stub, was 39 / 18). Verified live on `faves.pages.dev`.

🛑 **It refutes `080/150` on this record.** That item states, measured
2026-08-17, that *"18 stubs remain and NOT ONE is fetchable"* and lists
Dragonfly among the *"other fourteen [that] publish nothing at all"*. It
publishes `dragon-fly.co.nz` **with a full priced menu**. One refuted record
does not refute the count — it refutes the **method's completeness**, which is
the more useful finding: a sweep keyed on the record's own `website` field (it
was `null`) or on a guessed domain (the real one is hyphenated and does not
match the name) reports "publishes nothing" indistinguishably from having
checked. Filed as `080/190`; **the other thirteen have not been re-checked.**

🛑 **The allergen tagger flags `water chestnut` as a tree nut.** Two dishes here
name it and `validate.py` demanded `contains-nuts` on a **vegan side dish**.
*Eleocharis dulcis* is an aquatic sedge tuber, unrelated to *Castanea* — the
same call the rule's own comment already makes for coconut. Fixed with a
**fixed-width negative lookbehind, not an `exclude`**: `exclude` vetoes the
whole rule for the item, so *"water chestnuts and toasted almonds"* would have
**lost the almonds** — an over-warning traded for a MISS, the one direction this
tool must never move. New case + a breaker that removes the lookbehind and
proves the case notices; suite **18 → 20**.
🔑 **Certain → exclude; ambiguous → warn** is the line drawn. Two tagger
findings were *accepted*: `Massaman Potatoes` → `contains-peanuts` (the venue
prints no peanut; massaman is a peanut curry) and `Coconut Gelato` →
`contains-nuts`, a deliberate over-warning because "black sesame praline" names
its own inclusion but praline is usually nut-based.

🛑 **Two gaps this venue makes concrete and cannot fix.**
- **No `contains-fish` tag exists.** Seared Sesame Tuna and Salmon Two Ways
  **cannot declare fish**; `has-fish` is option-only (ADR 0092). Already ruled
  (Theme 5 `010`, 2026-08-16) and still open.
- **`hours` cannot express a past-midnight close** — filed as `190/010`.
  `segments()` computes `end = base + close`, so `["16:30","03:00"]` **ends
  before it starts** and the venue would read closed all Friday night;
  `TIME_RE` also rejects `"24:00"`. Dragonfly is the corpus's **first**
  past-midnight venue (the previous latest close anywhere was 23:00 — the
  degenerate state `340/150` predicted). A `null` close is used: exactly right
  for the midnight closes, **knowingly understating Fri–Sat by three hours**.

📋 **Ownership deliberately NOT recorded** though ADR 0046 would permit it. The
store is empty, no screen reads it, and the owner's design rule is *don't write
an identifier the product doesn't need*. Permissible ≠ needed, on a public repo.

### 2. "The back-to-top arrow should appear the moment I start to scroll down"

🛑 **This reversed the owner's own Theme 29 fix, so it was put back to him with
the evidence before any code moved** — the ↑ had covered a dish price at
100% of its width. He was offered the straight revert and **declined it**,
taking *"show it on the way down AND move it clear"*. Both asks honoured.

**Zero occlusion, measured across all 8 sweep combinations.** The way past
`010`'s *"there is nowhere at 390 px that is not over the list"*: over the list
≠ over anything **of the reader's**. At every occluded position a clear resting
place existed a short move up the same column, so the control stays offered and
**steps aside**. Direction no longer decides anything.

🛑 **AND THE CHECK THAT GUARDED THIS WAS LYING — filed as `340/210`.**
CLAUDE.md, a roadmap item and an ADR all said `to_top_check` *"sweeps the whole
document in 37 px steps at two widths and two text sizes"* and cited **96 of 547
positions**. It sampled **five fixed depths at 390 px only**. Worse, its
down-scroll assertion read `showedWhileDescending.length === 0` — it asserted the
button was **NOT** shown descending, so **it was actively defending the
behaviour the owner was complaining about**. It now genuinely sweeps: 8
combinations, **3,452 positions, 64 assertions**. The historical 17.6% figure
cannot be reproduced and should stop being quoted.
🔑 The class: *a check's description is not evidence about the check*. Three
records quoted it forward; none opened the file.

### The stepper decision, taken at the close

🎯 **Put to the owner with the movement cost in front of him, and he took the
expensive side.** The dodge protected the ruling's list (price, dish name, ♥,
card name), which left the **＋/− order stepper** exposed — and the control is
now on screen for the whole of a downward read, so it could come to rest on a
stepper and own a tap that silently changes an order. He chose to protect it.

**Re-measured on the shipped configuration, not on the agent's prediction:**
`to_top_check` **64/64, occlusion still 0, dodge inside its travel limit in all
8 combinations.** Menu at 390 px now steps aside at **326 of 537** positions
(from 151) — the predicted figure, to the position — and 376 of 827 at 24 px
text. The home list is **132 of 183 and 172 of 374, identical to before**,
which is the evidence for the claim that cards carry no stepper rather than an
assertion of it. Menu at 1200 px steps aside 0 times of 495 and 681: that
layout has nothing to solve.
🚩 So the arrow floats above its corner for **more than half** of a downward
read on a phone. That is deliberate and was chosen with the number visible.

### An accidental improvement worth recording

`picks_check`'s known flake now reads `harness error: #settings-btn has no
clickable box` at **exit 2**, where `340/190` recorded it as a plain `Error` at
**exit 1 with no FAIL line**. ADR 0093 routed every tool's top-level catch
through `exitFromError()`, whose fallback is exit 2, so an *unclassified* throw
now lands there. **The third failure shape is gone; the flake is not** — and
the open question moves from "one tool's stray catch" to "what should
`exitFromError`'s fallback do with a geometry throw?". Item updated.

### Close evidence

✅ **CI green on `19715c1`** — `floor` and `CI`, all five jobs including
`menu data validates` (which exercises the new venue), `every screen boots` and
`service-worker version lockstep`.
🚀 **Deploy verified in production twice, not inferred from a push:**
`faves.pages.dev/data/restaurants/dragonfly.json` served 24 dishes and
`status: menu-complete`; `faves.pages.dev/sw.js` served
`SHELL 2026-09-07.7 / DATA 2026-09-07.3`.
Local: `node --test` 1158/0 · `test_tag_allergens` **20** cases · `validate` 57
files · `to_top_check` 64 · `boot_check` 24 · `focus_check` 16 ·
`filter_row_check` 25 · `distance_check` 19 · `note_check` 19 · `addon_check`
21 · all Python gates clean. No branch, worktree or PR open; no orphan Chromes.

### Still owed, and none of it takeable without the owner

- **`contains-fish` does not exist** (Theme 5 `010`, ruled 2026-08-16). Three
  fish dishes on this menu are silent about fish until it lands.
- **`190/010`** — past-midnight hours; Dragonfly's Fri–Sat is understated by
  three hours today.
- **`080/190`** — whether to re-sweep the other thirteen stubs, and softening
  `150`'s "the search is exhausted" sentence, which is load-bearing and wrong
  at least once.
- **`210/060`** — the ninth closure surface (sticky contact bar).
- **`340/200`** — what a load-starved `untilPresent` should do.
- **`340/190`(a)** — is a geometry throw a site claim or a harness claim?

