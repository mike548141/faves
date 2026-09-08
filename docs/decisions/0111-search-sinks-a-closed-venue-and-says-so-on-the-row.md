# 0111 — Search sinks a closed-down venue, and the row says so

**Status:** accepted
**Date:** 2026-09-09
**Delivers:** roadmap Theme 27 item `210/080`, filed 2026-09-09 while delivering
`010`
**Builds on:** [0106](0106-search-ranks-a-facet-match-above-a-text-match.md)
(the comparator-key shape this follows), [0023](0023-time-dimension-in-the-data.md)
(the lifecycle fold), and item `030`, which fixed the same blindness on the
*home list* in 2026-08-17

## Context

A venue's `lifecycle` can say it has shut — for a refit, or for good. Three
surfaces already honour that: the home card badges it (`closure-ui.js`), the
home ranker sinks it to availability tier 3, and the "Open now" filter
disqualifies it (item `030`). **Search honoured none of it**, because search has
never used `ranking.js` at all — it has its own comparator in `search.js`, which
is the same disconnection ADR 0106 found and fixed for facets.

Measured on this branch against the corpus of 2026-09-09, with Sushi Bi given a
`closed-permanently` event through the real `resolveRecord` fold and nothing
else changed:

```
"Japanese"  1. sushi-bi (CLOSED)  2. the-catch-sushi-bar  3. the-ramen-shop  4. tj-katsu
"Sushi"     1. sushi-bi (CLOSED)  2. the-catch-sushi-bar  3. tj-katsu
```

A shut shop led both lists. It is the top answer precisely *because* nothing in
search can see the one fact that disqualifies it.

🛑 **Sibling item `030` reads as though it covers this, and does not.** Both
surfaces it fixed are the home list. The session that delivered `010` mis-cited
it that way and corrected itself, which is why `080` exists as an item rather
than as a line on `030`. That near-miss was re-checked here rather than
inherited: `030`'s own delivery note names `rankVenues` and the "Open now"
filter, and neither is reachable from `search()`.

🔑 **Why it is more than tidying.** The person most likely to type a closed
venue's name is someone who used to go there. A wrong answer costs them a trip.

## Decision

**(1) A venue that has closed sorts below every trading one**, as a comparator
key *above* both ADR 0106's facet key and the 1–4 text score — same shape, same
reasoning: "have they shut?" is not a shade of relevance, so it cannot be a
number added into one. Places only. Order changes; nothing is dropped, and
`total` is unchanged.

It sits **above** the facet key, not beside it, because the item's requirement is
*last*, not *last within its class*: a shut café is a worse answer to "Cafe" than
an open place merely named one, since the reader can walk into the second.

**Both closure states demote**, exactly as `availabilityTier` returns 3 for
either. A refit and a permanent closure are one answer to "can you eat there?" —
which of the two it is, the row now states in words.

The test is `isTrading` from `temporal.js`, the function the home ranker already
uses, **not** a fresh `state === "closed-permanently"` written next to it.
Item `030`'s root cause was precisely a second, cheaper copy of this rule; two
copies of one rule both read correct in a diff.

**(2) The row says so**, by reusing `closureBadge` (`closure-ui.js`) unchanged —
the same node, words and colours the home card and the menu header already
carry. The screen ADR 0047 asks to be named is **the home screen's global search
results list** (`#search-groups`, the Places group). The badge goes *inside* the
row's `<a>`, like the badge on a home card, so the closure joins the link's
accessible name rather than sitting beside it as a separate object a screen
reader meets on its own.

No new visual design was invented and none was needed: `resultRow` grew one
optional `badge` node, and `app.css` was not touched at all.

## Alternatives rejected

**Excluding a closed venue from search.** The item names this as option (3) and
rejects it: it loses the reader who is checking whether their old local really
has gone — the exact reader this item exists for. Break-probed rather than
asserted: implementing exclusion fails 7 unit tests and 5 browser assertions,
two of which say *findable* in their names, so a future session that reaches for
it will be told.

**Demotion alone (option 1 without option 2).** Cheap and matches the home list,
but it answers a different question. Someone who types a shut venue's name and
finds it at the bottom of the list learns nothing except that the app ranked it
oddly. The label is what answers the question they arrived with.

**A `closed` flag written into `site/data/`.** There is nothing to write: the
lifecycle events already ship, and `resolveRecord` folds them to today's
`closure` before any record reaches `buildIndex`. The index entry carries that
folded object, so one fold answers both halves and the badge cannot disagree
with the demotion.

**Reading the closure in `ranking.js` instead.** Same answer ADR 0106 gave: that
module is the home-list ranker (ADR 0068) and search has never used it. Merging
them would give one module two unrelated comparators.

## Open, deliberately not decided here

**A DISH at a closed venue is untouched.** `rank()` takes the closure test as a
parameter and dishes are given none, so "Aaa Roll" still outranks "Bbb Roll" on
text alone even though its shop has shut. Whether a dish should sink with the
venue that served it is a product call nobody has been asked; the item's options
are all about the place row. One argument each way: a dish you cannot buy is as
useless as a shop you cannot enter, and a dish result already names its venue,
whose own row now carries the badge. Adding it is one argument at the `dishes:`
call.

**Whether a permanent closure should sink below a temporary one.** They share one
tier here, as they share tier 3 on the home list. `030` left exactly this open
for the owner, and this does not answer it either.

## Consequences

After, on the same corpus and the same fixture:

```
"Japanese"  1. the-catch-sushi-bar  2. the-ramen-shop  3. tj-katsu  4. sushi-bi (CLOSED)
"Sushi"     1. the-catch-sushi-bar  2. tj-katsu  3. sushi-bi (CLOSED)
```

🚩 **Where a query returns more matches than `placeLimit` (6), a closed venue can
now fall off the visible page** — the same consequence ADR 0106 recorded for name
coincidences, arriving for the same reason. It stays in `total` and returns at a
higher limit. This is the ranking working; it is also, for this class of row,
the outcome option (3) was rejected for, reached by a different route. Nobody has
ruled on whether that matters, and it is recorded rather than left to be found.

🛑 **The corpus still holds no closed venue** — 57 records, every one trading —
so nothing here can be seen by browsing the app. Item `030` shipped its half
unit-tested only for that reason. This one is browser-checked as well, in
`focus_check.mjs`, on fixtures built by ADR 0109's library
(`permanently-closed` and `temporarily-closed`, derived from Sushi Bi and The
Ramen Shop and served as overlay bytes from a second server) — which keeps the
fiction out of `site/data/`, where it would be precached to every phone, and
means the fixtures are already gated by the real `validate.py` in
`fixture_check.mjs`.

The library's `temporarily-closed` is deliberately **overdue**, so the row's
badge reads "Temporarily closed" with no return date — `closure-ui.js` drops a
promise the record can no longer support. That absence is asserted, not merely
unlooked-for. Nothing anywhere exercises the "· back 27 Aug" wording of a
temporary closure that is still in date; that was true before this change and
is still true after it.

**What a green run still cannot tell you:** whether a venue in the corpus has
*actually* closed. That is a fact about the world, kept current by a human
refreshing the record — and until one does, this whole feature is latent.
