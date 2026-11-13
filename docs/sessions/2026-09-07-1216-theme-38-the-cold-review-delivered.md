## 2026-09-07-1216 — Theme 38: the cold review, delivered

**Claim:** `490/010`, claimed on `main` (`de6d2b7`) before starting, as the item
asked: a fresh session, a written review, no build. Worktree `faves-38a`.

**Method.** Four independent read-only maps ran in parallel, each told to report
refutations first and to cite `file:line` — the model measured against the
corpus; every screen traced from field to element; every open board item read
together for collisions; and every citation in the brief opened at its source.
Every headline claim was then re-checked by this session at the named line and
every count re-run on `de6d2b7`. Nothing under `site/`, `data/` or `tools/` was
changed. The review is
`docs/reviews/2026-09-07-1216-theme-38-cold-review.md`.

### 🔎 The brief was wrong before the review began

The citation audit — run *before* any synthesis — found **eleven** of the brief's
sourced claims drift from or contradict their sources, and the pricing strand
written as if ADR 0089 had never been accepted. The worst: *"counter-vs-delivery
price already renders"* — the owner **removed** that render on 2026-09-06, the
day it shipped, and his reversal is recorded only in a `menu.js` comment. CLAUDE
.md's `focus_check` blurb and ADR 0089's own Decision text carry the same stale
sentence. Also: "153 prose price points" is 363 by the repo's own classifier;
"seasonality is not modelled" (it is — `available.season`, used by nobody);
"per-branch hours and nothing else" (contradicted by the brief's own strand 3);
"`310/010` ruled three sizes are three dishes" (an open item's conclusion, and
the owner's ask was the opposite); "per-branch closure is an open question"
(ruled 2026-08-22, `[L]`). 🔑 **A review that builds on its brief inherits the
brief's errors; auditing the brief first cost one agent and changed the answer.**

### What the review found

1. **The model has shapes it cannot choose between.** Beef-or-chicken is modelled
   four ways under four accepted records; a second price three ways; no rule
   tells intake which, and Abrakebabra added 14 more prose size ladders on
   2026-09-07 for want of one. Three themes claim the same shape.
2. **The payload carries what nothing renders**: `prices`/`priceChannels` (101
   dishes, 582 bytes gzipped), `revisions` (18), section `translations`
   (accepted, never read). ADR 0047's test fails on the newest field in the schema.
3. **The record store's identity keys are the wrong ones.** History rows key on
   section heading + dish name for **226 of 227 rows**; `split_data.py` adds the
   id only to rows written after ids existed and never re-keyed the rest. A
   permitted rename orphans the row. And `data/entities|people|history/venues`
   do not exist while `estimates|images|withdrawn` exist undocumented, two with
   no validator.
4. **The 300 KB first-visit budget is already exceeded by the home screen's JS
   alone (315 KB gzip, 72 of 85 modules statically imported)**; the payload is
   178 KB gzip and has grown seven-fold in raw bytes since 2026-07-15. The shell
   is twice the data. Nothing measures the budget and it does not say what it
   measures.
5. 🛑 **Six defects that are not modelling questions.** The worst is a broken
   privacy promise: `faves.geo.consent.v1` is exported in the backup and sealed
   into the sync blob, against `ARCHITECTURE.md` and `geo-consent.js`'s own
   words — **executed** with a Node probe against the real module, not inferred.
   Then: order lines hard-coded `NZD`; a deleted profile keeps its cook ticks; the
   compact contact bar reads the primary branch while the page reads the nearest;
   section translations unrendered; a cross-record `goesWith` that can dead-end.

### Filed, not built

Nine items `490/020`–`490/100`: the consent leak; the unrendered price fields
(owner: keep / move to `data/` / design a render); the record-store re-key
(engineering, recommended); one shape for a dish with choices (owner; the
review reads his 2026-08-17 "one mechanism" ruling as pointing at a `selects`
kind on an add-on group); a branch id (engineering, precondition for per-branch
closure); claim strength + a venue-level note (the two referrals into Theme 38,
with options); household stock as a boundary decision (owner; three of his own
rulings already fence it); the budget (owner's number, and a check whichever he
picks); five smaller defects. `490/010` closed as delivered, with a correction
line pointing at the refutations rather than rewriting its table.

### What the review says NOT to change

The two-store split; immutable seeded ids; `price` is the counter and one price
is shown; trends never displayed; `served` annotates; wall-clock hours;
union/intersect composition and the two tag axes; recipes as a `kind`;
parse-at-render quantities; `menus[]` held; no accounts; owner-supplied content.

### Close evidence

Pushed as branch `review-38a` → PR #12 (a branch push alone runs only the
floor): **8/8 checks green**, merged as `fd08add`. ✅ **`CI` and `floor` both
green on `main` at `fd08add`** (runs `34122019189`, `34122019794`).
Local: `validate.py` 57 valid / 77
warnings; `split_data --check` clean; `midnight_check` 68/68; the hook's
scanners on every commit in the worktree. No source, data or tool file changed.

### Owed

The owner's five decisions above. The docs-drift commit named in `490/100`
(DESIGN.md and ARCHITECTURE.md say four things the code stopped doing on
2026-08-16/17, and ADR 0089's Decision text needs a superseding note, never an
edit). Everything else on the board's owed list from the previous session is
untouched by this one.

