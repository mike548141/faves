#!/usr/bin/env python3
"""Validate the ownership record in `data/`, and report common ownership.

WHY THIS EXISTS. The owner ruled (2026-08-16, ADR 0046) that ownership and
contact details may be held in this repo — bounded by **provenance**: only what
is in the public domain, or what was purposely given to us for use in Faves.
This repo is public, and a push is publication. So the bound cannot be a
paragraph someone remembers: a permission whose limit is only written down is
not a limit. This tool is the limit. A record that cannot say where it came
from is an **error**, not a warning, and CI fails on it.

It also refuses the fields the ruling did not authorise. The owner named name,
email and phone, for contacting a person or organisation — so a person record
carrying a home address, a date of birth, or anything health-shaped is rejected
even if its provenance is impeccable. Provenance says we *may* hold a fact;
the field list says *which* facts. Both have to pass.

    python3 tools/registry.py              # validate; exit 1 on any error
    python3 tools/registry.py --common     # who holds more than one venue
    python3 tools/registry.py --selftest   # the checker's own unit checks

Stdlib only, no build step, and nothing here is ever served: `data/` sits
outside `site/`, so the service worker cannot reach it (ADR 0045).
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
INDEX = ROOT / "site" / "data" / "index.json"

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Closed sets. Extend HERE with a meaning, never ad hoc at a call site — the
# same discipline the menu tag vocabulary uses.
SOURCE_KINDS = {
    "public-record": "published by an authoritative public register",
    "given": "the person or organisation gave it to us for use in Faves",
}
ENTITY_KINDS = {"company", "trust", "partnership", "sole-trader", "other"}
ROLES = {"operator", "owner", "director", "shareholder", "trustee", "partner"}
CONTACT_TYPES = {"email", "phone"}

# Fields the ruling did not authorise. Matched case-insensitively against key
# names anywhere in a person record, because the harm does not depend on where
# in the tree someone nests it.
BARRED_KEYS = {
    "address", "streetaddress", "homeaddress", "residentialaddress",
    "dob", "dateofbirth", "birthdate", "born",
    "health", "medical", "condition", "nhi",
}


def err(errors, where, msg):
    errors.append(f"{where}: {msg}")


def check_source(src, where, errors):
    """Every held fact says how we came by it. This is the whole ruling."""
    if not isinstance(src, dict):
        err(errors, where, "missing `source` — a record that cannot say where "
                           "it came from is not one we may hold (ADR 0046)")
        return
    kind = src.get("kind")
    if kind not in SOURCE_KINDS:
        err(errors, where, f"source.kind {kind!r} is not one of "
                           f"{sorted(SOURCE_KINDS)}")
    ref = src.get("ref")
    if not isinstance(ref, str) or not ref.strip():
        err(errors, where, "source.ref must say specifically enough where the "
                           "fact came from that a later session can re-check it")
    rec = src.get("recorded")
    if not isinstance(rec, str) or not ISO_DATE.match(rec):
        err(errors, where, "source.recorded must be an ISO-8601 date")


def walk_keys(obj, path=""):
    """Yield (dotted-path, key) for every key anywhere in the record."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield (f"{path}.{k}" if path else k), k
            yield from walk_keys(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_keys(v, f"{path}[{i}]")


def check_contacts(rec, where, errors):
    contacts = rec.get("contact", [])
    if contacts in (None, []):
        return
    if not isinstance(contacts, list):
        err(errors, where, "`contact` must be a list")
        return
    for i, c in enumerate(contacts):
        at = f"{where} contact[{i}]"
        if not isinstance(c, dict):
            err(errors, at, "must be an object")
            continue
        if c.get("type") not in CONTACT_TYPES:
            err(errors, at, f"type {c.get('type')!r} not in "
                            f"{sorted(CONTACT_TYPES)} — the ruling named email "
                            f"and phone")
        if not isinstance(c.get("value"), str) or not c["value"].strip():
            err(errors, at, "`value` must be a non-empty string")
        # Each detail carries its own provenance: an owner may give us a phone
        # number while the company name came off a public register.
        check_source(c.get("source"), at, errors)


def load_records(kind, errors):
    out = {}
    d = DATA / kind
    if not d.is_dir():
        return out
    for f in sorted(d.glob("*.json")):
        where = f"data/{kind}/{f.name}"
        try:
            rec = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            err(errors, where, f"invalid JSON — {e}")
            continue
        if not isinstance(rec, dict):
            err(errors, where, "top level must be an object")
            continue
        if rec.get("id") != f.stem:
            err(errors, where, f"id {rec.get('id')!r} must match the filename")
        if not isinstance(rec.get("name"), str) or not rec["name"].strip():
            err(errors, where, "`name` is required")
        check_source(rec.get("source"), where, errors)
        check_contacts(rec, where, errors)
        out[f.stem] = (rec, where)
    return out


def validate(errors):
    entities = load_records("entities", errors)
    people = load_records("people", errors)

    for eid, (rec, where) in entities.items():
        if rec.get("kind") not in ENTITY_KINDS:
            err(errors, where, f"kind {rec.get('kind')!r} not in "
                               f"{sorted(ENTITY_KINDS)}")

    # People carry the tightest field list, because they are the only records
    # about a natural person on a public site.
    for pid, (rec, where) in people.items():
        for dotted, key in walk_keys(rec):
            if key.lower().replace("_", "").replace("-", "") in BARRED_KEYS:
                err(errors, where, f"`{dotted}` is outside the ruling — it "
                                   f"named name, email and phone. A person's "
                                   f"home address, date of birth and health "
                                   f"detail are excluded (ADR 0046)")

    venues = set()
    if INDEX.is_file():
        try:
            idx = json.loads(INDEX.read_text())
            venues = {r["id"] if isinstance(r, dict) else r
                      for r in (idx.get("restaurants", idx)
                                if isinstance(idx, dict) else idx)}
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            err(errors, "site/data/index.json", f"unreadable — {e}")

    edges = []
    ef = DATA / "ownership.json"
    if ef.is_file():
        try:
            doc = json.loads(ef.read_text())
            edges = doc.get("edges", []) if isinstance(doc, dict) else []
        except json.JSONDecodeError as e:
            err(errors, "data/ownership.json", f"invalid JSON — {e}")

    def resolve(ref, at, errors):
        """`entity:<id>` / `person:<id>` / `venue:<id>` — and it must exist."""
        if not isinstance(ref, str) or ":" not in ref:
            err(errors, at, f"{ref!r} must read `entity:<id>`, `person:<id>` "
                            f"or `venue:<id>`")
            return None
        ns, _, ident = ref.partition(":")
        table = {"entity": entities, "person": people}.get(ns)
        if ns == "venue":
            # The link is one-way and read from this side: a dangling venue id
            # means the record has rotted away from the payload.
            if venues and ident not in venues:
                err(errors, at, f"venue {ident!r} is not in site/data/index.json")
        elif table is None:
            err(errors, at, f"unknown namespace {ns!r} in {ref!r}")
            return None
        elif ident not in table:
            err(errors, at, f"no data/{ns.rstrip('y')}ies record for {ident!r}"
                            if ns == "entity" else
                            f"no data/people record for {ident!r}")
        return (ns, ident)

    for i, e in enumerate(edges):
        at = f"data/ownership.json edges[{i}]"
        if not isinstance(e, dict):
            err(errors, at, "must be an object")
            continue
        resolve(e.get("holder"), at + " holder", errors)
        target = resolve(e.get("holds"), at + " holds", errors)
        if e.get("role") not in ROLES:
            err(errors, at, f"role {e.get('role')!r} not in {sorted(ROLES)}")
        for field in ("from", "to"):
            v = e.get(field)
            if v is not None and not (isinstance(v, str) and ISO_DATE.match(v)):
                err(errors, at, f"`{field}` must be an ISO-8601 date or null")
        check_source(e.get("source"), at, errors)
        if target and target[0] == "person":
            err(errors, at, "a person cannot be *held* — edges point at an "
                            "entity or a venue")

    # The store's boundary, asserted rather than trusted: nothing under site/
    # may reference it, or the payload would start fetching the record.
    site = ROOT / "site"
    for f in list(site.rglob("*.js")) + list(site.rglob("*.html")):
        text = f.read_text(errors="ignore")
        if re.search(r"""["'`][^"'`]*\.\./data/|["'`]/?data/(entities|people|history)/""", text):
            err(errors, str(f.relative_to(ROOT)),
                "references the research store — `data/` is never served "
                "and must never be fetched by the app (ADR 0045)")

    return entities, people, edges


def common_ownership(entities, people, edges):
    """Who ends up holding more than one venue, following chains.

    A holding company that owns four venues is one record here, so the
    interesting answer is transitive: a person who holds a company that holds
    three venues holds three venues.
    """
    direct = {}
    for e in edges:
        if not isinstance(e, dict) or e.get("to") is not None:
            continue  # a lapsed holding is history, not current ownership
        h, holds = e.get("holder"), e.get("holds")
        if isinstance(h, str) and isinstance(holds, str):
            direct.setdefault(h, set()).add(holds)

    def venues_of(ref, seen):
        if ref in seen:
            return set()          # cycles happen in real group structures
        seen = seen | {ref}
        out = set()
        for held in direct.get(ref, ()):
            if held.startswith("venue:"):
                out.add(held.split(":", 1)[1])
            else:
                out |= venues_of(held, seen)
        return out

    rows = []
    for holder in direct:
        vs = venues_of(holder, set())
        if len(vs) > 1:
            ns, ident = holder.split(":", 1)
            table = {"entity": entities, "person": people}.get(ns, {})
            name = table.get(ident, ({}, ""))[0].get("name", ident)
            rows.append((len(vs), name, holder, sorted(vs)))
    rows.sort(key=lambda r: (-r[0], r[1]))
    return rows


def selftest():
    """Unit-check the parts with logic in them, on synthetic input."""
    fails = []

    def check(name, cond):
        if not cond:
            fails.append(name)

    e = []
    check_source({"kind": "given", "ref": "x", "recorded": "2026-08-16"}, "t", e)
    check("a complete source passes", not e)
    e = []
    check_source({"kind": "scraped", "ref": "x", "recorded": "2026-08-16"}, "t", e)
    check("an unlisted source kind fails", len(e) == 1)
    e = []
    check_source(None, "t", e)
    check("a missing source fails", len(e) == 1)
    e = []
    check_source({"kind": "given", "ref": "  ", "recorded": "2026-08-16"}, "t", e)
    check("a blank ref fails", len(e) == 1)
    e = []
    check_source({"kind": "given", "ref": "x", "recorded": "16 Aug"}, "t", e)
    check("a non-ISO recorded date fails", len(e) == 1)

    keys = {k for _, k in walk_keys({"a": {"b": [{"dateOfBirth": 1}]}})}
    check("walk_keys reaches inside lists", "dateOfBirth" in keys)

    ents = {"h": ({"name": "H"}, "")}
    edges = [
        {"holder": "entity:h", "holds": "venue:a", "to": None},
        {"holder": "entity:h", "holds": "venue:b", "to": None},
    ]
    rows = common_ownership(ents, {}, edges)
    check("two venues under one holder is reported", rows and rows[0][0] == 2)

    edges.append({"holder": "entity:h", "holds": "venue:c", "to": "2020-01-01"})
    rows = common_ownership(ents, {}, edges)
    check("a lapsed holding is not current ownership", rows[0][0] == 2)

    chain = [
        {"holder": "person:p", "holds": "entity:h", "to": None},
        {"holder": "entity:h", "holds": "venue:a", "to": None},
        {"holder": "entity:h", "holds": "venue:b", "to": None},
    ]
    rows = common_ownership(ents, {"p": ({"name": "P"}, "")}, chain)
    check("ownership follows through a company", any(r[0] == 2 for r in rows))

    cyc = [
        {"holder": "entity:h", "holds": "entity:i", "to": None},
        {"holder": "entity:i", "holds": "entity:h", "to": None},
    ]
    common_ownership(ents, {}, cyc)  # must simply not hang or recurse forever
    check("a cycle terminates", True)

    for f in fails:
        print(f"  ✗ {f}")
    print(f"{'✓' if not fails else '✗'} registry selftest: "
          f"{9 - len(fails)}/9 checks passed")
    return 1 if fails else 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--common", action="store_true",
                   help="report holders of more than one venue")
    p.add_argument("--selftest", action="store_true",
                   help="run the checker's own unit checks")
    args = p.parse_args(argv)

    if args.selftest:
        return selftest()

    errors = []
    entities, people, edges = validate(errors)

    if errors:
        print(f"✗ registry: {len(errors)} error(s).")
        for e in errors:
            print(f"  {e}")
        print("\nEvery held fact needs a `source` (public-record or given) — "
              "ADR 0046. A record that cannot say where it came from is one "
              "we may not hold.")
        return 1

    n = len(entities) + len(people)
    print(f"✓ registry clean — {len(entities)} entit"
          f"{'y' if len(entities) == 1 else 'ies'}, {len(people)} "
          f"person record(s), {len(edges)} ownership edge(s); every held fact "
          f"carries its provenance.")
    if n == 0 and not edges:
        print("  (the store is empty — ownership facts are research, and none "
              "have been gathered yet)")

    if args.common:
        rows = common_ownership(entities, people, edges)
        if not rows:
            print("\nNo holder is recorded against more than one venue.")
        else:
            print(f"\nCommon ownership — {len(rows)} holder(s):")
            for count, name, ref, venues in rows:
                print(f"  {name} ({ref}) — {count} venues")
                for v in venues:
                    print(f"      {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
