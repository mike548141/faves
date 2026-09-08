- [x] **27a — Rank a facet match above a text match** `[M][design]` — weight a
  hit on `cuisine`/`area` above one on `name`/`address`, so the six above still
  *appear* but sort below the venues that genuinely carry the property. Cheaper
  and less surprising than narrowing the haystack, which would lose real finds
  ("Charley Noble" is a fair answer to "Noble").

  ✅ **DELIVERED 2026-09-09 (session faves-o1)** — [ADR
  0106](../../decisions/0106-search-ranks-a-facet-match-above-a-text-match.md).
  A hit on `area` or `cuisine` is now a comparator key ABOVE the 1–4 text score
  in `search.js`. Measured on the corpus of that day, "Cafe" (8 places):

  | | before | after |
  |---|---|---|
  | 1 | groundup-cafe *(named + tagged)* | groundup-cafe |
  | 2 | **kc-cafe** *(Chinese/Malaysian)* | caffiend |
  | 3 | **satay-kingdom-cafe** *(Malaysian)* | gold-lining-cafe |
  | 4 | caffiend *(tagged Cafe)* | khandallah-trading-company |
  | 5 | gold-lining-cafe | new-chapter-cafe |
  | 6 | khandallah-trading-company | simmer |
  | 7 | new-chapter-cafe | **kc-cafe** |
  | 8 | simmer | **satay-kingdom-cafe** |

  "Bar" moved the same way — the four venues tagged `Bar` now lead, and Charley
  Noble Eatery & Bar follows instead of sitting second. `total` is unchanged in
  both: the haystack was not touched.

  🔎 **The README's "27a is now probably unnecessary" was tested, not assumed.**
  27b tells a reader who has already read a row why it is there; it cannot speak
  for the row they never scrolled to, and at `placeLimit` 6 two real cafés were
  never on screen at all. Saying which field matched and putting the better
  answer first are different jobs.
  🚩 **ADR 0068 did NOT deliver any of this** — that is the *home list* ranker
  (`ranking.js`), which search has never used; search results are not ordered by
  distance, hearts or hours at all. ADR 0105 does not interact either, for the
  same reason: no availability tier reaches this list.
  🔎 **Found, not fixed, and no item covers it:** because search never consults
  `ranking.js`, a permanently-closed venue sorts among the open ones in the
  search results exactly as it always has. Sibling item `030` reads like it
  covers this and does not — it fixed `rankVenues` and the "Open now" filter,
  both home-list surfaces. Left alone deliberately: ordering search by
  availability is a product decision, not a defect in 27a.
  🚩 **Consequence worth knowing:** where the facet group exceeds `placeLimit`,
  the name coincidences fall off the *visible* page (they stay in `total` and
  return at a higher limit). Recorded in the ADR rather than left to be found.
  🤔 **`vibe` was deliberately left out and the case for it is real** — owner's
  call, one line to add; reasoning in the ADR.

  Verified: 6 new unit tests in `tests/search.test.js` (48 pass) and 4 new
  assertions in `tools/focus_check.mjs` (20 pass), one of which REFUSES to grade
  a fixture that cannot show the difference. Break-probe — comparator key
  deleted: 2 unit tests and 1 browser assertion fail naming the behaviour,
  nothing else does.
