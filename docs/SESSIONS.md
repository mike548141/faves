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
`/.well-known/security.txt` is mangled to `known/security.txt` while <!-- pathscan:allow: quoted as an example of the defect, not a live reference -->
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
by rewriting `data/index.json` to `site/data/index.json`. That table <!-- pathscan:allow: quotes the runtime cache URL under discussion, not a repo path — that is the whole point of the finding -->
describes **cache contents** — runtime URLs — and `sw.js:100` caches
`data/index.json`; there is no such URL as `site/data/index.json`. The <!-- pathscan:allow: quotes the runtime cache URL under discussion, not a repo path — that is the whole point of the finding -->
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

## 2026-08-09 — Four owner rulings, applied (orchestration, cont.) — Opus 5

The queue run's open questions were put to the owner and all four ruled.
Recorded here because three of them settle things a future session would
otherwise re-litigate.

**1. The cross-repo tension is closed — in favour of queueing.** The
2026-08-09 entry above surfaced two rules that did not agree on whether a
faves session may write a *finding* into atelier's roadmap. The owner ruled
**yes**: a child may **queue** a finding upstream, never deliver one. The
standing correction — faves lives within the doctrine and does not create
it — is untouched and still binds, because a finding is not doctrine. Acted
on immediately: the `/.well-known` extraction defect is now atelier
`ROADMAP.md` **Track E, item E8** (`atelier@88a54a3`), carrying the minimal
repro and explicitly no fix, no test and no marker written upstream. It went
to Track E because that track's stated premise *is* this defect — a false
positive on a correct line trains people to suppress, and that is how a
scanner stops being read.

**2. `plainscan` is scoped to the live docs.** Owner ruled "live docs only,
exempt the records". Implemented as `.plainscanignore`: **1177 findings →
582**. The line drawn, and written into the file so it survives this
session: *a record is written once and never rewritten, so editing one to
please a scanner is rewriting history* — the same ground that stopped this
session's `pathscan` sweep touching those files. Exempt: `SESSIONS.md`,
`SESSIONS-ARCHIVE.md`, `ROADMAP-DONE.md`, `docs/reviews/`, `CHANGELOG.md`.
Deliberately still checked: `ROADMAP.md` (196 findings) — it is live
current-truth and the first file a new session reads, not a record.
🎯 **One sub-question left open and flagged, not silently decided:** accepted
ADRs carry ~180 findings and cannot be fixed, because the house forbids
editing an accepted decision — so they will stand forever. Exempting
`docs/decisions/` would also stop checking *new* ADRs, which is a real
fail-open. Left checked; the owner has the call.

**3. The refresh caveat gets a method-and-age policy.** Owner ruled a reading
counts as a check when it came from the shop itself — **in store, a paper
menu, the shop's own named website, or by phone** — and never from a
third-party listing or a delivery app (*"not third parties like delivereasy,
uber etc"*), **plus an age limit**. Built on `faves-refresh-policy`; the
12-month figure is a **house default chosen by this session, not an owner
number**, and is one named constant so it can be retuned. See ADR 0036.

**4. The noun sweep stands as shipped.** All three judgement calls put to the
owner — keeping *branch* rather than forcing *places* everywhere, the
reordered Distance dials, and the allergen caveat's *venue* → *place* —
were confirmed. No reverts.

---

## 2026-08-15 — Johnsonville intake, and the ⓘ that answers both ways (wt: menu-intake-freshness) — Opus 5

Three asks in one prompt: import the intake, stamp provenance from embedded
metadata *every* time, make freshness visible, and make the currency findable.

**1. The intake — 29 photos, five venues.** New: **Noodle Canteen
Johnsonville**, **The Ramen Shop**, **BurgerFuel Johnsonville**. **Wellington
Kebab Grill** stub → menu-complete (75 items). **Thai Tara Express** refreshed.

Twenty of the 29 photos arrived loose with camera-default names. They were
sorted by **reading each board**, then cross-checked against GPS — the owner
foldered them mid-session and his layout matched the content-derived mapping
**photo for photo, all 29, zero disagreements**. Worth recording as evidence
that content-first sorting works, because GPS alone could not have done it:
all four Johnsonville venues sat inside a **25 m** circle, which is the
phone's error, not real separation.

**2. Provenance now comes off the file (ADR 0038, `tools/intake_exif.py`).**
Stdlib JPEG APP1/TIFF walk — no `exiftool`. `verified` comes from EXIF
`DateTimeOriginal`, never mtime (copying a photo rewrites mtime, so mtime
claims a *fresher* check than the evidence supports — the one direction of
error that matters). GPS + camera is *evidence for* `in-store` rather than an
assertion of it. Two limits written down so they don't get forgotten: the tool
**suggests** a method and never writes one, and **GPS sorts but does not pin** —
coordinates still come from the geocoded address.

**3. Thai Tara: a refresh done the append way (ADR 0023).** The 2026 card is
dearer across the board (pad thai 14.50 → 21.50). **38 dishes** gained a dated
price series — the 2026-07-06 `paper-menu` reading keeps its own entry *and its
own method* beside the new `in-store` one — **9** gained `available.offBy`, **8**
renames carried their history via `revisions`. Hours changed to split service.

🚩 **Flagged, not guessed:** Thai Tara **A12 "Prawns twister"** — the handwritten
price sticker is unreadable even cropped at native resolution (leading digit 3
or 5; both implausible beside its $12.90 neighbours). The dish is **left out**
rather than recorded wrong. One sticker, one dish.

**4. The ⓘ now answers in both directions (ADR 0037).** It used to appear only
on bad news, so its absence was ambiguous — "we checked last week" and "no
comment" rendered identically. Now always present, tone only: ⚠ amber caution,
ⓘ blue "checked in store on 15 Aug 2026". <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it -->

The **a11y catch worth keeping**: the two tones sit **1.06:1** apart in
luminance — colour would have been the *only* signal, which this repo forbids
for personal marks and should forbid here too. Fixed by making the **glyph and
the accessible name** carry the difference. Contrast verified arithmetically,
not by eye: 6.90:1 / 7.36:1 glyph, 10.56:1 / 11.52:1 note text, light/dark.

**5. The honesty problem in the ask, and what it cost.** The owner asked the
positive tip to say the restaurant's *info* (phone, address, hours) and menu
are up to date. But `verified` dates the **menu** and nothing else (ADR 0031) —
saying otherwise would have made every existing record claim something nobody
checked. Rather than under-deliver or overclaim, details got **their own dated
reading**: `detailsVerified` + `detailsVerifiedBy`. The note mentions hours only
when that pair exists; otherwise it stays quiet about them. **Three records**
carry it today, which is the field reporting the truth, not a backlog.

`validate.py` **errors** on a details date with no method — unlike `verified`,
which only warns, because there is no pre-0037 corpus to be gentle with.

**6. Currency.** Stated in the blue note (where a price-curious reader already
is) and under **Prices** in About. Never appended to ~1,200 individual prices.

**Verification.** `validate.py` clean (34 files); `node --test` 533 pass;
`device_check.mjs` **22 pass** on a fresh venue and **18** on a stale one —
extended this session with tone assertions that compare the DOM **against the
record**, so a blue "up to date" on a stale menu fails the build. The
details-gate was proven in both directions by temporarily stripping
`detailsVerified` and re-running. `check_no_deps`, `gen_sbom --check`,
`check_visibility` all clean.

**Also**: `tag_allergens.py` applied **159 tags** (66 stated, 93 derived) and
gained one exclusion — *ginger/root beer is a soft drink, not a barley
product*, surfaced by Thai Tara's drinks list. And a latent bug fixed in the
header date: `new Date("2026-08-15")` parses as UTC midnight and rendered the
day **before** for any viewer west of Greenwich; record dates are the same day
everywhere.

🎯 **Owner calls left open** — none blocking, all recorded in ROADMAP:
1. **Street numbers** for the three new Johnsonville venues. They carry
   street-level addresses and **null coordinates**: the GPS cluster cannot
   separate neighbouring shopfronts, and the coordinate audit's own rule is
   that a wrong pin beats no pin *never*. You were there — the numbers are a
   two-minute fix, or a geocode once we have them.
2. **Thai Tara A12's price** (above).
3. **Ageing `detailsVerified`** the way `refreshCaveat` ages `verified`. Not
   done: three records is no evidence base for choosing a limit, and inventing
   one would repeat exactly what ADR 0036 had to correct.
4. **Reo**: the new confidence-note strings stay English alongside the caution
   they share a popover with. Added to the fluent-speaker review queue.

---

## 2026-08-15 — Intake round two: the details, and a menu that disagrees with itself (wt: intake-round-two) — Opus 5

Owner follow-ups to the morning's intake, plus a new restaurant. A parallel
session was live, so this ran in its own worktree throughout and merged with a
fetch-and-check.

**1. The three Johnsonville venues are complete.** Street numbers found online —
**103** BurgerFuel, **105** Noodle Canteen, **109** The Ramen Shop — each
geocoded to **house-number level** through `audit_coords.py`'s Nominatim client
rather than by hand. They land within **~20 m** of the photo GPS, which is the
cross-check that says both the address and the photo sort were right.

Sources recorded by strength, not flattened: BurgerFuel and The Ramen Shop from
their **own sites**, Noodle Canteen only from a **directory listing**. The Ramen
Shop's published phone matches the number read off its shopfront sign — an
independent agreement between a first-party site and a first-party photo.

**2. `menu.js` gained wording for the untrusted methods.** They can never head
the *menu* half of the confidence note (`refreshCaveat` routes those to amber),
but they reach the *details* half, where a directory listing is often all there
is for a phone number. Without it they inherited the bare "checked" fallback and
read as first-party. Now: *"Phone, address and opening hours taken from a
directory listing on 15 Aug 2026."* <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it -->

**3. The null price, per the owner's ruling.** Thai Tara's *Prawns twister* is
back on the menu with `price: null` and the reason in its description. Verified
it degrades correctly: `menu.js` renders "—" and `cart.js` already sets
`hasUnpriced`. The owner's instinct was better than the morning's call —
the dish existing with an honest gap beats the dish being absent.

**4. 🚩 The find: Thai Tara's leaflet contradicts its own counter card.** The
takeaway leaflet collected 2026-08-15 is a *different printing* from the
laminated card photographed in store the same day — the card's prices are
handwritten stickers over an older print, the leaflet's are printed. They differ
three ways: **item codes** (R2/R3/R4 permuted), **two prices** (Thai basil and
Thai chilli, $21.50 sticker vs $22.50 printed), and **the leaflet has no duck
dishes at all** while adding a laksa the card lacks.

**None of it was silently resolved**, and the reasoning is the point:
- The **laksa was added** — an addition is safe, since one menu having a dish is
  evidence it exists.
- The **duck dishes were kept**. One leaflet omitting them is *not* evidence
  they are off the menu, and `available.offBy` is a dated claim that they are.
  Absence of evidence would have been recorded as evidence of absence.
- The **prices were not turned into a series**. Two same-day readings that
  disagree are a *conflict*, not a history; writing both would fabricate a
  same-day price rise — the correction-vs-change error ADR 0023 exists to stop.

All three now sit in the roadmap for the owner, who can settle it in one glance
at the counter.

**5. Pandan Asian Cuisine added** — 90 dishes, read from the venue's **own
online-ordering storefront**, which ADR 0031 classes `official-site` (trusted,
so no caveat). Its ordering page is JavaScript-rendered and defeated plain HTTP
fetching; the browser-fetch tool got it. **Its pin is a street centroid, not
house-level**: OSM has no house number for its street address. Stored anyway,
because at ~15 km out a ~150 m error cannot change a distance sort — and
recorded here and in the roadmap so it is never mistaken for a house-level pin.
Only the Lower Hutt store is in: the Press Hall branch's ordering page serves no
menu, so there is nothing to evidence.

**6. 🐛 Fixed a defect this session created that morning.** The roadmap block
added in round one was numbered **Theme 17**, which already existed (Cook mode).
Renumbered to **19**, with a comment in the file saying to `grep '^## Theme'`
first. Same class as the ADR-number collisions in the memory notes: a shared
counter read once and assumed free.

**Verification.** `validate.py` clean (**35** files); `node --test` 533 pass;
`device_check.mjs` run against three venues to exercise all three details
wordings (`in-store`, `official-site`, `third-party`) — one harness FAIL on
Pandan is its own precondition (it wants ≥5 peanut-tagged dishes, Pandan has 4),
not a defect. `tag_allergens.py` applied 23 more tags. `check_no_deps` clean.

🎯 **Left for the owner** (roadmap Theme 19): the leaflet-vs-card conflict above;
Pandan's Press Hall branch and its street-centroid pin; ageing
`detailsVerified`; and the reo strings.

## 2026-08-15 — Scanners closed, the pin bumped, and a roadmap that stopped lying (wt: faves-scanner-close) — Opus 5

Orchestration session, run alongside the live `intake-round-two` session and
merged into its work twice. Lane taken deliberately away from intake: doctrine,
scanners and the roadmap's own accuracy.

**1. The pin bump was the whole session's leverage.** `atelier@5c16a59` →
`bde4928`, 21 commits of drift. Two items sitting in this roadmap as
*blocked-upstream* were closed by that bump, and neither would have been found
without running the check first:

- **`pathscan` E8 fixed** (`atelier@ab74014`) — its last 16 findings here were
  one upstream defect, queued 2026-08-09 under the queue-never-deliver rule.
  **pathscan is now clean here for the first time since it was adopted.**
- **The `plainscan` scope question ruled** (`atelier@e390382`) — and it ruled
  the *same way* this repo had ruled locally on 2026-08-09, without either
  seeing the other. Two independent rulings agreeing is the strongest evidence
  the line is in the right place.

Only one doctrine *text* file moved in 21 commits (`COMMUNICATION.md`). The
inlined floor was **re-verified rather than assumed**: `git diff 5c16a59..bde4928`
over the four canonical floor files returns empty, so our stamped copy has not
drifted.

**2. 🔎 The correction that matters more than the fix.** Our recorded root
cause for E8 was **wrong**. We reported the trigger as "the leading-slash-plus-dot
form", and the repro supported that honestly — because `/.well-known/security.txt`
was the only failing shape we had. The real trigger is **a hyphen anywhere before
the token's last `/`**; `.well-known` merely happens to contain one. **A repro
built from one failing shape confirms the shape, not the cause.** Next time a
cross-repo defect is queued, vary each suspected feature independently *before*
writing the diagnosis down. Recorded in `ROADMAP-DONE.md`, not just here.

**3. `docs/GLOSSARY.md`, which is plainscan's designed escape.** P2 fires on
every unexpanded acronym and the designed answer is a glossary; this repo had
none. Measured: **P2 96 → 13, total 620 → 543**, no prose rewritten. It earns
its place independently of the scanner — the repo is public and a stranger meets
"PWA", "CDN" and "SBOM" cold in `ARCHITECTURE.md`. Two findings from building it:
a glossary **cannot** fix P1 (`_load_glossary` feeds only the acronym check;
P1 needs a definition inside the same document), and **`D1` is a trap** — it sits
beside `S3`, `R2` and `WGS84` and reads like Cloudflare D1, but every occurrence
is `atelier D1`, a doctrine citation.

**4. Six stale claims in the roadmap, each verified before correcting.** The
"Recommended sequence" described 2026-07-08 and read as though nothing had
shipped (steps 1–4 and two thirds of step 6 are done); "Feedback intake: no
email; parked" was reversed on 2026-08-09; two sections were both numbered
Theme 17; 17e's oven bullet shipped as 18c; the legend defined none of `[XS]`,
`[~]`, the surface tags or the marks. And the stub tally was **wrong for the
second time in six days** — the fix is not the new number (16/18/34) but the
rule now written beside it: **a hand-copied count in prose is stale the moment
data lands; derive it, never retype it.**

**5. Two sessions, one conclusion.** The intake session independently found the
duplicate Theme 17 and renumbered it to 19 within the same hour. Merged by
taking intake's Theme 19 *content* (it has the round-two facts) at this branch's
*position* (theme order restored). Proved nothing was lost rather than eyeballing
it: every line new in intake's version was checked for presence in the
resolution — **zero dropped**.

**6. A standing finding the hook can never see.** The pre-commit hook scans
**staged files only**, so an *enforced* scanner can carry a standing finding
indefinitely in a file nobody touches. A whole-repo sweep at close found one:
`CHANGELOG.md`'s "within the last year". Verified against the code —
`VERIFY_MAX_AGE_MONTHS` is 12 and the caveat computes against the reader's own
now — so it is a rolling window, not a dated claim. Marked, not reworded.
The other 9 whole-repo findings are all in gitignored `intake/`.

**🚩 A number to distrust.** Running `plainscan .` or `pathscan .` bare in this
checkout walks the gitignored `.claude/worktrees/<name>/` nested clone and
**counts every finding twice** — 2000 reported against a real 623. The floor
passes explicit paths and is correct. This nearly produced a fabricated upstream
defect report. Reproduce a finding the way the floor invokes it before believing
it. (`sizescan` genuinely does double-report the worktree; that one is cosmetic.)

**Queued, not decided.** Two accepted ADRs are both numbered **0025**
(`settings-index-and-panels` 2026-08-08, `infer-allergens-by-default`
2026-08-09), with 24 inbound references. Both repair paths cost something, so it
is an owner call with a recommendation, not a unilateral renumber. The
*preventive* half needed no ruling and landed: `decisions/README.md` now states
that a number is allocated **at merge, never in a worktree**, and that ADRs are
cited by file path until the collision is resolved. The same failure had already
happened at larger scale (three agents all took 0031 on 2026-07-23) — a rule
learned but never written down is a rule the next session cannot follow.

**Verification.** `validate.py` (35 files), `test_validate.py` (14 mutations),
`check_no_deps`, `gen_sbom --check`, `check_visibility`, `node --test` 533/533,
`pathscan` **clean**, whole-repo `secretscan`/`leakscan`/`linkscan`/`datescan`/
`wrapscan`/`spellscan`/`licenscan` all clean. CI green on every push. Live
`sw.js` matches `main` (`2026-08-15.2`), so the deploy is confirmed, not assumed.

### Addendum, same session — three owner rulings taken live

**ADR 0025's duplicate: both stay.** Renumbering an accepted record would break
24 inbound references plus any external link on a public repo — dearer than the
oddity. Each file gained a header note; `0025` is now permanently ambiguous and
ADRs are cited **by file path, never by bare number**.
🔎 **The root cause was the index, not the number.** The allergen record had
never been added to the index in `decisions/README.md` — the one place a
duplicate number is visible — so nothing *could* have caught it. That entry now
exists, and the README carries the rule it earned: **add the index entry in the
same commit as the record.** An unindexed ADR is invisible to the next person
allocating a number.

**`plainscan`: accepted ADRs exempted.** They held the largest single block of
findings, and "never edit an accepted one" means not one could ever be fixed —
the same definition atelier used to exempt records, and the same way `pathscan`
went decorative here. The cost is stated rather than hidden: **new ADRs are no
longer checked at commit time.** Accepted because the reply plane has no scoping
and scans every reply an agent writes, including the prose that becomes a new
ADR — the check moves to where the fix is possible.

🔎 **The obvious glob was the wrong one, and the wrong one looked better.**
`docs/decisions` exempts the whole directory *including* `README.md` — but that
is the live index, rewritten whenever a record lands, so its prose **can** be
fixed and the ruling's own reasoning does not cover it. Correct glob:
`docs/decisions/0*.md`. Measured: **266 findings with the loose glob, 302 with
the correct one.** The number that flattered the work was the wrong number.

**The 35-word sentence cap: left alone, nothing swept.** Atelier's own docstring
calls it "a house call, not a published standard". Rewriting live docs against
an unratified threshold risks flattening meaning for no reader gain. P3/P4 stay
advisory.

**Where `plainscan` landed: 1177 on 2026-08-09 → 302 on 2026-08-15**, and
every one of the 302 sits in live, rewritable prose. None is in the
unfixable class. That is the difference between a scanner that can still be
read and one that cannot.

---

## 2026-08-15 — A real-browser guard for cook mode (faves-cook-guard) — Opus 5

Closed the 🚩 on ROADMAP 17d: cook mode had no durable browser check of
its own, only a throwaway script that had already found two wake-lock
leaks and then been deleted. **Branch only, uncommitted, for owner
review** — nothing pushed.

**The decision (ADR 0039): a sibling, not a widening.** `device_check.mjs`
is the allergen **safety** re-apply, where a failure means someone could
be served a dish that hurts them; that verdict deserves its own line and
its own exit code, and a runtime short enough that nobody skips it. Cook
mode needs a different screen, a different fixture and machinery
`device_check` has no use for. So `tools/cook_check.mjs` (**35
assertions**), with the CDP harness extracted verbatim to
`tools/lib/browser.mjs` — one static server, one CDP client, one Chrome
launcher, shared. `device_check.mjs` is 19/19 before and after.

**The wake lock is instrumented, never faked.** Measured first, then
built on: headless Chrome 151 grants genuine `WakeLockSentinel`s on an
http origin, releases them when the page hides, and refuses a request
while hidden. A script installed before any page script wraps
`request`/`release` and keeps every sentinel, so "still held" is read off
the platform's own flag. The single intervention is a stall inside
`request` that widens — does not invent — the close-beats-the-request
race leak (b) lived in.

**Proven to bite**, by three deliberate breaks in `site/js/cook.js`, each
reverted after:

- forget the sentinel instead of releasing it → **5 FAILs**, first
  `closing hands the wake lock back — 1 held, 0 release() call(s) for
  1 request(s)`;
- store a sentinel arriving after `release()` (drop the `!wanted` guard)
  → exactly one FAIL, the in-flight one;
- never re-acquire on returning to the page → exactly one FAIL, the
  hide/show one.

**Three gaps declared instead of faked**, in the tool's own header: that
the screen genuinely stays on (needs a phone; iOS still unverified);
leak (a) in its original form, because this Chrome always releases on
hide *before* `visibilitychange`, so removing cook.js's extra release is
invisible here; and release on document teardown, which the page that
held the lock is no longer around to report. A green line that cannot go
red is decoration — this repo has already paid for three of those.

**🔎 A real defect found, deliberately not fixed.** Tapping **Back** to
step 1 disables the Back button while it holds focus, and Chrome drops
focus to `<body>` — outside the dialog. `cook-ui.js` listens for keydown
on the dialog, so the arrow keys, Home and End then do nothing until
something inside is focused again. ADR 0034 promises focus stays on
Back/Next; at the lower boundary it does not. Where focus should land is
a design call (0034 rejected moving focus to the step on every change),
so it is marked `#!###` in the check and put to the owner.

**Also found:** the driver's `scrollIntoView` needed `behavior: "instant"`.
The site sets `scroll-behavior: smooth`, so the rect was read before the page
had moved and every click far down a page landed in empty space — which made
the Cook at Home entry point look broken.

**Verified:** `cook_check.mjs` **35/35**, `device_check.mjs` **19/19**,
`node --test` **533/533**, `validate.py` (35 files, 11 warnings),
`test_validate.py`, `check_no_deps`, `gen_sbom --check`,
`check_visibility`. **Nothing under `site/` changed**, so no
`SHELL_VERSION` bump — the only edits there were the three breaks, all
reverted (`git diff site/` is empty).

🎯 **For the owner:** the focus defect above; and `docs/decisions/README.md`
was already missing its index entries for **0037** and **0038** before
this session — 0039's is appended, the hole is not this session's to fill.

### Addendum 2 — the close-out, and one rule proving itself the same day

**A finding queued upstream, not fixed here.** The close-of-session whole-repo
sweep reported `leakscan: 101 findings — commit blocked`, which was alarming and
wrong. Every one sat inside a *sibling session's* worktree at
`.claude/worktrees/`, gitignored but a full second checkout of this repo, where
our root-relative `.leakscanignore` globs cannot reach. This tree is clean.
Same root cause as the inflated `plainscan` count earlier: **the scanners walk
gitignored nested worktrees.** Filed as atelier Track E item **E9**
(`atelier@72cf216`) under queue-never-deliver — a finding only, no fix written
upstream. Recorded here too, because until E9 lands the sweep must be given
explicit paths and never a bare `.`.

🔎 **The ADR-index rule proved itself within the hour.** The rule written this
morning — *add the index entry in the same commit as the record* — was drafted
from the 0025 collision. Checking the tree afterwards found **0037 and 0038 were
both unindexed**, having landed earlier the same day. So the failure was not
historic; it was live and ongoing. Both indexed. A rule that catches something
the day it is written is a rule that was owed.

**Pin advanced again**, `bde4928` → `72cf216`, which is this session's own E9
filing and carries no doctrine change. Left alone, the next session's drift
check would fire on a commit we wrote ourselves — the decorative-guard failure
this repo has now hit four times. Drift at this pin is **0 commits, verified**.

**Put-away.** Both of this session's worktrees merged and removed. The third
session's `pandan-branches` worktree is live and locked — left strictly alone.
No `CHANGELOG` entry is owed: everything this session touched is docs and dev
tooling, and `site/` was never modified. Final sweep clean across `secretscan`,
`leakscan`, `linkscan`, `datescan`, `wrapscan`, `spellscan`, `licenscan`,
`pathscan` and `reviewscan`. CI green on every push.

---

## 2026-08-15 — Two owner rulings, and a bug I diagnosed wrong (wt: pandan-branches) — Opus 5

**1. The menu-conflict rule, ruled and recorded.** For any two menus of the same
venue that disagree: **the dine-in card wins on contradictions** (prices, dish
numbers); **dishes are additive** — anything on either menu is in. Both halves
already matched what the previous round had recorded, so nothing in the data
changed; the value is that the *rule* now exists for the next conflict. Detail
and the reasoning behind each half → `ROADMAP-DONE.md`.

**2. Pandan is now a two-branch venue (ADR 0011).** Owner supplied the second
address and ruled the menu is the same at both. Melling keeps its phone and
hours; the Press Hall branch geocoded to house level — OSM names the
node "Press Hall Eatery", which is a strong confirmation. Its `hours` stay null:
the food hall publishes a house standard *and* says to check with each eatery,
which is not a claim about this stall, and a wrong "Open now" sends someone into
town for nothing.

**3. 🐛 The part worth reading: I diagnosed a bug that did not exist.** Reading
`app.js` and `menu.js` in isolation, I saw the card badge and the pinned contact
bar reading `r.hours` / `r.phone`, noted that a multi-location record carries
neither at the top level, and concluded both would render empty for every
multi-location venue. I wrote the "fix", wrote a `device_check` assertion for it,
and the assertion **passed against the deliberately reintroduced bug**.

That is the tell. `data.js` `normaliseVenue()` projects the primary branch up to
the top level before any consumer sees the record — *exactly* so those reads stay
simple — and says so in its own comment. I had not read the loader.

What that cost and what was kept:
- The `menu.js` change was reverted in full: it was a no-op refactor dressed as a
  fix, and its comment asserted a defect that isn't there. A comment claiming a
  bug that does not exist is worse than no comment.
- The `app.js` change was **kept**, with an honest comment. It is not a bug fix
  but it is a real narrowing: `venueHours(r, origin)` follows the **nearest**
  branch, which is what the "Open now" filter has always used and what the card's
  own distance and maps handoff already show. Before it, a venue whose branches
  keep different hours could show "Closed" on a card the filter had just matched
  as open — the filter's comment claimed the two agreed, and now they do.
- The decorative assertion was **deleted** and replaced with one that has teeth:
  *every branch of a multi-location venue is listed*. Proved by breaking the
  renderer (`shown.length = 1`) and watching it fail, then restoring.

The general lesson, and the reason this is in the log rather than quietly fixed:
**verify a fix by breaking it.** The first assertion passed both with and without
the change, which meant it was measuring nothing — the same failure class as the
decorative scanners already in the notes, arriving from the opposite direction.

**4. Also fixed a red result that meant nothing.** `device_check` demanded ≥5
allergen-tagged dishes and reported a hard FAIL on a healthy venue with four.
Relaxed to ≥1 — the real assertion downstream is "every tagged dish lights up",
which holds for any count, and the zero case already hard-errors before the
browser starts. A red that means nothing is how a check stops being read.

**Verification.** `validate.py` clean (35 files); `node --test` 533 pass;
`device_check` **22 / 19 / 21 pass, 0 fail** across Pandan, the default venue and
Thai Tara — the branch assertion exercised in both directions.

### Addendum 3 — an incident, and the rule it earned

**main was broken for roughly ten minutes, by an ordinary mistake nobody made
carelessly.** Recorded in full because the mechanism is not obvious and will
recur.

**What happened.** The cook-mode focus fix was applied here, in the shared
`main` checkout. To prove the new assertion actually bites, the one-line fix was
then **deliberately removed** and the guard re-run — it failed on exactly the
right assertion, which was the point. In that window a concurrent session
(`pandan-branches`) merged to `main` and its commit **swept the uncommitted
working tree in with it**. What landed was the comment and the assertion, but
not the line they describe: `main` now asserted a fix whose code was absent, so
`node tools/cook_check.mjs` failed on `main`. It also shipped a change to
`site/js/cook-ui.js` with **no `SHELL_VERSION` bump**, so installed phones would
have kept the old script.

**Nobody did anything unreasonable, and that is the finding.** The other session
followed the rules — it merged, resolved conflicts by hand, and read the prose.
Nothing in the doctrine told it that the tree it was committing contained
someone else's half-finished experiment. The doctrine's existing rule points the
other way and is about *not absorbing* another session's changes; this is the
mirror image, where your own deliberate breakage becomes someone else's commit.

🚩 **The rule this earns: never leave the shared `main` checkout in a knowingly
broken state, not even for a minute.** Proving a guard bites means breaking
code, and that experiment belongs in a worktree, or between a `git stash` and a
`git stash pop`, never bare in the tree every other session commits from. The
worktree discipline this repo already has was in place all session — the
experiment was the one thing done outside it, and it was the one thing that
broke.

**Repair, fixed forward not reverted** (`fd998f6`): the fix line restored,
`SHELL_VERSION` → `2026-08-15.4`, and the assertion re-proved by removing the
line once more — this time in full knowledge of what that costs. Verified after:
`cook_check` **36/36**, `device_check` 19/19, `node --test` 533/533,
`validate.py` 35 files, `gen_sbom --check` clean.

### Addendum — the last two rulings (wt: press-hall-hours)

**1. The menu-conflict ruling was already applied; the close-out said otherwise.**
The owner re-stated it because the previous reply listed it as an open item. It
was not: the data was verified this session and matches the ruling on every
count — Thai basil and Thai chilli resolve to the card's **$21.50** (the leaflet's
printed $22.50 discarded), the card's fried-rice numbering is stored, the
leaflet-only **laksa** is in, and all five duck dishes are kept with no `offBy`.
Nothing changed. The defect was in the *report*, not the record: an item that
had been closed in `ROADMAP.md` was still narrated to the owner as a decision
awaiting him. **Re-read the roadmap before writing a close-out**, rather than the
memory of what was open when the work started.

**2. Press Hall's hours — ruled: use the food hall's.** Applied as **Mon–Fri
11:00–15:00**, the house standard it publishes. Two consequences, both recorded:

- **Weekends are stored as closed**, and that is the hall's *silence* rather than
  a stated closure — it publishes weekday hours only. Closed is the safe
  direction: a false "closed" hides the branch, a false "open" sends someone into
  town for nothing.
- **`detailsVerifiedBy` dropped `official-site` → `third-party`.** These hours
  are the *building operator's* statement about its premises, not Pandan's about
  itself. The field is venue-level, so a mixed-provenance record has to read as
  weakly as its weakest input — the alternative is a note claiming "checked
  against the place's own site" over a fact the place never stated. Confirmed on
  screen: the tip now reads *"Menu and prices checked against the place's own
  site … Phone, address and opening hours taken from a directory listing."*

