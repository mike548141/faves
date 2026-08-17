# Owner rulings — 2026-07-23 (session Q&A, raw where quoted)

- ✅ **"Nearest first" goes pure distance** — **applied 2026-07-23** (`9a4ed78`,
  wt: faves-wave8-rulings-apply). `ranking.js` origin branch now leads on raw
  distance → availability tiebreak → curated; a hearted venue keeps its ♥ badge
  but earns no distance pull, so a nearer plain venue always outranks a farther
  hearted one (regression test: hearted 10 km vs plain 2.5 km → 2.5 km wins).
  Default no-location order unchanged (a heart still floats via the favTie
  tiebreak). ⚠️ Side effect: the `favBoostKm` settings dial went inert for
  ordering — **now repurposed 2026-07-23**: it's the **branch-proximity cutoff**
  for multi-location venues (show the 2 nearest branches within this distance;
  `locations.branchesToShow`). One dial, honest new job; the "favourites count
  as this much nearer" label may want a rename to match its dual meaning `[S]`.
  ✅ **Renamed 2026-07-23** (queue-run, `e65632a`): the dial's user-facing label
  is now "Show branches within" with a hint explaining the two-nearest-branches
  cutoff; storage key `favBoostKm` deliberately unchanged (renaming it would reset
  everyone's stored setting); stale code comments in `settings.js`/`locations.js`
  corrected to match.
- ✅ **Settings on the restaurant page** `[M]` — **shipped 2026-07-23**
  (queue-run, `399604e`). The safety-reactivity wiring was the task, and it's
  done: extracted the two per-dish safety predicates into a shared, unit-tested
  `site/js/dietary.js` (`dishFlagged` + `dishSatisfiesDiet`) that BOTH the initial
  render and the live re-apply call, so they can't diverge; `menu.js`'s `reapply`
  re-renders on `settings.subscribe` (any pref change) and on a
  profile switch (reloads favourites/ratings/settings), mirroring the home page's
  proven mechanism; `settings-btn` added to restaurant.html's ⋯ (markup identical
  to home) + `initSettingsUI()` in `initChrome`. **Adversarially safety-reviewed**
  (see reviews/). ✅ **Device-confirmed 2026-08-09** — scripted, not by hand:
  `tools/device_check.mjs` drives the real Settings UI in headless Chrome on a
  throwaway `--user-data-dir` at 390 px. Flipping the Peanuts allergen lights up
  all 10 tagged dishes on R & S Satay Noodle House live; adding a profile clears
  them and swaps the hearts/ratings; switching back restores both — 15
  assertions, `navigations since load = 0` throughout. 🚩 A **real-phone
  eyeball stays the owner's option**, never a blocker: headless Chrome proves the
  wiring, not how iOS Safari paints it. Known by-design trade-off: a
  settings/profile change
  re-renders the whole menu, so an in-progress **search query + scroll position
  reset** (and the ad-hoc dietary-chip toggle). 🎯 **Owner ruling 2026-07-25 —
  queue a refinement** `[M]`: a later session preserves in-session UI state
  (search query, scroll position, dietary-chip toggle) across the safety
  re-render. **Hard constraint:** the allergen/dietary re-apply MUST keep sharing
  the first-paint code path — preserving UI state must not fork the render, or it
  reintroduces exactly this session's stale-highlight race.
  ✅ **Shipped 2026-08-09** (wt: faves-ui-state). New `site/js/ui-state.js`
  brackets the re-render instead of touching it: capture before, restore after,
  and only ever through the handlers a tap would run (set the field + fire its
  `input` event; `.click()` the chips; scroll last). `render()` is byte-for-byte
  the call it was, so the constraint holds. Chip state is kept as a *delta* from
  the pre-selection that painted the row (stamped on `.diet-chips` as
  `data-preselect`, because by capture time the settings change has already
  committed) — so a dietary *preference* change still wins while an ad-hoc
  toggle survives. Every step degrades rather than throws; a bug here can only
  cost convenience, since the safety render has already completed. **Owner
  ratified the delta rule 2026-08-09** ("the option where you can see your
  settings did something").
  🔎 Two browser findings the reasoning would have missed: `showModal()` on the
  Settings sheet scrolls the document to 0 and the re-render destroys the anchor
  the browser would have restored from — so scroll is remembered separately,
  ignoring anything that moves while a dialog is up; and the app's smooth
  `scroll-behavior` means the restore has to ask for an instant one explicitly,
  or it animates. Pure logic unit-tested (`tests/ui-state.test.js`); browser-proven
  at 390 px on a fresh `--user-data-dir` (Chrome 151 headless over CDP) —
  **23/23** behavioural checks, the same harness scoring **9/23** against the
  pre-change tree served side by side. The recipe screen was checked and
  **left alone** — its render swaps the article atomically and no recipe carries
  an image, so it never lost scroll (measured); a recipe photo would change that.
  ✅ **Owner ruling 2026-07-24 — dedicated browser-tooling session: done
  2026-08-09** (wt: faves-device-check). `node tools/device_check.mjs` is the
  scripted, re-runnable device check the ruling asked for — a local static
  server, headless Chrome on a fresh `--user-data-dir` (the only reliable way
  past a stale SW), real mouse input through the real Settings UI, exit 0/1/2.
  Zero npm: it speaks the DevTools Protocol over Node's own WebSocket, and
  nothing it needs ships in `site/`. It has teeth — with
  `settings.subscribe(reapply)` removed from `menu.js` as a negative control,
  exactly the two allergen assertions fail. The live allergen re-highlight is
  therefore no longer "proven-by-tests only"; it is **device-confirmed**. Listed
  in the verify blocks in `CLAUDE.md` and `CONTRIBUTING.md`.
- ✅ **Language stays per-profile** — owner ratified the ADR 0012 scoping as
  shipped. No change.
> ✅ **Ratings UX — settled 2026-08-16.** Owner: *"I've decided to keep the
> current rating stars."* Attempt 3 is **cancelled, not parked** — ADR 0019's
> 1–5 slider is the answer, and no superseding ADR is needed. The two rejected
> designs and why they were rejected → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md), so
> neither is re-proposed.
