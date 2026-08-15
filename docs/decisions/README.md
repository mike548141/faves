# Decision records

Short ADRs preserving the *deliberation* behind significant decisions —
the alternatives weighed, why they lost, and the evidence — which
`ARCHITECTURE.md` (current truth, compact) deliberately compresses away.

Write one when a decision (a) rejected a plausible alternative a future
session might re-propose, or (b) rests on evidence that took real work
to gather. Don't write one for reversible implementation choices — a
code comment covers those (the "comments say why" rule).

Format: one file, numbered `NNNN-slug.md`, about half a page. Sections:
**Status** (accepted / superseded-by-NNNN), **Date**, **Context**,
**Decision**, **Rejected** (each alternative + why it lost),
**Consequences**. Never edit an accepted ADR's substance — supersede it
with a new one.

**Allocate `NNNN` at merge, never in a worktree.** The number is a shared
counter, and "highest in the directory, plus one" reads a value that a parallel
session may already have taken. Draft with a placeholder and fix the number when
you merge to `main`. This is not hypothetical twice over: three parallel agents
all took `0031` on 2026-07-23, and **0025 is currently used by two unrelated
accepted records** — `0025-settings-index-and-panels.md` (2026-08-08) and
`0025-infer-allergens-by-default.md` (2026-08-09), found 2026-08-15. **Owner
ruled 2026-08-15: both stay.** Renumbering would rewrite an accepted record's
identity and break 24 inbound references plus any external link, on a public
repo — dearer than the oddity. So `0025` is permanently ambiguous: **cite an ADR
by its file path, never by bare number.** Numbering carries on from the highest
in the directory as usual; 0025 is simply used twice.

**Add the index entry in the same commit as the record.** The collision above
survived because `0025-infer-allergens-by-default.md` was never indexed here,
and this index is the one place a duplicate number is visible. An unindexed ADR
is invisible to the next person allocating a number.

Records 0001–0004 were backfilled 2026-07-08 from decisions already made
and recorded in `ARCHITECTURE.md`/`STRATEGY.md`; they capture the
deliberation those compact docs omit.

## Index

- [0001](0001-zero-build-vanilla.md) — zero build step, vanilla
  HTML/CSS/ES-modules, no framework
- [0002](0002-json-per-restaurant-git-as-cms.md) — one JSON file per
  restaurant, git as the CMS (no database, no admin UI)
- [0003](0003-recipes-as-kind-not-separate-type.md) — Cook at Home as a
  `kind:"recipes"` record reusing the venue shape
- [0004](0004-cloudflare-pages-subdomain.md) — Cloudflare Pages at a
  subdomain, not S3 and not a path prefix
- [0005](0005-native-maps-handoff.md) — native maps handoff (Apple
  Maps / Android `geo:` / desktop Google) at exact coordinates, not one
  vendor's web map
- [0006](0006-hours-model-and-timezone.md) — structured per-day hours
  (intervals, splits, "late"), live status computed in NZ time not the
  device clock
- [0007](0007-pairings-not-meal-reorg.md) — recommended pairings
  (`goesWith` deep-links) instead of reorganising Cook-at-Home around
  meals
- [0008](0008-sbom-committed-and-deterministic.md) — SBOM committed at
  `/.well-known/sbom.json`, deterministic and CI-checked
- [0009](0009-group-orders-share-urls-not-connections.md) — group
  ordering shares finished picks as URL fragments (share sheet / QR),
  not live connections (Bluetooth / WebRTC / backend-room rejected);
  records the owner's softened stance on a future lightweight backend
- [0010](0010-drive-time-directions-handoff.md) — the address maps
  handoff requests driving directions from the viewer's location (real
  live drive time), plus a rough straight-line "~N min" card hint
  (**part (a) superseded by 0016**; the "~N min" hint (b) stands)
- [0011](0011-multi-location-venues.md) — venues with several branches as
  one record + an optional `locations` array (shared menu), resolved by
  the nearest branch for distance / status / maps; not separate records
- [0012](0012-device-local-profiles.md) — device-local profiles (per-person
  hearts on a shared phone): a registry + profile-scoped storage wrapper,
  scoping favourites + settings by whole store; migration copies old data into
  the default profile; cross-device sync stays out of scope (Theme 6)
- [0013](0013-ratings-curated-and-local.md) — ratings: a curated household 1–3
  rating (optional data field, schema+render only, ships dormant) + device-local
  per-profile personal ratings; public/crowd ratings stay rejected (three
  non-goals), the online Google-rating edge function is a separate owner-gated
  item; direction ⚑ awaits owner ratification
