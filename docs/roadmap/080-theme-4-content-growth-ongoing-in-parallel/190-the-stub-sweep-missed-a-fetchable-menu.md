- [x] 🔎 **The "not one stub is fetchable" sweep missed at least one venue that
      publishes a full priced menu** `[S][content]` — found 2026-09-07 (session
      faves-24) while doing the owner-directed Dragonfly fetch (`180`).
      ✅ **CLOSED 2026-09-07 (session faves-b1); the claim is released.**
      🛑 **FIVE of the thirteen were fetchable, not one.** Nine of the thirteen
      publish a website at all. The full sweep is below.

  ✅ **OWNER-DIRECTED 2026-09-07 (session faves-b1) — RE-CHECK ALL THIRTEEN AND
  FETCH WHAT IS THERE.** Put to him as four options; he was offered a
  report-only sweep as the recommendation and **chose the wider one**: find the
  menus and transcribe them in one pass. 🔑 **This matters for the menu-content
  rule, so state it exactly.** The rule is *"whatever food/dishes I give you are
  to be included, if I don't give them to you or tell you to fetch them they are
  not."* The Dragonfly instruction named one venue and did **not** cover these
  thirteen — the delivering session was right to stop. **This ruling is the
  direction that covers them**, given knowingly, with the narrower option in
  front of him. It covers the thirteen stubs carrying the *"publishes nothing at
  all"* verdict and nothing beyond them.
  🚩 **It does not license invention.** Where a venue publishes prose, a
  rotating board, or a client-rendered ordering platform rather than a priced
  list, the answer is still *not captured* — the Dragonfly fetch recorded two
  such refusals and they were correct.

  `150-venues-still-stub.md` records, measured 2026-08-17: *"18 stubs remain
  and NOT ONE is fetchable … the four that publish a website
  (`babaili-malatang`, `caffiend`, `kaffee-eis`, `new-chapter-cafe`) publish no
  menu *on* it, and the other fourteen publish nothing at all."* It closes by
  telling future sessions not to repeat the search: *"A future session that
  'researches the stubs' is repeating a search already run exhaustively and
  written up."*

  🛑 **Dragonfly was in the "publishes nothing at all" fourteen, and it
  publishes `dragon-fly.co.nz` with a `/menu` page carrying 24 priced dishes.**
  Confirmed by fetching the page, not by a search snippet.

  🔑 **The finding is about the METHOD, not the number.** One refuted record
  does not make the other thirteen fetchable, and this item must not be read as
  claiming it does. What it establishes is that the sweep's negative verdict is
  **not reliable at the record level** — so the sentence telling future sessions
  the search is exhausted is doing real harm: it is the reason nobody re-checked
  Dragonfly for three weeks, and it would have kept being the reason.

  🚩 **Why a sweep would miss this, and it is worth knowing before re-running
  one.** The venue's site is `dragon-fly.co.nz` — a **hyphenated** domain that
  does not match its name, its record carried `website: null`, and the menu is
  on a `/menu` path rather than the homepage. Any sweep keyed on the record's
  own `website` field, or on a guessed domain, finds nothing and reports
  "publishes nothing at all" — which is indistinguishable from having checked.

  ## The sweep, run 2026-09-07 (session faves-b1)

  🎯 **The set was derived, not read.** Every record under
  `site/data/restaurants/` with `status: stub` is **17**; four of those are the
  named `babaili-malatang` / `caffiend` / `kaffee-eis` / `new-chapter-cafe`
  group, which the direction excludes. 17 − 4 = **the thirteen**, and they are
  exactly the fourteen minus Dragonfly. The derived set and the recorded one
  agree; there is no mismatch to report.

  📋 **Method, recorded so the next refutation is cheap.** For each venue: a
  name-plus-suburb search; then plausible domains **including ones that do not
  contain the venue's name**, probed directly; then the venue's own social
  pages; then `/menu`-style paths. Every verdict below rests on **fetching and
  reading** the page, its menu image or its menu PDF. A search-result snippet
  was never accepted as evidence, in either direction.

  | Venue | Site | Priced menu | Outcome |
  |---|---|---|---|
  | `abrakebabra` | ✅ | ✅ | ✅ captured — 78 dishes |
  | `cosmic-vape-and-coffee` | ✅ | ❌ | ❌ no menu published |
  | `cozy-cake-shop` | ❌ | ❌ | ❌ nothing to read |
  | `crepes-a-go-go` | ✅ | ✅ | ✅ captured — 30 dishes |
  | `dirty-little-secret` | ✅ | ✅ | ✅ captured — 21 dishes |
  | `garage-project-leeds-street` | ✅ | ✅ | ✅ captured — 15 dishes |
  | `goldings-free-dive` | ✅ | ❌ | ❌ the food is another business's |
  | `groundup-cafe` | ❌ | ❌ | ❌ nothing to read |
  | `hotel-bristol` | ✅ | ✅ | ✅ captured — 79 lines |
  | `marigold-takeaway` | ❌ | ❌ | ❌ platform link is dead |
  | `moore-wilsons` | ✅ | ❌ | ❌ retailer, not a menu |
  | `simmer` | ❌ | ❌ | ❌ nothing readable |
  | `wellington-sourdough` | ✅ | ❌ | ❌ price list is by email |

  🔑 **The number that answers the question: 5 of 13 were fetchable, and 9 of
  13 publish a website.** The recorded verdict — *"the other fourteen publish
  nothing at all"* — is wrong about the website for nine of the thirteen and
  wrong about the menu for five. It is not a near miss.

  ### Where the sites are, and what each one carried

  - **`abrakebabra`** — `kebabcentral.co.nz`, a domain carrying **none of the
    venue's name**, with the whole menu as text on `/our-menu/`. This is the
    Dragonfly shape exactly, and it is why a guessed-domain sweep cannot work.
  - **`crepes-a-go-go`** — `crepesagogo.co.nz/menu`. The menu is **two images**,
    so a text sweep of the page finds no dish and no price. Read from the
    images.
  - **`dirty-little-secret`** — `dirtylittlesecret.co.nz`; the Eat and Drink
    page links a one-page food PDF.
  - **`garage-project-leeds-street`** — the brand site's location page. The
    menu is an **image** the page labels *Sample Menu*, which is the venue's
    own wording and is recorded as read.
  - **`hotel-bristol`** — the venue page on its group's site links a four-page
    digital menu PDF. It is the **same Star Group menu the corpus already
    carries twice** (`southern-cross`, `khandallah-trading-company`), price for
    price, so the food follows those records rather than inventing a third
    reading.
  - **`goldings-free-dive`** — has a site, and it is explicit that the food is
    **Pizza Pomodoro's**, a separate business already in this corpus under its
    own id. Nothing of its own to capture.
  - **`moore-wilsons`** — has a large site; it is a food **retailer**, and the
    two eateries on its ground floor are other businesses. No café menu.
  - **`wellington-sourdough`** — has a page on its group's site which says in
    terms that the product and price list is supplied **by email on request**.
    Publishing that it will not publish prices is still not publishing prices.
  - **`cosmic-vape-and-coffee`** — the chain's site lists the store but no food
    or drink menu anywhere.
  - **`marigold-takeaway`** — the ordering-platform link that search surfaces
    **redirects to the platform's own marketing homepage**; no menu behind it.
  - **`cozy-cake-shop`**, **`groundup-cafe`**, **`simmer`** — no site of their
    own could be found under any spelling. Each has a social page, and each is
    behind a login past its first screen. Nothing readable was published.

  ### What was captured, and what was refused inside a captured menu

  ✅ **Five records moved `stub` → `menu-complete`**, each with its no-JS
  fallback promoted from an unlinked "Menu coming soon" card to a real link
  (45 linked / 12 stub, was 40 / 17).

  ❌ **Refusals inside the five, each recorded in its own commit:**
  1. **Two venues print a dietary claim we believe false** — a `VEGE` marker on
     a smoked-salmon crepe, and `V`/`VGO` on a pork croquette. Those are not
     transcribed. No tag means *not stated*, and that is the safe direction; a
     wrong vegetarian claim is eaten, not avoided.
  2. **"Low gluten" and "low dairy" have no tag.** Dirty Little Secret marks
     dishes `LG`/`LD` and separately `LGO`/`LDO`. The **option** markers are
     carried as `gf-option`/`df-option`, matching how the corpus already
     handles the Star Group `NGO` marker. The unhedged `LG`/`LD` are **not**
     carried, because `gf` would turn a deliberately weaker claim into an
     absolute one. ⚠️ Note this leaves the corpus holding **two readings of one
     idea**: `southern-cross` maps the neighbouring `NGA` marker straight to
     `gf` with a prose caveat, and this record refuses the equivalent. That is
     a vocabulary question, not a venue question — see the findings below.
  3. **Hotel Bristol's beer and cider are listed with ABV and no price**, so
     the taps, the bottles and the RTDs are not captured. The wine, which is
     priced by the glass and the bottle, is.
  4. **Abrakebabra publishes no hours for Wednesday.** It lists Sunday to
     Tuesday, Thursday, Friday and Saturday, and says nothing at all about
     Wednesday. An empty day in the `hours` shape asserts *closed*, and unknown
     is not closed, so `hours` stays `null` rather than claiming six known days
     and one invented one. Telling a reader a kebab shop is shut when it is
     trading is the direction ADR 0094 was written to stop.
     ⚠️ **The commit that landed this record gave a second reason — that the
     Thursday-to-Saturday closes after midnight could not be expressed
     either — and that reason was already stale when it was written.** ADR
     0094 landed on `main` the same day and makes the wrap legal; the rebase
     brought it in. Wednesday alone is what blocks the field. Correcting it
     here rather than rewriting the commit, because the commit is the record
     of what was believed at the time.

  ### Found and filed, not fixed

  🚩 **The allergen tagger has no rule for several everyday food words.**
  Working through five menus it missed `baguette`, `hoagie roll`, `sando`,
  `sourdough`, `crouton`, `Yorkshire pudding` and `nugget` — each a wheat
  product named in a dish description — and `tzatziki` as a dairy product
  across seventeen rows of one venue. Every one was added by hand and named in
  the commit that added it. Checked against the tool **as it stands after the
  `contains-fish` merge**, not against a remembered version: none of those
  seven words appears in `tools/tag_allergens.py` at all.
  🔎 **One is a different fault and worth separating.** `toastie` **does** have
  a rule, and it fires on *"Corn Cheese Toastie"* — but it does **not** fire on
  *"Cheesy toasties"*. Probed directly: the tag was removed, the sweep re-run,
  and nothing was reported. So that one is a matching bug, not a missing rule.
  **The tool was not touched**: another session held it on 2026-09-07. This is
  a list for whoever picks it up, not a diagnosis of the rule file.

  ✅ **`contains-fish` landed on `main` while this work was in flight** and was
  picked up on the rebase — it tagged four dishes across these records
  (a smoked-salmon crepe, two fish dishes and an anchovy dressing) that would
  otherwise have shipped silent about fish. A salmon **add-on option** still
  carries only `has-fish` and no allergen warning, matching the rest of the
  corpus; that gap is already filed as Theme 5 `040`.

  🚩 **A venue can be open on a day it does not list.** Abrakebabra is the
  second record on 2026-09-07 to be understated by the `hours` shape; the first
  was Dragonfly's past-midnight close, filed as
  [`190/010`](../190-theme-13-what-the-time-dimension-unlocks-owner/010-hours-cannot-express-a-past-midnight-close.md)
  and since fixed by ADR 0094. This is the neighbouring gap and it is **not**
  fixed: the shape has no way to say *"we do not know about this one day"*, and
  `[]` is read as closed. Same class — the week's shape cannot hold what the
  venue actually said — but a different half of it.

  📌 **`150`'s "do not repeat this search" sentence is amended** in the same
  commit as this closure, to say what is now true: the negative verdict was
  per-method, it has been re-run once, and it was wrong five times out of
  thirteen.
