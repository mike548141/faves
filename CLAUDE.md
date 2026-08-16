# Faves — instructions for AI builders

## Doctrine — inherited from atelier (pinned `atelier@1408d98`, owner-ratified 2026-07-25, bumped 2026-08-16)

This repo works by the atelier operating model. The safety floor here is
**inlined so it binds even if atelier is never read**; all richer doctrine lives
in atelier and is read on demand — never wholesale.

- **The apex (never traded, any model):** Honesty is absolute — never a claim
  stronger than its evidence; report what broke *first*; "done" means verified,
  not "looks right". Adaptation is continuous — treat every piece of work as
  evidence-gathering, don't fear the harder path that teaches more, and any
  doctrine/design change rides on *repeatable* evidence, never testimony.
  Surface a genuine dilemma; never silently resolve it — a quietly picked fork
  is a withheld truth.
- **Always stop and confirm (the floor):** making a private repo public or
  widening its audience; anything truly destructive or irreversible; secrets;
  spending money; anything touching people's safety; widening your own grant
  (record the principal's decision, never originate it); a lockout-class change
  that could sever your own access; installing an unapproved tool or adding a
  new trust surface (deploy keys, webhooks, OAuth/app grants). Each such
  confirmation is an *informed* one — the agent puts what it wants to do, why,
  and the likely impact in plain language first. The principal's authority is
  absolute — never overrule him, even if you believe him uninformed; an approval
  given without that account is open to challenge on the briefing, and the
  challenge is raised to him by re-briefing (`00-APEX.md`). Everything
  recoverable — commit/push/PR included — just proceed.
- **Concurrency:** assume another session may be live — a clean tree is not
  proof you're alone. `git pull --rebase --autostash` at session start; push
  after each commit. Take a worktree by default for write-heavy or multi-commit
  work; uncommitted changes this session didn't make are positive proof ⇒ move
  to a worktree — never work around or absorb them (`CONCURRENCY.md`). **A
  claim still lands on `main` from the primary checkout even when that checkout
  is dirty:** if the stranger's edits don't touch the queue file, stage and
  commit *the claim line alone* — the one sanctioned touch inside another
  session's tree, safe because it stages only your own hunk. If `ROADMAP.md`
  itself is dirty, that is proof the other session is queue-active: sync, take
  the next open item, touch nothing. Name
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
  session start run `git -C "../atelier" fetch -q && git -C "../atelier" log
  --oneline <pin>..origin/main` using the **pin SHA in the heading above** —
  never a separately-written baseline, and never that checkout's `HEAD`: a
  stale local `main` makes the range run backwards and report *nothing*
  (2026-08-16 it was 16 commits behind). Any output means the house doctrine
  moved — read it, then bump the pin deliberately. (Until 2026-08-09 this line
  hard-coded `5ef28ae`, a baseline that was never bumped with the pin: it had
  fallen 31 commits behind, so the check reported 40 commits of which 31 were
  already read and inside the pin. A drift check that always fires is a drift
  check nobody reads — as `pathscan` did here until 2026-08-15, and atelier's
  `plainscan` reply gate did until it was unwired on 2026-08-15 for the
  neighbouring reason: it could detect the fault but not deliver the fix. Both
  are now clean. Deriving the baseline from the pin makes the two incapable of
  diverging; reading it from `origin/main` stops a stale checkout hiding real
  movement.)
- **Estate resources — point up, don't re-derive:** providers & account plans,
  financial constraints & plan entitlements, licences, credentials, shared
  estate tooling, and the estate inventory live in the operator's **private
  estate-root repo** (atelier's private counterpart). Reference it for these;
  never re-derive them locally or copy its contents down. This repo is
  publication-bound: reference the root by local-path convention only, never
  by name — a public repo naming the estate's credential/inventory root is
  reconnaissance.
- **This repo's visibility:** **PUBLIC** since 2026-08-09 (`a207a15`,
  Theme 8). A push *is* publication — to the world, immediately and
  irreversibly; git history is public too, so a secret committed and then
  removed is still disclosed and must be **rotated**, never just deleted.
  Content is publication-bound: no personal data beyond the two
  owner-approved exceptions below (recipe attributions; `data/`
  ownership records under ADR 0046's provenance rule). Verify:
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
- **No personal data — two owner-approved exceptions.** No home
  addresses of people, no health details, anywhere — those two are
  absolute. **In the app's dataset (`site/data/`) and every screen: no
  personal data at all.** Allergen tagging is a product feature, not a
  personal disclosure.
  - **Exception 1 (owner-approved 2026-07-06):** home recipes in the
    Cook at Home collection may keep family attributions in their
    titles/notes (e.g. "Booth's Ginger Crunch", "a Clements family
    dessert") at the owner's discretion — it's a public site and that
    call is his.
  - **Exception 2 (owner ruled 2026-08-16, ADR 0046):** the research
    store `data/` may record ownership and contact details — **name,
    email, phone** — for the people and organisations behind a venue,
    bounded by **provenance**: only what is in the public domain
    (`public-record`) or was purposely given to us for use in Faves
    (`given`). Every such record carries a `source` saying which, and
    `tools/registry.py` errors without one. Never served, never
    precached, never referenced from `site/`. Still never a person's
    home address, date of birth, or health.
- **The app ships only what it renders (ADR 0047).** `site/data/` is a
  precached payload: a field added there is downloaded by every phone
  whether a screen reads it or not. Data no screen shows — superseded
  prices, departed dishes — lives in `data/`, the repo-only research
  store, and is kept forever there. Before adding a field to a venue
  file, name the screen that renders it.
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
python3 tools/seed_dish_ids.py --check # every dish carries its own id (ADR 0051)
python3 tools/seed_section_ids.py --check # …and every section its own (ADR 0058) —
                              # the anchor comes from the id, so a heading can be
                              # renamed without breaking every link to it
python3 tools/test_validate.py # …and that gate still catches things (93 mutations)
python3 tools/check_no_deps.py # zero-dependency invariant (ADR 0001) holds
python3 tools/gen_sbom.py --check # published SBOM matches the tree (ADR 0008)
python3 tools/fetch_fx.py --check # the shipped FX rates load (ADR 0045); no network
python3 tools/check_visibility.py # the visibility bullet above is still true
python3 tools/check_fallback.py # the no-JS <ul> in site/index.html still mirrors
                              # site/data/index.json — same ids, same order, and a
                              # link on everything that isn't a `stub`. The lockstep
                              # rule below was unenforced from the day it was written;
                              # its first run found NINE venues with finished menus
                              # rendered as unreachable "Menu coming soon" cards
python3 tools/check_decisions.py # every ADR is in the decisions index (it's the
                              # allocator — an unindexed record is how a number
                              # gets reused; seven were missing on 2026-08-16)
python3 tools/check_versions.py --range origin/main..HEAD # sw.js versions bumped
                              # in lockstep with site/. Use the RANGE form to check
                              # finished work: bare, it reads only *staged* changes,
                              # so on a clean tree it says "not in scope" and proves
                              # nothing. Two sessions have now collided on a version
                              # that the bare form called clean.
node --test                   # JS unit tests (pure logic); no npm install needed
node tools/device_check.mjs   # live-safety check in headless Chrome (see below)
node tools/cook_check.mjs     # cook mode in headless Chrome (ADR 0039, below)
node tools/addon_check.mjs    # add-on composition in headless Chrome (ADR 0048)
node tools/branch_check.mjs   # the branch picker in headless Chrome (ADR 0054)
node tools/to_top_check.mjs   # the back-to-top button gets out of the way (Theme 29)
node tools/filter_row_check.mjs # filters inline when wide, in the sheet when narrow
node tools/recipe_check.mjs   # the recipe page's ingredient layout (ADR 0070)
python3 tools/test_tag_allergens.py # the allergen tagger still writes what it finds
node tools/note_check.mjs     # the order-line note (Theme 14c). A note is part of
                              # LINE IDENTITY, so the sheet can show the same dish
                              # twice differing only by its note — and the ± control
                              # operated the WRONG one until the stepper was made
                              # note-aware, which no unit test can see. Also checks
                              # the note is rendered as characters, not parsed: it
                              # is the first free text a person types on this screen
node tools/sync_check.mjs     # cross-device sync in TWO real browsers (Theme 9 v2).
                              # Reaches its end: "OK — 16 passed, 0 failed". Check the
                              # summary line is there AND that N is still 16 — a
                              # shrunken N is the tell. A harness abort exits 2 and
                              # prints no "FAIL" line, so it does not look like a
                              # failure; if it aborts, the message now names which
                              # Settings navigation step broke — fix the NAV block in
                              # the tool. It spent a whole refactor dead (clicking a
                              # settings row e745923 had removed), proving nothing,
                              # because NOTHING RUNS IT BUT YOU — see below.
```

🛑 **CI runs NONE of the browser checks.** Measured 2026-08-16 against
`.github/workflows/ci.yml`: CI runs `node --test` and the Python gates, and not
one of `sync_check` · `cook_check` · `device_check` · `boot_check` ·
`addon_check` · `branch_check` · `to_top_check` · `filter_row_check`. Every
guard that drives a real browser — the ones written precisely because unit tests
missed a leak, a wreck or a mistap — runs **only when a human or an agent types
it from this list**. That is how `sync_check` sat dead through a whole settings
refactor with CI green the entire time: nothing was calling it. So a green CI
run is *not* evidence about any behaviour on this list, and skipping one of
these because "CI will catch it" is a category error. Discipline is the only
thing running them.

**The exchange rates refresh themselves weekly** — `.github/workflows/fx.yml`
opens an auto-merging PR every Sunday (ADR 0045). Until an `FX_TOKEN` secret
exists it needs one "Approve and run" click per refresh; the workflow header
says why, and why loosening the approval policy is the wrong fix. You can also run
`python3 tools/fetch_fx.py --bump` by hand and commit it with your work; it is
safe to run every time, because the tool does nothing if it already fetched
today or if no rate moved. Either way the rates change in the repo **at most
once a day**.

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

`boot_check.mjs` answers the dullest question the other two never asked: does
each screen's JavaScript actually *run*? It loads the home screen and a menu
page on a fresh profile, watches the console, and asserts the page was drawn by
`app.js`/`menu.js` rather than by the fail-soft no-JS `<ul>` standing in for it.
It exists because on 2026-08-16 `app.js` called `venueTimezone` without
importing it, `init()` threw, the home screen silently served the static list,
and **570 unit tests, `device_check` 19/19 and `cook_check` 36/36 were all
green** — the first two drive a menu page, and the fallback made the wreck look
like a working list of places. Run it after touching any module on a page's
import graph, which in practice means most changes under `site/js/`.

`addon_check.mjs` is the third of the family (ADR 0048). Configuring a dish can
make it unsafe — satay on a kebab is peanuts — so it drives the real picker at
390 px and asserts the venue's cap refuses a fourth sauce, the warning names
the option and the allergen live, the flagged treatment follows the
*configuration* rather than the dish, and a configured dish becomes its own
order line. Run it after touching `addons.js`, `addons-ui.js`, `cart.js`,
`cart-ui.js` or the dish render. Its header names what a green run cannot show
you — above all that no browser can check whether the tagging is *true*.

`branch_check.mjs` is the fourth (ADR 0054). Choosing a branch is choosing where
your food comes from, and the card now makes that choice for you, so it drives
two real chains at 390 px: one with hours on every branch (TJ Katsu) and one
with hours on none (McDonald's). It asserts one branch leads expanded, that a
collapsed row opens on **one** click and reveals *that* branch's number, and —
the assertion that matters — that **no branch is given a status it has no hours
to support**. Every assertion is time-independent by design: a check that passes
at 1pm and fails at 1am gets switched off within a week. Run it after touching
`locations.js`, the contact card in `menu.js`, or per-branch hours data.

`recipe_check.mjs` is the seventh. The recipe page is now three items' worth of
layout — a fold that remembers, component headings, two columns above a
breakpoint, and two tick columns that must agree down the page — none of which a
unit test can see. It sweeps two widths and three text sizes and asserts the
tick columns share one left edge to the pixel, that a *wrapped* method step
(measured, not assumed) keeps its number beside the first line, and that a list
of under six lines stays one column where a list of eight splits. Each of its 22
assertions was verified by reintroducing the bug it covers. Run it after
touching `recipe.js`, `ingredients.js`, `checklist*.js` or the recipe region of
`app.css`.

🛑 **None of these run in CI.** `.github/workflows/ci.yml` runs `node --test` and
the Python gates only, so every check in this family runs when a human types it
and at no other time — which is how `sync_check.mjs` stayed dead through a whole
refactor. Type them. A roadmap item tracks fixing it; until then the honour
system IS the mechanism.

`to_top_check.mjs` and `filter_row_check.mjs` are the fifth and sixth. The
first sweeps the **whole document** in 37 px steps at two widths and two text
sizes, because a fixed control's victim depends entirely on where you stop
scrolling — a single sample proves nothing, and a single sample is what every
eyeball report of this bug had been. It caught the back-to-top button owning the
tap on a dish price at **100%** of its width, mid-scroll, at 96 of 547 scroll
positions. The second drives the filter row across the 60rem breakpoint in both
directions and asserts focus survives the DOM move; its hardest assertion is
that a `position: fixed` control parked below the viewport adds **no scrollable
overflow**, which was measured rather than reasoned about. Run them after
touching `to-top.js`, `filters-ui.js`, `index.html`'s filter markup, or any
fixed/sticky rule in `app.css`.

`cook_check.mjs` is its sibling for cook mode (ADR 0039), on the same
harness (`tools/lib/browser.mjs`): it opens a real recipe, steps through
it, works every exit path, and watches the **real** `navigator.wakeLock`
— instrumented before page scripts run, so a leaked lock is counted, not
inferred. It exists because 19 unit tests against a fake wake lock still
let two leaks ship (ADR 0034). Its header names the three things a
headless browser cannot show; read that before trusting a green run. Run
it after touching `cook.js`, `cook-ui.js`, or the recipe/list screens
that offer cook mode.

## Working conventions

Adopted from the `ros`/`tiki` repos (2026-07-08), adapted to a
build-less static site. See `CONTRIBUTING.md` for the fuller version.

- **Model & token economics:** doctrine (billing states, seat
  assignment, hand-ups, session hygiene) is atelier
  `docs/method/ECONOMICS.md` at the pin above; entitlement numbers live <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
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
    **Now enforced** by `tools/check_versions.py` (CI + the verify list):
    an unchanged constant makes the install step *skip* that cache, so the
    old files serve forever with CI green — it shipped that way on
    2026-08-16 and was only caught on the owner's own phone.
    Data-only change under `site/data/` → bump `DATA_VERSION`; any other
    change under `site/` → bump `SHELL_VERSION`; a change touching both →
    bump both. Split caches so a menu edit no longer re-downloads the
    whole shell (ADR 0015).
  - Keep the no-JS fallback `<ul>` in `site/index.html` in step with
    `site/data/index.json` (it's a hand-maintained mirror for fail-soft).
  - Adding a restaurant = new `site/data/restaurants/<id>.json` + its id
    in `site/data/index.json` + a fallback `<li>`; then `validate.py`.
  - **Menu content is owner-supplied or owner-directed — never harvested on a
    hunch.** Owner's ruling, 2026-08-16: *"whatever food/dishes I give you are
    to be included, if I don't give them to you or tell you to fetch them they
    are not."* So there is no judgement call about where a venue's menu stops —
    a delicatessen's coffee counter is in and its cleaning aisle is out because
    he hands over one and not the other, not because a rule was drawn. This
    settles scope questions before they start; do not invent a `kind` or a
    taxonomy to answer one.
  - **Refreshing a menu = append, never overwrite — but the append lands
    in the record, not the payload (ADR 0047).** A changed price replaces
    the dish's single entry in `site/data/` *and* appends the superseded
    one to `data/history/prices/<venue>.json`; a departed dish moves whole
    to `data/history/dishes/<venue>.json` rather than being deleted; a
    renamed dish carries its history over. But a *correction* (we recorded
    it wrong) overwrites and adds nothing, in both stores — the test is
    *did the shop change it, or did we?* Full rules: ARCHITECTURE.md
    "Refreshing a menu". This is how the price history accrues at zero
    cost to the phone; a refresh done the old way silently destroys it
    (ADR 0023). Run `python3 tools/split_data.py --check` after: the two
    stores must still reconstruct the corpus between them, which is what
    stops a relocation quietly becoming a deletion.

There is no `man` page: faves ships a website, not a CLI. The `tools/`
scripts are the only command surface — keep their `--help`/argparse and
module docstrings current instead.
