#!/usr/bin/env python3
"""Warn when the shared stash stack is carrying an entry older than today.

    python3 tools/check_stashes.py              # the check
    python3 tools/check_stashes.py --selftest   # prove it can still fire AND stay quiet
    python3 tools/check_stashes.py --now 2026-09-21T09:00  # freeze "today"
    python3 tools/check_stashes.py --repo PATH  # inspect another checkout's stack

WHY THIS EXISTS (roadmap `340/220`, owner-ruled 2026-09-21).

**The stash stack is per-REPOSITORY, not per-worktree.** `refs/stash` lives in
the *common* git dir, so every linked worktree — and therefore every parallel
session — sees and mutates one stack. Measured 2026-09-21 on git 2.50.1: a
`git stash list` run inside `/Users/…/worktrees/faves-<x>` lists entries pushed
from the primary checkout, in the same order, under the same `stash@{N}`
selectors. So a bare `git stash pop` in any worktree pops **`stash@{0}`,
whoever made it**.

On 2026-09-07 two entries were found on this repo's stack, three weeks old,
from two different sessions. Nothing was lost — their contents had all reached
`main` — which is the finding, because *residue is what nobody investigates*.
Had one been popped, it would have restored an app shell dated 2026-08-17 over
the current one, `sw.js` included: a version-constant collision arriving from a
direction no gate watches.

🔎 **The autostash is the sharp edge, and nobody types it.** This repo's
mandated session-start command is `git pull --rebase --autostash`, and the
entry it leaves behind is labelled `autostash` with nothing saying who made it.
Measured here while building this check: when a rebase completes but the
autostash **re-apply** conflicts, git prints *"Your changes are safe in the
stash"* and **exits 0**. A successful-looking rebase silently leaves somebody's
uncommitted work on a stack every worktree shares. (A rebase *stopped* by a
conflict is different — the autostash is held in `.git/rebase-merge/autostash`
and never reaches `refs/stash`, so this check cannot see that one. Said out
loud because a guard's blind spot is not the reader's to guess.)

🛑 **IT WARNS. IT NEVER MUTATES.** An entry on the stack is another session's
uncommitted work, and dropping one is not a delivering session's call — that is
the item's own ruling and it is the reason this is a check and not a cleanup.
The only git command this file runs is `git stash list --format=…`, which is a
read. It never applies, pops, drops, shows, clears or checks out anything, and
`--selftest` asserts the stack is byte-identical after a firing run.

**WHY NOT LEAVE IT TO THE FLOOR.** atelier's Concurrency floor now opens with
*"At session start read `git status` first — dirty work this session didn't
make means stop and move, never autostash it"* (atelier `54201e0`, from this
repo's own hand-up, settled as atelier `320/210`). That covers creation and
use. It does not cover **cleanup**, and it is a discipline where
[ADR 0072](../docs/decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)
is precisely about guards that exist but cannot change an outcome. The owner
was shown that counter-argument on 2026-09-21 and chose the mechanism.

**"PREDATES TODAY" IS A LOCAL-CALENDAR-DAY TEST.** See `predates_today`.

🚩 **DO NOT WIRE THIS INTO `.githooks/pre-commit` OR CI AS A BLOCKER.** Exit 1
here is not a statement about your change — it is a statement about somebody
else's uncommitted work, and a peer's live stash would then block every commit
in the repository, which is exactly the blocking this item refuses. It belongs
on the verify list a human or an agent types. (CI would report nothing anyway:
a fresh clone has an empty stack by construction, which is ADR 0072 face 2 — a
guard that can never fire.)

Exit 0 = checked, and no entry predates today (the count is printed either way,
so "I checked and it is fine" cannot be mistaken for "I did not check");
1 = residue found, named; 2 = could not check — git missing, not a checkout, or
git refused — which is never reported as a pass.
Stdlib only, no build step (ADR 0001).
"""