🚩 **The gap that exposes, raised not patched:** derivation is venue-level while
provenance has become per-branch. Reading weakest-wins is honest but discards
true information about the address and phone, which *are* first-party. A
per-branch `detailsVerified` pair would fix it; deferred, because one record is
not an evidence base for a schema change — the same restraint ADR 0037 applied
to ageing the field.

**Verification.** `validate.py` clean (35 files); `node --test` 533 pass;
`device_check` 22 pass on Pandan with the reworded tip asserted; `cook_check`
36 pass. `DATA_VERSION` → `2026-08-15.4` (data-only change; `SHELL_VERSION`
untouched at `.4`).

## 2026-08-15 — Three pubs, and a menu vocabulary the tag set didn't have (wt: three-venues) — Opus 5

**Asked for:** 1841 in Johnsonville, The Borough in Tawa, Southern Cross in
Wellington. **Delivered:** three `menu-complete` records, **164 dishes**, every
price from a first-party source. No stubs — all three had a reachable menu once
the right source was found.

**Finding the sources was most of the work, and two of the three tried to
mislead.**

- **1841** publishes a PDF on its own site. The text layer extracted cleanly,
  but the *section headings* were ornamental glyphs in a symbol font — control
  characters, not letters. Page 1 renders via `sips` (which converts page 1
  only), and it shows two headings: MAINS and EXTRAS. Matching those against the
  glyph runs gave a cipher (M=\027, A=\031, I=\026, N=\025, S=\030;
  E=\035, X=\034, T=\033, R=\032) that decoded page 2's three headings
  consistently and with no leftovers: **DESSERTS**, **BRUNCH**, **STARTERS**.
  Cross-validated on three independent runs, so the section names are read, not
  guessed. Page 1's rendered image also confirmed the item/price extraction
  line for line.
- **The Borough had left Star Group.** `stargroup.nz/venues/the-borough` says so
  outright and offers nothing else; the Tawa business directory still links
  there, and Quandoo/Tripadvisor carry the old group's menu. Its real site is at
  `theboroughtawa.co.nz`, and its menus are **PNGs**, read directly. Evidence it
  is current: a Burger Wellington entry running 2026-08-03 to 2026-08-23.
- **Southern Cross's own menu page carries two menus.** The live tabs, and a
  stale duplicate block further down the DOM with the same dishes 3–5% cheaper
  (garlic loaf 13.5 vs 14.0, cheeseburger 26.0 vs 27.0) under different section
  names (Burgs, Pub Favourites, Bowls). Its downloadable 2026 PDF contains
  **two brunch menus** as well. Only the live tabs were recorded. The other
  brunch set turned out to be **The Borough's** (Rosti Benedict 27.5, Eggs Your
  Way 16.5, Big Breakfast 31.0 — identical to the Tawa menu images), which is
  what a shared group template leaves behind. Recording either stale layer as a
  price change would have fabricated a price cut.

🚩 **A summariser silently corrected a source and I nearly recorded the
correction as the source.** `WebFetch` returned "Venison Mince Ragu" for a dish
the page actually spells **"Vension"**. Grepping the raw HTML for "Venison"
returned 0, which briefly read as a hallucination — it wasn't, it was a quiet
fix. Both failure modes look identical from the summary alone. **Every price and
dish name here came from raw HTML, the PDF byte stream, or the menu image** —
never from a model's prose rendering of them. The dish is stored under the
correct spelling; that is a transcription judgement, and it is recorded here.

**The tag decision — [ADR 0040](decisions/0040-nga-and-ngo-map-onto-the-closed-tag-set.md).**
All three menus mark gluten as `NGA` ("no gluten added") / `NGO` ("no gluten
optional"), a vocabulary the closed tag set doesn't carry. Mapped `NGA`→`gf`,
`NGO`→`gf-option`, `VO`→`v-option`, with the venue's own hedge kept verbatim in
each `desc`. Adding an `nga` tag lost on cost; leaving them untagged lost because
it discards a stated fact and breaks the GF filter on exactly the menus that
bothered to mark themselves up. The gap it leaves — **the site cannot say a
kitchen is shared** — is raised in the ADR, not patched: three records are not an
evidence base for a schema change.

**A false positive fixed in `tag_allergens.py`.** It flagged Southern Cross's
House Granola as `contains-dairy` because the rule matches the bare word
`yoghurt`. The granola is served with **coconut** yoghurt. The tool already had
a `NON_DAIRY` exclude for plant milk/cream/butter; `yoghurt|yogurt` joined it.
Same class of fix as the "peanut butter is not dairy" exclude already there.

**Two encodings worth noting.**
- **1841's prices are a dated series**, not plain numbers: the PDF's embedded
  `/CreationDate` is **2025-03-27**, so each entry carries that date rather than
  claiming the price is current. `verified` remains the day we read it, per the
  Takeaway @ Churton precedent — which means `refreshCaveat` shows **no**
  caveat on a 17-month-old document. That is the documented weakness of
  `paper-menu` (ADR 0031), not a new one; logged as a follow-up.
- **The Borough's Burger Wellington entry is time-boxed** — the section carries
  `available: {from: 2026-08-03, to: 2026-08-23}`, so The Aegean Melt drops off
  the menu on its own after the festival. Verified rendering today, inside the
  window.

**Verification.** `validate.py` 38 files, 0 errors (warnings 27 → 14 after
tagging); `test_validate.py` 14/14; `check_no_deps` clean; `gen_sbom --check`
clean; `check_visibility` PUBLIC; `node --test` **533 pass**; `device_check`
**19 pass**; `cook_check` **36 pass**. All three pages then driven in headless
Chrome at **390 px**: 53 / 55 / 56 dishes, **no page errors**, the price series
resolving to `$42` on Hop Scotch, the P.O.A dish rendering "—", the Burger
Wellington section present, and `⚠ CONTAINS PEANUTS` firing on Southern Cross's
brownie sundae. `DATA_VERSION` and `SHELL_VERSION` → `2026-08-15.5` (both:
`site/data/` and `site/index.html` changed).

**Not done, and deliberate:** drinks menus. All three publish separate alcohol
lists; the food menus are complete and the drinks were left out as a product
question rather than a backlog item. 1841's kids menu is a separate 2023-dated
PDF and was skipped as too stale to be worth transcribing. `picks` are empty on
all three — owner-supplied only. All four are logged under Theme 4.

## 2026-08-15 — Drinks, and the price band they quietly broke (wt: drinks) — Opus 5

**Owner ruling:** add all drinks. **Delivered:** 166 drinks — The Borough 81,
Southern Cross 85. **1841 has none, and that is the finding, not an omission:**
its site publishes a food menu PDF and a kids menu PDF and no beverage list at
all; the daily deals reference "any tap beer" and "tap beer and wine by the
glass" without naming or pricing one. Nothing to transcribe. Logged.

🚩 **The regression the drinks caused, caught before it shipped.** `priceBand`
is a median over the venue's priced items, and ~90 drinks at $5–15 dragged both
pubs from a ~$24 median to **exactly $14.00** — under the `$` band's inclusive
$15 ceiling. Two gastropubs would have displayed as cheap as a takeaway, on the
home list and in the ranking, with nothing in the diff to suggest it. Fixed with
a curated `priceBand: "$$"` plus a `pricePerPerson` taken from the food-only
median (23 and 24), which is what the chip showed before drinks arrived.
`price.js` then suppresses the contradictory derived figure by itself.
**Verified by breaking it** — the same records with the curated fields deleted
return `{"band":"$","perPerson":14}`, with them `{"band":"$$","perPerson":24}`.
This is exactly the case `priceBand`'s own header comment describes, and it will
recur on **any** venue that gains a drinks list.

**The tag rule I widened, and the two false positives it bought.** A beer →
`contains-gluten` rule already existed but matched only spelled-out styles
(`beer|lager|ale|stout|pilsner`), so a tap list of "Interstellar IPA" and
"Adapt APA" went untagged. Adding `ipa|apa|porter` fixed that and immediately
mis-fired on **Schweppes Ginger Ale** at both venues — "ale" was newly reachable
from every soft-drink line. The existing exclude already covered ginger *beer*
for the same reason, so it widened to `(ginger|root|sarsaparilla)\s?(beer|ale)`.
It also fired on **Hell Pizza's NZ BBQ Pork Ribs** — which turned out to be a
**true** positive picked up in passing: the sauce is literally named "APA".
Applied. Net: 3 rules touched, 2 tags added corpus-wide, 0 false positives left.

**Serving sizes: recorded where labelled, refused where not.** Southern Cross's
wine columns are labelled (Reg/Lrg/Btl) and its sparkling (Flute/Btl), so those
are stated plainly. Its **taps carry three unlabelled price columns** in a 1:2:4
ratio, and The Borough's carry two at 1:2 — the PDF has no drinks pages and the
HTML has no headers, so there is nothing to read a size off. Those say "Also
$28.00 and $56.00; the menu doesn't label the larger sizes" rather than inventing
a pint or a jug. The Borough's *wine* columns are also unlabelled, but its
three-column shape and values match the template Southern Cross labels, so those
are written as large glass / bottle — an inference across a shared template,
disclosed here rather than caveated on fifteen rows.

**Two transcription judgements, both recorded.** The Borough's sparkling block
renders with its price column offset one row up (the numbers begin on the section
heading), which would silently mis-assign every price; the shift was confirmed
against Southern Cross's independently-published prices for the same three wines
(110 → Brut, 135 → Rosé, 50 → De Bortoli) before being read. And its
**"Nga Waka"** is stored as **"Ngā Waka"**, the winery's actual name — the same
call as the "Vension" → "Venison" fix earlier on 2026-08-15, and required by
the macron rule.
🤔 One line resisted: Southern Cross lists **"Garage Project Aro Noir Pinot
Gris $13.00"**, with no separator in the raw HTML. Aro Noir is a stout; a Garage
Project pinot gris is a different thing. It is stored verbatim with a note that
it may be two products run together, and **left untagged** — "no tag = not
stated" is the honest answer when we cannot tell whether a line is a beer.

**Verification.** `validate.py` 38 files, 0 errors, 14 warnings (all pre-existing
"no picks"); `test_validate` 14/14; no-deps, SBOM, visibility clean;
`node --test` **533**; `device_check` **19**; `cook_check` **36**. Both pages
driven in headless Chrome at 390 px: **132 and 141 rows**, every drink section
present, `⚠ CONTAINS GLUTEN` on the tap rows, **no page errors**, and the home
list showing `$$ ~$24pp` / `$$ ~$23pp`. `DATA_VERSION` → `2026-08-15.6`
(`SHELL_VERSION` untouched — nothing outside `site/data/` changed).

## 2026-08-15 — A dish carries its own open questions (wt: dish-needs) — Opus 5

**Asked for:** turn the roadmap's "go and check this dish" items into an
indicator on the dish in the app. **Delivered:** per-dish `needs`, a `?` pill
that says what would fix it, and `tools/needs.py` — the roadmap now points at a
command instead of naming dishes. [ADR 0041](decisions/0041-a-dish-carries-its-own-open-questions.md).

**The ask turned out to fix a data bug, not just a UI gap.** `price: null` was
carrying two incompatible meanings — *the shop prices this on application*
(1841's Fish of the Day) and *we tried to read it and couldn't* (Gold Lining's
Falafel Wrap) — and the menu rendered both as `—`. A reader could not tell the
shop's uncertainty from ours, and neither could the next transcriber. A dish with
`needs: price` now shows **`?`**; everything else keeps the `—` that has always
meant *ask*. Two admissions, finally distinguishable. 69 dishes corpus-wide have
a null price and **only two** are actually gaps, which is why this could never
have been inferred from the null.

**Where the chip is NOT.** The obvious build is a chip in the existing
`dish-tags` row. Rejected: two of those chips are allergen warnings, and the
entire design intent of that row is that a `⚠` in it means *this food could hurt
you*. A record-keeping note among them, in the same shapes, dilutes exactly the
chips that must not be diluted. It gets its own row between the description and
the tags, its own `?` glyph, and a dashed neutral pill — never the `⚠` the
allergen chips and the refresh caveat own. The headless check asserts the tag row
stays uncontaminated, so a later refactor can't quietly move it in.

**Kept in English on purpose.** `reo.js` draws an explicit safety boundary — the
allergen chips and the "needs a refresh" caveat stay English until a reo review
because a misreading could hurt someone. This says the same class of thing about
the same class of fact, and one of its kinds is literally `allergens`, so it
carries no `data-i18n` and falls through automatically.

🚩 **The closed set is now written in three files, so it got a guard.**
`site/js/needs.js` holds the labels and fix text, `validate.py` decides what is
legal, `needs.py` reports. The dangerous drift is silent: a kind the *renderer*
doesn't know is dropped from the page, so the data would claim a gap no reader
ever sees — the "decorative guard" failure this repo keeps finding. Added a
cross-file check to `test_validate.py` and **verified it by breaking it**:
injecting a `photo` kind into `validate.py` alone made it fire with all three
lists printed; restoring returned it to "in step". 21 mutations now, up from 14.

**Caught by an existing guard, worth recording.** `needs.js` is a new module and
`sw.js` precaches an explicit file list — a missing entry breaks offline for
every menu page, which is a hard constraint. `tests/sw-versioning.test.js`
already asserts every shipped module is precached, so the omission had a net
under it before I noticed. That test earned its keep today.

**Data.** Four gaps recorded, all previously prose: Gold Lining's Falafel Wrap
(price label behind the cabinet frame) and Bliss Balls (no price card in shot,
*plus* the flavours-or-ingredients question — one dish, two entries), and
Southern Cross's "Garage Project Aro Noir Pinot Gris", which is probably two
products run together with no separator to read. `validate.py` errors if a dish
carries both a price and `needs: price`, because the indicator hides itself when
a price exists — a stale claim would sit invisible while the worklist kept
reporting a finished job.

**Deliberately not done.** Section-level gaps (Gold Lining's juice fridge was
never itemised, so there is no dish to hang anything on) and venue-level ones
(1841's 2025 menu document, The Borough's third-party phone) stay in the
roadmap: the first has no anchor and the second already has ADR 0037's ⓘ/⚠ in
the venue header. A second mechanism would be the drift, not the cure.

**Verification.** `validate.py` 38 files 0 errors; `test_validate` **21/21**
including the new drift guard; no-deps, SBOM, visibility clean; `node --test`
**545** (12 new in `tests/needs.test.js`, covering malformed and unknown kinds
degrading to silence rather than a raw slug on the page); `device_check` 19;
`cook_check` 36. Driven in headless Chrome at **390 px**: 3 chips render, the
price slot reads `?` with `.is-unknown`, the accessible name opens with the
visible label (WCAG 2.5.3), tap target **156×44**, two gaps on one dish give two
chips, tapping opens a note containing the fix, a P.O.A dish still reads `—`
with no chip, and no page errors. Screenshotted in both colour schemes.
`SHELL_VERSION` and `DATA_VERSION` → `2026-08-15.7`.

## 2026-08-16 01:20 UTC — the collection stops being Wellington's

**Ask.** Owner: parts of the app and repo scope faves to Wellington, "which is
not my intent — I might add places from anywhere in the world that I like."

**What was actually scoped.** Nine strings in the product's own voice: the
`<title>` and `og:title`, the manifest `name` and `description`, the two meta
descriptions, the home subtitle, `restaurant.html`'s `og:description`, the About
lede, the share text, and the te reo `app.sub` (*"o Pōneke"*). Plus README and
CONTRIBUTING. All now name no city and no country. ADR 0042 records the call so
a future session doesn't restore it as description.

**Left alone deliberately.** Venue data (real areas, addresses, coordinates —
that is a fact about a place, not a scope); `index.html`'s no-JS fallback cards
which mirror it; CHANGELOG and session history, which are records of their own
moment; and ADRs 0006/0029/0035, which *illustrate* with Wellington. An example
is not a boundary.

**The part that isn't copy.** The rename exposed three behaviours still
hard-coded to NZ, each correct for every venue held as at 2026-08-16 and
**silently wrong** for the first one outside it — a confident wrong answer, not
a blank: the `Pacific/Auckland` clock behind open/closed (ADR 0006), NZD by
construction (ADR 0037's single site-wide statement plus `price.js`'s bands),
and `summer` = Dec–Feb. Not fixed here — the timezone one alters the schema,
migrates 38 files and supersedes an accepted ADR, which is a different change
from renaming strings, and none of it is needed until a venue actually arrives
from somewhere else. Marked at the source with `#!####`/`#!###` and carried into
ROADMAP Theme 20, with the timezone item flagged as a **prerequisite** to that
first non-NZ venue rather than a follow-up.

**Verification.** `validate.py` 38 files 0 errors; `test_validate` 21/21;
no-deps, SBOM, visibility clean; `node --test` **545**; `device_check` **19**.
`SHELL_VERSION` → `2026-08-16.1` (shell only — no data changed).

## 2026-08-16 01:58 UTC — the pin moves, and the Laws leave the apex

**Ask.** Owner, mid-session: "Check and move the atelier pin if needed." A
parallel session was live in this repo throughout (`faves-c4`), so every change
here landed as one small commit on a clean tree, pushed immediately.

**What the drift check found — and what it missed.** 38 commits on atelier's
`origin/main` since `72cf216`. The doctrine delta is confined to the first 22
(`72cf216..eef38be`); the 16 newer ones are cold-pass reviews, board items and
session records that touch no file under `docs/method/`. Ten method documents <!-- pathscan:allow: atelier cross-repo path — docs/method/ exists in atelier, not in this repo's tree; the same allowance CLAUDE.md and MODEL-ECONOMICS.md already carry -->
moved, but only three carry text this repo inlines.


The check as written would not have found any of it much longer. It read the
atelier checkout's `HEAD`, and that checkout was **16 commits behind its own
origin** — so a pin at the true tip makes `<pin>..HEAD` run *backwards* and
report nothing. Measured, not reasoned: `0107000..HEAD` returns 0 commits on a
tree whose doctrine had moved 38. That is the third instance in this repo of the
failure the same bullet exists to describe — a guard that cannot fire is worth
no more than one that always does. The bullet now fetches and reads
`origin/main`.

**What propagated.** The Three Laws and the Zeroth are **removed** from the apex
(atelier `71b3e8f`); the apex is now honesty, then adaptation. The dilemma
line — which had been carried inside the Laws section — survives on its own as
honesty doctrine, in atelier's new wording (`c782e14`). And the always-confirm
floor changes shape: the principal's authority is **absolute and never decays**
(`38add7c`). What being informed conditions is not the authority but the
*ruling* — an approval given without a what/why/impact briefing still stands as
his word, and is challengeable **on the briefing**, by re-briefing and asking
again. It is never a licence to overrule him. The previous wording ("not a
decision the doctrine recognises") had put the condition on the authority
itself, which is the error being corrected.

**What deliberately did not propagate.** The board-store split — one file per
roadmap item, a generated index — rewrote `RECORD.md` and added a section to
`CONCURRENCY.md`, but it is explicitly scoped: "a repo that has not adopted the
split keeps the monolithic form". Faves keeps `ROADMAP.md` and the relocation
discipline that goes with it, so neither change is owed here. `COMMUNICATION.md`
also unwired the `plainscan` reply gate — faves has never wired it, so the only
thing owed was a **factual correction**: this repo's drift bullet claimed
plainscan "still shows" the always-fires failure. It no longer does. The reason
it came out is worth keeping: a `Stop` hook fires *after* the reply has streamed,
so it could detect the fault but never retract anything — 29 turns blocked and
~123,500 characters reprinted before that was noticed.

**Verification.** `validate.py` 38 files 0 errors (14 pre-existing warnings, all
`picks`); no-deps, SBOM and visibility clean; the full pre-commit floor green
(15 checks, 4 warn-only). Docs-only — nothing under `site/` — so no
`SHELL_VERSION` or `DATA_VERSION` bump was owed, and the Pages deploy is a
no-op. Pushed as `2df2564`.

## 2026-08-16 02:30 UTC — the app stops being a New Zealand app

Continuation of the session above. Five owner asks, taken in order; a worktree
(`wt/global-faves`) from the point the owner warned that parallel sessions were
live.

**1 — Timezone, currency, hemisphere (ADR 0043).** `place.js` resolves where a
venue is. `timezone` per *branch* (a chain either side of the Tasman is open in
each on its own clock), `currency` per venue (one menu, one currency),
hemisphere *derived from latitude* so it cannot disagree with the pin.
`makeClock()` freezes one instant and reads it per zone, memoised — the list is
still ranked against a single moment while each venue is judged on its own.
Price bands are keyed by currency and an uncalibrated one gets **no** derived
band: a band is a calibration against local prices, not an FX conversion, and
this repo has already had to correct one invented threshold (ADR 0036). An order
spanning currencies totals per currency. **No data migration** — both fields
default to the collection's home, so 38 records were correct unchanged.

**2 — A regression we shipped, and the check that was missing.** The 0043 commit
called `venueTimezone` in `app.js` without importing it. `init()` threw, the home
screen served its no-JS fallback, and it went live — while 570 unit tests,
`device_check` 19/19 and `cook_check` 36/36 were all green. Nothing exercised the
*home screen's boot*: the unit tests import modules one at a time, and both
browser checks drive a menu page. The fallback is what made it invisible — the
page looked like a working list of places, because that is exactly what the
fail-soft `<ul>` is for. Hotfixed to `main` inside the same turn it was found.
`tools/boot_check.mjs` now loads each screen and asserts its own JS drew it;
verified by reintroducing the bug (exit 1, naming the ReferenceError). Its
readiness marker is `#result-count`, **not** `.card-link` — the fallback uses the
same class, so the obvious marker is satisfied by the very failure being hunted.

**3 — Settings: eight rows to six.** Language + units are one question (how the
app talks to you); distance + maps app the other (how it gets you to a place).
Each half keeps a sub-heading. The units note claimed "menu prices stay in New
Zealand dollars" — untrue since ADR 0043, and prices were never a unit
preference. Te reo for the merged rows recombines strings already in `reo.js`
rather than inventing vocabulary.

**4 — A chain keeps its name (ADR 0011 applied, at last).** "BurgerFuel
Johnsonville" is a chain and a branch. Five records restructured; "Takeaway @
Churton" and "Khandallah Trading Company" keep theirs, because there the place
name really does contain the place. The interesting half is that **an id is not
private plumbing** — it is in every shared link and every heart, rating and order
line on a family phone, and both failure modes are silent. `renames.js` holds the
table, `data.js` canonicalises *before* the fetch that would 404, and the three
personal stores rewrite ids on read non-destructively. `validate.py` reads the
table out of the shipped JS rather than keeping a second copy that could
disagree with what the browser runs.

**5 — Menus in another language (ADR 0044).** `name` **stays a plain string** —
it is the dish's identity (`slug(name)` anchors, `picks`, `d:<venueId> <name>`
hearts), so translations are a sidecar. The heading takes the best rendering for
the reader; the rest sit beneath, each with its own `lang`, which WCAG 2.2 AA
3.1.2 requires and is why the resolver returns `{text, lang}` and never a bare
string. `th-Latn` vs `th` is load-bearing: it is the only thing that hands a
reader of Thai the script rather than a romanisation. Nothing shipped uses it —
inventing a real shop's menu to demo a feature would put a fabricated fact in a
public repo — so it was proved by grafting a translation onto a scratch copy and
reading the DOM in headless Chrome.

**6 — Seven places from the owner's Airbnb guidebook.** 22 entries in its Food
scene section, 13 already held. Seven added as stubs with OpenStreetMap
addresses and pins (`detailsVerifiedBy: third-party` — nobody stood in them).
**Three refused:** Chilly Pot, Crepes A Go Go and COSMIC Vape & Coffee have no
findable address, and a guessed pin sends someone to the wrong door. Moore
Wilson's is a deli in the guidebook's Shopping section, not a place you eat.

**Verification.** `validate.py` 45/0 · `test_validate` **30** mutations (9 new,
each new validator check also proved by breaking a real record) · `node --test`
**591** (46 new, in `place`/`renames`/`lang` plus the hours/temporal rewrites) ·
`boot_check` **11** · `device_check` 19 · `cook_check` 36 · no-deps, SBOM,
visibility clean. `SHELL_VERSION` → `2026-08-16.5`, `DATA_VERSION` →
`2026-08-16.2`.

**Still owed, recorded not done.** ROADMAP Theme 21 holds the three unfindable
addresses, the seven stubs' missing hours/phones/menus, and an owner ruling on
whether bars belong in an eating app's list at all.

## 2026-08-16 02:46 UTC — two stores, a wider search, and six owner steers

**Ask.** Started as a pin check; became a working session as the owner browsed
the live site and raised items in flight. A parallel session (`faves-c4`) was
live throughout — 45 venues, i18n and chains landed under this one — so every
write-heavy change took a worktree and every commit rebased before pushing.

**The pin.** atelier `72cf216` → `0107000`. Thirty-eight commits, doctrine delta
confined to the first twenty-two. The Three Laws and the Zeroth are **removed**
from the apex; the dilemma line survives as honesty doctrine; the principal's
authority is **absolute and never decays** — what being informed conditions is
the *ruling*, challengeable on the briefing, never a licence to overrule him.
The board-store split did **not** propagate: it is scoped to repos that adopted
it, and this one keeps the monolithic roadmap.

**The drift check could never fire.** It read the atelier checkout's `HEAD`, and
that checkout was 16 commits behind its own origin — so a pin at the true tip
makes the range run backwards and report nothing. Measured: `0107000..HEAD`
returned **0 commits** on a tree whose doctrine had moved 38. Fixed here to
fetch and read `origin/main`; raised upstream as atelier board items 110 and
120 (`1408d98`), since the defect is in the canonical region every child
inlines.

**Two owner rulings, two ADRs.** ADR 0045 — the app ships only what it renders;
data no screen shows lives in `data/`, the repo-only research store. Evidence
first: `priceSeries`/`priceNext`/`asOf` had **zero consumers** outside the
module computing them. The payload cost was honestly small (648 B gzipped of
56 KB) and the ADR says so — the recommendation had been to leave it, the owner
ruled otherwise, and he is right about the mechanism: a store with no rule
about what enters it is one where every addition is defensible and the total is
not. 212 superseded prices and 14 departed dishes moved; payload 61,428 →
60,506 B gzipped. ADR 0046 — ownership and contacts (name, email, phone) may be
recorded, bounded by **provenance**: public-record or given. That widens the
*no personal data* constraint for the first time on a public repo, so it is
written down as a widening. Provenance is enforced as an **error**, because a
bound only written down is not a bound; `test_registry.py` catches 16 of 16
mutations. The store ships **empty** — inventing an ownership fact about a real
business would be a claim beyond its evidence.

**Six steers while browsing.** Delivered: the search index now matches address,
city, service and phone (however punctuated) and a dish by the diet it
satisfies, with a small synonym map — and no synonym that could assert an
allergen is *absent*, held by a test. The box advertises itself with a rotating
placeholder that stops on focus, stops with text in the field, and never starts
under reduce-motion. And About's version note moved above the numbers, at body
size, where the rest of the dialog's heading→prose→detail order already was.
Queued: Theme 22 (search-to-settings; the Favourites takeover, where two ways
back is the symptom not the cure; and one model for a person's data), Theme 23
(About is sediment — rehome each block by working back to the decision that
created it; write the voice guide). The owner's sharpest line is recorded in
22c as a scope ruling: on transfer, *"the tech is probably ok, the UX is bad"* —
so re-front the mechanisms, don't rebuild them.

**Verification.** `node --test` **612** (21 new); `validate.py` 45 files 0
errors; `test_validate` 30/30; `test_registry` 16/16; `registry`, `split_data
--check`, no-deps all clean; `device_check` 19/19; and the placeholder driven in
real headless Chrome at 390 px, 5/5. The `sw-versioning` test earned its keep —
it failed the moment `search-hints.js` existed but was missing from `SHELL`,
which offline would have broken. `SHELL_VERSION` → 2026-08-16.7, `DATA_VERSION`
→ 2026-08-16.3.

**Left undone, deliberately.** The te reo strings for the eight search hints —
untranslated reads as English, invented reads as wrong, and only one of those is
recoverable; the gap is marked in `reo.js` and carried into Theme 23b. ADRs
0042–0044 are **unindexed** in `docs/decisions/README.md` by the sessions that
wrote them, which is the exact hazard that README warns about; left alone as
another session's work rather than edited underneath it.

## 2026-08-16 03:13 UTC — the browse sweep, delivered

**Ask.** Continuation of the session above: the owner kept browsing the live
site and raising things. Six more items, each triaged on his standing rule —
deliver it, or queue it if it wants a session of its own.

**Delivered.** The search hints held for 4 s, which read as restless; they now
hold about 7 s (**7425 ms measured live**) and cross-fade rather than snapping.
The fade is a class toggle plus a CSS transition on `::placeholder`, not a JS
animation, with `FADE_MS` and the CSS duration paired and commented. The
failure mode worth guarding is a placeholder left invisible when someone taps
the box mid-fade — every pause path goes through `settle()`, and focus, typing
and `stop()` each have a test.

The allergen ⓘ carried three defects in one screenshot. Its halo was a
`background` on the 44 px button, so it painted a block, off-axis in the
settings row where the glyph is left-aligned; it is now a `::before` circle
centred on the glyph, **31 px measured**, tap target unchanged. Its note was an
absolutely-positioned popover inside a scrolling dialog, so it ran past the
edge and lost its last line; inside Settings it now sits in flow — **356 px
inside a 390 px dialog, no overhang**. Its copy went from 60 hedged words to 50
plain ones, with the two things that must not be misread in bold. Every safety
point survived the trim and the code names them so a later edit cannot shave
one off by accident.

The order-number badge moved to the right of the dish name — leading with it
made every row start on a number, and the accessible name read "#1 Wonton
Soup". The update prompt says what the reader gets ("An update is ready, with
the latest menus and prices") rather than what the software is.

**The one with real data behind it.** "Menu coming soon" venues were unlinked
and had their open/closed badge explicitly suppressed. We hold far more than
the card admitted: of 23 stubs, **19 have an address, 19 coordinates, 12 hours,
9 a phone** — all 23 carry at least one. All 23 now open, and **15 now show a
live badge** such as "Closed · opens 5pm". The suppression was also redundant:
`openStatus` already reports `unknown` without hours, so removing it reveals
only the venues that genuinely have them. And the standing "Read in store"
line, which appended the verification date, came off the venue page — it
repeated the ⓘ above it, which carries that date plus what was checked and how.


**Answered without a change.** Cuisine search already worked — `cuisine` has
always been in the place haystack. "Mexican" returns nothing because there is
no Mexican venue in the collection, which is a data gap, not a search one.

**Queued.** Theme 23c — the same outcome answered on two screens: Refresh lives
in Settings, the version evidence in About, and "am I up to date" is one
question. Theme 23d — card density, and what should scale with screen size;
noted there that hiding a chip no longer hides the fact, since the search index
now covers services and cuisine.

**Verification.** `node --test` **621**; `validate.py` 45 files 0 errors;
`device_check` 19/19; `cook_check` 36/36; and three purpose-built live runs in
headless Chrome at 390 px — the cross-fade 6/6, the ⓘ geometry 7/7, and the
stub cards measured on the real home screen. `SHELL_VERSION` → 2026-08-16.10.

**A harness lesson worth keeping.** Two live checks reported false failures
before they reported true ones: one measured the hint interval from page load
(load latency ate the window) and one waited on `li.card`, which the **no-JS
fallback `<ul>` already satisfies**, so it read the static mirror instead of the
rendered list. On a fail-soft page, wait for a JS-only signal — `body.app-ready`
or an unhidden control — never for markup the fallback also provides.

## 2026-08-16 04:00 UTC — the subheading stops being a label

**The ask (owner, raw).** *"In the sub heading that says 'Asian · Malaysian ·
Noodles — Johnsonville' I should be able to click on things like the word
Malaysian or Johnsonville and jump to a search/filtered list of the restaurants
that meet that criteria e.g. all restaurants that serve Malaysian cuisine."*

**What shipped.** Every facet in a venue's subheading is now a link into the
home list, already filtered. The transport is the URL — `index.html?cuisine=
Malaysian`, `?area=Johnsonville` — which was the choice worth making, and it
buys three things a `sessionStorage` hand-off would not: a filtered list is
shareable and bookmarkable, Back works without special-casing, and the whole
thing survives the service worker's offline shell because it is one static page
reading its own query string.

`filters.js` owns both ends — `filterHref` writes the URL, `filtersFromQuery`
reads it — so the two screens cannot drift apart on a param name. Three things
the implementation had to get right:

- **The controls are set from the URL, not just the list.** A list filtered to
  Malaysian above a dropdown reading "All cuisines" is a screen lying about
  itself, and the reader has no way back to the full list.
- **An unknown value means "all", not "nothing".** A `<select>` handed a value
  with no matching `<option>` silently falls back to its first option — so
  `?cuisine=Klingon` (or a cuisine we renamed after someone bookmarked it)
  would empty the list while the control claimed nothing was wrong. Unknown
  values are dropped at the parse boundary.
- **The URL is rewritten as the dropdowns change** (`replaceState`, not
  `pushState`): a stale `?cuisine=` left in the bar would come back on reload
  and re-narrow a list the reader had since widened — and Back should return to
  the menu page they came from, not walk through every dropdown they tried.

Separators (" · ", " — ") stay outside the anchors: punctuation between links,
not part of any link's accessible name. Each link carries an `aria-label`
naming the destination ("Malaysian — see every Malaysian place"), because
"Malaysian" alone doesn't say what following it does. Styled as a dotted
underline going solid and accented on hover/focus — a caption that signals
"there's more here" without turning into a row of blue. Inline links inside a
sentence are the documented exception to the 44 px target rule (WCAG 2.2
SC 2.5.8); the line-height went to 1.7 so the rows don't crowd when the
subheading wraps at 390 px. The recipe collection's subheading is a sentence,
not facets, so it stays plain text.

**The guard, and proof it bites.** `boot_check.mjs` gained the cross-screen
assertion the unit tests structurally cannot make: read the first
`.menu-sub-link`'s real `href` off a rendered menu page, navigate to it, and
assert the home list came back *filtered* ("1 of 45", not "45 places") with the
dropdown set to the same value. Verified by breaking it — renaming the query
param in `filterHref` alone turned both new checks red, and only those two.

**🔎 The adjacent one that can't work the same way.** The home cards carry
cuisine chips too, and the obvious next step is to make those filter as well.
They can't yet: each card is already one big `<a>`, and a link inside a link is
invalid HTML. That needs the card's hit area restructured, which is ROADMAP 23d
territory — recorded there rather than bolted on here.

**Verification.** `node --test` **631** pass; `validate.py` 45 files, 0 errors;
`check_no_deps` / `check_visibility` / `gen_sbom --check` all clean;
`boot_check` **13/13** (was 11), `device_check` **19/19**, `cook_check`
**36/36**; and both screens eyeballed in headless Chrome at 390 px.
`SHELL_VERSION` → 2026-08-16.14.

**Concurrency.** Taken in worktree `wt/facet-links` (`~/worktrees/faves-facets`)
after the owner flagged parallel sessions mid-task; `wt/fx-localisation` was
live at the time and untouched. ⚠️ `SHELL_VERSION` was bumped .13 → .14 against
`main` as it stood — if another branch merges its own bump first, that constant
is the expected conflict, and the resolution is always "deployed + 1", never a
merge of both strings.

**A second owner report, same session — the currency note crowded its control.**
*"The text sits too close to the highlight around the drop down box, close to
overlapping."* The rate-age line under the Currency picker (new this day, from
the FX work) had no top margin, so it butted against the select. The part that
made it look like an overlap is the **focus ring**, which sits 4 px *outside*
the border (2 px outline + 2 px offset) and appears precisely when the reader
has just used the control and is reading the note under it. Every other note in
that panel is preceded by a heading that supplies the gap; this is the only one
that follows its control directly, so the rule is written on the pairing
(`.lang-select + .settings-note`) rather than on the one note — the next note
placed under a select inherits the fix. Measured after: 16 px gap, 12 px clear
of the ring, and eyeballed focused at 390 px.

**Concurrency, how it actually went.** The FX session pushed `main` (a merge
commit, 7 commits) while this work was mid-flight. Rebasing onto it conflicted
in exactly one place — `site/sw.js` — as predicted. Resolved to
`SHELL_VERSION 2026-08-16.14` + `DATA_VERSION 2026-08-16.4`: theirs for data
(they added three venues), deployed-plus-one for the shell.
🚩 **Worth knowing:** their merge changed `app.css`, `index.html` and 15 JS
files but left `SHELL_VERSION` at `.13`, so `main` deployed a new shell under
the old version — installed phones would not have refetched it, and the FX
conversion would not have reached them. This branch's `.14` carries both
changes and fixes that on merge. Re-verified after the rebase against the
combined tree: `node --test` **655**, `validate.py` 48 files 0 errors,
`boot_check` 13/13, `device_check` 19/19, `cook_check` 36/36.

## 2026-08-16 04:16 UTC — the polish pass, and a number that was taken twice

**Ask.** The owner kept browsing and raising items; each was triaged on his
standing rule — deliver it, or queue it if it wants a session of its own. A
parallel session ran throughout, landing FX/localisation and facet links.

**Delivered.** The report ⚑ on a dish row was invisible, and the cause was
worth naming: it rendered at 55% of the ♥ beside it, dimmed to 0.75, in a
smaller box — **three reductions stacked on one control**, each defensible
alone. It now matches the ♥'s family (86%, since a solid ⚑ reads heavier than
an outline ♡) at full strength in a matching 52 px box, and is recessive by
**colour alone**. That shape — de-emphasis applied on several axes at once —
is the same one that made the allergen ⓘ hard to see earlier, and belongs in
Theme 23b's guide as a rule: pick one axis to recede on.

The hours badge stopped repeating itself. It renders `label · detail`, and both
"soon" states had a detail restating the label: "Opens soon · opens in 14 min".
Both now carry one phrase — "Opens in 14 min", "Closes in 12 min" — with the
amber dot carrying "soon". Further out the halves genuinely differ, so "Closed ·
opens Tue 11am" is untouched. All five phrasings were checked against real
hours, not just the two that changed.

The update prompt took the owner's own wording: *"Get it while it's hot! Update
for the latest menus and prices."*

**The cuisine gap, and why the answer is nothing.** Searching "mexican" returns
nothing. Before proposing any venue, every menu was audited against
cuisine-signature dishes in case a cuisine we already serve was merely untagged.
Seven venues matched and **all but one are a single dish** — "Korean-Fried
Cauliflower" at three separate gastropubs, one "Korean Style Chilli Beef" in KC
Cafe's 169. Tagging any of them Korean would be false and would make search
worse. So the gap needed venues, not tags — and the owner ruled **leave it**:
coverage is not a goal, a cuisine arrives when a place he likes arrives. Written
into Theme 24 as prose rather than a `[x]` item, deliberately: the cold-content
gate would have harvested a completed checkbox to `ROADMAP-DONE.md`, and the
whole value of the entry is the next session reading *do not re-propose this* in
the live roadmap. `leakscan` blocked the first attempt — a candidate street name
contained a private estate term, on a public repo. The guard earned its keep;
the names came out.

**ADR 0045 existed twice.** The FX branch merged minutes after this one and both
took 0045. Both sessions allocated at merge as the rule requires, and both found
it free when they checked — two long-lived branches, not a broken rule. Ruled by
the owner: this record moves to **0047**, because the FX decision is a shipped
feature carrying its number in nine `site/js` comments. Eleven references updated
in one commit; every reference the FX record owns re-checked afterwards and left
alone. The record now states on its face that it was renumbered, because a dozen
of today's commit messages call it "ADR 0045" and git history cannot be edited —
without the note, someone following one of those messages lands on the currency
decision. The contrast with `0025` is recorded with it: same rule, opposite
answer, because the rule is about **cost**. 0025 was found weeks late with 24
inbound references; this was found within the hour and cost eleven.

**Verification.** `node --test` **655**; `validate.py` 48 files clean;
`device_check` 19/19; `cook_check` 36/36; `registry` and `split_data --check`
clean; plus live runs in headless Chrome at 390 px for the ⚑ geometry (5/5) and
the card layout (8/8). `SHELL_VERSION` → 2026-08-16.13.

**A harness lesson, repeated often enough to write down.** Purpose-built live
checks produced false failures three times before producing true ones: one timed
an interval from page load, and two waited on `li.card` — which the **no-JS
fallback `<ul>` already satisfies**, so they measured the static mirror rather
than the rendered page. On a fail-soft site, wait for a JS-only signal
(`body.app-ready`, an unhidden control), never for markup the fallback provides.
## 2026-08-16 04:20 UTC — the guard the missed version bump earned

**The report.** The owner clicked "Malaysian" on a venue page, landed on
`index.html?cuisine=Malaysian`, and got all 48 places with the dropdown
reading "All cuisines".

**The verdict: the deployed code was correct, his browser was not.** Verified
against the live site on a fresh profile, twice — once navigating straight to
the URL, once walking the real journey (load home so the service worker
installs and takes control, open a menu page, *click* the link so the
navigation goes through the worker exactly as a tap does). Both gave
**"6 of 48 places"**, six Malaysian cards, dropdown set to Malaysian, no
console errors. `curl` confirmed the deployed `app.js`, `filters.js` and
`sw.js` all carry the new code at `SHELL_VERSION 2026-08-16.14`.

**Why his was stale, and the real defect underneath.** Earlier the same day the
FX merge changed `app.css`, `index.html` and 15 JS files while leaving
`SHELL_VERSION` at `.13`. That is not a cosmetic slip. `sw.js` only rebuilds a
cache that lacks its `READY` sentinel (`if (await existing.match(READY))
return`), so a cache under an unchanged version name is **skipped entirely** —
the new shell was never cached, every phone that already had the site kept
serving the old one, and nothing anywhere reported an error. CI was green. The
site was correct for anyone arriving fresh. The only way to find it was to be
holding an affected phone, which is exactly how it was found.

**So the fix is not to the feature — it is a guard.** `tools/check_versions.py`
compares two states and fails if files changed under `site/` without the
matching constant moving: `site/data/` → `DATA_VERSION`, everything else →
`SHELL_VERSION`. Wired into CI (PR against its base, push against
`event.before`), added to CLAUDE.md's verify list, and named in the lockstep
rule that previously relied on memory alone.

**Proof it fires, on the real case.** Run against `15a467d..99701ec` — the
actual merge that shipped the bug — it exits 1 and names the 19 shell files.
Against this branch's own range it passes. A guard verified on the incident it
was written for, not on a fixture.

🔎 **And the test found a flaw in the guard on its first run.**
`tools/test_check_versions.py` builds throwaway git repos and asserts the
checker fires exactly when it should (9 cases). Case 4 failed immediately:
`site/sw.js` was being classified as a shell file, so **every data-only menu
edit** would have been flagged — because bumping `DATA_VERSION` *is* an edit to
`sw.js`. A guard that cries wolf on the documented-correct action is one people
learn to override, which is precisely how four earlier checks in this repo went
decorative. `sw.js` is now excluded as the *carrier* of the versions rather
than a cached asset (it is in no precache list, and the browser always fetches
it fresh), and a case pins that exclusion so it cannot come back.

**Verification.** `test_check_versions.py` 9/9 · `check_versions.py` correct on
three real historical ranges (one bad, two good) · `validate.py` 48 files
0 errors · `check_no_deps` / `gen_sbom --check` clean · live site verified twice
in headless Chrome, including the full click journey under an installed and
controlling service worker.

## 2026-08-16 04:30 UTC — prices in your own money, and an automation walked back

Continuation. Five owner asks; the last one is the one worth reading.

**Prices convert (ADR 0045).** Rates ship as data — `site/data/fx.json`, 35
currencies, 4 KB, dated, cached beside the menus, read offline. A live FX call
was never available: third-party runtime dependency (ADR 0001) and blank in
flight mode, which is exactly when someone abroad is reading a menu. The
interface stays quiet — no currency code against any price. Where the reader's
currency IS the shop's, the page is what it always was; where it isn't, the
conversion is disclosed once per menu (a line under the header, plus the rate's
date in the existing ⓘ) and never on 187 dishes.

**"Local" on all three localisation settings**, resolving from the device's
**timezone first**, locale region second. That order is the feature: a
Wellington phone landing in London reports `Europe/London` and `en-NZ`, and the
person in the café wants pounds and miles.

**`currency` is now required on every record.** The owner asked for currency
against every *price*; delivered by declaration rather than repetition — one
field per menu, optional per-item override. The property holds either way: no
stored price is of unknown currency.

**Two import cycles fell out** and are broken by leaf modules (`home.js`,
`defaults.js`). Both had already killed a screen. `boot_check` caught them,
which is the second time in two sessions it has earned itself.

**The automation we built and then removed.** A scheduled job to refresh the
rates is the obvious answer and it does not work here. It cannot push to `main`
— proved by running it, not reasoned about:

> `GH013: Repository rule violations found for refs/heads/main.`
> `- 4 of 4 required status checks are expected. ! [remote rejected]`

A direct push can never satisfy a required status check; the check runs on the
push the rule is refusing. Two ways round were offered and both were worse than
the problem — a ruleset bypass (weakening a protection on a public repo for a
convenience) and a staging-branch/poll/fast-forward dance (works, and is
machinery a later reader must reverse-engineer before trusting). The owner
stopped it: *"the advice you are giving me sounds like the things that in a
later session you will tell me this session was crazy wrong and did something
weird / risky that we then undo."* That was the correct call, and his own
message contained the design: **a session refreshes the rates as part of its
work, at most once a day.** `tools/fetch_fx.py` enforces the ceiling itself, so
the instruction in CLAUDE.md is safe to follow without thinking. Parked in
ROADMAP with the evidence and the rejected options.

**A process failure worth recording.** The Bash tool resets cwd between calls,
and two edits meant for this session's worktree landed in the **main worktree**
another session was using. Caught by reading `git status` on both trees, and
reverted before anything was committed there. The habit that prevents it is
`git -C <path>` and absolute paths in every script — assumed-cwd is the whole
bug, and a worktree is no protection at all if the commands don't name it.

**Verification.** `validate.py` 48/0 · `test_validate` **32** mutations ·
`fetch_fx --check` 35 rates · `node --test` **655** under three locales
(Wellington, US, London — CI caught an environment-dependent default this
session, which is what prompted running it that way) · `boot_check` **13** ·
`device_check` 19 · `cook_check` 36 · no-deps, SBOM, visibility clean.

**Still owed, recorded not done.** Chilly Pot's identity (one look at the
shopfront), where Moore Wilson's stops being a place you eat, dish ids
(Theme 25, analysed with a recommended shape), and the FX automation if the
refresh ever actually lapses.

