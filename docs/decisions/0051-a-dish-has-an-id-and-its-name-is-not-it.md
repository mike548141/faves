# 0051 — A dish has an id, and its name is not it

**Status:** accepted
**Date:** 2026-08-16
**Supersedes in part:** [0044](0044-a-menu-can-be-written-in-another-language.md)
— its "a dish's `name` is its IDENTITY" is now true only of *display*; identity
moves to `dishId`
**Follows:** [0042](0042-the-collection-is-not-scoped-to-a-city.md) — whose
consequences produced `renames.js`, the venue-level precedent this copies
rather than reinvents ·
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) §4 — the
order-line key gains its identity component from here

## Context

The owner asked, on reading ADR 0044: *"that is fine but does a dish need a
unique ID as well so it is referenceable when a name changes, as menus tend
to?"* The answer is yes, and the reason is sharper than the question.

A dish's `name` was doing five jobs at once:

| Job | Where | What a rename breaks | Silent? |
|---|---|---|---|
| URL anchor | `#dish-<slug(name)>` | every link anyone has shared | yes |
| Pick reference | `picks: ["Bastard"]` | the pick stops matching | no — `validate.py` catches it |
| Stored heart | `d:<venueId> <name>` | detaches, on every family phone | yes |
| Stored rating | `d:<venueId> <name>` | same | yes |
| Order line | `<venueId>\n<name>\n<sel>` | merges with another dish | yes — **and it costs money** |

Four of the five fail silently. That is the same shape of problem `renames.js`
was written for at the venue level, so this record follows that precedent
rather than inventing a second way to identify things.

**The corpus already broke it, and had for some time.** Measured 2026-08-16
across 48 records and 1755 dish rows: `slug(name)` is **not unique within a
venue** — 10 slugs collide across 22 rows in 3 records, and every collision is
at a different price.

| Record | Colliding slugs | Rows |
|---|---|---|
| `sprig-and-fern` | 7 | 16 |
| `the-borough-tawa` | 2 | 4 |
| `southern-cross` | 1 | 2 |

Sprig & Fern prints `Cheeseburger` three times — Mains $28, Gold Card $21, Kids
$15 — and `Fish and Chips` likewise. All five jobs were failing on that data,
today:

- **Three elements shared `id="dish-cheeseburger"`.** Invalid HTML, and
  `getElementById` returns the first, so the Gold Card price was unlinkable.
- **The disclosure notes shared an `aria-controls` target** — the same defect
  wearing an accessibility hat.
- **One heart covered all three rows.** So did one rating.
- **Two same-named dishes on a page shared an add-on radio group**, so choosing
  a sauce on one silently cleared it on the other.
- **The order tally overcharged by $7.** Reproduced against the real module,
  not reasoned about:

```
order.add({venueId:"sprig-and-fern", name:"Cheeseburger", price:28})  // Mains
order.add({venueId:"sprig-and-fern", name:"Cheeseburger", price:21})  // Gold Card
→ lines: 1 [["Cheeseburger",28,2]]
  total charged: 56  — correct would be: 49
```

`cart.js` matched a line on `(venueId, name)` and incremented the quantity,
keeping the *existing* line's price. ADR 0048's widening of that key to include
the add-on selection neither helped nor worsened it: both Cheeseburgers carry an
empty selection, so they still collided.

**The second reason, which the venue level never had.** A menu refresh is
append-only (ADR 0023): a renamed dish is supposed to carry its price series,
revisions and `verified` dates over. With the name as the only identity, "carry
it over" is an instruction a transcriber has to remember and nothing checks. An
id makes it mechanical.

## Decision

**A dish's identity is `dishId`; its `name` is display text.** One optional
field, one resolver, one gate.

1. **`dishId` is REQUIRED on every dish, seeded once from `slug(name)`** — which
   is exactly what every anchor, heart, rating and order line already resolved
   to, so all 1755 rows keep the identity they had while gaining a *written*
   one. `tools/seed_dish_ids.py` does the seeding and is safe to re-run; a dish
   without one is a validation error naming the id to write.

   The distinction that decides this is **seeded, not derived**. An id computed
   from `slug(name)` at read time is a function of a mutable display name:
   rename the dish and the id silently changes, which is the failure this whole
   record exists to prevent, reintroduced one level up. Seeded once and written
   into the data, it is a stored fact. The property that buys is not subtle —
   a transcriber who renames a dish opens the file and finds
   `"dishId": "cheeseburger"` sitting under the name. They change the name and
   leave the id. **They cannot fail.** Nothing in the file reminded them before.

   The `slug(name)` fallback stays in `dish-id.js`, but only for what genuinely
   has no id: a heart stored on a phone before ids existed, and a share link
   minted before them. Data is required to carry one; storage and the wire are
   allowed not to.
