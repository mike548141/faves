- **2026-07-09 (queue batch: order-codes, SBOM, more allergens, food
  preferences)**: Worked through four ROADMAP items end-to-end, each committed
  separately with a real-browser check.
  1. **Dish order-numbers** (`.33`, Theme 5): venues that take orders by number
     get an optional item `code` (non-empty string), rendered as a muted `#14`
     badge *beside* the name (`.dish-code` + a new `.dish-name-text` span) and
     matched by search. Migrated KC Cafe: stripped the `N.` prefix baked into
     159 dish names into `code` via a surgical line-level text edit (preserved
     the file's formatting; no stripped-name collisions). Schema rule +
     validate.py (picks/goesWith still match the *stripped* name). Badge
     render-verified via headless-Chrome DOM dump.
  2. **Published SBOM** (`.34`, Theme 7, ADR 0008): `tools/gen_sbom.py` (stdlib)
     emits a CycloneDX 1.5 JSON with an empty third-party component list, at
     `site/.well-known/sbom.json`. **Deterministic** — no wall-clock timestamp
     (git dates it), serialNumber is a uuid5 of the doc's own canonical body —
     so `gen_sbom.py --check` is a stable CI gate (new job) and any future
     third-party entry shows as a diff. Reads package.json through the same
     dependency-key set as check_no_deps.py so the two can't disagree.
     Committed (not deploy-generated) because Pages runs no build command.
  3. **More allergen tags** (`.35`, Theme 5): extended the closed allergen
     vocabulary with contains-egg/dairy/gluten/soy/sesame (ARCHITECTURE.md,
     validate.py, the ALLERGEN maps in menu.js + recipe.js). **No dishes
     tagged** — "no tag = not stated" means population is an owner/intake task.
  4. **Personal dietary + allergy preferences** (`.36`, Theme 5): a "Food
     preferences" section in the Settings dialog — pick dietary needs
     (veg/vegan/GF/DF) and allergens to flag, device-local in settings.js
     (`diet:{dietary,avoid}`, sanitised to the closed vocab, +5 tests). Applied
     on every menu: dietary needs pre-select the matching chips (non-matching
     dishes dim on load), a flagged allergen's ⚠ chip shouts (filled-red
     `is-flagged`) with a warning rail down the row (`.dish-flagged`); recipes
     too. Load-bearing safety copy shipped ("always confirm for allergies; no
     tag = not stated, not free of it — a highlight, not a guarantee"). Avoided
     allergens read red, dietary needs accent. **Fixed en route:** the diet
     chip's `aria-pressed` was set as an ineffective el() JS property, not the
     attribute the CSS matches — pre-selected chips never looked pressed; now
     setAttribute. Verified via a seeded headless-Chrome profile at 390px.

  node --test 119→125 throughout; validate + check_no_deps + gen_sbom --check
  clean. Five commits on `main`, not pushed (no deploy yet — Phase 7).

  **Stopped here to save session cost.** Remaining buildable queue items are
  larger or need an owner steer: *Pick along a route* and *Personal tag
  overrides (local)* (both bigger, want a design call); *multi-location schema*
  (speculative — no chain records in the data yet); and the owner-blocked ones
  (security.txt role-inbox address, feedback intake, order-platform logos).
