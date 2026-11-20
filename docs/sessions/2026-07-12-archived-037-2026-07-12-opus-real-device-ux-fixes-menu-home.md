- **2026-07-12 (Opus: real-device UX fixes — menu + home chrome)**: A batch of
  seven fixes from device review. **Menu search** gained the home search's clear
  ✕ (wrapped in `.menu-search-field`; Esc clears). **Pinned toolbar** got
  `padding-top` so the search pill stops clipping against `top:0` (desktop
  0→10px; clear of the mobile contact bar). **Section jump-nav** now follows the
  scroll — scroll-spy centres the active chip in the horizontal strip so the
  section you're reading stays visible/highlighted deep in a menu. **Back-to-top**
  extracted to a shared `to-top.js` and added to the home list (was menu-only);
  on home it stacks above the "Pick for us" pill + filter bar (10px gap, verified
  no overlap on scroll-up) and hides in search/favourites. **Footer** now puts
  "About & privacy" + "Made by cakeIT" on one centred row (also simplified the
  about-ui footer swap). **Collapsed allergen chips**: removed the fade gradient
  that bled over a selected chip's fill (the clamp already hides row 2 cleanly).
  **Settings gear ⚙** bumped to 1.35rem to match ♥/⤴/ⓘ. All verified over CDP at
  390px + 1440px; verify suite green. SW `.58→.59`. Note: `code-review` deferred
  — a good candidate before the next content push given the volume of chrome
  churn this session.
