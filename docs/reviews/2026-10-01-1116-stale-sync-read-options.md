# A stale sync read: the defect, the options, a recommendation

Evidence and options for roadmap `510/340`, and the answer `510/320` was
waiting on. 2026-10-02 NZDT (session `faves-4f`, branch `510-340`). Nothing is
built and nothing is deployed. This asks the owner for a design ruling.

## The answer first

- 🔎 **The defect is real and easy to trigger.** It needs two network locations
  inside one minute, for example a phone moving from Wi-Fi to mobile data. Then
  sync can **delete a heart you just added**, **bring back one you just
  removed**, or **undo the recipe move on both devices**. Four tests reproduce
  it with the real app code and the real Worker. All four fail today.
- 🔎 **It does not explain 320.** The owner saw old hearts back **beside** the
  moved ones, with nothing removed. Stale reads never produce that. In
  8,000 randomised runs of his sequence they undid the move 378 times and put
  an old heart beside its moved copy **0 times**. Three other routes do produce
  it (see *What does explain 320*).
- 🎯 **Recommendation: Option B, one Durable Object per sync code.** It is the
  only option that closes the whole class, including the case where the Worker
  itself accepts a write built on a stale read. It protects phones still on old
  builds without waiting for them to update, and it fits the current Cloudflare
  plan with no extra spend.

## The defect in plain language

**Terms.** *Workers KV* is the Cloudflare store holding each person's encrypted
sync copy. It is *eventually consistent*: each Cloudflare location keeps a read
for 60 s, so a request through a location that read the copy in the last
minute gets **that** copy, whatever has been written since. Cloudflare's docs
say so (sources below). A *version* is the random id the Worker gives each
write (the HTTP `ETag`). The *base* is the copy two devices last agreed on.
Each sync compares three copies: the base, this device's data, and the copy it
just read.

**What goes wrong.** A version is a random id, so it carries no order. Given an
older copy, the client cannot tell "older than what I just wrote" from "another
device changed this", and merges it as a change:

- **A heart vanishes.** The phone hearts *Laksa* and syncs through home Wi-Fi.
  Ten seconds later it syncs through mobile data, where the copy from before
  the heart is still cached. *Laksa* is missing from that copy, so the merge
  reads it as removed on another device.
- **It becomes permanent.** If that second sync also has something to send, it
  writes. The Worker's check that nobody wrote in between (`If-Match`) reads
  through the same stale location, so it passes. The older copy, minus *Laksa*,
  replaces the newer one everywhere.
- **The mirror.** An un-heart followed by a sync through the stale location
  brings the heart back, on both devices.
- **The owner's import.** The laptop writes the move. Inside the minute, the
  phone hearts something through a location still holding the pre-move copy.
  The Worker accepts the phone's write, and the laptop's next pull reads it as
  "the phone removed the moved hearts and added the old ones". **The move is
  undone on both devices.**

That last case is a *lost update*: two writes each passed a check that read
stale data. KV cannot prevent it because it has no *compare-and-swap*, an
atomic "write only if it is still version X". The Worker's README and
`handlePut` have recorded this limit since the Worker was built.

## The evidence

`tests/stale-sync.test.js`, over `tests/stale-sync-harness.js`. The harness
drives the real `site/js/sync.js` against the real `worker/sync-worker.js`. Its
`EdgeKV` stand-in follows the documented model: a 60 s read cache per location,
and a write seen at once where it was made.

| Test | Today |
|---|---|
| a heart is not taken off the phone by a pull 10 s later that reads an older copy | ❌ fails: removed (`favouritesRemoved: 1`) |
| a heart, then a second heart 10 s later through another location: the first is not lost | ❌ fails: lost on both devices |
| an un-heart, then a heart 10 s later through another location: the removed heart stays removed | ❌ fails: back on both devices |
| the recipe move is not undone by the other device's stale read | ❌ fails: undone on both (old hearts back, moved ones gone) |
| 40 seeded runs of the owner's sequence: no old heart beside its moved copy | ✅ passes |
| positive control: a third copy of the app with no base, or an additive restore, **does** make that union | ✅ passes |

**The fuzz** (`fuzzOnce`; seeded, so any run replays by its seed). Each run
plays the owner's runbook on two devices: pair, remove three hearts shortly
before (so an older copy holding them can still be cached), steps 2–6 of the
import, then 3–14 random pulls, hearts and un-hearts on either device. It
varies: whether a location sees its own writes; 2–4 locations; a 0, 30% or
100% chance per request of a device changing location; 1–90 s between steps;
and a core copy with or without a last-write time (the 330 trigger).

