#!/usr/bin/env python3
"""Back up the evidence originals in `intake/` to the owner's private Drive.

    python3 tools/backup_intake.py --dry-run     # what WOULD be copied; writes nothing
    python3 tools/backup_intake.py               # copy what is new, verify, count upload
    python3 tools/backup_intake.py --selftest    # prove the allow-list still refuses

WHY THIS EXISTS (roadmap 500/070, the re-runnable half of 340/310). `intake/`
is gitignored and lives on one laptop, so every photo dropped in after the
one-off copy of 2026-10-02 is in exactly the state 340/310 existed to end: one
copy, and no fingerprint until a reading cites it. The originals are NOT
committed (340/310's measured reasons: 1.85 GB permanent, ~311 photos taken in
a home); they are copied, GPS and all, to a private Drive folder.

THE ALLOW-LIST IS 340/310'S, UNCHANGED, and it is an allow-list on purpose:

  * the three evidence trees  menus/  recipes/  ingredients/raw_food_photos/
  * images and PDFs only      (check_provenance.PHOTO_SUFFIXES + .pdf)
  * plus the Markdown recipe notes in recipes/ ONLY (owner-ruled 2026-10-16,
    roadmap 500/080: Apple Notes exports, not health data). An .md anywhere
    else is still refused, because ingredients/ holds health transcripts.
  * plus the fetched web page(s) a committed fingerprint names -- the
    `snapshot` path in data/intake/recipe-sources.json, or (since 2026-10-16,
    500/080) a menus/ evidence row in data/intake/menu-sources.json, which is
    how a fetched menu page or PDF is cited -- and nothing else .html

Nothing else is ever opened, hashed, or copied. In particular it is NOT "every
image": `intake/ingredients/` also holds a saved health transcript's own page
assets (images) and food-log exports, which are health data and eating events
that CLAUDE.md says are never opened. An images-only filter would have copied
the assets; only an allow-list of trees does not. The walk lists names (it has
to, to count what it refused) but only a path that passes `classify()` is ever
read, and the refusals are printed as COUNTS, never as paths.

HOW IT DECIDES, per allowed file (source is hashed once, SHA-256, streamed):

  new                destination has no such file          -> copy
  same               destination bytes equal source        -> nothing
  changed            same name, different bytes            -> HELD, unless
                       --accept-changed, or the source equals its committed
                       fingerprint (then it is the DESTINATION that is wrong,
                       and the copy is repaired)
  fp-mismatch        source differs from its committed `sha256` -> not copied.
                       Same name, different bytes is the substitution a
                       fingerprint exists to catch (check_provenance.py's rule)

The tool never deletes anything, anywhere. Files in the destination that the
allow-list would not select are COUNTED ("extra") and left alone.

HOW IT VERIFIES. Every copy is re-hashed from the destination and must equal the
source, and the committed fingerprint where one exists; a new copy that fails is
removed (it is our own file). Then UPLOAD is counted, and not by the local copy:
Drive for desktop stamps `com.google.drivefs.item-id#S` on a file once it has
been uploaded, and a file that is on disk without the stamp is on disk only. The
count covers every selected file, not just this run's, so a re-run later is how
a pending upload is confirmed. Exit 3 means "all copies verified, N not yet
stamped -- run it again".

EXIT CODES  0 all verified and all stamped (or --dry-run)  ·  1 a refusal
(fp-mismatch, held, copy failed verification)  ·  2 cannot run (no intake here,
no destination, no `xattr`)  ·  3 verified, uploads still pending.

WHERE THE DESTINATION IS. `~/Library/CloudStorage/GoogleDrive-<account>/My
Drive/Faves evidence/intake/` -- found by glob when there is exactly one Drive on
the machine, else give `--dest`. It is the owner's private account, so the
account segment is masked in everything this prints and must stay out of any
committed text (340/310's local-path convention).

NOT A GATE. It reads a gitignored folder that CI and every worktree lack, so it
could only ever pass vacuously there. It is an authoring tool, run by a person
or session at the end of an intake session (see intake/README.md and CLAUDE.md's
intake notes); it is deliberately not on the verify list. `--selftest` is the
part that is safe to run anywhere.

Stdlib only -- ADR 0001, and check_no_deps.py enforces it.
"""

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from collections import Counter
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_provenance import (  # noqa: E402  (same directory, stdlib-only)
    PHOTO_SUFFIXES, load_record, sha256_of)