import argparse
import os
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# NUL-separated, because a stash subject is free text a human typed and every
# printable separator has appeared in one. `%ct` is the stash commit's
# committer date — the moment the work was set aside. `%gt` is NOT a valid
# placeholder (git 2.50.1 prints it literally, measured), so the reflog's own
# timestamp is not available this way and is not wanted: what a reader is
# judging is the age of the WORK, not the age of the bookkeeping entry.
STASH_FORMAT = "%gd%x00%ct%x00%H%x00%gs"

GIT_TIMEOUT_S = 10


class CannotCheck(RuntimeError):
    """Raised when the stack could not be read. Exit 2, never a silent pass."""


def _git(repo: Path, *args: str) -> str:
    """git, read-only, in `repo`. Raises CannotCheck rather than returning a lie."""
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True,
            text=True,
            timeout=GIT_TIMEOUT_S,
        )
    except FileNotFoundError as e:
        raise CannotCheck("git is not installed") from e
    except subprocess.TimeoutExpired as e:
        raise CannotCheck(f"git {' '.join(args)} timed out after {GIT_TIMEOUT_S}s") from e
    except OSError as e:
        raise CannotCheck(f"git {' '.join(args)} could not run: {e}") from e
    if r.returncode != 0:
        detail = (r.stderr or "").strip().splitlines()
        tail = detail[-1] if detail else f"exit {r.returncode}"
        raise CannotCheck(f"git {' '.join(args)}: {tail}")
    return r.stdout


def stack_home(repo: Path) -> str:
    """Where `refs/stash` actually lives — the COMMON git dir.

    Named in the verdict because it is the whole point of this check: two
    worktrees of one repository print the same value here, which is the fact
    that makes a stranger's `stash@{0}` yours to pop by accident.
    """
    out = _git(repo, "rev-parse", "--git-common-dir").strip().splitlines()
    if not out or not out[0]:
        raise CannotCheck("git could not name the common git dir")
    common = Path(out[0])
    if not common.is_absolute():
        common = (Path(repo) / common).resolve()
    return str(common)


def read_stack(repo: Path):
    """Every entry on the stack, oldest selector last. Read-only.

    An empty stack — including one with no `refs/stash` at all — is an empty
    list and exit 0 from git, not an error. Both were measured.
    """
    raw = _git(repo, "stash", "list", f"--format={STASH_FORMAT}")
    entries = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split("\0")
        if len(parts) < 4:
            # A malformed row is a fact about the stack we cannot read, and
            # reading it as "nothing here" would be the silent pass this file
            # exists to refuse.
            raise CannotCheck(f"unparseable stash row from git: {line!r}")
        selector, ct, sha, subject = parts[0], parts[1], parts[2], "\0".join(parts[3:])
        try:
            when = datetime.fromtimestamp(int(ct))
        except (ValueError, OSError, OverflowError) as e:
            raise CannotCheck(f"stash {selector} has an unreadable date {ct!r}: {e}") from e
        entries.append(
            {
                "selector": selector,
                "when": when,
                "sha": sha,
                "subject": subject,
                # git writes exactly `autostash` as the subject of an entry left
                # by `--autostash`. Matched loosely on purpose: a hand-typed
                # message containing the word is annotated too, which costs
                # nothing — this decorates a row, it never decides the verdict.
                "autostash": "autostash" in subject.lower(),
            }
        )
    return entries


def predates_today(when: datetime, today: date) -> bool:
    """Is this entry from a calendar day before today, in the MACHINE'S LOCAL zone?

    WHY LOCAL, and not UTC or a hard-coded Pacific/Auckland.

    CLAUDE.md warns that this repo runs two conventions — `sw.js` version
    constants are stamped on **NZ local** time, record filenames on **UTC** —
    and that from midday UTC they name different days. So the zone has to be
    chosen deliberately rather than inherited from whichever call was handy.

    The stash stack is a **local, per-machine artefact**. It is never pushed,
    never fetched, and has exactly one reader: the person or agent sitting at
    this checkout. "Predates today" is therefore a question about *their* day,
    and their day is the machine's wall clock. On the owner's machine that is
    NZ local, so this agrees with the `sw.js` convention without hard-coding a
    zone that would be wrong on any other machine — and unlike the UTC
    filename convention, it never tells a session working at 1am NZST that a
    stash it made forty minutes ago is from a previous day.

    `datetime.fromtimestamp()` and `date.today()` both honour `TZ`, so the
    boundary is testable: `--selftest` runs one fixed instant under two zones
    and demands opposite verdicts.
    """
    return when.date() < today


