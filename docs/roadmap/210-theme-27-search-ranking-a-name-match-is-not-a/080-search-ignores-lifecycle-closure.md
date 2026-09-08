- [ ] 🔎 **Search ignores lifecycle closure entirely, and no item covered it
      until now** `[S][js]` — found 2026-09-09 (session faves-o1) while
      delivering `010`, and filed rather than folded in.

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