### Closing rulings — 2026-08-16

Four owner decisions taken at the end of the session above, recorded where they
belong rather than only here.

- **"Chilly Pot" is Babaili Malatang.** Confirmed; one shop, already held,
  nothing to add. Worth noting the process failure rather than just the fact:
  he had said so when he first raised it, and I asked again anyway. The evidence
  I gathered only agreed with him. *Read what the owner already told you before
  putting it back to him as an open question.*
- **Menu content is owner-supplied or owner-directed.** *"Whatever food/dishes I
  give you are to be included, if I don't give them to you or tell you to fetch
  them they are not."* This dissolves rather than answers the Moore Wilson's
  question — there is no line to draw per venue, so the `kind: "food-store"`
  idea is retired too. Promoted to a standing rule in CLAUDE.md, because it
  governs every intake.
- **Dish ids: approved, for a NEW session.** Theme 25 carries the analysis, the
  recommended shape and a pointer at `renames.js` as the working precedent to
  copy. Not started here on purpose — it migrates personal data on every family
  device and wants a session doing only that.
- **FX automation is wanted, weekly at minimum.** The per-session manual refresh
  that shipped is a stopgap, and its weakness is now written down: it covers a
  repo being worked on and stops covering anything the moment the repo goes
  quiet, which is exactly when the rates need it. Theme reframed from "revisit if
  it lapses" to a live want, with the three candidate approaches costed — and a
  third one added that nobody had considered: a scheduled job that opens a PR and
  **auto-merges** it, which satisfies the required checks the ordinary way, needs
  no bypass and no unusual git. The owner rejected "open a PR" when it meant
  waiting on him; auto-merge doesn't.
## 2026-08-16 04:45 UTC — a filtered list that says so, and lets you out

**The report (owner).** The facet link works, *"but I'm left without a clear way
to get back to a normal Faves experience. Why can't clicking on Malaysian take
me to the search page the user is used to seeing and using, and has a simple way
back to home / normal?"*

**The diagnosis is right; the proposed route is not, and the numbers say so.**
The complaint is real: every other filter on the home screen was pressed *on*
that screen, so the control you pressed is the control you un-press. A cuisine
arriving in the URL was chosen on a different page — you land narrowed having
touched nothing here, and the only undo was a `<select>` in the sticky bar at
the far end of the page, which reads as furniture rather than as the thing
currently doing this to the list. The search screen has always had a ✕ on its
query for exactly this reason. Browse had nothing.

But pointing the links at search would answer a *different question* than the
link promises. Measured across the whole corpus — every cuisine and every area,
facet-filter set versus text-search set:

| | |
|---|---|
| Facets where the two agree exactly | **45 of 51** |
| Where they differ | **6** — and search never *misses* a venue, it **adds** |

The additions are name and address matches, not cuisine ones. Search "Bar"
and you also get 1841 Bar & Restaurant, Charley Noble, Southern Cross and The
Catch Sushi Bar — four venues whose *name* contains "Bar" and whose cuisine is
not. "Pub" returns 6 places of which 5 are not pubs. "Cafe" picks up KC Cafe,
which is Chinese and Malaysian. "Courtenay Place" pulls in three venues that
merely have it in their address. "Malaysian" happens to agree exactly, which is
why the route looked sound from the one example that prompted it.

So: keep the facet filter (it answers the question the link makes) and give it
the affordance search already had.

**What shipped.** An active area/cuisine filter now renders as a dismissible
chip beside the place count — accented, not the quiet grey of the neighbouring
toggles, because it is the *reason* the list is short. One tap clears the state,
the `<select>`, and the URL param together, and focus lands on the count (which
is `role="status"`, so the restored total is announced) rather than falling to
`<body>` when the chip it was on is removed from the DOM.

🔎 **Squeezing it into the results head was a regression, caught by looking.**
As a third flex column at 390 px it stole width from both neighbours: the count
broke to three lines ("6 of / 48 / places") and the four toggles unstacked into
a single column — far more height than the chip's own row costs. It now takes a
full-width row below them on a phone and sits inline beside the count from
34 rem up, where there is room. Both widths screenshotted.

**The guard held.** `boot_check` gained two more cross-screen assertions (the
chip appears and names what it does; clearing it restores list, control and URL
together) — 15/15, up from 13.

**Verification.** `node --test` **655** · `validate.py` 48 files 0 errors ·
`boot_check` **15/15** · `device_check` 19/19 · `cook_check` 36/36 ·
`check_versions.py` clean (SHELL_VERSION → 2026-08-16.16) · 390 px and 1200 px
eyeballed.

⏳ **Left with the owner.** He asked for the search page specifically. This
delivers the escape he was actually missing while keeping the link honest — but
if he wants the search route anyway, knowing 6 facets over-match, that is his
call and it is a small change to make.

### FX automation, delivered on the third attempt — 2026-08-16

The owner picked the option nobody had costed: a scheduled job that opens a PR
and **auto-merges** it. It shipped, and it was proved end to end rather than
reasoned about — PR #3 opened, the four checks ran, auto-merge landed it, the
branch deleted itself.

Getting there cost two false starts, both worth keeping because they look
attractive from the outside:

- **Push straight to `main`** — refused outright. A direct push can never satisfy
  a required status check, because the check runs on the push the rule is
  refusing.
- **A ruleset bypass, or a staging-branch-and-poll dance** — the first weakens a
  protection on a public repo to buy a convenience; the second works and is
  machinery a later reader has to reverse-engineer. The owner stopped both.

A PR needs neither: it is how required checks were designed to be satisfied, and
`--auto` means nobody waits on it.

**Two things I got wrong on the way, recorded because the reasoning was the
problem, not the typing.** I predicted a bot-created PR would not trigger
workflows at all (the GITHUB_TOKEN recursion rule) — it does; they ran. And
having predicted that, I nearly designed around a constraint that did not exist.
The actual constraint was different and only visible by running it: the runs
arrive as `action_required`, because a PR from `github-actions[bot]` counts as an
*external contributor* and this repo requires approval for those. Both facts came
from executing the thing, and neither would have come from thinking harder.

**Two repo settings changed, both disclosed:** `allow_auto_merge` on (weakens
nothing — every merge still passes the same four checks) and
`can_approve_pull_request_reviews` on (Actions cannot open a PR without it).
A third setting — `approval_policy` — was deliberately NOT touched: loosening it
would let any stranger's PR on a public repo run workflows unreviewed, which is
a permanent, repo-wide cost for one weekly convenience. The narrow fix is an
`FX_TOKEN` secret the owner mints; the workflow already prefers it and falls back
without it, so adding the secret is the entire remaining change.

## 2026-08-16 06:15 UTC — order it the way you eat it: add-ons ship with their safety rule

Theme 14a + 14d + 14e, taken as one unit because 14d says so and it was right.
Worktree `faves-addons`, three parallel sessions live throughout.

