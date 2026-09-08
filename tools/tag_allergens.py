#!/usr/bin/env python3
"""Tag allergens the menu implies but doesn't spell out.

Owner ruling 2026-08-09 (ADR 0025, superseding 0024): where a menu-writer
hasn't bothered to state an allergen and we can be highly confident, INFER IT.
A dish containing satay contains peanuts, whether or not the menu says so.

THE ONE-WAY RULE. Inference may only ever add a `contains-*` tag. It must never
add `gf`, `df`, `v` or `vg`, and never remove a tag. Inferring presence is
fail-safe — the worst case is someone avoids a dish they could have eaten.
Inferring absence would be asserting safety from a guess, which is the failure
this whole feature exists to prevent. "No tag = not stated" still holds.

Three tiers, kept apart so the count is auditable (ADR 0025, extended by 0114):

  STATED   the menu names the allergen or an unambiguous form of it —
           "Prawn Cutlet", "…with Oyster Sauce", "Almond Croissant".
  DERIVED  the menu names a dish whose defining ingredient it doesn't print —
           satay (peanut), tempura (wheat + egg), a laksa (belacan).
  PHOTO    the dish's image `alt` says it (ADR 0114, owner-ruled 2026-09-09).
           BELOW both of the above and never merged with them, because an
           `alt` describes a PHOTOGRAPH: nobody promises the picture is of the
           dish as served, and a chain's caption is marketing prose. The TIER
           is the substance — the rules are the same rules. A PHOTO finding is
           tier PHOTO whichever rule fired, because the tier names the
           EVIDENCE and not the reasoning: "sesame seed bun" is a STATED rule
           reading a photo caption, and it is still only a photo caption.

  🛑 A PHOTO tag is REFUSED on a dish that does not already carry a
  `needs: allergens` caveat, and the refusal is printed, never silent. That
  gate is what gives the weaker tier a meaning A READER CAN SEE: the caveat
  renders on the dish row ("Allergen details unconfirmed. Ask the venue before
  ordering."), so no tag read off a photograph can land where the page claims
  a confirmed allergen picture. Without it the tier would be a distinction
  only this file knows about — ADR 0072's decorative guard, in the one place
  in the repo where being wrong hurts someone.

Four guards keep it honest:
  • EXCLUDE patterns per rule — "rice noodles" are not wheat, "peanut butter"
    is not dairy, a "doughnut" is not a tree nut.
  • CONTRADICTED_BY — a dish the data already calls gf/df/vegan is not
    silently overridden by an inference. Curation beats a pattern.
  • THE HEDGE (added 2026-09-07) — a venue writing an allergen word in order to
    say the allergen is ABSENT. "Gluten free toast" is not a gluten warning.
    See the HEDGE block below; it is the one over-warning that is not fail-safe.
  • Paid add-ons are not ingredients — "add prawns +$7" doesn't make a garden
    salad shellfish.

SECTION NOTES COUNT AS THE MENU (added 2026-08-17, item 37n). A qualifier
printed once above a run of dishes — "All burgers served with … on a sesame
bun" — is the menu naming an allergen for every dish under it, and reading only
`name`/`desc` missed all three of Thorndon's burgers. A note is read clause by
clause and each clause is sorted into one of three buckets, because most notes
are not ingredient statements at all:

  APPLIES   an unambiguous, section-wide statement about what you are served —
            "All burgers served with … on a sesame bun", "Our pizza bases
            contain dairy". Tagged onto every dish in the section.
  REVIEW    an *alternative* ("dairy free cheese available", "vegan aioli
            available on request") or a cross-contamination statement ("all our
            fried food is cooked in the same deep fryer"). Neither says what the
            dish as served contains, so neither may be tagged from — but both
            are printed for a human, because "dairy free cheese available" is
            strong evidence the default cheese is dairy and only a person can
            make that call.
  IGNORED   everything else — hours, prices, "12 and under".

WHAT THE EXIT CODE MEANS. A dry run always exits 0: reporting untagged dishes
is its whole job, so a non-zero there would fire forever and be ignored. An
`--apply` run exits **1** if any record it wanted to write could not be written.
That case used to exit 0 (see `patch_tags`), which is how six venues went
unswept behind a green run.

    python3 tools/tag_allergens.py               # report (default)
    python3 tools/tag_allergens.py --tier DERIVED  # just the inferences
    python3 tools/tag_allergens.py --tier PHOTO  # just what a caption says
    python3 tools/tag_allergens.py --apply       # write them
"""

import argparse
import json
import pathlib
import re

DATA = pathlib.Path("site/data/restaurants")

# An existing tag that makes an inference untrustworthy. Curated/venue-stated
# dietary facts outrank a pattern match: a dish marked gluten free is not given
# contains-gluten because its name happens to contain "bun". `gf-option` is
# deliberately absent — the default preparation still contains gluten.
CONTRADICTED_BY = {
    "contains-gluten": {"gf"},
    "contains-dairy": {"vg", "df"},
    "contains-egg": {"vg"},
    "contains-shellfish": {"v", "vg"},
    "contains-fish": {"v", "vg"},
    # Not allergens, and never applied by THIS tool — it tags dishes and these
    # two say what an add-on option is (ADR 0092, tools/tag_addon_options.py).
    # They are here because validate.py checks that this table and
    # `CONTRADICTS` in site/js/addons.js are the same food fact both ways
    # round, and because the guard they encode is true for any future dish rule
    # as well: a row the venue itself calls vegetarian is never given meat.
    "has-meat": {"v", "vg"},
    "has-fish": {"v", "vg"},
}

# --- compound tails (2026-09-09, roadmap 080/160) ---------------------------
# A few alternatives below are written `\w*token` instead of `token`. That is a
# COMPOUND TAIL: the word may carry anything in front of the token, but must
# still END at it. `\w*burgers?` sees "Cheeseburger"; `\bburgers?\b` never could.
#
# 🛑 IT IS THE LEADING BOUNDARY THAT IS OPENED, NEVER THE CLOSING ONE, AND ONLY
# ON THREE NAMED TOKENS. Both halves of that sentence were measured against the
# real corpus (57 records, 3,557 name/desc/ingredient/note/option strings) by
# `--compounds`, not reasoned about:
#
#   opening the CLOSING boundary would tag `eggplant`/`eggplants` (12 rows) with
#   egg, `Bundaberg` (4) with gluten from `bun`, `edamame` (7) with dairy from
#   `edam`, `pieces` (106) from `pie`, `toasted` (61) from `toast`, `tartare`
#   (17) from `tart` and `creamy` (64) from `cream`.
#
#   opening the LEADING boundary WHOLESALE would tag `kale` (11), `pale` (7),
#   `royale` (3), `cardinale` (2) and `vale` (1) with gluten from `ale`;
#   `buckwheat` (5) from `wheat` and `cornflour` (1) from `flour` — a false
#   gluten warning on the two things a coeliac is specifically hunting for,
#   which is ADR 0097's harm and not an ordinary over-warning; `kewpie` (5,
#   Japanese mayonnaise) from `pie`; `cheesecake` (15) from `cake`; and
#   `kielbasa`, `pinwheel`, `jellyfish` and `agedashi` with fish.
#
# So the tail is opt-in, per token, and the three are `burger`, `muffin` and
# `nugget` — each a food noun that only ever forms compounds by taking a
# prefix, each verified to have no non-food word ending in it anywhere in the
# corpus. A fourth is NOT added by editing this comment: run `--compounds`,
# read what the corpus actually holds, and put the near-miss in front of a
# person.
#
# 🛑 AND RUN THE DRY RUN BEFORE YOU BELIEVE A TAIL IS SAFE, because "no false
# positive" is not the only test. `katsu` was the fourth tail until the sweep
# was actually run: it reaches `tonkatsu`, all five of which are tonkatsu
# SAUCE, and it proposed three tags whose printed basis — "battered/crumbed
# coatings" — was false of the dish. A tail can be harmless to the word list
# and still make the tool lie about its reason.
#
# 🔑 WHY NOT A BARE LIST OF COMPOUND WORDS (`cheeseburger|hamburger|…`). That is
# strictly safer and it is what `cheeseburgers?` in the dairy rule does — but it
# is SILENT about the compound that lands after it was written, and silence is
# 13 BurgerFuel rows in the roadmap item went two months unnoticed. `--compounds`
# is the half that makes the remaining gap falsifiable; the tail is the half
# that closes the three the corpus can already prove are safe.
COMPOUND_TAILS = ("burger", "muffin", "nugget")

