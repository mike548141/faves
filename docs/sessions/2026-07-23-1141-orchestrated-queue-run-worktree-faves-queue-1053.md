- **2026-07-23 (orchestrated queue run — worktree `faves-queue-1053`)**: An Opus
  session orchestrating build agents (Sonnet for mechanical, Opus for
  design/safety) off the ROADMAP queue; four items claimed on `main` first (so
  parallel sessions saw the claim), built in an isolated worktree, integrated by
  pushing `HEAD:main`. **Doctrine:** atelier method docs had moved 20 commits;
  read-only drift audit → bumped the pin `9e7e031`→`4f637b0` and updated the
  inlined floor (apex gains *adaptation*; a pushed close must cite the pushed CI
  result — `RECORD.md`; `MODEL-ECONOMICS.md`→`ECONOMICS.md`) — `b3571e5`.
  **Shipped:** (1) branches aside **scrolls with the menu** (dropped
  `position:sticky`, `0917249`); (2) **favBoostKm dial relabelled** "Show
  branches within" (storage key untouched, `e65632a`); (3) **mode-aware travel
  hint** by the pickup address — walk <2 km @ 5 km/h / drive ≥2 km, origin-gated,
  no routing API — **ADR 0021** (`7dc6a42`, `distance.js` `travelHint`); (4)
  **Settings on the menu page** with **live allergen/dietary re-apply** — the
  safety-reactivity wiring was the task: two per-dish safety predicates extracted
  to a shared unit-tested `dietary.js` that BOTH the first paint and the reactive
  re-apply call (can't diverge), re-render on `settings.subscribe` + profile
  switch, mirroring home (`399604e`). **⚑ Safety:** an independent adversarial
  review (free, plan-model) found a **severe race** — the profile switcher was
  interactive before the menu loaded and before the store-reload wired, so
  switching during "Loading…" could bake in the *wrong person's* allergen filter.
  **Fixed** (`152fedf`): `reloadProfileStores` with `settings.reload()`
  contractually last, subscribers registered early in `initChrome`, `reapply`
  guarded until the restaurant is set; unit test pins the reload ordering. Also
  fixed a pre-existing recipe-page cross-tab gap. Review record →
  `docs/reviews/2026-07-23-1127-menu-settings-allergen-safety-review.md`.
  **Floor:** the `floor` CI workflow was **inherited-red** — a structural
  leakscan hit on a raw email in ROADMAP Theme 8 (added `a3a7577`, 2026-07-12);
  de-spelled it (`66935b9`), floor now green. **Verify (pushed result, per the
  new RECORD rule): CI ✅ and floor ✅ both green on `66935b9`**; `node --test`
  301 pass, `validate.py` 28 valid, `check_no_deps`, SBOM green. SW SHELL
  `.86`→`.91`; DATA untouched. **Concurrency:** one build agent briefly
  stray-wrote to the main checkout, self-reverted; main tree verified clean.
  **⏳ Owner-owed (surfaced at close):** real-device confirmation of the live
  allergen re-highlight (SW hides it headlessly — the one true safety gate before
  trusting it in prod); the menu-page settings-change **full re-render** resets an
  in-progress search/scroll/dietary-chip toggle (accept?); ratings v3 direction;
  free-text geocoder go/no-go (trust surface, its own ADR); `security.txt`
  contact; and a **publish-readiness flag** — local-term leakscan (owner's machine
  only, invisible to CI) finds a child's first name in a pre-existing test fixture
  (`tests/profiles.test.js`, from `5dfda33`) — the concrete form of Theme 8's
  family-texture call. CHANGELOG Unreleased has accumulated duplicate section
  headers across many sessions — flagged for a release-time consolidation, not
  hand-reflowed mid-run.

