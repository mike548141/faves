# Faves session log (append-only index)

One entry per working session, newest LAST. **Append-only content** — an
entry is never edited or reordered once written. At session start read only
the recent tail (`tail -60 docs/SESSIONS.md`); the full history is for
grepping, not for loading whole. When the index outgrows its budget it
**rotates**: the recent tail stays here, older entries move verbatim to
[`SESSIONS-ARCHIVE.md`](SESSIONS-ARCHIVE.md) (grep on demand, never load
whole) — the current-truth/history split, same as `ROADMAP`→`ROADMAP-DONE`.
A substantial session may also put full detail in `docs/sessions/` and carry
a one-line pointer here. Convention adopted from `ros`/`tiki` (2026-07-08);
rotation added 2026-07-18.

- **2026-07-12 (Fable: code review of the UX/chrome block)**: The deferred
  review, scoped to `8706f23~1..HEAD` under `site/` (~1.19k insertions, 17
  files). Eight finder angles fanned out on Opus, every candidate verified
  independently; 16 of 17 confirmed. **Findings, most severe first — fixes to
  apply on Opus, none applied this session:**
  1. `sw.js:73` — install swapped `cache.addAll(SHELL)` for per-URL
     `cache.put(await fetchClean(u))`, losing addAll's `response.ok` guard: a
     404/500 during a deploy race gets cached as a shell asset, install still
     resolves, and offline visitors serve the broken file until the next
     VERSION bump.
  2. `to-top.js:6` + `about-ui.js:13` — both new modules cloned the naive
     `Object.assign` `el()` instead of the hyphen-aware one (`menu.js:20-25`
     has the guard + warning comment), so `aria-label`/`aria-labelledby`/
     `data-i18n(-aria)` become inert expandos: the ↑ button is an unnamed
     control to screen readers and untranslatable; the About dialog has no
     accessible name; "Made by" can't reach its existing `footer.made` = "Nā"
     key. Repo-wide there are now 11 private `el()` copies (7 naive, 4
     hyphen-aware) — the root-cause fix is one shared hyphen-aware export.
  3. `settings-ui.js:109` — the chip-group `.fits` state is a one-way latch:
     `.fits` removes the max-height clamp, and `refresh()` measures without
     stripping it first, so once chips fit (e.g. landscape) the clamp/"Show
     all" toggle can never return after rotating narrower.
  4. `picker.js:189` — `.is-tucked` is only ever cleared by a scroll event;
     the scroll listener keeps running while the FAB is `display:none` in
     search, so exiting search can restore "Pick for us" still translated
     off-screen.
  5. `app.css:2195` — the unconditional `.contact-bar-open .menu-toolbar`
     top-offset comes after the equal-specificity desktop `top:0` rule, and
     `initContactBar` (`menu.js:733`) has no width guard, so on a short
     desktop window the toolbar drops ~3rem while the bar itself is
     `display:none`.
  6. `app.css:1828` — `.chips-toggle` computes to ~29px tall (no min-height):
     breaks the 44px target rule.
  7. Cleanup (all confirmed): `sw.js:118` cacheFirst re-inlines fetchClean
     (`return hit || fetchClean(req)`); search-clear ✕ wiring duplicated
     `app.js:1030` vs `menu.js:610`; share-app vs share-ui duplicate the
     share/clipboard/AbortError flow; three divergent hand-rolled `<dialog>`
     lifecycles; to-top's scroll listener is unthrottled (picker's is
     rAF-gated) and home now boots two scroll listeners; settings resize →
     forced reflow per chip group; `centerNavLink` builds a fresh matchMedia
     per call and reads rects after class writes; About dialog DOM built
     eagerly on every home boot; `--contact-bar-h: 3rem` is assumed, never
     measured (overlap risk at large font settings).
  Refuted (don't re-raise): disclosure.js leaving orphaned listeners when
  Settings closes with the ⓘ note open — the capture-phase click listener
  fires before the ✕/backdrop handlers and self-closes cleanly.

- **2026-07-12 (Opus: fixed the six confirmed review bugs)**: Worked the
  numbered findings from the Fable review above; the #7 cleanup set is left for
  next time. **1** `sw.js` install now keeps `addAll`'s guard by hand — a shell
  URL that returns non-200 throws and rejects the install rather than caching a
  broken asset that offline visitors then serve. **2** `to-top.js` +
  `about-ui.js` `el()` made hyphen-aware (mirroring `menu.js`), so
  `aria-label`/`aria-labelledby`/`data-i18n(-aria)` land as real attributes: the
  ↑ button and About dialog now have accessible names and translate. (Targeted
  fix, not the shared-`el()` module the review floated — that's a #7 cleanup.)
  **3** `settings-ui.js` `refresh()` strips `.fits` before measuring, so the
  "Show all" clamp/toggle returns after the group is narrowed again (was a
  one-way latch). **4** `picker.js` gained a `MutationObserver` on `<body>` class
  that clears a stale `.is-tucked` when browse returns — the FAB is `display:none`
  during search/faves so a scroll event may never fire to reset it. **5**
  contact-bar CSS reordered so the desktop `top:0` reset wins (equal
  specificity, later rule), plus `initContactBar` now width-guards on the 48rem
  breakpoint (matchMedia + a resize handler) so `.contact-bar-open` is never set
  on desktop. **6** `.chips-toggle` given `min-height:44px` (+ inline-flex
  centring). SW `.59→.60`. **Verified over CDP** (headless Chrome, zero-dep WS
  driver) at 390px + desktop: SW cached 71 entries incl. all 27 menus and served
  a deep link offline; ↑/About accessible names + data-i18n present; latch
  toggle returned on re-narrow; FAB `is-tucked` cleared on search-exit
  (`transform:none,opacity:1`); desktop toolbar stayed `top:0px` while the bar
  was `display:none`, mobile `top:48px`; chips-toggle 44px; zero console errors
  on home/menu/stub. Static suite green (validate 27, no-deps, SBOM, 176 tests).
  Note: the working tree also carries unrelated in-flight edits (atelier pin
  bump, `qr.js`/`serve.py` leakscan annotations, `.github/workflows/floor.yml`)
  left untouched and uncommitted this session.

- **2026-07-12 (Opus: the #7 cleanup block from the Fable review)**: Cleared the
  quality/dedup set the review deferred, in five focused commits (each verified
  over CDP with the SW bypassed so tests hit current files, not stale cache — a
  trap the first run fell into). **1 Shared `el()`** (`dom.js`): retired 11
  private copies (5 the naive `Object.assign` form that drops aria-*/data-*) for
  one imported hyphen-aware helper; fixed the latent bug the review predicted —
  the Settings dialog's `aria-labelledby` was inert, so it had no accessible
  name (now does). **2 Shared `<dialog>` lifecycle** (`dialog.js`): one
  `wireDialog()` (✕ + backdrop; Escape native) + `closeButton()` across
  Settings/About/picker; Settings' ✕ gained `data-i18n-aria`; About now builds
  its DOM on first open (not every boot) and `translate()`s the fresh subtree
  (verified in te reo: Made by→Nā, Close→Katia). `sw` cacheFirst reuses
  `fetchClean`. **3 Share primitives** (`share-core.js`): `tryNativeShare`
  (shared/dismissed/unavailable) + `copyText` so share-app and share-ui stop
  hand-rolling the AbortError/clipboard dance; share-ui adopts `wireDialog`.
  **4 Search-clear** (`search-clear.js`): one `wireSearchClear()` for the home
  and in-menu ✕. **5 Perf**: rAF-throttle to-top's scroll and settings' resize;
  scroll-spy batches class writes before the rect read and reuses one
  reduced-motion mq; contact bar measures its inner's real height into
  `--contact-bar-h` (measuring the *inner*, not the bar, dodges a safe-area
  feedback loop) so the toolbar can't overlap at large fonts. Four new tiny
  modules added to the SW shell. **Verified over CDP** at 390px + desktop: all
  three dialogs open/close via ✕/backdrop/Escape; About lazy + translated; both
  share flows fall back cleanly; search ✕ clears + refocuses on both screens;
  to-top tracks real scrollY; `--contact-bar-h` measured to 48px with no
  overlap; settings latch still returns; zero console errors throughout. SW
  `.59→.65` across the session; static suite green (validate 27, no-deps, SBOM,
  176 tests). The unrelated in-flight edits noted above remain untouched.

- **2026-07-12 (Fable: doctrine drift — why a session asked before committing)**:
  Investigated why a live session asked permission to commit despite the
  2026-07-10 standing grant. Root cause: `CONTRIBUTING.md` still said "only
  push when the owner asks" (written 2026-07-08, pre-grant) — the session hit
  a CLAUDE.md-vs-CONTRIBUTING contradiction and correctly stopped, but didn't
  name the conflict in its ask. Fixed the stale line (91a4da5), swept all 14
  estate repos: `rpi` carried the same stale posture (fixed there too);
  everything else consistent. Then, per the owner, moved to inherit-form: the
  grant's canonical record is atelier AUTONOMY's grant-history table; this
  repo's CLAUDE.md/CONTRIBUTING now point at it and keep only the
  push-is-a-deploy delta. Added the ask-names-both-sources rule to atelier
  AUTONOMY.md. All edits re-verified against parallel-session work before
  landing (the #7 cleanup commits touched neither file; the new
  COMMUNICATION.md doc is unrelated territory). Docs only — no `site/`
  change, no SW bump.
  Same-session follow-up: stripped the hand-restated grant scope the first
  pass had left behind — each repo now carries managed floor + delta only
  (4a95c17 here; rpi 741377d; hitchbots eba418f, which also bumped its pin) —
  and bumped this repo's atelier pin 05b4a98 → 2b8da3b after reading the
  drift (signing hardening, browser-fetch instrument, COMMUNICATION.md,
  AUTONOMY ask-names-both-sources; floor unmoved).

- **2026-07-12 (Fable: launch recorded — owner acceptance progress)**:
  The site is launched: live at lets-eat.myspot.nz and the link is
  shared with family. Owner installed the PWA on iPhone — saves to the
  home screen, functions normally — so Phase 5's iOS install acceptance
  is passed (WORKPLAN updated). Remaining owner acceptance narrows to:
  flight-mode test, Android install, a real phone-camera QR scan
  (Theme 1b), the family-order hallway test, detailed device checks
  (schemes/orientations/tablet), and re-running Lighthouse against the
  live URL. Docs only — no `site/` change, no SW bump.
  Owner call, same day: family-share counts as launch day — CHANGELOG's
  Unreleased block cut to **[1.0.0] — 2026-07-12 · launch**; fresh empty
  Unreleased opened for post-launch work.

- **2026-07-12 (Fable: opening hours researched for the 15 hour-less venues)**:
  Every venue record now has `hours`. Three parallel research agents swept
  official sites, socials, and aggregators; venue-own sources preferred.
  High confidence (own site): Babaili, Satay Kingdom, New Chapter, Kaffee
  Eis, Regal, The Catch, Rock Yard. Medium (aggregators agree / minor
  conflicts, noted in the research): Cozy Cake, Gong Cha, Gold Lining,
  KK Malaysian (Monday now closed; old own-site hours stale, domain dead),
  Pizza Pomodoro (own FAQ beats stale aggregators), Marigold (Facebook
  post corroborates), Thai Tara Express (own site vs aggregator split —
  own site used). Low: Wellington Kebab Grill (own site says "TBC";
  aggregator + Uber Eats pattern used — phone check 04 478 4780 would <!-- leakscan:allow: venue business phone quoted in a session record — same product class as site/data (ADR 0022 gate 1) -->
  settle it). Also cross-checked Spices Indian against spicesindian.co.nz
  (owner-flagged): hours, phone, Easy Eats link all match; no change.
  Verified: validate.py, check_no_deps.py, node --test all pass; SW
  VERSION → 2026-07-12.66.
  Session close: atelier drift read (2b8da3b → b07087c, 11 commits —
  new REACH.md fetch-ladder + credential-boundary doctrine; CONCURRENCY
  gained the dirty-tree backstop, sync bookends, and solo trunk-based
  default; PROPAGATION now stamps a Concurrency line into the floor
  block). Floor unmoved. Pin bumped and the Concurrency line added to
  CLAUDE.md's inlined block per the updated template. Docs only — no
  `site/` change beyond the earlier hours commit, no further SW bump.

- **2026-07-12 (Fable: go-public assessment; hours confirmation folded)**:
  Owner call: the Wellington Kebab Grill phone check is *not* an open
  action — hours confirmation folds into his general menu/details
  verification pass for all venues (CHANGELOG reworded). Assessed making
  the repo public on request: publishable but sequenced — PAT refresh
  first (SESSIONS' own 2026-07-12 deploy entry discloses the classic+broad
  PAT and credential-root queue; history keeps it, so fix the credential
  not the log), branch protection before visibility (push-to-main is a
  deploy), and owner to confirm the docs' family-first-names texture
  extends beyond the site-data recipe approval. Tree + full history
  scanned: no secrets, Apache 2.0 present. Recorded as ROADMAP Theme 8
  (owner-gated). Visibility unchanged: PRIVATE (verified). Docs only —
  no `site/` change, no SW bump.

- **2026-07-12 (Opus: atelier drift swept, pin bumped to d371169)**:
  Session-start hygiene. Pull clean, visibility PRIVATE (verified). Drift
  b07087c → d371169: six commits, three touching `docs/method/` — <!-- pathscan:allow: atelier cross-repo path, historical — accurate as of this session log entry -->
  COMMUNICATION.md (widened the verdict UX: reach for the fitting icon
  🎉🎯🚩 not a fixed set, plus act-on-device separation and a language-
  accessibility axis), RECORD.md (close-ready signal sharpened to a
  two-condition rule with the sequence boundary as the test), ACCESS.md
  (status flip — the consolidated estate access map now exists). All
  richer doctrine / instance topology, none inlined in faves' floor.
  **Floor unmoved.** Pin bumped in CLAUDE.md (header + drift-check
  command). No open WORKPLAN items are actionable without owner intake
  (menu refreshes, board photos, Notes recipe export). Docs only — no
  `site/` change, no SW bump.

- **2026-07-12 (Opus: ROADMAP reconciled to code — five shipped items marked
  done)**: Owner pushed back on "is that all the work you can do", rightly.
  Verified a green baseline (validate, check_no_deps, gen_sbom --check,
  node --test → 176 pass, all invariants hold). Went to build three `[S]`
  test-drive fixes — and found them, plus two `[M]` ones, **already built and
  wired** but still written as open in ROADMAP: back-to-top (`to-top.js`,
  5f5a456), share-this-app + FAB hide-on-scroll (`share-app.js` / picker
  `is-tucked`, 5f2b618), About surface (`about-ui.js`, 78a2cc4), contact-bar
  collapse (`menu.js` `.contact-bar`, f33ff42). All landed 2026-07-12; the doc
  hadn't caught up — enough drift that I nearly rebuilt two. Stamped each done
  with file + commit evidence; both test-drive sections now fully ticked.
  Swept the rest of ROADMAP for other silently-shipped work: none —
  `security.txt` (absent) and order-online logos remain genuinely open, both
  owner-gated (a security contact / brand assets + usage terms). Net: the
  buildable no-owner-input engineering was already done; remaining work needs
  owner intake or a decision. Docs only — no `site/` change, no SW bump.

- **2026-07-18 (Opus: file-size harvest — SESSIONS/ROADMAP/ARCHITECTURE under
  budget)**: Focused file-size-hygiene session from atelier's roadmap (`sizescan`
  flagged three current-truth docs over budget); worktree `sessions-roadmap-harvest`,
  docs only. **SESSIONS.md 1157→238** — adopted the rotation the ros/tiki index
  convention implies but faves never made: the recent tail stays in the loaded
  index, the older 44 entries moved **verbatim** to a new `SESSIONS-ARCHIVE.md`.
  **ROADMAP.md 766→299** — current-truth/history split: every *resolved* item
  (shipped, decided-against ✗, owner-parked) moved verbatim to a new
  `ROADMAP-DONE.md` behind a lean pointer, open/future work kept; done by a
  scripted line-range partition, verified verbatim + no gap/overlap.
  **ARCHITECTURE.md 276→250** — trimmed without losing facts (Hosting → the made
  decision; stale row fixed; prose de-duplicated; rot-prone `js/` list
  condensed). `sizescan` clean across all three.

- **2026-07-22 (Opus: wave1 small closers — drive time + Cook-at-Home grid)**:
  Worktree `faves-wave1-small-closers`; two claimed ROADMAP items. **Drive time
  (Theme 2):** the address-row maps handoff now requests *driving directions*
  from the viewer's location instead of dropping a pin, so the maps app shows the
  real drive time — Apple `daddr=…&dirflg=d`, Android/desktop Google Maps
  `dir/?…&travelmode=driving` (`geo.js`, `menu.js`). Android gave up the
  vendor-neutral `geo:` chooser because `geo:` has no directions mode — recorded
  in **ADR 0010** (supersedes ADR 0005's pin behaviour). Plus the optional part
  (b): a rough "~N min drive" hint on Near-me home cards from the haversine
  distance (`distance.js` `estimateDriveMinutes`/`formatDriveTime`, muted + "~",
  no layout shift). **Cook-at-Home grid (Theme 3):** pure-CSS grid placement
  (`.card-grid .card-recipes`) puts the recipes card top-right on the ≥34rem
  layout; DOM order (ranking's pin) unchanged, so mobile keeps it anchored at the
  top. Verified: `node --test` 180 pass (geo tests rewritten for the directions
  form; 7 new distance assertions); `validate.py`/`check_no_deps.py`/`gen_sbom
  --check` all green; served locally, new URLs/CSS confirmed shipped. SW VERSION
  2026-07-12.66 → 2026-07-22.67. Two design calls for the owner: the address row
  keeps its "Pickup" label (tap = directions, not relabelled), and the "~N min
  drive" hint's speed/road-winding constants are a guess (30 km/h × 1.3).

- **2026-07-22 (Opus: wave2 — multi-location venues + "Nearest first" fix)**:
  Worktree `faves-wave2-multi-location`. **Multi-location (Theme 2, ADR 0011):**
  shape (a) — one record + an optional `locations:[{label?, address, lat, lng,
  phone, hours}]` array sharing name/menu/cuisine; single-location records
  untouched (backward compatible). New `site/js/locations.js` is the one seam
  that reconciles both shapes and resolves the **nearest** branch; `data.js`
  normalises the primary branch to the top level so every existing consumer
  keeps working. Distance/drive-time/open-now/maps all use the nearest branch
  (primary when location unknown — decided *against* "any branch open", which
  would fight the distance shown). Menu screen lists every branch nearest-first
  (`menu.js`); the viewer's Near-me location is remembered per session
  (`geo.js` `rememberOrigin`/`recallOrigin`, sessionStorage, device-local) so
  the menu can order branches without a second prompt. `validate.py` gains
  reusable `check_coords`/`check_hours` + per-branch rules. Kaffee Eis + Gong
  Cha converted to their **one verified branch each** — second branches NOT
  fabricated (need real addresses + dev-time geocode; a content session appends
  to `locations`, no code change). **"Nearest first" sort bug (owner-reported):**
  root cause was *not* a text sort (every distance compare was already numeric)
  — availability tier + favourite boost ranked ahead of distance, so a
  farther-open venue floated above a nearer one, contradicting the label. Fix:
  with "Nearest first" on (origin known) distance leads; default order (no
  location) unchanged. 3 regression tests added. **Also:** `serve.py --help` no
  longer crashes (argparse; the old unconditional `int(sys.argv[1])`). Verified:
  `node --test` 203 pass; `validate.py` (27 valid), `check_no_deps`, `gen_sbom
  --check` all green; served locally — home + venue shells + `locations.js` all
  200, kaffee-eis.json parses to the new shape. SW VERSION 2026-07-22.67 → .69
  (two site commits; tip .69 covers all). Owner calls: (1) second branches for
  the two chains await real data; (2) "Nearest first" still applies the
  favourite boost — flag if hearts should be ignored in that mode; (3) menu's
  compact mobile call-bar uses the primary branch (not nearest) — minor.

## 2026-07-22 — Device-local profiles (Theme 5, the sanctioned half) — Opus 4.8

Shipped **device-local profiles** (wt: faves-wave3-local-profiles; ADR 0012):
several people share one phone, each with their own hearts + food prefs. NO
accounts, NO sync — cross-device stays out of scope (a separate signed-in app,
Theme 6). New DOM-free store `profiles.js`: a device-level registry
`faves.profiles.v1` `{v,activeId,profiles:[{id,name}]}` + a `profileScopedStorage`
wrapper that namespaces per-profile keys to `faves.p.<activeId>.<base>`
(`scopeKey`). Favourites + settings singletons now read through it; switching
profile + `reload()` re-points the whole personal layer with no consumer
rewrite. **Per-profile vs shared (scoped by *whole store*, not by field):**
per-profile = favourites + all of settings (dietary/allergen prefs [safety], the
two ranking dials, the reo language); shared/device = order tally (one order for
the table) + Near-me origin (sessionStorage). Theme follows the OS, never stored.
**Migration** (`migrate`): folds pre-profiles data into a default profile ("Me",
deterministic id `default`), **copies** old keys (doesn't move — a briefly-cached
old asset still reads them), idempotent, copy-only-when-target-empty. **UI:** a
"who's using Faves?" switcher at the top of the ⚙ Settings dialog — native radios
styled as chips, add/rename via one inline form, delete via an inline confirm
(destructive; last profile undeletable), a visually-hidden live region announces
each change, an unobtrusive "Browsing as <name>" caption in the ⋯ menu. **Safety
re-apply:** menu/recipe screens read diet once at render + have no switcher, so
the only stale case is a cross-tab switch — they `location.reload()` when the
active profile changes so no one browses under someone else's allergen filter;
the Settings diet chips re-sync live. te reo strings added for the new chrome
(draft; privacy prose stays English per reo.js). ~28 unit tests
(`tests/profiles.test.js`) cover namespacing, sanitising, migration (incl.
idempotency + no-clobber), create/rename/delete/switch/subscribe, isolation.

**Verified:** `node --test` 228 pass; `validate.py` (27 valid, 4 pre-existing
"no picks" warnings), `check_no_deps`, `gen_sbom --check` all green; `node
--check` on every changed module; served locally — index caption markup present,
`js/profiles.js` 200, sw VERSION `2026-07-22.69 → .70` (bumped once in the final
site commit; profiles.js added to SHELL). **NOT browser-exercised** (no headless
browser here): the switcher's DOM interactions, live-region announcements, focus
handling, and the cross-tab reload are logic-/syntax-verified only — worth a real
mobile pass before launch. **Owner calls to revisit:** (1) reo **language is
per-profile** (a consequence of scoping by whole store) — if it should be
device-level, split `lang` into a device key (superseding ADR, follow-up); (2)
old un-namespaced keys are left orphaned after migration (tiny) — a later cleanup
could purge them once no old assets can be cached; (3) the ranking dials ride
per-profile too — fine, but flag if they should be device-level.

## 2026-07-22 — Ratings: curated + device-local personal (Theme 5) — Opus 4.8

Built ROADMAP Theme 5 "Ratings / feedback" as the recorded recommendation
**(a)+(b), not public** (ADR 0013). **(b) local personal ratings — full:** a new
per-profile store `ratings.js` (`faves.ratings.v1`, `{key:1..3}` keyed like
favourites, clamped/0-clears on read+write, added to `SCOPED_BASE_KEYS`) + a
keyboard-operable ☆☆☆ control `ratings-ui.js` (three `<button>` toggles, 44px,
`aria-pressed`=filled, a polite live summary, its own ✕ clear) on the venue
header and every dish row. **(a) curated household rating — schema+render only:**
optional integer `rating: 1..3` on venue + menu items, `validate.py` enforced
(`check_rating`), rendered where picks render + on the header as a static "Our
rating" pill. **No rating data invented** — (a) ships dormant. Curated vs
personal kept visually distinct: personal = interactive, label-free, cool
`--personal` violet; curated = static `--accent` pill with an "Our rating" label
(colour + chrome + interactivity, never colour alone). Reo: `rating.our` (draft).

**Verified:** `node --test` **239 pass** (new `tests/ratings.test.js`: clamp/
clear/idempotence, corrupt-payload sanitise, subscribe, and a per-profile
isolation test over the `scopeKey` seam); `validate.py`, `check_no_deps`,
`gen_sbom --check` all green; `check_rating` exercised via import over accept/
reject cases + an end-to-end fixture run (inject `2`+dish`3` → pass; `5` →
rejected) reverted with **no data committed** (validate has no test seam); every
changed module `node --check`ed; module graph import-smoke-tested; served
locally — `restaurant.html`, `js/ratings.js`, `js/ratings-ui.js`, `css/app.css`
all 200, rating CSS present. **SW VERSION `.70 → .71`** (bumped once in the final
site commit; both new modules added to SHELL). **NOT browser-exercised** (no
headless browser here): the control's tap/keyboard interaction, `aria-pressed`/
live-region announcements, dark-mode + reduced-motion, and the curated pill's
dormant render are logic-/syntax-/served-verified only — worth a real mobile pass
before launch. **Owner calls outstanding:** ⚑ (1) **ratify the (a)+(b)-not-public
direction** — still owed; (2) **supply curated `rating` values** — (a) shows
nothing until then; (3) the live-Google-rating edge function stays separate +
owner-gated on billing (out of scope here). Commits: store `+profiles`, UI+menu+
css+reo, validate+ARCHITECTURE, sw bump, this docs close.

## 2026-07-22 — Te reo Māori pre-launch wording review — Opus 4.8

Ran the reo **wording review** owed since 2026-07-09 (worktree
`faves-wave5-reo-review`, branch not merged). Reviewed **all 68** shipped te reo
strings (`reo.js` `MI` table) + the language-option labels. Record:
[`docs/reviews/2026-07-22-1148-reo-wording-review.md`](reviews/2026-07-22-1148-reo-wording-review.md).

**Findings:** macrons/tohutō **clean across the board** (zero fixes — the first
pass was careful); standard UI terms match attested mi-NZ localisation
(*Tautuhinga*, *Tāpirihia*, *Muku*, *Tiaki*, *Whakakore*, *Katia*). **59 kept,
0 wording changes, 9 flagged** for a fluent speaker (`app.sub` tagline,
`search.clear`, `service.takeaway`, `makau` for Favourites, `pick.empty`
*panoni*-vs-*kōwhiri* calque, **`rating.our` *whakatauranga* noun uncertain**,
`profile.choose`, `profile.browsingAs` *hei*-frame). Made **no** speculative
changes — honesty floor: I'm an AI, not a fluent speaker.

**One real code fix (a11y):** the engine flipped `<html lang>` to `mi` wholesale,
so screen readers mispronounced all the English fall-through (menu/venue/safety
text) as Māori. Now WCAG 2.2 SC 3.1.2 *Language of Parts* — root stays `en-NZ`,
`translate()` stamps `lang="mi"` per translated element, lossless revert. Also
reinforced the safety-boundary comment at the `MI` table head.

**Verified:** `validate.py`, `check_no_deps`, `gen_sbom --check`, `node --test`
(239 pass), `node --check reo.js` — all green. **SW VERSION `.71 → .72`** (bumped
once in the site-touching commit). **NOT browser-exercised** (no headless
browser): the lang stamping + switch-back are logic/syntax-verified only — worth
a VoiceOver/TalkBack pass at 390 px before launch.

🎯 **Owner option outstanding:** a fluent-speaker review of the 9 flagged strings
before the public push. This pass raises the floor; it is **not** a reo sign-off.
Branch pushed, **not merged**. Commits: a11y+reo mechanics (+sw bump), docs close.

## 2026-07-23 — Pick along a route (Theme 2, wt: faves-wave6-along-route)

Built the ROADMAP's recorded recommendation for **Pick along a route** —
"grab dinner on the drive home" — as (a) an offline least-detour sort + (b) a
routed maps handoff. A live routed corridor stays **✗** (routing API =
external/keyed/paid → offline/zero-dep wall, same as live drive-time); deferred,
not refused. ADR **0014**.

**(a) Maths (`site/js/route.js`, pure/tested).** Detour cost =
`dist(o,v)+dist(v,d)−dist(o,d)` (haversine, clamped ≥0) — the ROADMAP's
preferred added-distance cost: ~0 on the line, honestly positive behind-origin /
past-destination / off-to-the-side, where perpendicular-to-segment misleads.
Multi-location venues resolve their **best branch for the trip** (least detour,
not nearest to origin). `rankByDetour` **leads with detour**, availability
secondary (headline-metric-leads, matching the just-landed "Nearest first" key
order); favourites tiebreak only (no off-route boost); recipes pinned,
stubs/coordless sink. `areaCentroids` gives suburb destinations from data we hold.

**Destination input call:** a **suburb centroid** or a **specific place**, both
from existing coords — **no geocoder** (that's an online API) and **no persisted
"Home" preset** (a new personal-location surface; the Near-me origin stays
ephemeral). Both rejections recorded in the ADR.

**(b) Handoff (`geo.routeMapsUrlFor`).** Waypoint reality checked, not assumed:
**Google `/maps/dir/?api=1` honours `waypoints=`** → real origin→venue→dest road
route (Android/desktop); **Apple Maps' URL scheme has no waypoint param** → it
honestly routes to the venue. Per-card "🧭 Route via maps" action.

**UI.** A list-toggle beside "Near me" arms the mode + reveals a dismissible
destination `<select>`; the two share one origin as mutually exclusive sort
modes. 44px targets, labelled controls, live-region status announces the mode +
the straight-line caveat. Draft te reo chrome added (safety boundary respected).

**Verified:** `validate.py`, `check_no_deps`, `gen_sbom --check`, `node --test`
(**262 pass**, +23 route cases: on-line ≈0, behind-origin, past-destination,
branch resolution, sort composition, waypoint reality), `node --check app.js`;
served locally (new controls + route.js + CSS present, 200). **SW VERSION
`.72 → .73`** (bumped once, site-touching commit; route.js precached). **NOT
browser-exercised** (no headless browser): the geolocation flow, detour cards and
maps handoff are logic/unit-verified only — worth a device pass at 390px.

🎯 **Owner call outstanding:** none blocking. Two things to flag if you want them
different — (1) route-off drops back to plain Near me (origin persists), not full
off; (2) suburb destinations use the centroid of that suburb's venues, so a
one-venue suburb centres on that venue. Branch pushed, **not merged**.

Commits: route maths+tests+handoff; home wiring+sw bump; docs close (ADR 0014).

## 2026-07-23 — Split precache versioning (wt: faves-wave7-split-versioning) — Opus 4.8

Owner idea (ROADMAP, 2026-07-22): separate versions for app vs data vs config so
a change to one refetches only that part. `sw.js` had a single `VERSION` naming
one precache — a data-only menu edit re-downloaded the whole app shell.

**Shipped (ADR 0015).** Two constants in `sw.js`: `SHELL_VERSION`
(html/css/js/icons/webmanifest) and `DATA_VERSION` (index.json + restaurant
JSON), each naming its own cache (`faves-shell-*`, `faves-data-*`; img cache
unchanged, version-free). New `ensureCache()` skips an already-complete cache on
install, so bumping one constant rebuilds only that cache — "download only what
changed". A `__cache_ready__` sentinel (written last) guards against skipping a
half-built cache from an interrupted install. Activate keeps exactly the three
current caches and cleans the pre-split single cache, building new before
deleting old so offline never breaks. Preserved: network-first data, cache-first
shell (ignoreSearch deep links), capped image cache, offline-after-first-visit.

**Config axis call:** mapped to shell — `site.webmanifest` changes in lockstep
with the shell it describes; `index.json` is *data* (it lists which restaurants
exist). No third cache; the seam generalises to N if a real runtime-config
artefact ever appears. Reasoned in ADR 0015.

**Lockstep rule rewritten** in CLAUDE.md, README, CONTRIBUTING, ARCHITECTURE:
data-only change under `site/data/` → bump `DATA_VERSION`; any other `site/`
change → `SHELL_VERSION`; both → both. `validate.py` gained a best-effort,
build-never-failing warning when `site/data` is dirty but `sw.js` isn't (shells
out to `git status --porcelain`, silently skips if not a checkout). New
`tests/sw-versioning.test.js` guards the split's static shape (sw.js is
browser-API code node can't execute).

**Verified:** validate.py / check_no_deps / gen_sbom --check / node --test (266
pass, +4 sw-versioning) all green; `node --check site/sw.js`; served locally and
curled sw.js + index.json + a restaurant JSON + all three shells (200, JSON
parses). Warning path confirmed: data-only dirty tree with clean sw.js fires it,
clean tree doesn't. **SW `VERSION .73 → SHELL_VERSION/DATA_VERSION 2026-07-23.74`**
(successors; installed phones update once onto the split model). **NOT
browser-exercised:** install-time skip, activate cleanup and the upgrade path are
logic-reasoned only — device pass needed (steps in ADR 0015).

🎯 **Owner:** nothing blocking. The payoff (a data edit not refetching the shell)
is only *observable* on a device — ADR 0015 has the DevTools steps. Branch pushed,
**not merged**.

⚠️ **Queued (out of this lane):** atelier doctrine has drifted past the pinned
`9e7e031` (CLAUDE.md) — several commits since. Reconciling + bumping the pin is a
separate task; flagged, not actioned here.

Commits: sw split + docs + test + validate guard (ADR 0015); records close.

- **2026-07-22 (Fable orchestrator + Opus build agents: the seven-wave
  queue run)**: First orchestrated queue run on faves — Fable orchestrating
  (claims, merges, verification, deploys), sequential Opus agents building in
  worktrees (sequential because every wave touches `sw.js`'s lockstep VERSION;
  parallel waves would conflict). Per-item close throughout: claim `[~]` on
  main → worktree → build → verify → merge --no-ff → full suite on main →
  push (= deploy) → worktree/branch deleted. Shipped: **wave 0** atelier pin
  d371169→9e7e031 + floor-block refresh; **wave 1** maps directions handoff +
  ~drive-time hint (ADR 0010) + Cook-at-Home grid position; **wave 2**
  multi-location schema (ADR 0011) + the owner's nearest-first sort bug (root
  cause: key order, not text compare) + serve.py --help; **wave 3**
  device-local profiles (ADR 0012); **wave 4** per-profile 1–3 ratings +
  dormant curated schema (ADR 0013, ⚑ ratification owed); **wave 5** reo
  wording review ran (0 macron fixes, 9 flags for a fluent speaker, real
  lang-of-parts a11y fix); **wave 6** pick-along-a-route (ADR 0014);
  **wave 7** split shell/data SW versioning (ADR 0015, owner's idea same-day).
  Tests 176→266, all invariants green after every merge, SW `.67`→`.74`
  (split). Owner's two mid-run notes captured raw and actioned/queued same
  session. Post-run harvest: seven ✅ blocks → ROADMAP-DONE (367→316 lines).
  ⚠️ Common caveat across waves: agents had no headless browser — DOM/AT
  behaviour is logic/serve-verified only; a real-device pass on profiles,
  ratings, along-route and the SW upgrade is the standing owner acceptance.
  ⚠️ Atelier drifted again mid-run (its own orchestrated run + a queue-run
  doctrine cold pass, cycle open on a MAJOR) — pin left at 9e7e031
  deliberately; next session's drift check picks it up. Remaining queue is
  owner-gated (decisions/intake) except personal tag overrides `[M]`, left
  for a fresh session on economics.

- **2026-07-23 (Opus build agent: two owner rulings applied)**: Applied the two
  `[~]` rulings from the 2026-07-23 owner Q&A (wt faves-wave8-rulings-apply).
  **(1) Address tap → pin, not directions** (ADR 0016, supersedes ADR 0010 part
  a; part b's "~N min" hint stands): tapping a venue's address now opens a map
  pin targeting the **street address string** — `apple maps.apple.com/?q=<addr>`,
  `google maps/search/?api=1&query=<addr>` — so Maps geocodes the exact spot.
  Root cause of the owner's "148 Cuba St opens on Garrett St" report: the old <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
  handoff targeted stored lat/lng, and R & S Satay's dev-time coords sit ~100 m
  off. Coords are now a belt-and-braces fallback only. The along-route "🧭 Route
  via maps" handoff keeps its routed form but its venue leg targets the address
  too (`9dad5f8`). **(2) "Nearest first" = pure distance** (`9a4ed78`):
  `ranking.js` origin branch leads on raw distance → availability tiebreak →
  curated; a heart keeps its ♥ badge but earns no distance pull. Default
  no-location order unchanged (hearts float via favTie). ⚠️ Consequence: the
  `favBoostKm` settings dial is now inert for ordering — queued follow-on
  (repurpose/retire) added to ROADMAP. ROADMAP travel-time idea kept + refined
  (`[M]`, mode-aware walk/drive `~` estimate near address/hours or in the collect
  dialog, no routing API). Tests 266→272 (geo pin + route-via cases reworked;
  ranking boost tests replaced with the ruling's regressions); validate,
  check_no_deps, gen_sbom --check all green; served + curled changed pages.
  SHELL_VERSION `.74`→`.75` (data unchanged, DATA_VERSION held). ⚠️ No headless
  browser — logic/serve-verified only; a real-device tap-through of the address
  pin + Nearest-first stays owner acceptance. Branch pushed, not merged.

- **2026-07-22 (Fable orchestrator, addendum: owner Q&A + wave 8)**: Worked
  the run's open decisions with the owner one by one. Rulings: Nearest-first
  goes pure distance (hearts badge-only there); per-profile language ratified;
  ratings UX "needs more work" — direction provisional, design session queued;
  directions-on-tap backed out to a pin **at the street address** after the
  owner hit the R & S wrong-street bug (coords ~100 m off → ADR 0016
  supersedes 0010(a); coordinate audit queued). Owner's refined want captured
  raw: in-app travel time (walk-aware) beside address/hours or in the collect
  dialog — new Theme 2 item. Wave 8 applied both rulings (272 tests green,
  SHELL `.75`, deployed). favBoostKm dial now inert for ordering — flagged
  `[S]` to repurpose or retire. All claims resolved, worktrees/branches
  removed, tree clean at close.

- **2026-07-23 (roadmap: cross-device sync design + records)**: Owner asked
  whether iCloud/similar could sync a person's prefs across devices without
  standing up backend infra (flagged as a likely future enhancement). Verdict
  captured: no web app can reach iCloud/CloudKit, and web storage is never
  OS-synced, so infra-free options are all *manual transfer*. Landed a design
  with the owner over Q&A: **v1** = shareable-link seed (reuse `share-codec.js`
  + `favourites.merge()`, no infra); **v2** = continual bidirectional sync via a
  Cloudflare Worker + KV holding **one E2E-encrypted blob per user**, keyed by a
  machine-generated **bearer sync-code** (QR *or* word-code), **no accounts**,
  writes **debounced 5–30 s**, merge client-side. Owner steers recorded: willing
  to soften the ethos to allow a **serverless backend** (accounts *not* adopted —
  the sync-code carries it), and the hard requirement that **no one but the user
  (not Cloudflare, not the owner) can decrypt** off-device data. Cost verified
  against Cloudflare's live pricing: **≈ $0** on the free tier (1k writes/day is
  the only tight limit; debounce keeps it clear), $5/mo soft floor if it outgrows
  free. Records written: **ADR 0017** (full deliberation + rejected alts +
  honest on-device-encryption limit), decisions README index line, **ROADMAP
  Theme 9** + the "no backend" note updated to gated-open, and ADR 0012's
  "sync out of scope / needs a signed-in app" stance struck through as
  superseded. Docs-only session — no `site/` change, so no SW version bump and
  no CHANGELOG entry. ⚠️ v2 build is **owner-gated** (first standing backend);
  a pre-build audit should check what Theme 9 subsumes (profiles cross-device
  dimension, shortlist-link codec overlap, Theme 6's retired identity/sync role).

- **2026-07-23 (addendum: sync claim mechanism — passkey+PRF)**: Owner asked
  whether an existing Google/Apple account would remove the need for the
  word-code/QR. Refined the ADR 0017 decision (addendum, not a rewrite): claim
  is **pluggable over the one E2E store**. The sync-code did two jobs (claim +
  E2E key); OIDC "Sign in with" does only claim and supplies no encryption
  secret → rejected under the no-decrypt requirement. **Passkey + WebAuthn PRF**
  preferred: identity + a PRF-derived on-device E2E key the server never sees,
  platform-synced via iCloud Keychain / Google Password Manager — rides the
  user's Apple/Google with no OAuth app, no Apple Developer fee, no email/PII.
  Verified Q1 2026: Safari 18+/Chrome/Android ✅, Firefox ✗ → **bearer sync-code
  stays the universal fallback**. Build shape: E2E blob store claim-agnostic
  first, passkey+PRF headline, code fallback. Updated ADR 0017 (addendum),
  decisions README, ROADMAP Theme 9. Docs-only.

- **2026-07-23 (live-UI defect sweep + ratings redesign + McDonald's)**: Owner
  fired a stream of live-site defects/asks; shipped incrementally, each pushed
  (= deployed). **Fixes:** (1) app-wide search deep-link now scrolls to the dish
  on arrival — the browser's native fragment scroll fired before the async menu
  rendered, so we jump to it ourselves after render (two rAFs for --toolbar-h);
  (2) back-to-top enlarged (52px, 60px past 34rem) — was dwarfed on desktop; (3)
  Favourites row in the ⋯ menu stayed legible on hover/press — the generic hover
  recoloured only the background, stranding accent-ink text on a pale tint
  (both themes); (4) profile add/delete panels given a **card** radius (--radius)
  not a **pill** (--radius-chip 999px), which had crowded content against the
  edges. **Features:** **ADR 0018** — Settings → "Maps app" (Apple/Google/Waze/
  Auto), since the web can't read the OS default-maps-app; `geo.resolveMapsTarget`
  + Waze provider, per-profile. **ADR 0019** — ratings reworked **1–3 three
  buttons → 1–5 tap/drag star slider** (`role="slider"`, full keyboard,
  aria-valuetext + live region), **moved under the dish/venue name** clear of the
  ♥; supersedes ADR 0013's scale + control shape; `validate.py`/`ARCHITECTURE`
  1..5; old marks valid, no migration; curated still dormant; browser-verified at
  390px. **Data:** added **McDonald's** as a two-branch multi-location stub
  (ADR 0011) — Courtenay Place + Lambton Quay, real addresses/phones from web
  search, no fabricated menu/coords; headless-verified both branches render.
  SW versions bumped per change (SHELL …76→81, DATA …74→75); CHANGELOG updated.
  **Deferred (owner-ratified, next session):** "along a route" → **free-text
  destination via an online geocoder (Nominatim)** folded into the search bar —
  relaxes the offline invariant, so it needs its own ADR + a **CSP connect-src**
  allowance (new trust surface); recorded in ROADMAP Theme 2. Verify at close:
  `node --test` 278 pass, `validate.py` 28 files valid, `check_no_deps.py` holds;
  tree clean, all commits pushed.

- **2026-07-23 (backend follow-on: cross-person sharing + terminology)**: Owner
  weighed what a backend unlocks for third-party sharing. Rulings: (1) **Scenario
  1** (send picks to a family order) does **not** justify a backend — ADR 0009's
  link already does the async job; live rooms are a later polish. (2) **Scenario
  2** (ongoing, revocable sharing of a scoped slice of someone's personal layer)
  **is** the real payoff — recorded as new **ROADMAP Theme 10**, owner-gated, its
  own ADR when built. Owner steers captured: sharing is **opt-in per-scope**
  (favourites / dietary / allergens as separate toggles); **allergen-safety
  framing is load-bearing** (informational, confirm with the person — health
  data, safety not cosmetic); two ⚑ owner calls stand (share health-adjacent data
  at all vs push to the Theme 6 health app; default scope). Crypto note: E2E
  sharing = key-sharing (per-user keypair + envelope wrap; revocation
  forward-only) → **Theme 9 should carry a keypair from the start** so sharing is
  a smaller step. (3) Terminology fix (owner): once passkeys ship, **stop saying
  "no accounts"** — a passkey reads as an account; state what's not collected
  instead → **ADR 0017 Addendum 2**, with a lockstep to revisit the About line
  (`about-ui.js`) when passkey sync lands. Records: ADR 0017 Addendum 2,
  decisions README, ROADMAP Themes 9 (terminology bullet) + 10. Docs-only.

- **2026-07-23 (Theme 10 owner rulings + framing)**: Owner resolved both Theme 10
  ⚑ calls. (a) **Share health-adjacent data across people? Yes — on explicit
  opt-in consent** per scope; so dietary/allergen sharing lives in Faves (not
  deferred to the Theme 6 health app), gated on consent + the load-bearing safety
  framing. (b) **Default shared scope = favourites**; dietary + allergens are
  opt-in additions, off by default. Theme 10 still needs its own ADR when built
  (crypto model, consent UX, revocation). Also captured the owner's framing as a
  Theme 9 through-line: the backend moves Faves from **device-centric to
  user-centric** — data belongs to the person and follows them across devices,
  and with consent to people they choose. Docs-only. (Parallel session live —
  pulled before editing, pushed immediately.)

- **2026-07-23 (live-UI sweep, cont.: reposition, ratings re-reject, McD, ADR
  0020)**: Continuation of the live-feedback stream (the "live-UI defect sweep"
  entry earlier covers batch 1). Shipped: (1) **back-to-top repositioned** — on a
  wide laptop it sat in the far viewport corner, out of eye line; anchored its
  right edge to the `.wrap` content column (`max(space-3, 50vw − 30rem +
  space-3)`) so it hugs the list/menu, pinning to the gutter on narrow screens;
  (2) **Settings "Maps app" moved below Distance** (owner pref); (3) **McDonald's
  → 5 branches** — added Bunny Street, Johnsonville, Porirua (real addresses/
  phones from web search; still a stub, coords omitted). Design/records: (4)
  **Ratings v3 reopened** — owner reviewed the shipped 1–5 slider (ADR 0019) and
  **rejected it too**; declined to pick a v3 paradigm (plain stars / emoji faces
  / number pills floated) and **parked** the choice as a ROADMAP redesign; the
  slider **stays live** meanwhile (no revert asked — flagged open). (5) **ADR
  0020 — favourite/rating reference integrity** (proposed, build deferred): owner
  asked how a favourited/shared dish/venue is handled when missing on open
  (removed vs stale-cache). Recorded the honest design — never silently drop,
  never claim "removed" without an online recheck (indistinguishable locally) —
  **coordinated with ADR 0017 (sync) + Theme 10 (sharing)** so the merge/refresh
  UX is built once. (6) **Decisions README hygiene** — indexed the previously-
  unlisted ADRs 0015, 0018, 0019, 0020 (index now matches files, no gaps).
  CHANGELOG topped up (favourites-hover + profile-panel fixes, back-to-top
  reposition). SW SHELL bumped through .82, DATA .76. **⚠️ Parallel session live
  throughout** — every commit was `pull --rebase` before + push immediately + an
  ADR-number collision guard; no collisions, linear history alongside the other
  session's Theme 10 / ADR 0017 work. **Open questions surfaced to the owner at
  close** (interim ratings slider keep vs remove; deep-link scroll instant vs
  smooth; McDonald's stub depth). Verify at close: `node --test` 278 pass,
  `validate.py` 28 files valid, `check_no_deps.py` holds; tree clean, all pushed.

- **2026-07-23 (close-out: owner Q&A answers actioned + two forward inputs)**:
  Worked the three open questions from the close review. (1) Interim ratings —
  **keep the slider live** (no change). (2) Deep-link scroll — **smooth** (with
  reduced-motion fallback); shipped in `menu.js` `scrollToHash`. (3) McDonald's —
  owner escalated to "**flesh out fully**", then gave a menu source
  (mcdonalds.com/nz) and two calls: **include self-hosted photos, accepting the
  copyright/IP risk on the public site** (informed owner decision, on record),
  and **items now with prices "varies"** (per-store, so null — no fabrication).
  Shipped the **enduring NZ menu** (Burgers / Chicken & Fish / Sides / Breakfast /
  McCafé / Desserts; LTO promos omitted; allergen tags omitted = "not stated"
  safety floor); status stub → **menu-complete** (card links, "coming soon" chip
  gone, no-JS fallback `<li>` relinked, lockstep). Remaining McDonald's work
  (geocode 5 branches for Near-me; self-host the photos per the accepted IP call;
  allergen tags; price source) recorded as a Theme 2 content task. **Forward
  input — ratings as a 4th shareable scope** (with favourites/dietary/allergens):
  belongs to **Theme 10 (cross-person sharing)**, which the **parallel session is
  actively editing** — so *not* edited here to avoid clobbering; flagged for that
  workstream. Note: **ADR 0020 already treats ratings** as first-class for
  reference integrity, and ADR 0013's "no sharing" line will need revisiting when
  Theme 10 adds rating-sharing. SW SHELL → .84, DATA → .77. Parallel-session
  discipline held throughout (rebase-before-push, collision-guarded). Verify:
  `node --test` 278 pass, `validate.py` 28 files valid; tree clean, all pushed.

- **2026-07-23 (McDonald's menu, branch cap, menu-page ⋯; then queue-and-close)**:
  More live feedback, worked then wound down at owner's request. **Shipped:**
  (1) **McDonald's menu** — enduring NZ items across 6 sections, `price: null`
  ("varies", not published per-store; no fabrication), status stub →
  menu-complete (+ relinked no-JS fallback). (2) **Multi-location branch cap**
  (`locations.branchesToShow`, 5 tests) — show the **2 nearest within favBoostKm**
  (repurposing that inert dial), rest behind "Show all N branches"; graceful
  fallback to first-two when there are no coords/location. (3) **⋯ app menu on the
  restaurant page** (`menu.topbar` + `initChrome`): Favourites (→ `index.html#faves`,
  new handler in `app.js`), Share, About. **Settings deliberately omitted** — it
  changes allergen prefs `menu.js` reads once at render (safety). **Owner
  confirmed in a fresh browser: the ⋯ menu and the smooth deep-link scroll both
  work.** **⚑ LEARNING (cost real time):** the service worker makes `shift+cmd+r`
  *insufficient* to see changes — only a **fresh browser / full PWA relaunch**
  busts it; and **headless Chrome reuses a persistent default profile with a
  stale SW** unless you pass a fresh `--user-data-dir` (screenshots were
  unreliable until then — proven by a debug style that never appeared). See
  [[faves-headless-testing]]. **Queued for the next session (owner: "queue all,
  new session"):** (a) **McDonald's geocode** → makes the branch cap show the
  actual 2 *nearest* sorted closest-first (today it shows town branches for lack
  of coords) + Near-me; (b) **self-host McDonald's photos** (owner accepted the
  IP risk); (c) **branches aside scrolls with the menu** — drop `position:sticky`
  on `.menu-aside` (drafted + reverted per "queue it"); (d) **Settings on the
  menu page** — owner wants it; needs the allergen-reactivity wiring first. All
  in ROADMAP Theme 2 / owner-rulings. SW SHELL → .86. Parallel-session discipline
  held. Verify: `node --test` 283 pass, `validate.py` 28 files valid,
  `check_no_deps.py`, SBOM; tree clean, all pushed.

- **2026-07-23 (orchestrated queue run — worktree `faves-queue-1053`)**: An Opus
  session orchestrating build agents (Sonnet for mechanical, Opus for
  design/safety) off the ROADMAP queue; four items claimed on `main` first (so
  parallel sessions saw the claim), built in an isolated worktree, integrated by
  pushing `HEAD:main`. **Doctrine:** atelier method docs had moved 20 commits;
  read-only drift audit → bumped the pin `9e7e031`→`4f637b0` and updated the
  inlined floor (apex gains *adaptation*; a pushed close must cite the pushed CI
  result — `RECORD.md`; `MODEL-ECONOMICS.md`→`ECONOMICS.md`) — `b3571e5`.
  **Shipped:** (1) branches aside **scrolls with the menu** (dropped
  `position:sticky`, `0917249`); (2) **favBoostKm dial relabelled** "Show
  branches within" (storage key untouched, `e65632a`); (3) **mode-aware travel
  hint** by the pickup address — walk <2 km @ 5 km/h / drive ≥2 km, origin-gated,
  no routing API — **ADR 0021** (`7dc6a42`, `distance.js` `travelHint`); (4)
  **Settings on the menu page** with **live allergen/dietary re-apply** — the
  safety-reactivity wiring was the task: two per-dish safety predicates extracted
  to a shared unit-tested `dietary.js` that BOTH the first paint and the reactive
  re-apply call (can't diverge), re-render on `settings.subscribe` + profile
  switch, mirroring home (`399604e`). **⚑ Safety:** an independent adversarial
  review (free, plan-model) found a **severe race** — the profile switcher was
  interactive before the menu loaded and before the store-reload wired, so
  switching during "Loading…" could bake in the *wrong person's* allergen filter.
  **Fixed** (`152fedf`): `reloadProfileStores` with `settings.reload()`
  contractually last, subscribers registered early in `initChrome`, `reapply`
  guarded until the restaurant is set; unit test pins the reload ordering. Also
  fixed a pre-existing recipe-page cross-tab gap. Review record →
  `docs/reviews/2026-07-23-1127-menu-settings-allergen-safety-review.md`.
  **Floor:** the `floor` CI workflow was **inherited-red** — a structural
  leakscan hit on a raw email in ROADMAP Theme 8 (added `a3a7577`, 2026-07-12);
  de-spelled it (`66935b9`), floor now green. **Verify (pushed result, per the
  new RECORD rule): CI ✅ and floor ✅ both green on `66935b9`**; `node --test`
  301 pass, `validate.py` 28 valid, `check_no_deps`, SBOM green. SW SHELL
  `.86`→`.91`; DATA untouched. **Concurrency:** one build agent briefly
  stray-wrote to the main checkout, self-reverted; main tree verified clean.
  **⏳ Owner-owed (surfaced at close):** real-device confirmation of the live
  allergen re-highlight (SW hides it headlessly — the one true safety gate before
  trusting it in prod); the menu-page settings-change **full re-render** resets an
  in-progress search/scroll/dietary-chip toggle (accept?); ratings v3 direction;
  free-text geocoder go/no-go (trust surface, its own ADR); `security.txt`
  contact; and a **publish-readiness flag** — local-term leakscan (owner's machine
  only, invisible to CI) finds a child's first name in a pre-existing test fixture
  (`tests/profiles.test.js`, from `5dfda33`) — the concrete form of Theme 8's
  family-texture call. CHANGELOG Unreleased has accumulated duplicate section
  headers across many sessions — flagged for a release-time consolidation, not
  hand-reflowed mid-run.

- **2026-07-28 (family-texture review — Fable session)**: The queued Theme 8
  pre-public gate (owner ruling 2026-07-24), run as scoped review work per
  MODEL-ECONOMICS (Fable reviews; findings, not rewrites). Claimed on `main`
  first (`03afa73`). **Method:** full-tree `leakscan --require-terms`
  (structural + the owner's local term list) + word-boundary sweep of
  household names, age markers, and address shapes across every tracked file.
  **Result:** 44 whole-word family-name instances in four classes — approved
  recipe attributions; test fixtures (incl. the leakscan-flagged name at
  `tests/profiles.test.js:162`, the review's trigger); doc/comment examples
  (one in shipped `cart.js`); and two **non-family** first-name attributions
  ("Shane's Ribs", "Jesse's Garlic Chicken Thighs") that sit *outside* the
  written 2026-07-06 exception. Nothing else found: no other household names,
  no ages/birthdays/personal addresses; `intake/` payloads untracked. Record
  → `docs/reviews/2026-07-28-1138-family-texture-review.md`. ⏳ **Owner-owed:**
  four rulings queued in the record (non-family attributions, fixture rename,
  live-doc examples, history stance — history rewrite recommended *against*);
  fixes after ruling = one small Opus session. **⚑ Flagged, not done here:**
  atelier doctrine has moved ~21 commits past pin `4f637b0` (floor/records
  work incl. a secretscan fragment-match fix) — queue a drift audit + pin
  bump for an Opus session; out of scope for a billed review. Verify: floor
  hook green on both commits; pushed CI result cited at close.

- **2026-07-29 (roadmap: recipes as personal content — Theme 11)**: Owner
  steer captured — Cook at Home should stop publishing *all* 24 curated
  recipes to everyone; recipes should also live in the private personal layer
  and be shared like favourites/ratings/dietary/allergens (Themes 9/10),
  while still publishing *some* publicly. New **Theme 11** in `ROADMAP.md`
  with the four asks split by dependency: **11a** per-recipe hide `[S]` (no
  backend, no schema, severable — ships alone); **11b** own-recipe CRUD
  `[L][schema][design]` (local-first, never enters the repo, export/import
  from day one); **11c** per-item sharing `[M]`; **11d** family shared set
  `[L]` ⚑; **11e** which of the 24 stay public ⚑. **The load-bearing
  finding:** this is Faves' first *user-authored content* — everything in the
  personal layer today is small state pointing at repo data, so recipe bodies
  hit storage, the ADR 0017 sync blob, the Theme 10 grant model and the
  editor UI at once. Two grant-model gaps stated plainly rather than assumed
  covered: sharing recipes needs **per-item** grants (Theme 10 is per-scope),
  and a family set is **multi-writer** (Theme 10 is read-only one-way).
  Cross-refs added both ways. 🚩 **11e is coupled to the pending
  family-texture rulings** (Theme 8): moving the non-family attributions
  ("Shane's Ribs", "Jesse's ...") private is a *third* option beside
  keep/rename — flagged in both places so they aren't ruled independently.
  Docs-only; gates run anyway (validate ✅ 28 files, no-deps ✅, SBOM ✅).
  **⚑ Still flagged, still not done:** atelier pin `4f637b0` is now ~21+
  commits stale — the drift audit + pin bump remains queued.
  🛑 **New finding — the `floor` CI workflow has been red since 2026-07-25**
  and it is *not* this change: five consecutive failures starting at
  `aabb762` ("call atelier's scanner floor instead of copying it"). Cause is
  structural, not a content defect — **leakscan is enforced on the CI plane
  but CI has no local term list**, so it cannot guarantee cover and blocks
  (today's message: "cover not guaranteed — the ci plane does not pass
  `--require-terms`"; the 2026-07-28 run failed the same way with the older
  wording, "no local term list found ... 86 finding(s)"). The same commit
  passes leakscan *locally*, where the owner's term list is present, so the
  content is clean either way. **Not fixed here** — deciding how CI gets
  cover (ship a term list, downgrade the CI plane to advisory, or take
  atelier's newer answer) belongs with the queued drift audit, and the
  `CI` workflow itself is green (`30433814355`).

- **2026-08-06 (atelier pin bump + go-public gap dig — Fable session)**: The
  queued drift audit ran: ~250 atelier commits since `4f637b0` read at the
  publication-relevant surface, pin bumped to `33a540a` (owner-directed).
  Doctrine deltas taken: apex now carries a Zeroth (humanity) law — the
  inlined floor's Laws line updated; GUARDS.md (allowances must be narrow,
  noisy, reasoned); C1 — advisory floor declarations require a reason and a
  review-by date, so `.atelier-floor.json` migrated off the bare-list form
  (datescan 3 / wrapscan 4 / spellscan 14 standing findings recorded as the
  debt, review-by 2026-09-15). **Go-public picture refreshed in Theme 8**:
  the estate has a proven flip procedure (rpi ADR 0009, flipped
  2026-07-29); faves inherits two open atelier gates (P5 platform-settings
  checklist, owed before the ros/faves flip; P6 estate-internal-context
  ADR, drafted, owner ruling owed) on top of the four pending
  family-texture rulings (+11e). Scanner evidence at HEAD: publishscan 0,
  secretscan 0, licenscan Apache-2.0 agreed; full-tree leakscan 104 —
  bulk is restaurant business data (the product) wanting a scoped
  reasoned allowance, remainder is the already-inventoried family-texture
  set. Floor CI still red (atelier P4 owns the fix); must be green before
  flip. Verify: floor hook green on all commits; pushed CI cited at close
  (floor expected red — pre-existing, recorded).

- **2026-08-06 (family-texture rulings — ruled and applied, gate closed)**:
  Owner walked through the review's four questions and ruled: Shane/Jesse
  attributions **keep, with their OK** (owner holds it; 11e's move-private
  option offered, not taken); test-fixture rename **approved**; live
  texture **neutralise all live docs**; history stance **no rewrite**.
  Fixes applied same sitting — code by a delegated Opus session per
  MODEL-ECONOMICS (`ea4ccde` tests: Ruth→Alex, Booth→Sam, flagged
  name→Jo, derived strings included; `5830081` cart.js/route.js comment
  rewords + SHELL_VERSION `2026-07-23.91`→`.92`), docs by this session
  (CHANGELOG share examples, ROADMAP Theme-10 example → Alex). **One
  deviation, recorded in the review**: the suburb word could not stay in
  route.js's comment — term-list hits are marker-non-exemptible (atelier
  D1) — so the comment keeps the concept, not the name. **New finding
  queued in Theme 8**: the suburb is product content *and* a term-list
  entry; existing venue-data/index.html lines are grandfathered until the
  next edit touches one, then block with no hatch — the leakscan
  disposition pass must carve the scoped fix, owner's call. Full-tree
  leakscan 104→101. Gates: node --test 301 pass, validate 28 files,
  no-deps, SBOM check, floor hook green on every commit. Theme 8 step 3
  is closed; next in sequence: PAT refresh, branch protection, upstream
  P4/P5/P6.

- **2026-08-06 (go-public readiness — Opus session)**: Took the repo from
  "publishable but sequenced" to "one owner sitting away". The four queued
  pre-flip questions were put to the owner and all four ruled: **full
  history** (fresh public root costed and declined), **records publish
  as-is** with the PAT made historical by rotation, **leakscan disposed by
  scoped allowance + term-list narrowing**, and scope held to faves-side
  with the upstream gates flagged rather than taken.
  Work landed: **leakscan 101 → 0** (`.leakscanignore` × 4 reasoned globs
  over `site/data/*` and three venue-mirroring test files = 32 files, plus
  18 per-line markers on prose quoting an address as a worked example);
  the **suburb trap settled** by dropping `"Churton Park"` from the
  machine-local term list — a public suburb name and product content, while
  the street-level terms that actually pinpoint the house stay.
  🔎 **The find of the session**: the floor *tightens* on a public repo, so
  the 21 datescan/wrapscan/spellscan findings declared advisory with a
  **2026-09-15** review-by were not deferred debt — they were a flip blocker
  dated *after* the intended flip. All 21 cleared (only one, a "yesterday" in
  a 2026-07-09 entry, was a genuine dating slip; five "tonight"s are the
  product's own vocabulary and took reasoned markers).
  `.atelier-floor.json` is now the licence declaration alone, twelve checks
  enforced and green.
  🔎 **Second find**: the roadmap's step 2, "branch protection before
  visibility", **cannot be done** — GitHub refuses branch protection,
  fork-PR approval and secret scanning on a private free-plan repo. So flip
  and harden must be one sitting; superseded in-place and sequenced in the
  new [GO-PUBLIC.md](GO-PUBLIC.md).
  Deliverables: **[ADR 0022](decisions/0022-publish-safety-review.md)** (six
  rpi-template gates + two this repo needed: floor-fully-enforced, and the
  platform-settings audit that is this repo's instance of atelier P5) and
  **GO-PUBLIC.md** (12 ordered steps). Gate 3 evidence: **979 blobs across
  236 commits** extracted and scanned — secretscan clean; leakscan's only
  non-venue findings are the owner's own work email (34) and household first
  names in superseded test fixtures (4), both recorded as accepted residual
  risks with the fact in the owner's hand. Also written: `SECURITY.md`, a
  public-facing README, and one reconnaissance fix (`tools/deploy.py`
  docstring naming a private sibling tool + the estate's network vendor).
  Checked in passing: `intake/` is correctly gitignored — its 47 recipe
  files are untracked and were never committed. Noted, not fixed: spellscan
  skips fenced code blocks, so it missed an `artifact` in README's layout
  diagram (found by eye).
  🎉 **The floor CI went green at `8ba6218`** — first time since 2026-07-25,
  and not something this session set out to fix. Same shape as rpi 0009's
  side-effect resolution: CI carries no term list, so it only ever ran the
  structural rules, and it was blocking on the ~86 structural findings in the
  venue data; the `.leakscanignore` took those to zero, leaving nothing to
  block on. ⚠️ **Not a fix of atelier P4** — CI still prints "cover not
  guaranteed" and still cannot catch a term-list-only leak, which is a real
  residual once every push is publication.
  🛑 **One thing now blocks the flip**, and it is estate-side: the PAT
  rotation + credential-root hardening (the records name AWS/Google/TrueNAS
  as *queued*, and publishing that while it is still true is a live
  disclosure rather than a historical one).
  Verified: leakscan/secretscan/publishscan/licenscan/datescan/wrapscan/
  spellscan/linkscan/reviewscan/harvestscan/pointerscan clean; node --test
  301 pass; validate 28 files; no-deps; SBOM check; floor hook green on
  every commit; pushed CI cited at close.

- **2026-08-08 (data export shipped + a menu refresh — Opus 5 session)**: Two
  owner asks, plus a live bug found on the way.
  **Roadmap first, then built it.** The owner asked for "save/export all data
  to a machine readable file… absolutely anything that the user provides",
  under the menu or settings. Wrote it up as **Theme 12** (12a export / 12b
  import / 12c the shared seam), the owner said go, and 12a + 12c shipped the
  same day. `site/js/personal-data.js` collects the whole personal layer from
  the **device** storage rather than the live per-profile singletons — those
  only see whoever is active, and a backup holding one person's data while
  three share the phone would look like a backup and not be one. Settings
  gains a "Your data" section under the profile switcher (ruled there, since
  the export covers every profile in that list). Output is a versioned
  envelope, not a raw localStorage dump, pretty-printed with ids *and* names.
  🔎 **The location exclusion had a hole, caught by its own test**: the
  catch-all sweep for unknown `faves.*` keys would have re-collected
  `faves.origin.v1` the moment it appeared in localStorage, quietly defeating
  the "we never export your whereabouts" promise. Excluded keys now seed the
  sweep's skip-set. **Import (12b) was deliberately not built** — merge-vs-
  replace, colliding profile ids across devices, and overwriting someone's
  allergen prefs are open design calls, and a speculative applier answers them
  silently.
  🛑 **Second find, and the more serious one: menus were broken offline.**
  `js/dietary.js` shipped 2026-07-23 and was never added to `sw.js`'s SHELL
  precache list; `cacheFirst()` has no offline fallback on a miss, so opening a
  menu in flight mode could fail outright — a live breach of the
  offline-capable hard constraint, found only because this change touched the
  same list. Fixed, and the list is now **checked against `site/js/`** by test
  rather than maintained by memory.
  **Menu refresh**: Takeaway @ Churton rebuilt from the printed menu the owner
  dropped into `intake/` — 184 items replacing 2019 prices (Wonton Soup $10.50
  → $17.50). Prices were read from **cropped enlargements per column**, because
  the leader dots slant in the photo and the burger column misreads by one row
  at full frame. Captured the shop's **order numbers** (`code`) for the first
  time — it takes phone orders by number. Tags were carried forward by exact
  name, never re-derived: 175 of 184 inherited, 9 new items tagged only where
  the class already was.
  ⏳ **Owner to eyeball** on a real phone: the "Your data" placement/wording at
  390 px, and the refreshed Churton menu. ⚠️ Two things flagged not fixed: the
  record's **shellfish tagging is internally inconsistent** (Battered Mussel
  and Calamari Ring are tagged, Prawn Cutlet and Crab Stick are not — pre-
  existing, and expanding it is a data-sourcing call, not a transcription one),
  and **satay dishes carry no peanut tag** anywhere because no menu states it,
  which is the "no tag = not stated" rule working as designed but worth an
  owner ruling given a household nut allergy.
  Verified: node --test **320 pass** (18 new for the collector, 1 precache
  guard); validate 28 files; no-deps; SBOM check; floor hook green on every
  commit; the export **browser-verified end-to-end over CDP** in headless
  Chrome with a fresh `--user-data-dir` — real button click, real file on disk,
  both profiles present, seeded coordinates absent from the bytes.

- **2026-08-07/08 (Gold Lining menu from photos — Opus session)**: Owner
  photographed the printed BRUNCH and DRINK cards plus the cabinet, bakery,
  slice and blackboard displays in-store; transcribed to a full record.
  `gold-lining-cafe` stub → **menu-complete**, 106 items over 14 sections,
  `verified` 2026-08-07, `priceBand` `$$`. Lockstep held both ways: first
  commit bumped DATA *and* SHELL (the no-JS fallback card in `index.html`
  was promoted from "Menu coming soon" to a real link with a Cafe chip);
  the follow-up correction bumped DATA only.
  **Allergen tagging was kept deliberately sparse** — tagged only where the
  card states it or the dish name makes it unambiguous, because "no tag"
  means *not stated*, never *free of* (ARCHITECTURE's tag vocabulary rule).
  So Winter Porridge carries `contains-nuts`/`contains-peanuts` (almond and
  Pic's peanut butter are named on the card) and the PB/Snicker cups carry
  `contains-peanuts`, while the other raw-vegan cups carry nothing despite
  raw-vegan slices commonly being cashew-based — inferring "safe" is the one
  error class that can actually hurt someone.
  Owner then confirmed the two uncertain reads (Double Choc Cookie $5.50 GF;
  Chicken Croissant → **Chicken & Brie** Croissant $14.50 — the guessed name
  was right, the price read off the neighbouring card was not) and added
  Bliss Balls (vegan + GF) and the Huskee keep cups as a Merchandise section.
  **Judgement recorded on the bliss-ball jar label** ("cashew, almonds,
  matcha, apricot, dates, chocolate, chia, coconut, sunflower"): owner
  unsure whether flavours or ingredients, stored as ingredients because that
  reading holds either way — if they are flavour variants then cashew and
  almond are two of them, so the jar contains tree nuts on both readings.
  Splits into one item per flavour later with nothing undone.
  **Left unrecorded on purpose** (no invention): the Falafel Wrap price
  (label behind the cabinet frame), the Bliss Balls price (no card in shot),
  and the juice fridge entirely (no legible prices, one brand only partly
  readable). Also still open for this venue: `picks` is empty, and the
  brunch card's 7.30am–2.30pm window sits inside the record's 07:30–15:30
  weekday hours — left alone as a service window, flagged to the owner.
  ⚑ **Concurrency note**: a parallel session landed five commits mid-work
  (data export, offline precache fix, Churton refresh). It had committed and
  pushed cleanly, so there was no collision — this session rebased onto it
  and bumped cache versions from the *current* values, not its own stale
  ones. Test count moved 301 → 320 underneath.
  🚩 **Consequence for the flip**: ADR 0022's gate evidence was taken at
  `0243e9c` and is now stale. Not a defect — GO-PUBLIC.md step 3 re-runs
  every gate on the exact tree that flips. Do not flip on the old numbers.
  Verified: validate 28 files; node --test 320 pass; no-deps; floor hook
  green on every commit.

- **2026-08-08 (Sushi Bi, TJ Katsu and Subway — Opus session)**: Owner asked
  for three additions. Two came in menu-complete, one as a stub, and the
  split was decided by what each venue actually publishes.
  **Sushi Bi** turned out to run a live Shopify storefront, so its 37 pieces
  and platters came from the shop's own product feed with real prices and the
  venue's own dietary tags (`Gluten Free` → `gf`, `vegetarian` → `v`). Three
  CBD stores: Woodward Street, Willis Street and the Railway Station one.
  **TJ Katsu**: 23 dishes across Entrees / Main dishes / Bento from the
  venue's own full-menu page, and all seven branches with per-branch hours.
  **Subway**: stub, five branches (Johnsonville, Tawa, Karori, Courtenay
  Place, Mulgrave Street).
  **Hours and phones deliberately left unstated for Subway.** No first-party
  source was reachable — `subway.co.nz` serves a broken TLS certificate
  (cert altnames are Akamai's, not the domain's) and its find-a-store page is
  JS-driven off an unreachable API. Every remaining source is a third-party
  directory, and they contradict each other: Johnsonville alone gave three
  different weekday closes across four aggregators. `hours: null` is the
  honest record. Website points at `https://www.subway.com/en-nz`, which is
  the only Subway NZ URL that passes TLS validation.
  **Coordinates** geocoded from OSM Nominatim (`countrycodes=nz`, 1 req/sec).
  Two branches ship with no pin at all — the TJ Katsu airport counter and the
  Mulgrave Street Subway — because Nominatim returned only road segments
  there, and ARCHITECTURE's rule is that a wrong pin is worse than none (an
  absent pair just searches by text). `validate.py` warns on both, as designed.
  **Allergen tagging kept sparse**, same discipline as the Gold Lining pass:
  tagged only where the source states it or the dish name makes it
  unambiguous. So prawn and scallop dishes carry `contains-shellfish` and
  cream-cheese rolls carry `contains-dairy`, but the kanikama (surimi) items
  carry nothing — surimi is fish-based and the venue never states a crab
  content. On TJ Katsu, `v` went only on the four vegetable entrees, **not**
  on the tofu mains: those are served with miso soup, which is commonly made
  with bonito dashi, so `v` there would have been an inference that could be
  wrong.
  **Judgement recorded — Sushi Bi's price band.** Its menu is priced per
  piece (~$1.80–$2.50), so `price.js`'s median made the card read "about $2
  per person". Set a curated `priceBand: "$"` **and** `pricePerPerson: 12`
  (about six pieces, a normal grab-and-go lunch); the band alone was not
  enough, because the code only suppresses a derived figure when it
  *contradicts* the band, and $2 agrees with "$". The 12 is our call, not the
  venue's — flagged to the owner.
  **Judgement recorded — a closed day inferred from an omission.** Sushi Bi's
  hours block enumerates Monday to Saturday (Saturday "temporally closed"
  [sic]) and stops; three TJ Katsu branches enumerate Monday to Friday and
  stop. `hours` must be a full week, so the unlisted days were recorded as
  closed rather than dropping the whole week to `null`. That reads an
  omission from a bounded enumeration as "closed" — defensible, but it is a
  reading, not a statement.
  ⚑ **Neither menu is owner-verified**: both were taken from the venues' own
  sites today, so `verified` stays `null` on both. TJ Katsu's site is
  visibly stale — copyright ©2017, and its own "Lunch Special" nav link
  404s — so its prices are the weaker of the two.
  🚩 **Also unrecorded, no field for it**: TJ Katsu's menu page states the
  full menu is only available at the Manners Street branch and both Courtenay
  Place branches — the other four carry a subset. The schema has no per-branch
  menu scoping, so this is written down here and nowhere else.
  Verified: validate 31 files (15 warnings, 2 of them the deliberate missing
  pins); node --test 320 pass; no-deps; SBOM check; floor hook green; all
  three screens exercised in headless Chrome at mobile width, including the
  corrected "$12 per person" header, Subway's "menu coming soon" state and
  the home list at 31 places.

- **2026-08-08 (allergen tag sweep — Opus 5 session, wt: faves-allergen-tagging)**:
  The owner ruled on the two safety flags raised when the Churton menu landed,
  and both turned out to be fleet-wide rather than one record's problem.
  🛑 **Satay carried no peanut tag unless a menu printed the words "peanut
  sauce".** KK Malaysian, Thai Tara and Hell Pizza did, so theirs was tagged;
  R & S, Churton and KC Cafe didn't, so theirs wasn't. The app already
  asserted "satay = peanut" — inconsistently, decided by how verbose a
  menu-writer was — which meant a peanut-allergic reader browsing a venue
  *called* Satay Noodle House saw no warning on any of its 10 satay dishes.
  **Shellfish tagging was inconsistent inside single records** (Battered
  Mussel tagged, Prawn Cutlet not) across 8 venues.
  **100 tags applied**, in two tiers kept distinct by
  [ADR 0024](decisions/0024-derived-allergen-tags.md): **64 STATED** (the menu
  names the ingredient — including **oyster sauce**, oyster extract and a
  widely missed exposure) and **36 DERIVED** from a closed, enumerated rule set
  (satay → peanut, unnamed "seafood" → shellfish, laksa → shellfish). A dish
  the venue calls vegetarian stands the derived *shellfish* rules down; satay
  is exempt from that carve-out, because "Vegetarian Satay" is exactly the dish
  someone would assume is safe.
  🔎 **The dry run earned its keep twice.** "Add chicken, halloumi, prawns or
  beef +$7" is a paid extra, not an ingredient — it would have flagged four
  Sprig + Fern dishes containing no shellfish at all. And the first apply
  round-tripped the JSON, reformatting hand-maintained files and turning 100
  tags into a 3,400-line diff; reverted and rewritten to patch the tags arrays
  in the raw text (99 insertions instead).
  **The UI copy changed in the same commit** — it said "We only show what
  venues told us", which the derived tier makes false. Shipping derived tags
  under the old wording would have been the quiet kind of dishonesty.
  `tools/tag_allergens.py` is re-runnable, additive-only (a venue correction
  always wins) and now warns from `validate.py`, because this gap was created
  by hand-tagging record by record.
  ⚑ **Deferred, recorded as ADR 0024's rejected alternative**: a `may-contain`
  tier showing readers *which* tier a tag came from. Right in principle;
  touches the vocabulary, the render and the avoid-matching, all
  safety-critical.
  🚩 **Concurrency**: a live session held uncommitted work in `settings-ui.js`,
  `data.js`, `app.css` and a new `temporal.js` (ADR 0023), so this ran in a
  worktree off `origin/main` and landed as a fast-forward. It touches
  `settings-ui.js` in one place — the allergen disclosure string — which that
  session is rewriting; whoever rebases must keep the new wording.
  Verified: semantic diff vs HEAD proves only tags changed and none were
  removed (0 files differ beyond tags, 100 added); the new validate warning
  fires when a tag is removed; validate 31 files; node --test 320 pass;
  no-deps; SBOM; floor green; CI green at `963fe9c`; live site serving
  DATA .82 with all 10 R & S satay dishes tagged.
- **2026-08-08 (the time dimension lands — Opus 5 session)**: Owner is adding a
  rule to atelier that all data must carry a time dimension, and asked for faves
  to be updated to it — venue lifecycle dates, seasonal menus, dish and
  ingredient changes, and dated prices, with the explicit constraint that **the
  dinner-choosing UX must not change**. Atelier had moved that morning
  (`c9c177a`, PRINCIPLES §9), and §9's own generalised case is *this repo* —
  "a curated venue guide in the fleet… cannot say when a venue opened, when it
  entered the guide, or tell a refit from a permanent closure". Doctrine pin
  bumped `33a540a → 5ef28ae` and the drift base with it.
  **Shape** (ADR 0023): four optional JSON primitives — temporal value
  (a scalar *or* a dated series, on `price`/`address`/`phone`), `lifecycle`
  (dated transitions, `added` required), `available` (window and/or recurring NZ
  season, on a section or a dish), `revisions` (dated log of what changed) — plus
  one pure resolver, `site/js/temporal.js`, called from `data.js`. Everything
  downstream (`price.js`, `menu.js`, `cart.js`, search, ranking) still reads
  `item.price` as a number and never learns time exists. Records with no dates
  resolve to themselves, so all 31 files stayed valid through the change.
  **The design decision that mattered: two clocks.** World time (`from`, `to`,
  `date`, `opened`) vs record time (`recorded`, `offBy`, `added`, `verified`).
  We almost never learn *when a price rose* — only *when we read the new menu* —
  so an entry takes effect on `from` when known and `recorded` otherwise. Without
  that fallback essentially none of our real history is recordable. Dates also
  accept reduced precision (`"2019"`, `"2019-05"`), because the Churton scan
  carries no finer date and rounding it to 1 January would invent evidence;
  comparisons widen a partial to its full interval.
  **Retrofit — git mined, but not blindly.** Across every restaurant file's
  whole history there are exactly **two** commits that changed a price.
  Churton (`c2dc20b`, landed by another session hours earlier) is a genuine
  refresh — a 2019 scan replaced by the 2026-08-08 printed menu — so 174 dishes
  gained a two-entry series (median rise **50%**, mean 54%, range 16–120%).
  Gold Lining (`1ae3d9e`) is a Double Choc Cookie going `null → $5.50`, which is
  a **correction, not a price change**; recording it as a series would have
  fabricated a rise, so it stays a bare number. That distinction is why this was
  not a scripted sweep of the git log: a commit diff is evidence about *our
  record*, and only reading *why* the commit happened tells you whether the
  *world* changed.
  **Two catches in the Churton data.** Its refresh had renamed two dishes
  ("Calamari Ring" → "Calamari Ring (each)", "Griddled" → "Grilled Chicken &
  Bacon Wrap"); matched naively they'd have read as *dropped in 2026* — a false
  claim about the world — so both carry their 2019 price forward. And the five
  dishes that refresh genuinely deleted were **restored** with
  `available.offBy: "2026-08-08"`: a hard delete destroys every date attached to
  a thing including that it ever existed, which is exactly §9's clause and
  exactly what had already happened here.
  `lifecycle.added` mined from each file's adding commit for all 31 venues —
  record time, known exactly. **`opened` left absent everywhere**: we have never
  established when any of these businesses started trading, and absent means
  that, where a guess would not.
  **The one UI change, deliberately.** A closure gets a badge on the card, a
  banner on the menu header, and `ranking.js` treats a closed venue as
  unavailable whatever its posted hours say (`closure-ui.js`, reusing
  `.hours-badge`; three te reo strings drafted against maoridictionary.co.nz per
  the owner's nominated source). Everything else about time resolves invisibly.
  Reasoning: a stale price costs a dollar, a closed venue costs a trip across
  town — hiding *that* would make the app quietly wrong rather than quietly
  simple.
  **Payload — the number that matters is the compressed one.** On disk the
  corpus went 209 KB → 252 KB and Churton 30 KB → 72 KB, which looks alarming;
  gzipped it is **34.0 KB → 35.1 KB (+1.1 KB, +3%)**, because a dated series is
  intensely repetitive and that is precisely what a compressor eats. First visit
  stays ~161 KB gzipped against a 300 KB budget.
  🔎 **The browser pass caught what 358 passing tests did not.** `resolveRecord`
  was *imported* into `data.js` and never *called* — and the comment above the
  seam confidently described it running. Every temporal.js unit test still
  passed, because they test the resolver, not whether anything invokes it. The
  app meanwhile computed Churton's price band from a menu whose prices were raw
  dated arrays: `pricedItems` skips non-numbers, so it quietly took the median
  of the ten *new* dishes and produced "$$ ~$19pp" — a wrong figure that looked
  completely plausible on the card. Nothing would have flagged it.
  `tests/data-loader.test.js` now covers the seam (stubbed `fetch`), and was
  confirmed to fail 4/5 when the resolver is unwired again.
  **Second browser find: a stub that closes for good.** A `stub` card takes a
  different render path that never appended the hours badge, so a permanently
  closed stub read **"Menu coming soon"** — a promise about a place that will
  never serve again. Stubs now render a closure badge (and only a closure
  badge — `hoursBadge`'s third argument), and the "coming soon" chip is
  suppressed when the venue is permanently closed.
  Both were found by putting a closure on two real records as a temporary
  fixture (Gold Lining temporarily closed, Kaffee Eis permanently), rendering,
  then removing the fixture — the corpus itself has no closed venue.
  ⚠ **Still unseen:** no venue or dish in the corpus uses a **season**, so the
  seasonal path has unit tests but has never rendered. The permanent-closure
  card badge was DOM-verified rather than eyeballed; its colour token
  (`--warn`) is used elsewhere, and the temporary one (`--amber`) is the same
  token the "Closing soon" badge already proves on screen.
  🎯 **Owner calls queued** (ROADMAP Theme 13): where an upcoming price change
  should appear, what shape the price-trend view takes (with the honesty
  constraint that two readings seven years apart are two points, not a trend),
  and whether to start filling `opened` as content work.
  Verified: validate.py 31 files valid (15 warnings, all pre-existing); the new
  validator checks adversarially tested against 18 malformed cases (17 caught,
  the 18th confirmed caught end-to-end via `check_restaurant`); node --test
  **363 pass, 0 fail** (+33 in `tests/temporal.test.js`, +5 in
  `tests/data-loader.test.js`); the repo's own precache guard caught both new
  modules before they shipped unreachable offline; no-deps and SBOM checks
  green; home screen and a menu screen rendered in headless Chrome at 390 px
  with all four card states confirmed in the DOM (trading, closing-soon,
  temporarily closed, permanently closed) and the menu-header closure banner
  seen; every non-Churton data file confirmed to differ by exactly the
  three-line lifecycle block; resolver proven to reproduce the
  pre-change Churton menu **exactly** — 184 items, zero price mismatches — while
  the same record resolved at 2019-06-01 returns the old prices and the five
  retired dishes.
  🔎 **A concurrent session landed mid-work, and the auto-merge was quietly
  wrong.** The allergen-tag sweep (`963fe9c`) pushed to `main` while this was
  building, touching Churton — the one file this session had restructured
  end-to-end. Git resolved `sw.js` **without a conflict**, because both sessions
  had independently bumped `.97/.81 → .98/.82`: identical text, so nothing to
  conflict on, and this session's new shell and data would have shipped under a
  version string installed phones had already cached from their deploy — exactly
  the stale-cache failure the lockstep rule exists to prevent. Caught by reading
  the merged constants rather than trusting the clean merge; bumped to
  `SHELL_VERSION .99` / `DATA_VERSION .83`. **Worth generalising: a version
  counter is the one field where a silent identical-bump merge is a defect, not
  a convenience.**
  Churton itself was resolved by taking *their* tagged file as the base and
  re-applying this session's price transform on top, then re-running their own
  `tools/tag_allergens.py` — which flagged one restored dish (Seafood Fritter →
  `contains-shellfish`) and was applied. Proof the merge lost nothing: resolving
  the merged record at 2026-08-08 reproduces their 184 items with **identical
  price, tags and code on every one**.
  🚩 **Their commit also carries `tools/__pycache__/tag_allergens.cpython-314.pyc`** <!-- pathscan:allow: historical — the artefact was present in that commit at the time this was written, since removed -->
  — a build artefact that should not be in the tree. Left alone (not this
  session's commit to rewrite); worth a `.gitignore` line and a `git rm --cached`.

## 2026-08-08 — Settings: index + panels (wt: faves-settings-ia) — Opus 5

**Ask:** "The Settings UI is getting cluttered. Find a better experience for
users." Open brief — no prescribed shape.

**Measured before designing.** At 390 px the sheet's content was **1578 px tall
with 31 controls**. A screenshot showed it cut off partway through "Your
dietary needs": the allergen chips, both distance dials, the maps app and the
reset were all past the fold, unsignposted, and the allergen list was clamped
behind "Show all 8" so *one* of eight was visible. So the complaint wasn't
aesthetics — the safety-critical controls were the ones you couldn't see.

**Built:** an index of six topic rows drilling into single-topic panels
(ADR 0025 has the deliberation and the rejected alternatives). Each row's
subtitle is that setting's current value, so the state reads off the first
screen. Profile switcher stays on the index (one-tap hand-off) and moves into
the People panel when it opens. Reset moved into "Your data" with an inline
confirm — on a one-screen index a bare reset button sits one stray tap from
clearing someone's flagged allergens; on the old scroll, being buried *was* its
safety rail. After: index **552 px, fits one screen**; panels 174–441 px, all
fitting. `collapsible()` and its resize-measure machinery deleted.

🛑 **Moved to a worktree mid-session, correctly.** `node --test` failed on an
untracked `site/js/temporal.js`; `git status` showed modified restaurant JSONs,
`data.js`, `app.js` and `ranking.js` that this session never touched — positive
proof of a live concurrent session, against a tree that was clean at start.
Saved my three files as a patch, restored them in the primary tree, took
`/Users/mike/worktrees/faves-settings-ia`, reapplied. 320/320 passed there. The
`temporal.js` failure was theirs, not mine.

🔎 **Two bugs the browser caught that reading wouldn't have.**
- `translate()` caches an element's English text the first time it sees a
  `data-i18n`, so the one retitled `<h2>` could not carry a key — every panel
  after the first would have reverted to "Settings". `renderTitle()` does its
  own `t()` lookup. It also has to run on a **microtask**: `app.js` registers
  `initSettingsUI` before `initReo`, so when our settings subscriber fires, reo
  still holds the *old* language. Verified live — switching to te reo retitles
  the open panel to "Te Reo" and the index to "Ngā Tautuhinga", with `lang="mi"`
  marked per part.
- **Escape-steps-back was built, measured, and removed.** It needs
  `preventDefault()` on `cancel`, and Chrome's close-watcher only honours that
  while the page holds close-request budget. Six drill-in → Escape cycles with
  real `Input.dispatchMouseEvent` clicks and identical timing: **stepped back
  four times, force-closed twice**, no learnable pattern. Two-times-in-three is
  worse than never pretending, so Escape closes the sheet like every other
  dialog and the always-visible `‹` is the back affordance.

⚠️ **Test bugs, not app bugs, twice — worth recording so the next session
doesn't re-chase them.** The first driver seeded `{active, people}` when the
registry is `{v, activeId, profiles}`, so every summary read as defaults. The
second scoped `.profile-confirm` document-wide when **two** panels own one
(People's delete, Your data's reset) and the hidden one sorts first — clicks
landed at (0,0) and cascaded into eight false failures. Panel-scoped selectors
(`.settings-panel:not([hidden])`) fixed it.

**Verified:** validate 31 files (15 warnings, pre-existing); `node --test`
320 pass; no-deps; SBOM; a 12-check browser suite at 390 px over CDP — reset
confirm (asks, names the person, cancel is safe, confirm resets only the active
profile), export still writes its file, every visible target ≥44 px, the same
dialog on `restaurant.html` with a live pref change reaching the menu, and a
panel still visible under `prefers-reduced-motion`. Lighthouse mobile:
**a11y 100, best practices 100, SEO 100**; performance 83/84/83 across three
runs against **84 on unmodified main** — no regression. ⚑ That performance
number is the *dev server's* (python `http.server`, no compression, no HTTP/2),
not production, so it is not a reading against CLAUDE.md's ≥95 bar either way.

🔎 **Rebase turned up an ADR-number collision.** Two sessions landed while this
one worked: the allergen tag sweep (0024) and a time-dimension record (0023).
This one had also taken 0023, so it renumbered to **0025** on rebase. Their
`settings-ui.js` edit — the allergen disclosure string, reworded because some
tags are now *derived* rather than venue-stated — was carried into the
restructured file by hand, as their session log asked whoever rebased to do;
the same rewording was applied to this module's header comment.

**Three sessions, two rebases.** The time-dimension work (`temporal.js`,
ADR 0023) landed mid-rebase as well, so this rebased twice. Both took a shell
version this one had already claimed (`.98`, then `.99`), so the shell moved to
a fresh date — **`2026-08-08.1`** — rather than keep chasing a counter three
sessions were incrementing at once; data stays at their `.83`. 🚩 **Records
0023 and 0024 have files but no line in `docs/decisions/README.md`'s index.**
Left for those sessions rather than written on their behalf — but it means the
index reads 0022 → 0025.

⏳ **Left for the owner:** eyeball it on a real phone. The 390 px work is
headless Chrome, which is not a thumb. Also still open from Theme 12a — the
"Your data" placement question it flagged is now answered differently (it's a
row, and reset lives with it), so that check is worth folding into the same
look.

## 2026-08-09 — Five owner roadmap items: feedback, add-ons, wording — Opus 5

Roadmap-only session; no code, no data, no version bumps. Five owner asks
recorded, each checked against the code or data before it was written down
rather than transcribed on trust.

**One was already a theme, parked on a gate that has lapsed.** The feedback ask
is Theme 4c ("request a place, report an update"), parked 2026-07-08 with
"no email — deploy first". The deploy happened 2026-07-12, so the item was
reactivated in place rather than duplicated as a new theme. Widened to the two
streams the owner named — data corrections vs app feedback — and given the
transport comparison: compose-and-share (zero infra, works offline, and for a
family audience the message *is* the channel) recommended over the GitHub-issue
and Pages-function options, both of which cost something the audience doesn't
have. Recorded the safety rule with it: an allergen correction is a suggestion
to the owner, never a live edit.

**Two asks were one feature — now Theme 14.** Dish customisation and menu
add-ons end in the same order line, so they were written as one theme rather
than two. The owner's example checks out verbatim: `sprig-and-fern-tawa.json`
carries `"Add gravy $3."`, `"Add chicken, halloumi, prawns or beef +$7."` and a
brunch-sides section that is an add-on group for eight dishes. So the data is
captured and only the shape is wrong — which makes the content sweep, not the
schema, the bulk of the work.

🔎 **Two things the theme would have got wrong if written from the ask alone.**
(1) **An add-on carries its own allergen tags** — halloumi on a dairy-free dish
makes it not dairy-free, so `dietary.js`'s predicates have to evaluate dish +
selected add-ons or a dish that was safe when you tapped it stops being safe
when you configure it. Written in as shipping *with* the schema, not after it.
(2) **"No tomato" has nothing structured to remove from** — restaurant dishes
have no ingredient lists (only Cook-at-Home recipes do), so the honest v1 is a
free-text note per order line, not a curated component list across 31 venues.

**Theme 15 holds the two UI asks.** The Settings navigation rethink is recorded
with a flag rather than a plan: "accordion sections in one sheet" is ADR 0025's
**first rejected alternative**, on measured grounds (several open sections
rebuild the same 1578 px wall; expanding one shifts everything below it). The
suggestion put on record — expand in place, one row open at a time, keeping the
current-value subtitles — answers that objection while dropping the drill-in.
Flagged that the drill-in landed 2026-08-08 and its 390 px phone look is still
owed, so it should be judged on a thumb before a replacement is commissioned.

The wording sweep found a trap worth naming: the two Distance dials the owner
compared genuinely mean different things — one filters venues by reachability,
the other controls how many branches of a *single* multi-branch venue show
(the repurposed `favBoostKm`). Renaming both to "places" would make them read as
two settings for one job, so the deliverable is a term decision first, then the
sweep. Scope includes `site/js/reo.js`, since the English and te reo strings are
one table and a rename skipping it desyncs the translation silently.

`validate.py` green. Nothing owed but the owner's calls: the transport choice
for feedback (⚑), and whether to reopen ADR 0025.

## 2026-08-09 — Owner round 2: transport ruled, PWA staleness diagnosed, a CSS fix — Opus 5

Follow-on to the same day's roadmap session. One ruling recorded, two themes
added, one bug found and fixed.

**Feedback transport ruled: compose-and-share** (Theme 4c). Recorded with the
two alternatives kept alive rather than struck out — the GitHub-issue path
unblocks when the repo goes public, and the Pages Function is the right front
door once the audience stops being people who can already message the owner.

🔎 **The PWA staleness report was diagnosed, not just filed** (Theme 16), and
the cause is ours. [`sw-register.js`](../site/js/sw-register.js) is nine lines:
it registers on `load` and does nothing else — no `registration.update()`, no
`updatefound` handler, no reload path. A browser only re-fetches `sw.js` on a
navigation (plus a ~24 h background check), and a standalone PWA resumed from
memory performs no navigation. So killing the app is currently the *only* way
to trigger a check, which is exactly the owner's workaround.

**The half that would have been missed:** even after the new worker installs,
`sw.js` already calls `skipWaiting()` + `clients.claim()`, so it takes control
immediately — but nothing reloads the page that is already on screen. "Check
for an update" and "show the new version" are two separate fixes; shipping only
the first would change nothing visible and would have read as the fix not
working. Both are written up, along with the version-skew risk `skipWaiting()`
carries once updates start landing mid-session.

**Bug fixed: the menu-page back-link was double-inset.** `.menu-topbar` is a
`.wrap` (already inset by `--space-3`) and `.skip` added the same inset again,
because `.skip` also serves `recipe.html`, where it sits *outside* a wrap. Only
`padding-bottom` was being reset. Measured over CDP at 390 px, before → after:
back-link `32 → 16`, ⋯ button `32 → 16`, against page content at `16`
throughout. The owner reported the left one; the right was the same fault and
went with it. `SHELL_VERSION` → `2026-08-09.1` (CSS is shell); data untouched.

**Home-screen filter split** recorded as Theme 15c. The merge is sound — same
job in two places — but the entry names what it costs: the bottom bar is
reachable at any scroll depth and `.list-toggles` is not, so the real decision
is how to keep thumb reach (sticky group, or a collapsing "Filters (2)" sheet),
not where to put the markup. Also flagged that `--bar-h` is referenced in six
places, so removing the bar re-anchors the FAB, back-to-top and order bar.

All gates green (`validate`, `check_no_deps`, `gen_sbom --check`, `node --test`
50 tests). ⏳ **Owner:** the back-link fix wants a glance on the phone — and
since it's a shell bump, foregrounding the PWA *won't* show it until the app is
killed, which is Theme 16 demonstrating itself.

## 2026-08-09 — Recipe themes, the pudding halved, versions on About — Opus 5

Owner round 3. Two themes recorded, two changes built and browser-verified.

**Themes 17 (cook mode) and 18 (units).** The owner's four recipe asks plus a
research pass over current recipe apps. 🔎 **The research changed the order.**
Every app surveyed has converged on a **cook mode** — full-screen, one step at a
time, and `navigator.wakeLock` so the screen never sleeps mid-recipe. That is a
plain Web API, zero-dependency, offline, and it fixes the most annoying thing
about cooking from a phone; it went in as 17d with a note that if only one item
here is built, build that one. It is also the natural host for the owner's
step timers.

🚩 **Two of the owner's asks were recorded with a correction, not as stated.**
(1) **Cooking times must not auto-scale.** He asked for scaling to adjust
timings; bake and cook times are not linear in quantity, and for anything
meat-based an under-scaled time is a food-safety failure. Recorded as a *hint*
plus optionally authored per-scale times. (2) **The timer alarm cannot be
promised in the background.** Once an iPhone locks, a web app has no dependable
way to make a noise — so the timer is paired with the wake lock and the UI has
to be honest rather than silently failing to ring.

🚩 **The blocker on this whole theme is data, not code:** `serves` is set on
**3 of 24** recipes and `time` on **8**. Same shape as the empty `picks`
problem — the features render nothing until the owner supplies the facts.

**Chocolate Self-Saucing Pudding is single again.** The owner had written it up
doubled. Halved throughout — serves 12→6, bake 70→35 min, every quantity, and
the dish 3–4 L→1.5–2 L, which is implied by halving the mixture rather than
something he asked for. Two consequential edits worth flagging: "2 eggs"→"1 egg"
made step 2's "eggs" wrong (now "egg"), and the `desc` literally said "adapted…
to a double mixture", which had become false — now "Doubles well for a crowd",
keeping the fact that doubling works. Rendered and read back at 390 px.

**About now shows both versions**, per the owner's ask. `site/js/versions.js`
reads them from the **service worker's cache names** rather than declaring
constants: a second copy of a version number is a copy that can drift from
`sw.js`, and the honest answer to "have I got the new menus?" is what the device
has actually stored — a stale phone shows the stale stamp, which is the useful
signal (Theme 16). Covered by 9 unit tests including the mid-update case where
two shell caches coexist and `.83` must beat `.9` (numeric, not string,
compare). Verified over CDP end-to-end: fresh profile, SW installed, real click
on the About link, version rows read back — `App 2026-08-09.2` /
`Menus & prices 2026-08-09.1`, matching `caches.keys()`.

🛑 **A concurrent session was found mid-run and its work was left alone.**
Partway through, uncommitted changes appeared that this session did not make:
an allergen-tag sweep (gluten/dairy/egg) across five venue files and
`tools/tag_allergens.py` (+257 lines) — **including tag edits inside
`cook-at-home.json`, the same file this session was editing**. Per CONCURRENCY,
their work was neither absorbed nor worked around: only this session's own hunk
of `cook-at-home.json` was staged (via a filtered patch to the index, leaving
the working tree untouched), alongside files they had not touched.

**Resolved on its own, the right way:** by commit time their changes had left
this tree entirely — they had moved into a locked worktree
(`.claude/worktrees/faves-allergen-inference`, branched at `a2c0cf0`), where <!-- pathscan:allow: historical worktree path — existed when this log entry was written, since removed -->
the sweep has since grown to 15 files. Nothing was lost, and the surgical
staging turned out to be belt-and-braces rather than the rescue it looked like.
🚩 **For that session:** `DATA_VERSION` was bumped to `2026-08-09.1` here for
the pudding, so the allergen sweep needs its own bump on top when it rebases;
`SHELL_VERSION` is at `2026-08-09.2`. Their branch also predates this commit's
edit to `cook-at-home.json`, so expect that one file to conflict — the pudding
block and their tag lines are in different hunks, so it should resolve cleanly.

Gates: `validate.py`, `check_no_deps.py`, `gen_sbom.py --check`, `node --test`
(372 tests, 9 new). ⏳ **Owner:** the About version rows want a glance at 390 px.

- **2026-08-09 (owner reframes the time dimension — addendum to the 2026-08-08
  session above)**: Owner clarified the *purpose*, which changes how the roadmap
  should read even though no code moved. Raw: *"capturing price trends is not the
  core function of this app but its valuable data that can be gathered while we
  do this. As we build up enough data we will consider how we use that both in a
  dedicated section of the UI (e.g. research basis etc) and as useful info to the
  user in the apps main purpose e.g. coffee price changing tomorrow"*. <!-- datescan:allow: verbatim owner quote — the record must not paraphrase what he actually said -->

  **What that settles.** The history is a **by-product of work already being
  done** — every menu refresh is a dated reading — not a feature the app is for.
  So the sequencing is: capture now because it is the one thing that cannot be
  retrofitted; build the surfaces if and when the data earns them. The previous
  Theme 13 wording ("the features that model exists to make possible") had the
  emphasis backwards and was rewritten.
  **Two surfaces, different bars**, now recorded as such: (A) a *dedicated
  section* — research/analysis, opt-in, off the main path, free to be denser;
  (B) *inline in the primary flow* where it changes what you order (the owner's
  "coffee is $6 from tomorrow"), which must earn its pixels against the core job.
  ⚑ Owner's call deliberately deferred: **when there is enough data, and which
  surface first.** Baseline recorded so a future session isn't guessing: **1 of
  31 venues** has more than one price reading (Churton, 174 dishes); **2 of 31**
  carry a `verified` date at all. Not yet, by a distance.
  🔎 **The gap this exposed, and the real work of this addendum.** The by-product
  only accrues if refreshes *append*. Nothing said so anywhere — and the failure
  is not hypothetical: the Churton refresh discarded seven years of prices in one
  commit the day before, recoverable only because git happened to hold them. A
  future refresh would have done it again, and the next one would have had no git
  history to rescue it. Now written in `ARCHITECTURE.md` ("Refreshing a menu" —
  six numbered rules) and in `CLAUDE.md`'s lockstep list where a session actually
  looks before touching menu data. The rule that matters most is the one
  separating a **change** from a **correction**: *did the shop change it, or did
  we?* Recording a correction as a series fabricates a price rise — the exact
  trap the Gold Lining cookie sidestepped by judgement rather than by rule.
  Docs only; no code, no data, no schema change. Verified: validate 31 files
  valid; node --test 372 pass (the count moved from 363 — a concurrent session
  landed more while this was open); no-deps; SBOM; floor green. No SW bump:
  confirmed nothing under `site/` changed.

- **2026-08-09 (allergen inference becomes the default + Churton prose — Opus 5,
  wt: faves-allergen-inference)**: 🎯 **Owner ruling**, verbatim: *"it is
  preferable that we infer information like allergens where the menu writer
  hasn't bothered to define it and we have a high confidence that we are
  correct."* That inverts [ADR 0024](decisions/0024-derived-allergen-tags.md)'s
  narrow exception, so it is **superseded by
  [ADR 0025](decisions/0025-infer-allergens-by-default.md)** rather than amended
  — the burden now falls on *not* tagging.
  **575 tags applied** in two commits. The gap was worse than it looked: before
  this the corpus carried 45 gluten tags, 45 dairy, 18 soy, 17 egg and 1 sesame
  across 1,062 dishes — so the allergen filter was near-useless for five of the
  eight allergens it offers, not because the food was free of them but because
  menu-writers don't mention them.
  **The hard limit, and the whole safety argument**: inference may only ever
  *add* a `contains-*`. Never `gf`/`df`/`v`/`vg`, never a removal. Inferring
  presence is fail-safe; inferring absence asserts safety from a guess.
  🔎 **Three guards, every one earned from a real dry-run false positive** rather
  than imagined: per-rule exclusions ("rice noodles" aren't wheat, "oat milk"
  isn't dairy, "pumpkin pie spice" isn't a pie, a "fish cake" isn't a bakery
  cake); curation outranking a pattern (a `gf` dish never gains
  `contains-gluten`); paid add-ons not counting as ingredients. **"creamy" is
  deliberately unmatched for dairy** — in these cuisines it means coconut cream
  as often as not, and it was tagging every Malaysian laksa and curry.
  🔎 **Second find, caught while verifying a concurrent session's edit had
  survived my rebase**: the audit only read a dish's *name and description*, so
  Cook at Home's `ingredients` lists were invisible — a Chocolate Self-Saucing
  Pudding read as allergen-free despite listing flour, butter and eggs. 33 tags
  across 14 household recipes, 32 of them STATED. Best evidence in the corpus,
  and it had been ignored.
  **Churton prose** (owner steer): six section headings shortened — "Curry on
  Steamed Rice with Vegetables" → "Curry on Rice" — with the detail moved into
  41 dish descriptions that had none. Dish *names* deliberately untouched:
  `cart.js` keys an order line by name and the order sheet shows it without its
  section. Left alone on purpose: "Sweet and Sour Sauce" (item 128 isn't a
  sweet-and-sour dish, so a blanket description would be false) and R & S's
  Malaysian headings — those are dish terms, not clumsy prose. 🎯 R & S's "Chew
  Kua Tew" looks like *char kway teow*; owner to confirm with the shop.
  🚩 **Concurrency cost me a lap.** A second session was live in the primary
  tree; my first apply ran there and wrote tags on top of their in-flight recipe
  edit. Backed out precisely — their edit preserved, my tags removed, verified
  against HEAD — then redone in a worktree. Landing needed a rebase, and their
  commits had bumped `sw.js` to **exactly the version stamps I'd chosen**, which
  would have shipped 542 tag changes that installed phones never refetch. Caught
  by comparing against `origin/main` before pushing.
  Two tool bugs fixed by running it for real: `mcdonalds.json` has no literal
  `tags` arrays, and a positional patch would have written tags onto the **wrong
  dishes** — it now refuses and skips that record instead of aborting the run
  half-written (and no longer counts skipped tags as "applied" in its own
  summary). That record is normalised so it participates.
  ⚑ **Strongest queued follow-up in this area**: a `may-contain` tier showing
  which tier a tag came from. Deferred at 36 derived tags; at 291 it's more
  attractive, and it's the answer if generous flagging ever reads as wallpaper.
  Verified: only tags changed and none removed (semantic diff vs HEAD, 575
  added); re-run reports 0 outstanding; validate 31 files; node --test 372 pass;
  no-deps; SBOM; floor green; CI green at `a516918`.
**Addendum to "Recipe themes, the pudding halved, versions on About" (above) —
a self-audit before close.** The owner asked whether every point from his prompt
was landed. Re-checking each against the repo rather than from memory turned up
three things worth fixing, all now in:

1. 🔎 **The record misrepresented him.** Theme 17a said auto-scaling cooking
   times was "the one part to refuse as specified" — but his ask was *"adjust
   ingredients and **where we can** the timing"*. He had already hedged it; the
   entry now records where the line falls rather than framing it as a refusal.
   Future sessions read this as the record of what was asked, so the fairness of
   the wording is load-bearing.
2. **Two open questions existed only in chat.** The metric/imperial ask was
   *recorded, not built* — now stated as such in Theme 18 with the reason (18b
   is blocked on 17a's structured quantities; **18a is not blocked and can ship
   any time**). And the "all the relevant versions… etc" ask is now closed out
   explicitly as **16e**: the two named stamps shipped, and an audit recorded
   that the only others in the app are internal storage-schema keys, which
   identify a data shape rather than freshness.
3. Nothing else was outstanding: items 1–5 map to 17a/17b/17c/17d+17e, the
   pudding and the About versions shipped and were browser-verified.

🚩 **Found while rebasing onto the allergen-inference session: two ADRs are
numbered 0025.** `0025-settings-index-and-panels.md` (2026-08-08) and
`0025-infer-allergens-by-default.md` (2026-08-09) both exist, and
`docs/decisions/README.md` indexes only the first. A bare "ADR 0025" in prose no
longer identifies a record. **Not fixed here** — renumbering another session's
accepted ADR, and rewriting its inbound references, is that session's call and
it may still be live; this session stayed in its lane and only disambiguated its
*own* bare references in ROADMAP (Themes 15c and 16c now name the file). 🎯 The
renumber and the index entry are owed by whoever owns that record.

- **2026-08-09 (the go-public blocker, challenged and closed — Opus 5)**: Came in
  to execute the "rotate the PAT" blocker another session had named as the one
  thing between faves and public. **It didn't survive contact with the evidence.**
  `github.com/settings/tokens` reports *"No personal access token created"* — no
  classic tokens exist on the account at all, so the `SESSIONS-ARCHIVE.md` line
  recording one as *classic + broad* is already historical, which is precisely
  the condition ADR 0022's "publish the records as-is" ruling needed. Nothing to
  rotate; the prerequisite discharged by evidence rather than action. Owner ruled
  the bundled AWS/Google/TrueNAS half **decoupled** to the estate roadmap: what it
  discloses is content-free (three providers named, no identifiers, endpoints or
  weaknesses), and gating a static menu site on a whole-estate hardening
  programme is disproportionate. Both recorded in
  [ADR 0026](decisions/0026-pat-prerequisite-discharged.md), which amends 0022's
  consequences without touching its accepted analysis.

  **Corrected while there:** ADR 0022 rejected redacting the archived line because
  the text "stays reachable in every clone". That is **false for this repo** —
  private since 2026-07-06, zero forks, and clone traffic shows two unique
  cloners, both the owner's own machines. No third-party clone exists, so a
  rewrite *would* genuinely erase it. The conclusion survives on a different
  reason: **44 commit SHAs are cited across the ADRs, session logs and reviews**,
  and a `filter-repo` strands every one — the same cost that defeated the
  fresh-root option on 2026-08-06. Anyone re-proposing a rewrite must argue
  against that, not the clone claim.

  **Step 3 gates re-run on `f3c9607`** — leakscan `--require-terms`, publishscan,
  licenscan, validate, check_no_deps, gen_sbom `--check` all clean; `node --test`
  372/372. secretscan **exits 0**: its one `tools/deploy.json:3` hit (the
  Cloudflare `account_id`) is advisory output, not a failure, and
  `.atelier-floor.json` enforces only the licence declaration.

  **Gap found and closed:** ADR 0022's full-history evidence was taken at
  `0243e9c`, but HEAD had moved 28 commits. A commit that added-then-removed
  something would be invisible to a HEAD-only scan. Extracted all 176 blobs from
  the `0243e9c..HEAD` delta and scanned them: secretscan clean, and leakscan
  `--require-terms` returned **zero term-list hits** — no family names, no home
  address, nothing personal. Its only findings were venue addresses and phones in
  `takeaway-at-churton.json`, the disposed product-data class (they surfaced only
  because flattening the blobs for extraction defeated the `.leakscanignore` path
  globs). One file was added-then-deleted in the window: a `tag_allergens` `.pyc`.

  🎯 **Left with the owner, not decided here:** (1) confirm the token screenshots
  came from the `mike548141` account — they came from a browser profile labelled
  *Work*, and if that is a different account the central finding doesn't hold;
  (2) whether the Cloudflare **account name + ID** in `tools/deploy.json` should
  publish (not a secret — it is in every dashboard and API URL and authorises
  nothing — but it is a live-account identifier and has never been explicitly
  ruled on); (3) the same for the **credential architecture** described across 6
  files, incl. the keychain item name and exact child-token scopes. No values
  anywhere in any of the three.

- **2026-08-09 (the repo goes public — Opus 5)**: 🎉 **faves is public**:
  <https://github.com/mike548141/faves>. Flipped at `a207a15` on the owner's
  explicit instruction, with steps 5–8 applied in the same sitting and 9–12
  closed out. Full outcome in [GO-PUBLIC.md](GO-PUBLIC.md); ADR 0022 stamped.

  **What cleared the way.** The inherited blocker ("rotate the PAT, confirm the
  credential roots") did not survive checking: there are **no classic tokens on
  the account**, so the archived *classic + broad* line was already historical —
  nothing to rotate ([ADR 0026](decisions/0026-pat-prerequisite-discharged.md)).
  The owner decoupled the AWS/Google/TrueNAS half to the estate roadmap. Gates
  re-run clean on the exact flip tree, and a gap ADR 0022 had left open was
  closed: its full-history evidence was taken at `0243e9c`, 28 commits stale, so
  all 176 blobs in the delta were extracted and scanned — secretscan clean,
  leakscan `--require-terms` **zero term-list hits**.

  **Owner ruling that sharpened the design rule.** Asked whether the Cloudflare
  account id should publish, the owner's answer reframed it: *don't write an
  identifier into the repo if the product doesn't need it* — a **design** rule
  about what goes in, not a publication rule about what comes out. It wasn't
  needed (`resolve_account_id` auto-picks when the token sees one account, which
  a repo-scoped token does), so both keys left `deploy.json` and secretscan went
  from one advisory finding to zero. `DEPLOY.md` also stopped restating the
  keychain item names and mint procedure — CLAUDE.md's *point up, don't
  re-derive* rule already covered that; it now points at the estate root. On the
  same reasoning the owner **reaffirmed full history** knowingly: the design rule
  governs new writes, and a rewrite would strand 35 of 38 cited SHAs across 181
  commits to erase an identifier that authorises nothing.

  🔎 **Two runbook commands were wrong when run** — both corrected in place in
  GO-PUBLIC.md, and worth knowing because one would have been silent:
  1. **Step 6's required status checks were `CI` and `floor`. Neither exists.**
     Contexts match *check-run* names, not workflow names; the real ones are
     `floor / scanner floor`, `menu data validates`, `zero dependencies`,
     `JS unit tests`. As written the ruleset would have waited forever on checks
     that never report, **blocking every push to a repo where a push is the
     deploy**. Caught only by running the runbook's own verification command
     *before* creating the ruleset rather than after, as it was ordered.
  2. **Step 7's `ALL_EXTERNAL_CONTRIBUTORS` is rejected (HTTP 422)** — the API
     values are lower-case. Loud, so it cost nothing.

  Also found: step 8 needs a **second** call (`selected-actions`) to populate the
  allowlist — the documented one only sets the mode, and without the second the
  floor workflow cannot resolve `mike548141/atelier/...`. Verified after: both CI
  and floor ran green on the next push (`b61b2e2`) under the narrowed policy, the
  repo answers 200 unauthenticated, and `security.txt` serves live.

  **Standing obligation, unchanged by the flip:** leakscan's term list is
  machine-local and CI still cannot reproduce it, so CI cannot catch a
  term-list-only leak. The local `--require-terms` run before each push stays
  the real cover — and it matters more now that strangers can read the result.

- **2026-08-09 (four-stream parallel build — Fable 5 orchestrating, Opus 4.8
  building)**: 🚀 **Four roadmap features shipped in one session** via four
  worktree-isolated Opus agents, each Fable-reviewed and merged sequentially:
  **UI-state preservation** across the safety re-render (wt: faves-ui-state —
  `ui-state.js` brackets the untouched `render()`; 23/23 CDP checks, 9/23
  against the old tree; found+fixed the `showModal()` scroll-to-0 and
  smooth-scroll-hijack bugs) · **Units** (wt: faves-units — ADR 0029, km↔mi +
  °C↔°F at render only; 459-string temp-transform audit, exactly 14 rewrites) ·
  **Report a problem** (wt: faves-report — ADR 0028, Theme 4c: ⚑ from dish/venue
  /⋯, owner-ruled compose-and-share, never-a-live-edit; found the `.order-head`
  double-definition) · **Import + transfer** (wt: faves-personal-io — ADR 0030
  *proposed*, Theme 12b + Theme 9 v1 on one `planImport`/`applyPersonalData`
  seam; collision rule widened on evidence — every device's first profile id is
  `default`, so same-name-different-id was the wrong test; QR ceiling measured
  at ~4 favourites → active-profile links). Merged main: **483/483 unit tests,
  device_check 15/15, validate/no-deps/SBOM clean**, SHELL `2026-08-09.9`,
  deploys `a06c8af` → `8b6585e` → `e92db87` → `3bf72b6`.

  **Concurrency, lived:** a parallel session merged Theme 16 + device-check +
  coord-audit into main mid-session (took ADR 0027 → personal-io renumbered to
  0030 in flight); claims in ROADMAP kept the lanes clean; every conflict
  (sw.js × 3, settings-ui, reo, menu, app.css tail, CHANGELOG, ROADMAP, ADR
  README) was both-sides-additive. ⚠️ Two lessons that cost real time:
  `git pull --rebase` **after creating a local merge commit** tries to flatten
  the merge and replays the branch into conflict — fetch + inspect + push (or
  merge origin) instead, keep `pull --rebase` for session start; and two
  sessions' dev servers collided on one port, so one agent's first headless run
  silently verified the *other session's* build — worktree runs need distinct
  ports. Two agents were killed mid-run by transient API 5xx errors; both
  resumed cleanly from a verify-your-worktree-state-first prompt with nothing
  lost. Also fixed: stray `</content></invoke>` tool artefact at the tail of
  ADR 0026 (corruption, not substance).

  ⏳ **For the owner:** ratify ADR 0030 (merge-default/replace-confirm, id+name
  collision rule, allergen keep/theirs/combine, active-profile transfer) and the
  smaller calls — ui-state chip-*delta* rule, 5°F rounding (`OVEN_STEP_F` to
  flip), redundant °F brackets in `cook-at-home.json`, report ⚑ placement/copy —
  plus ~25 new draft reo strings queued for native review (`tahua kai` and
  `hapa` flagged). Real-phone passes owed: import/transfer on iOS, a camera QR
  scan, the report share sheet on a real device.

- **2026-08-09 (three-line queue run — Fable 5 orchestrating, Opus 4.8
  building)**: 🚀 **Theme 16 shipped, the device check exists, and the
  coordinate audit closed with a reversal.** Three claimed lines, each an
  Opus agent in its own worktree, Fable-reviewed and merged serially:
  **PWA updates** (wt: faves-pwa-updates — 16a resume check throttled
  through one gate; 16b "A newer version of Faves is ready" notice, never
  an auto-reload; 16c force-refresh in Settings → Your data, offline is a
  refusal and the personal layer untouchable;
  [ADR 0027](decisions/0027-pwa-update-flow.md) drops the unconditional
  `skipWaiting()` — a new worker holds in `waiting` until the tap) ·
  **device check** (wt: faves-device-check — `tools/device_check.mjs`,
  headless Chrome over raw CDP on Node's own WebSocket, zero npm; 15/15
  assertions incl. a negative control; the live allergen re-highlight is
  now **device-confirmed**, closing the 2026-07-24 ruling) ·
  **coordinate audit** (wt: faves-coord-audit — `tools/audit_coords.py`,
  39 pins vs their own addresses via Nominatim).

  🔎 **The audit's premise was wrong, and that is the finding**: R & S's
  pin is **1 m** from 148 Cuba St — the "~100 m off" was the maps app <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
  reverse-geocoding our pin, which ADR 0016's address-string handoff had
  already fixed. 36/39 pins fine (33 within 2 m), **zero corrected**;
  four McDonald's branches gained house-level coords (Courtenay Place
  honestly left null — road-centreline only). Full method + drift table:
  [reviews/2026-08-09-0207-coordinate-audit.md](reviews/2026-08-09-0207-coordinate-audit.md).

  **Concurrency, lived (the other half of the four-stream session's
  account):** claims at 0153 and 0202 partitioned two live sessions
  cleanly — zero duplicated work. The dirty-tree backstop fired once
  (mid-merge, foreign edits in the primary checkout) and resolved itself
  when the other session committed seconds later. One self-inflicted slip
  caught before push: a hand-resolved CHANGELOG conflict left its
  `<<<<<<<`/`>>>>>>>` markers in place — the floor doesn't scan for
  conflict markers, so the grep-after-resolve habit is load-bearing.
  Merged tree verified whole: 483/483 tests, device_check 15/15,
  validate/no-deps/SBOM/leakscan `--require-terms` clean, SHELL
  `2026-08-09.9` / DATA `2026-08-09.4`.

  ⏳ **For the owner:** (1) this deploy still lands the *old* way on
  installed phones (the old worker has no notice UI) — one last
  kill-and-relaunch, then every later update shows the 16b notice; the
  acceptance case (background the PWA, push a change, foreground it) is
  now testable for real. (2) The private leakscan term list collides with
  a street that ships in `site/data` (a tj-katsu branch) — same shape as
  the settled suburb trap; the audit doc worked around it by aggregating
  the row, but the standing tension is yours to resolve. (3) Queued
  16f: About's stamp can run ahead of the page under a waiting worker.
  (4) Four draft reo strings from the update notice await the reo
  review — `putanga` for software "version" is the shaky one.

  **Addendum (same session, after owner Q&A):** two rulings taken and applied
  on the faves side. (1) **Model economics**: `MODEL-ECONOMICS.md` still
  taught the falsified 2026-07-08 "Fable = usage-billed" split and misled
  this session's own challenge to the owner — corrected against atelier
  decision `2026-07-23-0001` (billing state belongs to the marginal token;
  risk assigns seats; the orchestrator is the owner's per-session choice and
  may build with any model matched to capability and risk). Atelier pin
  bumped `5ef28ae` → `4cab670` after reading both method deltas; the
  PRINCIPLES §9 retrofit ruling names this repo's bare `verified` flag, so
  Theme 13f is queued. (2) **Leakscan terms**: the owner ruled the
  published-business-address class wants **per-term scoped allowances, as
  narrow as possible** (e.g. allow "Churton Park" only against that venue's
  records, still firing anywhere else) — reversing the removal half of the
  2026-08-06 suburb settlement once the mechanism exists, and covering the
  tj-katsu street the same way. **The mechanism is an atelier build**
  (rides atelier's queued C5 term-scoping item) — deliberately *not*
  recorded or built there from this session after the owner's correction
  that faves lives within the doctrine and does not create it. Until it
  lands, docs here keep writing around those two terms.

- **2026-08-09 (Theme 13f — `verified` carries its derivation — Opus 5,
  wt: faves-verified-derivation)**: PRINCIPLES §9's retrofit ruling, applied
  to the flag §9 names. ADR **0031**.
  **The queued framing was challenged and half-rejected, deliberately.** The
  roadmap wanted `verified` to *become* date + method, at a granularity its
  own text pushed toward per-price ("a date alone cannot distinguish an
  owner-confirmed price from a scraper's guess"). Both halves changed:
  🔎 **Granularity stays at the record, and the argument is evidential, not
  economic.** Acquisition here is a *session* act — one person reads one
  source and transcribes a whole menu — so the method belongs to the reading.
  And where a menu genuinely has two readings, this schema **already**
  separates them: they are two price-series entries with their own `recorded`
  dates (ADR 0023). So the finer method got its home there — an optional
  per-entry `method` that inherits the venue's when absent — while the
  primary level stayed the record. Per-price as the primary level would have
  shipped 100% empty under the no-backfill mandate, which §9 itself calls a
  defect ("more dimension than the questions justify").
  🔎 **`verified` did not become an object.** It is read as a bare string in
  four live places (`temporal.js` `defaultRecorded`, `menu.js`, `report.js`,
  `report-ui.js`) on a site installed on phones; an object reaching any
  pre-change renderer prints `[object Object]` into a bug report. A sibling
  **`verifiedBy`** is invisible to old JSON and old JS alike. §9 says
  "alongside", not "nested".
  **The vocabulary was derived from this repo's own records, not invented.**
  `SESSIONS.md` and WORKPLAN batch 3 already state how every menu was
  obtained, and the spread forced the enum: Gold Lining photographed in the
  shop; Churton from a printed menu; KC Cafe a 2015 scan; Thai Tara an
  undated PDF; R & S a board photo with no prices; TJ Katsu and Sushi Bi off
  the venues' own sites; Subway's hours contradicted across four aggregators.
  Six source classes, closed set, never a person: `in-store` · `paper-menu` ·
  `official-site` · `phone` · `delivery-app` · `third-party`. `delivery-app`
  is kept separate from `third-party` because batch 3 drew that line itself
  ("prices from paper menus, **not** delivery apps") and the error there is
  *biased* (markup), not merely stale. No `inferred`/`guess` value — we do
  not store prices we inferred, and adding one would need its own decision.
  **Enforcement**: `validate.py` errors on an off-vocabulary method, a method
  with no date, and `status: "verified"` without both halves (zero records
  affected — nothing has that status). It **warns** on a date with no method,
  which is how "no backfill" and "keep the gap loud" coexist.
  **Applied, twice, from evidence.** Gold Lining → `in-store`, Churton →
  `paper-menu` — the only two records with a `verified` date at all, so the
  warning now fires on nothing. Recording a method the records *state* is not
  backfill; none was invented.
  🚩 **The gap this exposed and did not close (queued 13g, owner call).** The
  "needs a refresh" caveat keys off `!verified`. TJ Katsu and Sushi Bi sit at
  `verified: null` although we know exactly when and how both were read —
  partly *because* setting a date would silently switch off a caveat that is
  right (TJ Katsu's source site is ©2017 with a 404ing nav). That is §9's
  "unknown is not none" still live here: one null meaning both "never read"
  and "read from a source we don't trust". Fixing it needs a stated policy on
  which methods count as a check; an agent picking that threshold would move
  live UI on judgement rather than evidence.
  Verified: `node --test` **491 pass** (483 before; 8 new, 1 existing shape
  assertion updated); validate 31 files, 11 warnings, none about derivation;
  no-deps; SBOM check; `device_check.mjs` 15 pass after the `menu.js` touch;
  and the render browser-checked at 390 px in headless Chrome on a fresh
  `--user-data-dir` — Gold Lining "Read in store, 7 Aug 2026", Churton "Read <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  from a paper menu, 8 Aug 2026", KK Malaysian no line and its caveat intact. <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  ⏳ **ADR number 0031 may collide** with a parallel agent; note that `0025`
  is already duplicated in `docs/decisions/`. Not merged, not pushed —
  the orchestrator integrates.

## 2026-08-09 — Queue run: four items, a stale floor fact, two new guards — Opus 5

Orchestrated session, four worktrees, all merged and put away; branches
deleted, `git worktree list` back to the primary checkout alone. Claims
landed on `main` before any work started and none were left phantom.

**Shipped (each merged, full suite on `main`, pushed = deployed):**
**`.order-head`** (wt: faves-orderhead — the menu screen's label and the
sheet family's header bar shared a class at equal specificity, so every
sheet title rendered uppercase; the outlier became `.order-block-head`)
· **13f `verified` carries its derivation** (wt:
faves-verified-derivation — ADR 0031, written up in its own entry above)
· **16f About's version stamp** (wt: faves-16f-stamp — ADR 0032, the
page asks the controlling worker over a `MessageChannel` instead of
inferring from cache names) · **Theme 15 "Your data" split** (wt:
faves-yourdata — ADR 0033, 1009 px and five actions in one summary split
by data model into 607 px + 449 px).

🔎 **The finding that mattered most was not on the queue.** `CLAUDE.md`'s
doctrine block still read *"PRIVATE for now — a push is not
publication"*. The repo went public at `a207a15` under Theme 8, and
`GO-PUBLIC.md` recorded it — but the floor's own visibility fact was
never updated, and every scanner passed the whole time because **nothing
compared the claim to reality**. That fact decides whether a mistake is
recoverable or is immediate world-readable publication, and therefore
whether a leaked secret can be deleted or must be **rotated**. `CLAUDE.md`
even names the command to check it; no session had run it. Corrected,
then made mechanical: `tools/check_visibility.py` parses the bullet and
compares it, wired into CI where the runner already holds the truth in
`github.event.repository.private` — no token, no API call. Confirmed it
catches the real defect: the old wording parses to `private` against an
actual `public`, exit 1. "Cannot verify" exits 2, never 0. A full-repo
`leakscan --require-terms` and `secretscan` came back clean, so nothing
escaped during the window.

🔎 **A validator's failure mode is silence.** `validate.py` gates all 31
records and CI trusts it; the repo had 483 JS tests and **zero** Python
ones, so no `tools/*.py` gate was exercised at all. Mutation-testing it —
break one real record, assert a non-zero exit — found a hole on the first
run: `price` was type-checked but never **sign**-checked, while
`pricePerPerson` ten lines above it had always required `> 0`, so a
negative price validated clean. Fixed at `>= 0` (a free item is a real
thing a menu can say; `null` already means "no price recorded"). The
durable half is `tools/test_validate.py` — 14 mutations, in CI, this
repo's first Python test. **Self-check that mattered:** deleting the new
sign check must make the harness exit 1, and it does. The first attempt
at that check was wrong — `$?` after a pipeline is `tail`'s status, not
the harness's — and read as a pass. A verification that cannot fail is
not a verification.

**Doctrine.** Pin bumped `4cab670` → `6887118` (26 commits). Two method
deltas: CONCURRENCY gains *work lands in the repo it changes* (queue a
cross-repo finding, never deliver it), and PROPAGATION gains *a child may
add, may not repeat, may not conflict* — grounded, by name, on this
repo's own MODEL-ECONOMICS drift. **No inlined-floor edit was owed**, and
that was checked rather than assumed: the canonical floor region extracts
byte-identical to the pinned version, and both new rules sit outside it,
so inlining them would itself be the forbidden repeat.

🚩 **Our inlined floor is a stamped copy nothing watches.** `stampscan`
reports "no stamped blocks" here — the block is stamped in prose, not in
machine-readable markers. We cannot adopt them yet: they pin a `source=`
path that exists only in atelier, and the child-side, pin-aware
resolution is atelier's open ST3, **already queued in its own roadmap**,
so there was nothing to deliver upstream. Checked by hand instead, and it
holds. Queued here.

🚩 **`pathscan` has gone decorative** — 25 standing warn-only findings
mean nobody reads it, so a real stale path would hide in the noise.
Triaged (queued, not fixed — three worktrees were live in the same docs):
~8 are an upstream defect, reproduced in a clean throwaway repo —
`/.well-known/security.txt` is mangled to `known/security.txt` while
`site/.well-known/sbom.json` passes, so the trigger is the
leading-slash-plus-dot form, not dot-directories at large. ~14 are ours
and genuinely loose. ~3 are correct as written and want allow-markers.

**Concurrency, lived.** ⚠️ **All three parallel agents took ADR `0031`**
off the same `main` — the allocate-at-merge failure mode, three for
three, and `0025` was already duplicated from an earlier instance of it.
Renumbered at merge to 0031/0032/0033; one agent's index entry was
missing entirely and was written at integration. **Every merge conflicted
on `site/sw.js`**, always the version constants: each branch was told a
number that a sibling had already shipped, so `SHELL_VERSION` walked
`.10 → .11 → .12 → .13`, one per deploy. Reusing a number would have
stranded installed phones on stale assets — exactly what the lockstep
rule exists to prevent. A keep-both merge in `ROADMAP-DONE.md` silently
filed one item under the wrong heading; caught by reading the result
rather than trusting the marker-strip. The grep-after-resolve habit fired
clean on every merge.

**Verified at close:** 505/505 tests · `device_check` 15/15 ·
validate · test_validate 14/14 · no-deps · SBOM · visibility · full-repo
leakscan + secretscan. Agent reports were checked, not taken: the "only
two dated records" claim re-derived from the data, the new derivation
rules mutation-tested, `GET_VERSIONS` asked of a real worker in real
headless Chrome, and the Settings split read off a real 390 px index.

🎯 **An open tension this session declined to resolve on its own.** The
newly-pinned CONCURRENCY rule says an auditing session *may* queue a
cross-repo finding in the target repo's own roadmap — "queue, never
deliver". The standing correction recorded in this file on 2026-08-09
says faves lives within the doctrine and does not create it, and that
correction is why the leakscan term-scoping mechanism was deliberately
not written into atelier from here. Those two do not obviously agree on
whether a faves session may write a *finding* (not doctrine) into
atelier's roadmap. It did not bite this run — `stampscan`'s ST3 gap is
already queued upstream, so there was nothing to add — but the `pathscan`
dot-path defect is a live case with nowhere agreed to put it. Surfaced
for the owner rather than resolved by picking a side, per the apex rule
on genuine dilemmas.

⚠️ **Correction, same session (owner caught it).** This session's write-up
of the visibility finding claimed the doctrine block "went stale for three
days". It did not. `main` was at `a207a15` when the repo was flipped —
2026-08-09T01:10:10Z — and the stale bullet was found the same day at
about 07:55Z. **Under seven hours, not three days.** The wrong number
reached `tools/check_visibility.py`'s module docstring and a `ci.yml`
comment (both corrected here) and two commit messages, which stand as
written history.

The cause is worth recording because it is not a typo. **No elapsed time
was ever computed** — the figure was asserted from a feeling of duration,
against evidence this session had already read: Theme 8 says
`DONE 2026-08-09`, and the session's own date was 2026-08-09. The
contradiction was on the page. A model has no sense of elapsed time and
must not narrate one; a duration is arithmetic on two timestamps or it is
not stated at all.

The finding itself survives the correction, and the guard's justification
is now written to match: a seven-hour window is small, and the corpus was
clean throughout (full-repo `leakscan --require-terms` + `secretscan`).
The reason to build the check was never the damage done — it was that
**no mechanism existed**, so nothing would have closed the window at seven
hours rather than seven weeks. That argument never needed the inflated
number, which is what made reaching for one careless rather than merely
wrong.

## 2026-08-09 — Cook mode: one step at a time, screen awake (wt: faves-cook-mode) — Opus 5

Shipped ROADMAP **17d** on its own worktree, branch only — no merge to
`main`. Cook mode is a modal full-screen `<dialog>` over the recipe:
one step at a time, a "Step 3 of 9" counter, 56 px Back/Next with arrow
keys, an ingredients panel that toggles without moving the step index,
and `navigator.wakeLock` holding the screen on. Entry points on the
recipe page and the Cook at Home list, on the 23 of 24 recipes that
carry `steps`. ADR **0034** records the shape and the lifecycle.

**The finding worth keeping: two wake-lock leaks that `node --test`
could not see.** The lifecycle passed 17 unit tests against a fake
`navigator.wakeLock` and still leaked twice in a real headless Chrome.

- **Hiding dropped the reference instead of releasing the lock.** The
  spec says the platform releases on hide, so forgetting the sentinel
  looked correct — and against a fake that models the spec, it is. A
  browser that reports hidden *without* having released leaves a lock
  nothing holds a reference to, and it is then never given back. The
  instrumented run showed it plainly: two requests, one release.
- **Close beating the request in flight.** Open and close inside the
  request's window and the arriving sentinel was stored *after*
  `release()` had already run — held forever, by nobody.

Both now release explicitly, both have tests, and the lesson is the
one the apex rule already states: a fake proves the model you wrote,
not the platform you shipped to. The browser run was 28 assertions in a
throwaway script; the roadmap now carries a 🚩 saying cook mode has no
durable real-browser guard, because `device_check.mjs` is scoped to the
allergen re-apply and widening it is a decision, not a chore.

**Deliberately not built,** so 17a/b/c/e stay clean: scaling, timers,
inline quantities, checklists, TTS. Cook mode is now the host 17b's
timers needed — the roadmap already says the alarm only fires reliably
with the screen awake.

**Also not verified, and said plainly:** that the screen actually stays
on. The lifecycle is proved; the platform behaviour needs an iPhone.
Everything else — 522 `node --test` (505 baseline + 17, then 19 after
the leak fixes), all Python gates, `device_check.mjs` 15/15 — is green.

**Escape closes cook mode outright**, even with ingredients open. Making
it step back a level was not re-litigated: ADR 0025 measured Chrome's
close-watcher force-closing that pattern two times in six on this very
codebase, and a promise the platform keeps most of the time is worse
than none.

## 2026-08-09 — Three-worktree queue run: cook mode, the noun sweep, pathscan (orchestration) — Opus 5

Orchestrating session. Claimed three unclaimed roadmap items, ran each in
its own worktree with its own agent, verified every report against the
tree rather than taking it, and merged all three. Live at
`lets-eat.myspot.nz`; `floor` and `CI` both green on the merge head.

**Shipped:** Theme **17d** cook mode (ADR 0034, its own entry above),
Theme **15b** the one-noun sweep (ADR 0035, detail →
`ROADMAP-DONE.md`), and `pathscan`'s two ours-classes — 34 findings down
to 14, every survivor the upstream `/.well-known` extraction defect.

**🔎 A defect in our own doctrine block, found bumping the pin.** The
drift check in `CLAUDE.md` hard-coded a baseline SHA, `5ef28ae`, that was
never bumped alongside the pin it exists to protect. Measured: the
baseline had fallen **31 commits** behind, so the session-start check
reported 40 commits of which **9** were genuine drift and 31 had already
been read and folded into the pin. A drift check that always fires is a
drift check nobody reads — the same shape as `pathscan` accumulating 25
warn-only findings, and the same shape `floor.py` opens with. The
baseline now derives from the pin itself, so the two cannot diverge.
Pin bumped `6887118` → `5c16a59`; the only doctrine that moved was
`COMMUNICATION.md`, which **withdrew** its claim that write-time
discipline is the only control over prose and shipped `plainscan` to
enforce the machine-decidable half.

**🚩 That arrived here as 1177 findings, and is now queued, not swept.**
Day one, warn-only. The three heaviest files are the two append-only
session logs and the roadmap — so a sweep would mean rewriting history to
please a scanner, which is exactly what this session refused to let the
`pathscan` fix do. Scope is an owner call; queued under "Also parked".

**Agent reports were checked, and one did not survive the check.** The
`pathscan` agent "fixed" two path references inside **accepted ADR 0015**
by rewriting `data/index.json` to `site/data/index.json`. That table
describes **cache contents** — runtime URLs — and `sw.js:100` caches
`data/index.json`; there is no such URL as `site/data/index.json`. The
edit silenced the scanner by making an accepted decision assert something
false, which is precisely the failure the fix existed to prevent.
Reverted and marked with the reason instead. The other eight class-2
edits were read in context and are correct. Its report also said "8
allow-markers" where the tree shows **19** — not wrong work, but a count
worth re-deriving rather than quoting.

**Concurrency, lived — the same two failure modes as the last parallel
run, and both were anticipated this time.** Every branch was told
`SHELL_VERSION` `.14`; `faves-one-noun` merged first and deployed it, so
cook mode was resolved to `.15` at merge. Reusing it would have stranded
installed phones on stale assets. ADR numbers were **allocated by the
orchestrator up front** (0034 to cook mode, 0035 to the noun sweep)
rather than left to the agents — the previous run had all three agents
take `0031` off the same `main`. One conflict, in
`docs/decisions/README.md`, where both agents appended their index entry
to the same spot; resolved keeping both in numeric order.

**Verified at close:** 524/524 `node --test` (505 baseline + 19),
`device_check` 15/15, `validate`, `test_validate` 14/14, `no-deps`,
`SBOM`, `visibility`, and an **independent** headless-Chrome smoke of
cook mode driven from the merged `main` at 390 px — entry target
358×52 px, `:modal` true, "Step 1 of 6" rendering, Next advancing to
step 2, no horizontal overflow, clean close. That last one exists
because the branch's own browser evidence was a throwaway script; the
merge deserved its own.

**Corrected from the data, not from the page:** the roadmap said "16
venues are still stub … 12 menu-complete". Re-counted across all 31
records: **17 stub, 14 menu-complete**, and only **two** carry a
`verified` date. That last number is the real cost behind Theme 13g —
the "needs a refresh" caveat fires on 29 of 31 records, so it carries no
signal at all. Put to the owner rather than resolved here: which reading
methods count as a check is a policy call, and a threshold picked by an
agent would change live UI on judgement rather than evidence.