**The information was already there; only the shape was wrong.** Measured
before designing anything, across all 48 records: 28 dish descriptions carry a
priced add-on in prose, 63 carry an unpriced choice, 17 dishes *are* add-ons
wearing a dish's clothes, and 11 sections across 9 venues — 92 rows — are
add-on groups rather than things you would order alone. The owner's own
example (Wellington Kebab Grill's counter card) and the densest venue
(Sprig & Fern, 12 of 63 dishes) became the pilot.

**The corpus proved the safety case rather than implying it.**
`tools/tag_allergens.py` already *excludes* add-on prose from its inference —
correctly, since "add prawns +$7" does not make a garden salad shellfish. But
the prawns' own `contains-shellfish` then had nowhere to live. Every allergen
named in an add-on, corpus-wide, was being dropped on the floor.

**The design call that cost the most thought: intersection, not
contradiction.** The gentle rule is to drop a dietary claim only when an option
positively states a clashing allergen, reading the contradiction table straight
out of `tag_allergens.py`. It handles satay perfectly — and misses grilled
chicken entirely, because meat carries no `contains-*` at all, so a vegan dish
plus chicken would still read vegan. So: **allergens union, dietary claims
intersect**. Both moves fail-safe, mirroring ADR 0025's one-way rule.
The satay example alone could never have taught this; it is the easy case.

**Two deviations from what the roadmap expected, both evidence-led.**

- *Free is written `0`, not implied by an absent price.* The roadmap argued a
  missing price should mean free so twelve sauces need not say so twelve times.
  The terseness is worth having; the implication is not — a transcriber who
  forgets a price then produces a silently free add-on and an under-stated
  total with nothing to catch it. A **group-level price default** gets the
  terseness back while leaving every option's cost answerable.
- *The share codec did not bump.* `CODEC_VERSION` is shared by orders,
  shortlists and personal transfers and checked with a strict `!==`, so a bump
  invalidates every outstanding link of all three kinds for a change two never
  use. The selection is appended as a fourth positional slot instead — every
  existing decoder ignores it by construction — and slot 1 became the
  *configured* unit price, so an old reader still totals correctly. It
  under-specifies rather than mis-states, and dropping an add-on can never put
  something extra on a plate.

**A live defect found and deliberately not fixed.** `slug(name)` is not unique
within a venue: 22 dish rows across 3 venues collide on 10 names, every one at
a different price. `cart.js` matches a line on `(venueId, name)`, so adding
Sprig & Fern's $21 Gold Card Cheeseburger to a tally holding the $28 Mains one
charges **$56 instead of $49** — reproduced against the real module, not
reasoned about. That is dish identity, which the owner reserved for its own
session; the evidence is recorded under Theme 25 and the fix left there.

**A new browser check, for the reason the last two exist.** `addon_check.mjs`
drives the real picker at 390 px on the owner's own venue: the cap refuses a
fourth sauce, satay names peanuts live, the flagged treatment follows the
*configuration* rather than the dish, and the configured dish becomes its own
order line. Its header names what a green run still cannot tell you — above
all that no browser can check whether "Garlic yogurt" really contains dairy.

**A concurrency trap worth recording.** `DATA_VERSION` was bumped to `.5`,
then a parallel session pushed its own `.5` and the rebase silently absorbed
mine — `check_versions.py --range origin/main..HEAD` caught it, the bare
`check_versions.py` did not, because with no range it only reads *staged*
changes and the tree was already clean. **Run it with the range, not bare,
when checking a finished branch.**

**Verification.** `validate.py` 48/0 · `test_validate` **53** mutations (was
32; +19 for add-ons, including 2 that mutate `site/js/addons.js` itself to
prove the CONTRADICTS/CONTRADICTED_BY drift gate can fire) · `node --test`
**680** · `boot_check` 15 · `device_check` 19 · `cook_check` 36 ·
`addon_check` **9** (new) · no-deps, SBOM, FX, visibility, `split_data --check`
and version lockstep all clean.

**Still owed.** 14b (the corpus sweep, sized above), 14c, 14f (combos, blocked
on Theme 25), a `min`/required rule for pick-one groups, and a group-level
marker for preparation-only options that today have to write vacuously-true
tags to survive the intersection rule. All named in ROADMAP rather than left
in this log.

### Owner rulings — 2026-08-16, closing the add-ons session

Four decisions put to the owner with the trade-offs stated, all answered.

- **Free is written `0`, not implied by an absent price — ratified.** The
  deviation from the prior session's note stands, on the ground given: a
  forgotten price would otherwise be a silent under-charge nobody catches, and
  the group-level default keeps the sauce board terse anyway.
- **Hide the duplicated section — ruled, and built the same session.** The
  cost was stated first: a heart or rating saved against a hidden row stops
  appearing. He took it, because a menu that prints "Extra halloumi" twice is
  the version a person is holding in the shop. `addOnsOnly` + ADR 0049; the
  rows stay in the record, and `validate.py` refuses the flag unless every row
  it hides is still reachable as an option. Proved by breaking it, both ways —
  removing an option makes the validator name the orphan, and un-hiding the
  section makes `addon_check` fail.
- **The `$56`-for-`$49` overcharge waits for Theme 25, as reserved.** Not
  patched narrowly here: a second identity concept in `cart.js` is something
  the dish-ids session would then have to unpick.
- **The queue behind this is all four of 14b, Theme 25, 14f and 14c.** Theme 25
  is the one that unblocks the other two, so it wants to go first even though
  14b is the larger pile.

## 2026-08-16 05:05 UTC — closing: two rulings recorded, and 3.5 GB of leaked Chrome

**Owner ruling 1 — the facet links stay as they are.** Presented with the
measurement (facet and text search agree on 45 of 51 facets; on the other 6
search never misses, it *adds* — "Pub" returns 6 places of which 5 are not
pubs), the owner ruled **keep as is**, and asked that the option stay open in
case he changes his mind. Recorded as **ADR 0050**, which is deliberately a
*kept-open* record rather than a closed one: it carries the measurement table,
the four-step switch path (`filterHref` → `?q=`, `wireSearch` reads it, delete
the now-duplicate chip, retarget the two `boot_check` assertions), and — the
part that matters — **what switching costs**, so the trade is never
re-litigated from memory by a session that only remembers the ask.

**Owner ruling 2 — search's over-matching is roadmapped, not fixed.** Recorded
as **Theme 27**. The framing that survived the analysis: this is not a matching
bug, it is a **ranking** gap. A wide haystack is correct for free text; what is
missing is that a venue which *is* Malaysian and a venue merely *named*
"…Malaysian" are indistinguishable in the result list. 27b (show which field
matched) is recommended before 27a (weight facet hits higher), because letting
the reader judge relevance may make the weighting unnecessary.

🔎 **The closing sweep found 64 leaked headless-Chrome processes holding
3.48 GB**, plus 60 abandoned throwaway profile directories. The owner's Chrome
had just crashed, and this is a very plausible contributor. **None were from
this session** — `tools/lib/browser.mjs` calls `stopChrome` in a `finally`, and
every `boot-check`/`shot`/`live` profile was already gone. The survivors were
`stub`, `tip`, `fade` (56 processes, from earlier ad-hoc one-off scripts written
inline during the browse sweep) and `addon-check` (8, from the live Theme 14
session). Owner approved killing all 64; done, plus the profile dirs.

🚩 **The lesson is about ad-hoc scripts, not the harness.** The three purpose-
built live runs recorded in the 03:13 UTC entry each launched Chrome inline and
never stopped it. Anything that launches a browser must use
`tools/lib/browser.mjs`'s try/finally shape — or, better, earn its place as an
assertion inside `boot_check`/`device_check`/`cook_check` rather than existing
as a throwaway. A one-off script that leaks 3 GB is not cheaper than a check
that lives in the tree.

**Also noted, not fixed (not this session's lane):** ADRs **0048** and **0049**
are not yet in `docs/decisions/README.md`. They belong to the live add-ons
session, which is mid-flight; an unindexed record is invisible to the next
allocator and is exactly how the duplicate `0025` survived, so it is flagged
here for that session to close rather than filled in from outside.

**Session close.** Six commits landed on `main` across the session, each with
CI and floor green. Nothing owed, nothing uncommitted, no open PRs, worktrees
removed.

### 2026-08-16 — a safety defect found by asking a modelling question

The owner asked whether Sprig & Fern's three Cheeseburgers ($28 Mains, $21 Gold
Card, $15 Kids) should be one dish with a serving size and a discount. Two
corpus surveys were run before answering, and they turned up something more
urgent than the question.

**The Gold Card rows had lost their allergen warnings.** All seven carried
fewer `contains-*` tags than their full-price twins; Chicken Parma shipped with
`tags: []` on a crumbed, mozzarella-topped dish. Cause: `tag_allergens.py`
matches on name + desc, and a `"Gold Card portion."` stub has no ingredients in
it. Effect: a reader filtering for gluten free saw the $21 row survive the
filter while the $32 row dimmed. Fixed fail-safe — only `contains-*` added,
only what the twin already carried; Summer Salad's missing `df` deliberately
left off, because restoring a positive claim from a stub desc is precisely what
ADR 0025 forbids. `check_twin_allergens()` is the guard, a warning not an error
because a kids' version really is different food.

**On the question itself, the measurement contradicted the premise.** Gold Card
is not a discount: four rows say `"Gold Card portion."`, the Sirloin says 150g
against the Mains 230g, and the ratios run 66–79% rather than one percentage.
The corpus contains **zero** discount language of any kind. The real pattern is
size — 41 variant groups over 96 rows, plus **81 rows carrying a second price
inside a `desc` string** (153 price points), 72 of them drinks. Collapsing on
name would be actively wrong for 29 rows, including merging an alcohol-free
`Heineken 0.0` into a beer, and 5 variant groups have an empty allergen-tag
intersection so no merge rule preserves safety. Recorded as Theme 28.

**Incidental finding worth someone's judgement:** the new twin check flags that
Mains `Cheeseburger` carries no `contains-dairy` while the Kids one does — and
its own desc ends "Dairy free available.", which implies the default has cheese.
Left as a warning rather than guessed at; it is a claim about food.

### Owner ruling — 2026-08-16: identity must be immutable

Asked to choose between `formerNames` and `formerIds` for Theme 25, the owner
answered past the question, and the answer is the more important one:

> *"There is no much (maybe no) use beyond myself and I am ok with breaking
> changes that lose favourites, ratings etc right now but in the future I will
> not be ok with losing any of that and impacting end users. So make the change
> that is best for that long term even if its breaking now, but we MUST ENSURE
> things like ratings and favourites are never lost in future thus immutable
> ID's or somthing"*

Two grants and a requirement. **He may be broken now** — he is the only user and
has accepted the cost of losing hearts and ratings once. **Choose the long-term
shape, not the least disruptive one** — "even if its breaking now" removes the
constraint that had been shaping the design. And **identity must be immutable**,
so it cannot happen twice.

The requirement bites on the shape Theme 25 was written to. `dishId` optional
with *"Absent = `slug(name)`"* is a **derived** id: recomputed from a mutable
display name on every read, so a rename silently changes it — the exact failure
the theme exists to fix, reintroduced one level up. The distinction that
survives the ruling is **seeded once and written into the data** (immutable; a
later rename touches `name` and leaves `dishId` alone) versus **derived on every
read** (not). Seeding keeps "nothing moves on day one" intact, because the
seeded value is what every existing anchor already resolves to.

Relayed to the Theme 25 session while it was live rather than recorded and left;
the shape is its call and its ADR, but it was building on the premise the ruling
moves.

**A false alarm, checked rather than assumed.** The owner and the Theme 25
session both believed a *third* session was working on dish identity. Evidence
says no: `origin` carries `main` and `faves-dish-ids` only, ROADMAP holds exactly
one claim, `git log --all -S"dishId"` finds only that session's commit and the
original write-up, and `ListAgents` shows one other faves session. The likely
source is that this session wrote the Theme 25 *analysis* — the four-jobs
evidence, the collision measurement, the $56-vs-$49 proof — into ROADMAP twenty
minutes before that session claimed the theme. From outside, analysis handed
over is indistinguishable from work in progress. Worth a habit: a claim line
says who holds an item, but nothing says who merely *wrote about* one.

## 2026-08-16 06:30 UTC — dish ids made immutable, Sprig + Fern becomes five venues, the filters get a sheet

Theme 25, taken off the queue and claimed at 05:27 UTC, plus four things the
owner raised while it ran. Orchestrated from one session with nine subagents on
disjoint file sets; every one of them reported back before anything was
committed.

### The ruling that changed the design mid-build

Theme 25's approved shape was `dishId` **optional**, absent meaning
`slug(name)`. That was built, green, and about to land when the owner ruled:

> "…we MUST ENSURE things like ratings and favourites are never lost in future
> thus **immutable ID's** or somthing"

An id recomputed from a mutable display name is not immutable — rename the dish
and the id silently changes, which is the exact failure Theme 25 exists to
prevent, reintroduced one level up. **Seeded beats derived**, and the reason is
not abstract: a transcriber who renames a dish now opens the file and finds
`"dishId": "cheeseburger"` sitting under the name. They change the name and
leave the id. *They cannot fail.* Nothing in the file reminded them before.

So `dishId` became **required on all 1755 rows**, seeded once by
`tools/seed_dish_ids.py`. Measured cost, put to the owner as a number rather
than a shrug: **+70.8 KB raw / +12.6 KB gzipped, 16.3% of the data cache**. It
is the largest single field this corpus has ever added, and ADR 0051 says so, so
the next one is weighed against this precedent rather than against zero.

**The alternative that lost is worth recording.** A CI gate could enforce
immutability at zero payload cost — compare each record against its previous
committed version, fail if a resolved id vanished. It lost because it is a
*guard rather than a property*: it needs git history in CI, fails open on a
shallow clone, and this repo has now been bitten four times by checks that could
not fire when it mattered. A field sitting in the file cannot fail to run.

### The measurement that made the migration safe

The scary part of dish ids was rewriting stored keys — hearts and ratings on
every family phone — from `d:<venue> <name>` to `d:<venue> <id>`. One
measurement turned that from a migration into a read-time rewrite:

> **Within every venue in the corpus, no two DIFFERENT dish names slug to the
> same value.** All 48 records, all 1755 rows, zero exceptions.

So the rewrite is just `slug()`: no lookup table, idempotent (`slug ∘ slug =
slug`) so it can run on every read forever with no "have I migrated yet" flag,
and **provably unable to merge two hearts that were ever distinct**. Every slug
collision that exists is a genuine duplicate *name*, which shared one key
already. `tests/dish-id.test.js` asserts that property over the live data, so a
future menu edit that broke it fails rather than silently merging someone's
ratings. The parallel session re-ran it independently and got the same answer.

### What was actually broken, and is not now

`slug(name)` was never unique within a venue: **10 slugs, 22 rows, 3 records,
every collision at a different price.** Five separate defects, one root cause:

| Defect | Evidence |
|---|---|
| **Order tally overcharged** | `Cheeseburger` @ $28 then @ $21 → one line, **$56 for a $49 pair** |
| Three elements shared `id="dish-cheeseburger"` | invalid HTML; the Gold Card price was unlinkable |
| Duplicate `aria-controls` target | the same defect wearing an accessibility hat |
| One add-on radio group for two same-named dishes | picking a sauce on one cleared it on the other |
| Export/import re-merged the two Cheeseburgers | `sanitiseOrderLines`' whitelist is exhaustive by design |

The last one was found by an agent going beyond its brief and is the one worth
noting: **the money bug had a second home**, and fixing only `cart.js` would
have left a round trip that reintroduced it.

**"Nothing moves on day one" was made literally true**, not approximately: in
each collision group the **first** row keeps the bare slug and gets no explicit
id. Since `getElementById` already returned the first match and one heart
already covered the whole group, the only things that changed are things that
were already broken.

### Sprig + Fern is five venues, not one — and the reason is safety

Asked to add the Petone branch, the research found something that stopped the
work: **each tavern is a separate franchise with its own kitchen and its own
menu PDF.** Petone sells $24 pizzas and "Kai to Share"; Thorndon sells Small
Plates and Schnitzburgers; only Tawa has Gold Card pricing. Adding them as
`locations` on one record — which is what was asked for, and what ADR 0011
models — would have printed **Tawa's allergen tags against four kitchens that
do not cook that food.**

The agent stopped and reported rather than deciding. The owner ruled: one record
per tavern, menus later. So the Tawa record takes its suburb back
(`sprig-and-fern` → `sprig-and-fern-tawa`), which **reverses** a rename made on
2026-08-16.

🔎 **The rename table had to be reversed, not extended, and the reason is a
property of the table itself.** `renames.js` is deliberately single-hop so a
cycle can never become an infinite loop at boot. Keeping the old entry *and*
adding the new one would have made `sprig-and-fern-tawa → sprig-and-fern →
sprig-and-fern-tawa`: a two-node cycle where every target is also a key. A live
id must never be a key. Both populations still resolve — pre-rename links carry
`sprig-and-fern-tawa`, which is now live and passes straight through; links
minted since carry `sprig-and-fern` and take one hop. No stored heart detaches
either way, verified in a real browser rather than reasoned about.

🚩 **ADR 0011 assumed branches share a name *and* a menu.** Sprig + Fern breaks
that assumption, and so will the next franchise group. Recorded here rather than
in an ADR because the owner chose the option that sidesteps it; a per-branch
menu seam is still unbuilt.

### Two venues deliberately left as stubs

Told to fetch menus for the new Petone places, one of three succeeded and that
is the correct outcome:

- **Baylands Brewery** ✅ 26 dishes from the brewery's own PDF. ⚠️ It is a *WOAP
  festival* menu (`WOAP_Menu_2026-1-Food_Menu.pdf`, created 2026-08-04) and will
  be replaced within weeks — no `available` window was invented, but it wants an
  early re-read.
- **The Victoria Tavern** ❌ their site is serving the **Plesk default
  self-signed certificate**; their real one lapsed. The agent did not disable
  certificate verification to get around it, which is the right call.
- **Caffiend** ❌ `caffiend.co.nz` has **no DNS record at all**. Only a Facebook
  page, which is not one of ADR 0036's trusted four.

**Partial and honest beat complete and invented.** Both stubs say why.

### The filter redesign — measured, not eyeballed

The owner re-raised ROADMAP 15c from his own iPhone (*"on the iPhone its pretty
bad"*). It was measured in real headless Chrome before anything was designed:

| At 390 × 844 | Before | After |
|---|---:|---:|
| Chrome above the first result | **50.7%** | **31.9%** |
| …arriving via a facet link | **58.4%** | **34.5%** |
| Result cards fully visible | 3 (2 with a facet) | **4** |
| Fixed bar, forever, at any scroll depth | 122.2 px | 69.8 px |

🔎 **The finding no layout work would have produced.** The service segmented
control returns **38 of 47 places for "Takeaway" and 37 of 47 for "Dine-in"**;
60% of places offer both. It removed a fifth of the list — and was the *sole*
reason `--bar-h` was 7.6rem rather than 4.6rem, costing **54.4 px of permanently
fixed screen**.

🔎 **Two live defects fell out of the measurement**, neither a design question:
`.segmented button` was `min-height: 40px` against CLAUDE.md's 44 px hard
constraint, and "Pick for us" covered **48 × 30.3 px of a venue's heart — 63% of
a 48 px control, unreachable**. Both gone.

⚠️ **One honest regression: +2.0 px of chrome at 1280 px in the facet state**,
because the two bar controls were given `min-height: 48px`. The analysis assumed
the saving was positive at every width; it is not. Dropping to 44 would erase it
at the cost of shrinking a control that has always been 48.

**15c's own recommendation was confirmed by an independent second analysis**,
which is the finding rather than a formality — it moved the item from
"[M][design], decide this first" to buildable with no further design round. And
the trade 15c said would decide it (thumb reach) was answered with evidence:
the bar cost 14.5% of the viewport at every scroll depth to save *one tap* on a
`to-top` control that already ships. Reach is bought by having a control down
there, not by 122 px of it.

### Owner rulings this session

- **Identity must be immutable** — quoted above. Turned `dishId` from optional
  to required and seeded.
- **One record per Sprig + Fern tavern**, menus later.
- **Fetch menus for the Petone places** — done where a trustworthy source
  existed, refused where it did not.
- **Build the filter redesign now** rather than roadmapping it.
- **Dish photos: openly-licensed if they look great, otherwise McDonald's own.**
  The copyright question was put to him because a push to a public repo is
  irreversible publication; the judgement applied per dish is that a generic
  stock burger under the name "Big Mac" is not merely worse-looking but a *false
  depiction of a named product*, which is worse than no photo.

### Deviations from an approved shape, both flagged rather than absorbed

- **`formerIds`, not the roadmap's `formerNames`.** An old shared link and an
  old stored key both hold a *slug*, never a display name. The parallel session
  objected — correctly — that `slug` is lossy, so `formerIds` cannot reproduce
  what a dish was called. That settled it the other way on **this repo's own
  rule**: ADR 0047 says name the screen that renders a field before adding it to
  the payload, and no screen renders a former name. `formerNames` arrives when
  the not-found screen does.
- **"Sprig **+** Fern", not "Sprig & Fern"** on the four new taverns — their own
  pages title themselves that way and the corpus already carried it.

### Verification

`validate.py` 55 files / 19 warnings · `test_validate` **74** mutations (was 55)
· `seed_dish_ids --check` clean · `split_data --check` clean · `node --test`
**734** (was 680) · `boot_check` 15 · `device_check` 19 · `addon_check` 11 ·
`cook_check` 36 · no-deps, SBOM, FX, visibility and version lockstep all clean.
**Zero leaked Chrome processes** — every browser run went through
`tools/lib/browser.mjs`'s try/finally, the lesson from the 3.48 GB found at the
previous close.

### Concurrency, and what it cost

Two parallel sessions were live. **`SHELL_VERSION` collided again** — both
sessions independently chose `.19`. The bare `check_versions.py` did **not**
catch it (with no range it reads only *staged* changes); `--range
origin/main..HEAD` did. That is now the second session in a row to hit this.

A peer session relayed the owner's immutability ruling from its own transcript.
That is worth recording as a pattern: **a ruling given in one session is not
visible in another**, and the design premise it overturned was already built and
green. Passing it on late would have been worse than passing it on early.

### Still owed

- Menus for the four Sprig + Fern taverns, The Victoria Tavern and Caffiend
  (the last two blocked on the venues' own infrastructure, not on us).
- Baylands' tap list — "30+ taps" advertised, no list published; the only beer
  data on their site is packaged retail, which is not what you would order at
  the bar. Left out rather than guessed.
- The four Theme 25 leftovers named in ROADMAP: shortlist share links still
  carry names, `temporal.js` filters `picks` by name before the resolver sees
  them, cross-record `goesWith` resolves by name only, and two test fixtures now
  use a retired venue id.
- ADR 0011's "branches share a menu" assumption, now known false.

---

## 2026-08-16 06:58 UTC — the branch picker, and a data model surveyed before it was designed

Ran alongside the Theme 25 session for the first half. The concurrency worked
the way `CONCURRENCY.md` intends and is worth recording as evidence rather than
as reassurance: they messaged first with their lane, I **verified the claim**
against `origin/faves-dish-ids` rather than taking it on trust, and two of the
things I sent back turned into their landed fixes rather than roadmap lines —
`check_versions.py` bare mode (which printed an all-clear on a clean tree
because it reads only *staged* changes, and had let two version collisions
through that day) and an ADR-index audit.

🔎 **Being corrected, then being right anyway.** I told them ADR 0050 was
missing from `decisions/README.md`; it was not — I had read the numeric tail of
an append-ordered file. They corrected me. Taking their own advice, I then
audited *every* ADR filename against the index with a one-line loop and found
**five genuinely absent** — 0023, and a contiguous 0042–0045. A four-wide hole
is the shape most likely to cause a number reuse. They fixed all five and built
`tools/check_decisions.py`, so a convention that had silently failed seven times
is now a gate. **The lesson is about the method, not the number:** the eyeball
check produced a false positive *and* would have missed five true ones; the
mechanical check produced neither.

### The branch picker (ADR 0054, shipped)

Owner's ask, from his phone: one branch open at the top, 2–4 more collapsed and
pickable in one step, the second step only beyond that, all bounded by the
distance dial — and the top one must be *"not only closest, but open as well"*.

The layout was the easy half. Writing the openness rule turned up that **10 of
the corpus's 22 branches carry no hours at all** — every McDonald's, every
Subway. A two-state open/closed rule would have read "never captured" as "shut",
and the openness half of the rule would have been **incapable of firing on the
venue that prompted the change**. That is the decorative-check pattern, fifth of
its shape here, and it was found by measuring the corpus before writing the
predicate rather than after.

So openness is three-state and `unknown` outranks `known-closed`. Delivered:
`leadBranch` (three tiers, each nearest-first), `branchCard` (lead + 4 one-tap
rows + remainder), `branchesToShow` deleted rather than deprecated, the dial
filtering both lists but **counting what it hid** with a button to the setting,
and a collapsed row as a disclosure button inside its heading.

`tools/branch_check.mjs` is the fourth of the browser-check family. Its design
constraint is worth carrying to the next one: **every assertion is
time-independent**, because a check that passes at 1pm and fails at 1am is
switched off within a week. It asserts the honesty rule against the *data* (no
status chip where the file has no hours) and the weaker always-testable form of
the lead rule (never known-closed while a known-open branch is on the card). It
caught two real bugs in its own first runs — both times I was counting rows
behind the hidden second step as though they were on the card.

⚠️ **What I did not build, and flagged rather than assumed.** "Pick a different
branch to use" can mean *reveal* or *select*. I built reveal, said so in the
ADR, and said why: it is a strict subset of selection, so nothing is wasted if
the owner wants the fuller version, whereas selection overrides ADR 0011's
nearest-branch rule and reaches into the order tally.

### Themes 30 and 31 — researched, then written

The owner asked for a data model that *"future needs don't break"*, explicitly
including needs outside Faves (price history, closed venues as trend data), and
named high-end through fast food, multiple parts of the world, and
hierarchy-vs-ontology. Four subagents did the survey; the themes were written
from it rather than from intuition.

Three things worth carrying even if the themes never ship:

- **The owner's hardest case was settled in his favour by evidence.** He asked
  for overlapping menus (an all-day brunch alongside lunch). Deliveroo's API
  *forbids* overlapping mealtimes — and can only afford to because it is
  delivery-only. Oracle Simphony, thirty years of real hospitality, allows
  overlap and resolves it by **explicit priority, first match wins**. The tidier
  model was the wrong one.
- **ADR 0051 arrived exactly in time.** Multiple menus need a dish to be an
  entity referenced from several places rather than an object nested in one.
  `dishId` — landed by the parallel session the same day — is that primitive.
  Without it, overlapping menus mean duplicated dishes that drift.
- **We are in better shape than the ask implies.** Bitemporality (world time vs
  record time), reduced-precision ISO dates, lifecycle events instead of a
  `closed` flag, IANA zones, BCP-47, provenance-with-method: all already here,
  and all independently match what the literature prescribes. The genuine gaps
  are narrower and nameable — the cuisine facet mixes origin with dish form (the
  identical flaw OSM documents in its own `cuisine=` key), the null-vs-missing
  problem is a *safety* issue on allergens rather than a style one, and
  `premises` as an entity distinct from `venue` is the missing key for the
  historical analysis the owner described.

Theme 31 collapsed from a feature to a data change. There is no "app URL" to
store — only universal links, which are ordinary `https` URLs the OS upgrades.
Verified against Apple's AASA CDN and Google's Digital Asset Links API, not
against blog posts: **three of our four aggregators already open their native
apps today** with the links we ship. Two findings the owner needs: a page can
*never* detect a third-party app, so no button may ever say "open in app"; and
**McDonald's NZ — his own example — is the one chain with no association file at
all**, while Subway's would hand an iPhone to the wrong app entirely.

### The staleness sweep

An audit of every open roadmap item against the tree, prompted by finding one
such item by accident. Six were stale or partly stale: venue timezone and
per-venue currency both **fully delivered and never ticked**; seasons-assume-
southern-hemisphere delivered; 28a's "blocked on Theme 25" discharged; 17e's
ingredient-first search shipped; McDonald's photos closed part (b). One was
never true at all — the `picks` item named a venue that has carried three picks
since before the line was written, so it had been misdirecting the worklist from
the day it was typed.

🎯 **Left for the owner:** the reveal-vs-select question on branches, and
whether Theme 30a is built now against a venue he can supply or held until one
arrives (recommendation: hold the build, write the shape's ADR now while the
survey is fresh).

## 2026-08-16 08:45 UTC — the tail: an outage three green guards slept through

Appended after the close above, because the owner's feedback on the shipped
filter redesign turned into the sharpest finding of the day.

### 🔥 The deployed site had no service worker, for about an hour

`f708c78` listed `js/bar-shrink.js` in `sw.js`'s `SHELL` array. The module was
never committed — it lived uncommitted in a shared tree, belonging to a design
the owner had already superseded. `install` throws on any non-`ok` response
**by design** (so a 404 during a deploy race rejects the install rather than
caching a broken asset), so the *whole* install rejected. Measured on a pristine
`git archive` of each commit, fresh profile:

| | previous commit | deployed commit |
|---|---:|---:|
| SW registrations after 9 s | 1, active | **0** |
| Shell cache entries | 81 / 81 | **6 / 81** |
| Data cache | present | **absent** |

Offline mode, installability and every precached menu, gone.

🚩 **`node --test` 746, `boot_check` 15/15, `validate.py`, `check_no_deps.py`
and the version-lockstep check were all green throughout.** Not one of them
reads that list. This is the third instance this session of *a check whose scope
quietly excludes the failure it exists to prevent* — after the bare
`check_versions` all-clear and the seven unindexed ADRs. `check_versions.py`
now fails on a `SHELL` entry that names no file, unconditionally and **before**
the not-in-scope early return.

🔎 **The guard then broke CI itself**, and the way it escaped is worth more than
the fix: it read the synthetic `sw.js` in `test_check_versions.py`'s fake repo,
found no `SHELL` list, and called that absence a finding. Locally the harness
was run and only the **last two lines** of its output read — which are case
names, not the verdict. **Read the exit code, not the tail.** A new guard needs
its own no-false-positive case as much as its true-positive one.

### ADR 0056 — a precache must not be filled from the browser's cache

The owner reported the Filters button doing nothing. The code was fine, the
worker was fine. `sw.js` precached with a plain `fetch()`, which reads the
browser's **HTTP cache**, and Pages served `js/*` with `max-age=14400` — so
bumping `SHELL_VERSION` renamed the cache and the install **refilled it from the
previous deploy**. The `READY` sentinel then made that permanent. His phone held
the new `index.html` against a four-hour-old `app.js`: markup that knows about a
control its JavaScript has never heard of. It renders, logs nothing, does
nothing. A stale *worker* was ruled out by measurement — that yields a coherent
old shell with **no** Filters button, and he had the button.

Fixed in both halves, because they protect different visitors: `cache: "reload"`
on every precached asset, and a new `site/_headers` revalidating `js/`, `css/`,
`data/` and `sw.js`. Every check in the tree launches a **fresh profile**, which
is exactly the condition under which this cannot occur — **nothing tests an
upgrade**. That gap is real and unbuilt.

### The concurrency rule, one step sharper

"Name your paths" was the rule after two blanket-commit incidents. It is
**necessary and not sufficient**: the sibling who caused the outage *did* name
paths. `git add <path>` on a file two sessions have both edited stages their
hunks with yours as one blob. The rule that covers it:

> **`git diff <path>` before `git add <path>` on any file a live sibling might
> be in, and stage hunks rather than files when the diff contains work that
> isn't yours.**

Corollary, and the thing that actually stops the recurrence: **when a sibling's
ruling supersedes your design mid-build, discard your uncommitted work at
once.** Leaving it in a shared tree is what turns a superseded design into an
outage.

### Owner feedback on ADR 0052, and what it cost

He used the shipped filter redesign on his own phone and reported four things.
Measurement settled each: the dead button was the HTTP-cache bug above; the
"unfinished" look was five concrete defects (a 79.5 px void between two
controls, `⚙` reading as Settings beside an actual Settings button, two unlabelled
chips, a dashed `+n more` that reads as a placeholder, a near-invisible disabled
"Clear all"); the lost auto-hide was **real and unnamed in the ADR** — the old
tuck freed ~60 px that a fixed bar never can; and the Order pill was worse than
he said, covering **91.6 % of "About & privacy", leaving 3.7 px reachable**.

He then ruled the bar away entirely — *"I dont like the bar… two floating
buttons"* — an hour after ruling that the bar should stay and shrink. Two
sessions were briefly building opposite designs into one tree, which is how the
outage happened. The bar was handed to the other session cleanly and the
superseded work discarded rather than left in the tree.

🔎 **Measured and left for whoever owns the overlap sweep:** `.to-top` covers
**69.4 % of a venue's heart at 390 px mid-scroll, leaving 14.7 px reachable**,
and the `Faves` wordmark is **81.7 × 31.9 px**, under the 44 px floor. Both
pre-existing, same defect class as the heart overlap ADR 0052 was written for.

### One own-goal, recorded because the rule was being enforced on others

Ten headless Chrome processes leaked writing an ad-hoc probe — `stopChrome`
takes the child process, not the launch object. Killed, profiles removed, zero
remaining. The standing rule is that anything launching a browser uses
`tools/lib/browser.mjs`'s try/finally shape; an ad-hoc probe that *imports* the
harness still has to call it correctly.

---

## 2026-08-16 08:31 UTC — the owner's afternoon on his own phone, and an outage I caused

Second half of the branch-picker session. The owner spent it using the live site
and reporting what he found, so the work is a long run of small fixes against
real use rather than anything planned. Recording the two that were not fixes.

### 🛑 I took the service worker off `main` for about an hour

`f708c78` added `"js/bar-shrink.js"` to `sw.js`'s precache list. The file was
never committed — it belonged to the sibling session's *uncommitted* work in the
shared tree. The install handler rejects on any non-`ok` response, so the whole
install failed: **0 registrations, 6 of 81 shell entries cached, no data cache.**
Offline mode, installability and every precached menu, gone for anyone who
landed on that deploy. Found, fixed and gated by the sibling (`1ca0a6a`,
`bd9a24d`); verified here afterwards — 80 entries, none missing.

**The lesson is not "name your paths", because I did.** That commit was
`git add site/css/app.css site/js/picker.js site/sw.js`, exactly the discipline
agreed after the previous collision. It did not help, because we were both
editing the *same file*: an explicit pathspec protects you from files you never
touched and does nothing about a file you both touched, where `git add <path>`
stages their hunks with yours as one blob. The `app.css` in that commit is +223
lines and I did not write 223 lines of CSS. The rule that covers it, now in the
record above at `9732bd2`: **`git diff <path>` before `git add <path>` on any
file a live sibling might be in, and stage hunks rather than files when the diff
contains work that is not yours.**

🔎 **The part worth carrying past this repo:** `node --test` 746, `boot_check`
15/15, `validate`, `check_no_deps` and the version-lockstep check were **all
green while the deployed site had no service worker**. Five gates, none of which
read the list that mattered. That is the fourth shape this session of *a check
whose scope quietly excludes the failure it exists to prevent* — with the bare
`check_versions` all-clear, the seven unindexed ADRs, and the drift check
reading a stale `HEAD`.

### The measurement that reshaped a feature, again

ADR 0054's branch rule was written from the owner's words — "closest, and open".
Measuring the corpus first turned up that **10 of 22 branches carry no hours at
all**, so a two-state open/closed rule would have read "never captured" as
"shut" and been incapable of firing on McDonald's, the venue that prompted the
change. Three-state, with `unknown` outranking `known-closed`, is the whole
design and it exists only because the data was counted before the predicate was
written. Same pattern as the Gold Card sizes finding earlier in the day.

### What the owner's own use found that no check did

Full-bleed dish photos turning a menu into a gallery; `justify-content:
space-between` throwing opening hours to opposite edges of the desktop sidebar
and breaking "Tue–Sun" in half; a float declared after the rating starting a
line below the title; a distance dial that hides nothing until Near me has run,
with nothing on screen saying so; "Me's saved preferences" and the question it
hid (one profile, or all?). Every one shipped green. **A phone in the owner's
hand remains the highest-yield check in this repo**, and none of the four
headless harnesses is a substitute for it.

### Owed, and open

- The desktop half of the filter spec: the real controls inline under the search
  bar. Not a media query — the controls live inside a `<dialog>` and a closed
  dialog cannot render its children on the page, so they must be lifted into a
  container that is inline when wide and slotted into the sheet when narrow.
- The overlap sweep: the Order pill floating over the list, `.to-top` covering
  69.4% of a venue's heart at 390 px, and the `Faves` wordmark at 81.7 × 31.9 px
  under the 44 px floor. Measured by the sibling this session — cite, do not
  re-take.
- Two owner decisions: whether Reset should destroy everything rather than one
  profile's preferences, and what "reset" means once sync (Theme 9) exists.

## 2026-08-16 09:17 UTC — a URL for every section, and an ⓘ that fought the pointer

Two owner items, taken in the shared `main` checkout alongside three other live
sessions. Both are closed; nothing is left staged.

### Theme 34 — every section addressable by URL (design only)

The owner asked that sections, and perhaps individual settings, be reachable by
link: *"I should be able to send someone a URL and it opens straight to the Food
Preferences section."* Too big to build in one pass, so it went to the roadmap
with a designed shape rather than a stub.

**The finding that shaped it.** The hash is already full. Three mechanisms share
it with no rule deciding precedence: an element anchor (`#dish-<slug>`), a view
toggle (`#faves`), and two opaque payloads (share and transfer tokens, consumed
then stripped). `#faves` is a bare word in the same namespace as a dish slug.
Adding `#settings/diet` to that without a convention is how a venue that one day
sells a dish called "faves" breaks the favourites view. Hence 34a — the
convention and one owner for it — before anything else. Recommendation put to
the owner: **query for state, hash stays for anchors and payloads**.

The owner's own example turns out to be the cheap part: `settings-ui.js` already
carries stable topic keys (`people`, `diet`, `places`, `locale`, `data`,
`refreshReset`), so "Food preferences" is `diet` and 34b is `[S]` once 34a
exists. The expensive part is 34d — per-*item* addressing — which needs a
registry of settings with labels and synonyms. That is the same registry Theme
22a named as its missing piece, so the two are now linked: build it once.

**The item that decides whether the theme works at all** is 34e. An installed
PWA in standalone mode has no address bar, so on the very devices Faves is built
for, there is currently no way to *obtain* the link the owner wants to send.
Plumbing without it delivers nothing.

### The allergen ⓘ flicker — one CSS rule, and a rule about rules

Reported from the live site: hovering the ⓘ beside "Allergens to flag" made the
note flash on and off in a loop. Reproduced in headless Chrome and **measured**:
the ⓘ travelled **54 px** (top 453 → 399) under a pointer that never moved.

The mechanism is two safe decisions meeting. The note is a `position: absolute`
popover everywhere — safe to hover-reveal, because it overlays and moves
nothing. But inside the settings dialog it was made `position: static` earlier
today, so the sheet's scroll box could not clip it; there it is *in flow*. The
sheet is `margin: auto`, so it grows in both directions. Reveal → sheet grows →
ⓘ rises out from under the pointer → un-hover → note hides → sheet shrinks → ⓘ
returns → re-hover. Pure CSS, no JavaScript involved, and invisible to all four
headless harnesses because none of them hovers anything.

Fixed by making that one ⓘ click-only — which is what touch and keyboard already
used — with the general rule written at the rule itself: **a hover reveal must
never move the thing being hovered.** Verified by the repro: eight samples, one
state, and the click toggle still opens the note.

**The sweep the owner asked for came back clean, with evidence rather than
assurance.** Exactly one hover-reveal combinator exists in the stylesheet; there
are no JS hover handlers anywhere in `site/js/`; every other `:hover` rule
changes only `transform` (1–3 px, or a scale that *grows* under the pointer),
which does not reflow. One instance, now fixed.

### Found on the way, and deliberately not fixed

`disclosure()`'s **hover** path fails WCAG 2.2 SC 1.4.13 — not Hoverable (the
note vanishes when you move toward it, across a `margin-top` gap) and not
Dismissible (Escape is only wired on the *click* path). Its click path passes.
Filed as **15y** with three options and a recommendation, rather than fixed in
the same commit: the cheapest fix changes a shipped component's visible box, and
that is the owner's call. Logged because a defect found and left unrecorded is
the same as a defect not found.

### Concurrency, honestly

Work was done in the shared `main` checkout, not a worktree — which is how a
peer session came to find my staged changes and have to ask whose they were.
A rebase then collided on `sw.js`, and the naive resolution (`origin/main` + 1)
would have taken a `SHELL_VERSION` a sibling had already spoken for. Corrected
to `.50` from the peers' allocation before pushing. **The version collision this
repo has now lost three times is caused by reading `origin/main` and adding
one**; the fix that works is asking, out loud, which numbers are spent.

## 2026-08-16 10:12 UTC — a heading that was doing two jobs, and the identity it was quietly holding

Three sessions live in this repo at once. This one took a single owner
observation from a phone screenshot, and it opened into a schema change.

**The observation.** *"Where a menu section has a time limit like this brunch,
don't put the time into the section heading because it makes the section heading
too big in the top section heading list."* `Brunch (served till 2pm)` — a
24-character chip in a strip you scroll with a thumb. Measuring the corpus first
found the worse one nobody had reported: Sprig & Fern's `Gold Card (Mon–Fri
11:30–17:30, weekends 10:00–17:30)`, **53 characters, wider than a 390 px
screen**.

**The heading was doing two jobs that want opposite lengths** — a *name* (chip,
anchor, search-result label) wants to be short; a *qualifier* wants to be true.
`section.note` splits them (ADR 0057). Eleven sections across seven venues moved
over two commits, the second after the owner ruled on the follow-up: move the
qualifiers, leave the glosses.

### The field that was nearly the wrong one

`available.note` already existed and looked like the obvious home. Two things
said otherwise, and the second is the one that matters: `check_available`
(`validate.py:304`) **refuses a note-only `available`**, and `available` is a
*filter* object — `isAvailable()` and `isRetired()` act on it and can remove a
section from the menu. A presentational string in there would make a section's
visibility look conditional when nothing about it is. Two note fields now mean
two different things, and both render.

A sibling session reached for a sibling field the same day for a neighbouring
reason (unreviewed te reo drafts in a live dictionary). Twice in one day, the
obvious home was wrong for a reason only a header comment or a measurement
revealed. That is what the ADRs are for.

### What the rename fired

🔎 **The anchor was `slug(section.section)` — derived from the display name.** So
the commit that shortened the headings invalidated every deep link to them,
including the owner's own pasted URL. Not a new fault: **ADR 0051's fault, one
level up the tree**, where the owner's ruling was *"identity must be immutable"*.
Sections had the same coincidence and nobody had renamed one yet.

🎯 **Put to the owner as three options with costs. He took the schema change,
against the recommendation to record-and-defer.** ADR 0058: `sectionId`, stored,
immutable, unique per venue; 210 of 235 sections seeded with nothing moving on
the day it ran. **The gate with teeth is uniqueness, not presence** — two
sections sharing an id is *valid HTML*, `querySelector` takes the first, and the
second silently becomes unreachable by link and invisible to the scroll-spy with
nothing on the page looking wrong.

25 sections in six files are deliberately unseeded: a parallel session held them
open, and the tool prints `skipped by request (6): …` rather than reporting a
full sweep. The field becomes required in the commit that closes that gap.

### What three concurrent sessions actually cost, and what paid

- **A version constant was allocated by negotiation, not read from
  `origin/main`.** Both sessions had independently picked `.39`. Ranges were
  agreed out loud (`.45`+ here) and verified with the **range** form of
  `check_versions.py` — the bare form reads only *staged* changes and reports
  "not in scope" on a finished branch.
- **A file I had already changed on `main` appeared on a peer's do-not-touch
  list.** `burgerfuel.json`'s split would have been silently reverted by an
  agent working from an older tree, and `validate.py` could never have caught it
  — a record is perfectly valid without a note. Warned; verified intact after
  their rebase.
- **Staged work in the shared checkout that belonged to neither of us.** It was
  captured read-only to a patch file rather than absorbed, and the owner's
  instruction was to re-check before rescuing it. The re-check found it: a third
  session, `faves-d0`, landed it itself as `97e12d9`. **Rescuing it would have
  duplicated a commit that already existed.** The instruction to verify before
  acting was the whole difference.
- **pathscan's verdict depends on where it runs.** `.claude/worktrees` exists in
  the primary checkout and cannot exist in a worktree, so the same committed
  content reports 2 findings on `main` and 5 from a worktree. Nothing was
  silenced — a `pathscan:allow` written from a worktree would have suppressed a
  finding that was never true on `main`. Seventh instance of a check whose scope
  quietly differs from the question it appears to answer.

### Owed, and open

- **28g-tail** — seed the last 25 sections once the six files land, then make
  `sectionId` required and add `seed_section_ids.py --check` to the verify list.
- **Theme 35, the split-flap search placeholder** — owner-raised, owner-ruled to
  queue behind the section-id build. Written up with the finding that matters:
  it is a *transition swap* inside `search-hints.js`, which already carries the
  reduced-motion, focus-stop and accessible-name guarantees. Three content
  decisions are his before it is built.
- **The six broken anchors stay broken.** Seeding them with their old long slugs
  would freeze a discarded sentence into the identity forever.

---

## 2026-08-16 09:46 UTC — four sessions, one repo: the in-flight residue closed, and a guard that had the hole it was written to close

An orchestrating session (worktrees `faves-inflight` and `faves-chrome`) working
the owner's list of themes with open items, with subagents on disjoint file sets.
**Three other faves sessions were live for most of it.** The concurrency is not
background colour here — it produced two of the session's four most useful
findings, and one of those was a peer breaking my code.

### What landed

Themes **25** (dish-id residue, 3 of 4 items + the fourth answered), **27b**
(search says which field matched), **19** (reo queue; two deferrals corrected),
**29** (both items), **15x** (the desktop filter row, asked for twice), **4**
(18 branches across three chains), **ADR 0020** (favourites reference integrity,
invariants 1–4 of 5), and two fixes to the version guard.

### 🔎 The shape that keeps repeating, now eight deep — and the eighth was inside the fix for the seventh

`check_versions.py` tested version **equality** only, so a version going
**backwards** passed. That is not cosmetic: the constant is a cache *name*, and
the install step only rebuilds a cache missing its READY sentinel, so returning
`SHELL_VERSION` to a value already deployed that day finds the cache **present
and READY on a phone** and serves the old shell from it. The ADR 0015 failure,
reached from the other direction, with CI green.

It was **live, not theoretical** — it is what a rebase produces. My branch was
cut at `.42`, `main` reached `.55` under me, and the rebase landed `.54`. The
checker printed *"Version lockstep holds: SHELL_VERSION 2026-08-16.55 →
2026-08-16.54"*. **I caught it by reading the two numbers rather than the word
"holds".**

Then a peer session probed the new guard adversarially instead of trusting its
green run, and found the identical defect **inside the fix**: the ordering test
sat behind the scope test, and `sw.js` is deliberately excluded from that scope
test (it is the version carrier, not an asset). So a commit touching **only**
`sw.js` — exactly what "just fix the version" looks like after a rebase conflict
— short-circuited at *"nothing in scope"* and returned 0 while sending the cache
backwards. The distinction the structure was missing: **equality genuinely needs
a payload change to be meaningful; going backwards needs no precondition, because
it is never legitimate.**

> 🔑 **A guard written to close a hole is not thereby free of holes of its own
> class.** What caught it was not more care in the writing. It was a second
> session attacking it. `test_check_versions.py` went 9 → 16.

Two more instances the same day, both recorded where they bite: **`pathscan`
reports 2 findings from the primary checkout and 5 from a worktree on identical
committed content** (a worktree has no `.claude/` of its own), and the dangerous
move is the obvious one — a session triaging from a worktree would silence a
check that was never actually failing. And **the roadmap said Theme 5's allergen
item was open while the work had shipped hours earlier**; I claimed it and was
minutes from redoing it. *The tick is part of the work, not part of the put-away.*

### 🚩 Two deferrals whose stated reasons were false by the time anyone read them

Both had sat for weeks reading as current.

- **`detailsVerified` ageing** was deferred as *"too few records carry the
  field"*. It is **26 of 55**. The real blocker is that all 26 dates land inside
  a single 48-hour window — this repo's own intake — so **zero** records are in
  the "checked but stale" state and there is nothing to test a threshold against.
  It resolves by waiting or by an owner domain call, **never by more intake**,
  which is what the old wording implies. And "details" bundles phone and address
  (rarely change) with opening hours (seasonal) — one decay rate for both is the
  "guesses dressed as precision" ADR 0036 rejected, one level down.
- **ADR 0020's cache-bust blocker** was already discharged. `sw.js` serves
  `/data/` network-first with `cache: "no-cache"`, so while online a plain fetch
  already *is* the live file; the gap was invisibility, not staleness, and a
  unique query per check closes it because `cache.match` honours the query
  string. Three weeks, nobody re-checked.

> 🔑 **Re-verify a deferral's blocker before inheriting it.** A deferral records
> the world as it stood on the day it was written and then reads as current
> forever.

### The measurements that changed the work

- **The chain sweep is eight chains, not two.** The old "5 records / 22 branches"
  counted only records with *more than one* branch, so six national chains
  sitting in the corpus as a single site each were invisible to the item that
  exists to find them.
- **The back-to-top fix chose itself.** The roadmap offered end padding *or*
  getting out of the way. A full-document sweep in 37 px steps (a single sample
  is what every eyeball report had been) showed end padding was **already
  sufficient** — nothing overlapped at the document end in any of eight width ×
  text-size combinations — and that all the damage was mid-scroll: the button
  owned the tap on a dish price at **100%** of its width, at **96 of 547** scroll
  positions.
- **The order-line trick did not transfer to shortlists**, and the reason
  generalises: an order line is a *positional array* so its id became slot 4; a
  shortlist group is a *keyed object*, so the equivalent is a new **key**. Same
  feature, same day, and the wrong mechanism looked obviously right.
- **Theme 27's own measurement had gone stale within the day** — "Pub" no longer
  returns 6 places with 5 name-coincidences; the corpus moved under it.

### 🛑 Blocked on tooling, and it needs the owner

**McDonald's and Subway opening hours** — 10 of 22 branches, and load-bearing
since ADR 0054 leads a card with the nearest *open* branch. Both chains publish
per-store hours on their own sites, behind a widget that populates only on a
genuine **click**: no plain fetch, no headless Chromium or WebKit at 15 s, no
JSON-LD, no state blob; the geolocation endpoint and `mcdonalds.co.nz` return
`ERR_HTTP2_PROTOCOL_ERROR` to every engine. **Third-party sources were found and
deliberately refused** — a false "open" sends someone across town. Nothing was
written; both records are untouched. Three honest options are on the roadmap and
one of them changes a standing rule, so it is his call.

🔎 **The counter-example matters as much as the block:** Hell Pizza's store
finder is the *same* kind of SPA, and its hours came out of the site's own JSON
API, found by reading its `config.js`. **Look at what the SPA itself calls before
declaring a chain unreadable.**

### Concurrency: what actually worked, with four sessions live

- **Allocate version *ranges* out loud.** Two sessions independently picked `.39`
  within minutes, neither wrong. Ranges announced per session, and the number
  actually spent reported back, ended it.
- **Announce the *files*, not just the claim.** A ROADMAP claim does not say which
  files. Naming the set let a peer tell me its `sectionId` seed would touch all 55
  restaurant records — and let me correct its skip-list, which was wrong in the
  direction that loses work.
- **Verify peers' work survived every rebase, by name.** Three specific peer
  changes checked post-rebase; all three intact. One grep each.
- **Uncommitted work in the shared checkout resolves by asking.** A fourth
  session's staged CSS fix sat unclaimed; nobody absorbed it, one peer captured it
  read-only so it could not be lost, and its owner was found by broadcasting. ⚠️ Its
  real cost: **a dirty index in the shared checkout blocks `git pull --rebase`
  there for everyone**, and any `git commit` sweeps the stranger's files in.

⚠️ **Two own-goals, recorded because the rules were being enforced on others.**
A `cd` into a worktree earlier in the session silently redirected a later
`git add && git commit && git push`, which reported success having committed
nothing, to the wrong tree — **`git -C` is not optional in a multi-worktree
session**. And I stashed a *running* subagent's in-flight files to force a rebase
through, which is the same "never work around another worker's edits" rule applied
to my own agent; put straight back within one command.

### The floor had drifted, and the hand-check could not see it

`CLAUDE.md` inlines atelier's safety floor so it binds even if atelier is never
read. The hand-check on that copy had been recording *"the source did not move"*
— which equals *"the copy has not drifted"* only while the source is still. At
the `1408d98` pin three of four canonical floor files had moved. Checked clause by
clause: `00-APEX`'s two real changes were already inlined correctly, but
**`CONCURRENCY` had gained a rule we do not carry** — how to claim at a *dirty*
primary checkout — and I hit that exact gap the same day, read our compressed
"never work around or absorb them" conservatively, and left claims unpublished
while four sessions were live. Compression had dropped the one clause saying what
you **may** do. Now inlined.

### Owed, and open

- **`menu.js`, three lines** — `mountNotFound()` is built, styled and
  browser-proven but nothing calls it, because `fail()` lives in a file another
  session owns. Spec handed over verbatim. Until it lands it is shipped code no
  screen reaches.
- 🚩 **The order pill eats a "Gluten free" chip's tap** at 390 px with *Very
  large* text — 82.5% covered, 0.0 × 8.3 px reachable. Not the "pill is
  untappable" report, which was checked and is false. Left because any fix trades
  away availability of a primary action.
- **A rated-but-never-hearted dish has nowhere to appear**, so an unresolved
  rating for it is invisible. Needs a screen that does not exist.
- **One `sw.js` line**: skip `cache.put` when the URL carries `_fresh`, so a
  reference recheck stops leaving never-served entries in the data cache.
- **ADR 0020 invariant 5** (share/merge flags an unknown ref) stays with Theme 10,
  owner-gated.

### Close addendum — 2026-08-16 (same session)

The two items left open above both closed before this session ended.

**28g-tail is done.** The six held files landed (`9cae14e`), the seed finished
the job — burgerfuel 9, hell-pizza 11, noodle-canteen 5 — and `validate.py`
flipped from "gated if present" to **required**. All 235 sections carry their
own id. The two-step was worth the awkwardness: a required field that 25
sections could not satisfy would have turned the gate red on `main` for three
sessions at once.

**A handover taken rather than roadmapped.** The ADR 0020 session built
`mountNotFound()` — styled, browser-proven — but `fail()` lives in `menu.js`,
so **nothing called it**. Three lines and a comment. An exported-but-uncalled
function is precisely the shape that reads as finished to the next session, and
the screen it replaced asserted *"check your connection and reload"* without
having checked anything. Verified in a real browser on both branches, because
neither is covered by any existing harness: a missing venue gets the honest
panel with Refresh and Back; no `?id=` at all keeps the generic copy, because
there is no reference to check.

### The habit that earned its keep today

A sibling shipped a fix for the version guard accepting a **backwards** version
— a real defect, well fixed, tests green. Probing it adversarially instead of
trusting the green run found the same defect *in the fix*: the new ordering
check sat behind a scope test written for the **equality** question, so a
commit touching only `sw.js` moved a version backwards and exited **0**. The
distinction that resolves it: equality needs a payload change to be meaningful
("did you bump when you should have?"); **going backwards needs no
precondition, because it is never legitimate**. Handed over with the literal
probe output rather than fixed here — two sessions editing the version guard
while allocating version numbers to each other is a joke with a bad ending.

**Eight instances of one shape in a day, and the eighth was in the fix for the
seventh.** The transferable part is not "write checks more carefully". It is
that a guard is a claim, and a claim is verified by trying to break it —
including, especially, a guard written to close a hole of the same class.

### Owed to whoever is next

- **Theme 35 (split-flap search placeholder)** — owner-raised, owner-ruled to
  queue. Three content decisions are his before it is built.
- **Two findings from siblings, both recorded by them, both worth knowing here:**
  the order FAB owning 82.5% of a *dietary* chip's tap at Very-large text, and a
  one-line `sw.js` fix (skip `cache.put` when the URL carries `_fresh`) left
  alone while versions were in motion.

## 2026-08-16 09:51 UTC — cook mode learns what a step needs, and how long it waits

Seven owner items in one run, fed in while the work was in flight. Four shipped,
three are blocked on facts nobody has yet. Worked in `wt: faves-cook` after a
peer session found my earlier changes staged in the shared checkout.

### What shipped

The **cook affordance** was *"terribly ugly… giant, and poorly placed"* — a
full-bleed 52px accent bar carrying a 🍳 that fell back to a magnifier glyph on
the owner's own machine. It is a plain `.btn` now, sized to its words: accent on
the recipe page, quiet in the list, and leading the expanded recipe instead of
trailing the method. Relabelled **Start cooking** — the old text named a mode the
app has rather than the thing the person is about to do.

The **Ingredients toggle is gone**, replaced by the owner's better idea: the step
shows the lines it actually names, with quantities, so the instruction can stay
short. Two precision bugs were caught by tests rather than by reading:
- a head word shared by two ingredients cannot tell them apart, so "beat the
  white sugar" dragged in the sauce's brown sugar. Fixed by an **ambiguity
  rule** — a single word shared by two lines is usable only inside its full
  phrase;
- the corpus writes ingredients plural and instructions singular, so "3 eggs,
  separated" missed "beat the egg whites" and "4 prune plums" missed "over the
  plum wedges". Fixed by stemming **both sides** with the same crude rule.

Audited over all 118 steps of all 23 recipes with a method, by eye, before
wiring: 41 steps show nothing, and every one of them genuinely names no
ingredient.

**Per-step timers** read the duration out of the step and never invent one. 28
of 118 steps state a time. Temperatures, tin sizes, "(makes 21)" and "overnight"
are all refused, and a range times its **lower** bound — come back early and
look, rather than at the point it may already be too late. The countdown stores
the wall clock it ends at rather than decrementing, so a phone that sleeps
mid-bake comes back correct instead of minutes slow.

The **recipe page's back link** was a lone pill outside any `.wrap`, aligned to
the window edge while the recipe sat in the centre column. It now uses the same
`.menu-topbar` as the menu pages — which closed a hole nobody had filed: the
page showed CONTAINS GLUTEN chips with **no route to the Settings that decide
which allergens are flagged**, and no Favourites, Share or About either.

### What the check caught that review did not

`cook_check` failed on the new Reset button: hiding the element that has focus
drops focus to `<body>`, outside the dialog, where the keydown listener never
sees it — so every keyboard shortcut went dead. That is the **same defect the
owner ruled on for the Back button on 2026-08-15**, reintroduced within a day by
a different control learning to hide itself. The rule is now written at both
sites: hand focus on *before* hiding, never after. The check was rewritten
against the new contract and drives its assertions off the recipe data rather
than off step numbers, so editing the corpus cannot quietly turn an assertion
into a different one.

### The three that are blocked, and were not guessed

The owner asked for per-step and total times, and for researched serving sizes.
Measured rather than assumed: **28 of 118 steps** state a duration, **9 of 24**
recipes carry a total, **3 of 24** carry a serving count. Sum-of-stated-steps is
not a total — Hotcakes state 5 minutes against a `time` of "~50 min", because
prep is untimed — so publishing the sum would understate most recipes by most of
their length. And serving sizes for "Booth's Ginger Crunch" or "Shane's Ribs"
are not researchable at all: they are family recipes, and a count lifted from a
published cookbook would be a claim about a different recipe. All three are
Theme 36a/36b/36c with the numbers attached and the ask put to the owner.

Same for the quantity-per-step he described ("1 of the 2 cups"): nothing in the
data ties an ingredient line to a step. Worth noting the corpus is already
reaching for the structure by hand — `"Sauce: ¼ cup cocoa"` and the
`Topping:`/`Batter:` prefixes are per-step grouping invented by whoever typed it
in. That is the argument for the schema change, and it is in 36b.

### The holistic answer he asked for

Cook at Home is a venue file carrying `address: null`, `phone: null`,
`hours: null`, `currency: "NZD"` on something with no prices, and `area: "Home"`
— a suburb invented so the filters would not choke. Then `kind === "recipes"` is
special-cased in about twenty places to take it all back off. That is the seam
he can feel: every recipe screen starts from "restaurant" and reasons its way to
"not that", and the leftovers were the order-style button, the menu-page back
link, and a ⋯ menu nobody added because a recipe was never treated as a
destination. Theme 36 states the three ways out and recommends the cheap one —
declare a capability set per `kind`, so a screen asks "does this have hours?"
instead of "is this a recipe?".

### Concurrency

`main` moved five times during this session; the push took a rebase loop and two
`sw.js` conflicts. `SHELL_VERSION` was taken as **`.60`**, deliberately above
`origin/main`'s `.57` rather than `+1` — the read-and-add-one habit is what has
cost this repo three lost bumps, and a peer session had explicitly asked for
numbers to be claimed out loud.

---

## 2026-08-16 10:12 UTC — addendum: I deleted an open item, and the guard for that exact failure was out of scope

Correcting the entry above rather than leaving it to read as a clean close.

🛑 **`caa588d` deleted ROADMAP item 15y — an unfixed WCAG 2.2 AA failure — while
it was still open.** It reached neither `ROADMAP-DONE.md` nor a fix and survived
only as prose in `SESSIONS.md`, which is the record and not the worklist. Found
by a peer session going to add a 🎯 marker to it and discovering it was gone;
restored verbatim at `e410d42`. **It had been the item I told that session was
the most important one to keep visible, and it was already gone when I said so.**

**Mechanism, stated so it is fixable rather than moralised about:** the harvest
replaced a *block* of `ROADMAP.md` by index between two markers, and 15y sat
inside that range because it was adjacent to 15x, which genuinely was done. A
block replacement takes everything between its endpoints; the three items either
side of it moved correctly. **A harvest moves `[x]` items and nothing else — and
an open item next to a closed one is the easiest thing in that file to lose.**

Swept properly afterwards rather than trusting the one that was noticed: across
all eight of this session's `ROADMAP.md` commits, exactly **five** open items were
deleted — the `tag_allergens` item (genuinely done, harvested), 15x, back-to-top
and the fixed/sticky audit (all three genuinely done and in `ROADMAP-DONE.md`),
and 15y. One loss in five. 🔎 A naive grep for the titles produces **false
alarms**, because the harvest rewords items into the past tense as it moves them
("covers" → "covered") — **diff the deleted lines, don't grep the titles.**

### 🔎 The ninth instance of the day's shape, and this one is upstream

**A guard for precisely this failure already exists and never ran.** Atelier's
`harvestscan` opens by naming it: *"an item REMOVED from ROADMAP.md that arrives
nowhere… a roadmap item that vanishes means the work does not get done."* It is
gated on a commit shedding **50+ net lines** from `ROADMAP.md`
(`NET_BULK_DELETE_LINES`, ruled 2026-07-29, the number taken from the 185-line
incident that prompted the guard). `caa588d` was **+82 −71, net +11**. Out of
scope. It is also wired **warn-only** in this repo, so even in scope it could not
have blocked the commit.

> 🎯 **Raised, not changed** — the threshold is the principal's own recorded
> ruling and the tool is atelier's. **A bulk deletion is the loudest case of this
> failure, not the only one**, and a single open item lost inside a net-positive
> commit is the quietest and the hardest to notice. The ruling was made from the
> one incident that had happened; there is now a second with the opposite shape.

Four house rules came out of the day, all paid for, and the peer put them in
`CONTRIBUTING.md` rather than leaving them in commit messages — which is the
difference between a rule and an anecdote:

1. Any control that hides or disables itself **while focused** drops focus to
   `<body>`, and every keyboard handler scoped to a subtree goes dead with it.
2. When a commit's area prefix and its file list disagree, **believe the file
   list** — the gates read paths, not subject lines.
3. A roadmap harvest moves `[x]` items and nothing else. **Diff the harvest.**
4. Grep `docs/decisions/` — especially the **Rejected** lists — before proposing
   an option. A theme is a more inviting read than a decision record: newer,
   narrative, full of measurements, and silent about the older document that
   already closed the question.

## 2026-08-16 10:52 UTC — 15y closed on an owner ruling, and a guard I had to throw away

Owner: *"RE 15y I accept your recommendation."* The ⓘ disclosure is click-only
everywhere now — ADR 0059, `SHELL .62`.

The hover reveal was one CSS rule and it carried two faults: an infinite flicker
where the note sits in flow (fixed narrowly earlier the same day), and a **WCAG
2.2 SC 1.4.13** failure that the narrow fix's sweep turned up — not *Hoverable*
(the note vanished as the pointer crossed the margin toward it) and not
*Dismissible* (Escape was wired only on the click path). Deleting the rule
retires both, and the earlier flicker guard went with it: 23 lines of CSS out,
16 of comment in. Three options went to the owner rather than a quiet edit,
because going click-only is **not** the neutral choice — it trades a mouse
affordance for compliance, which is a fork to surface, not resolve.

### The guard I built, proved worthless, and deleted

The obvious regression test was a headless one: hover the ⓘ, assert nothing
appears and the button does not move. It passed on a clean tree. Then I put the
deleted rule back to watch it fail — **and it passed again.** A synthetic
`Input.dispatchMouseEvent` does not raise CSS `:hover` reliably in that harness,
even with `elementFromPoint` confirming the coordinates land on the button and
the viewport confirming they are on screen. Eight polled samples made no
difference.

It would have shipped reading as coverage while proving nothing — the sixth
instance of that pattern in this repo, and this time caught only because
breaking the fix on purpose is now habit. The invariant "no hover rule targets
`.caveat-note`" is a property of the **source**, so it is asserted against the
source (`tests/disclosure-css.test.js`), where it cannot be flaky; that version
fails loudly on the reintroduced rule. `device_check` keeps the half a browser
genuinely can prove — a click still opens and closes the note.

The general lesson, which is not about hover: **when a check cannot be made to
fail on demand, the check is the thing that is broken.** Do not reach for a
richer harness first; ask whether the property being tested is a property of the
render at all, or of the source.

### Concurrency

A peer session spotted my uncommitted `app.css` in the shared checkout and
challenged it correctly — *"did the owner rule?"* — because the diff read as
15y being quietly resolved rather than decided. He had ruled, one message
earlier. The challenge was right to make and cost nothing; a peer that queries
an unexplained working-tree change is the concurrency protocol working.

---

## 2026-08-16 11:04 UTC — cross-device sync: the design was wrong, and the code said so

**Owner-directed mid-session**: *"start with work that enables device syncing of
user data… so my iphone and laptop show the same favourites, ratings etc."* That
is Theme 9 **v2** (continual sync), not v1's transfer link, which shipped
2026-08-09. Worktree `faves-sync-client`, branch `sync-client`; claimed on `main`
before any work, and the claim said in writing what it did **not** cover.

### What was taken, and what was deliberately left

**The Worker was not built and not claimed.** Standing up a Cloudflare Worker +
KV namespace is a new trust surface and ADR 0017 marks v2 ⚑ the owner's go — the
direction to start sync is not the same as authority to stand up a backend. ADR
0017's own build shape says to build the **claim-agnostic store first** anyway,
so the client half is the right thing to take alone. The claim line names the
split so a peer session can take the backend without asking.

### 🔎 The finding was bigger than the item: ADR 0017's merge bullet is wrong

It looked like transcription — 0017 had designed this in July and named the merge
rules. **Both halves are wrong against the code as it actually stands**, and
neither is visible until you try to write the function.

- *"Union hearts"* makes **un-hearting impossible**. `favourites.merge()` never
  removes — by design, and its own docstring says so, because it was built to
  receive a shared shortlist. Applied continually: device A drops a heart, B
  still has it, the next pull restores it on A, forever, from any device.
- *"Last-write-wins per scalar"* is **unimplementable**. Nothing in the personal
  layer carries a timestamp — not favourites, not ratings, not settings, not the
  profile registry, verified across all five modules. There is no write time.

The root of it: 0017 reached for the import path (*"reuse Theme 12's collector"*).
The **collector** half of that is right; the **applier** half is not. Import runs
once, watched, one-way, and `applyPersonalData` is additive on purpose. Sync runs
unattended, continually, and **symmetrically** — both devices run the same code
against each other. Same bytes, different problem.

**The fix costs no schema change** (ADR 0060): keep the snapshot the two devices
last agreed on and diff both sides against it. A one-sided absence is then a
*deletion* when base held it and an *addition* when it did not — the one
distinction the additive path cannot make. Tombstones and per-entry timestamps
both lose to it, because the base snapshot was going to have to be kept anyway.

### 🔎 Symmetry outranks any individual tie-break, and order is part of it

The non-obvious half. Both ends run the same merge, so *"prefer theirs"* — the
natural reading of a pull — has each device take the other's value and the pair
**swaps forever**. Every tie-break here is therefore a function of the values
alone. Caught a second instance of the same shape mid-build: two devices agreeing
on the *set* of hearts but not the array **order** serialise to different JSON, so
each pull sees a changed blob and pushes a new one indefinitely — against the one
resource ADR 0017 names as scarce (KV writes, 1k/day free). Order is now a
function of the inputs too. **An asymmetric merge passes every one-directional
test and only fails in the field**, which is why the suite asserts `merge(a,b) ==
merge(b,a)` on every branch rather than trusting the reading.

### Two shipped bugs found on the way, neither of them the object of the search

1. **A transfer link destroyed the "follow me" localisation preference.**
   `activeSlice()` sent `settings.get()`, which resolves `lang`/`units` `"local"`
   to the **sending** device's current answer. A link made in Wellington carried
   hard `"en"`/`"metric"` and the receiver's follow-me preference (ADR 0045, 0029)
   was permanently replaced by a snapshot of where the sender stood. Worst on
   transfer-to-a-new-device — the primary use — because a new profile is written
   whole.
2. **A merge import silently dropped `units` and `currency`.** The settings patch
   was a hardcoded four-field list written before either setting existed. A
   *new*-profile import restored them, which is exactly why nobody saw it. Now
   derived from the settings module's own defaults.

🚩 **Both are the same failure**: a whitelist and a resolved-value read, each
correct when written and each silently rotted when a later ADR added a field.
`sync-merge.js` derives its field list for that reason and says so at the site.

### Verification

825 tests green (26 new). `boot_check` 15/15, `device_check` 20/20, `cook_check`
42/42. Every python gate clean; version lockstep confirmed with the `--range`
form, not the bare one. **The merge suite was verified by breaking it** —
reintroducing the additive rule failed exactly the two deletion tests and nothing
else.

### 🎯 Left with the owner (both in ADR 0060)

- **`sync-merge.js` ships before anything imports it**, because the repo enforces
  that every module under `site/js/` is precached — 5.9 KB gzipped on every phone
  for a feature that is not yet reachable. Taken deliberately; reversible in one
  commit.
- **His Reset ruling cannot be met as stated.** He ruled this morning that a
  propagating reset must *"name the number of devices it will reach"*. Under ADR
  0017 the server is a dumb ciphertext store and every device shares one bearer
  code, so **it cannot count devices**, and asking the Worker to log it is the
  tracking the design refuses. A roster inside the blob is the only home, and a
  device that syncs once and is never opened again never leaves it — so the number
  is an **upper bound, not a count**. A confidently wrong number on a destructive
  confirmation is worse than no number.

### 🔎 Unrelated, noticed and not fixed (not this session's lane)

`pathscan` reports 4 findings on `.claude/worktrees`, a **gitignored** path that
by construction cannot exist in a checkout. It is warn-only and pre-existing, so
it fires on every commit and resolves on none — the decorative-guard shape again.
Left for whoever owns the scanner item (ROADMAP Theme 33).

---

## 2026-08-16 11:38 UTC — addendum: the owner authorised the backend, and the test for the crypto was decorative

Continues the entry above. Three rulings came back on what that entry raised, and
one of them **amends a ruling he made the same morning**.

- 🎯 **The Worker is authorised.** ADR 0017's ⚑ standing-backend gate is
  discharged. Briefed on the new public endpoint, the ciphertext-only guarantee
  and the ~$0 cost before he answered.
- 🎯 **`sync-merge.js` stays precached** — the 5.9 KB option to pull it out was
  offered and declined. Do not re-propose it.
- 🎯 **The Reset confirmation drops the device count.** His morning ruling asked
  it to *"name the number of devices it will reach"*. Building the merge proved
  that unobtainable: an E2E blob with one shared bearer code means the server
  holds one opaque ciphertext, a roster can only live inside the blob, and a
  device that syncs once and is never opened again never leaves it — so any
  number is an upper bound. Put to him with three wordings; he chose **name the
  scope, not a number**. *"Everywhere, always"* is untouched. 🔎 **The consequence
  worth having: the roster is now unnecessary**, which removes the one piece of
  per-device state the blob would have carried and the age-out guess it needed.

### Built: the crypto, the code, the Worker (three agents, disjoint files)

`sync-crypto.js` (mine), `sync-code.js` and `worker/` (one agent each, file
ownership named both ways). ADR 0061 records the decisions; 875 tests green.

### 🔎 The finding: my own test for the security property asserted nothing

The whole promise is that the code is split — HKDF under **different** labels
gives a blob id the server may hold and a key it must never see. Derive both
under one label and the server holds the decryption key, while the app works
perfectly.

I sabotaged the module to check the suite caught it. **All 13 tests passed.** The
test named for the separation derived a key *from the blob id*, which differs
from the real key whether or not the labels match — so it never touched the
property it was named for. Rewritten to derive both HKDF streams by hand and
compare them; re-run against the same sabotage, it fails.

🚩 **This is the decorative-guard shape again, and note where it landed: inside
the one file where I was being most careful.** Care is not what catches this.
What caught it was the cheap mechanical habit of breaking the thing on purpose,
which cost about a minute. The labels are now `export`ed for no reason other than
that the property can be observed — *a property nothing can observe is a property
nothing is guarding.*

A second instance of the same class, caught by a different mechanism: the Worker
agent assumed a 64-char blob id against the client's real 32-char contract. It
found that by **reading the client module** rather than by any test, and both
suites would have stayed green while every request 400s. There is now one
assertion that crosses that boundary — the client derives an id and runs it
through the Worker's own validator.

### 🚩 Left undone, deliberately

**The Worker is not deployed.** No `wrangler` and no Cloudflare credential on this
machine; installing a tool and creating a live endpoint on his account are his
calls, and the authorisation to *build* it is not authorisation to install
tooling unasked. `worker/README.md` has the exact steps and a least-privilege
token scope that deliberately does not reuse the existing Pages/DNS token.

**Sync still does not work end to end.** What remains: the deploy, the
push/pull/debounce client, the pairing UI, and the **base-snapshot store** — the
last of which is the only remaining piece of the offline half, and without it the
merge silently degrades to the additive behaviour ADR 0060 exists to replace.

## 2026-08-16 11:40 UTC — the filter row, and three collisions that all fired

Owner, on the desktop filter row 15x shipped: *"truly horrible UI, it wastes a
ton of screen space, it makes no sense i.e. not intuitive… There are two clear
groups some filters and some sorting controls. And it should only be the height
of the Open Now button UI element roughly as a row of UI elements."*

Three things landed on `main`: **15z** (the row, [ADR 0062]), **per-branch
details provenance** ([ADR 0063], Theme 19) and **31d** (the WCAG G201
new-window warning). Two were built by subagents in their own worktrees.

### The measurement that made the case, and rebuked the last build

Taken before touching anything, in real headless Chrome:

| | Phone (390 × 844, sheet) | Desktop (960 × 800, inline) |
|---|---|---|
| Chrome above the first card | 212 px — **25.1%** | 511 px — **63.9%** |
| Panel height | behind a button | **284 px** |
| Bands of controls | — | **5** |
| The "Open now" chip beside it | 44 px | 44 px |

🔎 **The desktop build was 2.5× worse than the phone the sheet existed to
rescue.** 15c's whole case was that 50.7% of a phone viewport was chrome; the
desktop half of the fix shipped at 63.9% and nobody measured it. The owner did
not need numbers to see it, which is the point — **the numbers were available at
any moment and were only taken once he complained.**

After: **67 px, one band, at every width ≥ 960 px.** 36.8% chrome.

### The design call, and the one thing left with the owner

A sheet and a toolbar are opposite shapes. A sheet has vertical room and no
context so it labels everything; a toolbar has horizontal room only and its
controls must name themselves. So inline every label and heading goes
**visually hidden** — still naming controls and landmarks for assistive tech —
and the only surviving text is "Sort by" beside a rule. Two groups, one word.

Two controls changed shape, and **neither was asked for**:
- **Service → `<select>`.** Same one-of-three as Area and Cuisine, and as a
  segmented control it cost **256 px of a 928 px row** to say so differently.
- **"Near me" + "Along a route" → one "Sort by" select.** `app.js`'s own comment
  has always called them *"mutually exclusive sort modes"*, which is not what
  two `aria-pressed` toggles mean. The select also names the third state that
  previously existed only as *neither pressed* and could be reached only by
  pressing the pressed one.

🎯 **Left with the owner, deliberately unresolved:** Theme 15c measured the
Service filter returning **81% of the list for "Takeaway" and 79% for
"Dine-in"**. Dropping it frees 160 px and simplifies the row further — but
removing a filter is a product decision, not a layout one, so it was raised
rather than taken. The same restraint the "no harvesting on a hunch" rule asks
for, applied to deletion.

### 🔎 Three defects that only measurement found — all invisible to the CSS

1. **`flex-wrap: wrap` breaks on flex-*basis*, not on shrunk width.** Turning it
   on so the destination bar could take a second line put the resting row
   straight back to 121 px. This row only fits because the selects shrink
   *below* their basis, and a wrapping line never gets that far. Wrap is now
   scoped to `.routing` alone. **"It fits" and "it does not wrap" are different
   questions, and only the second one is the promise.**
2. **A select squeezed to 107 px renders "All cuisi…".** The first cut satisfied
   every width constraint written for it and was unreadable.
3. **The destination bar rendered *on top of* three other controls.** All three
   stayed visible, non-zero-sized and in the DOM. Only `elementFromPoint` sees
   that — the same lesson `to_top_check` paid for, in a new place.

All three are now in `tools/filter_row_check.mjs` (18 → 22 assertions) and
**each was proved by reintroducing the defect.** 🚩 The overlap needed the
*exact* original CSS: a half-reverted version failed only the cheaper of its two
assertions, so one of the pair would have shipped decorative. **When a guard is
proved by breaking the fix, break it the whole way — a partial revert
under-reports.** That is the tenth instance of the decorative-guard shape.

### Concurrency — the day's real lesson, and it is not "use worktrees"

Four sessions ran on this repo at once. Worktrees held. What did not:

1. **Every reserved version number was stale by merge time.** I gave two
   subagents `SHELL .64` and `.65`; `.64` was already on `origin/main` when
   the first one started, and `.66` was consumed while the second worked. All
   three merges hit a `sw.js` conflict and resolved to `.67/.68/.69`.
   🚩 **A reserved version is only valid at the instant it is reserved.** The
   provenance agent caught its own collision *because* it ran
   `check_versions.py --range origin/main..HEAD` rather than trusting the
   reservation. That is the check that works; the reservation is a courtesy.
2. **ADR numbers collided the same way.** I wrote `0061`; a peer landed `0061`
   while I worked. Mine became `0062` at merge and cost nothing — because the
   *other* agent's convention (`DRAFT-<slug>.md`, number allocated at merge,
   index entry in the same commit) is right and mine was not. Adopt the draft
   convention every time.
3. **`git pull --rebase` on a checkout holding merge commits is a trap.** It
   flattened three merges into a rebase, conflicted, and a concurrent `push`
   raced it. Recovered intact (`git rebase --abort`, then verify
   `main..origin/main` is empty **both ways**), but the safe order is: finish
   the merge, verify, push, *then* pull.
4. **A peer corrected me and was right.** I reported "sorting by distance puts
   Cook at Home first with no coordinates" as a `kind` bug. It is
   `ranking.js:153` `pinned: r.kind === "recipes" ? 0 : 1`, a decision shipped
   2026-07-12 and recorded in `ROADMAP-DONE.md`. He checked it in two minutes
   *because the report carried the mechanism and the numbers*, and turned it
   into a better open question than the bug would have been — should the pin
   survive a sort the reader **explicitly asked for**? 🚩 **A peer's measurement
   and a peer's diagnosis are different goods. Send both, label which is
   which.**

### What the subagents were worth

Two `[S]`/`[XS]` items delivered in parallel with the flagship, both with
break-it-to-prove-it evidence I did not have to ask twice for. The brief that
made it work named the **locked files** up front, gave **exact version numbers**,
and demanded the gate output verbatim. The provenance agent also spent its own
judgement well: it flagged the version collision, refused the out-of-scope
per-kind ageing, declined to write this file (a subagent appending to an
append-only log nine sessions share is a near-certain conflict), and fixed a
stale mutation count in `CLAUDE.md` because a stale count is the decorative
guard again.

[ADR 0062]: decisions/0062-a-toolbar-is-not-a-sheet-lying-down.md
[ADR 0063]: decisions/0063-details-provenance-belongs-to-a-branch.md

---

## 2026-08-16 11:52 UTC — addendum: the Worker is live, and the token never touched this repo

Owner ruled the deploy path: **install wrangler, mint a scoped token** — then,
unprompted and correctly, *"that token should be stored in shed and I'm
expecting it is not held in the Faves app at all where someone could take it."*

**Done exactly that, through the estate root's own tooling rather than by hand.**
A dedicated Cloudflare child token minted with the estate's mint tool, value
written **only** to the macOS login keychain, story recorded in the estate
credential registry, and the deploy coordinates (account id, both KV namespace
ids) recorded in the estate inventory. **Nothing of it is in this repo** —
`worker/wrangler.toml` still carries its `REPLACE_WITH_…` placeholders, and a
redeploy regenerates a filled config outside the tree.

**Scope, because least privilege is the point:** two account permission groups,
`Workers Scripts Write` and `Workers KV Storage Write`. **No zone scope at all**,
so the credential cannot reach the estate's DNS. Deliberately **not** the Pages
credential this site deploys on — reusing it would have put two unrelated blast
radii on one token. Write scope is only acceptable because of ADR 0061: whoever
holds this can replace the Worker or delete ciphertext, and cannot read one
user's data.

⚠️ **A claim I made here and then retracted, in the same session.** I recorded
our `.gitignore` line `tools/.cf-token` as a *trap* inviting a Cloudflare token <!-- pathscan:allow: a .gitignore entry — the whole point is that this path must never exist in the tree -->
into this public tree. **Wrong, and retracted.** Re-reading it, the comment
directly above reads *"the Cloudflare token lives in the environment, never in
the repo"*, and the entries (`.env`, `*.token`, `tools/.cf-token`) are a <!-- pathscan:allow: a .gitignore entry — the whole point is that this path must never exist in the tree -->
defensive net for exactly that. **Deleting them would make an accidental commit
more likely, not less.** Left alone deliberately.
🔎 Worth keeping rather than quietly fixing, because of *how* it nearly went
wrong: I read the ignore list without reading the four words of comment above
it, and wrote a confident finding into two repos' permanent records. A session
acting on it would have removed a working safeguard in the name of security.
**A finding about a file is not final until you have read what the file says
about itself.**

### Verified live, not inferred

Ten checks against the running Worker with real derived keys and real
ciphertext — 404 before write · 204 PUT · 200 GET with ETag · round trip
decrypts identical · no plaintext on the wire · stale `If-Match` 412 · correct
`If-Match` 204 · another code's blob id 404 · malformed id 400 · 300 KiB body
413. All passed. Residue: one test blob under a throwaway code, ciphertext of a
fixture, expiring with the 180-day TTL.

### 🚩 What this does NOT mean

**Sync does not work for a user.** Nothing under `site/` calls the endpoint. The
remaining work is the push/pull/debounce client, the pairing screen, and the
**base-snapshot store** — and that last one is load-bearing, not cosmetic:
without it `mergePersonal` has no `base`, and it degrades silently to exactly
the additive behaviour ADR 0060 exists to replace. A future session must not
read "Worker deployed" as "sync shipped".

### Local tooling note

`wrangler` installed **globally** (`npm install -g`), deliberately not as a repo
devDependency — a `package.json` entry would put a dependency in a repo whose
whole first constraint is not having any, even a dev-only one. The zero-build
rule governs the shipped site, but the cheapest way to keep that true is to keep
the tree clean. Also: the estate's Python tooling needed `SSL_CERT_FILE=/etc/ssl/cert.pem`
on this machine — Python 3.14 here ships no CA bundle, so `urllib` fails
certificate verification while `curl` succeeds against the same endpoint.

## 2026-08-16 11:51 UTC — sixteen owner rulings, and two records that were lying

The owner asked for every gated theme to be put to him, and it was. Sixteen
rulings in one sitting. Three reversed my recommendation, two corrected me
outright, and one only came out right because the homework got done.

### The ratings thread, which was two threads pretending to be one

I put "ratify the curated household rating" to him as *the* ratings gate. He
answered: *"It was never supposed to be curated ratings… What I asked for was
using publicly available review/ratings/feedback services/websites like yelp,
Google etc that aggregate feedback."* The curated rating is **withdrawn** —
retire the dormant `rating: 1..3` field rather than fill it.

**The record caused this, not a misreading of the room.** Theme 5 carried two
separate ratings items, and the 2026-07-08 owner-calls line welded them: *"show
the live number when online… ; dish ratings curated"*. One sentence, two
decisions, and the second half was never his. Marked superseded, because
unmarked it would have re-proposed itself to him a fourth time.

Then he chose **"cache aggressively into the repo"** for the aggregates — from
an option whose own text said the terms hadn't been read. So they were read:
**Google permits no caching of ratings at all** (place ids indefinitely, coords
30 days); **Yelp permits nothing beyond 24 hours** and can demand destruction.
This repo is public, so a committed rating is a permanent, visible breach that
cannot be un-published. Re-put with the numbers, he ruled **link-out only** —
no key, no edge function, no bill, no ToS surface, works offline. The whole
ratings thread now closes without a backend.

**The lesson is not "check the terms".** It is that the informed-confirmation
floor is worth real work: an approval given on a briefing that says "I haven't
checked" is not yet a decision, and going back with facts got a *better* answer
than the one I'd have built.

### Trends: asked and answered, three times

*"The trends data will never be shown in the faves app as I've told you a
couple of times before in other sessions."* Recorded as a hard never, and — more
usefully — **why it keeps being re-asked**: Theme 13 read as a sequencing gate
("not enough data yet") with a 1-venue-of-31 coverage stat that invites
"revisit when it grows". Read cold, it looks like it is waiting. A roadmap entry
that reads as an invitation will be accepted. Also saved to memory, since the
cost of this one is his patience, not a build.

### Overruled, correctly, on timers

Two sessions independently built the cautious version — estimates as text, only
stated times driving countdowns — on the food-safety argument. Put to him with
that argument and a split-on-risk middle option in front of him, he ruled
**estimates drive timers too, clearly marked**. The sibling had explicitly asked
to be corrected rather than have its caution become policy by default, and that
is the right instinct: a rule nobody ruled on, arrived at because two agents
were careful and neither spoke, is the worst kind of policy.

The marker goes on the **timer face**, not the step text. A countdown that looks
identical whether the number was read or guessed is not marked.

### Concurrency, the expensive kind

`git pull --rebase` in the shared checkout began replaying **seven commits that
were not mine** and hit a conflict. Aborted rather than resolved — never absorb
another session's work — and it turned out to be a transient race. The peer had
been landing small claims directly in `/Users/mike/.pets/faves` on the reasoning
that a claim line is a sanctioned touch in a shared tree. It is; a *run of
commits* while others pull is not. They stopped. Worth writing down because the
reasoning was almost right, which is what made it survive.

## 2026-08-16 — Themes 17, 36 and 4, run as five parallel streams

An orchestrator session on the owner's queue: Theme 17 (cook mode), Theme 36
(cooking is not ordering) and Theme 4 (content growth), five worktrees, four
peer sessions live throughout. Everything below landed on `main` and is covered
by a green superseding CI run (`078f0ba`; `74c1918` is its ancestor — the
`floor` run on 74c1918 shows `cancelled`, which is a peer's push taking the
concurrency group, not a failure).

### What shipped

- **Theme 36's structural call — [ADR 0065], `site/js/kinds.js`.** ~40 scattered
  `kind === "recipes"` checks across eight modules became **11 declared
  capabilities** plus 10 label slots. `grep -rn '"recipes"' site/js/` now
  returns `kinds.js` alone. `renderDish` lost its `isRecipes` boolean — `r`
  already carried the kind, so the flag was a second copy that could disagree.
- **Theme 36a/36c — `data/estimates/`, [ADR 0064] as amended by [ADR 0066].**
  All 24 recipes and 118 steps, every number carrying its **working** in prose,
  guarded by `tools/recipe_estimates.py --check`.
- **Theme 17e — the cook-mode checklist and read-aloud, [ADR 0067].** Ticks on
  ingredients and steps, surviving a reload; `speechSynthesis` on a tap.
  `cook_check.mjs` 36 → 57 assertions.
- **Theme 4 — `tools/drinks_gap.py`**, and a live user-visible price defect
  fixed (below).

### 🔑 Four capabilities is the owner's floor; eleven is what the code asked for

The ruling named four (hours, location, prices, ordering). Deriving the
vocabulary from the real call sites instead produced eleven, each read by at
least one site — the extra seven (`canReport`, `hasFreshness`, `inFacets`,
`pinnedFirst`, `hasContactCard`, `itemsHaveRecipeFields`, `itemPage`) were
already distinctions the code was making, just spelled as identity checks. The
method that got there: read every call site first and group by *what it is
actually asking*, rather than designing the table and mapping onto it.

**Four identity checks survive deliberately.** `isRecipeKind()` writes a
**persisted** `isRecipe` flag into favourites, ratings and share URLs, read back
for a record that may not be loaded. A persisted answer cannot be re-derived, so
it cannot become a capability. That is the boundary of this refactor and it is
worth naming: capabilities describe a record you *have*; identity is what you
stored when you had it.

### 🔎 A green suite proves a refactor's tests still pass, not that behaviour held

Two things beyond the green runs, and they earned their cost:

1. **Rendered DOM captured from `main` and from the branch, diffed** —
   byte-identical across five screens (home list 30,857 chars, Cook at Home
   73,540, two menus, the home count), with the data verified identical first so
   the comparison isolates the code.
2. **Each capability flipped on purpose to see which bite.** `hasPrices` breaks
   3 tests, `pinnedFirst` 2, `hasHours` 1, `inFacets` 1 — and **`hasLocation`
   breaks none**, because every consumer already guards on `lat`/`lng`. It is
   declaration-only today. Recorded in the ADR rather than left for a future
   session to trust a green run over.
   ⚠️ The DOM harness also missed the `pinnedFirst` break: headless Chrome
   denies geolocation, so it never exercises the distance sort. The unit tests
   are what cover that. **Two harnesses, two blind spots, and neither is
   visible from the other's green output.**

### 🔑 A peer's measurement and a peer's diagnosis are different goods

A peer reported "sorting by distance puts Cook at Home first despite having no
coordinates" as a live `kind` bug. The measurement was reproducible and
valuable. The diagnosis was wrong: `ranking.js` `pinned` is commented *"Cook at
Home always anchors the top"* and `ROADMAP-DONE.md` records it as a deliberate
2026-07-12 decision. Two greps separated them, before an agent had been told to
treat it as a defect — which would have silently reverted a shipped decision
inside a "pure refactor", the worst available version of this.

The real question the report contained is better than the bug would have been:
the pin sorts ahead of *every* key, but "nearest first" is a question the reader
asked **explicitly**. Left for the owner; the refactor makes it *expressible*
(`hasLocation: false`) without deciding it. **Verify a report before you build
on it** — the peer agreed without reservation and asked that measurements keep
coming in that shape, which is the right outcome.

### 🔎 The defect no gate could have caught, found by a tool aimed elsewhere

`tools/drinks_gap.py` was built to answer "which venues sell drinks and have no
drink rows?" (answer: 1841, Baylands, Sprig + Fern Tawa). Its `--price-effect`
mode, added only to check whether the roadmap's `priceBand` warning was *true*,
found that **BurgerFuel and Hell Pizza were shipping `$` on the home card**
against food-only medians of **$15.75 and $23.50** — the `$`/`$$` boundary being
$15. Live, user-visible, on two of the busiest venues in the corpus.

**Why it hid:** `validate.py` passes a record with **no** `priceBand`, because
the field is optional and the app derives one. There was no invariant to
violate. Of the 11 venues carrying drinks, **5 flip to a cheaper band and 0 flip
the other way** — so the roadmap's warning was true and now has a number.
Both fixed by curating `priceBand` **and** `pricePerPerson` together from the
food-only median, per the two 2026-08-15 pubs, so the band and the `~$Npp`
beside it agree instead of contradicting.

🔑 **The transferable part: a derived worklist finds things its own question did
not ask about.** Eyeballing never would have.

### 🔎 The corpus is measurably better and worse than the roadmap said

- **32 of 55 venue records carry zero dishes**, not the six Theme 4 named — and
  **14 publish no website at all**, so no amount of research clears them; only a
  photo or an in-store visit can. A five-fold understatement, fixed with a
  one-line reproducer rather than a re-typed list.
- **32 recipe steps state their own time, not 28.** The extra four state it in
  *words* — "cook the garlic for a minute", "marinate for at least an hour". 28
  is the **digits-only** count, i.e. exactly what `cook.js`'s regex can see.
  🔑 **A measurement taken through a tool inherits the tool's limits.** Calling
  those four "estimates" would have mislabelled the data to match a parser.

### Overruled on timers, and why it cost almost nothing

The estimates work encoded a safety rule raised as an open question: an
*estimated* duration may never drive a countdown. The owner ruled the other way
with the food-safety argument and a split-on-`phase` middle option in front of
him — *"estimates drive timers too, clearly marked"*.

**`timerSafe` was retired, not inverted.** Under the ruling every duration is
timer-eligible, so the flag reads `true` everywhere and a field with one value
tells a renderer nothing. `source` is what the timer face reads. The gate was
**replaced, not dropped**: a step with `minutes` and no `source` now exits 1 —
that is a countdown with no way to know whether to mark it.

🔑 **What made the reversal cheap was landing in `data/` rather than `site/`.**
The precaution was taken against a different risk (auditability before
publication, ADR 0047) and paid off here: no phone ever held the retired rule,
so overruling cost a tool edit and an ADR, not a shipped-behaviour rollback.
**Stage work where a reversal is cheap when the decision behind it is still
open.**

### 🚩 A feature that looks correct and is silently inert

`stepDuration()` in `cook.js` **re-parses the recipe sentence** rather than
reading a stored number. So building the marked-estimate timer requires the
per-step minutes to actually reach the payload — otherwise the estimated steps
stay untimed while every check stays green. Found while writing the render spec,
which is the cheapest place to find it.

### 🔎 Adding a checkbox re-armed a bug the repo had fixed twice

The cook-mode ingredient list is `replaceChildren`-ed on every step change, so a
new focusable box holding focus dropped focus to `<body>` and killed the arrow
keys — the identical failure ADR 0039 caught on the Back button. Fixed the same
way (hand focus to Next first) and asserted. **A hazard class closed on one
control is not closed on the next control added to the same container.**

Two more from that build worth keeping:
- **The strike-through is CSS `:has()`, never a JS class**, because the lines
  sit inside an `aria-live` region and a DOM mutation there re-reads the whole
  step aloud on every tick. The guard proves it by comparing the live region's
  markup byte for byte.
- **A tick is keyed on a hash of the line's own raw text**, not its index. The
  index fails *silently*: insert an ingredient and every tick below slides onto
  the wrong one — "I already added the salt" pointing at the sugar. Hashing the
  **raw** line, not the `convertTemperatures` render, is what stops an imperial
  reader losing every tick on a units flip.

### Concurrency: what fired, and what the fix actually was

Five worktrees, four peers, one afternoon. Every one of these fired:

- **Three ADR-number collisions.** 0064 twice (two of my own agents), then 0065
  again. The convention that worked, copied from a peer: **name the file
  `DRAFT-<slug>.md` in the worktree with no number in it, and take the number by
  `ls docs/decisions/` in the same minute as the final commit.** Renumbering is
  then a rename, not a rewrite.
- **`check_versions --range` false-positives on a stale base** — it reports
  *main's own* bumps as "SHELL_VERSION goes BACKWARDS" and lists other sessions'
  files, on a branch touching none of them. It fired four times. 🔑 The check
  that settles it: `git merge-base HEAD origin/main` must equal
  `git rev-parse origin/main` **before** the version check is believed. Main can
  move *during* a rebase, so "I just rebased" is not the same claim.
- **A reserved version number is only valid at the instant it is reserved.**
  A peer's three reservations were all stale by merge time.
- **I was the shared-checkout committer** a peer's aborted rebase hit. A claim
  line is a sanctioned touch in a shared tree; a *run of commits* while others
  pull is not. Moved to worktrees and `git push origin <branch>:main` for the
  rest of the session — a fast-forward that never checks out `main` anywhere.
- **Push races**: three pushes to `main` lost a race and needed a
  fetch-rebase-retry loop. Cheap, but budget for it.

### 🔑 My own check lied to me

A homemade `for c in …; do python3 $c && echo PASS || echo FAIL; done` wrapper
reported `split_data.py --check` and `gen_sbom.py --check` as **failing on clean
`main`**. Both exit 0. The wrapper was wrong, not the repo — caught only by
running the tools directly and reading their output.

That is the decorative-guard pattern, and this time it was in the orchestrator's
own hands rather than in the codebase. **A convenience wrapper around a set of
gates is itself an unverified gate.** Run the tool, read the sentence.

### Left open, deliberately

- **36d is ruled and buildable** — tone (WebAudio `OscillatorNode`), vibration,
  and a notification for timers over 15 minutes. **Not started**: it introduces
  the **first permission prompt Faves has ever shown**, and beginning a new
  trust surface at the tail of a session is how a half-built one ships.
  ⚠️ `navigator.vibrate` is **a no-op on iOS Safari** — an Android-only benefit,
  chosen knowingly. Recommend `Notification.requestPermission()` **at the moment
  a long timer starts**, never at page load, degrading silently to tone when
  refused.
- **`area: "Home"`** — evidence gathered, not decided (below).
- **Aggregate ratings** — a peer resolved this without a backend; nothing here.
- **The Cook at Home list has no tick boxes** — blocked by file ownership only,
  ~20 lines, recorded in [ADR 0067]'s *Rejected* so it is built, not redesigned.

### 🎯 Sitting with the owner

- **`area: "Home"`** — the roadmap called it an invented suburb, and asked
  whether to null it per ADR 0003. Measured instead: **the global search result
  for Cook at Home renders "Home · Home cooking"**, via `search.js` copying
  `area` and `app.js` joining `[p.area, cuisine]`. Nulling it makes that row
  read "Home cooking". Everything else that touches `area` is inert for this
  record. So it is a **visible display preference**, not a data-hygiene defect —
  a sharper question than the one asked.
- **Nine recipes have estimates weak enough that his own number would beat
  them** — headline: *Booth's Ginger Crunch* has **no method at all** (empty
  `steps`), and *Slow-Cooked Chicken Noodle Soup* never says low or high, so a
  guess would invent the setting *and* the time on six chicken thighs.
- **`serves` and yield are conflated in the shipped data.** Liège Waffles'
  `serves: 12` is 12 *waffles*; the puddings' `serves: 6` is 6 *people*. The
  record keeps them separate rather than silently picking one.
- **Five stated `time` values are bake-only** and exclude 6–15 min of prep, yet
  the app renders `time` as if it were the total.
- **The checklist's twelve-hour expiry is the agent's number, not his**, and
  ticks are in a backup but not restored from one.
- **Whether any of the 18 fetchable empty-menu venues get fetched** — under his
  own standing rule, naming a URL in the roadmap is not an instruction to fetch.

[ADR 0064]: decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md
[ADR 0065]: decisions/0065-a-kind-declares-what-it-can-do.md
[ADR 0066]: decisions/0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md
[ADR 0067]: decisions/0067-a-tick-is-keyed-on-the-line-not-its-place.md

---

## 2026-08-16 12:52 UTC — sync is live, and the parts were never the feature

Owner pushed back on the previous entry's careful distinction: *"havent we just
built all that? I want the sync feature live."* **He was right to push, and the
distinction was real** — both things at once, which is why this is worth
recording rather than just fixing.

### 🔎 Everything was built, tested and green, and the feature did not exist

Checked rather than asserted, because the claim deserved evidence:

```
grep -rn "sync-merge|sync-crypto|sync-code" site/ --exclude=site/js/sync-*
  -> NOTHING imports them
grep -rn "workers.dev|faves-sync" site/
  -> NOTHING calls it
```

The merge, the crypto, the bearer code and a **deployed, live-verified Worker**
were all correct in isolation. 942 tests, four browser checks, every gate green.
**No screen could reach any of it.** The engine, the gearbox, the fuel and the
road, and no car with them bolted together.

🚩 **This is the decorative-guard family in its purest form yet.** Each part had
a test suite proving the part. Nothing had a test asking *does the feature
work*, because no test knew the feature was supposed to exist. The fix that
generalises is not "test more" — it is that **`sync-start.js` is a named file
imported by all three screens**, because an absence is far easier to notice as a
missing import than as a missing call inside an init function.

### What shipped

`sync.js` — **one operation, not two**. A push that has not first read the
server is exactly the stale-device clobber ADR 0017 warned about, so there is a
single cycle: read → merge → write under `If-Match` → *then* record the base. A
push is that cycle triggered by a local change; a pull is the same cycle on
foreground. Same code both ways, which is also what keeps the merge symmetric.

Two ordering rules that are load-bearing rather than tidy:
- **The base is written only after a write the server accepted.** A base
  describing an agreement that never happened is worse than none, because "no
  base" at least degrades in the safe direction (everything reads as an
  addition).
- **`writeSnapshot` replaces, it does not merge.** `applyPersonalData` is
  additive on purpose and using it here would throw away the deletion handling
  that is the whole reason ADR 0060 exists.

### 🚩 The one that could have hurt someone — ADR 0060 addendum 2

`resolve(decisions)` took the user's answer to the allergen conflict and used it
only to **unblock the write**. The snapshot pushed still carried the provisional
union. A person shown the question and answering *"keep this device's settings"*
would have had both devices' allergens written to both devices anyway, **having
been asked**.

Nothing was computed wrongly. The merge, the conflict, the question and the
tests were all correct. **The answer was simply never applied.** It sat exactly
on the seam between the module that decides and the module that acts — the seam
ADR 0060 created — and neither suite could see across it. Rule extracted: *a
provisional value plus a question is only half a design; the other half is the
write the answer changes.*

### Verification

942 tests (16 new for the engine) · `boot_check` 15/15 — **it caught the new
settings row and had to be updated, which is it working** · `device_check`
20/20. Engine suite verified by sabotage: making `writeSnapshot` additive fails
the two deletion tests; moving the base write before the accepted PUT fails the
race test.

🎉 **And the real proof — two devices against the LIVE deployed Worker**, not a
stub: both converge on three favourites, a 5-star rating crosses, and then
un-hearting on the phone **removes it from the laptop** instead of the laptop
putting it back. That last line is the one the original design could not have
produced at all.

### Process note worth keeping

⚠️ **"Read the current version constant and add one" walked straight into a peer
session's reserved range** (`.72`, inside their announced `.70–.79`). Caught
before commit. The lesson generalises past this repo: **a range convention that
lives in a chat message is invisible to the automation that picks the number**,
so the last step before commit has to compare the number against the announced
ranges, not merely against `main`. Moved to `.80` and re-announced. The peer had
hit the same class from the other side the same day.

---

## 2026-08-17 00:58 UTC — addendum: the browser found what the unit tests could not

Closing note on the sync build. **Sync is live in production** — verified twice
over: two simulated devices against the **real deployed Worker** converge and
propagate a deletion, and the deployed site serves all six sync modules with the
Settings row present.

### 🔎 The bug that only a browser could find

`writeSnapshot` rewrote `localStorage`; the live `favourites`/`ratings`/
`settings` singletons hold their state **in memory**. So a synced heart was
correct on disk and **no open screen moved** until a reload. Sixteen engine unit
tests were green and blind — every one of them reads storage directly, which is
exactly the shape of the thing that was wrong.

`personal-io-ui.js` has called `reloadProfileStores()` after an import since
Theme 12b for precisely this reason. Sync never did. Fixed as an injected
`onApplied` hook so the engine stays free of the live stores, called **before**
the base is written so a repaint that throws cannot leave a base claiming an
agreement whose local half never landed.

🚩 **The generalisable bit:** unit tests that assert against the *store* cannot
see a stale *view*. Any feature that writes storage behind a live singleton
needs one assertion at the view, and this repo's browser checks are where that
lives. Three tests now pin it, including that a failed sync repaints nothing.

### ⚠️ The check is landed knowingly incomplete, and says so at the top

`tools/sync_check.mjs` passes every sync assertion — including the headline, *a
heart removed on A is removed on B rather than re-added* — and then **aborts**
before three more that are written and have never been observed. Its header
opens with that, because **a wall of PASS lines followed by "harness error"
reads exactly like a pass**, and this repo has been caught by tail-reading
before.

The trace points at a real hazard rather than a flaky check: `menu.js`'s
`reapply()` now fires on every device via the new `onApplied` hook and races the
UI — the scroll snapped back on its own, and the ⋯ button's handler reported
**two** open/close cycles from **one** click. Queued as its own item with the
evidence; owner is `overflow-ui.js`/`menu.js`, not the sync engine.

### Coordination artefact worth recording

🔎 **A subagent concluded a rival session had duplicated its work.** It had not —
it had written its files into the shared worktree, gone quiescent, and *I*
committed them; it then saw its own output land under a commit message it did
not write and reasoned, carefully and wrongly, that a parallel session had been
given the identical brief. Nothing was lost, but it nearly re-did the work.
**When an orchestrator commits an agent's output, the agent cannot tell that
from a collision** — say so in the brief, or the agent's own diligence becomes
the hazard.

### Left for the next session

- `sync_check.mjs`'s three unobserved assertions + the `reapply()` race.
- **Theme 36g**, handed over by a peer and owner-ruled: cooking ticks must leave
  the backup export (*"if it isn't restored, it shouldn't be exported"*). The
  fix is `EXCLUDED` in `personal-data.js`, not an ad-hoc skip, and it wants a
  test proved by breaking it. Deliberately **not** taken here — the export path
  is the wrong place for a hurried edit at close.

## 2026-08-16 13:30 UTC — twelve owner asks in one sitting, and a premise worth checking

An orchestration session that started on the queue and was overtaken, happily,
by the owner watching the live site and reporting as he went. Twelve asks
arrived mid-turn. Five shipped, one was designed and deliberately left unbuilt,
and six are recorded with their causes already found.

### Shipped

- **The Clear ticks button, removed from both surfaces** (Theme 37a). The
  consequence is recorded rather than argued: ticks expire twelve hours after
  the *last* tick, so a recipe cooked twice inside that window now starts
  part-ticked with no one-tap reset. The store's own comment named the button as
  the answer to exactly that. His call, made knowingly.
- **The timer's face, rebuilt** (37b). Three complaints, one cause: the numeral
  and its state word shared a button, so centring the flex *pair* left the
  numeral off-centre by half the word's width. No amount of CSS fixes that while
  the word is in the box. Now a three-column grid with equal fixed flankers,
  CSS-drawn play/pause, a de-weighted reset and a hairline progress bar.
- **"Along a route", removed whole** (37f), superseding ADR 0014.
- **Four Sprig + Fern menus, 65 dishes** where there were none.
- **ADR 0068**, the ranking design.

### 🔑 The premise that was worth checking

He said the home list is *"already sorted by closest first with weighting for
being open, close, a favourite"* and asked for the sort control to go. Three
readings were needed to answer honestly, and the honest answer was neither
"you're right" nor "you're wrong":

- The blend he remembered **is built** — `rankVenues`'s default branch is
  availability → distance → favourite, and has been since 2026-07-08.
- It has **never once run**. `origin` is written in exactly one place, the sort
  control's own change handler, so in the default order every venue's distance
  is `Infinity`. Distance has never participated in the default home order in
  the project's entire history.
- So deleting the control as asked would have deleted the only mode where
  distance does anything — leaving an app that knows every venue's coordinates
  and never uses them.

**Two traps sat behind the obvious fix**, either of which would have shipped a
defect that read as "the ranking is broken":

1. The favourite credit is **10 km**, not the *"few hundred metres"* he
   remembers asking for. The commit that introduced it says so outright: *"a
   favourite 8 km away beats a plain place 2 km away."* Wiring `origin` through
   without touching it puts a hearted venue across town above the shop next
   door.
2. **`favBoostKm` cannot be re-tuned to fix that**, because it was quietly
   repurposed on 2026-07-23 as the branch-proximity cutoff and is what Settings
   now labels "Show branches within". One constant, two jobs, one name — and
   `settings.js` already carried a `#!##` marker saying so. Re-tuning it would
   have broken every chain's menu page instead.

🔑 **The generalisable lesson: "it isn't built" and "it never runs" are
different findings, and only one of them is fair.** The first was the easy
answer and it was wrong. Checking cost three reads of the same file and turned
an argument into a design.

And a second: **there was no ADR for ranking at all** — 68 records, none about
the home list's order. The whole specification lived in commit messages and
archived session prose, all of it in a scribe's voice. That is how a 10 km dial
nobody meant survived unchallenged for six weeks. ADR 0068 closes it.

### 🚩 Concurrency: the primary checkout was on someone else's branch

Twice, a file written into `/Users/mike/.pets/faves` vanished before it could be
committed — first a draft ADR, then its rewrite. The cause was not a tool
failure: **`git branch --show-current` in the primary checkout returned
`sync-live`.** A peer session had switched the shared checkout off `main`, so
untracked files written there were being cleared under a branch this session
never chose.

Worse, an earlier `git pull --rebase --autostash` in that shared checkout had
**stashed a peer's uncommitted work** and not restored it. That was recovered:
the stash held an older draft of a README index entry that had since landed on
`main` with corrected filenames, so nothing was lost — but it was only provable
by diffing the stash against `HEAD` rather than by assuming.

🔑 **The rule this sharpens: a clean tree is not the check — the BRANCH is.**
`git status` was clean and said nothing useful. `git branch --show-current` was
the one command that explained both symptoms, and it was not run until the
second file disappeared. Add it to the session-start sync, not just
`pull --rebase`.

Everything after that point was done in a worktree and pushed with
`git push origin <branch>:main`, which never checks out `main` anywhere.

### 🚩 The allergen sweep declines silently

`tools/tag_allergens.py` **writes nothing at all** on any record carrying
`addOnGroups` — it patches `tags` positionally and bails when the count
mismatches, exiting clean having done nothing. All four Sprig + Fern records hit
it. It also cannot see a **section note**, so Thorndon's *"on a Sesame Bun"*
printed once above the burgers left all three burgers untagged for sesame, and
Berhampore's *"our pizza bases contain dairy"* likewise — **30+ tags missed**
that way.

That is the decorative-guard pattern again, in the one tool whose silence is a
safety question: it can *report* the gap and cannot *apply* the fix. Roughly a
third of the tags on those four venues are inference rather than reading; every
one is written down on the roadmap, including the two `contains-egg` declines.

🔑 **And never trust PDF text extraction's ORDER.** `pypdf` emits Berhampore's
menu description-before-name, which would have handed a fried item the polenta
sticks' *"Vegan, DF, GF"* — a false **safety** claim. Render to PNG and read it
visually.

### 🔎 A challenge that was wrong, and worth making anyway

Thorndon's "Margherita" carried `contains-nuts` with no toppings in its name,
while every other pizza listed toppings inline. That looked exactly like a
dropped line whose tag outlived it. It wasn't: Thorndon's Margherita is *"Basil
Pesto / Mozzarella"* — a pesto pizza, no tomato — and the tag came from an
enumerated rule firing on text that is really there. The data was right.

What the challenge did surface is a **reporting** defect: the agent's
judgement-call table listed only tags *it* added, so the tool's own inferences
sat in the data with nothing in the summary to explain them. A correct tag with
no visible provenance is indistinguishable from an orphaned one. Three tiers now
— reading, tool inference, human judgement — not two.

### Left deliberately

**ADR 0068's build.** It introduces the **first unprompted permission prompt in
Faves' history**, and a new trust surface begun at the tail of a long session is
how a half-built one ships — the same call 36d got on 2026-08-16, for the same
reason. The design is ratified and the next session has four decisions, a named
constant to add, and a pure test file to pin it with before any of it reaches a
browser.

### Owner rulings taken at the close

Three questions were put to him rather than resolved quietly, and all three
changed something:

- **Little Sprig Seatoun's menu date → the conservative read** (2025-10-01, not
  the 2026-06-29 export). The stale-menu caveat now fires on that venue. 🔑 His
  reasoning generalises: **a caveat that fires wrongly costs less than one that
  stays silent on a ten-month-old price.**
