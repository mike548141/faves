- [x] ✅ **`temporal.js` no longer deletes a pick written as a `dishId`**
  (`727cea9`). Original text: *"`temporal.js:524-528` intersects `record.picks`
  against a `Set` of live dish names, so a pick written as a `dishId` is deleted
  at that gate and vanishes from the page silently. Harmless today (every pick in
  the corpus is a name) and primed for whoever first writes one as an id."*
  Now filtered through `findDish`, the single resolver, reaching an id, a
  slug-as-id, a name and a `formerId`. The gate still does its real job — a pick
  whose dish is genuinely out of season is still dropped, in every form, and
  returns in December. Cost measured rather than assumed: O(dishes) → O(picks ×
  dishes), which over the real corpus (55 records, 1781 dishes, 33 picks) is
  **2.90 ms per `resolveRecord` pass**.
