- [x] **Menus still owed on six venues — and where each one lives**
      `[M][content]`. ✅ **DISPOSITION 2026-08-17: DELIVERED.** All 18 venues
      the owner authorised are resolved — 14 transcribed, 4 proven menuless —
      so the state below is the record of how, not open work. The `[~]` it
      carried through the batch is flipped here rather than in the roadmap,
      because the roadmap now holds only the one-line pointer.
      Researched 2026-08-16 and written down here so a fresh
      session can start rather than repeat it.
      ✅ **Subway (141) and The Victoria Tavern (138) DONE 2026-08-16** under
      the two owner rulings recorded below — **10 of 14, 1,262 dishes.**
      🔑 **Subway proved the dish-id split from the venue's own data.** The same
      filling is sold as a sub, a wrap and a salad, and its own allergen guide
      gives the three **different** allergen sets — soy is `●` on the Sweet
      Onion Chicken Teriyaki *sub* and only `*` on the *wrap*, and the Chicken
      Strips *salad* has no gluten row at all. 44 explicit `dishId`s; they are
      three products, not one printed three times, and the difference is the
      bread — which is the gluten.
      🚩 **An inconsistency this pair created, named rather than left:** Subway
      keeps 141 unpriced rows (owner-ruled), while The Victoria Tavern's agent
      **dropped ~40 unpriced spirits** on the corpus convention that unpriced
      lines are omitted (checked against `southern-cross` and
      `the-borough-tawa`, neither of which carries a null-price row). Both are
      defensible and they are opposite. 🎯 **Worth one ruling** — is an unpriced
      row a *record of what the venue sells* or *noise until someone prices it*?
      The answer changes what every future intake does with a spirits list.
      The dropped rows are recoverable from the drinks PDF at any time.
      ⏳ **Remaining 4, all needing a human, not a session:** `caffiend`,
      `new-chapter-cafe`, `kaffee-eis`, `babaili-malatang` — each publishes a
      website with **no menu on it**, so only a photo or an in-store visit
      clears them.
      ✅ **8 of the 14 DONE 2026-08-16 (wt: faves-menus) — 983 dishes.**
      The Catch Sushi Bar 87 · Satay Kingdom 53 · Charley Noble 125 · Regal
      Chinese 264 · Rock Yard Vietnamese 58 · Pizza Pomodoro 83 · Gong Cha 131 ·
      Pizza Hut 133. Every price from the venue's own site or its own menu PDF.
      🎯 **Pizza Hut raised a policy question its agent refused to settle alone,
      and it will recur on every PDF-sourced venue.** Its first-party allergen
      PDF grades each allergen `P` (present) or `T` (*"stored or used to
      manufacture other items at the site"* — trace/cross-contact). `T` is
      near-universal across the whole pizza line for tree-nuts, peanuts, sesame
      and shellfish. Only `P` was tagged. [ADR 0025]'s *"when unsure, tag"*
      points the other way — **but this is not uncertainty, it is the venue's own
      graded signal**, and collapsing `T` into `contains-*` would fire those
      tags on every pizza, which is a warning that carries no information.
      The vocabulary has no *"may contain traces"* tier to hold it faithfully.
      ⚑ **Owner's call, and it wants to be a batch-wide rule rather than a
      per-venue one.** Same family as the `contains-fish` gap under Theme 5.
      ⚠️ **And its prices may not be Johnsonville's.** The order pages show
      prices without ever asking for an address, and the store page's "View
      menu" button carries no href (a Vue handler), so the address flow could
      not be driven. These are Pizza Hut NZ's default online prices; whether
      they equal this branch's is unestablished. One in-store or phone check
      clears it.
      **The other 7 are accounted for, not abandoned** — see the two findings
      below: 4 publish a site with **no menu on it**, and 3 need an owner call
      (`pizza-hut` transcribable and in progress at close · `subway` publishes
      no price anywhere · `the-victoria-tavern` reachable only with TLS
      verification disabled). 🔑 **The recipe that made this repeatable:** a
      venue's own ordering storefront on its own domain counts as
      `official-site` — three of the seven came from TuckerFox/Pump'd/appropo
      pages linked from the venue's own nav, and two agents independently found
      the venue's *marketing homepage* price tiles **stale** against them
      (Salmon Nigiri $6.50 vs $7.50; satay $16.00 vs $17.90). **Read the
      ordering page, never the marketing tile.**
      🔎 **The previous claim was released as ORPHANED, on evidence, not
      impatience.** It read `CLAIMED 2026-08-16 12:14 UTC (wt: faves-menu-18)`.
      Three independent facts say that session closed rather than paused:
      `/Users/mike/worktrees/faves-menu-18` does not exist, `git branch -a`
      carries no `menu-18` ref (local **or** remote), and its work is merged and
      written up — the `SESSIONS.md` tail is its close record, naming the four
      it landed and what it left. A claim outlives the session that wrote it,
      so an orphaned one blocks the queue permanently unless something releases
      it. 🔑 **The release test, for reuse: no worktree AND no branch AND a
      close record.** Any one alone proves nothing — a live session between
      commits has a clean tree, and a worktree can be recreated. Never release
      a claim on elapsed time.
      ✅ **4 of 18 done 2026-08-16: the Sprig + Fern taverns** — Petone 10,
      Berhampore 19, Thorndon 20, Little Sprig Seatoun 16 = **65 dishes** where
      there were none. Confirmed they are four separate kitchens: four menus
      with zero overlap, Tawa's included. **The remaining 14 are open** and the
      recipe below makes them repeatable.
      🔑 **What the pilot learnt, and a brief for the next 14 must carry:**
      - **The `/pages/<slug>` pages hold no menu at all** — every one is a link
        to a per-venue PDF. This is PDF work, not page-scraping work.
      - **`tag_allergens.py` writes NOTHING on any record with
        `addOnGroups`.** It patches `tags` positionally and bails when the count
        mismatches, so it exits clean having done nothing — a green run that
        means "I declined". All four needed the tags applied by hand and the
        tool re-run to zero to prove none were dropped. 🚩 This is the
        decorative-guard pattern again, in the one tool whose silence is a
        safety question: it *reports* the missing tags and cannot *apply* them.
      - **It reads item text only, so it cannot see a section note.** Thorndon
        prints "on a Sesame Bun" once above the burgers — all three burgers came
        back untagged for sesame. Berhampore's "our pizza bases contain dairy"
        likewise. **30+ tags were missed this way**; the sweep is a first pass,
        never the answer.
      - **Never trust PDF text extraction's ORDER.** `pypdf` emits
        Berhampore description-before-name, which would have given a fried item
        the polenta sticks' *"Vegan, DF, GF"* — a false SAFETY claim. Render to
        PNG and read it visually. No `pdftotext`/poppler on this machine;
        `pypdf` + `sips` works, and `qlmanage` covers the PDFs `sips` renders
        black.
      - **A dropped toppings line survives as a tag.** Thorndon's "Margherita"
        arrived as a bare name with `contains-nuts` while every other pizza
        carried its toppings in the name — the tag outlived the text that
        justified it. Caught by reading the data, not by any gate.
      🚩 **Two menus are years old and now say so.** Petone's PDF was exported
      **2023-06-02** and Berhampore's **2023-12-21**; both carry that as
      `verified`, so both correctly show the stale caveat. Recording the
      document's own date rather than the day we read it is what makes that
      caveat fire — ADR 0038's `/CreationDate` rule doing its job.
      ⚑ **Little Sprig Seatoun's date is contested and left at 2026-06-29.**
      The PDF's Canva `/Title` says *"Bar Snacks Menu (Oct 2025)"* but it was
      exported 2026-06-29 and the venue's own filename calls it the 2026 menu.
      The export date is the only full-precision date the document supports;
      the conservative read would be older. Owner's call if it matters.
      🚩 **Roughly a third of the allergen tags are judgement, not reading** —
      croquettes assumed crumbed, calamari assumed floured, pizzas assumed
      cheesed from a "dairy free cheese available" footer. Each is a small
      safety bet, recorded in the session log. **`contains-egg` was DECLINED
      twice** (croquettes, cheesecake) where the split is genuine; those are
      the two most likely to be wrong in the dangerous direction.
      🔎 **An inconsistency the pilot exposed rather than caused:** Tawa's
      sausage dishes carry no `contains-gluten` while Seatoun's now do, on the
      same reasoning (NZ sausages standardly contain wheat rusk). The corpus
      disagrees with itself; nobody touched Tawa. Worth a sweep of its own.
      🔎 **Unrelated but found here:** the no-JS fallback `<ul>` in
      `site/index.html` is **35 venues behind** `site/data/index.json`. That is
      a lockstep rule in CLAUDE.md going unenforced corpus-wide, not something
      this batch introduced — and nothing checks it.
      ✅ **RESOLVED 2026-08-16 — and the "35" was a measurement artefact.**
      The fallback was never 35 behind: all **55** venues were listed, in
      `index.json` order, names matching. The 35 came from counting
      `restaurant.html?id=` hrefs against the 55 ids — but **a stub is
      deliberately rendered without a link**, as a `<div class="card-body">`
      carrying a "Menu coming soon" chip, because there is no menu to open. So
      the count measured *venues with a menu*, not *venues in the list*, and
      55 − 20 linked = 35. 🔑 **The same trap this file names one item above**
      (*"a count derived from 'records with more than one branch' answers a
      different question from 'records that are a chain', and reads identically
      in prose"*) — and it caught a second reader, who reproduced the 35 exactly
      before noticing the stubs.
      🚩 **But there WAS a real defect underneath, and it is worse than a
      stale list.** Nine venues had **finished menus rendered as unreachable
      "Menu coming soon" cards** — `takeaway-at-churton`, `spices-indian`,
      `thai-tara-express`, `satay-kingdom-cafe`, `the-catch-sushi-bar` and all
      four Sprig + Fern taverns, the last four landed the day before. A reader
      with no JavaScript was told those menus did not exist. That is a **status
      drift**, not a membership drift, which is why a membership count could not
      see it.
      **`tools/check_fallback.py`** now gates it in CI and in the CLAUDE.md
      verify list: same ids, same order, same names, **and a link on everything
      that is not a `stub`**. Encoding the link rule is the point — it is what
      stops the next reader re-measuring this wrong.

      > 🚩 **"Publishes a website" is NOT "publishes a menu" — measured
      > 2026-08-16, and it halves this item.** The parenthetical below reads a
      > website as *"a fetchable first-party source"*. It is not one. Of the
      > 14 remaining website-publishing venues, **four publish a site with no
      > menu on it anywhere**: `new-chapter-cafe` (its own menu page says
      > "Coming Soon" on all three categories, and the template still carries
      > its own `<!-- TODO -->`), `kaffee-eis` (a Squarespace site whose
      > "Our Gelato" page says *"we make more than 45 flavours"* and names
      > none), `babaili-malatang` (an 8-page site with no menu entry in its own
      > nav), and `caffiend` (Facebook only, menu tab login-gated). Each was
      > checked exhaustively — sitemap, soft-404 detection by MD5, platform
      > JSON endpoints, guessed paths, own social accounts — and each is a
      > **decision, not an oversight**: only a photo or an in-store visit
      > clears them, exactly like the fourteen that publish nothing. 🔑 **So the
      > `stub` count splits three ways, not two: publishes nothing · publishes
      > a site but no menu · publishes a menu.** The middle group is invisible
      > to the reproducer below, which is why it was miscounted.
      > 🔎 **And two "blocked" findings were REFUTED by going back to check.**
      > `subway` was recorded hard-blocked on a click-only widget: its menu
      > pages are in fact server-rendered and readable, and it publishes a
      > first-party **NZ Allergen Web Guide (May 2026)** — but it publishes
      > **no price anywhere**, first-party, by design (franchise pricing), so
      > every price is legitimately `null`. `pizza-hut`'s 9.8 KB homepage is a
      > Nuxt shell, and one level in, `/order/<category>/delivery` serves a
      > complete price-bearing first-party menu. `the-victoria-tavern`'s
      > HTTP 000 is **not a dead domain**: it is a live server with a
      > self-signed Plesk placeholder certificate issued 2026-08-03, and its
      > real menu PDFs are current (mains dated 2025-11-24). 🔑 **A prior
      > session's "blocked" is a hypothesis, not a fact** — three of four
      > survived only until someone re-tested them.
      > 🔎 **The title understates the gap by five times — measured 2026-08-16.**
      > Counted across all 55 venue records: **32 carry zero dishes**, not six.
      > Of those, **18 publish a website** (a fetchable first-party source) and
      > **14 publish nothing at all** — for those fourteen, only a photo or an
      > in-store visit can ever clear them, so no amount of research will:
      > `abrakebabra`, `cosmic-vape-and-coffee`, `cozy-cake-shop`,
      > `crepes-a-go-go`, `dirty-little-secret`, `dragonfly`,
      > `garage-project-leeds-street`, `goldings-free-dive`, `groundup-cafe`,
      > `hotel-bristol`, `marigold-takeaway`, `moore-wilsons`, `simmer`,
      > `wellington-sourdough`.
      >
      > Reproduce, don't re-type — the same lesson ADR 0041 already drew for
      > dish-level gaps, one level up:
      > ```sh
      > python3 -c "import json,glob;[print(json.load(open(f))['id']) for f in sorted(glob.glob('site/data/restaurants/*.json')) if not sum(len(s.get('items',[])) for s in (json.load(open(f)).get('menu') or []))]"
      > ```
      > ✅ **RULED 2026-08-16: fetch all 18.** Asked under CLAUDE.md's standing
      > rule (*"if I don't give them to you or tell you to fetch them they are
      > not"*), because naming a URL in a roadmap is not that instruction. He
      > gave it. **This is the fetch authorisation** — cite this line, and note
      > it covers exactly the 18 venues that publish their own menu, not the 14
      > that publish nothing.
      > 🚩 **Scope discipline when you take it:** it is 18 venues, not the six
      > this item's title names — derive the list from the reproducer above,
      > never from the prose. Prices come from the venue's **own** published
      > menu, never a delivery app. Run `python3 tools/tag_allergens.py` and
      > `python3 tools/validate.py` after each, curate `priceBand` from the
      > **food-only** median (`tools/drinks_gap.py --price-effect`), and append
      > rather than overwrite per ADR 0023/0047.
      > ⚠️ **A fetched PDF is as old as its document, not as fresh as the day
      > you read it** — the `paper-menu` weakness ADR 0031 names, and the reason
      > 1841's March-2025 menu still reads as current. Record the document's own
      > date, not today's.
      - **Four Sprig + Fern taverns**, all `stub`: `sprig-and-fern-petone`,
        `sprig-and-fern-berhampore`, `sprig-and-fern-thorndon`,
        `little-sprig-seatoun`. Each publishes **its own** food menu PDF at
        `sprigandfern.co.nz/pages/<slug>`. They are separate franchises with
        separate kitchens — which is why they are separate records and not
        branches of one, the ADR 0011 assumption having broken here (this
        session's `SESSIONS.md` entry records the finding).
      - **The Victoria Tavern** and **Caffiend** are blocked on their own broken
        web presence, not on our effort. Nothing to fetch until someone brings
        back a photo of the menu — the `intake/` pipeline.

      Two tool steps are **not optional** when any of these lands:
      `python3 tools/tag_allergens.py` for the allergen sweep (ADR 0025 — the
      burden falls on *not* tagging), and `python3 tools/seed_dish_ids.py`
      after, or `validate.py` fails with **one error per dish** (ADR 0051).
