# Cold review — everything that landed 2026-08-15 → 2026-08-17

- **Date:** 2026-08-17 (UTC), worktree `faves-fable-review`, off `5a4deb0`.
- **Reviewer:** Claude Fable 5, not the author of any line under review.
- **Scope:** commits `2974284^..5a4deb0` — 439 commits in three days across
  five parallel sessions; 13.7k lines of JS under `site/js`, 71k lines in
  the tree overall. Seven independent reviewers, one per subsystem, each
  told to REFUTE its own candidates before reporting; every finding below
  that says *fixed* was then reproduced by this session against HEAD before
  the change, and pinned by a test that fails on the old code.
- **Trigger:** the owner — *"do any cold reviews and Fable-dependent work,
  and check around the repo and the last 3 days; a parallel session is
  live."* No cold-review pointer was queued on the board, so this is the
  general pass.

## Headline

**Nine commits landed on `main`, every check green on the final tree** —
the twelve browser checks (`boot` 24 · `device` 20 · `cook` 75 · `addon` 12
· `branch` 33 · `to_top` 28 · `filter_row` 25 · `recipe` 29 · `served` 55 ·
`geo` 22 · `note` 19 · `sync` 16), `node --test` 1072/1072, and every
Python gate. **The verify list was red on `main` when the session opened**
(`test_tag_allergens.py`, since `5f85473`) — nobody had run it.

The serious findings cluster in **sync (Theme 9 v2, shipped that morning)**
— which was **not working in a real browser** and had three safety-class
data-loss paths — and in **the whitelists that shed a field added after
them** (the sync code exported into the plaintext backup; order notes
dropped on import). The rest is one safety-adjacent composition bug already
on the board, five wiring faults a unit test cannot see, a data-loss data
fix, and nine places where the current-truth docs said the opposite of the
code.

## Fixed this session (all on `main`)

| # | Commit | Finding | Class |
|---|---|---|---|
| 1 | `a47ee9e` | `test_tag_allergens.py` was **red on main** since `5f85473` added `df-option` to the Berhampore row its mutation pins. The commit's own verify line listed six checks and not this one. | verify list |
| 2 | `8e3b35c` | `composeTags` resolved a claim by **first list membership**, so a `vg` dish was judged against `CONTRADICTS.v` and kept its vegan claim beside dairy — three faces reproduced (stated-and-contradicted survives · dairy-only dropped as *not-stated* · a `v`-only aioli keeps a vegan claim). Live instance of face 2 in the corpus (S&F Tawa Garden Salad + Halloumi told the reader "we can't say"). Also the refused fourth sauce **replaced** the peanut warning. Board Theme 14 item; `addon_check` +1. | safety |
| 3 | `2b391b3` | **The sync bearer code was in the backup file.** `faves.sync.v1` / `faves.sync.base.v1` landed after ADR 0074's catch-all sweep; "Save a copy" wrote the code to plaintext JSON and an import silently paired the importing device to the exporter's group. Excluded, spared by replace, literals pinned to `sync.js` by test. And `sanitiseOrderLines` dropped `note` and `currency` — two lines differing only by note collapsed on restore. | privacy / data loss |
| 4 | `7ce2cc5` | `quantity.js` scaled *"1 can coconut cream and 1 can coconut milk"* to *"2 cans … and 1 can"*, status **scaled** (the half-scaled line ADR 0076 refuses); `leadBranch` read `closing-soon` as not-open so the nearest branch closing in 30 min lost the lead; the geo dialog's `close` listener recorded **Allow as a decline** and re-showed the banner over "blocked". `geo_check` +2 scenarios (page-level stub, because a CDP grant fires `perm.onchange` first). | wiring |
| 5 | `e340d62` | **Sync, five faults.** (a) Worker set `Access-Control-Expose-Headers: ETag` on the **preflight only** — the browser read `etag` as null, sent PUTs without `If-Match`, was refused 412 forever once a blob existed: *sync could not write twice*; verified live with curl. (b) a successful sync **re-armed its own debounce** — one KV write per 20 s per tab, forever, masked only by (a); the old engine hangs the new test. (c) SAFETY: a change made **while a cycle was in flight** was overwritten by the pull, then pushed everywhere. (d) SAFETY: `mergePersonal` kept a profile deleted on the other device with its **allergens wiped**. (e) the profiles registry was never reloaded after a pull. Plus a false needs-decision sentence, and three tests whose 12-char code never reached the server they built. | 🛑 sync |
| 6 | `a49fcca` | Thai Tara's ten renamed dishes had no `formerIds` — every pre-intake heart/rating on them silently detached (ADR 0051's loss). And `validate.py` now **warns** on a dish claiming `gf` beside `contains-gluten` (one live row, Rock Yard). | data |
| 7 | `7c13b6c` | Docs said sync was unwired ×4, DESIGN mandated the removed bar and the removed pill, STRATEGY said the repo is private, CHANGELOG had the pill and no `df-option` line, six stale counts. **And the tucked Pick-for-us button was invisible but focusable** — un-tucks on focus now. | docs / a11y |
| 8 | `d5e358a` | Search did not fold macrons: *kumara* found 7 dishes, *kūmara* 3 different ones, *pauatahanui* nothing. Length-preserving fold, both search boxes. `alarm.tone()` resumes a non-running context. | ux |
| 9 | `74c7a13` | Board index regenerated — atelier's generator moved under every session (peer landed the second regen, `1d28f00`). | floor |

