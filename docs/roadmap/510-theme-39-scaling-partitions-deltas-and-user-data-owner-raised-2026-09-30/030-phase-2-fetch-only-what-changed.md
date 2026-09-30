- [ ] **Phase 2 — fetch only what changed** `[L] [pwa][sw][data]` —
      owner-raised 2026-09-30 (and first raised 2026-09-29 as `240/030`),
      [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).

  **Build:**
  - Manifests carry a fingerprint for every data file, and the phone fetches
    `<id>.json?h=<fingerprint>`.
  - The service worker keeps **one permanent data store** in place of
    `faves-data-<DATA_VERSION>`. An update fetches the catalogue and the
    changed manifests, compares fingerprints, fetches only the changed files,
    switches over in one step, then deletes what is no longer listed.
  - `DATA_VERSION` retires. `tools/check_versions.py`, the lockstep rule in
    CLAUDE.md and `fetch_fx.py --bump` change in the same commit.

  **Keep:** ADR 0056 (never fill the store from the browser's cache) and
  ADR 0100 (an HTML stand-in is refused). `precache_check` must still stage
  Cloudflare Pages' "200 but HTML" answer.

  **Check:** edit one venue's menu and another's hours, then count the requests
  on an installed phone. Expected: one venue file plus the summary, and nothing
  else under `data/`.

  **Revised 2026-09-30 by ADR 0146 (cold review):** a `?h=` URL is **not**
  immutable on the server (`site/_headers` matches paths only); the phone's
  own store, keyed by fingerprint, is what saves the download. Switch-over:
  write new files beside the old, then swap one pointer record last; anything
  half-written is unreachable and cleared on the next start. Exclude
  cache-busted rechecks from the store, and delete orphans after each swap.
  Say how quickly a menu edit now reaches a phone that is online.
