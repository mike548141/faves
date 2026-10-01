# Where the app talks more than its job needs

Survey for roadmap `510/130`, 2026-10-01. Measured against the tree at
`origin/main` (a1e0369), not guessed. Nothing in `site/` or `worker/` was
changed; the probes lived in a scratch folder and are not committed.

## The short version

The app is **quiet where it counts**: an open menu makes no requests, runs no
timers and touches no storage; warm page loads make one 140-byte request; the
cross-tab listeners are all filtered by key. The chatter is in three places.

| # | Where | What it costs today | Who feels it |
|---|---|---|---|
| 1 | **Sync server reads** | 9 KV reads per page load with sync on; 26 reads + 1 write per heart. The Worker probes 16 recipe buckets on every write and the client asks about 8 on every read, **for users who have no recipes at all** | the free tier, then the bill |
| 2 | **Every dish re-renders on every heart and rating** | one heart = 795 DOM changes; one rating = 2,430 and **~600 ms of main thread at 4x CPU slowdown** on a 264-dish menu | the phone in your hand |
| 3 | **First visit downloads the app twice** | 267 requests, ~1,524 KB gzip; ~600 KB of it (about 40%) is a second copy of files the page had just fetched | a new user on mobile data |

Then six smaller ones (a request on every page navigation, an unthrottled
sync pull on every page load, a pull that rewrites storage when nothing
changed, twelve pointless storage writes per page load, a cross-tab echo, a
timer that never stops). Fixes are proposed at the end, ranked.

🔎 **One finding changes how to read ADR 0017.** That ADR designed sync
around the 1,000 writes/day ceiling. On these numbers the 100,000 **reads**/day
ceiling arrives at about the same scale (roughly 500 to 600 daily sync users,
on my assumptions below). Fixing reads moves the ceiling to writes alone.

## How it was measured, and what that does not tell you

- **Browser:** headless Chrome through `tools/lib/browser.mjs`, 390 px wide, a
  fresh profile, the real `site/` served by the repo's static server. Requests
  counted at the server; `localStorage` calls, timers and DOM changes counted
  by instrumenting the page before any script ran; main-thread time from
  Chrome's own metrics.
- **Sync:** the **real** `worker/sync-worker.js` behind a local server, with a
  counting stand-in for KV. Every KV read and write is counted per request.
  A second harness in Node ran the real `createSync` against the real Worker
  with 0, 20 and 200 recipes.
- **Sizes** are gzip level 6 of the files on disk. The local server has no
  compression, no ETags and no 304s, so **bytes on a real deploy will be
  smaller** (Cloudflare serves brotli) and conditional requests will cost
  headers only. Request *counts* are exact; byte figures are estimates.
- **CPU** is the desktop's, plus one run with Chrome's 4x CPU throttle. That is
  a stand-in for a mid-range phone, not a phone.

Not measured, and why:

| What | Why not |
|---|---|
| Real Pages behaviour (304s, brotli, HTTP/2) | needs the deployed site; local server has none of them |
| Cloudflare's edge-injected visit beacon (ADR 0134) | injected at the edge, absent locally; owner-ruled, so not proposed for change |
| Real KV latency and eventual consistency | needs the deployed Worker; the stand-in is strictly consistent |
| Battery | no instrument here; the timer and wake-up counts below are the proxy |
| Safari | not available to the harness |
| Whether Chrome's service worker restarts between navigations | inferred from the ~30 s idle rule, not observed (affects item 5) |
| Why Chrome re-sent a CORS preflight before each `PUT` | observed 3 of 3 times at 1 to 3 minute gaps despite `Max-Age: 86400`; cause not established |

## Findings, ranked

Values are per action unless stated. "R" is KV reads, "W" is KV writes.

### 1. The Worker and client probe for recipe buckets that do not exist

| Action (user with **no** recipes) | Requests | KV R / W | Measured by |
|---|---|---|---|
| Page load or resume, nothing changed | 1 `GET` | **9 R** | browser + real Worker |
| One heart, synced | `GET` + `OPTIONS` + `PUT` | **26 R, 1 W** | same |
| First sync on a new device | `GET` + `OPTIONS` + `PUT` | 26 R, 1 W | same |

Why: a `GET` carrying `?buckets=8` reads the core copy plus eight buckets
(`handleGet`). A `PUT` then reads the current copy and `refreshFamily` reads
the other **16** possible keys, because `MAX_BUCKETS` is 16 while the client
uses 8. None of those keys exist for a user without recipes. The values are
read too, only to get their metadata.

For a user **with** recipes (200 recipes, 300 hearts, Node harness):

