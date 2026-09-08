- [~] **27a — Rank a facet match above a text match** `[M][design]` — weight a
  hit on `cuisine`/`area` above one on `name`/`address`, so the six above still
  *appear* but sort below the venues that genuinely carry the property. Cheaper
  and less surprising than narrowing the haystack, which would lose real finds
  ("Charley Noble" is a fair answer to "Noble").

  🔒 **CLAIMED 2026-09-09 (session faves-o1, orchestrating)** — delivered by
  a sub-agent in its own worktree (`faves-o1-facet-ranking`, branch
  `facet-ranking`), landing by PR so CI runs before the merge.
