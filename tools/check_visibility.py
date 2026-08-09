#!/usr/bin/env python3
"""Assert CLAUDE.md's stated repo visibility matches the repo's real one.

CLAUDE.md's doctrine block carries a **This repo's visibility:** line, and
that line is load-bearing rather than decorative: it is what tells a session
whether a push is recoverable or is irreversible world-readable publication,
and therefore whether a leaked secret can be deleted or must be rotated.

It went stale, and the interesting part is not how long for. The repo flipped
public on 2026-08-09 with `main` at `a207a15` (Theme 8); the doctrine block
still read "PRIVATE for now — a push is not publication" when this guard was
written the same day, about seven hours later. Every scanner in the floor
passed throughout, because nothing compared the claim to reality — CLAUDE.md
even names the command to check it by hand (`gh repo view … --json
visibility`) and no session had run it.

Seven hours is a small window and the corpus survived it, so the guard does
not rest on the damage done. It rests on there being **no mechanism at all**:
nothing would have closed that window at seven hours rather than seven weeks,
and the flip is precisely the moment the fact changes while nobody is looking
at this line. A fact that only a human remembers to verify is a fact that
goes stale eventually.

    python3 tools/check_visibility.py                 # local: asks gh
    python3 tools/check_visibility.py --actual public # CI: no API call

In CI the truth is free and needs no token — GitHub hands the workflow
`github.event.repository.private` — so pass it via `--actual` rather than
spending a credential on a fact the runner already holds.

Exit 0 = the claim matches; 1 = it does not, or the claim is unreadable;
2 = the actual visibility could not be determined (gh missing or unauthed),
which is reported as "cannot verify", never silently passed.
Stdlib only, no build step.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MD = ROOT / "CLAUDE.md"

# The doctrine block's visibility bullet. Matched on the label rather than on
# the whole sentence so re-wording the bullet never silently disables the
# guard — only removing the label itself does, and that fails loudly below.
CLAIM_LABEL = re.compile(r"^\s*-\s+\*\*This repo's visibility:\*\*")

# Only the shouted forms count as the claim. Lower-case "public" appears all
# over this repo's prose ("a public site", "public launch"); requiring capitals
# keeps the guard reading the assertion, not the surrounding sentence.
CLAIM_VALUE = re.compile(r"\b(PUBLIC|PRIVATE)\b")


def read_claim(path: Path) -> str:
    """Return 'public'/'private' as claimed in CLAUDE.md, or raise ValueError."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as e:
        raise ValueError(f"cannot read {path.name}: {e}") from e

    claims = [ln for ln in lines if CLAIM_LABEL.match(ln)]
    if not claims:
        raise ValueError(
            "no \"**This repo's visibility:**\" bullet found in CLAUDE.md — "
            "the doctrine block's visibility fact has gone missing entirely"
        )
    if len(claims) > 1:
        raise ValueError(
            f"{len(claims)} visibility bullets found in CLAUDE.md — "
            "there must be exactly one, or readers cannot tell which is current"
        )

    found = CLAIM_VALUE.findall(claims[0])
    unique = set(found)
    if not unique:
        raise ValueError(
            "the visibility bullet names neither PUBLIC nor PRIVATE (in capitals): "
            f"{claims[0].strip()}"
        )
    if len(unique) > 1:
        raise ValueError(
            "the visibility bullet names both PUBLIC and PRIVATE — ambiguous: "
            f"{claims[0].strip()}"
        )
    return unique.pop().lower()


def ask_gh() -> str:
    """Return the repo's real visibility via gh, or raise RuntimeError."""
    try:
        out = subprocess.run(
            ["gh", "repo", "view", "--json", "visibility"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        ).stdout
    except FileNotFoundError as e:
        raise RuntimeError("gh is not installed — pass --actual instead") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError("gh timed out — pass --actual instead") from e
    except subprocess.CalledProcessError as e:
        detail = (e.stderr or "").strip().splitlines()
        tail = detail[-1] if detail else f"exit {e.returncode}"
        raise RuntimeError(f"gh could not read the repo ({tail})") from e

    try:
        value = json.loads(out)["visibility"]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        raise RuntimeError(f"gh returned no usable visibility field: {out!r}") from e
    return str(value).lower()


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Assert CLAUDE.md's visibility claim matches reality.",
        epilog="With no --actual, asks gh. In CI pass "
        "--actual ${{ github.event.repository.private && 'private' || 'public' }}.",
    )
    ap.add_argument(
        "--actual",
        choices=["public", "private"],
        help="the repo's real visibility, when the caller already knows it "
        "(CI has it in the event payload — no API call, no token)",
    )
    args = ap.parse_args()

    try:
        claimed = read_claim(CLAUDE_MD)
    except ValueError as e:
        print(f"CLAUDE.md visibility claim unreadable: {e}", file=sys.stderr)
        return 1

    if args.actual:
        actual = args.actual
        source = "--actual"
    else:
        try:
            actual = ask_gh()
        except RuntimeError as e:
            # Deliberately exit 2, not 0: "could not check" must never read as
            # "checked and fine". The one fact this guard exists to protect is
            # exactly the one a silent pass would hide.
            print(f"Cannot verify visibility: {e}", file=sys.stderr)
            return 2
        source = "gh repo view"

    # gh reports INTERNAL for org repos; it is not public, but it is not the
    # private this repo's doctrine means either, so refuse to judge rather
    # than mapping it onto one of the two and getting the floor wrong.
    if actual not in ("public", "private"):
        print(
            f"Cannot verify visibility: {source} reported {actual!r}, which is "
            "neither public nor private — rule the doctrine wording by hand.",
            file=sys.stderr,
        )
        return 2

    if claimed != actual:
        print(
            f"VISIBILITY CLAIM IS WRONG: CLAUDE.md says {claimed.upper()}, "
            f"{source} says {actual.upper()}.",
            file=sys.stderr,
        )
        if actual == "public":
            print(
                "\nThis is the dangerous direction. A push is publication: "
                "immediate,\nworld-readable and irreversible, and the git "
                "history is public too — so\na secret that was committed and "
                "then removed is still disclosed and must\nbe ROTATED, not "
                "just deleted. Correct the bullet in CLAUDE.md now.",
                file=sys.stderr,
            )
        else:
            print(
                "\nThe repo is private but the doctrine block claims public. "
                "Less urgent,\nbut still wrong: sessions will over-restrict, "
                "and the next reader cannot\ntell which statement to trust. "
                "Correct the bullet in CLAUDE.md.",
                file=sys.stderr,
            )
        return 1

    print(f"Visibility claim holds: CLAUDE.md and {source} both say {actual.upper()}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
