#!/usr/bin/env python3
"""Mutation-test `find_addons.py` — prove the classifier still tells the traps apart.

`find_addons.py` is a pile of regexes over hand-typed menu prose, and every one
of them was written against a real false positive. That makes it exactly the
kind of tool whose rules rot silently: widen one pattern to catch a new venue
and a `$` count doubles, a wine list lands in Theme 14b, and nothing anywhere
says so. The report still prints, still looks like a report.

So the method is `test_tag_allergens.py`'s, for the same reason — take **real**
records, run the real tool as a subprocess, and assert on what it said. Real
records rather than fixtures, because a fixture drifts from the schema and then
tests nothing; a subprocess rather than an import, because the exit code is part
of what is being asserted (this tool must ALWAYS exit 0 on a scan, and 1 only on
a bad `--only`).

Then the half that makes it more than a smoke test: BREAKERS puts each trap back
into `tools/find_addons.py` itself and asserts the covering cases now FAIL. A
case that still passes with the bug present was never testing the bug. It also
fails loudly when a breaker's patch matches nothing — that means the code moved
and the breaker is now decorative, which is the failure this repo keeps
rediscovering (ADR 0072).

    python3 tools/test_find_addons.py        # run every case
    python3 tools/test_find_addons.py -v     # show each case's findings

Exit 0 = every case behaved and every reintroduced bug was caught. Stdlib only.
Never writes outside a temporary copy.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOL = "tools/find_addons.py"

CONVERTIBLE = {"addon-priced", "addon-price-unreadable", "addon-unpriced-choice",
               "addon-options-not-listed", "dish-is-an-addon"}


# --- small helpers over a case's findings ----------------------------------

def cls_of(found, where, text_has=""):
    """The classes given to `where`, optionally only for clauses containing text."""
    return {f["cls"] for f in found
            if f["where"] == where and text_has.lower() in f["text"].lower()}


def counts(found):
    out = {}
    for f in found:
        out[f["cls"]] = out.get(f["cls"], 0) + 1
    return out


# --- the cases -------------------------------------------------------------
# name -> (argv, [(subject, old, new), …], expected_rc, check(found, out))
# `found` is the parsed --json output; `out` is stdout+stderr. A check returns
# None when satisfied, or a string saying what went wrong.

def check_the_killer(found, out):
    """`southern-cross/cheeseburger` — the corpus's hardest line.

    "…milk bun, fries. No gluten added bun +$2.50 or lettuce bun available."
    carries the pub group's stock idiom (16 occurrences, a false "add") and a
    real surcharge, in one clause. Both readings have to survive.
    """
    got = cls_of(found, "Cheeseburger")
    if "diet-substitution-price" not in got:
        return f"the +$2.50 surcharge was not found (Cheeseburger got {sorted(got)})"
    priced = [f["text"] for f in found
              if f["where"] == "Cheeseburger" and f["cls"] == "diet-substitution-price"]
    if not any("+$2.50" in t for t in priced):
        return f"the price was cut out of the clause: {priced}"
    return None


def check_idiom_alone_is_not_an_addon(found, out):
    """The same idiom with no price is a request (14c), not an offer (14b)."""
    bad = [f for f in found if f["cls"] in CONVERTIBLE
           and f["text"].strip().lower().rstrip(".") == "no gluten added"]
    if bad:
        return f"'No gluten added' was read as the verb add: {[f['where'] for f in bad]}"
    if "customisation" not in cls_of(found, "Green Tahini Bowl", "no gluten added"):
        return "'No gluten added' was not routed to 14c at all"
    return None


def check_wine_list_is_28b(found, out):
    """A wine list is nothing but second prices. Not one of them is an add-on."""
    n = counts(found)
    if n.get("size-ladder", 0) < 50:
        return f"only {n.get('size-ladder', 0)} size ladders found on a 56-row wine list"
    if n.get("addon-priced", 0):
        return f"{n['addon-priced']} wine row(s) were called priced add-ons"
    return None


def check_beer_pours_are_28b(found, out):
    """"Larger pour $28.00; the menu doesn't label the size" — 12 of them."""
    ladders = [f for f in found if f["cls"] == "size-ladder" and "pour" in f["text"]]
    if len(ladders) < 10:
        return f"only {len(ladders)} beer pours classed as size ladders"
    if any(f["cls"] == "addon-priced" and "pour" in f["text"] for f in found):
        return "a larger pour was called a priced add-on"
    return None


def check_priced_pairing_is_thrown_away(found, out):
    """"Beer match — Foul Hooked APA $12.00" is a `goesWith`, not an extra."""
    hits = [f for f in found if f["where"] == "Heart-a-Stack"]
    if hits:
        return f"the beer match was classed {[f['cls'] for f in hits]}"
    if "pairing suggestion" not in out:
        return "the veto was silent — nothing said the clause had been dropped"
    return None


def check_alternate_price_is_not_a_surcharge(found, out):
    """Same venue, same section, opposite meanings — the `+` is the only tell.

    "+$10 for an additional patty" is an add-on; "$41 with gluten-free bread
    instead of crostini" is the whole dish at another price.
    """
    board = cls_of(found, "Charcuterie Board")
    if "addon-priced" in board:
        return "a whole-dish alternate price was called a surcharge"
    if "diet-substitution-price" not in board:
        return f"the $41 alternate price was not routed to 28b (got {sorted(board)})"
    burger = cls_of(found, "Charley Noble Burger")
    if not {"addon-priced", "diet-substitution-price"} <= burger:
        return f"the burger should carry both readings, got {sorted(burger)}"
    return None


def check_section_note_is_read(found, out):
    """The richest unconverted statement in the corpus is a `section.note`.

    charley-noble / Woodfired Grill: a free pick-one over a whole section AND a
    priced repeat. `tag_allergens.py` shipped for months reading item text only.
    """
    got = cls_of(found, "§ Woodfired Grill")
    missing = {"addon-unpriced-choice", "addon-priced"} - got
    if missing:
        return f"the section note lost {sorted(missing)} (got {sorted(got)})"
    return None


def check_unanchored_name_is_not_a_row_addon(found, out):
    """"Beef Steak in Black Pepper Sauce" is dinner, not a sauce you add on."""
    bad = [f["where"] for f in found if f["cls"] == "dish-is-an-addon"]
    return f"{len(bad)} main(s) called add-on rows: {bad[:5]}" if bad else None


def check_sauce_section_is_not_a_group(found, out):
    """`takeaway-at-churton`'s section is literally named "Sweet and Sour Sauce"
    and its seven rows are full mains. Its "Extras" section is the real one."""
    groups = {f["where"] for f in found if f["cls"] == "section-is-a-group"}
    if "§ Sweet and Sour Sauce" in groups:
        return "a section named for a sauce was called a sauce group"
    if "§ Extras" not in groups:
        return f"the real add-on section was missed (found {sorted(groups)})"
    return None


def check_condiment_rows_not_the_section(found, out):
    """`pizza-hut/Sides` mixes seven condiments in with real food, so the ROW is
    the unit there and the section is not."""
    dips = [f["where"] for f in found if f["cls"] == "dish-is-an-addon"]
    if len(dips) != 7:
        return f"expected the 7 condiment rows, got {len(dips)}: {dips}"
    if any(f["cls"] == "section-is-a-group" for f in found):
        return "the mixed Sides section was called one add-on group"
    return None


def check_ingredient_commas_are_not_options(found, out):
    """"with a choice of meat, egg, tamarind, garlic chive and bean sprouts".

    Every comma there belongs to the ingredient list; the options live in a
    different section. A comma-based rule called twenty rows "options listed".
    """
    n = counts(found)
    if n.get("addon-unpriced-choice", 0):
        listed = [f["where"] for f in found if f["cls"] == "addon-unpriced-choice"]
        return f"{len(listed)} ingredient list(s) read as an option list: {listed[:4]}"
    if n.get("addon-options-not-listed", 0) < 20:
        return f"only {n.get('addon-options-not-listed', 0)} rows flagged as unfillable"
    return None


def check_on_request_is_14c(found, out):
    """46 pizzas print "Gluten free (on request)". None of them is an add-on."""
    bad = [f["where"] for f in found if f["cls"] in CONVERTIBLE]
    if bad:
        return f"{len(bad)} 'on request' row(s) routed to 14b: {bad[:4]}"
    if counts(found).get("customisation", 0) < 40:
        return "the customisation class did not pick them up either"
    return None


def check_per_head_is_28b(found, out):
    """"Min 2 people, $16/head" — eight tasting platters, none an add-on."""
    n = counts(found)
    if n.get("per-head", 0) != 8:
        return f"expected 8 per-head findings, got {n.get('per-head', 0)}"
    if n.get("addon-priced", 0):
        return f"{n['addon-priced']} per-head row(s) called priced add-ons"
    return None


def check_converted_dish_is_not_work(found, out):
    """`fern-benedict` resolves `brunch-sides`; its "Add brunch sides." is a trim
    candidate, not a conversion."""
    got = cls_of(found, "Fern Benedict")
    if got != {"already-converted"}:
        return f"a converted dish was reported as work: {sorted(got)}"
    return None


def check_unconverted_row_inside_converted_record(found, out):
    """The flag on the whole approach: suppressing on "the record has
    addOnGroups" is TOO COARSE. `sprig-and-fern-tawa` carries ten groups and
    `cheese-pizza` — "Add additional toppings $2 per topping" — is genuinely
    unconverted inside it."""
    got = cls_of(found, "Cheese Pizza")
    if "addon-priced" not in got:
        return f"an unconverted row inside a converted record was suppressed ({sorted(got)})"
    return None


def check_combo_flagged_once(found, out):
    """A set menu is a combo whichever sentence you read.

    Classing per clause reported `regal-chinese-restaurant`'s two set menus six
    times each — entrée list, soup, "Fee applies on delivery orders" — and called
    every one an offer.
    """
    combos = [f for f in found if f["cls"] == "combo"]
    if len(combos) != 3:
        return f"expected 3 combo findings, got {len(combos)}: {[f['where'] for f in combos]}"
    if len(found) != 4:
        return f"expected 4 findings in total, got {len(found)}: {[f['cls'] for f in found]}"
    regal = [f for f in combos if f["where"] == "Regal Set Menu"]
    if not regal or "party size" not in regal[0]["note"]:
        return "the pick-many whose max varies by party size was not called unconvertible"
    return None


def check_bad_venue_exits_1(found, out):
    return None if "no such venue" in out else f"expected a complaint, got: {out.strip()[:80]}"


def check_injected_offer_is_found(found, out):
    """Proof the run reads the data in front of it, not a memorised answer."""
    got = cls_of(found, "Cos Lettuce")
    if "addon-priced" not in got:
        return f"an injected 'Add avocado +$4.50.' was not found (got {sorted(got)})"
    return None


def check_injected_ladder_is_28b(found, out):
    got = cls_of(found, "Cos Lettuce")
    if got != {"size-ladder"}:
        return f"an injected 'Large $9.50.' should be a size ladder, got {sorted(got)}"
    return None


def check_price_is_the_discriminator(found, out):
    """The 14c/28b boundary is the PRICE, not the diet word.

    `gold-lining-cafe` prints both forms one line apart: "GF on request +$1" is
    a priced substitute (28b) and would be a `customisation` if the diet word
    decided; the venue's unpriced "on request" lines really are 14c.
    """
    for dish in ("Chilli Scrambled Eggs", "Avo on Toast", "Eggs on Toast"):
        got = cls_of(found, dish)
        if "diet-substitution-price" not in got:
            return f"{dish}: a priced GF substitute was not routed to 28b (got {sorted(got)})"
        if "customisation" in got:
            return f"{dish}: a priced substitute was also filed as a free-text note"
    return None


def check_unpriced_diet_alternative_stays_14c(found, out):
    """…and the same words with no price stay a request. 46 of them."""
    bad = [f["where"] for f in found if f["cls"] == "diet-substitution-price"]
    if bad:
        return f"{len(bad)} unpriced 'Gluten free (on request)' row(s) routed to 28b: {bad[:4]}"
    return None


def check_diet_rows_carry_the_option_tag(found, out):
    """The audience claim, gathered rather than asserted.

    An `*-option` tag is what makes `dietary.js` show the dish to the reader who
    needs it — which is what turns an unpriceable substitute from a modelling
    gap into a wrong answer given to a named person.
    """
    diet = [f for f in found if f["cls"] == "diet-substitution-price"]
    if not diet:
        return "no diet-substitution prices found at all — the case proves nothing"
    if not any(f.get("dietTags") for f in diet):
        return "not one of them recorded the dish's *-option tags"
    return None


def check_combo_keeps_a_second_price(found, out):
    """A $14 Combo that says "(without drink $12.00)" names a second price.

    The combo rule suppresses a bundle's own prose, and used to swallow this
    with it. It must suppress the row RESTATING its own price and nothing else.
    """
    got = cls_of(found, "Combo")
    if "size-ladder" not in got:
        return f"the (without drink $12.00) second price was swallowed (got {sorted(got)})"
    if "addon-priced" not in got:
        return f"the naan upgrade +$1.00 was lost too (got {sorted(got)})"
    return None


def check_combo_still_drops_its_own_price(found, out):
    """…and the other half: "delivered for $25" on a $25 row is the row."""
    texts = [f["text"] for f in found if f["where"] == "$25 Favourites Deal Delivered"]
    if any("for $25" in t and not t.startswith("row:") for t in texts):
        return f"a combo restating its own price was reported as a finding: {texts}"
    return None


def check_named_options_beat_the_add_verb(found, out):
    """"Add your favourite toppings: pepperoni, pineapple (V) or chicken".

    The add verb leads, so the price-unknown reading fired first — but the
    colon has already named the options, and a named list is the more useful
    answer.
    """
    got = cls_of(found, "Mini VIP Pizza")
    if "addon-price-unreadable" in got:
        return "a clause that names its options was filed as price-unknown"
    if "addon-unpriced-choice" not in got:
        return f"the named option list was not picked up (got {sorted(got)})"
    return None


SOUTHERN = "site/data/restaurants/southern-cross.json"

CASES = {
    "a +$N inside the pub group's stock idiom is found": (
        ["--only", "southern-cross"], [], 0, check_the_killer),
    "the same idiom with no price is 14c, not 14b": (
        ["--only", "southern-cross"], [], 0, check_idiom_alone_is_not_an_addon),
    "a wine list is 28b, every row of it": (
        ["--only", "the-victoria-tavern"], [], 0, check_wine_list_is_28b),
    "a beer pour ladder is 28b": (
        ["--only", "the-borough-tawa"], [], 0, check_beer_pours_are_28b),
    "a priced pairing is vetoed, visibly": (
        ["--only", "baylands-brewery"], [], 0, check_priced_pairing_is_thrown_away),
    "a whole-dish alternate price is not a surcharge": (
        ["--only", "charley-noble"], [], 0, check_alternate_price_is_not_a_surcharge),
    "a section note carries offers and is read": (
        ["--only", "charley-noble"], [], 0, check_section_note_is_read),
    "an unanchored name match is not a row add-on": (
        ["--only", "regal-chinese-restaurant"], [], 0,
        check_unanchored_name_is_not_a_row_addon),
    "a section named for a sauce is not a sauce group": (
        ["--only", "takeaway-at-churton"], [], 0, check_sauce_section_is_not_a_group),
    "a mixed Sides section reports rows, not the section": (
        ["--only", "pizza-hut"], [], 0, check_condiment_rows_not_the_section),
    "an ingredient list's commas are not an option list": (
        ["--only", "thai-tara-express"], [], 0, check_ingredient_commas_are_not_options),
    "'on request' is a customisation, not an add-on": (
        ["--only", "pizza-pomodoro"], [], 0, check_on_request_is_14c),
    "a per-head minimum is 28b": (
        ["--only", "rock-yard-restaurant"], [], 0, check_per_head_is_28b),
    "a dish that already resolves groups is a trim candidate": (
        ["--only", "sprig-and-fern-tawa"], [], 0, check_converted_dish_is_not_work),
    "a converted RECORD can still hold an unconverted row": (
        ["--only", "sprig-and-fern-tawa"], [], 0,
        check_unconverted_row_inside_converted_record),
    "a combo is flagged once, not once per sentence": (
        ["--only", "regal-chinese-restaurant"], [], 0, check_combo_flagged_once),
    "a price makes a diet alternative 28b, not 14c": (
        ["--only", "gold-lining-cafe"], [], 0, check_price_is_the_discriminator),
    "the same words with no price stay 14c": (
        ["--only", "pizza-pomodoro"], [], 0, check_unpriced_diet_alternative_stays_14c),
    "a diet substitution records the dish's *-option tags": (
        ["--only", "southern-cross"], [], 0, check_diet_rows_carry_the_option_tag),
    "a combo does not swallow a second price": (
        ["--only", "spices-indian"], [], 0, check_combo_keeps_a_second_price),
    "a combo restating its own price is still dropped": (
        ["--only", "pizza-hut"], [], 0, check_combo_still_drops_its_own_price),
    "a named option list beats the add verb": (
        ["--only", "the-borough-tawa"], [], 0, check_named_options_beat_the_add_verb),
    "an unknown venue is refused with exit 1": (
        ["--only", "no-such-place"], [], 1, check_bad_venue_exits_1),
    # The two mutation cases. Southern Cross's "Cos Lettuce" is a bare row with
    # no desc at all, so whatever it reports came from the injected sentence and
    # nothing else.
    "an injected priced extra is found": (
        ["--only", "southern-cross"],
        [(SOUTHERN, '"desc": "Pumpkin seed crunch, house dressing. No gluten added.",',
          '"desc": "Pumpkin seed crunch, house dressing. Add avocado +$4.50.",')],
        0, check_injected_offer_is_found),
    "an injected size ladder is not an add-on": (
        ["--only", "southern-cross"],
        [(SOUTHERN, '"desc": "Pumpkin seed crunch, house dressing. No gluten added.",',
          '"desc": "Pumpkin seed crunch, house dressing. Large $9.50.",')],
        0, check_injected_ladder_is_28b),
}


# --- reintroducing the bugs ------------------------------------------------
# name -> ([(old source, new source), …], [case names that MUST now fail]).

BREAKERS = {
    "the `+$N` tell reduced to a bare `$`": (
        [(r'PLUS_PRICE = re.compile(r"\+\s?\$\s?\d+(?:[.,]\d+)?")',
          r'PLUS_PRICE = re.compile(r"\$\s?\d+(?:[.,]\d+)?")')],
        # NOT "a whole-dish alternate price is not a surcharge": since the 12th
        # class landed, "$41 with gluten-free bread" reaches
        # `diet-substitution-price` down either route — the `+$N` branch or the
        # fall-through — so that case is blind to this bug and listing it would
        # have made this breaker look stronger than it is. Four others do fail.
        ["a wine list is 28b, every row of it",
         "a beer pour ladder is 28b",
         "a per-head minimum is 28b",
         "an injected size ladder is not an add-on"],
    ),

    # Both anchors have to go: the pattern's `^` AND the `.match` at the call
    # site each pin it on their own, so removing either alone changes nothing —
    # measured, not assumed. A breaker that patched only one would have reported
    # "caught" while proving the OTHER anchor was decorative.
    "the add verb no longer has to lead its clause": (
        [(r'ADD_LEAD = re.compile(r"^[(\s]*(?:also\s+)?(add|adds|added|adding|extra|extras|"',
          r'ADD_LEAD = re.compile(r"(?:also\s+)?(add|adds|added|adding|extra|extras|"'),
         ("    leads = ADD_LEAD.match(clause)", "    leads = ADD_LEAD.search(clause)")],
        ["'on request' is a customisation, not an add-on"],
    ),
    "the row-name heuristic unanchored and widened": (
        [(r'ADDON_ROW_NAME = re.compile(r"^(?:add|extra|additional|upgrade|swap)\b", re.I)',
          r'ADDON_ROW_NAME = re.compile(r"\b(?:add|extra|additional|upgrade|swap|sauce|dip|'
          r'topping|side)\b", re.I)'),
         ("            if ADDON_ROW_NAME.match(iname):", "            if ADDON_ROW_NAME.search(iname):")],
        ["an unanchored name match is not a row add-on"],
    ),
    "section notes never read": (
        [('        for clause in clauses(section.get("note")):',
          "        for clause in clauses(None):")],
        ["a section note carries offers and is read"],
    ),
    "suppression on the RECORD instead of the dish": (
        [("            converted = bool(resolved_groups(item, section)) or section_converted",
          "            converted = bool(record.get('addOnGroups')) or section_converted")],
        ["a converted RECORD can still hold an unconverted row"],
    ),
    "no suppression at all — converted dishes reported as work": (
        [("            converted = bool(resolved_groups(item, section)) or section_converted",
          "            converted = False")],
        ["a dish that already resolves groups is a trim candidate"],
    ),
    "a bare comma counts as an option list": (
        [('    return ":" in scope or re.search(r"\\bor\\b", scope, re.I) is not None',
          '    return "," in scope or ":" in scope or re.search(r"\\bor\\b", scope, re.I) is not None')],
        ["an ingredient list's commas are not an option list"],
    ),
    # The owner's ruling (2026-08-17): this class must not fold back into
    # `customisation`, because the price is the discriminator and a priced
    # substitute has an audience a free-text note cannot serve.
    "the diet substitution collapsed back into customisation": (
        [('        return ("diet-substitution-price" if diet else "addon-priced"), ""',
          '        return ("customisation" if diet else "addon-priced"), ""'),
         ('        return ("diet-substitution-price" if diet else "size-ladder"), ""',
          '        return ("customisation" if diet else "size-ladder"), ""')],
        ["a +$N inside the pub group's stock idiom is found",
         "a price makes a diet alternative 28b, not 14c",
         "a whole-dish alternate price is not a surcharge",
         "a diet substitution records the dish's *-option tags"],
    ),
    # The ordering guard that replaced the (decorative) `no gluten added` mask.
    # An earlier version of this breaker patched only the priced branch, and the
    # 12th class quietly made it toothless — the fall-through reached the same
    # answer by another route. This version puts the diet word AHEAD of the
    # price entirely, which is the bug the boundary actually exists to stop.
    "the diet word decides before the price is even read": (
        [("    money = MONEY.search(clause)",
          "    if (REQUEST.search(clause) or DIET_ALT.search(clause)\n"
          "            or NO_GLUTEN_ADDED.search(clause)):\n"
          '        return "customisation", ""\n'
          "    money = MONEY.search(clause)")],
        ["a +$N inside the pub group's stock idiom is found",
         "a price makes a diet alternative 28b, not 14c",
         "a whole-dish alternate price is not a surcharge",
         "a diet substitution records the dish's *-option tags"],
    ),
    "a combo swallows every clause but a +$N": (
        [("                if is_combo and (cls not in PRICED_CLASSES\n"
          "                                 or not _other_prices(clause, price)):",
          '                if is_combo and cls != "addon-priced":')],
        ["a combo does not swallow a second price"],
    ),
    "a combo stops suppressing its own restated price": (
        [("                if is_combo and (cls not in PRICED_CLASSES\n"
          "                                 or not _other_prices(clause, price)):",
          "                if is_combo and cls not in PRICED_CLASSES:")],
        ["a combo restating its own price is still dropped"],
    ),
    "the add verb beats a named option list again": (
        [('        if ":" in clause and re.search(r"[:,][^:]*\\bor\\b|:.*,", clause, re.I):',
          "        if False:")],
        ["a named option list beats the add verb"],
    ),
    "the pairing veto removed": (
        [("    if PAIRING.search(clause):", "    if False:")],
        ["a priced pairing is vetoed, visibly"],
    ),
    "the section rule widened to sides and sauces": (
        [(r'ADDON_SECTION = re.compile(r"\b(?:extras?|add[\s-]?ons?)\b", re.I)',
          r'ADDON_SECTION = re.compile(r"\b(?:extras?|add[\s-]?ons?|sides?|sauces?|dips?|'
          r'toppings?)\b", re.I)')],
        ["a section named for a sauce is not a sauce group",
         "a mixed Sides section reports rows, not the section"],
    ),
    "the clause splitter cuts a price in half": (
        [(r'CLAUSE_SPLIT = re.compile(r"(?<!\d)\.|\.(?!\d)|;|\n")',
          r'CLAUSE_SPLIT = re.compile(r"\.|;|\n")')],
        ["a +$N inside the pub group's stock idiom is found"],
    ),
    "a combo classified per clause again": (
        [("                if is_combo and (cls not in PRICED_CLASSES\n"
          "                                 or not _other_prices(clause, price)):",
          "                if False:")],
        ["a combo is flagged once, not once per sentence"],
    ),
    "the condiment-row rule removed": (
        [("            elif (CONDIMENT_NAME.search(iname) and isinstance(price, (int, float))",
          "            elif (False and CONDIMENT_NAME.search(iname) and isinstance(price, (int, float))")],
        ["a mixed Sides section reports rows, not the section"],
    ),
}


def run_case(work, name, verbose=False):
    """Apply a case's mutations, run the tool, restore, and return a complaint."""
    argv, edits, expect_rc, check = CASES[name]
    pristine = {p: p.read_bytes() for p in (work / "site/data").rglob("*.json")}
    try:
        for subject_rel, old, new in edits:
            subject = work / subject_rel
            raw = subject.read_text(encoding="utf-8")
            if old not in raw:
                return f"MUTATION MATCHED NOTHING in {subject_rel}"
            subject.write_text(raw.replace(old, new, 1), encoding="utf-8")

        # Two runs: --json for the structural assertions, plain for the prose the
        # human actually reads (the veto lines are only in the plain one).
        proc = subprocess.run([sys.executable, TOOL, *argv, "--json"], cwd=work,
                              capture_output=True, text=True, timeout=180)
        if proc.returncode != expect_rc:
            return f"exit {proc.returncode}, expected {expect_rc}: {(proc.stderr or proc.stdout)[:90]}"
        plain = subprocess.run([sys.executable, TOOL, *argv], cwd=work,
                               capture_output=True, text=True, timeout=180)
        out = proc.stdout + proc.stderr + plain.stdout + plain.stderr
        try:
            found = json.loads(proc.stdout) if proc.returncode == 0 else []
        except json.JSONDecodeError as exc:
            return f"--json did not produce JSON: {exc}"
        if verbose:
            for f in found:
                print(f"       | {f['cls']:<24} {f['where']:<34} {f['text'][:60]}")
        return check(found, out)
    finally:
        for path, data in pristine.items():
            path.write_bytes(data)