- **The two declined `contains-egg` tags → added.** They were declined on the
  grounds that the split is genuine (set cheesecakes carry no egg; egg is in
  most croquette breading but not all). That was the agent's judgement quietly
  overriding [ADR 0025], whose rule is that the burden falls on *not* tagging.
  🔑 **He overturned it, and the lesson is about where the override happened:**
  the reasoning was sound and it still wasn't the agent's call to make. An
  accepted ADR is not a default to be weighed against a good argument — it is
  the answer until it is superseded in writing.
- **And he redirected the question**: *"add egg, and fix the real problem."* The
  real problem is 37n — the corpus disagrees with itself, and the disagreement
  tracks which session read which menu rather than anything about the food.
  Seatoun's sausages are tagged for gluten and Tawa's identical ones are not.
  🔑 **Inconsistency does not fail safe; it fails quiet.** A reader who finds one
  sausage flagged and an identical one not learns that an absent tag means
  nothing — and every correct tag in the corpus stops working with it.

**Next session, by his pick:** the ranking rebuild (ADR 0068) and the remaining
14 venue menus. The recipe-page pass and the timer alarm stay queued.


## 2026-08-16 14:00 UTC — the ranking that had never run, and a valve nobody could read

An orchestration session that took one item off the queue — 37g, the ADR 0068
ranking rebuild, left deliberately unbuilt by the previous session — and found
that the thing standing in the way was not the code.

