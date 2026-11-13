- **2026-08-07/08 (Gold Lining menu from photos — Opus session)**: Owner
  photographed the printed BRUNCH and DRINK cards plus the cabinet, bakery,
  slice and blackboard displays in-store; transcribed to a full record.
  `gold-lining-cafe` stub → **menu-complete**, 106 items over 14 sections,
  `verified` 2026-08-07, `priceBand` `$$`. Lockstep held both ways: first
  commit bumped DATA *and* SHELL (the no-JS fallback card in `index.html`
  was promoted from "Menu coming soon" to a real link with a Cafe chip);
  the follow-up correction bumped DATA only.
  **Allergen tagging was kept deliberately sparse** — tagged only where the
  card states it or the dish name makes it unambiguous, because "no tag"
  means *not stated*, never *free of* (ARCHITECTURE's tag vocabulary rule).
  So Winter Porridge carries `contains-nuts`/`contains-peanuts` (almond and
  Pic's peanut butter are named on the card) and the PB/Snicker cups carry
  `contains-peanuts`, while the other raw-vegan cups carry nothing despite
  raw-vegan slices commonly being cashew-based — inferring "safe" is the one
  error class that can actually hurt someone.
  Owner then confirmed the two uncertain reads (Double Choc Cookie $5.50 GF;
  Chicken Croissant → **Chicken & Brie** Croissant $14.50 — the guessed name
  was right, the price read off the neighbouring card was not) and added
  Bliss Balls (vegan + GF) and the Huskee keep cups as a Merchandise section.
  **Judgement recorded on the bliss-ball jar label** ("cashew, almonds,
  matcha, apricot, dates, chocolate, chia, coconut, sunflower"): owner
  unsure whether flavours or ingredients, stored as ingredients because that
  reading holds either way — if they are flavour variants then cashew and
  almond are two of them, so the jar contains tree nuts on both readings.
  Splits into one item per flavour later with nothing undone.
  **Left unrecorded on purpose** (no invention): the Falafel Wrap price
  (label behind the cabinet frame), the Bliss Balls price (no card in shot),
  and the juice fridge entirely (no legible prices, one brand only partly
  readable). Also still open for this venue: `picks` is empty, and the
  brunch card's 7.30am–2.30pm window sits inside the record's 07:30–15:30
  weekday hours — left alone as a service window, flagged to the owner.
  ⚑ **Concurrency note**: a parallel session landed five commits mid-work
  (data export, offline precache fix, Churton refresh). It had committed and
  pushed cleanly, so there was no collision — this session rebased onto it
  and bumped cache versions from the *current* values, not its own stale
  ones. Test count moved 301 → 320 underneath.
  🚩 **Consequence for the flip**: ADR 0022's gate evidence was taken at
  `0243e9c` and is now stale. Not a defect — GO-PUBLIC.md step 3 re-runs
  every gate on the exact tree that flips. Do not flip on the old numbers.
  Verified: validate 28 files; node --test 320 pass; no-deps; floor hook
  green on every commit.