ROOT = Path(__file__).resolve().parent.parent
RECIPE_RECORD = ROOT / "data" / "intake" / "recipe-sources.json"

# 340/310's three trees, as paths under intake/. A tuple, not a pattern: adding
# a tree is a reviewed edit to this line, never a side effect of a new folder.
TREES = ("menus", "recipes", "ingredients/raw_food_photos")
SUFFIXES = set(PHOTO_SUFFIXES) | {".pdf"}
STAMP = "com.google.drivefs.item-id#S"
DRIVE_GLOB = "GoogleDrive-*"
DEST_TAIL = ("My Drive", "Faves evidence", "intake")


# --- the allow-list --------------------------------------------------------

def classify(rel, snapshots=frozenset(), is_link=False):
    """(selected, reason) for one path RELATIVE to intake/, as a `/` string.

    Pure, and the only thing standing between a health export and the copy:
    nothing may open, hash or copy a path this has not said yes to. Reasons for
    a no are counted by kind and printed as counts -- never as paths.
    """
    parts = rel.split("/")
    if any(p in ("", ".", "..") for p in parts):
        return False, "path"
    if is_link:
        return False, "symlink"   # a link could point into a refused tree
    if any(p.startswith(".") for p in parts):
        return False, "hidden"    # .DS_Store, .gitkeep
    tree = next((t for t in TREES if rel.startswith(t + "/")), None)
    if tree is None:
        return False, "outside"   # everything not in an allowed tree
    if rel in snapshots:
        return True, "snapshot"   # the fingerprinted web page, by exact path
    if tree == "recipes" and Path(rel).suffix.lower() == ".md":
        return True, "recipe-note"  # 500/080: recipes/ only, never another tree
    if Path(rel).suffix.lower() not in SUFFIXES:
        return False, "type"      # inside a tree, but not evidence
    return True, "ok"


def snapshot_paths(doc):
    """{rel path under intake/: sha256} for the fetched pages the record names.

    The record's `snapshot` is prose that begins with the path ("intake/… (…)"),
    so take the first token. A row naming a path outside the three trees is
    still refused by classify(): the record is committed, but it is not an
    allow-list of its own.
    """
    out = {}
    for row in (doc.get("recipes") or {}).values():
        m = re.match(r"intake/(\S+)", row.get("snapshot", ""))
        if m and row.get("sha256"):
            out[m.group(1)] = row["sha256"]
    return out


def fingerprints(menu_doc, snaps):
    """{rel path under intake/: committed sha256}: menu evidence rows + snapshots."""
    out = dict(snaps)
    for entry in (menu_doc.get("venues") or {}).values():
        folder = re.sub(r"^intake/", "", entry.get("folder", ""))
        for r in entry.get("evidence", []):
            if r.get("sha256"):
                out[f"{folder}/{r['file']}"] = r["sha256"]
    return out


# --- operations, injectable so the self-test can break each one ------------

def _state(dst, src_stat, digest, ops, deep=False):
    """new / same / changed, reading the DESTINATION's bytes only when needed.

    Drive for desktop keeps files online-only, so hashing a destination file
    makes Drive download it: the first dry run of this tool sat for minutes
    pulling ~1.8 GB back down to compare what its metadata already said. Size
    and mtime (copy2 preserves it, and Drive keeps it -- 87 of 87 menu files
    agreed on 2026-10-16) answer "same" for free; bytes are read when they
    disagree, or for every file under --deep.
    """
    if not dst.is_file():
        return "new"
    st = dst.stat()
    if st.st_size != src_stat.st_size:
        return "changed"
    if not deep and int(st.st_mtime) == int(src_stat.st_mtime):
        return "same"
    return "same" if ops.hash(dst) == digest else "changed"


def _verify(dst, digest, fp, ops):
    got = ops.hash(dst)
    return got == digest and (fp is None or got == fp)


def _stamped(path):
    """Has Drive for desktop uploaded this file? Read off its own xattr.

    `os.listxattr` is Linux-only, so ask the system tool; one call per file
    keeps a path containing ": " from confusing a multi-file parse.
    """
    r = subprocess.run(["xattr", "-p", STAMP, str(path)],
                       capture_output=True, text=True)
    return r.returncode == 0 and bool(r.stdout.strip())


