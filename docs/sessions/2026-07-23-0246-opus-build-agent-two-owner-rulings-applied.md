- **2026-07-23 (Opus build agent: two owner rulings applied)**: Applied the two
  `[~]` rulings from the 2026-07-23 owner Q&A (wt faves-wave8-rulings-apply).
  **(1) Address tap → pin, not directions** (ADR 0016, supersedes ADR 0010 part
  a; part b's "~N min" hint stands): tapping a venue's address now opens a map
  pin targeting the **street address string** — `apple maps.apple.com/?q=<addr>`,
  `google maps/search/?api=1&query=<addr>` — so Maps geocodes the exact spot.
  Root cause of the owner's "148 Cuba St opens on Garrett St" report: the old <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
  handoff targeted stored lat/lng, and R & S Satay's dev-time coords sit ~100 m
  off. Coords are now a belt-and-braces fallback only. The along-route "🧭 Route
  via maps" handoff keeps its routed form but its venue leg targets the address
  too (`9dad5f8`). **(2) "Nearest first" = pure distance** (`9a4ed78`):
  `ranking.js` origin branch leads on raw distance → availability tiebreak →
  curated; a heart keeps its ♥ badge but earns no distance pull. Default
  no-location order unchanged (hearts float via favTie). ⚠️ Consequence: the
  `favBoostKm` settings dial is now inert for ordering — queued follow-on
  (repurpose/retire) added to ROADMAP. ROADMAP travel-time idea kept + refined
  (`[M]`, mode-aware walk/drive `~` estimate near address/hours or in the collect
  dialog, no routing API). Tests 266→272 (geo pin + route-via cases reworked;
  ranking boost tests replaced with the ruling's regressions); validate,
  check_no_deps, gen_sbom --check all green; served + curled changed pages.
  SHELL_VERSION `.74`→`.75` (data unchanged, DATA_VERSION held). ⚠️ No headless
  browser — logic/serve-verified only; a real-device tap-through of the address
  pin + Nearest-first stays owner acceptance. Branch pushed, not merged.

