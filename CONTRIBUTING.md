# Contributing to Faves

Faves is a small, focused thing: a beautiful, fast, offline-capable menu
of our favourite Wellington restaurants. Before proposing a change, read
[`docs/STRATEGY.md`](docs/STRATEGY.md) (what it's for and its non-goals)
and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (the stack and why),
so a change doesn't run aground on a deliberate boundary.

## Development setup

There is nothing to install. The site is vanilla HTML/CSS/ES-modules +
JSON, served as-is — see ADR [0001](docs/decisions/0001-zero-build-vanilla.md).

```sh
python3 tools/serve.py        # serves site/ to laptop + phone; prints both URLs
python3 tools/validate.py     # checks all menu data against the schema
```

Optional dev tooling uses Node, if present — never as a build or runtime
dependency, only to measure:

```sh
npx lighthouse http://localhost:8080/index.html \
  --form-factor=mobile --screenEmulation.mobile   # quality gate
```

## What makes a good change

- **Stay in scope.** No ordering/payments, no accounts, no admin UI, no
  live menu scraping — these are explicit non-goals (`STRATEGY.md`). The
  one sanctioned deviation from the venue model is the Cook at Home
  recipes collection, ADR [0003](docs/decisions/0003-recipes-as-kind-not-separate-type.md).
- **Mobile first, accessible always.** Design at 390 px; every target
  ≥ 44 px; WCAG 2.2 AA in both colour schemes; allergen/dietary info by
  text + icon, never colour alone.
- **Data validates.** Menu JSON must pass `tools/validate.py` (schema in
  `ARCHITECTURE.md`). `picks` must name a real menu item exactly. Never
  invent facts — unconfirmed fields stay `null`; **no tag ≠ allergen-free**.
- **Comments say _why_, not _what_** — constraints and non-obvious
  reasons only.
- **Record real decisions.** Rejecting a plausible alternative, or
  resting a design on evidence, earns a short ADR under
  [`docs/decisions/`](docs/decisions/). Reversible choices get a code
  comment instead.

## Committing

- **Commit as you work** — small, focused commits, one concern each.
  `main` auto-deploys to Cloudflare Pages, so a push is a deploy; only
  push when the owner asks.
- **Message style:** `area: imperative subject` (e.g. `picker: land on
  the filtered set`, `data: refresh KK Malaysian prices`, `a11y: fix
  dark-mode contrast on the call label`). Note how you verified it.
- **Lockstep** (same commit): bump `VERSION` in `site/sw.js` on any
  `site/` change; keep the no-JS fallback list in `site/index.html` in
  step with `site/data/index.json`. Full list in `CLAUDE.md`.

## Verify before committing

Run `tools/validate.py`, then exercise the change in a real browser at
mobile width (both colour schemes). For anything non-trivial, run the
mobile Lighthouse check — the bar is Performance ≥ 95, Accessibility 100,
Best Practices 100, SEO ≥ 95. Append a `docs/SESSIONS.md` entry before
you finish.

## Licence

By contributing you agree that your contributions are licensed under the
project's [Apache-2.0](LICENSE) licence.
