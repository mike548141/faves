# 0004 — Cloudflare Pages at a subdomain

**Status**: accepted • **Date**: 2026-07-08 (backfilled; decided 2026-07-07)

## Context

The site needs HTTPS (a hard requirement — service workers only register
on secure origins), a custom domain, and as little operational surface as
possible. The existing estate already runs Cloudflare (DNS, tunnels) and
AWS. The `myspot.nz` zone is on Cloudflare.

## Decision

Host on **Cloudflare Pages**, git-connected to this repo (build command
none, output dir `site/`), served at **`lets-eat.myspot.nz`**. Hosting is
provisioned as code: `tools/deploy.json` declares the project + custom
domain, `tools/deploy.py` reconciles it idempotently against the
Cloudflare API (stdlib only). Push to `main` → deployed; every branch
gets a free preview URL.

## Rejected

- **AWS S3 + CloudFront:** more assembly for the same result — no repo
  integration (deploy is a manual `aws s3 sync`), HTTPS and custom domain
  need CloudFront in front, and a bare S3 website endpoint is HTTP-only
  (so it can't host a PWA) and serves no HTTP/2. Only worth it if there
  were a reason to keep the artefact in AWS; there isn't.
- **A path prefix (`myspot.nz/lets-eat`):** a Pages project maps to a
  whole hostname and serves at its root. A path would force either a
  repo restructure under a `lets-eat/` folder (breaks the zero-build
  rule and `serve.py`) or a Worker router in front — moving parts for no
  benefit. A subdomain needs neither; the app is already origin-portable
  (relative paths, `./`-scoped manifest).

## Consequences

`git push` is the deploy action, which is *why* the "commit as you work"
convention matters here. Certificate + CNAME are auto-provisioned because
the zone is in the same account; the `*.pages.dev` URL works immediately
meanwhile. The apex `myspot.nz` stays free to become a hub later. Full
runbook: `docs/DEPLOY.md`.