# (tag, tier, basis, pattern, exclude)
# `exclude` is checked against the same text; a hit vetoes the rule for that
# item. Every entry below is a claim about food that someone can check.
RULES = [
    # --- peanuts ------------------------------------------------------
    ("contains-peanuts", "STATED", "names peanut", r"\bpeanuts?\b", None),
    ("contains-peanuts", "DERIVED", "satay sauce is peanut sauce", r"\bsatays?\b", None),
    ("contains-peanuts", "DERIVED", "pad thai is finished with crushed peanuts", r"\bpad\s?thai\b", None),
    ("contains-peanuts", "DERIVED", "gado gado is dressed in peanut sauce", r"\bgado", None),
    ("contains-peanuts", "DERIVED", "massaman is a peanut curry", r"\bmassaman\b", None),
    ("contains-peanuts", "DERIVED", "kung pao is made with peanuts", r"\b(kung\s?pao|gong\s?bao)\b", None),

    # --- tree nuts ----------------------------------------------------
    # NEVER match a bare "nut": doughnut, butternut, nutmeg. Coconut is not a
    # tree nut for NZ allergen labelling and is deliberately not matched.
    #
    # WATER CHESTNUT IS NOT A CHESTNUT, and the lookbehind is why. Eleocharis
    # dulcis is an aquatic sedge tuber, botanically unrelated to Castanea and
    # safe for a tree-nut allergy — the same call this comment already makes
    # for coconut. It bit on 2026-09-07: a stir-fry and a side of greens both
    # naming "water chestnut" were flagged `contains-nuts`, which is a false
    # allergen warning on a vegan side dish.
    # 🛑 It is a LOOKBEHIND and not an `exclude` on purpose. `exclude` vetoes
    # the whole rule for the item, so "water chestnuts and toasted almonds"
    # would have lost the ALMONDS — an over-warning traded for a miss, which is
    # the one direction this tool must never move. The lookbehind neutralises
    # only the `chestnuts?` alternative and leaves every other nut matching.
    # Both spellings are covered because each lookbehind must be fixed-width.
    ("contains-nuts", "STATED", "names a tree nut",
     r"\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|"
     r"pine\s?nuts?|brazil\s?nuts?|(?<!water )(?<!water-)chestnuts?)\b", None),
    ("contains-nuts", "DERIVED", "pesto is made with pine nuts", r"\bpesto\b", None),
    ("contains-nuts", "DERIVED", "praline/marzipan/nougat are nut confections",
     r"\b(praline|marzipan|nougat|frangipane|baklava)\b", None),
    ("contains-nuts", "DERIVED", "Nutella is a hazelnut spread", r"\bnutella\b", None),

    # --- shellfish ----------------------------------------------------
    ("contains-shellfish", "STATED", "names a crustacean or mollusc",
     r"\b(prawns?|shrimps?|squid|calamari|scallops?|mussels?|oysters?|paua|crabs?|"
     r"kanikama|surimi|lobster|crayfish|clams?)\b", None),
    ("contains-shellfish", "DERIVED", "an unnamed seafood mix reliably includes prawn or squid", r"\bseafood\b", None),
    ("contains-shellfish", "DERIVED", "laksa paste contains belacan (dried shrimp)", r"\blaksa\b", None),
    ("contains-shellfish", "DERIVED", "XO sauce is made with dried scallop and shrimp", r"\bXO sauce\b", None),

    # --- fish ---------------------------------------------------------
    # Fish is a declarable allergen in NZ and this corpus warned about it ZERO
    # times until 2026-09-07 (owner-ruled 2026-08-16, Theme 5 item 010).
    #
    # 🛑 FISH AND SHELLFISH ARE TWO ALLERGENS, NOT ONE, and neither tag ever
    # implies the other. A finfish sensitivity and a crustacean/mollusc
    # sensitivity are different sensitivities: Subway's Tuna Mayo is
    # `contains-fish` and NOT `contains-shellfish`; a prawn cutlet is the
    # reverse. `\bseafood\b` therefore stays a shellfish-only derivation — the
    # frozen "seafood mix" a kitchen here buys is squid, prawn and mussel far
    # more often than it is fish, so deriving fish from it would be a guess
    # dressed as a rule.
    #
    # `fish\w*` is open at the END (fishcake, fishballs, fisherman's) and closed
    # at the START by `\b`. That leading boundary is the ONLY thing keeping this
    # rule out of "shellfish", which is why test_tag_allergens.py reintroduces
    # its removal as a breaker rather than trusting a reading of it.
    #
    # Deliberately NOT matched: `sole` and `ray` are ordinary English words in
    # far commoner senses ("the sole reason", "a ray of"), and `bass` is an
    # instrument unless the menu says sea bass. Coconut/water-chestnut logic: an
    # inference should under-reach, not mis-fire. `has-fish` (ADR 0092) is a
    # DIETARY marker on an add-on option and a different axis entirely — it is
    # not this tag, and neither is written in terms of the other.
    #
    # MUSTARD SEED CAVIAR IS NOT CAVIAR, and — like water chestnut above — the
    # narrowing is a LOOKBEHIND and not an `exclude`. Found by dry run against
    # the corpus on 2026-09-07: Charley Noble's venison loin is garnished with
    # "mustard seed caviar", a plating word for anything small and round, and it
    # was the only false positive in 200. An `exclude` would veto the whole rule
    # for that item, so a dish reading "mustard seed caviar and smoked salmon"
    # would lose the SALMON — an over-warning traded for a miss, the one
    # direction this tool may not move. Real fish roe (Oscietra Caviar, two rows
    # away) still matches. The metaphor is wider than this one phrase — balsamic
    # "caviar" is the other common one — so if a second turns up, add a second
    # fixed-width lookbehind rather than reaching for `exclude`.
    ("contains-fish", "STATED", "names fish, or a fish by species",
     r"\b(fish\w*|salmon|tuna|snapper|t[ae]rakihi|hoki|kahawai|kingfish|gurnard|"
     r"cod|monkfish|mackerel|sardines?|pilchards?|herrings?|anchov(?:y|ies)|"
     r"trout|barramundi|john\s?dory|marlin|swordfish|eels?|unagi|whitebait|"
     r"flounder|halibut|haddock|basa|tilapia|mahi\s?mahi|bream|sea\s?bass|"
     r"trevally|warehou|groper|h[āa]puku|bonito|katsuobushi|kippers?|"
     r"(?<!seed )caviar|tobiko|ikura|masago)\b", None),
    # The one people miss, and the reason the owner named it when he ruled:
    # Worcestershire sauce is anchovy by construction, and it turns up in a
    # Bloody Mary, a marinade and a burger sauce with nothing else fishy in
    # sight.
    ("contains-fish", "DERIVED", "Worcestershire sauce is made with anchovy",
     r"\b(worcestershire|worcester\s?sauce)\b", None),
    ("contains-fish", "DERIVED", "dashi is a bonito stock", r"\bdashi\b", None),
    ("contains-fish", "DERIVED", "surimi is a minced white-fish paste",
     r"\b(surimi|kanikama)\b", None),
    ("contains-fish", "DERIVED", "sashimi is raw fish", r"\bsashimi\b", None),
    ("contains-fish", "DERIVED", "nam pla and nuoc mam are fish sauce",
     r"\b(nam\s?pla|nuoc\s?mam)\b", None),
    ("contains-fish", "DERIVED", "ceviche is raw fish cured in citrus", r"\bceviche\b", None),

    # --- gluten -------------------------------------------------------
    # `baguette`, `hoagie`, `sourdough` and `crouton` are here for the same
    # reason `bread` is: each names a wheat loaf outright, and a reader who has
    # to know that a hoagie is a bread roll is the reader the warning is for.
    # Added 2026-09-08 (roadmap 110/050) — `bread` was already catching "Turkish
    # bread" at the same venue, so this was never a missing category, only a
    # missing vocabulary inside one.
    ("contains-gluten", "STATED", "names a wheat product",
     r"\b(bread|breaded|flour|wheat|barley|rye|semolina|couscous|pastr(?:y|ies)|pasta|"
     r"spaghetti|lasagne|lasagna|ravioli|fettuccine|penne|croissant|bagel|pita|"
     r"naan|rotis?|paratha|chapati|brioche|crumpet|pretzel|filo|panko|breadcrumb|"
     r"baguette|hoagie|sourdough|crouton)\b", None),
    # A nugget on a NZ menu is crumbed — chicken, corn or otherwise. It sits in
    # the coating rule rather than the bakery one because that is what makes it
    # wheat: the coating, not the thing inside it.
    # `\w*nugget` is a COMPOUND TAIL — see the block above RULES. "McNuggets"
    # (3 rows) is the corpus's own word for a crumbed chicken piece and the
    # leading `\b` could not see it.
    #
    # 🛑 `katsu` IS NOT A TAIL, AND THE DRY RUN IS WHY. `\w*katsu` reaches
    # `tonkatsu`, and every one of the corpus's five is **tonkatsu SAUCE** — a
    # thick brown condiment, not a panko cutlet. It proposed the tag on
    # Takoyaki, Yakisoba and a Potato croquette under the basis "battered/
    # crumbed coatings are wheat flour", which is not true of any of them. The
    # tag might be right for another reason (the sauce is usually built on soy
    # sauce); a rule whose printed basis is false is a claim stronger than its
    # evidence either way, and this file's whole promise is that the basis is
    # checkable. `\bkatsu\b` still catches "Ebi katsu", which is the cutlet.
    ("contains-gluten", "DERIVED", "battered/crumbed coatings are wheat flour",
     r"\b(battered|crumbed|schnitzel|katsu|tempura|\w*nugget)\b", None),
    ("contains-gluten", "DERIVED", "a wheat-flour wrapper",
     # `tortillas?` added 2026-08-16 with the cheddar gap. Corn tortillas are
     # real and are the excluded case below — but a burrito or a wrap on a NZ
     # menu is wheat unless it says otherwise, and this rule may only ADD a
     # contains- tag (ADR 0025), so over-reaching here is the safe direction.
     r"\b(dumplings?|wontons?|gyoza|samosas?|spring\s?rolls?|dim\s?sims?|pork\s?buns?|"
     r"tortillas?|burritos?|quesadillas?)\b",
     r"\b(rice\s?paper|corn\s?tortillas?)\b"),
    # "pie spice" is a spice blend, and a fish/crab/rice cake is not a bakery
    # cake — both found by dry-run against the real corpus.
    # `sando` is a sandwich named the way a menu names it now, and nothing else
    # in English spells it. It sits beside `sandwich` because it IS one.
    # `\w*burgers?` and `\w*muffins?` are COMPOUND TAILS — see the block above
    # RULES. "Cheeseburger" (13 rows), "Hamburger" and "Schnitzburger" are
    # burgers in a bun, and "McMuffin" (5) is an English muffin; the leading
    # `\b` could see none of them. `buns?` is deliberately NOT a tail: the
    # corpus's own word ending in "bun" is `Bundaberg`.
    #
    # A LETTUCE BUN IS A LETTUCE LEAF, and — exactly like water chestnut and
    # mustard seed caviar above — the narrowing is a LOOKBEHIND and never an
    # `exclude`. BurgerFuel's `Low Carborator lettuce bun` is the burger
    # wrapped in lettuce *instead of* bread and it shipped `contains-gluten`
    # from 2026-08-09 until 2026-09-09 (roadmap 080/210) — ADR 0097's harm,
    # not an ordinary over-warning: a false gluten warning on the row a
    # coeliac is hunting for. `exclude` would veto the whole rule for the
    # item, and the corpus proves what that costs: four OTHER rows say
    # "milk bun, fries … or lettuce bun available", so an item-level veto
    # would lose the MILK BUN — an over-warning traded for a miss, the one
    # direction this tool may not move. The lookbehind cancels the `buns?`
    # alternative at "lettuce bun" only; `finditer` walks on and finds the
    # milk bun two clauses earlier. Both spellings, because each lookbehind
    # must be fixed-width. Measured 2026-09-09: "lettuce bun" ×5 across 5
    # venues, "milk bun" ×16 across 6.
    ("contains-gluten", "DERIVED", "a wheat bakery item",
     r"\b((?<!lettuce )(?<!lettuce-)buns?|\w*burgers?|sandwich|sando|toast|toastie|pies?|cakes?|biscuits?|cookies?|"
     r"brownies?|\w*muffins?|scones?|doughnuts?|donuts?|pizzas?|pancakes?|waffles?|"
     r"crackers?|tarts?|slices?|danish|éclair|eclair)\b",
     r"\b(pie\s?spice|(fish|crab|rice)\s?cakes?)\b"),
    ("contains-gluten", "DERIVED", "a wheat noodle",
     r"\b(udon|ramen|egg\s?noodles?|chow\s?mein|lo\s?mein|hokkien|mee\s?goreng|"
     r"bami\s?goreng|chow\s?fun)\b", None),
    # TWO RULES, ONE FACT, TWO ALLERGENS — the shape ADR 0095 argued for on the
    # add-on fish pair. A Yorkshire pudding is flour, milk and egg baked in
    # dripping; the gluten and the egg are independent claims about it, and the
    # egg twin lives in the egg block below. Neither reads the other's tag, so
    # deleting one leaves the other standing rather than silently taking it too.
    # A bare `pudding` is deliberately NOT matched — a rice pudding is not wheat.
    ("contains-gluten", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",
     r"\byorkshire\s?pudding\b", None),
    ("contains-gluten", "DERIVED", "soy sauce is brewed with wheat",
     r"\b(soy\s?sauce|soya\s?sauce|teriyaki|hoisin)\b", None),
    # Ginger beer and root beer are soft drinks, not brewed from barley — the
    # word "beer" in a drinks list is not evidence of gluten. Found by the
    # Thai Tara refresh (2026-08-15), whose drinks list carries both.
    # Style abbreviations carry no "beer"/"ale" to match on — a tap list is
    # mostly "Interstellar IPA", "Adapt APA" — so they are named directly.
    # Added with the Southern Cross and Borough tap lists (2026-08-15).
    ("contains-gluten", "DERIVED", "beer is a barley product",
     r"\b(beer|lager|ale|stout|pilsner|porter|ipa|apa)\b",
     # "ginger ale" is a soft drink, and now has to be excluded by name for the
     # same reason ginger beer already was — widening the rule to catch styled
     # taps made "ale" reachable from every Schweppes line on a drinks list.
     r"\b(ginger|root|sarsaparilla)\s?(beer|ale)\b"),

    # --- dairy --------------------------------------------------------
    # "butter" must not fire on peanut/nut butter; "cream" must not fire on
    # coconut cream, which is the base of most laksa and Thai curry here.
    # "creamy" is deliberately NOT matched. In the cuisines on this list it
    # means coconut cream at least as often as dairy — it was tagging every
    # Malaysian laksa and curry. Losing a few real hits ("Creamy Mushrooms") is
    # the right trade: an inference should under-reach, not mis-fire.
    # `cheeseburgers?` is spelled out rather than reached by opening `cheese`'s
    # closing boundary. `cheese\w*` would also spell "cheeseless", and a false
    # dairy warning on the row a dairy-avoider is hunting for is ADR 0097's
    # harm, not an ordinary over-warning. One compound, one word, no mechanism.
    ("contains-dairy", "STATED", "names a dairy product",
     r"\b(cheese|cheesy|cheeseburgers?|butter|buttermilk|creams?|milks?|milkshakes?|yoghurt|yogurt|"
     r"mozzarella|parmesan|feta|halloumi|paneer|camembert|brie|mascarpone|ricotta|ghee|"
     # Named cheeses that never say "cheese". Found 2026-08-16 by a sibling
     # session: the rule matched "Cheeseburger" but not a bare "Cheddar", and
     # `validate.py`'s twin check was already flagging the gap in the corpus —
     # one Cheeseburger carried contains-dairy and its same-named twin did not.
     # A cheese the menu names by variety is exactly as stated as one it calls
     # cheese.
     r"cheddar|gruy[eè]re|edam|colby|havarti|provolone|gouda|emmental|pecorino|"
     r"gorgonzola|stilton|roquefort|blue\s?cheese|creme\s?fra[iî]che|cr[eè]me\s?fra[iî]che)\b",
     # Plant "yoghurt" is as common on a brunch menu as plant milk, and the
     # bare word is what the dairy rule matches — Southern Cross's House
     # Granola is served with coconut yoghurt and is not a dairy dish.
     NON_DAIRY := r"\b(peanut|nut|almond|cashew|coconut|soya?|oat|rice)\s?"
     r"(butter|milk|cream|yoghurt|yogurt)\b"),
    ("contains-dairy", "DERIVED", "an espresso milk drink",
     r"\b(latte|cappuccino|mocha|flat\s?white|macchiato)\b", NON_DAIRY),
    # Tzatziki is yoghurt, cucumber and garlic — the yoghurt is the dish, and
    # the word "yoghurt" never appears beside it on a menu. 23 rows of one
    # kebab shop carry it. No `exclude`: a vegan tzatziki is real but rare, and
    # a venue that makes one says so with `vg`/`df`, which CONTRADICTED_BY
    # already outranks this rule with.
    ("contains-dairy", "DERIVED", "tzatziki is a yoghurt dip", r"\btzatziki\b", None),
    ("contains-dairy", "DERIVED", "the sauce is cream- or butter-based",
     r"\b(alfredo|carbonara|butter\s?chicken|korma|tikka\s?masala|ganache|"
     r"cheesecake|tiramisu|panna\s?cotta)\b", None),

    # --- egg ----------------------------------------------------------
    # \begg\b never matches "eggplant".
    ("contains-egg", "STATED", "names egg", r"\beggs?\b", None),
    ("contains-egg", "DERIVED", "an egg emulsion",
     # "tartare sauce" is mayonnaise with capers and gherkin — an egg emulsion
     # by construction, and on a fish-and-chips menu it is everywhere. Added
     # 2026-08-16 alongside the cheddar gap.
     r"\b(mayonnaise|mayo|aioli|hollandaise|meringue|custard|pavlova|"
     r"tartare\s?sauce|tartar\s?sauce)\b", None),
    ("contains-egg", "DERIVED", "egg is in the batter or base",
     r"\b(omelettes?|frittata|quiche|carbonara|tempura|tiramisu)\b", None),
    # The egg half of the Yorkshire pudding pair; see the gluten twin above.
    ("contains-egg", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",
     r"\byorkshire\s?pudding\b", None),

    # --- soy ----------------------------------------------------------
    ("contains-soy", "STATED", "names soy",
     r"\b(soy|soya|tofu|edamame|miso|tempeh)\b", None),
    ("contains-soy", "DERIVED", "the sauce is soy-based",
     r"\b(teriyaki|hoisin|oyster\s?sauce|black\s?bean\s?sauce|satays?)\b", None),

    # --- sesame -------------------------------------------------------
    ("contains-sesame", "STATED", "names sesame", r"\b(sesame|tahini)\b", None),
    ("contains-sesame", "DERIVED", "hummus is made with tahini", r"\b(hummus|houmous|halva)\b", None),
]

