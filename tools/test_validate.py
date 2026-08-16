#!/usr/bin/env python3
"""Mutation-test `validate.py` — prove the data gate actually catches things.

`validate.py` is the gate every menu edit passes through, and CI trusts it
to keep bad data out of a live site. Until 2026-08-09 nothing tested it.
That matters because the failure mode of a validator is *silence*: a check
that never fires looks exactly like data that is always clean, and the repo
had 483 JS tests and zero Python ones, so no gate here was exercised at all.

The method is deliberately crude and therefore honest: take a **real**
record, break it in one specific way, and assert `validate.py` exits
non-zero. Real records rather than fixtures, because a fixture drifts from
the schema and then tests nothing. It found a real hole on its first run —
a negative price validated clean, since `price` was type-checked but never
sign-checked while `pricePerPerson` ten lines above it always was.

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


def _first_item(d):
    """The first menu item of the first section — where price/tag cases land."""
    return d["menu"][0]["items"][0]


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


# name -> (mutate, expectation). "error" = must exit non-zero. "warn" = must
# exit zero but say something; the no-backfill accommodations live here, and
# they are asserted so a later change cannot silently promote or drop them.
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
    "required id removed": (lambda d: d.pop("id", None), "error"),
    "menu item loses its name": (lambda d: _first_item(d).pop("name", None), "error"),
    "price becomes a string": (lambda d: _first_item(d).update(price="free"), "error"),
    "price becomes a boolean": (lambda d: _first_item(d).update(price=True), "error"),
    "status set to nonsense": (lambda d: d.update(status="banana"), "error"),
    "bogus dietary tag": (lambda d: _first_item(d).update(tags=["not-a-real-tag"]), "error"),
    # --- values, not just types (the class the first run found a hole in) --
    "negative price": (lambda d: _first_item(d).update(price=-5), "error"),
    "free item is legal": (lambda d: _first_item(d).update(price=0), "clean"),
    # --- referential integrity -------------------------------------------
    "pick names a non-existent dish": (
        lambda d: d.update(picks=["Totally Invented Dish 9000"]),
        "error",
    ),
    # --- derivation, ADR 0031 --------------------------------------------
    # Where a venue IS (ADR 0043). Both fields are optional, so the gate's job is
    # to catch a *stated* one that is wrong — a typo'd zone or code would
    # otherwise render a confident wrong clock or an unlabelled price.
    # formerIds must agree with site/js/renames.js or an old shared link 404s
    # while the record claims the id is handled (both silent).
    "formerIds naming an id renames.js doesn't map": (
        lambda d: d.update(formerIds=["gold-lining-cafe-old"]),
        "error",
    ),
    "formerIds listing the record's own id": (
        lambda d: d.update(formerIds=[d["id"]]),
        "error",
    ),
    # currency is REQUIRED now (ADR 0045) — a price whose currency is unknown
    # cannot be converted, and looks exactly like one that can.
    "currency missing entirely": (lambda d: d.pop("currency", None), "error"),
    "currency with no shipped FX rate": (lambda d: d.update(currency="ZWL"), "error"),
    "timezone that is not an IANA zone": (
        lambda d: d.update(timezone="Pacific/Wellington"),  # plausible, and not real
        "error",
    ),
    "timezone as a number": (lambda d: d.update(timezone=12), "error"),
    "a real IANA zone is legal": (lambda d: d.update(timezone="Europe/London"), "clean"),
    "absent timezone is legal (means home)": (lambda d: d.pop("timezone", None), "clean"),
    "currency that is not an ISO 4217 code": (lambda d: d.update(currency="dollars"), "error"),
    "currency in lower case": (lambda d: d.update(currency="gbp"), "error"),
    # Legal, but it costs the venue its derived price band — so the gate must
    # WARN rather than pass in silence (validate.py exits 0 on warnings).
    "an uncalibrated currency is legal but warns": (lambda d: d.update(currency="GBP"), "clean"),
    "verifiedBy off the closed set": (lambda d: d.update(verifiedBy="vibes"), "error"),
    "verifiedBy names a person": (lambda d: d.update(verifiedBy="owner-mike"), "error"),
    "method with no date": (lambda d: d.update(verified=None), "error"),
    "status verified without a derivation": (
        lambda d: d.update(status="verified", verified=None, verifiedBy=None),
        "error",
    ),
    "date with no method still only warns": (
        lambda d: d.update(verifiedBy=None),
        "warn",
    ),
    # --- dish-level gaps, `needs` ----------------------------------------
    "needs kind off the closed set": (
        lambda d: _first_item(d).update(needs=[{"what": "vibes"}]),
        "error",
    ),
    "needs with an unknown key": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "why": "x"}]),
        "error",
    ),
    "needs is empty rather than absent": (
        lambda d: _first_item(d).update(needs=[]),
        "error",
    ),
    "needs since is not a date": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "since": "last Tuesday"}]),
        "error",
    ),
    "same needs kind claimed twice": (
        lambda d: _first_item(d).update(needs=[{"what": "name"}, {"what": "name"}]),
        "error",
    ),
    # The one that keeps the worklist honest: a dish that has been priced but
    # still carries needs.what='price' renders no indicator, so the gap would
    # sit in the data invisibly and needs.py would keep reporting a done job.
    "priced dish still claiming an unread price": (
        lambda d: _first_item(d).update(price=9.5, needs=[{"what": "price"}]),
        "error",
    ),
    "a well-formed needs entry is legal": (
        lambda d: _first_item(d).update(
            price=None, needs=[{"what": "price", "note": "label obscured", "since": "2026-08-07"}]
        ),
        "clean",
    ),
    # --- add-ons, ADR 0048 -------------------------------------------------
    "a well-formed add-on group is legal": (_add_ons, "clean"),
    "an option that states no tags is legal": (
        _breaks(lambda g, d: g["options"][0].update(tags=[])),
        "clean",
    ),
    # The one the ADR argued hardest for: a forgotten price must not become a
    # silently free add-on and an under-stated total.
    "add-on priced at neither level": (_breaks(lambda g, d: g.pop("price")), "error"),
    # Null must never reach an add-on price — a dish price uses it for two
    # different unknowns (`—` and `?`), and nothing on this screen tells them apart.
    "add-on option price written as null": (
        _breaks(lambda g, d: g["options"][0].update(price=None)),
        "error",
    ),
    "add-on group price written as null": (_breaks(lambda g, d: g.update(price=None)), "error"),
    "negative add-on price": (_breaks(lambda g, d: g["options"][0].update(price=-2)), "error"),
    # Referential integrity, both directions. A dangling id renders nothing at
    # all (groupsFor drops it rather than throwing), so it fails in silence.
    "dish addOns names an undefined group": (
        _breaks(lambda g, d: _first_item(d).update(addOns=["gravy"])),
        "error",
    ),
    "section addOns names an undefined group": (
        _breaks(lambda g, d: d["menu"][0].update(addOns=["gravy"])),
        "error",
    ),
    "an add-on group nobody references": (
        _breaks(lambda g, d: _first_item(d).pop("addOns")),
        "warn",
    ),
    # Identity: two groups sharing an id make every reference to it ambiguous,
    # and two options sharing a name make a selection unresolvable.
    "two add-on groups with the same id": (
        _breaks(lambda g, d: d["addOnGroups"].append(copy.deepcopy(g))),
        "error",
    ),
    "two options with the same name in one group": (
        _breaks(lambda g, d: g["options"].append({"name": "Satay", "tags": []})),
        "error",
    ),
    "add-on group id that is not kebab-case": (
        _breaks(lambda g, d: (g.update(id="Sauces"), _first_item(d).update(addOns=["Sauces"]))),
        "error",
    ),
    "select off the closed set": (_breaks(lambda g, d: g.update(select="several")), "error"),
    "max on a pick-one group": (_breaks(lambda g, d: g.update(select="one")), "error"),
    "max above the number of options": (_breaks(lambda g, d: g.update(max=5)), "error"),
    "add-on option with no tags at all": (
        _breaks(lambda g, d: g["options"][0].pop("tags")),
        "error",
    ),
    "unknown tag on an add-on option": (
        _breaks(lambda g, d: g["options"][0].update(tags=["contains-mystery"])),
        "error",
    ),
    # The typo that sells an extra free: a mistyped price key inside a group
    # that defaults to 0 is not a harmless no-op, it is an under-stated total.
    "mistyped price key on an add-on option": (
        _breaks(lambda g, d: g["options"][0].update(prive=2.5)),
        "error",
    ),
    "unknown key on an add-on group": (
        _breaks(lambda g, d: g.update(maxx=2)),
        "error",
    ),
    # addOnsOnly must never be a delete wearing a nicer name: it may only hide
    # rows that some group still offers.
    "addOnsOnly on a section no group offers": (
        _breaks(lambda g, d: d["menu"][0].update(addOnsOnly=True)),
        "error",
    ),
    "addOnsOnly set to something other than true": (
        _breaks(lambda g, d: d["menu"][0].update(addOnsOnly="yes")),
        "error",
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
        "error",
    ),
    "a dish deeper in the menu with no dishId": (
        lambda d: d["menu"][2]["items"][-1].pop("dishId", None),
        "error",
    ),
    "dishId present but null": (lambda d: _first_item(d).update(dishId=None), "error"),
    # Two dishes resolving to one id share an anchor, a heart, a rating and an
    # order line, and every one of those fails in silence.
    "one dish printed twice under one id": (_twin, "error"),
    "the second copy carries its own dishId": (
        lambda d: _twin(d, "eggs-on-toast-soup"),
        "clean",
    ),
    "two dishes sharing one explicit dishId": (
        lambda d: (_first_item(d).update(dishId="eggs"), _twin(d)),
        "error",
    ),
    # A dishId must BE a slug, not merely resolve to one: it is carried verbatim
    # into `#dish-…` and into stored keys, so `"Gold Card"` builds a broken anchor.
    "dishId that is not in slug form": (
        lambda d: _first_item(d).update(dishId="Gold Card"),
        "error",
    ),
    "dishId that is an empty string": (lambda d: _first_item(d).update(dishId=""), "error"),
    "a well-formed dishId is legal": (
        lambda d: _first_item(d).update(dishId="eggs-on-toast-classic"),
        "clean",
    ),
    # formerIds keeps an old shared link and an old stored heart resolving. A
    # former id that is also a LIVE one never arrives — findDish tries live ids
    # first — so the claim would sit there looking honoured.
    "dish formerIds claiming a live dish's id": (
        lambda d: _first_item(d).update(formerIds=["eggs-benedict"]),
        "error",
    ),
    "two dishes claiming the same former id": (
        lambda d: (
            _first_item(d).update(formerIds=["morning-eggs"]),
            d["menu"][0]["items"][1].update(formerIds=["morning-eggs"]),
        ),
        "error",
    ),
    "dish formerIds entry that is not a slug": (
        lambda d: _first_item(d).update(formerIds=["Eggs On Toast"]),
        "error",
    ),
    "dish formerIds that is not a list": (
        lambda d: _first_item(d).update(formerIds="eggs-on-toast"),
        "error",
    ),
    "a retired dish id is legal": (
        lambda d: _first_item(d).update(dishId="eggs-on-ciabatta", formerIds=["eggs-on-toast"]),
        "clean",
    ),
    # picks are written as names, and a name is not unique within a venue: this
    # one silently resolved to whichever row came first until ADR 0051.
    "a pick naming a dish the menu prints twice": (
        lambda d: (_twin(d, "eggs-on-toast-soup"), d.update(picks=["Eggs on Toast"])),
        "error",
    ),
    "a pick naming a dish by its id": (
        lambda d: (_twin(d, "eggs-on-toast-soup"), d.update(picks=["eggs-on-toast-soup"])),
        "clean",
    ),
    # goesWith widened to ids, so a pairing can point at a disambiguated row —
    # without losing the check that it points at something.
    "goesWith naming a dish by its id": (
        lambda d: (
            _twin(d, "eggs-on-toast-soup"),
            _first_item(d).update(goesWith=["eggs-on-toast-soup"]),
        ),
        "clean",
    ),
    "goesWith naming a dish that isn't there": (
        lambda d: _first_item(d).update(goesWith=["Totally Invented Dish 9000"]),
        "error",
    ),
}


# Mutations to a SOURCE file rather than to a record. The gates that hold two
# hand-maintained tables in step live in the code, so no amount of breaking a
# menu could ever exercise them — and a drift gate that cannot fire is the
# decorative guard this repo keeps finding. path -> {name: (mutate_text, expect)}.
SOURCE_CASES = {
    "site/js/addons.js": {
        # CONTRADICTS and tag_allergens.CONTRADICTED_BY are one food fact,
        # inverted. Give `df` an allergen the Python table doesn't agree with.
        "CONTRADICTS drifts from CONTRADICTED_BY": (
            lambda s: s.replace(
                'df: ["contains-dairy"],', 'df: ["contains-dairy", "contains-egg"],'
            ),
            "error",
        ),
        # …and prove the parse isn't quietly returning an empty table, which
        # would make every comparison above it vacuously true.
        "CONTRADICTS can no longer be found": (
            lambda s: s.replace("export const CONTRADICTS =", "export const CONTRADICTS_OLD ="),
            "error",
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
            "error",
        ),
    },
    # ADR 0057: `section.note` exists because the qualifier LEFT the heading. A
    # split started and not finished — note added, heading not shortened — is
    # the failure mode with no symptom: the data looks migrated, the jump-nav
    # chip is as long as it ever was, and the reader is told "served till 2pm"
    # twice. Only a mutation of the real record can show the gate fires.
    "site/data/restaurants/the-borough-tawa.json": {
        "a section note put back inside its own heading": (
            lambda s: s.replace('"section": "Brunch",', '"section": "Brunch (served till 2pm)",', 1),
            "error",
        ),
        "a section note emptied to a blank string": (
            lambda s: s.replace('"note": "served till 2pm"', '"note": "   "', 1),
            "error",
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
        # validate.py reads two tables out of the shipped JS so they can't drift
        # from their Python counterparts (see _load_renames and
        # _load_contradicts there), so the sandbox needs those modules too.
        (work / "site" / "js").mkdir(parents=True, exist_ok=True)
        for mod in ("renames.js", "addons.js"):
            shutil.copy(ROOT / "site" / "js" / mod, work / "site" / "js" / mod)

        rc, out = run_validate(work)
        if rc != 0:
            print("BASELINE FAILED — the unmutated tree does not validate.", file=sys.stderr)
            print(out, file=sys.stderr)
            return 1
        print(f"baseline: clean ({SUBJECT.split('/')[-1]} is the subject)")

        subject = work / SUBJECT
        original = subject.read_text(encoding="utf-8")
        base = json.loads(original)

        failures = []
        for name, (mutate, expect) in CASES.items():
            d = copy.deepcopy(base)
            mutate(d)
            subject.write_text(json.dumps(d, indent=2), encoding="utf-8")
            rc, out = run_validate(work)
            subject.write_text(original, encoding="utf-8")

            if expect == "error":
                ok = rc != 0
                got = "caught" if ok else "PASSED SILENTLY"
            elif expect == "warn":
                ok = rc == 0 and "warning" in out.lower()
                got = "warned" if ok else ("errored" if rc else "silent")
            else:  # clean
                ok = rc == 0
                got = "accepted" if ok else "REJECTED"

            print(f"  {'✅' if ok else '❌'} {name:38} {got}")
            if args.verbose:
                for line in out.splitlines():
                    print(f"       | {line}")
            if not ok:
                failures.append(name)

        for rel, cases in SOURCE_CASES.items():
            target = work / rel
            pristine = target.read_text(encoding="utf-8")
            for name, (mutate, expect) in cases.items():
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

                ok = rc != 0 if expect == "error" else rc == 0
                print(f"  {'✅' if ok else '❌'} {name:38} {'caught' if ok else 'PASSED SILENTLY'}")
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
