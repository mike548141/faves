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
SIMMER = "site/data/restaurants/simmer.json"
ABRAKEBABRA = "site/data/restaurants/abrakebabra.json"
MCDONALDS = "site/data/restaurants/mcdonalds.json"

# --- the hedge (2026-09-07) -----------------------------------------------
# Simmer is the record the fault was MEASURED on, so it is the record the cases
# run against: `Gluten free toast` in Extras, and six cabinet items whose whole
# description is the venue's own "No added gluten."
#
# Every case below empties the Boysenberry tart's tags as well. It is not part
# of any assertion about hedges — it is the PROOF OF WRITE this file's absence
# cases all carry: `tarts?` is in the bakery rule, so the tag must come back,
# and without that a tagger which had stopped writing anything at all would
# satisfy "the gluten-free toast gained no gluten tag" perfectly.
STRIP_TART = [
    ("""          "name": "Boysenberry tart",
          "dishId": "boysenberry-tart",
          "price": 7.5,
          "tags": [
            "contains-gluten"
          ]""",
     """          "name": "Boysenberry tart",
          "dishId": "boysenberry-tart",
          "price": 7.5,
          "tags": []"""),
]

# A hedge and a REAL wheat item inside one clause, and the hedge comes first.
# Both words are alternatives of the SAME rule (the STATED wheat-product one),
# which is what makes this a probe of `first_unhedged` rather than of rule
# ordering: `pasta` is cancelled, `wheat` is not, and a guard that stopped at
# the first match would drop the rule and lose the croutons. "croutons" is
# deliberately not a rule word, so no second rule can rescue the case.
HEDGE_BESIDE_REAL = [
    ('''          "desc": "No added gluten.",
          "price": 9.5,
          "tags": []''',
     '''          "desc": "Gluten free pasta with wheat croutons.",
          "price": 9.5,
          "tags": []'''),
]

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


# --- the hedge (2026-09-07) -----------------------------------------------

def _tart_wrote_something(after):
    """The proof-of-write every hedge case needs. See STRIP_TART."""
    tags = _dish(after, "boysenberry-tart") or set()
    if "contains-gluten" not in tags:
        return ("the Boysenberry tart did not get its gluten tag back — the tool "
                f"wrote nothing here and the case proves nothing (has {sorted(tags)})")
    return None


def check_a_hedged_name_gains_no_warning(after, out):
    """`Gluten free toast` is the one item a coeliac is hunting for.

    The rule matches "toast" and the negation sits two words in front of it,
    unlooked at — measured during the Simmer intake, not imagined. A false
    gluten warning here is not the usual harmless over-warning: the way a reader
    "fixes" it is by learning to distrust the gluten chips.
    """
    tags = _dish(after, "gluten-free-toast") or set()
    if "contains-gluten" in tags:
        return f"warned that GLUTEN FREE TOAST contains gluten (has {sorted(tags)})"
    return _tart_wrote_something(after)


def check_a_declared_free_dish_gains_no_warning(after, out):
    """"No added gluten." is the venue speaking about the whole dish.

    Six cabinet items say exactly that and nothing else, and the tool proposed
    `contains-gluten` on the two whose NAME is a bakery word. Read the way a `gf`
    tag is read — curation outranks a pattern — but per-allergen, so the
    feta salad keeps its dairy.
    """
    bad = {
        dish: sorted(_dish(after, dish) or [])
        for dish in ("brownie", "spiced-ginger-love-muffin", "breakfast-bite",
                     "vege-bite", "pumpkin-beetroot-chickpea-feta-salad",
                     "roast-vege-salad")
        if "contains-gluten" in (_dish(after, dish) or set())
    }
    if bad:
        return f"contradicted the venue's own printed 'No added gluten': {bad}"
    salad = _dish(after, "pumpkin-beetroot-chickpea-feta-salad") or set()
    if "contains-dairy" not in salad:
        return ("the feta salad lost its DAIRY tag — the guard vetoed the whole "
                f"item instead of one allergen (has {sorted(salad)})")
    return _tart_wrote_something(after)


def check_a_hedge_does_not_cancel_a_real_item_beside_it(after, out):
    """THE case the obvious fix fails. "Gluten free pasta with wheat croutons."

    Two ways to get this wrong, and both are a MISS rather than an over-warning
    — the one direction this tool may never move:
      • stop at the first match, and the cancelled `pasta` takes the rule down
        with it and the wheat croutons go unwarned;
      • un-anchor the free-from clause test, and it becomes an item-level veto
        that silences the dish because the words "gluten free" appear anywhere
        in it. That is the water-chestnut fault with the polarity reversed.
    The toast is re-asserted in the same breath, so a "fix" that simply switches
    the hedge guard off cannot pass this case either.
    """
    salad = _dish(after, "roast-vege-salad") or set()
    if "contains-gluten" not in salad:
        return ("LOST THE WHEAT CROUTONS standing beside a hedge — an "
                f"over-warning traded for a miss (has {sorted(salad)})")
    toast = _dish(after, "gluten-free-toast") or set()
    if "contains-gluten" in toast:
        return f"the hedge guard is off — gluten free toast was warned about ({sorted(toast)})"
    return _tart_wrote_something(after)


def check_single_line_layout_survives(after, out):
    """A one-line tags array must stay on one line. The whole reason this tool
    patches raw text instead of re-serialising is that the diff stays readable."""
    return None  # asserted on the raw text by the runner, see RAW_CHECKS


