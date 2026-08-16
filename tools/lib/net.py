"""Shared networking bits for the authoring-time tools.

Nothing here ships. The site never makes a third-party request (ADR 0001) —
these are for the tools that go and *fetch* data a human then commits:
`audit_coords.py` (OpenStreetMap) and `fetch_fx.py` (exchange rates).
"""

import ssl
from pathlib import Path

# Bundles shipped by the OS, in the order worth trying. macOS puts its
# consolidated PEM at the first path; Debian/Ubuntu at the second.
OS_CA_BUNDLES = ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt")


def build_ssl_context():
    """A fully verifying context, working around an empty Python trust store.

    A python.org build on macOS ships no CA bundle until someone runs its
    `Install Certificates.command`, so every HTTPS call dies with
    CERTIFICATE_VERIFY_FAILED. Rather than make the tool unusable there — or,
    far worse, disable verification — fall back to the OS bundle that macOS
    and most Linux distros already ship. Verification stays fully on; only
    the source of the trusted roots changes.
    """
    context = ssl.create_default_context()
    if context.cert_store_stats()["x509_ca"]:
        return context
    for bundle in OS_CA_BUNDLES:
        if Path(bundle).exists():
            context.load_verify_locations(cafile=bundle)
            return context
    return context
