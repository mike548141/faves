- [~] **28o — Merge the 63 ladders that differ only by name and price**
  (claimed 2026-10-17-2046, faves-b4, wt: faves-310-120b)
  PART 2 only: the three Takeaway @ Churton groups, which hold the history joins.
      `[L][data]` — population B of `28h`, the mechanical half. **This is the
      first item in the whole decomposition that retires a `dishId`, and it
      must not start before `28l`'s gate exists.**
  🚩 **"63" in this title is stale — measured 2026-09-28 at `1dfd012`, it is
  48.** Re-run `python3 tools/find_variants.py` for the live count; it prints
  both. The title keeps its old number so existing links and the index hold.

  **Measured at `e50c0ee`.** Of the 133 split-row groups, **63 have siblings
  identical in `tags`, `desc`, `addOns`, `served` and `prices`** — the only
  differences are the name and the price. For those, a merge is a mechanical
  transformation and the whole of `28a`'s "once it needs all five it *is* a
  dish" argument does not apply: they need none of the five.

  **What each merge does.** Collapse N rows into one base dish carrying a
  `selects` group of N options; keep **one** sibling's `dishId` as the base
  dish's (do not mint a new one — see below); put the other N−1 into the base
  dish's `formerIds`; re-key that venue's `data/history/prices/` rows onto the
  survivor with `tools/split_data.py`; and record the retired rows.

  🎯 **One engineering fork, decided here rather than left implicit: which id
  survives.** Keeping a sibling's id (say `chicken-kebab`, now displayed
  "Kebab") means that reader's heart never moves at all and only N−1 hearts are
  absorbed — but the surviving id then names a dish that is no longer
  specifically chicken, which is an id that lies to the next person who reads
  the file. Minting `kebab` fresh keeps the data honest and moves **all** N
  hearts through `formerIds`. **Recommend minting fresh**: `formerIds` is the
  supported path and exercising it uniformly is easier to verify than a rule
  with an exception. Stated because it is reversible only by another
  migration.

  🚩 **Do the venue with the most joins LAST, not first.** 57 of the corpus's
  227 price-history rows join to an id inside a ladder, and **all 57 are
  `takeaway-at-churton`** — nine of its groups are in this population. Prove
  the mechanism on a venue with no history first.
  `data/images/` holds 3 more (`mcdonalds` fries small/medium/large).

  ✅ **What proves it landed, per batch.** `28h`'s enumerator reports the
  merged groups gone; every retired id claimed exactly once
  (`28l`'s coverage check); `python3 tools/split_data.py --check` green **and
  its own line reporting 227 of 227 rows still joined on `dishId`, 0 on the
  name alone** — that line is the evidence, not the tick; `check_records.py`
  green; `validate.py` green; a browser assertion that a heart seeded under a
  retired id resolves to the base dish and survives the favourites filter.

  🛑 **A count of dish rows is not proof.** The rows will drop by 248 whether
  the merge was right or wrong. What proves it is the joins, above.

  **Depends on:** `28i`, `28k`, `28l`, `28m`. **Blocks:** `28p`.

  ✅ **Owner ruled 2026-10-16 (asked by `faves-11`): MINT A FRESH ID** for
  each merged base dish, which settles the contradiction above (the
  "keep one sibling's dishId — do not mint" sentence in *What each merge does*
  is superseded). His words: *"I am ok with minting fresh ID's in this
  instance. But we need a mechanism to handle this … something like alias
  identifiers or previously known as identifiers that can be associated to a
  freshly minted ID."* That mechanism exists: `formerIds` (ADR 0153, `28l`,
  closed 2026-10-02). Hearts, ratings and the favourites filter resolve
  through it, and `rename_check` asserts it (8 assertions). So every merged
  sibling's id goes into the fresh id's `formerIds`.

  ✅ **Part 1 done 2026-10-17 (faves-11 worker); part 2 and the skipped groups
  remain, so the item stays open.** Scope was the groups
  `find_variants.py` classifies `mechanical` at venues with no price-history
  join: of 44 mechanical groups today, **35 merged** (76 rows → 35 dishes, 41
  fewer; mechanical 44 → 9). Each base dish has a **fresh id**, a `selects`
  group, its price at the default (cheapest, a tie takes the first listed, so
  no cue row in `data/defaults/` was needed) and every merged id in
  `formerIds` (the owner's 2026-10-16 ruling). One commit per venue:

  | venue | merged | rows → dishes |
  |---|---|---|
  | Pizza Pomodoro | 26 pizzas (Small / Large) | 52 → 26 |
  | Wellington Kebab | Meat & falafel, Meat & muciver, Meat & halloumi, Gyrus | 12 → 4 |
  | Groundup Cafe | Takeaway Cup (Small / Medium / Large) | 3 → 1 |
  | Pandan | Varuval (Chicken / Beef / Lamb) | 3 → 1 |
  | KK Malaysian | Nasi Lemak (Chicken / Beef) | 2 → 1 |
  | Regal | Ginger & Spring Onion (Beef / Chicken) | 2 → 1 |
  | The Catch | Teriyaki, Donburi (Chicken / Beef) | 2 → 1 |

  **How it was proven.** `split_data.py --check`: `368 of 368 history row(s)
  joined on dishId · 0 still joined on the name alone` after every venue (368,
  not this item's old 227: the figure has grown since it was written);
  `validate.py --against <base>`: `76 id(s) … 76 claimed in formerIds, 0
  departed, 0 withdrawn, 0 answered for by nothing`; no new `validate.py`
  warning (one disappeared, see below); `find_variants.py` no longer lists the
  35 groups. `rename_check.mjs` gained scenario 4 (13 assertions now, was 8): a heart
  and a rating stored under the retired `margherita-large` reach the shipped
  `Margherita`, with a built-in break-probe that strips the claim and a
  pre-flight that refuses to run if the claim is gone. Also green:
  `addon_check` 174, `boot_check` 38, `focus_check` 50, `test_validate` 279,
  `node --test` 1892.

  **Skipped, and why (each is a mechanical group the tool lists that could not
  be merged without losing or inventing something).**
  - **McDonald's fries** (3): `price: null` on all three and the rows carry
    different photographs. A `dishPrice` is never null (ADR 0130 §2), and a
    merge would drop two images.
  - **KK Malaysian satay** (2): both rows carry `prices.delivery`, which ADR
    0130 §4 refuses beside a ladder (the validator errors). Open for the owner.
  - **Regal stir-fried with seasonal vegetables** (2): the `tagNotes` differ
    ("Seafood" is an unnamed mix, "Squid" is not), and a merged dish has one
    note per tag.
  - **RS Satay tom yum noodles soup** (2): `tagNotes` differ (one row has
    none, the other explains `contains-shellfish`). **RS Satay rendang** (2): the
    order `code` differs (R11 / R12), and `code` is rendered on the row.
  - **The Catch Mains teriyaki** (3): `tagNotes` differ (Tofu is the soy
    source on one row) and Teriyaki Salmon is in the same family but outside
    the group.
  - **Takeaway @ Churton** (3: steamed rice, bacon & avo, toasted sandwich
    filling): part 2, all 57 history joins live there.
  Groups that need the enumerator to learn something are left for 28p:
  Regal's Venison with Ginger & Spring Onion ($58) and Groundup's 6oz cup are
  rungs the tool did not group, so each stays its own dish beside the merged
  one.

  🎯 **For the owner (not decided here).** The search index does not read an
  option's name (ADR 0130 §5 left it open), so typing "lamb" no longer finds
  the lamb row of a merged protein ladder (Varuval, the Meat & ... kebabs,
  Gyrus) or "chicken" the chicken Nasi Lemak; sizes are unaffected in practice.
  🔎 The Donburi teriyaki sesame question (Mains carries `contains-sesame`,
  Donburi does not) stays open; the `validate.py` warning about it went quiet
  only because the Donburi row's name changed.