| Action | KV R / W | Bytes KV hands the Worker | Bytes the phone moves |
|---|---|---|---|
| Pull, nothing changed | 9 R | **227 KB** | 3 KB down |
| One heart | 26 R, 1 W | **455 KB** | 3 KB down, 3 KB up |
| One recipe edited | 43 R, 2 W | 682 KB | 3 KB down, 32 KB up |
| First sync (all 8 buckets written) | 162 R, 9 W | 1,009 KB | 233 KB up |

⚠️ The last column is the thing to watch: the Worker moves up to 150x what the
phone does, to answer "has anything changed". KV bills per operation, not per
byte, so this is a Worker CPU and memory risk on the free plan (10 ms CPU),
**inferred, not measured**.

Capacity, as a model, not a measurement. Assume an active sync day is 10 page
loads, 3 resumes and 2 heart bursts: reads = 13 x 9 + 2 x 26 = **169**, writes
= **2**. Limits as recorded in ADR 0017 (not re-checked against Cloudflare's
current page): 100,000 reads and 1,000 writes a day.

| | Reads/day/user | Read ceiling | Write ceiling |
|---|---|---|---|
| Today | 169 | ~590 users | 500 users |
| After items 1 and 2 | ~8 | ~12,000 users | 500 users |

### 2. Every dish re-renders on every heart and every rating

`ratings-ui.js` and `favourites-ui.js` give **each dish its own subscriber**
("control lives for the page; no teardown needed"). One change calls all 264.

| Action, regal-chinese-restaurant (264 dishes) | DOM changes | Main thread, desktop | Main thread, 4x CPU |
|---|---|---|---|
| One heart | 795 | 64 ms | 99 to 264 ms |
| Un-heart | 795 | 30 ms | 99 ms |
| One rating step | **2,430** | **197 ms** (58 script, 29 layout) | **596 ms** (159 script, 107 layout) |

The hearts' `localStorage` cost is trivial (1 write, 0.2 KB). The cost is
rebuilding 263 controls that did not change. Larger menus and the home list
(`favourites.subscribe(render)` rebuilds 57 cards, 1,900 DOM changes) pay the
same shape. These subscribers are also never removed, which `menu.js` already
works around for one of them (`isConnected`).

### 3. First visit downloads the app twice

| Cold first visit, home page, then install | Requests | Gzip |
|---|---|---|
| Total | **267** | **~1,524 KB** (5,640 KB raw) |
| 90 files fetched by the page, then again by the install (`cache: "reload"`) | 90 | **479 KB** |
| `summary`, `search-index`, `fx`, `index` read by the page, then again as `?h=` | 4 | ~123 KB |

About 600 KB, roughly 40%, is the same files twice. This is the install doing
exactly what ADR 0056 and `_headers` ask: refusing the browser's cache after
the 2026-08-16 stale-shell incident. A `no-cache` fetch (revalidate, never
reuse blindly) would answer a file the page just fetched with a 304 and still
be safe from that incident; that is a ruling, because ADR 0056 says "never fill
the store from the browser's cache". Data files are already protected a second
way (`fetchVerified` hashes the bytes), the shell files are not.

Also here, **already planned, not re-reported**: the install precaches all 57
venue files (203 KB gzip) and the search index (116 KB). That is `510/060`.

### 4. A request on every page navigation, and the throttle does not survive a restart

Each data read starts `requestSync()`, which fetches `catalogue.json` with
`cache: "reload"` unless one started in the last 10 s. Measured: a page
navigation more than 10 s after the last makes **exactly one request**, 197
bytes (140 gzip); within 10 s, none. The bytes are nothing. The cost is a
network round trip and a radio wake-up on every screen of a session, on an app
otherwise served entirely from the phone. `lastSyncStart` lives in the worker's
memory, so once the browser stops an idle worker (inferred, about 30 s) the
10 s gap is forgotten. Resume is already well behaved (below).

### 5. Sync pulls on every page load, with no throttle

`sync.start()` runs on every page load (the site is three separate pages, so
home to menu to home is three starts) and on every return to the foreground.
Measured: menu load, home load and a foreground event each made one `GET`
(9 R) when nothing had changed. Compare the update check, which is gated to
once per 5 minutes. A person moving between screens 20 times pulls 20 times
(180 R). This is the biggest multiplier on item 1's reads.

### 6. A pull that changes nothing still writes storage

| Pull, nothing changed | `localStorage` written | Read |
|---|---|---|
| 30 hearts, no recipes | 0.6 KB (2 writes) | 1.4 KB |
| 300 hearts | 2.9 KB | 8.2 KB |
| 200 recipes | **9.1 KB** (2 writes) | **413 KB** (collects everything twice) |

Every pull rewrites the base snapshot with identical bytes and stamps
`lastSyncedAt`. `collectPersonalData` runs twice per cycle to catch an edit
made mid-sync. The 200-recipe case takes 13 to 25 ms of Node time, so perhaps
60 to 100 ms on a phone (inferred). Small for most people; it grows with
recipes, which is Theme 39's whole subject.