## 🎯 Owner decisions (three)

1. **Redeploy the sync Worker.** The source fix is on `main`; the deploy
   uses the estate credential (`cloudflare-faves-sync-deploy` in the
   keychain, ids in the estate inventory) and this session's tool policy
   declined to run it. Until it is redeployed **sync still cannot write
   twice** in any real browser — the app-side fixes make it correct the
   moment the Worker answers with the header. One `wrangler deploy` from a
   filled config outside the tree; the previous session's recipe stands.
2. **Rock Yard "Vietnamese Salad": `gf` (venue's label) beside
   `contains-gluten` (the sweep).** The warning is present, so it fails
   safe; the Gluten free filter believes the claim. Which is true?
3. **A locale of `GB` resolves to imperial, and imperial rewrites every
   oven temperature to °F.** UK ovens are °C. Either GB → metric, or split
   distance units from oven temperatures. `locale.test.js` pins the current
   behaviour, so it was a decision once; it may not have been about ovens.

## Recorded, not fixed — handed to the board (peer session holds the store)

**Cook mode / recipe** — cook mode's "What you need" and the spoken step
ignore the scale chosen on the recipe page (2× above, 1× in the sheet; the
planned home is 17c). Closing the sheet discards every running timer and
its bell — 10 of 24 recipes carry their timer on the LAST step, whose
primary button is "Done" and closes; a reload or an iOS tab discard loses
them too (persist `endsAt`, or confirm before closing). `cook.js`'s
"ambiguous single word" rule hides the line a step actually uses on three
real recipes (Plum Cake "butter", Self-Saucing Pudding "cocoa", Pad Thai
"peanuts") — the header's "only ever fails to hide" is false; the unit
fixture omits the line that would show it. Checklist key can fork on a
former venue id (dormant).

**Home / hours** — Settings promises "hide places further than…" and the
idle hint says "will start hiding places"; nothing hides, ranking sinks
(owner's call which side is wrong). `rankVenues` and the "Open now" filter
ignore `lifecycle` closure while the card wears the badge and the dice
refuses it (latent, no closed venue today).

**Data** — BurgerFuel: 13 burgers with no `contains-gluten` while their
"lightweight" twins carry it (tagger's `\bbuns?\b` cannot match
"Cheeseburger"); McDonald's 31/41 items with no `contains-*` at all; 21
unresolved twin-allergen warnings; McDonald's 41 null prices with no
`needs: price` so `needs.py` cannot see them; `revisions` ships in the
precache and **no screen reads it** (ADR 0047: name the screen first).

**Gates** — `validate.py` accepts unknown keys at top level / section /
item / `locations[]` (its own comment says otherwise), empty `cuisine`,
overlapping hours, NaN price (traceback, not error); `split_data --check`
skips 53 of 55 venues and cannot see a row deleted from the record store;
five of `test_validate.py`'s 113 mutations pass whatever the guard does
(the harness checks exit code / any-warning, never *which*); `fetch_fx` has
no plausibility band and a rate the source stops publishing vanishes green;
CI does not run `split_data`, `fetch_fx --check`, `test_tag_allergens`,
`test_registry`, `test_find_addons`. `sw.js`'s `!res.ok → throw` install
guard is decorative on Pages (missing paths return `index.html` with 200 —
curl'd) and no tool checks SHELL ⊆ disk; `/restaurant?id=` (the 308
canonical) misses the precache offline.

**Sync (remaining, lower)** — the error view offers only Retry (no "turn
off"); rating/setting conflicts and `profile-identity` are reported by the
merge and surfaced nowhere; an older app version drops allergen keys it
does not know and the same-person deletion rule then un-flags them on the
newer device (bites only when the allergen list grows while a PWA lags);
worker comment says 128 bits of blobId entropy — it is 65 (ADR 0061's "no
work factor" rests on it). Sync's `active` flag is device-local by design
and was making every cycle a write; `sameSnapshot` now ignores it.

**Docs / ADRs** — five in-window partial supersessions leave the older
record unmarked (0069→0083, 0080→0085, 0068→0069, 0045→0075, 0017→0074);
0079 was never allocated and is not mentioned; MODEL-ECONOMICS's read-path
number (~27k) is stale by ~2× (ARCHITECTURE alone is 63.9 KB); ADR 0076's
status table is now 157/42/5 at 2× after fix 4; the `phone`/`address` dated
series ARCHITECTURE describes is refused by `validate.py`.

## 🔎 Findings about the guards themselves

- **`sync_check` did not catch the Worker's CORS fault, and could not
  have**: its fake server exposed the header on every response *and*
  accepted a PUT with no `If-Match`. Its author knew the header was
  load-bearing — the comment says so — and modelled the contract
  correctly; the Worker did not meet it, and the guard could not tell. The
  fake is now as strict as the Worker: with its Expose-Headers removed the
  check fails 5+ assertions in the real browser. **A guard's fake that is
  more permissive than the thing it stands in for passes on exactly the
  fault it exists to find.**
- The 12-character sync code in three engine tests: `normaliseSyncCode`
  rejects it, so `deriveSyncKeys` threw before any fetch and three tests
  about a refusing/dead server passed without reaching one. Each now
  asserts the server was reached.
- `addon_check` failed once under a seven-agent load (`FAIL a flagged
  allergen gets the loud treatment`, exit 1) and passed 5/5 afterwards. Not
  a transport timeout (those exit 2 now); not reproduced. Noted, not
  explained.
- `cook_check` aborted (exit 2) once under the same load and ran 75/75
  clean afterwards — the transport class CLAUDE.md describes.

## Method notes

Seven finder agents (sync · cook/recipe · menu/allergen · home/search/hours
· SW/data/settings/share · Python gates + data · docs-vs-code), one shared
brief, no seeded questions, each barred from browser checks (ports shared
with a live peer) but free to run unit tests and Node probes. Every
candidate the orchestrator acted on was re-derived here first; six agent
findings were duplicates across slices (composeTags ×2, sync-code-in-backup
×2), which is corroboration by independent readers, not by echo. Version
bumps read from `origin/main` in the same minute as each commit; a
generator change upstream blocked commits twice mid-session, resolved by
regenerating the index alone.