# --- plurals, fixed once for every rule (2026-09-08, roadmap 110/050) -------
# Every rule above is `\b(alternatives)\b`, and until 2026-09-08 the ONLY way an
# alternative matched its own plural was a hand-written `s?` on that one word.
# Miss it and the shared trailing `\b` refuses the plural outright: `toastie`
# tagged "Corn Cheese Toastie" and could not see "Cheesy toasties", and
# `sandwich` could not see "sandwiches". Measured, not reasoned: 5 words the
# corpus already uses in the plural were unreachable, across 4 rules.
#
# Adding `s?` to each of ~250 alternatives is 250 chances to miss one and
# nothing that would report it, so the plural is applied ONCE, to the rule's
# closing boundary, by the compiler below.
#
# 🛑 WHY NOT THE OBVIOUS `(?:e?s)?`. A bare `e?s` also spells `cod` + `es` =
# "codes", which is a false FISH warning built out of a word that has nothing to
# do with food. English only takes `-es` after a sibilant, so that is all this
# allows — and the two lookbehinds are fixed-width, which `re` requires. It
# keeps "sandwiches", "danishes" and "hummuses"; it refuses "codes", "tartes"
# and "pitaes".
#
# `-y → -ies` cannot be done by a suffix at all (the `y` has to go), so the two
# words that need it spell it out in the rule: `anchov(?:y|ies)` and
# `pastr(?:y|ies)`.
PLURAL = r"(?:s|(?<=[sxz])es|(?<=[cs]h)es)?"

