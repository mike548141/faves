# 0106 — Search ranks a facet match above a text match

**Status:** accepted
**Date:** 2026-09-09
**Delivers:** roadmap Theme 27 item `210/010` (27a), raised 2026-08-16
**Builds on:** [0050](0050-a-facet-link-filters-the-list-rather-than-searching.md)
(why facet links filter rather than search), and Theme 27b, which shipped
`matchField`/`matchText` on 2026-08-16

## Context

Search's haystack for a place is wide on purpose — name, area, cuisine,
address, city, service, phone and vibe. ADR 0050 measured what that buys and
what it costs: across all 51 cuisines and areas in the corpus, search never
*misses* a venue the facet filter finds; on six facets it **adds** venues whose
name or address merely contains the word.

That is correct matching and the wrong order. Measured on this branch against
the corpus of 2026-09-09, before this change:

```
"Cafe" — 8 places
 1. groundup-cafe        (named Cafe, tagged Cafe)
 2. kc-cafe              (named Cafe, tagged Chinese/Malaysian)
 3. satay-kingdom-cafe   (named Cafe, tagged Malaysian/Indonesian)
 4. caffiend             (tagged Cafe)
 5. gold-lining-cafe     (tagged Cafe)
 6. khandallah-trading-company (tagged Gastropub/Cafe)
```

Two venues that are not cafés outranked four that are, and the default
`placeLimit` of 6 meant two real cafés (New Chapter, Simmer) never reached the
screen at all. "Bar" had the same shape: Charley Noble Eatery & Bar, a
grill/steakhouse, sat second, above all four venues tagged `Bar`.

**27b was tried first, deliberately, and it is not sufficient.** The roadmap
README says 27a is "probably unnecessary" once every row states which field
answered the query, "but that is a judgement to make against the running app".
Made against the running app: 27b tells a reader who has already read a row
*why* it is there. It cannot tell them about the row they never scrolled to,
and it does not stop a spelling coincidence occupying the top of a list that
gets cut at six. Saying which field matched and putting the better answer first
are different jobs.

## Decision

**A hit on `area` or `cuisine` sorts above a hit on any other field**, as a
comparator key *above* the existing 1–4 text score rather than a bonus folded
into it. Places only. Order changes; nothing is dropped.

Those two fields, and no others, because they are what the app already treats
as properties rather than prose: they are what the venue's sub-line states,
what the facet links filter the browse list by (ADR 0050), and the only two a
reader can also arrive at from a control instead of by typing. A hit there is
the venue saying "I am this"; a hit in a name or an address is a string that
happens to contain the word.

The facet test is computed **independently of `matchField`**. `matchField`
reports the *first* field it finds, in the order a row could display it, so it
calls Groundup Cafe a name match — and an implementation that read the facet
off it would demote the one venue in the corpus that is both named for the
property and tagged with it. Both planes of test pin that case.

## Alternatives rejected

**Narrowing the haystack** — the item rejected this when it was written and the
reasoning holds: *"Charley Noble is a fair answer to 'Noble'"*. Narrowing
converts an ordering problem into a recall problem, and ADR 0050's measurement
says the recall is currently perfect. Both the unit tests and `focus_check`
carry an assertion that a name coincidence is still findable, so a future
session that narrows instead will fail rather than merely differ.

**A numeric bonus added to `score()`.** A bonus small enough to leave the two
classes interleaved does not settle the question this item exists to settle;
one big enough to dominate the 1–4 scale *is* a leading key with an arbitrary
number in it. Measured on the corpus, `+2` left Khandallah Trading Company
(tagged Cafe) below KC Cafe (not a café) while lifting Caffiend above it — the
same defect, applied unevenly, which is worse than applying it consistently.

**Putting this in `ranking.js`.** That module is the *home list* ranker and its
header says the home list has one ranking (ADR 0068). Search has never used it
— search results are not ordered by distance, hearts or opening hours at all —
and merging the two would give one module two unrelated comparators. `search.js`
is already pure and unit-tested, which is what "put it somewhere testable"
was asking for.

## Open, deliberately not decided here

**`vibe` is not a facet under this rule, and the case for including it is
real.** It is a closed vocabulary resolved through `vibesFor`, exactly like the
other two, so a venue tagged `garden-bar` arguably *does* carry "bar". But the
keys are hyphenated compounds and the match is a substring, so "Bar" hits
`garden-bar` and would promote Dragonfly — an Asian restaurant with a garden
bar — above Charley Noble Eatery & Bar as though it were a bar. The item names
`cuisine` and `area`; extending it to a third field is a product call the owner
has not made, and inventing one here is the overreach CLAUDE.md warns about.
Adding it later is one line in `placeFacetHit`.

## Consequences

After, on the same corpus and the same day:

```
"Cafe" — 8 places (unchanged total)
 1. groundup-cafe   2. caffiend   3. gold-lining-cafe
 4. khandallah-trading-company   5. new-chapter-cafe   6. simmer
 7. kc-cafe   8. satay-kingdom-cafe
```

🚩 **Where the facet group is larger than `placeLimit`, the name coincidences
fall off the visible page.** For "Cafe" that is exactly what happened: six
tagged cafés fill the six slots and KC Cafe is now reachable only by widening
the limit. This is the ranking working rather than the haystack narrowing —
`total` still says 8, and both venues are still in `items` at a higher limit —
but it is a real behavioural change and not what a fast reading of "they still
appear" would predict, so it is recorded rather than left to be discovered.

Dishes are untouched: `rank()` takes the facet test as a parameter and dishes
are given none, because nothing a dish carries is a property in this sense.

The suggestions combobox needed no change and got none. It exists only on the
menu screen (`menu.js` → `suggest-ui.js`) and offers dietary words, Favourites
and dish names from that one venue — it has no place, cuisine or area rows at
all, so there is no facet-versus-name ordering there to disagree with this one.
Recorded because "a value chosen on one screen and consumed on another" is a
failure class this repo has already paid for; here the second screen does not
exist yet, and this note is what the session that builds it should read first.
