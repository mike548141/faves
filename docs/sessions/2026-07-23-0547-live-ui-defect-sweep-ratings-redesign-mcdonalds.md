- **2026-07-23 (live-UI defect sweep + ratings redesign + McDonald's)**: Owner
  fired a stream of live-site defects/asks; shipped incrementally, each pushed
  (= deployed). **Fixes:** (1) app-wide search deep-link now scrolls to the dish
  on arrival — the browser's native fragment scroll fired before the async menu
  rendered, so we jump to it ourselves after render (two rAFs for --toolbar-h);
  (2) back-to-top enlarged (52px, 60px past 34rem) — was dwarfed on desktop; (3)
  Favourites row in the ⋯ menu stayed legible on hover/press — the generic hover
  recoloured only the background, stranding accent-ink text on a pale tint
  (both themes); (4) profile add/delete panels given a **card** radius (--radius)
  not a **pill** (--radius-chip 999px), which had crowded content against the
  edges. **Features:** **ADR 0018** — Settings → "Maps app" (Apple/Google/Waze/
  Auto), since the web can't read the OS default-maps-app; `geo.resolveMapsTarget`
  + Waze provider, per-profile. **ADR 0019** — ratings reworked **1–3 three
  buttons → 1–5 tap/drag star slider** (`role="slider"`, full keyboard,
  aria-valuetext + live region), **moved under the dish/venue name** clear of the
  ♥; supersedes ADR 0013's scale + control shape; `validate.py`/`ARCHITECTURE`
  1..5; old marks valid, no migration; curated still dormant; browser-verified at
  390px. **Data:** added **McDonald's** as a two-branch multi-location stub
  (ADR 0011) — Courtenay Place + Lambton Quay, real addresses/phones from web
  search, no fabricated menu/coords; headless-verified both branches render.
  SW versions bumped per change (SHELL …76→81, DATA …74→75); CHANGELOG updated.
  **Deferred (owner-ratified, next session):** "along a route" → **free-text
  destination via an online geocoder (Nominatim)** folded into the search bar —
  relaxes the offline invariant, so it needs its own ADR + a **CSP connect-src**
  allowance (new trust surface); recorded in ROADMAP Theme 2. Verify at close:
  `node --test` 278 pass, `validate.py` 28 files valid, `check_no_deps.py` holds;
  tree clean, all commits pushed.

