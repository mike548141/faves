## 2026-08-16 14:00 UTC — the ranking that had never run, and a valve nobody could read

An orchestration session that took one item off the queue — 37g, the ADR 0068
ranking rebuild, left deliberately unbuilt by the previous session — and found
that the thing standing in the way was not the code.

### The finding that reshaped the work

[ADR 0068] ratified the design and left item 4 for a fresh session: ask for the
device location on load, first visit, unexplained. Its Consequences section
named the risk itself — an unprompted geolocation prompt is the classic route
to a **permanent** denial — and named the remedy: prime it *"if the deny rate
looks bad in use"*.

**That trigger cannot fire.** Faves ships no analytics, no telemetry, no beacon
and no backend; `grep` over `site/js/` finds exactly two `fetch` calls, both in
`data.js`, both loading our own menu JSON. There is no deny rate and there is no
way to acquire one without building the tracking surface the whole app is shaped
to avoid. So the "revisit" was not deferred — it was decided, permanently, in
the direction of the on-load prompt, by a sentence that reads like a plan.

🔑 **A deferred decision whose trigger nothing can observe is not deferred, it
is taken — and taken quietly, which is the part that makes it a problem.** This
is the decorative-guard fault in a new place: not a check that always fires or
never fires, but a *promise to check later* against evidence that does not
exist. Prose costs nothing to write, and unlike a `#!#` marker it does not even
show up in a grep.

**A second gap sat beside it.** `navigator.permissions` appeared nowhere in
`site/`, so "never asked" and "blocked forever" presented identically to the
code — no origin, no distance, nothing on screen. Nobody could tell an app that
had not asked from one that could never ask again, the owner on his own phone
included.

Both were put to the owner with their costs stated rather than resolved quietly,
and both were ruled: **prime the ask, and build the block-recovery.** That is
[ADR 0069], superseding **item 4 only** of 0068; items 1–3 stand untouched.

### Shipped

- **One ranking, no sort control** (37g). `rankVenues`' two branches are one
  comparator: pinned → orderable → reachable → **availability → distance band →
  favourite → exact distance** → curated. The `<select>`, its group, its heading,
  its note and four `body.filters-inline` CSS rules are gone.
- **The location ask is a button, not an ambush** ([ADR 0069]). `permissions.query`
  on load — which prompts nobody — then: `granted` uses the grant silently,
  `prompt` offers `#geo-ask`, `denied` says so in place and where to undo it. A
  revoke mid-visit now also *takes the origin back*, rather than quietly ranking
  by coordinates someone just told the browser to stop us using.
- **37j** — "Everywhere" → "Any service", and the te reo re-glossed with it.

### 🔑 The headline stays the finding, not the feature

**His algorithm was built and had never once run.** The default branch of
`rankVenues` *is* availability → distance → favourite, and has been since
2026-07-08 — but `origin` was written in exactly one place, the sort control's
own handler, so the distance term was `Infinity` for every venue on every render
for the project's entire history. The feature shipped today is mostly the act of
connecting a wire.

### 🔎 A bug found by reading, that the rebuild would have made visible

`menu.js` reads the remembered origin (`recallOrigin`, sessionStorage); `app.js`
only ever *wrote* it. So home → a menu page → back left the menu screen ordering
branches by your location and the home list starting from `null` again. It was
invisible precisely because distance did nothing in the default order — the
moment distance counts, the same navigation silently changes the ranking. Fixed
by seeding `state.origin` at init, which also spares the granted path a visible
reorder on every load.

🔑 **The general shape: a dormant feature hides the bugs in everything wired to
it.** Nothing was wrong with `menu.js`, and nothing was wrong with `app.js` in
isolation. The defect lived in the disagreement between them, and it could only
be *seen* once the dormant half started running.

### 🔎 What the sub-agent found that the brief got wrong

Two corrections, both worth more than the code they changed.

1. **The Infinity/NaN defect flagged in the brief as "most likely" does not
   exist.** Subtraction was reintroduced on the buckets and all 39 tests still
   passed: `Infinity - Infinity` is `NaN`, `NaN` is falsy, so a `||` comparator
   chain falls through to the next key — which is exactly what a tie should do.
   The safety is a property of the *chain*, not of the key. `cmp()` was kept
   anyway, but the comment now says why rather than claiming a corruption nobody
   could reproduce. 🔑 **An orchestrator's confident warning is a hypothesis; it
   earns its comment only after someone tries to reproduce it.**
2. **The brief's worked example was arithmetically wrong.** *"Two open venues
   100 m and 300 m apart (same 400 m band)"* — under `Math.round(dist / 0.4)`,
   0.1 km is band 0 and 0.3 km is band 1. Bucketing partitions space at **fixed
   edges**; it does not measure the gap *between* two venues, so any two venues
   inside 400 m can straddle a boundary. 🚩 The error is conservative in the safe
   direction — bucketing can only *under*-apply the heart, never lift a favourite
   above something meaningfully nearer, which is the defect ADR 0068 existed to
   prevent — and a tolerance ("within 400 m *of each other*") cannot replace it,
   because proximity is not transitive and so is not a sort key at all. The test
   file pins the boundary case as a known property.

### 🔑 How "unchanged" was established, and why reading the diff was not enough

The no-origin path is what a refused permission gets, so a regression there
would land on exactly the people who said no. The old `ranking.js` was extracted
from `HEAD` and run head-to-head against the new one over **4000 randomised
lists** — mixed stubs, recipes, coordless and coordful venues, favourites, every
`favBoostKm` and `farKm` value — with **0 mismatches**. The guards were then
verified by breaking them: four mutations, each caught (distance leading
availability, the favourite tiebreak removed, raw distance for the bucket, the
10 km credit reinstated).

### Working alongside a peer session

A second orchestration session ran throughout, in the primary checkout, on the
recipe pass and the allergen sweep. Lanes were negotiated by message before
either side wrote. Two things came out of it worth keeping:

- **It corrected me, and it was right.** I claimed we would not contend on
  `SHELL_VERSION` because its allergen work was data-only; its recipe lane is a
  JS+CSS render change and bumps the same constant. Being wrong in the open cost
  one message and prevented the collision the previous session actually had.
- **The same fault, found independently, in a worse place.** Its recon found
  `tools/tag_allergens.py` declines to write on **6 of 55** venue files — every
  one carrying `addOnGroups`, because `patch_tags()` counts *every* `"tags"`
  array in the raw file including each add-on option's — and reports the decline
  as `SKIPPED`, exit 0. That is the third instance of the pattern found between
  2026-08-11 and 2026-08-17, on the one tool whose silence is a safety
  question. It is writing [ADR 0072] for
  the family, with the test that unifies them: **a guard is decorative when its
  output is the same whether or not the thing it guards is broken.** 0069 is a
  fifth face of it and links there.