def check_scan_writes_nothing(work):
    """It is a reporter. If it can write, every other guarantee is off."""
    before = {p: p.read_bytes() for p in (work / "site/data").rglob("*.json")}
    proc = subprocess.run([sys.executable, TOOL], cwd=work,
                          capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        return f"a full scan exited {proc.returncode} — it reports, it does not gate"
    changed = [p.name for p, data in before.items() if p.read_bytes() != data]
    if changed:
        return f"the reporter wrote to {changed}"
    if 'add_argument("--apply"' in (ROOT / TOOL).read_text(encoding="utf-8"):
        return "the tool has grown an --apply; conversion is a judgement per row"
    return None


def check_every_class_routes(work):
    """Every class the tool can emit must name the theme that owns it — the
    routing IS the finding, so a class with no route is a class nobody can act
    on."""
    proc = subprocess.run([sys.executable, TOOL, "--json"], cwd=work,
                          capture_output=True, text=True, timeout=180)
    found = json.loads(proc.stdout)
    unrouted = sorted({f["cls"] for f in found if not f["theme"]})
    if unrouted:
        return f"classes with no theme: {unrouted}"
    seen = {f["cls"] for f in found}
    if len(seen) < 12:
        return f"only {len(seen)} of the 12 classes ever fire: {sorted(seen)}"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's findings")
    args = ap.parse_args()

    failures = []
    with tempfile.TemporaryDirectory(prefix="faves-findaddons-") as tmp:
        work = Path(tmp) / "repo"
        work.mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")

        for label, fn in (("a scan writes nothing", check_scan_writes_nothing),
                          ("every class names its theme", check_every_class_routes)):
            complaint = fn(work)
            print(f"  {'❌' if complaint else '✅'} {label:56} {complaint or 'clean'}")
            if complaint:
                failures.append(label)

        for name in CASES:
            complaint = run_case(work, name, args.verbose)
            print(f"  {'❌' if complaint else '✅'} {name:56} {complaint or 'as specified'}")
            if complaint:
                failures.append(name)

        # …and now break it on purpose.
        tool = work / TOOL
        good = tool.read_text(encoding="utf-8")
        for bug, (edits, covered) in BREAKERS.items():
            broken = good
            for old, new in edits:
                if old not in broken:
                    broken = None
                    break
                broken = broken.replace(old, new, 1)
            if broken is None:
                print(f"  ❌ {('break: ' + bug):56} PATCH MATCHED NOTHING — the "
                      "code moved and this breaker is now decorative")
                failures.append(f"breaker {bug}")
                continue
            tool.write_text(broken, encoding="utf-8")
            try:
                survived = [c for c in covered if run_case(work, c) is None]
            finally:
                tool.write_text(good, encoding="utf-8")
            ok = not survived
            print(f"  {'✅' if ok else '❌'} {('break: ' + bug):56} "
                  f"{'caught' if ok else 'PASSED WITH THE BUG BACK: ' + ', '.join(survived)}")
            if not ok:
                failures.append(f"breaker {bug}")

    if failures:
        print(f"\n{len(failures)} failure(s): {', '.join(failures)}", file=sys.stderr)
        return 1
    print(f"\nAll {len(CASES) + len(BREAKERS) + 2} cases behaved as specified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