def resolve_now(raw: str | None) -> date:
    """Today's local date, or the frozen one from `--now`."""
    if raw is None:
        return date.today()
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as e:
        raise CannotCheck(f"--now {raw!r} is not ISO 8601: {e}") from e
    # An offset-aware --now is converted to local first: the comparison is
    # against a LOCAL calendar day, so anything else would compare two
    # different calendars.
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone()
    return parsed.date()


def describe(entry: dict, today: date) -> str:
    """One row: what it is, how old, and whether it is nobody's."""
    when = entry["when"]
    delta = (when.date() - today).days
    if delta == 0:
        age = "today"
    elif delta > 0:
        # Clock skew, or a deliberately forward-dated commit. Annotated, not
        # a verdict — "predates today" is false here and stays false.
        age = f"dated {delta}d in the FUTURE"
    else:
        age = f"{-delta}d old"
    mark = "  ← AUTOSTASH (nobody types these)" if entry["autostash"] else ""
    return (
        f"  {entry['selector']:<12} {when:%Y-%m-%d %H:%M}  {age:<22} "
        f"{entry['sha'][:8]}  {entry['subject']}{mark}"
    )


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Warn when the shared stash stack carries an entry older than today.",
        epilog="Read-only: it never applies, pops, drops or clears anything. "
        "Exit 0 = nothing predating today; 1 = residue found; 2 = could not check.",
    )
    ap.add_argument(
        "--repo",
        default=str(ROOT),
        help="the checkout whose stack to read (default: this gate's own tree). "
        "Any worktree of a repository reads the same stack.",
    )
    ap.add_argument(
        "--now",
        help="freeze 'today' at this ISO 8601 local time — the boundary is "
        "otherwise untestable, which is how a date guard rots",
    )
    ap.add_argument(
        "-v", "--verbose", action="store_true",
        help="list every entry even when none predates today",
    )
    ap.add_argument(
        "--selftest", action="store_true",
        help="build throwaway repositories and prove this check both FIRES and "
        "stays QUIET (never touches this repo's stack)",
    )
    args = ap.parse_args(argv)

    if args.selftest:
        return _self_test()

    repo = Path(args.repo)
    try:
        today = resolve_now(args.now)
        home = stack_home(repo)
        entries = read_stack(repo)
    except CannotCheck as e:
        # Deliberately 2, not 0. "Could not read the stack" must never render
        # as "the stack is clean" — ADR 0072's first consequence.
        print(f"Cannot check the stash stack: {e}", file=sys.stderr)
        return 2

    stale = [e for e in entries if predates_today(e["when"], today)]
    where = f"{home} (read from {repo})"

    if not stale:
        # The COUNT is in the clean verdict on purpose: an empty stack and a
        # stack of three same-day entries are different facts, and a guard
        # that prints one word for both cannot be told from a broken one.
        print(
            f"Stash stack OK: {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}, "
            f"none predating {today:%Y-%m-%d} (local). Stack: {where}"
        )
        if args.verbose:
            for entry in entries:
                print(describe(entry, today))
        return 0

    print(
        f"STASH RESIDUE: {len(stale)} of {len(entries)} "
        f"entr{'y' if len(entries) == 1 else 'ies'} on the shared stash stack "
        f"predate{'s' if len(stale) == 1 else ''} {today:%Y-%m-%d} (local).",
        file=sys.stderr,
    )
    print(f"Stack: {where}", file=sys.stderr)
    print(file=sys.stderr)
    for entry in entries:
        print(describe(entry, today), file=sys.stderr)
    print(
        "\nThe stack is per-REPOSITORY: every worktree of this checkout shares it,\n"
        "so a bare `git stash pop` in any of them pops stash@{0}, whoever made it.\n"
        "\nThis is a WARNING, not a defect in your change, and it is NOT yours to\n"
        "clear: an entry is another session's uncommitted work. Ask whose it is.\n"
        "To look without touching:  git stash show -p stash@{N}\n"
        "Never `git stash pop` or `git stash apply` bare — they reach a stranger's\n"
        "work as well as yours.",
        file=sys.stderr,
    )
    return 1


