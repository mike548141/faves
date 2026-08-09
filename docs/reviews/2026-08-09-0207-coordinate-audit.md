# Coordinate audit — every stored pin against its own address

- **Date:** 2026-08-09 (UTC)
- **Scope:** all 46 coordinate slots in `site/data` — 39 with a stored pin,
  7 empty — audited with `tools/audit_coords.py` (new, this session).
- **Trigger:** ROADMAP **Coordinate audit** `[S]`, raised off the ADR 0016
  bug ("tapped R & S Satay Noodle House, maps opened on 1 Garrett St") on  <!-- leakscan:allow: venue business address quoted from the bug report — same product class as site/data (ADR 0022 gate 1) -->
  the premise that dev-time geocoded coords were **suspect fleet-wide**.

## Headline: the premise was wrong, and that matters

**R & S Satay Noodle House's stored pin is 1 metre from its own address.**
It has never been edited since it was written (`4b45ba7`), and it is simply
the Nominatim answer for 148 Cuba St rounded to five decimal places.  <!-- leakscan:allow: venue business address already in site/data — same product class (ADR 0022 gate 1) -->

So the "~100 m off" in the roadmap was never a property of our data. The
maps app opened on a side street because *it* reverse-geocoded the point we
handed it, not because the point was wrong — which is exactly the failure
ADR 0016 already fixed by handing maps the **address string** instead of a
coordinate. The coordinate was doing its other job (in-app distance maths)
correctly the whole time.

Fleet-wide, the data is in good order: **36 of the 39 stored pins agree
with their address to within 30 m, and 33 of those to within 2 m.**
**Nothing anywhere in the corpus drifts past 100 m, so no coordinate was
corrected.** That is the audit's finding, not a shortfall in it.

## Method

1. `tools/audit_coords.py` inventories every `lat`/`lng` slot in
   `site/data/restaurants/*.json` — venue-level for flat records, and each
   `locations[]` branch with its own street address (ADR 0011).
2. Each address is re-geocoded against OpenStreetMap Nominatim
   (`format=jsonv2`, `countrycodes=nz`, `addressdetails=1`, `limit=1`).
   Nominatim's usage policy is honoured in the tool, not by hand: a
   descriptive `User-Agent` with a contact URL, and a hard 1.1 s gap
   enforced around the socket call. Every response is cached to a scratch
   file (default `/tmp/faves-coord-audit-cache.json`, **not** committed), so
   re-runs cost the API nothing.
3. Drift is the haversine distance in metres between the stored pin and the
   geocoded one.
