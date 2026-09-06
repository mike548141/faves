#!/usr/bin/env python3
"""Mutation-test `tag_addon_options.py` — and prove what it REFUSES to do.

Same method as `test_tag_allergens.py`, for the same reason: take a **real**
record, break it in one specific way, run the real tool as a subprocess, and
assert what ended up on disk. Real records rather than fixtures, because a
fixture drifts from the schema and then tests nothing; a subprocess rather than
an import, because the exit code is part of what is being asserted.

Half the cases here assert an ABSENCE of writing, which is unusual and is the
point. This tool operates on food safety in the one direction that is fail-safe
(ADR 0025's one-way rule): it may say what an option IS, never what it is free
of. So "Spinach still carries no tags" is not a weak assertion — it is the
assertion, and it is written so it cannot pass vacuously: every such case also
requires the tool to have tagged something ELSE in the same file, or a bug that
made the tool write nothing at all would satisfy it silently.

Then BREAKERS reintroduces each defect into `tag_addon_options.py` itself and
asserts the cases that cover it now FAIL. A test that passes against the fixed
code proves nothing about whether it would notice the bug coming back.

    python3 tools/test_tag_addon_options.py        # run every case
    python3 tools/test_tag_addon_options.py -v     # show each case's output

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
TOOL = "tools/tag_addon_options.py"

TAWA = "site/data/restaurants/sprig-and-fern-tawa.json"
BAMBINA = "site/data/restaurants/bambina-pizzeria.json"
KEBAB = "site/data/restaurants/wellington-kebab-grill.json"
GONG_CHA = "site/data/restaurants/gong-cha.json"

# Tawa's brunch sides, with the tags this sweep applies taken back off. Bacon
# and Sausages must return; Spinach and Tomatoes must not gain anything.
STRIP_TAWA = [
    ('''          "name": "Sausages",
          "price": 8.0,
          "tags": [
            "has-meat"
          ]''',
     '''          "name": "Sausages",
          "price": 8.0,
          "tags": []'''),
    ('''          "name": "Bacon",
          "price": 8.0,
          "tags": [
            "has-meat"
          ]''',
     '''          "name": "Bacon",
          "price": 8.0,
          "tags": []'''),
    ('''          "name": "Salmon",
          "price": 9.0,
          "tags": [
            "has-fish"
          ]''',
     '''          "name": "Salmon",
          "price": 9.0,
          "tags": []'''),
]

# Two byte-identical option objects, in different groups of the same file. The
# same (old, new) pair applied twice hits the first REMAINING occurrence each
# time, so this renames two of them and leaves the rest alone.
PEARL = '''        {
          "name": "Pearl",
          "price": 1.0,
          "tags": []
        },'''
PEARL_TO_BACON = (PEARL, PEARL.replace('"Pearl"', '"Bacon"'))


def options(record):
    """{(group id, option name): sorted tags} for every add-on option."""
    out = {}
    for group in record.get("addOnGroups") or []:
        for option in group.get("options") or []:
            out[(group.get("id"), option.get("name"))] = sorted(option.get("tags") or [])
    return out


def _tagged_something(after, *, at_least=1):
    n = sum(1 for tags in options(after).values() if "has-meat" in tags or "has-fish" in tags)
    return None if n >= at_least else f"the tool tagged {n} option(s) — the case proves nothing"


def check_meat_and_fish_return(after, out):
    """The three options whose own name settles it get their tag back."""
    got = options(after)
    want = {
        ("brunch-sides", "Sausages"): "has-meat",
        ("brunch-sides", "Bacon"): "has-meat",
        ("brunch-sides", "Salmon"): "has-fish",
    }
    missing = {k: got.get(k) for k, tag in want.items() if tag not in (got.get(k) or [])}
    return f"not retagged: {missing}" if missing else None


def check_absence_is_never_asserted(after, out):
    """THE case. Spinach is obviously vegetarian and this tool may not say so.

    Anything at all on Spinach or Tomatoes is a failure, not just a `v`: the
    only way this sweep could reach them is by inferring an absence.
    """
    got = options(after)
    bad = {
        k: got[k]
        for k in (("brunch-sides", "Spinach"), ("brunch-sides", "Tomatoes"),
                  ("brunch-sides", "Potato Rosti"), ("brunch-sides", "Roasted Field Mushrooms"))
        if got.get(k)
    }
    if bad:
        return f"asserted something about an option whose name says nothing: {bad}"
    return _tagged_something(after, at_least=3)


def check_gluten_free_bun_is_left_alone(after, out):
    """"No gluten added bun" is the venue hedging, and promoting the hedge to a
    `gf` tag is the owner's call. The tool must report it, never take it."""
    got = options(after)
    if got.get(("nga-bun", "No gluten added bun")):
        return f"tagged the venue's own hedge: {got[('nga-bun', 'No gluten added bun')]}"
    if "No gluten added bun" not in out:
        return "left it alone silently — the gap has to be reported to be closed"
    return _tagged_something(after, at_least=3)


