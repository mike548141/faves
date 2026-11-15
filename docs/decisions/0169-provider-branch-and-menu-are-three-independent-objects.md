# 0169 — Provider, branch and menu are three independent objects

**Status:** accepted (owner-directed; the target model, not yet a schema)
**Date:** 2026-11-15 (UTC)
**Refines:**
[0011](0011-multi-location-venues.md) (branches nested in a venue, sharing
one menu) ·
[0003](0003-recipes-as-kind-not-separate-type.md) (Cook at Home as a
`kind: "recipes"` record) — neither is superseded yet; each is superseded by
the stage that changes what it decided · **Roadmap:** Theme 41 (`530`), and
the threads it gathers: `370` (Theme 30, menus plural), `520/010` (dated
spots), `520/040` (Rock Yard's truck), `470/050` (homes as branches)

## Context

The owner, 2026-11-15, after eight food trucks went in and two of them would
not fit the model (`520/040`):

> *"I think the data model needs to abstract*
> *\* Restaurant i.e. a food PROVIDER as an organisation or group, typically a
> registered company LLC*
> *\* Branch a LOCATION which can be mobile (like a food truck), temporary
> (opened with the intention of closing it again soon even if you dont know
> the date it will be closed like a pop up restaurant), or permanent (nothing
> is truly permanent but its there until tis not).*
> *\* Menu a collection of the dishes/FOOD/drink they offer. The dishes on the
> menu will change over time (like code in git gets versioned as it chagnes)
> … But it also has a relationship to time in that a menu might be recurring
> for a period of the day like a breakfast menu, days of the week like a
> weekend menu, it might be seasonal like summer vs winter.*
> *All three have a time dimension, and have inter-relationships between the
> three of them e.g. a restaurant must have at least one branch and menu.*
> *And as discussed before branch and menu availability might be changed by
> things like sightings, annoucements, and recurring schedules"*

And on 2026-11-16, correcting this session's summary of it, which had said
"which menus each branch serves" in a way that read as nesting:

> *"to be clear they are not parent child objects, Restaurant, Branch, Menu
> are 3 independent objects that are not in a heirachy of each other, they
> have relatiionships to each other."*

Today's shape is the hierarchy he ruled out: a venue file contains its
branches (`locations[]`, ADR 0011) and one `menu`, so every branch serves
that menu, always. Three real cases already break it:

- **Rock Yard's truck** is a branch of Rock Yard Vietnamese Restaurant (his
  words, 2026-11-15) with its own seven-dish menu at its own prices, so it is
  a separate file today (`520/040`).
- **A menu that runs at some times** (breakfast, weekend, winter) has nowhere
  to live except as section serving windows inside the one menu (`370`).
- **A truck's whereabouts** are dated sightings, announcements and schedules,
  not a weekly timetable on a fixed address (`520/010`).

## Decision

1. **Three independent objects: Provider, Branch, Menu.** None contains
   another. Each has its own stable id, its own lifecycle, and can be talked
   about on its own. "Restaurant" in the app's words is a Provider.
2. **They are joined by relationships, and a relationship is data.**
   - a Branch is **operated by** a Provider;
   - a Menu is **offered by** a Provider;
   - a Branch **serves** a Menu, over some availability (item 4).

   A relationship can itself start and stop: a winter menu served at one
   branch only, a truck that serves a cut-down menu. The owner's invariant
   holds on the relationships: **a Provider has at least one Branch and at
   least one Menu.**
3. **All three carry time, in three senses, and the senses stay apart.**
   - **Lifecycle** — when it exists: opened, closed, or, for a temporary
     branch, an intended end that may be undated (ADR 0023, 0132 carry this
     today for venues and branches).
   - **Availability** — when it can be had: trading hours for a branch,
     serving windows for a menu.
   - **Versions** — how it has changed: a menu's dishes are revised the way
     code is, each revision dated (`530/030`).
4. **One availability model for branches and menus, with three kinds of
   evidence** (owner-ruled 2026-11-15, `520/010`): a **sighting** (seen
   there, when, on whose evidence), an **announcement or booking** (a dated
   one-off), and a **recurring schedule** (time of day, days of the week,
   season). The weekly `hours` object is the recurring schedule, and stays.
5. **A Branch has a kind: permanent, temporary or mobile.** Absent means
   permanent, so no current file changes. A mobile branch's place comes from
   its availability (item 4), not from an address (`530/020`).
6. **A meal is not a menu.** A meal is the dishes chosen from one or more
   menus for one dining experience; the order tally (Theme 1) is the nearest
   object the app has, and this record does not create another.
7. **Cooking at home is a way of getting the food, and more than one
   Provider may offer it.** The owner, 2026-11-16: *"I can see options in
   the future where you buy the food and cook at home so there could be more
   restaurants coming"*. Cook at Home is one such Provider; its homes are its
   Branches (`470/050`, ruled 2026-09-08); a recipe is a dish that carries a
   method. Whether "recipe" moves from the record (`kind`, ADR 0003) onto the
   dish is a later stage's decision (`530/040`).
8. **Storage is not decided here.** Independent objects do not require
   separate files. What ships to a phone stays governed by ADR 0047 (the app
   ships only what it renders) and the partitioning of ADR 0145/0146; each
   stage below decides its own storage in its own record.
9. **Migrate in stages, each leaving every existing file valid.** Today's
   venue file is the degenerate case — one Provider, its Branches, one Menu
   served at all of them, all the time — so it keeps working through every
   stage. Proposed order, cheapest real payoff first:
   1. the **serves** relationship, so a branch can serve its own menu
      (unblocks Rock Yard's truck; Theme 30's `menus[]` lands here);
   2. **branch kind** (permanent / temporary / mobile);
   3. **availability evidence** (sightings, announcements, schedules) on
      branches and menus;
   4. **dish revisions** (`530/030`);
   5. the **private homes** of Cook at Home (`470/050`'s owed half).

## What this does not decide

- Whether a Branch can change operator, or be operated by two Providers (a
  franchise, a food court), and whether two Providers can share one Menu
  (a franchise menu). Both are plausible; neither has a real record yet.
- Field names, file layout and the payload shape of any stage.
- How a dish is identified across Providers — the owner's can of Fanta, the
  same item at home and in a shop. The packaged-product store (ADR 0090) is
  the obvious anchor; the link is `530/040`'s.

## Rejected

- **A hierarchy, Provider → Branch → Menu.** The owner ruled it out in words,
  and the cases say why: two branches serving one menu duplicate it, one
  branch serving three menus over a day cannot be said, and a menu cannot
  outlive the branch it was nested in.
- **A record kind per case** — a `truck` kind, a `popup` kind. A kind is per
  record, and a provider can own a truck among fixed branches; the difference
  lives on the branch (`520/010`'s option 3, rejected for the same reason).
- **Migrating everything at once.** Every phone holds today's shape; a
  one-step change is the riskiest version of the cheapest-looking plan.

## Consequences

- Rock Yard's truck folds into Rock Yard Vietnamese Restaurant at stage 1,
  with `formerIds` keeping every heart (ADR 0153).
- The Dining filter's Food truck option reads the `food-truck` vibe until
  stage 2 gives branches a kind, then reads the branch; its Cook at home
  option reads the recipe collection until a second provider of that kind
  exists. Neither option, URL value nor chip changes when they do.
- Every stage gets its own ADR, and the one that changes nesting supersedes
  ADR 0011; the one that moves "recipe" onto the dish supersedes ADR 0003.