### The finding that reshaped the work

[ADR 0068] ratified the design and left item 4 for a fresh session: ask for the
device location on load, first visit, unexplained. Its Consequences section
named the risk itself — an unprompted geolocation prompt is the classic route
to a **permanent** denial — and named the remedy: prime it *"if the deny rate
looks bad in use"*.

**That trigger cannot fire.** Faves ships no analytics, no telemetry, no beacon
and no backend; `grep` over `site/js/` finds exactly two `fetch` calls, both in
`data.js`, both loading our own menu JSON. There is no deny rate and there is no
way to acquire one without building the tracking surface the whole app is shaped
to avoid. So the "revisit" was not deferred — it was decided, permanently, in
the direction of the on-load prompt, by a sentence that reads like a plan.

🔑 **A deferred decision whose trigger nothing can observe is not deferred, it
is taken — and taken quietly, which is the part that makes it a problem.** This
is the decorative-guard fault in a new place: not a check that always fires or
never fires, but a *promise to check later* against evidence that does not
exist. Prose costs nothing to write, and unlike a `#!#` marker it does not even
show up in a grep.

**A second gap sat beside it.** `navigator.permissions` appeared nowhere in
`site/`, so "never asked" and "blocked forever" presented identically to the
code — no origin, no distance, nothing on screen. Nobody could tell an app that
had not asked from one that could never ask again, the owner on his own phone
included.