- [0014](0014-pick-along-a-route.md) — pick along a route: an offline
  least-detour sort (added-distance haversine cost, best-branch resolution,
  detour leads / availability secondary) with suburb-or-place destinations (no
  geocoder, no stored address), plus a routed maps handoff (Google waypoint;
  Apple has none → venue-as-destination); live routed corridor stays rejected
- [0015](0015-split-precache-versioning.md) — split precache versioning: a shell
  cache vs a data cache with independent version constants, so a menu-data edit
  no longer re-downloads the whole app shell (and vice versa)
- [0016](0016-address-tap-pin-at-street-address.md) — the address tap opens a
  map *pin* at the venue's **street address** (Maps geocodes it exactly — stored
  coords sit ~100 m off, proven on R & S Satay), not driving directions;
  supersedes ADR 0010 part (a), keeps its "~N min" hint (b); address-targeting
  adopted for the route handoff's venue leg too
- [0017](0017-cross-device-sync-encrypted-blob-bearer-code.md) — cross-device
  sync of hearts/settings: v1 shareable-link seed (no infra), v2 continual sync
  via a Cloudflare Worker + KV holding **one E2E-encrypted blob per user**,
  debounced writes; softens the no-backend non-goal (backend permitted, accounts
  not), supersedes ADR 0012's "sync out of scope / needs a signed-in app" stance.
  **Addendum:** claim is pluggable over the one E2E store — **passkey + WebAuthn
  PRF** preferred (rides iCloud Keychain / Google passkey sync, no OAuth app, no
  dev-program fee, no PII, PRF supplies the E2E key), **bearer sync-code** (QR or
  word-code) the universal fallback; OIDC "Sign in with" rejected (leaves the
  E2E key unsolved). **Addendum 2:** once passkeys ship, drop the "no accounts"
  claim — a passkey is a credential, not an account; state what's not collected
  (no email/password/identity/tracking; E2E). Cross-person sharing → ROADMAP
  Theme 10, its own ADR
- [0018](0018-maps-app-preference.md) — maps app is a user preference (Apple /
  Google / Waze / "match my device"), not just platform detection; the web
  can't read the OS default. `geo.resolveMapsTarget` + a Waze provider.
- [0019](0019-ratings-five-star-slider.md) — ratings move to a **1–5** star
  tap/drag slider placed under the name (supersedes ADR 0013's 1–3 three-button
  scale + control shape). *(Owner later reopened the control design — ROADMAP.)*
- [0020](0020-favourite-reference-integrity.md) — favourite/rating **reference
  integrity**: never silently drop an unresolved ref, never claim "removed"
  without an online recheck (stale-cache vs deleted are indistinguishable
  locally). Proposed; build deferred + coordinated with ADR 0017 / Theme 10.
- [0021](0021-mode-aware-travel-hint.md) — **mode-aware travel hint** on the menu
  screen: walk under a 2 km crossover, drive at/above (5 km/h straight-line walk,
  no road-winding pad; reuses the drive estimate). Shown under the pickup address
  for the resolved nearest branch, only with a captured Near-me origin — no
  routing API (offline/zero-dep, consistent with ADR 0010/0001). Collect-dialog
  placement deferred.
- [0022](0022-publish-safety-review.md) — **publish-safety review**: the
  evidence that this repo is safe to make public, on `rpi` ADR 0009's six-gate
  template plus two gates this repo needed (the floor tightening on a public
  repo; the platform-settings audit). leakscan 101 → 0 by reasoned allowance —
  the findings are restaurant business data, which is the product. Full history
  and the records publish as-is (owner-ruled; fresh-root costed and declined).
  The flip stays owner-only — steps in [GO-PUBLIC.md](../GO-PUBLIC.md).
- [0025](0025-settings-index-and-panels.md) — **Settings is an index of rows
  that drill into panels**, not one long scroll. 1578 px and 31 controls at
  390 px had put the allergen chips, both distance dials and the reset below
  the fold; each row now carries its current value as its subtitle, so the
  state is legible before you open anything, and the index fits one screen
  (552 px). Accordions, tabs and scattering-to-where-they-bite all rejected.
  So was Escape-steps-back: measured, Chrome's close-watcher force-closed it
  two times in six.
- [0025](0025-infer-allergens-by-default.md) ⚠ *(second record with this
  number — see the note above)* — **infer allergens by default where
  confidence is high**, superseding [0024](0024-derived-allergen-tags.md)'s
  narrow three-rule exception on the owner's 2026-08-09 ruling. Inference is
  now the preferred behaviour and the burden moves onto *not* tagging: 542 tags
  applied across the corpus (251 stated, 291 derived), against 45 gluten and 1
  sesame before. **The one-way rule is the hard limit** — inference may only
  ever add a `contains-*` tag, never `gf`/`df`/`v`/`vg`, because inferring
  presence is fail-safe and inferring absence would assert safety from a guess.