2. **`site/js/dish-id.js` is the single resolver**, the dish-level twin of
   `renames.js`: `dishId(item)`, `eachDish(record)`, `findDish(record, ref)`,
   `migrateDishKeys(map)`. Nobody learns a second way to point at a dish.
3. **`findDish` resolves in a fixed order** — exact `dishId`, then `slug(ref)`
   as an id, then exact `name`, then `formerIds`. A **live id always beats
   another dish's former one**, so retiring an id can never hijack a link to a
   dish that still exists; and a name never outranks an explicit id.
4. **`formerIds: []` on a dish** carries an id that genuinely had to change.
   The ordinary rename needs nothing: pin `dishId` to what the id already was
   and it never moves.
5. **`validate.py` refuses ambiguity.** Resolved ids must be unique within a
   record; a `dishId` must be its own slug; `formerIds` may not collide with a
   live id or with another dish's; and a `picks` entry must resolve to exactly
   one dish. The duplicate-id error names both sections and tells the
   transcriber what to write, because that message is the entire user
   experience of this feature for whoever refreshes a menu next.
6. **The 22 colliding rows: the FIRST occurrence keeps the bare slug** and gets
   no `dishId` at all; only the 2nd and 3rd get one, mechanically named from the
   section — `-kids`, `-gold-card`, `-bottled`. Twelve explicit ids in total.

### Nothing moves on day one, and this is why

`getElementById` already returned the first match, one heart already covered
the whole collision group, and the order tally already merged them. So keeping
the bare slug on the first row means the only anchors, hearts, ratings and
order lines that change are ones that **were already broken**.

The one honest consequence to state plainly: if someone hearted what they
believed was the Kids' Fish and Chips, that heart was in fact stored against the
Mains row, and it stays on the Mains row. The Kids row is now separately
heartable and starts un-hearted. Nothing is lost that was ever distinct.

### The stored-key migration is provably lossless

Rating keys hold a dish **name** (`d:<venueId> Fish and Chips`) and are
rewritten on read to `d:<venueId> fish-and-chips`. Three properties make that
safe to run on every read, forever:

- **No table is needed.** The default id *is* `slug(name)`, so the rewrite is
  the slug function and nothing else.
- **It is idempotent** — `slug(slug(x)) === slug(x)` — so there is no "have I
  migrated yet" flag to get wrong and no one-way door.
- **It cannot merge two hearts that were distinct.** Measured across the whole
  corpus: within a venue, **no two different dish names slug to the same
  value**. Every slug collision that exists is a genuine duplicate name, which
  shared one key already. A test asserts that property over the live data, so a
  future menu edit that broke it would fail rather than silently merge someone's
  ratings.

Favourites need no migration at all, because they are stored as *entry objects*
and their key is computed on read from `dishId(entry)` — an entry saved before
ids existed has no `dishId` and falls through to `slug(name)`. The asymmetry is
commented in both modules, because it is exactly the kind of thing a later
session would "fix" by adding a migration that does nothing.

## Rejected

- **`formerNames` instead of `formerIds`** — the shape the roadmap proposed and
  the owner approved. Two grounds, and the second is decisive.

  First, **what an old shared link holds and what an old stored key holds are
  both slugs**, so a slug is what a resolver must match against; `formerNames`
  is `formerIds` with a `slug()` call hidden inside it, and `formerIds` is
  already the venue-level concept, so one idea keeps one name at both levels.

  Second — the objection this survived, raised by the parallel session and
  worth stating because it is correct as far as it goes: **`slug` is lossy, so
  `formerIds` cannot reproduce what the dish was called.** "Char Kway Teow"
  becomes `char-kway-teow` and there is no way back. Anything that wants to
  *say* "formerly Char Kway Teow" — a menu-refresh note, or the not-found
  screen the reference-integrity item wants — needs the name, and `formerIds`
  cannot serve it. But that settles it the other way, by this repo's own rule:
  **ADR 0047 says name the screen that renders a field before adding it to the
  payload.** No screen renders a former name today. `formerIds` earns its place
  because it makes a link *resolve*; `formerNames` would ship to every phone
  with nothing reading it. When the not-found screen is built, it can be added
  then — with a screen to name.

  The cost is real and small: a transcriber recording a rename writes
  `formerIds: ["old-name"]`, one slug they can copy out of the URL.
  **Still flagged to the owner as a deviation from the shape he approved**
  rather than resolved quietly. Nothing in the corpus uses either field yet, so
  reversing it is a one-field rename, and the two are not mutually exclusive.
