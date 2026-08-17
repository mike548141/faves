# Contributing to Faves

Faves is a small, focused thing: a beautiful, fast, offline-capable menu
of our favourite restaurants. Before proposing a change, read
[`docs/STRATEGY.md`](docs/STRATEGY.md) (what it's for and its non-goals)
and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (the stack and why),
so a change doesn't run aground on a deliberate boundary.

## Development setup

There is nothing to install. The site is vanilla HTML/CSS/ES-modules +
JSON, served as-is — see ADR [0001](docs/decisions/0001-zero-build-vanilla.md).

```sh
python3 tools/serve.py        # serves site/ to laptop + phone; prints both URLs
python3 tools/validate.py     # checks all menu data against the schema
node --test                   # JS unit tests (or: npm test) — needs Node, no install
```

`node --test` needs Node but **no `npm install`** — there are no
dependencies. The root `package.json` exists only to declare that
`site/js` is ES modules and to hold the test script; it is never a build
or runtime dependency, and `site/` still ships build-less.

Optional dev tooling uses Node, if present — never as a build or runtime
dependency, only to measure:

```sh
npx lighthouse http://localhost:8080/index.html \
  --form-factor=mobile --screenEmulation.mobile   # quality gate

node tools/device_check.mjs                       # live-safety browser check
node tools/cook_check.mjs                         # cook-mode browser check
```

`device_check.mjs` is the scripted stand-in for a manual phone test of the
safety-critical live re-apply: it serves `site/`, launches Chrome headless
against a throwaway profile (a fresh `--user-data-dir` is the only reliable
way past a stale service worker), then drives the real Settings UI on a
restaurant menu — flag an allergen, switch profile — and asserts the
warnings, hearts and ratings re-apply with no reload. Exit 0 = pass, 1 = an
assertion failed, 2 = the harness could not run. Needs Chrome, no install.
Run it after touching `menu.js`, `dietary.js`, `settings*.js` or
`profiles.js`; `--help` lists the options.

`cook_check.mjs` is the same idea for cook mode (ADR 0039), sharing the
harness in `tools/lib/browser.mjs`. It opens a real recipe, steps through it,
takes every exit path, and instruments the **real** `navigator.wakeLock` before
any page script runs — so a lock left held is counted rather than assumed.
Cook mode shipped with 19 unit tests against a fake wake lock and still leaked
twice in a real browser; that is what this is for. Its header lists the three
things a headless browser genuinely cannot show, which is worth reading before
you trust a green run. Run it after touching `cook.js`, `cook-ui.js`, or the
recipe and Cook at Home screens that offer cook mode.

## What makes a good change

- **Stay in scope.** No ordering/payments, no accounts, no admin UI, no
  live menu scraping — these are explicit non-goals (`STRATEGY.md`). The
  one sanctioned deviation from the venue model is the Cook at Home
  recipes collection, ADR [0003](docs/decisions/0003-recipes-as-kind-not-separate-type.md).
- **Mobile first, accessible always.** Design at 390 px; every target
  ≥ 44 px; WCAG 2.2 AA in both colour schemes; allergen/dietary info by
  text + icon, never colour alone.
- **Data validates.** Menu JSON must pass `tools/validate.py` (schema in
  `ARCHITECTURE.md`). `picks` must name a real menu item (by id or exact name). Never
  invent facts — unconfirmed fields stay `null`; **no tag ≠ allergen-free**.
- **Tests before behaviour for pure logic.** New pure functions (like
  those in `site/js/filters.js`) ship with a `tests/*.test.js` unit test.
  DOM-coupled code stays browser + Lighthouse verified.
- **Never hide or disable a control while it has focus.** Focus falls to
  `<body>`, outside whatever subtree your keydown listener is scoped to,
  and every keyboard shortcut in that subtree goes silently dead. Hand
  focus somewhere sensible *first*, then hide or disable. This has now
  shipped twice in cook mode — the Back button (owner-ruled 2026-08-15)
  and the timer's Reset (2026-08-16) — and both times unit tests were
  green and only the headless browser check caught it.
- **Comments say _why_, not _what_** — constraints and non-obvious
  reasons only.
- **Record real decisions.** Rejecting a plausible alternative, or
  resting a design on evidence, earns a short ADR under
  [`docs/decisions/`](docs/decisions/). Reversible choices get a code
  comment instead.
- **Grep `docs/decisions/` before you propose an option — especially the
  *Rejected* lists.** They are the half nobody reads and the half that
  answers "has this already been settled?". On 2026-08-16 two sessions in
  a row proposed a separate route/renderer for the recipes collection;
  ADR 0003 had rejected it, in those words, five weeks earlier. The trap
  is that a roadmap theme is a more inviting read than a decision record
  — newer, narrative, full of measurements, and silent about the older
  document that already closed the question.
- **There is no roadmap harvest any more, and that is the point.** Since
  2026-08-17 the board is one file per item under `docs/roadmap/`: a done
  item flips to `[x]` **in its own file**, in the commit that finishes the
  work, and nothing moves. `ROADMAP-DONE.md` is frozen as the pre-split
  archive. The retired step is worth remembering for why it went — a
  harvest edited a block of one huge file, and an open `- [ ]` item
  sitting next to a closed one was the easiest thing in there to delete by
  accident. It happened on 2026-08-16 to an unfixed WCAG AA failure, which
  then existed only as prose in a session log. Per-item files remove the
  operation that could do that.
- **Edit the item, never `docs/ROADMAP.md`.** The index is generated; the
  `board` floor check blocks a commit whose index is stale. Run
  `python3 "${ATELIER_TOOLS:-$(git config hooks.atelierTools)}"/board.py rebuild`
  in the same commit as the item edit. The tool is atelier's and this repo
  does not vendor a copy, so the command resolves it the way the pre-commit
  hook does.

## Committing

- **Commit as you work** — small, focused commits, one concern each.
  `main` auto-deploys to Cloudflare Pages, so a push is a deploy — and
  routine deploys are inside the doctrine floor (see `CLAUDE.md`).
  Don't end a session asking permission to commit, update
  `CHANGELOG.md`, or append to `docs/SESSIONS.md` — those are part of
  finishing the work, not favours to offer. Branching off `main` is
  the one thing to ask about.
- **Message style:** `area: imperative subject` (e.g. `picker: land on
  the filtered set`, `data: refresh KK Malaysian prices`, `a11y: fix
  dark-mode contrast on the call label`). Note how you verified it.
- **When the area prefix and the file list disagree, believe the file
  list.** A `docs:` commit that also touches two lines of `site/js/`
  still needs its `SHELL_VERSION` bump — the prefix is a hint to humans,
  the paths are what the service worker caches. This left `main` red on
  2026-08-16: the change was comment-only, every human signal said
  "documentation", and the version gate read the paths and was right.
  It cannot know a change is inert, and must not guess.
- **Lockstep** (same commit): bump the right version constant in
  `site/sw.js` — data-only change under `site/data/` → `DATA_VERSION`;
  any other `site/` change → `SHELL_VERSION`; both → both (ADR 0015).
  Keep the no-JS fallback list in `site/index.html` in step with
  `site/data/index.json`. Full list in `CLAUDE.md`.

## Verify before committing

Run `tools/validate.py`, then exercise the change in a real browser at
mobile width (both colour schemes). For anything non-trivial, run the
mobile Lighthouse check — the bar is Performance ≥ 95, Accessibility 100,
Best Practices 100, SEO ≥ 95. Append a `docs/SESSIONS.md` entry before
you finish.

## Licence

By contributing you agree that your contributions are licensed under the
project's [Apache-2.0](LICENSE) licence.
