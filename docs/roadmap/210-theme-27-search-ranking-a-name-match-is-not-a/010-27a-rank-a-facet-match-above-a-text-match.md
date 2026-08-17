- [ ] **27a — Rank a facet match above a text match** `[M][design]` — weight a
  hit on `cuisine`/`area` above one on `name`/`address`, so the six above still
  *appear* but sort below the venues that genuinely carry the property. Cheaper
  and less surprising than narrowing the haystack, which would lose real finds
  ("Charley Noble" is a fair answer to "Noble").
