- [x] 🚩 **`linkscan` is blind to reference-style links, and it is an ENFORCED
      floor guard** `[S][docs]` — **claim DISCHARGED 2026-08-17: the local half
      is finished** (queued upstream, accepted as atelier `020/320`). The item
      stays open **blocked on that upstream fix**, not on anyone here; there is
      nothing to claim. ⏳ **owed upstream to atelier; nothing to fix
      locally.** — ✅ **superseded: the fix landed 2026-08-23 and this item is
      CLOSED 2026-09-20; see the dated note at the foot.** The two sentences
      before this one describe the state on 2026-08-17 and are kept as the
      record, not as the current truth.

      Found 2026-08-16 when `pathscan` (warn-only) caught a broken ADR
      link in a commit that `linkscan` (enforced) had just passed.
      🔎 **Isolated with a two-line probe, not inferred.** A file containing both
      `[inline](../../does-not-exist-a.md)` and a `[refstyle]` whose definition is
      `[refstyle]: does-not-exist-b.md` reports **exactly one** broken link — the
      inline one. A file containing *only* the reference-style link reports
      `✓ linkscan clean — every internal link resolves`. The whole syntax class
      is invisible to it, and the all-clear says the opposite in as many words.
      🔎 **Exposure here, measured: 26 reference-style definitions across the
      repo's markdown, and `docs/ROADMAP.md` alone carries 10 of them — all its
      `[ADR 00xx]` links.** So the repo's densest cross-reference surface is the
      one the enforced guard cannot see. **Currently none of them are broken**
      (the only miss is this session's own ADR 0074, which resolves when
      `cook-36` merges), so this is exposure, not damage — say so plainly rather
      than dressing it up.
      🔑 **Why it is worth an item anyway.** `pathscan` does catch these, but
      `pathscan` is **warn-only** in this repo's hook plane while `linkscan` is
      enforced. So a broken ADR reference can never block a commit, and the one
      guard that would have blocked it prints a clean bill of health. Two guards
      whose union looks complete and whose *enforced* half has the hole is worse
      than one honest guard, because the green line is what gets quoted.
      🛑 **Do not "fix" this by making `linkscan` stricter from here** — it is
      atelier's tool at `../atelier/tools/linkscan.py`, shared by every repo on <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tools/, not this repo's tree -->
      the floor, and a local patch would fork it. Queue it upstream under the
      queue-never-deliver rule, the way atelier's Track E item E9 was. Until it
      lands, the honest local mitigation is to prefer inline `[text](../../path.md)`
      over reference-style in new records.

      ✅ **QUEUED UPSTREAM 2026-08-17 and ACCEPTED — atelier item `020/320`.**
      Handed to the live atelier session with the reproducer, the affected
      syntax forms and the suggested definitions-not-usages fix shape; it
      **re-reproduced the fault from its own probe rather than take ours on
      trust** before filing, and wrote the item itself on the ground that it is
      accountable for what lands in its tree. Nothing further is owed from here
      and nothing is to be fixed here. It also placed it as the first instance
      of a *vacuity* class already on its board: not silence, but **an
      affirmative claim naming the property it did not check**.
      🔎 **Measured here, beyond the original filing:** the blind spot covers
      **all** reference forms — full `[text][ref]`, collapsed `[ref][]`,
      shortcut `[ref]` — plus the **image** form `![alt][ref]`, and it swallows
      **both** finding kinds, `missing-file` *and* `missing-anchor`. Exposure
      re-measured 2026-08-17: **36 reference-style definitions repo-wide, 11 in
      `docs/ROADMAP.md`** (up from 26/10 the day before), all of them its
      `[ADR 00xx]` pointers — the densest cross-reference surface we have is the
      one the enforced guard cannot see. **Zero are broken.** Exposure, not
      damage; say it that way and do not dress it up.
      🛑 **CORRECTION, and it makes this WORSE: `pathscan` does not fully
      compensate.** This item recorded that `pathscan` catches these and is
      merely warn-only. Atelier probed it and found the cover is **partial** — a
      reference definition whose destination carries a slash is flagged, and one
      that is a bare filename is **missed**. It verified the control first (a
      bare path mentioned in prose fired correctly), so the silence is a real
      miss and not the probe sitting outside its scope. So the compensating
      guard is itself holed, in the same syntax class, *and* warn-only. **Two
      guards whose union was assumed complete are both partial** — which is a
      sharper version of this item's own point than the version it was filed
      with, and it was found only because a third party probed a claim nobody
      had reason to doubt.

  ✅ **CLOSED 2026-09-20 (session `3e87e0bf`) — the upstream fix landed and is
  LIVE HERE, reproduced rather than taken on trust.** atelier closed `020/320`
  on 2026-08-23; this repo's `.githooks/pre-commit` calls atelier's tool by
  path, so the fix arrived with **no local change and no pin bump**.
  **The probe, because a closed item deserves better than a changelog line:**
  a scratch tree carrying one inline link, one reference-style definition
  pointing at a missing file, and one reference-style definition pointing at a
  real file. `linkscan` reported **exactly one** finding, and it named the
  **definition line** — the line the old scanner could not see. The good
  reference-style link was not flagged, so this is not a scanner mangled into
  refusing everything. <!-- pathscan:allow: the probe lived in a scratch tree outside the repo; its paths are deliberately absent here -->
  🔑 **The blocker was real when written and had been dead for four weeks.** An
  item blocked on someone else's work has **no local event that closes it**:
  nothing in this repo changes on the day the upstream fix merges, so the
  staleness is silent by construction. That is the finding worth keeping, not
  the regex — and it is the same shape as `220`'s hand-up, which also came back
  as doctrine with nothing here to notice. **A child's upstream filings need
  re-reading at every pin bump.**
