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


def _first_item(d):
    """The first menu item of the first section — where price/tag cases land."""
    return d["menu"][0]["items"][0]


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
            {"name": "Satay", "tags": ["contains-peanuts", "vg", "gf", "df"]},
            {"name": "Garlic yogurt", "tags": ["contains-dairy", "v", "gf"]},
        ],
    }
    d["addOnGroups"] = [group]
    _first_item(d)["addOns"] = ["sauces"]
    return group


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
    "every `-option` tag is legal": (
        lambda d: _first_item(d).update(
            tags=["gf-option", "v-option", "df-option", "vg-option"]
        ),
        "clean", None,
    ),
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
        "error", 'ingredients for .* must be a list of strings or \\{component, items\\} groups',
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
    # The typo that sells an extra free: a mistyped price key inside a group
    # that defaults to 0 is not a harmless no-op, it is an under-stated total.
    "mistyped price key on an add-on option": (
        _breaks(lambda g, d: g["options"][0].update(prive=2.5)),
        "error", r"option 'Satay': unknown key 'prive'",
    ),
    "unknown key on an add-on group": (
        _breaks(lambda g, d: g.update(maxx=2)),
        "error", r"add-on group 'sauces': unknown key 'maxx'",
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
    "a well-formed dishId is legal": (
        lambda d: _first_item(d).update(dishId="eggs-on-toast-classic"),
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
    "served close before open": (
        lambda d: _first_section(d)["served"].update(mon=[["14:30", "07:30"]]),
        "error", 'served\\[mon\\] close 07:30 must be after open 14:30',
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
    },
}


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
        # validate.py reads three tables out of the shipped JS so they can't
        # drift from their Python counterparts (see _load_renames,
        # _load_contradicts and _load_vibes there), so the sandbox needs those
        # modules too. Omitting one is fatal, not silent: _load_vibes exits
        # rather than returning an empty vocabulary that would pass everything.
        (work / "site" / "js").mkdir(parents=True, exist_ok=True)
        for mod in ("renames.js", "addons.js", "vibes.js"):
            shutil.copy(ROOT / "site" / "js" / mod, work / "site" / "js" / mod)

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
    sys.exit(main())
