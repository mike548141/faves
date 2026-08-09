# Faves — instructions for AI builders

## Doctrine — inherited from atelier (pinned `atelier@4cab670`, owner-ratified 2026-07-25, bumped 2026-08-09)

This repo works by the atelier operating model. The safety floor here is
**inlined so it binds even if atelier is never read**; all richer doctrine lives
in atelier and is read on demand — never wholesale.

- **The apex (never traded, any model):** Honesty is absolute — never a claim
  stronger than its evidence; report what broke *first*; "done" means verified,
  not "looks right". Adaptation is continuous — treat every piece of work as
  evidence-gathering, don't fear the harder path that teaches more, and any
  doctrine/design change rides on *repeatable* evidence, never testimony. Then
  the Laws, in order: avoid harm (humanity first, then the individual) → obey
  your principal → self-preserve. Surface
  a genuine dilemma; never silently resolve it.
- **Always stop and confirm (the floor):** making a private repo public or
  widening its audience; anything truly destructive or irreversible; secrets;
  spending money; anything touching people's safety; widening your own grant
  (record the principal's decision, never originate it); a lockout-class change
  that could sever your own access; installing an unapproved tool or adding a
  new trust surface (deploy keys, webhooks, OAuth/app grants). Each such
  confirmation is an *informed* one — the agent puts what it wants to do, why,
  and the likely impact in plain language first; an approval given without that
  account is not a decision the doctrine recognises (`00-APEX.md`). Everything
  recoverable — commit/push/PR included — just proceed.
- **Concurrency:** assume another session may be live — a clean tree is not
  proof you're alone. `git pull --rebase --autostash` at session start; push
  after each commit. Take a worktree by default for write-heavy or multi-commit
  work; uncommitted changes this session didn't make are positive proof ⇒ move
  to a worktree — never work around or absorb them (`CONCURRENCY.md`). Name
  records (session logs, ADRs, reviews) coordination-free —
  `YYYY-MM-DD-HHMM-slug.md`, `HHMM` in UTC (`date -u`); never a next-N counter;
  files named under retired schemes keep their names.
- **Session rhythm (points up for the full rule):** claim work you take off the
  shared queue before starting it, and let a live `[~]` claim override a
  standing instruction to take that item; stay in the lane you were given
  (`CONCURRENCY.md`); flag when economics favour a fresh session, and on
  overload stop at a safe point, record, and hand off (`ECONOMICS.md`);
  before you declare the work wrapped, do the put-away unprompted and close
  with an evidence-based all-clear that nothing owed is left uncaptured
  (`RECORD.md`) — and when that close pushes, the all-clear cites the pushed CI
  result (or flags it pending), never just a green local scan.
- **Source & drift:** canonical doctrine is `../atelier/docs/method/`. At
  session start run `git -C "../atelier" log --oneline 5ef28ae..HEAD`; any
  output means the house doctrine moved — read it, then bump the pin above
  deliberately.
- **Estate resources — point up, don't re-derive:** providers & account plans,
  financial constraints & plan entitlements, licences, credentials, shared
  estate tooling, and the estate inventory live in the operator's **private
  estate-root repo** (atelier's private counterpart). Reference it for these;
  never re-derive them locally or copy its contents down. This repo is
  publication-bound: reference the root by local-path convention only, never
  by name — a public repo naming the estate's credential/inventory root is
  reconnaissance.
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
  artefact. Vanilla HTML + CSS + ES-module JavaScript only — what's in
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
node tools/device_check.mjs   # live-safety check in headless Chrome (see below)
```

Exercise the change in a real browser at mobile width. JSON data must
validate against the schema in `docs/ARCHITECTURE.md` — malformed menu
data is the most likely regression.

`device_check.mjs` drives a real browser: it serves `site/`, launches
Chrome headless on a throwaway profile (a fresh `--user-data-dir` is the
only reliable way past a stale service worker) and works the real Settings
UI on a menu page — flag an allergen, switch profile — asserting the
warnings, hearts and ratings re-apply live with no reload. It is dev
tooling only; nothing it needs ships in `site/`. Run it after touching
`menu.js`, `dietary.js`, `settings*.js` or `profiles.js`.

## Working conventions

Adopted from the `ros`/`tiki` repos (2026-07-08), adapted to a
build-less static site. See `CONTRIBUTING.md` for the fuller version.

- **Model & token economics:** doctrine (billing states, seat
  assignment, hand-ups, session hygiene) is atelier
  `docs/method/ECONOMICS.md` at the pin above; entitlement numbers live
  in the estate root. `docs/MODEL-ECONOMICS.md` holds only this repo's
  measurements and applications. Consult both before choosing a model
  or starting a billed review (`/code-review ultra`).
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
  - Bump the right version constant in `site/sw.js` — it's what tells
    installed phones to refetch; stale = offline visitors keep old menus.
    Data-only change under `site/data/` → bump `DATA_VERSION`; any other
    change under `site/` → bump `SHELL_VERSION`; a change touching both →
    bump both. Split caches so a menu edit no longer re-downloads the
    whole shell (ADR 0015).
  - Keep the no-JS fallback `<ul>` in `site/index.html` in step with
    `site/data/index.json` (it's a hand-maintained mirror for fail-soft).
  - Adding a restaurant = new `site/data/restaurants/<id>.json` + its id
    in `site/data/index.json` + a fallback `<li>`; then `validate.py`.
  - **Refreshing a menu = append, never overwrite.** A changed price gains a
    dated entry beside the old one; a departed dish gains `available.offBy`
    rather than being deleted; a renamed dish carries its history over. But a
    *correction* (we recorded it wrong) overwrites and adds nothing — the test
    is *did the shop change it, or did we?* Full rules: ARCHITECTURE.md
    "Refreshing a menu". This is how the price history accrues at zero cost;
    a refresh done the old way silently destroys it (ADR 0023).

There is no `man` page: faves ships a website, not a CLI. The `tools/`
scripts are the only command surface — keep their `--help`/argparse and
module docstrings current instead.
