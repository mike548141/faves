#!/usr/bin/env python3
"""Mutation-test `validate.py` — prove the data gate actually catches things.

`validate.py` is the gate every menu edit passes through, and CI trusts it
to keep bad data out of a live site. Until 2026-08-09 nothing tested it.
That matters because the failure mode of a validator is *silence*: a check
that never fires looks exactly like data that is always clean, and the repo
had 483 JS tests and zero Python ones, so no gate here was exercised at all.

The method is deliberately crude and therefore honest: take a **real**
record, break it in one specific way, and assert `validate.py` complains —
**with the complaint that break was meant to provoke**. Real records rather
than fixtures, because a fixture drifts from the schema and then tests
nothing. It found a real hole on its first run — a negative price validated
clean, since `price` was type-checked but never sign-checked while
`pricePerPerson` ten lines above it always was.

**Until 2026-08-17 it asserted an exit code, or the presence of any warning,
and never WHICH complaint.** Five of its cases therefore passed whatever the
guard did. Two of them are demonstrable in one line: delete the "carries no
verifiedBy" warning from `validate.py`, or the "add-on group nobody
references" one, and the old harness still printed *All 113 mutations
behaved as specified* — because the unmutated corpus already emits seventy
warnings and `"warning" in output` was the whole test. A third, "menu item
loses its name", went green on a CRASH: `tag_allergens` subscripted
`item["name"]`, `validate.py` died having printed nothing, and exit 1 is
exit 1. The other two mutated nothing at all.

So every case now carries a **third element**: the regex its own new message
must match, or `None` where the case asserts acceptance. The baseline's
lines are subtracted before matching, a mutation that leaves the record
unchanged is a failure, and a case with no third element is a failure — the
three ways this file was able to lie about itself.

    python3 tools/test_validate.py          # run every case
    python3 tools/test_validate.py -v       # show each case's output

Exit 0 = every mutation was caught (and the unmutated tree still passes);
1 = at least one mutation slipped through, which is a hole in the gate.
Stdlib only, no build step. Never writes outside a temporary copy.
"""

import argparse
import copy
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# A venue with a full priced menu and a derivation, so one file exercises
# prices, picks, tags, status and verified/verifiedBy together.
SUBJECT = "site/data/restaurants/gold-lining-cafe.json"


_DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def _one_branch(d, lifecycle):
    """The single-site subject re-expressed as a one-branch `locations` array
    (the per-branch fields move down, as validate.py requires), optionally with
    a `lifecycle` on that branch."""
    branch = {"id": "only", "label": "Only"}
    for k in ("address", "lat", "lng", "phone", "hours"):
        if k in d:
            branch[k] = d.pop(k)
    if lifecycle is not None:
        branch["lifecycle"] = lifecycle
    d["locations"] = [branch]


def _first_item(d):
    """The first menu item of the first section — where price/tag cases land."""
    return d["menu"][0]["items"][0]


def _without_addons(d):
    """Clear the subject's OWN add-on groups and every reference to them.

    The add-on cases install one synthetic group as `addOnGroups[0]` and assert
    on that index. Since 14b's first batch (PR #90) the subject carries real
    groups its dishes name, so replacing the list left those names dangling and
    every add-on case failed on "addOns names a group not defined" before
    reaching the rule it exists to test. Clearing both halves first keeps each
    case about its own group."""
    d.pop("addOnGroups", None)
    for sec in d.get("menu", []):
        sec.pop("addOns", None)
        for item in sec.get("items", []):
            item.pop("addOns", None)


def _first_section(d):
    """The first menu section — where the section-level cases land. The subject's
    is "All Day Brunch", which carries a real `served` window."""
    return d["menu"][0]


def _add_ons(d):
    """Give the subject one well-formed add-on group, named by its first dish,
    and return the group. ADR 0048's own worked example, so every case below can
    break exactly one thing about a shape that is otherwise known-good."""
    group = {
        "id": "sauces",
        "name": "Our delicious sauces",
        "select": "many",
        "max": 2,
        "price": 0,
        "options": [
            {"name": "Satay", "id": "satay", "tags": ["contains-peanuts", "vg", "gf", "df"]},
            {"name": "Garlic yogurt", "id": "garlic-yogurt", "tags": ["contains-dairy", "v", "gf"]},
        ],
    }
    _without_addons(d)
    d["addOnGroups"] = [group]
    _first_item(d)["addOns"] = ["sauces"]
    return group


def _channels(d):
    """Give the subject one declared delivery channel and one dish priced on it.

    ADR 0089's own worked example — KK Malaysian's shape, where the counter
    price and the Delivereasy price are both true and differ by a quarter — so
    every case below breaks exactly one thing about a known-good record."""
    d["priceChannels"] = {
        "delivery": {
            "platform": "Delivereasy",
            "recorded": "2026-07-06",
            "method": "delivery-app",
        }
    }
    item = _first_item(d)
    item.setdefault("price", 19)
    item["prices"] = {"delivery": 24}
    return d


def _channels_then(fn):
    """Build the good channel shape, then break it one way."""

    def mutate(d):
        _channels(d)
        fn(d)
        return d

    return mutate


def _twin(d, dish_id=None):
    """A second copy of the subject's first dish, dropped into a later section.

    The shape every dish-identity case turns on, and the corpus's own: Sprig &
    Fern prints `Cheeseburger` in Mains, in Kids and on the Gold Card at three
    prices. Two sections rather than one because that is where it actually
    happens — the venue is not repeating itself, it is selling three things."""
    twin = copy.deepcopy(_first_item(d))
    if dish_id is not None:
        twin["dishId"] = dish_id
    d["menu"][2]["items"].append(twin)
    return twin


def _selects(d):
    """Give the subject's first dish a size ladder (ADR 0130) and return it.

    Hand-written, and only ever inside this file's temporary copy — never in
    `site/data/`, which is precached onto every phone (ADR 0047) and carries no
    `selects` group until 28m draws one. The dish is Eggs on Toast at $14.00,
    tagged `v` and `gf-option`, so a variant has claims to restate and a price
    to agree with — the two rules a size ladder most plausibly gets wrong."""
    group = {
        "id": "size",
        "name": "Size",
        "kind": "selects",
        "options": [
            {"name": "Regular", "id": "regular", "dishPrice": 14.0, "default": True,
             "tags": ["v", "gf-option"]},
            {"name": "Large", "id": "large", "dishPrice": 18.5, "tags": ["v", "gf-option"]},
        ],
    }
    _without_addons(d)
    d["addOnGroups"] = [group]
    _first_item(d)["addOns"] = ["size"]
    return group


def _ladder(fn):
    """A case that installs the good size ladder, then breaks it: `fn(group,
    record)`."""
    return lambda d: fn(_selects(d), d)


def _breaks(fn):
    """A case that installs the good add-on group, then breaks it: `fn(group,
    record)`."""
    return lambda d: fn(_add_ons(d), d)


# name -> (mutate, expectation, want). "error" = must exit non-zero. "warn" =
# must exit zero but say something; the no-backfill accommodations live here,
# and they are asserted so a later change cannot silently promote or drop them.
#
# `want` IS THE THIRD ELEMENT AND IT IS NOT OPTIONAL — a regex the mutation's
# own new message must match, or None where the case asserts acceptance and
# expects nothing new to be said. Without it the harness asserted an exit code,
# or the presence of *any* warning, and five of these cases therefore passed
# whatever the guard did (measured 2026-08-17):
#
#   • "menu item loses its name" — validate.py DIED on it (tag_allergens
#     subscripted item["name"]), exiting 1 having printed nothing. Exit 1 is
#     exit 1, so the case went green on a crash for as long as it existed.
#   • "date with no method still only warns" and "an add-on group nobody
#     references" — both asserted `"warning" in output`, and the unmutated
#     corpus already prints SEVENTY warnings. Neither could fail.
#   • "an uncalibrated currency is legal but warns" — GBP is in fx.json, so
#     nothing warned; the assertion was rc == 0 and the name was fiction.
#   • "absent timezone is legal" popped a key the subject does not have. The
#     mutation was a no-op and the case validated the pristine record.
#
# The regex is matched against lines the MUTATION added, never against the
# whole output — the baseline's seventy warnings are subtracted first, which is
# what stops "any warning" passing for "the right warning".
def check_need_kinds_agree():
    """The `needs` vocabulary is written down three times — return a complaint
    if they have drifted, else None.

    `validate.py` decides what data is legal, `site/js/needs.js` decides what
    the reader actually sees, and `tools/needs.py` decides what the worklist
    reports. A kind in the validator but not the renderer is the dangerous
    direction: the data would claim a gap that silently never appears on the
    page, which is precisely the "decorative guard" failure this repo keeps
    finding. Parsed rather than imported — needs.js is an ES module and the
    tooling is stdlib-only Python (ADR 0001).
    """
    def quoted_names(path, pattern):
        """The quoted strings inside the first match of `pattern`."""
        text = (ROOT / path).read_text(encoding="utf-8")
        m = re.search(pattern, text, re.S | re.M)
        return set(re.findall(r'"([a-z]+)"', m.group(1))) if m else set()

    # needs.js is an object literal, so take its top-level keys, not its
    # bodies — those carry prose full of words that would match anything.
    js_text = (ROOT / "site/js/needs.js").read_text(encoding="utf-8")
    js_block = re.search(r"const KINDS = \{(.*?)\n\};", js_text, re.S)
    js = set(re.findall(r"^  ([a-z]+): \{", js_block.group(1), re.M)) if js_block else set()
    py = quoted_names("tools/validate.py", r"NEED_KINDS = \((.*?)\)")
    rep = quoted_names("tools/needs.py", r"^KINDS = \((.*?)\)")

    if not (js and py and rep):
        return f"could not read one of the lists (js={len(js)}, validate={len(py)}, report={len(rep)})"
    if js == py == rep:
        return None
    return (
        f"needs.js={sorted(js)} validate.py={sorted(py)} needs.py={sorted(rep)}"
    )