Both were put to the owner with their costs stated rather than resolved quietly,
and both were ruled: **prime the ask, and build the block-recovery.** That is
[ADR 0069], superseding **item 4 only** of 0068; items 1–3 stand untouched.

### Shipped

- **One ranking, no sort control** (37g). `rankVenues`' two branches are one
  comparator: pinned → orderable → reachable → **availability → distance band →
  favourite → exact distance** → curated. The `<select>`, its group, its heading,
  its note and four `body.filters-inline` CSS rules are gone.
- **The location ask is a button, not an ambush** ([ADR 0069]). `permissions.query`
  on load — which prompts nobody — then: `granted` uses the grant silently,
  `prompt` offers `#geo-ask`, `denied` says so in place and where to undo it. A
  revoke mid-visit now also *takes the origin back*, rather than quietly ranking
  by coordinates someone just told the browser to stop us using.
- **37j** — "Everywhere" → "Any service", and the te reo re-glossed with it.

### 🔑 The headline stays the finding, not the feature

**His algorithm was built and had never once run.** The default branch of
`rankVenues` *is* availability → distance → favourite, and has been since
2026-07-08 — but `origin` was written in exactly one place, the sort control's
own handler, so the distance term was `Infinity` for every venue on every render
for the project's entire history. The feature shipped today is mostly the act of
connecting a wire.

### 🔎 A bug found by reading, that the rebuild would have made visible

`menu.js` reads the remembered origin (`recallOrigin`, sessionStorage); `app.js`
only ever *wrote* it. So home → a menu page → back left the menu screen ordering
branches by your location and the home list starting from `null` again. It was
invisible precisely because distance did nothing in the default order — the
moment distance counts, the same navigation silently changes the ranking. Fixed
by seeding `state.origin` at init, which also spares the granted path a visible
reorder on every load.

🔑 **The general shape: a dormant feature hides the bugs in everything wired to
it.** Nothing was wrong with `menu.js`, and nothing was wrong with `app.js` in
isolation. The defect lived in the disagreement between them, and it could only
be *seen* once the dormant half started running.

### 🔎 What the sub-agent found that the brief got wrong

Two corrections, both worth more than the code they changed.

1. **The Infinity/NaN defect flagged in the brief as "most likely" does not
   exist.** Subtraction was reintroduced on the buckets and all 39 tests still
   passed: `Infinity - Infinity` is `NaN`, `NaN` is falsy, so a `||` comparator
   chain falls through to the next key — which is exactly what a tie should do.
   The safety is a property of the *chain*, not of the key. `cmp()` was kept
   anyway, but the comment now says why rather than claiming a corruption nobody
   could reproduce. 🔑 **An orchestrator's confident warning is a hypothesis; it
   earns its comment only after someone tries to reproduce it.**
2. **The brief's worked example was arithmetically wrong.** *"Two open venues
   100 m and 300 m apart (same 400 m band)"* — under `Math.round(dist / 0.4)`,
   0.1 km is band 0 and 0.3 km is band 1. Bucketing partitions space at **fixed
   edges**; it does not measure the gap *between* two venues, so any two venues
   inside 400 m can straddle a boundary. 🚩 The error is conservative in the safe
   direction — bucketing can only *under*-apply the heart, never lift a favourite
   above something meaningfully nearer, which is the defect ADR 0068 existed to
   prevent — and a tolerance ("within 400 m *of each other*") cannot replace it,
   because proximity is not transitive and so is not a sort key at all. The test
   file pins the boundary case as a known property.

### 🔑 How "unchanged" was established, and why reading the diff was not enough

The no-origin path is what a refused permission gets, so a regression there
would land on exactly the people who said no. The old `ranking.js` was extracted
from `HEAD` and run head-to-head against the new one over **4000 randomised
lists** — mixed stubs, recipes, coordless and coordful venues, favourites, every
`favBoostKm` and `farKm` value — with **0 mismatches**. The guards were then
verified by breaking them: four mutations, each caught (distance leading
availability, the favourite tiebreak removed, raw distance for the bucket, the
10 km credit reinstated).

### Working alongside a peer session

A second orchestration session ran throughout, in the primary checkout, on the
recipe pass and the allergen sweep. Lanes were negotiated by message before
either side wrote. Two things came out of it worth keeping:

- **It corrected me, and it was right.** I claimed we would not contend on
  `SHELL_VERSION` because its allergen work was data-only; its recipe lane is a
  JS+CSS render change and bumps the same constant. Being wrong in the open cost
  one message and prevented the collision the previous session actually had.
- **The same fault, found independently, in a worse place.** Its recon found
  `tools/tag_allergens.py` declines to write on **6 of 55** venue files — every
  one carrying `addOnGroups`, because `patch_tags()` counts *every* `"tags"`
  array in the raw file including each add-on option's — and reports the decline
  as `SKIPPED`, exit 0. That is the third instance of the pattern found between
  2026-08-11 and 2026-08-17, on the one tool whose silence is a safety
  question. It is writing [ADR 0072] for
  the family, with the test that unifies them: **a guard is decorative when its
  output is the same whether or not the thing it guards is broken.** 0069 is a
  fifth face of it and links there.

## 2026-08-16 14:42 UTC — seven menus, a guard nobody had written, and a count that lied twice

An orchestration session (wt: `faves-menus`, branch `menus-14`) running two
lanes the owner picked: **content & data**, and **ordering & customisation**.
Twelve sub-agents, four live peer sessions, everything landed on `main`.

### What it took, and how the queue was cleared to take it

The remaining first-party venue menus were **claimed by a session that no longer
existed**. The claim was released on evidence rather than elapsed time, and the
test is worth reusing: **no worktree AND no branch (local or remote) AND a close
record.** Any one alone proves nothing — a live session between commits has a
clean tree, and a worktree can be recreated. `faves-f0` independently found two
more orphaned claims from the same 11:22 UTC cohort; they are still open.

### Shipped

- **Eight venues from stub to menu-complete: 983 dishes.** The Catch Sushi Bar
  (87), Satay Kingdom (53), Charley Noble (125), Regal Chinese (264), Rock Yard
  Vietnamese (58), Pizza Pomodoro (83), Gong Cha (131), Pizza Hut (133). Every
  price from the venue's own site or its own menu PDF; no delivery app touched.
  🎯 **Pizza Hut's allergen PDF grades P (present) vs T (trace), and only P was
  tagged.** [ADR 0025] says "when unsure, tag" — but this is not uncertainty,
  it is the venue's own graded signal, and `T` is near-universal across the
  pizza line, so collapsing it would fire nut/sesame/shellfish warnings on every
  pizza. The vocabulary has no "may contain traces" tier. Surfaced, not settled;
  it will recur on every PDF-sourced venue.
- **Theme 14c — a free-text note per order line** ([ADR 0073]), 938 tests
  green, plus `tools/note_check.mjs`, the seventh headless check.
- **`tools/check_fallback.py`** — gates the no-JS `<ul>` against `index.json`,
  wired into CI and the verify list.

### 🔎 The count that lied twice, in opposite directions

ROADMAP recorded the no-JS fallback as **"35 venues behind"** `index.json`.
It was never behind: all 55 were listed, in order, names matching. The 35 came
from counting `restaurant.html?id=` hrefs — and **a stub is deliberately
rendered without a link**, so the count measured *venues with a menu*, not
*venues in the list*. This session reproduced the 35 exactly before noticing,
which is the point: it is the same trap the roadmap warns about two items
earlier, and knowing about the trap did not prevent falling into it.

🚩 **And underneath the wrong number was a real defect, worse than a stale
list.** Ten venues had **finished menus rendered as unreachable "Menu coming
soon" cards** — four of them landed the previous day. A reader whose JavaScript
had not run was told those menus did not exist. That is a **status** drift, and
no membership count could ever see it. 🔑 **So the gate asserts the link rule,
not just membership** — encoding *why* a card has no href is what stops the next
reader re-measuring it wrong. It caught four more of this session's own venues
before they shipped.

### 🔎 "Publishes a website" is not "publishes a menu" — and it halves an item

The roadmap's `stub` breakdown reads *18 publish a website (a fetchable
first-party source)*. That parenthetical is false. Of the 14 remaining,
**four publish a site with no menu on it anywhere**: New Chapter (its own menu
page says "Coming Soon", and the template still carries its own `<!-- TODO -->`),
Kaffee Eis ("we make more than 45 flavours", naming none), Babaili Malatang
(8 pages, no menu in its own nav), Caffiend (Facebook, menu tab login-gated).
Each was checked exhaustively — sitemap, soft-404 detection by MD5, platform
JSON endpoints, guessed paths, own social accounts.

🔑 **The `stub` count splits three ways, not two: publishes nothing · publishes
a site but no menu · publishes a menu.** The middle group is invisible to the
one-line reproducer the roadmap offers, which is why it was miscounted.

### 🔎 Three "blocked" findings refuted by re-testing them

- **Subway** — recorded hard-blocked on a click-only widget. Its menu pages are
  server-rendered and readable, and it publishes a first-party **NZ Allergen
  Web Guide (May 2026)**. But it publishes **no price anywhere**, first-party,
  by design (franchise pricing varies by store) — so every price is legitimately
  `null`, which is a brief-compliant record rather than a blocker.
- **Pizza Hut** — its 9.8 KB homepage really is a Nuxt shell, and one level in,
  `/order/<category>/delivery` serves a complete price-bearing first-party menu.
- **The Victoria Tavern** — HTTP 000 is **not a dead domain**. It is a live
  server with a self-signed Plesk placeholder certificate issued 2026-08-03,
  and its menu PDFs are current (mains dated 2025-11-24).

🔑 **A prior session's "blocked" is a hypothesis, not a fact.** Three of four
survived only until someone re-tested them.

### 🚩 The allergen sweep declines silently — and there is a SECOND trigger

37n (held elsewhere) had diagnosed `tag_allergens.py` skipping 6 of 55 files
because it counts every `"tags"` array including add-on options, so the count
comes out **too HIGH**. This session hit the same silent `SKIPPED` + exit 0 on a
file with **no `addOnGroups` at all**: 6 of `the-catch-sushi-bar`'s 87 items had
**no `tags` key**, so the count came out **too LOW** — 81 for 87.

🔑 **And the failure is CORRELATED WITH THE NEED.** The two tags the tool
identified and then failed to write were on the two items with no `tags` key.
An item with no tags array is simultaneously the most likely to be missing a tag
and the thing that makes the whole file unpatchable. **The tool declines hardest
exactly where it matters most, and reports success.** Proved by removing the
cause: adding `"tags": []` to those six items made the unchanged tool apply both
tags unaided. Relayed to 37n, which adopted it and is folding it into [ADR 0072].

### 🚩 The tag vocabulary has a hole three agents found independently

**There is no `contains-fish`.** Rock Yard names fish sauce in a dozen dishes
and prints its own badge literally as "Fish"; Pizza Pomodoro has anchovy on two
pizzas. The closed set has `contains-shellfish` and nothing for finned fish —
one of the major allergens. Also missing: `vg-option` and `df-option` (Gong Cha
offers a free soy/oat swap on 15 drinks; Rock Yard prints "Vegan Optional").
🎯 **Owner decision — recorded, not acted on.**

### 🚩 A venue's own labels caught lying, twice

Rock Yard's per-item badges **omit Peanuts on two curries** whose own section
note reads *"All curries contain peanuts and cannot be removed"*, and badge a
dipping sauce **Vegan** while its own description says it is made from fish
sauce. The section note was applied by hand to every dish in that section —
exactly the miss `tag_allergens.py` cannot see, since it reads item text only.

### 🔑 Cross-listing has no shape in the model, and it is common

Eleven explicit `dishId`s were needed across three venues, and **the price is
what told the two causes apart**:

- **Genuinely different dishes** — Regal's Deep Fried Squid is $9 at yum cha and
  $10 à la carte; Rock Yard's Hue Spicy Beef is $17 at lunch and $29 at dinner;
  The Catch's Teriyaki Chicken is $31.10 as a main and $23.00 as a donburi.
  This is the case [ADR 0051] exists for.
- **One dish the venue cross-lists** at one price under two headings — Regal's
  Spicy Salt Tofu, Rock Yard's five Small Bites, Satay Kingdom's Char Kueh Teaw.

The second has no representation: the rows are kept because the venue prints
two, but nothing says they are one dish, so a heart on one does not show on the
other. Evidence for Theme 28 and Theme 30.

### 🔎 A false positive worth keeping

`validate.py` warned that The Catch's Donburi Teriyaki Chicken *"lacks
contains-sesame, which another row of the same name carries"*. It is **not** an
inconsistency: the Mains version is $31.10 *"served with Japanese salad"* and the
sesame is in the dressing; the Donburi is a $23.00 rice bowl with no salad.
**Same name, different accompaniments, correctly different tags.** A same-name
comparison cannot see that — relayed to 37n, which has made a same-venue
disagreement across *different prices* weak evidence in its report design.

Separately, `tag_allergens.py`'s "wheat bakery item" rule fires on the token
**`slices`** and tagged two Regal dishes for *"Black Fungus Slices"*. Fail-safe,
so the tags stayed, but the reason is wrong — an EXCLUDE candidate.

### 🔎 What the sub-agents found that the brief got wrong

- **Oyster sauce → shellfish was missing from the brief's class table.** An
  agent challenged it. Audited corpus-wide: `tag_allergens.py` had already
  tagged **15 of 15** oyster-sauce dishes. The brief was wrong, the tool was
  right, and the layering caught it.
- **`setNote(venueId, id, sel, note)` is not implementable.** Because the note
  is part of line identity, the *old* note is the only thing that can locate the
  line — so the specified signature can address the un-noted line and nothing
  else. Shipped as `setNote(…, from, to)`.
- **The ± stepper operated the wrong line.** With "Eggs on Toast" and "Eggs on
  Toast — no tomato" both in the sheet, minus on the noted line decremented the
  plain one, and the two buttons were indistinguishable to a screen reader. No
  unit test can see which line the DOM wired a button to; `note_check.mjs` can.

### 🔑 The codec's safety argument does not cover a removal

`share-codec.js` justifies appending a slot rather than bumping `CODEC_VERSION`
with a *safety* claim: *"dropping an add-on can never put something extra on a
plate."* **That does not transfer to a note.** An add-on is an addition; a note
is characteristically a *removal*, so dropping one leaves the unwanted thing
**on** the plate — the opposite degradation direction, and the unsafe one.
Carried anyway, because not carrying it fails for everyone every time while
carrying it fails only against a decoder older than the slot. [ADR 0073].

### 🚩 The absorbed version bump, caught live

Committed SHELL `.88`; main independently moved to `.88` during the rebase. A
rebase does not *conflict* on that, it **absorbs** it — the constant reads
exactly the number intended and is unbumped relative to `origin/main`, so the
install step skips the cache and installed phones keep the old shell with CI
green. `check_versions.py --range origin/main..HEAD` caught it; nothing else
would. Re-picked to `.89`. Spent this session: **SHELL `.89`, DATA `.36`.**

### Working alongside four peer sessions

Broadcasting the file set on open, not just the claim, paid for itself several
times. It surfaced that **`cook.js`/`cook-ui.js` were double-held** by two peers
who did not know about each other — 36d's claim block asserted file-disjointness
in writing, and that sentence went false within the hour when ADR 0070 landed.
They resolved it directly. It also caught a **SHELL `.84` collision** between two
peers, and brought back three owner rulings this session would otherwise never
have seen (dining style folds into `vibe`; `detailsVerified` ageing at 6 months
for hours and 24 for phone/address; a **named** third-party source is acceptable
for opening hours). 🔑 **Rulings do not cross between sessions by themselves.**

### Left deliberately

- **The Victoria Tavern.** Transcribable, but only over HTTPS with certificate
  verification disabled. That is a security judgement and a provenance one —
  we cannot honestly write `official-site` for a site we could not verify *is*
  the official site. 🎯 Owner's call, and the venue should probably be told.
- **Subway.** Names and a first-party allergen guide are reachable; no price is
  published anywhere, so every price would be `null`. 🎯 Owner's call on whether
  a price-less record earns its place in the payload.
- **Caffiend, New Chapter, Kaffee Eis, Babaili.** Need a photo or a visit. No
  further web session will find what was never published.
- **Theme 14b (the add-on content sweep).** Deliberately NOT taken: it would add
  `addOnGroups` across the corpus, and every record carrying them is one
  `tag_allergens.py` silently refuses to write to. Doing it before 37n's fix
  lands would multiply the silent-decline surface sevenfold.

## 2026-08-16 15:40 UTC — the recipe page, About's sediment, and a decline that concentrated on the need

Orchestration session on the primary checkout, three worktrees, five agents, and
five peer sessions live in the same repo the whole time. Delivered: the
recipe-page pass (37c/37d/37e/37l/37m), the About→Settings rehoming (23a/23c),
and half of 37n — its tooling, not its data sweep. Three ADRs written (0070,
0072, plus a rewrite of 0072 as evidence arrived), two new tools, one new
browser check.

### 🔑 Ask what the identity IS, and the migration question often stops existing

ROADMAP 37l carried a trap in writing: `ingredients` entries becoming
`{component, items[]}` groups would change the hashed line text, so every tick on
the four affected recipes would silently detach. The item offered two answers —
hash the component with the line, or accept the loss knowingly.

Neither was needed, because the question was never a compatibility question.
**Sticky Date Pudding lists `"60g butter"` in the pudding and `"Sauce: 60g
butter"` in the sauce.** Key on the text alone and those two lines collide on one
hash: tick the butter for the sauce, and the pudding's butter ticks itself. So
the component is part of the line's identity on the merits — ADR 0067's rule that
*"two lines with identical text share one tick"* is right, and these two lines are
not identical. Keying on `"<component>: <text>"` then happens to reproduce the
string the corpus already held, byte for byte: **0 mismatches across all 24
recipes**, checked programmatically rather than reasoned about.

The generalisable part is the order of the questions. The migration problem
dissolved *because* the correctness question was answered first. Asked the other
way round — "how do we preserve the old hashes?" — the answer would have been a
compatibility shim over a key that was still wrong.

### 🔎 A duplication claim is a measurement, not a reading

23a said About's **Prices** block duplicated the menu page's ⓘ and could be
deleted. The agent checked it against the corpus instead of accepting it: the ⓘ
names the currency **in its blue tone only**, and applying `refreshCaveat`'s own
rules, **39 of 55 venues sit in the amber tone**. For most of the corpus About
was the *sole* statement of currency. Deleting as written would have destroyed a
fact on 71% of venues.

It was resolved by closing the amber gap first and only then deleting About's
copy, so the fact is now stated in more places than before. 🎯 That leaves
**[ADR 0037] §3 needing supersession** — it decided currency is stated *twice*,
in the ⓘ and in About; the build implements *once, where it is asked*.
`ARCHITECTURE.md` is amended, the ADR is not, because an accepted record is
superseded and never edited.

### 🔑 A silent decline that concentrated on exactly the records it was protecting

The tagger's `addOnGroups` bug was diagnosed here as *6 of 55 files, caused by
add-on options inflating a positional `"tags"` count*. A peer session measured
the corpus and returned something reasoning had not reached: a **seventh** file
with no add-ons at all, breaking the count the *other* way — six of its 87 items
carry no `tags` key.

And then the part that changes what the defect is. The two tags the tool had
identified on that file and failed to write were **both on items with no `tags`
key**. An item with no tags array is simultaneously the most likely to be missing
a tag and the thing that renders the whole file unpatchable. **The decline is not
spread across the corpus; it concentrates on precisely the records the tool
exists to protect.** A fix aimed only at the first cause would have left the
seventh file broken and been reported as done.

🔑 The method lesson: a diagnosis that explains every instance you looked at is
not thereby the cause. Measurement found a case the mechanism could not have
produced, and the mechanism was only half of it.

### ADR 0072 — a guard is decorative when its verdict does not depend on the thing it guards

Ten instances had accumulated across two repos with nothing to point at but
CLAUDE.md prose and session logs, so every session rediscovered the pattern.
Three sessions hit fresh instances **on the same day, in parallel, without
knowing about each other** — which is what finally made it a record rather than a
note. Four of its ten faces were donated by peers during the session.

The face that undercuts the other nine came last and is the biggest finding of
the day: **`.github/workflows/ci.yml` runs none of the eight (now nine)
headless-browser checks.** `node --test` and the Python gates run; every guard in
this repo written *because* unit tests missed something real runs only when a
human types it. That is the whole answer to how `sync_check.mjs` stayed dead
through an entire refactor. **The cheap guards that catch the least are
automated; the expensive guards that catch the most are on the honour system.**
Roadmapped, with the honest complication that they need Chrome in the runner, are
slow, and are demonstrably flaky under parallel load.

### 🚩 What parallel work actually cost, and what actually caught it

Five faves sessions ran concurrently. Every one of the following was found by a
*peer*, not by the session that caused it:

- **`cook.js`/`cook-ui.js` were double-held** by two sessions each holding a
  correct map of its own files. Neither map was wrong. A third session noticed
  we had both answered the same broadcast. 🔑 **A file map is a claim about your
  own writes; a collision is a fact about somebody else's** — no amount of care
  about your own half can surface it. Measuring rather than assuming shrank it to
  nothing: `cook.js` needed **no** change at all, because its `ingredientTerms`
  already stripped a leading `"Label: "`.