def default_ops():
    return SimpleNamespace(
        classify=classify,
        hash=sha256_of,
        state=_state,
        fp_ok=lambda digest, fp: digest == fp,
        copy=shutil.copy2,
        verify=_verify,
        stamped=_stamped,
    )


# --- the run ---------------------------------------------------------------

def survey(intake, snapshots, ops):
    """Walk NAMES under intake/ and split them by the allow-list.

    Returns (selected rels, refused-by-reason Counter, type-refused-by-suffix
    Counter). No file is opened here: the health folders are enumerated like any
    other (so the refusals can be counted) and read by nobody.
    """
    selected, refused, by_type = [], Counter(), Counter()
    for dirpath, dirnames, filenames in os.walk(intake, followlinks=False):
        dirnames.sort()
        for name in sorted(filenames) + [d for d in dirnames
                                         if os.path.islink(os.path.join(dirpath, d))]:
            full = Path(dirpath) / name
            rel = full.relative_to(intake).as_posix()
            ok, why = ops.classify(rel, snapshots, full.is_symlink())
            if ok:
                selected.append(rel)
            else:
                refused[why] += 1
                if why == "type":
                    by_type[Path(rel).suffix.lower() or "(none)"] += 1
    return selected, refused, by_type


def run(intake, dest, fps, snapshots, ops, dry=False, accept_changed=False,
        wait=0, deep=False):
    intake, dest = Path(intake), Path(dest)
    selected, refused, by_type = survey(intake, snapshots, ops)
    res = SimpleNamespace(
        selected=selected, refused=refused, by_type=by_type, actions={},
        copied=[], verify_failed=[], stamped=0, backed=0, pending=[],
        extras=0, unfingerprinted=Counter(), fp_orphans=0,
        by_tree=Counter(), would_copy=Counter())

    for rel in selected:
        # Never raises: a broken allow-list must reach the copy and be CAUGHT by
        # the self-test, not die here with a traceback that proves nothing.
        tree = next((t for t in TREES if rel.startswith(t + "/")), "(outside the trees)")
        res.by_tree[tree] += 1
        src, dst = intake / rel, dest / rel
        digest = ops.hash(src)
        fp = fps.get(rel)
        if fp is None:
            res.unfingerprinted[tree] += 1
        elif not ops.fp_ok(digest, fp):
            res.actions[rel] = "fp-mismatch"
            continue
        st = ops.state(dst, src.stat(), digest, ops, deep)
        if st == "changed" and fp is None and not accept_changed:
            res.actions[rel] = "held"
            continue
        res.actions[rel] = st
        if st == "same":
            continue
        res.would_copy[tree] += 1
        if dry:
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        ops.copy(src, dst)
        if ops.verify(dst, digest, fp, ops):
            res.copied.append(rel)
        else:
            res.verify_failed.append(rel)
            res.actions[rel] = "verify-failed"
            if st == "new":
                dst.unlink()    # our own just-made file; an overwrite is left for the next run

    res.fp_orphans = len([r for r in fps if r not in set(selected)])

    # Destination files the allow-list would not select: counted, never touched.
    if dest.is_dir():
        sel = set(selected)
        res.extras = sum(
            1 for p in dest.rglob("*")
            if p.is_file() and not p.name.startswith(".")
            and p.relative_to(dest).as_posix() not in sel)

    # Upload is counted from Drive's stamp on the DESTINATION file, for every
    # selected file that is there and verified -- not from the local copy.
    ok_rels = [r for r in selected
               if res.actions.get(r) in ("same", "new", "changed")
               and (dest / r).is_file() and r not in res.verify_failed]
    res.backed = len(ok_rels)
    pending = [r for r in ok_rels if not ops.stamped(dest / r)]
    deadline = time.monotonic() + (wait if res.copied else 0)
    while pending and time.monotonic() < deadline:
        time.sleep(min(5, max(0.0, deadline - time.monotonic())))
        pending = [r for r in pending if not ops.stamped(dest / r)]
    res.pending = pending
    res.stamped = res.backed - len(pending)
    return res


def mask(path):
    """The Drive account segment is the owner's private identity: never print it."""
    return re.sub(r"GoogleDrive-[^/]+", "GoogleDrive-<account>", str(path))