# A rule whose pattern deliberately does NOT close with `\b` — it is already
# open at the end, so a plural needs nothing added. Listed rather than inferred
# so a NEW rule that forgets its closing boundary is a test failure and not a
# silent opt-out (test_tag_allergens.py, "every rule tolerates a plural").
OPEN_ENDED = {r"\bgado"}


def compile_rule(pat):
    """Compile a rule pattern so its closing word boundary tolerates a plural.

    Applied to a rule's `exclude` as well as its pattern, and that is not
    symmetry for its own sake: widening only the pattern turns "coconut
    yoghurts" into a dairy warning and "ginger beers" into a gluten one,
    because the guard that vetoes the singular can no longer see the plural.
    """
    if not pat.endswith(r"\b"):
        return re.compile(pat, re.I)
    return re.compile(pat[:-2] + PLURAL + r"\b", re.I)


COMPILED = [
    (tag, tier, why, compile_rule(pat), compile_rule(exc) if exc else None)
    for tag, tier, why, pat, exc in RULES
]

# --- the hedge -------------------------------------------------------------
# A HEDGE is a venue writing an allergen word in order to say the allergen is
# ABSENT: "Gluten free toast", "No added gluten". Nothing above reads it — the
# rules match a wheat noun ("toast", "bun", "bread") and the negation sits in
# front of it, unlooked at. Measured, not hypothesised: this tool proposed
# `contains-gluten` on a dish literally named `Gluten free toast` during the
# Simmer intake (roadmap 080/200), and on the Brownie and the Spiced ginger love
# muffin whose descriptions read "No added gluten."
#
# 🛑 WHY THIS IS WORSE THAN AN ORDINARY FALSE POSITIVE. Everywhere else an
# over-warning is annoying and safe — the water-chestnut case warned a vegan
# side about nuts and nobody was harmed. A hedge tag puts a FALSE GLUTEN WARNING
# ON THE ONE ITEM A COELIAC IS HUNTING FOR, and the way a reader "fixes" that
# experience is by learning to distrust the gluten chips. The over-warning
# trains away the warning, so ADR 0025's "inference may only ever ADD" stops
# being fail-safe here.
#
# THE FORMS BELOW WERE SWEPT OUT OF THE CORPUS, NOT GUESSED (2026-09-07, 57
# records, every name/desc/ingredient/section note/option name):
#     "gluten free" ×76 · "no gluten added" ×23 · "gluten-free" ×15 ·
#     "dairy free" ×10 · "no added gluten" ×9 · "dairy-free" ×8
# and NOTHING else of this shape exists — no "wheat free", "nut free",
# "egg free", "soy free", "sesame free", "without gluten", "free of dairy",
# "non-dairy", "lactose free", "gluten-less" or "low gluten" anywhere. Adding an
# entry here is cheap; inventing one that no venue writes is how a guard starts
# looking thorough while covering nothing.
#
# 🛑 THAT PARAGRAPH WAS WRONG WHEN IT WAS WRITTEN, AND A SHIPPED ROW PAID FOR IT
# (2026-09-09, roadmap 080/210). "gluten friendly" existed in the corpus on
# 2026-09-07 and the sweep above did not look for it, so BurgerFuel's
# `Gluten friendly bun` carried `contains-gluten` beside its own `gf-option` —
# the row contradicting itself, on exactly the item a coeliac is hunting for.
# The claim "nothing else of that shape exists" is only ever as good as the
# shapes the sweep enumerated, and a sweep that enumerates `free` finds `free`.
#
# RE-SWEPT 2026-09-09 over all 57 records / 5,803 strings (name, desc,
# ingredients, section notes, add-on option names) for a much wider set of
# softeners — `X free`, `X friendly`, `X conscious`, `X smart/wise/aware/safe/
# sensitive`, `no/without/zero X`, `no X added`, `low X`, `X-less`, `non-X`,
# `reduced/less X` — against every declarable allergen word:
#     "gluten free" ×74 · "no gluten added" ×21 · "gluten-free" ×15 ·
#     "dairy free" ×10 · "dairy-free" ×8 · "no added gluten" ×7 ·
#     "gluten friendly" ×2
# and nothing else. ONLY `friendly` is new, only on gluten, and both of its
# occurrences are the one BurgerFuel row (its name and its description).
# `dairy friendly` is deliberately NOT added: no venue writes it, and this
# comment's own history is what a guard covering an invented form looks like.
# "vegan friendly" ×4 is a different shape — `vegan` is not an allergen word
# and those clauses are offers ("Speak to staff to make it vegan friendly").
HEDGE = {
    "contains-gluten": r"(?:gluten[\s-](?:free|friendly)|no\s+(?:added\s+gluten|gluten\s+added))",
    "contains-dairy": r"dairy[\s-]free",
}