def check_curation_outranks_the_pattern(after, out):
    """An option the VENUE calls vegetarian is never given meat, whatever its
    name looks like. Renamed to "Chicken" with its `v` intact, so the only thing
    standing between it and a wrong tag is CONTRADICTED_BY."""
    got = options(after)
    tags = got.get(("extras", "Chicken"))
    if tags is None:
        return "the mutation did not land — no 'Chicken' option in the extras group"
    if "has-meat" in tags:
        return "overrode the venue's own `v` with a regex"
    return None


def check_chicken_salt_is_not_chicken(after, out):
    """A NZ chip shop's chicken salt is seasoning. The exclusion is a claim
    about food that someone can check, and this is the check.

    Deliberately on an option carrying NO tags of its own: if it had a `v` the
    CONTRADICTED_BY guard would save it and this would prove nothing about the
    exclusion it is named for. Its three siblings are stripped in the same
    mutation, so the run cannot pass by doing nothing at all.
    """
    got = options(after)
    tags = got.get(("extra-toppings", "Chicken salt"))
    if tags is None:
        return "the mutation did not land — no 'Chicken salt' option"
    if tags:
        return f"tagged chicken salt as chicken: {tags}"
    siblings = {
        n: got.get(("extra-toppings", n))
        for n in ("Pepperoni", "Italian sausage", "Beef meatball")
    }
    bare = {n: t for n, t in siblings.items() if "has-meat" not in (t or [])}
    return f"the tool tagged nothing — the case proves nothing: {bare}" if bare else None


def check_same_shaped_options_are_patched_separately(after, out):
    """Two byte-identical option objects both get their own tag.

    `flat.index(option)` compares dicts by VALUE, so it resolves both to the
    first — which double-tags one and skips the other. gong-cha carries six
    identical "Pearl" objects, so this is not a hypothetical.
    """
    got = options(after)
    bacons = {k: v for k, v in got.items() if k[1] == "Bacon"}
    if len(bacons) != 2:
        return f"the mutation did not land — found {len(bacons)} Bacon options, wanted 2"
    bad = {k: v for k, v in bacons.items() if v != ["has-meat"]}
    return f"not tagged exactly once each: {bad}" if bad else None


def check_one_line_layout_survives(after, out):
    """Bambina writes an option per line. The whole reason this patches raw text
    instead of re-serialising is that the diff stays readable."""
    return None  # asserted on the raw text by the runner, see RAW_CHECKS


def check_unwritable_record_is_loud(after, out):
    """An option with no tags array at all can't be patched — and must not exit 0."""
    if "COULD NOT WRITE" not in out:
        return "a record it could not write was not reported"
    return None


CASES = {
    "an option whose name says meat or fish is tagged": (
        TAWA, STRIP_TAWA, 0, check_meat_and_fish_return),
    "an option whose name says nothing is left alone": (
        TAWA, STRIP_TAWA, 0, check_absence_is_never_asserted),
    "a venue's own 'no added gluten' is reported, not tagged": (
        TAWA, STRIP_TAWA, 0, check_gluten_free_bun_is_left_alone),
    "the venue's own `v` outranks the pattern": (
        KEBAB,
        [('''          "name": "Extra falafel",''', '''          "name": "Chicken",''')],
        0, check_curation_outranks_the_pattern),
    "chicken salt is not chicken": (
        BAMBINA,
        [('''        { "name": "Cotto ham", "tags": ["has-meat"] },''',
          '''        { "name": "Chicken salt", "tags": [] },'''),
         ('''        { "name": "Pepperoni", "tags": ["has-meat"] },''',
          '''        { "name": "Pepperoni", "tags": [] },'''),
         ('''        { "name": "Italian sausage", "tags": ["has-meat"] },''',
          '''        { "name": "Italian sausage", "tags": [] },'''),
         ('''        { "name": "Beef meatball", "tags": ["has-meat"] }''',
          '''        { "name": "Beef meatball", "tags": [] }''')],
        0, check_chicken_salt_is_not_chicken),
    "two identical options are patched separately": (
        GONG_CHA, [PEARL_TO_BACON, PEARL_TO_BACON], 0,
        check_same_shaped_options_are_patched_separately),
    "a one-line option array stays on one line": (
        BAMBINA,
        [('''        { "name": "Pepperoni", "tags": ["has-meat"] },''',
          '''        { "name": "Pepperoni", "tags": [] },''')],
        0, check_one_line_layout_survives),
    "a record it cannot write makes the run fail": (
        BAMBINA,
        # Take the tags key away from an option that is about to gain one.
        [('''        { "name": "Pepperoni", "tags": ["has-meat"] },''',
          '''        { "name": "Pepperoni" },'''),
         ('''        { "name": "Cotto ham", "tags": ["has-meat"] },''',
          '''        { "name": "Cotto ham", "tags": [] },''')],
        1, check_unwritable_record_is_loud),
}

