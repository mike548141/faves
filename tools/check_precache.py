#!/usr/bin/env python3
"""Every path `site/sw.js` precaches must actually exist in `site/`.

Nothing checked this until 2026-09-08. The only thing standing in for it was
the install step's own `!res.ok → throw`, and on Cloudflare Pages that guard
cannot fire: a path Pages does not have is answered with `index.html` and a
**200**, so `res.ok` is true for a file that is simply gone. Curl'd against the
live site on 2026-09-08:

    $ curl -sI https://lets-eat.myspot.nz/js/this-file-does-not-exist.js
    HTTP/2 200
    content-type: text/html; charset=utf-8

So a typo in `SHELL` used to precache the home page under a module's URL, the
install would report success, and the shell would be broken offline with
nothing red anywhere. `sw.js` now also refuses a non-HTML path answered as
HTML (ADR 0098) — but that is a guard on the *deploy*, and it fires on the
reader's phone. This is the guard on the *repo*, and it fires before the push.

WHAT IT READS, AND WHY IT PARSES RATHER THAN HARD-CODES. `sw.js` is browser
code that Python cannot execute, so the lists are read out of the shipped file
as text. A parse that rebuilds its input is only trustworthy if it can write
that input back (ADR 0076): every parser here re-emits the block it read and
compares it to the original byte for byte, and refuses a shape it only half
recognises rather than quietly yielding fewer paths. Fewer paths is exactly the
answer that makes every assertion below pass.

Three lists, all derived from `sw.js` itself so this tool cannot drift from it:

1. **`SHELL`** — the app shell, one quoted relative path per line. `"./"` and
   any path ending in `/` resolve to that directory's `index.html`.
2. **`DATA_INDEX` / `DATA_FX`** — the two data files known ahead of time.
3. **The menus** — `sw.js` builds these at install from `data/index.json`, so
   the template is read out of the install step and applied to every id in the
   index. A menu missing here is an install that throws on a real phone.

What it does NOT check: that a file on disk is *in* the lists. `SHELL` is
deliberately not everything under `site/` — `icons/og-image.png` and
`.well-known/` are served to crawlers and never precached — so a
disk-to-list sweep would fail on correct work. The one direction that is
enforced elsewhere is `site/js/*.js ⊆ SHELL`, in
`tests/sw-versioning.test.js`, added after `dietary.js` shipped unprecached
and broke menu screens in flight mode.

    python3 tools/check_precache.py              # report; exit 1 on a missing path
    python3 tools/check_precache.py -v           # list every path as it is read
    python3 tools/check_precache.py --self-test  # prove this gate still refuses

Exit 0 = every precached path exists; 1 = at least one does not, or the parse
could not vouch for what it read. Stdlib only, no build step.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SW = SITE / "sw.js"
INDEX_JSON = SITE / "data" / "index.json"


class ParseRefused(Exception):
    """The shipped file is not the shape this tool understands.

    Raised rather than returning fewer paths, because fewer paths is the answer
    that makes a completeness check pass in silence (ADR 0076).
    """


# Loose in, canonical out — the same reasoning tests/tag-labels.test.js gives.
# A grammar tight enough to reject every non-canonical line would make the round
# trip a guard that can never fire (ADR 0072's decorative shape wearing ADR
# 0076's clothes). The regex catches lines with no reading at all; the round trip
# catches a re-spaced or re-flowed list.
ROW = re.compile(r'^(\s+)"([^"\\]+)"\s*,\s*$')
COMMENT = re.compile(r"^\s*//")


def _round_trip(rebuilt, lines, start, end, where):
    original = "\n".join(lines[start:end + 1])
    if "\n".join(rebuilt) != original:
        raise ParseRefused(
            f"{where}: the parse could not write its input back unchanged "
            f"(ADR 0076).\n--- read ---\n{original}\n--- re-emitted ---\n"
            + "\n".join(rebuilt)
        )


def shell_list(src, name="SHELL"):
    """The `const SHELL = [` … `];` array, as a list of relative paths."""
    where = f"site/sw.js `{name}`"
    lines = src.split("\n")
    header = f"const {name} = ["
    try:
        start = lines.index(header)
    except ValueError:
        raise ParseRefused(f"{where}: no line reading exactly `{header}`")
    try:
        end = lines.index("];", start + 1)
    except ValueError:
        raise ParseRefused(f"{where}: `{header}` never closes with `];`")

    paths, rebuilt = [], [lines[start]]
    for i in range(start + 1, end):
        line = lines[i]
        if COMMENT.match(line):
            rebuilt.append(line)  # a comment carries no path; re-emitted verbatim
            continue
        m = ROW.match(line)
        if not m:
            raise ParseRefused(
                f"{where}: line {i + 1} is neither a comment nor a quoted path, "
                f"so this parser does not understand it: {line!r}"
            )
        paths.append(m.group(2))
        rebuilt.append(f'{m.group(1)}"{m.group(2)}",')
    rebuilt.append(lines[end])
    _round_trip(rebuilt, lines, start, end, where)
    return paths


CONST = re.compile(r'^const (\w+) = "([^"\\]+)";$')


def const_path(src, name):
    """A one-line `const NAME = "path";` declaration."""
    where = f"site/sw.js `{name}`"
    lines = src.split("\n")
    at = next((i for i, l in enumerate(lines) if l.startswith(f"const {name} =")), -1)
    if at < 0:
        raise ParseRefused(f"{where}: no line starting `const {name} =`")
    m = CONST.match(lines[at])
    if not m or m.group(1) != name:
        raise ParseRefused(
            f"{where}: not a plain quoted path: {lines[at]!r}"
        )
    _round_trip([f'const {name} = "{m.group(2)}";'], lines, at, at, where)
    return m.group(2)


# The menu URL the install step builds per id. Read rather than hard-coded so a
# move of the menus (`data/restaurants/` → anywhere else) is followed here
# instead of silently checking a directory the worker no longer fetches.
MENU_TMPL = re.compile(r"^(\s*)const u = `([^`${]*)\$\{id\}([^`${]*)`;$")


def menu_template(src):
    """The `` `data/restaurants/${id}.json` `` template, as (prefix, suffix)."""
    where = "site/sw.js menu URL template"
    lines = src.split("\n")
    at = next((i for i, l in enumerate(lines) if l.lstrip().startswith("const u = `")), -1)
    if at < 0:
        raise ParseRefused(f"{where}: no line starting `const u = ` + a template literal")
    m = MENU_TMPL.match(lines[at])
    if not m:
        raise ParseRefused(
            f"{where}: not a template of the form `prefix${{id}}suffix`: {lines[at]!r}"
        )
    indent, pre, post = m.groups()
    _round_trip([f"{indent}const u = `{pre}${{id}}{post}`;"], lines, at, at, where)
    return pre, post


def resolve(rel):
    """Where a precached URL lands on disk. `./` and `foo/` mean `index.html`."""
    rel = rel[2:] if rel.startswith("./") else rel
    path = SITE / rel if rel else SITE
    return path / "index.html" if rel == "" or rel.endswith("/") else path


def audit(src, ids, verbose=False):
    """Return (problems, counts). Takes `src` so --self-test can mutate it."""
    problems = []
    shell = shell_list(src)
    data_index = const_path(src, "DATA_INDEX")
    data_fx = const_path(src, "DATA_FX")
    pre, post = menu_template(src)

    if not shell:
        problems.append("SHELL parsed as an empty list — every check below is vacuous")

    seen = set()
    for rel in shell:
        if rel in seen:
            problems.append(f"SHELL lists {rel!r} twice — the second put is dead weight")
        seen.add(rel)

    def check(rel, why):
        path = resolve(rel)
        try:
            inside = path.resolve().is_relative_to(SITE.resolve())
        except OSError:
            inside = False
        if not inside:
            problems.append(f"{why}: {rel!r} resolves outside site/")
        elif not path.is_file():
            problems.append(f"{why}: {rel!r} → no file at site/{path.relative_to(SITE)}")
        elif verbose:
            print(f"  ✓ {rel}")

    for rel in shell:
        check(rel, "SHELL")
    for rel in (data_index, data_fx):
        check(rel, "precached data file")
    for rid in ids:
        check(f"{pre}{rid}{post}", f"menu for {rid!r}")

    return problems, {"shell": len(shell), "menus": len(ids)}


# --- Proving the gate can still fire --------------------------------------
# A check that only ever passes looks exactly like a tree that is always clean.
# Each case mutates the REAL shipped source in memory and names the one thing it
# must refuse; a mutation that stops applying (the fixture line moved) fails
# loudly rather than passing as a mutation that changed nothing.

def self_test():
    src = SW.read_text()
    ids = json.loads(INDEX_JSON.read_text())
    cases = []

    def case(what, mutate, expect, kind="problem"):
        cases.append((what, mutate, expect, kind))

    case("a phantom path in SHELL is reported",
         lambda s: s.replace('  "js/app.js",', '  "js/app.js",\n  "js/phantom.js",'),
         "js/phantom.js")
    case("a SHELL path whose file is gone is reported",
         lambda s: s.replace('  "css/app.css",', '  "css/app.css.gone",'),
         "css/app.css.gone")
    case("a menu template pointing at the wrong directory is reported",
         lambda s: s.replace("`data/restaurants/${id}.json`", "`data/venues/${id}.json`"),
         "data/venues/")
    case("a missing fx file is reported",
         lambda s: s.replace('const DATA_FX = "data/fx.json";',
                             'const DATA_FX = "data/rates.json";'),
         "data/rates.json")
    case("a re-spaced SHELL row is REFUSED, not read as fewer paths",
         lambda s: s.replace('  "js/app.js",', '  "js/app.js" ,'),
         "write its input back unchanged", kind="refused")
    case("a SHELL row that is not a quoted path is REFUSED",
         lambda s: s.replace('  "js/app.js",', "  APP,"),
         "does not understand it", kind="refused")
    case("a renamed SHELL header is REFUSED",
         lambda s: s.replace("const SHELL = [", "const SHELL  = ["),
         "no line reading exactly", kind="refused")
    case("a DATA_INDEX that is not a quoted path is REFUSED",
         lambda s: s.replace('const DATA_INDEX = "data/index.json";',
                             "const DATA_INDEX = INDEX;"),
         "not a plain quoted path", kind="refused")

    failures = 0
    for what, mutate, expect, kind in cases:
        mutated = mutate(src)
        if mutated == src:
            print(f"  ✗ {what}: the fixture line moved — update this self-test")
            failures += 1
            continue
        try:
            problems, _ = audit(mutated, ids)
            got = "\n".join(problems)
            ok = kind == "problem" and expect in got
        except ParseRefused as e:
            got = str(e)
            ok = kind == "refused" and expect in got
        if ok:
            print(f"  ✓ {what}")
        else:
            failures += 1
            print(f"  ✗ {what}: expected {kind} mentioning {expect!r}, got:\n      "
                  + (got.replace("\n", "\n      ") or "(nothing — the gate passed)"))

    # The control. Without it, a gate broken into refusing everything passes
    # every case above.
    problems, _ = audit(src, ids)
    if problems:
        failures += 1
        print("  ✗ the UNMUTATED tree must be clean, and it is not:")
        for p in problems:
            print(f"      {p}")
    else:
        print("  ✓ the unmutated tree passes (so the cases above are not just noise)")

    print(f"\n{'✗' if failures else '✓'} precache gate self-test — "
          f"{len(cases) + 1 - failures} passed, {failures} failed.")
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="list every precached path as it is read")
    ap.add_argument("--self-test", action="store_true",
                    help="prove this gate still refuses a broken precache list")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    ids = json.loads(INDEX_JSON.read_text())
    try:
        problems, counts = audit(SW.read_text(), ids, args.verbose)
    except ParseRefused as e:
        print(f"✗ {e}")
        print("\nsite/sw.js no longer has the shape this tool reads. Fix the file")
        print("or teach tools/check_precache.py the new shape — do NOT let it")
        print("parse fewer paths, which is how this check passes on a broken list.")
        return 1

    if problems:
        print(f"✗ the service worker precaches paths that do not exist — "
              f"{len(problems)} finding(s):")
        for p in problems:
            print(f"  {p}")
        print("\nOn Cloudflare Pages a missing path is answered with index.html and")
        print("a 200, so the install step cannot see this: the shell installs and is")
        print("broken offline. Fix the list in site/sw.js, or add the file.")
        return 1

    print(f"✓ every precached path exists — {counts['shell']} shell file(s), "
          f"2 data file(s), {counts['menus']} menu(s).")
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