4. Addresses that name a spot *inside* a building ("Shop 212, Left Bank,
   Cuba Mall"; "Ground Floor, Huddart Parker Building, 1 Post Office
   Square") get progressively simplified retries, and a unit-slash number
   ("7/9 Courtenay Place") is retried as its street number. The tool keeps  <!-- leakscan:allow: venue business address already in site/data — same product class (ADR 0022 gate 1) -->
   asking until a variant answers at house-number level, because a
   street-centroid answer arriving first is not a reason to stop.

### The rule applied

Deliberately conservative — the whole point of the exercise is that a wrong
pin is worse than an imprecise one:

| Condition | Action |
|---|---|
| drift > 100 m **and** the geocode matched the right house number | **correct it** |
| drift 30–100 m, **or** any match coarser than house-number | **review** — leave it, list it here |
| drift < 30 m | fine, leave |

A correction here is a *correction* in the CLAUDE.md sense — we recorded it
wrong, the venue did not move — so it would overwrite in place and add no
history entry. None was needed.

30 m is roughly a Wellington CBD block frontage. Inside it, a
stored-vs-geocoded disagreement says more about which corner of the building
OSM pinned than about our data being wrong.

## Full drift table

`match` is how precisely the geocode landed: `house` = the right street
number, `house-approx` = same number, different letter suffix (OSM holds 4A
where we say 4), `street` = a road or place centroid, which can sit a
hundred metres from the door quite legitimately. TJ Katsu's six CBD branches
are shown as one row — all six matched at house-number level and none drifts
past a metre, so listing them separately would add rows and no information.

| Venue / branch | Drift (m) | Match | Verdict |
|---|---:|---|---|
| satay-kingdom-cafe | 81 | street | **review** |
| groundup-cafe | 33 | house | **review** |
| marigold-takeaway | 10 | house | fine |
| gold-lining-cafe | 9 | house | fine |
| regal-chinese-restaurant | 8 | house | fine |
| kk-malaysian | 2 | house | fine |
| tj-katsu / all 6 CBD branches | 0–1 | house | fine |
| kc-cafe | 1 | house | fine |
| gong-cha / Manners Street | 1 | house | fine |
| pizza-hut-johnsonville | 1 | street | fine |
| thai-tara-express | 0 | house | fine |
| wellington-kebab-grill | 0 | house | fine |
| new-chapter-cafe | 0 | house | fine |
| hell-pizza-newlands | 0 | house | fine |
| kaffee-eis / Courtenay Place | 0 | house | fine |
| charley-noble | 0 | house | fine |
| pizza-pomodoro | 0 | house | fine |
| sprig-and-fern-tawa | 0 | house | fine |
| babaili-malatang | 0 | house | fine |
| rock-yard-restaurant | 0 | house | fine |
| rs-satay-noodle-house | 0 | house | fine |
| spices-indian | 0 | house | fine |
| simmer | 0 | house | fine |
| takeaway-at-churton | 0 | house | fine |
| the-catch-sushi-bar | 0 | house | fine |
| cozy-cake-shop | 0 | house | fine |
| sushi-bi / Willis Street | 0 | house | fine |
| sushi-bi / Railway Station | 0 | house | fine |
| sushi-bi / Woodward Street | 0 | house-approx | fine |
| subway / Tawa | 0 | house | fine |
| subway / Johnsonville | 0 | house | fine |
| subway / Karori | 0 | house | fine |
| subway / Courtenay Place | 0 | house | fine |
| khandallah-trading-company | n/a | — | **no-geocode** |
| mcdonalds / Lambton Quay | *filled* | house | **filled** |
| mcdonalds / Bunny Street | *filled* | house | **filled** |
| mcdonalds / Johnsonville | *filled* | house | **filled** |
| mcdonalds / Porirua | *filled* | house | **filled** |
| mcdonalds / Courtenay Place | no pin | street | **left null** |
| subway / Mulgrave Street | no pin | street | out of scope |
| tj-katsu / Wellington Airport | no pin | street | out of scope |

**Counts:** 39 stored pins → 36 fine · 2 review · 1 unverifiable · **0
corrected**. Plus 7 empty slots → 4 filled · 1 left null · 2 out of scope.

## What was left alone, and why

**satay-kingdom-cafe — 81 m, review.** Its address is "Shop 212, Left Bank,
Cuba Mall", which no gazetteer holds. The best any variant reached was the
**Cuba Mall centroid**, and a pedestrian mall's centroid is not evidence
about where shop 212 in it is. 81 m is the distance to the middle of the
mall, not an error we can attribute. Leaving the curated pin is the right
call; only someone standing there can improve it.

**groundup-cafe — 33 m, review.** This one *did* match at house-number level
— but to "Living Rural Supplies Depot, 15 Paekākāriki Hill Road", a
different business at the same number on a rural road where a single street
number can cover a large site. 33 m clears the fine threshold by 3 m and
falls a long way short of the 100 m bar. Not enough to overwrite a curated
value on.

**khandallah-trading-company — unverifiable.** Its address is "Corner Agra
Crescent & Ganges Road" — no street number exists to geocode, and the tool
deliberately refuses to fall back to a suburb lookup, which would answer
confidently with a centroid a suburb wide. The stored pin may be perfect;
this method simply cannot speak to it. Left untouched.

**pizza-hut-johnsonville and charley-noble** both show `street`-ish
provenance in passing but sit at 1 m and 0 m respectively — their stored
pins are already at or under the noise floor.

## McDonald's — part (a) of the flesh-out

Four of the five branches geocoded to house-number level and were filled:

| Branch | Address | lat, lng |
|---|---|---|
| Lambton Quay | 276 Lambton Quay | -41.28407, 174.77522 |  <!-- leakscan:allow: venue business address + coordinate, as shipped in site/data — same product class (ADR 0022 gate 1) -->
| Bunny Street | 9 Bunny Street | -41.28012, 174.77971 |  <!-- leakscan:allow: venue business address + coordinate, as shipped in site/data — same product class (ADR 0022 gate 1) -->
| Johnsonville | 2 Johnsonville Road | -41.22193, 174.80719 |  <!-- leakscan:allow: venue business address + coordinate, as shipped in site/data — same product class (ADR 0022 gate 1) -->
| Porirua | 2 Titahi Bay Road | -41.13653, 174.83886 |  <!-- leakscan:allow: venue business address + coordinate, as shipped in site/data — same product class (ADR 0022 gate 1) -->

**Courtenay Place is deliberately still null.** "200 Courtenay Place"  <!-- leakscan:allow: venue business address already in site/data — same product class (ADR 0022 gate 1) -->
resolves only to the road centreline — OSM holds no such street number, and
a name search for the McDonald's POI on that street returns nothing either.
Under the rule above that is not good enough to write, so the branch keeps
no `lat`/`lng` at all, matching how `subway / Mulgrave Street` already
records an unresolved branch. It falls back to an address search in maps,
exactly as before.

The practical effect of the four fills is what part (a) was for: McDonald's
now participates in the distance sort, and its contact card shows the two
branches **nearest the viewer** rather than the first two in data order.
With Courtenay Place unpinned it simply never wins the nearest-branch
comparison; it still lists in the branch list on the menu screen.

`subway / Mulgrave Street` and `tj-katsu / Wellington Airport` are the other
two empty slots. Both are out of this task's scope and neither reaches
house-number level anyway (18 Mulgrave Street is a road centroid; the  <!-- leakscan:allow: venue business address already in site/data — same product class (ADR 0022 gate 1) -->
airport terminal has no street number). They are reported here so the gap is
on the record, not fixed.

## Notes on the tool

`tools/audit_coords.py` is stdlib-only, re-runnable and **always exits 0** —
it is a reporter, not a gate, because what to do about a drift is a
judgement call for a person. It never writes site data; the four fills above
were applied by hand from its output.

Two things it does that are worth keeping if it is ever rewritten:

- **A failed request is never cached and never reported as a finding.** An
  HTTP error and an honest "no such address" are different facts, and
  conflating them would let a flaky network masquerade as a data problem.
  If any request fails, the run says so loudly and declares itself
  incomplete.
- **It works around an empty Python trust store without weakening TLS.** A
  python.org build on macOS ships no CA bundle until someone runs its
  `Install Certificates.command`; rather than disable verification, the tool
  falls back to the OS bundle. Verification stays fully on.

## Recommendations

1. **Close the roadmap item.** The audit's job was to find out whether the
   fleet was wrong. It isn't. Two rows carry a note; none carry an error.
2. **Don't chase satay-kingdom-cafe or khandallah-trading-company with a
   better geocoder.** Both are address-shape problems, not geocoder-quality
   problems — no service resolves "Shop 212, Left Bank" or a street corner
   to a door. They need a human with a phone, standing outside.
3. **Re-run after any address edit.** `python3 tools/audit_coords.py` is
   cached and costs nothing on unchanged addresses, so it is cheap to run
   whenever a venue's address changes or a branch is added.
