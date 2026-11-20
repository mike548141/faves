- [x] ✅ **Shipped** (`80da634`). Original text: *"the result row already shows
  'Te Aro · Malaysian'; making the matched part visibly the reason would let the
  reader judge relevance themselves, which is the honest version of ranking and
  may make 27a optional. Try this one first."*
  `search()` returns `matchField` and `matchText`; `resultRow()` gained
  `nameMatch`/`subMatch` (DOM nodes wrapped in `<mark>`, never `innerHTML`) and a
  plain-text `note`. `buildIndex()` now stores `address`, `city`, `services` and
  `phone` per entry so the check is **per field** rather than against the
  flattened haystack.
  **Accessibility, stated as the reason and not as a checkbox:** the `<mark>` is
  a bonus for sighted readers and never the sole carrier — the wrapped word is
  already inside the announced name, so a screen reader hears identical text
  either way. The one case that would otherwise be screen-reader-invisible — a
  match on a hidden field, with nothing on the row to highlight — is exactly the
  case that gets the `note` as ordinary readable text. Bold as well as
  background, so nothing depends on colour.
  🔎 **The item's own measurement had gone stale within the day.** Re-run in a
  real browser at 390 px: "Bar" reproduced its four cited venues exactly (with
  "Bar" highlighted in the **name**, while Baylands Brewery and Dirty Little
  Secret — genuinely `cuisine: Bar` — highlighted in the sub instead), and
  "Courtenay Place" showed "Matched: address" on five venues while KC Cafe, whose
  `area` *is* Courtenay Place, highlighted genuinely. But **"Pub" no longer
  returns 6 places with 5 name-coincidences** — the corpus moved under the
  measurement. The mechanism handled it correctly regardless.
