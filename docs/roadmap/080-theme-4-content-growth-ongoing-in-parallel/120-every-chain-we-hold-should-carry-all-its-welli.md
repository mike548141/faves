- [ ] 🚩 **Every chain we hold should carry all its Wellington-region
      branches** `[L][content]` — owner-directed 2026-08-16: *"Many of the
      restaurants are chains or at least have multiple branches/locations. Where
      that is true lets ensure that we at least have all their locations in the
      Wellington region added to Faves."* This is a standing instruction, not a
      one-off: a chain added later arrives with the same obligation.
      ⚠️ **The "5 records / 22 branches" figure this item used to carry was
      wrong, and wrong in the direction that hides work.** Re-derived
      2026-08-16 across all 55 records: **12** records carry a `locations`
      array, holding **29** branches — 19 with hours, 26 with a pin. The
      earlier count saw only the five *multi*-branch records (McDonald's 5,
      Subway 5, TJ Katsu 7, Sushi Bi 3, Pandan 2 = 22) and silently dropped
      every record whose `locations` array holds exactly **one** entry. Those
      seven are the point of this item, not a rounding error:
      **BurgerFuel, Gong Cha, Hell Pizza, Kaffee Eis, Noodle Canteen, Pizza
      Hut** and Sprig + Fern Tawa. Six of the seven are national chains with
      several Wellington-region branches each, all sitting in the corpus today
      as a single site. So the sweep is **eight chains, not two**, and the
      hidden six are the ones nothing has ever looked at. The five Sprig + Fern
      taverns remain separate records rather than branches, per the split that
      landed with ADR 0051.
      🔎 **The lesson is the measurement, not the number.** A count derived from
      "records with more than one branch" answers a different question from
      "records that are a chain", and reads identically in prose. Derive this
      one from `len(locations) >= 1` and re-derive it rather than quoting it —
      the same trap this file's `stub` count fell into three times.
      **What has to be true for each branch, or it is worse than absent:**
      `address`, `lat`/`lng` (geocoded from the address with the OSM tool —
      never invented; a wrong pin beats no pin only in the sense that both are
      bad), `phone`, and `hours` — the last because
      [ADR 0054](../../decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md)
      now picks the branch that leads a card by *"nearest, and open"*, so a
      branch with no hours can never lead on merit. Adding branches without
      hours makes that rule weaker, not stronger.
      🔎 **Sequence this after the hours gap below, not before it.** Ten
      branches already lack hours; going wide before going deep multiplies the
      hole rather than filling it. And note the count matters to the UI: past
      five branches a venue needs the two-step "Show all" again (ADR 0054's
      `NEAR_BRANCH_LIMIT`), so a chain going from 5 to 9 changes how its card
      behaves — worth re-checking `branch_check.mjs` against whichever venue
      grows the most.
      ✅ **First pass done 2026-08-16** (`9cae14e`) — **18 branches added across
      three chains, every one with address, phone AND hours.** BurgerFuel 1→4,
      **Hell Pizza 1→14**, Kaffee Eis 1→3.
      🔎 **The sequencing rule was read as "no branches without hours", not "no
      branches"** — a branch added *with* hours strictly improves the ratio ADR
      0054 depends on, so a blocked chain does not block a readable one. Three
      chains were left at 1 branch under exactly that rule: **Gong Cha**
      (addresses and phones exist first-party, no hours anywhere on the site),
      **Noodle Canteen** (only a chain-wide blurb, which demonstrably disagrees
      with the Johnsonville hours we already hold — so it is wrong per-branch,
      not merely coarse) and **Pizza Hut** (no static store directory; same class
      as McDonald's).
      🚩 **Hell Pizza is now the corpus's largest chain and the first venue where
      "Show all" hides nine branches.** `branch_check.mjs` now drives it by
      default — its fixture comment had claimed tj-katsu was "the only venue left
      that still needs the second step", true when written and false the moment a
      chain grew, with nothing to say so. 33 assertions across three venues.
      ⚠️ **Two source claims were checked rather than trusted.** BurgerFuel's site
      renders "Temporarily Closed" on every Wellington store — it is a Webflow
      `w-condition-invisible` field, hidden by the site's own CSS, that markdown
      conversion flattened into visible text; it appears identically on a store
      verified in person the day before. And past-midnight hours use the existing
      **null-close** convention (ADR 0006), already used by `pizza-hut` and
      `sprig-and-fern-tawa` with test coverage, rather than a new one.
      🔎 **Hell Pizza's hours came from its own JSON API**, found by reading the
      site's `config.js`/`hell_api_service.js` when the store finder turned out to
      be a JS SPA needing a click. That is the same wall McDonald's and Subway
      present — and the lesson is that it is worth one look at what the SPA itself
      calls before declaring a chain unreadable.
      **Still open:** the three refused chains, and the rest of the region for the
      chains already in. Claim released.
