- **2026-08-08 (Sushi Bi, TJ Katsu and Subway — Opus session)**: Owner asked
  for three additions. Two came in menu-complete, one as a stub, and the
  split was decided by what each venue actually publishes.
  **Sushi Bi** turned out to run a live Shopify storefront, so its 37 pieces
  and platters came from the shop's own product feed with real prices and the
  venue's own dietary tags (`Gluten Free` → `gf`, `vegetarian` → `v`). Three
  CBD stores: Woodward Street, Willis Street and the Railway Station one.
  **TJ Katsu**: 23 dishes across Entrees / Main dishes / Bento from the
  venue's own full-menu page, and all seven branches with per-branch hours.
  **Subway**: stub, five branches (Johnsonville, Tawa, Karori, Courtenay
  Place, Mulgrave Street).
  **Hours and phones deliberately left unstated for Subway.** No first-party
  source was reachable — `subway.co.nz` serves a broken TLS certificate
  (cert altnames are Akamai's, not the domain's) and its find-a-store page is
  JS-driven off an unreachable API. Every remaining source is a third-party
  directory, and they contradict each other: Johnsonville alone gave three
  different weekday closes across four aggregators. `hours: null` is the
  honest record. Website points at `https://www.subway.com/en-nz`, which is
  the only Subway NZ URL that passes TLS validation.
  **Coordinates** geocoded from OSM Nominatim (`countrycodes=nz`, 1 req/sec).
  Two branches ship with no pin at all — the TJ Katsu airport counter and the
  Mulgrave Street Subway — because Nominatim returned only road segments
  there, and ARCHITECTURE's rule is that a wrong pin is worse than none (an
  absent pair just searches by text). `validate.py` warns on both, as designed.
  **Allergen tagging kept sparse**, same discipline as the Gold Lining pass:
  tagged only where the source states it or the dish name makes it
  unambiguous. So prawn and scallop dishes carry `contains-shellfish` and
  cream-cheese rolls carry `contains-dairy`, but the kanikama (surimi) items
  carry nothing — surimi is fish-based and the venue never states a crab
  content. On TJ Katsu, `v` went only on the four vegetable entrees, **not**
  on the tofu mains: those are served with miso soup, which is commonly made
  with bonito dashi, so `v` there would have been an inference that could be
  wrong.
  **Judgement recorded — Sushi Bi's price band.** Its menu is priced per
  piece (~$1.80–$2.50), so `price.js`'s median made the card read "about $2
  per person". Set a curated `priceBand: "$"` **and** `pricePerPerson: 12`
  (about six pieces, a normal grab-and-go lunch); the band alone was not
  enough, because the code only suppresses a derived figure when it
  *contradicts* the band, and $2 agrees with "$". The 12 is our call, not the
  venue's — flagged to the owner.
  **Judgement recorded — a closed day inferred from an omission.** Sushi Bi's
  hours block enumerates Monday to Saturday (Saturday "temporally closed"
  [sic]) and stops; three TJ Katsu branches enumerate Monday to Friday and
  stop. `hours` must be a full week, so the unlisted days were recorded as
  closed rather than dropping the whole week to `null`. That reads an
  omission from a bounded enumeration as "closed" — defensible, but it is a
  reading, not a statement.
  ⚑ **Neither menu is owner-verified**: both were taken from the venues' own
  sites today, so `verified` stays `null` on both. TJ Katsu's site is
  visibly stale — copyright ©2017, and its own "Lunch Special" nav link
  404s — so its prices are the weaker of the two.
  🚩 **Also unrecorded, no field for it**: TJ Katsu's menu page states the
  full menu is only available at the Manners Street branch and both Courtenay
  Place branches — the other four carry a subset. The schema has no per-branch
  menu scoping, so this is written down here and nowhere else.
  Verified: validate 31 files (15 warnings, 2 of them the deliberate missing
  pins); node --test 320 pass; no-deps; SBOM check; floor hook green; all
  three screens exercised in headless Chrome at mobile width, including the
  corrected "$12 per person" header, Subway's "menu coming soon" state and
  the home list at 31 places.

