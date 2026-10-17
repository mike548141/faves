- [~] 🔎 **"Vegan mayo" is tagged `contains-egg`, on a dish the venue calls
  (claimed 2026-10-17-2046, faves-b4, wt: faves-080-300)
      vegan** `[S][tools]` — found 2026-10-16 by the worker adding Hei
      (`080/290`), filed by `faves-11`.

  Hei's lunch "Vegan" bao is made with vegan mayo. The tagger reads `mayo` as
  egg, so the dish carries the venue's own `vg` and a derived `contains-egg`
  at once. Over-warning is the safe direction, so it was left as tagged. But
  a dish that says both vegan and egg is a contradiction a reader can see, and
  **no gate refuses the pair** (`validate.py` passed it).
  **The work:** narrow the egg rule with a lookbehind for `vegan ` / `egg-free
  ` / `eggless ` before `mayo`/`aioli` (a lookbehind, never an item-level
  veto: the water-chestnut lesson). Add a break-probe for the dangerous case,
  a real mayo beside the vegan one. Consider whether `validate.py` should warn
  on any `vg` + `contains-egg|contains-dairy|contains-fish|contains-shellfish`
  pair, so the next contradiction is caught by a gate rather than a reader.