def report(res, intake, dest, dry, say=print):
    say(f"scope    intake {intake}  ->  {mask(dest)}")
    say("         allow-list: menus/ recipes/ ingredients/raw_food_photos/, "
        "images + PDFs, the .md notes in recipes/, plus the fingerprinted web snapshot(s)")
    say(f"         {'DRY RUN, writes nothing' if dry else 'copy new, verify, count upload'}"
        "; never deletes; health transcripts and food logs are never opened")
    r = res.refused
    say(f"refused  {sum(r.values())} path(s) outside the allow-list, never opened: "
        f"{r['outside']} outside the trees, {r['hidden']} hidden, "
        f"{r['symlink']} symlink, {r['path']} odd path, {r['type']} not evidence "
        f"in a tree" + (" (" + ", ".join(f"{k} x{v}" for k, v in sorted(res.by_type.items())) + ")"
                        if res.by_type else ""))
    say(f"selected {len(res.selected)}: " + ", ".join(
        f"{t} {n}" for t, n in sorted(res.by_tree.items())))
    acts = Counter(res.actions.values())
    verb = "would copy" if dry else "copied"
    n_copy = sum(res.would_copy.values()) if dry else len(res.copied)
    say(f"actions  {verb} {n_copy}"
        + (" (" + ", ".join(f"{t} {n}" for t, n in sorted(res.would_copy.items())) + ")"
           if res.would_copy else "")
        + f"; already identical {acts['same']}")
    fp_total = (len(res.selected) - sum(res.unfingerprinted.values())
                - sum(1 for v in res.actions.values() if v == "fp-mismatch"))
    say(f"fingerprints  {fp_total} selected file(s) carry a committed sha256 and match; "
        f"{sum(res.unfingerprinted.values())} do not yet"
        + (" -- run check_provenance.py --rebuild beside the material" if res.unfingerprinted else "")
        + (f"; {res.fp_orphans} record row(s) name a file not selected here" if res.fp_orphans else ""))
    if res.extras:
        say(f"extra    {res.extras} file(s) in the destination the allow-list would not select "
            "(left alone; nothing is deleted)")
    for rel in [k for k, v in res.actions.items() if v in ("fp-mismatch", "held")]:
        why = ("differs from its committed sha256, NOT copied" if res.actions[rel] == "fp-mismatch"
               else "changed since it was backed up and has no fingerprint, HELD (--accept-changed)")
        say(f"REFUSED  {rel} -- {why}")
    for rel in res.verify_failed:
        say(f"FAILED   {rel} -- the copy did not re-hash equal to its source")
    if dry:
        say(f"upload   {res.stamped} of {res.backed} existing destination file(s) carry Drive's "
            f"{STAMP} stamp ({len(res.pending)} without)")
    else:
        say(f"upload   {res.stamped} of {res.backed} backed-up file(s) carry Drive's {STAMP} "
            f"stamp; {len(res.pending)} pending" + (" -- run again later" if res.pending else ""))
    bad = [v for v in res.actions.values() if v in ("fp-mismatch", "held", "verify-failed")]
    if bad:
        say(f"RESULT   {len(bad)} refusal(s) -- exit 1")
    elif dry:
        say(f"RESULT   dry run: would copy {n_copy}; nothing written")
    elif res.pending:
        say(f"RESULT   verified {res.backed}; {len(res.pending)} not yet uploaded -- exit 3")
    else:
        say(f"RESULT   verified {res.backed} of {len(res.selected)}; all uploaded")
    return bad


def find_dest():
    drives = sorted(Path.home().glob(f"Library/CloudStorage/{DRIVE_GLOB}"))
    if len(drives) != 1:
        return None, (f"{len(drives)} Drive folder(s) under ~/Library/CloudStorage; "
                      "pass --dest explicitly" if drives else
                      "no Drive for desktop folder under ~/Library/CloudStorage; pass --dest")
    return drives[0].joinpath(*DEST_TAIL), None


# --- the self-test ---------------------------------------------------------

