#!/usr/bin/env python3
"""Find offers still written as prose, and route each one to the theme that owns it.

WHY THIS EXISTS. ADR 0048 gave a dish real `addOnGroups`, so a configured dish
becomes its own order line, its price adds up, and an option's allergens reach
the warning. Everything not yet converted is still a SENTENCE — "Add bacon +$7",
"Choose fries or mash", "additional sauce or butter $4" — which no screen can
price, count or check for peanuts. This tool finds those sentences.

It exists in this shape because of one measurement: **152 dish descriptions
carry a `$`, and only about two dozen are add-ons.** The rest are size ladders
(a wine list is nothing but), per-head minimums, deals and pairings. Theme 14b
(add-ons) and Theme 28b (a second price has nowhere to live) had been reading
that same field with two different regexes written a month apart, and were sized
independently off overlapping counts. So this classifies EVERY prose offer once
and says which theme owns it — the routing is the finding, not a formatting
choice. See `THEMES` below.

Two classes are worth reading the code for. `diet-substitution-price` is the
one whose rows have a named audience — see `DIET_SUB`. And
`addon-price-unreadable` is only three rows: it survives on ADR 0048's rule
that an add-on price is never null, NOT on the strength of its detector, which
is a leading add verb with no money in the clause and little else.

It REPORTS. It never writes menu data and has no `--apply`: every row here is a
judgement (is "Chicken or beef options available" a pick-one, or the venue's way
of saying the veg version exists?), and a tool that guessed would bury the
question in a diff. `tools/tag_allergens.py` may write because a `contains-*`
tag is fail-safe; an add-on group is not.

    python3 tools/find_addons.py                      # every finding, by venue
    python3 tools/find_addons.py --quiet              # the tallies only
    python3 tools/find_addons.py --class addon-priced # one of the 12 classes
    python3 tools/find_addons.py --only charley-noble # one venue (repeatable)
    python3 tools/find_addons.py --json               # machine-readable

EXIT 0, ALWAYS. This is a reporter over prose that will never fully drain —
`thai-tara-express` will still say "a choice of meat" in 2030. `tag_allergens.py`
states the rule outright: exiting non-zero for doing its job is the "check that
always fires" this repo keeps having to switch back on, and a check nobody reads
is worse than no check. The `validate.py` warning built on `priced_addon_prose`
below is a warning for the same reason.

Stdlib only. Reads only; never writes menu data.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"

# Which theme owns each class. This table IS the point of the tool: 14b cannot
# be sized off a `$` count, because most of the `$`s belong to 28b.
THEMES = {
    "addon-priced": "14b — convertible now",
    "addon-price-unreadable": "14b — must stay prose (ADR 0048: a price is never null)",
    "addon-unpriced-choice": "14b — likely price 0, needs a human",
    "addon-options-not-listed": "14b — detectable, not fillable",
    "dish-is-an-addon": "14b / ADR 0049 — the row itself is the extra",
    "section-is-a-group": "14b / ADR 0049 — the whole section is one group",
    "size-ladder": "28b — a second price for the same dish",
    "diet-substitution-price": "28b — a different price for a dietary alternative",
    "per-head": "28b — a price per person, not per dish",
    "combo": "14f — flag, never convert",
    "customisation": "14c — a request, shipped as a free-text note",
    "already-converted": "trim candidate — the groups exist, the prose remains",
}

# The 14b family: these are the classes an existing add-on group supersedes, so
# a finding in one of them on a dish that already resolves groups is reclassed
# `already-converted` rather than reported as work.
CONVERTIBLE = {
    "addon-priced", "addon-price-unreadable", "addon-unpriced-choice",
    "addon-options-not-listed", "dish-is-an-addon",
}

# --- the tokens ------------------------------------------------------------

MONEY = re.compile(r"\$\s?\d+(?:[.,]\d+)?")
# The single most load-bearing pattern here. `+$N` is the one form in the whole
# corpus that means "this costs extra ON TOP of the dish"; a bare `$N` in the
# same sentence means a different size, a different bread or a bottle. Compare
# `charley-noble`: "+$10 for an additional patty" (an add-on) and "$41 with
# gluten-free bread instead of crostini" (the whole dish at another price) —
# same venue, same section, opposite meaning, and the `+` is the only tell.
PLUS_PRICE = re.compile(r"\+\s?\$\s?\d+(?:[.,]\d+)?")

# "No gluten added" is the Southern Cross group's stock idiom — 16 occurrences
# across four venues — and its "added" is not the verb. It is the corpus's
# hardest case because `southern-cross/cheeseburger` carries BOTH: "…milk bun,
# fries. No gluten added bun +$2.50 or lettuce bun available." A rule that
# vetoes on the idiom drops that true positive; a rule that reads "add" as the
# verb fires on all sixteen.
#
# Neither happens here, and NOT because the idiom is masked out. Masking was
# written first and then MEASURED: swapping `_mask` for the identity function
# changed exactly zero of the 475 findings, because two other things already do
# the work — the `+$N` test runs before every diet test (so the cheeseburger is
# priced, not a request), and `ADD_LEAD` is applied with `.match` (so "No…"
# cannot be a verb lead). A guard whose removal changes nothing is decorative
# (ADR 0072), so the mask is gone and the idiom keeps only the job it really
# does: routing the sixteen bare occurrences to 14c below.
NO_GLUTEN_ADDED = re.compile(r"\bno\s+(?:gluten\s+added|added\s+gluten)\b", re.I)

# The add verb, and it must LEAD its clause. It is anchored TWICE — by the `^`
# here and by the `.match` in `classify` — and each pin holds on its own, so
# removing either alone changes nothing (measured against the corpus; the test's
# breaker has to take both). Anchoring is the whole rule: searched
# anywhere, `\bextra\b` matches "extra virgin olive oil" (a dozen Pomodoro
# pizzas), "our extra-large base", "Extra Mature Cheddar" and "for extra spice".
# Anchored, it matches "Add bacon", "Extra toppings priced individually",
# "additional sauce or butter $4" — statements about an offer.
ADD_LEAD = re.compile(r"^[(\s]*(?:also\s+)?(add|adds|added|adding|extra|extras|"
                      r"additional|upgrade|upgraded|swap)\b", re.I)

# The choice verb. `selection` is deliberately absent — "a selection of dips",
# "A selection of…", "Cheese Selection" are the KITCHEN choosing, not you.
CHOICE = re.compile(r"\b(choose|choice|choices|select|selects|option|options|optional)\b", re.I)

# A bare `or` is not a choice: 93 descriptions carry one and almost none are
# offers — "Does not include salad or relish" (a negation), "Traditionally made
# with a bread or potato base" (a culinary note). Those need no veto, because
# nothing in `classify` fires without a verb or a price and they have neither; a
# NEGATION pattern was written for them and then measured at zero effect, so it
# was deleted rather than shipped decorative (ADR 0072).
#
# A PAIRING does need one, because it carries both: `baylands-brewery`'s
# "Beer match — Foul Hooked APA $12.00" is a priced suggestion for a DIFFERENT
# product (a `goesWith`), and without this veto it is filed as a second price
# for the burger.
PAIRING = re.compile(r"\b(?:beer|wine|drink)\s+match\b|\bbest\s+(?:enjoyed|served)\s+with\b|"
                     r"\bgoes\s+(?:great\s+)?with\b|\bmatch(?:ed|es)?\s+with\b|"
                     r"\bpairs?\s+(?:well\s+)?with\b", re.I)

# A price quoted per person, with a table minimum — `rock-yard-restaurant`'s
# eight tasting platters. 28b: the dish has one price field and this is a
# different quantity of the same thing.
PER_HEAD = re.compile(r"\bper\s+(?:head|person)\b|/\s?head\b|"
                      r"\bmin(?:imum)?\s+\d+\s+(?:people|persons?)\b", re.I)

# Several dishes ordered as one — 14f. Recognised from the row's own name, its
# section, or the clause: a "Set Menu", a "Meal Deal", "Feed 25", "(Save $2.50)".
COMBO_CONTEXT = re.compile(r"\b(combo|combos|meal\s+deal|meal\s+deals|set\s+menu|"
                           r"set\s+menus|catering)\b", re.I)
COMBO_CLAUSE = re.compile(r"\bsave\s+\$|\bfeed\s+\d+\b|\b(?:two|three|\d+)\s+courses\b|"
                          r"\bdeal\b|\bmetre\s+box\b", re.I)

# A request, not a priced option — Theme 14c ships these as a free-text note on
# the order line. `pizza-pomodoro` alone prints "Gluten free (on request)" on 46
# pizzas, so this is 85% one venue and would swamp 14b if it were an add-on.
REQUEST = re.compile(r"\bon\s+request\b|\bjust\s+ask\b|\bspeak\s+to\s+staff\b|"
                     r"\bask\s+(?:us|your|the|for)\b|\bif\s+you\s+ask\b", re.I)
# A dietary alternative offered — "dairy free mozzarella available", "Vegetable
# option available", "Gluten-free possible". Requires BOTH a diet word and an
# offer word, so "When rocket is unavailable" and "Available during season"
# stay out.
DIET_WORD = (r"gluten[\s-]?free|dairy[\s-]?free|nut[\s-]?free|vegan|vegetarian|veggie|"
             r"vegetable|nga|no\s+gluten\s+added|\bgf\b|\bdf\b")
DIET_ALT = re.compile(rf"(?:{DIET_WORD})[^.;]{{0,48}}?\b(?:available|possible|on\s+request|"
                      r"option|options|optional|instead)\b|"
                      rf"\b(?:available|possible|option|options)\b[^.;]{{0,24}}?(?:{DIET_WORD})", re.I)

# A DIETARY alternative that carries a price of its own — the 12th class, and
# the one the owner ruled must not be folded into `size-ladder` (2026-08-17).
# "$41 with gluten-free bread instead of crostini", "No gluten added bun +$2.50",
# "GF seeded toast +$1", "oat $9.90", "+$0.50 for coconut or oat milk".
#
# WHY IT IS ITS OWN AXIS, not just another 28b second price: most of these rows
# already carry `gf-option`, which `site/js/dietary.js` treats as satisfying the
# gluten-free claim. So the dish correctly SHOWS to a reader who needs it, and
# only the substitute's price has nowhere to live — the reader is quoted a price
# they cannot actually pay. Not a safety defect (the filtering is right), an
# accuracy one, and the only 28b axis with a named audience. `scan` counts how
# many of them carry the tag, so the claim stays measured rather than asserted.
#
# THE BOUNDARY AGAINST 14c IS THE PRICE, NOT THE DIET WORD. "Gluten free on
# request" is a `customisation`; "GF on request +$1" is this. So this test never
# runs on its own — it only ever refines a class that a price already earned.
DIET_SUB = re.compile(
    r"gluten[\s-]?free|\bgf\b|\bnga\b|no\s+gluten\s+added|no\s+added\s+gluten|"
    r"dairy[\s-]?free|\bdf\b|lactose[\s-]?free|vegan|plant[\s-]?based|"
    r"\b(?:oat|soy|soya|almond|coconut|rice)\b\s*milk|\boat\b", re.I)

# The classes a clause can only reach by naming a price. Used by the combo rule
# below, which suppresses a bundle's own prose but must never swallow a second
# price hiding inside it.
PRICED_CLASSES = {"addon-priced", "diet-substitution-price", "size-ladder", "per-head"}

# The row itself is the extra (ADR 0049). Anchored, because searching anywhere
# for sauce|dip|topping|extra|side matches 96 dish names, 60 of them
# `kc-cafe`/`regal-chinese-restaurant` mains like "Beef Steak in Black Pepper
# Sauce". Anchored, 96 drops to 19.
ADDON_ROW_NAME = re.compile(r"^(?:add|extra|additional|upgrade|swap)\b", re.I)
ADDON_ROW_DESC = re.compile(r"\badd[\s-]?on\b|^add(?:ed)?\s+to\s+", re.I)

# A condiment priced like a condiment. `pizza-hut/Sides` mixes seven of these
# (Marinara Dip $0.80, Ranch Sauce $1.00, …) in with real food, which is why the
# section is the wrong unit there and the ROW is the right one. Both halves are
# required: a $17 "Beef Steak in Black Pepper Sauce" is dinner.
CONDIMENT_NAME = re.compile(r"\b(?:dip|dips|sauce|sauces|mayo|aioli|gravy|dressing)\b", re.I)
CONDIMENT_MAX = 2.0

# A whole SECTION of things you would not order alone (ADR 0049). Deliberately
# only `extras`/`add-ons`: adding `sauce` catches `takeaway-at-churton`, whose
# section is literally named "Sweet and Sour Sauce" and whose seven rows are
# full mains, and adding `sides` catches ten sections of real food.
ADDON_SECTION = re.compile(r"\b(?:extras?|add[\s-]?ons?)\b", re.I)

# Splits a description into clauses. The lookarounds exist because a naive
# split on "." cuts "$2.50" in half and turns the corpus's hardest true
# positive into two meaningless fragments. `;` always splits: a wine row's
# "Regular $10.00; large $17.50; bottle $50.00" is three separate size claims.
CLAUSE_SPLIT = re.compile(r"(?<!\d)\.|\.(?!\d)|;|\n")


NOT_AN_OFFER = "no offer in this clause"


def clauses(text):
    """The sentences of a description or note, kept whole around prices."""
    for clause in CLAUSE_SPLIT.split(text or ""):
        clause = clause.strip()
        if clause:
            yield clause


def _has_option_list(clause):
    """Does the clause actually NAME the options, or only promise them?

    "Choose fries or mash" names them; "with your choice of dip" and "16 chicken
    wings and your choice of two sauces" do not. The test is an alternation —
    ` or ` — or a colon introducing the list, and NOT a bare comma: twenty
    `thai-tara-express` rows read "with a choice of meat, egg, tamarind, garlic
    chive and bean sprouts", where every comma belongs to the ingredient list
    and the options ("a choice of meat") are printed in a different section
    entirely. A comma-based rule called all twenty of them listed.

    Scope depends on which word matched, because the two families point opposite
    ways: `choose`/`choice of`/`select` LEAD their list, so only the text after
    them counts; `options available` TRAILS its list — "Chicken or beef options
    available" — so the whole clause counts.
    """
    m = CHOICE.search(clause)
    if not m:
        return False
    scope = clause if m.group(1).lower().startswith("option") else clause[m.end():]
    return ":" in scope or re.search(r"\bor\b", scope, re.I) is not None


def classify(clause, *, name="", section=""):
    """Sort one clause into (class, note), or (None, reason) when it is noise.

    The order of these tests is the argument. `addon-priced` runs first because
    a `+$N` outranks every context — Spices Indian's "Combo" row is a combo, and
    its "Naan upgrade to other breads +$1.00" is still a priced add-on.
    """
    if PAIRING.search(clause):
        return None, "a pairing suggestion (goesWith), not an extra"

    money = MONEY.search(clause)
    leads = ADD_LEAD.match(clause)   # the second of ADD_LEAD's two anchors
    chooses = CHOICE.search(clause)
    diet = DIET_SUB.search(clause)

    if PLUS_PRICE.search(clause) or (leads and money):
        return ("diet-substitution-price" if diet else "addon-priced"), ""
    if COMBO_CLAUSE.search(clause):
        return "combo", ""
    if PER_HEAD.search(clause):
        return "per-head", ""
    # A request costs nothing to state, so a clause carrying a price is not one.
    # `charley-noble` prints "$41 with gluten-free bread instead of crostini" —
    # every word of that is a dietary alternative except the $41, and the $41 is
    # what makes it a second whole-dish price with nowhere to live (28b), not a
    # note on an order line (14c).
    if not money and (REQUEST.search(clause) or DIET_ALT.search(clause)
                      or NO_GLUTEN_ADDED.search(clause)):
        return "customisation", ""
    if leads:
        # "Add your favourite toppings: pepperoni, pineapple (V) or chicken" —
        # an add verb that introduces its own list with a colon has named the
        # options, so the option-list reading wins over "price unknown". Narrow
        # on purpose: "Extra toppings priced individually" has no colon.
        if ":" in clause and re.search(r"[:,][^:]*\bor\b|:.*,", clause, re.I):
            return "addon-unpriced-choice", ("the options are named but no price is — "
                                             "'add' implies a charge the menu never gives")
        return "addon-price-unreadable", ""
    if chooses:
        if _has_option_list(clause):
            note = ""
            if re.search(r"\boptions?\s+available\b", clause, re.I):
                # `kk-malaysian/nasi-lemak` "Chicken or beef options available"
                # is a real pick-one; `satay-kingdom` "Vegetable option
                # available" is a dietary alternative. Nothing in the text
                # separates them, so say so rather than guess.
                note = "ambiguous: a real pick-one or a dietary alternative — no pattern separates them"
            return "addon-unpriced-choice", note
        return "addon-options-not-listed", ""
    if money:
        return ("diet-substitution-price" if diet else "size-ladder"), ""
    return None, NOT_AN_OFFER


def _other_prices(clause, price):
    """Money named in `clause` that is not just `price` restated."""
    out = []
    for m in MONEY.finditer(clause):
        try:
            value = float(m.group(0).lstrip("$").replace(",", ".").strip())
        except ValueError:
            continue
        if price is None or not isinstance(price, (int, float)) or abs(value - price) > 0.001:
            out.append(value)
    return out


def resolved_groups(item, section):
    """The add-on groups this dish actually offers — its own plus its section's.

    Suppressing on "the record has `addOnGroups`" is too coarse: eight records
    carry groups and `sprig-and-fern-tawa/cheese-pizza` is genuinely unconverted
    inside one of them. Resolution is per dish, and it mirrors `groupsFor()` in
    site/js/addons.js.
    """
    return list(item.get("addOns") or []) + list(section.get("addOns") or [])


def scan(record, vetoes=None):
    """Every prose offer in one venue record, as a list of finding dicts.

    `vetoes` is an optional list that collects the clauses a guard threw away.
    A veto nobody can see is the decorative guard this repo keeps rediscovering:
    the run would look identical whether the guard worked or had been deleted,
    so they are printed.
    """
    rid = record.get("id", "?")
    out = []

    def add(cls, where, text, note="", **extra):
        out.append(dict(venue=rid, cls=cls, where=where, text=text,
                        theme=THEMES[cls], note=note, **extra))

    for section in record.get("menu", []) or []:
        if not isinstance(section, dict):
            continue
        sname = section.get("section") or ""
        items = section.get("items", []) or []
        section_converted = bool(section.get("addOns")) or section.get("addOnsOnly") is True

        # The section as a unit (ADR 0049).
        if ADDON_SECTION.search(sname):
            cls = "already-converted" if section_converted else "section-is-a-group"
            add(cls, f"§ {sname}", f"{len(items)} row(s) nobody orders alone", rows=len(items))

        # `section.note` carries offers too, and this is the axis that bit
        # `tag_allergens.py`: it read item text only and missed 30+ tags in
        # notes. The richest unconverted statement in the whole corpus is one —
        # charley-noble's Woodfired Grill, a free pick-one AND a priced repeat
        # over a whole section.
        for clause in clauses(section.get("note")):
            cls, note = classify(clause, section=sname)
            if not cls:
                if note != NOT_AN_OFFER and vetoes is not None:
                    vetoes.append((rid, f"§ {sname}", clause, note))
                continue
            if section_converted and cls in CONVERTIBLE:
                cls, note = "already-converted", note or "the section already resolves groups"
            add(cls, f"§ {sname}", clause, note)

        for item in items:
            if not isinstance(item, dict):
                continue
            iname = item.get("name") or ""
            converted = bool(resolved_groups(item, section)) or section_converted
            where = iname[:44]

            desc = item.get("desc") or ""
            price = item.get("price")
            # Which sub-rule fired is reported, so the count stays decomposable:
            # the anchored name is the conservative rule the roadmap counted,
            # and the condiment rule is a deliberate widening.
            if ADDON_ROW_NAME.match(iname):
                why = "the name is anchored on add/extra/additional/upgrade/swap"
            elif ADDON_ROW_DESC.search(desc):
                why = "the description says the row is an extra"
            elif (CONDIMENT_NAME.search(iname) and isinstance(price, (int, float))
                    and price <= CONDIMENT_MAX):
                why = f"a condiment priced like one (${price:g}) — wider than the anchored-name rule"
            else:
                why = ""
            if why:
                cls = "already-converted" if converted else "dish-is-an-addon"
                add(cls, where, f"row: {iname}" + (f" — {desc}" if desc else ""), why)

            # A combo is a property of the ROW, not of a clause: "Feed 25" is a
            # combo whichever sentence you read. Classing per clause reported a
            # set menu six times (its entrée list, its soup, "Fee applies on
            # delivery orders") and called each one an offer.
            is_combo = bool(COMBO_CONTEXT.search(f"{iname} {sname}"))
            if is_combo:
                note = ""
                if re.search(r"\bselect\b[^.;]{0,60}\bfor\s+a\s+table\s+of\b", desc, re.I):
                    # `regal-chinese-restaurant` — "select 4 mains for a table of
                    # 6-7, select 5 for 8-9". A pick-many whose `max` is a
                    # function of party size; ADR 0048's `max` is a constant, so
                    # this one cannot be expressed at all.
                    note = "unconvertible: the pick-many's max varies with party size"
                add("combo", where, f"row: {iname}" + (f" — {desc[:80]}" if desc else ""), note)

            for clause in clauses(desc):
                cls, note = classify(clause, name=iname, section=sname)
                if not cls:
                    if note != NOT_AN_OFFER and vetoes is not None:
                        vetoes.append((rid, where, clause, note))
                    continue
                if why and cls in CONVERTIBLE:
                    continue  # the row IS the offer; its desc restates it
                if is_combo and (cls not in PRICED_CLASSES
                                 or not _other_prices(clause, price)):
                    # Inside a combo the prose is the bundle's contents, so it is
                    # suppressed — except where it names a price that is NOT the
                    # row's own. `pizza-hut/$25 Favourites Deal` says "for $25"
                    # on a $25 row and that is the row restating itself; Spices
                    # Indian's $14 Combo says "(without drink $12.00)", which is
                    # a genuine second price that used to be swallowed here.
                    continue
                if converted and cls in CONVERTIBLE:
                    cls, note = "already-converted", note or "this dish already resolves groups"
                if cls == "diet-substitution-price":
                    # The evidence for the audience claim, gathered rather than
                    # asserted: an `*-option` tag is what makes `dietary.js` show
                    # this dish to the reader who then cannot price the substitute.
                    opts = sorted(t for t in (item.get("tags") or [])
                                  if isinstance(t, str) and t.endswith("-option"))
                    add(cls, where, clause, note, dietTags=opts)
                    continue
                add(cls, where, clause, note)
    return out


def priced_addon_prose(record):
    """Yield (dish, clause) for prose this tool is most confident IS a priced
    add-on and that no add-on group covers yet.

    Exported for `tools/validate.py`, which warns on it — a warning and never an
    error, because converting one is a judgement per row (which group? what
    `max`? whose allergens?) and a hard failure would block every legitimate
    commit until a person had made every one of those calls.
    """
    for f in scan(record):
        if f["cls"] == "addon-priced":
            yield f["where"], f["text"]


def _load(only=None):
    files = sorted(VENUES.glob("*.json"))
    if only:
        wanted = set(only)
        files = [f for f in files if f.stem in wanted]
        missing = wanted - {f.stem for f in files}
        if missing:
            print(f"error: no such venue file(s): {', '.join(sorted(missing))}", file=sys.stderr)
            return None
    return files


def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="report just this venue id (repeatable); default is every venue")
    ap.add_argument("--class", dest="cls", metavar="NAME", choices=sorted(THEMES),
                    help="report only this class; one of: " + ", ".join(sorted(THEMES)))
    ap.add_argument("--quiet", action="store_true", help="the tallies only, no rows")
    ap.add_argument("--json", action="store_true", help="machine-readable findings on stdout")
    args = ap.parse_args(argv)

    files = _load(args.only)
    if files is None:
        return 1

    findings, vetoes = [], []
    for path in files:
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"error: {path.name}: {exc}", file=sys.stderr)
            continue
        findings += scan(record, vetoes)
    if args.cls:
        findings = [f for f in findings if f["cls"] == args.cls]

    if args.json:
        json.dump(findings, sys.stdout, indent=2, ensure_ascii=False)
        print()
        return 0

    by_venue = {}
    for f in findings:
        by_venue.setdefault(f["venue"], []).append(f)

    if not args.quiet:
        for venue in sorted(by_venue):
            rows = by_venue[venue]
            print(f"\n## {venue} ({len(rows)})")
            for f in rows:
                line = f"  {f['cls']:<24} {f['where']:<44} {f['text'][:96]}"
                print(line)
                if f["note"]:
                    print(f"  {'':<24} {'':<44} ↳ {f['note']}")

    tally = {}
    for f in findings:
        tally[f["cls"]] = tally.get(f["cls"], 0) + 1

    print(f"\n{len(findings)} prose offer(s) across {len(by_venue)} venue(s) "
          f"of {len(files)} scanned.")
    print("\nTHE CLASSES ROUTE TO DIFFERENT THEMES — a `$` count is not a 14b count:")
    for cls, n in sorted(tally.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {cls:<24} {n:>4}   {THEMES[cls]}")

    fourteen_b = sum(n for cls, n in tally.items() if cls in CONVERTIBLE or cls == "section-is-a-group")
    twenty_eight_b = sum(n for cls, n in tally.items()
                         if cls in ("size-ladder", "per-head", "diet-substitution-price"))
    print(f"\n  → Theme 14b owns {fourteen_b}; Theme 28b owns {twenty_eight_b}; "
          f"14f {tally.get('combo', 0)}; 14c {tally.get('customisation', 0)}; "
          f"already converted {tally.get('already-converted', 0)}.")

    diet = [f for f in findings if f["cls"] == "diet-substitution-price"]
    if diet:
        tagged = [f for f in diet if f.get("dietTags")]
        print(f"\n  → of the {len(diet)} diet-substitution price(s) on "
              f"{len({f['venue'] for f in diet})} venue(s), {len(tagged)} sit on a dish "
              f"tagged *-option:\n    dietary.js already shows those dishes to the reader "
              f"who needs them, and quotes a price they cannot pay.")

    if not args.cls and not args.only:
        # The roadmap sized 14b by hand before this tool existed. Its numbers are
        # printed beside the measured ones rather than quietly replaced: a
        # measurement that only agrees where it was tuned to agree is worthless,
        # so the gaps are the useful part.
        rows = len({(f["venue"], f["where"]) for f in findings if f["cls"] == "addon-priced"})
        dia = [f for f in findings if f["cls"] == "dish-is-an-addon"]
        secs = [f for f in findings if f["cls"] == "section-is-a-group"]
        print("\nROADMAP 14b's hand counts, re-measured — the gaps are real, not tuned away:")
        print(f"  priced add-ons          roadmap 28    measured {tally.get('addon-priced', 0)} "
              f"offer(s) on {rows} row(s)")
        print(f"  unpriced choices        roadmap 63    measured "
              f"{tally.get('addon-unpriced-choice', 0) + tally.get('addon-options-not-listed', 0)} "
              f"({tally.get('addon-unpriced-choice', 0)} with the options named, "
              f"{tally.get('addon-options-not-listed', 0)} without)")
        print(f"  rows that ARE add-ons    roadmap 17    measured {len(dia)} "
              f"({sum('condiment' not in f['note'] for f in dia)} by the anchored-name/desc rule, "
              f"{sum('condiment' in f['note'] for f in dia)} by the wider condiment rule)")
        print(f"  add-on sections         roadmap 11 sections / 9 venues / 92 rows    "
              f"measured {len(secs)} / {len({f['venue'] for f in secs})} / "
              f"{sum(f.get('rows', 0) for f in secs)}")

    if vetoes and not args.cls:
        # Printed, not swallowed: a guard whose output is identical whether it
        # works or has been deleted is decorative (ADR 0072).
        print(f"\n{len(vetoes)} clause(s) a guard threw away — check these are "
              f"really not offers:")
        for rid, where, clause, reason in vetoes:
            print(f"  {rid:<26} {where[:30]:<30} {clause[:60]:<60} — {reason}")

    print("\nPer venue:")
    for venue in sorted(by_venue, key=lambda v: (-len(by_venue[v]), v)):
        counts = {}
        for f in by_venue[venue]:
            counts[f["cls"]] = counts.get(f["cls"], 0) + 1
        detail = ", ".join(f"{c} {n}" for c, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))
        print(f"  {venue:<30} {len(by_venue[venue]):>4}   {detail}")

    # A reporter over prose that will never fully drain. See the docstring.
    return 0


if __name__ == "__main__":
    sys.exit(main())