# 🛑 TWO MECHANISMS, AND THE SECOND IS NOT THE FIRST WIDENED. The obvious fix —
# "skip any dish mentioning gluten free" — is an ITEM-LEVEL VETO, and this repo
# has already paid for that shape once (the water chestnut, above): it trades an
# over-warning for a MISS, and a miss is the direction this tool may never move.
# "Beer battered fish, gluten free chips" is a real sentence shape, and an
# item-level veto loses the BATTER. So:
#
#   1. `hedge_before` — the negation DIRECTLY precedes the matched word. It
#      cancels that ONE match and nothing else, exactly as `(?<!water )` cancels
#      one alternative of the tree-nut rule. "Gluten free toast" loses the tag;
#      "gluten free chips" beside a battered fish does not save the fish.
#   2. `declared_free` — a description clause that is NOTHING BUT the venue's
#      own free-from claim ("No added gluten.") is the venue speaking about the
#      whole dish, which is what `gf` in CONTRADICTED_BY already outranks a
#      pattern for. It is per-allergen, so a brownie declaring "No added gluten"
#      still gains `contains-nuts` if it names almonds.
#      The full-clause anchor is the whole safety argument: "sourdough toast,
#      gluten free option available" is NOT a bare declaration, so the toast
#      keeps its warning.
#
# Written as a lookbehind-in-spirit helper rather than `(?<!gluten free )`
# spliced into each pattern because the negation has to cancel EVERY gluten
# alternative across seven rules, not one alternative of one rule. Seven
# hand-edited patterns would be seven chances to miss one, and nothing would
# report it.
_HEDGE_BEFORE = {
    tag: re.compile(rf"\b{pat}\b[\s\-]*$", re.I) for tag, pat in HEDGE.items()
}
_HEDGE_ONLY = {
    tag: re.compile(rf"\s*{pat}\s*", re.I) for tag, pat in HEDGE.items()
}


def hedge_before(tag, text, start):
    """True when a free-from claim for `tag` sits DIRECTLY before `text[start:]`.

    The narrow half of the hedge guard: it cancels the single match that the
    negation qualifies and leaves every other match in the same text alone.
    """
    pattern = _HEDGE_BEFORE.get(tag)
    return bool(pattern and pattern.search(text[:start]))


def first_unhedged(tag, pattern, text):
    """The first match of `pattern` in `text` that a hedge does NOT cancel.

    🛑 `finditer`, never `search`. `search` returns the first match and stops, so
    a hedged FIRST occurrence would take the whole rule down with it: "gluten
    free bread and a side of pasta" would lose the PASTA. That is an
    over-warning traded for a miss — the one direction this tool may not move,
    and the exact failure an item-level `exclude` would have shipped. Walking
    every occurrence is what keeps the cancellation as narrow as the lookbehind
    it is named for.
    """
    for match in pattern.finditer(text):
        if not hedge_before(tag, text, match.start()):
            return match
    return None


def declared_free(text):
    """Tags whose allergen `text` declares ABSENT in a clause that says nothing else.

    The venue's own printed claim about the dish — "No added gluten." — read the
    way a `gf` tag is read. Anchored to the WHOLE clause on purpose: a clause
    that also offers, qualifies or describes ("gluten free option available",
    "served with gluten free crackers") is not a claim about this dish and must
    not silence its warning.
    """
    out = set()
    for clause in re.split(r"[.;]", text or ""):
        for tag, pattern in _HEDGE_ONLY.items():
            if pattern.fullmatch(clause):
                out.add(tag)
    return out


# A paid optional extra — "Add chicken, halloumi, prawns or beef +$7". The dish
# as served contains none of it. Both signals required (an "add" AND a "+$"),
# so a description that merely says "added" still counts as an ingredient.
ADD_ON = re.compile(r"\badd(?:s|ed|ing)?\b", re.I)
ADD_ON_PRICE = re.compile(r"\+\s*\$")

# --- section notes ---------------------------------------------------------
# The three tests below are applied to each clause of a `section.note`, in this
# order, and the order is the whole safety argument. Every pattern was written
# against the sixteen notes actually in the corpus, not imagined.

# 1. A statement about the kitchen, not about the food. "All our fried food is
#    cooked in the same deep fryer" is a warning a coeliac needs to read, but it
#    is not an ingredient — tagging from it would put contains-gluten on a bowl
#    of chips because the fryer next to it battered a fish. Reported, never
#    tagged. Checked FIRST because these clauses are often phrased universally
#    ("all our…") and would otherwise sail through test 3.
CROSS_CONTACT = re.compile(
    r"\b(cooked|fried|prepared|made)\s+(in|on)\s+the\s+same\b|\bsame\s+(deep\s+)?"
    r"(fryer|oil|grill|kitchen|equipment|surface)\b|\btraces?\s+of\b|"
    r"\bcross[- ]contamination\b|\bcannot\s+guarantee\b|\bshared\s+(fryer|kitchen|equipment)\b",
    re.I,
)

# 2. An alternative you can ask for, not what arrives by default. This is the
#    trap the whole feature turns on: "Gluten free bases available", "dairy free
#    cheese available", "Vegan cheese also available — just ask" all contain the
#    allergen word, and a substring match reads every one of them backwards. The
#    honest reading is the opposite one — that an alternative is offered implies
#    the default has the allergen — but "implies" is not ADR 0025's "high
#    confidence", and the dish it attaches to is unknowable from the note (an
#    aioli clause under a Sharing heading says nothing about the chips). So:
#    reported for a human, never tagged.
AVAILABILITY = re.compile(
    r"\bavailable\b|\bon\s+request\b|\bjust\s+ask\b|\bask\s+(us|your|the|for)\b|"
    r"\bswap\b|\binstead\s+of\b|\bupgrade\b|\boptional\b|\bon\s+the\s+side\s+if\b|"
    r"\bif\s+you\s+(want|prefer|like|ask)\b|\bcan\s+be\s+made\b|\bwe\s+can\s+make\b",
    re.I,
)

# 3. Does the clause speak for the whole section? A note only reaches a dish if
#    it claims to cover every dish under the heading. "All burgers served with
#    …", "Our pizza bases contain dairy", "each comes with…" do; "Try the
#    aioli" does not, and neither does a price or an opening time.
UNIVERSAL = re.compile(r"\b(all|every|each|our)\b|\b(served|comes?|come)\s+with\b", re.I)

# A venue stating an allergen in its own words. Only read inside a note, and
# only in a clause that also says "contain" — the corpus-wide rules deliberately
# don't match a bare "dairy"/"gluten", because in a dish description those words
# appear far more often inside "dairy free" than inside "contains dairy".
NOTE_DECLARES = re.compile(r"\bcontains?\b", re.I)
NOTE_ALLERGENS = [
    ("contains-dairy", r"\bdairy\b"),
    ("contains-gluten", r"\b(gluten|wheat)\b"),
    ("contains-nuts", r"\b(tree\s?nuts?|nuts?)\b"),
    ("contains-peanuts", r"\bpeanuts?\b"),
    ("contains-egg", r"\beggs?\b"),
    ("contains-soy", r"\b(soy|soya)\b"),
    ("contains-sesame", r"\bsesame\b"),
    ("contains-shellfish", r"\b(shellfish|crustaceans?|molluscs?)\b"),
    # `\bfish\b` and not `\bfish\w*`, because a note is prose: "contains
    # shellfish" must not read as fish, and the leading boundary is what stops
    # it. The species list is not repeated here — a venue writing its own
    # allergen line writes "fish", not "kahawai".
    ("contains-fish", r"\bfish\b"),
]
# "gluten free" is the negation of the word beside it, and must never be read as
# a declaration. Belt and braces: AVAILABILITY catches nearly every real
# instance first, but a note could say "our bases are gluten free" with no offer
# in it at all.
NOTE_FREE = re.compile(r"[- ]?free\b", re.I)


def section_clauses(note):
    """Yield (clause, verdict) for each clause of a section note.

    `verdict` is None when the clause describes what every dish in the section
    is actually served with, and otherwise the reason it does not. Split out so
    `allergen_disagreements.py` can decide class membership on the same reading
    — a "vegan aioli available on request" line must not sweep twelve sharing
    plates into the mayonnaise class any more than it may tag them.
    """
    for clause in re.split(r"[.;]", note or ""):
        clause = clause.strip()
        if not clause:
            continue
        if CROSS_CONTACT.search(clause):
            yield clause, "cross-contamination, not an ingredient"
        elif AVAILABILITY.search(clause) or (ADD_ON.search(clause) and ADD_ON_PRICE.search(clause)):
            yield clause, "an alternative offered, not what is served"
        elif not UNIVERSAL.search(clause):
            yield clause, "does not say it covers the whole section"
        else:
            yield clause, None


