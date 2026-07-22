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
  aggregator + Uber Eats pattern used — phone check 04 478 4780 would
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
  b07087c → d371169: six commits, three touching `docs/method/` —
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
