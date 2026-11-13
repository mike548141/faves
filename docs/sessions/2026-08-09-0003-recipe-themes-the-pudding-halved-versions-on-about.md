## 2026-08-09 — Recipe themes, the pudding halved, versions on About — Opus 5

Owner round 3. Two themes recorded, two changes built and browser-verified.

**Themes 17 (cook mode) and 18 (units).** The owner's four recipe asks plus a
research pass over current recipe apps. 🔎 **The research changed the order.**
Every app surveyed has converged on a **cook mode** — full-screen, one step at a
time, and `navigator.wakeLock` so the screen never sleeps mid-recipe. That is a
plain Web API, zero-dependency, offline, and it fixes the most annoying thing
about cooking from a phone; it went in as 17d with a note that if only one item
here is built, build that one. It is also the natural host for the owner's
step timers.

🚩 **Two of the owner's asks were recorded with a correction, not as stated.**
(1) **Cooking times must not auto-scale.** He asked for scaling to adjust
timings; bake and cook times are not linear in quantity, and for anything
meat-based an under-scaled time is a food-safety failure. Recorded as a *hint*
plus optionally authored per-scale times. (2) **The timer alarm cannot be
promised in the background.** Once an iPhone locks, a web app has no dependable
way to make a noise — so the timer is paired with the wake lock and the UI has
to be honest rather than silently failing to ring.

🚩 **The blocker on this whole theme is data, not code:** `serves` is set on
**3 of 24** recipes and `time` on **8**. Same shape as the empty `picks`
problem — the features render nothing until the owner supplies the facts.

**Chocolate Self-Saucing Pudding is single again.** The owner had written it up
doubled. Halved throughout — serves 12→6, bake 70→35 min, every quantity, and
the dish 3–4 L→1.5–2 L, which is implied by halving the mixture rather than
something he asked for. Two consequential edits worth flagging: "2 eggs"→"1 egg"
made step 2's "eggs" wrong (now "egg"), and the `desc` literally said "adapted…
to a double mixture", which had become false — now "Doubles well for a crowd",
keeping the fact that doubling works. Rendered and read back at 390 px.

**About now shows both versions**, per the owner's ask. `site/js/versions.js`
reads them from the **service worker's cache names** rather than declaring
constants: a second copy of a version number is a copy that can drift from
`sw.js`, and the honest answer to "have I got the new menus?" is what the device
has actually stored — a stale phone shows the stale stamp, which is the useful
signal (Theme 16). Covered by 9 unit tests including the mid-update case where
two shell caches coexist and `.83` must beat `.9` (numeric, not string,
compare). Verified over CDP end-to-end: fresh profile, SW installed, real click
on the About link, version rows read back — `App 2026-08-09.2` /
`Menus & prices 2026-08-09.1`, matching `caches.keys()`.

🛑 **A concurrent session was found mid-run and its work was left alone.**
Partway through, uncommitted changes appeared that this session did not make:
an allergen-tag sweep (gluten/dairy/egg) across five venue files and
`tools/tag_allergens.py` (+257 lines) — **including tag edits inside
`cook-at-home.json`, the same file this session was editing**. Per CONCURRENCY,
their work was neither absorbed nor worked around: only this session's own hunk
of `cook-at-home.json` was staged (via a filtered patch to the index, leaving
the working tree untouched), alongside files they had not touched.

**Resolved on its own, the right way:** by commit time their changes had left
this tree entirely — they had moved into a locked worktree
(`.claude/worktrees/faves-allergen-inference`, branched at `a2c0cf0`), where <!-- pathscan:allow: historical worktree path — existed when this log entry was written, since removed -->
the sweep has since grown to 15 files. Nothing was lost, and the surgical
staging turned out to be belt-and-braces rather than the rescue it looked like.
🚩 **For that session:** `DATA_VERSION` was bumped to `2026-08-09.1` here for
the pudding, so the allergen sweep needs its own bump on top when it rebases;
`SHELL_VERSION` is at `2026-08-09.2`. Their branch also predates this commit's
edit to `cook-at-home.json`, so expect that one file to conflict — the pudding
block and their tag lines are in different hunks, so it should resolve cleanly.

Gates: `validate.py`, `check_no_deps.py`, `gen_sbom.py --check`, `node --test`
(372 tests, 9 new). ⏳ **Owner:** the About version rows want a glance at 390 px.