def read_section_note(note):
    """Sort a `section.note` into (applies, review).

    `applies` is [(tag, tier, why)] — section-wide facts safe to put on every
    dish under the heading. `review` is [(clause, reason, [tag])] — clauses that
    mention an allergen but cannot honestly be tagged from, for a human to rule
    on. Returns two empty lists for the notes that are just opening hours.
    """
    applies, review, seen = [], [], set()
    for clause, verdict in section_clauses(note):
        # Two lists, because the two buckets want different things. `seen_by`
        # is everything the rules can see and is what a PERSON is shown;
        # `writable` is that minus what a hedge cancels, and is the only one
        # that can put a tag on a dish.
        seen_by, writable = [], []
        for tag, tier, why, pattern, exclude in COMPILED:
            if exclude and exclude.search(clause):
                continue
            match = pattern.search(clause)
            if not match:
                continue
            seen_by.append((tag, tier, f"{why} ({match.group(0).lower()})"))
            unhedged = first_unhedged(tag, pattern, clause)
            if unhedged:
                writable.append((tag, tier, f"{why} ({unhedged.group(0).lower()})"))
        if NOTE_DECLARES.search(clause):
            for tag, word in NOTE_ALLERGENS:
                m = re.search(word, clause, re.I)
                if m and not NOTE_FREE.match(clause[m.end():]):
                    said = (tag, "STATED", f"the note says it contains {m.group(0).lower()}")
                    seen_by.append(said)
                    writable.append(said)
        if not seen_by:
            continue
        if verdict:
            # The REVIEW bucket keeps the hedged hits ON PURPOSE. It is read by a
            # person, and "gluten free pasta available" is the strongest evidence
            # anywhere that the DEFAULT pasta has gluten — dropping the line
            # because the words happen to spell a negation would delete the very
            # pointer this bucket exists to raise. Only `writable` writes, so
            # only `writable` is filtered.
            review.append((clause, verdict, sorted({tag for tag, _, _ in seen_by})))
        else:
            for tag, tier, why in writable:
                if tag not in seen:
                    seen.add(tag)
                    applies.append((tag, tier, f'section note "{clause}" — {why}'))
    return applies, review


def review_notes(record):
    """Yield (section, clause, reason, tags) for note clauses a human must rule on.

    Filtered to clauses whose tag is actually missing from at least one dish in
    the section: a "gluten free bases available" line above pizzas that are all
    already tagged is a question nobody needs to answer twice, and a report full
    of settled questions is a report nobody reads.
    """
    for section in record.get("menu", []):
        _, review = read_section_note(section.get("note"))
        items = section.get("items", [])
        for clause, reason, tags in review:
            outstanding = [t for t in tags
                           if any(t not in (it.get("tags") or []) for it in items)]
            if outstanding:
                yield section, clause, reason, outstanding


def ingredient_lines(item):
    """A recipe's ingredient lines, flat, whichever way it was written.

    Since ADR 0070 an `ingredients` entry is either a plain string or a group
    `{"component": ..., "items": [...]}`. Allergen matching wants the words, not
    the structure — and the component itself is a label ("Sauce", "Topping"),
    never a thing you can be allergic to, so only its items come through.
    """
    out = []
    for entry in item.get("ingredients") or []:
        if isinstance(entry, str):
            out.append(entry)
        elif isinstance(entry, dict):
            out.extend(x for x in entry.get("items") or [] if isinstance(x, str))
    return out


def ingredient_text(item):
    """Name + the parts of the description describing what you actually get.

    A Cook at Home recipe also carries an `ingredients` list, and that is the
    best allergen evidence anywhere in the corpus — it is not inference at all,
    it literally says "2 eggs" and "200g butter". Without it a chocolate
    self-saucing pudding reads as allergen-free, because nothing in its *name*
    implies flour, butter or egg.
    """
    # `.get`, not `[...]`. This runs inside validate.py's sweep, over records
    # that have ALREADY failed its shape checks — a dish with no `name` is one
    # of the things it is there to report. Subscripting raised KeyError from
    # inside the sweep, which killed validate.py before it printed a single
    # line: exit 1 with no message, indistinguishable from the gate working.
    kept = [item.get("name") or ""]
    for clause in re.split(r"[.;]", item.get("desc") or ""):
        if ADD_ON.search(clause) and ADD_ON_PRICE.search(clause):
            continue
        kept.append(clause)
    kept.extend(ingredient_lines(item))
    return " ".join(kept)


# --- the PHOTO tier (2026-09-09, ADR 0114, roadmap 080/210) ----------------
# `alt` is the sentence a screen-reader user hears in place of the photograph.
# On McDonald's — 41 items, NO description on any of them — it is the only prose
# in the record, and it names cheese, egg, mayonnaise and a sesame seed bun that
# the tag row said nothing about. Reading it is the owner's ruling of
# 2026-09-09; the tier below it is what makes reading it honest.
#
# 🛑 WHY IT IS NOT `STATED`. ADR 0025's STATED means THE MENU NAMES IT. An `alt`
# names what is IN A PICTURE, and three things are true of a picture that are
# not true of a menu line:
#   • nobody promises the photograph is of the dish as served — it is a stock
#     shot of one variant, and the corpus has one already: `McFlurry`'s caption
#     says "crushed biscuit pieces", which is the Oreo one, not the flavour a
#     reader is buying;
#   • the caption is written for LAYOUT and for a screen reader, so it is
#     partial by construction — the same record's `Hot Chocolate` caption is "in
#     a takeaway cup" and says nothing about milk, while `Iced Chocolate` gains
#     dairy purely because the photographer's cup had cream on it. Coverage
#     follows the photography, not the food;
#   • it is a chain's marketing prose about its own product, not an ingredient
#     declaration, and no part of it is a legal statement.
# A tier that sits below DERIVED says all of that once, in a place a count can
# be taken from, instead of leaving it in a comment nobody re-reads.
#
# 🛑 AND IT IS NEVER MERGED INTO `ingredient_text`. If the caption were glued on
# to the name and description, one string would carry two strengths of evidence,
# `first_unhedged` would let a hedge in one cancel a match in the other, and the
# tier could not be reported at all. Separate text, separate tier, same rules
# and the same four guards.
def photo_text(item):
    """The caption written about this dish's PHOTOGRAPH, or "".

    Deliberately not folded into `ingredient_text` — see the block above. Read
    raw, so `first_unhedged` and `declared_free` see the caption's own clause
    boundaries rather than a name spliced onto the front of it.
    """
    alt = item.get("alt")
    return alt if isinstance(alt, str) else ""


def has_allergen_caveat(item):
    """Does this dish already tell a reader its allergen picture is unconfirmed?

    `needs: allergens` renders on the dish row as "Allergen details
    unconfirmed. Ask the venue before ordering." (site/js/needs.js), so it is
    the one piece of vocabulary this repo already ships that says on screen what
    the PHOTO tier means. The gate is one-way and conservative: a PHOTO tag may
    land only where that sentence is already on the page.

    🔑 SAY WHAT THIS DOES NOT DO TODAY. Every alt-bearing dish in the corpus
    (41 of 41, all McDonald's) carries the caveat, so this gate currently
    refuses NOTHING — which is the decorative-guard shape ADR 0072 names, and
    saying so is the only defence against it. Two things keep it real: an
    `--apply` run PRINTS every refusal rather than dropping it, and
    test_tag_allergens.py drives a dish with a caption and no caveat and
    asserts the tag is withheld. The day a second venue ships `alt`, this stops
    being theoretical without anyone having to remember it.
    """
    for need in item.get("needs") or []:
        if isinstance(need, dict) and need.get("what") == "allergens":
            return True
    return False