- **Leaving `dishId` optional, defaulted to `slug(name)`.** This is the shape
  the roadmap proposed, and it is what was built first — a 12-row edit rather
  than a 1755-row one, and no payload cost at all. **The owner overruled it the
  same day**, and the ruling is the sharpest sentence in this record:

  > "I am ok with breaking changes that lose favourites, ratings etc right now
  > but in the future I will not be ok with losing any of that and impacting
  > end users. So make the change that is best for that long term even if its
  > breaking now, but we MUST ENSURE things like ratings and favourites are
  > never lost in future thus **immutable ID's** or somthing"

  An id derived on every read is not immutable, so the optional shape did not
  meet the requirement — it met it only by *convention*, a rule a transcriber
  has to remember, which is the identical criticism this record levels at the
  price-history carry-over three paragraphs earlier. Seeding meets it by
  construction. Measured cost, taken deliberately: **+70.8 KB raw / +12.6 KB
  gzipped**, 16.3% of the data cache, across 1743 newly seeded rows.

- **Enforcing immutability with a CI gate instead of seeding** — compare each
  record against its previous committed version and fail if a resolved id
  vanished without a `formerIds` entry. Zero payload cost, and tempting. It
  lost because it is a **guard rather than a property**: it needs git history
  present in CI, it fails open on a shallow clone, and this repo has been
  bitten four times by checks that could not fire when it mattered. A field
  sitting in the file cannot fail to run.
- **Merging the Mains / Gold Card / Kids rows into one dish with a
  serving-size or discount configuration.** Investigated by the parallel add-ons
  session: the evidence says they are not one dish. Several Gold Card
  descriptions read "Gold Card portion", the Gold Card Sirloin is 150 g against
  the Mains 230 g, and the Kids Cheeseburger is a different composition with
  different tags. One id per **row**; any "these are variants of each other"
  relationship is a later link *between* ids, and needs ids to exist first
  either way.
- **Bumping `CODEC_VERSION` to carry the id on shared links.** The version is
  shared by orders, shortlists and personal transfers and checked with a strict
  `!==`, so a bump invalidates every outstanding link of all three kinds. The
  id is appended as a positional slot instead — the precedent ADR 0048 set —
  and only when it differs from `slug(name)`, so ordinary links do not grow.
- **Carrying ids on shared *shortlists*.** Those pack dishes as a bare array of
  name strings, and changing the element type would break every decoder already
  in the wild. Left as names, resolved through `slug(name)` on decode. A shared
  shortlist naming a disambiguated row arrives as the bare-slug one — which is
  precisely what it did before ids existed, so it is not a regression, but it is
  not fixed either. Roadmapped, not hidden.

## Consequences

- **A $7 overcharge on a real venue is fixed**, and the regression test states
  the money rather than the key shape.
- **Three invalid duplicate DOM ids, a duplicate `aria-controls` target and a
  shared radio group are all gone** — the accessibility bar (WCAG 2.2 AA)
  required the first two regardless.
- **A rename is now mechanical.** Pin `dishId`, and the price history, the
  shared links, the hearts and the ratings all follow by construction rather
  than by a transcriber remembering.
- **`split_data.py` keys a dish's history on its id when the dish has an
  explicit one**, so a rename no longer orphans its price series. Records
  written before this keep their `{section, name, code}` keys and reconstruct
  byte-identically — the `--check` round-trip is what proves it.
- **A new field on every payload record, and it is not free.** `dishId` ships
  to every phone (ADR 0047's rule: name the screen that renders it — here,
  every screen that links to a dish). **+12.6 KB gzipped, 16.3% of the data
  cache.** That is the price of immutability and the owner authorised it
  knowing the number. It is a one-off per version bump on a payload that
  precaches once and then works offline, not a per-visit cost — but it is the
  largest single field this corpus has ever added, and the next one should be
  weighed against this precedent rather than against zero.
- **`validate.py` now fails a menu that prints the same dish name twice in one
  venue without disambiguating it.** That is the intended cost: the next person
  to refresh Sprig & Fern's menu will be told, at the moment they can fix it,
  rather than shipping a fourth Cheeseburger that quietly steals the first
  one's heart.
