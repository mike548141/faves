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
cd site && python3 -m http.server 8080
# open http://localhost:8080
```

No toolchain, no dependencies, no build. What's in `site/` is what ships.
