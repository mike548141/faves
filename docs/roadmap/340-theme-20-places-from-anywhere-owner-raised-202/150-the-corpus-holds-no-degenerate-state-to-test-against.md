- [ ] 🔎 **The corpus is uniformly healthy, so a whole class of behaviour ships
      unexercised** `[M][tools]` — found 2026-08-19 while shipping the branch
      card's closure precedence.

  **Measured:** all **55** files in `site/data/restaurants/` carry
  `lifecycle: {added: …}` and **not one** carries a `lifecycle.events` entry.
  `grep -rl "closed-permanently\|closed-temporarily" site/data/` returns
  nothing. So there is no closed venue, and by extension no temporary closure
  and no overdue reopening, anywhere in the shipped data — the branch card's
  behaviour for a shut-down chain could not be asserted against any real file,
  and the guard that was supposed to cover it had been **certifying the wreck**
  instead (it passed *"the lead is not a branch we know is closed"* on a
  permanently-closed chain).

  **What was done about it, once:** `startServer` gained an optional `overlay`
  (pathname → bytes) so a check can serve a fixture venue over one HTTP GET
  while the rest of the tree stays real. The two alternatives were both worse —
  inventing a closed venue in `site/data/` ships a fiction to every phone
  ([ADR 0047]), and stubbing `fetch` in the page tests a fake instead of the
  real load path.

  🎯 **The general question, which is what this item is for.** Closure is one
  degenerate state; there will be others (a venue with no hours anywhere, a
  dish with no price, an empty section). Options:
  1. **Leave `overlay` per-tool** — cheapest, and it drifts into three
     different fixture idioms.
  2. **A shared `tools/lib/fixtures.mjs`** of degenerate-state venues every <!-- pathscan:allow: a PROPOSED file this option would create — it deliberately does not exist yet -->
     check can overlay. One idiom, one place to look.
  3. **A synthetic sibling corpus** the checks serve wholesale — most thorough,
     most to keep in step with the real schema, and the most likely to rot.

  🚩 **And the standing consequence, whichever is chosen:** *"the checks are
  green"* says nothing about states the corpus does not contain. That is not a
  gap in the checks; it is a gap in the fixtures, and it looks identical from
  the outside.

[ADR 0047]: ../../decisions/0047-the-app-ships-only-what-it-renders.md
