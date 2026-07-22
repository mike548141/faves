# Faves

Our favourite restaurants — beautiful, fast, mobile-first menus.

Faves answers two questions:

1. **"We're hungry — what shall we get?"** A group (household, friends,
   guests) wants to pick a place and order, fast.
2. **"What's on their menu?"** Regulars want their usual; first-timers
   want to browse with confidence (descriptions, prices, dietary and
   allergen tags, our picks).

## Status

Strategy, architecture, and work plan are set. The app is built from
[docs/WORKPLAN.md](docs/WORKPLAN.md) — start there.

## Documentation

| Doc | Purpose |
|---|---|
| [docs/STRATEGY.md](docs/STRATEGY.md) | Why this exists, who it serves, what success looks like |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, PWA, hosting — with decision rationale |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual direction and mobile-first design rules |
| [docs/WORKPLAN.md](docs/WORKPLAN.md) | Phased build plan with acceptance criteria |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Cloudflare Pages hosting — one-time setup and the deploy flow |
| [CLAUDE.md](CLAUDE.md) | Standing instructions for AI builders |

## Layout

```
site/                  ← the deployable artifact (no build step)
  data/index.json      ← list of restaurant ids
  data/restaurants/    ← one JSON file per restaurant (details + menu)
docs/                  ← strategy, architecture, design, work plan
```

## Run locally

```sh
python3 tools/serve.py     # serves site/ — prints laptop + phone URLs
python3 tools/validate.py  # checks all menu data against the schema
```

No toolchain, no dependencies, no build. What's in `site/` is what ships.

## Editing menu data

1. Edit the JSON in `site/data/restaurants/` (schema in
   [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
2. Run `python3 tools/validate.py`.
3. **Bump `DATA_VERSION` in `site/sw.js`** — the service worker precaches
   all menu data, and the version bump is what tells installed phones to
   fetch the new data cache. Skip it and offline visitors keep stale
   menus. (A menu edit only touches `DATA_VERSION`; the shell cache is
   left alone so phones don't re-download the app — ADR 0015. Changed
   HTML/CSS/JS too? bump `SHELL_VERSION` as well.)
4. Check the change in a browser at mobile width, then commit.

## Deploy

Hosting is **Cloudflare Pages**, git-connected to this repo. Once set up,
the everyday flow is nothing more than:

```sh
git push origin main    # Cloudflare builds and deploys; branches get preview URLs
```

- **Live:** https://lets-eat.myspot.nz (default: `https://faves.pages.dev`)
- **First-time setup** (authorise the GitHub App, scoped API token, then
  `python3 tools/deploy.py apply`) is a one-off — see
  [docs/DEPLOY.md](docs/DEPLOY.md). Hosting config is code in
  [tools/deploy.json](tools/deploy.json).
