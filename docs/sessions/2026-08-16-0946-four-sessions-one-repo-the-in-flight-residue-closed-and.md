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

