- [~] 🔎 **Nothing joins the photograph population to the records, so a
      harvest cannot report its own coverage** `[S][tools]` — found 2026-09-08
      by the intake audit (session faves-o1). This is the mechanism gap that
      let `020` stay invisible.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — owner
  authorised this one directly. Delivered by a sub-agent in its own
  worktree (`faves-o1-intake-coverage`, branch `intake-coverage`), landing by PR.

  **Two tools, no join.** `tools/product_bursts.py` prints the **population**
  (183 photographs, 59 bursts). `tools/products.py` validates the **records**
  (87 valid, `--stats`, `--reshoot`). **No tool reconciles bursts against
  `data/products/*.json`**, so "how much of the intake has been read" is a
  question the repo cannot answer and never asked. Everything was green
  throughout — [ADR 0072]'s shape exactly: a guard whose output is the same
  whether or not the thing it guards is complete.

  🚩 **And the naive version of the fix gets it wrong.** `source.burst` is
  sometimes a composite (`"b026+b045"`), so an exact-string comparison reports
  **17** uncited bursts where the true answer is **15**. The reconciliation has
  to parse the field, not compare it — which is the whole reason it is worth
  writing once rather than grepping ad hoc.

  📋 **The work**, small: a `--coverage` mode on `products.py` (or a few lines
  in `product_bursts.py`) that prints every burst with no record and every
  photograph named by no `source.files` entry, and a line in the verify list.
  It found this in ten lines when it was finally run by hand.
  🔑 It also wants a way to say **"read, and deliberately not a product"** —
  otherwise the 26 recipe photographs will be reported as a gap forever, which
  is how a check gets switched off.