### 7. Twelve pointless storage writes on every page load

Six modules each call `safeStorage()` at load, and each call writes then
removes a probe key. Measured: **6 sets and 6 removes on every page**, on the
home page and on a menu. Each one fires a `storage` event in every other open
tab: a second tab received **12 events** while another tab loaded the home page
(0 repaints, because the listeners filter by key). Cheap per page, free to fix.

### 8. A second open tab pulls too

With one tab on a menu and one on the home page, a heart in the menu tab made
the home tab reload favourites (377 DOM changes) and then pull on its own
(`GET`, 9 R) 20 s later: 35 R in total against 26. The reload came from a
`storage` event, so the tab that did the write already owns the sync.

### 9. The search placeholder rotates forever

Home page, idle for 42 s: 6 timers, 18 DOM changes, about 200 ms of task time
including the compositor fade (desktop). It stops on focus and on typing; it
does not stop when the tab is hidden or after a few turns. Low, and the timer
is the only one the app leaves running.

## Checked, not chatty

| Area | Result |
|---|---|
| Open menu, idle 45 s | 0 requests, 0 timers, 0 storage calls, 0 DOM changes |
| Warm load, data | 0 requests for menus, summary, search index, fx (all served from the store) |
| Resume | gate holds: a focus event right after load made 0 requests. One real resume = 2 requests (`sw.js` check + catalogue), 12 KB gzip if answered in full, headers only on a 304 (inferred) |
| `localStorage` per page load | 20 to 46 reads, 0.1 to 1.1 KB, apart from item 7 |
| Cross-tab `storage` listeners | all filtered by key; a menu tab received 2 to 3 events from another tab's sync and made 0 DOM changes |
| Search index on the home page | fetch from store 6 ms, parse 2 ms, rebuild 1.2 ms (desktop). 523 KB to parse, but ~9 ms; not worth a lazy-load yet |
| Sync write coalescing | three hearts in one window made one `PUT` |
| Sync no-op | a pull with nothing to send makes no `PUT` |
| Refused write (412) | bounded to 3 rounds (`510/070`) |
| Reference recheck | user-tapped only; 1 + one request per distinct venue, ~3.5 KB gzip each |
| Cook mode | 1 s tick runs only while a timer runs; wake lock re-acquired on visibility only |
| Geolocation | one `getCurrentPosition` per ask, no watch |
| Images | immutable headers; cache capped at 240; the key scan on a miss is trivial |
| Update flow | `registration.update()` throttled to 5 min; fixed by `510/030`, not re-reported |
| Edge beacon | outside the code and ADR 0134 rules; not measurable here |

## Proposed fix items, ranked

Each is a separate item to file; this survey builds nothing. Costs are
before to after, by the owner's four. All savings are from the measurements
above; "inferred" is marked.

**A. Stop probing recipe buckets that do not exist** `[M] [sync][worker]`.
The client sends `?buckets=n` only when its own store holds recipes or the core
copy it holds records buckets; otherwise it sends none. A `PUT` carries
`?family=n` (the number of buckets the core copy records), so `refreshFamily`
reads `n` keys, not 16. Old clients keep today's behaviour. *Processing:*
unchanged for the phone, less on the Worker. *Storage:* none. *Network:* none
for non-recipe users; one extra round trip the first time a user's first recipe
appears. *Server:* a pull 9 R to 1 R; a heart 26 R + 1 W to 2 R + 1 W; recipe
users unchanged until item I. Risk: the contract grows a parameter, and a
bucket orphaned by an old client's race is detected on the next recipe sync
rather than every pull.

**B. Stop every dish re-rendering on every heart and rating** `[M] [perf][menu]`.
Subscribers compare the entry they show with the entry that changed (or the
stores report which key moved), and skip when it is not theirs; the home
list does the same. *Processing:* a rating step ~600 ms to a few ms at 4x
(inferred for the fixed figure; the unfixed one is measured); a heart ~100 to
264 ms to a few ms. *Storage, network, server:* none. Risk: every control must
still repaint on a cross-tab or sync change, which is what the existing
subscription is for; `device_check` and `focus_check` cover hearts and ratings.

**C. Throttle foreground and page-load pulls** `[S] [sync]`. Skip a pull when
`lastSyncedAt` is under 60 to 120 s old; always flush a pending write. *Processing:*
a few `localStorage` reads and one decrypt saved per skipped pull. *Storage:*
none. *Network:* 1 request per skipped pull (a heavy session: 20 to 3).
*Server:* 9 R per skipped pull; with item A, 1 R. 🎯 The trade is freshness: a
heart on another device can arrive up to that gap later, which is the owner's
call (ADR 0017 set 5 to 30 s only for writes).