def check_unwritable_record_is_loud(after, out):
    """A dish with no tags array at all can't be patched — and must not exit 0."""
    if "SKIPPED" not in out:
        return "a record it could not write was not reported"
    return None


def check_a_plural_rule_word_is_tagged(after, out):
    """"Cheesy toasties" — the row the plural fault was reported against.

    `toastie` is a rule word and it tagged "Corn Cheese Toastie" at another
    venue on the same day; the shared trailing `\\b` is what refused the plural.
    Run against the real record rather than a probe because the whole path —
    scan, match, patch, write — is what has to produce the tag.

    `contains-dairy` is the proof of write and it is the RIGHT control: it comes
    from "Cheesy", which the matcher could always see. Remove the plural
    mechanism and the dairy still returns while the gluten does not, so the case
    fails for the one reason it exists for.
    """
    tags = _dish(after, "cheesy-toasties-chips-and-a-drink") or set()
    if "contains-dairy" not in tags:
        return ("the tool wrote nothing to this row — the case proves nothing "
                f"(has {sorted(tags)})")
    if "contains-gluten" not in tags:
        return f"'Cheesy toasties' did not produce contains-gluten (has {sorted(tags)})"
    return None


# --- the PHOTO tier, end to end (2026-09-09, ADR 0114, roadmap 080/210) -----
# The probes below prove the RULE. This proves the PATH, on the record the tier
# was ruled for: McDonald's, 41 items, no description on any of them, every one
# carrying `needs: allergens`.
#
# 🔑 The two mutations are deliberately asymmetric and that is the whole case.
# Big Mac loses its tags and keeps its caveat, so the caption must put all three
# back. Quarter Pounder loses its tags AND its caveat, so the caption must put
# NOTHING back — and the two rows carry near-identical captions, so nothing but
# the gate can tell them apart. Either half alone is satisfiable by a tool that
# is broken in the other direction.


def check_a_caption_tags_only_behind_the_caveat(after, out):
    """The PHOTO tier's two halves, on one record, in one run.

    Big Mac keeps its `needs: allergens` and must regain all three tags from its
    caption. Quarter Pounder has the caveat removed and must regain NONE — its
    caption names the same cheese, the same sesame seed bun. And the refusal has
    to be PRINTED: a tag the tool could see and chose not to write is exactly
    the kind of decision this repo has twice let disappear behind a green line.
    """
    big = _dish(after, "big-mac") or set()
    want = {"contains-gluten", "contains-dairy", "contains-sesame"}
    if not want <= big:
        return (f"the caption did not put {sorted(want - big)} back on the Big Mac "
                f"— the tool wrote nothing here and the case proves nothing "
                f"(has {sorted(big)})")
    qp = _dish(after, "quarter-pounder") or set()
    if qp:
        return ("a caption tagged a row carrying NO `needs: allergens` caveat — the "
                f"weaker tier landed where the page claims a confirmed allergen "
                f"picture (has {sorted(qp)})")
    if "REFUSED" not in out:
        return "the withheld PHOTO tags were not reported — a silent refusal"
    return None


