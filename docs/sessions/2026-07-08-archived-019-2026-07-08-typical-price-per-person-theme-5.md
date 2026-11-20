- **2026-07-08 (typical price per person, Theme 5)**: Continuing
  autonomously through the roadmap (owner: "keep going until it's time for a
  new session"). Added a **$/$$/$$$ + ~$Npp** chip on home cards and the
  menu header, derived from each venue's own listed prices — new pure module
  `site/js/price.js` (8 unit tests). The signal is the **median** of a
  venue's priced items (roughly one dish/person; median over mean so a few
  pricey specials or cheap sides don't skew it), banded $ ≤ 15, $$ ≤ 30, $$$
  above, and suppressed under 3 priced items (stubs, recipes, thin menus
  → null). Card chip is neutral (surface-2, bold band) so it reads distinct
  from the accent cuisine chips; menu header shows "$$ about $25 per person ·
  estimated from the menu". Honest framing throughout (our prices are
  already flagged as needing an in-store refresh). Browser-verified at 390px:
  8 venues show sensible bands (Spices Indian $$ ~$16pp, KK Malaysian $$
  ~$25pp, Takeaway @ Churton $ ~$10pp). node --test 100→108 pass; validate +
  check_no_deps clean. VERSION → 2026-07-08.23; price.js added to SW SHELL.
  CHANGELOG + ROADMAP updated (item done; curated override + a "Pick for us"
  cheap-eats mode noted still-open).
