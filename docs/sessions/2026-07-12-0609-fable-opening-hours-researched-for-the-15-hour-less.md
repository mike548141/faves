- **2026-07-12 (Fable: opening hours researched for the 15 hour-less venues)**:
  Every venue record now has `hours`. Three parallel research agents swept
  official sites, socials, and aggregators; venue-own sources preferred.
  High confidence (own site): Babaili, Satay Kingdom, New Chapter, Kaffee
  Eis, Regal, The Catch, Rock Yard. Medium (aggregators agree / minor
  conflicts, noted in the research): Cozy Cake, Gong Cha, Gold Lining,
  KK Malaysian (Monday now closed; old own-site hours stale, domain dead),
  Pizza Pomodoro (own FAQ beats stale aggregators), Marigold (Facebook
  post corroborates), Thai Tara Express (own site vs aggregator split —
  own site used). Low: Wellington Kebab Grill (own site says "TBC";
  aggregator + Uber Eats pattern used — phone check 04 478 4780 would <!-- leakscan:allow: venue business phone quoted in a session record — same product class as site/data (ADR 0022 gate 1) -->
  settle it). Also cross-checked Spices Indian against spicesindian.co.nz
  (owner-flagged): hours, phone, Easy Eats link all match; no change.
  Verified: validate.py, check_no_deps.py, node --test all pass; SW
  VERSION → 2026-07-12.66.
  Session close: atelier drift read (2b8da3b → b07087c, 11 commits —
  new REACH.md fetch-ladder + credential-boundary doctrine; CONCURRENCY
  gained the dirty-tree backstop, sync bookends, and solo trunk-based
  default; PROPAGATION now stamps a Concurrency line into the floor
  block). Floor unmoved. Pin bumped and the Concurrency line added to
  CLAUDE.md's inlined block per the updated template. Docs only — no
  `site/` change beyond the earlier hours commit, no further SW bump.

