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

  **Done (worker `w/080-300`, 2026-10-18; PR to follow).** The egg rule's mayo
  family (`mayonnaise|mayo|aioli`) now carries fixed-width lookbehinds for
  `vegan `, `vegan-` and `eggless `, never an item-level veto. Two probe groups
  in `tools/test_tag_allergens.py` pin it: `vegan mayo is not an egg emulsion`
  (the real Hei line and four spellings) and `a real egg beside a vegan mayo is
  still egg` (real mayo beside vegan, vegan mayo plus a fried egg, vegan mayo
  plus a bare aioli, hollandaise, `vegan garlic aioli`, controls). Evidence:
  the pre-change tool fails the first group on 5 lines and passes the second;
  the two new breakers (lookbehinds removed; rebuilt as an item-level
  `exclude`) are caught by the first and second group respectively.
  🔎 **Findings the item did not have.** (1) The Hei "Vegan" rows carry no `vg`
  tag, so today's corpus has **no** `vg` + `contains-*` pair at all; the
  contradiction is the dish's NAME against its tag. (2) The `validate.py`
  warning the item asks about **already exists**
  (`check_self_contradicting_claims`, reading `CONTRADICTS` in
  `site/js/addons.js`, which lists dairy, egg, shellfish and fish under `vg`);
  it fires on 0 dishes now. `test_validate.py` gains four cases pinning each
  pair. (3) `egg-free` / `egg free` are NOT lookbehinds: the bare word `egg` is
  its own STATED rule, so they would change nothing; reading them as an
  absence is a hedge, which no venue in the corpus writes. (4) The tagger never
  removes a tag, so the two Hei Vegan rows (`vegan`, `vegan-lunch`) still carry
  `contains-egg`; `--explain --apply` only dropped their stale tip. Removing the
  tag is a hand edit and is left for a ruling. (5) The two "vegan mayo/aioli
  available" section notes (Garage Project, Sprig & Fern Berhampore) no longer
  appear in the needs-a-human list, which went from 5 to 3.
