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
artifact ever appears. Reasoned in ADR 0015.

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
  Root cause of the owner's "148 Cuba St opens on Garrett St" report: the old
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
