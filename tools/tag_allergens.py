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

Two tiers, kept apart so the count is auditable (ADR 0025):

  STATED   the menu names the allergen or an unambiguous form of it —
           "Prawn Cutlet", "…with Oyster Sauce", "Almond Croissant".
  DERIVED  the menu names a dish whose defining ingredient it doesn't print —
           satay (peanut), tempura (wheat + egg), a laksa (belacan).

Three guards keep it honest:
  • EXCLUDE patterns per rule — "rice noodles" are not wheat, "peanut butter"
    is not dairy, a "doughnut" is not a tree nut.
  • CONTRADICTED_BY — a dish the data already calls gf/df/vegan is not
    silently overridden by an inference. Curation beats a pattern.
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
}

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
    ("contains-nuts", "STATED", "names a tree nut",
     r"\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|"
     r"pine\s?nuts?|brazil\s?nuts?|chestnuts?)\b", None),
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

    # --- gluten -------------------------------------------------------
    ("contains-gluten", "STATED", "names a wheat product",
     r"\b(bread|breaded|flour|wheat|barley|rye|semolina|couscous|pastry|pasta|"
     r"spaghetti|lasagne|lasagna|ravioli|fettuccine|penne|croissant|bagel|pita|"
     r"naan|rotis?|paratha|chapati|brioche|crumpet|pretzel|filo|panko|breadcrumb)\b", None),
    ("contains-gluten", "DERIVED", "battered/crumbed coatings are wheat flour",
     r"\b(battered|crumbed|schnitzel|katsu|tempura)\b", None),
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
    ("contains-gluten", "DERIVED", "a wheat bakery item",
     r"\b(buns?|burgers?|sandwich|toast|toastie|pies?|cakes?|biscuits?|cookies?|"
     r"brownies?|muffins?|scones?|doughnuts?|donuts?|pizzas?|pancakes?|waffles?|"
     r"crackers?|tarts?|slices?|danish|éclair|eclair)\b",
     r"\b(pie\s?spice|(fish|crab|rice)\s?cakes?)\b"),
    ("contains-gluten", "DERIVED", "a wheat noodle",
     r"\b(udon|ramen|egg\s?noodles?|chow\s?mein|lo\s?mein|hokkien|mee\s?goreng|"
     r"bami\s?goreng|chow\s?fun)\b", None),
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
    ("contains-dairy", "STATED", "names a dairy product",
     r"\b(cheese|cheesy|butter|buttermilk|creams?|milks?|milkshakes?|yoghurt|yogurt|"
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

    # --- soy ----------------------------------------------------------
    ("contains-soy", "STATED", "names soy",
     r"\b(soy|soya|tofu|edamame|miso|tempeh)\b", None),
    ("contains-soy", "DERIVED", "the sauce is soy-based",
     r"\b(teriyaki|hoisin|oyster\s?sauce|black\s?bean\s?sauce|satays?)\b", None),

    # --- sesame -------------------------------------------------------
    ("contains-sesame", "STATED", "names sesame", r"\b(sesame|tahini)\b", None),
    ("contains-sesame", "DERIVED", "hummus is made with tahini", r"\b(hummus|houmous|halva)\b", None),
]

COMPILED = [
    (tag, tier, why, re.compile(pat, re.I), re.compile(exc, re.I) if exc else None)
    for tag, tier, why, pat, exc in RULES
]

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
]
# "gluten free" is the negation of the word beside it, and must never be read as
# a declaration. Belt and braces: AVAILABILITY catches nearly every real
# instance first, but a note could say "our bases are gluten free" with no offer
# in it at all.
NOTE_FREE = re.compile(r"[- ]?free\b", re.I)


