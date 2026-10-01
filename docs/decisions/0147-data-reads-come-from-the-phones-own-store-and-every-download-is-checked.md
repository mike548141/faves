# 0147 — Data reads come from the phone's own store, and every download is checked

**Status:** accepted. Built by roadmap `510/030` (PR #57). The freshness
trade below is open with the owner.
**Amended by** [ADR 0148](0148-the-data-check-waits-about-three-minutes-and-the-wait-survives-the-worker.md) <!-- wrapscan:allow: a link target cannot wrap -->
(decision 1: a read checks at most every ~3 minutes, persisted).
**Date:** 2026-10-01
**Builds on:** [ADR 0145](0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md)
as revised by [ADR 0146](0146-the-scaling-design-revised-after-its-cold-review.md);
keeps [ADR 0056](0056-a-precache-must-not-read-the-browsers-cache.md) and
[ADR 0100](0100-what-the-install-can-see-on-cloudflare-pages.md).

## Context

ADR 0146 said that what makes "fetch only what changed" work is the phone's
own store, keyed by fingerprint, not HTTP caching. Building it forced two
choices that the ADRs did not state.

## Decision

1. **A data read is answered from the phone's store**, not from the network
   first. The service worker checks `site/data/catalogue.json` in the background
   (at most once every 10 s, plus the existing check when the app comes back
   to the foreground). It fetches only the files whose fingerprint moved, then
   swaps one pointer record.
2. **Every download must hash to the fingerprint it was asked for**, or it is
   refused. This one check catches both Cloudflare Pages' "200 but HTML"
   stand-in (ADR 0100) and a deploy caught halfway.

## Rejected

- **Network-first reads** (the behaviour until 2026-09-30). An online phone saw
  an edit on its very next read, but paid one request per data read, and this
  store could not save any downloads.
- **Trusting status and content type alone.** That misses a mid-deploy mix of
  old and new files, which returns 200 with the right content type.

## Consequences

- 🚩 **An edit now reaches an online phone one screen later**: the screen that
  started the check keeps the data it already had, and the next screen shows
  the edit. The switch-over itself measured 359 ms on a local server. The
  alternatives, still open with the owner, are: the worker waits (with a
  timeout) before answering the first read, or it tells open pages when new
  data lands so they refresh softly.
- After one menu edit and one hours edit, an update costs 4 requests (about
  15.6 KB), where it used to cost 61 requests (about 327 KB). This is measured
  by `tools/fetch_check.mjs`, which break-probes itself.
- `DATA_VERSION` is retired. `tools/check_versions.py` refuses it if it comes
  back, and `node tools/gen_summaries.mjs --check` proves the catalogue.
