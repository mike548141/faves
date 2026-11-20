**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 93+1 -->
- [2026-07-09 · 2026-07-09 (queue batch: surface favourites + te reo Māori toggle)](2026-07-09-archived-027-2026-07-09-queue-batch-surface-favourites-te-r.md) — archived entry, verbatim in its file

- **2026-07-09 (queue batch: surface favourites + te reo Māori toggle)**:
  Picked up where the prior session stopped and cleared the two smallest
  "still open" favourites sub-items, then built the parked te reo toggle after
  an owner steer. Four feature commits + docs, each real-browser verified via
  CDP (headless Chrome over the DevTools protocol, driven by a Node stdlib
  script from /tmp so nothing touched the repo).
  1. **Heart from the home card** (`.37`, Theme 5): the ♥ toggle now sits on
     each browse card, top-right, as a *sibling* of the card link (a button
     nested in an `<a>` is invalid/untappable) — absolutely positioned inside
     the now-`position:relative` `.card`, card name padded right so a long
     title never runs under it. Reuses the shared `heartButton`. CDP-verified:
     9 hearts at 48px within the viewport, **zero horizontal overflow**
     (scrollWidth 390 = clientWidth), toggle persists the venue entry.
  2. **"Pick for us" favours the usual** (`.38`, Theme 5): extracted a pure
     `weightedPick` (7 tests) — a hearted venue counts `FAV_WEIGHT` (3) in the
     draw, leaning toward favourites without excluding the rest; the flicker
     still cycles every candidate. Guarded picker.js's top-level
     `window.matchMedia` so the module imports under `node --test`.
  3. **Name it when the roll lands on a favourite** (`.39`): a "♥ one of your
     usuals" note on the picker result, so the weighting is visible not silent.
     CDP-verified: narrowing to a set with a seeded favourite lands on it and
     shows the note.
  4. **Te reo Māori UI toggle** (`.40`, ROADMAP parked; owner chose it from a
     next-build steer): a device-local language switch in Settings. New
     `site/js/reo.js` i18n engine — static chrome carries `data-i18n` /
     `-i18n-aria` / `-i18n-ph`; `translate()` swaps them and captures the
     English source so switch-back is lossless; JS strings call `t(key, en)`;
     `settings.lang` (sanitised, +1 test) drives it; reo re-translates the
     document off the store subscription and sets `<html lang>` (en-NZ / mi).
     Scope this pass: home screen + Pick-for-us/Settings dialogs + menu/recipe
     back-links. CDP-verified at 390px: every tagged string + `<html lang>`
     flips to mi and back losslessly, persists, macrons render. **Wording is a
     first pass wanting a reo review before launch** (Phase 7); safety prose
     (privacy note, allergy copy) and generated menu-screen chrome stay English
     for now, flagged in reo.js, covered by the English fallback. Extending is
     purely additive (add a key + a `data-i18n`).

  node --test 125→133 throughout; validate + check_no_deps + gen_sbom --check
  clean. Five commits on `main`, not pushed (no deploy yet — Phase 7).

  **Stopped here to save session cost.** The remaining queue all needs an owner
  call before building: te reo *follow-ups* (menu-screen chrome, prose, the
  reo wording review); *Shareable shortlist links* and *Pick along a route*
  (both want a design/UX call — what's the shortlist; how is a route
  destination entered offline); *Personal tag overrides* and *multi-location
  schema* (bigger); and the owner-blocked ones (security.txt address, feedback
  intake, order-platform logos).
