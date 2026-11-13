## 2026-08-16 04:20 UTC — the guard the missed version bump earned

**The report.** The owner clicked "Malaysian" on a venue page, landed on
`index.html?cuisine=Malaysian`, and got all 48 places with the dropdown
reading "All cuisines".

**The verdict: the deployed code was correct, his browser was not.** Verified
against the live site on a fresh profile, twice — once navigating straight to
the URL, once walking the real journey (load home so the service worker
installs and takes control, open a menu page, *click* the link so the
navigation goes through the worker exactly as a tap does). Both gave
**"6 of 48 places"**, six Malaysian cards, dropdown set to Malaysian, no
console errors. `curl` confirmed the deployed `app.js`, `filters.js` and
`sw.js` all carry the new code at `SHELL_VERSION 2026-08-16.14`.

**Why his was stale, and the real defect underneath.** Earlier the same day the
FX merge changed `app.css`, `index.html` and 15 JS files while leaving
`SHELL_VERSION` at `.13`. That is not a cosmetic slip. `sw.js` only rebuilds a
cache that lacks its `READY` sentinel (`if (await existing.match(READY))
return`), so a cache under an unchanged version name is **skipped entirely** —
the new shell was never cached, every phone that already had the site kept
serving the old one, and nothing anywhere reported an error. CI was green. The
site was correct for anyone arriving fresh. The only way to find it was to be
holding an affected phone, which is exactly how it was found.

**So the fix is not to the feature — it is a guard.** `tools/check_versions.py`
compares two states and fails if files changed under `site/` without the
matching constant moving: `site/data/` → `DATA_VERSION`, everything else →
`SHELL_VERSION`. Wired into CI (PR against its base, push against
`event.before`), added to CLAUDE.md's verify list, and named in the lockstep
rule that previously relied on memory alone.

**Proof it fires, on the real case.** Run against `15a467d..99701ec` — the
actual merge that shipped the bug — it exits 1 and names the 19 shell files.
Against this branch's own range it passes. A guard verified on the incident it
was written for, not on a fixture.

🔎 **And the test found a flaw in the guard on its first run.**
`tools/test_check_versions.py` builds throwaway git repos and asserts the
checker fires exactly when it should (9 cases). Case 4 failed immediately:
`site/sw.js` was being classified as a shell file, so **every data-only menu
edit** would have been flagged — because bumping `DATA_VERSION` *is* an edit to
`sw.js`. A guard that cries wolf on the documented-correct action is one people
learn to override, which is precisely how four earlier checks in this repo went
decorative. `sw.js` is now excluded as the *carrier* of the versions rather
than a cached asset (it is in no precache list, and the browser always fetches
it fresh), and a case pins that exclusion so it cannot come back.

**Verification.** `test_check_versions.py` 9/9 · `check_versions.py` correct on
three real historical ranges (one bad, two good) · `validate.py` 48 files
0 errors · `check_no_deps` / `gen_sbom --check` clean · live site verified twice
in headless Chrome, including the full click journey under an installed and
controlling service worker.

