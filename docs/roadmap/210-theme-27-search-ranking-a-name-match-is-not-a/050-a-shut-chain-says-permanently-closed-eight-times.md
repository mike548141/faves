- [ ] ⚑ **A shut seven-branch chain now says "Permanently closed" eight times**
      `[XS][ux]` — the deliberate consequence of `040`'s engineering half,
      shipped 2026-08-19 and raised rather than tuned on a guess.

  The header banner says it once, then every branch heading repeats it. On a
  390 px screen that is a lot of the same sentence. **It is plain and
  unmissable, which was the point** — the bug being fixed was a card that said
  "Open" on every branch of a closed chain, and under-correcting it is how that
  comes back.

  🎯 **Owner's taste, and it interacts with `040`'s decision 2.** Options:
  1. **As shipped** — say it on every row. Nobody can miss it, and it stays
     correct the day closure becomes per-branch.
  2. **State it on the "Branches" heading only**, leaving the rows bare. Quiet,
     but a reader who scrolls into one branch row sees no closure at all.
  3. **A muted style for the repeats** — full weight on the header, subdued on
     the rows. Splits the difference and costs a CSS rule.

  🔑 **Why this waits on decision 2 rather than being settled now:** if closure
  becomes per-branch, the repeats stop being repeats — each row would then be
  saying something the header cannot say. Choosing 2 now would have to be
  undone then.