**D. Make the install revalidate instead of re-download** `[S] [pwa][sw]`.
`PRECACHE_FETCH` becomes `cache: "no-cache"` for the first install only.
*Processing:* none. *Storage:* none. *Network:* a first visit drops by up to
~480 KB gzip (of 1,524; about 30%), replaced by ~90 header-only 304s
(~30 KB, inferred). *Server:* fewer origin bytes; same request count. 🎯 Needs a
ruling because it touches ADR 0056's "never fill the store from the browser's
cache"; the argument is that a revalidated 304 is the server's own word. Check
with the 2026-08-16 incident's reproduction before adopting.

**E. Persist the data-check throttle** `[S] [pwa][sw]`. Record the last check
time in the data store (not worker memory) and skip `syncData`'s catalogue
fetch inside a 2 to 5 minute window; resume and `SYNC_DATA` with `force` stay
immediate. *Processing:* none. *Storage:* one small record. *Network:* a
session of 20 screens goes from up to 20 catalogue requests to ~2 (the bytes
are 0.14 KB; the saving is round trips and radio wake-ups). *Server:* fewer
edge hits. Trade: a menu edit reaches an online phone up to that window later;
`fetch_check`'s "natural path" step must still pass, and ADR 0146's question
"how quickly does an edit arrive" gets a number.

**F. Skip no-op storage work in a pull** `[S] [sync]`. Write the base and
`lastSyncedAt` only when they changed; read the second snapshot only if a
cheap change marker moved. *Processing:* up to half the `collectPersonalData`
cost of every cycle (200 recipes: 413 KB read to ~207 KB). *Storage:* 9.1 KB
written per pull to ~0 (200 recipes). *Network, server:* none. Risk: the second
snapshot is what catches an edit made mid-sync; the marker must not weaken it.

**G. Probe `localStorage` once per page** `[XS] [perf]`. `safeStorage()` caches
its result for the page. *Processing and storage:* 12 `localStorage` writes per
page load to 2; 10 fewer cross-tab events per page load. *Network, server:* none.
No risk beyond the cache being per page, as it is today.

**H. A storage-event reload must not schedule a sync** `[XS] [sync]`. When a
store reloads because another tab changed it, it does not call `schedule()`.
*Processing:* one repaint-free reload instead of a pull cycle per extra tab.
*Storage:* none. *Network:* one `GET` per extra open tab per heart saved.
*Server:* 9 R per extra tab per heart (1 R after A). Risk: a tab whose sibling
dies before it syncs; the write is in `localStorage`, so the next load pushes it.

**I. Serve bucket versions from the core copy's KV metadata** `[L] [worker]`.
For users with recipes: the client sends the bucket versions it knows on each
core `PUT`, the Worker stores them in the core copy's metadata, and a `GET`
reports them from the one read. *Processing:* none on the phone. *Storage:*
under 1 KB of metadata. *Network:* none. *Server:* a recipe user's pull 9 R and
227 KB through the Worker to 1 R and ~3 KB (200 recipes, measured for the
first number, inferred for the second). Risk and why it is last: today's read
of the real buckets is what detects a bucket written without its core update
(KV is eventually consistent, ADR 0146 §2); this trades that detection for
cost and needs a design ruling, not just a change.

**J. Pause the search hint timer when the page is hidden and after a few
turns** `[XS] [home]`. *Processing:* ~5 ms/s of idle task time on the home page
to 0 when hidden or after, say, three turns (the 5 ms/s is measured on desktop
and includes compositor work). *Storage, network, server:* none.

**K. Sync write cadence** `[S] [sync]` 🎯 *owner ruling*. Writes are one per
burst, where a burst ends after 20 s idle. A person who hearts one dish a
minute for ten minutes writes ten times. Options: a longer idle window
(60 to 120 s) with the existing flush on hidden, or flush on hidden only.
*Processing, storage:* none. *Network:* fewer `PUT`s. *Server:* writes, the
ceiling that is left after A and C, fall by the burst-merge factor (not
measured; depends on real hearting patterns). Trade: another device sees a
change later, and a killed tab loses the *push*, never the data. Offered, not
recommended: there is no usage evidence to size it, and the ceiling is not
close.

**L. Promote the probes to a repo tool** `[S] [tools]`. The numbers above
were produced by two throwaway scripts. A `tools/chatty_check.mjs` with
fixed scenarios and asserted budgets (requests per cold install, warm load and
heart; KV R/W per pull and per heart; DOM changes per heart) would make
this survey re-derivable and stop the budgets drifting back, which is the
decorative-guard failure mode in reverse. Browser-driven, so not in CI per the
standing ruling.
