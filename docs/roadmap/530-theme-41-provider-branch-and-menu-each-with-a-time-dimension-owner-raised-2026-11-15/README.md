# Theme 41 — provider, branch and menu, each with a time dimension (owner-raised 2026-11-15)

**His words, verbatim:**

> *"I think the data model needs to abstract*
> *\* Restaurant i.e. a food PROVIDER as an organisation or group, typically a
> registered company LLC*
> *\* Branch a LOCATION which can be mobile (like a food truck), temporary
> (opened with the intention of closing it again soon even if you dont know
> the date it will be closed like a pop up restaurant), or permanent (nothing
> is truly permanent but its there until tis not).*
> *\* Menu a collection of the dishes/FOOD/drink they offer. The dishes on the
> menu will change over time (like code in git gets versioned as it chagnes)
> as cooking style and ingredients of dishes are alterered, or dishes are
> added and remove, and things like prices, options, serving ssizes all
> change. But it also has a relationship to time in that a menu might be
> recurring for a period of the day like a breakfast menu, days of the week
> like a weekend menu, it might be seasonal like summer vs winter.*
> *All three have a time dimension, and have inter-relationships between the
> three of them e.g. a restaurant must have at least one branch and menu.*
> *And as discussed before branch and menu availability might be changed by
> things like sightings, annoucements, and recurring schedules"*

And on Cook at Home, the same message: *"Perhaps cook at home should be the
same as a restaurant … a menu from a restaurant is similar to a list of
recipes for dishes that we might make at home, because a menu is not a meal
which is a specific selection of one or more dishes from a menu that you
decide to eat in one dining experience … And someone may have more than one
home, like a holday home and their main home or an RV. Those are similar to
branches of a restaurant. I'm pretty sure I've discussed this in past
sessions."* He had: `470/050`, ruled 2026-09-08 (below).

This theme is the **direction**. It gathers four threads already on the board
under one model rather than replacing them.

## Where today's model stands against his three entities

| His entity | What exists | Owned elsewhere | Gap |
|---|---|---|---|
| **Provider** | The venue file (`site/data/restaurants/<id>.json`): name, cuisine, website, `lifecycle` (ADR 0023) | — | A provider with two kinds of branch is two files today (Rock Yard's restaurant and truck, `520/040`) |
| **Branch** | `locations[]` (ADR 0011): own `id` (0103), `lifecycle` (0132), weekly `hours` (0006), provenance (0063); an "Anywhere" branch (0155) | `520/010` (dated spots) | No kind: mobile, temporary, permanent (`020`) |
| **Menu** | One `menu` per venue; sections carry serving windows; dish ids immutable (0051, 0153) | `370` (Theme 30: menus, plural, availability rules with priority) | A menu cannot belong to a branch; most dish changes are not versioned (`030`) |
| **Time, all three** | Venue and branch `lifecycle`; weekly hours; price history and departed dishes in `data/history/` (ADR 0047) | `520/010` (sighting, announced, schedule) | One availability model shared by branch and menu (`010`) |

## Items

- `010` — the three-entity model and its rules, written down as one ADR.
- `020` — a branch has a kind: mobile, temporary or permanent.
- `030` — a menu is versioned like code.
- `040` — Cook at Home is a provider; a recipe is a dish with a method.
