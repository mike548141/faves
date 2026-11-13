## 2026-07-23 — Split precache versioning (wt: faves-wave7-split-versioning) — Opus 4.8

Owner idea (ROADMAP, 2026-07-22): separate versions for app vs data vs config so
a change to one refetches only that part. `sw.js` had a single `VERSION` naming
one precache — a data-only menu edit re-downloaded the whole app shell.

**Shipped (ADR 0015).** Two constants in `sw.js`: `SHELL_VERSION`
(html/css/js/icons/webmanifest) and `DATA_VERSION` (index.json + restaurant
JSON), each naming its own cache (`faves-shell-*`, `faves-data-*`; img cache
unchanged, version-free). New `ensureCache()` skips an already-complete cache on
install, so bumping one constant rebuilds only that cache — "download only what
changed". A `__cache_ready__` sentinel (written last) guards against skipping a
half-built cache from an interrupted install. Activate keeps exactly the three
current caches and cleans the pre-split single cache, building new before
deleting old so offline never breaks. Preserved: network-first data, cache-first
shell (ignoreSearch deep links), capped image cache, offline-after-first-visit.

**Config axis call:** mapped to shell — `site.webmanifest` changes in lockstep
with the shell it describes; `index.json` is *data* (it lists which restaurants
exist). No third cache; the seam generalises to N if a real runtime-config
artefact ever appears. Reasoned in ADR 0015.

**Lockstep rule rewritten** in CLAUDE.md, README, CONTRIBUTING, ARCHITECTURE:
data-only change under `site/data/` → bump `DATA_VERSION`; any other `site/`
change → `SHELL_VERSION`; both → both. `validate.py` gained a best-effort,
build-never-failing warning when `site/data` is dirty but `sw.js` isn't (shells
out to `git status --porcelain`, silently skips if not a checkout). New
`tests/sw-versioning.test.js` guards the split's static shape (sw.js is
browser-API code node can't execute).

**Verified:** validate.py / check_no_deps / gen_sbom --check / node --test (266
pass, +4 sw-versioning) all green; `node --check site/sw.js`; served locally and
curled sw.js + index.json + a restaurant JSON + all three shells (200, JSON
parses). Warning path confirmed: data-only dirty tree with clean sw.js fires it,
clean tree doesn't. **SW `VERSION .73 → SHELL_VERSION/DATA_VERSION 2026-07-23.74`**
(successors; installed phones update once onto the split model). **NOT
browser-exercised:** install-time skip, activate cleanup and the upgrade path are
logic-reasoned only — device pass needed (steps in ADR 0015).

🎯 **Owner:** nothing blocking. The payoff (a data edit not refetching the shell)
is only *observable* on a device — ADR 0015 has the DevTools steps. Branch pushed,
**not merged**.

⚠️ **Queued (out of this lane):** atelier doctrine has drifted past the pinned
`9e7e031` (CLAUDE.md) — several commits since. Reconciling + bumping the pin is a
separate task; flagged, not actioned here.

Commits: sw split + docs + test + validate guard (ADR 0015); records close.

