# 0080 — A venue has *menus*, plural: the shape is recorded, the build is held

**Status:** Accepted. Records a schema shape that is deliberately **not built**.
Nothing in `site/data/` changes on this record. Supersedes nothing.

**Date:** 2026-08-16

## Context

The owner asked for the data model to be able to hold a venue with more than one
menu — *"seasonal (summer vs winter) or time of day (lunch vs dinner) … but they
could also be over lapping e.g. a brunch menu that runs all day, or different
menus for dine-in vs takeaway, or different areas of the restaurant"* — and was
explicit that the ask is **model-first**: *"Lets at least ensure the data model
supports all that … ensuring that future needs don't break the data model."*

He then ruled on the sequencing (2026-08-16): **hold the build, write the ADR
now.** No venue in the corpus has two menus, so building `menus[]` would ship a
schema nothing exercises — a thing this repo has learned to distrust. The shape
gets recorded while the industry survey behind it is fresh.

**This record exists because a survey is perishable and a roadmap is not a
contract.** ROADMAP Theme 30 carries the survey in full — Square, Toast, Uber
Eats, Deliveroo, DoorDash, Oracle Simphony, Lightspeed, Google's menu feed,
schema.org. What the roadmap cannot do is bind: a future session reads a roadmap
as a to-do list and an ADR as a decision. The distinction matters here more than
usual, because the honest state of this shape is *"designed, never tested against
a real venue"*, and that sentence has to survive into the session that finally
builds it.

### The measurement that amends the roadmap's own framing

Theme 30 sequences the whole theme behind **30a (`menus[]`)** on the grounds that
"everything else attaches to a menu entity that does not yet exist", and holds
30a because nothing exercises it. The first clause is true of the *containers*.
It is **not** true of the pricing half, and the corpus says so.

Measured 2026-08-16 across the 55 records in `site/data/restaurants/`: **152 dish
rows in 13 venues carry a price inside a `desc` string** — a price with nowhere
structured to live.

The directly comparable figure first, because it is the one that moves.
Theme 28 reported **81 rows in 5 venues** for the size dimension and read it as
"overwhelmingly a *drinks* problem". Counting the same thing — a row whose desc
prices a different size or quantity of the same dish — gives **122 rows in 10
venues**. The "drinks" half of the read is right (wine, beer pours and coffee
sizes dominate, and 106 of the 122 sit in four pub/bar records). The *extent* is
not: the corpus has moved from 48 records to 55 since that count, and the
dimension reaches half again as many rows and twice as many venues.