def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _build(base):
    """A synthetic intake with every kind of path the allow-list must judge.

    Names and bytes are invented. The 'transcript' and 'food log' files are
    stand-ins for the two classes of health material; their real names appear
    nowhere in this repo.
    """
    intake = base / "intake"
    files = {
        "menus/Cafe A/a1.jpeg": b"menu photo a1",
        "menus/Cafe A/menu.pdf": b"%PDF menu",
        "menus/b.JPG": b"menu photo b",
        "recipes/r1.heic": b"recipe photo",
        "recipes/web/page.html": b"<html>fetched page</html>",
        "recipes/web/other.html": b"<html>some other page</html>",
        "recipes/notes.md": b"a note",
        "menus/notes.md": b"a stray note in another tree",
        "menus/Cafe A/web/menu.html": b"<html>a fetched menu page, fingerprinted</html>",
        "menus/Cafe A/web/other.html": b"<html>a fetched page nobody cited</html>",
        "ingredients/raw_food_photos/1/n.md": b"a note beside the food photos",
        "ingredients/raw_food_photos/1/p1.jpeg": b"raw food photo",
        "ingredients/Transcript_files/t1.jpeg": b"HEALTH transcript asset one",
        "ingredients/Transcript_files/t2.png": b"HEALTH transcript asset two",
        "ingredients/food-log-export.csv": b"HEALTH food log",
        "ingredients/chat-export.json": b"HEALTH chat",
        "menus/.DS_Store": b"junk",
    }
    for rel, data in files.items():
        p = intake / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    os.symlink(intake / "ingredients/Transcript_files/t1.jpeg", intake / "menus/link.jpeg")
    allowed = {"menus/Cafe A/a1.jpeg", "menus/Cafe A/menu.pdf", "menus/b.JPG",
               "recipes/r1.heic", "recipes/web/page.html", "recipes/notes.md",
               "menus/Cafe A/web/menu.html",
               "ingredients/raw_food_photos/1/p1.jpeg"}
    fps = {"menus/Cafe A/a1.jpeg": _sha(files["menus/Cafe A/a1.jpeg"]),
           "recipes/web/page.html": _sha(files["recipes/web/page.html"])}
    fps["menus/Cafe A/web/menu.html"] = _sha(files["menus/Cafe A/web/menu.html"])
    snaps = {"recipes/web/page.html": fps["recipes/web/page.html"],
             "menus/Cafe A/web/menu.html": fps["menus/Cafe A/web/menu.html"]}
    return intake, allowed, fps, snaps


def _dest_files(dest):
    return {p.relative_to(dest).as_posix() for p in dest.rglob("*") if p.is_file()}


