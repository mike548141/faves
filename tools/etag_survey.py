#!/usr/bin/env python3
"""Does Cloudflare Pages' ETag track a file's BYTES? Measured across real deploys.

    python3 tools/etag_survey.py https://lets-eat.myspot.nz https://<hash>.faves.pages.dev …

WHY THIS EXISTS (roadmap 510/270, ADR 0150). An update install fetches the
shell with `cache: "no-cache"`: a conditional request, and the phone keeps the
copy it already holds when the server answers 304. That is exactly as safe as
the server's validator. If Pages ever answered 304 for bytes that had changed,
the phone would build its new shell cache from the previous deploy — the
2026-08-16 incident (ADR 0056) by a different door. So the owner's gate was:
show it against REAL deploys first. This is that measurement, kept runnable,
because a deploy is the only place the answer lives.

WHAT IT DOES. For every base URL (a production hostname or a Pages deployment's
own `<hash>.faves.pages.dev` URL, which never changes after the deploy), GET
every path in site/sw.js's SHELL plus `sw.js` itself, uncompressed, following
Pages' 308s, and record the ETag and a SHA-256 of the body. Then, per path,
across every pair of deploys:

    same bytes, same ETag    the saving: a 304 is possible
    diff bytes, diff ETag    the safety: the new bytes are sent
    same bytes, diff ETag    SAFE but no saving (a per-deploy ETag)
    diff bytes, SAME ETag    🛑 UNSAFE — a 304 would keep the old bytes

and one stricter test across all of them at once: no (path, ETag) may ever name
two different bodies. It also sends each file's own ETag back as
`If-None-Match` and expects a 304, because a validator the server never
honours saves nothing.

Exit 0 = no contradiction. 1 = an unsafe pair, an ETag naming two bodies, or a
conditional request not answered 304. 2 = a base URL could not be read.
"Same bytes, different ETag" is reported, never a failure: it costs the saving,
not the safety.

🚩 WHAT IT CANNOT SHOW. It reads what each deploy serves NOW. It cannot see a
deploy mid-rollout, or an edge that serves one deploy's ETag over another's
bytes for a moment; `reload` would be fooled by such an edge too (ADR 0149).
And a file with NO ETag (Pages sends none on HTML) is simply re-sent whole
under `no-cache` — safe, and counted separately.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / "site" / "sw.js"
UA = "faves-etag-survey (+https://github.com/mike548141/faves)"


def tls_context() -> ssl.SSLContext:
    """Verified TLS everywhere. python.org's macOS build ships with NO trusted
    roots until its `Install Certificates` step is run, and fails every https
    URL; the OS bundle is the same trust the system's own curl uses. Never an
    unverified context — this tool's whole output is a claim about what a
    real server sent."""
    ctx = ssl.create_default_context()
    if not ctx.cert_store_stats()["x509_ca"] and Path("/etc/ssl/cert.pem").exists():
        ctx.load_verify_locations("/etc/ssl/cert.pem")
    return ctx


TLS = tls_context()


def shell_paths() -> list[str]:
    src = SW.read_text(encoding="utf-8")
    m = re.search(r"^const SHELL = \[(.*?)^\];", src, re.S | re.M)
    if not m:
        raise SystemExit("site/sw.js has no `const SHELL = [ … ];` — update this tool")
    paths = re.findall(r'"([^"]+)"', m.group(1))
    return paths + ["sw.js"]


def url_for(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + ("" if path == "./" else path.removeprefix("./"))


def get(url: str, etag: str | None = None) -> tuple[int, dict, bytes]:
    headers = {"User-Agent": UA, "Accept-Encoding": "identity"}
    if etag:
        headers["If-None-Match"] = etag
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30, context=TLS) as res:
            return res.status, {k.lower(): v for k, v in res.headers.items()}, res.read()
    except urllib.error.HTTPError as err:  # 304 arrives here
        return err.code, {k.lower(): v for k, v in err.headers.items()}, b""


def bare(etag: str) -> str:
    """The comparable part: `W/` (Pages marks a compressed variant weak) and
    quotes removed. If-None-Match uses the weak comparison, so this is the
    comparison the server itself makes."""
    return etag.removeprefix("W/").strip('"')


def survey(base: str, paths: list[str]) -> dict:
    rows = {}
    for p in paths:
        status, h, body = get(url_for(base, p))
        etag = h.get("etag", "")
        row = {
            "status": status,
            "etag": etag,
            "sha": hashlib.sha256(body).hexdigest(),
            "bytes": len(body),
            "type": h.get("content-type", ""),
            "cc": h.get("cache-control", ""),
            "revalidated": None,
        }
        if etag:
            row["revalidated"] = get(url_for(base, p), etag)[0]
        rows[p] = row
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("bases", nargs="+", help="deploy base URLs (two or more to compare)")
    args = ap.parse_args()
    paths = shell_paths()
    data = {}
    for base in args.bases:
        try:
            data[base] = survey(base, paths)
        except (urllib.error.URLError, TimeoutError) as err:
            print(f"✗ {base}: {err}")
            return 2
        rows = data[base].values()
        tagged = [r for r in rows if r["etag"]]
        r304 = sum(1 for r in tagged if r["revalidated"] == 304)
        cc = sorted({r["cc"] for r in rows if r["cc"]})
        print(f"{base}\n  {len(paths)} paths · {len(tagged)} with an ETag · "
              f"own ETag sent back → 304 on {r304} of {len(tagged)}\n  cache-control seen: {cc}")

    bad = []
    for base, rows in data.items():
        for p, r in rows.items():
            if r["etag"] and r["revalidated"] != 304:
                bad.append(f"{base} {p}: its own ETag was answered {r['revalidated']}, not 304")

    print("\n  pair (per path)                      same/same  diff/diff  same/DIFF  diff/SAME  no ETag")
    total = [0, 0, 0, 0, 0]
    for a, b in itertools.combinations(args.bases, 2):
        c = [0, 0, 0, 0, 0]
        for p in paths:
            ra, rb = data[a][p], data[b][p]
            if not ra["etag"] or not rb["etag"]:
                c[4] += 1
                continue
            same_bytes = ra["sha"] == rb["sha"]
            same_tag = bare(ra["etag"]) == bare(rb["etag"])
            if same_bytes and same_tag:
                c[0] += 1
            elif not same_bytes and not same_tag:
                c[1] += 1
            elif same_bytes:
                c[2] += 1
            else:
                c[3] += 1
                bad.append(f"{p}: DIFFERENT bytes, SAME ETag {ra['etag']} on {a} and {b}")
        total = [x + y for x, y in zip(total, c)]
        short = lambda u: re.sub(r"^https?://", "", u)[:17]
        print(f"  {short(a):17} vs {short(b):17}  " + "".join(f"{n:>10}" for n in c[:4]) + f"{c[4]:>9}")
    if len(args.bases) > 1:
        print(f"  {'TOTAL':38} " + "".join(f"{n:>10}" for n in total[:4]) + f"{total[4]:>9}")

    names = {}
    for rows in data.values():
        for p, r in rows.items():
            if r["etag"]:
                names.setdefault((p, bare(r["etag"])), set()).add(r["sha"])
    for (p, tag), shas in names.items():
        if len(shas) > 1:
            bad.append(f"{p}: ETag {tag} names {len(shas)} different bodies")

    print()
    if bad:
        for line in bad:
            print(f"✗ {line}")
        return 1
    if total[2]:
        print(f"⚠ {total[2]} same-bytes pair(s) carried different ETags — safe, but those files "
              "re-download on an update install")
    print(f"✓ the ETag tracks the bytes on every deploy read: {len(names)} distinct (path, ETag) "
          "pairs, none naming two bodies; no changed file kept its ETag")
    return 0


if __name__ == "__main__":
    # Which tree's SHELL list was read (ADR 0113). Not a gate: it reads the
    # network, so it is on no verify list and in no CI job.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce

    announce(ROOT)
    sys.exit(main())
