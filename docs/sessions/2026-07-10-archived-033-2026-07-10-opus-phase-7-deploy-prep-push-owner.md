- **2026-07-10 (Opus: Phase 7 deploy — prep + push; owner steps remain)**:
  Owner chose to deploy to **Cloudflare Pages at `lets-eat.myspot.nz`**. Found
  the hosting was already config-as-code from 2026-07-07 (`tools/deploy.json`,
  `tools/deploy.py` reconciling the CF API, `docs/DEPLOY.md` runbook) and the
  OG/canonical URLs already baked for that host — so no app changes needed.
  Pushed `main` (28 commits, incl. all of Theme 1b) to GitHub
  `mike548141/faves` so Pages has a source to build; safe because the project
  isn't connected yet (no auto-deploy fires). Added a **Deploy** section to the
  README (live URL + everyday `git push` flow) and pointed the doc index at
  DEPLOY.md; annotated WORKPLAN Phase 7 with what's ready vs owner-blocked.

  **Blocked on the owner (browser/token, genuinely not scriptable):** authorise
  the Cloudflare GitHub App on the repo; create a scoped API token
  (`Account·Pages Edit`, `Zone·DNS Edit`, `Zone·Zone Read`, restricted to
  `myspot.nz`) → `export CLOUDFLARE_API_TOKEN=…`; then `python3 tools/deploy.py
  apply` creates the git-connected project and attaches the domain. After that
  every push to `main` deploys. `CLOUDFLARE_API_TOKEN` is not in this shell's
  env, so I couldn't even run `deploy.py plan` — it's the owner's to run.

  **Next session:** once the owner has run `apply`, confirm the live site
  (`https://lets-eat.myspot.nz` + `faves.pages.dev`), re-check Lighthouse on the
  real URL (localhost had no Brotli/HTTP-2, so scores can only improve), and do
  the deferred real-device passes (iOS/Android install + flight-mode; QR
  phone-camera scan). Then the app is genuinely shipped.
