- **2026-07-08 (nest dishes under their place in Favourites, Theme 3)**:
  Replaced the flat "Places / Dishes" favourites view with a **nested one**:
  group by `venueId` (first-seen order), each place a parent header
  (accent-soft, emoji + name, own venue heart) with its hearted dishes on an
  indented rail beneath. Key behaviour (owner's spec): a venue shows **even
  when only a dish of it is hearted** — parent heart then empty (tap to also
  save the place), filled when the venue itself is favourited; each dish
  keeps its inline un-heart; dish sub no longer repeats the venue name.
  Bespoke `favVenueGroup` renderer in `app.js` reusing `resultRow` from
  `results-view.js` (search view still uses `groupSection`, untouched). Kept
  the existing no-live-rerender behaviour (heartButton flips in place; the
  list rebuilds on reopen) to avoid focus churn. Summary → "N places, M
  dishes saved". Browser-verified via CDP at 390px with a seeded mix
  (KK Malaysian venue+2 dishes filled; Sprig+Fern dish-only, empty parent
  heart; Cook at Home recipe): 3 groups, correct hrefs, correct heart states.
  node --test 108 pass; check_no_deps clean. VERSION → 2026-07-08.26
  (app.js/css only). CHANGELOG + ROADMAP updated (item done).
