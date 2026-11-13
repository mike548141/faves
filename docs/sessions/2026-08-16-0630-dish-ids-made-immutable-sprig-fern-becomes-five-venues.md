## 2026-08-16 06:30 UTC — dish ids made immutable, Sprig + Fern becomes five venues, the filters get a sheet

Theme 25, taken off the queue and claimed at 05:27 UTC, plus four things the
owner raised while it ran. Orchestrated from one session with nine subagents on
disjoint file sets; every one of them reported back before anything was
committed.

### The ruling that changed the design mid-build

Theme 25's approved shape was `dishId` **optional**, absent meaning
`slug(name)`. That was built, green, and about to land when the owner ruled:

> "…we MUST ENSURE things like ratings and favourites are never lost in future
> thus **immutable ID's** or somthing"

An id recomputed from a mutable display name is not immutable — rename the dish
and the id silently changes, which is the exact failure Theme 25 exists to
prevent, reintroduced one level up. **Seeded beats derived**, and the reason is
not abstract: a transcriber who renames a dish now opens the file and finds
`"dishId": "cheeseburger"` sitting under the name. They change the name and
leave the id. *They cannot fail.* Nothing in the file reminded them before.

So `dishId` became **required on all 1755 rows**, seeded once by
`tools/seed_dish_ids.py`. Measured cost, put to the owner as a number rather
than a shrug: **+70.8 KB raw / +12.6 KB gzipped, 16.3% of the data cache**. It
is the largest single field this corpus has ever added, and ADR 0051 says so, so
the next one is weighed against this precedent rather than against zero.

**The alternative that lost is worth recording.** A CI gate could enforce
immutability at zero payload cost — compare each record against its previous
committed version, fail if a resolved id vanished. It lost because it is a
*guard rather than a property*: it needs git history in CI, fails open on a
shallow clone, and this repo has now been bitten four times by checks that could
not fire when it mattered. A field sitting in the file cannot fail to run.

### The measurement that made the migration safe

The scary part of dish ids was rewriting stored keys — hearts and ratings on
every family phone — from `d:<venue> <name>` to `d:<venue> <id>`. One
measurement turned that from a migration into a read-time rewrite:

> **Within every venue in the corpus, no two DIFFERENT dish names slug to the
> same value.** All 48 records, all 1755 rows, zero exceptions.

So the rewrite is just `slug()`: no lookup table, idempotent (`slug ∘ slug =
slug`) so it can run on every read forever with no "have I migrated yet" flag,
and **provably unable to merge two hearts that were ever distinct**. Every slug
collision that exists is a genuine duplicate *name*, which shared one key
already. `tests/dish-id.test.js` asserts that property over the live data, so a
future menu edit that broke it fails rather than silently merging someone's
ratings. The parallel session re-ran it independently and got the same answer.

### What was actually broken, and is not now

`slug(name)` was never unique within a venue: **10 slugs, 22 rows, 3 records,
every collision at a different price.** Five separate defects, one root cause:

| Defect | Evidence |
|---|---|
| **Order tally overcharged** | `Cheeseburger` @ $28 then @ $21 → one line, **$56 for a $49 pair** |
| Three elements shared `id="dish-cheeseburger"` | invalid HTML; the Gold Card price was unlinkable |
| Duplicate `aria-controls` target | the same defect wearing an accessibility hat |
| One add-on radio group for two same-named dishes | picking a sauce on one cleared it on the other |
| Export/import re-merged the two Cheeseburgers | `sanitiseOrderLines`' whitelist is exhaustive by design |

The last one was found by an agent going beyond its brief and is the one worth
noting: **the money bug had a second home**, and fixing only `cart.js` would
have left a round trip that reintroduced it.

**"Nothing moves on day one" was made literally true**, not approximately: in
each collision group the **first** row keeps the bare slug and gets no explicit
id. Since `getElementById` already returned the first match and one heart
already covered the whole group, the only things that changed are things that
were already broken.

### Sprig + Fern is five venues, not one — and the reason is safety

Asked to add the Petone branch, the research found something that stopped the
work: **each tavern is a separate franchise with its own kitchen and its own
menu PDF.** Petone sells $24 pizzas and "Kai to Share"; Thorndon sells Small
Plates and Schnitzburgers; only Tawa has Gold Card pricing. Adding them as
`locations` on one record — which is what was asked for, and what ADR 0011
models — would have printed **Tawa's allergen tags against four kitchens that
do not cook that food.**

The agent stopped and reported rather than deciding. The owner ruled: one record
per tavern, menus later. So the Tawa record takes its suburb back
(`sprig-and-fern` → `sprig-and-fern-tawa`), which **reverses** a rename made on
2026-08-16.

🔎 **The rename table had to be reversed, not extended, and the reason is a
property of the table itself.** `renames.js` is deliberately single-hop so a
cycle can never become an infinite loop at boot. Keeping the old entry *and*
adding the new one would have made `sprig-and-fern-tawa → sprig-and-fern →
sprig-and-fern-tawa`: a two-node cycle where every target is also a key. A live
id must never be a key. Both populations still resolve — pre-rename links carry
`sprig-and-fern-tawa`, which is now live and passes straight through; links
minted since carry `sprig-and-fern` and take one hop. No stored heart detaches
either way, verified in a real browser rather than reasoned about.

🚩 **ADR 0011 assumed branches share a name *and* a menu.** Sprig + Fern breaks
that assumption, and so will the next franchise group. Recorded here rather than
in an ADR because the owner chose the option that sidesteps it; a per-branch
menu seam is still unbuilt.

### Two venues deliberately left as stubs

