# Faves — instructions for AI builders

## Doctrine — inherited from atelier (pinned `atelier@05b4a98`)

This repo works by the atelier operating model. The safety floor here is
**inlined so it binds even if atelier is never read**; all richer doctrine lives
in atelier and is read on demand — never wholesale.

- **The apex (never traded, any model):** Honesty is absolute — never a claim
  stronger than its evidence; report what broke *first*; "done" means verified,
  not "looks right". Then the Laws, in order: avoid harm → obey your principal →
  self-preserve. Surface a genuine dilemma; never silently resolve it.
- **Always stop and confirm (the floor):** making a private repo public or
  widening its audience; anything truly destructive or irreversible; secrets;
  spending money; anything touching people's safety; widening your own grant
  (record the principal's decision, never originate it); a lockout-class change that could
  sever your own access; installing an unapproved tool or adding a new trust
  surface (deploy keys, webhooks, OAuth/app grants). Everything recoverable —
  commit/push/PR included — just proceed.
- **Source & drift:** canonical doctrine is `../atelier/docs/method/`. At
  session start run `git -C "../atelier" log --oneline 05b4a98..HEAD`; any
  output means the house doctrine moved — read it, then bump the pin above
  deliberately.
- **This repo's visibility:** PRIVATE for now — a push is not publication. But
  this is a **public-site project** headed for release, so treat content as
  publication-bound (no personal data beyond the owner-approved recipe exception
  below), and *making the repo public* is a floor action. Verify:
  `gh repo view mike548141/faves --json visibility`.

Read `docs/STRATEGY.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, then
work from `docs/WORKPLAN.md`. Skim the tail of `docs/SESSIONS.md` for
where the last session left off. Do not deviate from the architecture
without recording the decision — a short ADR in `docs/decisions/`
(see its README) for anything a future session might re-propose, and a
line in `docs/ARCHITECTURE.md` if it changes the compact current-truth.

## Hard constraints

- **Zero build step.** `site/` is served as-is. No bundlers, no
  frameworks, no npm dependencies, no CDN dependencies in the shipped
  artifact. Vanilla HTML + CSS + ES-module JavaScript only — what's in
  `site/` is the whole product. Node may exist on the machine for dev
  tooling (Lighthouse, JS tests), but it is never a build or runtime
  dependency: the site must run with nothing but a static file server.
- **Mobile first.** Design and test at 390 px first, then tablet, then
  desktop. Every interactive target ≥ 44 px.
- **Offline capable.** Service worker precaches the app shell and all
  menu data; the whole site must work in flight mode after first visit.
- **New Zealand English** throughout (favourite, organise). Correct
  macrons on te reo Māori words. Prices in NZD.
- **No personal data — one owner-approved exception.** No addresses of
  people, no phone/contact details, no health details, anywhere. For
  restaurants and menus: no personal data at all. **Exception
  (owner-approved 2026-07-06):** home recipes in the Cook at Home
  collection may keep family attributions in their titles/notes (e.g.
  "Booth's Ginger Crunch", "a Clements family dessert") at the owner's
  discretion — it's a public site and that call is his. Still never
  addresses, contact details, or health details. Allergen tagging is a
  product feature, not a personal disclosure.
- **Accessibility is non-negotiable.** WCAG 2.2 AA, semantic HTML,
  visible focus, prefers-reduced-motion respected, dark mode supported.

## Quality bar

- Lighthouse (mobile): Performance ≥ 95, Accessibility 100, Best
  Practices 100, SEO ≥ 95, installable PWA.
- Total transfer for first visit < 300 KB (excluding photos, which lazy-load).
- Works in Safari iOS, Chrome Android, and desktop evergreen browsers.

## Verify before committing

```sh
python3 tools/serve.py        # laptop + phone (same Wi-Fi); prints both URLs
python3 tools/validate.py     # data validates against the schema
python3 tools/check_no_deps.py # zero-dependency invariant (ADR 0001) holds
python3 tools/gen_sbom.py --check # published SBOM matches the tree (ADR 0008)
node --test                   # JS unit tests (pure logic); no npm install needed
```

Exercise the change in a real browser at mobile width. JSON data must
validate against the schema in `docs/ARCHITECTURE.md` — malformed menu
data is the most likely regression.

## Working conventions

Adopted from the `ros`/`tiki` repos (2026-07-08), adapted to a
build-less static site. See `CONTRIBUTING.md` for the fuller version.

- **Model & token economics:** `docs/MODEL-ECONOMICS.md` — which model
  does what (Opus builds, Fable reviews — scoped and short), session
  hygiene, and the read-path budget. Consult it before choosing a model
  or starting a billed review (`/code-review ultra`, Fable).
- **Commit as you work.** Small, focused commits — one concern each —
  landed continuously, not one end-of-session dump. Commit/push
  autonomy is the doctrine floor above (grant history: atelier
  AUTONOMY's table). This repo's only delta: Cloudflare Pages deploys
  from `main`, so a push *is* a deploy — and routine deploys are inside
  the grant. Still branch off `main` only when asked.
- **Commit message style:** `area: imperative subject`, lower-case,
  concise, noting how it was verified where useful. Areas in play:
  `data` (menu JSON), `home`/`menu`/`picker` (screens), `css`,
  `pwa`/`sw`, `a11y`, `seo`, `docs`, `deploy`, `tools`.
- **Documentation as code.** Significant decisions that reject a
  plausible alternative or rest on hard-won evidence get a short ADR in
  `docs/decisions/` (never edit an accepted one — supersede it).
  Reversible implementation choices get a code comment instead. Add a
  line under _Unreleased_ in `CHANGELOG.md` when a user-visible feature
  or fix lands. Append a `docs/SESSIONS.md` entry (append-only, newest
  last) before finishing a session.
- **Comments say _why_, not _what_** — constraints, platform quirks,
  non-obvious reasons; never a restatement of the code.
- **TODO markers:** `#!#` in any language; more `#` = higher priority
  (`#!#` nice-to-have → `#!####` blocking).
- **Lockstep rules** (change these together, in one commit):
  - Bump `VERSION` in `site/sw.js` on *any* change under `site/` — it's
    what tells installed phones to refetch; stale = offline visitors
    keep old menus.
  - Keep the no-JS fallback `<ul>` in `site/index.html` in step with
    `site/data/index.json` (it's a hand-maintained mirror for fail-soft).
  - Adding a restaurant = new `site/data/restaurants/<id>.json` + its id
    in `site/data/index.json` + a fallback `<li>`; then `validate.py`.

There is no `man` page: faves ships a website, not a CLI. The `tools/`
scripts are the only command surface — keep their `--help`/argparse and
module docstrings current instead.
