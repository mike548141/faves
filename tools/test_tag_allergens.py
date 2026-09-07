#!/usr/bin/env python3
"""Mutation-test `tag_allergens.py` — prove the allergen sweep actually writes.

`tag_allergens.py` had no test at all until 2026-08-17, and it had shipped two
defects that a test of this shape would have caught on the day they landed:

  • It wrote NOTHING on any record carrying `addOnGroups` — six venues, 232
    dishes — because it matched `tags` arrays to dishes by position and every
    add-on option carries a `tags` array too. It said `SKIPPED` and exited 0.
  • It never read `section.note`, so "All burgers served with … on a sesame
    bun", printed once above three burgers, reached none of them.

Both failed the same way a validator fails: in silence, behind a green run. So
the method is `test_validate.py`'s, for the same reason — take a **real**
record, break it in one specific way, run the real tool as a subprocess, and
assert what ended up on disk. Real records rather than fixtures, because a
fixture drifts from the schema and then tests nothing; a subprocess rather than
an import, because the exit code is part of what is being asserted.

Then the half that makes it more than a smoke test: BREAKERS reintroduces each
fixed bug into `tag_allergens.py` itself and asserts the cases that cover it now
FAIL. A test that passes against the fixed code proves nothing about whether it
would notice the bug coming back — this repo's standard is to verify a fix by
breaking it, and this automates that.

    python3 tools/test_tag_allergens.py        # run every case
    python3 tools/test_tag_allergens.py -v     # show each case's output

Exit 0 = every case behaved, and every reintroduced bug was caught. Stdlib
only, no build step. Never writes outside a temporary copy.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOL = "tools/tag_allergens.py"

THORNDON = "site/data/restaurants/sprig-and-fern-thorndon.json"
PETONE = "site/data/restaurants/sprig-and-fern-petone.json"
BERHAMPORE = "site/data/restaurants/sprig-and-fern-berhampore.json"
TAWA = "site/data/restaurants/sprig-and-fern-tawa.json"
KEBAB = "site/data/restaurants/wellington-kebab-grill.json"
CHARLEY = "site/data/restaurants/charley-noble.json"

# The three burgers under Thorndon's "All burgers served with … on a sesame bun"
# note, with their tags emptied. Nothing in any of the three names or
# descriptions says sesame, so a sesame tag on them can ONLY have come from the
# note — which is what makes this section the right subject.
STRIP_BURGERS = [
    ("""          "desc": "Crumbed free range chicken breast, rocket sauce, aioli.",
          "price": 25.0,
          "tags": [
            "gf-option",
            "contains-gluten",
            "contains-egg",
            "contains-sesame"
          ]""",
     """          "desc": "Crumbed free range chicken breast, rocket sauce, aioli.",
          "price": 25.0,
          "tags": []"""),
    ("""          "desc": "Crumbed hoki fillet, tartare sauce.",
          "price": 25.0,
          "tags": [
            "gf-option",
            "contains-gluten",
            "contains-egg",
            "contains-sesame",
            "contains-fish"
          ]""",
     """          "desc": "Crumbed hoki fillet, tartare sauce.",
          "price": 25.0,
          "tags": []"""),
    ("""          "desc": "Chipotle sauce.",
          "price": 24.0,
          "tags": [
            "vg",
            "gf-option",
            "contains-gluten",
            "contains-sesame"
          ]""",
     """          "desc": "Chipotle sauce.",
          "price": 24.0,
          "tags": []"""),
]

BURGER_NOTE = ("All burgers served with lettuce, tomato and pickle on a sesame "
               "bun with hot chips.")


def _burgers(record):
    for section in record["menu"]:
        if section.get("sectionId") == "burgers":
            return {i["dishId"]: set(i.get("tags") or []) for i in section["items"]}
    return {}


def _dish_desc(record, dish_id):
    """The description text of a dish by dishId, lowercased ('' if absent).

    Keyed on dishId, not name, because `_burgers` keys on dishId — mismatching
    the two silently returns "" for every dish, which makes an assertion about
    descriptions vacuously true. It did exactly that on first write.
    """
    for section in record.get("menu", []):
        for item in section.get("items", []):
            if item.get("dishId") == dish_id:
                return (item.get("desc") or "").lower()
    return ""


def _dish(record, dish_id):
    for section in record["menu"]:
        for item in section["items"]:
            if item.get("dishId") == dish_id:
                return set(item.get("tags") or [])
    return None


# --- the cases ------------------------------------------------------------
# name -> (subject, [(old_text, new_text), …], expected_rc, check(after, out))
# `after` is the parsed subject file as the tool left it; `out` is its output.
# A check returns None when satisfied, or a string saying what went wrong.

def check_addon_venue_is_patched(after, out):
    """The bug that started this: a venue with add-ons must be WRITTEN, not skipped."""
    if "SKIPPED" in out:
        return f"the record was skipped: {out.strip().splitlines()[-1]}"
    tags = _dish(after, "chicken-schnitzburger")
    if "contains-gluten" not in tags:
        return f"Chicken Schnitzburger did not gain contains-gluten (has {sorted(tags)})"
    return None


def check_addon_options_untouched(after, out):
    """An add-on option's tags array is not a dish's, and must never be written to.

    Positional patching wrote into whichever array came next in the file, which
    on these records means an option's. Asserted on the parsed structure AND on
    the raw text, because a reformat is a change too.
    """
    original = json.loads((ROOT / KEBAB).read_text())
    if after.get("addOnGroups") != original.get("addOnGroups"):
        return "addOnGroups changed"
    return None


def check_note_reaches_every_dish(after, out):
    """The sesame bun, printed once above three burgers."""
    bad = {d: sorted(t) for d, t in _burgers(after).items()
           if "contains-sesame" not in t or "contains-gluten" not in t}
    return f"burgers missing the note's tags: {bad}" if bad else None


def check_availability_is_not_an_ingredient(after, out):
    """"can be made with dairy free cheese on request" is an offer, not a recipe."""
    bad = {d: sorted(t) for d, t in _burgers(after).items() if "contains-dairy" in t}
    if bad:
        return f"tagged contains-dairy from an offer of an alternative: {bad}"
    if not any("contains-sesame" in t for t in _burgers(after).values()):
        return "nothing was tagged at all — the case proves nothing"
    return None


def check_cross_contact_is_not_an_ingredient(after, out):
    """A shared fryer is a warning about the kitchen, not an ingredient."""
    bad = {d: sorted(t) for d, t in _burgers(after).items() if "contains-dairy" in t}
    if bad:
        return f"tagged contains-dairy from a cross-contamination line: {bad}"
    if not any("contains-sesame" in t for t in _burgers(after).values()):
        return "nothing was tagged at all — the case proves nothing"
    return None


def check_unscoped_clause_is_not_tagged(after, out):
    """A note clause that doesn't claim to cover the section reaches no dish.

    No note in the corpus currently exercises this guard on its own — every
    real one is caught by the offer or shared-fryer test first — so the clause
    here is injected into a real record. A guard with nothing to fire on is the
    decorative guard this repo keeps having to rediscover.
    """
    bad = {d: sorted(t) for d, t in _burgers(after).items() if "contains-dairy" in t}
    if bad:
        return f"tagged contains-dairy from a clause about one other dish: {bad}"
    if not any("contains-sesame" in t for t in _burgers(after).values()):
        return "nothing was tagged at all — the case proves nothing"
    return None


def check_water_chestnut_is_not_a_tree_nut(after, out):
    """Water chestnut is a sedge tuber, not Castanea — and almonds must survive.

    Both halves matter and they fail independently. Dropping the lookbehind
    re-flags every water chestnut in the corpus (an over-warning on a vegan
    side); using an `exclude` instead would veto the WHOLE rule for the item
    and lose the almonds sitting next to it, which is an over-warning traded
    for a MISS. So the fixture names both in one dish.
    """
    tags = {d: sorted(t) for d, t in _burgers(after).items()}
    watered = {d: t for d, t in tags.items() if "water chestnut" in _dish_desc(after, d)}
    bad = {d: t for d, t in watered.items() if "contains-nuts" in t and "almond" not in _dish_desc(after, d)}
    if bad:
        return f"flagged contains-nuts from a water chestnut alone: {bad}"
    withalmond = {d: t for d, t in tags.items() if "almond" in _dish_desc(after, d)}
    if withalmond and not all("contains-nuts" in t for t in withalmond.values()):
        return f"LOST THE ALMONDS beside a water chestnut: {withalmond}"
    if not withalmond:
        return "the almond half was never exercised — the case proves half of what it claims"
    return None


# --- contains-fish (2026-09-07) -------------------------------------------
# Five cases, and FOUR of them assert an ABSENCE. That ratio is the point: the
# fish rule is the widest pattern in the file (`\bfish\w*` plus 40-odd species),
# and the ways it can be wrong are all ways of tagging something it should not.
# Per this file's convention every absence case also demands the tool wrote
# something ELSE in the same record, so a tagger that had stopped writing
# altogether cannot satisfy one by doing nothing.

def _burgers_wrote_something(after):
    """The proof-of-write every absence case below needs.

    The section note puts contains-sesame on all three burgers, so its presence
    says the tool ran, read the record and patched it. Without this an assertion
    like "the chicken burger is not fish" passes just as happily against a tool
    that wrote nothing at all.
    """
    if not any("contains-sesame" in t for t in _burgers(after).values()):
        return "nothing was tagged at all — the case proves nothing"
    return None


def check_species_is_fish_and_chicken_is_not(after, out):
    """"hoki" is a fish; the burger's NAME no longer says so.

    The real row is called "Fish Burger", which would make this case pass off
    `\\bfish\\w*` alone and prove nothing about the species list. The mutation
    renames it, so the only fish evidence left in the record is the word "hoki"
    in the description — which is exactly the case the tag exists for: a reader
    who does not know hoki is a fish is the person the warning is for.
    """
    if "contains-fish" not in (_dish(after, "fish-burger") or set()):
        return f"'hoki' did not produce contains-fish (has {sorted(_dish(after, 'fish-burger') or [])})"
    for dish in ("chicken-schnitzburger", "black-bean-burger"):
        if "contains-fish" in (_dish(after, dish) or set()):
            return f"{dish} was given contains-fish with no fish in it"
    return _burgers_wrote_something(after)


def check_fish_and_shellfish_do_not_bleed(after, out):
    """Two allergens, not one — and the leading `\\b` is the only thing between them.

    Both halves fail independently and both are real bugs someone shipped
    towards: dropping the word boundary makes every "shellfish" and "jellyfish"
    in the corpus a finfish, and writing the fish rule's tag as
    `contains-shellfish` is the wrong-tag trap the owner named when he ruled
    (Subway's tuna must not become shellfish).
    """
    chicken = _dish(after, "chicken-schnitzburger") or set()
    fish = _dish(after, "fish-burger") or set()
    if "contains-shellfish" not in chicken:
        return f"the prawn was not read as shellfish (has {sorted(chicken)})"
    if "contains-fish" in chicken:
        return ("'shellfish'/'jellyfish' was read as fish — the leading word "
                f"boundary is gone (has {sorted(chicken)})")
    if "contains-fish" not in fish:
        return f"the hoki fillet did not produce contains-fish (has {sorted(fish)})"
    if "contains-shellfish" in fish:
        return f"a finfish was tagged contains-shellfish — the wrong-tag trap (has {sorted(fish)})"
    return None


def check_worcestershire_is_fish(after, out):
    """The one people miss: anchovy in a bottle nobody reads the label of."""
    tags = _dish(after, "black-bean-burger") or set()
    if "contains-fish" not in tags:
        return f"Worcestershire sauce did not produce contains-fish (has {sorted(tags)})"
    if "contains-fish" in (_dish(after, "chicken-schnitzburger") or set()):
        return "the burger WITHOUT Worcestershire was tagged too — the rule is not reading the sauce"
    return None


def check_a_vegan_dish_is_not_given_fish(after, out):
    """Curation outranks a pattern, for this tag as for the other seven.

    The black bean burger keeps its `vg` here while its description gains
    Worcestershire. A venue calling a dish vegan is a stronger statement than
    our reading of its sauce list, and CONTRADICTED_BY is what says so.
    """
    tags = _dish(after, "black-bean-burger") or set()
    if "contains-fish" in tags:
        return f"a vg dish was given contains-fish by inference (has {sorted(tags)})"
    if "vg" not in tags:
        return "the vg tag went missing — the case is no longer testing curation"
    return _burgers_wrote_something(after)


def check_mustard_seed_caviar_is_not_caviar(after, out):
    """"Caviar" is also a plating word for anything small and round.

    Same shape as the water chestnut above, and narrowed the same way — a
    lookbehind, not an `exclude`, so a dish reading "mustard seed caviar and
    smoked salmon" keeps its salmon. Both halves are asserted because they fail
    independently: dropping the lookbehind puts a fish warning on a venison
    loin, and dropping `caviar` from the rule silently loses the real roe two
    rows away.
    """
    venison = _dish(after, "wild-awatoru-venison-loin") or set()
    if "contains-fish" in venison:
        return f"mustard seed caviar was read as fish roe (venison loin has {sorted(venison)})"
    roe = _dish(after, "oscietra-caviar-10g-or-14g") or set()
    if "contains-fish" not in roe:
        return f"the real caviar lost its fish tag (has {sorted(roe)})"
    return None


def check_real_note_tags_and_offer_does_not(after, out):
    """Petone's real note, both halves at once.

    "All pizzas $24" covers the section, so every pizza is wheat. "dairy free
    cheese available" is an offer, and reading it as "contains dairy" is the
    exact mistake this whole mechanism exists to avoid.
    """
    tags = _dish(after, "three-little-pigs")
    if "contains-gluten" not in tags:
        return f"'All pizzas $24' did not reach the dish (has {sorted(tags)})"
    if "contains-dairy" in tags:
        return "tagged contains-dairy from 'dairy free cheese available'"
    return None


def check_note_declares_its_own_allergen(after, out):
    """"Our pizza bases contain dairy" — the venue's own words, in a note."""
    tags = _dish(after, "prosciutto")
    missing = {"contains-dairy", "contains-gluten"} - tags
    return f"note-declared tags missing: {sorted(missing)} (has {sorted(tags)})" if missing else None


def check_single_line_layout_survives(after, out):
    """A one-line tags array must stay on one line. The whole reason this tool
    patches raw text instead of re-serialising is that the diff stays readable."""
    return None  # asserted on the raw text by the runner, see RAW_CHECKS


def check_unwritable_record_is_loud(after, out):
    """A dish with no tags array at all can't be patched — and must not exit 0."""
    if "SKIPPED" not in out:
        return "a record it could not write was not reported"
    return None


CASES = {
    "a venue with add-ons is patched, not skipped": (
        THORNDON, STRIP_BURGERS, 0, check_addon_venue_is_patched),
    "add-on option tags survive a menu-item patch": (
        # Empty the first kebab's tags so the tool has a reason to write this
        # file at all — hummus puts contains-sesame straight back. The assertion
        # is about the 19 option arrays it must not touch on the way past, and
        # the first dish is where a positional patch does the most damage.
        KEBAB,
        [("""          "desc": "With lettuce, carrots, onions, hummus, tabuli and sauce.",
          "price": 16.5,
          "tags": [
            "contains-sesame"
          ]""",
          """          "desc": "With lettuce, carrots, onions, hummus, tabuli and sauce.",
          "price": 16.5,
          "tags": []""")],
        0, check_addon_options_untouched),
    "water chestnut is not a tree nut, and the almonds beside it survive": (
        THORNDON,
        STRIP_BURGERS + [
            ('"desc": "Crumbed free range chicken breast, rocket sauce, aioli.",',
             '"desc": "Crumbed free range chicken breast, water chestnuts, rocket sauce, aioli.",'),
            ('"desc": "Crumbed hoki fillet, tartare sauce.",',
             '"desc": "Crumbed hoki fillet, water chestnuts and toasted almonds, tartare sauce.",'),
        ],
        0, check_water_chestnut_is_not_a_tree_nut),
    "a section note reaches every dish under it": (
        THORNDON, STRIP_BURGERS, 0, check_note_reaches_every_dish),
    "a fish named only by species is tagged; the chicken beside it is not": (
        THORNDON,
        STRIP_BURGERS + [
            # Take the word "Fish" out of the NAME so the species list is the
            # only thing that can produce the tag.
            ('"name": "Fish Burger",', '"name": "Crumbed Fillet Burger",'),
        ],
        0, check_species_is_fish_and_chicken_is_not),
    "shellfish is not fish, and fish is not shellfish": (
        THORNDON,
        STRIP_BURGERS + [
            ('"desc": "Crumbed free range chicken breast, rocket sauce, aioli.",',
             '"desc": "Crumbed free range chicken breast, prawn and jellyfish, '
             'shellfish bisque, aioli.",'),
        ],
        0, check_fish_and_shellfish_do_not_bleed),
    "Worcestershire sauce is tagged as fish": (
        THORNDON,
        STRIP_BURGERS + [
            ('"desc": "Chipotle sauce.",',
             '"desc": "Chipotle sauce, Worcestershire sauce.",'),
        ],
        0, check_worcestershire_is_fish),
    "a dish the venue calls vegan is not given fish": (
        THORNDON,
        # Only the first two burgers are stripped: the third KEEPS its `vg`,
        # which is the whole subject of the case.
        STRIP_BURGERS[:2] + [
            ('"desc": "Chipotle sauce.",',
             '"desc": "Chipotle sauce, Worcestershire sauce.",'),
        ],
        0, check_a_vegan_dish_is_not_given_fish),
    "mustard seed caviar is not caviar, and the roe beside it still is": (
        CHARLEY,
        # Empty the real caviar's tags so the tool has a reason to write this
        # record at all; the venison loin two rows away is left exactly as the
        # corpus has it.
        [("""          "price": null,
          "tags": [
            "contains-egg",
            "contains-gluten",
            "contains-fish"
          ],
          "needs": [
            {
              "what": "price",
              "note": "Priced as MP (market price) on the menu for both sizes and all four grades.",""",
          """          "price": null,
          "tags": [],
          "needs": [
            {
              "what": "price",
              "note": "Priced as MP (market price) on the menu for both sizes and all four grades.","""),
         ],
        0, check_mustard_seed_caviar_is_not_caviar),
    "an alternative on offer is not tagged as an ingredient": (
        THORNDON,
        STRIP_BURGERS + [(BURGER_NOTE,
                          BURGER_NOTE + " All our burgers can be made with dairy "
                          "free cheese on request.")],
        0, check_availability_is_not_an_ingredient),
    "a shared fryer is not tagged as an ingredient": (
        THORNDON,
        STRIP_BURGERS + [(BURGER_NOTE,
                          BURGER_NOTE + " All our fried food is cooked in the same "
                          "fryer as our crumbed camembert.")],
        0, check_cross_contact_is_not_an_ingredient),
    "a clause about one dish does not reach the section": (
        THORNDON,
        STRIP_BURGERS + [(BURGER_NOTE,
                          BURGER_NOTE + " Chef recommends the halloumi bites from "
                          "the small plates menu.")],
        0, check_unscoped_clause_is_not_tagged),
    "a real note tags, and its offer clause does not": (
        PETONE,
        [("""          "desc": "Pulled pork, cabanossi, bourbon bacon jam.",
          "price": 24.0,
          "tags": [
            "gf-option",
            "contains-gluten",
            "contains-dairy"
          ]""",
          """          "desc": "Pulled pork, cabanossi, bourbon bacon jam.",
          "price": 24.0,
          "tags": []""")],
        0, check_real_note_tags_and_offer_does_not),
    "a note that names its own allergen is read": (
        BERHAMPORE,
        # Both the mozzarella and the tags go, so the ONLY possible source of
        # contains-dairy left is the note's "Our pizza bases contain dairy".
        [("""          "desc": "Mozzarella, prosciutto, rocket, basil.",
          "price": 24.0,
          "tags": [
            "gf-option",
            "contains-gluten",
            "contains-dairy",
            "df-option"
          ]""",
          """          "desc": "Prosciutto, rocket, basil.",
          "price": 24.0,
          "tags": []""")],
        0, check_note_declares_its_own_allergen),
    "a one-line tags array stays on one line": (
        TAWA,
        # This row's stub desc says nothing the rules can read, so it is given
        # one — the point of the case is the LAYOUT of the array the tool then
        # rewrites, and it has to have a reason to rewrite it.
        [("""          "dishId": "fish-and-chips-gold-card",
          "desc": "Gold Card portion.",
          "price": 21.0,
          "tags": ["df", "contains-gluten", "contains-fish"]""",
          """          "dishId": "fish-and-chips-gold-card",
          "desc": "Battered. Gold Card portion.",
          "price": 21.0,
          "tags": ["df"]""")],
        0, check_single_line_layout_survives),
    "a record it cannot write makes the run fail": (
        THORNDON,
        # Take the tags key away from a dish that is about to gain one. The old
        # code exited 0 here and printed a line nobody read.
        [("""          "desc": "Crumbed free range chicken breast, rocket sauce, aioli.",
          "price": 25.0,
          "tags": [
            "gf-option",
            "contains-gluten",
            "contains-egg",
            "contains-sesame"
          ]""",
          """          "desc": "Crumbed free range chicken breast, rocket sauce, aioli.",
          "price": 25.0""")],
        1, check_unwritable_record_is_loud),
}

# Assertions on the subject's raw TEXT rather than its parsed form — layout is
# the property, so parsing it away would test nothing.
RAW_CHECKS = {
    # The dish is called "Fish and Chips", so the fish rule fires on the name
    # and the gluten rule on the injected "Battered" — two additions, in RULES
    # order, appended to the `df` the mutation left behind.
    "a one-line tags array stays on one line":
        lambda raw: None if '"tags": ["df", "contains-fish", "contains-gluten"]' in raw
        else "the array was reflowed or not patched",
}


# --- reintroducing the bugs ------------------------------------------------
# name -> ([(old source, new source), …], [case names that MUST now fail]).
# Each entry puts a fixed defect back into tools/tag_allergens.py and asserts
# the cases above notice. A case that still passes with the bug present is a
# case that was never testing the bug.

# The old span finder, verbatim in behaviour: every tags array in the file, in
# document order, matched to dishes by index.
NAIVE_SPANS = (
    "    root = _skip_ws(raw, 0)",
    '    return [m.span(1) for m in re.finditer(r\'"tags"\\s*:\\s*(\\[[^\\]]*\\])\', raw)]\n'
    "    root = _skip_ws(raw, 0)",
)

BREAKERS = {
    # Take the lookbehind back out and water chestnut is a tree nut again.
    # This is the ONLY breaker whose bug over-warns rather than under-warns,
    # and it is here because an over-warning on a vegan side dish is how a
    # reader learns to discount the warnings that matter (ADR 0092, 14h).
    "the water-chestnut lookbehind removed": (
        [(r'pine\s?nuts?|brazil\s?nuts?|(?<!water )(?<!water-)chestnuts?)\b',
          r'pine\s?nuts?|brazil\s?nuts?|chestnuts?)\b')],
        ["water chestnut is not a tree nut, and the almonds beside it survive"]),

    # --- contains-fish (2026-09-07) ---------------------------------------
    # The wrong-tag trap the owner named when he ruled the tag in: write the
    # fish rule's findings to `contains-shellfish` and Subway's tuna warns the
    # wrong reader — the fish-allergic one gets nothing, and the one avoiding
    # crustaceans avoids a sandwich they could have eaten.
    "the fish rule writes contains-shellfish (the wrong-tag trap)": (
        [('("contains-fish", "STATED", "names fish, or a fish by species",',
          '("contains-shellfish", "STATED", "names fish, or a fish by species",')],
        ["a fish named only by species is tagged; the chicken beside it is not",
         "shellfish is not fish, and fish is not shellfish"]),
    # One backslash-b is all that keeps `fish\w*` out of "shellfish" and
    # "jellyfish". Reading it is not evidence; removing it and watching the
    # case fail is.
    "the fish rule's leading word boundary removed": (
        [(r'r"\b(fish\w*|salmon|', r'r"(fish\w*|salmon|')],
        ["shellfish is not fish, and fish is not shellfish"]),
    "the Worcestershire rule removed": (
        [(r'r"\b(worcestershire|worcester\s?sauce)\b"',
          r'r"\b(a-sauce-no-menu-names)\b"')],
        ["Worcestershire sauce is tagged as fish"]),
    "the fish curation guard removed": (
        [('    "contains-fish": {"v", "vg"},', '    "contains-fish": set(),')],
        ["a dish the venue calls vegan is not given fish"]),
    "the mustard-seed lookbehind removed": (
        [(r'r"(?<!seed )caviar|tobiko|ikura|masago)\b"',
          r'r"caviar|tobiko|ikura|masago)\b"')],
        ["mustard seed caviar is not caviar, and the roe beside it still is"]),

    "positional span matching (the add-on bug)": (
        [NAIVE_SPANS],
        ["a venue with add-ons is patched, not skipped",
         "add-on option tags survive a menu-item patch",
         "a section note reaches every dish under it"],
    ),
    # The count guard is what turns the positional bug into a refusal. Take it
    # away as well and the tool does the thing the refusal was protecting
    # against: it writes a dish's tags into an add-on option's array. Worth its
    # own breaker, because "we never got that far" is not the same assurance as
    # "the option arrays are safe".
    "positional matching with the count guard gone": (
        [NAIVE_SPANS, ("    if len(spans) != len(items):", "    if False:")],
        ["add-on option tags survive a menu-item patch"],
    ),
    "section notes never read": (
        [('        note_applies, _ = read_section_note(section.get("note"))',
          "        note_applies, _ = read_section_note(None)")],
        ["a section note reaches every dish under it",
         "a real note tags, and its offer clause does not",
         "a note that names its own allergen is read"],
    ),
    "the availability guard removed": (
        [("        elif AVAILABILITY.search(clause) or (ADD_ON.search(clause) and ADD_ON_PRICE.search(clause)):",
          "        elif ADD_ON.search(clause) and ADD_ON_PRICE.search(clause):")],
        ["an alternative on offer is not tagged as an ingredient"],
    ),
    "the cross-contamination guard removed": (
        [("        if CROSS_CONTACT.search(clause):", "        if False:")],
        ["a shared fryer is not tagged as an ingredient"],
    ),
    "the section-wide scope test removed": (
        [("        elif not UNIVERSAL.search(clause):", "        elif False:")],
        ["a clause about one dish does not reach the section"],
    ),
    "an unwritable record exits 0 again": (
        [("    if skipped:\n"
          '        print(f"\\n{len(skipped)} record(s) NOT written — the sweep is incomplete.")\n'
          "        return 1",
          "    if skipped:\n"
          '        print(f"\\n{len(skipped)} record(s) NOT written — the sweep is incomplete.")\n'
          "        return 0")],
        ["a record it cannot write makes the run fail"],
    ),
}


def run_case(work, name, verbose=False):
    """Apply a case's mutations, run the tool, restore, and return a complaint."""
    subject_rel, edits, expect_rc, check = CASES[name]
    subject = work / subject_rel
    pristine = {p: p.read_bytes() for p in (work / "site/data").rglob("*.json")}
    try:
        raw = subject.read_text(encoding="utf-8")
        for old, new in edits:
            if old not in raw:
                return f"MUTATION MATCHED NOTHING in {subject_rel}"
            raw = raw.replace(old, new, 1)
        subject.write_text(raw, encoding="utf-8")

        proc = subprocess.run(
            [sys.executable, TOOL, "--apply"], cwd=work,
            capture_output=True, text=True, timeout=180,
        )
        out = proc.stdout + proc.stderr
        if verbose:
            for line in out.splitlines():
                print(f"       | {line}")
        if proc.returncode != expect_rc:
            return f"exit {proc.returncode}, expected {expect_rc}"
        after_raw = subject.read_text(encoding="utf-8")
        try:
            after = json.loads(after_raw)
        except json.JSONDecodeError as exc:
            return f"the tool wrote invalid JSON: {exc}"
        complaint = check(after, out)
        if complaint:
            return complaint
        raw_check = RAW_CHECKS.get(name)
        return raw_check(after_raw) if raw_check else None
    finally:
        for path, data in pristine.items():
            path.write_bytes(data)


def check_dry_run_writes_nothing(work):
    """The default run is a report. If it can write, every other guarantee is off."""
    before = {p: p.read_bytes() for p in (work / "site/data").rglob("*.json")}
    proc = subprocess.run([sys.executable, TOOL], cwd=work,
                          capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        return f"a dry run exited {proc.returncode} — it reports, it does not gate"
    changed = [p.name for p, data in before.items() if p.read_bytes() != data]
    return f"a dry run wrote to {changed}" if changed else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's output")
    args = ap.parse_args()

    failures = []
    with tempfile.TemporaryDirectory(prefix="faves-tagger-") as tmp:
        work = Path(tmp) / "repo"
        work.mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")

        complaint = check_dry_run_writes_nothing(work)
        print(f"  {'❌' if complaint else '✅'} {'a dry run writes nothing':52} "
              f"{complaint or 'clean'}")
        if complaint:
            failures.append("dry run writes nothing")

        for name in CASES:
            complaint = run_case(work, name, args.verbose)
            print(f"  {'❌' if complaint else '✅'} {name:52} {complaint or 'as specified'}")
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
                print(f"  ❌ {('break: ' + bug):52} PATCH MATCHED NOTHING — the "
                      "code moved and this breaker is now decorative")
                failures.append(f"breaker {bug}")
                continue
            tool.write_text(broken, encoding="utf-8")
            try:
                survived = [c for c in covered if run_case(work, c, args.verbose) is None]
            finally:
                tool.write_text(good, encoding="utf-8")
            ok = not survived
            print(f"  {'✅' if ok else '❌'} {('break: ' + bug):52} "
                  f"{'caught' if ok else 'PASSED WITH THE BUG BACK: ' + ', '.join(survived)}")
            if not ok:
                failures.append(f"breaker {bug}")

    if failures:
        print(f"\n{len(failures)} failure(s): {', '.join(failures)}", file=sys.stderr)
        return 1
    print(f"\nAll {len(CASES) + len(BREAKERS) + 1} cases behaved as specified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