CASES = {
    # --- shape and type ---------------------------------------------------
    "required id removed": (lambda d: d.pop("id", None), "error", r'id None does not match filename'),
    "menu item loses its name": (lambda d: _first_item(d).pop("name", None), "error", r'menu item missing a name'),
    "price becomes a string": (lambda d: _first_item(d).update(price="free"), "error", 'price for .* must be a number or null \\(not a string\\)'),
    "price becomes a boolean": (lambda d: _first_item(d).update(price=True), "error", r'price for .* must not be a boolean'),
    "status set to nonsense": (lambda d: d.update(status="banana"), "error", r"status 'banana' not in "),
    "bogus dietary tag": (lambda d: _first_item(d).update(tags=["not-a-real-tag"]), "error", r"unknown tag 'not-a-real-tag' on "),
    # All four dietary claims have an `-option` form (owner ruling, 2026-08-16).
    # Asserted as ACCEPTED here and as load-bearing in SOURCE_CASES below: this
    # case alone would still pass if the tags were legal but nothing used them.
    # (Its tag tips go with the allergen tags it replaces: since roadmap
    # 350/020 a tip for a tag the dish no longer carries is an error of its own.)
    "every `-option` tag is legal": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["gf-option", "v-option", "df-option", "vg-option"]
        )),
        "clean", None,
    ),
    # --- the tag tips (roadmap 350/020) -----------------------------------
    "a tag tip explaining a tag the dish carries": (
        lambda d: _first_item(d).update(
            tags=["contains-egg"], tagNotes={"contains-egg": "The menu says “aioli”."}
        ),
        "clean", None,
    ),
    "a tag tip for a tag the dish does not carry": (
        lambda d: _first_item(d).update(tags=["v"], tagNotes={"contains-egg": "x"}),
        "error", r"tagNotes for .* explain 'contains-egg', which is not one of its allergen tags",
    ),
    "an empty tag tip": (
        lambda d: _first_item(d).update(tags=["contains-egg"], tagNotes={"contains-egg": " "}),
        "error", r"tagNotes\['contains-egg'\] for .* must be a non-empty sentence",
    ),
    # --- the "may contain" tier (ADR 0136) ---------------------------------
    # The positive case first: a gate broken into refusing every trace must fail.
    "a dish carries a trace with its source": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], trace=["contains-peanuts", "contains-nuts"], traceSource="Example label")),
        "clean", None,
    ),
    "a diet label as a trace": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], trace=["gf"], traceSource="Example label")),
        "error", r"trace on .* holds 'gf'; only allergen tags",
    ),
    "an allergen both present and traced": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["contains-peanuts"], trace=["contains-peanuts"], traceSource="Example label")),
        "error", r"'contains-peanuts' on .* is in both tags and trace",
    ),
    "a trace with no source": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], trace=["contains-peanuts"])),
        "error", r"trace on .* needs a traceSource",
    ),
    # --- pork and the venue-stated claims (ADR 0140) ------------------------
    # Accepted first: a gate broken into refusing the new words must fail here.
    "contains-pork, halal and kosher are legal on a dish": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["contains-pork", "halal"])),
        "clean", None,
    ),
    # `v` beside `contains-pork` is two statements that cannot both be true —
    # the tagger is stopped by CONTRADICTED_BY, so only a hand edit makes this,
    # and it must be SAID (validate reads CONTRADICTS out of addons.js).
    "a dish claiming v is tagged contains-pork": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v", "contains-pork"])),
        "warn", r"claims v and is tagged contains-pork",
    ),
    "a dish the venue calls halal is tagged contains-pork": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["halal", "contains-pork"])),
        "warn", r"claims halal and is tagged contains-pork",
    ),
    "a kosher dish is tagged contains-shellfish": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["kosher", "contains-shellfish"])),
        "warn", r"claims kosher and is tagged contains-shellfish",
    ),
    # Halal is a CLAIM, never an allergen word: it may not be "traced".
    "halal as a trace": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], trace=["halal"], traceSource="Example label")),
        "error", r"trace on .* holds 'halal'; only allergen tags",
    ),
    # A stated claim intersects like a diet claim (CLAIM_TAGS), so a size
    # variant that drops it would strip it silently on the picker.
    "a halal dish's size variant does not restate halal": (
        _ladder(lambda g, d: (_first_item(d).pop("tagNotes", None),
                              _first_item(d).update(tags=["v", "gf-option", "halal"]),
                              g["options"][0]["tags"].append("halal"))),
        "error", r"variant 'Large' of selects group 'size' does not restate the dish's halal",
    ),
    "a no-pork spelling is not a tag": (
        lambda d: _first_item(d).update(tags=["no-pork"]),
        "error", r"unknown tag 'no-pork'",
    ),
    "a source with no trace": (
        lambda d: _first_item(d).update(traceSource="Example label"),
        "error", r"traceSource on .* names a source for a trace it does not carry",
    ),
    "an allergen traced twice": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], trace=["contains-nuts", "contains-nuts"], traceSource="Example label")),
        "error", r"trace on .* names an allergen twice",
    ),
    "an empty trace list": (
        lambda d: _first_item(d).update(trace=[], traceSource="Example label"),
        "error", r"trace on .* must be a non-empty list",
    ),
    "a trace spelled as a tag": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["trace:contains-peanuts"])),
        "error", r"unknown tag 'trace:contains-peanuts'",
    ),
    # --- the credit's source link (owner, 2026-09-28) ----------------------
    # The positive case first, so a gate broken into refusing every link fails.
    "a credit links to its source": (
        lambda d: _first_item(d).update(
            attribution="Adapted from Example (example.co.nz)",
            attributionUrl="https://www.example.co.nz/recipes/one",
        ),
        "clean", None,
    ),
    "a source link with no credit to hang on": (
        lambda d: _first_item(d).update(attributionUrl="https://www.example.co.nz/r"),
        "error", r"attributionUrl for .* needs an attribution to link",
    ),
    "a source link that is not https": (
        lambda d: _first_item(d).update(
            attribution="Adapted from Example", attributionUrl="http://example.co.nz/r"
        ),
        "error", r"attributionUrl for .* must be an https:// URL",
    ),
    # --- the recipe stats panel (ADR 0125) ---------------------------------
    # The panel's promise is that our estimate never reaches the page bare, and
    # `estimated` is the label that carries it. A label naming a field the dish
    # does not carry would mark nothing and let the real estimate show unmarked.
    "prepMinutes is prose": (lambda d: _first_item(d).update(prepMinutes="20 min"), "error", r"prepMinutes for .* must be a whole number of minutes"),
    "difficulty off the scale": (lambda d: _first_item(d).update(difficulty="fiendish"), "error", r"difficulty 'fiendish' on .* is not one of"),
    "estimated names an absent field": (lambda d: _first_item(d).update(estimated=["cookMinutes"]), "error", r"estimated on .* names 'cookMinutes', which the dish does not carry"),
    "estimated names a field that cannot be estimated": (lambda d: _first_item(d).update(price=5, estimated=["price"]), "error", r"estimated on .* names 'price', which is not one of"),
    # --- values, not just types (the class the first run found a hole in) --
    "negative price": (lambda d: _first_item(d).update(price=-5), "error", r'price for .* must not be negative'),
    # --- unknown keys on the four objects a transcriber types into ---------
    # Every NESTED object in validate.py refused an unknown key and said so in
    # a comment; these four did not. The failure is silent by construction —
    # the key ships in the precache (ADR 0047), renders nowhere, and the field
    # it was meant to be simply has no value. A transposition is the realistic
    # cause, so the message is asserted to name a suggestion too.
    "unknown key at the top level": (
        lambda d: d.update(cusine=["Cafe"]), "error",
        r"card: unknown key 'cusine'",
    ),
    "unknown key on a menu section": (
        lambda d: _first_section(d).update(sectoin="Brunch"), "error",
        r"unknown key 'sectoin' — did you mean 'section'\?",
    ),
    "unknown key on a menu item": (
        lambda d: _first_item(d).update(prive=2.5), "error",
        r"item .*: unknown key 'prive'",
    ),
    # --- cuisine is 1..n, not 0..n ----------------------------------------
    # An empty list is not "no cuisine recorded": the venue drops out of the
    # cuisine facet and every cuisine filter while the record still looks
    # complete, because the field is present.
    "cuisine emptied to nothing": (
        lambda d: d.update(cuisine=[]), "error",
        r"cuisine must name at least one cuisine",
    ),
    "a cuisine entry that is blank": (
        lambda d: d.update(cuisine=["  "]), "error",
        r"cuisine entries must be non-empty strings",
    ),
    # --- one day, one set of windows --------------------------------------
    # hours.js resolves "open now" by taking the first window that matches, so
    # a second overlapping window decides nothing at all while sitting in the
    # data looking like a fact.
    "overlapping windows in one day's hours": (
        lambda d: d.update(hours={k: [["07:00", "15:00"], ["14:00", "21:00"]]
                                  for k in _DAYS}), "error",
        r"hours\[mon\] .* overlap — one day, one set of windows",
    ),
    "overlapping windows in one section's served": (
        lambda d: _first_section(d).update(
            served={k: ([["07:30", "14:00"], ["13:00", "16:00"]] if k == "mon" else [])
                    for k in _DAYS}), "error",
        r"served\[mon\] .* overlap — one day, one set of windows",
    ),
    # --- numbers JSON has but the JSON SPEC does not ----------------------
    # Python's json module reads `NaN` and `Infinity`; JSON.parse in the
    # browser throws on sight of either, so a record carrying one validated
    # clean here and then failed to load in the app ENTIRELY — not a wrong
    # price, a missing restaurant. json.dumps writes these tokens back out,
    # which is what makes them reachable from a dict mutation at all.
    "a price written as the NaN token": (
        lambda d: _first_item(d).update(price=float("nan")), "error",
        r"invalid JSON: NaN is not valid JSON",
    ),
    "a price written as the Infinity token": (
        lambda d: _first_item(d).update(price=float("inf")), "error",
        r"invalid JSON: Infinity is not valid JSON",
    ),
    "free item is legal": (lambda d: _first_item(d).update(price=0), "clean", None),
    # --- grouped ingredients, ADR 0070 ------------------------------------
    # `ingredients` accepts a string OR a {component, items} group, so the gate
    # has to police a union rather than a type — and the two rules that make the
    # union readable (loose lines lead; a component appears once) are exactly the
    # ones a shape check alone would let through.
    "flat ingredients still legal": (
        lambda d: _first_item(d).update(ingredients=["250g butter", "1 cup sugar"]),
        "clean", None,
    ),
    "grouped ingredients legal": (
        lambda d: _first_item(d).update(
            ingredients=["250g butter", {"component": "Sauce", "items": ["60g butter"]}]
        ),
        "clean", None,
    ),
    "ingredient group with no component": (
        lambda d: _first_item(d).update(ingredients=[{"items": ["60g butter"]}]),
        "error", r'ingredients for .*: a group needs a non-empty string component',
    ),
    "ingredient group with an empty component": (
        lambda d: _first_item(d).update(ingredients=[{"component": "  ", "items": ["x"]}]),
        "error", r'ingredients for .*: a group needs a non-empty string component',
    ),
    "ingredient group with no items": (
        lambda d: _first_item(d).update(ingredients=[{"component": "Sauce", "items": []}]),
        "error", r'ingredients for .*: component .* needs a non-empty list of strings',
    ),
    "ingredient group whose item is not a string": (
        lambda d: _first_item(d).update(ingredients=[{"component": "Sauce", "items": [7]}]),
        "error", r'ingredients for .*: component .* needs a non-empty list of strings',
    ),
    "ingredient group carrying an unknown key": (
        lambda d: _first_item(d).update(
            ingredients=[{"component": "Sauce", "items": ["x"], "note": "hi"}]
        ),
        "error", r"ingredients for .*: unknown key 'note' on component ",
    ),
    "a loose ingredient line after a group": (
        lambda d: _first_item(d).update(
            ingredients=[{"component": "Sauce", "items": ["x"]}, "250g butter"]
        ),
        "error", r'ungrouped line .* follows a component group',
    ),
    "the same component twice": (
        lambda d: _first_item(d).update(
            ingredients=[
                {"component": "Sauce", "items": ["x"]},
                {"component": "Sauce", "items": ["y"]},
            ]
        ),
        "error", r'ingredients for .*: component .* appears twice',
    ),
    "ingredients is not a list at all": (
        lambda d: _first_item(d).update(ingredients="250g butter"),
        "error",
        r'ingredients for .* must be a list of strings, \{text, \.\.\.\} objects, '
        r'or \{component, items\} groups',
    ),
    # --- ingredient OBJECTS (owner ruling, roadmap 350/020 step 4) ---------
    # A line can now ALSO be an object carrying its own tags/trace/note. An
    # object that carries `tags` is a PART — composed onto the dish the same
    # way an add-on option is (ADR 0048's composeTags) — so the positive case
    # first checks a fully-loaded part still composes clean, and a plain
    # note-only line (no tags at all) is legal and never treated as a part.
    "a fully-loaded ingredient object composes clean": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"],
            ingredients=[{
                "text": "250g Whittaker's 72% Dark Ghana chocolate, roughly chopped",
                "tags": ["v"],
                "trace": ["contains-peanuts", "contains-nuts"],
                "traceSource": "Whittaker's label",
                "note": "You can substitute other chocolates — dark is recommended.",
                "noteSource": "owner",
            }],
        )),
        "clean", None,
    ),
    "a note-only ingredient object carries no tags": (
        lambda d: _first_item(d).update(ingredients=[{
            "text": "A pinch of salt",
            "note": "Adjust to taste.",
            "noteSource": "owner",
        }]),
        "clean", None,
    ),
    "an ingredient object with no text": (
        lambda d: _first_item(d).update(ingredients=[{}]),
        "error", r"ingredients for .*: an ingredient object needs a non-empty 'text'",
    ),
    "an ingredient object with blank text": (
        lambda d: _first_item(d).update(ingredients=[{"text": "   "}]),
        "error", r"ingredients for .*: an ingredient object needs a non-empty 'text'",
    ),
    "an ingredient object carrying an unknown key": (
        lambda d: _first_item(d).update(ingredients=[{"text": "1 cup flour", "unit": "cup"}]),
        "error", r"ingredients for .*: an ingredient object has unknown key 'unit'",
    ),
    "an ingredient object part with an unknown tag": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=[], ingredients=[{"text": "Weird spice", "tags": ["not-a-real-tag"]}]
        )),
        "error", r"'Weird spice' has unknown tag 'not-a-real-tag'",
    ),
    "an ingredient object with a trace but no tags": (
        lambda d: _first_item(d).update(ingredients=[{
            "text": "Dark chocolate, chopped",
            "trace": ["contains-peanuts"],
            "traceSource": "Example label",
        }]),
        "error", r"carries a trace but no tags — a trace belongs on a part",
    ),
    "an ingredient object note with no noteSource": (
        lambda d: _first_item(d).update(ingredients=[{
            "text": "Salt", "note": "Adjust to taste.",
        }]),
        "error", r"needs a noteSource .* to go with its note",
    ),
    "an ingredient object noteSource is not one of the three": (
        lambda d: _first_item(d).update(ingredients=[{
            "text": "Salt", "note": "Adjust to taste.", "noteSource": "chef",
        }]),
        "error", r"needs a noteSource .* to go with its note",
    ),
    "an ingredient object noteSource with no note": (
        lambda d: _first_item(d).update(ingredients=[{"text": "Salt", "noteSource": "owner"}]),
        "error", r"has noteSource but no note",
    ),
    # --- a part must keep the dish's claims true once composed -------------
    "an ingredient part missing a claim the dish makes": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["v"], ingredients=[{"text": "Beef mince", "tags": ["contains-gluten"]}]
        )),
        "error", r"states no tag satisfying the dish's 'v' claim",
    ),
    "an ingredient part contradicting a claim": (
        lambda d: (_first_item(d).pop("tagNotes", None), _first_item(d).update(
            tags=["vg"], ingredients=[{"text": "Greek yoghurt", "tags": ["contains-dairy"]}]
        )),
        "error", r"contradicts the dish's 'vg' claim",
    ),
    "an ingredient object inside a group with no text": (
        lambda d: _first_item(d).update(
            ingredients=[{"component": "Sauce", "items": [{"tags": ["v"]}]}]
        ),
        "error",
        r"ingredients for .*: an ingredient object under 'Sauce' needs a non-empty 'text'",
    ),
    # --- referential integrity -------------------------------------------
    "pick names a non-existent dish": (
        lambda d: d.update(picks=["Totally Invented Dish 9000"]),
        "error", r"pick 'Totally Invented Dish 9000' does not match any menu item name",
    ),
    # --- derivation, ADR 0031 --------------------------------------------
    # Where a venue IS (ADR 0043). Both fields are optional, so the gate's job is
    # to catch a *stated* one that is wrong — a typo'd zone or code would
    # otherwise render a confident wrong clock or an unlabelled price.
    # formerIds must agree with site/js/renames.js or an old shared link 404s
    # while the record claims the id is handled (both silent).
    "formerIds naming an id renames.js doesn't map": (
        lambda d: d.update(formerIds=["gold-lining-cafe-old"]),
        "error", 'formerIds has .* but site/js/renames\\.js maps it to ',
    ),
    "formerIds listing the record's own id": (
        lambda d: d.update(formerIds=[d["id"]]),
        "error", r'formerIds lists its own current id ',
    ),
    # currency is REQUIRED now (ADR 0045) — a price whose currency is unknown
    # cannot be converted, and looks exactly like one that can.
    "currency missing entirely": (lambda d: d.pop("currency", None), "error", 'currency is required and must be a 3-letter ISO 4217 code \\(got None\\)'),
    "currency with no shipped FX rate": (lambda d: d.update(currency="ZWL"), "error", "currency 'ZWL' has no rate in site/data/fx\\.json"),
    "timezone that is not an IANA zone": (
        lambda d: d.update(timezone="Pacific/Wellington"),  # plausible, and not real
        "error", r"card: timezone 'Pacific/Wellington' is not an IANA zone",
    ),
    "timezone as a number": (lambda d: d.update(timezone=12), "error", r'card: timezone must be a non-empty string or absent'),
    "a real IANA zone is legal": (lambda d: d.update(timezone="Europe/London"), "clean", None),
    # ADR 0132. A one-branch `locations` is legal; a lifecycle on that sole
    # branch is not — its life IS the venue's. The control proves the one-branch
    # shape itself validates, so the error below is the lifecycle's alone.
    "a one-branch locations array is legal (control for the next case)": (
        lambda d: _one_branch(d, None), "clean", None,
    ),
    "a lifecycle on a venue's ONLY branch": (
        lambda d: _one_branch(d, {"events": [{"type": "closed-permanently", "date": "2026-09-01"}]}),
        "error", r"locations\[0\]\.lifecycle: a venue's only branch has no life of its own",
    ),
    # This used to read "absent timezone is legal (means home)" and popped a key
    # the subject does not carry — no venue in the corpus does — so it mutated
    # nothing and validated the pristine record. An explicit null is the shape
    # ARCHITECTURE actually documents, it is a DIFFERENT thing from absent, and
    # it exercises the `tz is None` branch that the old case only appeared to.
    "timezone written as an explicit null is legal": (
        lambda d: d.update(timezone=None), "clean", None,
    ),
    "currency that is not an ISO 4217 code": (lambda d: d.update(currency="dollars"), "error", "currency is required and must be a 3-letter ISO 4217 code \\(got 'dollars'\\)"),
    "currency in lower case": (lambda d: d.update(currency="gbp"), "error", "currency is required and must be a 3-letter ISO 4217 code \\(got 'gbp'\\)"),
    # Named "an uncalibrated currency is legal but warns" until 2026-08-17, and
    # every word after "legal" was wrong: GBP has a shipped rate, so nothing
    # warned, and a currency with NO shipped rate is an ERROR (see the ZWL case
    # above), never a warning. What the mutation does test is worth keeping —
    # a venue priced in a foreign currency validates — so it keeps the mutation
    # and loses the claim it never made good on.
    "a foreign currency with a shipped rate is legal": (
        lambda d: d.update(currency="GBP"), "clean", None,
    ),
    # `vibe` became a closed vocabulary at ROADMAP 37k, read out of
    # site/js/vibes.js. It was free text for a year and grew five spellings for
    # one idea, so the three ways it can now be wrong are each worth a mutation:
    # never in the vocabulary, superseded by a rename, and dropped deliberately.
    "vibe off the vocabulary": (lambda d: d.update(vibe=["gastropub"]), "error", "vibe 'gastropub' not in the vocabulary in site/js/vibes\\.js"),
    "vibe using a pre-migration spelling": (lambda d: d.update(vibe=["craft beer"]), "error", r"vibe 'craft beer' was renamed to 'craft-beer' — use that"),
    "vibe using a deliberately dropped value": (lambda d: d.update(vibe=["steakhouse"]), "error", r"vibe 'steakhouse' was dropped deliberately"),
    "vibe listed twice": (lambda d: d.update(vibe=["craft-beer", "craft-beer"]), "error", r"vibe 'craft-beer' listed twice"),
    "vibe as a bare string": (lambda d: d.update(vibe="craft-beer"), "error", r'vibe must be a list, got '),
    "a vocabulary vibe is legal": (lambda d: d.update(vibe=["craft-beer", "sit-down"]), "clean", None),
    "verifiedBy off the closed set": (lambda d: d.update(verifiedBy="vibes"), "error", r"verifiedBy 'vibes' not in "),
    "verifiedBy names a person": (lambda d: d.update(verifiedBy="owner-mike"), "error", r"verifiedBy 'owner-mike' not in "),
    "method with no date": (lambda d: d.update(verified=None), "error", r'verifiedBy is set but verified is null — a method with no date is not a derivation'),
    "status verified without a derivation": (
        lambda d: d.update(status="verified", verified=None, verifiedBy=None),
        "error", r"status is 'verified' but there is no dated derivation",
    ),
    "date with no method still only warns": (
        lambda d: d.update(verifiedBy=None),
        "warn", r'verified 2026-08-07 carries no verifiedBy — state how the menu was read',
    ),
    # --- dish-level gaps, `needs` ----------------------------------------
    "needs kind off the closed set": (
        lambda d: _first_item(d).update(needs=[{"what": "vibes"}]),
        "error", "needs\\[0\\]: what must be one of .*got 'vibes'",
    ),
    "needs with an unknown key": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "why": "x"}]),
        "error", "needs\\[0\\]: unknown key 'why'",
    ),
    "needs is empty rather than absent": (
        lambda d: _first_item(d).update(needs=[]),
        "error", r'needs must not be empty — omit it instead',
    ),
    "needs since is not a date": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "since": "last Tuesday"}]),
        "error", "needs\\[0\\]: since must be an ISO date .*got 'last Tuesday'",
    ),
    "same needs kind claimed twice": (
        lambda d: _first_item(d).update(needs=[{"what": "name"}, {"what": "name"}]),
        "error", "needs\\[1\\]: duplicate what 'name' — one entry per kind",
    ),
    # The one that keeps the worklist honest: a dish that has been priced but
    # still carries needs.what='price' renders no indicator, so the gap would
    # sit in the data invisibly and needs.py would keep reporting a done job.
    "priced dish still claiming an unread price": (
        lambda d: _first_item(d).update(price=9.5, needs=[{"what": "price"}]),
        "error", "has a price but still claims needs\\.what='price'",
    ),
    "a well-formed needs entry is legal": (
        lambda d: _first_item(d).update(
            price=None, needs=[{"what": "price", "note": "label obscured", "since": "2026-08-07"}]
        ),
        "clean", None,
    ),
    # --- add-ons, ADR 0048 -------------------------------------------------
    "a well-formed add-on group is legal": (_add_ons, "clean", None),
    "an option that states no tags is legal": (
        _breaks(lambda g, d: g["options"][0].update(tags=[])),
        "clean", None,
    ),
    # The one the ADR argued hardest for: a forgotten price must not become a
    # silently free add-on and an under-stated total.
    "add-on priced at neither level": (_breaks(lambda g, d: g.pop("price")), "error", r"option 'Satay': no price, and its group sets no default"),
    # Null must never reach an add-on price — a dish price uses it for two
    # different unknowns (`—` and `?`), and nothing on this screen tells them apart.
    "add-on option price written as null": (
        _breaks(lambda g, d: g["options"][0].update(price=None)),
        "error", r"option 'Satay': price must not be null",
    ),
    "add-on group price written as null": (_breaks(lambda g, d: g.update(price=None)), "error", r"add-on group 'sauces': price must not be null"),
    "negative add-on price": (_breaks(lambda g, d: g["options"][0].update(price=-2)), "error", r"option 'Satay': price must not be negative, got -2"),
    # Referential integrity, both directions. A dangling id renders nothing at
    # all (groupsFor drops it rather than throwing), so it fails in silence.
    "dish addOns names an undefined group": (
        _breaks(lambda g, d: _first_item(d).update(addOns=["gravy"])),
        "error", r"item .*: addOns names 'gravy', which is not defined in addOnGroups",
    ),
    "section addOns names an undefined group": (
        _breaks(lambda g, d: d["menu"][0].update(addOns=["gravy"])),
        "error", r"section .*: addOns names 'gravy', which is not defined in addOnGroups",
    ),
    "an add-on group nobody references": (
        _breaks(lambda g, d: _first_item(d).pop("addOns")),
        "warn", r"add-on group 'sauces' is defined but no section or dish names it",
    ),
    # Identity: two groups sharing an id make every reference to it ambiguous,
    # and two options sharing a name make a selection unresolvable.
    "two add-on groups with the same id": (
        _breaks(lambda g, d: d["addOnGroups"].append(copy.deepcopy(g))),
        "error", r'duplicate add-on group id — a reference to it is ambiguous',
    ),
    "two options with the same name in one group": (
        _breaks(lambda g, d: g["options"].append({"name": "Satay", "tags": []})),
        "error", r"option 'Satay': duplicate option name in this group",
    ),
    "add-on group id that is not kebab-case": (
        _breaks(lambda g, d: (g.update(id="Sauces"), _first_item(d).update(addOns=["Sauces"]))),
        "error", "addOnGroups\\[0\\]: id must be a non-empty kebab-case string, got 'Sauces'",
    ),
    "select off the closed set": (_breaks(lambda g, d: g.update(select="several")), "error", r"select must be one of .*got 'several'"),
    # ── Per-channel prices (ADR 0089) ────────────────────────────────────────
    # The whole feature exists because a delivery price masqueraded as a counter
    # price for two months, so the cases that matter are the ones where a second
    # price could go on being read as the first.
    "a well-formed channel price is accepted": (_channels, None, None),
    "a dish prices a channel the venue never declared": (
        _channels_then(lambda d: _first_item(d).update(prices={"online": 30})),
        "error", r"prices\.online is not declared in the venue's priceChannels",
    ),
    "a channel price with no counter price beside it": (
        _channels_then(lambda d: _first_item(d).pop("price")),
        "error", r"has prices for another channel but no counter price",
    ),
    "a channel that names no platform": (
        _channels_then(lambda d: d["priceChannels"]["delivery"].pop("platform")),
        "error", r"priceChannels\.delivery: platform is required",
    ),
    "a channel reading that does not say how it was read": (
        _channels_then(lambda d: d["priceChannels"]["delivery"].update(method="guessed")),
        "error", r"priceChannels\.delivery: method must be one of",
    ),
    "a channel key off the closed set": (
        _channels_then(lambda d: d.__setitem__("priceChannels", {"uber": {"platform": "Uber Eats", "recorded": "2026-09-06", "method": "delivery-app"}})),
        "error", r"priceChannels key 'uber' not in",
    ),
    "a channel price written as a string": (
        _channels_then(lambda d: _first_item(d).update(prices={"delivery": "24.00"})),
        "error", r"prices\.delivery must be a number, got '24.00'",
    ),
    "max on a pick-one group": (_breaks(lambda g, d: g.update(select="one")), "error", r"max only means anything when select is 'many'"),
    "max above the number of options": (_breaks(lambda g, d: g.update(max=5)), "error", 'max 5 exceeds the 2 option\\(s\\) in the group'),
    "add-on option with no tags at all": (
        _breaks(lambda g, d: g["options"][0].pop("tags")),
        "error", r"option 'Satay': tags is required and must be a list",
    ),
    "unknown tag on an add-on option": (
        _breaks(lambda g, d: g["options"][0].update(tags=["contains-mystery"])),
        "error", r"option 'Satay': unknown tag 'contains-mystery'",
    ),
    # --- ADR 0092: what an add-on option IS -------------------------------
    # `has-meat`/`has-fish` are legal on an OPTION and an error on a DISH.
    # menu.js `tagChip` has no label for them, so on a dish they paint a raw
    # chip; the picker's warning line is the one screen that renders them.
    "has-meat on an add-on option is legal": (
        _breaks(lambda g, d: g["options"][0].update(tags=["has-meat"])),
        "clean", None,
    ),
    "has-meat on a DISH is refused": (
        lambda d: _first_item(d).update(tags=["has-meat"]),
        "error", r"'has-meat' on .*: that tag belongs to an ADD-ON OPTION",
    ),
    "has-fish on a DISH is refused": (
        lambda d: _first_item(d).update(tags=["has-fish"]),
        "error", r"'has-fish' on .*: that tag belongs to an ADD-ON OPTION",
    ),
    # The sweep-is-owed warning, the half of ADR 0092 that stops a new menu
    # quietly reintroducing the gap 14h closed. An option whose own name says
    # meat, carrying nothing, must not go past in silence.
    "an untagged add-on option whose name says meat is reported": (
        _breaks(lambda g, d: g["options"][0].update(name="Bacon", tags=[])),
        "warn", r"add-on 'Bacon' in group 'sauces': missing has-meat",
    ),
    "an untagged add-on option whose name says fish is reported": (
        _breaks(lambda g, d: g["options"][0].update(name="Salmon", tags=[])),
        "warn", r"add-on 'Salmon' in group 'sauces': missing has-fish",
    ),
    # …and the guard that keeps it from over-reaching: the sweep may only ever
    # state what IS present. An option named for a vegetable stays untouched,
    # because "Spinach is vegetarian" is a claim of ABSENCE (ADR 0025).
    "an untagged vegetable option is NOT asked to state an absence": (
        _breaks(lambda g, d: g["options"][0].update(name="Spinach", tags=[])),
        "clean", None,
    ),
    # The typo that sells an extra free: a mistyped price key inside a group
    # that defaults to 0 is not a harmless no-op, it is an under-stated total.
    # --- ADR 0126: an add-on option has an id ----------------------------
    # The order line keys on it, so a missing, malformed or repeated one is a
    # line that merges with the wrong thing or stops merging with the right one.
    "an add-on option with no id": (
        _breaks(lambda g, d: g["options"][0].pop("id")),
        "error", r'option \'Satay\': no "id" — add "id": "satay"',
    ),
    "an add-on option id not in slug form": (
        _breaks(lambda g, d: g["options"][0].update(id="Satay Sauce")),
        "error", r"option 'Satay': id 'Satay Sauce' is not in slug form .* write 'satay-sauce'",
    ),
    "two options in one group sharing an id": (
        _breaks(lambda g, d: g["options"][1].update(id="satay")),
        "error", r"option 'Garlic yogurt': id 'satay' is already used by option 'Satay' in this group",
    ),
    # The POSITIVE case, and the reason the field exists: a venue renames the
    # option, the transcriber changes the name and leaves the id. Legal, and
    # the id no longer equals slug(name) — which must not be read as an error.
    "a renamed add-on option keeping its pinned id is legal": (
        _breaks(lambda g, d: g["options"][0].update(name="Satay (peanut)")),
        "clean", None,
    ),
    # Uniqueness is per GROUP: two groups may each offer a "large".
    "the same option id in two different groups is legal": (
        _breaks(lambda g, d: (
            d["addOnGroups"].append({**copy.deepcopy(g), "id": "more-sauces"}),
            _first_item(d)["addOns"].append("more-sauces"),
        )),
        "clean", None,
    ),
    "mistyped price key on an add-on option": (
        _breaks(lambda g, d: g["options"][0].update(prive=2.5)),
        "error", r"option 'Satay': unknown key 'prive'",
    ),
    "unknown key on an add-on group": (
        _breaks(lambda g, d: g.update(maxx=2)),
        "error", r"add-on group 'sauces': unknown key 'maxx'",
    ),
    # --- ADR 0130: a group that SELECTS a variant (roadmap 28k) -----------
    # The positive cases first, because the field arrives on a corpus of 50
    # groups that must not notice: absent `kind` is `adds`, and so is the word.
    'an existing group saying "kind": "adds" is legal': (
        _breaks(lambda g, d: g.update(kind="adds")),
        "clean", None,
    ),
    "a well-formed selects group is legal": (_selects, "clean", None),
    "kind off the closed set": (
        _breaks(lambda g, d: g.update(kind="choose")),
        "error", r"add-on group 'sauces': kind must be one of \['adds', 'selects'\] or absent, got 'choose'",
    ),
    # 28b's counter-examples must be EXPRESSIBLE: the venue that prints two
    # prices and never names the larger size, and two volumes at one price.
    "an unlabelled variant is legal": (
        _ladder(lambda g, d: g["options"][1].pop("name")),
        "clean", None,
    ),
    "two variants at one price is legal": (
        _ladder(lambda g, d: g["options"][1].update(dishPrice=14.0)),
        "clean", None,
    ),
    "the dish's price as a dated series agrees through its latest entry": (
        _ladder(lambda g, d: _first_item(d).update(price=[
            {"value": 12.0, "recorded": "2026-01-01"}, {"value": 14.0, "recorded": "2026-08-01"}])),
        "clean", None,
    ),
    # The item's five named refusals.
    "a selects group with no default": (
        _ladder(lambda g, d: g["options"][0].pop("default")),
        "error", r"add-on group 'size': a selects group needs exactly one option marked \"default\": true",
    ),
    "a selects group with two defaults": (
        _ladder(lambda g, d: g["options"][1].update(default=True)),
        "error", r"add-on group 'size': 2 options are marked default \('Regular', 'Large'\)",
    ),
    "a variant with a null price": (
        _ladder(lambda g, d: g["options"][1].update(dishPrice=None)),
        "error", r"option 'Large': dishPrice must not be null",
    ),
    "max on a selects group": (
        _ladder(lambda g, d: g.update(max=1)),
        "error", r"add-on group 'size': max does not apply to a selects group",
    ),
    "a dish whose price disagrees with its default variant": (
        _ladder(lambda g, d: _first_item(d).update(price=15.0)),
        "error", r"item 'Eggs on Toast': price 15\.0 disagrees with 'Regular', the default of selects group 'size' \(dishPrice 14\.0\)",
    ),
    # …and the rest of the shape.
    "a variant priced as a surcharge": (
        _ladder(lambda g, d: g["options"][1].update(price=4.5)),
        "error", r"option 'Large': a variant carries `dishPrice`.*not `price`",
    ),
    "a variant with no dishPrice at all": (
        _ladder(lambda g, d: g["options"][1].pop("dishPrice")),
        "error", r"option 'Large': no dishPrice",
    ),
    "a variant priced as a string": (
        _ladder(lambda g, d: g["options"][1].update(dishPrice="18.50")),
        "error", r"option 'Large': dishPrice must be a number, got '18.50'",
    ),
    "a negative variant price": (
        _ladder(lambda g, d: g["options"][1].update(dishPrice=-1)),
        "error", r"option 'Large': dishPrice must be a finite, non-negative number",
    ),
    "default written as false": (
        _ladder(lambda g, d: g["options"][1].update(default=False)),
        "error", r"option 'Large': default must be true or absent, got False",
    ),
    "select on a selects group": (
        _ladder(lambda g, d: g.update(select="one")),
        "error", r"add-on group 'size': select does not apply to a selects group",
    ),
    "a group price on a selects group": (
        _ladder(lambda g, d: g.update(price=0)),
        "error", r"add-on group 'size': price does not apply to a selects group",
    ),
    "a ladder of one variant": (
        _ladder(lambda g, d: g["options"].pop()),
        "error", r"add-on group 'size': a selects group needs at least two options",
    ),
    "an unlabelled variant with no id": (
        _ladder(lambda g, d: (g["options"][1].pop("name"), g["options"][1].pop("id"))),
        "error", r'options\[1\]: no "id", and no name to seed one from',
    ),
    "dishPrice on an adds option": (
        _breaks(lambda g, d: g["options"][0].update(dishPrice=2)),
        "error", r"option 'Satay': dishPrice belongs to a variant",
    ),
    "default on an adds option": (
        _breaks(lambda g, d: g["options"][0].update(default=True)),
        "error", r"option 'Satay': default belongs to a variant",
    ),
    "two selects groups on one dish": (
        _ladder(lambda g, d: (
            d["addOnGroups"].append({**copy.deepcopy(g), "id": "protein"}),
            _first_item(d)["addOns"].append("protein"),
        )),
        "error", r"item 'Eggs on Toast': 2 selects groups \('size', 'protein'\) on one dish",
    ),
    "per-channel prices beside a ladder": (
        _ladder(lambda g, d: (_channels(d), _first_item(d).update(price=14.0))),
        "error", r"item 'Eggs on Toast': per-channel prices beside selects group 'size'",
    ),
    # ADR 0048 §3 is NOT amended (28i). A variant restates its dish's claims —
    # no fewer, or picking it strips one; no more, or it reads as a restore
    # that intersection can never deliver; and nothing that contradicts one.
    "a variant that drops the dish's claim": (
        _ladder(lambda g, d: g["options"][1].update(tags=[])),
        "error", r"variant 'Large' of selects group 'size' does not restate the dish's gf-option, v",
    ),
    "a variant that claims what its dish does not": (
        _ladder(lambda g, d: g["options"][1].update(tags=["v", "gf-option", "vg"])),
        "error", r"variant 'Large' of selects group 'size' claims vg, which the dish does not",
    ),
    "a variant that is meat on a vegetarian dish": (
        _ladder(lambda g, d: g["options"][1].update(tags=["v", "gf-option", "has-meat"])),
        "error", r"variant 'Large' of selects group 'size' carries has-meat, which contradicts the dish's v",
    ),
    # Roadmap 28s: the twin-allergen sweep's SECOND join. A merge removes the
    # duplicate names the first join keys on, so without this the sweep goes
    # quieter at the moment it should speak.
    "a variant lacking an allergen its sibling variant carries is reported": (
        _ladder(lambda g, d: g["options"][1]["tags"].append("contains-nuts")),
        "warn", r"'Eggs on Toast' as 'Regular' \(selects group 'size'\) lacks contains-nuts, which its variant 'Large' carries",
    ),
    # Roadmap 28s: find_dish resolves a reference that no longer NAMES its dish.
    "a pick reaching a renamed dish only through its id is reported": (
        lambda d: (d.update(picks=["Eggs on Toast"]), _first_item(d).update(name="Eggs, toasted")),
        "warn", r"pick 'Eggs on Toast' reaches 'Eggs, toasted' only through its dish id",
    ),
    "a pick naming a retired id is reported": (
        lambda d: (d.update(picks=["old-eggs"]), _first_item(d).update(formerIds=["old-eggs"])),
        "warn", r"pick 'old-eggs' reaches 'Eggs on Toast' only through a RETIRED id",
    ),
    "a pick still naming its dish says nothing": (
        lambda d: d.update(picks=["Eggs on Toast"]),
        "clean", None,
    ),
    # addOnsOnly must never be a delete wearing a nicer name: it may only hide
    # rows that some group still offers.
    "addOnsOnly on a section no group offers": (
        _breaks(lambda g, d: d["menu"][0].update(addOnsOnly=True)),
        "error", 'addOnsOnly hides \\d+ dish\\(es\\) that no add-on group offers',
    ),
    "addOnsOnly set to something other than true": (
        _breaks(lambda g, d: d["menu"][0].update(addOnsOnly="yes")),
        "error", r"addOnsOnly must be true or absent, got 'yes'",
    ),
    # --- dish identity, ADR 0051 ------------------------------------------
    # `dishId` is REQUIRED (owner ruling, 2026-08-16 — favourites and ratings
    # must never be lost again). An id derived from `slug(name)` at read time is
    # not immutable: rename the dish and it moves. So the gate that matters most
    # is the dullest one — a dish that doesn't say who it is. Both a first row
    # and a later one, because a loop that only ever reaches item [0] would pass
    # the first of these and let the whole rest of a menu through unchecked.
    "a dish with no dishId at all": (
        lambda d: _first_item(d).pop("dishId", None),
        "error", r'dish .* has no "dishId" — add "dishId"',
    ),
    "a dish deeper in the menu with no dishId": (
        lambda d: d["menu"][2]["items"][-1].pop("dishId", None),
        "error", 'dish \\\'Seafood Chowder\\\' has no "dishId"',
    ),
    "dishId present but null": (lambda d: _first_item(d).update(dishId=None), "error", r'dish .* has no "dishId" — add "dishId"'),
    # Two dishes resolving to one id share an anchor, a heart, a rating and an
    # order line, and every one of those fails in silence.
    "one dish printed twice under one id": (_twin, "error", r"two dishes resolve to the same id 'eggs-on-toast'"),
    "the second copy carries its own dishId": (
        lambda d: _twin(d, "eggs-on-toast-soup"),
        "clean", None,
    ),
    "two dishes sharing one explicit dishId": (
        lambda d: (_first_item(d).update(dishId="eggs"), _twin(d)),
        "error", r"two dishes resolve to the same id 'eggs'",
    ),
    # A dishId must BE a slug, not merely resolve to one: it is carried verbatim
    # into `#dish-…` and into stored keys, so `"Gold Card"` builds a broken anchor.
    "dishId that is not in slug form": (
        lambda d: _first_item(d).update(dishId="Gold Card"),
        "error", r"dishId 'Gold Card' on .* is not in slug form",
    ),
    "dishId that is an empty string": (lambda d: _first_item(d).update(dishId=""), "error", r'dishId for .* must be a non-empty string'),
    # On a NEW dish. Until roadmap 28l this moved the first dish's live id, which
    # is now the "moved with no formerIds claim" refusal below: the case was
    # about the id's SHAPE, and moving an id nothing claims drops every heart.
    "a well-formed dishId is legal": (
        lambda d: d["menu"][0]["items"].append(
            {**copy.deepcopy(_first_item(d)), "name": "Eggs on Toast Classic",
             "dishId": "eggs-on-toast-classic"}),
        "clean", None,
    ),
    # formerIds keeps an old shared link and an old stored heart resolving. A
    # former id that is also a LIVE one never arrives — findDish tries live ids
    # first — so the claim would sit there looking honoured.
    "dish formerIds claiming a live dish's id": (
        lambda d: _first_item(d).update(formerIds=["eggs-benedict"]),
        "error", r"formerIds on .* claims 'eggs-benedict', which is the live id of ",
    ),
    "two dishes claiming the same former id": (
        lambda d: (
            _first_item(d).update(formerIds=["morning-eggs"]),
            d["menu"][0]["items"][1].update(formerIds=["morning-eggs"]),
        ),
        "error", r"two dishes claim the former id 'morning-eggs'",
    ),
    "dish formerIds entry that is not a slug": (
        lambda d: _first_item(d).update(formerIds=["Eggs On Toast"]),
        "error", r"formerIds entry 'Eggs On Toast' on .* is not in slug form",
    ),
    "dish formerIds that is not a list": (
        lambda d: _first_item(d).update(formerIds="eggs-on-toast"),
        "error", r'formerIds for .* must be a list of non-empty strings',
    ),
    "a retired dish id is legal": (
        lambda d: _first_item(d).update(dishId="eggs-on-ciabatta", formerIds=["eggs-on-toast"]),
        "clean", None,
    ),
    # Roadmap 28l: an id that was live at the git baseline and that NOTHING
    # answers to now is a heart dropped in silence on every phone holding it.
    # These four need the sandbox to be a git repository whose HEAD is the
    # pristine corpus — main() below makes it one; without that the check says
    # "NOT CHECKED" and the two error cases fail here as PASSED SILENTLY.
    "a dish deleted with nothing answering for its id": (
        lambda d: d["menu"][0]["items"].pop(2),
        "error", r"dish id 'salmon-and-avo-bagel' .* nothing answers to it now",
    ),
    "a dish id moved with no formerIds claim": (
        lambda d: _first_item(d).update(dishId="eggs-on-ciabatta"),
        "error", r"dish id 'eggs-on-toast' .* nothing answers to it now",
    ),
    "a ladder merge: a sibling folded in, its id claimed": (
        lambda d: (
            d["menu"][0]["items"][1].update(formerIds=["chilli-scrambled-eggs"]),
            d["menu"][0]["items"].pop(3),
        ),
        "clean", None,
    ),
    "a merge that claims the wrong id still fails for the one it dropped": (
        lambda d: (
            d["menu"][0]["items"][1].update(formerIds=["chilli-scrambled-egg"]),
            d["menu"][0]["items"].pop(3),
        ),
        "error", r"dish id 'chilli-scrambled-eggs' .* nothing answers to it now",
    ),
    # picks are written as names, and a name is not unique within a venue: this
    # one silently resolved to whichever row came first until ADR 0051.
    "a pick naming a dish the menu prints twice": (
        lambda d: (_twin(d, "eggs-on-toast-soup"), d.update(picks=["Eggs on Toast"])),
        "error", r'pick .* matches 2 dishes .* name the one you mean by its dish id',
    ),
    "a pick naming a dish by its id": (
        lambda d: (_twin(d, "eggs-on-toast-soup"), d.update(picks=["eggs-on-toast-soup"])),
        "clean", None,
    ),
    # goesWith widened to ids, so a pairing can point at a disambiguated row —
    # without losing the check that it points at something.
    "goesWith naming a dish by its id": (
        lambda d: (
            _twin(d, "eggs-on-toast-soup"),
            _first_item(d).update(goesWith=["eggs-on-toast-soup"]),
        ),
        "clean", None,
    ),
    "goesWith naming a dish that isn't there": (
        lambda d: _first_item(d).update(goesWith=["Totally Invented Dish 9000"]),
        "error", r"goesWith 'Totally Invented Dish 9000' on .* does not match a dish in this menu",
    ),
    # --- `served`: the hours a SECTION is on (ROADMAP 28c) ----------------
    # The subject's first section carries a real one, so each case below breaks
    # exactly one thing about a shape that is otherwise known-good. The rules
    # worth policing are the ones a bare type check misses: a partial week (six
    # day keys reads as a valid dict), an inverted interval, and an interval
    # that bounds neither end — each of which would render as a confident,
    # wrong "not served right now" rather than as an obvious break.
    "served loses a day key": (lambda d: _first_section(d)["served"].pop("sun", None), "error", r'served must have exactly the 7 day keys'),
    "served gains a key that isn't a day": (
        lambda d: _first_section(d)["served"].update(bank_holiday=[]),
        "error", r'served must have exactly the 7 day keys .*bank_holiday',
    ),
    # --- a close BEFORE its open is a WRAP now (ADR 0094) -------------------
    # This case used to assert `close 07:30 must be after open 14:30`. That rule
    # was reversed on 2026-09-07: a close before its open means the NEXT DAY, so
    # the shape it refused is the shape the ruling exists to allow. What is left
    # to refuse is the AMBIGUOUS pair and the pair that looks TRANSPOSED, and
    # those are what the three cases below pin. Written out rather than deleted,
    # because "the mutation gate no longer covers close-vs-open at all" is the
    # silent outcome of simply removing a case that started failing.
    "served close equal to its open": (
        lambda d: _first_section(d)["served"].update(mon=[["14:30", "14:30"]]),
        "error", 'served\\[mon\\] close 14:30 is the same as open 14:30',
    ),
    "hours close equal to its open": (
        lambda d: d.update(hours={k: [["09:00", "09:00"]] for k in _DAYS}),
        "error", 'hours\\[mon\\] close 09:00 is the same as open 09:00',
    ),
    # A transposed pair of ordinary hours is now legal arithmetic and a nonsense
    # trading day — 17h30 — so it is a WARNING and not an error: a genuinely
    # long night is possible and the validator cannot know which it is looking
    # at. 16h is measured, not invented (the corpus's longest span is 15h30).
    "hours that look transposed": (
        lambda d: d.update(hours={k: [["23:00", "16:30"]] for k in _DAYS}),
        "warn", r"hours\[mon\] 23:00–16:30 reads as a 17h30 span closing after midnight",
    ),
    # And the positive: the shape the ruling exists for must sail through. A
    # gate that only ever refuses cannot show it stopped refusing the right
    # thing. `served` is dropped with it because the section's window would
    # otherwise be reported as starting before the venue opens — a true
    # observation about a mutated record, and noise here.
    "a close before its open is a legal wrap, not an error": (
        lambda d: (d.update(hours={k: [["16:30", "03:00"]] for k in _DAYS}),
                   _first_section(d).pop("served", None)),
        "clean", None,
    ),
    # ADR 0105 — a day may be `null` ("the venue publishes nothing for that
    # day"), and that is NOT `[]` ("the venue says it is closed"). Three cases,
    # because the rule has three edges and only one of them is a refusal.
    #
    # The POSITIVE first: the shape the ruling exists for must sail through. A
    # gate that only ever refuses cannot show it stopped refusing the right
    # thing, and this is the shape Abrakebabra needs — six published days and a
    # Wednesday nobody ever stated. `served` is dropped with it for the same
    # reason as the wrap case above: the section's window against a day the
    # venue never published is noise, not a finding.
    "a null day is a legal 'we were not told', not an error": (
        lambda d: (d.update(hours={**{k: [["09:00", "21:00"]] for k in _DAYS}, "wed": None}),
                   _first_section(d).pop("served", None)),
        "clean", None,
    ),
    # The REFUSAL: a week where every day is null says exactly what `hours:
    # null` says, in seven times the bytes, and two spellings of one state is
    # how consumers drift apart.
    "hours where every day is null": (
        lambda d: d.update(hours={k: None for k in _DAYS}),
        "error", r"hours says nothing about any of the seven days",
    ),
    # And the edge the null must NOT open: a day is still a list or null, never
    # a bare string. Without this, relaxing `isinstance(intervals, list)` to
    # admit None could quietly admit anything falsy.
    "hours day is neither a list nor null": (
        lambda d: d.update(hours={**{k: [["09:00", "21:00"]] for k in _DAYS}, "wed": "closed"}),
        "error", r"hours\[wed\] must be a list of intervals, or null",
    ),
    "served time is not HH:MM": (
        lambda d: _first_section(d)["served"].update(mon=[["7.30am", "14:30"]]),
        "error", "served\\[mon\\] open '7\\.30am' must be 'HH:MM' or null",
    ),
    "served day is not a list": (
        lambda d: _first_section(d)["served"].update(mon="07:30-14:30"),
        "error", 'served\\[mon\\] must be a list of intervals',
    ),
    "served interval is not a pair": (
        lambda d: _first_section(d)["served"].update(mon=[["07:30", "14:30", "18:00"]]),
        "error", 'served\\[mon\\] interval must be \\[open, close\\]',
    ),
    # "from opening" is the one extension over the `hours` shape, and it is the
    # reason this field exists in a corpus where two menus say "served till 2pm"
    # and neither states a start.
    "served with a null open is legal": (
        lambda d: _first_section(d)["served"].update(mon=[[None, "14:30"]]),
        "clean", None,
    ),
    "served with neither end bounded": (
        lambda d: _first_section(d)["served"].update(mon=[[None, None]]),
        "error", 'served\\[mon\\] states neither a start nor an end',
    ),
    "served that is served on no day at all": (
        lambda d: _first_section(d).update(
            served={k: [] for k in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")}
        ),
        "error", r'served has no window on any day — omit the field instead',
    ),
    # Two different questions — "is it on the menu this month?" and "is it being
    # served at this hour?" — so they must be able to coexist on one section.
    "served alongside available": (
        lambda d: _first_section(d).update(available={"season": "winter"}),
        "clean", None,
    ),
    # Section-only until a real menu needs otherwise: an unexercised field ships
    # in every phone's precache with no screen reading it (ADR 0047).
    "served on a dish": (
        lambda d: _first_item(d).update(
            served={k: [] for k in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")}
        ),
        "error", r'served is a section field, not a dish field',
    ),
}


# Mutations to a SOURCE file rather than to a record. The gates that hold two
# hand-maintained tables in step live in the code, so no amount of breaking a
# menu could ever exercise them — and a drift gate that cannot fire is the
# decorative guard this repo keeps finding. path -> {name: (mutate_text, expect)}.
SOURCE_CASES = {
    # `1e400` is spec-legal JSON that BOTH Python and JSON.parse silently widen
    # to infinity, so the NaN/Infinity token gate never sees it and it would
    # render as "$Infinity". It can only be written as raw source: json.dumps
    # emits `Infinity` for a Python float, never the literal that produced it,
    # so a dict mutation up in CASES could not express this at all.
    "site/data/restaurants/gold-lining-cafe.json": {
        "a price that overflows to infinity": (
            lambda s: s.replace('"price": 14.0,', '"price": 1e400,', 1),
            "error", r"price for .* must be a finite number, got inf",
        ),
    },
    # The two tags added on 2026-08-17, proved load-bearing the only way that
    # means anything: take one out of the vocabulary and the REAL corpus must
    # stop validating. A tag nothing in `site/data/` uses would let both of
    # these pass while the sweep that was supposed to apply it never happened —
    # the decorative-guard shape (ADR 0072), and the reason these are here and
    # not just a "the tag is legal" case up in CASES.
    "tools/validate.py": {
        "`df-option` dropped from the vocabulary": (
            lambda s: s.replace('"gf-option", "v-option", "df-option", "vg-option",',
                                '"gf-option", "v-option", "vg-option",'),
            "error", r"unknown tag 'df-option' on ",
        ),
        "`vg-option` dropped from the vocabulary": (
            lambda s: s.replace('"gf-option", "v-option", "df-option", "vg-option",',
                                '"gf-option", "v-option", "df-option",'),
            "error", r"unknown tag 'vg-option' on ",
        ),
    },
    "site/js/addons.js": {
        # CONTRADICTS and tag_allergens.CONTRADICTED_BY are one food fact,
        # inverted. Give `df` an allergen the Python table doesn't agree with.
        "CONTRADICTS drifts from CONTRADICTED_BY": (
            lambda s: s.replace(
                'df: ["contains-dairy"],', 'df: ["contains-dairy", "contains-egg"],'
            ),
            "error", r'contradiction tables have drifted for contains-egg',
        ),
        # …and prove the parse isn't quietly returning an empty table, which
        # would make every comparison above it vacuously true.
        "CONTRADICTS can no longer be found": (
            lambda s: s.replace("export const CONTRADICTS =", "export const CONTRADICTS_OLD ="),
            "error", 'could not read CONTRADICTS out of site/js/addons\\.js',
        ),
    },
    # The ids in the corpus are load-bearing, not decoration — and only a
    # mutation of the REAL file can show that. Take the Gold Card cheeseburger's
    # id away and it stops saying who it is; before the field was required it
    # instead fell back to `slug(name)` and collided with the Mains cheeseburger
    # ($28 charged for a $21 dish, one anchor, one heart). Requiring it turns the
    # silent collision into a refusal at the gate, which is why this case now
    # asserts the id is *missing* rather than that two rows fought over one.
    "site/data/restaurants/sprig-and-fern-tawa.json": {
        "an explicit dishId removed from real data": (
            lambda s: s.replace('          "dishId": "cheeseburger-gold-card",\n', "", 1),
            "error", 'dish \\\'Cheeseburger\\\' has no "dishId"',
        ),
    },
    # ADR 0057: `section.note` exists because the qualifier LEFT the heading. A
    # split started and not finished — note added, heading not shortened — is
    # the failure mode with no symptom: the data looks migrated, the jump-nav
    # chip is as long as it ever was, and the reader is told "12 and under"
    # twice. Only a mutation of the real record can show the gate fires.
    #
    # These two cases used to key on Brunch's "served till 2pm", which became a
    # structured `served` window on 2026-08-17 (ROADMAP 28c) — and the mutation
    # then matched nothing, which the harness reports rather than passing. That
    # is the point of the no-op guard: a case pinned to real data goes stale
    # exactly when the data moves. Kids' "12 and under" is the note this gate is
    # now for — a qualifier that is prose because it is NOT a timetable, so it
    # will not be structured away underneath the case a second time.
    "site/data/restaurants/the-borough-tawa.json": {
        "a section note put back inside its own heading": (
            lambda s: s.replace('"section": "Kids",', '"section": "Kids (12 and under)",', 1),
            "error", r"note '12 and under' is still inside the section name",
        ),
        "a section note emptied to a blank string": (
            lambda s: s.replace('"note": "12 and under"', '"note": "   "', 1),
            "error", r'note must be a non-empty string, got ',
        ),
        # ADR 0058. A duplicate `id` attribute is VALID HTML — the browser does
        # not complain, `querySelector` resolves to the first match, and the
        # second section quietly becomes unreachable by link and invisible to
        # the scroll-spy. Nothing on the page looks wrong. Only the gate can
        # say so, which is why it is the one with teeth.
        "two sections claiming one anchor": (
            lambda s: s.replace('"sectionId": "brunch",', '"sectionId": "pizza",', 1),
            "error", r"sectionId 'pizza' is already used by section 'Pizza'",
        ),
        # An id goes straight into an `id` attribute and a URL fragment, so a
        # space or a capital is a link that works in one browser and not the
        # next — a failure that only shows up on somebody else's phone.
        "a sectionId that is not a slug": (
            lambda s: s.replace('"sectionId": "brunch",', '"sectionId": "Brunch Time",', 1),
            "error", r"sectionId 'Brunch Time' is not a slug — expected 'brunch-time'",
        ),
        # Required since the last of 235 sections was seeded. Without this the
        # field is optional in practice, `menu.js`'s fail-soft slug quietly
        # takes over, and the anchor is derived from the heading again — which
        # is the entire thing ADR 0058 exists to stop.
        "a section with no id at all": (
            lambda s: s.replace('      "sectionId": "brunch",\n', "", 1),
            "error", 'no sectionId — run tools/seed_section_ids\\.py',
        ),
    },
    # ADR 0155 — the "anywhere" branch (owner-ruled 2026-09-08, 470/050). Cook
    # at Home's one public branch declares that it matches every address as a
    # VALUE, exactly {"anywhere": true}. Mutated on the real file, text-level,
    # so an anchor that stops matching fails loudly rather than passing. The
    # first case is the positive one: a gate broken into refusing the wildcard
    # outright fails it, and so does the unmutated baseline.
    "site/data/restaurants/cook-at-home.json": {
        "the wildcard branch as shipped — legal (the positive case)": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE.replace("true", "true "), 1),
            "clean", None,
        ),
        "the wildcard spelled as a word": (
            lambda s: s.replace(_ANYWHERE, '      "address": "anywhere"', 1),
            "error", r"locations\[0\]: address 'anywhere' reads as \"anywhere\" but is a string",
        ),
        "the wildcard spelled as a glob": (
            lambda s: s.replace(_ANYWHERE, '      "address": "*"', 1),
            "error", r"locations\[0\]: address '\*' reads as \"anywhere\" but is a string",
        ),
        "the wildcard capitalised as a word": (
            lambda s: s.replace(_ANYWHERE, '      "address": "Anywhere"', 1),
            "error", r"locations\[0\]: address 'Anywhere' reads as \"anywhere\"",
        ),
        "the wildcard object set false": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE.replace("true", "false"), 1),
            "error", r"locations\[0\]: address \{'anywhere': False\} is not the wildcard",
        ),
        # Python's `1 == True` is the trap this case exists for; the app's
        # `=== true` would read it as an object it cannot render.
        "the wildcard object set to 1": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE.replace("true", "1"), 1),
            "error", r"locations\[0\]: address \{'anywhere': 1\} is not the wildcard",
        ),
        "the wildcard object with a capital key": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE.replace('"anywhere"', '"Anywhere"'), 1),
            "error", r"locations\[0\]: address \{'Anywhere': True\} is not the wildcard",
        ),
        "the wildcard object carrying a second key": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE.replace("true", 'true,\n        "lat": -41.2'), 1),
            "error", r"locations\[0\]: address \{'anywhere': True, 'lat': -41\.2\} is not the wildcard",
        ),
        "the wildcard branch WITH coordinates": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE + ',\n      "lat": -41.2,\n      "lng": 174.8', 1),
            "error", r"locations\[0\]: a branch that is anywhere cannot also have lat",
        ),
        "the wildcard branch with a phone": (
            lambda s: s.replace(_ANYWHERE, _ANYWHERE + ',\n      "phone": "+64 4 000 0000"', 1),  # leakscan:allow:nz-phone: synthetic fixture, not a real line
            "error", r"locations\[0\]: a branch that is anywhere cannot also have phone",
        ),
        # The hard rule: no home address of a person, anywhere. A recipe
        # collection's branches are houses; a shipped one is precached onto
        # every phone. A REAL-looking address is refused, not just odd ones.
        "a real street address on a recipe collection's branch": (
            lambda s: s.replace(_ANYWHERE, '      "address": "1 Example Street, Exampletown"', 1),  # leakscan:allow:nz-address: synthetic fixture; no such street
            "error", r"locations\[0\]: a recipe collection's shipped branch must be \{\"anywhere\": true\}",
        ),
        "the branch's address removed — absence is not the wildcard": (
            lambda s: s.replace(_ANYWHERE + "\n", "", 1).replace('"id": "anywhere",', '"id": "anywhere"', 1),
            "error", r"locations\[0\]: address must be a non-empty string",
        ),
        "the branch's address set null — null is not the wildcard": (
            lambda s: s.replace(_ANYWHERE, '      "address": null', 1),
            "error", r"locations\[0\]: address must be a non-empty string",
        ),
    },
    # Per-branch provenance. Pandan is the only record that carries it and the
    # record that forced it — Melling first-party, Press Hall's hours its
    # landlord's. The venue-level pair was already gated; the branch-level one
    # is new code on a path nothing else in the corpus exercises, so it is
    # mutated on the REAL file rather than trusted to be symmetric.
    "site/data/restaurants/pandan-asian-cuisine.json": {
        # The fourth object with an unknown-key gate, and the only one that
        # needs a real multi-branch record to exercise — the subject up in
        # CASES has no `locations` array to put a stray key in.
        "unknown key on a branch": (
            lambda s: s.replace('      "label": "Melling",',
                                '      "label": "Melling",\n      "adress": "x",', 1),
            "error", r"locations\[0\]: unknown key 'adress' — did you mean 'address'\?",
        ),
        "a branch method with no branch date": (
            lambda s: s.replace('      "detailsVerified": "2026-08-15",\n      "detailsVerifiedBy": "official-site"', '      "detailsVerifiedBy": "official-site"', 1),
            "error", 'locations\\[0\\]: detailsVerifiedBy is set but detailsVerified is null',
        ),
        "a branch date with no method — an ERROR here, unlike `verified`": (
            lambda s: s.replace('      "detailsVerified": "2026-08-15",\n      "detailsVerifiedBy": "official-site"', '      "detailsVerified": "2026-08-15"', 1),
            "error", 'locations\\[0\\]: detailsVerified 2026-08-15 carries no detailsVerifiedBy',
        ),
        "a branch method outside the closed set": (
            lambda s: s.replace('"detailsVerifiedBy": "official-site"', '"detailsVerifiedBy": "a mate reckons"', 1),
            "error", "locations\\[0\\]: detailsVerifiedBy 'a mate reckons' not in ",
        ),
        "a branch date that is not a date": (
            lambda s: s.replace(
                '      "detailsVerified": "2026-08-15",\n      "detailsVerifiedBy": "official-site"',
                '      "detailsVerified": "last winter",\n      "detailsVerifiedBy": "official-site"',
                1,
            ),
            "error", 'locations\\[0\\]: detailsVerified must be null or an ISO date',
        ),
        # ADR 0103. A branch id has NO visible symptom when it is wrong —
        # nothing on any screen renders one — so unlike a duplicate `sectionId`
        # (which at least makes a link land in the wrong place) these four
        # breaks are invisible everywhere except here.
        "two branches claiming one identity": (
            lambda s: s.replace('"id": "press-hall",', '"id": "melling",', 1),
            "error", r"locations\[1\]: id 'melling' is already used by locations\[0\] \('Melling'\)",
        ),
        "a branch id that is not a slug": (
            lambda s: s.replace('"id": "melling",', '"id": "Melling Road",', 1),
            "error", r"locations\[0\]: id 'Melling Road' is not a slug — expected 'melling-road'",
        ),
        # ADR 0155: only a recipe collection is everywhere. A restaurant's
        # branch declaring it would read as "we have no address" in a voice
        # that hides the gap.
        "the wildcard on a restaurant's branch": (
            lambda s: s.replace('"address": "5 Melling Road, Lower Hutt 5010",', '"address": {"anywhere": true},', 1),  # leakscan:allow:nz-address: a public venue's shop address, already in its record
            "error", r"locations\[0\]: address \{\"anywhere\": true\} is only for a recipe collection",
        ),
        "a branch with no id at all": (
            lambda s: s.replace('      "id": "melling",\n', "", 1),
            "error", r"locations\[0\]: no id — run tools/seed_branch_ids\.py",
        ),
        # An empty string is the shape a hand-edit produces — someone clears the
        # value meaning to retype it — and it is not caught by the presence gate
        # above, because the key is still there.
        "a branch id blanked rather than removed": (
            lambda s: s.replace('"id": "melling",', '"id": "   ",', 1),
            "error", r"locations\[0\]: id must be a non-empty string, got",
        ),
        # ADR 0132 — per-branch closure (owner-ruled 2026-08-22). The corpus
        # holds no closed branch, so every rule below is new code on a path no
        # real record exercises; each is mutated on Pandan, whose two branches
        # make the "one shut, the other trading" case the whole ruling is for.
        "one branch shut, the other trading — the case the ruling is for": (
            lambda s: _branch_lc(s, "melling", '{"events": [{"type": "closed-permanently", "date": "2026-09-01"}]}'),
            "clean", None,
        ),
        "a branch refit, overdue, reopened — the full vocabulary is legal": (
            lambda s: _branch_lc(s, "melling", '{"added": "2026-08-15", "events": ['
                                 '{"type": "closed-temporarily", "date": "2026-08-20", "until": "2026-08-25", "note": "refit"}, '
                                 '{"type": "reopened", "date": "2026-08-28"}]}'),
            "clean", None,
        ),
        "an unknown key inside a branch lifecycle": (
            lambda s: _branch_lc(s, "melling", '{"closed": true}'),
            "error", r"locations\[0\]\.lifecycle has unknown key 'closed'",
        ),
        "a branch lifecycle that is not an object": (
            lambda s: _branch_lc(s, "melling", '"closed"'),
            "error", r"locations\[0\]\.lifecycle must be an object",
        ),
        "a branch event type outside the vocabulary": (
            lambda s: _branch_lc(s, "melling", '{"events": [{"type": "sold", "date": "2026-09-01"}]}'),
            "error", r"locations\[0\]\.lifecycle\.events\[0\]: type must be one of",
        ),
        "a branch reopening that was never closed": (
            lambda s: _branch_lc(s, "melling", '{"events": [{"type": "reopened", "date": "2026-09-01"}]}'),
            "error", r"locations\[0\]\.lifecycle\.events\[0\]: 'reopened' but the branch was not closed",
        ),
        "an event after a branch's permanent closure": (
            lambda s: _branch_lc(s, "melling", '{"events": [{"type": "closed-permanently", "date": "2026-09-01"}, '
                                 '{"type": "reopened", "date": "2026-09-02"}]}'),
            "error", r"locations\[0\]\.lifecycle\.events\[1\]: nothing can follow 'closed-permanently'",
        ),
        "a branch that entered Faves before its venue did": (
            lambda s: _branch_lc(s, "melling", '{"added": "2026-01-01"}'),
            "error", r"locations\[0\]\.lifecycle\.added 2026-01-01 precedes the venue's added 2026-08-15",
        ),
        "a branch added date that is not a date": (
            lambda s: _branch_lc(s, "melling", '{"added": "last winter"}'),
            "error", r"locations\[0\]\.lifecycle\.added must be an ISO date",
        ),
        "every branch gone while the venue still trades": (
            lambda s: _branch_lc(_branch_lc(s, "melling", _GONE), "press-hall", _GONE),
            "error", r"every branch is permanently closed but the venue's lifecycle is not",
        ),
        "every branch gone AND the venue says so — legal": (
            lambda s: _branch_lc(_branch_lc(s, "melling", _GONE), "press-hall", _GONE).replace(
                '"added": "2026-08-15"\n  }',
                '"added": "2026-08-15",\n    "events": [{"type": "closed-permanently", "date": "2026-09-02"}]\n  }', 1),
            "clean", None,
        ),
        "every branch shut for a refit while the venue trades — a warning": (
            lambda s: _branch_lc(_branch_lc(s, "melling", _REFIT), "press-hall", _REFIT),
            "warn", r"every branch is closed but the venue's lifecycle says trading",
        ),
    },
}


