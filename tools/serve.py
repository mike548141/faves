#!/usr/bin/env python3
"""Faves dev server — serve site/ to this laptop and your phone.

    python3 tools/serve.py [port]      # default port 8080

Binds all interfaces so a phone on the same Wi-Fi can load it, prints
both URLs, and disables caching so a reload always shows your latest
edit. Ctrl-C to stop. Stdlib only — no install, no build step.
"""

import http.server
import socket
import socketserver
import sys
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"


def lan_ip():
    """Best-effort primary LAN IP. No packets are actually sent."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # leakscan:allow: Google public DNS, a well-known constant
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"  # leakscan:allow: loopback literal
    finally:
        s.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        # No caching in dev so a reload always shows the latest edit.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    if not SITE.is_dir():
        sys.exit(f"error: {SITE} not found")

    handler = partial(Handler, directory=str(SITE))
    try:
        httpd = Server(("0.0.0.0", port), handler)
    except OSError as e:
        sys.exit(f"error: can't bind port {port} ({e}). Try another: "
                 f"python3 tools/serve.py {port + 1}")

    ip = lan_ip()
    bar = "─" * 46
    print(f"\n  Faves dev server — serving {SITE}")
    print(f"  {bar}")
    print(f"  This laptop : http://localhost:{port}")
    print(f"  Your phone  : http://{ip}:{port}   (same Wi-Fi)")
    print(f"  {bar}")
    print("  Note: the offline/installable PWA only works on localhost or")
    print("  HTTPS, so over Wi-Fi the phone shows the site but not offline")
    print("  mode. macOS may ask to allow incoming connections — say yes.")
    print("  Ctrl-C to stop.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
