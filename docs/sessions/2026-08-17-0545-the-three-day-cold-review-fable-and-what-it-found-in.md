## 2026-08-17-0545 — the three-day cold review (Fable), and what it found in sync

Owner: *"do any cold reviews and Fable-dependent work, and check around the
repo and the last 3 days; parallel session live, take precautions."* Worktree
`faves-fable-review`, nine commits landed on `main`, the full record is
[`reviews/2026-08-17-0643-three-day-cold-review.md`](../reviews/2026-08-17-0643-three-day-cold-review.md).

✅ **What landed.** The verify list was red on `main` when the session opened
(`test_tag_allergens.py`, since `5f85473`); a composeTags fault already on the
board (a vegan claim judged against the vegetarian contradiction list); the
sync bearer code exported into the plaintext backup and re-imported as a
silent pairing; order notes dropped on import; a half-scaled recipe line, a
lost lead branch, Allow recorded as a decline; **five sync faults**; Thai
Tara's ten renamed dishes without `formerIds`; nine current-truth doc claims
that were the opposite of the code; macron folding in both search boxes; a
focusable-but-invisible button. Every one reproduced against HEAD first and
pinned by a test that fails on the old code. Final tree: 12/12 browser checks
green, `node --test` 1072, every Python gate.

🛑 **Sync (Theme 9 v2, shipped that morning) was not working in a real
browser.** The Worker exposed `ETag` on the preflight only, so the page read
it as null, sent every PUT without `If-Match`, and was refused 412 forever
once a blob existed — verified live with curl. Every Node-side check was green
because undici does not filter response headers by CORS, and `sync_check`'s
fake server both exposed the header on every response *and* accepted a PUT
with no `If-Match`. 🔑 **A guard's fake that is more permissive than the thing
it stands in for passes on exactly the fault it exists to find.** The fake is
now as strict as the Worker: remove its Expose-Headers and `sync_check` fails
5+ assertions in the real browser. Behind that fault, masked by it: a
successful sync re-armed its own debounce (a KV write per 20 s per tab,
forever), a change made mid-flight was overwritten by the pull and then pushed
everywhere, a profile deleted on the other device came back with its allergen
list wiped, and the profiles registry was never reloaded after a pull.

🎯 **Three decisions are the owner's**, in the record's own section: redeploy
the Worker (source fixed on `main`; the deploy uses the estate credential and
this session's tool policy declined to run it — until then sync still cannot
write twice); Rock Yard's `gf` beside `contains-gluten`; and whether GB really
means °F ovens.

⚖️ **Judgement calls, made narrowly.** The needs-decision copy promised
warnings for "every allergen flagged on either device" while nothing rendered
the union — I made the sentence true rather than make the union render,
because writing the union into local settings before the answer would corrupt
"keep mine" (it would keep the union). ADR 0060's "provisional union" describes
a value in the engine's memory only; flagged, not resolved. Cook mode ignoring
the recipe page's scale is real and user-visible and I left it for 17c rather
than bolt scale into the sheet without the design. The Worker was NOT
redeployed: the classifier declined the credential use and I did not route
around it.

🔎 **Two things about the process worth keeping.** (1) atelier's board
generator moved twice under every session mid-day; because `board` is
enforced, a stale index fails every commit regardless of what it touches. Once
I regenerated (`74c7a13`), once the peer did (`1d28f00`) after my policy
declined to run atelier's script directly — the peer's advice stands: *if
`board` fails on a commit touching nothing under `docs/roadmap/`, the generator
moved; don't look in your own diff.* (2) Seven parallel reviewers, one shared
brief, no seeded questions: two findings arrived from two slices independently
(composeTags; the sync code in the backup), which is corroboration by readers
who each opened the source. Their reports named 26 more findings than were
fixed; all recorded, board texts sent to the peer holding the store.

⏳ **Owed to atelier:** nothing new; pin bumped `98316f8 → 19eb0e2`
(15 commits, `docs/method/` untouched — measured at commit time, not earlier). <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->

### Addendum — three rulings taken, and units reframed as localisation

Owner ruled the three decisions the review put to him: **Worker redeployed**
(authorised; live two-device round trip with the real engine passes, second
write included — sync works end-to-end now); **Rock Yard keeps `gf`**
(`77726e2`, a correction); **GB → metric** (`f253812`) — then, minutes later,
the fuller steer: *"think of it as localisation, not simply imperial vs
metric… but I don't want endless Settings for each type of measure."*

🔎 **Research (CLDR, TC39), and the recommendation.** CLDR — the locale data
every browser ships — models this as **region × usage → unit**, and marks its
own metric/US/UK "measurementSystem" flag *deprecated in the next release,
replaced by enhanced preferences* (`supplementalData.xml`). Its
`unitPreferenceData` says, for the three usages Faves has: **length/road** —
GB miles above 0.5 and yards below; US miles and feet; everywhere else km and
metres. **temperature** — °F in the US only (weather adds BS BZ KY PR PW); GB
is °C. **volume/fluid** — US cups/tbsp/tsp; GB imperial pints/fl-oz; metric
elsewhere — but a recipe's quantities are the author's words and Faves scales
them without converting (ADR 0076), so this usage stays out of scope. The TC39
proposal to expose this through `Intl.NumberFormat({ usage })` is Stage 2
(2026-03) and ships nowhere; and browsers expose no OS "measurement system"
preference (`navigator.language` almost never carries `-u-ms-`), so region from
timezone/locale — which `locale.js` already derives — is the best signal there
is.

🎯 **Recommendation: zero new settings.** The units setting already has three
values — `local` (default), `metric`, `imperial` — so the *shape* the owner
wants exists; the flaw is that `local` resolves to one of two WORDS. Make
`localUnits()` resolve to a **usage table** derived from region — `GB →
{ distance: mi+yd, oven: °C }`, `US → { distance: mi+ft, oven: °F }`, else
metric — and have `units.js`'s formatters read the table (they already take a
`units` argument). Relabel `imperial` as **"US customary (miles, °F)"** so a
UK reader is never offered a word that would give them °F ovens; "UK" is
something Auto *does*, never a choice a person has to understand. Someone in
the UK who wants km picks Metric; someone wanting °F picks US. Effort **S**,
one ADR superseding 0029's binary. Sent to the peer as a Theme 18 item; the
interim GB → metric stands until it lands.