# ADR 0155: the wildcard's exact text in cook-at-home.json, as the anchor every
# case above edits. If the record is reformatted, every case fails as MUTATION
# MATCHED NOTHING — loudly — rather than passing.
_ANYWHERE = '      "address": {\n        "anywhere": true\n      }'


# ADR 0132 helpers: put a `lifecycle` on one branch of the Pandan record by its
# id line. Text-level, like every other SOURCE_CASES mutation, so a case whose
# anchor stops matching fails as MUTATION MATCHED NOTHING rather than passing.
_GONE = '{"events": [{"type": "closed-permanently", "date": "2026-09-01"}]}'
_REFIT = '{"events": [{"type": "closed-temporarily", "date": "2026-09-01"}]}'


def _branch_lc(s, branch_id, block):
    return s.replace(f'      "id": "{branch_id}",\n',
                     f'      "id": "{branch_id}",\n      "lifecycle": {block},\n', 1)


def run_validate(cwd: Path):
    proc = subprocess.run(
        [sys.executable, "tools/validate.py"],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    return proc.returncode, proc.stdout + proc.stderr


def said(out, baseline):
    """The ERROR/warning lines this run added to the baseline's.

    Subtracting the baseline is the whole mechanism. The unmutated corpus emits
    seventy warnings, so `"warning" in out` is true before a single case runs —
    which is exactly how two `warn` cases here passed for years without ever
    provoking the warning they were written for."""
    lines = [l for l in out.splitlines() if l.startswith(("ERROR:", "warning:"))]
    return [l for l in lines if l not in baseline]


def verdict(name, expect, want, rc, new):
    """(ok, what to print) for one case. Whether the mutation was CAUGHT is not
    the same question as whether the RIGHT guard caught it, and this is where
    the second question gets asked."""
    if want is not None and not isinstance(want, str):
        return False, f"BAD CASE — want must be a regex string or None"
    errs = [l for l in new if l.startswith("ERROR:")]
    warns = [l for l in new if l.startswith("warning:")]
    hits = [l for l in (errs if expect == "error" else warns if expect == "warn" else new)
            if want is not None and re.search(want, l)]

    if expect == "error":
        if rc == 0:
            return False, "PASSED SILENTLY"
        if not errs:
            return False, "exited non-zero but said NOTHING (a crash, not a verdict)"
        if not hits:
            return False, f"caught by the WRONG check — wanted /{want}/, got: {errs[0][:90]}"
        return True, "caught"
    if expect == "warn":
        if rc != 0:
            return False, "errored, but this case expects a warning"
        if not hits:
            return False, f"no warning matching /{want}/ — the mutation went by in silence"
        return True, "warned"
    # clean
    if rc != 0:
        return False, "REJECTED"
    if want is not None and not hits:
        return False, f"accepted, but said nothing matching /{want}/"
    return True, "accepted"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's output")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory(prefix="faves-validate-") as tmp:
        work = Path(tmp) / "repo"
        # Only what validate.py reads. Copying the whole repo would drag the
        # git dir and site assets through a temp dir for no benefit.
        work.mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")
        # validate.py reads four tables out of the shipped JS so they can't
        # drift from their Python counterparts (see _load_renames,
        # _load_contradicts, _load_vibes and _load_diet_filters there), so the
        # sandbox needs those modules too. Omitting one is fatal, not silent
        # for most: _load_vibes exits rather than returning an empty
        # vocabulary that would pass everything. `_load_diet_filters` (roadmap
        # 350/020 step 4) is the one exception that fails QUIET rather than
        # LOUD — an empty DIET_FILTERS makes check_ingredient_claims refuse
        # every part's claim as unsatisfied, which is conservative (an error,
        # never a silent pass) but is still the wrong error for the right
        # reason, and dietary.js going missing here once already produced
        # exactly that: two real, already-clean cook-at-home dishes failing
        # with "give that line a satisfying tag ()" — an empty suggestion list
        # being the tell that the table, not the data, was the hole.
        (work / "site" / "js").mkdir(parents=True, exist_ok=True)
        for mod in ("renames.js", "addons.js", "vibes.js", "dietary.js"):
            shutil.copy(ROOT / "site" / "js" / mod, work / "site" / "js" / mod)

        # A git repository whose HEAD is the unmutated copy, so the retired-
        # dish-id check (roadmap 28l) has a baseline to compare each mutation
        # with. Its own repo, never the one this file lives in: validate.py
        # refuses a git toplevel that is not its ROOT, so it cannot wander up
        # into a parent checkout. Signing and hooks off — the sandbox is not a
        # commit anyone keeps.
        git = ["git", "-C", str(work), "-c", "user.name=test_validate",
               "-c", "user.email=test-validate@invalid", "-c", "commit.gpgsign=false",
               "-c", "core.hooksPath=/dev/null"]
        for step in (["init", "-q"], ["add", "site", "tools"],
                     ["commit", "-q", "--no-verify", "-m", "pristine corpus"]):
            subprocess.run(git + step, check=True, capture_output=True, timeout=120)

        rc, out = run_validate(work)
        if rc != 0:
            print("BASELINE FAILED — the unmutated tree does not validate.", file=sys.stderr)
            print(out, file=sys.stderr)
            return 1
        baseline = {l for l in out.splitlines() if l.startswith(("ERROR:", "warning:"))}
        print(f"baseline: clean ({SUBJECT.split('/')[-1]} is the subject); "
              f"{len(baseline)} line(s) it already says, subtracted from every case")

        subject = work / SUBJECT
        original = subject.read_text(encoding="utf-8")
        base = json.loads(original)

        failures = []
        for name, case in CASES.items():
            if len(case) != 3:
                print(f"  ❌ {name:38} NO EXPECTED MESSAGE — a case must say "
                      f"WHICH complaint it provokes")
                failures.append(name)
                continue
            mutate, expect, want = case
            d = copy.deepcopy(base)
            mutate(d)
            # The guard SOURCE_CASES has always had, and CASES never did. It is
            # not hypothetical: "absent timezone is legal" popped a key no venue
            # carries, so for its whole life it validated the pristine record.
            if d == base:
                print(f"  ❌ {name:38} MUTATION CHANGED NOTHING in the record")
                failures.append(name)
                continue
            subject.write_text(json.dumps(d, indent=2), encoding="utf-8")
            rc, out = run_validate(work)
            subject.write_text(original, encoding="utf-8")

            ok, got = verdict(name, expect, want, rc, said(out, baseline))
            print(f"  {'✅' if ok else '❌'} {name:38} {got}")
            if args.verbose:
                for line in out.splitlines():
                    print(f"       | {line}")
            if not ok:
                failures.append(name)

        for rel, cases in SOURCE_CASES.items():
            target = work / rel
            pristine = target.read_text(encoding="utf-8")
            for name, case in cases.items():
                if len(case) != 3:
                    print(f"  ❌ {name:38} NO EXPECTED MESSAGE — a case must say "
                          f"WHICH complaint it provokes")
                    failures.append(name)
                    continue
                mutate, expect, want = case
                broken = mutate(pristine)
                # A mutation that changed nothing would "pass" for the wrong
                # reason the day the source it edits is reworded.
                if broken == pristine:
                    print(f"  ❌ {name:38} MUTATION MATCHED NOTHING in {rel}")
                    failures.append(name)
                    continue
                target.write_text(broken, encoding="utf-8")
                rc, out = run_validate(work)
                target.write_text(pristine, encoding="utf-8")

                ok, got = verdict(name, expect, want, rc, said(out, baseline))
                print(f"  {'✅' if ok else '❌'} {name:38} {got}")
                if args.verbose:
                    for line in out.splitlines():
                        print(f"       | {line}")
                if not ok:
                    failures.append(name)

    drift = check_need_kinds_agree()
    if drift:
        print(f"  ❌ {'needs vocabulary agrees across files':38} {drift}")
        failures.append("needs vocabulary drift")
    else:
        print(f"  ✅ {'needs vocabulary agrees across files':38} in step")

    if failures:
        print(
            f"\n{len(failures)} hole(s) in the gate: {', '.join(failures)}\n"
            "A mutation that validates clean is data validate.py would let into "
            "the live site.",
            file=sys.stderr,
        )
        return 1

    total = len(CASES) + sum(len(c) for c in SOURCE_CASES.values())
    print(f"\nAll {total} mutations behaved as specified.")
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