Classified by what the second price actually varies with. **The axes overlap and
do not sum to 152** — a row may price both a measure and a size ("Larger pour
$28.00"), and 42 rows match no axis pattern at all, which is how the third row
of this table was found:

| Axis | Rows | Note |
|---|---|---|
| Named size (small/large/glass/bottle/jug) | 70 | the drinks half — real, and the largest |
| Measured size (`230g`, `330ml`) | 19 | |
| **Dietary substitution at a price** | **19** in 7 venues | **not named anywhere in Theme 28 or 30** |
| Count / quantity (`1 scoop`/`2 scoop`, `6 for`/`12 for`, `single`/`double`) | 12 | not a named-size ladder; a shape that only holds `small`/`large` cannot hold it |
| Add-on in prose (`Add gravy $3`) | 10 | Theme **14b**'s territory, in the same field |
| Per-person (`Min 2 people, $16/head`) | 8 | Theme 30's own table records this as *"Not yet"*. It is here, in `rock-yard-restaurant` |
| Upgrade / swap / removal (`without drink $12.00`) | 3 | |

Three consequences, each of which changes what should be built and in what order:

1. **Price-as-resolution-over-context is exercised today; `menus[]` is not.** The
   two are one theme in the roadmap and they are in opposite evidential states.
   The reason to hold 30a does not reach the pricing primitive.
2. **Themes 14b and 28b are reading the same field with no shared classifier.**
   An add-on price and a size price are both "a `$` in a `desc`", and the two
   themes were sized independently off overlapping counts. Whatever separates
   them has to be one classifier, not two regexes written a month apart.
3. 🚩 **The dietary-substitution axis was invisible to both themes, and the
   vocabulary already half-knows about it.** 17 of those 19 rows carry the
   `gf-option` tag, which `dietary.js:30` already treats as satisfying the
   gluten-free claim — so the dish correctly *shows* for a reader who needs GF.
   What has nowhere to live is the option's **price**. A coeliac reader sees
   Southern Cross's Cheeseburger at its milk-bun price and is told "GF option";
   the gluten-free bun is `+$2.50` and the screen cannot say so. That is a price
   the app understates for precisely the readers who have no choice about paying
   it. It is not a safety defect — the filtering is right — and it should not be
   dressed as one; it is an accuracy defect with a captive audience.

## Decision

**1. The three convergences are adopted as constraints on any future shape, and
they are the durable part of this record.** Every serious commercial menu schema
surveyed lands on the same three, and each is a decision our tree cannot make:

- **Flat entity pools joined by id, not nested containment.** A dish is an entity
  in the venue's catalogue; a menu is an *ordered list of references*. Deliveroo
  tells partners outright to avoid duplicating items across mealtimes. [ADR 0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md)'s
  `dishId` is exactly the primitive that makes this possible, and it already
  landed.
- **Price is a resolution over context, not a scalar on a dish.** Toast's
  `pricingStrategy` is the best enumeration of why (`MENU_SPECIFIC_PRICE`,
  `TIME_SPECIFIC_PRICE`, `SIZE_PRICE`, `SEQUENCE_PRICE`, `OPEN_PRICE`); Uber Eats
  and Deliveroo both spell it `price_info.overrides[]` with a `context_type`.
- **Availability is a priority-ordered rule set with first-match-wins, not a
  boolean and not a non-overlap constraint.**

**2. Overlap is allowed and resolved by explicit priority.** This is the owner's
"all-day brunch menu" case, and the survey settles it against the tidier model.
Deliveroo *forbids* overlapping mealtimes — tenable only for a delivery-only
catalogue. Oracle Simphony, on thirty years of real hospitality, allows overlap
and resolves it by explicit priority, first match wins. **The owner's instinct is
right and the tidier model is the wrong one.** Every availability rule carries a
`priority`; validation must never "fix" an overlap.

**3. The candidate shape is recorded as a candidate.** `menus[]` sits as an
optional layer above today's `menu[]`, which becomes sugar for "one unnamed
menu"; absent `menus` means today's behaviour exactly, and a record carrying both
is refused. A menu carries `id`, `name`, `kind`, `available[]` (each rule with a
`priority`) and `sections[]`. A dish appearing on a second menu carries
`{ dishId, price }` — a reference, not a copy. Per-branch follows Square's two
modes (`present_at_all_locations` **plus** `absent_at_location_ids`, because an
allow-list does not scale to a 400-store chain). Non-dish charges are
`{kind, amount|percent, basis, mandatory, refusable, disclosure}` with `kind` as
**data, not a hard-coded word** — Italy's Lazio region bans a line labelled
`coperto`, so venues charge `pane` instead. Full JSON in ROADMAP Theme 30.

**4. The admission test, which is the operative half of this record.** The
🔑 **And the test has already been run once, against this record, and one of the
four passed.** Written first as *"`channel` waits for a venue with two channel
prices"* — then found, the same day, by re-testing an unrelated stale premise:
`pizza-pomodoro` sells `Margherita - Large` at **$29.00** and `Large Margherita
(Online Deal)` at **$17.00**, desc *"Online ordering special price."* A 41%
spread on identical ingredients, in one section of one file, distinguished only
by a parenthetical in the dish **name**. `pizza-hut` carries the same shape in
five `Meal Deals` rows named *"…Delivered"*. So **`channel`'s admission test is
MET and the others are not** — which is exactly the discrimination Decision 4
exists to make, and it separated the four on its first use rather than on some
future session's. Note the encoding: the channel is in the *name*, which is the
pattern [ADR 0057](0057-a-section-heading-is-a-name-not-a-sentence.md) spent a
whole theme removing from section headings. Note also that this makes it a
`dishId` question — `large-margherita-online-deal` and `margherita-large` are two
ids for one dish in two channels.

⚖️ **And the negative result, checked rather than assumed, because the obvious
next worry is wrong:** the duplicate rows do **not** distort the venue's price
band. `price.js` takes the median of priced items, and `pizza-pomodoro`'s median
is **$14.50 with the two Online Deal rows and $14.50 without** — 83 rows versus
81, and a median is robust to two. So this is a *modelling* defect, not a live
reader-facing one, and it must not be argued as if a reader is currently being
misled. What a reader sees today is two plausible menu rows for one pizza, which
is untidy and true.

The general form. The
candidate shape may not be built until a **real venue in the corpus exercises the
container being built**, and the session that builds it must re-derive the shape
against that venue rather than transcribe this ADR. Concretely: `menus[]` waits
for a venue with two menus. `channel` **no longer waits — see above.**
`charges[]` waits for a non-NZ venue. Per-branch overrides wait for a chain with
a genuinely per-branch menu. **A shape recorded before its first instance is a
hypothesis, and this ADR is the hypothesis written down — not its confirmation.**

**5. The pricing primitive is exempt from the hold, because it is exercised.**
152 rows in 13 venues are the instance. This does not authorise building it —
what it authorises is that 28b may be designed and built on its own evidence
without waiting for `menus[]`, and that its context axis must be **open-ended
data** (`size` · `diet-substitution` · `quantity` · `channel` · `per-person`)
rather than a closed enum copied from Toast, because the corpus already exhibits
six axes and Toast's enum names three of them.

## Rejected

**Building 30a now against an invented two-menu venue.** The shape would earn its
keep immediately and the survey would be tested rather than filed. It loses
because the venue would be ours, not a shop's — and this repo's standing rule is
that menu content is owner-supplied or owner-directed, never invented. A schema
validated against fabricated data is validated against the schema author.

**Recording the JSON and nothing else.** The shortest possible discharge of the
owner's instruction, and the one a roadmap-to-ADR transcription produces. It
fails on the thing this record is most for: a future session would read a
committed ADR with concrete JSON as settled, and implement it verbatim against
the first two-menu venue that arrives — reproducing exactly the "ship a schema
nothing exercises" failure one level up, with an accepted ADR as its warrant.
Decision 4 exists to make that impossible to do accidentally.

**Deferring the whole theme, pricing included, until a two-menu venue arrives.**
The literal reading of the sequencing ruling. It loses to the measurement: the
"nothing exercises it" premise is false for the pricing half, and holding work
whose premise has been falsified is how a hold becomes a habit.

**Validating overlapping availability away.** Tidy, cheap, and what Deliveroo
does. It would make the owner's own stated case — an all-day brunch menu running
alongside lunch — unrepresentable, which is the one case he named twice.

## Consequences

**Theme 30's sequencing changes.** 30a is no longer "the keystone everything
attaches to" for scheduling purposes; it is the keystone for the *containers*
(30c `kind`, 30e per-branch, 30f charges), all of which stay held with it. 30b
(dish reference not copy) is a rule about how a second appearance is written and
survives independently. The pricing work moves to Theme 28b's evidence.

**Themes 14b and 28b acquire a shared dependency they did not have.** Neither can
be sized honestly until one classifier separates the 152 rows, because their
published counts were measured over an overlapping set. Building two pattern
matchers is how the corpus acquired its allergen inconsistency ([ADR 0024](0024-derived-allergen-tags.md)'s
lesson) and it is the same mistake with prices.

**A new roadmap item exists that neither theme carried:** the dietary-substitution
price. 19 rows, 7 venues, tag already present, price homeless.

**`available` cannot express a time of day, and this record does not fix it.**
Theme 28c is the clean defect underneath all of this: `available` takes dates and
seasons only, so *"Mon–Fri 11:30–17:30"* is inexpressible today and lives in
section headings as prose. Decision 1's third convergence — availability as a
priority-ordered rule set — is the shape 28c should be built into, so that the
venue-level and menu-level machinery are one thing rather than two.

**The cuisine axis is a LABELLING job, not a relocation — and the obvious fix
would have broken the filter.** ROADMAP Theme 30 names `cuisine[]` as our "one
genuine ontology weakness" because it mixes origin ("Malaysian") with dish form
("Burgers"), and the natural reading is *move the wrong values out*. Measured by
the faves-cook2 session across 55 venues — 41 distinct values, 88 taggings — a
third category nobody named dominates: **11 values are venue FORMAT** (Bakery,
Bar, Cafe, Deli, Gastropub, Pub, Steakhouse…) carrying **32 taggings**, and
**22 of 55 venues carry only format words**. The two most-used facet values in
the whole corpus, `Gastropub` (10) and `Cafe` (6), are both format. So stripping
them out to tidy the taxonomy would gut the home screen's most-used filter
values. **Give each value an axis and leave it where it is**: cost ≈ 0, versus
cost ≈ the filter. Recorded here because the tidy instinct is the wrong one and
a future session will have it again.

**The worked example of this record's governing principle, which it otherwise
argues in the abstract: `vibe`.** Verified 2026-08-16 — `grep -rn vibe site/js
site/*.html site/css` returns **nothing**, while
[ARCHITECTURE.md](../ARCHITECTURE.md) describes it as *"free-form chips shown on
cards"*. **20 venues carry it, 574 bytes, precached to every phone, rendered by
no screen** — `app.js` builds `chip-price` and `chip-cuisine` and stops. It
predates [ADR 0047](0047-the-app-ships-only-what-it-renders.md), so it is
inherited debt rather than a breach, and at 574 bytes it is a *principle*
problem, not a performance one.

⚠️ **But it is a MISSING RENDER, not a dead field, and this record must not be
read as arguing for deletion.** The faves-cook2 session made the correction and
it is the right one: the design was specified, ratified into `ARCHITECTURE.md`,
and the code never caught up. Deleting satisfies ADR 0047 in the cheapest way
and destroys 38 taggings of real signal across 20 venues that no other field
carries — `dog friendly`, `byo`, `garden bar`, `live sport`, `Wellington icon`.
🎯 **Which way it goes is the owner's call, not a doctrine call**, and
`0077-style-of-dining-is-not-the-cuisine-axis-work.md` deliberately
records it without resolving it. <!-- linkscan:allow: 0077 landed on main after
this branch was cut; converted to an inline link when this merges -->
 What this record takes from it is narrower and
survives either ruling: **a field can pass every gate for months while the
screen it was added for does not exist**, which is exactly the gap Decision 4's
admission test is aimed at. If it is rendered rather than removed, note
`validate.py` has **no vocabulary check on `vibe`** and the corpus already holds
five strings for one idea (`quick` · `quick-eats` · `quick-lunch` ·
`grab-and-go` · `counter-order`) — free text becomes visible inconsistency on
day one.

**Nothing ships.** `site/data/` is unchanged, no payload grows, and
[ADR 0047](0047-the-app-ships-only-what-it-renders.md) is
untouched — which is the point of recording a shape rather than building one.

**Every number in this record has a shelf life, and that is the generalisable
finding.** Theme 28's counts were measured across 48 records and are quoted as
current at 55. Its *"there are no discounts in the corpus at all"* is still true
against its own stated word list — no "% off", no "happy hour", no "senior" —
and false in substance, because `satay-kingdom-cafe` prints *"(Save $2.50)"* and
the Online Deal rows above are a channel discount under another name. The
faves-38 session, closing stale counts of its own the same day, named the
mechanism better than "true on its word list, false in substance" does:
🔑 **a measurement that names its own method expires when the corpus grows, and
nothing tells you.** The method was stated, the scope was never restated, and
the number went on looking authoritative. It caught this session too — the ADR
ceiling measured at 0075 was stale within ten minutes. **So the counts above are
dated deliberately, and a session acting on them should re-run them, not cite
them.**

## What this record does not establish

**That the shape is right.** It is a survey conclusion and an industry consensus,
tested against no venue we hold. Every number above is a measurement of *our*
corpus; every structural claim is a reading of *someone else's* schema. The two
have not met, and Decision 4 is the promise that they will before any of it is
built.
