# Theme 27 — Search ranking: a name match is not a cuisine match (2026-08-16)

<!-- Numbered 27 after `grep '^## Theme' docs/ROADMAP.md`; 25 and 26 were taken
     by parallel sessions on the same day. Re-check at merge, not at write. -->

🔎 **A measurement, not a hunch.** Comparing, for every one of the 51 cuisines
and areas in the corpus, the venues `applyFilters` returns against the venues
`search()` returns for the same word: the two agree exactly on **45**, and on
the other **6 search never misses — it adds**. The haystack includes name,
address, city, service and phone as well as cuisine, so:

| Search for | Also returns | Because |
|---|---|---|
| "Pub" | 6 places, **5 of them not pubs** | the name contains "Pub" |
| "Bar" | 1841 Bar & Restaurant, Charley Noble, Southern Cross, The Catch Sushi Bar | the name contains "Bar" |
| "Cafe" | KC Cafe, Satay Kingdom Cafe — neither tagged Cafe | the name contains "Cafe" |
| "Courtenay Place" | Dragonfly, Regal Chinese, The Catch Sushi Bar | the address contains it |

**This is not a bug, and that is the point of recording it.** A wide haystack is
correct for free text — you typed "Pub", and a place called The Pub is a fair
hit. The question is one of **ranking, not matching**: today a venue that *is*
Malaysian and a venue merely *named* "…Malaysian" are indistinguishable in the
result list, so the reader cannot tell a property match from a spelling
coincidence. [ADR 0050](../../decisions/0050-a-facet-link-filters-the-list-rather-than-searching.md)
records why this kept the facet links off search; it did not settle what search
itself should do.

✅ **27b — Say which field matched — SHIPPED 2026-08-16** (`80da634`). `search()`
now returns `matchField` (which field answered the query) and `matchText` (the
literal substring, correct casing, when that field is one the row displays). A
visible field gets a `<mark>` in the name or sub; a field the row never shows —
address, city, phone, service, a dish's description — gets plain text saying so
("Matched: address"). A hit is never left with no stated reason, and never claims
a property it did not match. Bold as well as background, so it never depends on
colour; the wrapped word is already inside the announced name, so a screen reader
hears identical text either way.
⚠️ **27a is now probably unnecessary, which was the point of trying 27b first** —
but that is a judgement to make against the running app, not from here.
🔎 **This item's own measurement has already gone stale.** Re-running the
roadmap's four queries in a real browser at 390 px: "Bar" reproduced its four
cited venues exactly, and "Courtenay Place" its three plus two more — but **"Pub"
no longer returns 6 places with 5 name-coincidences**, because the corpus has
moved since that measurement was taken. The mechanism handled it correctly
regardless. Treat every count in this file as of its stated date.

- **Owner steer, 2026-08-16:** recorded, not scheduled — *"roadmap it, don't fix
  now"*. Nothing here is blocking; it surfaced while measuring something else.
