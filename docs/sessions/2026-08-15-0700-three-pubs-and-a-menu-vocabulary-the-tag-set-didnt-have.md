## 2026-08-15 — Three pubs, and a menu vocabulary the tag set didn't have (wt: three-venues) — Opus 5

**Asked for:** 1841 in Johnsonville, The Borough in Tawa, Southern Cross in
Wellington. **Delivered:** three `menu-complete` records, **164 dishes**, every
price from a first-party source. No stubs — all three had a reachable menu once
the right source was found.

**Finding the sources was most of the work, and two of the three tried to
mislead.**

- **1841** publishes a PDF on its own site. The text layer extracted cleanly,
  but the *section headings* were ornamental glyphs in a symbol font — control
  characters, not letters. Page 1 renders via `sips` (which converts page 1
  only), and it shows two headings: MAINS and EXTRAS. Matching those against the
  glyph runs gave a cipher (M=\027, A=\031, I=\026, N=\025, S=\030;
  E=\035, X=\034, T=\033, R=\032) that decoded page 2's three headings
  consistently and with no leftovers: **DESSERTS**, **BRUNCH**, **STARTERS**.
  Cross-validated on three independent runs, so the section names are read, not
  guessed. Page 1's rendered image also confirmed the item/price extraction
  line for line.
- **The Borough had left Star Group.** `stargroup.nz/venues/the-borough` says so
  outright and offers nothing else; the Tawa business directory still links
  there, and Quandoo/Tripadvisor carry the old group's menu. Its real site is at
  `theboroughtawa.co.nz`, and its menus are **PNGs**, read directly. Evidence it
  is current: a Burger Wellington entry running 2026-08-03 to 2026-08-23.
- **Southern Cross's own menu page carries two menus.** The live tabs, and a
  stale duplicate block further down the DOM with the same dishes 3–5% cheaper
  (garlic loaf 13.5 vs 14.0, cheeseburger 26.0 vs 27.0) under different section
  names (Burgs, Pub Favourites, Bowls). Its downloadable 2026 PDF contains
  **two brunch menus** as well. Only the live tabs were recorded. The other
  brunch set turned out to be **The Borough's** (Rosti Benedict 27.5, Eggs Your
  Way 16.5, Big Breakfast 31.0 — identical to the Tawa menu images), which is
  what a shared group template leaves behind. Recording either stale layer as a
  price change would have fabricated a price cut.

🚩 **A summariser silently corrected a source and I nearly recorded the
correction as the source.** `WebFetch` returned "Venison Mince Ragu" for a dish
the page actually spells **"Vension"**. Grepping the raw HTML for "Venison"
returned 0, which briefly read as a hallucination — it wasn't, it was a quiet
fix. Both failure modes look identical from the summary alone. **Every price and
dish name here came from raw HTML, the PDF byte stream, or the menu image** —
never from a model's prose rendering of them. The dish is stored under the
correct spelling; that is a transcription judgement, and it is recorded here.

**The tag decision — [ADR 0040](../decisions/0040-nga-and-ngo-map-onto-the-closed-tag-set.md).**
All three menus mark gluten as `NGA` ("no gluten added") / `NGO` ("no gluten
optional"), a vocabulary the closed tag set doesn't carry. Mapped `NGA`→`gf`,
`NGO`→`gf-option`, `VO`→`v-option`, with the venue's own hedge kept verbatim in
each `desc`. Adding an `nga` tag lost on cost; leaving them untagged lost because
it discards a stated fact and breaks the GF filter on exactly the menus that
bothered to mark themselves up. The gap it leaves — **the site cannot say a
kitchen is shared** — is raised in the ADR, not patched: three records are not an
evidence base for a schema change.

**A false positive fixed in `tag_allergens.py`.** It flagged Southern Cross's
House Granola as `contains-dairy` because the rule matches the bare word
`yoghurt`. The granola is served with **coconut** yoghurt. The tool already had
a `NON_DAIRY` exclude for plant milk/cream/butter; `yoghurt|yogurt` joined it.
Same class of fix as the "peanut butter is not dairy" exclude already there.

**Two encodings worth noting.**
- **1841's prices are a dated series**, not plain numbers: the PDF's embedded
  `/CreationDate` is **2025-03-27**, so each entry carries that date rather than
  claiming the price is current. `verified` remains the day we read it, per the
  Takeaway @ Churton precedent — which means `refreshCaveat` shows **no**
  caveat on a 17-month-old document. That is the documented weakness of
  `paper-menu` (ADR 0031), not a new one; logged as a follow-up.
- **The Borough's Burger Wellington entry is time-boxed** — the section carries
  `available: {from: 2026-08-03, to: 2026-08-23}`, so The Aegean Melt drops off
  the menu on its own after the festival. Verified rendering today, inside the
  window.

**Verification.** `validate.py` 38 files, 0 errors (warnings 27 → 14 after
tagging); `test_validate.py` 14/14; `check_no_deps` clean; `gen_sbom --check`
clean; `check_visibility` PUBLIC; `node --test` **533 pass**; `device_check`
**19 pass**; `cook_check` **36 pass**. All three pages then driven in headless
Chrome at **390 px**: 53 / 55 / 56 dishes, **no page errors**, the price series
resolving to `$42` on Hop Scotch, the P.O.A dish rendering "—", the Burger
Wellington section present, and `⚠ CONTAINS PEANUTS` firing on Southern Cross's
brownie sundae. `DATA_VERSION` and `SHELL_VERSION` → `2026-08-15.5` (both:
`site/data/` and `site/index.html` changed).

**Not done, and deliberate:** drinks menus. All three publish separate alcohol
lists; the food menus are complete and the drinks were left out as a product
question rather than a backlog item. 1841's kids menu is a separate 2023-dated
PDF and was skipped as too stale to be worth transcribing. `picks` are empty on
all three — owner-supplied only. All four are logged under Theme 4.

