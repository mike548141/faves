# Faves session log (append-only index)

One entry per working session, newest LAST. **Append-only content** — an
entry is never edited or reordered once written. At session start read only
the recent tail (`tail -60 docs/SESSIONS.md`); the full history is for
grepping, not for loading whole. When the index outgrows its budget it
**rotates**: the recent tail stays here, older entries move verbatim to
[`SESSIONS-ARCHIVE.md`](SESSIONS-ARCHIVE.md) (grep on demand, never load
whole) — the current-truth/history split, same as `ROADMAP`→`ROADMAP-DONE`.
A substantial session may also put full detail in `docs/sessions/` and carry
a one-line pointer here. Convention adopted from `ros`/`tiki` (2026-07-08);
rotation added 2026-07-18.

<!-- sessions-split 2026-11-13: every line above this one is the index's original preamble, unchanged -->
**Split into an index and detail files, 2026-11-13** (owner-approved: moves
only, nothing deleted). Every entry written before the split now lives whole
in its own file under `docs/sessions/`, named `YYYY-MM-DD-HHMM-slug.md`, and
has one line below, in its original order. The move was verbatim but for one
change: a relative link inside an entry gained a `../`, because the file now
sits one directory down. The proof that nothing else moved is in the split
session's own record (the last line here). Where an entry's heading gave a
time, the file name carries it. Where it gave only a date (79 of 164), the
file's date and time are those of the commit that first wrote the entry, in
UTC, and its line marks the time with `~`: a commit time is when the entry
was written, not when the session began, so read it as an upper bound. The
heading inside each file keeps its date as written. From here on a session
writes its detail file and adds one line at the bottom.

<!-- indexscan:maps dir=sessions match=*.md -->