CASES = {
    "a caption tags only behind the unconfirmed-allergens caveat": (
        MCDONALDS,
        [# Big Mac: tags emptied, caveat kept.
         ("""          "tags": [
            "contains-gluten",
            "contains-dairy",
            "contains-sesame"
          ]
        },
        {
          "name": "Quarter Pounder",""",
          """          "tags": []
        },
        {
          "name": "Quarter Pounder","""),
         # Quarter Pounder: tags emptied AND the caveat taken away.
         ("""            {
              "what": "allergens",
              "note": "No ingredient list was read for this record. A tag here is inferred from the dish name or from the caption written for its photograph — not from an ingredient list, and a photograph is not a promise about what you are served. No tag does not mean no allergen. Ask the counter.",
              "since": "2026-09-09"
            }
          ],
          "tags": [
            "contains-gluten",
            "contains-dairy",
            "contains-sesame"
          ]
        },
        {
          "name": "Double Quarter Pounder",""",
          """            {
              "what": "name",
              "since": "2026-09-09"
            }
          ],
          "tags": []
        },
        {
          "name": "Double Quarter Pounder","""),
         ],
        0, check_a_caption_tags_only_behind_the_caveat),
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
    "a hedged name gains no allergen warning": (
        SIMMER, STRIP_TART, 0, check_a_hedged_name_gains_no_warning),
    "the venue's own 'No added gluten' is not contradicted": (
        SIMMER, STRIP_TART, 0, check_a_declared_free_dish_gains_no_warning),
    "a hedge does not cancel a real wheat item beside it": (
        SIMMER, STRIP_TART + HEDGE_BESIDE_REAL, 0,
        check_a_hedge_does_not_cancel_a_real_item_beside_it),
    "an alternative on offer is not tagged as an ingredient": (
        THORNDON,
        # "or halloumi" was added 2026-09-07 with the hedge guard, and the
        # breaker below is why. The original clause was "…with dairy free cheese
        # on request", and once a hedge cancels the match on "cheese" that
        # clause is refused TWICE — so deleting the availability guard changed
        # nothing and its breaker passed with the bug back. Halloumi is an offer
        # with no negation in front of it, which leaves AVAILABILITY as the only
        # thing standing between it and the tag. The hedged half is kept so the
        # real sentence a venue writes is still exercised.
        STRIP_BURGERS + [(BURGER_NOTE,
                          BURGER_NOTE + " All our burgers can be made with dairy "
                          "free cheese or halloumi on request.")],
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
    "a plural rule word is tagged on a real record": (
        ABRAKEBABRA,
        [("""          "desc": "Cheesy toasties, chips and a 250ml drink.",
          "price": 12.5,
          "tags": [
            "v",
            "contains-dairy",
            "contains-gluten"
          ]""",
          """          "desc": "Cheesy toasties, chips and a 250ml drink.",
          "price": 12.5,
          "tags": [
            "v"
          ]""")],
        0, check_a_plural_rule_word_is_tagged),
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


# --- word probes (2026-09-08, roadmap 110/050) ------------------------------
# A CASE above proves the whole path — scan, match, patch, write — on one real
# record. A PROBE proves one RULE, on one line of text, and that is the right
# granularity for a vocabulary: eight new words and a plural mechanism need
# eight-plus answers, and eight real records to strip would be eight brittle
# text mutations that say less.
#
# The probes run the REAL rule set, in a subprocess, inside the work tree — so
# a BREAKER that has just rewritten `tools/tag_allergens.py` is what they read.
# Each group must contain at least one PRESENCE probe (enforced by the runner):
# a group that only asserts absences is satisfied perfectly by a tool that has
# stopped matching anything at all, which is this file's oldest lesson.
PROBE_DRIVER = """
import json, sys
sys.path.insert(0, "tools")
from tag_allergens import audit
out = []
for text in json.load(sys.stdin):
    record = {"menu": [{"items": [{"name": text, "tags": []}]}]}
    out.append(sorted({tag for _i, tag, _t, _w in audit(record)}))
json.dump(out, sys.stdout)
"""

# group name -> [(text, tags it MUST gain, tags it must NOT gain), …]
PROBES = {
    # (a) The eight words the tool had never heard of. Each line is the phrasing
    # the word was actually found in (roadmap 110/050's table), so a probe that
    # passes says the real menu row would have been tagged.
    "the eight missing food words are read": [
        ("Crusty baguette served with hot beef jus", {"contains-gluten"}, set()),
        ("Pulled pork on a soft hoagie roll", {"contains-gluten"}, set()),
        ("Wagyu steak sando", {"contains-gluten"}, set()),
        ("Toasted sourdough, candied jalapeños", {"contains-gluten"}, set()),
        ("Ranch, pancetta, herb crouton", {"contains-gluten"}, set()),
        # BOTH tags, because they are two independent rules on one fact. Delete
        # either and this line fails while the other tag still stands, which is
        # the property the pair was written apart for (ADR 0095's shape).
        ("Yorkshire pudding", {"contains-gluten", "contains-egg"}, set()),
        ("Six chicken nuggets, chips", {"contains-gluten"}, set()),
        ("Lamb kebab with tzatziki", {"contains-dairy"}, set()),
        # …and the narrowing that keeps the Yorkshire rule honest: a pudding is
        # not thereby wheat. A rice pudding is a rice pudding.
        ("Rice pudding", set(), {"contains-gluten", "contains-egg"}),
    ],
    # (a2) COMPOUND TAILS (2026-09-09, roadmap 080/160). A rule word may sit at
    # the END of a longer word — "Cheeseburger" — and the leading `\b` refused
    # every one of them. Each line below is a real corpus row.
    "a rule word at the end of a compound is read": [
        ("Cheeseburger", {"contains-gluten", "contains-dairy"}, set()),
        ("Double Cheeseburger", {"contains-gluten", "contains-dairy"}, set()),
        ("Hamburger", {"contains-gluten"}, set()),
        ("Schnitzburger", {"contains-gluten"}, set()),
        ("Sausage & Egg McMuffin", {"contains-gluten"}, set()),
        ("Chicken McNuggets (6 pack)", {"contains-gluten"}, set()),
    ],
    # (a3) 🛑 THE DANGEROUS HALF, AND THE ONLY REASON (a2) IS ALLOWED TO EXIST.
    # A compound tail opens the word's HEAD. Opening its TAIL instead — or
    # opening the head on a token that is merely a common English ENDING —
    # produces a false allergen warning, and on three of these rows it lands on
    # exactly the dish the reader was hunting for. Every string here is lifted
    # from the real corpus with the count `--compounds` reports, so a widening
    # that breaks one of them breaks a row that actually ships.
    #
    # Each entry names which boundary would have to fail for it to break:
    #   TAIL  — the token starts the word (eggplant, Bundaberg, edamame)
    #   HEAD  — the token ends the word (kale, buckwheat, kewpie)
    "a compound tail does not open the other boundary": [
        # TAIL: `egg` — the case ADR 0025's own comment names, 12 corpus rows.
        ("Eggplant parmigiana", set(), {"contains-egg"}),
        ("Grilled eggplants", set(), {"contains-egg"}),
        # TAIL: `bun` — 4 corpus rows, and the reason `bun` is NOT a tail even
        # though it sits in the same rule as `burger`, which is.
        ("Bundaberg Ginger Beer", set(), {"contains-gluten"}),
        ("A bunch of grapes", set(), {"contains-gluten"}),
        # TAIL: `edam` inside `edamame` — 7 rows, and it is a soy bean.
        ("Edamame beans", set(), {"contains-dairy"}),
        # HEAD: `ale` — 24 rows of kale/pale/royale/cardinale/vale. The single
        # widening that would do the most damage in this corpus.
        ("Kale and quinoa salad", set(), {"contains-gluten"}),
        ("Chook Royale", set(), {"contains-gluten"}),
        # HEAD: `wheat` and `flour`. Buckwheat and cornflour are BOTH gluten
        # free, so this is ADR 0097's harm — a false gluten warning on the row
        # a coeliac is specifically looking for — not an ordinary over-warning.
        ("Buckwheat soba noodles", set(), {"contains-gluten"}),
        ("Cornflour dusted squid", {"contains-shellfish"}, {"contains-gluten"}),
        # HEAD: `pie` inside `kewpie`, which is Japanese mayonnaise. The egg is
        # real and is asserted, so a tool that had stopped matching cannot pass.
        ("Kewpie mayonnaise", {"contains-egg"}, {"contains-gluten"}),
        # TAIL: `katsu` inside `katsuobushi`, which is dried bonito — no wheat.
        # This one is load-bearing for the tail that was REMOVED: see the
        # tonkatsu note in tag_allergens.py.
        ("Katsuobushi flakes", {"contains-fish"}, {"contains-gluten"}),
        # TAIL: `cheese` inside `cheeseless`, which is why `cheeseburger` is
        # spelled out in the dairy rule rather than reached by `cheese\\w*`.
        ("Cheeseless pizza base", {"contains-gluten"}, {"contains-dairy"}),
    ],
    # (b) The plural, once, for every rule.
    "a rule word matches its own plural": [
        ("Corn Cheese Toastie", {"contains-gluten"}, set()),
        ("Cheesy toasties", {"contains-gluten"}, set()),
        ("Two sandwiches", {"contains-gluten"}, set()),
        # `pastries` needs the -y -> -ies spelling in the rule; a suffix cannot
        # reach it. NOT "Danish pastries", because `danish` is a rule word of
        # its own and would carry the line with `pastry` deleted.
        ("Assorted pastries", {"contains-gluten"}, set()),
        ("Ranch, pancetta, herb croutons", {"contains-gluten"}, set()),
        ("Six chicken nuggets", {"contains-gluten"}, set()),
    ],
    # (c) 🛑 THE DANGEROUS HALF. Widening a rule's pattern without widening its
    # own `exclude` is not a smaller version of the fix — it is a NEW false
    # warning, on exactly the dishes the excludes were written for. Measured on
    # 2026-09-08 before the fix was finished: pattern-only widening puts
    # contains-dairy on "coconut yoghurts" and contains-gluten on "ginger
    # beers". Both are the over-warning ADR 0025 tolerates *in general* and the
    # water-chestnut ruling refuses *here*: a plant yoghurt warned about dairy
    # is a false warning on the one row a dairy-avoiding reader is hunting for.
    "the plural does not widen a rule past its own guard": [
        ("House granola with coconut yoghurts", set(), {"contains-dairy"}),
        ("Oat milks", set(), {"contains-dairy"}),
        ("Ginger beers", set(), {"contains-gluten"}),
        ("Rice cakes", set(), {"contains-gluten"}),
        ("Corn tortillas", set(), {"contains-gluten"}),
        # The controls. Without these a rule set that matched nothing at all
        # would satisfy every line above.
        ("Yoghurt and berries", {"contains-dairy"}, set()),
        ("A pint of lager", {"contains-gluten"}, set()),
    ],
    # (d) …and the other direction the plural can over-reach: `-es` after a
    # letter that never takes it in English. `cod` + `es` spells "codes", which
    # would be a FISH warning built out of a word with no food in it.
    "the plural does not invent a word out of -es": [
        ("Scan the QR codes on the table", set(), {"contains-fish"}),
        ("Boysenberry tartes", set(), {"contains-gluten"}),
        # The controls: the same two rules still read the real words.
        ("Blue cod, chips", {"contains-fish"}, set()),
        ("Boysenberry tart", {"contains-gluten"}, set()),
    ],
    # (e) 🛑 THE HEDGE, WIDENED (2026-09-09, roadmap 080/210). ADR 0097 swept
    # the corpus for free-from forms and reported that nothing but `X free` and
    # `no added X` existed. `gluten friendly` did exist, the sweep had not
    # looked for it, and BurgerFuel's `Gluten friendly bun` shipped
    # `contains-gluten` beside its own `gf-option` for a month — a false gluten
    # warning on the row a coeliac reads the menu to find, which is the one
    # over-warning ADR 0097 says is not fail-safe.
    #
    # The second line is the narrowness control and it is the important one: a
    # hedge cancels the match it stands in front of and NOTHING ELSE. Widen it
    # into an item-level veto and the wheat croutons go unwarned, which is an
    # over-warning traded for a MISS.
    "a hedge covers gluten FRIENDLY, not only gluten free": [
        ("Gluten friendly bun", set(), {"contains-gluten"}),
        ("Gluten friendly pizza with wheat croutons", {"contains-gluten"}, set()),
        # Not every softener is a hedge: `vegan friendly` is four corpus rows of
        # "Speak to staff to make it vegan friendly" and says nothing about an
        # allergen. The dairy has to survive it.
        ("Mushroom patty with mascarpone, vegan friendly on request",
         {"contains-dairy"}, set()),
    ],
    # (f) 🛑 A LETTUCE BUN IS A LETTUCE LEAF (2026-09-09, roadmap 080/210).
    # BurgerFuel's `Low Carborator lettuce bun` is the burger with the bread
    # taken away, and `\bbuns?\b` gave it `contains-gluten`. The lookbehind is
    # the water-chestnut shape and the third line is why it had to be one: four
    # corpus rows read "…milk bun, fries. No gluten added bun +$2.50 or lettuce
    # bun available", so an item-level `exclude` would have lost the MILK BUN.
    "a lettuce bun is a lettuce leaf": [
        ("Low Carborator lettuce bun", set(), {"contains-gluten"}),
        ("Beef patty in a lettuce bun with a side of garlic bread",
         {"contains-gluten"}, set()),
        ("150g brisket patty, American cheese, milk bun, fries. No gluten added "
         "bun or lettuce bun available", {"contains-gluten", "contains-dairy"}, set()),
    ],
}

# --- the PHOTO tier's probes (2026-09-09, ADR 0114, roadmap 080/210) --------
# A separate driver because the subject is a different FIELD and a different
# TIER, and both have to be asserted. Each line is
# (dish name, alt caption, does the row carry `needs: allergens`, want, forbid)
# and the answers are `tag@TIER` strings — because "the caption produced
# contains-sesame" is not the claim being made here. The claim is that it
# produced `contains-sesame@PHOTO`, and a tier nothing asserts is a tier that
# quietly becomes STATED in the next refactor.
ALT_PROBE_DRIVER = """
import json, sys
sys.path.insert(0, "tools")
from tag_allergens import audit
out = []
for name, alt, caveat in json.load(sys.stdin):
    item = {"name": name, "alt": alt, "tags": []}
    if caveat:
        item["needs"] = [{"what": "allergens"}]
    record = {"menu": [{"items": [item]}]}
    out.append(sorted({f"{tag}@{tier}" for _i, tag, tier, _w in audit(record)}))
json.dump(out, sys.stdout)
"""

ALT_PROBES = {
    # The five sesame burgers are the whole reason the owner ruled to read
    # captions: `contains-sesame` is a declarable New Zealand allergen and those
    # rows showed nothing. Every caption below is verbatim from the record.
    "a photo caption is read, and recorded as PHOTO": [
        ("Big Mac",
         "A Big Mac: two beef patties, lettuce, cheese, pickles and sauce in a "
         "three-layer sesame seed bun", True,
         {"contains-sesame@PHOTO", "contains-dairy@PHOTO", "contains-gluten@PHOTO"},
         # The tier is the substance of ADR 0114, so the STATED spelling of the
         # same tag is named as forbidden rather than left to be inferred from
         # the want set. `names sesame` is a STATED RULE; reading it off a
         # photograph does not make the EVIDENCE stated.
         {"contains-sesame@STATED", "contains-dairy@STATED", "contains-gluten@DERIVED"}),
        ("McChicken",
         "A McChicken: a crumbed chicken patty with lettuce and mayonnaise in a "
         "sesame seed bun", True,
         {"contains-sesame@PHOTO", "contains-egg@PHOTO", "contains-gluten@PHOTO"}, set()),
    ],
    # 🛑 THE DANGEROUS HALF. A caption is the weakest evidence in the corpus, so
    # it may only land on a row that already tells the reader its allergen
    # picture is unconfirmed. Both lines carry a caption naming a sesame seed
    # bun; only one carries the caveat, and nothing else separates them.
    "a caption is refused where the row claims a confirmed picture": [
        ("Quarter Pounder",
         "A Quarter Pounder: a thick beef patty with melted cheese, onion and "
         "pickles in a sesame seed bun", False,
         set(),
         {"contains-sesame@PHOTO", "contains-dairy@PHOTO", "contains-gluten@PHOTO"}),
        # The control, and it is doing real work: without it a tier that had
        # stopped reading captions altogether passes the line above perfectly.
        ("Quarter Pounder",
         "A Quarter Pounder: a thick beef patty with melted cheese, onion and "
         "pickles in a sesame seed bun", True,
         {"contains-sesame@PHOTO"}, set()),
    ],
    # A caption never RE-CLAIMS what the menu's own words already say. The tier
    # is an accounting as well as a guard: `--tier PHOTO`'s count has to be what
    # the photographs actually bought, not what they happened to repeat.
    "the menu's own words outrank the caption for the same tag": [
        ("Cheeseburger",
         "A cheeseburger: a beef patty with a slice of melted cheese, onion, "
         "pickle, ketchup and mustard in a soft bun", True,
         {"contains-gluten@DERIVED", "contains-dairy@STATED"},
         {"contains-gluten@PHOTO", "contains-dairy@PHOTO"}),
    ],
    # The four guards are the same four guards. A caption is text like any
    # other text, so a hedge inside one cancels the match it stands in front of
    # — and, exactly as in the menu's own words, cancels NOTHING ELSE.
    #
    # 🛑 BOTH dish names here are deliberately meaningless to the rules. Name
    # the first row "Toast" and its own NAME earns contains-gluten before the
    # caption is ever consulted, the caption's finding is deduped away, and the
    # probe passes with the hedge guard deleted.
    "the hedge guard reads a caption too": [
        ("Item one", "A plate of gluten free toast", True,
         set(), {"contains-gluten@PHOTO"}),
        ("Item two", "Gluten free bread beside a bowl of pasta", True,
         {"contains-gluten@PHOTO"}, set()),
    ],
}


def run_probes(work, name, verbose=False):
    """Run one PROBES group against the tool as it currently sits in `work`."""
    lines = PROBES[name]
    if not any(want for _t, want, _n in lines):
        return "the group asserts no PRESENCE — a tool matching nothing passes it"
    proc = subprocess.run(
        [sys.executable, "-c", PROBE_DRIVER], cwd=work, timeout=120,
        input=json.dumps([t for t, _w, _n in lines]), capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return f"the rule set would not load: {proc.stderr.strip().splitlines()[-1:]}"
    got = json.loads(proc.stdout)
    for (text, want, forbid), tags in zip(lines, got):
        if verbose:
            print(f"       | {text!r} -> {tags}")
        missing = want - set(tags)
        if missing:
            return f"{text!r} did not gain {sorted(missing)} (got {tags})"
        wrong = forbid & set(tags)
        if wrong:
            return f"{text!r} was given {sorted(wrong)} (got {tags})"
    return None


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

    # --- the hedge (2026-09-07) -------------------------------------------
    # Three breakers, one per way of getting this wrong. The first restores the
    # shipped fault; the other two restore the two "obvious fixes" for it, both
    # of which trade the over-warning for a MISS.
    "the adjacency half of the hedge guard removed": (
        [("    pattern = _HEDGE_BEFORE.get(tag)\n"
          "    return bool(pattern and pattern.search(text[:start]))",
          "    return False")],
        ["a hedged name gains no allergen warning",
         "a hedge does not cancel a real wheat item beside it"]),
    "the venue's free-from declaration ignored": (
        [("                if tag in declared:\n"
          "                    continue  # the venue's own printed free-from claim, ditto",
          "                if False:\n"
          "                    continue  # the venue's own printed free-from claim, ditto")],
        ["the venue's own 'No added gluten' is not contradicted"]),
    # `search` instead of `finditer`: a hedged FIRST occurrence takes the whole
    # rule down and the real wheat two words later goes unwarned.
    "the hedge cancels the whole rule, not one match": (
        [("    for match in pattern.finditer(text):",
          "    for match in list(pattern.finditer(text))[:1]:")],
        ["a hedge does not cancel a real wheat item beside it"]),
    # …and the item-level veto, which is the water-chestnut fault reversed:
    # un-anchor the clause test and any mention of "gluten free" anywhere in a
    # description silences the dish's gluten warning entirely.
    "the free-from clause test un-anchored into an item-level veto": (
        [("            if pattern.fullmatch(clause):", "            if pattern.search(clause):")],
        ["a hedge does not cancel a real wheat item beside it"]),

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
    # --- vocabulary and plurals (2026-09-08, roadmap 110/050) --------------
    # One breaker per added word. A word list is the easiest thing in this file
    # to add to and the easiest to lose in a merge, so each one has to be
    # individually load-bearing: delete it and exactly the group that names it
    # fails.
    "the baguette rule word removed": (
        [(r'r"baguette|hoagie|sourdough|crouton)\b"', r'r"hoagie|sourdough|crouton)\b"')],
        ["the eight missing food words are read"]),
    "the hoagie rule word removed": (
        [(r'r"baguette|hoagie|sourdough|crouton)\b"', r'r"baguette|sourdough|crouton)\b"')],
        ["the eight missing food words are read"]),
    "the sourdough rule word removed": (
        [(r'r"baguette|hoagie|sourdough|crouton)\b"', r'r"baguette|hoagie|crouton)\b"')],
        ["the eight missing food words are read"]),
    "the crouton rule word removed": (
        [(r'r"baguette|hoagie|sourdough|crouton)\b"', r'r"baguette|hoagie|sourdough)\b"')],
        ["the eight missing food words are read",
         "a rule word matches its own plural"]),
    "the nugget rule word removed": (
        [(r"|schnitzel|katsu|tempura|\w*nugget)\b", r"|schnitzel|katsu|tempura)\b")],
        ["the eight missing food words are read",
         "a rule word matches its own plural"]),
    "the sando rule word removed": (
        [(r"\w*burgers?|sandwich|sando|toast|", r"\w*burgers?|sandwich|toast|")],
        ["the eight missing food words are read"]),
    # --- compound tails (2026-09-09, roadmap 080/160) -----------------------
    # Reverting each tail must fail the group that reads it, and NOTHING else.
    "the burger compound tail reverted": (
        [(r"buns?|\w*burgers?|sandwich", r"buns?|burgers?|sandwich")],
        ["a rule word at the end of a compound is read"]),
    "the muffin compound tail reverted": (
        [(r"brownies?|\w*muffins?|scones?", r"brownies?|muffins?|scones?")],
        ["a rule word at the end of a compound is read"]),
    "the nugget compound tail reverted": (
        [(r"|schnitzel|katsu|tempura|\w*nugget)\b", r"|schnitzel|katsu|tempura|nugget)\b")],
        ["a rule word at the end of a compound is read"]),
    "the cheeseburger dairy word removed": (
        [(r"\b(cheese|cheesy|cheeseburgers?|butter", r"\b(cheese|cheesy|butter")],
        ["a rule word at the end of a compound is read"]),
    # 🛑 THE DANGEROUS BREAKERS. These do not remove a rule — they WIDEN one,
    # the way a future session reaching for "just drop the boundary" would, and
    # the absence group above has to catch every one. A widening that nothing
    # refuses is how `eggplant` gets an egg warning.
    "the tail boundary opened on egg (eggplant)": (
        [(r'("contains-egg", "STATED", "names egg", r"\beggs?\b"',
          r'("contains-egg", "STATED", "names egg", r"\begg\w*"')],
        ["a compound tail does not open the other boundary"]),
    "the tail boundary opened on bun (Bundaberg)": (
        [(r"(?<!lettuce )(?<!lettuce-)buns?|", r"(?<!lettuce )(?<!lettuce-)bun\w*|")],
        ["a compound tail does not open the other boundary"]),
    "the head boundary opened on ale (kale)": (
        [(r"\b(beer|lager|ale|stout|pilsner|porter|ipa|apa)\b",
          r"\b(beer|lager|\w*ale|stout|pilsner|porter|ipa|apa)\b")],
        ["a compound tail does not open the other boundary"]),
    "the head boundary opened on wheat (buckwheat)": (
        [(r"\b(bread|breaded|flour|wheat|barley", r"\b(bread|breaded|flour|\w*wheat|barley")],
        ["a compound tail does not open the other boundary"]),
    "the head boundary opened on pie (kewpie)": (
        [(r"sandwich|sando|toast|toastie|pies?|cakes?",
          r"sandwich|sando|toast|toastie|\w*pies?|cakes?")],
        ["a compound tail does not open the other boundary"]),
    "the tail boundary opened on cheese (cheeseless)": (
        [(r"\b(cheese|cheesy|cheeseburgers?|butter", r"\b(cheese\w*|cheesy|butter")],
        ["a compound tail does not open the other boundary"]),
    # The Yorkshire pair, one breaker each. Deleting the gluten rule must NOT
    # take the egg tag with it and vice versa — that is what "two rules, one
    # fact" buys, and a single rule emitting both tags would pass one of these
    # breakers by accident.
    "the Yorkshire gluten rule removed (the egg twin must survive)": (
        [('("contains-gluten", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",\n'
          '     r"\\byorkshire\\s?pudding\\b", None),',
          '("contains-gluten", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",\n'
          '     r"\\ba-dish-no-menu-names\\b", None),')],
        ["the eight missing food words are read"]),
    "the Yorkshire egg rule removed (the gluten twin must survive)": (
        [('("contains-egg", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",\n'
          '     r"\\byorkshire\\s?pudding\\b", None),',
          '("contains-egg", "DERIVED", "a Yorkshire pudding is a flour-and-egg batter",\n'
          '     r"\\ba-dish-no-menu-names\\b", None),')],
        ["the eight missing food words are read"]),
    "the tzatziki rule removed": (
        [(r'"tzatziki is a yoghurt dip", r"\btzatziki\b"',
          r'"tzatziki is a yoghurt dip", r"\ba-dip-no-menu-names\b"')],
        ["the eight missing food words are read"]),
    "the -y -> -ies spelling reverted to a bare pastry": (
        [(r"couscous|pastr(?:y|ies)|pasta|", r"couscous|pastry|pasta|")],
        ["a rule word matches its own plural"]),

    # The mechanism itself, broken three ways — the fault as reported, and the
    # two "obvious fixes" for it, both of which over-reach.
    "the plural mechanism removed (the fault as reported)": (
        [('PLURAL = r"(?:s|(?<=[sxz])es|(?<=[cs]h)es)?"', 'PLURAL = r""')],
        ["a rule word matches its own plural",
         "a plural rule word is tagged on a real record"]),
    # 🛑 THE DANGEROUS ONE. Widen the pattern, leave the exclude on the raw
    # form, and the guard that vetoes "coconut yoghurt" can no longer see
    # "coconut yoghurts". Measured before the fix landed: contains-dairy on a
    # plant yoghurt and contains-gluten on a ginger beer.
    "the plural widens the pattern but not the exclude": (
        [("    (tag, tier, why, compile_rule(pat), compile_rule(exc) if exc else None)",
          "    (tag, tier, why, compile_rule(pat), re.compile(exc, re.I) if exc else None)")],
        ["the plural does not widen a rule past its own guard"]),
    # …and the lazier suffix, which spells `cod` + `es`.
    "the plural allows -es after any letter": (
        [('PLURAL = r"(?:s|(?<=[sxz])es|(?<=[cs]h)es)?"', 'PLURAL = r"(?:e?s)?"')],
        ["the plural does not invent a word out of -es"]),

    "an unwritable record exits 0 again": (
        [("    if skipped:\n"
          '        print(f"\\n{len(skipped)} record(s) NOT written — the sweep is incomplete.")\n'
          "        return 1",
          "    if skipped:\n"
          '        print(f"\\n{len(skipped)} record(s) NOT written — the sweep is incomplete.")\n'
          "        return 0")],
        ["a record it cannot write makes the run fail"],
    ),

    # --- 2026-09-09, roadmap 080/210 ---------------------------------------
    # (1) The hedge back to ADR 0097's word list, which is the state that
    # shipped a false gluten warning on `Gluten friendly bun`.
    "the hedge narrowed back to gluten FREE only": (
        [(r'"contains-gluten": r"(?:gluten[\s-](?:free|friendly)|'
          r'no\s+(?:added\s+gluten|gluten\s+added))",',
          r'"contains-gluten": r"(?:gluten[\s-]free|'
          r'no\s+(?:added\s+gluten|gluten\s+added))",')],
        ["a hedge covers gluten FRIENDLY, not only gluten free"]),
    # (2) The lettuce lookbehind removed — `Low Carborator lettuce bun` is a
    # wheat bakery item again.
    "the lettuce-bun lookbehind removed": (
        [(r'r"\b((?<!lettuce )(?<!lettuce-)buns?|\w*burgers?|sandwich|',
          r'r"\b(buns?|\w*burgers?|sandwich|')],
        ["a lettuce bun is a lettuce leaf"]),
    # (3) 🛑 The one that would be easiest to "tidy" — recording a caption's
    # finding at the RULE's tier instead of PHOTO. Nothing on screen changes and
    # the same 34 tags land, so only an assertion about the tier can see it.
    "a caption's finding recorded at the rule's own tier": (
        [("""                (tag, "PHOTO", f'photo caption — {why} ({hit.group(0).lower()})')""",
          """                (tag, _rule_tier, f'photo caption — {why} ({hit.group(0).lower()})')""")],
        ["a photo caption is read, and recorded as PHOTO"]),
    # (4) The caveat gate removed. A caption then tags any row at all, including
    # one whose page says nothing about its allergen picture being unconfirmed —
    # which is the entire on-screen meaning of the weaker tier.
    "the unconfirmed-allergens gate removed": (
        [('                if rule_tier == "PHOTO" and not caveat:',
          '                if False and rule_tier == "PHOTO" and not caveat:')],
        ["a caption is refused where the row claims a confirmed picture",
         "a caption tags only behind the unconfirmed-allergens caveat"]),
    # (5) The caption read FIRST instead of last. Every tag still lands and the
    # corpus is byte-identical; what breaks is the accounting — `--tier PHOTO`
    # would then count tags the menu's own words already justified.
    "the caption read before the menu's own words": (
        [("            findings += [\n"
          '                (tag, "PHOTO",',
          "            findings[:0] = [\n"
          '                (tag, "PHOTO",')],
        ["the menu's own words outrank the caption for the same tag"]),
    # (6) The captions not read at all — the state of the tool before this
    # ruling. Without it every absence assertion above is satisfiable by a tier
    # that does nothing.
    "captions not read at all": (
        [("    alt = item.get(\"alt\")\n"
          "    return alt if isinstance(alt, str) else \"\"",
          "    alt = item.get(\"alt\")\n"
          "    return \"\"")],
        ["a photo caption is read, and recorded as PHOTO",
         "the hedge guard reads a caption too",
         "a caption tags only behind the unconfirmed-allergens caveat"]),
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


def run_alt_probes(work, name, verbose=False):
    """Run one ALT_PROBES group — a caption, a caveat flag, and a tag@TIER answer."""
    lines = ALT_PROBES[name]
    if not any(want for *_h, want, _n in lines):
        return "the group asserts no PRESENCE — a tier that reads nothing passes it"
    proc = subprocess.run(
        [sys.executable, "-c", ALT_PROBE_DRIVER], cwd=work, timeout=120,
        input=json.dumps([[n, a, c] for n, a, c, _w, _f in lines]),
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return f"the rule set would not load: {proc.stderr.strip().splitlines()[-1:]}"
    got = json.loads(proc.stdout)
    for (dish, alt, caveat, want, forbid), tags in zip(lines, got):
        if verbose:
            print(f"       | {dish!r} caveat={caveat} {alt!r} -> {tags}")
        missing = want - set(tags)
        if missing:
            return f"{dish!r} did not gain {sorted(missing)} (got {tags})"
        wrong = forbid & set(tags)
        if wrong:
            return f"{dish!r} was given {sorted(wrong)} (got {tags})"
    return None


def run_named(work, name, verbose=False):
    """Run a CASE or a PROBE group by name, whichever this is."""
    if name in CASES:
        return run_case(work, name, verbose)
    if name in PROBES:
        return run_probes(work, name, verbose)
    if name in ALT_PROBES:
        return run_alt_probes(work, name, verbose)
    return f"no case or probe called {name!r}"


def check_every_rule_tolerates_a_plural(work):
    """A rule pattern that does not close with `\\b` never gets the plural.

    The mechanism is applied at the closing boundary, so a NEW rule written
    without one silently opts out and nothing else would ever say so. The one
    deliberate case (`\\bgado`, open at the end already) is listed in the tool
    as `OPEN_ENDED`; anything else is an accident.
    """
    driver = """
import json, sys
sys.path.insert(0, "tools")
from tag_allergens import RULES, OPEN_ENDED
json.dump([[tag, pat] for tag, _tier, _why, pat, _exc in RULES
           if not pat.endswith(chr(92) + "b") and pat not in OPEN_ENDED], sys.stdout)
"""
    proc = subprocess.run([sys.executable, "-c", driver], cwd=work,
                          capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        return f"the rule set would not load: {proc.stderr.strip().splitlines()[-1:]}"
    stray = json.loads(proc.stdout)
    if stray:
        return ("rule(s) that never receive the plural and are not listed as "
                f"OPEN_ENDED: {stray}")
    return None


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

        for label, fn in (("a dry run writes nothing", check_dry_run_writes_nothing),
                          ("every rule tolerates a plural",
                           check_every_rule_tolerates_a_plural)):
            complaint = fn(work)
            print(f"  {'❌' if complaint else '✅'} {label:52} {complaint or 'clean'}")
            if complaint:
                failures.append(label)

        for name in list(CASES) + list(PROBES) + list(ALT_PROBES):
            complaint = run_named(work, name, args.verbose)
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
                survived = [c for c in covered if run_named(work, c, args.verbose) is None]
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
    print(f"\nAll {len(CASES) + len(PROBES) + len(ALT_PROBES) + len(BREAKERS) + 2} "
          "cases behaved as specified.")
    return 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260). Prints as the run's last line, on every
    # exit path including a refusal.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    sys.exit(main())