# Assertions on the subject's raw TEXT rather than its parsed form — layout is
# the property, so parsing it away would test nothing.
RAW_CHECKS = {
    "a one-line option array stays on one line":
        lambda raw: None if '{ "name": "Pepperoni", "tags": ["has-meat"] },' in raw
        else "the array was reflowed or not patched",
}


# --- reintroducing the bugs ------------------------------------------------
# name -> ([(old source, new source), …], [case names that MUST now fail]).

BREAKERS = {
    # The first version of this tool. `list.index` on a dict is a value lookup.
    "options located by value instead of identity": (
        [("            additions.setdefault(at[id(option)], []).append(tag)",
          "            additions.setdefault(flat.index(option), []).append(tag)")],
        ["two identical options are patched separately"],
    ),
    # The whole-file layout heuristic, which exploded bambina's one-line options
    # across four lines each because its DISHES are written multiline.
    "the file-wide layout heuristic, ungated by the option's own line": (
        [('        inline_object = "{" in raw[line_start:start]',
          "        inline_object = False")],
        ["a one-line option array stays on one line"],
    ),
    "curation no longer outranks the pattern": (
        [("            if tags & CONTRADICTED_BY.get(tag, set()):\n                continue",
          "            if False:\n                continue")],
        ["the venue's own `v` outranks the pattern"],
    ),
    "the per-rule exclusions dropped": (
        [("    return not (exclude and re.search(exclude, text, re.I))",
          "    return True")],
        ["chicken salt is not chicken"],
    ),
    # The one that would make this tool dangerous rather than merely wrong: a
    # rule that asserts an absence. Spinach is the option ADR 0025 exists for.
    "a rule that infers an ABSENCE (ADR 0025's one-way rule broken)": (
        [('''RULES = [
    ("has-meat", "names a cured or preserved meat",''',
          '''RULES = [
    ("v", "looks like a vegetable", r"\\b(spinach|tomato(es)?|rocket|basil)\\b", None),
    ("has-meat", "names a cured or preserved meat",''')],
        ["an option whose name says nothing is left alone"],
    ),
    "an unwritable record exits 0 again": (
        [("        for rid, why in unwritable:\n"
          '            print(f"COULD NOT WRITE {rid}: {why}", file=sys.stderr)\n'
          "        return 1",
          "        for rid, why in unwritable:\n"
          '            print(f"could not write {rid}: {why}", file=sys.stderr)\n'
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


def check_apply_is_idempotent(work):
    """Twice in a row must be the same as once — byte for byte.

    The corpus in the repo is already swept, so the FIRST `--apply` here should
    also change nothing; that is asserted too, because a tool that rewrites the
    same file on every run makes every future diff unreadable.
    """
    before = {p: p.read_bytes() for p in (work / "site/data").rglob("*.json")}
    for run in (1, 2):
        proc = subprocess.run([sys.executable, TOOL, "--apply"], cwd=work,
                              capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            return f"--apply run {run} exited {proc.returncode}"
        changed = [p.name for p, data in before.items() if p.read_bytes() != data]
        if changed:
            return f"--apply run {run} rewrote an already-swept corpus: {changed}"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's output")
    args = ap.parse_args()

    failures = []
    standing = {
        "a dry run writes nothing": check_dry_run_writes_nothing,
        "--apply is idempotent on a swept corpus": check_apply_is_idempotent,
    }
    with tempfile.TemporaryDirectory(prefix="faves-addon-tagger-") as tmp:
        work = Path(tmp) / "repo"
        work.mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")

        for name, fn in standing.items():
            complaint = fn(work)
            print(f"  {'❌' if complaint else '✅'} {name:52} {complaint or 'clean'}")
            if complaint:
                failures.append(name)

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
    print(f"\nAll {len(CASES) + len(BREAKERS) + len(standing)} cases behaved as specified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
