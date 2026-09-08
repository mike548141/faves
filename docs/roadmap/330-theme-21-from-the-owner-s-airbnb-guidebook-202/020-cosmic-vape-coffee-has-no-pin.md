- [ ] **COSMIC Vape & Coffee has no pin** `[XS][data]` — OSM has no entry at
  99 Cuba St for it, so the record carries the street address and no <!-- leakscan:allow: venue business addresses, the same class as site/data — this repo publishes them as its product (ADR 0022 gate 1) -->
  coordinates. Maps opens by address; distance sorting skips it.
  🔎 **RE-CHECKED 2026-09-08 (session faves-o1) — still no pin, and filling one
  would break the repo's own rule.** `audit_coords.py` classes it `no pin ·
  street · fill-review`: a geocode exists for the address, but it resolves to
  the **street**, not the door. The tool's own conservative rule says *"any
  match coarser than house-number → review by hand; a street-centroid geocode
  is not evidence"*, and `270/020` states the principle outright — never invent
  a coordinate. So the honest state is unchanged: maps opens by address, and
  distance sorting skips it.
  🚩 **It is not alone.** The same run shows **six** venues in `fill-review` —
  COSMIC, Hell Pizza Hataitai, Kaffee Eis at the TSB Arena kiosk, McDonald's
  Courtenay Place, Subway Mulgrave Street and TJ Katsu at the airport. Every
  one has a street-level geocode and no pin, and the last four are the shape
  you would expect: a shop inside a larger building, where the street centroid
  is the only thing OSM can offer. **Filling any of them from a street centroid
  would put six wrong pins in the distance sort at once** — which is worse than
  six absences, because an absence is visible and a wrong pin is not.