def audit(record, tier=None, refusals=None):
    """Yield (item, tag, tier, why) for every tag this record is missing.

    `refusals`, when given a list, collects (item, tag, why) for PHOTO findings
    withheld because the dish carries no `needs: allergens` caveat. A skipped
    tag that nothing prints is the "swept behind a green line" failure this
    file has already paid for twice.
    """
    for section in record.get("menu", []) or []:
        if not isinstance(section, dict):
            continue
        # Read the heading's note once, then offer it to every dish under it.
        note_applies, _ = read_section_note(section.get("note"))
        for item in section.get("items") or []:
            if not isinstance(item, dict):
                continue
            text = ingredient_text(item)
            tags = set(item.get("tags", []))
            # The venue's own free-from sentence, read off the raw `desc` rather
            # than off `text`: ingredient_text() splits the description into
            # clauses and joins them back with the NAME, so "No added gluten."
            # arrives as part of one long line and the whole-clause anchor —
            # which is the entire safety argument for this guard — can no longer
            # see where the sentence begins and ends.
            declared = declared_free(item.get("desc"))
            # The dish's own words first, so a burger that says "sesame" itself
            # is reported against its own name rather than against the note.
            findings = [
                (tag, rule_tier, f"{why} ({hit.group(0).lower()})")
                for tag, rule_tier, why, pattern, exclude in COMPILED
                if not (exclude and exclude.search(text))
                for hit in [first_unhedged(tag, pattern, text)] if hit
            ] + note_applies
            # THE PHOTO TIER GOES LAST, and the order is the whole of its
            # accounting. A dish whose own name or description carries the
            # evidence is credited to the menu at its real tier; the caption is
            # only ever asked about a tag nothing stronger already supports, so
            # `--tier PHOTO`'s count is what the photographs actually BOUGHT.
            # The rule's own tier is discarded on purpose: a PHOTO finding is
            # PHOTO whichever rule fired, because the tier names the evidence.
            caption = photo_text(item)
            findings += [
                (tag, "PHOTO", f'photo caption — {why} ({hit.group(0).lower()})')
                for tag, _rule_tier, why, pattern, exclude in COMPILED
                if caption and not (exclude and exclude.search(caption))
                for hit in [first_unhedged(tag, pattern, caption)] if hit
            ]
            caveat = has_allergen_caveat(item)
            for tag, rule_tier, why in findings:
                if tag in tags:
                    continue
                if tier and rule_tier != tier:
                    continue
                if tags & CONTRADICTED_BY.get(tag, set()):
                    continue  # curation outranks a pattern
                if tag in declared:
                    continue  # the venue's own printed free-from claim, ditto
                if rule_tier == "PHOTO" and not caveat:
                    # Reported, never written: the tier's on-screen meaning is
                    # the `needs: allergens` line, so a row without it must not
                    # gain a tag read off a photograph. See has_allergen_caveat.
                    if refusals is not None:
                        refusals.append((item, tag, why))
                    continue
                tags.add(tag)  # one tag per item, whichever rule fires first
                yield item, tag, rule_tier, why


# The data files are hand-maintained in two styles — one item per line in some
# records, fully expanded in others — so a json.dumps() round-trip would
# reformat whole files and bury the change. Patch the tags arrays in the raw
# text instead, and leave every other byte alone. That property is worth
# keeping: the diff of a tag sweep is the only review anyone gets of it.
#
# What was NOT worth keeping is how the arrays were found. Until 2026-08-17 one
# regex swept the whole file for `"tags": [...]` and matched the results to
# dishes BY POSITION. Add-ons (ADR 0048) gave every add-on *option* a required
# `tags` array of its own, so on the six records that carry `addOnGroups` the
# count overshot, the file was refused whole, and the run still exited 0 —
# 232 dishes never swept behind a green line of output.
#
# The primitives below walk the document's real structure instead, so a dish's
# tags array is found INSIDE that dish's own object and nothing outside
# `menu[].items[]` is ever a candidate. Position stops being the key: the array
# is located through the object that owns it.

class Unpatchable(Exception):
    """This record's tags can't be located safely — skip it, don't guess."""


def _skip_ws(raw, i):
    while i < len(raw) and raw[i] in " \t\r\n":
        i += 1
    return i


def _end_of_string(raw, i):
    """Index just past the JSON string starting at raw[i] (which is a quote)."""
    j = i + 1
    while j < len(raw):
        if raw[j] == "\\":  # an escaped quote is not the end of the string
            j += 2
            continue
        if raw[j] == '"':
            return j + 1
        j += 1
    raise Unpatchable("unterminated string")


def _end_of_value(raw, i):
    """Index just past the JSON value starting at raw[i]."""
    c = raw[i]
    if c == '"':
        return _end_of_string(raw, i)
    if c in "[{":
        depth, j = 0, i
        while j < len(raw):
            c = raw[j]
            if c == '"':  # brackets inside a string are text, not structure
                j = _end_of_string(raw, j)
                continue
            if c in "[{":
                depth += 1
            elif c in "]}":
                depth -= 1
                if depth == 0:
                    return j + 1
            j += 1
        raise Unpatchable("unterminated array or object")
    j = i  # number, true, false, null
    while j < len(raw) and raw[j] not in ",]} \t\r\n":
        j += 1
    return j


def _elements(raw, start):
    """(start, end) of each element of the JSON array at raw[start] == '['."""
    if raw[start] != "[":
        raise Unpatchable(f"expected an array at offset {start}")
    i = _skip_ws(raw, start + 1)
    while i < len(raw) and raw[i] != "]":
        if raw[i] == ",":
            i = _skip_ws(raw, i + 1)
            continue
        end = _end_of_value(raw, i)
        yield i, end
        i = _skip_ws(raw, end)


def _member(raw, start, key):
    """(start, end) of `key`'s value in the JSON object at raw[start] == '{'.

    Only that object's own keys — a nested object's `tags` is not this one's.
    """
    if raw[start] != "{":
        raise Unpatchable(f"expected an object at offset {start}")
    i = _skip_ws(raw, start + 1)
    while i < len(raw) and raw[i] != "}":
        if raw[i] == ",":
            i = _skip_ws(raw, i + 1)
            continue
        if raw[i] != '"':
            raise Unpatchable(f"expected a key at offset {i}")
        key_end = _end_of_string(raw, i)
        found = json.loads(raw[i:key_end])
        i = _skip_ws(raw, key_end)
        if i >= len(raw) or raw[i] != ":":
            raise Unpatchable(f"expected ':' at offset {i}")
        i = _skip_ws(raw, i + 1)
        end = _end_of_value(raw, i)
        if found == key:
            return i, end
        i = _skip_ws(raw, end)
    return None


def item_tag_spans(raw):
    """(start, end) of every menu item's own `tags` array, in menu order.

    `None` in place of a span for a dish that carries no literal `tags` key —
    which is patchable for every *other* dish in the file, unlike the old
    positional scheme where one such dish condemned the whole record.
    """
    root = _skip_ws(raw, 0)
    menu = _member(raw, root, "menu")
    if menu is None:
        return []
    spans = []
    for sec_start, _ in _elements(raw, menu[0]):
        items = _member(raw, sec_start, "items")
        if items is None:
            continue
        for item_start, _ in _elements(raw, items[0]):
            spans.append(_member(raw, item_start, "tags"))
    return spans


# How to lay out an array we are creating from scratch. An existing non-empty
# array tells us its own style; an empty `[]` tells us nothing, so fall back to
# whatever the rest of the file does. Both styles are real in the corpus —
# sprig-and-fern-tawa writes `"tags": ["df", "contains-gluten"]` on one line and
# `"tags": [\n` a few sections later — and reformatting either one is the diff
# noise this whole raw-text approach exists to avoid.
MULTILINE_TAGS = re.compile(r'"tags"\s*:\s*\[\s*\n')


def patch_tags(raw, items, additions):
    """Rewrite only the tags arrays that gained a tag, preserving each one's
    existing layout. `additions` is {flat item index: [tag, …]}.
    """
    spans = item_tag_spans(raw)
    if len(spans) != len(items):
        # The scanner and json.loads disagree about how many dishes are here,
        # so one of them is wrong about the file's shape. Never write on that.
        raise Unpatchable(f"scanned {len(spans)} dishes, parsed {len(items)}")
    absent = [i for i in additions if spans[i] is None]
    if absent:
        raise Unpatchable(
            "no literal tags array on " + ", ".join(repr(items[i]["name"]) for i in absent)
        )
    multiline = bool(MULTILINE_TAGS.search(raw))
    out, last = [], 0
    for idx in sorted(additions):
        start, end = spans[idx]
        tags = list(items[idx].get("tags", [])) + additions[idx]
        existing = raw[start:end]
        line_start = raw.rfind("\n", 0, start) + 1
        indent = re.match(r"[ \t]*", raw[line_start:]).group(0)
        if "\n" in existing or (existing == "[]" and multiline):
            inner = f",\n{indent}  ".join(json.dumps(t) for t in tags)
            replacement = f"[\n{indent}  {inner}\n{indent}]"
        else:
            replacement = "[" + ", ".join(json.dumps(t) for t in tags) + "]"
        out.append(raw[last:start])
        out.append(replacement)
        last = end
    out.append(raw[last:])
    return "".join(out)


