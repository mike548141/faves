# Deploying Faves

Hosting is **Cloudflare Pages**, git-connected to this repo. Config is
code: [`tools/deploy.json`](../tools/deploy.json) declares the desired
state, [`tools/deploy.py`](../tools/deploy.py) reconciles it against the
Cloudflare API. Idempotent — safe to run repeatedly.

Live URL: **https://lets-eat.myspot.nz**
Default URL: `https://faves.pages.dev` (always works, no DNS needed)

## Why a subdomain, not `myspot.nz/lets-eat`

A Pages project maps to a whole hostname and serves at its root. Serving
at a *path* would mean either restructuring the repo under a `lets-eat/`
folder (breaks the zero-build-step rule and `serve.py`) or fronting it
with a Worker router. A subdomain needs neither — the app already uses
relative paths and a `./`-scoped manifest, so it is origin-portable.
The `myspot.nz` apex stays free to become a hub later.

## One-time setup

### 1. Authorise Cloudflare on GitHub (browser, ~2 min — not scriptable)

OAuth grants can't be automated. Once only:

1. Cloudflare dashboard -> **Workers & Pages -> Create** (the button may
   read **Create application**) -> the **Pages** tab -> **Import an
   existing Git repository** / **Connect to Git**. (The UI wording shifts
   between revisions; the goal is the "connect a Git repo" flow.)
2. Authorise the Cloudflare GitHub App and grant it the
   `mike548141/faves` repo. (You can stop before the final "create/deploy"
   — the point is to establish the GitHub connection the API needs;
   `deploy.py` creates the project itself.)

If you think you've already authorised the App, you have — re-running the
flow just shows the repo already granted. `deploy.py apply` will confirm
by succeeding.

### 2. The API token (minted, not hand-made)

The deploy token is an **account-owned child token**, minted in code from
the estate's parent minting token rather than hand-made in the dashboard
(owner's decision, 2026-07-11). It is scoped to exactly what a deploy
needs, and nothing else:

| Scope | Permission |
| --- | --- |
| Account · Pages | Edit |
| Zone · DNS (`myspot.nz` only) | Edit |
| Zone · Zone (`myspot.nz` only) | Read |

Both tokens live in the macOS **login keychain** — never in this repo, a
dotfile, or a transcript. Their item names, and the mint/roll procedure,
are estate-level facts: they live in the operator's private estate-root
repo, which this runbook points to rather than restating (the
"point up, don't re-derive" rule in `CLAUDE.md`). Source the token into
the shell from the keychain, then:

```sh
export CLOUDFLARE_API_TOKEN=...   # sourced from the keychain, never pasted
python3 tools/deploy.py plan
```

The account id is resolved automatically — a repo-scoped token sees one
account. Only if a token sees several does it need stating, and then via
`CLOUDFLARE_ACCOUNT_ID` in the environment, never in `deploy.json`: an
account id authorises nothing, but it names a live account and this repo
publishes.

### 3. Provision

```sh
python3 tools/deploy.py plan           # dry run: desired vs actual
python3 tools/deploy.py apply          # create project + attach domain
```

`apply` creates the git-connected Pages project (build command none,
output dir `site/`), attaches `lets-eat.myspot.nz`, **and creates the
proxied CNAME itself** — the dashboard flow auto-creates that record but
the API attach does not (verified live 2026-07-11). HTTPS provisions in
the background because the zone is in the same account.

**Python note:** the python.org 3.14 install on this machine has no CA
certificates wired up (its "Install Certificates" post-step was never
run), so `python3 tools/deploy.py` fails TLS verification. Run it with
the system interpreter instead: `/usr/bin/python3 tools/deploy.py plan`.

## Everyday deploys

Nothing to run. **Push to `main` -> Cloudflare builds and deploys.**
Every other branch gets a free preview URL. To change hosting config,
edit `deploy.json` and re-run `apply`.

## Troubleshooting

- **"GitHub App isn't authorised"** on first `apply`: do step 1, re-run.
- **Token can see multiple accounts**: set `account_id` in `deploy.json`.
- **Domain stuck "provisioning"**: certificate issuance takes a few
  minutes; the `*.pages.dev` URL works immediately meanwhile.
