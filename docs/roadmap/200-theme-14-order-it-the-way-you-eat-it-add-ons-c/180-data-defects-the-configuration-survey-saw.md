- [ ] **Data defects the configuration survey saw in passing** `[S][data]` —
  found by `200/100`'s survey and listed in full in
  [its review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)
  § *Defects seen in passing*.
  🛑 **None is verified against the source menu.** Each is a reader's
  observation of our record, and a correction overwrites while a venue's
  change appends (CLAUDE.md, *Refreshing a menu*). So open the intake for
  each one before touching it.

  Contents:
  - four prices that look mistyped: Noodle Canteen Sambal chicken $13.50
    and Wonton noodle soup $20.30, The Catch tempura udon, Abrakebabra's
    veggie burger large;
  - two descriptions that describe another dish (Satay Kingdom);
  - one thing at two prices: Sprig & Fern Tawa GF toast +$2 vs $6, and
    Gold Lining bacon $7 vs $8;
  - four add-on groups attached more widely than their dishes support
    (Wellington Kebab Grill `extras` and `sauces`, Abrakebabra `combo`,
    Dirty Little Secret `upgrades`);
  - The Victoria's Rosé section, whose three entries are all Pinot Noir;
  - RS Satay's three Seafood online prices.

  ✅ **Already refuted, so not in this list:** the three `required` groups a
  reader flagged as unsupported (Noodle Canteen `heat`, BurgerFuel
  `choppers-sauce`, The Borough `schnitty-side`). Their wording was moved
  into the group at `f56eda63`.

  📌 **Worked 2026-10-16 (faves-11 worker): every defect opened against its
  evidence; no data changed, seven rows remain for the owner.** 🛑 Method
  rule applied: a venue's *live* page today is not admissible, because it
  shows what the venue says now (a change appends; only our own error
  overwrites) and the owner directed no fetch. Admissible: the intake photos
  (`intake/menus/`, primary checkout), `data/intake/menu-sources.json`, and
  the record's git history. Corrections made: **0**. Prices changed: **0**.

  | Defect | Evidence read | Verdict | What changed |
  |---|---|---|---|
  | Noodle Canteen Sambal chicken $13.50 | `intake/menus/Noodle Canteen/IMG_9783.jpeg`, `IMG_9784.jpeg` | matches evidence: #12 prints $13.50, in a larger-type price tag than its $19.00 neighbours | nothing |
  | Noodle Canteen Wonton noodle soup $20.30 | `…/Noodle Canteen/IMG_9786.jpeg` | matches evidence: "Additional Menu" #35 prints $20.30 (column reads 19.50, 21.00, 20.30, 19.00) | nothing |
  | Gold Lining bacon $7 vs $8 | `intake/menus/Gold Lining Cafe/IMG_9740.jpeg` | matches evidence: the omelette prints "Add Bacon + $7"; the Add Ons block prints "Halloumi \| Bacon \| Grilled Chicken + $8". The menu contradicts itself | nothing |
  | RS Satay three Seafood online prices | in-store card `IMG_9833/9834.jpeg` (counter prices correct); online price from the record's git history (`c6558af0^`) | matches the original reading: the online reading held ONE row each, "Tom Yum Noodles Soup (Chicken or Seafood)" 33.8, "Mee Goreng (Chicken, Beef or Seafood)" 35.5, "Fried Rice (Chicken, Beef or Seafood)" 35.5. `c6558af0` split them by protein for the counter card and carried the one online price to both halves. The venue's online channel never priced them apart | nothing |
  | Wellington Kebab Grill `extras`, `sauces` too wide | `intake/menus/Wellington Kebab Grill/IMG_9776–9778.jpeg` (boards), `IMG_9781.jpeg` (the Extras & Sauces card) | 🎯 owner. The boards name "sauce" on Kebabs, Mixed kebabs, Shawarmama box, Greek pita, Turkish pita and Meat on chips, and name none on Iskender or Salad. The card is generic ("Choose up to 3 sauces", extras list) and says which dishes it applies to nowhere. So the menu is silent, which 200/010 says is an owner call. Also printed: "Combo $6" on Kebabs, Mixed kebabs, Iskender and Salad, as the record has it | nothing |
  | The Catch Normal Tempura Udon $25.30 | none stored. Source was the venue's own ordering page (`76675ec1`); no snapshot, not in `menu-sources.json` | 🎯 owner: cannot be settled from admissible evidence. The record has said $25.30 since its first transcription | nothing |
  | Satay Kingdom "Chicken Nasi Lemak" (beef rendang), "Black Pepper" (tom yam) | none stored; same ordering-page source (`76675ec1`) | 🎯 owner: cannot be settled. Circumstantial only: the descriptions carry the venue's own typos ("satyle tom yam") that a transcriber would not invent, which points to verbatim copy, not our error | nothing |
  | Abrakebabra Vegetarian Burger large +$0.50; `combo` on Nachos, Shish, Turkish Pizza | none stored; source was the venue's own site (`bf118cc9`) | 🎯 owner: cannot be settled. That commit says it dropped the site's separate VEGETARIAN list because it re-listed rows "at the same prices", which was never checked against a stored copy | nothing |
  | Dirty Little Secret `upgrades` offers "Beef patty" on the beef burger | none stored; source was the venue's PDF (`ade3542f`) | 🎯 owner: cannot be settled from a stored copy, and the question is a silence question in any case (200/010) | nothing |
  | The Victoria Rosé section, three Pinot Noir | none stored; source was the venue's drinks PDF (`2b5049ce`, whose message records Mt Difficulty "printed twice, $14 as a rosé and $18 as a red") | 🎯 owner: cannot be settled from a stored copy; the transcriber's own note says the heading was as printed | nothing |
  | Sprig & Fern Tawa GF toast +$2 vs $6 | none: the record has `verified: null` and no recorded source | 🎯 owner: cannot be settled. Both could be true (a bread swap on Eggs on Toast against an extra slice as a side); nothing admissible says | nothing |

  🔎 **Seen on the live sites 2026-10-16, NOT used as a basis for anything**
  (it can only say what the venues say now): RS Satay's online page lists the
  three combined rows at $33.80 / $35.50 / $35.50; Satay Kingdom's page shows
  the same two descriptions word for word; The Catch's page shows Normal
  Tempura Udon at $25.30; Abrakebabra's menu page prints Vegetarian (V) burger
  13.50 / 14 in the main burger table and 12.50 / 14 in its separate
  VEGETARIAN list, and its home page says "upgrade any of our meal … into a
  combo for only $7.00"; Dirty Little Secret's current PDF prints one
  UPGRADES box under Burgers & Sandwiches with Beef patty +7 and does not
  restrict it; The Victoria's Oct 2024 drinks PDF prints all three wines under
  ROSÉ; Sprig & Fern Tawa's site now carries a different (Spring) menu, so it
  says nothing about the one read earlier.

  ⏳ **What is left, and why the item stays open:** the seven 🎯 rows above
  (Wellington Kebab Grill sauces/extras; five rows whose source was a web
  page nobody stored; and Sprig & Fern Tawa, which records no source). The
  way to close them is to have the owner direct a re-read of those venues, so
  the reading is a dated one that either confirms the record or appends a
  change. File that as the next step rather than guessing from today's pages.
