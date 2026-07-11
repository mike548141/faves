#!/usr/bin/env python3
"""Provision Faves hosting on Cloudflare Pages — config as code.

The whole hosting setup (Pages project, build config, custom domain)
lives in tools/deploy.json and is reconciled by this script against the
Cloudflare REST API. Idempotent: run it as often as you like; it creates
what's missing and leaves the rest alone. Same spirit as tiki over the
MikroTik API — declare desired state, apply, repeat.

    export CLOUDFLARE_API_TOKEN=...        # scoped token, see docs/DEPLOY.md
    python3 tools/deploy.py plan           # show desired vs actual, change nothing
    python3 tools/deploy.py apply          # make it so

Stdlib only — no install, no build step. The token is read from the
environment and is NEVER written to the repo.

Not automated (one-time, browser-only): authorising Cloudflare's GitHub
App on the repo. See docs/DEPLOY.md. Everything else is here.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = Path(__file__).resolve().parent / "deploy.json"
API = "https://api.cloudflare.com/client/v4"


class CFError(Exception):
    pass


def token():
    t = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not t:
        sys.exit(
            "CLOUDFLARE_API_TOKEN is not set.\n"
            "Create a scoped token (see docs/DEPLOY.md) and:\n"
            "    export CLOUDFLARE_API_TOKEN=..."
        )
    return t


def cf(method, path, body=None):
    """One Cloudflare API call. Returns the `result` object on success."""
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token()}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            payload = json.load(r)
    except urllib.error.HTTPError as e:
        payload = json.load(e)
        if not payload.get("success", False):
            errs = "; ".join(
                f"[{m.get('code')}] {m.get('message')}"
                for m in payload.get("errors", [])
            )
            raise CFError(f"{method} {path} -> {e.code}: {errs or e.reason}")
        # some 4xx still carry a usable result (e.g. 409 already-exists)
    if not payload.get("success", False):
        errs = "; ".join(
            f"[{m.get('code')}] {m.get('message')}" for m in payload.get("errors", [])
        )
        raise CFError(f"{method} {path}: {errs}")
    return payload.get("result")


def load_config():
    if not CONFIG.exists():
        sys.exit(f"Missing config: {CONFIG}")
    cfg = json.loads(CONFIG.read_text())
    for key in ("pages_project", "production_branch", "github", "build"):
        if key not in cfg:
            sys.exit(f"deploy.json is missing required key: {key}")
    return cfg


def resolve_account_id(cfg):
    """Use the configured id, else auto-pick if the token sees exactly one."""
    if cfg.get("account_id"):
        return cfg["account_id"]
    accounts = cf("GET", "/accounts?per_page=50") or []
    want = cfg.get("account_name")
    if want:
        for a in accounts:
            if a["name"] == want:
                return a["id"]
        sys.exit(f"No account named {want!r} visible to this token.")
    if len(accounts) == 1:
        return accounts[0]["id"]
    names = ", ".join(f"{a['name']} ({a['id']})" for a in accounts)
    sys.exit(
        "This token can see multiple accounts; set account_id in deploy.json.\n"
        f"  Visible: {names}"
    )


def get_project(acct, name):
    try:
        return cf("GET", f"/accounts/{acct}/pages/projects/{name}")
    except CFError as e:
        if "8000007" in str(e) or "not found" in str(e).lower() or "404" in str(e):
            return None
        raise


def desired_source(cfg):
    gh = cfg["github"]
    return {
        "type": "github",
        "config": {
            "owner": gh["owner"],
            "repo_name": gh["repo"],
            "production_branch": cfg["production_branch"],
            "pr_comments_enabled": True,
            "deployments_enabled": True,
            "production_deployment_enabled": True,
            "preview_deployment_setting": "all",
        },
    }


def desired_build(cfg):
    b = cfg["build"]
    return {
        "build_command": b.get("build_command", ""),
        "destination_dir": b.get("destination_dir", "site"),
        "root_dir": b.get("root_dir", ""),
    }


def ensure_project(acct, cfg, apply):
    name = cfg["pages_project"]
    existing = get_project(acct, name)
    if existing is None:
        print(f"  project {name!r}: MISSING -> will create (git-connected)")
        if not apply:
            return None
        try:
            proj = cf(
                "POST",
                f"/accounts/{acct}/pages/projects",
                {
                    "name": name,
                    "production_branch": cfg["production_branch"],
                    "source": desired_source(cfg),
                    "build_config": desired_build(cfg),
                },
            )
            print(f"    created; deploys from github/{cfg['github']['owner']}/"
                  f"{cfg['github']['repo']}@{cfg['production_branch']}")
            print(f"    default URL: https://{proj.get('subdomain')}")
            return proj
        except CFError as e:
            if "github" in str(e).lower() or "connect" in str(e).lower():
                sys.exit(
                    "Cloudflare can't reach the GitHub repo — the GitHub App "
                    "isn't authorised yet.\n"
                    "Do the one-time connect step in docs/DEPLOY.md, then "
                    "re-run `python3 tools/deploy.py apply`."
                )
            raise
    print(f"  project {name!r}: exists  (url https://{existing.get('subdomain')})")
    # Reconcile build config if it drifted.
    want, have = desired_build(cfg), existing.get("build_config") or {}
    drift = {k: v for k, v in want.items() if have.get(k) != v}
    if drift:
        print(f"    build config drift: {drift} -> will patch")
        if apply:
            cf("PATCH", f"/accounts/{acct}/pages/projects/{name}",
               {"build_config": want})
            print("    patched")
    return existing


def ensure_domains(acct, cfg, apply, project):
    name = cfg["pages_project"]
    want = cfg.get("custom_domains", [])
    if not want:
        return
    if project is None:
        # Plan mode with the project not yet created: the domains endpoint
        # would 404. Nothing exists, so everything is an attach.
        for domain in want:
            print(f"  domain {domain}: MISSING -> will attach after "
                  "project creation")
        return
    have = {d["name"] for d in (cf(
        "GET", f"/accounts/{acct}/pages/projects/{name}/domains") or [])}
    for domain in want:
        if domain in have:
            print(f"  domain {domain}: attached")
            continue
        print(f"  domain {domain}: MISSING -> will attach "
              "(Cloudflare auto-creates the proxied CNAME)")
        if apply:
            cf("POST", f"/accounts/{acct}/pages/projects/{name}/domains",
               {"name": domain})
            print("    attached; certificate provisions in the background")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if cmd not in ("plan", "apply"):
        sys.exit(f"usage: python3 tools/deploy.py [plan|apply]")
    apply = cmd == "apply"
    cfg = load_config()
    acct = resolve_account_id(cfg)
    print(f"account: {acct}   mode: {cmd.upper()}")
    project = ensure_project(acct, cfg, apply)
    ensure_domains(acct, cfg, apply, project)
    if not apply:
        print("\nplan only — nothing changed. Run `apply` to make it so.")
    else:
        print("\napplied. First deploy runs on the next push to "
              f"{cfg['production_branch']} (or trigger one in the dashboard).")


if __name__ == "__main__":
    try:
        main()
    except CFError as e:
        sys.exit(f"Cloudflare API error: {e}")
