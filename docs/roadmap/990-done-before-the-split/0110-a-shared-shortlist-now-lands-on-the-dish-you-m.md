- [x] ✅ **A shared shortlist now lands on the dish you meant** (`b92270c`).
  Original text: *"`share-codec.js` packs shortlist dishes as a bare array of
  name strings; changing the element type would break every decoder already in
  the wild, so it decodes through `slug(name)`. A shared shortlist naming a
  disambiguated row (the Gold Card Cheeseburger) arrives as the bare-slug one.
  Not a regression — precisely what it did before ids existed — but not fixed
  either. Order lines were fixed, by appending a positional slot; the same trick
  needs its own slot shape here."*
  🔎 **The order-line trick did not transfer, and the reason generalises past
  this repo.** An order line is a **positional array**, so its id became slot 4.
  A shortlist group is a **keyed object** `{v,n,r,s,f,d}`, so the equivalent of
  "append a slot" is a new **key**, not a new position. `d` stays a bare string
  array byte for byte; the id rides in `k`, an optional array positionally
  parallel to `d`, `null` where the id says nothing the name doesn't, and the
  whole key omitted when no dish in the group carries one. Same invariant as the
  order line's — an old decoder reads `d` and never looks at `k` — reached by a
  different mechanism. `CODEC_VERSION` did not move.
  ⚠️ **The alternative you reach for first is unsafe, and was checked rather
  than assumed:** `decodeShortlistItems` reads each element through
  `clip(raw ?? "")`, so a mixed-type element arrives at an old decoder as the
  string `"Cheeseburger,cheeseburger-gold-card"` — **mis-stated, not degraded**.
  🚩 **The producer had to land in the same commit or the feature was dead code
  that every test still passed.** `groupForShare` was throwing the id away, and
  `cart-ui`'s receive dialog would have printed `[object Object]` the moment it
  stopped. Every `g.dishes` consumer in `site/js/` was checked; `app.js` builds
  its own separate grouping and needed nothing.
  **Evidence: a real browser, not a unit test.** A real click on the heart of
  Sprig & Fern Tawa's $21 Gold Card Cheeseburger, then
  `groupForShare → encodeShortlist → decodeShare → favKey`, landing on
  `d:sprig-and-fern-tawa cheeseburger-gold-card` and never the $28 Mains key.
  Red first: with the producer reverted, both burgers collapse onto one key.
