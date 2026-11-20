- **2026-07-06 and earlier (backfilled from git history)**: Phase 0
  foundation — strategy/architecture/design/workplan + restaurant stubs.
  Built the home and menu screens (Phase 2/3), added five more venues and
  the Cook at Home recipes collection ([ADR 0003]). Created `intake/` for
  menu/recipe source material; transcribed menus (Spices, Takeaway, Thai
  Tara) and 24 home recipes from paper/scan sources — prices from paper
  menus, not delivery apps. Flagged every venue's `verified` null so the
  menu screen shows a "needs a refresh" caveat. Added `tools/serve.py`
  (laptop + phone dev server), the favicon/PWA icon set + `site.webmanifest`,
  `docs/ROADMAP.md`, the Apache-2.0 LICENSE, and the Cloudflare Pages
  hosting-as-code (`tools/deploy.py` + `docs/DEPLOY.md`, [ADR 0004]).