def corpus_strings():
    """Every string the rules are matched against, as (record, dish, text).

    The same reach `audit()` has — name, description, ingredients, section
    notes, add-on option names and, since ADR 0114, the image `alt` — so
    `--compounds` cannot report a near-miss the tagger would never have seen
    anyway. The alt line was added the same day the tagger gained it: a reach
    the tool has and this function does not is a near-miss report that is
    quietly narrower than the thing it claims to describe.
    """
    for path in sorted(DATA.glob("*.json")):
        record = json.loads(path.read_text())
        for section in record.get("menu", []) or []:
            if not isinstance(section, dict):
                continue
            if section.get("note"):
                yield record.get("id", path.stem), "§ " + str(section.get("section")), section["note"]
            for item in section.get("items") or []:
                if not isinstance(item, dict):
                    continue
                yield record.get("id", path.stem), item.get("name", "?"), ingredient_text(item)
                if photo_text(item):
                    yield (record.get("id", path.stem),
                           "[alt] " + str(item.get("name", "?")), photo_text(item))
                for group in item.get("addOnGroups") or []:
                    for option in group.get("options") or []:
                        name = option.get("name") or ""
                        yield record.get("id", path.stem), f"[add-on] {name}", name


def compound_misses():
    """{(tag, token, side): Counter(word)} — every word a boundary refuses.

    A rule alternative matches inside a longer word, and one of the two word
    boundaries is what stops it becoming a tag. This says which words those are,
    and on which side, so the question "should this token take a compound?" is
    answered from the corpus rather than from memory. It is the evidence behind
    COMPOUND_TAILS and the standing report on what is still missed.

    Reported, never tagged — most of these words are exactly why the boundaries
    are there (`eggplant`, `buckwheat`, `kale`), and telling them apart from
    `cheeseburger` is a judgement about food that only a person can make.
    """
    import collections

    out = collections.defaultdict(collections.Counter)
    texts = list(corpus_strings())
    for _tag, _tier, _why, pat, _exc in RULES:
        strict = compile_rule(pat)
        loose_src = strict.pattern
        if loose_src.startswith(r"\b"):
            loose_src = loose_src[2:]
        if loose_src.endswith(r"\b"):
            loose_src = loose_src[:-2]
        loose = re.compile(loose_src, re.I)
        for _rec, _dish, text in texts:
            for m in loose.finditer(text):
                a, b = m.start(), m.end()
                pre = a > 0 and bool(re.match(r"\w", text[a - 1]))
                post = b < len(text) and bool(re.match(r"\w", text[b]))
                if not (pre or post):
                    continue
                while a > 0 and re.match(r"\w", text[a - 1]):
                    a -= 1
                while b < len(text) and re.match(r"\w", text[b]):
                    b += 1
                word = text[a:b].lower()
                # Some OTHER alternative of the same rule already reaches this
                # word cleanly — "crayfish" is shellfish by name — so it is not
                # a miss and printing it would bury the ones that are.
                if strict.search(word):
                    continue
                side = ("head" if pre else "") + ("+" if pre and post else "") + ("tail" if post else "")
                out[(_tag, m.group(0).lower(), side)][word] += 1
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write the tags (default: report only)")
    ap.add_argument("--tier", choices=["STATED", "DERIVED", "PHOTO"], help="only this tier")
    ap.add_argument("--quiet", action="store_true", help="counts only")
    ap.add_argument("--compounds", action="store_true",
                    help="words a rule ALMOST matches, and which boundary refused them")
    args = ap.parse_args()

    if args.compounds:
        misses = compound_misses()
        print("Words a rule matches INSIDE, and the boundary that refuses them.")
        print("`head` = a prefix is in the way (Cheeseburger); `tail` = a suffix is")
        print("(eggplant). Nothing here is tagged — read it and rule on it.\n")
        for (tag, token, side) in sorted(misses):
            words = misses[(tag, token, side)]
            shown = ", ".join(f"{w} ×{n}" for w, n in words.most_common())
            print(f"  {tag:<19} {side:<9} {token!r:<15} {shown}")
        print(f"\n{len(misses)} near-miss group(s). Tails already opened: "
              f"{', '.join(COMPOUND_TAILS)}.")
        return 0

    total = {"STATED": 0, "DERIVED": 0, "PHOTO": 0}
    by_tag = {}
    skipped = []
    reviews = []
    refusals = []
    swept_records = swept_dishes = 0
    for path in sorted(DATA.glob("*.json")):
        raw = path.read_text()
        record = json.loads(raw)
        items = [it for sec in record.get("menu", []) for it in sec["items"]]
        index = {id(it): i for i, it in enumerate(items)}
        swept_records += 1
        swept_dishes += len(items)

        for section, clause, reason, tags in review_notes(record):
            reviews.append(
                f"{record['id']} / {section.get('section')}: {', '.join(tags)}?"
                f" — {reason}\n      note: “{clause}”"
            )

        record_refusals = []
        findings = list(audit(record, args.tier, record_refusals))
        for item, tag, why in record_refusals:
            refusals.append(f"{record['id']} / {item.get('name')}: {tag} — {why}")
        if not findings:
            continue
        if not args.quiet:
            print(f"\n## {record['id']} ({len(findings)})")
        additions = {}
        for item, tag, tier, why in findings:
            if not args.quiet:
                print(f"  {tier:<7} {tag:<19} {item['name'][:42]:<42} — {why}")
            additions.setdefault(index[id(item)], []).append(tag)
            total[tier] += 1
            by_tag[tag] = by_tag.get(tag, 0) + 1
        if args.apply:
            try:
                path.write_text(patch_tags(raw, items, additions))
            except Unpatchable as exc:
                # Don't count what we didn't write — the summary line is the
                # only thing most runs are read for.
                skipped.append(f"{record['id']}: {exc} — {len(findings)} tag(s) NOT applied")
                for _, tag, tier, _ in findings:
                    total[tier] -= 1
                    by_tag[tag] -= 1

    verb = "applied" if args.apply else "missing (dry run)"
    # SAY WHAT WAS SWEPT, not just what was found. Until 2026-08-16 the summary
    # printed the finding count alone, so "0 tag(s) missing" was the same line
    # whether the tool had read 55 records or none — and that is exactly how the
    # positional-scan bug hid: it refused six records whole, wrote nothing, and
    # exited 0 behind a clean-looking total. The denominator is what makes this
    # all-clear falsifiable; a reader who knows the corpus size can now tell a
    # real sweep from a sweep that never happened. Same reasoning as the
    # SKIPPED line below, one step earlier in the pipeline.
    print(f"\nSwept {swept_records} record(s), {swept_dishes} dish(es).")
    print(f"{sum(total.values())} tag(s) {verb} — {total['STATED']} STATED, "
          f"{total['DERIVED']} DERIVED, {total['PHOTO']} PHOTO")
    for tag, n in sorted(by_tag.items(), key=lambda kv: -kv[1]):
        print(f"  {tag:<22} {n}")
    # Never silent: a record we couldn't write is reported, not swallowed.
    for s in skipped:
        print(f"  SKIPPED (not written) — {s}")

    # NEVER SILENT, same reasoning as SKIPPED above one step later: a PHOTO
    # finding withheld by the caveat gate is a tag this tool CAN see and has
    # chosen not to write, which is exactly the kind of decision that has to
    # leave a mark. Printed even in --quiet; the count is the point.
    if refusals:
        print(f"\n{len(refusals)} PHOTO tag(s) REFUSED — the dish carries no "
              f"`needs: allergens` caveat, so a tag read off a photograph would "
              f"land on a row that claims a confirmed allergen picture (ADR 0114):")
        for r in refusals:
            print(f"  • {r}")

    if reviews:
        print(f"\n{len(reviews)} section note(s) need a human — this tool will not tag from them:")
        for r in [] if args.quiet else reviews:
            print(f"  • {r}")

    # A dry run reports what is untagged; that is its job, and exiting non-zero
    # for doing its job is the "check that always fires" this repo keeps having
    # to switch back on. So only --apply can fail, and it fails on exactly one
    # thing: it meant to write a record and could not. The run still finishes
    # first — aborting half-written is worse than finishing and shouting — but
    # it no longer finishes GREEN, which is how six venues stayed unswept.
    if skipped:
        print(f"\n{len(skipped)} record(s) NOT written — the sweep is incomplete.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
