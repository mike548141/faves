# Theme 40 — mobile venues: food trucks, roadside stalls and market days (owner-raised 2026-11-14)

**His brief, verbatim:** *"Restaurants with mobile locations like food trucks,
you could treat this as a branch where the location changes and the opening
hours / days are quite variable. This might be a feature that drives user
notifications eg the food truck has just announced it's going to be at
location ____ from 11am until 3pm today. Similarly there is a chef that sells
food on the side of the road from a table/tent in the afternoon on occasion or
farmers markets"* <!-- datescan:allow: the owner's verbatim example of the feature — quoted product vocabulary, not a dated claim -->

Three asks in one, filed as three items: a **place whose branch moves**
(`010`), **the announcement that says where it is today, and whether a phone
hears it** (`020`), and the **occasional seller** — a roadside table or tent,
or a market pitch — whose trading has no weekly shape at all (`030`). Nothing
on the board mentioned any of these before this section (grepped 2026-11-14:
no "food truck", "farmers", "market day", "roadside" or "mobile venue" under
`docs/roadmap/`, `ARCHITECTURE.md` or `STRATEGY.md`).

## What the model already holds, read before designing anything

- **A place has branches** (ADR 0011, 0035). `locations[]` carries, per branch,
  `address`/`lat`/`lng`/`phone`/`hours`, its own `id` (ADR 0103), its own
  `lifecycle` (ADR 0132) and its own details provenance (ADR 0063). The
  nearest branch decides distance, status and the maps handoff; with no viewer
  location the **primary** branch stands. The owner's instinct — *"treat this
  as a branch"* — lands on the one object the app already resolves everything
  through.
- **A branch may say where it is as a value, not a field.** ADR 0155 gave Cook
  at Home's public branch `"address": {"anywhere": true}` — the precedent for a
  branch whose "address" is a *state* ("roaming", "not out today") rather than
  a street.
- **Hours are a week, and a week can hold honest gaps.** `hours` is seven
  days of `[open, close]` intervals (ADR 0006); a day may be `null` — *the
  venue publishes nothing about it* — and `openStatus` then answers
  `unknown-today` **with words**, "Hours not published today" (ADR 0105). A
  week that is all `null` is refused: that is `hours: null`, which is also
  legal.
- **What a week cannot hold is a date.** There is no "Saturday the 22nd, Odlins
  Plaza, 11–3" anywhere in the schema. The only dated things on a venue are
  `lifecycle.events` (a closed set of three: closed-temporarily, reopened,
  closed-permanently) and a price's `from`. A spot announced for one day is a
  **new shape**, not a new value — that is `010`'s whole question.
- **Capabilities are declared, not inferred** (`site/js/kinds.js`, ADR 0065).
  `hasLocation` and `hasHours` are per *kind*; a truck has a location
  *sometimes*, which neither the table nor any screen can say today.
- **An installed phone already fetches only what changed** (roadmap `510/030`).
  A one-line change to one venue file restamps the catalogue and costs a phone
  one small file on its next open. That is the free half of "the truck says
  where it is today": the *carrying* costs nothing new. The *telling* — a push
  to a phone that is not open — is the half with no precedent here.
- **Notifications exist once, locally.** Cook mode's timer alarm (36d, roadmap
  `460/040`) is the only `Notification.requestPermission()` in the app, fired
  from the open page; `sw.js` answers `notificationclick`. No Web Push, no
  subscription, no server that sends anything.
- **A backend is permitted and bounded.** ADR 0017's Worker + KV holds one
  encrypted blob per sync code and **refuses to learn anything about a
  person** — the branch-picker rulings (`430`) record that asking it to log
  device arrivals was rejected as tracking. Any push design inherits that line.

## What strains, named so the items can answer it

- **"Open now" resolves to the nearest branch** (ADR 0011, 0054) and the
  distance limit **cuts the list** (ADR 0091). A truck with no spot today has
  no distance and no openness: the badge, the sort and the cut all need a
  third answer, not a guess. ADR 0105's "Hours not published today" is the
  nearest existing word, and it is not quite right — the truck *has* published:
  it is not out.
- **Non-goals (`STRATEGY.md`):** *no scraping/live sync of menus*, *no admin
  UI — menus are edited as JSON in the repo*. And the content rule
  (`CLAUDE.md`, owner 2026-08-16): what he gives us is in; what he does not
  give us or tell us to fetch is not. A truck's own social post is the honest
  source of "where today", and reading it unasked is both a non-goal and a
  breach of the content rule. `020` offers the routes and recommends none be
  taken without his word.
- **The hard constraint that bites hardest here is personal data.** A chef
  trading *"from a table/tent on the side of the road"* may well be trading
  outside their own home. **A home address is never recorded, anywhere, for
  anyone** — the one absolute in `CLAUDE.md`. So a roadside spot is recordable
  only when it is a public place the seller has publicly named (a park, a car
  park, a market), and only with its `source`. `030` carries this as a rule,
  not a caveat.
- **Offline-first and a same-morning announcement pull against each other.**
  A spot announced at 10:30 for 11:00 reaches a phone that opens the app, and
  no phone that does not. That is a product fact, not a defect, and it is why
  `020` separates *carrying* the announcement (cheap, fits every constraint)
  from *pushing* it (its own ADR, two floor-level confirms).

## Asks now sitting with the owner

- 🎯 **Which real venues.** No truck, roadside seller or market is in the
  corpus or `data/`. Every item below is `[content]` until he names at least
  one of each, with whatever he wants fetched; the design should be measured
  against a real schedule, not an imagined one.
- ⚑ **Is a roaming branch a branch** (one noun, ADR 0035), or does a truck
  with no fixed pitch become the first new `kind` since recipes? `010` sets
  out both and recommends.
- ⚑ **Does Faves ever send a push notification**, and if so, who is told what
  by whom (`020`). This is the decision that decides whether a server learns
  which places a person follows. It is his, and it is a floor-level confirm
  twice over (new trust surface; a Worker that stores per-device endpoints).
- ⚑ **Is a market itself a place** in Faves — a venue-shaped record with
  stalls as its "menu" — or only ever a pitch some sellers share (`030`)?

Nothing here is built, and no ADR is allocated: a board item records the
problem and offers options, and the ADR is written when he rules.
