// The two Google Maps weeks (roadmap 080/130, ADR 0161) that cross midnight,
// read from the SHIPPED records rather than a hand-written week: a fixture here
// would pass with the data deleted. Both are shapes the corpus had only one
// example of (Dragonfly, ADR 0094), so the owner-ruled Bunny Street Friday is
// pinned at the edges: shut at 06:30, open all evening, and not shut at the
// stroke of midnight, where it must run straight into Saturday's 24 hours.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openStatus, formatDay } from "../site/js/hours.js";

const branch = (venue, id) =>
  JSON.parse(readFileSync(new URL(`../site/data/restaurants/${venue}.json`, import.meta.url), "utf8")).locations.find(
    (b) => b.id === id,
  );
const at = (dow, hh, mm = 0) => ({ dow, minutes: hh * 60 + mm });
const SAT = 6, FRI = 5, SUN = 0;

test("McDonald's Bunny Street: Friday runs to midnight and on into a 24-hour Saturday", () => {
  const h = branch("mcdonalds", "bunny-street").hours;
  assert.equal(openStatus(h, at(FRI, 6, 30)).state, "opening-soon");
  assert.equal(openStatus(h, at(FRI, 20)).state, "open");
  assert.equal(openStatus(h, at(FRI, 23, 30)).state, "closing-soon");
  for (const [d, hh, mm] of [[SAT, 0, 0], [SAT, 3], [SAT, 12], [SAT, 23, 59], [SUN, 0, 0]]) {
    assert.equal(openStatus(h, at(d, hh, mm)).state, "open", `${d} ${hh}:${mm}`);
  }
  assert.equal(openStatus(h, at(SUN, 22, 30)).state, "closed");
  assert.equal(formatDay(h.sat), "Open 24 hours");
});

test("Subway Courtenay Place: Friday and Saturday close at 3am, the next morning", () => {
  const h = branch("subway", "courtenay-place").hours;
  assert.equal(openStatus(h, at(FRI, 23)).state, "open");
  assert.equal(openStatus(h, at(SAT, 1, 30)).state, "open");
  assert.equal(openStatus(h, at(SAT, 3, 30)).state, "closed");
  assert.equal(openStatus(h, at(SUN, 2, 30)).state, "closing-soon");
  assert.equal(openStatus(h, at(SUN, 3, 1)).state, "closed");
});