- [0026](0026-pat-prerequisite-discharged.md) — **the PAT prerequisite is
  discharged and credential-root hardening is decoupled**, amending
  [0022](0022-publish-safety-review.md)'s consequences. No classic tokens exist
  on the account, so the archived *classic + broad* line is already historical —
  nothing to rotate. The AWS/Google/TrueNAS half moves to the estate roadmap:
  what it discloses is content-free. Also corrects 0022's reason for rejecting
  redaction — "reachable in every clone" is false here; the real cost is the 44
  stranded doc SHAs. **No pre-flip blocker remains.**
- [0027](0027-pwa-update-flow.md) — **a waiting worker and a notice, not silent
  `skipWaiting()`**. The worker used to take control the instant it installed,
  so an old page was served new assets from caches its own worker had just
  deleted; nothing reloaded, so an update was invisible anyway. It now holds in
  `waiting` until the page posts `SKIP_WAITING` on the user's tap. Auto-reload
  rejected (it costs the search query, scroll position and dietary chips —
  yanking a page mid-order); ignore the notice and the next cold start still
  lands it, as kill-and-relaunch always did.
- [0028](0028-report-compose-and-share.md) — **"tell us what's wrong or missing"**:
  a report is raised from the dish row, the venue contact card or the ⋯ menu, so it
  arrives carrying the venue id, the dish, the value on screen, the `verified` date
  and the device's own version stamps. Transport is **owner-ruled compose-and-share**
  — `navigator.share` and clipboard-copy as two first-class buttons, the composed
  text left on screen if both miss, no recipient baked in, no infra, works offline.
  A pre-filled GitHub issue and a Pages Function are **not rejected, just not
  first**. Non-negotiable: a report is a suggestion to the owner, **never a live
  edit** — tested across every report type.
- [0029](0029-unit-display-preference.md) — **metric or imperial is a
  render-time display choice**, never a stored one: the dials keep storing
  kilometres and the recipes keep saying °C, and only the words change.
  Imperial short distances read in yards (mirroring the metric 50 m ladder),
  the dials run on a round mile grid, and oven temperatures are swapped in the
  step text — one number, nearest 5°F, computed every time. Nearest-25°F dial
  stops rejected: it can serve a 170°C bake at 350°F. Storing converted values,
  guessing from the browser locale, and a whole-of-app "locale" switch (prices
  stay NZD) all rejected too.