def _scenario(ops):
    """Every case, as {name: True|False|None (None = could not run)}."""
    out = {}
    have_xattr = shutil.which("xattr") is not None
    with tempfile.TemporaryDirectory(prefix="faves-backup-selftest-") as t:
        base = Path(t)
        intake, allowed, fps, snaps = _build(base)
        dest = base / "drive"
        dest.mkdir()

        # -- the allow-list, as a pure function over paths ------------------
        def cls(rel, link=False):
            return ops.classify(rel, snaps, link)[0]
        out["classify: a menu photo is accepted"] = cls("menus/Cafe/x.jpeg")
        out["classify: a menu PDF is accepted"] = cls("menus/Cafe/x.pdf")
        out["classify: a recipe HEIC is accepted"] = cls("recipes/Archive/x.heic")
        out["classify: a raw food photo is accepted"] = cls("ingredients/raw_food_photos/1/x.jpeg")
        out["classify: the fingerprinted web snapshot is accepted"] = cls("recipes/web/page.html")
        out["classify: a health-transcript image is refused"] = not cls("ingredients/Transcript_files/t.jpeg")
        out["classify: a health-transcript image is refused even as a PNG"] = not cls("ingredients/Transcript_files/t.png")
        out["classify: a food-log export is refused"] = not cls("ingredients/food-log-export.csv")
        out["classify: a chat export is refused"] = not cls("ingredients/chat-export.json")
        out["classify: an unlisted web page is refused"] = not cls("recipes/web/other.html")
        out["classify: a recipe note in recipes/ is accepted (500/080)"] = cls("recipes/notes.md")
        out["classify: a note outside recipes/ is refused"] = not (
            cls("menus/x.md") or cls("ingredients/raw_food_photos/1/n.md")
            or cls("ingredients/Transcript.md"))
        out["classify: a hidden file is refused"] = not cls("menus/.DS_Store")
        out["classify: a symlink is refused"] = not cls("menus/link.jpeg", link=True)
        out["classify: a path escaping the tree is refused"] = not cls("menus/../ingredients/x.jpeg")
        out["classify: a snapshot named outside the trees is refused"] = not ops.classify(
            "ingredients/Transcript_files/t.html", {"ingredients/Transcript_files/t.html"})[0]

        # -- a first run -----------------------------------------------------
        r1 = run(intake, dest, fps, snaps, ops)
        got = _dest_files(dest)
        out["run: exactly the allowed files are copied"] = got == allowed
        out["run: a menu photo is copied"] = "menus/Cafe A/a1.jpeg" in got
        out["run: no health-transcript image is copied"] = not any("Transcript" in g for g in got)
        out["run: no food-log or chat export is copied"] = not any(
            g.endswith((".csv", ".json")) for g in got)
        out["run: a symlink into a refused tree is not followed"] = "menus/link.jpeg" not in got
        out["run: an unlisted page and a stray note are not copied"] = not (
            got & {"recipes/web/other.html", "menus/notes.md",
                   "ingredients/raw_food_photos/1/n.md"})
        out["run: a recipe note is copied (500/080)"] = "recipes/notes.md" in got
        out["run: a fingerprinted menu page is copied, an uncited one is not"] = (
            "menus/Cafe A/web/menu.html" in got and "menus/Cafe A/web/other.html" not in got)
        out["run: refusals are counted, not named"] = (
            sum(r1.refused.values()) == 10 and r1.refused["outside"] == 4)

        # -- a second run ----------------------------------------------------
        r2 = run(intake, dest, fps, snaps, ops)
        out["rerun: a second run copies nothing"] = not r2.copied and not r2.verify_failed

        # -- a changed file ---------------------------------------------------
        b = intake / "menus/b.JPG"
        b.write_bytes(b"menu photo b, re-saved")
        r3 = run(intake, dest, fps, snaps, ops)
        out["changed: a changed file with no fingerprint is held, not overwritten"] = (
            r3.actions.get("menus/b.JPG") == "held"
            and (dest / "menus/b.JPG").read_bytes() == b"menu photo b")
        r3b = run(intake, dest, fps, snaps, ops, accept_changed=True)
        out["changed: --accept-changed overwrites it and it re-hashes equal"] = (
            "menus/b.JPG" in r3b.copied
            and (dest / "menus/b.JPG").read_bytes() == b"menu photo b, re-saved")

        # -- fingerprints -----------------------------------------------------
        a1 = intake / "menus/Cafe A/a1.jpeg"
        a1.write_bytes(b"SUBSTITUTED bytes under the same name")
        r4 = run(intake, dest, fps, snaps, ops, accept_changed=True)
        out["fingerprint: a source that disagrees with its committed sha256 is not copied"] = (
            r4.actions.get("menus/Cafe A/a1.jpeg") == "fp-mismatch"
            and (dest / "menus/Cafe A/a1.jpeg").read_bytes() == b"menu photo a1")
        a1.write_bytes(b"menu photo a1")
        (dest / "menus/Cafe A/a1.jpeg").write_bytes(b"damaged")
        r5 = run(intake, dest, fps, snaps, ops)
        out["fingerprint: a damaged copy of a fingerprinted file is repaired"] = (
            (dest / "menus/Cafe A/a1.jpeg").read_bytes() == b"menu photo a1"
            and "menus/Cafe A/a1.jpeg" in r5.copied)

        # -- the quick check trusts size + date; --deep reads the bytes
        a1d = dest / "menus/Cafe A/a1.jpeg"
        a1d.write_bytes(b"x" * len(b"menu photo a1"))
        os.utime(a1d, (a1.stat().st_atime, a1.stat().st_mtime))
        run(intake, dest, fps, snaps, ops)
        quick_missed = a1d.read_bytes() != b"menu photo a1"
        r5d = run(intake, dest, fps, snaps, ops, deep=True)
        out["deep: --deep re-hashes the destination and repairs a same-size, same-date copy"] = (
            quick_missed and a1d.read_bytes() == b"menu photo a1"
            and "menus/Cafe A/a1.jpeg" in r5d.copied)

        # -- a copy that goes wrong -------------------------------------------
        new = intake / "ingredients/raw_food_photos/2/p2.jpeg"
        new.parent.mkdir(parents=True)
        new.write_bytes(b"a later raw food photo")

        def bad_copy(src, dst):
            Path(dst).write_bytes(Path(src).read_bytes()[:5])
        bad = SimpleNamespace(**{**vars(ops), "copy": bad_copy})
        r6 = run(intake, dest, fps, snaps, bad)
        out["verify: a copy that does not re-hash equal is caught and removed"] = (
            "ingredients/raw_food_photos/2/p2.jpeg" in r6.verify_failed
            and not (dest / "ingredients/raw_food_photos/2/p2.jpeg").exists())
        run(intake, dest, fps, snaps, ops)   # the honest copy now lands

        # -- upload is the stamp, not the local copy ---------------------------
        if have_xattr:
            r7 = run(intake, dest, fps, snaps, ops)
            out["upload: files on disk but not stamped count as NOT uploaded"] = (
                r7.backed > 0 and r7.stamped == 0 and len(r7.pending) == r7.backed)
            one = dest / "menus/b.JPG"
            subprocess.run(["xattr", "-w", STAMP, "test-id", str(one)], check=True)
            r8 = run(intake, dest, fps, snaps, ops)
            out["upload: a stamped file is counted, and only that one"] = (
                r8.stamped == 1 and len(r8.pending) == r8.backed - 1)
        else:
            out["upload: files on disk but not stamped count as NOT uploaded"] = None
            out["upload: a stamped file is counted, and only that one"] = None

        # -- dry run ------------------------------------------------------------
        empty = base / "drive2"
        empty.mkdir()
        r9 = run(intake, empty, fps, snaps, ops, dry=True)
        out["dry-run: writes nothing"] = not any(empty.rglob("*"))
        out["dry-run: reports what it would copy"] = sum(r9.would_copy.values()) == len(allowed) + 1
    return out