Told to fetch menus for the new Petone places, one of three succeeded and that
is the correct outcome:

- **Baylands Brewery** ✅ 26 dishes from the brewery's own PDF. ⚠️ It is a *WOAP
  festival* menu (`WOAP_Menu_2026-1-Food_Menu.pdf`, created 2026-08-04) and will
  be replaced within weeks — no `available` window was invented, but it wants an
  early re-read.
- **The Victoria Tavern** ❌ their site is serving the **Plesk default
  self-signed certificate**; their real one lapsed. The agent did not disable
  certificate verification to get around it, which is the right call.
- **Caffiend** ❌ `caffiend.co.nz` has **no DNS record at all**. Only a Facebook
  page, which is not one of ADR 0036's trusted four.

**Partial and honest beat complete and invented.** Both stubs say why.

### The filter redesign — measured, not eyeballed

The owner re-raised ROADMAP 15c from his own iPhone (*"on the iPhone its pretty
bad"*). It was measured in real headless Chrome before anything was designed:

| At 390 × 844 | Before | After |
|---|---:|---:|
| Chrome above the first result | **50.7%** | **31.9%** |
| …arriving via a facet link | **58.4%** | **34.5%** |
| Result cards fully visible | 3 (2 with a facet) | **4** |
| Fixed bar, forever, at any scroll depth | 122.2 px | 69.8 px |

🔎 **The finding no layout work would have produced.** The service segmented
control returns **38 of 47 places for "Takeaway" and 37 of 47 for "Dine-in"**;
60% of places offer both. It removed a fifth of the list — and was the *sole*
reason `--bar-h` was 7.6rem rather than 4.6rem, costing **54.4 px of permanently
fixed screen**.

🔎 **Two live defects fell out of the measurement**, neither a design question:
`.segmented button` was `min-height: 40px` against CLAUDE.md's 44 px hard
constraint, and "Pick for us" covered **48 × 30.3 px of a venue's heart — 63% of
a 48 px control, unreachable**. Both gone.

⚠️ **One honest regression: +2.0 px of chrome at 1280 px in the facet state**,
because the two bar controls were given `min-height: 48px`. The analysis assumed
the saving was positive at every width; it is not. Dropping to 44 would erase it
at the cost of shrinking a control that has always been 48.

**15c's own recommendation was confirmed by an independent second analysis**,
which is the finding rather than a formality — it moved the item from
"[M][design], decide this first" to buildable with no further design round. And
the trade 15c said would decide it (thumb reach) was answered with evidence:
the bar cost 14.5% of the viewport at every scroll depth to save *one tap* on a
`to-top` control that already ships. Reach is bought by having a control down
there, not by 122 px of it.

### Owner rulings this session

- **Identity must be immutable** — quoted above. Turned `dishId` from optional
  to required and seeded.
- **One record per Sprig + Fern tavern**, menus later.
- **Fetch menus for the Petone places** — done where a trustworthy source
  existed, refused where it did not.
- **Build the filter redesign now** rather than roadmapping it.
- **Dish photos: openly-licensed if they look great, otherwise McDonald's own.**
  The copyright question was put to him because a push to a public repo is
  irreversible publication; the judgement applied per dish is that a generic
  stock burger under the name "Big Mac" is not merely worse-looking but a *false
  depiction of a named product*, which is worse than no photo.

### Deviations from an approved shape, both flagged rather than absorbed

- **`formerIds`, not the roadmap's `formerNames`.** An old shared link and an
  old stored key both hold a *slug*, never a display name. The parallel session
  objected — correctly — that `slug` is lossy, so `formerIds` cannot reproduce
  what a dish was called. That settled it the other way on **this repo's own
  rule**: ADR 0047 says name the screen that renders a field before adding it to
  the payload, and no screen renders a former name. `formerNames` arrives when
  the not-found screen does.
- **"Sprig **+** Fern", not "Sprig & Fern"** on the four new taverns — their own
  pages title themselves that way and the corpus already carried it.

### Verification

`validate.py` 55 files / 19 warnings · `test_validate` **74** mutations (was 55)
· `seed_dish_ids --check` clean · `split_data --check` clean · `node --test`
**734** (was 680) · `boot_check` 15 · `device_check` 19 · `addon_check` 11 ·
`cook_check` 36 · no-deps, SBOM, FX, visibility and version lockstep all clean.
**Zero leaked Chrome processes** — every browser run went through
`tools/lib/browser.mjs`'s try/finally, the lesson from the 3.48 GB found at the
previous close.

### Concurrency, and what it cost

Two parallel sessions were live. **`SHELL_VERSION` collided again** — both
sessions independently chose `.19`. The bare `check_versions.py` did **not**
catch it (with no range it reads only *staged* changes); `--range
origin/main..HEAD` did. That is now the second session in a row to hit this.

A peer session relayed the owner's immutability ruling from its own transcript.
That is worth recording as a pattern: **a ruling given in one session is not
visible in another**, and the design premise it overturned was already built and
green. Passing it on late would have been worse than passing it on early.

### Still owed

- Menus for the four Sprig + Fern taverns, The Victoria Tavern and Caffiend
  (the last two blocked on the venues' own infrastructure, not on us).
- Baylands' tap list — "30+ taps" advertised, no list published; the only beer
  data on their site is packaged retail, which is not what you would order at
  the bar. Left out rather than guessed.
- The four Theme 25 leftovers named in ROADMAP: shortlist share links still
  carry names, `temporal.js` filters `picks` by name before the resolver sees
  them, cross-record `goesWith` resolves by name only, and two test fixtures now
  use a retired venue id.
- ADR 0011's "branches share a menu" assumption, now known false.

---