- [0030](0030-personal-data-import-and-transfer.md) — **importing your data, and
  transferring it to another device** (Theme 12b + Theme 9 v1). One applier
  behind both doors: merge by default, replace behind a named confirm, your own
  rating wins a conflict. Two things it refuses to guess — a profile match needs
  id *and* name to agree (every device's first profile is `default`, so a
  friend's export collides by construction), and differing allergen prefs are
  shown in full and chosen, never resolved. Transfer carries the **active
  profile only**, measured: the QR ceiling is reached at ~4 favourites, so the
  link is the path and the QR a bonus. Called transfer, never sync.
  **Proposed — owner to ratify.**
- [0031](0031-verified-carries-its-derivation.md) — **`verified` carries its
  derivation**: a sibling `verifiedBy` naming one of six **source classes**
  (`in-store` · `paper-menu` · `official-site` · `phone` · `delivery-app` ·
  `third-party`), at **record** level, with a per-reading `method` override
  already available on a price-series entry. Per-price rejected (acquisition
  is a session act, and the finer case already has a home); `verified` as an
  object rejected (four live consumers read it as a string, on installed
  phones); a confidence score rejected (undefendable numbers). No backfill —
  the two dated records carry methods `SESSIONS.md` evidences, and
  `validate.py` warns rather than errors on the rest.
- [0032](0032-ask-the-controller-for-its-version.md) — **ask the controlling
  worker for its version, don't infer it from cache names** (Theme 16f).
  Since [0027](0027-pwa-update-flow.md) dropped `skipWaiting()`, the newest
  cache can belong to a worker that is *waiting*, not serving — so About's
  stamp reported a version the page was not running. The page now asks the
  controller over a `MessageChannel` and it answers with its own constants;
  a waiting worker is asked the same way and reported as a **separate**
  fact, never merged into the headline. Falls back to the old cache-name
  read when there is no controller or it predates the protocol, so it is
  never worse than before. Narrowing the cache-name heuristic was rejected:
  it is still a guess, only a narrower one.
- [0033](0033-your-data-splits-from-refresh-and-reset.md) — **"Your data"
  splits into two rows**: the panel ADR 0030 flagged as tallest in Settings
  (1009 px, five actions in one summary) splits by data model, not the
  roadmap's file/cache-shaped cut — "Your data" keeps export/import/transfer
  (the personal data blob), "Refresh & reset" takes the app-cache refresh and
  the preferences reset (neither touches that blob). 607 px and 449 px after.
- [0034](0034-cook-mode-overlay-and-wake-lock.md) — **cook mode is a modal
  `<dialog>` over the recipe, and the wake lock is a lifecycle, not a call**.
  The native dialog supplies the focus trap, the inert background, Escape and
  focus restoration; a dedicated page (loses your scroll position) and an
  in-place mode (hand-rolls all of that) both rejected. `navigator.wakeLock`
  keeps a `wanted` flag and re-acquires on every `visibilitychange`, because the
  OS releases the lock when the page hides and never restores it. Unsupported
  (iOS < 16.4) and refused both degrade to silence. Two leaks found by driving a
  real headless Chrome — a sentinel dropped rather than released on hide, and a
  request landing after close — are fixed and tested. Steps saturate at both
  ends; wrapping rejected. Resuming a part-cooked recipe deliberately not stored.
- [0035](0035-one-noun-place-and-branch.md) — **one noun for one thing: a
  *place*, and a *branch* of one** (Theme 15b). Five nouns (place, venue,
  restaurant, spot, branch) collapse to two: **place** = a venue as the reader
  sees it (owner's steer, already the commonest word, and the only one that
  isn't false for Cook at Home); **branch** = one location of a place. The
  Settings → Distance pair is fixed by naming each dial's subject — "Hide
  places further than" vs "Show **a place's** branches within" — not by
  renaming both to "places", which would have made two different jobs read as
  one. *Location* rejected for a branch (collides with the reader's own
  location); the idiom "in one place" and the SEO meta descriptions
  deliberately left alone. `reo.js` moved in lockstep (`nav.allRestaurants`
  re-uses `fav.allPlaces`'s reviewed Māori); a pre-existing `service.all`
  collision flagged for the Phase 7 reo review, not guessed at.
- [0036](0036-refresh-caveat-reads-the-method.md) — **the "needs a refresh"
  caveat reads the method, then ages it** (Theme 13g; builds on 0031). Owner's
  ruling: a reading counts as a check when it came from the shop itself —
  `in-store`/`paper-menu`/`official-site`/`phone` trusted, `delivery-app` and
  `third-party` *always* caveat ("not third parties like delivereasy, uber
  etc"). Plus a **12-month** age limit, flagged in the code as a house default
  rather than an owner number and retunable on one line. Four distinct reasons
  (`never` · `unknown-method` · `untrusted` · `stale`) so one null stops
  standing for two different things; an unknown method caveats, because trust
  is a positive claim. TJ Katsu and Sushi Bi gain the honest dates the session
  log evidences, no longer withheld to keep a caveat on. A confidence scale, a
  per-method limit, and ageing the untrusted methods all rejected.
- [0037](0037-confidence-reads-both-ways.md) — **the confidence note reads
  both ways, and details carry their own date.** The ⓘ used to appear only on
  bad news, so its absence was ambiguous — "we checked last week" and "no
  comment" rendered identically. Now always present, tone only: ⚠ amber
  caution, ⓘ blue "checked in store". `verified` dates the **menu** and nothing
  else ([0031](0031-verified-carries-its-derivation.md)), so details got their
  own dated reading (`detailsVerified` + `detailsVerifiedBy`) rather than
  letting the note claim something nobody checked. The two tones sit 1.06:1
  apart in luminance, so **the glyph and the accessible name carry the
  difference**, never colour alone.
- [0038](0038-intake-provenance-from-the-file.md) — **intake provenance comes
  off the file, never off the import.** [0031](0031-verified-carries-its-derivation.md)
  said every reading carries *how* it was obtained but not where that answer
  comes from, so in practice the transcriber asserted it. A file's mtime is not
  the reading date (copying or syncing a photo rewrites it, silently claiming a
  fresher check than the evidence supports) and folder names are a guess. The
  method is now evidenced from the file itself.
- [0039](0039-cook-mode-gets-its-own-browser-guard.md) — **cook mode gets its
  own real-browser guard, gaps declared** (ROADMAP 17d; guards 0034).
  `tools/cook_check.mjs`, a sibling to `device_check.mjs` rather than a
  widening of it: the allergen safety verdict stays on its own line and its own
  exit code, and the shared CDP harness moves to `tools/lib/browser.mjs` so
  there is only ever one of it. The wake lock is observed by **instrumenting
  the real API** — headless Chrome 151 grants genuine sentinels — never by
  faking one, and the three things a headless browser genuinely cannot show are
  written into the tool's header instead of being papered over with assertions
  that would pass either way. Proven to bite by three deliberate breaks. Found
  a real defect on the way: Back at step 1 disables itself while focused and
  drops focus out of the dialog, killing the arrow keys.
