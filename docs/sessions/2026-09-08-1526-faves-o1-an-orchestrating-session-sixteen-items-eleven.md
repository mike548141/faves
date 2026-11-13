## 2026-09-08-1526 → 2026-09-09 — faves-o1: an orchestrating session, sixteen items, eleven ADRs

**Session `faves-o1`.** The owner asked for an orchestration session working the
roadmap backlog with sub-agents, then gave four ad-hoc asks mid-session. Every
delivering agent worked in its own worktree and landed by PR so CI ran before
each merge; this session merged, resolved every collision, and never
force-pushed.

### Delivered — sixteen items, each merged with CI green on its PR

| Item | What landed |
|---|---|
| `340/230` | A guard holding every allergen tag's reader-facing label in step across four JavaScript tables and Settings' avoid list |
| `490/020` | `faves.geo.consent.v1` kept out of the backup export and out of an import |
| `190/040` | The countdown counts real time across a DST transition (ADR 0098) |
| `490/040` | The record store joins on ids; three undocumented stores documented, two validated, four gates wired into CI (ADR 0099) |
| `110/050` | Eight food words and every rule's plural in the allergen sweep |
| `240/010` | The service-worker install guard can see a Pages stand-in; every precached path checked (ADR 0100) |
| `210/070` + `340/200` | A click waits for a still box; a starved wait buys one whole retry (ADR 0101) |
| `280/010` | `can_approve_pull_request_reviews` turned off, its precondition evidenced |
| `500/030` + `500/040` | A harvest reports its own coverage; the name index ADR 0090 promised (ADR 0102) |
| `500/050a` | Spices carries its verified date, and its 2023 dishes carry their own |
| `490/060` | A branch has an id (ADR 0103) |
| `200/070` | The picker names a substance once (ADR 0104) |
| `190/020` | A day may say nothing, and that is not Closed (ADR 0105) |
| `490/100` | Five smaller defects, all real, two filed with the wrong fix |
| `210/010` | Search ranks a facet match above a text match (ADR 0106) |
| `340/250` | The evidence's provenance is committed and the evidence is not (ADR 0107) |
| `340/190` | A click hit-tests the point it dispatches at (ADR 0108) |

Also landed directly: the Goldings Free Dive pin, 158 m out at house-number
geocode level, corrected after a full `audit_coords.py` run (74 fine, 1
correction, 6 review, 6 fill-review, 4 no-geocode); the coordinate audit
recorded on `270/020` and `330/020` as their standing re-check; and the
first-visit transfer budget withdrawn per the owner's ruling.

### 🛑 An unresolved merge conflict was live on the public `main` for a day

`docs/decisions/README.md` carried `<<<<<<<` / `=======` / `>>>>>>>` markers
around the ADR 0096 and 0097 entries, from PR #11's merge on 2026-09-07. Found
only because an agent opened the file to append to it.

**Four things that look like coverage all said green.** CI was 8/8 on that PR
and every commit after; `check_decisions.py` passed throughout because it asks
whether every record is *indexed* and a fence does not disturb that; no floor
scanner reads a line as a conflict marker and `wrapscan` cannot fire because the
marker is 14 columns; and a human read the file to author one of the fenced
entries. Fixed, swept (one file, corpus-wide), filed as `340/280`, and handed up
to atelier as **PR #73** because a conflict marker in a tracked file is true of
every git repository.

### 🚩 What parallel orchestration actually costs, measured

- **The ADR allocator collided four times.** Every agent checked and every one
  was right when it looked. Resolved by the repo's own tie-break — *fewer
  inbound references moves, cheapest repair beats precedence* — which sent the
  picker record from 0103 to 0104 **even though it had already merged to
  `main`** (3 refs against 10).
- **A bulk renumber corrupted a neighbour.** An agent moving its own ADR
  rewrote the citation of a *different* record in CLAUDE.md and `ci.yml`; both
  pointed at the wrong decision, live on `main` for three commits. Repaired in
  the merge that found it. The lesson is to edit specific references and prove
  with `git diff` that no other number moved.
