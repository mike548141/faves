- [x] **A negative dish price validated clean** `[S][schema]` — fixed
  2026-08-09. Found by mutation-testing `validate.py`: 8 deliberate
  corruptions of a real record, 7 caught, this one through. `price` was
  type-checked (number, not bool, not string, series values checked
  identically under ADR 0023) but never **sign**-checked, while
  `pricePerPerson` ten lines above it had always required `> 0`. One
  rule in the file guarded its sign and its neighbour did not.
  The bound shipped is `>= 0`, not `> 0`: a genuinely free item is a
  real thing a menu can say, and refusing it would push the value to
  `null`, which already means "no price recorded" — a different fact.
  No data changed (checked: no zero and no negative prices across all
  31 records; the lowest real price is $0.90).
  **The durable half is `tools/test_validate.py`** — the harness made
  permanent and wired into CI. It copies the data + tools to a temp
  dir, breaks one real record 14 specific ways, and asserts the gate
  errors, warns or accepts as specified. Self-checked by deleting the
  new sign check and confirming the harness exits 1 naming the hole,
  then restoring it and confirming exit 0 — a harness that cannot fail
  would have been worthless. It is this repo's **first Python test**:
  483 JS tests and zero Python ones meant every `tools/*.py` gate was
  itself unexercised, and a validator's failure mode is silence — a
  check that never fires looks exactly like data that is always clean.
