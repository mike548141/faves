#!/usr/bin/env python3
"""Generate the Faves Software Bill of Materials (CycloneDX 1.5 JSON).

Faves' defining property is that the shipped artifact has **no third-party
components** (ADR 0001): no npm packages, no CDN, no framework. This script
makes that claim *checkable* rather than merely stated — it emits an SBOM
whose third-party component list is **empty by construction**, committed to
`site/.well-known/sbom.json` and served from the live site's
`/.well-known/sbom.json`. For a zero-dependency site an SBOM is not
vulnerability management (there's nothing third-party to scan): its value is
attestation + a tripwire. Any future third-party entry shows up as a diff.

The document is **deterministic**: no wall-clock timestamp (git supplies the
provenance date), and the `serialNumber` is derived from the document's own
content, so regenerating an unchanged tree reproduces byte-for-byte. That is
what makes `--check` a reliable CI gate.

    python3 tools/gen_sbom.py            # write site/.well-known/sbom.json
    python3 tools/gen_sbom.py --check    # CI: fail if the committed file is stale

Stdlib only, no build step. Reuses check_no_deps' dependency-key logic so the
SBOM and the guard can never disagree about what "zero dependencies" means.
"""

import json
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SBOM_PATH = ROOT / "site" / ".well-known" / "sbom.json"
PACKAGE_JSON = ROOT / "package.json"

# Same dependency keys check_no_deps.py guards — if any is ever non-empty the
# SBOM would carry those components (and this generator would stop claiming
# zero). They are empty today, by design.
DEP_KEYS = (
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
)

# A stable namespace so the derived serialNumber is reproducible across
# machines (uuid5 is a pure hash of namespace + name).
_NS = uuid.UUID("6ba7b811-9dad-11d1-80b4-00c04fd430c8")  # RFC 4122 URL namespace


def third_party_components():
    """The shipped artifact's third-party components — empty by design.

    We still read package.json (dev-only manifest) so that if a dependency
    ever creeps in, it surfaces here instead of the SBOM silently lying.
    """
    components = []
    try:
        pkg = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return components
    for key in DEP_KEYS:
        deps = pkg.get(key) or {}
        if not isinstance(deps, dict):
            continue
        for name, version in sorted(deps.items()):
            components.append(
                {
                    "type": "library",
                    "bom-ref": f"pkg:npm/{name}@{version}",
                    "name": name,
                    "version": str(version),
                    "purl": f"pkg:npm/{name}@{version}",
                }
            )
    return components


def build_bom():
    """Assemble the CycloneDX document (without its serialNumber)."""
    components = third_party_components()
    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "version": 1,
        "metadata": {
            # No timestamp on purpose: it would break reproducibility and the
            # git commit date is the real provenance record.
            "tools": [
                {
                    "vendor": "Faves",
                    "name": "gen_sbom.py",
                    "version": "1.0.0",
                }
            ],
            "component": {
                "type": "application",
                "bom-ref": "faves",
                "name": "faves",
                "description": (
                    "Faves — a build-less, offline-capable static PWA for "
                    "browsing favourite restaurant menus. Vanilla HTML + CSS "
                    "+ ES-module JavaScript; no bundler, no framework, no CDN."
                ),
                "licenses": [{"license": {"id": "Apache-2.0"}}],
                "externalReferences": [
                    {
                        "type": "vcs",
                        "url": "https://github.com/mike548141/faves",
                    },
                    {
                        "type": "website",
                        "url": "https://lets-eat.myspot.nz",
                    },
                    {
                        "type": "documentation",
                        "url": (
                            "https://github.com/mike548141/faves/blob/main/"
                            "docs/decisions/0001-zero-build-vanilla.md"
                        ),
                    },
                ],
            },
            "properties": [
                # The attestation, made machine-readable. Zero third-party
                # components is the whole point; the guard enforces it in CI.
                {
                    "name": "faves:thirdPartyComponents",
                    "value": str(len(components)),
                },
                {
                    "name": "faves:zeroDependencyGuard",
                    "value": "tools/check_no_deps.py",
                },
            ],
        },
        # Empty by construction: the shipped site/ has no third-party code.
        "components": components,
    }


def serialise(bom):
    """Canonical JSON + a content-derived serialNumber → reproducible bytes."""
    body = json.dumps(bom, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    serial = f"urn:uuid:{uuid.uuid5(_NS, body)}"
    doc = {"serialNumber": serial, **bom}
    return json.dumps(doc, ensure_ascii=False, indent=2) + "\n"


def main(argv):
    check = "--check" in argv[1:]
    rendered = serialise(build_bom())

    if check:
        if not SBOM_PATH.exists():
            print(f"ERROR: {SBOM_PATH.relative_to(ROOT)} is missing — run "
                  "`python3 tools/gen_sbom.py`.", file=sys.stderr)
            return 1
        current = SBOM_PATH.read_text(encoding="utf-8")
        if current != rendered:
            print(f"ERROR: {SBOM_PATH.relative_to(ROOT)} is out of date — run "
                  "`python3 tools/gen_sbom.py` and commit.", file=sys.stderr)
            return 1
        print(f"SBOM up to date ({SBOM_PATH.relative_to(ROOT)}); "
              "zero third-party components.")
        return 0

    SBOM_PATH.parent.mkdir(parents=True, exist_ok=True)
    SBOM_PATH.write_text(rendered, encoding="utf-8")
    print(f"Wrote {SBOM_PATH.relative_to(ROOT)} "
          f"({len(build_bom()['components'])} third-party component(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
