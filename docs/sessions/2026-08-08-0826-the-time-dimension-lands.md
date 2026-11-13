- **2026-08-08 (the time dimension lands — Opus 5 session)**: Owner is adding a
  rule to atelier that all data must carry a time dimension, and asked for faves
  to be updated to it — venue lifecycle dates, seasonal menus, dish and
  ingredient changes, and dated prices, with the explicit constraint that **the
  dinner-choosing UX must not change**. Atelier had moved that morning
  (`c9c177a`, PRINCIPLES §9), and §9's own generalised case is *this repo* —
  "a curated venue guide in the fleet… cannot say when a venue opened, when it
  entered the guide, or tell a refit from a permanent closure". Doctrine pin
  bumped `33a540a → 5ef28ae` and the drift base with it.
  **Shape** (ADR 0023): four optional JSON primitives — temporal value
  (a scalar *or* a dated series, on `price`/`address`/`phone`), `lifecycle`
  (dated transitions, `added` required), `available` (window and/or recurring NZ
  season, on a section or a dish), `revisions` (dated log of what changed) — plus
  one pure resolver, `site/js/temporal.js`, called from `data.js`. Everything
  downstream (`price.js`, `menu.js`, `cart.js`, search, ranking) still reads
  `item.price` as a number and never learns time exists. Records with no dates
  resolve to themselves, so all 31 files stayed valid through the change.
  **The design decision that mattered: two clocks.** World time (`from`, `to`,
  `date`, `opened`) vs record time (`recorded`, `offBy`, `added`, `verified`).
  We almost never learn *when a price rose* — only *when we read the new menu* —
  so an entry takes effect on `from` when known and `recorded` otherwise. Without
  that fallback essentially none of our real history is recordable. Dates also
  accept reduced precision (`"2019"`, `"2019-05"`), because the Churton scan
  carries no finer date and rounding it to 1 January would invent evidence;
  comparisons widen a partial to its full interval.
  **Retrofit — git mined, but not blindly.** Across every restaurant file's
  whole history there are exactly **two** commits that changed a price.
  Churton (`c2dc20b`, landed by another session hours earlier) is a genuine
  refresh — a 2019 scan replaced by the 2026-08-08 printed menu — so 174 dishes
  gained a two-entry series (median rise **50%**, mean 54%, range 16–120%).
  Gold Lining (`1ae3d9e`) is a Double Choc Cookie going `null → $5.50`, which is
  a **correction, not a price change**; recording it as a series would have
  fabricated a rise, so it stays a bare number. That distinction is why this was
  not a scripted sweep of the git log: a commit diff is evidence about *our
  record*, and only reading *why* the commit happened tells you whether the
  *world* changed.
  **Two catches in the Churton data.** Its refresh had renamed two dishes
  ("Calamari Ring" → "Calamari Ring (each)", "Griddled" → "Grilled Chicken &
  Bacon Wrap"); matched naively they'd have read as *dropped in 2026* — a false
  claim about the world — so both carry their 2019 price forward. And the five
  dishes that refresh genuinely deleted were **restored** with
  `available.offBy: "2026-08-08"`: a hard delete destroys every date attached to
  a thing including that it ever existed, which is exactly §9's clause and
  exactly what had already happened here.
  `lifecycle.added` mined from each file's adding commit for all 31 venues —
  record time, known exactly. **`opened` left absent everywhere**: we have never
  established when any of these businesses started trading, and absent means
  that, where a guess would not.
  **The one UI change, deliberately.** A closure gets a badge on the card, a
  banner on the menu header, and `ranking.js` treats a closed venue as
  unavailable whatever its posted hours say (`closure-ui.js`, reusing
  `.hours-badge`; three te reo strings drafted against maoridictionary.co.nz per
  the owner's nominated source). Everything else about time resolves invisibly.
  Reasoning: a stale price costs a dollar, a closed venue costs a trip across
  town — hiding *that* would make the app quietly wrong rather than quietly
  simple.
  **Payload — the number that matters is the compressed one.** On disk the
  corpus went 209 KB → 252 KB and Churton 30 KB → 72 KB, which looks alarming;
  gzipped it is **34.0 KB → 35.1 KB (+1.1 KB, +3%)**, because a dated series is
  intensely repetitive and that is precisely what a compressor eats. First visit
  stays ~161 KB gzipped against a 300 KB budget.
  🔎 **The browser pass caught what 358 passing tests did not.** `resolveRecord`
  was *imported* into `data.js` and never *called* — and the comment above the
  seam confidently described it running. Every temporal.js unit test still
  passed, because they test the resolver, not whether anything invokes it. The
  app meanwhile computed Churton's price band from a menu whose prices were raw
  dated arrays: `pricedItems` skips non-numbers, so it quietly took the median
  of the ten *new* dishes and produced "$$ ~$19pp" — a wrong figure that looked
  completely plausible on the card. Nothing would have flagged it.
  `tests/data-loader.test.js` now covers the seam (stubbed `fetch`), and was
  confirmed to fail 4/5 when the resolver is unwired again.
  **Second browser find: a stub that closes for good.** A `stub` card takes a
  different render path that never appended the hours badge, so a permanently
  closed stub read **"Menu coming soon"** — a promise about a place that will
  never serve again. Stubs now render a closure badge (and only a closure
  badge — `hoursBadge`'s third argument), and the "coming soon" chip is
  suppressed when the venue is permanently closed.
  Both were found by putting a closure on two real records as a temporary
  fixture (Gold Lining temporarily closed, Kaffee Eis permanently), rendering,
  then removing the fixture — the corpus itself has no closed venue.
  ⚠ **Still unseen:** no venue or dish in the corpus uses a **season**, so the
  seasonal path has unit tests but has never rendered. The permanent-closure
  card badge was DOM-verified rather than eyeballed; its colour token
  (`--warn`) is used elsewhere, and the temporary one (`--amber`) is the same
  token the "Closing soon" badge already proves on screen.
  🎯 **Owner calls queued** (ROADMAP Theme 13): where an upcoming price change
  should appear, what shape the price-trend view takes (with the honesty
  constraint that two readings seven years apart are two points, not a trend),
  and whether to start filling `opened` as content work.
  Verified: validate.py 31 files valid (15 warnings, all pre-existing); the new
  validator checks adversarially tested against 18 malformed cases (17 caught,
  the 18th confirmed caught end-to-end via `check_restaurant`); node --test
  **363 pass, 0 fail** (+33 in `tests/temporal.test.js`, +5 in
  `tests/data-loader.test.js`); the repo's own precache guard caught both new
  modules before they shipped unreachable offline; no-deps and SBOM checks
  green; home screen and a menu screen rendered in headless Chrome at 390 px
  with all four card states confirmed in the DOM (trading, closing-soon,
  temporarily closed, permanently closed) and the menu-header closure banner
  seen; every non-Churton data file confirmed to differ by exactly the
  three-line lifecycle block; resolver proven to reproduce the
  pre-change Churton menu **exactly** — 184 items, zero price mismatches — while
  the same record resolved at 2019-06-01 returns the old prices and the five
  retired dishes.
  🔎 **A concurrent session landed mid-work, and the auto-merge was quietly
  wrong.** The allergen-tag sweep (`963fe9c`) pushed to `main` while this was
  building, touching Churton — the one file this session had restructured
  end-to-end. Git resolved `sw.js` **without a conflict**, because both sessions
  had independently bumped `.97/.81 → .98/.82`: identical text, so nothing to
  conflict on, and this session's new shell and data would have shipped under a
  version string installed phones had already cached from their deploy — exactly
  the stale-cache failure the lockstep rule exists to prevent. Caught by reading
  the merged constants rather than trusting the clean merge; bumped to
  `SHELL_VERSION .99` / `DATA_VERSION .83`. **Worth generalising: a version
  counter is the one field where a silent identical-bump merge is a defect, not
  a convenience.**
  Churton itself was resolved by taking *their* tagged file as the base and
  re-applying this session's price transform on top, then re-running their own
  `tools/tag_allergens.py` — which flagged one restored dish (Seafood Fritter →
  `contains-shellfish`) and was applied. Proof the merge lost nothing: resolving
  the merged record at 2026-08-08 reproduces their 184 items with **identical
  price, tags and code on every one**.
  🚩 **Their commit also carries `tools/__pycache__/tag_allergens.cpython-314.pyc`** <!-- pathscan:allow: historical — the artefact was present in that commit at the time this was written, since removed -->
  — a build artefact that should not be in the tree. Left alone (not this
  session's commit to rewrite); worth a `.gitignore` line and a `git rm --cached`.

