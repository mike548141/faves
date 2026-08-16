# 0050 — A facet link filters the list rather than searching for the word

**Status:** accepted
**Date:** 2026-08-16
**Relates to:** the search haystack this measures against, which has no ADR of
its own — the decision lives as a code comment at the top of
[`site/js/search.js`](../../site/js/search.js) ("cuisine is already free text in
the haystack", so no synonym table)

## Context

A venue's subheading — "Asian · Malaysian · Noodles — Johnsonville" — links each
facet to the home list filtered to it (`index.html?cuisine=Malaysian`,
`?area=Johnsonville`; `filters.js` owns both ends). The owner then asked for
those links to open the **search screen** with the word prefilled instead:

> *"Why can't clicking on something like Malaysian in the sub heading of a
> restaurant page take me to the search page that the user is used to seeing and
> using, and has a simple way back to home / normal?"*

The reason behind the ask was sound, and it named a real defect: the filtered
browse list had **no way out**. Every other filter on that screen is pressed on
that screen, so the control you pressed is the control you un-press. A cuisine
arriving in the URL was chosen on a *different page* — you land on a narrowed
list having touched nothing here, and the only undo was a `<select>` in the
sticky bar at the far end of the page, which reads as furniture rather than as
the thing currently doing this to the list. The search screen has always carried
a ✕ on its query for exactly this reason. Browse carried nothing.

## Decision

**Facet links keep pointing at the filtered browse list.** The missing escape
was built instead: an active area/cuisine filter renders as a dismissible chip
beside the place count, and one tap clears the state, the `<select>` and the URL
parameter together.

## Why not route to search

Because search answers a **different question** than the link promises, and the
difference was measured rather than argued. Comparing, for every cuisine and
every area in the corpus, the set of venues `applyFilters` returns against the
set `search()` returns for the same word:

| | |
|---|---|
| Facets where the two agree exactly | **45 of 51** |
| Facets where they differ | **6** |
| Facets where search *misses* a venue the filter finds | **0** |

Search never under-matches — it **over**-matches, because the haystack includes
name, address, city, service and phone as well as cuisine (ADR 0025, by
design and correctly so for free text):

| Facet | Filter finds | Search also adds | Why |
|---|---|---|---|
| Bar | 3 | 1841 Bar & Restaurant, Charley Noble, Southern Cross, The Catch Sushi Bar | name contains "Bar" |
| Pub | 1 | 5 more — so 6 results, 5 not pubs | name contains "Pub" |
| Cafe | 5 | KC Cafe, Satay Kingdom Cafe | name contains "Cafe"; neither is tagged Cafe |
| Grill | 1 | Wellington Kebab Grill | name contains "Grill" |
| Courtenay Place | 1 | Dragonfly, Regal Chinese, The Catch Sushi Bar | address contains it |
| Te Aro | 25 | KC Cafe | address contains it |

A link that reads "Cafe" and returns two places that are not cafés has broken
the only promise it makes. The owner's original ask was explicitly *"all
restaurants that serve Malaysian cuisine"* — a facet question. "Malaysian"
happens to be one of the 45 that agree, which is why the search route looked
sound from the single example that prompted it.

**The general principle:** a link that names a *property* must return the set
that has that property. Free-text search is the right tool when the reader is
guessing at a word; it is the wrong tool when the app already knows exactly
which venues carry the facet, because it can only add noise to a set it already
has exactly.

## Owner ruling

Presented with the measurement, the owner ruled on 2026-08-16: **keep it as is**,
and keep the option documented in case he changes his mind. This record is that
option, kept deliberately open rather than closed off.

## If we do switch later

The change is genuinely small, and it is written down here so a future session
does not have to re-derive it:

1. `filterHref()` in [`site/js/filters.js`](../../site/js/filters.js) returns
   `index.html?q=<value>` instead of `?cuisine=`/`?area=`.
2. `wireSearch()` in [`site/js/app.js`](../../site/js/app.js) reads `?q=` on load,
   fills `#search-input`, and calls its existing `renderResults`. The search
   view already owns its own clear affordance, so the active-filter chip becomes
   dead code on that path — delete it rather than leave two escapes.
3. `filtersFromQuery()` and the chip stay only if the dropdowns keep writing the
   URL; if not, remove both and their tests.
4. The two `boot_check.mjs` cross-screen assertions change target: they must then
   assert the *search* view rendered with the term, not that the list filtered.

**What switching costs, so the trade is not re-litigated from memory:** the six
facets above start over-matching, and the venue subheading stops being able to
promise what it names. Accept that knowingly or not at all.

## Consequences

- The subheading link and the home list agree exactly, for every facet, forever
  — the property is the filter, so it cannot drift from the label.
- Browse gains the escape it was missing, which also serves readers who set a
  filter from the dropdowns and then forget it is on.
- Search's over-matching is left untouched and is **not** a defect of this
  decision — it is correct behaviour for free text. Recorded separately as a
  search-ranking question in the roadmap.
