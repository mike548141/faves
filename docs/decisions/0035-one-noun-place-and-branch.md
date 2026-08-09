# 0035 — one noun for one thing: a **place**, and a **branch** of one

**Status**: accepted • **Date**: 2026-08-09

## Context

Owner, raw: *"check the consistency of wording across the app. For example in
Settings → Distance it says 'Show branches within' vs 'Hide places further
than'. I would prefer to replace branches with places."*

The app's copy carried **five** nouns for the same thing with no rule behind
which one appeared where: *place* ("All places", "No places match those
filters", "Tap ♡ on a place"), *venue* ("confirm with the venue", "a venue is
treated as too far", "Menus stay as the venues wrote them"), *restaurant*
("← All restaurants", the sr-only `<h2>Restaurants</h2>`, `aria-label="Filter
restaurants"`), and *spot* (the restaurant page's `og:description`). *Branch*
was the fifth, but it names a genuinely different thing.

🚩 **The trap in the owner's example.** The two Settings → Distance dials do
different jobs:

- `farKm` — "Hide places further than" — filters **which venues you see at
  all**, by reachability.
- `favBoostKm` — "Show branches within" — controls **how many locations of one
  multi-branch venue** show on that venue's contact card (the repurposed dial;
  owner ruling 2026-07-23, `locations.branchesToShow`).

Renaming both to *places* would satisfy the letter of the request and produce
two dials that read as two settings for one job. That is a regression, not a
fix. So the deliverable is a term system first, and the sweep second.

## Decision

**Two nouns, and only two.**

| The thing | The word | Example in the UI |
| --- | --- | --- |
| A venue as the reader sees it — the thing you pick for dinner | **place** | "Hide places further than", "All places", "Suggest a place for Faves" |
| One location of a place that has more than one | **branch** | "Branches", "Show all 9 branches", "Show a place's branches within" |

*venue*, *restaurant* and *spot* are **retired from user-facing copy.** They
survive only as code identifiers (`type: "venue"`, `venueName`, `restaurant.html`,
`.fav-venue-head`) and in the *names of actual businesses* ("Regal Chinese
Restaurant" is a name, not our noun for it).

**Why *place* for the venue.** It is the owner's stated preference, it was
already the most-used noun in the copy (so the sweep moves the fewest strings),
and it is the only candidate that survives **Cook at Home**. Cook at Home is a
`kind:"recipes"` record (ADR 0003) that sits in the same list as the
restaurants: calling it a *venue*, a *restaurant* or a *spot* is simply false,
whereas your own kitchen is unarguably a place. It never fails the distance
filter either — it carries no coordinates, so `isAvailableNow` leaves it in
regardless of `farKm` (a coordless record's distance is `Infinity`, and the
filter only bites on a finite one). ✅ "Place" reads sensibly for it.

**Why *branch* stays for one location.** With *place* meaning the venue, the
sub-thing needs a word that (a) is unmistakably a *part of* a place and (b)
collides with nothing else on screen. *Branch* is ordinary NZ English for one
site of a chain, is already the app's word in the markup the reader sees
("Branches", "Show all N branches"), and is used nowhere else in the copy.

**How the two dials are made to read as different jobs** — the actual fix,
which no single-word swap achieves:

- Each label now **names its own subject**: "Hide **places** further than" vs
  "Show **a place's branches** within". The possessive is load-bearing: it
  says the second dial operates *inside* one of the things the first dial
  filters, so they cannot be misread as peers.
- Hints spell out the relationship: *"Beyond this, a place is treated as too
  far to reach tonight and drops off your list"* vs *"When one place has <!-- datescan:allow: quoted UI copy — the dial hint verbatim, not a dated claim -->
  several branches (McDonald's, say), the two nearest inside this distance
  show on its contact card."*
- The panel note names both jobs: *"How far you'll go, and how many branches
  of one place you see."*
- The dials are **reordered**, `farKm` first: which places, then which branches
  within one. That is also the order the panel note reads in, and the order the
  index row's summary ("Hide places past 50 km") implies.

**The reo lockstep.** `reo.js` is one table where English and te reo move
together; a rename that skips it silently desyncs the translation. Exactly one
English string with a reo key changed: `nav.allRestaurants`, "← All
restaurants" → "← All places". Its Māori was `"← Ngā wharekai katoa"` —
*wharekai* is specifically a restaurant/eating-house, so it desynced the moment
the English stopped saying restaurants. It now reads `"← Ngā wāhi katoa"`,
**re-using the existing, non-draft value of `fav.allPlaces`** (identical
English, identical Māori) rather than drafting a new string — so no new
`// draft` was needed. Every other reo entry touching this vocabulary already
said *wāhi* (place): `fav.allPlaces`, `search.ph`, `result.empty`, `pick.empty`,
`report.type.suggest`. The te reo table needed no other edit.

## Rejected

- **"Places" for both dials** (the literal reading of the request). The
  regression the roadmap predicted: two adjacent sliders, both apparently about
  "places", one of which quietly means something else. Rejected on the owner's
  own goal — the complaint was that the pair reads inconsistently, and this
  makes it read *wrongly*, which is worse.
- **"Location" for one of a place's locations** — matches the data key
  (`locations[]`) and ADR 0011's language, which is its whole appeal. Rejected
  on collision: *location* already means **the reader's own position** all over
  this app ("Finding your location…", "Couldn't get your location", "Your last
  'Near me' location", and the geolocation permission prompt itself). Two
  meanings for *location* on the one Distance panel is the exact disease being
  cured.
- **"Store" / "shop" / "outlet" / "site" for a branch.** *Store* is an
  Americanism and wrong for a restaurant in NZ English; *shop* reads retail;
  *outlet* is trade jargon; *site* collides with "the venue's own site"
  (a website) in `temporal.js`. None beat the word already in the markup.
- **"Venue" as the single noun**, retiring *place* instead. It is the more
  precise word and it is what `ARCHITECTURE.md` and the code call the record —
  but it is against the owner's explicit steer, it breaks on Cook at Home, and
  it is slightly institutional for a household app. Keeping *venue* as the
  **code**'s word and *place* as the **reader**'s word costs one translation
  step for a builder and nothing at all for a reader.
- **Purging the idiom "in one place"** from the site description, the About
  lede and `personal-io-ui.js`'s "put this data in its place". Under a strict
  one-noun-one-thing reading these collide with *place*-the-venue. Left alone:
  context disambiguates them completely (nobody parses "menus, in one place" as
  a restaurant), and rewriting them costs the tagline's charm and a fresh te
  reo draft of `app.sub` for no reader gain.
- **Rewriting the meta/manifest descriptions** ("Menus for our favourite
  Wellington **restaurants and takeaways**, in one place"). Left alone
  deliberately: these describe *what sort of businesses the site covers* to an
  outsider and to a search engine, which is a category description, not the
  interface's noun for a list item — and "Menus for our favourite Wellington
  places" would be both vaguer and worse for SEO (a quality-bar target). The
  rule is scoped to the interface accordingly. The restaurant page's
  `og:description` **was** changed, because "one of our favourite Wellington
  spots" was a fifth noun carrying no such benefit.

## Consequences

- **The rule, for future copy:** the reader's word for a venue is **place**;
  for one of its locations, **branch**. Never *venue*, *restaurant* or *spot*
  in a string a person reads. Code identifiers are unaffected and stay as they
  are — `favBoostKm` in particular keeps its name, because renaming the storage
  key would reset everyone's stored dial (2026-07-23 ruling).
- 🚩 **A te reo collision surfaced but was not fixed**: `service.all`
  ("Everywhere", the home service segmented control) translates to
  `"Ngā wāhi katoa"` — word-for-word identical to the "All places" of
  `fav.allPlaces` and `nav.allRestaurants`, which is a different job (leave a
  panel). Pre-existing, not created here. Flagged in `reo.js` with a comment
  for the Phase 7 reo review rather than guessed at by a non-speaker.
- `menu.branches` ("Branches") still has **no** entry in the reo table and
  falls through to English, as it did before. Not added: the obvious candidate
  *peka* is already used in this table for `route.detour` (a turn-off), and
  minting a second meaning for it is a reo reviewer's call, not a builder's.
- The allergen caveat's *"Some tags come from the venue"* → *"…from the place"*
  is a change to **safety-adjacent** copy whose comment says it "stays
  verbatim". A noun swap preserves the sentence's meaning exactly and the
  caveat is otherwise untouched; the "verbatim" instruction is about not
  paraphrasing or shortening it, which this does not do.
- The Distance dial **reorder** is a layout change, not copy, made because it
  serves the same goal. Easily reverted (two lines in `distancePanel`).

[ADR 0003]: 0003-recipes-as-kind-not-separate-type.md
[ADR 0011]: 0011-multi-location-venues.md
