- [x] ✅ **The retired `sprig-and-fern` test fixture — renamed** (`b92270c`), and
  it was **worse than the item described**. The item said the id was stale and
  "read as a mistake". In fact `renames.js:38` maps it to `sprig-and-fern-tawa`,
  so those tests were exercising the venue-rename migration **by accident** —
  passing for a reason nobody intended. Renamed to `fixture-venue` where the test
  meant "any old venue id", and deliberately left where a test exercises the
  migration on purpose (`ratings.test.js`, and one composition test in
  `dish-id.test.js`).
