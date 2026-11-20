- **2026-07-11 (Fable: Phase 7 deploy — the site is LIVE)**: Repo re-checked
  post-atelier-adoption: verify suite green, pin bumped `1588fda → dfd5aec`
  (new RECORD.md doctrine: public records keep private repos generic — faves'
  docs scanned, compliant). Owner set up the estate credential pattern:
  an account-owned **parent minting token** (Account API Tokens: Edit, in the
  login keychain) from which a **faves-scoped child** was minted in code —
  Pages Edit (account) + DNS Edit + Zone Read (`myspot.nz` only), stored as
  `cloudflare-faves-deploy` in the keychain. `deploy.py plan → apply` created
  the git-connected Pages project and attached the domain; first deployment
  triggered via API, all stages green. Two tool fixes landed along the way:
  plan-mode 404 when the project didn't exist yet, and — bigger — the API
  domain-attach does **not** auto-create the CNAME (the dashboard does; the
  runbook's assumption was wrong live), so `deploy.py` now reconciles the
  proxied CNAME itself and DEPLOY.md was corrected. Also noted there: the
  python.org 3.14 install lacks CA certs, use `/usr/bin/python3`.
  **Live:** <https://faves.pages.dev> (HTTP 200, verified);
  <https://lets-eat.myspot.nz> attached, certificate provisioning pending at
  session close. Estate-wide credential governance (where the registry lives —
  atelier can't hold it, it's public) left as an open owner question.

  **Next session:** confirm `lets-eat.myspot.nz` serves (cert usually minutes),
  re-run Lighthouse against the real URL, then the deferred real-device passes
  (iOS/Android install + flight mode; QR camera scan). The owner also queued:
  GitHub token refresh (current PAT is classic + broad), then AWS/Google/
  TrueNAS credential roots, and publishing Nova + the CEL MTA-STS record with
  tokens minted from the same parent.