def read_section_note(note):
    """Sort a `section.note` into (applies, review).

    `applies` is [(tag, tier, why)] — section-wide facts safe to put on every
    dish under the heading. `review` is [(clause, reason, [tag])] — clauses that
    mention an allergen but cannot honestly be tagged from, for a human to rule
    on. Returns two empty lists for the notes that are just opening hours.
    """
    applies, review, seen = [], [], set()
    for clause in re.split(r"[.;]", note or ""):
        clause = clause.strip()
        if not clause:
            continue
        hits = [(tag, tier, f"{why} ({m.group(0).lower()})")
                for tag, tier, why, pattern, exclude in COMPILED
                if not (exclude and exclude.search(clause))
                for m in [pattern.search(clause)] if m]
        if NOTE_DECLARES.search(clause):
            for tag, word in NOTE_ALLERGENS:
                m = re.search(word, clause, re.I)
                if m and not NOTE_FREE.match(clause[m.end():]):
                    hits.append((tag, "STATED", f"the note says it contains {m.group(0).lower()}"))
        if not hits:
            continue
        tags_seen = sorted({tag for tag, _, _ in hits})
        if CROSS_CONTACT.search(clause):
            review.append((clause, "cross-contamination, not an ingredient", tags_seen))
        elif AVAILABILITY.search(clause) or (ADD_ON.search(clause) and ADD_ON_PRICE.search(clause)):
            review.append((clause, "an alternative offered, not what is served", tags_seen))
        elif not UNIVERSAL.search(clause):
            review.append((clause, "does not say it covers the whole section", tags_seen))
        else:
            for tag, tier, why in hits:
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
    kept = [item["name"]]
    for clause in re.split(r"[.;]", item.get("desc") or ""):
        if ADD_ON.search(clause) and ADD_ON_PRICE.search(clause):
            continue
        kept.append(clause)
    kept.extend(ingredient_lines(item))
    return " ".join(kept)


def audit(record, tier=None):
    """Yield (item, tag, tier, why) for every tag this record is missing."""
    for section in record.get("menu", []):
        # Read the heading's note once, then offer it to every dish under it.
        note_applies, _ = read_section_note(section.get("note"))
        for item in section["items"]:
            text = ingredient_text(item)
            tags = set(item.get("tags", []))
            # The dish's own words first, so a burger that says "sesame" itself
            # is reported against its own name rather than against the note.
            findings = [
                (tag, rule_tier, f"{why} ({hit.group(0).lower()})")
                for tag, rule_tier, why, pattern, exclude in COMPILED
                if not (exclude and exclude.search(text))
                for hit in [pattern.search(text)] if hit
            ] + note_applies
            for tag, rule_tier, why in findings:
                if tag in tags:
                    continue
                if tier and rule_tier != tier:
                    continue
                if tags & CONTRADICTED_BY.get(tag, set()):
                    continue  # curation outranks a pattern
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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write the tags (default: report only)")
    ap.add_argument("--tier", choices=["STATED", "DERIVED"], help="only this tier")
    ap.add_argument("--quiet", action="store_true", help="counts only")
    args = ap.parse_args()

    total = {"STATED": 0, "DERIVED": 0}
    by_tag = {}
    skipped = []
    reviews = []
    for path in sorted(DATA.glob("*.json")):
        raw = path.read_text()
        record = json.loads(raw)
        items = [it for sec in record.get("menu", []) for it in sec["items"]]
        index = {id(it): i for i, it in enumerate(items)}

        for section, clause, reason, tags in review_notes(record):
            reviews.append(
                f"{record['id']} / {section.get('section')}: {', '.join(tags)}?"
                f" — {reason}\n      note: “{clause}”"
            )

        findings = list(audit(record, args.tier))
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
    print(f"\n{sum(total.values())} tag(s) {verb} — {total['STATED']} STATED, {total['DERIVED']} DERIVED")
    for tag, n in sorted(by_tag.items(), key=lambda kv: -kv[1]):
        print(f"  {tag:<22} {n}")
    # Never silent: a record we couldn't write is reported, not swallowed.
    for s in skipped:
        print(f"  SKIPPED (not written) — {s}")

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
