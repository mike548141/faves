**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 87+1 -->
- [2026-07-08 · 2026-07-08 (relocate cheap-eats to a list filter + Fable UX review +](2026-07-08-archived-024-2026-07-08-relocate-cheap-eats-to-a-list-filte.md) — archived entry, verbatim in its file

- **2026-07-08 (relocate cheap-eats to a list filter + Fable UX review +
  owner decisions)**: Owner (rightly) flagged that "Cheap eats" belongs as a
  **main-list filter**, not buried in the picker. **Moved it**: `cheap` added
  to `DEFAULT_FILTERS` + an `isCheapEats` clause in `applyFilters`
  (`filters.js` now imports `price.js`); a 💸 `list-toggle` sits beside
  "Open now" in the home results head; `wireOpenNow`/`wireCheapEats` now share
  a small `wireListToggle`. **"Pick for us" inherits it for free** via the
  existing `applyFilters` call, so all the picker-specific cheap plumbing
  (`#picker-cheap`, `.picker-opts`, the `cheapOnly` closure param, the
  cheap-aware empty state) was removed — picker.js back to its clean shape.
  Browser-verified via CDP at 390px: toggle 44px; OFF 26 → ON "3 of 26"
  showing exactly the $ venues (Thai Tara Express, Takeaway @ Churton,
  Khandallah Trading Co); home no horizontal overflow; picker with cheap on
  only rolled the cheap+open venue. node --test 108→112; validate +
  check_no_deps clean. VERSION → 2026-07-08.28. CHANGELOG/ROADMAP updated
  (supersedes the .27 picker-mode entry, all still Unreleased).

  **Owner decisions recorded this session (see ROADMAP):** (1) *Ratings* —
  show the live Google number when online via a Cloudflare Pages Function
  proxy, link-out when offline; dish ratings curated; ADR + build after the
  Phase 7 deploy (first external service — noted). (2) *Feedback intake* — no
  email; parked ("decide later"), deploy first; GitHub Issues (public
  `faves-feedback` repo) or a Pages form are the future candidates. (3) *SBOM*
  — CycloneDX JSON at `/.well-known/sbom.json`, stdlib `tools/` generator,
  built at deploy.

  **Fable UX review landed (scoped, at 390px, both schemes).** P1 bugs to fix
  next, in priority order: (a) **menu screen scrolls sideways** (423px vs 390
  — `.section-nav`/`.menu-toolbar > *` needs `min-width: 0`); (b) **Area &
  Cuisine selects collapse to ~39px stubs** at 390px (the sticky filter bar
  needs to wrap to two rows, and `--bar-h`/both FAB offsets move in lockstep);
  (c) **`prefers-reduced-motion` still gets `scroll-behavior: smooth`** — an
  unconditional `html{scroll-behavior:smooth}` at ~app.css:1317-1328 wins over
  the reduce override; wrap it in `@media (prefers-reduced-motion:
  no-preference)`; (d) **touch targets < 44px**: `.section-link` (30),
  `.diet-chip` (40), `.stepper-add`/`.stepper-btn` (40), `.pair-chip` (32).
  P2: the **derived price band misbands** (KTC gastropub → "$", R & S Satay →
  "$$$"), which the new cheap filter amplifies → build the curated `priceBand`
  override (Theme 5). Full findings incl. P3 nits in the task output; the
  standouts are verified real. Next session: knock out the P1 batch.
