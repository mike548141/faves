- [ ] **Pandan's pin is a street centroid** `[XS][data]` — OSM carries no house
  number for that street address, so the stored pin is the street, not the door. Kept
  because the venue is ~15 km out, where the error cannot change a distance
  sort. Worth a house-level fix if OSM ever gains the number.
  🔎 **Re-checked 2026-08-16 with `tools/audit_coords.py` (77 live geocodes, 0
  errors): OSM still has no house number.** The live Nominatim response for the
  Melling branch's stored address returns `addresstype: road` with no
  `house_number` key, and geocodes to within a metre of the stored pin — because
  the stored pin *is* that same street centroid. Left exactly as it was; never
  invent a coordinate. Claim released: this stays open as a standing re-check,
  not as work, and the re-check is one `audit_coords.py` run.
