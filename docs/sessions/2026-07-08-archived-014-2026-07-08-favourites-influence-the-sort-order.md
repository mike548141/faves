- **2026-07-08 (favourites influence the sort order)**: Owner follow-up:
  favourites should lift a place in the home order too — an open, nearby
  *favourite* (venue, or a venue holding a favourite dish) should sit
  higher. Added a `favouriteIds` Set param to `rankVenues` and slotted a
  favourite dimension into the sort key **between availability and
  distance**: reachable → tier → favourite → nearest → curated. Chosen so a
  favourite lifts within its tier but never overrides availability (a closed
  favourite you can't order from still sits below anywhere open), and beats
  distance within a tier so favourites have visible pull even with "Near me"
  on (`FAR_KM` still gates the genuinely-unreachable). app.js flattens both
  venue- and dish-hearts to venue ids (`new Set(favourites.items().map(e =>
  e.venueId))`) and re-ranks on any favourites change (`favourites.subscribe
  (render)`), so hearting re-orders live / across tabs. ranking.js stays
  pure (takes a plain Set, not the store). 4 new ranking tests (89 total).
  Browser-verified at 390px: favouriting the *last* open venue (Khandallah
  Trading Co) moved it 5→0; favouriting a *dish* in another (Sprig + Fern)
  moved that venue 5→0 too. node --test 85→89 pass; validate.py +
  check_no_deps.py clean. VERSION → 2026-07-08.18. Pushed the prior batch
  (24c334f) to origin/main at the owner's go — Cloudflare Pages deploys from
  main. CHANGELOG + ROADMAP + ARCHITECTURE updated.