# Each breaker: how it breaks the tool, the cases that MUST then fail (the ones
# it is aimed at), and the cases that may fail as collateral. Any other case
# failing means the breaker did something it did not mean to; a target that
# still passes means the self-test cannot see this fault. Both are failures.
def _breakers():
    allow_all = lambda rel, snaps=frozenset(), link=False: (True, "ok")  # noqa: E731
    refusals = {
        "classify: a health-transcript image is refused",
        "classify: a health-transcript image is refused even as a PNG",
        "classify: a food-log export is refused",
        "classify: a chat export is refused",
        "classify: an unlisted web page is refused",
        "classify: a note outside recipes/ is refused",
        "classify: a hidden file is refused",
        "classify: a symlink is refused",
        "classify: a path escaping the tree is refused",
        "classify: a snapshot named outside the trees is refused",
        "run: no health-transcript image is copied",
        "run: no food-log or chat export is copied",
        "run: a symlink into a refused tree is not followed",
        "run: an unlisted page and a stray note are not copied",
        "run: a fingerprinted menu page is copied, an uncited one is not",
    }
    return [
        ("allow-list disabled (everything selected)",
         {"classify": allow_all}, refusals,
         {"run: exactly the allowed files are copied",
          "run: refusals are counted, not named",
          "changed: a changed file with no fingerprint is held, not overwritten",
          "changed: --accept-changed overwrites it and it re-hashes equal",
          "fingerprint: a source that disagrees with its committed sha256 is not copied",
          "fingerprint: a damaged copy of a fingerprinted file is repaired",
          "dry-run: reports what it would copy"}),
        ("copy verification disabled (always 'equal')",
         {"verify": lambda dst, digest, fp, ops: True},
         {"verify: a copy that does not re-hash equal is caught and removed"}, set()),
        ("fingerprint comparison disabled (always 'matches')",
         {"fp_ok": lambda digest, fp: True},
         {"fingerprint: a source that disagrees with its committed sha256 is not copied"}, set()),
        ("skip-if-present disabled (always 'new')",
         {"state": lambda dst, st, digest, ops, deep=False: "new"},
         {"rerun: a second run copies nothing"},
         {"changed: a changed file with no fingerprint is held, not overwritten",
          "changed: --accept-changed overwrites it and it re-hashes equal",
          "fingerprint: a damaged copy of a fingerprinted file is repaired",
          "deep: --deep re-hashes the destination and repairs a same-size, same-date copy"}),
        ("--deep ignored (destination bytes never re-read)",
         {"state": lambda dst, st, digest, ops, deep=False: _state(dst, st, digest, ops, False)},
         {"deep: --deep re-hashes the destination and repairs a same-size, same-date copy"}, set()),
        ("upload counted from the local copy, not Drive's stamp",
         {"stamped": lambda path: Path(path).is_file()},
         {"upload: files on disk but not stamped count as NOT uploaded"},
         {"upload: a stamped file is counted, and only that one"}),
    ]