| Build (client + Worker) | Runs | Read something stale | Move undone at the end | Old beside moved, ever | A heart lost | A removed heart back |
|---|---|---|---|---|---|---|
| today's (`5300e09`) | 3,000 | 2,616 | 150 | **0** | 1,127 | 899 |
| live at the sighting (`2f99ade`, before PRs #76 and #77) | 3,000 | 2,649 | 133 | **0** | 1,167 | 887 |
| today's client, sighting-time Worker | 2,000 | 1,760 | 95 | **0** | 730 | 627 |

The lost and revived counts come from a harsh parameter space with many writes
a minute apart. They show the mechanism is easy to reach. They are **not** a
measure of how often it happens to a real person.

**Why the zero is structural, not luck.** The three-way merge keeps "exactly
one of the old and the moved heart" whenever each of its three inputs holds
exactly one. With two devices that each have a base, every copy that can exist
starts that way: before the move, after it, stale or fresh, the server's or a
base. So no schedule of stale reads can produce the union. Only something
outside the three-way merge can.

## What does explain 320

Each of these was run in this harness and leaves the old **and** the moved
hearts on **both** devices, with nothing removed:

1. **A third copy of the app with no sync base**, holding an older list, that
   syncs with the same code. Safari and a Home Screen app on one iPhone keep
   separate storage, and so do two Chrome profiles. This is the only route
   that also adds **other** since-removed hearts, which fits the owner's
   "3 others" (`320` reproduced it the same way).
2. **"Apply" instead of "Replace"** when restoring the backup taken before the
   move. Apply adds and never removes. With the backup taken just before the
   move, it adds only the old hearts. To add the 3 others too, the backup would
   have to be an older one.
3. **A sync base that will not load** (corrupt). Then the next sync treats
   everything as new. No route to this has been seen. It is listed because it
   produces the shape, not because it is likely.

🎯 **For the owner, to tell these apart.** After 21:15 that evening, did you
use **Apply** on any restore, or type the sync code into Faves anywhere (for
example after turning sync off)? On the iPhone, is Faves open both in Safari
**and** as a Home Screen app?

## The options

**Old clients matter for every option.** Phones keep running the build they
loaded until the app is next opened and updates. Every option is judged on what
happens while some devices are still on today's build.

### A. The client remembers what it has already replaced

On each successful write, the client records the version it replaced. It keeps
the few most recent, enough to cover KV's minute. It then **never merges a read
of one of them**: it writes nothing, keeps its change waiting, and tries again
after the cache window. The item's first two options are versions of this. A
counter in the copy says the same thing. "Refuse only the base's immediate
predecessor" is the narrowest form; it misses two writes inside one minute.

- **Fixes:** tests 1–3, where one device re-reads a copy it has already moved
  past.
- **Does not fix:** test 4, the import undone. The phone never saw the laptop's
  write, so it has nothing to remember. The Worker still accepts its stale
  write. Not 320's shape either.
- **Extension A+:** the Worker records, as metadata, the version each write
  replaced (from `If-Match`, which every client sends). A client that finds a
  *sibling* of its base can then merge against their common ancestor, if it
  still holds that copy. That repairs test 4 on the laptop's next sync. It
  needs a Worker deploy, and the new header has to be exposed to the browser
  (the 2026-08-17 lesson). 🛑 It must not fall back to "no base" when it lacks
  the ancestor: that fallback **is** 320's union.
- 🛑 **Do not put the counter or the parent inside the encrypted copy.** Old
  clients carry fields they do not know through unchanged (ADR 0146 §3). An old
  client's fresh write would then carry the previous copy's counter, look old,
  and be refused, so its changes would never reach the other devices. Only the
  Worker sees every write, so only the Worker can stamp them safely.
- **Old clients:** keep the bug until they update. Their writes are safe for
  new clients to read under A+, and not under a client-sealed counter.
- **Effort:** A is small (client only, about a day with tests). A+ is medium
  (client and Worker), and the fork logic is subtle.
- **Running cost:** none.

### B. One Durable Object per sync code (recommended)

**Terms.** A *Durable Object* is a small Cloudflare program with its own
storage. Exactly one instance exists per name, and every request for that name
goes to it in turn. Reads always see the latest write, so its `If-Match` check
is a true compare-and-swap.

The Worker keeps its exact HTTP interface: GET and PUT, `If-Match`, `ETag`, and
the bucket report. Behind it, each sync code's core copy and recipe buckets
live in one Durable Object, named from the same `blobId` KV uses. It sees only
ciphertext and logs nothing, as now.

- **Fixes:** all four tests. A stale read cannot happen, and a write built on an
  old version gets 412 and goes round again (the retry from `510/070`). It also
  closes the race `handlePut` and `refreshFamily` document, and the residue
  `330` left open. Re-arming expiry becomes a Durable Object alarm instead of a
  KV rewrite.
- **Does not fix:** 320's union. A third copy with no base, or an additive
  restore, is not a consistency fault, and no storage choice changes it.
- **Old clients:** fixed on the day the Worker deploys, with no app update,
  because the interface is unchanged. **This is B's decisive advantage.**
- **Migration:** on its first request, each Durable Object copies that user's
  copies in from KV. 🚩 That one-time read can itself be up to a minute stale,
  so a user who wrote in the minute before the deploy could meet this defect
  once. Deploy when nobody is syncing (Faves' usage is small), or have the
  object refuse to import a copy younger than a minute. KV stays as a
  read-only fallback until every copy has moved, then retires.
- **Risks:** a new Cloudflare primitive and a deploy step that needs the
  owner's go. One instance per code lives in one region, which adds latency
  for a device far from it (immaterial for Faves). The tests need a Durable
  Object stand-in.
- **Effort:** medium, about two to three days with tests and the migration
  path (estimated).
- **Running cost:** fits the current plan with no extra spend. Durable Objects
  with SQLite storage are on Cloudflare's free tier: 100,000 requests, 100,000
  rows written and 13,000 GB-s of run time a day, and 5 GB stored. On the paid
  tier they come with generous included amounts, then $0.15 per million
  requests and $1.00 per million rows written. Writes also get cheaper: KV
  allows 1,000 writes a day free (ADR 0017's scarce resource), against 100,000
  rows. Faves' use is far below either ceiling. The run-time figure is
  inferred, at roughly a tenth of a second per request; it is not measured.

### C. Shrink the window (a mitigation, not a fix)

Read KV with the shortest cache allowed, 30 s instead of the 60 s default, and
make the client wait out the window before writing after a read it did not
expect. This halves the window and closes nothing. It is listed so it is not
mistaken for a fix.

## Recommendation, with the reasoning

🎯 **B.** The deciding facts:

1. **Only B fixes test 4**, the import-undone case: the failure that already
   matters most, a whole intentional change reversed on every device. A cannot
   see it. A+ repairs it after the fact, and only when the losing device still
   holds the right ancestor.
2. **Only B protects devices on old builds**, because nothing on the device
   changes. Under A, every phone stays exposed until it updates.
3. **B removes a class of reasoning rather than adding one.** The Worker's
   README already names B as "the real fix", and the `330` re-arm rules were
   written to work around the same missing guarantee. A+ would add a third
   layer of version bookkeeping to the client.
4. **Cost does not separate them.** B fits the current plan and raises the
   write ceiling.

**Optionally, A first as a one-day stopgap**, if B cannot start soon. It closes
the single-device cases (tests 1–3), which are the commonest: one phone
switching networks. It becomes harmless once B lands. Its cost is a second
mechanism in the client to retire later. Without a stopgap, the exposure until
B ships is what it has been since sync launched, and test 4 has never been
seen live.

**320 is not closed by any option here.** It needs the owner's answer above,
and then a guard on whichever route it was. For a third copy with no base, the
guard is to ask before a first merge that would add hearts the server does not
hold. For Apply, the guard is to warn when the file is older than the last
sync.

## Sources

- Cloudflare, *How KV works*:
  <https://developers.cloudflare.com/kv/concepts/how-kv-works/>. Read
  2026-10-02 (page dated 2026-04-21). Changes "usually immediately visible" at
  the writing location and "up to 60 seconds or more" elsewhere. The read
  cache defaults to 60 s. KV is "not ideal" where values "must be read and
  written in a single transaction".
- Cloudflare, *Read key-value pairs*:
  <https://developers.cloudflare.com/kv/api/read-key-value-pairs/>. Read
  2026-10-02 (page dated 2026-06-22). `cacheTtl` minimum 30, default 60.
- Cloudflare, *KV pricing*:
  <https://developers.cloudflare.com/kv/platform/pricing/>. Read 2026-10-02
  (page dated 2026-04-21).
- Cloudflare, *Durable Objects pricing*:
  <https://developers.cloudflare.com/durable-objects/platform/pricing/>. Read
  2026-10-02 (page dated 2026-09-30). Free tier, SQLite storage only.
- Cloudflare, *Durable Objects limits*:
  <https://developers.cloudflare.com/durable-objects/platform/limits/>. Read
  2026-10-02 (page dated 2026-06-01).
