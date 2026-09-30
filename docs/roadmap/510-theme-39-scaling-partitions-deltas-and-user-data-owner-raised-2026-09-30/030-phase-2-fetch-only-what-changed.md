- [x] **Phase 2 — fetch only what changed** `[L] [pwa][sw][data]` —
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

  📌 **Claimed 2026-09-30 (`faves-0b`)** — built in a worktree.

✅ **Shipped 2026-09-30:** one fingerprinted data store; DATA_VERSION retired.

  **What landed.** `tools/gen_summaries.mjs` writes `site/data/catalogue.json`
  (schema + fingerprints of index, fx, summary, search index) and each summary
  record's `h` (its venue file's fingerprint: first 12 hex of SHA-256 of the
  bytes). `site/sw.js` keeps one permanent store, `faves-data`: a sync fetches
  the catalogue, then only the files whose fingerprint moved as
  `<path>?h=<fp>`, hashes each on arrival, writes beside the old set and swaps
  one pointer record; orphans are swept at the next start and after each swap;
  `_fresh` rechecks bypass the store. `check_versions.py` refuses
  `DATA_VERSION`'s return; `fetch_fx.py --bump` restamps the catalogue.
  `tools/fetch_check.mjs` is the item's check, break-probed every run.

  **Where the item and the code disagreed.**
  - *"Expected: one venue file plus the summary"* — the check edits TWO
    venues, so it is two venue files, the summary and the catalogue: 4
    requests. An edit that changes dish text also refetches the search index.
  - *"An update fetches the catalogue and the changed manifests"* — with one
    partition the summary IS the manifest for venue files; there is no
    separate per-partition manifest until `510/060`.

  **Four costs, measured 2026-09-30** (per-file gzip -9, 57 venues):

  | Cost | Before | After |
  |---|---|---|
  | Network, one menu + one hours edit | 61 req, ~327 KB | 4 req, ~15.6 KB |
  | Network, the same with dish text changed | 61 req, ~327 KB | 5 req, ~131 KB |
  | Network, weekly FX refresh | 61 req, ~327 KB | 2 req, ~0.8 KB |
  | Network, a check that finds nothing | none (sw.js only) | 1 req, 140 B |
  | Network, each data read online | 1 conditional req | 0 (store) |
  | Storage, steady | 2.19 MB raw | 2.19 MB + ~3 KB pointer |
  | Storage, during an update | 2× (old + new cache) | + changed files only |
  | Processing, per check | none | SHA-256 of 197 B |
  | Processing, per update | none | parse summary (0.8 ms) + hash downloads |
  | Processing, first install | none | hash 61 files, 11 ms (desktop Node) |
  | Server (Pages requests) | ~2–3 per screen | ≤ 1 per 10 s, + changed files |

  **The trade, stated:** freshness. Reads were network-first, so an online
  phone saw an edit on its very next read. Reads are now store-first: the
  first data-reading screen after the deploy starts the sync and the NEXT
  screen shows the edit (`fetch_check` measured the switch 359 ms after the
  navigation, local server). A resumed app checks at most every 5 minutes.
  That buys the network and server columns above.

  ⚖️ **Owner-ruled 2026-10-01: "Keep as built"**. An edit reaching an online
  phone one screen later is accepted for 4 requests instead of 61 (ADR 0147).
