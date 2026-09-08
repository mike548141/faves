- [ ] **14f — Combos: several dishes ordered as one** `[M][schema][design]`
  (owner-raised 2026-08-16) — *"the concept of Combo's e.g. coffee and scone,
  where multiple dishes are combined to make a dish to order them together with
  its own pricing."* Distinct from an add-on: an add-on modifies one dish, a
  combo **is** a dish assembled from others, at its own price. 🔎 **They already
  exist in the corpus, flattened.** `wellington-kebab-grill.json` carries a
  `Combos` section — "Kebab combo #1, $22.50, Your choice of kebab, chips and a
  330ml Coca-Cola drink" — as three plain dishes whose *composition lives in
  prose*. So the feature is not "add combos", it is "give the composition a
  shape". Design calls: does a combo reference member dishes by id (then the
  order line can itemise, and dietary tags compose — the Theme 14d problem
  again) or stay a standalone priced item with a description? Does "your choice
  of kebab" make a combo a **pick-one group over other dishes**, which is
  structurally the same machinery as 14a's single-select add-on group? If it
  is, build 14a first and 14f becomes small. Note the third case already in the
  same file: **"Combo upgrade, $6, Added to a kebab, mixed kebab, iskender or
  salad"** — that is an *add-on that turns a dish into a combo*, so 14a and 14f
  meet in one record.

  🔑 **One of the two design calls above is now answered — 2026-09-09.** The
  owner ruled on `490/050` that a size or a protein is a **choice on one
  dish**, and that ruling's own note says *"`200/020` (14f, combos) … inherits
  the answer."* So *"your choice of kebab"* **is** a pick-one group over the
  members, structurally the machinery `310/080` (`28k`) is building as a
  `selects` group — not a new combo entity. What the ruling does **not**
  answer is the first design call: whether a combo references its members
  **by id** so the order line can itemise and dietary tags compose. That is
  still open, and ADR 0048 §5's constraint on it stands unchanged.
