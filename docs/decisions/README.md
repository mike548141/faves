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
  off the file, never off the import.**
  [0031](0031-verified-carries-its-derivation.md)
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
- [0040](0040-nga-and-ngo-map-onto-the-closed-tag-set.md) — **"no gluten added"
  and "no gluten optional" map onto the closed tag set** as `gf` and
  `gf-option`, with the venue's own hedge kept verbatim in the dish
  description. Three pub menus (1841, The Borough, Southern Cross) print a
  gluten vocabulary the tag set doesn't have, and it is a group-wide legend
  rather than a one-venue quirk. Adding an `nga` tag lost on cost; leaving the
  dishes untagged lost because it discards a fact the menu *did* state and
  breaks the filter on exactly the menus that marked themselves up. Leaves a
  raised-not-patched gap: the site still cannot say a kitchen is shared.
- [0041](0041-a-dish-carries-its-own-open-questions.md) — **a dish carries its
  own open questions.** Per-dish `needs` replaces hand-typed "go and check this"
  prose in ROADMAP.md, which went stale the moment a fact came back — the same
  trap the stub count fell into three times. It also splits a meaning
  `price: null` was carrying twice: `?` now means "we couldn't read it", `—`
  keeps meaning "the shop prices it on application". Renders as its own `?` pill
  and never in the allergen tag row, which must not be diluted; `tools/needs.py`
  derives the worklist. Closed set written in three files, with a drift guard.
- [0047](0047-the-app-ships-only-what-it-renders.md) — **the app ships only
  what it renders.** `site/data/` is precached in full, so a field added there
  is downloaded by every phone whether a screen reads it or not. Superseded
  prices and departed dishes move to `data/`, the repo-only research store,
  and are kept forever there. Measured before acting: `priceSeries`/`priceNext`
  had zero consumers outside the module computing them, and the history cost
  648 B gzipped of a 56 KB payload — the case is the missing *rule*, not this
  year's kilobytes. `split_data.py --check` proves the two stores still
  reconstruct the original corpus, so relocation can't decay into deletion.
- [0046](0046-ownership-is-recorded-bounded-by-provenance.md) — **ownership is
  recorded, bounded by provenance.** The owner ruled (2026-08-16) that
  ownership and contact details — name, email, phone — may be held in `data/`
  and linked to venues, limited to what is in the public domain or was
  purposely given to us for Faves. Every record carries a `source` saying
  which, enforced by `tools/registry.py` as an error, because a bound that is
  only written down is not a bound. Widens the *no personal data* constraint
  for the first time on a public repo; home addresses of people and health
  detail stay absolutely excluded.
- [0050](0050-a-facet-link-filters-the-list-rather-than-searching.md) — **a
  facet link filters the list rather than searching for the word.** The owner
  asked for a venue's "Malaysian" link to open the search screen, which the
  reader knows and which has a ✕ to get back. Measured first: across all 51
  cuisines and areas the filter and a text search agree on 45, and on the other
  6 search never misses — it *adds*. "Pub" returns 6 places of which 5 are not
  pubs, because the haystack includes names and addresses. So the links keep
  filtering, and the escape the owner was actually missing was built instead (a
  dismissible chip beside the count). Owner ruled keep-as-is on 2026-08-16 and
  asked that the option stay open; the record carries the four-step switch and
  what switching costs, so the trade is never re-litigated from memory.
- [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) — **an add-on
  is part of the dish you are ordering.** Measured before designing: 28 dish
  descriptions carried a priced add-on in prose, 63 an unpriced choice, 17
  dishes *were* add-ons wearing a dish's clothes, and 11 whole sections across
  9 venues were add-on groups rather than things you would order alone. The
  safety case was already proven by the corpus — `tag_allergens.py` correctly
  excludes add-on prose from inference, so every allergen named in an add-on
  was being dropped on the floor. Allergens union across a configuration and
  dietary claims intersect; an order line is keyed by its selection, so a dish
  configured two ways is two lines.
- [0049](0049-a-row-offered-as-an-add-on-is-not-printed-twice.md) — **a row
  offered as an add-on is not printed twice.** Converting a menu to structured
  add-ons left the source rows in place, so two venues printed their extras
  twice. The owner was given the cost first — those rows are named by stored
  hearts, ratings, `picks` and shared links — and ruled hide, because the menu
  a person is holding in the shop does not print "Extra halloumi" twice. A
  section may carry `addOnsOnly: true`; the rows stay in the data, and
  `validate.py` refuses the flag unless every row it hides is still reachable
  as an option.
