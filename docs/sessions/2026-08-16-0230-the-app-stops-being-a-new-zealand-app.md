## 2026-08-16 02:30 UTC — the app stops being a New Zealand app

Continuation of the session above. Five owner asks, taken in order; a worktree
(`wt/global-faves`) from the point the owner warned that parallel sessions were
live.

**1 — Timezone, currency, hemisphere (ADR 0043).** `place.js` resolves where a
venue is. `timezone` per *branch* (a chain either side of the Tasman is open in
each on its own clock), `currency` per venue (one menu, one currency),
hemisphere *derived from latitude* so it cannot disagree with the pin.
`makeClock()` freezes one instant and reads it per zone, memoised — the list is
still ranked against a single moment while each venue is judged on its own.
Price bands are keyed by currency and an uncalibrated one gets **no** derived
band: a band is a calibration against local prices, not an FX conversion, and
this repo has already had to correct one invented threshold (ADR 0036). An order
spanning currencies totals per currency. **No data migration** — both fields
default to the collection's home, so 38 records were correct unchanged.

**2 — A regression we shipped, and the check that was missing.** The 0043 commit
called `venueTimezone` in `app.js` without importing it. `init()` threw, the home
screen served its no-JS fallback, and it went live — while 570 unit tests,
`device_check` 19/19 and `cook_check` 36/36 were all green. Nothing exercised the
*home screen's boot*: the unit tests import modules one at a time, and both
browser checks drive a menu page. The fallback is what made it invisible — the
page looked like a working list of places, because that is exactly what the
fail-soft `<ul>` is for. Hotfixed to `main` inside the same turn it was found.
`tools/boot_check.mjs` now loads each screen and asserts its own JS drew it;
verified by reintroducing the bug (exit 1, naming the ReferenceError). Its
readiness marker is `#result-count`, **not** `.card-link` — the fallback uses the
same class, so the obvious marker is satisfied by the very failure being hunted.

**3 — Settings: eight rows to six.** Language + units are one question (how the
app talks to you); distance + maps app the other (how it gets you to a place).
Each half keeps a sub-heading. The units note claimed "menu prices stay in New
Zealand dollars" — untrue since ADR 0043, and prices were never a unit
preference. Te reo for the merged rows recombines strings already in `reo.js`
rather than inventing vocabulary.

**4 — A chain keeps its name (ADR 0011 applied, at last).** "BurgerFuel
Johnsonville" is a chain and a branch. Five records restructured; "Takeaway @
Churton" and "Khandallah Trading Company" keep theirs, because there the place
name really does contain the place. The interesting half is that **an id is not
private plumbing** — it is in every shared link and every heart, rating and order
line on a family phone, and both failure modes are silent. `renames.js` holds the
table, `data.js` canonicalises *before* the fetch that would 404, and the three
personal stores rewrite ids on read non-destructively. `validate.py` reads the
table out of the shipped JS rather than keeping a second copy that could
disagree with what the browser runs.

**5 — Menus in another language (ADR 0044).** `name` **stays a plain string** —
it is the dish's identity (`slug(name)` anchors, `picks`, `d:<venueId> <name>`
hearts), so translations are a sidecar. The heading takes the best rendering for
the reader; the rest sit beneath, each with its own `lang`, which WCAG 2.2 AA
3.1.2 requires and is why the resolver returns `{text, lang}` and never a bare
string. `th-Latn` vs `th` is load-bearing: it is the only thing that hands a
reader of Thai the script rather than a romanisation. Nothing shipped uses it —
inventing a real shop's menu to demo a feature would put a fabricated fact in a
public repo — so it was proved by grafting a translation onto a scratch copy and
reading the DOM in headless Chrome.

**6 — Seven places from the owner's Airbnb guidebook.** 22 entries in its Food
scene section, 13 already held. Seven added as stubs with OpenStreetMap
addresses and pins (`detailsVerifiedBy: third-party` — nobody stood in them).
**Three refused:** Chilly Pot, Crepes A Go Go and COSMIC Vape & Coffee have no
findable address, and a guessed pin sends someone to the wrong door. Moore
Wilson's is a deli in the guidebook's Shopping section, not a place you eat.

**Verification.** `validate.py` 45/0 · `test_validate` **30** mutations (9 new,
each new validator check also proved by breaking a real record) · `node --test`
**591** (46 new, in `place`/`renames`/`lang` plus the hours/temporal rewrites) ·
`boot_check` **11** · `device_check` 19 · `cook_check` 36 · no-deps, SBOM,
visibility clean. `SHELL_VERSION` → `2026-08-16.5`, `DATA_VERSION` →
`2026-08-16.2`.

**Still owed, recorded not done.** ROADMAP Theme 21 holds the three unfindable
addresses, the seven stubs' missing hours/phones/menus, and an owner ruling on
whether bars belong in an eating app's list at all.