- **Version constants collided repeatedly** (resolve by taking the higher of
  each), and this session twice wrote a roadmap item onto a number already taken
  in that section — caught only by listing the directory first.
- **A claim commit named three items and carried two**, twice, because the
  script split on a blank line four-line items do not have. A subject line is
  not evidence that a commit did what it says.

### 🔎 Findings that changed what an item said

- **`490/020`'s sync claim was refuted**: the encrypted blob never carried the
  consent flag, because the seal is built from a rebuilt object that drops
  `other`. The backup half was *worse* than filed — an import wrote it onto the
  receiving device. A neighbouring test had been passing vacuously since it was
  written.
- **`490/100`: all five defects real, two remedies wrong.** One would have
  reversed ADR 0067 and the 36g ruling by putting cook-mode ticks in the backup;
  the other was impossible as written. Its doc-drift list was itself partly
  stale — the "private repo" row it named had read *Public* for a day.
- **`340/250`'s own GPS measurement was wrong**, and the correction inverts its
  point: it read Spotlight's index, not the file. GPS is present on all four
  Simmer photographs and on **64 of 68** intake files. Its line calling the
  absence "luck rather than diligence" is backwards — the exposure was live and
  unlooked-at.
- **`340/190`(a) was three wrong diagnoses deep.** It is not an animation:
  measured inside the failing click, the button centre is at `y=40` on frame 0
  and at `y=-11` one frame later, so the settle loop calls a box stable and
  dispatches at a negative coordinate. The failure then surfaces on the *next*
  element — wrong element, wrong line, wrong cause.
- **`210/010` was NOT delivered by ADR 0068**, checked rather than assumed: that
  rebuilt the home-list ranker and search has never used it. The same
  disconnection means search still ignores lifecycle closure, filed as `210/080`
  — and sibling `030` reads as if it covers that and does not.

### The owner's asks, mid-session

**The intake audit** (read-only) answered *"have we harvested everything"* with
**no**: `intake/ingredients/raw_food_photos/` is not all pantry photos — 26 of
183 are recipes and a menu leaflet, 15 bursts carried no record, and nothing
joined the photograph population to the records. Five findings filed as
`500/010`–`050`; two delivered this session. ADR 0090's own GPS figures were
reproduced exactly (137 of 183, a 73 m × 51 m box).

**On why GPS is refused** he challenged the rule and was right that it
overreaches. Measured: all 137 GPS-bearing pantry photos sit at 4 distinct
points at 110 m resolution — a constant with a home address in it, not useful
metadata being refused. Meanwhile the useful half *is* harvested: 63 of 67 menu
photographs carry GPS at 12 distinct locations, used to sort photos to venues
and to evidence `verifiedBy: in-store`. Filed as `500/060`.

**Cook at Home as a venue with branches** — 🎯 **he ruled by EXPANDING the
model**, and his answer beat all three options offered: the shipped branch
matches **any** address or GPS (a wildcard, not an absence), private per-house
branches with real coordinates live in the user's own data, and a user may add
more than one home. Recorded verbatim at `470/050`; the one inference this
session drew is marked as such.

**Four decisions recorded on their items**: `490/030` design a render (the
fields stay, ADR 0047 now has a deadline not an exemption); `490/090` drop the
transfer budget (delivered); `490/070` design the venue note wider first; and
`490/050` recorded as a **lean, not a ruling** — *"I'm not sure, I'm leaning
toward your recommendation"* — because this repo has three instances of a record
ending up stronger than its source. His new idea, allergen and dietary tags at
venue and branch level, is filed as `490/110` with the three hard questions
ahead of the options.

### Close

✅ Tree clean, `HEAD` = `origin/main`, one worktree, no branches, no PRs, no
stashes. Board **70 open / 14 claimed** (every one of those 14 is a
long-standing part-done item, none of them this session's — re-counted at close;
the figures first written here were 69/16 and were wrong)  (14 of those claims
are this session's two in-flight agents plus long-standing part-done items).
🚩 Two agents were still running at the time of writing (`080/160` allergen
corpus holes, `340/150` degenerate-state fixtures); their claims are live on the
board and their outcome is recorded in the entry that follows this one.

