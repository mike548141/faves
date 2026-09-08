- [x] 🔎 **Search ignores lifecycle closure entirely, and no item covered it
      until now** `[S][js]` — found 2026-09-09 (session faves-o1) while
      delivering `010`, and filed rather than folded in.

  ✅ **DELIVERED 2026-09-09 (session faves-3b)** — the filing session's
  recommendation, **(1) demote + (2) label**;
  [ADR 0111](../../decisions/0111-search-sinks-a-closed-venue-and-says-so-on-the-row.md).
  `SHELL_VERSION` → `2026-09-09.3`.

  🔎 **The item's account survives measurement, and here is the measurement.**
  Sushi Bi given a `closed-permanently` event through the real `resolveRecord`
  fold, nothing else changed, corpus of 2026-09-09:

  | query | before | after |
  |---|---|---|
  | "Japanese" | **sushi-bi (CLOSED)** > the-catch-sushi-bar > the-ramen-shop > tj-katsu | the-catch-sushi-bar > the-ramen-shop > tj-katsu > **sushi-bi** |
  | "Sushi" | **sushi-bi (CLOSED)** > the-catch-sushi-bar > tj-katsu | the-catch-sushi-bar > tj-katsu > **sushi-bi** |

  A shut shop led both lists — top *because* nothing in search could see the one
  fact that disqualifies it. `total` is unchanged in both: nothing was dropped.

  ✅ **And `030` really does not cover it**, checked rather than repeated:
  `030`'s own delivery note names `rankVenues` and the "Open now" filter, and
  neither is reachable from `search()`. The blindness was total, not partial.

  **Built.** (1) A closed key in `search.js` ABOVE ADR 0106's facet key and the
  1–4 text score — last, not last-within-its-class. It reads `isTrading` from
  `temporal.js`, the function the home ranker already uses, because `030`'s root
  cause was a second cheaper copy of that rule. Both closure states demote, as
  `availabilityTier` treats both. (2) The row reuses `closureBadge`
  (`closure-ui.js`) unchanged — same node, words and colours as the card and the
  menu header — placed INSIDE the row's `<a>` so the closure joins the link's
  accessible name. `resultRow` grew one optional `badge` node; **`app.css` was
  not touched at all**, so no new visual design was invented and none was needed.

  **Verified.** 8 new unit tests in `tests/search.test.js` (56 pass, 1297 in the
  suite) and 6 new assertions in `tools/focus_check.mjs` (26 pass), whose
  fixtures are ADR 0109's library states served as overlay bytes from a SECOND
  server — the 27a assertions above them must keep reading the real corpus.
  Break-probed, each failing on its own bug and nothing else: the closed key
  deleted (4 unit + 1 browser); the badge dropped (2 browser); the badge moved
  OUTSIDE the link (the same 2 — the accessibility placement is pinned); a badge
  on every row (the absence assertion alone); `closure` dropped from the index
  entry (6 unit); a fixture that cannot show the difference (the refusal alone);
  and closed venues EXCLUDED instead of demoted — option (3) — which fails 7
  unit tests and 5 browser assertions, two naming *findable*.

  🔎 **One probe failed to fail, and the test was weakened to match.** Wiring
  the closure test into the *dishes* call changed nothing — a dish entry carries
  no `closure` for it to read — so "dishes are untouched" could not have caught
  the leak it is named for. The structural fact is now pinned instead (a dish
  entry carries no closure), which does fail when probed.

  🛑 **NOT done, and deliberately.** A DISH at a closed venue is untouched: its
  ranking is text-only, exactly as before. Whether a dish should sink with the
  shop that served it is a product call nobody has been asked; the item's own
  options are all about the place row. Recorded as open in ADR 0111 — one
  argument at the `dishes:` call if the owner wants it.
  🛑 **Also NOT decided:** whether a permanent closure should sink BELOW a
  temporary one. They share one tier here, as they share tier 3 on the home
  list, and `030` left exactly this question open.
  🚩 **New consequence, nobody has ruled on it:** where a query returns more
  than `placeLimit` (6) matches, a closed venue can now fall off the *visible*
  page — ADR 0106's consequence arriving by the same route, and for this class of
  row it reaches option (3)'s outcome by accident. It stays in `total`.
  🛑 **Still latent in the corpus** — 57 records, every one trading — so none of
  this can be seen by browsing the app, and no green run says a shop is still
  open. That is a fact about the world, kept current by a human.

  **The fact.** A venue's `lifecycle` can say it has closed. The home list
  honours that — `030` fixed `rankVenues` and the *Open now* filter. **Search
  does not**, because search does not use that ranker at all: it has its own
  `score()` in `site/js/search.js`, which is the same disconnection `010` found
  and fixed for facets. So a closed venue is returned by a search exactly as a
  trading one is.

  🛑 **Sibling item `030` reads as if it covers this and does not.** Both
  surfaces it fixed — the ranker and the filter — are the **home list**. The
  delivering agent initially mis-cited `030` as covering search and corrected
  its own note. That near-miss is the reason this is a separate item rather
  than a line on `030`: an item whose title sounds wider than its delivery is
  how a gap survives two readings.

  🔑 **Why it matters more than a tidy-up.** Search is how someone looks for a
  place by name. The person most likely to type a closed venue's name is
  someone who used to go there — the exact reader for whom a wrong answer costs
  a trip.

  📋 **Options.** (1) Rank a closed venue last in search, the way the home list
  does, keeping it findable — consistent with `010`'s own principle that a
  match still *appears* and sorts below. (2) Say it on the row: a closed venue
  is returned with its state visible, which is more information than a demotion
  and needs a rendered treatment. (3) Exclude it, which loses the reader who is
  checking whether their old local really has gone. Recommendation: **(1) plus
  (2)** — the demotion is the cheap half and matches what already ships on the
  home list, and the label is what actually answers the question the reader
  came with.