# --- Proving it can still fire, and still stay quiet ------------------------
# Everything below runs only from `--selftest`.
#
# THE ADR 0072 PROBLEM THIS ANSWERS. This repo's stack is empty today and has
# been since 2026-09-08, so the check passes trivially — and would pass
# identically if it were broken into never firing. So the fixtures are built,
# in throwaway repositories under a temp dir, NEVER by pushing a stash onto
# this repo's stack or any worktree of it.

def _self_test() -> int:  # noqa: C901 — a flat list of cases reads better
    import tempfile

    failures = []

    def check(name, ok, detail=""):
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if detail and (not ok or "-v" in sys.argv or "--verbose" in sys.argv):
            for line in str(detail).splitlines():
                print(f"        {line}")
        if not ok:
            failures.append(name)

    def git(repo, *args, env=None, check_rc=True):
        r = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True,
            env={**os.environ, **(env or {})},
        )
        if check_rc and r.returncode != 0:
            raise SystemExit(f"selftest setup: git {' '.join(args)}\n{r.stderr}")
        return r

    def run(repo, *extra, tz=None):
        """The REAL entry point, as a subprocess — exit codes included."""
        env = {**os.environ}
        if tz is not None:
            env["TZ"] = tz
        r = subprocess.run(
            [sys.executable, str(Path(__file__).resolve()), "--repo", str(repo), *extra],
            capture_output=True, text=True, env=env,
        )
        return r.returncode, r.stdout + r.stderr

    def new_repo(base, name):
        repo = base / name
        repo.mkdir(parents=True)
        git(repo, "init", "-q", "-b", "main", ".")
        # RFC 2606 reserves .invalid — this addresses nobody.
        git(repo, "config", "user.email", "t@example.invalid")  # leakscan:allow: RFC 2606 reserved .invalid TLD, throwaway repo
        git(repo, "config", "user.name", "T")
        git(repo, "config", "commit.gpgsign", "false")
        (repo / "f.txt").write_text("base\n")
        (repo / "g.txt").write_text("other\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "base", "--no-verify")
        return repo

    def push_stash(repo, message, when_iso):
        """Put one entry on `repo`'s stack, dated `when_iso`.

        GIT_COMMITTER_DATE controls `%ct`, which is what the check reads —
        verified in the boundary cases below, which would be meaningless if it
        did not.
        """
        (repo / "f.txt").write_text(f"dirty for {message}\n")
        git(repo, "stash", "push", "-q", "-m", message,
            env={"GIT_AUTHOR_DATE": when_iso, "GIT_COMMITTER_DATE": when_iso})

    def selectors(repo):
        out = git(repo, "stash", "list", "--format=%gd %H").stdout.strip()
        return out.splitlines()

    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        NOW = "2026-09-21T09:00:00"        # the frozen "today" for every case
        YESTERDAY = "2026-09-20T23:59:59"  # one second before the boundary
        MIDNIGHT = "2026-09-21T00:00:00"   # the boundary itself
        OLD = "2026-08-17T19:57:00"        # the real stash@{0} this item found

        # --- IT STAYS QUIET -------------------------------------------------
        empty = new_repo(base, "empty")
        rc, out = run(empty, "--now", NOW)
        check("an EMPTY stack is quiet, and says it read zero entries",
              rc == 0 and "Stash stack OK: 0 entries" in out, out.strip())

        fresh = new_repo(base, "fresh")
        push_stash(fresh, "made this morning", "2026-09-21T08:10:00")
        push_stash(fresh, "made just now", NOW)
        rc, out = run(fresh, "--now", NOW)
        check("a stack of TODAY'S entries is quiet — and reports the count, so "
              "'checked and fine' cannot be read as 'did not check'",
              rc == 0 and "Stash stack OK: 2 entries" in out, out.strip())

        # --- IT FIRES -------------------------------------------------------
        old = new_repo(base, "old")
        push_stash(old, "prices work", OLD)
        rc, out = run(old, "--now", NOW)
        check("ONE entry older than today FIRES, exit 1, naming the selector",
              rc == 1 and "STASH RESIDUE" in out and "stash@{0}" in out
              and "35d old" in out, out.strip())

        mixed = new_repo(base, "mixed")
        push_stash(mixed, "three weeks ago", OLD)
        push_stash(mixed, "this morning", "2026-09-21T08:10:00")
        rc, out = run(mixed, "--now", NOW)
        check("a MIXED stack fires on the old one and counts it honestly "
              "(1 of 2), while still listing today's",
              rc == 1 and "1 of 2 entries" in out and "this morning" in out
              and "today" in out, out.strip())

        # --- THE BOUNDARY, BOTH SIDES ---------------------------------------
        edge = new_repo(base, "edge")
        push_stash(edge, "one second before midnight", YESTERDAY)
        rc_before, out_before = run(edge, "--now", NOW)
        edge2 = new_repo(base, "edge2")
        push_stash(edge2, "midnight exactly", MIDNIGHT)
        rc_after, out_after = run(edge2, "--now", NOW)
        check("the boundary is a CALENDAR DAY: 23:59:59 yesterday fires, "
              "00:00:00 today does not",
              rc_before == 1 and rc_after == 0,
              f"23:59:59 → rc {rc_before}\n00:00:00 → rc {rc_after}")

        # THE ZONE IS REAL AND CHOSEN. One fixed instant, two zones, opposite
        # verdicts — which is the whole reason the docstring has to say which
        # zone it means. 2026-09-20T13:30 UTC is the 21st in NZ (UTC+12) and
        # still the 20th in London.
        tzcase = new_repo(base, "tz")
        push_stash(tzcase, "a fixed instant", "2026-09-20T13:30:00+00:00")
        rc_nz, out_nz = run(tzcase, "--now", NOW, tz="Pacific/Auckland")
        rc_utc, out_utc = run(tzcase, "--now", NOW, tz="UTC")
        check("the LOCAL-day rule is load-bearing: one instant reads as today "
              "in Pacific/Auckland and as yesterday in UTC",
              rc_nz == 0 and rc_utc == 1,
              f"Pacific/Auckland → rc {rc_nz}\nUTC → rc {rc_utc}")

        # --- IT NEVER MUTATES -----------------------------------------------
        before = selectors(old)
        run(old, "--now", NOW)      # a firing run…
        run(old, "-v", "--now", NOW)  # …and a verbose one, which lists every row
        after = selectors(old)
        check("a FIRING run leaves the stack byte-identical — nothing dropped, "
              "popped or applied",
              before == after and len(before) == 1,
              f"before: {before}\nafter:  {after}")

        # --- THE SHARED-STACK FACT, ASSERTED NOT ASSUMED --------------------
        shared = new_repo(base, "shared")
        wt = base / "shared-wt"
        git(shared, "worktree", "add", "-q", "-b", "wt", str(wt))
        push_stash(shared, "pushed from the PRIMARY checkout", OLD)
        rc_wt, out_wt = run(wt, "--now", NOW)
        check("a WORKTREE sees the primary checkout's stash — the stack is "
              "per-repository, which is the whole reason this check exists",
              rc_wt == 1 and "pushed from the PRIMARY checkout" in out_wt,
              out_wt.strip())
        check("…and both name the SAME stack home, so the sharing is visible "
              "in the output rather than only in this docstring",
              f"{shared}/.git" in out_wt, out_wt.strip())

        # --- A REAL AUTOSTASH, NOT A HAND-TYPED IMITATION -------------------
        # Built the way the sharp edge actually happens: a rebase that
        # COMPLETES (exit 0) whose autostash re-apply conflicts. Measured
        # 2026-09-21 on git 2.50.1.
        auto = new_repo(base, "auto")
        git(auto, "checkout", "-q", "-b", "feat")
        (auto / "g.txt").write_text("feat only\n")
        git(auto, "add", "-A"); git(auto, "commit", "-qm", "feat", "--no-verify")
        git(auto, "checkout", "-q", "main")
        (auto / "f.txt").write_text("main moved\n")
        git(auto, "add", "-A"); git(auto, "commit", "-qm", "main2", "--no-verify")
        git(auto, "checkout", "-q", "feat")
        (auto / "f.txt").write_text("uncommitted and conflicting\n")
        rebase = git(auto, "rebase", "--autostash", "main",
                     env={"GIT_AUTHOR_DATE": OLD, "GIT_COMMITTER_DATE": OLD},
                     check_rc=False)
        if not selectors(auto):
            raise SystemExit(
                "selftest setup: the conflicting autostash did not reach "
                f"refs/stash (git rebase rc={rebase.returncode}). This git "
                "behaves differently; fix the fixture rather than skipping the "
                "case — a skipped case that reports success is ADR 0072 face 4."
            )
        rc_auto, out_auto = run(auto, "--now", NOW)
        check("a genuine leftover AUTOSTASH is named as one — and note the "
              f"rebase that left it exited {rebase.returncode}",
              rc_auto == 1 and "AUTOSTASH" in out_auto, out_auto.strip())

        # --- 'COULD NOT CHECK' IS NOT 'CHECKED AND FINE' --------------------
        nogit = base / "nogit"
        nogit.mkdir()
        rc, out = run(nogit, "--now", NOW)
        check("a directory that is not a checkout exits 2, not 0",
              rc == 2 and "Cannot check" in out, out.strip())

        rc, out = run(empty, "--now", "the day before yesterday")
        check("an unparseable --now exits 2 rather than falling back to a "
              "default that would hide the mistake",
              rc == 2 and "not ISO 8601" in out, out.strip())

        # --- THE VERDICT CARRIES ITS OWN PROVENANCE -------------------------
        rc, out = run(empty, "--now", NOW)
        check("the tree line still prints, naming THIS gate's tree and not the "
              "fixture it was pointed at",
              any(ln.lstrip().startswith("tree ") and str(ROOT) in ln
                  for ln in out.splitlines()), out.strip())

        # A control on the fixtures themselves: if `push_stash` silently did
        # nothing, every "fires" case above would be testing an empty stack and
        # every "quiet" case would pass for the wrong reason.
        check("the fixtures really put entries on their stacks",
              len(selectors(old)) == 1 and len(selectors(mixed)) == 2
              and len(selectors(empty)) == 0,
              f"old={selectors(old)}\nmixed={selectors(mixed)}\n"
              f"empty={selectors(empty)}")

    print()
    if failures:
        print(f"✗ stash-residue selftest — {len(failures)} failed: "
              f"{', '.join(failures)}")
        return 1
    print("✓ stash-residue selftest — all cases passed; the check fires on an "
          "entry older than today, stays quiet on an empty or same-day stack, "
          "and leaves the stack untouched")
    return 0


if __name__ == "__main__":
    # Which tree did this gate come from? ROOT, resolved from this file, never
    # the working directory (ADR 0113). Note it is deliberately NOT the same
    # question as `--repo`: the verdict line names the stack it read, this
    # names the gate that read it, and when they differ a reader can see so.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    sys.exit(main())