- [0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — **a dish has an id,
  and its name is not it.** The `name` was doing five jobs at once — URL anchor,
  `picks` reference, stored heart, stored rating, order line — and four failed
  silently under a rename. Not hypothetical: `slug(name)` was never unique
  within a venue (10 slugs, 22 rows, 3 records, every collision at a different
  price), so three elements shared `id="dish-cheeseburger"`, one heart covered
  all three rows, and the order tally charged **$56 for a $49 pair**. `dishId`
  is **required and seeded** rather than defaulted from the name, because the
  owner ruled identity must be immutable and an id recomputed from a mutable
  display name is not. Costs +12.6 KB gzipped, taken knowingly.
- [0052](0052-the-home-filters-collapse-into-one-sheet.md) — **the home
  screen's filters collapse into one sheet.** Measured before designing: 50.7%
  of a 390 px screen was chrome before the first result (58.4% arriving via a
  facet link), only 3 cards fit, and the bottom bar ate 14.5% at every scroll
  depth forever. The bar becomes one row — `Filters (n)` and `Pick for us` —
  and everything else moves into a sheet that separates *Narrow to* from
  *Sort by* (ADR 0014's distinction, never surfaced before). Chrome drops to
  31.9%, cards 3 → 4. Two live defects went with it: 40 px segmented buttons
  against a 44 px hard constraint, and a floating "Pick for us" covering 63% of
  a venue's heart.
- [0023](0023-time-dimension-in-the-data.md) — **the data carries its time
  dimension; the UI does not.** Prices, menus and venues change, and git dates
  our *edits*, never the world. Optional dated primitives in the data plus one
  pure resolver (`temporal.js`) run in `data.js`, so every screen stays
  time-blind and the dinner-choosing UX is untouched. This is the rule that
  makes a menu refresh **append, never overwrite** — done the old way a refresh
  destroys a free, honest reading, which is what happened to Takeaway @
  Churton's 2019 prices, recoverable only because git held them.
- [0042](0042-the-collection-is-not-scoped-to-a-city.md) — **the collection is
  not scoped to a city.** Title, install name and About stopped naming
  Wellington, and the data model stopped assuming one place. Its consequences
  produced `site/js/renames.js`: five records carried a suburb in a national
  chain's name, the suburb belongs in `locations[].label`, and a venue id that
  is simply *replaced* breaks every shared link and detaches every stored heart.
- [0043](0043-a-venue-carries-its-own-clock-and-currency.md) — **a venue
  carries its own clock and currency.** "Open now" resolves on the venue's own
  timezone, not the reader's, so a place still reads correctly when looked up
  from another country; and there is no site-wide currency, because a price
  belongs to a venue. Adding NZD to GBP produces a figure that is not money, so
  an order spanning two countries shows one total per currency rather than a
  plausible-looking sum nobody can pay.
- [0044](0044-a-menu-can-be-written-in-another-language.md) — **a menu can be
  written in another language.** A record names the language its own strings are
  in, and `translations` is an additive sidecar. The canonical `name` stayed a
  plain string because it was the dish's identity — a claim [0051] has since
  narrowed to display only.
- [0045](0045-prices-convert-and-localisation-can-follow-you.md) — **prices
  convert, and localisation can follow you.** Shipped exchange rates, refreshed
  weekly by a scheduled workflow that opens an auto-merging PR, so conversion
  works offline and the app still has no runtime dependency on a network call.
- [0053](0053-a-photo-of-a-named-product-must-be-that-product.md) — **a photo
  of a named product must be that product.** `image`/`alt` had been in the
  schema since early on and no dish had ever set them; McDonald's is the first.
  The owner ruled openly-licensed photos where they look great, the venue's own
  otherwise — and applied per dish, that came out at zero open images, losing on
  **accuracy, not licence**: the public-domain fries carton is Canadian, the
  public-domain apple pie is the US baked one, and the opaque studio shots read
  as a bug beside 40 transparent cutouts. A generic burger captioned "Big Mac"
  is not merely worse-looking, it is a false depiction of a named product, which
  on a menu app is worse than no photo. Provenance and a removal recipe live in
  `data/images/`, never served (ADR 0047).
- [0054](0054-the-branch-offered-first-is-the-nearest-open-one.md) — **the
  branch offered first is the nearest *open* one.** One branch leads expanded,
  up to four sit collapsed one tap away, and the second step appears only past
  those — which retires it for four of our five chains. The rule that mattered
  was not the layout: 10 of 22 branches carry no hours, so openness is a
  **three-state** `open`/`closed`/`unknown`, and "unknown" outranks
  "known-closed" rather than being folded into it. A two-state rule would have
  been incapable of firing on McDonald's, the venue that prompted the change.
  Amends 0011.
- [0055](0055-a-venue-website-may-be-a-platform-page.md) — **a venue's
  `website` may be a page on someone else's platform.** `caffiend.co.nz` has no
  DNS record at all and the directory-listed `business.site` URL died with
  Google's 2024 shutdown, so a cafe trading since 2003 had a phone number and
  nothing else. Owner ruled a Facebook page may fill the field where the venue
  has no site of its own — bounded by confirmation (titled page, an independent
  directory citing that exact URL at the street address, the matching Instagram
  handle), and `null` wherever that standard cannot be met, because a wrong link
  is worse than none. A `social` field beside `website` lost on ADR 0047: no
  screen would render it differently.
- [0056](0056-a-precache-must-not-read-the-browsers-cache.md) — **a precache
  must not be filled from the browser's cache.** The owner reported a button
  doing nothing; the code was fine and the worker was fine. `sw.js` precached
  with a plain `fetch()`, which reads the browser's HTTP cache, and Pages served
  `js/*` with `max-age=14400` — so bumping `SHELL_VERSION` renamed the cache and
  the install **refilled it from the previous deploy**. The `READY` sentinel then
  made that permanent. Installs now fetch with `cache: "reload"` and `_headers`
  revalidates everything precached. Reproduced end to end before it was touched.
  The sharp part: **every check in the tree was green**, because they all launch
  a fresh profile — nothing tested an *upgrade*.
- [0057](0057-a-section-heading-is-a-name-not-a-sentence.md) — **a section
  heading is a name, not a sentence.** The owner hit `Brunch (served till 2pm)`
  in the jump-nav strip on his phone; Sprig & Fern's `Gold Card (Mon–Fri
  11:30–17:30, weekends 10:00–17:30)` is a **53-character chip**, wider than a
  390 px screen. The heading was doing two jobs that want opposite lengths, so
  the qualifier moves to a sibling `note` and the chip and anchor are built from
  the name alone. `available.note` lost: `check_available` refuses a note-only
  window, and `available` is a *filter* object — a presentational string in it
  would make a section's visibility look conditional. Prose on purpose, because
  a weekday+interval rule is inexpressible until ROADMAP 28c. The finding it
  fired: **a section's anchor is derived from its display name**, so any rename
  invalidates links to it — ADR 0051's fault, one level up.
- [0058](0058-a-section-has-an-id-and-its-heading-is-not-it.md) — **a section
  has an id, and its heading is not it.** 0057's rename broke every deep link
  to six sections in the commit that made them; the anchor was
  `slug(section.section)`, a function of a mutable display name. The owner was
  given the finding-only path, the alias-table path and the schema change, and
  **ruled for the schema change against the recommendation** — recorded so it is
  not re-proposed. `sectionId` is stored, immutable and unique per venue, seeded
  once by `tools/seed_section_ids.py` so no existing anchor moves. The gate with
  teeth is **uniqueness**: two sections sharing an id is valid HTML that
  silently makes the second unreachable. Presence becomes required in the commit
  that seeds the last of six files a parallel session held open.
- [0059](0059-the-info-disclosure-is-click-only.md) — **the ⓘ disclosure is
  click-only, on every input.** The mouse-only hover reveal on `.caveat-note`
  failed **WCAG 2.2 SC 1.4.13** on two counts — the note vanished as the pointer
  moved toward it across a margin (not Hoverable) and Escape was wired only on
  the click path (not Dismissible) — and had separately produced an infinite
  flicker in Settings, where revealing an in-flow note grew the centred sheet
  and moved the ⓘ 54px out from under a stationary pointer. Three options went
  to the owner because going click-only trades a mouse affordance for
  compliance rather than being the neutral fix; he **accepted the
  recommendation** and the reveal is deleted. `device_check.mjs` now hovers the
  ⓘ and asserts nothing appears and nothing moves, because a deletion nothing
  guards is a deletion waiting to be undone.
- [0060](0060-sync-merges-three-ways-because-the-layer-has-no-clock.md) — **sync
  merges three ways, because the personal layer has no clock.** Building Theme 9
  v2's client half found **both halves of ADR 0017's merge bullet wrong against
  the code**: "union hearts" makes un-hearting impossible (`favourites.merge()`
  never removes, by design), and "last-write-wins per scalar" is unimplementable
  because nothing in the layer carries a timestamp. The fix costs no schema
  change — keep the snapshot the two devices last agreed on and diff both sides
  against it, so a one-sided absence is a *deletion* when base held it and an
  *addition* when it did not. **Symmetry ranks above any individual tie-break**:
  both devices run the same merge, so "prefer theirs" swaps forever and even the
  array *order* has to be a function of the inputs or the pair burns KV writes
  indefinitely. Diet stays blocking with a union provisional, so a pending
  question never leaves a device un-warned. Two shipped bugs fell out on the way
  — a transfer link that destroyed the "follow me" localisation preference, and
  a merge import that silently dropped `units` and `currency`. Tombstones,
  per-entry timestamps and reusing `applyPersonalData` all lost.
- [0061](0061-the-sync-code-is-split-into-a-name-and-a-key.md) — **the sync code
  is split into a name and a key.** Implements ADR 0017's bearer code. The code
  does two jobs — claim (which the server must be told) and encryption (which it
  must never see) — so it is used directly as neither: HKDF-SHA-256 under two
  different `info` labels yields an independent 128-bit `blobId` and a
  non-extractable AES-GCM key. 65 bits from `crypto.getRandomValues`, Crockford
  base32, mod-29 check symbol. **The word-list ADR 0017 suggested lost** to the
  precache budget; **mod-37 lost** because its remainders reach punctuation;
  **PBKDF2/Argon2 lost** because a machine-generated code has nothing to slow a
  guesser down for — contingent on 0017's rejection of a user passphrase.
  🔎 The test for the split **passed with both labels identical** — i.e. with the
  server holding the key — because it asserted the wrong thing; the labels are
  now exported so the property can be observed at all.
- [0062](0062-a-toolbar-is-not-a-sheet-lying-down.md) — **a toolbar is not a
  sheet lying down.** Theme 15x's DOM move was right; what it moved onto the
  page was the sheet's vertical stacking, and that measured **284 px in five
  bands** beside a 44 px chip — **63.9% of a 960 × 800 viewport was chrome
  before the first card, against 25.1% on the phone the sheet was written for.**
  The owner called it "truly horrible" and set a numeric brief: two visible
  groups, one row, one control tall. Inline, every label and heading goes
  visually hidden (they still name their controls for assistive tech) and only
  "Sort by" survives, beside a rule. **Service becomes a `<select>`** — the same
  one-of-three as Area and Cuisine, costing 256 px of a 928 px row to say so in
  a different shape — and **the two location toggles become one "Sort by"
  select**, which is what `app.js`'s own comment always called them ("mutually
  exclusive sort modes"); `aria-pressed` had been promising two independent
  switches. 67 px, one band, nothing removed. Three defects found only by
  measuring: wrap breaks on flex-*basis* so it had to be scoped to the routing
  state; a 107 px select renders "All cuisi…"; and the destination bar rendered
  **on top of** three controls that stayed visible and non-zero-sized, which
  only `elementFromPoint` sees. Dropping the near-useless Service filter
  entirely was **left to the owner** — that is a product call, not a layout one.
- [0063](0063-details-provenance-belongs-to-a-branch.md) — **details provenance
  belongs to a branch, not to a chain.** `detailsVerified`/`detailsVerifiedBy`
  are now valid per branch, the branch winning and the venue level standing as
  the default — the `timezone` precedent (ADR 0043) copied exactly, and
  deliberately **not** the address/phone/hours rule that forbids the top level
  once `locations` is set. The pair is taken **whole** from one level or the
  other: a branch's date welded to the chain's method would describe a reading
  nobody performed. Unblocked by the owner's 2026-08-16 ruling that this comes
  *before* capturing McDonald's and Subway hours. Pandan is migrated (Melling
  `official-site`, Press Hall `third-party`) and its ⓘ now names the branch.
- [0064](0064-an-estimate-carries-its-working-and-never-a-timer.md) — **an
  estimate carries its working, and never a timer.** The owner's 2026-08-16
  ruling reversed ROADMAP 36a/36c: estimate the times and serving sizes, and
  label them. Each lands in `data/estimates/` — the record, not the payload
  (ADR 0047) — with a `*Source` saying `stated` or `estimated` and a `*Working`
  naming the numbers used. An **estimated** duration may never drive a timer
  (`timerSafe`, hard-failed by `tools/recipe_estimates.py --check`), because an
  invented "simmer 20 min" on chicken is a food-safety failure; every step is
  also classed `prep`/`cook`/`wait` so the risky class is visible. `null` with
  a reason stays a legitimate answer.
  **The timer clause is superseded in part by
  [0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md)** —
  the owner ruled on 2026-08-16 that estimates drive timers too, clearly marked,
  and `timerSafe` is retired. The rest of this record stands.
  Per-kind ageing — a separate decay limit for hours against phone and address —
  is **explicitly not built**: the shape is ruled, the numbers still cannot come
  from a corpus whose every date sits in one 48-hour window.
- [0065](0065-a-kind-declares-what-it-can-do.md) — **a `kind` declares what it
  can do.** ~40 scattered `kind === "recipes"` conditionals across eight
  modules become one capability table in `site/js/kinds.js`, so a screen asks
  "does this have hours?" instead of "is this a recipe?". **Implements
  [0003](0003-recipes-as-kind-not-separate-type.md), does not supersede it** —
  the conditionals simply *were* its "venue-only fields relax" written the long
  way. `hasPrices` stays separate from `canOrder` on the owner's ruling that a
  recipe may one day carry its cost; deriving a capability from the data
  (`hours != null`) lost, because an unrecorded fact and an absent capability
  are different things and
  [0054](0054-the-branch-offered-first-is-the-nearest-open-one.md)
  already paid for that confusion. One identity survivor,
  `isRecipeKind()`, because the answer is **persisted** in hearts, ratings and
  share URLs and cannot be re-derived. Rendered DOM byte-identical before and
  after, measured from headless Chrome across five screens.
- [0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md) —
  **an estimated duration drives a timer, marked as an estimate.** Supersedes
  [0064](0064-an-estimate-carries-its-working-and-never-a-timer.md) **in part**:
  its timer clause only. Owner's ruling, verbatim: *"Estimates drive timers too,
  clearly marked — every step gets a countdown; estimated ones are labelled as
  estimates on the timer face."* The food-safety argument — an estimated
  20-minute simmer on chicken thighs — and a middle option splitting on `phase`
  rather than source were both put to him first; he took the widest one.
  `timerSafe` is **retired, not inverted**: under the ruling it reads `true` on
  all 115 steps with a number, and a field with one value tells a renderer
  nothing. What replaces it as the hard failure is `minutes` with **no
  `source`** — the countdown would then run with no way to mark it an estimate —
  proved by deleting one and watching `--check` exit 1. The render spec now
  requires the marker **on the timer face**, not only in the step text: a clock
  that looks the same whether its number was read or guessed is not "clearly
  marked". No UI built here.
- [0073](0073-a-note-is-part-of-the-order-line.md) — **a note is part of the
  order line, and a dropped note is not a safe failure.** Theme 14c's "no
  tomato": the note joins `lineKey` as a fourth component, which is
  [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) §4 applied
  consistently — two notes are two things to make, exactly as two add-on
  selections are. 🚩 The codec's written justification for appending a slot
  rather than bumping `CODEC_VERSION` is a **safety** argument — *"dropping an
  add-on can never put something extra on a plate"* — and it does **not**
  transfer: a note is characteristically a REMOVAL, so dropping one leaves the
  unwanted thing on the plate. Carried anyway, because not carrying it fails
  for everyone every time while carrying it fails only against a decoder older
  than the slot. Two things the design got wrong and the code corrected:
  `setNote` needs the note **twice** (the old one locates the line, since the
  note is the identity), and the ± stepper was operating the wrong line when
  two lines differed only by a note — `tools/note_check.mjs` exists for that.
- [0075](0075-currency-is-stated-once-where-it-is-asked.md) — **currency is
  stated once, on the screen where the question occurs.** Supersedes **§3 only**
  of [0037](0037-confidence-reads-both-ways.md), which chose two homes — the
  per-venue ⓘ and the About dialog — and was right at the time, because the ⓘ
  said it in one of its two tones only. ROADMAP 23a proposed deleting About's
  copy as a duplicate. 🔑 **Checking that claim is the record: it was false.**
  Applying `refreshCaveat`'s own rules across the corpus, **39 of 55 venues
  render in the amber tone**, which never mentioned currency — so for 71% of
  venues About was the *sole* statement of it, and deleting as proposed would
  have destroyed the fact with every gate still green. **A duplication claim is
  a measurement, not a reading.** Resolved by closing the amber gap FIRST and
  deleting second, so the fact is stated on 55 venues rather than 16 while
  appearing on one screen rather than two. `boot_check` guards it
  tone-agnostically, and guards About's group list by name so the sediment
  cannot re-form.
- [0076](0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md)
  — **a quantity is scaled only if the parser can write it back unchanged.**
  17a asked for ½ / 1× / 2× over free-text ingredient lines, and the roadmap
  recommended structured data because render-time parsing "will be wrong often
  enough to be worse than useless". 🔑 **Both options share one defect: neither
  is a check** — structured data is trusted because a human typed it, a parse
  because a regex matched, and neither can tell you it got a line wrong. So the
  parse must *rebuild the author's characters byte for byte at 1×* or the line
  is left alone at every scale. Found by RUNNING a parser over the corpus, not
  reading it: 7 lines carry a second number and every one corrupted — `6–8
  garlic cloves` doubled to `12–8`, and `(or 1 medium red onion)` kept offering
  one onion beside four shallots. Three statuses, and `blocked` (there IS a
  quantity and we refused it) is the one that must be visible: a half-scaled
  recipe looks finished. Measured 204/204 byte-identical at 1×; 20 of 24
  recipes double clean, 14 halve. Times never scale — under-scaling a meat
  time is a food-safety failure, not a bad dinner.
- [0077](0077-style-of-dining-is-not-the-cuisine-axis-work.md) — **"style of
  dining" is not Theme 30's cuisine-axis work.** Clears 37k's blocking 🚩 and
  nothing else. They sit at different levels: Theme 30's `service` is metadata
  about a *vocabulary term* ("`Cafe` is a format word"), style is data about a
  *venue* — and it cannot reach **33 of 55 venues**, which carry no
  service-axis cuisine value at all. On the owner's own poles, "silver service"
  is formality and "quick eats" is speed; the axis captures **format**, which
  equals neither — `Gastropub`, the corpus's most-used value at 10 venues,
  implies nothing about either. 🛑 Also: the word `service` is already taken by
  a live filter key (`all|takeaway|dine-in`) and Theme 30's `channel` is a
  third meaning — three sessions hit that collision in one day. **Authorises no
  field, no vocabulary, no data**: two owner questions remain open, including
  that `priceBand`, the app's only curated judgement field, is filled on **8 of
  55** — the measurement that predicts this feature never gets populated.
- [0078](0078-a-harness-owns-its-own-lifecycle-and-a-transport-failure-is-not-a-test-failure.md)
  — **a harness owns its own lifecycle, and a transport failure is not a test
  failure.** The ten browser checks share `tools/lib/browser.mjs`; three faults
  surfaced in one day and only look separate. It leaked its Chrome on every
  abnormal exit (orphans push load past 100, at which point a check *stalls*
  rather than fails — a wall of PASS with no verdict, which is what made a
  five-arm bisect uniformly confident and meaningless). It leaked 189 profile
  directories, and **178 of those on the HAPPY path** — three tools never
  removed theirs at all. It could not say which tree it had measured, so a
  session whose cwd drifted verified a tree without its change, green and
  meaningless. And a 30-second CDP timeout rendered as `FAIL <assertion name>`
  with exit 1, byte-indistinguishable from a regression (measured: `boot_check`
  2 of 4, `recipe_check` 4 of 8 on a loaded machine). **Rejects** per-tool
  fixes, a bare error subclass (the tools catch broadly and discard the type), a
  bounded transport retry (**CDP calls are not idempotent** — re-issuing
  `Page.navigate` reloads, so the retry changes what the assertion measures),
  and a sweep that only ever spares (proven to *discriminate* instead: same
  directory kept while held, removed once unheld). 🛑 `SIGKILL` still orphans
  both and always will. One more face of [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md),
  whose cure generalises: **make the all-clear carry a denominator.**
- [0080](0080-a-venue-has-menus-plural.md) — **a venue has *menus*, plural: the
  shape is recorded and the build is deliberately held.** Discharges the owner's
  ruling on ROADMAP 30a — no venue in the corpus has two menus, so building
  `menus[]` would ship a schema nothing exercises. Adopts the industry survey's
  three convergences as binding constraints (flat entity pools joined by id ·
  price as a resolution over context · availability as a priority-ordered rule
  set with overlap **allowed**, against Deliveroo and with Simphony). 🔑 **Its
  operative half is Decision 4, an admission test:** a shape recorded before its
  first instance is a hypothesis, and the session that builds it must re-derive
  against a real venue rather than transcribe this record. **The test fired on
  its first use and split the four candidates** — `pizza-pomodoro` prices one
  pizza at $29.00 in-store and $17.00 online, so `channel` is exercised and
  `menus[]`, `charges[]` and per-branch overrides are not. Also corrects Theme
  28's size count (81 rows/5 venues → **122/10**) and names a seventh axis
  neither theme carried: 19 rows in 7 venues price a *dietary substitution*
  whose `gf-option` tag already exists and whose price has nowhere to live.
- [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)
  — **a guard is decorative when its output is the same whether or not the thing
  it guards is broken.** Twelve faces, most of them surfaced in one day of parallel
  work by sessions that only discovered they overlapped because a fourth noticed
  they had answered the same broadcast. Among them: a guard that always fires (a
  drift baseline 31 commits stale); one that
  can never fire (a revisit trigger the app ships no telemetry to observe); one
  that answers a different question than it is read as (`check_versions.py` bare
  says "not in scope" on a clean tree, which reads as a pass — two sessions
  collided on a version it called clean); one that declines and reports the
  decline as success (`tag_allergens.py` cannot write 7 of 55 files and exits 0,
  so a green run looks like a clean sweep — and measurement, unlike the first
  diagnosis, showed the decline **concentrates on the records the tool exists to
  protect**); one that runs correctly
  pointed at the wrong tree (a `cd` drifted a session's verification out of its
  own worktree — caught only by a discrepancy between two *passing* runs); and a
  record's "first X in Faves' history" superlative, which is a claim about every
  other change including ones being written in parallel. Two rules follow: a
  guard must distinguish *"I checked and it is fine"* from *"I did not check"*,
  a verdict is worthless without the identity of what it checked; and **a guard
  that is not automated is not a guard** — `ci.yml` runs none of the eight
  headless-browser checks, so every guard written *because* unit tests missed
  something real runs only when a human types it.
- [0070](0070-an-ingredient-list-may-be-grouped-and-the-group-is-part-of-the-line.md)
  — **an ingredient list may be grouped, and the component is part of the line's
  identity.** ROADMAP 37l. Four recipes had already invented grouping by
  prefixing `"Sauce: "` into the string — Upside-Down Plum Cake on **14 of 14**
  lines — and `cook.js` was already stripping that prefix as *"a group label, not
  a thing"*, so the schema was insisting it was text while both ends treated it
  as structure. Entries become a string **or** a `{component, items[]}` group, so
  a flat recipe is untouched and no component name has to be invented for the
  unlabelled half of Ginger Crunch. The hard half was the tick ([ADR
  0067](0067-a-tick-is-keyed-on-the-line-not-its-place.md)):
  the key is `"<component>: <text>"`, because **Sticky Date Pudding lists "60g
  butter" in the pudding and again in the sauce** — key on the text alone and
  ticking one ticks the other. That the key then reproduces the old string
  byte-for-byte, detaching **zero** ticks across all 24 recipes, is a consequence
  and not the motive: ask what the identity *is* and the compatibility question
  often stops existing.
- [0069](0069-the-location-ask-is-primed-not-sprung.md) — **the location ask is
  primed, not sprung.** Supersedes **item 4 only** of
  [0068](0068-the-home-list-ranks-on-one-blend.md). That item said the prompt
  fires on load, unexplained, and that priming was the fix *"if the deny rate
  looks bad in use"*. Checking that trigger is the record: Faves ships no
  analytics and no backend — two `fetch` calls in the whole app, both loading
  our own menu JSON — so there is **no deny rate to look at**, and the deferred
  revisit resolves to *never* while reading like a plan. 🔑 **A deferred
  decision whose trigger nothing can observe is not deferred, it is taken.** A
  second gap found alongside it: `navigator.permissions` appears nowhere, so the
  app could not tell *"never asked"* from *"blocked forever"* — the two present
  identically. So: query the permission on load (which never prompts), use it
  silently when already `granted`, offer a one-tap control when `prompt`, and
  say so in place when `denied`. Owner-ruled 2026-08-17 with both costs stated;
  the cost he took is that on a first visit distance does nothing until one tap,
  once per browser.
- [0071](0071-an-alarm-has-three-channels-and-only-one-of-them-asks.md) — **an
  alarm has three channels, and only one of them asks.** ROADMAP 36d, owner-ruled
  in full 2026-08-16. Cook mode's countdown ended in silence, which is a
  countdown you have to watch. Now: a tone (an `OscillatorNode`, generated — no
  asset, no precache entry, no network) and a vibration on **every** timer, both
  permission-free; a notification on a timer of **more than** fifteen minutes and
  no other, because a prompt is a thing you can only spend once per browser and a
  refusal is sticky. The AudioContext is armed by the tap that STARTS the timer —
  autoplay policy suspends one built anywhere else, and a suspended context is
  silent thirty-five minutes later with nothing on screen to say so. Owes
  [0069](0069-the-location-ask-is-primed-not-sprung.md) an argument and makes it:
  the ask stays on the start tap rather than behind a priming control, because a
  denied notification costs the third of three channels where a denied location
  cost that feature all of its value — but `denied` is rendered in place, per that
  record's own rule. Two firsts for this codebase (audio, vibration) and a
  permission prompt built the same week as [0069]'s, in another worktree; which
  lands first is merge order, so neither record claims to be first. 🔑 One
  assertion was found decorative before it shipped: "a bell rings exactly once"
  passed with the guard **deleted**, because the tick that rings the last timer
  also stops the clock — it needed a second timer running to bite.
- [0068](0068-the-home-list-ranks-on-one-blend.md) — **the home list has one
  ranking, and distance is in it.** Supersedes
  [0014](0014-pick-along-a-route.md). The owner asked to delete the "Nearest
  first" sort because *"the restaurants are already sorted by closest first with
  weighting for being open, close, a favourite"*. Checking that premise is the
  record: the blend he remembered **is** built — and has never once run, because
  `origin` is written in exactly one place, the sort control's own handler, so
  the default order's distance term has been `Infinity` for every venue since
  the project began. Two traps found on the way: the favourite credit is
  **10 km**, not the *"few hundred metres"* he remembers asking for (the
  introducing commit says outright that a favourite at 8 km should beat a plain
  place at 2 km); and `favBoostKm` cannot be re-tuned to carry it, because it
  was quietly repurposed as the branch-proximity cutoff and now has two jobs and
  one name. So: one ranking (availability → distance → a favourite breaking a
  **near-tie**, bucketed at 0.4 km rather than subtracted, because a credit
  cascades), no SORT BY control, and location asked for on load with a silent
  fallback when refused. 🚩 **Design ratified, code deliberately not written** —
  item 4 is the first unprompted permission prompt in the app's history, and a
  new trust surface begun at the tail of a session is how a half-built one
  ships. Also records that there was **no ADR for ranking at all** until this
  one, which is how a 10 km dial nobody meant survived unchallenged.
- [0067](0067-a-tick-is-keyed-on-the-line-not-its-place.md) — **a tick is keyed
  on the line's own text, not on where the line sits, and it expires.** ROADMAP
  17e's checklist. A recipe keys on venue + dish id (ADR 0051); a LINE inside it
  has nothing to key on, and the obvious answer — the index — fails silently:
  insert an ingredient and every tick below slides onto the wrong one, which in
  a kitchen means "I already added the salt" pointing at the sugar. A hash of
  the line's own **raw** text (never the `convertTemperatures` render, or an
  imperial reader would lose the lot) means a moved line keeps its tick and an
  edited one loses only its own. Persistence argues with **ADR 0034**, which
  refused to store the step index — resolved by separating *where I am* from
  *what I have already put in the bowl*, and by a twelve-hour expiry evaluated
  on read from disk, so a recipe cooked twice never starts half-ticked. The
  strike-through is CSS rather than a JS class **because the lines sit inside an
  `aria-live` region** and a DOM mutation there re-reads the whole step aloud.
  Read-aloud ships beside it, cancelled on every exit for the same reason ADR
  0034's wake lock is released — and honest that "no dependency" is true of the
  code, not necessarily of a runtime that fetches its voices. `cook_check.mjs`
  42 → 57 assertions, and all fifteen new ones were seen to fail under a
  targeted break.
- [0074](0074-a-backup-carries-only-what-it-can-put-back.md) — **a backup
  carries only what the import path can put back usefully.** ROADMAP 36g, the
  owner's *"if it isn't restored, it shouldn't be exported."* Supersedes **the
  final clause of [0067]'s decision 4 only** — that record justified keeping
  cook-mode ticks out of `SCOPED_BASE_KEYS` partly on the grounds that
  `collectPersonalData`'s catch-all *"still carries the raw key through a
  backup, so nothing is silently lost"*. Measured false: the sweep exported
  them and the import wrote them back under the **exporting** device's profile
  id, twelve-hour expiry and all — restored uselessly, or onto the wrong
  person. `sync.js` was shipping them between devices for `sync-merge.js` to
  discard. 🛑 The fix the roadmap specified — add the base key to `EXCLUDED` —
  would have excluded **nothing at all while looking exactly right**, because
  `profileScopedStorage()` makes the real key `faves.p.<id>.checklist.v1`;
  matching moved to a suffix test that also catches profiles orphaned from the
  registry. `spare` now separates *excluded from a backup* from *exempt from a
  replace wipe*, which the origin is and a tick is not. Proved by four tests
  seen failing first, three of them again under a deliberate revert.

[0067]: 0067-a-tick-is-keyed-on-the-line-not-its-place.md
