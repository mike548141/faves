#!/usr/bin/env python3
"""Prove the tag tips' writer (tag_allergens.py --explain) says what it read.

Roadmap 350/020, owner-ruled 2026-09-28: a tapped allergen chip quotes the
words that caused it. So the claims to prove are about WORDS and about BYTES:

  1. the sentence quotes the text that fired — a recipe's ingredient lines, a
     menu's own words — and nothing when no rule fires (a guessed reason is the
     one thing the tip may never show);
  2. the writer touches no byte but the notes, in BOTH layouts the corpus uses
     (a tags array on its own lines, and one written inline), and removes a
     note whose tag no rule accounts for any more.

Each claim is paired with a break-probe that must make it fail, so a test that
passes whatever the writer does cannot pass here.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tag_allergens as ta  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(f"  {'✅' if ok else '❌'} {name}" + (f" — {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def notes_for(record):
    return {item["name"]: notes for _, item, notes in ta.explain(record)}


RECIPES = {
    "kind": "recipes",
    "menu": [{"section": "Bakes", "items": [
        {"name": "Cake", "tags": ["contains-gluten", "contains-dairy", "contains-peanuts"],
         "ingredients": ["1 cup plain flour", "100g butter", "2 tbsp sugar",
                         {"component": "Icing", "items": ["50g butter, softened"]}]},
        # roadmap 350/020 step 4: an ingredient may be an OBJECT as well as a
        # plain string or a group. "2 eggs" is a non-part object line (no
        # `tags` of its own) and its `text` is read exactly like a plain
        # string would be — the tip must quote THAT text, not paraphrase it.
        # The chocolate is a PART (it carries `tags`): its own allergens are
        # composed onto the dish elsewhere and must never be quoted here as if
        # this tool had read them from the dish's own words.
        {"name": "Cookies", "tags": ["contains-egg"],
         "ingredients": [{"text": "2 eggs"},
                         {"text": "peanut chocolate chips", "tags": ["contains-peanuts"]}]},
    ]}],
}
VENUE = {
    "menu": [{"section": "Mains", "items": [
        {"name": "Chicken Satay", "desc": "Grilled skewers.", "tags": ["contains-peanuts"]},
        {"name": "Plain Rice", "tags": ["contains-soy"]},
    ]}],
}

print("What the tip says")
cake = notes_for(RECIPES)["Cake"]
check("a recipe tip quotes EVERY ingredient line that fired, grouped lines included",
      cake.get("contains-dairy") == "From the ingredients: butter; butter, softened.",
      repr(cake.get("contains-dairy")))
check("…and only the lines that fired",
      cake.get("contains-gluten") == "From the ingredients: plain flour.",
      repr(cake.get("contains-gluten")))
check("a tag no rule accounts for gets NO sentence — never a guess (the chocolate-label peanut)",
      "contains-peanuts" not in cake, repr(cake))
cookies = notes_for(RECIPES)["Cookies"]
check("a non-part object line's `text` is what gets quoted, same as a plain string",
      cookies.get("contains-egg") == "From the ingredients: eggs.",
      repr(cookies.get("contains-egg")))
check("a PART's own tags are never quoted here — they compose onto the dish elsewhere",
      "contains-peanuts" not in cookies, repr(cookies))
venue = notes_for(VENUE)
check("a venue dish quotes the menu's own word and the rule's reason",
      venue["Chicken Satay"].get("contains-peanuts", "").startswith("The menu says “Satay”"),
      repr(venue["Chicken Satay"]))
check("a venue tag nothing on the menu explains stays unexplained",
      venue["Plain Rice"] == {}, repr(venue["Plain Rice"]))

# The amount is dropped (owner, 2026-09-29), by the SAME table the app's JS
# twin is tested against — the fixture, not a list typed out again here.
FIX = json.loads((HERE.parent / "tests/fixtures/ingredient-names.json").read_text())
bad = [(i, ta.ingredient_name(i), o) for i, o in FIX["cases"] if ta.ingredient_name(i) != o]
check(f"every shared ingredient-name case strips the amount and nothing else ({len(FIX['cases'])})",
      not bad, repr(bad[:3]))
# Break-probe: a writer that kept the amount must fail the recipe tip above.
saved_name = ta.ingredient_name
ta.ingredient_name = lambda text: text
check("break-probe: keeping the amount is caught",
      notes_for(RECIPES)["Cake"].get("contains-gluten") != "From the ingredients: plain flour.")
ta.ingredient_name = saved_name

# Break-probe for claim 1: a writer that explained every tag it could not
# account for would turn the peanut case into a guess.
saved = ta.tag_note
ta.tag_note = lambda *a: saved(*a) or "guessed"
check("break-probe: a guessing writer is caught by the no-guess case",
      "contains-peanuts" in notes_for(RECIPES)["Cake"])
ta.tag_note = saved

# --- a POINTER note (roadmap 080/280) --------------------------------------------
# The tag stays (this tool never removes one), so its tip may not go on quoting a
# note the tagger no longer accepts as evidence — and may not vanish, because a
# tag with no reason beside it reads as a confirmed fact.
PNOTE = "The board also says: see our cabinet of fresh filled paninis, savouries, slices and cakes."
PTIP = ("Kept as a precaution: the only reason on record is a note over this section that "
        f"points to other food (“{PNOTE.rstrip('.')}”), so it may not apply to this dish.")


def pointer_record(extra=None):
    return {"id": "v", "menu": [{"section": "Lunch", "sectionId": "lunch", "note": PNOTE, "items": [
        dict({"name": "Nachos", "desc": "Corn chips and beans.", "tags": ["contains-gluten"]}, **(extra or {})),
        {"name": "Meat Pie", "desc": "Beef.", "tags": ["contains-gluten"]},
    ]}]}


def pointer_notes(record, flagged):
    pm = {("v", "lunch"): PNOTE} if flagged else {}
    return {i["name"]: n for _, i, n in ta.explain(record, pointer_map=pm)}


print("A pointer note")
unflagged = pointer_notes(pointer_record(), False)["Nachos"].get("contains-gluten", "")
check("CONTROL: an unflagged note's tip still quotes it as evidence",
      unflagged.startswith("The note over this section says “The board also says"), repr(unflagged))
flagged = pointer_notes(pointer_record(), True)["Nachos"].get("contains-gluten")
check("a tag whose ONLY evidence is a pointer note is kept, and the tip says so plainly",
      flagged == PTIP, repr(flagged))
check("…and it no longer presents the pointer as the note saying anything about the dish",
      "The note over this section says" not in (flagged or ""), repr(flagged))
check("a dish's own words still win over the pointer (no precaution wording on a Meat Pie)",
      pointer_notes(pointer_record(), True)["Meat Pie"].get("contains-gluten", "").startswith("The menu says"),
      repr(pointer_notes(pointer_record(), True)["Meat Pie"]))
photo = pointer_notes(pointer_record({"alt": "Nachos on a toasted bread bowl"}), True)["Nachos"]
check("a photo caption that supports the tag beats the pointer fallback",
      photo.get("contains-gluten", "").startswith("The photo’s description says"), repr(photo))
# Break-probes: the exact-text case above is what stops the fallback being
# reworded or dropped (a tag with no reason reads as a confirmed fact), and the
# flag being ignored puts the old quoted-evidence tip straight back.
saved_tip = ta.POINTER_TIP
ta.POINTER_TIP = "{note}"
check("break-probe: changing the precaution wording is caught by the exact-text case",
      pointer_notes(pointer_record(), True)["Nachos"].get("contains-gluten") != PTIP)
ta.POINTER_TIP = saved_tip
saved_ptr = ta.is_pointer
ta.is_pointer = lambda record, section, pm: False
check("break-probe: ignoring the flag puts the quoted-evidence tip back",
      pointer_notes(pointer_record(), True)["Nachos"].get("contains-gluten", "").startswith("The note over this section says"))
ta.is_pointer = saved_ptr

print("What the writer touches")
MULTILINE = """{
  "menu": [
    {
      "section": "Mains",
      "items": [
        {
          "name": "Chicken Satay",
          "desc": "Grilled skewers.",
          "tags": [
            "contains-peanuts"
          ],
          "price": 19
        },
        {
          "name": "Plain Rice",
          "tags": ["contains-soy"],
          "tagNotes": {"contains-soy": "stale"}
        }
      ]
    }
  ]
}
"""
INLINE = '{"menu": [{"section": "M", "items": [{"name": "Chicken Satay", "tags": ["contains-peanuts"], "price": 19}]}]}\n'

for label, raw in (("multi-line", MULTILINE), ("inline", INLINE)):
    record = json.loads(raw)
    items = [it for sec in record["menu"] for it in sec["items"]]
    wanted = {i: n for i, _, n in ta.explain(record) if n}
    new = ta.patch_tag_notes(raw, items, wanted)
    after = [it for sec in json.loads(new)["menu"] for it in sec["items"]]
    check(f"{label}: the note is written where the rules say",
          after[0].get("tagNotes", {}).get("contains-peanuts", "").startswith("The menu says"))
    # Every byte outside the inserted member is the file as it was.
    stripped = json.loads(new)
    for it in stripped["menu"][0]["items"]:
        it.pop("tagNotes", None)
    original = json.loads(raw)
    for it in original["menu"][0]["items"]:
        it.pop("tagNotes", None)
    check(f"{label}: nothing else in the record changed", stripped == original)
    check(f"{label}: the rest of the file keeps its layout", new.count("\n") - raw.count("\n") <= 1,
          f"{raw.count(chr(10))} → {new.count(chr(10))} lines")

rice = [it for sec in json.loads(ta.patch_tag_notes(
    MULTILINE, [it for sec in json.loads(MULTILINE)["menu"] for it in sec["items"]],
    {0: {"contains-peanuts": "x"}}))["menu"] for it in sec["items"]][1]
check("a stale note whose tag no rule explains is REMOVED, not left behind", "tagNotes" not in rice, repr(rice))

# Break-probe for claim 2: the read-back guard must refuse a write that does not
# say what was asked.
# A parsed record that CLAIMS the note is already there makes the writer skip
# the edit, so the bytes on disk and the ask disagree — exactly what it must see.
lying = json.loads(INLINE)["menu"][0]["items"]
lying[0]["tagNotes"] = {"contains-peanuts": "a"}
try:
    ta.patch_tag_notes(INLINE, lying, {0: {"contains-peanuts": "a"}})
    check("break-probe: the read-back refuses a write that does not match", False)
except ta.Unpatchable:
    check("break-probe: the read-back refuses a write that does not match", True)

print(f"\n{'All' if not failures else len(failures)} {'checks passed.' if not failures else 'FAILED'}")
if __name__ == "__main__":
    from lib.tree import announce
    announce(HERE.parent)
    sys.exit(1 if failures else 0)
