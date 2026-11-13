## 2026-08-22 0250 UTC — Daily Bakery, Lower Hutt: new venue, full menu

**Owner-directed intake, two mid-turn corrections.** The ask began as "Daily
Bakery in Upper Hutt" with two dishes from a visit of 2026-08-21; the owner
then supplied the real address mid-turn (High Street, **Lower** Hutt — the
record follows the address, not the first recollection) and pointed at the
venue's online-ordering presence as the menu source. Harvested the full Uber
Eats listing: **50 dishes / 9 sections**, `verifiedBy: delivery-app` — the
class's known bias (platform markup) accepted rather than laundered into a
stronger claim. Picks are the owner's two in-store finds: the gourmet chicken
pie (priced on the listing) and the blueberry loaf (absent from it — carries
`needs: price` with a note saying where it *was* seen).

**Judgement calls, disclosed rather than silent:** Google's listing names the
shop "Daily Bread Bakery"; the record keeps the owner's (and both delivery
platforms') "Daily Bakery". Hours left `null` — two aggregators disagreed, and
a guessed timetable is worse than an absent one. One near-duplicate typo row
("Bre cheese" panini, same price as its correctly-spelt twin) left out. Promo
prices recorded at base value. `tag_allergens.py --apply` laid 70 tags;
`contains-gluten` hand-added to the two ficelles and the minced savoury, whose
words its table doesn't know — the fail-safe direction only.

**Close state:** one commit (`0754a1b`), pushed = deployed. Gates green:
validate, split_data, fallback, versions lockstep (both constants bumped),
node --test 1116, boot_check 24/24 against `site` at the right SHA. 🚩 The
atelier pin `f2104f0` has drifted — origin/main is well ahead (board/review
records plus at least one method commit). Not absorbed this session; the pin
bump is its own deliberate read, left for a session taking it as work.