def selftest():
    base = _scenario(default_ops())
    ran = {k: v for k, v in base.items() if v is not None}
    skipped = [k for k, v in base.items() if v is None]
    failed = [k for k, v in ran.items() if not v]
    for k, v in base.items():
        print(f"  {'SKIP' if v is None else 'PASS' if v else 'FAIL'}  {k}")
    print(f"  {len(ran) - len(failed)}/{len(ran)} cases pass"
          + (f"; {len(skipped)} not run (no `xattr` on this machine)" if skipped else ""))
    bad = len(failed)

    print("break-probes: each fault is introduced and must be caught")
    for name, patch, targets, collateral in _breakers():
        ops = default_ops()
        for k, v in patch.items():
            setattr(ops, k, v)
        broken = _scenario(ops)
        went_red = {k for k, v in broken.items() if v is False}
        missed = {t for t in targets if broken.get(t) is not False and base.get(t) is not None}
        stray = went_red - targets - collateral
        ok = not missed and not stray
        print(f"  {'CAUGHT' if ok else 'MISSED'}  {name}: {len(went_red & targets)}/{len(targets)} "
              "target case(s) failed" + (f"; collateral {len(went_red & collateral)}" if collateral else ""))
        for t in sorted(missed):
            print(f"        still passed with the fault: {t}")
        for s in sorted(stray):
            print(f"        failed but was not expected to: {s}")
        bad += 0 if ok else 1
    print("selftest: " + ("FAILED" if bad else "ok"))
    return 1 if bad else 0


# --- command line ----------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Back up intake/ evidence originals to the owner's private Drive.",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--intake", default=None,
                    help="the raw material (default: <repo>/intake). Gitignored, so it "
                         "exists only in the primary checkout; point this at it from a worktree.")
    ap.add_argument("--dest", default=None,
                    help="the destination folder (default: the one Drive for desktop "
                         "folder's My Drive/Faves evidence/intake)")
    ap.add_argument("--dry-run", action="store_true", help="say what would be copied; write nothing")
    ap.add_argument("--accept-changed", action="store_true",
                    help="overwrite a destination file whose source changed and has no "
                         "committed fingerprint (a fingerprinted file is repaired without it)")
    ap.add_argument("--deep", action="store_true",
                    help="re-hash every destination file, not only those whose size or date "
                         "disagree. Makes Drive download anything online-only: slow, "
                         "and the audit to run now and then")
    ap.add_argument("--wait", type=int, default=90, metavar="SECONDS",
                    help="after copying, poll this long for Drive to stamp the new files (default 90)")
    ap.add_argument("--selftest", action="store_true", help="prove the allow-list still refuses")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    intake = Path(args.intake) if args.intake else ROOT / "intake"
    if not any(f.suffix.lower() in SUFFIXES for f in intake.rglob("*") if f.is_file()):
        print(f"nothing to back up: no evidence material under {intake}. `intake/` is "
              "gitignored and exists only in the primary checkout; pass --intake.")
        return 2
    if shutil.which("xattr") is None:
        print("cannot count upload: no `xattr` on this machine, and an upload counted "
              "from the local copy would prove nothing.")
        return 2
    if args.dest:
        dest, why = Path(args.dest), None
    else:
        dest, why = find_dest()
    if dest is None or not dest.is_dir():
        print(f"no destination: {why or mask(dest) + ' does not exist'}. "
              "The folder must already exist (340/310 made it); this tool will not "
              "invent a Drive path.")
        return 2
    try:
        dest.resolve().relative_to(intake.resolve())
        print("refusing: the destination is inside intake/.")
        return 2
    except ValueError:
        pass

    # A menus/ file is evidence whatever its suffix once menu-sources.json
    # fingerprints it: that is how a fetched menu page is cited (500/080). Still
    # tree-bounded, because classify() checks the tree before the snapshot set.
    menu_doc = load_record()
    snaps = {**snapshot_paths(_json(RECIPE_RECORD)),
             **{r: h for r, h in fingerprints(menu_doc, {}).items() if r.startswith("menus/")}}
    fps = fingerprints(menu_doc, snaps)
    res = run(intake, dest, fps, snaps, default_ops(), dry=args.dry_run,
              accept_changed=args.accept_changed, wait=args.wait, deep=args.deep)
    bad = report(res, intake, dest, args.dry_run)
    if bad:
        return 1
    if not args.dry_run and res.pending:
        return 3
    return 0


def _json(path):
    import json
    return json.loads(path.read_text()) if path.exists() else {}


if __name__ == "__main__":
    # ROOT, never the working directory: which tree did this read (ADR 0113).
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