- **The shared primary checkout was left mid-rebase** by two sessions running
  `pull --rebase` cycles in one working directory, with a third session's commits
  half-applied. `git push` printed success while pushing nothing. We have a
  careful protocol for *files* and none for the *repository state* of the shared
  checkout — and a rebase in progress produces no dirty-file signal that reads as
  "stop".
- **An absorbed version bump.** A session bumped `SHELL_VERSION` to `.88` while
  `main` independently moved to `.88`. A rebase does not conflict on that, it
  **absorbs** it — the constant then reads exactly the number its author intended
  and is unbumped relative to `origin/main`, so the service worker skips the
  shell cache with CI green. Only `check_versions.py --range origin/main..HEAD`
  caught it.
- **A forward link to an unlanded ADR, and a correct harvest, each hard-blocked
  every commit in the repo in turn** — mine stopped a peer minutes after theirs
  stopped me. Neither was a mistake: a forward reference is fine, and harvesting
  delivered items to the archive is exactly right. 🔑 **The defect appeared in
  the gap between two correct decisions taken by different sessions, and in three
  of four instances today the gate that fired was owned by neither party and
  blocked a third.** That is what makes it concurrency rather than code review.
  🚩 **And we both misdiagnosed the mechanism, identically.** Both sessions
  concluded `pathscan` had been promoted from warn-only to enforced, because a
  `✗ pathscan` line sat above a failed commit. **It had not been.** The blocker
  was `sizescan` both times, and its `BLOCKED by:` line was thirty lines further
  down the same output. One of us renumbered an ADR that never needed
  renumbering because of it. The ✗ that catches the eye is not necessarily the ✗
  that stopped you.
- **`0073` was claimed twice** and `0070`/`0071` had to be traded mid-session.

What worked was **the broadcast**: announcing holdings in public and answering
other people's announcements. Every collision above was found that way and none
by a file map.

### 🚩 Honest residue

- **`cook_check.mjs` is flaky, and the flakiness defeats the rule we rely on.**
  Two runs here aborted on `Runtime.evaluate` and `Input.dispatchKeyEvent`
  timeouts while a third passed 60/60; a peer session got 75/0, **73/2**, 75/0,
  75/0 across four runs of one unchanged commit. 🔑 CLAUDE.md's discipline is
  *"a wall of PASS followed by an error is not a pass — read the summary line"*.
  Flakiness beats that **specifically**, because the summary line is present and
  says FAILED, and the right response to a flake is indistinguishable from the
  wrong response to a real regression: run it again. It goes green. That is the
  trained behaviour. ⚠️ Neither session captured the failing assertions.
- **37n's sweep is not done.** The report exists and names 7 class/allergen
  splits over 58 rows; resolving them is a human pass against ADR 0025, and four
  owner calls are owed first (below).
- **Two live `tag_allergens.py` rule defects, deliberately unfixed** because a
  rules change touches every venue and belongs with the sweep: `\bmuffins?\b`
  cannot match "McMuffin" (no word boundary between "c" and "M"), so both
  McDonald's McMuffins are unreachable; and the "wheat bakery item" rule fires on
  `slices`, which tagged *"Black Fungus Slices"* as gluten — fail-safe, wrong
  reason, an EXCLUDE candidate.
- **About's close restores focus to `<body>`**, not its opener, because the
  overflow menu that opened it has already closed. Pre-existing; worth its own
  item.

### ✅ Owner rulings taken at the close

- **`contains-fish`, `vg-option` and `df-option` all adopted**, landing **with**
  the 37n sweep rather than beside it — the vocabulary is closed in three files
  that move together, and doing tag and sweep separately walks 55 venues twice.
- **The trace tier: app tags unchanged, and it lives in `site/data/`.** Only `P`
  becomes a `contains-*` tag; the payload gains the ability to carry `T` rather
  than discarding it. 🔑 **He overruled the premise a peer put to him**, which is
  the part worth keeping: *"In ruling 47 I said it only holds data the screen
  shows, **or may with future features**."* ADR 0047's Context says exactly that
  — but its own **Consequences** and `CLAUDE.md`'s restatement both state the
  rule *without* the future clause. **Two of the three places a builder looks are
  narrower than the decision**, which is why two sessions read it strictly on the
  same day. 🎯 Wants a superseding note; raised, not taken.
- **`crumbed → contains-egg` splits into two classes** — house-crumbed
  egg-washes, commercial frozen goods often do not.
- **The currency record**: he confirmed the shipped behaviour is intended —
  About names no currency, the venue page does. Written up as [ADR 0075],
  superseding only the *second home* of ADR 0037 §3. 🚩 **A fact-check worth
  keeping:** the agent's report cited "ADR 0037 §3" while the file is named
  `0037-confidence-reads-both-ways.md`, which reads like an unrelated record. It
  was right — verified by opening it before publishing, because superseding the
  wrong ADR is very hard to find later. **Check a citation by opening it, not by
  recognising the number.**

### 🎯 Owner calls still owed

2. **The tier a note-derived allergen tag carries.** Kept as the firing rule's
   own tier, so "sesame bun" lands STATED. The alternative — every note-derived
   tag is DERIVED, because "this note covers this dish" is itself an inference —
   is defensible and changes a published audit number.
3. **Does *"dairy free cheese available"* tag, or only report?** It implies the
   default cheese is dairy, and under ADR 0025's one-way rule tagging is
   fail-safe. Stopped short because the *dish* it attaches to is unknowable from
   the note. One line either way.
5. **Should add-on options appear in the disagreement report?** They are not
   dishes and have no `dishId`. Including them found one real gap.
## 2026-08-16 15:08 UTC — the alarm, a guard that had been dead for a refactor, and four collisions between correct decisions

Orchestration session on the primary checkout, one worktree (`faves-cook`),
three agents, and **five peer sessions live in the same repo the whole time**.
Delivered: **36d** the cook-mode timer's alarm (ADR 0071), **36g** cook-mode
ticks out of the backup export and the sync blob (ADR 0074), and the repair of
`tools/sync_check.mjs`, which had been proving nothing since `e745923`. Merged
as `42b1a7a`. Three roadmap items closed on measurement, three new ones opened.

⏱️ **Note on the stamp**: this entry is stamped from `date -u` per CLAUDE.md.
The entry above it carries **15:40 UTC**, which was in the future when this was
written at 15:08. Flagged, not edited — but "newest last" cannot be trusted to
mean "latest" while entries are stamped from different clocks.

### 🎯 The work I could not take, and why that is the interesting part

The owner asked for cook mode and recipes first. **Almost all of it was claimed
within two minutes of this session starting** — 37c/d/e/j/l/m by faves-recipe,
37g by faves-ranking, 37n by faves-allergens. His standing instruction is that a
live claim overrides even a direct instruction to take that item, so the
recipe-page pass was left alone.

🔑 **The item I *chose* not to claim taught more than the ones I did.** 36a
(getting the estimated per-step minutes into the payload) was unclaimed,
owner-ruled and ready. I left it, because it rewrites `steps` inside
`cook-at-home.json` — the same records, adjacent keys, that 37l was rewriting
`ingredients` in, and it lands the ADR 0067 tick-rehash trap **twice, from two
sessions, in one file**. A merge conflict there is the *good* outcome; the bad
one is a clean textual merge that silently detaches every tick.
**File-disjointness is the unit of parallel safety, not item-disjointness.**

### 🔎 Three roadmap items were stale, and each had expired in a different silence

1. **"Whole-repo scanner runs are inflated by every live worktree"** — measured
   with five worktrees live: `leakscan .` clean (the item predicts 101 findings
   and a blocked commit), `plainscan .` 652 with no doubling. Worktrees moved to
   `~/worktrees/`, **outside** the tree, so `.` no longer holds a second
   checkout. The item's premise was *a convention in a neighbouring repo* that it
   never named as a premise. Closed on evidence, not on the upstream fix it was
   waiting for.
2. **"`sync_check.mjs` aborts before its last three assertions"** — it aborts
   before its **first**, with zero PASS lines, because `e745923` folded Sync into
   "Your data" and the check still clicked the old row. 🛑 **The documented
   symptom in CLAUDE.md misled in the dangerous direction**: it told you to watch
   for *"a wall of PASS lines followed by a harness error"*, so a reader matching
   the real output concludes they are looking at something else.
3. **The overflow-menu race that item described was never a product hazard.**
   Both causes were the check's own: `scrollTo(0, 0)` obeys
   `scroll-behavior: smooth` and returned mid-animation — which fully explains
   the old trace's *"scrollY:879 then scrollY:0"* as **one unfinished scroll, not
   a second scroller** — and `initContactBar()`'s observer dropped
   `body.contact-bar-open` a frame later, so the click's coordinates went stale
   between rect read and dispatch. **Nothing in `site/js/` changed to make it
   pass.** Two sessions had that hazard written down as real, and I claimed the
   item partly on its strength. ⚠️ Honest residue: the old trace's third
   observation (`aria-expanded` reporting two cycles from one click) never
   reproduced — unexplained, not disproved.

### 🛑 The structural finding: CI runs none of the browser checks

`.github/workflows/ci.yml` runs `node --test` and the Python gates. It does not
run `sync_check`, `cook_check`, `device_check`, `boot_check`, `addon_check`,
`branch_check`, `to_top_check` or `filter_row_check` — **eight** guards, every
one written *because* unit tests had already missed something real. They run only
when a person types them. That is the whole answer to how `sync_check` stayed
dead through a refactor: nothing was calling it.
🔑 **The cheap guards that catch the least are automated; the expensive guards
that catch the most are on the honour system.** Now a 🛑 note in CLAUDE.md's
verify list and a roadmap item — deliberately *not* fixed by wiring them into
CI, because several are timing-sensitive and a flaky required check trains people
to re-run until green.

⚠️ **Which is not hypothetical — `cook_check` did it to me the same hour.** Four
completed runs of one commit: 75/0, **73/2**, 75/0, 75/0. I re-ran and it went
green, which is precisely the trained behaviour. Recorded as its own item rather
than enjoyed. The two failing assertions were **not captured** — a real gap in
that evidence.

### 🔑 An assertion nobody has watched fail is not yet a guard

The 36d agent broke each new `cook_check` assertion on purpose: inverting the
15-minute guard failed exactly the two notification assertions; dropping the
vibrate call failed exactly the five vibration ones and left the tone green.
**And one of its own new assertions failed to fail** — the ring-once guard could
not bite, because the tick that rings the last timer also stops the interval. It
was decorative, and it was written *in the same session that was hunting
decorative guards elsewhere*. Replaced with a two-timer scenario.

Same shape one level down in 36g: the fix the roadmap specified in as many words
— add `faves.checklist.v1` to `EXCLUDED` — **would have excluded nothing at all
while reading as complete**, because `profileScopedStorage()` makes the real key
`faves.p.<id>.checklist.v1`. Three of four new tests fail against that version.
The roadmap bullet had already announced itself as *"wrong twice"* and was wrong
a third time. What caught it was writing the test first and watching it fail.

### 🚩 Four collisions between two correct decisions — the class our doctrine cannot name

Named jointly with the peer sessions and carried into their **ADR 0072**:
**the defect lives in the gap between two correct decisions taken by different
sessions, and the party it stops is usually neither of them.**

| # | Decision A | Decision B | Who it stopped |
|---|---|---|---|
| 1 | my 36d claim asserted file-disjointness | ADR 0070 pulled `cook-ui.js` into 37l | both, silently |
| 2 | I reserved SHELL `.84` | faves-ranking spent `.84` and pushed | a rebase would have *absorbed* the bump |
| 3 | a forward `[ADR 0073]` link (fine under warn-only `pathscan`) | `pathscan` promoted to enforced | **every session's commits** |
| 4 | a correct harvest of delivered items | `sizescan` harvest-integrity is enforced | **every session's commits** |

🔑 **Two sessions each holding a correct map of their own files still had a
collision neither could see.** A file map is a claim about your own writes; a
collision is a fact about somebody else's. What found #1 was a *third* session
noticing two answers to one broadcast. The broadcast is the mechanism that
works, not the map.
🔑 **And #3 sharpened it**: renumbering 0073→0074 felt like the repair and
changed nothing, because **it was never the number that was wrong — it was the
reference existing before the referent.** A guard firing on the right condition
can still send you to the wrong repair when two faults land on one line.
🎯 **The practical rule, owed upstream:** a change that makes the repo's *gates*
stricter is a change to everyone's ability to commit. Announce it the way we
announce a `SHELL_VERSION`.

### 🛑 An incident in the shared checkout, and a `git push` that lied

A `git pull --rebase --autostash` in the primary checkout landed **mid-rebase
replaying a peer's four commits**, stopped on a conflict, and swept my
uncommitted roadmap write-up into the autostash. **`git push` then reported
success while pushing nothing**, because `main` was mid-rebase. Recovery: verify
every peer commit was already reachable from `origin/main` **before** touching
anything; back the autostash out to a file (`git show <sha>:docs/ROADMAP.md`)
*before* aborting; then `rebase --abort`. Nothing lost.
🚩 **We have a careful protocol for shared *files* and none for the shared
checkout's *repository state*.** A rebase in progress produces no `[~]` claim, no
dirty-file signal, and nothing in `git status --short` that reads as "stop".

### 🚩 My own orchestration fault, self-reported by the agent

I put two agents in **one** worktree on disjoint files. One ran `git add -A` and
**swallowed 101 lines of the other's in-progress `sync_check.mjs` work** into its
commit. Nothing was lost and the tree stayed consistent, but the attribution in
`fdd6a99` is wrong. **Disjoint file ownership does not make a shared worktree
safe, because `git add -A` is not file-scoped** — either give each agent its own
worktree, or forbid `-A` in the brief. I did neither.

### Left deliberately

**36a's payload/render** (see above — 37l's file). **The three owner questions on
36d**: a notification fires even when you are looking at the page; there is no
visible on-screen cue when a timer ends; `cook.notifyBlocked` has no te reo
string. All three want `app.css`/`reo.js`, held by peers all session.

### 🔎 Addendum — the flaky check had a cause, and a clean bisect got it wrong

After close, the 36d agent retracted its own diagnosis of a `cook_check` stall
and ran a five-arm bisect **plus a control on the tree before any of its work**.
Every arm stalled at the identical point, control included. It correctly
concluded *"not my code"* — then overreached to *"`cook_check` cannot complete on
this machine"*.

🔑 **It could not, because the confound was still running underneath every arm.**
Six orphaned headless-Chrome processes, leaked from its own killed runs, had
pushed load past **100**; the same agent cleaned them up only afterwards.
Re-running once they were gone, on a quiet machine: **`OK — 75 passed, 0
failed`** — including the two-timer assertion it had reported as unverifiable.

- 🛑 **A killed browser check leaks its Chrome.** Nothing reaps it. At the
  resulting load the check does not fail, it **stalls with no summary line** —
  manufacturing, from no code change at all, the exact trap CLAUDE.md documents
  for `sync_check`. `pgrep -f faves-.*-check` finds them.
- 🔑 **A bisect whose every arm carries the same confound returns a uniform,
  confident, meaningless result — and its *control* is the thing that makes it
  look rigorous.** The control did real work here (it cleared the code) and the
  overreach rode on the credibility the control earned.
- ✅ **What settled it was the cheapest possible test**: remove the confound, run
  it once. Not more bisecting.
⚠️ Still unexplained: the 73/2 run during integration, at load 5.9–15.8, well
below the orphan-driven level. Its failing assertions were not captured.

### Owner rulings taken at the close (2026-08-16)

Four questions were put to him rather than resolved quietly. All four changed
something, and one of them changed the *shape* of the question.

- 🎯 **`contains-fish` → ADD IT, and land it WITH 37n.** Asked with the cost
  stated (schema change + corpus sweep + a tagger rule). His reasoning: it is a
  major declarable allergen we currently warn about **zero** times, and sweeping
  the corpus once beats sweeping it twice. The dishes already found and left
  untagged are listed on the roadmap item so nothing is re-derived.
- 🎯 **Trace allergens → he split the question.** Asked as "tag `T` or not";
  he answered *"keep tagging only P as you recommended, but extend the data
  model to enable us to capture both present and trace allergens at a data
  level."* 🔑 **The displayed warning and the recorded fact are two decisions,
  and only one of them was actually being asked about.** Tagging `T` would fire
  nut/sesame/shellfish warnings on every pizza; *discarding* `T` throws away the
  venue's own graded statement and makes recovering it a 55-menu re-read. Both
  costs avoided by separating them.
  🚩 **It leaves a real design question, recorded rather than assumed:** under
  [ADR 0047] `site/data/` holds only what a screen renders, and under this
  ruling no screen renders trace — so the trace tier probably belongs in the
  repo-only record `data/`. That would make the split-store rule load-bearing
  for **safety** data for the first time. Recommended, not built; his call.
- 🎯 **The Victoria Tavern → fetch it, record the weaker provenance.** Its TLS
  certificate is a self-signed Plesk placeholder from a 2026-08-03 hosting move,
  so the menu is only reachable with verification disabled. Transcribed as
  `paper-menu` rather than `official-site`: we read a menu document, and we
  could **not** establish that the server is the venue's own site — which is
  exactly what the certificate would have proved. 🔑 **A provenance value is a
  claim about what we verified, not about where the bytes came from.**
- 🎯 **Subway → build it, every price `null`.** Subway NZ publishes no price
  anywhere first-party (franchise pricing varies by store), so `null` is the
  correct record rather than a failure. Dish names plus a first-party allergen
  guide is most of what the app is for; the price band already reads as unknown.

### After the rulings — two more venues, and what they taught

Both owner-ruled venues were built in a second worktree (`faves-menus2`,
branch `menus-14b`) after the first had been closed out.

- **The Victoria Tavern, 138 items**, `verifiedBy: paper-menu` rather than
  `official-site`, because the certificate we had to bypass is exactly what
  would have established the server was theirs. `verified` is 2024-10-04, the
  older of the two source PDFs.
- **Subway, 141 items, every price `null`**, tagged from its own **NZ Allergen
  Web Guide (May 2026)** — fetched past an Akamai block that had defeated both
  `curl` and headless Chromium, then rendered page by page and read visually.

🔑 **Subway's own data settled a design question this session had been deciding
by judgement all day.** The same filling is sold as a sub, a wrap and a salad,
and Subway's guide gives the three **different** allergen sets — soy `●` on the
Sweet Onion Chicken Teriyaki sub but only `*` on the wrap; the Chicken Strips
salad has no gluten row at all. So they are three products, not one printed
three times, and **the difference is the bread, which is the gluten**. 44
explicit `dishId`s, justified by evidence rather than by the [ADR 0051] analogy.

🔎 **And its allergen guide graded present vs trace exactly as Pizza Hut's did**
(`●` contains, `*` may contain) — the second instance the same day, which is
the evidence that the owner's data-model ruling above is worth building rather
than a one-venue curiosity.

🚩 **A false alarm worth recording, because it cost nothing to check and would
have cost a correction to accept.** The Victoria Tavern's agent reported that
`detailsVerifiedBy: "third-party"` on the existing stub was "not in the closed
set". It is — `ARCHITECTURE.md` line 369 defines it, and `validate.py` agrees.
**A sub-agent's challenge is a hypothesis too.**

🚩 **The two venues also produced an inconsistency, and it is a real question
rather than a slip.** Subway keeps 141 unpriced rows because the owner ruled it
should; the Victoria Tavern's agent dropped ~40 unpriced spirits on the corpus
convention that unpriced lines are simply omitted — a convention it verified
against two other venues before following. Both defensible, and opposite.
🎯 Left with the owner: is an unpriced row a record of what the venue sells, or
noise until someone prices it?

### ✅ Owner rulings taken at the close (2026-08-16)

Four questions were put to him rather than resolved quietly. All four were
answered, and **one overruled the session's own recommendation** — recorded here
because the reasoning is the part that carries forward.

- **A notification while you are looking at the page → LEAVE IT, duration only.**
  The alternative ("only if the tab is hidden") was offered with its costs and
  declined. 🔑 **A rule with one condition is predictable; a second condition
  buys quiet and spends predictability** — and "hidden" is a poor proxy anyway,
  since a phone locking mid-bake counts as hidden. Nothing to build.
- **No visible cue when a timer ends → BUILD IT, and style the blocked line
  too.** `[S][css]`, open and unclaimed. This was the highest-value of the three
  in his own case: iOS ignores `navigator.vibrate`, so on his phone the alarm is
  tone plus notification, and **a silenced phone with notifications denied
  currently gives no alarm at all**. A silenced phone in a kitchen is the likely
  case, not the edge case.
- **`cook.notifyBlocked` te reo string → to the reo review queue.** Falls back to
  English safely meanwhile.
- **CI and the browser checks → the FAST SUBSET, per push.** `boot_check` into
  `ci.yml`; the other seven stay manual. Full-CI and nightly were both offered
  and declined. 🔑 **The subset is chosen for what is safe to make *required*,
  not for what is cheap**: `boot_check` needs no timing assumptions, while
  `cook_check` is contention-flaky and `sync_check` drives two browsers for
  minutes — and a flaky *required* check trains everyone to hit re-run, which is
  worse than no check.

### 🎯 And the one he overruled — five parallel sessions stay

This session recommended cutting to **three**, each given a *file territory*
rather than a roadmap item, on the evidence above: a ready owner-ruled item
declined purely for file contention, version-range negotiation by message, and
**two occasions where one session's entirely correct action hard-blocked every
other session's commits**.

**He heard it and kept five**, judging the raw parallel output worth the
per-session friction. 🔑 **Which reframes the work rather than ending it: the job
is to make five work, not to argue about five.** The mechanisms that
demonstrably paid for themselves are now written into the roadmap as standing
practice — broadcast the *file set* not just the claim, announce version
*ranges* and re-verify after every rebase, ask peers what the owner has ruled at
their end, announce any change that makes the repo's **gates** stricter, and give
each agent its own worktree or forbid `git add -A`.

## 2026-08-17-0100 — the menu fetch was already finished, and three rulings fell out of saying so

Asked for a full list of open work by theme, then told to do the second of the
owner's two picked-next items — **"the remaining 14 venue menus"**. It was
already done. Reporting that honestly, rather than performing the fetch, was the
whole first half of the session.

### 🔎 The finding: measure the corpus, don't read the item's title

The zero-dish reproducer says **18 venues carry no dishes**, and every one of
them is unfetchable — 14 publish nothing at all, and 4 publish a website with no
menu on it (`babaili-malatang`, `caffiend`, `kaffee-eis`, `new-chapter-cafe`).
The owner authorised fetching **18** venues that publish their own menu; 14 were
transcribed and 4 turned out to publish no menu. **The authorisation is
exhausted.** Corpus: 37 venues with menus, 3,059 dishes.

🔑 **The item outlived three of its own titles** — "six venues", then "the
remaining 14", then the owner's brief repeating 14 — because each was typed from
prose while the reproducer sat six lines below saying otherwise. The count
nobody typed was right every time. Same trap as the stub count (stale three
times) and the chain/branch count one item above it: **a hand-copied tally is
wrong the moment data lands, and it reads identically to a true one.**

⚠️ **I put the stale item in a summary to the owner as open work before checking
it.** The correction cost nothing here, but the first answer was drawn from the
roadmap's prose rather than from the tree, which is the exact failure the file
warns about in three separate places.

### ✅ Three owner rulings

1. **An unpriced row is a RECORD — always keep it, flagged `needs: price`.**
   Settles the split the fetch created (Subway kept 141 unpriced rows; The
   Victoria Tavern's agent dropped ~40 spirits) and **overrules** the convention
   read from `southern-cross`/`the-borough-tawa` — those are venues that happen
   to have no unpriced lines, not evidence of a rule. Dropping is lossy;
   keeping is not. Consequence filed as its own item: restore the spirits.
2. **22b and 22c are ONE piece of work**, superseding the unratified "22c
   first, or at least alongside". The owner accepted the cost — Favourites
   keeps stranding for the whole `[L]` — so a partial 22b is now the one
   outcome the ruling rejects.
3. **37k: check Theme 30's `service` axis first**, no data entry. Relayed to
   `faves-cook2`, who holds the claim.

🔑 **Two peers independently challenged ruling 1 on [ADR 0047] grounds — "name
the screen that renders `needs: price`" — and the code answered both.** `needs`
already ships: 166 dishes carry it, `price` is in the vocabulary, `validate.py`
enforces it, and `needs.js priceUnknown()` drives `menu.js` to print **`?`**
where a bare missing price prints `—`. A convention change, not a schema change.
One peer reasoned from a *test name*, one from an *ADR*; the answer was one grep
away. **Read the code, not the artefact that describes it.**

### 🛑 The index is a shared surface too — a new instance of the parallel-session class

`faves-ea` and I were both in the **primary checkout**, both editing
`docs/ROADMAP.md`. The known hazard is the working tree. The one that actually
bit is that **the index is shared as well**: they had `git add`-ed four hunks,
I staged two more, and for about a minute a commit from either of us would have
landed the other's work under the wrong message.

🚩 **`git status` shows one modified file and looks completely normal.** The
check that sees it is `git diff --cached -U0 | grep '^@@'` — compare the hunk
headers against what you believe you wrote. Both sessions have adopted it, and
it caught a second, non-cross-session fault within minutes (a peer's own staged
content gone stale against their own working tree after a harvest).

🔑 **And `git add -p` is interactive, so the harness cannot hand-pick hunks the
normal way** — which is *why* both of us reached for `git add`. The
non-interactive equivalent, used here to stage and then to un-stage cleanly:

```sh
git diff -U0 <file> > full.patch        # filter hunks by their @@ -N old-line
git apply --cached --unidiff-zero mine.patch
git apply --cached -R --unidiff-zero mine.patch    # the undo
```

### 🚩 Left for the owner

- **Direct pushes to `main` are landing via a ruleset BYPASS** — every push this
  session printed `Bypassed rule violations for refs/heads/main: 4 of 4 required
  status checks are expected.` Spotted independently by `faves-f2`. So the
  required checks are not gating `main`; they run after the fact. This interacts
  directly with the open item to wire `boot_check` into CI — a required check
  that can be bypassed is the decorative-guard pattern at the branch-protection
  layer.
- **Two of the fetch's three questions remain his**: whether Pizza Hut's prices
  are Johnsonville's (one phone call), and Little Sprig Seatoun's contested
  menu date.
- **All 18 remaining stubs are an errand list, not session work** — only a photo
  or an in-store visit clears any of them.

## 2026-08-17-2200 — a stale handover, 2.6 GB of debris, and four claims that had to be proved

Opened on a handover note from a previous session warning that `sync_check.mjs`
was unclaimed and its trace pointed at a real product hazard: the ⋯ button
reporting two open/close cycles from one click. **The warning was already
overtaken** — the item had been fixed the day before, and its "a real person
could hit this" hazard retired as the check's own bug. Re-ran it: `OK — 16
passed, 0 failed`, N still 16.

**The one residue got closed, structurally rather than by re-running.** The old
trace's third observation was recorded as *"unexplained rather than disproved"*.
It now has nowhere to live: `overflow-ui.js`'s `setOpen()` returns early on
`open === isOpen()`, so one activation cannot move `aria-expanded` twice, and
two cycles need **two** click listeners. There is exactly one binding, reachable
once per page. The mechanism the original diagnosis named is specifically ruled
out — `menu.js`'s `reapply()` is a settings subscriber that never re-runs
`initChrome()`. 🔑 **"Unexplained" and "a hazard" are not the same claim**: an
unreproduced reading with no possible mechanism is a tooling question.

### The debris was real and larger than anyone had measured

**265 leftover Chrome profile dirs, 2.6 GB**, plus 4 orphan browser trees (30
processes, 391 MB RSS, ~10 hours old). All deleted on the owner's authority;
zero headless Chrome left. **128 of the 265 were `faves-boot-check`** — the
cheapest check, so the most-typed, so the biggest leaker, and the one about to
be wired into CI on every push. That evidence changed `faves-hygiene`'s
sequencing: the reaper lands **before** the CI wiring, not after.

- 🔑 **The happy path was never broken.** A clean run removes its own dir —
  proved, not assumed: this session's `sync_check` run left nothing behind
  (`sync_check.mjs:908`). So every one of the 265 was from a killed or crashed
  run, which is exactly the scope of the fix.
- ⚠️ **`ppid=1` is a sound orphan discriminator but not a stable target.** The
  four orphans died on their own between measurement and kill — the kill matched
  nothing, before a signal was sent. A reaper must treat "already gone" as the
  normal case.
- ⚠️ **The held-dir guard written for the deletion did not work** (shell
  expansion produced junk). Nothing was at risk — zero Chrome had been verified
  seconds earlier — but the guard didn't earn the credit, and saying so is the
  point. 🔑 `faves-hygiene` named its class exactly: it is a **decorative guard
  pointing the most dangerous way** (ADR 0072) — its output would have been
  identical had a live run been present. That volunteered failure is now a
  required test in the reaper: start a check, leave its Chrome live, sweep, and
  assert the held dir survives.
- 🔑 **Two sessions counted the same debris and got 189 and 265** — because one
  pattern matched `faves-*-check` and the other included `domsnap-*` and
  `faves-sync-smoke-*`. About 16 of the gap is definitional; the rest is
  unexplained and left that way. **Neither of us stated our pattern when we
  stated our count**, which is what made a definitional difference
  indistinguishable from a real one. State the pattern with the number.

### Four stale claims — and the owner would not take existence as evidence

Four `CLAIMED` markers from 2026-08-16 whose worktrees were gone and whose work
had landed. The first report offered file-existence as proof. The owner's reply:
*"ensure you can prove that each of those stale claims is 100% completed."*
🔑 **He was right, and the re-verification found the difference between the two
standards.** `kinds.js` existing proves nothing; **`isRecipes` being gone from
executable code** — ~20 branches down to one comment about its own removal — is
the measure that proves the refactor. Likewise the ticks item: the file had the
exclusion, but what proves it is the **suffix** match (a base-key match would
have excluded *nothing at all while reading as complete*) plus the test the item
itself demanded, across two profile ids.

One item contradicted itself — header `"Ruled, not yet built"` above its own
body's `"✅ BUILT"`. Marking it `[x]` then tripped **sizescan's cold-content
gate**, so 36g was harvested whole to `ROADMAP-DONE.md` behind a pointer.
🔑 **The gate was right**: de-claiming alone would have left the contradiction
outliving the claim that explained it.

### 🛑 Five parallel sessions: the index is a shared surface too

Two sessions were live in the **primary checkout**, both editing `ROADMAP.md`.
We collided **in the git index** — for about a minute it held both work sets,
and a commit from either side would have landed the other's half under the wrong
message. `faves-f1` caught it and reversed out; neither `git status` nor a clean
working tree would have shown it.

- 🔑 **The check that works, and it is not `git status`:**
  `git diff --cached -U0 | grep '^@@'` immediately before every commit.
  It caught a *self*-inflicted case minutes later too, when a harvest left this
  session's own staged content stale against its own working tree.
- `git add -p` is interactive and blocked in this harness, so hunk selection
  goes through `git apply --cached --unidiff-zero` on a filtered patch, `-R` to
  undo. **A filter has to match wrapped prose** — the first attempt keyed on a
  phrase that line-wrapping had split, and silently staged one hunk of four.
- 🔑 From `faves-hygiene`, one step earlier in the same sequence: **a clean
  `git status` at session open is not a clean status now.** With five sessions
  live the window is minutes; the check belongs in the same breath as the edit.
- 🔑 **Two peers corrected this session and both were right**, which is the
  argument for the channel: `faves-f1` read the code where this session had
  reasoned from a test name (`needs: price` needed no schema change at all), and
  caught the index collision. Peer review beat solo care twice in one session.