- [2026-07-11 · ~2254 UTC](sessions/2026-07-11-2254-fable-code-review-of-the-ux-chrome-block.md) — 2026-07-12 (Fable: code review of the UX/chrome block)
- [2026-07-12 · ~0050 UTC](sessions/2026-07-12-0050-opus-fixed-the-six-confirmed-review-bugs.md) — 2026-07-12 (Opus: fixed the six confirmed review bugs)
- [2026-07-12 · ~0114 UTC](sessions/2026-07-12-0114-opus-the-7-cleanup-block-from-the-fable-review.md) — 2026-07-12 (Opus: the #7 cleanup block from the Fable review)
- [2026-07-12 · ~0152 UTC](sessions/2026-07-12-0152-fable-doctrine-drift-why-a-session-asked-before.md) — 2026-07-12 (Fable: doctrine drift — why a session asked before committing)
- [2026-07-12 · ~0412 UTC](sessions/2026-07-12-0412-fable-launch-recorded-owner-acceptance-progress.md) — 2026-07-12 (Fable: launch recorded — owner acceptance progress)
- [2026-07-12 · ~0609 UTC](sessions/2026-07-12-0609-fable-opening-hours-researched-for-the-15-hour-less.md) — 2026-07-12 (Fable: opening hours researched for the 15 hour-less venues)
- [2026-07-12 · ~0745 UTC](sessions/2026-07-12-0745-fable-go-public-assessment-hours-confirmation-folded.md) — 2026-07-12 (Fable: go-public assessment; hours confirmation folded)
- [2026-07-12 · ~1016 UTC](sessions/2026-07-12-1016-opus-atelier-drift-swept-pin-bumped-to-d371169.md) — 2026-07-12 (Opus: atelier drift swept, pin bumped to d371169)
- [2026-07-12 · ~1026 UTC](sessions/2026-07-12-1026-opus-roadmap-reconciled-to-code-five-shipped-items.md) — 2026-07-12 (Opus: ROADMAP reconciled to code — five shipped items marked done)
- [2026-07-17 · ~2301 UTC](sessions/2026-07-17-2301-opus-file-size-harvest-sessions-roadmap-architecture.md) — 2026-07-18 (Opus: file-size harvest — SESSIONS/ROADMAP/ARCHITECTURE under budget)
- [2026-07-22 · ~1033 UTC](sessions/2026-07-22-1033-opus-wave1-small-closers-drive-time-cook-at-home-grid.md) — 2026-07-22 (Opus: wave1 small closers — drive time + Cook-at-Home grid)
- [2026-07-22 · ~1105 UTC](sessions/2026-07-22-1105-opus-wave2-multi-location-venues-nearest-first-fix.md) — 2026-07-22 (Opus: wave2 — multi-location venues + "Nearest first" fix)
- [2026-07-22 · ~1125 UTC](sessions/2026-07-22-1125-device-local-profiles-theme-5-the-sanctioned-half.md) — 2026-07-22 — Device-local profiles (Theme 5, the sanctioned half) — Opus 4.8
- [2026-07-22 · ~1140 UTC](sessions/2026-07-22-1140-ratings-curated-device-local-personal-theme-5.md) — 2026-07-22 — Ratings: curated + device-local personal (Theme 5) — Opus 4.8
- [2026-07-22 · ~1151 UTC](sessions/2026-07-22-1151-te-reo-maori-pre-launch-wording-review.md) — 2026-07-22 — Te reo Māori pre-launch wording review — Opus 4.8
- [2026-07-22 · ~1208 UTC](sessions/2026-07-22-1208-pick-along-a-route-theme-2-wt-faves-wave6-along-route.md) — 2026-07-23 — Pick along a route (Theme 2, wt: faves-wave6-along-route)
- [2026-07-22 · ~1219 UTC](sessions/2026-07-22-1219-split-precache-versioning.md) — 2026-07-23 — Split precache versioning (wt: faves-wave7-split-versioning) — Opus 4.8
- [2026-07-22 · ~1227 UTC](sessions/2026-07-22-1227-fable-orchestrator-opus-build-agents-the-seven-wave.md) — 2026-07-22 (Fable orchestrator + Opus build agents: the seven-wave queue run)
- [2026-07-23 · ~0246 UTC](sessions/2026-07-23-0246-opus-build-agent-two-owner-rulings-applied.md) — 2026-07-23 (Opus build agent: two owner rulings applied)
- [2026-07-23 · ~0248 UTC](sessions/2026-07-23-0248-fable-orchestrator-addendum-owner-q-a-wave-8.md) — 2026-07-22 (Fable orchestrator, addendum: owner Q&A + wave 8)
- [2026-07-23 · ~0436 UTC](sessions/2026-07-23-0436-roadmap-cross-device-sync-design-records.md) — 2026-07-23 (roadmap: cross-device sync design + records)
- [2026-07-23 · ~0525 UTC](sessions/2026-07-23-0525-addendum-sync-claim-mechanism-passkey-prf.md) — 2026-07-23 (addendum: sync claim mechanism — passkey+PRF)
- [2026-07-23 · ~0547 UTC](sessions/2026-07-23-0547-live-ui-defect-sweep-ratings-redesign-mcdonalds.md) — 2026-07-23 (live-UI defect sweep + ratings redesign + McDonald's)
- [2026-07-23 · ~0549 UTC](sessions/2026-07-23-0549-backend-follow-on-cross-person-sharing-terminology.md) — 2026-07-23 (backend follow-on: cross-person sharing + terminology)
- [2026-07-23 · ~0557 UTC](sessions/2026-07-23-0557-theme-10-owner-rulings-framing.md) — 2026-07-23 (Theme 10 owner rulings + framing)
- [2026-07-23 · ~0634 UTC](sessions/2026-07-23-0634-live-ui-sweep-cont-reposition-ratings-re-reject-mcd-adr.md) — 2026-07-23 (live-UI sweep, cont.: reposition, ratings re-reject, McD, ADR 0020)
- [2026-07-23 · ~0704 UTC](sessions/2026-07-23-0704-close-out-owner-q-a-answers-actioned-two-forward-inputs.md) — 2026-07-23 (close-out: owner Q&A answers actioned + two forward inputs)
- [2026-07-23 · ~1047 UTC](sessions/2026-07-23-1047-mcdonalds-menu-branch-cap-menu-page-then-queue-and.md) — 2026-07-23 (McDonald's menu, branch cap, menu-page ⋯; then queue-and-close)
- [2026-07-23 · ~1141 UTC](sessions/2026-07-23-1141-orchestrated-queue-run-worktree-faves-queue-1053.md) — 2026-07-23 (orchestrated queue run — worktree `faves-queue-1053`)
- [2026-07-28 · ~1139 UTC](sessions/2026-07-28-1139-family-texture-review.md) — 2026-07-28 (family-texture review — Fable session)
- [2026-07-29 · ~0800 UTC](sessions/2026-07-29-0800-roadmap-recipes-as-personal-content-theme-11.md) — 2026-07-29 (roadmap: recipes as personal content — Theme 11)
- [2026-08-06 · ~0847 UTC](sessions/2026-08-06-0847-atelier-pin-bump-go-public-gap-dig.md) — 2026-08-06 (atelier pin bump + go-public gap dig — Fable session)
- [2026-08-06 · ~1043 UTC](sessions/2026-08-06-1043-family-texture-rulings-ruled-and-applied-gate-closed.md) — 2026-08-06 (family-texture rulings — ruled and applied, gate closed)
- [2026-08-06 · ~1147 UTC](sessions/2026-08-06-1147-go-public-readiness.md) — 2026-08-06 (go-public readiness — Opus session)
- [2026-08-08 · ~0636 UTC](sessions/2026-08-08-0636-data-export-shipped-a-menu-refresh.md) — 2026-08-08 (data export shipped + a menu refresh — Opus 5 session)
- [2026-08-08 · ~0650 UTC](sessions/2026-08-08-0650-gold-lining-menu-from-photos.md) — 2026-08-07/08 (Gold Lining menu from photos — Opus session)
- [2026-08-08 · ~0711 UTC](sessions/2026-08-08-0711-sushi-bi-tj-katsu-and-subway.md) — 2026-08-08 (Sushi Bi, TJ Katsu and Subway — Opus session)
- [2026-08-08 · ~0807 UTC](sessions/2026-08-08-0807-allergen-tag-sweep.md) — 2026-08-08 (allergen tag sweep — Opus 5 session, wt: faves-allergen-tagging)
- [2026-08-08 · ~0826 UTC](sessions/2026-08-08-0826-the-time-dimension-lands.md) — 2026-08-08 (the time dimension lands — Opus 5 session)
- [2026-08-08 · ~0830 UTC](sessions/2026-08-08-0830-settings-index-panels.md) — 2026-08-08 — Settings: index + panels (wt: faves-settings-ia) — Opus 5
- [2026-08-08 · ~2245 UTC](sessions/2026-08-08-2245-five-owner-roadmap-items-feedback-add-ons-wording.md) — 2026-08-09 — Five owner roadmap items: feedback, add-ons, wording — Opus 5
- [2026-08-08 · ~2328 UTC](sessions/2026-08-08-2328-owner-round-2-transport-ruled-pwa-staleness-diagnosed-a.md) — 2026-08-09 — Owner round 2: transport ruled, PWA staleness diagnosed, a CSS fix — Opus 5
- [2026-08-09 · ~0003 UTC](sessions/2026-08-09-0003-recipe-themes-the-pudding-halved-versions-on-about.md) — 2026-08-09 — Recipe themes, the pudding halved, versions on About — Opus 5
- [2026-08-09 · ~0008 UTC](sessions/2026-08-09-0008-owner-reframes-the-time-dimension-addendum-to-the-2026.md) — 2026-08-09 (owner reframes the time dimension — addendum to the 2026-08-08 session above)
- [2026-08-09 · ~0012 UTC](sessions/2026-08-09-0012-allergen-inference-becomes-the-default-churton-prose.md) — 2026-08-09 (allergen inference becomes the default + Churton prose — Opus 5, wt: faves-allergen-inference)
- [2026-08-09 · ~0059 UTC](sessions/2026-08-09-0059-the-go-public-blocker-challenged-and-closed.md) — 2026-08-09 (the go-public blocker, challenged and closed — Opus 5)
- [2026-08-09 · ~0125 UTC](sessions/2026-08-09-0125-the-repo-goes-public.md) — 2026-08-09 (the repo goes public — Opus 5)
- [2026-08-09 · ~0244 UTC](sessions/2026-08-09-0244-four-stream-parallel-build.md) — 2026-08-09 (four-stream parallel build — Fable 5 orchestrating, Opus 4.8 building)
- [2026-08-09 · ~0247 UTC](sessions/2026-08-09-0247-three-line-queue-run.md) — 2026-08-09 (three-line queue run — Fable 5 orchestrating, Opus 4.8 building)
- [2026-08-09 · ~0815 UTC](sessions/2026-08-09-0815-theme-13f-verified-carries-its-derivation.md) — 2026-08-09 (Theme 13f — `verified` carries its derivation — Opus 5, wt: faves-verified-derivation)
- [2026-08-09 · ~0829 UTC](sessions/2026-08-09-0829-queue-run-four-items-a-stale-floor-fact-two-new-guards.md) — 2026-08-09 — Queue run: four items, a stale floor fact, two new guards — Opus 5
- [2026-08-09 · ~0928 UTC](sessions/2026-08-09-0928-cook-mode-one-step-at-a-time-screen-awake.md) — 2026-08-09 — Cook mode: one step at a time, screen awake (wt: faves-cook-mode) — Opus 5
- [2026-08-09 · ~0935 UTC](sessions/2026-08-09-0935-three-worktree-queue-run-cook-mode-the-noun-sweep.md) — 2026-08-09 — Three-worktree queue run: cook mode, the noun sweep, pathscan (orchestration) — Opus 5
- [2026-08-09 · ~1026 UTC](sessions/2026-08-09-1026-four-owner-rulings-applied-orchestration-cont.md) — 2026-08-09 — Four owner rulings, applied (orchestration, cont.) — Opus 5
- [2026-08-15 · ~0347 UTC](sessions/2026-08-15-0347-johnsonville-intake-and-the-i-that-answers-both-ways.md) — 2026-08-15 — Johnsonville intake, and the ⓘ that answers both ways (wt: menu-intake-freshness) — Opus 5
- [2026-08-15 · ~0440 UTC](sessions/2026-08-15-0440-intake-round-two-the-details-and-a-menu-that-disagrees.md) — 2026-08-15 — Intake round two: the details, and a menu that disagrees with itself (wt: intake-round-two) — Opus 5
- [2026-08-15 · ~0449 UTC](sessions/2026-08-15-0449-scanners-closed-the-pin-bumped-and-a-roadmap-that.md) — 2026-08-15 — Scanners closed, the pin bumped, and a roadmap that stopped lying (wt: faves-scanner-close) — Opus 5
- [2026-08-15 · ~0512 UTC](sessions/2026-08-15-0512-a-real-browser-guard-for-cook-mode-faves-cook-guard.md) — 2026-08-15 — A real-browser guard for cook mode (faves-cook-guard) — Opus 5
- [2026-08-15 · ~0514 UTC](sessions/2026-08-15-0514-two-owner-rulings-and-a-bug-i-diagnosed-wrong.md) — 2026-08-15 — Two owner rulings, and a bug I diagnosed wrong (wt: pandan-branches) — Opus 5
- [2026-08-15 · ~0700 UTC](sessions/2026-08-15-0700-three-pubs-and-a-menu-vocabulary-the-tag-set-didnt-have.md) — 2026-08-15 — Three pubs, and a menu vocabulary the tag set didn't have (wt: three-venues) — Opus 5
- [2026-08-15 · ~1333 UTC](sessions/2026-08-15-1333-drinks-and-the-price-band-they-quietly-broke.md) — 2026-08-15 — Drinks, and the price band they quietly broke (wt: drinks) — Opus 5
- [2026-08-15 · ~1353 UTC](sessions/2026-08-15-1353-a-dish-carries-its-own-open-questions.md) — 2026-08-15 — A dish carries its own open questions (wt: dish-needs) — Opus 5
- [2026-08-16 · 0120 UTC](sessions/2026-08-16-0120-the-collection-stops-being-wellingtons.md) — 2026-08-16 01:20 UTC — the collection stops being Wellington's
- [2026-08-16 · 0158 UTC](sessions/2026-08-16-0158-the-pin-moves-and-the-laws-leave-the-apex.md) — 2026-08-16 01:58 UTC — the pin moves, and the Laws leave the apex
- [2026-08-16 · 0230 UTC](sessions/2026-08-16-0230-the-app-stops-being-a-new-zealand-app.md) — 2026-08-16 02:30 UTC — the app stops being a New Zealand app
- [2026-08-16 · 0246 UTC](sessions/2026-08-16-0246-two-stores-a-wider-search-and-six-owner-steers.md) — 2026-08-16 02:46 UTC — two stores, a wider search, and six owner steers
- [2026-08-16 · 0313 UTC](sessions/2026-08-16-0313-the-browse-sweep-delivered.md) — 2026-08-16 03:13 UTC — the browse sweep, delivered
- [2026-08-16 · 0400 UTC](sessions/2026-08-16-0400-the-subheading-stops-being-a-label.md) — 2026-08-16 04:00 UTC — the subheading stops being a label
- [2026-08-16 · 0416 UTC](sessions/2026-08-16-0416-the-polish-pass-and-a-number-that-was-taken-twice.md) — 2026-08-16 04:16 UTC — the polish pass, and a number that was taken twice
- [2026-08-16 · 0420 UTC](sessions/2026-08-16-0420-the-guard-the-missed-version-bump-earned.md) — 2026-08-16 04:20 UTC — the guard the missed version bump earned
- [2026-08-16 · 0430 UTC](sessions/2026-08-16-0430-prices-in-your-own-money-and-an-automation-walked-back.md) — 2026-08-16 04:30 UTC — prices in your own money, and an automation walked back
- [2026-08-16 · 0445 UTC](sessions/2026-08-16-0445-a-filtered-list-that-says-so-and-lets-you-out.md) — 2026-08-16 04:45 UTC — a filtered list that says so, and lets you out
- [2026-08-16 · 0615 UTC](sessions/2026-08-16-0615-order-it-the-way-you-eat-it-add-ons-ship-with-their.md) — 2026-08-16 06:15 UTC — order it the way you eat it: add-ons ship with their safety rule
- [2026-08-16 · 0505 UTC](sessions/2026-08-16-0505-closing-two-rulings-recorded-and-3-5-gb-of-leaked.md) — 2026-08-16 05:05 UTC — closing: two rulings recorded, and 3.5 GB of leaked Chrome
- [2026-08-16 · 0630 UTC](sessions/2026-08-16-0630-dish-ids-made-immutable-sprig-fern-becomes-five-venues.md) — 2026-08-16 06:30 UTC — dish ids made immutable, Sprig + Fern becomes five venues, the filters get a sheet
- [2026-08-16 · 0658 UTC](sessions/2026-08-16-0658-the-branch-picker-and-a-data-model-surveyed-before-it.md) — 2026-08-16 06:58 UTC — the branch picker, and a data model surveyed before it was designed
- [2026-08-16 · 0845 UTC](sessions/2026-08-16-0845-the-tail-an-outage-three-green-guards-slept-through.md) — 2026-08-16 08:45 UTC — the tail: an outage three green guards slept through
- [2026-08-16 · 0831 UTC](sessions/2026-08-16-0831-the-owners-afternoon-on-his-own-phone-and-an-outage-i.md) — 2026-08-16 08:31 UTC — the owner's afternoon on his own phone, and an outage I caused
- [2026-08-16 · 0917 UTC](sessions/2026-08-16-0917-a-url-for-every-section-and-an-i-that-fought-the.md) — 2026-08-16 09:17 UTC — a URL for every section, and an ⓘ that fought the pointer
- [2026-08-16 · 1012 UTC](sessions/2026-08-16-1012-a-heading-that-was-doing-two-jobs-and-the-identity-it.md) — 2026-08-16 10:12 UTC — a heading that was doing two jobs, and the identity it was quietly holding
- [2026-08-16 · 0946 UTC](sessions/2026-08-16-0946-four-sessions-one-repo-the-in-flight-residue-closed-and.md) — 2026-08-16 09:46 UTC — four sessions, one repo: the in-flight residue closed, and a guard that had the hole it was written to close
- [2026-08-16 · 0951 UTC](sessions/2026-08-16-0951-cook-mode-learns-what-a-step-needs-and-how-long-it.md) — 2026-08-16 09:51 UTC — cook mode learns what a step needs, and how long it waits
- [2026-08-16 · 1012 UTC](sessions/2026-08-16-1012-addendum-i-deleted-an-open-item-and-the-guard-for-that.md) — 2026-08-16 10:12 UTC — addendum: I deleted an open item, and the guard for that exact failure was out of scope
- [2026-08-16 · 1052 UTC](sessions/2026-08-16-1052-15y-closed-on-an-owner-ruling-and-a-guard-i-had-to.md) — 2026-08-16 10:52 UTC — 15y closed on an owner ruling, and a guard I had to throw away
- [2026-08-16 · 1104 UTC](sessions/2026-08-16-1104-cross-device-sync-the-design-was-wrong-and-the-code.md) — 2026-08-16 11:04 UTC — cross-device sync: the design was wrong, and the code said so
- [2026-08-16 · 1138 UTC](sessions/2026-08-16-1138-addendum-the-owner-authorised-the-backend-and-the-test.md) — 2026-08-16 11:38 UTC — addendum: the owner authorised the backend, and the test for the crypto was decorative
- [2026-08-16 · 1140 UTC](sessions/2026-08-16-1140-the-filter-row-and-three-collisions-that-all-fired.md) — 2026-08-16 11:40 UTC — the filter row, and three collisions that all fired
- [2026-08-16 · 1152 UTC](sessions/2026-08-16-1152-addendum-the-worker-is-live-and-the-token-never-touched.md) — 2026-08-16 11:52 UTC — addendum: the Worker is live, and the token never touched this repo
- [2026-08-16 · 1151 UTC](sessions/2026-08-16-1151-sixteen-owner-rulings-and-two-records-that-were-lying.md) — 2026-08-16 11:51 UTC — sixteen owner rulings, and two records that were lying
- [2026-08-16 · ~1202 UTC](sessions/2026-08-16-1202-themes-17-36-and-4-run-as-five-parallel-streams.md) — 2026-08-16 — Themes 17, 36 and 4, run as five parallel streams
- [2026-08-16 · 1252 UTC](sessions/2026-08-16-1252-sync-is-live-and-the-parts-were-never-the-feature.md) — 2026-08-16 12:52 UTC — sync is live, and the parts were never the feature
- [2026-08-17 · 0058 UTC](sessions/2026-08-17-0058-addendum-the-browser-found-what-the-unit-tests-could.md) — 2026-08-17 00:58 UTC — addendum: the browser found what the unit tests could not
- [2026-08-16 · 1330 UTC](sessions/2026-08-16-1330-twelve-owner-asks-in-one-sitting-and-a-premise-worth.md) — 2026-08-16 13:30 UTC — twelve owner asks in one sitting, and a premise worth checking
- [2026-08-16 · 1400 UTC](sessions/2026-08-16-1400-the-ranking-that-had-never-run-and-a-valve-nobody-could.md) — 2026-08-16 14:00 UTC — the ranking that had never run, and a valve nobody could read
- [2026-08-16 · 1442 UTC](sessions/2026-08-16-1442-seven-menus-a-guard-nobody-had-written-and-a-count-that.md) — 2026-08-16 14:42 UTC — seven menus, a guard nobody had written, and a count that lied twice
- [2026-08-16 · 1540 UTC](sessions/2026-08-16-1540-the-recipe-page-abouts-sediment-and-a-decline-that.md) — 2026-08-16 15:40 UTC — the recipe page, About's sediment, and a decline that concentrated on the need
- [2026-08-16 · 1508 UTC](sessions/2026-08-16-1508-the-alarm-a-guard-that-had-been-dead-for-a-refactor-and.md) — 2026-08-16 15:08 UTC — the alarm, a guard that had been dead for a refactor, and four collisions between correct decisions
- [2026-08-17 · 0100 UTC](sessions/2026-08-17-0100-the-menu-fetch-was-already-finished-and-three-rulings.md) — 2026-08-17-0100 — the menu fetch was already finished, and three rulings fell out of saying so
- [2026-08-17 · 2200 UTC](sessions/2026-08-17-2200-a-stale-handover-2-6-gb-of-debris-and-four-claims-that.md) — 2026-08-17-2200 — a stale handover, 2.6 GB of debris, and four claims that had to be proved
- [2026-08-16 · 2259 UTC](sessions/2026-08-16-2259-a-parser-that-has-to-prove-it-read-the-line-and-a-flake.md) — 2026-08-16-2259 — a parser that has to prove it read the line, and a flake that impersonates a regression
- [2026-08-16 · 2309 UTC](sessions/2026-08-16-2309-the-ranker-was-accused-of-ignoring-opening-soon-and-it.md) — 2026-08-16-2309 — the ranker was accused of ignoring "opening soon", and it wasn't
- [2026-08-16 · ~2315 UTC](sessions/2026-08-16-2315-theme-20-engineering-hygiene-the-guards-that-guard-the.md) — 2026-08-17 — Theme 20 engineering hygiene: the guards that guard the guards
- [2026-08-16 · 2240 UTC](sessions/2026-08-16-2240-schema-model-theme-30s-shape-28cs-serving-windows-14bs.md) — 2026-08-16-2240 — Schema & model: Theme 30's shape, 28c's serving windows, 14b's classifier
- [2026-08-17 · 0200 UTC](sessions/2026-08-17-0200-the-location-ask-rebuilt-hours-after-it-shipped.md) — 2026-08-17-0200 — the location ask, rebuilt hours after it shipped
- [2026-08-16 · 2332 UTC](sessions/2026-08-16-2332-37k-reopened-by-the-owner-and-two-guards-broken-by-the.md) — 2026-08-16-2332 — 37k reopened by the owner, and two guards broken by the migration that fixed them
- [2026-08-17 · 0530 UTC](sessions/2026-08-17-0530-the-board-split-one-6-274-line-file-becomes-102.md) — 2026-08-17-0530 — the board split: one 6,274-line file becomes 102
- [2026-08-17 · 0545 UTC](sessions/2026-08-17-0545-the-three-day-cold-review-fable-and-what-it-found-in.md) — 2026-08-17-0545 — the three-day cold review (Fable), and what it found in sync
- [2026-08-17 · 1114 UTC](sessions/2026-08-17-1114-searchable-vibes-a-scale-that-stopped-at-the-door-and.md) — 2026-08-17-1114 — searchable vibes, a scale that stopped at the door, and the pin comes home
- [2026-08-17 · 1159 UTC](sessions/2026-08-17-1159-the-search-box-climbs-above-the-picks-and-a-that-only.md) — 2026-08-17-1159 — the search box climbs above the picks, and a ✕ that only speaks for one place
- [2026-08-17 · 1501 UTC](sessions/2026-08-17-1501-five-items-shipped-in-parallel-worktrees-and-four-of.md) — 2026-08-17-1501 — five items shipped in parallel worktrees, and four of them refuted their own brief
- [2026-08-17 · 1620 UTC](sessions/2026-08-17-1620-addendum-the-fourth-checkbox-state-was-already-ruled.md) — 2026-08-17-1620 — addendum: the fourth checkbox state was already ruled, upstream, and I proposed it anyway
- [2026-08-17 · 1655 UTC](sessions/2026-08-17-1655-addendum-2-the-record-over-attributed-the-ruling-and.md) — 2026-08-17-1655 — addendum 2: the record over-attributed the ruling, and the transcript says so
- [2026-08-17 · 1740 UTC](sessions/2026-08-17-1740-addendum-3-four-rulings-applied-and-a-third-mis.md) — 2026-08-17-1740 — addendum 3: four rulings applied, and a third mis-recorded ruling found
- [2026-08-17 · 1815 UTC](sessions/2026-08-17-1815-addendum-4-the-last-two-rulings-and-the-session-closes.md) — 2026-08-17-1815 — addendum 4: the last two rulings, and the session closes
- [2026-08-17 · 1900 UTC](sessions/2026-08-17-1900-addendum-5-the-allergen-chips-stop-shouting-owner.md) — 2026-08-17-1900 — addendum 5: the allergen chips stop shouting (owner ruling, mid-close)
- [2026-08-18 · 0600 UTC](sessions/2026-08-18-0600-the-boards-vocabulary-is-not-ours-in-either-direction.md) — 2026-08-18-0600 — the board's vocabulary is not ours, in either direction
- [2026-08-18 · 0700 UTC](sessions/2026-08-18-0700-the-peer-verified-the-finding-and-narrowed-it-we-had.md) — 2026-08-18-0700 — the peer verified the finding, and narrowed it; we had overstated it
- [2026-08-18 · 0745 UTC](sessions/2026-08-18-0745-close-the-two-shapes-were-one-mechanism.md) — 2026-08-18-0745 — close: the two shapes were one mechanism
- [2026-08-19 · 0128 UTC](sessions/2026-08-19-0128-three-claimed-items-and-two-of-the-three-findings-were.md) — 2026-08-19-0128 — three claimed items, and two of the three findings were wrong
- [2026-08-22 · 0000 UTC](sessions/2026-08-22-0000-four-rulings-and-two-of-them-declined-the.md) — 2026-08-22-0000 — four rulings, and two of them declined the recommendation
- [2026-08-22 · 0250 UTC](sessions/2026-08-22-0250-daily-bakery-lower-hutt-new-venue-full-menu.md) — 2026-08-22 0250 UTC — Daily Bakery, Lower Hutt: new venue, full menu
- [2026-08-22 · 0200 UTC](sessions/2026-08-22-0200-four-more-rulings-and-one-of-them-ratified-shipped-work.md) — 2026-08-22-0200 — four more rulings, and one of them ratified shipped work
- [2026-09-06 · 0909 UTC](sessions/2026-09-06-0909-the-menu-learns-to-focus-prices-learn-which-door-and.md) — 2026-09-06-0909 — the menu learns to focus, prices learn which door, and the pantry gets read
- [2026-09-06 · 1501 UTC](sessions/2026-09-06-1501-two-rulings-built-in-parallel-and-both-items-own.md) — 2026-09-06-1501 — two rulings built in parallel, and both items' own numbers were wrong
- [2026-09-07 · 0020 UTC](sessions/2026-09-07-0020-two-owner-asks-and-both-turned-out-to-be-about.md) — 2026-09-07-0020 — two owner asks, and both turned out to be about something else
- [2026-09-07 · 0141 UTC](sessions/2026-09-07-0141-an-orchestration-session-three-agents-and-four-verdicts.md) — 2026-09-07-0141 — an orchestration session: three agents, and four verdicts that were wrong
- [2026-09-07 · 0235 UTC](sessions/2026-09-07-0235-the-same-session-continued-eleven-rulings-and-two.md) — 2026-09-07-0235 — the same session, continued: eleven rulings, and two claims of mine that were wrong
- [2026-09-07 · 0419 UTC](sessions/2026-09-07-0419-the-close-two-more-builds-a-denied-push-that-behaved.md) — 2026-09-07-0419 — the close: two more builds, a denied push that behaved, and an ADR collision
- [2026-09-07 · 1216 UTC](sessions/2026-09-07-1216-theme-38-the-cold-review-delivered.md) — 2026-09-07-1216 — Theme 38: the cold review, delivered
- [2026-09-07 · 1518 UTC](sessions/2026-09-07-1518-faves-b1s-addendum-the-brief-was-paraphrased-and-a-peer.md) — 2026-09-07-1518 — faves-b1's addendum: the brief was paraphrased, and a peer took 38a mid-conversation
- [2026-09-08 · 1526 UTC](sessions/2026-09-08-1526-faves-o1-an-orchestrating-session-sixteen-items-eleven.md) — 2026-09-08-1526 → 2026-09-09 — faves-o1: an orchestrating session, sixteen items, eleven ADRs
- [2026-09-08 · ~1350 UTC](sessions/2026-09-08-1350-faves-o1-addendum-the-last-four-items-and-an-ask-this.md) — 2026-09-09 — faves-o1 addendum: the last four items, and an ask this session got wrong
- [2026-09-08 · 2146 UTC](sessions/2026-09-08-2146-faves-3b-an-orchestrating-session-six-items-five-adrs.md) — 2026-09-08-2146 → 2026-09-09 — faves-3b: an orchestrating session, six items, five ADRs, and a red `main` we put there
- [2026-09-09 · ~0011 UTC](sessions/2026-09-09-0011-faves-3b-addendum-the-allergen-work-and-the-claim-that.md) — 2026-09-09 — faves-3b addendum: the allergen work, and the claim that did not survive its own artefact
- [2026-09-09 · ~0136 UTC](sessions/2026-09-09-0136-faves-3b-second-addendum-the-key-is-deleted-and-the.md) — 2026-09-09 — faves-3b second addendum: the key is deleted, and the warning that told the next session to undo a ruling
- [2026-09-09 · 1102 UTC](sessions/2026-09-09-1102-faves-c1-delivery-joins-the-dining-filter-and-the-empty.md) — 2026-09-09-1102 — faves-c1: Delivery joins the Dining filter, and the empty list it would have shipped
- [2026-09-09 · 1140 UTC](sessions/2026-09-09-1140-faves-c1-addendum-the-board-view-went-up-to-atelier-not.md) — 2026-09-09-1140 — faves-c1 addendum: the board view went up to atelier, not into this repo
- [2026-09-20 · 1114 UTC](sessions/2026-09-20-1114-sync-surfacing-an-allergen-flag-cleared-by-the-act-of.md) — 2026-09-20-1114 — sync-surfacing: an allergen flag cleared by the act of syncing, and an error screen with no door
- [2026-09-20 · 1120 UTC](sessions/2026-09-20-1120-session-3e87e0bf-kc-cafes-2015-prices-and-the.md) — 2026-09-20-1120 — session `3e87e0bf`: KC Cafe's 2015 prices, and the photograph I refused to read
- [2026-09-20 · 1053 UTC](sessions/2026-09-20-1053-session-3e87e0bf-an-orchestrating-session-an-eleven-day.md) — 2026-09-20-1053 → 2026-09-21 — session `3e87e0bf`: an orchestrating session, an eleven-day gap, and four items that were already answered somewhere else
- [2026-09-20 · 1237 UTC](sessions/2026-09-20-1237-session-3e87e0bf-worker-the-stash-stack-gets-a-check.md) — 2026-09-20-1237 — session `3e87e0bf` (worker): the stash stack gets a check, and it is kept out of CI on purpose
- [2026-09-20 · 1239 UTC](sessions/2026-09-20-1239-worker-floor-restamp-session-3e87e0bf-the-floor-becomes.md) — 2026-09-20-1239 — worker `floor-restamp` (session `3e87e0bf`): the floor becomes a real copy, and the tool that was supposed to watch it cannot
- [2026-09-20 · 2254 UTC](sessions/2026-09-20-2254-session-26e43c41-fable-cold-review-merge-two-of-three.md) — 2026-09-20-2254 — session `26e43c41` (Fable, cold review + merge): two of three worker branches merged, the pin bumped with the delta read, one branch left owed
- [2026-09-24 · 0335 UTC](sessions/2026-09-24-0335-session-26e43c41-faves-62-close-the-owed-merge-landed.md) — 2026-09-24-0335 — session `26e43c41` (faves-62) close: the owed merge landed, by a peer, in the same checkout, at the same minute
- [2026-09-24 · 0346 UTC](sessions/2026-09-24-0346-worker-allergen-rulings-session-3e87e0bf-four-owner.md) — 2026-09-24-0346 — worker `allergen-rulings` (session `3e87e0bf`): four owner rulings executed, and the class table gets its first test
- [2026-09-24 · 0952 UTC](sessions/2026-09-24-0952-worker-section-name-session-3e87e0bf-a-heading-is.md) — 2026-09-24-0952 — worker `section-name` (session `3e87e0bf`): a heading is evidence the writer may read and may not use
- [2026-09-24 · 0400 UTC](sessions/2026-09-24-0400-session-3e87e0bf-orchestrator-part-2-the-four-rulings.md) — 2026-09-24-0400 — session `3e87e0bf` (orchestrator, part 2): the four rulings, the 68 rows, and a probe that refused the feature
- [2026-09-24 · 1028 UTC](sessions/2026-09-24-1028-worker-shopping-session-3e87e0bf-17es-shopping-list.md) — 2026-09-24-1028 — worker `shopping` (session `3e87e0bf`): 17e's shopping list, built as the tally with a different key
- [2026-09-24 · 1100 UTC](sessions/2026-09-24-1100-session-3e87e0bf-addendum-the-shopping-list-and-a-flake.md) — 2026-09-24-1100 — session `3e87e0bf` addendum: the shopping list, and a "flake" that was a defect in the check
- [2026-09-27 · 0429 UTC](sessions/2026-09-27-0429-session-faves-a6-whittakers-lava-cakes-and-the-recipe.md) — 2026-09-27-0429 — session `faves-a6`: Whittaker's lava cakes, and the recipe page rebuilt after it
- [2026-09-27 · 1341 UTC](sessions/2026-09-27-1341-session-faves-8e-40d6dea4-orchestrated-queue-run-waves.md) — 2026-09-27-1341 — session `faves-8e` (`40d6dea4`): orchestrated queue run, waves 1–2
- [2026-09-29 · 0115 UTC](sessions/2026-09-29-0115-session-faves-ec-no-estimate-wording-and-the-footer-on.md) — 2026-09-29-0115 — session `faves-ec`: no estimate wording, and the footer on every page
- [2026-09-29 · ~0815 UTC](sessions/2026-09-29-0815-the-title-i-and-on-the-spend-line.md) — 2026-09-29 — the title ⓘ, and "~" on the spend line
- [2026-09-30 · ~0621 UTC](sessions/2026-09-30-0621-sync-timings-and-the-design-for-scaling-data-session.md) — 2026-09-30 — sync timings, and the design for scaling data (session `faves-ad`)
- [2026-09-30 · ~1139 UTC](sessions/2026-09-30-1139-theme-39-built-phases-0-to-4-and-a-sync-data-loss-fix.md) — 2026-09-30 — Theme 39 built: phases 0 to 4, and a sync data-loss fix (session `faves-0b`)
- [2026-10-01 · ~0703 UTC](sessions/2026-10-01-0703-the-import-tool-groundup-cafe-and-the-chatty-app-fixes.md) — 2026-10-01 — the import tool, Groundup Cafe, and the chatty-app fixes (session `faves-55`)
- [2026-10-01 · ~1336 UTC](sessions/2026-10-01-1336-stale-sync-reads-fixed-live-the-old-hearts-guards-and.md) — 2026-10-02 — stale sync reads fixed live, the old-hearts guards, and three owner asks (session `faves-4f`)
- [2026-10-02 · ~0624 UTC](sessions/2026-10-02-0624-the-owners-closing-rulings-built-chains-widened-a-focus.md) — 2026-10-02 — the owner's closing rulings built, chains widened, a focus bug found twice (session `faves-77`)
- [2026-10-03 · ~0816 UTC](sessions/2026-10-03-0816-owner-rulings-on-compulsory-choices-filed-and-the.md) — 2026-10-03 — owner rulings on compulsory choices filed, and the configuration survey (session `faves-de`)
- [2026-10-16 · ~0807 UTC](sessions/2026-10-16-0807-orchestrated-queue-run-interrupted-by-a-crash-and.md) — 2026-10-16 — orchestrated queue run, interrupted by a crash and recovered (session `faves-11`)
- [2026-10-17 · ~2359 UTC](sessions/2026-10-17-2359-orchestrated-queue-run-with-the-owner-away-thirteen.md) — 2026-10-18 — orchestrated queue run with the owner away: thirteen items landed (session `faves-b4`)
- [2026-10-26 · ~1013 UTC](sessions/2026-10-26-1013-atelier-pin-b2c53da-0a2b7a7-a-headless-doctrine-catch.md) — 2026-10-26 — atelier pin `b2c53da` → `0a2b7a7`, a headless doctrine catch-up (session `6cdb3fe0`)
- [2026-11-01 · ~1205 UTC](sessions/2026-11-01-1205-one-refs-only-cold-brief-written-no-pass-run-a-sub.md) — 2026-11-02 — one refs-only cold brief written, no pass run (a sub-agent of session `2be3482c`)
- [2026-11-01 · ~1234 UTC](sessions/2026-11-01-1234-eleven-adrs-triaged-for-review-one-refs-only-brief.md) — 2026-11-02 — eleven ADRs triaged for review, one refs-only brief written (a sub-agent of session `2be3482c`)

<!-- sessions-split:moved-end -->
## 2026-11-13 — atelier pin `0a2b7a7` → `2a6d7a4`, and an estate health sweep (session `52b6d566`)

Dispatched by an estate health sweep, orchestrator session e820bff5. Floor
re-copied word for word and the pin moved; `CLAUDE.md` text the delta made
false fixed (BS1 retired on its own trigger, estate-root section, cold-reviewer
clause); `.leakscanbinaries` lists all 50 tracked binaries ahead of the
2026-11-18 G3 date (`340/340` closed); visibility declared public, which
filed `340/350`; two house hooks added. Detail:
[`sessions/2026-11-13-0614-pin-bump-2a6d7a4-and-health-sweep.md`](sessions/2026-11-13-0614-pin-bump-2a6d7a4-and-health-sweep.md).
- [2026-11-13 · 0749 UTC](sessions/2026-11-13-0749-sessions-log-split.md) — the session log split into an index and 164 detail files, every byte proved to survive (session `84039f05`)
- [2026-11-14 · 0128 UTC](sessions/2026-11-14-0128-de-duplicating-the-owners-asks.md) — de-duplicating the owner's asks: one overtaken note on the Phase 1 menu-photo ask (session `f7071565`)
